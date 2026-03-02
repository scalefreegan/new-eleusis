/**
 * Unit tests for extractJsonFromOutput from llmBackend.
 */

import { describe, it, expect } from 'vitest';
import { extractJsonFromOutput } from '../../src/services/llmBackend';

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
});
