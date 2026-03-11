/**
 * Tests for getLLMBackend singleton error recovery (ne-8jd).
 *
 * Verifies that:
 * - A failed init clears the cached promise so retries work
 * - Concurrent calls share the same init promise (dedup)
 * - disposeLLMBackend clears both singleton and init promise
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @huggingface/transformers before importing the module under test
const mockPipeline = vi.fn();
vi.mock('@huggingface/transformers', () => ({
  pipeline: (...args: unknown[]) => mockPipeline(...args),
  env: { allowLocalModels: true, allowRemoteModels: true },
}));

import {
  getLLMBackend,
  disposeLLMBackend,
  _resetForTesting,
} from '../../src/services/llmBackend';

function makeFakeBackend() {
  return {
    generate: vi.fn().mockResolvedValue('{"functionBody":"return true;"}'),
    dispose: vi.fn(),
  };
}

describe('getLLMBackend singleton', () => {
  beforeEach(() => {
    _resetForTesting();
    mockPipeline.mockReset();
  });

  it('returns a backend on success', async () => {
    mockPipeline.mockResolvedValue(makeFakeBackend().generate);
    // pipeline returns a callable pipe; createTransformersBackend wraps it
    // We need to mock at the pipeline level — it returns a pipe function
    const fakePipe = vi.fn().mockResolvedValue([{ generated_text: 'ok' }]);
    mockPipeline.mockResolvedValue(fakePipe);

    const backend = await getLLMBackend();
    expect(backend).toBeDefined();
    expect(backend.generate).toBeInstanceOf(Function);
  });

  it('retries after a failed init', async () => {
    // First getLLMBackend call: all 3 retry attempts fail
    mockPipeline.mockRejectedValue(new Error('model download failed'));

    await expect(getLLMBackend()).rejects.toThrow('Model download failed');

    // Reset — second getLLMBackend call: pipeline succeeds
    mockPipeline.mockReset();
    const fakePipe = vi.fn().mockResolvedValue([{ generated_text: 'ok' }]);
    mockPipeline.mockResolvedValue(fakePipe);

    const backend = await getLLMBackend();
    expect(backend).toBeDefined();
  });

  it('deduplicates concurrent calls', async () => {
    // pipeline takes time to resolve
    const fakePipe = vi.fn().mockResolvedValue([{ generated_text: 'ok' }]);
    mockPipeline.mockResolvedValue(fakePipe);

    const [a, b] = await Promise.all([getLLMBackend(), getLLMBackend()]);

    expect(a).toBe(b);
    expect(mockPipeline).toHaveBeenCalledTimes(1);
  });

  it('concurrent calls all reject when init fails', async () => {
    mockPipeline.mockRejectedValue(new Error('boom'));

    const results = await Promise.allSettled([getLLMBackend(), getLLMBackend()]);

    expect(results[0].status).toBe('rejected');
    expect(results[1].status).toBe('rejected');
    // Both calls share the same init promise; the retry loop calls pipeline 3 times
    expect(mockPipeline).toHaveBeenCalledTimes(3);
  });

  it('retries after concurrent failure', async () => {
    // First round: all retry attempts fail
    mockPipeline.mockRejectedValue(new Error('boom'));
    await Promise.allSettled([getLLMBackend(), getLLMBackend()]);

    // Second round: succeed
    mockPipeline.mockReset();
    const fakePipe = vi.fn().mockResolvedValue([{ generated_text: 'ok' }]);
    mockPipeline.mockResolvedValue(fakePipe);

    const backend = await getLLMBackend();
    expect(backend).toBeDefined();
  });

  it('reuses singleton on subsequent calls', async () => {
    const fakePipe = vi.fn().mockResolvedValue([{ generated_text: 'ok' }]);
    mockPipeline.mockResolvedValue(fakePipe);

    const a = await getLLMBackend();
    const b = await getLLMBackend();

    expect(a).toBe(b);
    expect(mockPipeline).toHaveBeenCalledTimes(1);
  });

  it('disposeLLMBackend allows re-init', async () => {
    const fakePipe = vi.fn().mockResolvedValue([{ generated_text: 'ok' }]);
    mockPipeline.mockResolvedValue(fakePipe);

    const first = await getLLMBackend();
    disposeLLMBackend();
    const second = await getLLMBackend();

    expect(first).not.toBe(second);
    expect(mockPipeline).toHaveBeenCalledTimes(2);
  });

  it('disposeLLMBackend during active init discards the in-flight result', async () => {
    let resolveInit!: (v: unknown) => void;
    const pipelineCalled = new Promise<void>(done => {
      mockPipeline.mockImplementation(() => new Promise(r => {
        resolveInit = r;
        done();
      }));
    });

    const promise = getLLMBackend();

    // Wait for pipeline() to actually be called (after the async import)
    await pipelineCalled;

    disposeLLMBackend(); // dispose while init is in-flight

    const fakePipe = vi.fn().mockResolvedValue([{ generated_text: 'ok' }]);
    resolveInit(fakePipe);

    // The in-flight promise should reject because dispose invalidated it
    await expect(promise).rejects.toThrow('Backend disposed during initialization');

    // A new call should create a fresh pipeline
    mockPipeline.mockReset();
    const freshPipe = vi.fn().mockResolvedValue([{ generated_text: 'ok' }]);
    mockPipeline.mockResolvedValue(freshPipe);

    const fresh = await getLLMBackend();
    expect(fresh).toBeDefined();
    expect(mockPipeline).toHaveBeenCalledTimes(1);
  });
});
