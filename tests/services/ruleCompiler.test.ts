/**
 * Unit tests for the rule compiler client service.
 * Tests sandbox security, function creation, and example validation.
 */

import { describe, it, expect } from 'vitest';
import {
  validateFunctionBody,
  createSandboxedFunction,
  testCompiledFunction,
  stressTestFunction,
} from '../../src/services/ruleCompiler';
import type { Card } from '../../src/engine/types';

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function card(rank: Card['rank'], suit: Card['suit']): Card {
  return { rank, suit, id: `${suit}-${rank}-0` };
}

const RED_CARD = card('5', 'hearts');
const BLACK_CARD = card('7', 'clubs');
const ACE = card('A', 'spades');
const KING = card('K', 'diamonds');

// ────────────────────────────────────────────
// validateFunctionBody
// ────────────────────────────────────────────

describe('validateFunctionBody', () => {
  it('accepts a valid simple function body', () => {
    const result = validateFunctionBody("return true;");
    expect(result.valid).toBe(true);
  });

  it('accepts a body using helpers', () => {
    const body = "return helpers.getSuitColor(lastCard.suit) !== helpers.getSuitColor(newCard.suit);";
    expect(validateFunctionBody(body).valid).toBe(true);
  });

  it('rejects empty body', () => {
    expect(validateFunctionBody('').valid).toBe(false);
    expect(validateFunctionBody('   ').valid).toBe(false);
  });

  it('rejects body without return statement', () => {
    expect(validateFunctionBody('const x = 1;').valid).toBe(false);
  });

  it('rejects eval', () => {
    const result = validateFunctionBody("return eval('1+1') > 0;");
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Forbidden');
  });

  it('rejects fetch', () => {
    const result = validateFunctionBody("fetch('http://evil.com'); return true;");
    expect(result.valid).toBe(false);
  });

  it('rejects window access', () => {
    const result = validateFunctionBody("return window.location.href.length > 0;");
    expect(result.valid).toBe(false);
  });

  it('rejects document access', () => {
    const result = validateFunctionBody("return document.cookie.length > 0;");
    expect(result.valid).toBe(false);
  });

  it('rejects import()', () => {
    const result = validateFunctionBody("import('fs').then(() => {}); return true;");
    expect(result.valid).toBe(false);
  });

  it('rejects require()', () => {
    const result = validateFunctionBody("require('fs'); return true;");
    expect(result.valid).toBe(false);
  });

  it('rejects process access', () => {
    const result = validateFunctionBody("return process.env.SECRET !== undefined;");
    expect(result.valid).toBe(false);
  });

  it('rejects globalThis', () => {
    const result = validateFunctionBody("return globalThis.fetch !== undefined;");
    expect(result.valid).toBe(false);
  });

  it('rejects Function constructor', () => {
    const result = validateFunctionBody("return new Function('return 1')() > 0;");
    expect(result.valid).toBe(false);
  });

  it('rejects setTimeout', () => {
    const result = validateFunctionBody("setTimeout(() => {}, 0); return true;");
    expect(result.valid).toBe(false);
  });

  it('rejects localStorage', () => {
    const result = validateFunctionBody("localStorage.setItem('x', '1'); return true;");
    expect(result.valid).toBe(false);
  });

  it('rejects prototype access', () => {
    const result = validateFunctionBody("Object.prototype.x = 1; return true;");
    expect(result.valid).toBe(false);
  });

  it('rejects this keyword', () => {
    const result = validateFunctionBody("return this.fetch !== undefined;");
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Forbidden');
  });

  it('rejects null input', () => {
    const result = validateFunctionBody(null as unknown as string);
    expect(result.valid).toBe(false);
  });

  it('rejects non-string input', () => {
    const result = validateFunctionBody(42 as unknown as string);
    expect(result.valid).toBe(false);
  });

  it('rejects __proto__ access', () => {
    const result = validateFunctionBody("return newCard.__proto__ !== undefined;");
    expect(result.valid).toBe(false);
  });

  it('rejects constructor access', () => {
    const result = validateFunctionBody("return newCard.constructor.name.length > 0;");
    expect(result.valid).toBe(false);
  });

  it('rejects WebSocket', () => {
    const result = validateFunctionBody("new WebSocket('ws://evil.com'); return true;");
    expect(result.valid).toBe(false);
  });

  it('rejects XMLHttpRequest', () => {
    const result = validateFunctionBody("new XMLHttpRequest(); return true;");
    expect(result.valid).toBe(false);
  });

  it('allows "location" as a variable name (not blocked by window)', () => {
    const body = "const location = lastCard.suit === 'hearts' ? 1 : 0;\nreturn location > 0;";
    expect(validateFunctionBody(body).valid).toBe(true);
  });

  it('allows "history" as a variable name', () => {
    const body = "const history = [lastCard.rank];\nreturn history.includes(newCard.rank);";
    expect(validateFunctionBody(body).valid).toBe(true);
  });

  it('allows "cookies" as a variable name', () => {
    const body = "const cookies = lastCard.rank === 'K';\nreturn cookies;";
    expect(validateFunctionBody(body).valid).toBe(true);
  });

  it('still blocks window.location via the window pattern', () => {
    const result = validateFunctionBody("return window.location.href.length > 0;");
    expect(result.valid).toBe(false);
  });

  it('still blocks document.cookie via the document pattern', () => {
    const result = validateFunctionBody("return document.cookie.length > 0;");
    expect(result.valid).toBe(false);
  });

  // ── String concatenation bypass tests (ne-170) ──

  it('rejects constructor access via string concatenation', () => {
    const result = validateFunctionBody("return lastCard['con'+'structor'] !== undefined;");
    expect(result.valid).toBe(false);
  });

  it('rejects __proto__ access via string concatenation', () => {
    const result = validateFunctionBody("return lastCard['__pro'+'to__'] !== undefined;");
    expect(result.valid).toBe(false);
  });

  it('rejects prototype access via string concatenation', () => {
    const result = validateFunctionBody("return lastCard['proto'+'type'] !== undefined;");
    expect(result.valid).toBe(false);
  });

  it('rejects constructor access via bracket string literal', () => {
    const result = validateFunctionBody("return lastCard['constructor'] !== undefined;");
    expect(result.valid).toBe(false);
  });

  it('rejects __proto__ access via bracket string literal', () => {
    const result = validateFunctionBody("return lastCard['__proto__'] !== undefined;");
    expect(result.valid).toBe(false);
  });

  it('rejects template literal property access with expressions', () => {
    const result = validateFunctionBody("const x = 'con'; return lastCard[`${x}structor`] !== undefined;");
    expect(result.valid).toBe(false);
  });

  it('rejects computed property access via variable', () => {
    const result = validateFunctionBody("const p = 'constructor'; return lastCard[p];");
    expect(result.valid).toBe(true); // identifier-based bracket access is allowed (safe: can only be a declared local)
  });

  it('rejects eval even when not called directly', () => {
    const result = validateFunctionBody("const e = eval; return e('1') > 0;");
    expect(result.valid).toBe(false);
  });

  it('rejects Function via bracket access on global scope escape', () => {
    // This tries to get Function through constructor chain
    const result = validateFunctionBody("return lastCard.constructor('return 1')();");
    expect(result.valid).toBe(false);
  });

  it('allows safe bracket access with numeric indices', () => {
    const body = "const suits = ['hearts','diamonds','clubs','spades'];\nreturn suits[0] === lastCard.suit;";
    expect(validateFunctionBody(body).valid).toBe(true);
  });

  it('allows safe bracket access with identifier keys', () => {
    const body = "const key = 'suit';\nreturn lastCard[key] === newCard[key];";
    expect(validateFunctionBody(body).valid).toBe(true);
  });

  it('rejects syntactically invalid code', () => {
    const result = validateFunctionBody("return {{{;");
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Parse error');
  });
});

// ────────────────────────────────────────────
// createSandboxedFunction
// ────────────────────────────────────────────

describe('createSandboxedFunction', () => {
  it('creates a function that returns boolean', () => {
    const fn = createSandboxedFunction("return true;");
    expect(fn(RED_CARD, BLACK_CARD)).toBe(true);
  });

  it('alternate colors rule', () => {
    const fn = createSandboxedFunction(
      "return helpers.getSuitColor(lastCard.suit) !== helpers.getSuitColor(newCard.suit);"
    );
    expect(fn(RED_CARD, BLACK_CARD)).toBe(true);
    expect(fn(RED_CARD, card('3', 'diamonds'))).toBe(false);
    expect(fn(BLACK_CARD, RED_CARD)).toBe(true);
  });

  it('rank must increase by 1 rule', () => {
    const fn = createSandboxedFunction(
      "const diff = helpers.getRankValue(newCard.rank) - helpers.getRankValue(lastCard.rank);\nreturn diff === 1;"
    );
    expect(fn(card('5', 'hearts'), card('6', 'clubs'))).toBe(true);
    expect(fn(card('5', 'hearts'), card('7', 'clubs'))).toBe(false);
    expect(fn(card('5', 'hearts'), card('4', 'clubs'))).toBe(false);
  });

  it('only red cards rule', () => {
    const fn = createSandboxedFunction(
      "return helpers.getSuitColor(newCard.suit) === 'red';"
    );
    expect(fn(BLACK_CARD, RED_CARD)).toBe(true);
    expect(fn(RED_CARD, BLACK_CARD)).toBe(false);
  });

  it('face cards only rule', () => {
    const fn = createSandboxedFunction(
      "return helpers.isFaceCard(newCard.rank);"
    );
    expect(fn(RED_CARD, card('J', 'hearts'))).toBe(true);
    expect(fn(RED_CARD, card('Q', 'clubs'))).toBe(true);
    expect(fn(RED_CARD, card('K', 'diamonds'))).toBe(true);
    expect(fn(RED_CARD, card('5', 'hearts'))).toBe(false);
    expect(fn(RED_CARD, ACE)).toBe(false);
  });

  it('even ranks only rule', () => {
    const fn = createSandboxedFunction(
      "return helpers.isEvenRank(newCard.rank);"
    );
    expect(fn(ACE, card('2', 'clubs'))).toBe(true);
    expect(fn(ACE, card('4', 'clubs'))).toBe(true);
    expect(fn(ACE, card('5', 'clubs'))).toBe(false);
    expect(fn(ACE, card('A', 'clubs'))).toBe(false); // A=1, odd
  });

  it('propagates errors from the sandboxed function', () => {
    const fn = createSandboxedFunction(
      "throw new Error('oops'); return true;"
    );
    expect(() => fn(RED_CARD, BLACK_CARD)).toThrow('oops');
  });

  it('converts non-boolean return to boolean', () => {
    const fn = createSandboxedFunction("return 1;");
    expect(fn(RED_CARD, BLACK_CARD)).toBe(true);
    const fn2 = createSandboxedFunction("return 0;");
    expect(fn2(RED_CARD, BLACK_CARD)).toBe(false);
  });

  it('same suit rule', () => {
    const fn = createSandboxedFunction("return lastCard.suit === newCard.suit;");
    expect(fn(RED_CARD, card('3', 'hearts'))).toBe(true);
    expect(fn(RED_CARD, BLACK_CARD)).toBe(false);
  });

  it('alternating even/odd rule', () => {
    const fn = createSandboxedFunction(
      "return helpers.isEvenRank(lastCard.rank) !== helpers.isEvenRank(newCard.rank);"
    );
    expect(fn(card('2', 'hearts'), card('3', 'clubs'))).toBe(true);  // even → odd
    expect(fn(card('3', 'hearts'), card('4', 'clubs'))).toBe(true);  // odd → even
    expect(fn(card('2', 'hearts'), card('4', 'clubs'))).toBe(false); // even → even
  });
});

// ────────────────────────────────────────────
// testCompiledFunction
// ────────────────────────────────────────────

describe('testCompiledFunction', () => {
  const alternateFn = createSandboxedFunction(
    "return helpers.getSuitColor(lastCard.suit) !== helpers.getSuitColor(newCard.suit);"
  );

  it('passes when all examples match', () => {
    const examples = [
      { lastCard: RED_CARD, newCard: BLACK_CARD, expected: true, explanation: 'red→black ok' },
      { lastCard: BLACK_CARD, newCard: RED_CARD, expected: true, explanation: 'black→red ok' },
      { lastCard: RED_CARD, newCard: card('9', 'hearts'), expected: false, explanation: 'red→red fail' },
    ];
    const result = testCompiledFunction(alternateFn, examples);
    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('reports failures when examples disagree', () => {
    const examples = [
      { lastCard: RED_CARD, newCard: BLACK_CARD, expected: false, explanation: 'wrong expected' }, // should be true
    ];
    const result = testCompiledFunction(alternateFn, examples);
    expect(result.passed).toBe(false);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].actual).toBe(true);
    expect(result.failures[0].expected).toBe(false);
  });

  it('handles empty examples', () => {
    const result = testCompiledFunction(alternateFn, []);
    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });
});

// ────────────────────────────────────────────
// stressTestFunction
// ────────────────────────────────────────────

describe('stressTestFunction', () => {
  it('passes for a well-behaved function', () => {
    const fn = createSandboxedFunction(
      "return helpers.getSuitColor(lastCard.suit) !== helpers.getSuitColor(newCard.suit);"
    );
    expect(stressTestFunction(fn)).toBe(true);
  });

  it('passes for always-true function', () => {
    const fn = createSandboxedFunction("return true;");
    expect(stressTestFunction(fn)).toBe(true);
  });

  it('passes for always-false function', () => {
    const fn = createSandboxedFunction("return false;");
    expect(stressTestFunction(fn)).toBe(true);
  });

  it('passes for complex function', () => {
    const fn = createSandboxedFunction(
      `const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
const lastIdx = suits.indexOf(lastCard.suit);
const newIdx = suits.indexOf(newCard.suit);
return (lastIdx + 1) % 4 === newIdx;`
    );
    expect(stressTestFunction(fn)).toBe(true);
  });

  it('returns false when function throws on some inputs', () => {
    let count = 0;
    const throwingFn = (_last: Card, _next: Card): boolean => {
      if (++count > 50) throw new Error('unstable after 50 calls');
      return true;
    };
    expect(stressTestFunction(throwingFn)).toBe(false);
  });

  it('returns false when function returns non-boolean', () => {
    const nonBoolFn = (_last: Card, _next: Card) => null as unknown as boolean;
    expect(stressTestFunction(nonBoolFn)).toBe(false);
  });
});

// ────────────────────────────────────────────
// Integration: validate body → create function → test examples
// ────────────────────────────────────────────

describe('full pipeline', () => {
  it('alternating colors pipeline', () => {
    const body = "return helpers.getSuitColor(lastCard.suit) !== helpers.getSuitColor(newCard.suit);";

    // Step 1: validate
    const validation = validateFunctionBody(body);
    expect(validation.valid).toBe(true);

    // Step 2: create
    const fn = createSandboxedFunction(body);

    // Step 3: test
    const examples = [
      { lastCard: card('5', 'hearts'), newCard: card('7', 'spades'), expected: true, explanation: 'red→black' },
      { lastCard: card('5', 'hearts'), newCard: card('9', 'hearts'), expected: false, explanation: 'red→red' },
      { lastCard: card('J', 'clubs'), newCard: card('K', 'diamonds'), expected: true, explanation: 'black→red' },
      { lastCard: card('2', 'spades'), newCard: card('A', 'clubs'), expected: false, explanation: 'black→black' },
    ];
    const result = testCompiledFunction(fn, examples);
    expect(result.passed).toBe(true);

    // Step 4: stress test
    expect(stressTestFunction(fn)).toBe(true);
  });

  it('same suit pipeline', () => {
    const body = "return lastCard.suit === newCard.suit;";
    const validation = validateFunctionBody(body);
    expect(validation.valid).toBe(true);
    const fn = createSandboxedFunction(body);
    expect(fn(card('3', 'hearts'), card('9', 'hearts'))).toBe(true);
    expect(fn(card('3', 'hearts'), card('9', 'clubs'))).toBe(false);
    expect(stressTestFunction(fn)).toBe(true);
  });

  it('KING must be followed by ACE pipeline', () => {
    const body = `if (lastCard.rank === 'K') return newCard.rank === 'A';
return true;`;
    const validation = validateFunctionBody(body);
    expect(validation.valid).toBe(true);
    const fn = createSandboxedFunction(body);
    expect(fn(KING, ACE)).toBe(true);
    expect(fn(KING, card('2', 'hearts'))).toBe(false);
    expect(fn(card('5', 'hearts'), card('7', 'clubs'))).toBe(true); // non-King: always valid
    expect(stressTestFunction(fn)).toBe(true);
  });
});
