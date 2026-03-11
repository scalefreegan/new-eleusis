/**
 * Local LLM backend abstraction for the rule compiler.
 *
 * Primary path: Transformers.js + Qwen2.5-Coder-1.5B-Instruct (ONNX Q4)
 *   - Runs via WASM in browser and Capacitor WebView (no WebGPU required)
 *   - ~900 MB model download, cached in browser cache / IndexedDB
 *
 * Future planned feature: WebLLM (WebGPU, desktop Chrome/Edge only)
 *   - Not yet implemented — install @mlc-ai/web-llm and wire up to enable
 *   - Would be 3–5× faster but not available in Capacitor WebView
 *   - Detected at runtime via navigator.gpu
 *
 * Usage:
 *   const backend = await getLLMBackend({ onProgress });
 *   const text = await backend.generate(prompt);
 */

export interface DownloadProgress {
  /** Progress 0–1 (or -1 if indeterminate) */
  progress: number;
  /** Human-readable status message */
  status: string;
  /** Total bytes expected (may be 0 if unknown) */
  total: number;
  /** Bytes loaded so far */
  loaded: number;
}

export interface LLMBackendOptions {
  /** Called during model download/initialisation with progress info */
  onProgress?: (progress: DownloadProgress) => void;
  /** If true, prefer WebLLM when WebGPU is available (currently unused — WebLLM not yet implemented) */
  preferWebGPU?: boolean;
  /** If provided, aborting this signal cancels the download and rejects the promise */
  signal?: AbortSignal;
}

export interface LLMBackend {
  generate(prompt: string): Promise<string>;
  dispose(): void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TRANSFORMERS_MODEL = 'Qwen/Qwen2.5-Coder-1.5B-Instruct';
const DTYPE = 'q4' as const;

// Max tokens to generate — the function body + ambiguities JSON is small
const MAX_NEW_TOKENS = 512;

// ─────────────────────────────────────────────────────────────────────────────
// Abort helper
// ─────────────────────────────────────────────────────────────────────────────

/** Race a promise against an AbortSignal; rejects with AbortError when aborted. */
export function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) {
    return Promise.reject(signal.reason ?? new DOMException('Download cancelled', 'AbortError'));
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason ?? new DOMException('Download cancelled', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (v) => { signal.removeEventListener('abort', onAbort); resolve(v); },
      (e) => { signal.removeEventListener('abort', onAbort); reject(e); },
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton: keep one loaded backend alive across calls
// ─────────────────────────────────────────────────────────────────────────────

let _singleton: LLMBackend | null = null;
let _initPromise: Promise<LLMBackend> | null = null;
let _disposeGeneration = 0;

// ─────────────────────────────────────────────────────────────────────────────
// Capability detection
// ─────────────────────────────────────────────────────────────────────────────

export function isWebGPUAvailable(): boolean {
  try {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Retry / error categorization for model downloads
// ─────────────────────────────────────────────────────────────────────────────

const MAX_DOWNLOAD_RETRIES = 3;
const BACKOFF_BASE_MS = 1000;

function categorizeDownloadError(err: Error): Error {
  const msg = err.message.toLowerCase();

  if (msg.includes('quota') || msg.includes('storage')) {
    return new Error('Not enough storage space (~900MB required). Free up browser storage and try again.');
  }
  if (msg.includes('cors') || msg.includes('blocked')) {
    return new Error('Download blocked by browser security policy (CORS). Try a different browser or network.');
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return new Error('Download timed out. Try again on a faster connection.');
  }
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network')) {
    return new Error('Download failed: check your internet connection and try again.');
  }
  return new Error(`Model download failed: ${err.message}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Transformers.js WASM backend (works everywhere)
// ─────────────────────────────────────────────────────────────────────────────

async function createTransformersBackend(
  opts: LLMBackendOptions
): Promise<LLMBackend> {
  const { pipeline, env } = await import('@huggingface/transformers');

  // Use local cache; allow remote fallback
  env.allowLocalModels = true;
  env.allowRemoteModels = true;

  type ProgressEvent = {
    status: string;
    name?: string;
    file?: string;
    progress?: number;
    loaded?: number;
    total?: number;
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_DOWNLOAD_RETRIES; attempt++) {
    // Don't retry if user cancelled
    if (opts.signal?.aborted) {
      throw opts.signal.reason ?? new DOMException('Download cancelled', 'AbortError');
    }

    if (attempt > 0) {
      const delay = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
      console.log(`[llmBackend] Retry ${attempt + 1}/${MAX_DOWNLOAD_RETRIES} after ${delay}ms`);
      opts.onProgress?.({
        progress: -1,
        status: `Download failed, retrying in ${delay / 1000}s…`,
        total: 0,
        loaded: 0,
      });
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          clearTimeout(timer);
          reject(opts.signal!.reason ?? new DOMException('Download cancelled', 'AbortError'));
        };
        const timer = setTimeout(() => {
          if (opts.signal) opts.signal.removeEventListener('abort', onAbort);
          resolve();
        }, delay);
        if (opts.signal) {
          if (opts.signal.aborted) { clearTimeout(timer); reject(opts.signal.reason ?? new DOMException('Download cancelled', 'AbortError')); return; }
          opts.signal.addEventListener('abort', onAbort, { once: true });
        }
      });
    }

    opts.onProgress?.({
      progress: -1,
      status: attempt === 0
        ? 'Checking model cache…'
        : `Retrying model download (attempt ${attempt + 1}/${MAX_DOWNLOAD_RETRIES})…`,
      total: 0,
      loaded: 0,
    });

    const loadStart = performance.now();
    let progressFired = false;
    const heartbeat = setInterval(() => {
      if (!progressFired && opts.onProgress) {
        const elapsed = ((performance.now() - loadStart) / 1000).toFixed(0);
        opts.onProgress({
          progress: -1,
          status: `Loading model from cache… (${elapsed}s)`,
          total: 0,
          loaded: 0,
        });
      }
    }, 2000);

    try {
      const pipe = await pipeline('text-generation', TRANSFORMERS_MODEL, {
        dtype: DTYPE,
        progress_callback: (event: ProgressEvent) => {
          progressFired = true;
          if (!opts.onProgress) return;
          const loaded = event.loaded ?? 0;
          const total = event.total ?? 0;
          const progressFraction = total > 0 ? loaded / total : -1;
          const label = event.file ?? event.name ?? event.status ?? '';
          const loadedMB = (loaded / 1_048_576).toFixed(1);
          const totalMB = total > 0 ? `/ ${(total / 1_048_576).toFixed(1)} MB` : '';
          opts.onProgress({
            progress: progressFraction,
            status: `Downloading ${label} ${loadedMB} MB ${totalMB}`.trim(),
            total,
            loaded,
          });
        },
      });

      clearInterval(heartbeat);
      const elapsed = ((performance.now() - loadStart) / 1000).toFixed(1);
      console.log(`[llmBackend] Model loaded in ${elapsed}s`);
      opts.onProgress?.({ progress: 1, status: 'Model ready', total: 0, loaded: 0 });

      return {
        async generate(prompt: string): Promise<string> {
          const t0 = performance.now();
          const messages = [
            {
              role: 'system' as const,
              content:
                'You are a JavaScript code generator for the card game New Eleusis. Always respond with valid JSON only, no markdown fences.',
            },
            { role: 'user' as const, content: prompt },
          ];

          type GenerateOutput =
            | { generated_text: string }
            | { generated_text: Array<{ role: string; content: string }> };

          const output = await pipe(messages, {
            max_new_tokens: MAX_NEW_TOKENS,
            temperature: 0.1,
            do_sample: false,
          }) as GenerateOutput[] | GenerateOutput;

          // Transformers.js returns an array; last message is the assistant response
          const first = Array.isArray(output) ? output[0] : output;
          const generated = first.generated_text;

          let result: string;
          if (Array.isArray(generated)) {
            // Chat completion format: array of {role, content}
            const assistant = [...generated].reverse().find((m) => m.role === 'assistant');
            result = assistant?.content ?? '';
          } else {
            result = String(generated);
          }
          const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
          console.log(`[llmBackend] Generated ${result.length} chars in ${elapsed}s`);
          return result;
        },

        dispose() {
          // Transformers.js pipeline doesn't have an explicit dispose
        },
      };
    } catch (err) {
      clearInterval(heartbeat);
      lastError = err instanceof Error ? err : new Error(String(err));
      const elapsed = ((performance.now() - loadStart) / 1000).toFixed(1);
      console.error(`[llmBackend] Download attempt ${attempt + 1} failed after ${elapsed}s:`, lastError.message);

      // Don't retry abort errors
      if (lastError.name === 'AbortError' || opts.signal?.aborted) {
        throw lastError;
      }

      if (attempt === MAX_DOWNLOAD_RETRIES - 1) {
        throw categorizeDownloadError(lastError);
      }
    }
  }

  // Unreachable, but satisfies TypeScript
  throw lastError;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get (or initialise) the local LLM backend (Transformers.js WASM).
 * Reuses a singleton if already loaded.
 *
 * WebLLM (WebGPU) acceleration is not yet wired up — install @mlc-ai/web-llm
 * and implement createWebLLMBackend() to enable it. The preferWebGPU option
 * is accepted but currently ignored.
 */
export async function getLLMBackend(opts: LLMBackendOptions = {}): Promise<LLMBackend> {
  if (_singleton) {
    return _singleton;
  }

  if (_initPromise) {
    return _initPromise;
  }

  // TODO: WebLLM (WebGPU) acceleration — install @mlc-ai/web-llm and wire up
  // createWebLLMBackend() here when opts.preferWebGPU && isWebGPUAvailable().

  const generation = _disposeGeneration;
  _initPromise = abortable(createTransformersBackend(opts), opts.signal).then(
    (backend) => {
      _initPromise = null;
      if (_disposeGeneration !== generation) {
        // dispose() was called while we were loading — discard result
        backend.dispose();
        throw new Error('Backend disposed during initialization');
      }
      _singleton = backend;
      return backend;
    },
    (error) => {
      _initPromise = null;
      throw error;
    }
  );

  return _initPromise;
}

/**
 * Release the singleton backend (e.g., on app teardown).
 * Call this if you want to free WASM memory.
 */
export function disposeLLMBackend(): void {
  _disposeGeneration++;
  _initPromise = null;
  if (_singleton) {
    _singleton.dispose();
    _singleton = null;
  }
}

/** Reset internal state — only for use in tests. */
export function _resetForTesting(): void {
  _singleton = null;
  _initPromise = null;
  _disposeGeneration = 0;
}

/**
 * Best-effort check if the model files are already in the browser cache.
 * Returns true if cached, false if not, null if detection is unavailable.
 */
export async function isModelCached(): Promise<boolean | null> {
  try {
    if (typeof caches === 'undefined') return null;
    const cache = await caches.open('transformers-cache');
    const keys = await cache.keys();
    const modelSlug = TRANSFORMERS_MODEL.toLowerCase();
    return keys.some(req => req.url.toLowerCase().includes(modelSlug));
  } catch {
    return null;
  }
}

/** Re-export extractJson from the shared module for backward compatibility */
export { extractJson as extractJsonFromOutput } from './extractJson';
