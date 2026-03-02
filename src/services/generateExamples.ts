/**
 * Generate CardExample objects by running a compiled rule function on sampled card pairs.
 * Used by the local LLM path where the model only outputs functionBody + ambiguities —
 * examples are generated programmatically rather than by the model.
 */

import type { Card, Rank, Suit } from '../engine/types';
import type { CardExample } from './ruleCompiler';

const ALL_RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const ALL_SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

function makeCard(rank: Rank, suit: Suit): Card {
  return { rank, suit, id: `${suit}-${rank}-0` };
}

/**
 * Generate `count` examples (targeting ~50% valid/invalid) from the function.
 * Uses a seeded LCG so results are reproducible.
 */
export function generateExamples(
  fn: (lastCard: Card, newCard: Card) => boolean,
  count = 10
): CardExample[] {
  // Seeded LCG
  let seed = 12345;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 0xffffffff;
  };

  const randomCard = (): Card => {
    const rank = ALL_RANKS[Math.floor(rng() * ALL_RANKS.length)];
    const suit = ALL_SUITS[Math.floor(rng() * ALL_SUITS.length)];
    return makeCard(rank, suit);
  };

  const examples: CardExample[] = [];
  let trueCount = 0;
  let falseCount = 0;
  const maxAttempts = count * 20;

  for (let attempt = 0; attempt < maxAttempts && examples.length < count; attempt++) {
    const lastCard = randomCard();
    const newCard = randomCard();

    let result: boolean;
    try {
      result = fn(lastCard, newCard);
    } catch {
      continue;
    }
    if (typeof result !== 'boolean') continue;

    // Balance true/false
    const halfCount = Math.ceil(count / 2);
    if (result && trueCount >= halfCount) continue;
    if (!result && falseCount >= halfCount) continue;

    const explanation = result
      ? `${newCard.rank} of ${newCard.suit} is valid after ${lastCard.rank} of ${lastCard.suit}`
      : `${newCard.rank} of ${newCard.suit} is NOT valid after ${lastCard.rank} of ${lastCard.suit}`;

    examples.push({ lastCard, newCard, expected: result, explanation });
    if (result) trueCount++; else falseCount++;
  }

  return examples;
}
