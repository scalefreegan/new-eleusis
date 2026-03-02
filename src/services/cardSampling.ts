/**
 * Shared card sampling utilities for the rule compiler.
 * Used by ruleCompiler.ts (stress tests) and generateExamples.ts (example generation).
 */

import type { Card, Rank, Suit } from '../engine/types';

export const ALL_RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const ALL_SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

/** Simple LCG PRNG for reproducible sampling */
export function createLCG(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function randomCard(rng: () => number): Card {
  const rank = ALL_RANKS[Math.floor(rng() * ALL_RANKS.length)];
  const suit = ALL_SUITS[Math.floor(rng() * ALL_SUITS.length)];
  return { rank, suit, id: `${suit}-${rank}-0` };
}
