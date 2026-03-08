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
    // First call: pipeline rejects
    mockPipeline.mockRejectedValueOnce(new Error('model download failed'));

    await expect(getLLMBackend()).rejects.toThrow('model download failed');

    // Second call: pipeline succeeds — should NOT return the cached rejection
    const fakePipe = vi.fn().mockResolvedValue([{ generated_text: 'ok' }]);
    mockPipeline.mockResolvedValue(fakePipe);

    const backend = await getLLMBackend();
    expect(backend).toBeDefined();
    expect(mockPipeline).toHaveBeenCalledTimes(2);
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
    expect(mockPipeline).toHaveBeenCalledTimes(1);
  });

  it('retries after concurrent failure', async () => {
    // First round: fail
    mockPipeline.mockRejectedValueOnce(new Error('boom'));
    await Promise.allSettled([getLLMBackend(), getLLMBackend()]);

    // Second round: succeed
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
});
