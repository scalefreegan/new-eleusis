/**
 * Generate CardExample objects by running a compiled rule function on sampled card pairs.
 * Used by the local LLM path where the model only outputs functionBody + ambiguities —
 * examples are generated programmatically rather than by the model.
 */

import type { Card } from '../engine/types';
import type { CardExample } from './ruleCompiler';
import { createLCG, randomCard } from './cardSampling';

/**
 * Generate `count` examples (targeting ~50% valid/invalid) from the function.
 * Uses a seeded LCG so results are reproducible.
 */
export function generateExamples(
  fn: (lastCard: Card, newCard: Card) => boolean,
  count = 10
): CardExample[] {
  const rng = createLCG(12345);

  const examples: CardExample[] = [];
  let trueCount = 0;
  let falseCount = 0;
  let exceptionCount = 0;
  const maxAttempts = count * 20;

  for (let attempt = 0; attempt < maxAttempts && examples.length < count; attempt++) {
    const lastCard = randomCard(rng);
    const newCard = randomCard(rng);

    let result: boolean;
    try {
      result = fn(lastCard, newCard);
    } catch {
      exceptionCount++;
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

  if (exceptionCount > maxAttempts * 0.1) {
    console.warn(
      `[generateExamples] ${exceptionCount}/${maxAttempts} attempts threw (${(exceptionCount / maxAttempts * 100).toFixed(0)}%). The compiled function may be unstable.`
    );
  }

  return examples;
}
