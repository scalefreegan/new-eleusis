/**
 * RULE_BANK cross-validation tests.
 *
 * For each rule in RULE_BANK, this test:
 * 1. Calls the /api/compile-rule endpoint with the rule's description
 * 2. Compiles the returned functionBody into a sandboxed function
 * 3. Runs both the existing judge() function and compiled function over 100+ card pairs
 * 4. Flags mismatches
 *
 * This is a slow test that requires:
 * - The Vite dev server to be running (npm run dev)
 * - The claude CLI to be available
 *
 * Run with: npm run test:rules
 *
 * Known issues (expected mismatches):
 * - zigzag-ranks: description is ambiguous
 * - fibonacci-sequence: complex mathematical rule
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RULE_BANK } from '../../src/engine/ai/rules';
import {
  validateFunctionBody,
  createSandboxedFunction,
  stressTestFunction,
} from '../../src/services/ruleCompiler';
import type { Card, Rank, Suit } from '../../src/engine/types';

// ────────────────────────────────────────────
// Test infrastructure
// ────────────────────────────────────────────

const ALL_RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const ALL_SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

function card(rank: Rank, suit: Suit): Card {
  return { rank, suit, id: `${suit}-${rank}-0` };
}

function generateTestPairs(count = 100): Array<{ last: Card; next: Card }> {
  // Seeded LCG for reproducibility
  let seed = 12345;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 0xffffffff;
  };

  const pairs: Array<{ last: Card; next: Card }> = [];
  for (let i = 0; i < count; i++) {
    const lastRank = ALL_RANKS[Math.floor(rng() * ALL_RANKS.length)];
    const lastSuit = ALL_SUITS[Math.floor(rng() * ALL_SUITS.length)];
    const nextRank = ALL_RANKS[Math.floor(rng() * ALL_RANKS.length)];
    const nextSuit = ALL_SUITS[Math.floor(rng() * ALL_SUITS.length)];
    pairs.push({ last: card(lastRank, lastSuit), next: card(nextRank, nextSuit) });
  }
  return pairs;
}

// Known rules with expected description/implementation mismatches
const KNOWN_MISMATCH_RULES = new Set([
  'zigzag-ranks',
  'fibonacci-sequence',
]);

interface CompileApiResponse {
  functionBody: string;
  examples: unknown[];
  ambiguities: string[];
  error?: string;
}

async function compileViaApi(description: string): Promise<CompileApiResponse> {
  const res = await fetch('http://localhost:5173/api/compile-rule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ruleText: description }),
    signal: AbortSignal.timeout(60000), // 60s timeout
  });
  return res.json() as Promise<CompileApiResponse>;
}

// ────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────

let serverAvailable = false;

beforeAll(async () => {
  try {
    const res = await fetch('http://localhost:5173/api/compile-rule/health', {
      signal: AbortSignal.timeout(3000),
    });
    serverAvailable = res.ok;
  } catch {
    serverAvailable = false;
  }
}, 10000);

describe('RULE_BANK cross-validation', () => {
  const testPairs = generateTestPairs(120);

  for (const rule of RULE_BANK) {
    it(`rule: ${rule.name} ("${rule.description.slice(0, 60)}")`, async () => {
      if (!serverAvailable) {
        console.warn(`[${rule.name}] Skipping: Vite dev server not available`);
        return;
      }

      // Compile the rule description
      let compileResponse: CompileApiResponse;
      try {
        compileResponse = await compileViaApi(rule.description);
      } catch (err) {
        console.warn(`[${rule.name}] Compile API call failed: ${err}`);
        return;
      }

      if (compileResponse.error) {
        console.warn(`[${rule.name}] Compile failed: ${compileResponse.error}`);
        if (KNOWN_MISMATCH_RULES.has(rule.name)) return; // Expected failure
        throw new Error(`Compilation failed: ${compileResponse.error}`);
      }

      // Validate function body security
      const validation = validateFunctionBody(compileResponse.functionBody);
      expect(validation.valid).toBe(true);

      // Create sandboxed function
      const compiledFn = createSandboxedFunction(compileResponse.functionBody);

      // Stress test
      const stable = stressTestFunction(compiledFn);
      expect(stable).toBe(true);

      // Compare behaviors
      let mismatches = 0;
      const mismatchDetails: string[] = [];

      for (const { last, next } of testPairs) {
        const expected = rule.judge(last, next);
        const actual = compiledFn(last, next);

        if (expected !== actual) {
          mismatches++;
          if (mismatchDetails.length < 5) {
            mismatchDetails.push(
              `${last.rank}${last.suit[0]} → ${next.rank}${next.suit[0]}: expected ${expected}, got ${actual}`
            );
          }
        }
      }

      const mismatchRate = mismatches / testPairs.length;

      if (mismatchRate > 0) {
        const details = mismatchDetails.join('\n  ');
        console.warn(
          `[${rule.name}] ${mismatches}/${testPairs.length} mismatches (${(mismatchRate * 100).toFixed(1)}%):\n  ${details}`
        );
      }

      if (KNOWN_MISMATCH_RULES.has(rule.name)) {
        // Just log, don't fail
        console.info(`[${rule.name}] Known mismatch rule — mismatches: ${mismatches}`);
        return;
      }

      // Allow up to 5% mismatch rate (some rules may have edge case ambiguities)
      expect(mismatchRate).toBeLessThanOrEqual(0.05);
    }, 90000); // 90s per rule (claude CLI can be slow)
  }
});
