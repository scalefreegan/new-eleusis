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
// Singleton: keep one loaded backend alive across calls
// ─────────────────────────────────────────────────────────────────────────────

let _singleton: LLMBackend | null = null;

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
// Transformers.js WASM backend (works everywhere)
// ─────────────────────────────────────────────────────────────────────────────

async function createTransformersBackend(
  opts: LLMBackendOptions
): Promise<LLMBackend> {
  const { pipeline, env } = await import('@huggingface/transformers');

  // Use local cache; allow remote fallback
  env.allowLocalModels = true;
  env.allowRemoteModels = true;

  opts.onProgress?.({
    progress: -1,
    status: 'Loading model (this may take a minute on first run)…',
    total: 0,
    loaded: 0,
  });

  type ProgressEvent = {
    status: string;
    name?: string;
    file?: string;
    progress?: number;
    loaded?: number;
    total?: number;
  };

  const pipe = await pipeline('text-generation', TRANSFORMERS_MODEL, {
    dtype: DTYPE,
    progress_callback: (event: ProgressEvent) => {
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

  opts.onProgress?.({ progress: 1, status: 'Model ready', total: 0, loaded: 0 });

  return {
    async generate(prompt: string): Promise<string> {
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

      if (Array.isArray(generated)) {
        // Chat completion format: array of {role, content}
        const assistant = [...generated].reverse().find((m) => m.role === 'assistant');
        return assistant?.content ?? '';
      }
      return String(generated);
    },

    dispose() {
      // Transformers.js pipeline doesn't have an explicit dispose
    },
  };
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
  // Reuse singleton
  if (_singleton) {
    return _singleton;
  }

  // TODO: WebLLM (WebGPU) acceleration — install @mlc-ai/web-llm and wire up
  // createWebLLMBackend() here when opts.preferWebGPU && isWebGPUAvailable().

  _singleton = await createTransformersBackend(opts);
  return _singleton;
}

/**
 * Release the singleton backend (e.g., on app teardown).
 * Call this if you want to free WASM memory.
 */
export function disposeLLMBackend(): void {
  if (_singleton) {
    _singleton.dispose();
    _singleton = null;
  }
}

/** Extract the first JSON object from a string (strips markdown fences, preamble) */
export function extractJsonFromOutput(text: string): unknown {
  const errors: string[] = [];

  // Direct parse
  try { return JSON.parse(text); } catch (e) {
    errors.push(`direct: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Fenced code block ```json ... ```
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1]); } catch (e) {
      errors.push(`fence: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // First bare { ... }
  const start = text.indexOf('{');
  if (start !== -1) {
    // Walk forward tracking brace depth
    let depth = 0;
    for (let i = start; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(text.slice(start, i + 1)); } catch (e) {
            errors.push(`brace: ${e instanceof Error ? e.message : String(e)}`);
          }
          break;
        }
      }
    }
  }

  console.warn('[llmBackend] extractJsonFromOutput failed. Strategies tried:', errors.join('; '), 'Input (500 chars):', text.slice(0, 500));
  return null;
}
