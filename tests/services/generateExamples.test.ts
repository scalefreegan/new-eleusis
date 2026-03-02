/**
 * Unit tests for generateExamples.
 */

import { describe, it, expect } from 'vitest';
import { generateExamples } from '../../src/services/generateExamples';
import type { Card } from '../../src/engine/types';

describe('generateExamples', () => {
  const alwaysTrue = (_last: Card, _next: Card) => true;
  const alwaysFalse = (_last: Card, _next: Card) => false;
  const alternateColors = (last: Card, next: Card) => {
    const color = (s: string) => (s === 'hearts' || s === 'diamonds' ? 'red' : 'black');
    return color(last.suit) !== color(next.suit);
  };

  it('returns the requested number of examples', () => {
    const examples = generateExamples(alternateColors, 10);
    expect(examples).toHaveLength(10);
  });

  it('returns fewer examples with smaller count', () => {
    const examples = generateExamples(alternateColors, 4);
    expect(examples).toHaveLength(4);
  });

  it('balances true and false examples', () => {
    const examples = generateExamples(alternateColors, 10);
    const trueCount = examples.filter(e => e.expected).length;
    const falseCount = examples.filter(e => !e.expected).length;
    expect(trueCount).toBeGreaterThan(0);
    expect(falseCount).toBeGreaterThan(0);
    expect(trueCount).toBeLessThanOrEqual(Math.ceil(10 / 2));
    expect(falseCount).toBeLessThanOrEqual(Math.ceil(10 / 2));
  });

  it('handles always-true function (may not reach full count due to balance)', () => {
    const examples = generateExamples(alwaysTrue, 10);
    expect(examples.length).toBeGreaterThan(0);
    expect(examples.length).toBeLessThanOrEqual(10);
    expect(examples.every(e => e.expected === true)).toBe(true);
  });

  it('handles always-false function', () => {
    const examples = generateExamples(alwaysFalse, 10);
    expect(examples.length).toBeGreaterThan(0);
    expect(examples.length).toBeLessThanOrEqual(10);
    expect(examples.every(e => e.expected === false)).toBe(true);
  });

  it('handles throwing function gracefully', () => {
    let callCount = 0;
    const throwingFn = (_last: Card, _next: Card): boolean => {
      callCount++;
      if (callCount % 3 === 0) throw new Error('intermittent');
      return true;
    };
    const examples = generateExamples(throwingFn, 5);
    // Should get some results despite exceptions
    expect(examples.length).toBeGreaterThan(0);
  });

  it('produces deterministic output (seeded PRNG)', () => {
    const examples1 = generateExamples(alternateColors, 10);
    const examples2 = generateExamples(alternateColors, 10);
    expect(examples1).toEqual(examples2);
  });

  it('produces valid Card shapes', () => {
    const examples = generateExamples(alternateColors, 5);
    const validRanks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const validSuits = ['hearts', 'diamonds', 'clubs', 'spades'];

    for (const ex of examples) {
      expect(validRanks).toContain(ex.lastCard.rank);
      expect(validSuits).toContain(ex.lastCard.suit);
      expect(typeof ex.lastCard.id).toBe('string');
      expect(validRanks).toContain(ex.newCard.rank);
      expect(validSuits).toContain(ex.newCard.suit);
      expect(typeof ex.newCard.id).toBe('string');
      expect(typeof ex.expected).toBe('boolean');
      expect(typeof ex.explanation).toBe('string');
    }
  });

  it('explanations describe the card pair', () => {
    const examples = generateExamples(alternateColors, 5);
    for (const ex of examples) {
      expect(ex.explanation).toContain(ex.newCard.rank);
      expect(ex.explanation).toContain(ex.newCard.suit);
      expect(ex.explanation).toContain(ex.lastCard.rank);
      expect(ex.explanation).toContain(ex.lastCard.suit);
    }
  });
});
