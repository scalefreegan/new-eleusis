/**
 * Client-side rule compiler service.
 * Calls the Vite dev server's /api/compile-rule endpoint and sandboxes the result.
 */

import { getRankValue, getSuitColor, isFaceCard, isEvenRank } from '../engine/deck';
import type { Card, Rank, Suit } from '../engine/types';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export interface CardExample {
  lastCard: Card;
  newCard: Card;
  expected: boolean;
  explanation: string;
}

export interface CompileResult {
  functionBody: string;
  examples: CardExample[];
  ambiguities: string[];
}

export interface CompiledRule {
  fn: (lastCard: Card, newCard: Card) => boolean;
  examples: CardExample[];
  ambiguities: string[];
  functionBody: string;
}

export interface TestResult {
  passed: boolean;
  failures: Array<{ lastCard: Card; newCard: Card; expected: boolean; actual: boolean; explanation: string }>;
}

// ────────────────────────────────────────────
// Helpers injected into sandboxed functions
// ────────────────────────────────────────────

const HELPERS = {
  getRankValue,
  getSuitColor,
  isFaceCard,
  isEvenRank,
};

// ────────────────────────────────────────────
// Security: forbidden patterns
// ────────────────────────────────────────────

const FORBIDDEN_PATTERNS = [
  /\beval\s*\(/,
  /\bFunction\s*\(/,
  /\bfetch\s*\(/,
  /\bwindow\b/,
  /\bdocument\b/,
  /\bimport\s*\(/,
  /\brequire\s*\(/,
  /\bglobalThis\b/,
  /\bprocess\b/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bsetTimeout\s*\(/,
  /\bsetInterval\s*\(/,
  /\bclearTimeout\s*\(/,
  /\bclearInterval\s*\(/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bIndexedDB\b/,
  /\bcookies\b/,
  /\blocation\b/,
  /\bnavigator\b/,
  /\bhistory\b/,
  /\bperformance\b/,
  /\bcrypto\b/,
  /\bAtob\s*\(/,
  /\bbtoa\s*\(/,
  /\bBlob\b/,
  /\bWorker\b/,
  /\bsharedArrayBuffer\b/i,
  /\b__proto__\b/,
  /\bprototype\b/,
  /\bconstructor\b/,
  /\bObject\s*\.\s*assign\b/,
  /\bObject\s*\.\s*defineProperty\b/,
];

export function validateFunctionBody(body: string): { valid: boolean; error?: string } {
  if (typeof body !== 'string' || body.trim().length === 0) {
    return { valid: false, error: 'Function body is empty' };
  }
  if (!body.includes('return')) {
    return { valid: false, error: 'Function body must contain a return statement' };
  }
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(body)) {
      return { valid: false, error: `Forbidden pattern detected: ${pattern.source}` };
    }
  }
  return { valid: true };
}

// ────────────────────────────────────────────
// Sandboxed function creation
// ────────────────────────────────────────────

export function createSandboxedFunction(
  body: string
): (lastCard: Card, newCard: Card) => boolean {
  // eslint-disable-next-line no-new-func
  const fn = new Function('lastCard', 'newCard', 'helpers', body) as (
    lastCard: Card,
    newCard: Card,
    helpers: typeof HELPERS
  ) => boolean;

  return (lastCard: Card, newCard: Card) => {
    try {
      const result = fn(lastCard, newCard, HELPERS);
      return Boolean(result);
    } catch {
      return false;
    }
  };
}

// ────────────────────────────────────────────
// Testing
// ────────────────────────────────────────────

export function testCompiledFunction(
  fn: (lastCard: Card, newCard: Card) => boolean,
  examples: CardExample[]
): TestResult {
  const failures: TestResult['failures'] = [];

  for (const ex of examples) {
    const actual = fn(ex.lastCard, ex.newCard);
    if (actual !== ex.expected) {
      failures.push({
        lastCard: ex.lastCard,
        newCard: ex.newCard,
        expected: ex.expected,
        actual,
        explanation: ex.explanation,
      });
    }
  }

  return { passed: failures.length === 0, failures };
}

const ALL_RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const ALL_SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

function randomCard(rng: () => number): Card {
  const rank = ALL_RANKS[Math.floor(rng() * ALL_RANKS.length)];
  const suit = ALL_SUITS[Math.floor(rng() * ALL_SUITS.length)];
  return { rank, suit, id: `${suit}-${rank}-0` };
}

/** Stress-test with 200 random pairs using a seeded PRNG */
export function stressTestFunction(fn: (lastCard: Card, newCard: Card) => boolean): boolean {
  // Simple LCG for reproducible stress-tests
  let seed = 42;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 0xffffffff;
  };

  for (let i = 0; i < 200; i++) {
    const last = randomCard(rng);
    const next = randomCard(rng);
    try {
      const result = fn(last, next);
      if (typeof result !== 'boolean') return false;
    } catch {
      return false;
    }
  }
  return true;
}

// ────────────────────────────────────────────
// Availability check
// ────────────────────────────────────────────

export async function isCompilerAvailable(): Promise<boolean> {
  try {
    const res = await fetch('/api/compile-rule/health', {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ────────────────────────────────────────────
// Main compile function
// ────────────────────────────────────────────

export async function compileRule(
  ruleText: string,
  clarifications?: string
): Promise<CompiledRule> {
  const res = await fetch('/api/compile-rule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ruleText, clarifications }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error: string };
    throw new Error(`Compile failed: ${err.error || res.statusText}`);
  }

  const data = await res.json() as CompileResult;

  // Validate function body security
  const validation = validateFunctionBody(data.functionBody);
  if (!validation.valid) {
    throw new Error(`Security validation failed: ${validation.error}`);
  }

  // Create sandboxed function
  const fn = createSandboxedFunction(data.functionBody);

  // Stress-test for stability
  const stable = stressTestFunction(fn);
  if (!stable) {
    throw new Error('Compiled function failed stability test (throws or returns non-boolean)');
  }

  return {
    fn,
    examples: data.examples,
    ambiguities: data.ambiguities ?? [],
    functionBody: data.functionBody,
  };
}
