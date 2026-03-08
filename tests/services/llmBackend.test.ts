/**
 * Unit tests for extractJson and abortable (LLM backend utilities).
 */

import { describe, it, expect } from 'vitest';
import { extractJson as extractJsonFromOutput } from '../../src/services/extractJson';
import { abortable } from '../../src/services/llmBackend';

describe('extractJsonFromOutput', () => {
  it('parses plain JSON', () => {
    const input = '{"functionBody": "return true;", "ambiguities": []}';
    const result = extractJsonFromOutput(input) as Record<string, unknown>;
    expect(result).toEqual({ functionBody: 'return true;', ambiguities: [] });
  });

  it('parses JSON from markdown fence', () => {
    const input = 'Here is the result:\n```json\n{"functionBody": "return true;"}\n```\nDone.';
    const result = extractJsonFromOutput(input) as Record<string, unknown>;
    expect(result).toEqual({ functionBody: 'return true;' });
  });

  it('parses JSON from bare braces with preamble', () => {
    const input = 'Sure, here is the function:\n{"functionBody": "return lastCard.suit === newCard.suit;"}';
    const result = extractJsonFromOutput(input) as Record<string, unknown>;
    expect(result).toEqual({ functionBody: 'return lastCard.suit === newCard.suit;' });
  });

  it('handles nested braces correctly', () => {
    const input = '{"functionBody": "if (a) { return true; } return false;", "ambiguities": []}';
    const result = extractJsonFromOutput(input) as Record<string, unknown>;
    expect(result).toEqual({
      functionBody: 'if (a) { return true; } return false;',
      ambiguities: [],
    });
  });

  it('handles trailing text after JSON', () => {
    const input = '{"functionBody": "return true;"} some trailing text here';
    const result = extractJsonFromOutput(input) as Record<string, unknown>;
    expect(result).toEqual({ functionBody: 'return true;' });
  });

  it('handles escaped quotes in JSON values', () => {
    const input = '{"functionBody": "return lastCard.rank === \\"A\\";"}';
    const result = extractJsonFromOutput(input) as Record<string, unknown>;
    expect(result).toEqual({ functionBody: 'return lastCard.rank === "A";' });
  });

  it('returns null for empty string', () => {
    expect(extractJsonFromOutput('')).toBeNull();
  });

  it('returns null for non-JSON text', () => {
    expect(extractJsonFromOutput('This is not JSON at all')).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(extractJsonFromOutput('{"functionBody": return true}')).toBeNull();
  });

  it('parses fence without json label', () => {
    const input = '```\n{"functionBody": "return false;"}\n```';
    const result = extractJsonFromOutput(input) as Record<string, unknown>;
    expect(result).toEqual({ functionBody: 'return false;' });
  });

  it('handles JSON with arrays and nested objects', () => {
    const input = '{"functionBody": "return true;", "ambiguities": ["Is Ace high or low?"]}';
    const result = extractJsonFromOutput(input) as Record<string, unknown>;
    expect(result).toEqual({
      functionBody: 'return true;',
      ambiguities: ['Is Ace high or low?'],
    });
  });

  // --- Bug ne-9yi: braces inside string literals ---

  it('handles braces inside string values (brace-in-string bug)', () => {
    const input = 'Here:\n{"functionBody": "const obj = {a: 1}; return obj.a === 1;"}';
    const result = extractJsonFromOutput(input) as Record<string, unknown>;
    expect(result).toEqual({
      functionBody: 'const obj = {a: 1}; return obj.a === 1;',
    });
  });

  it('handles unbalanced braces inside strings', () => {
    const input = 'Output:\n{"functionBody": "if (x) { return true; }", "note": "uses { and }"}';
    const result = extractJsonFromOutput(input) as Record<string, unknown>;
    expect(result).toEqual({
      functionBody: 'if (x) { return true; }',
      note: 'uses { and }',
    });
  });

  it('handles closing brace only inside a string', () => {
    const input = 'Result:\n{"functionBody": "return \\"}\\";"}';
    const result = extractJsonFromOutput(input) as Record<string, unknown>;
    expect(result).toEqual({ functionBody: 'return "}";' });
  });

  it('handles opening brace only inside a string', () => {
    const input = 'Result:\n{"functionBody": "return \\"{\\";"}';
    const result = extractJsonFromOutput(input) as Record<string, unknown>;
    expect(result).toEqual({ functionBody: 'return "{";' });
  });

  it('handles escaped quotes adjacent to braces in strings', () => {
    const input = '{"msg": "she said \\"{\\" and \\"}\\"."}';
    const result = extractJsonFromOutput(input) as Record<string, unknown>;
    expect(result).toEqual({ msg: 'she said "{" and "}".' });
  });
});

// ────────────────────────────────────────────
// abortable (ne-3ro: cancel download support)
// ────────────────────────────────────────────

describe('abortable', () => {
  it('resolves normally when no signal is provided', async () => {
    const result = await abortable(Promise.resolve(42));
    expect(result).toBe(42);
  });

  it('resolves normally when signal is not aborted', async () => {
    const controller = new AbortController();
    const result = await abortable(Promise.resolve('ok'), controller.signal);
    expect(result).toBe('ok');
  });

  it('rejects immediately when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(abortable(Promise.resolve('ok'), controller.signal)).rejects.toThrow();
    try {
      await abortable(Promise.resolve('ok'), controller.signal);
    } catch (err) {
      expect((err as DOMException).name).toBe('AbortError');
    }
  });

  it('rejects with AbortError when signal fires during pending promise', async () => {
    const controller = new AbortController();
    const neverResolves = new Promise<string>(() => {});

    const promise = abortable(neverResolves, controller.signal);
    controller.abort();

    await expect(promise).rejects.toThrow();
    try {
      await abortable(neverResolves, controller.signal);
    } catch (err) {
      expect((err as DOMException).name).toBe('AbortError');
    }
  });

  it('resolves if promise wins the race', async () => {
    const controller = new AbortController();
    const result = await abortable(Promise.resolve('fast'), controller.signal);
    expect(result).toBe('fast');
    // Aborting after resolve should be harmless
    controller.abort();
  });

  it('propagates the original rejection if promise rejects before abort', async () => {
    const controller = new AbortController();
    await expect(
      abortable(Promise.reject(new Error('original error')), controller.signal)
    ).rejects.toThrow('original error');
  });
});
