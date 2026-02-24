/**
 * AI rule bank for the Dealer
 * Each rule is a function that determines if a card can be played after another
 */

import type { Card } from '../types';
import { getRankValue, getSuitColor, isEvenRank, isFaceCard } from '../deck';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Rule {
  name: string;
  description: string;
  difficulty: Difficulty;
  judge: (lastCard: Card, newCard: Card) => boolean;
}

/**
 * Rule bank - collection of possible rules the AI dealer can use
 */
export const RULE_BANK: Rule[] = [
  // ===== EASY RULES (Simple, obvious patterns) =====
  {
    name: 'alternating-colors',
    description: 'Alternate between red and black cards',
    difficulty: 'easy',
    judge: (lastCard, newCard) => {
      return getSuitColor(lastCard.suit) !== getSuitColor(newCard.suit);
    },
  },
  {
    name: 'same-color',
    description: 'All cards must be the same color',
    difficulty: 'easy',
    judge: (lastCard, newCard) => {
      return getSuitColor(lastCard.suit) === getSuitColor(newCard.suit);
    },
  },
  {
    name: 'same-suit',
    description: 'All cards must be the same suit',
    difficulty: 'easy',
    judge: (lastCard, newCard) => {
      return lastCard.suit === newCard.suit;
    },
  },
  {
    name: 'only-red',
    description: 'Only red cards allowed',
    difficulty: 'easy',
    judge: (_lastCard, newCard) => {
      return getSuitColor(newCard.suit) === 'red';
    },
  },
  {
    name: 'only-black',
    description: 'Only black cards allowed',
    difficulty: 'easy',
    judge: (_lastCard, newCard) => {
      return getSuitColor(newCard.suit) === 'black';
    },
  },
  {
    name: 'only-even',
    description: 'Only even rank values allowed',
    difficulty: 'easy',
    judge: (_lastCard, newCard) => {
      return isEvenRank(newCard.rank);
    },
  },
  {
    name: 'only-odd',
    description: 'Only odd rank values allowed',
    difficulty: 'easy',
    judge: (_lastCard, newCard) => {
      return !isEvenRank(newCard.rank);
    },
  },
  {
    name: 'no-face-cards',
    description: 'Face cards (J, Q, K) not allowed',
    difficulty: 'easy',
    judge: (_lastCard, newCard) => {
      return !isFaceCard(newCard.rank);
    },
  },
  {
    name: 'only-face-cards',
    description: 'Only face cards (J, Q, K) allowed',
    difficulty: 'easy',
    judge: (_lastCard, newCard) => {
      return isFaceCard(newCard.rank);
    },
  },
  {
    name: 'same-rank',
    description: 'All cards must have the same rank',
    difficulty: 'easy',
    judge: (lastCard, newCard) => {
      return lastCard.rank === newCard.rank;
    },
  },

  // ===== MEDIUM RULES (Require more observation) =====
  {
    name: 'ascending-rank',
    description: 'Each card must have a higher rank than the last',
    difficulty: 'medium',
    judge: (lastCard, newCard) => {
      return getRankValue(newCard.rank) > getRankValue(lastCard.rank);
    },
  },
  {
    name: 'descending-rank',
    description: 'Each card must have a lower rank than the last',
    difficulty: 'medium',
    judge: (lastCard, newCard) => {
      return getRankValue(newCard.rank) < getRankValue(lastCard.rank);
    },
  },
  {
    name: 'same-suit-or-same-rank',
    description: 'Card must match either suit or rank',
    difficulty: 'medium',
    judge: (lastCard, newCard) => {
      return lastCard.suit === newCard.suit || lastCard.rank === newCard.rank;
    },
  },
  {
    name: 'alternating-even-odd',
    description: 'Alternate between even and odd rank values',
    difficulty: 'medium',
    judge: (lastCard, newCard) => {
      return isEvenRank(lastCard.rank) !== isEvenRank(newCard.rank);
    },
  },
  {
    name: 'adjacent-ranks',
    description: 'Rank must be within 1 of the previous card',
    difficulty: 'medium',
    judge: (lastCard, newCard) => {
      const diff = Math.abs(getRankValue(newCard.rank) - getRankValue(lastCard.rank));
      return diff === 1;
    },
  },
  {
    name: 'higher-than-7',
    description: 'Only cards with rank value higher than 7',
    difficulty: 'medium',
    judge: (_lastCard, newCard) => {
      return getRankValue(newCard.rank) > 7;
    },
  },
  {
    name: 'lower-than-7',
    description: 'Only cards with rank value lower than 7',
    difficulty: 'medium',
    judge: (_lastCard, newCard) => {
      return getRankValue(newCard.rank) < 7;
    },
  },
  {
    name: 'rank-sum-even',
    description: 'Sum of last card and new card ranks must be even',
    difficulty: 'medium',
    judge: (lastCard, newCard) => {
      const sum = getRankValue(lastCard.rank) + getRankValue(newCard.rank);
      return sum % 2 === 0;
    },
  },
  {
    name: 'rank-sum-odd',
    description: 'Sum of last card and new card ranks must be odd',
    difficulty: 'medium',
    judge: (lastCard, newCard) => {
      const sum = getRankValue(lastCard.rank) + getRankValue(newCard.rank);
      return sum % 2 === 1;
    },
  },
  {
    name: 'alternating-suit',
    description: 'Suit must be different from the previous card',
    difficulty: 'medium',
    judge: (lastCard, newCard) => {
      return lastCard.suit !== newCard.suit;
    },
  },
  {
    name: 'rank-divisible-by-3',
    description: 'Rank value must be divisible by 3',
    difficulty: 'medium',
    judge: (_lastCard, newCard) => {
      return getRankValue(newCard.rank) % 3 === 0;
    },
  },
  {
    name: 'prime-ranks-only',
    description: 'Only prime number ranks (2, 3, 5, 7, 11, 13)',
    difficulty: 'medium',
    judge: (_lastCard, newCard) => {
      const primes = [2, 3, 5, 7, 11, 13];
      return primes.includes(getRankValue(newCard.rank));
    },
  },
  {
    name: 'red-ascending-black-descending',
    description: 'Red cards must ascend, black cards must descend',
    difficulty: 'medium',
    judge: (lastCard, newCard) => {
      const lastValue = getRankValue(lastCard.rank);
      const newValue = getRankValue(newCard.rank);
      const newColor = getSuitColor(newCard.suit);

      if (newColor === 'red') {
        return newValue > lastValue;
      } else {
        return newValue < lastValue;
      }
    },
  },

  // ===== HARD RULES (Complex, multi-condition patterns) =====
  {
    name: 'fibonacci-sequence',
    description: 'Ranks must follow Fibonacci pattern (1,2,3,5,8,13)',
    difficulty: 'hard',
    judge: (lastCard, newCard) => {
      const fibonacci = [1, 2, 3, 5, 8, 13];
      const lastValue = getRankValue(lastCard.rank);
      const newValue = getRankValue(newCard.rank);

      const lastIndex = fibonacci.indexOf(lastValue);
      if (lastIndex === -1) return false;

      const nextValue = fibonacci[lastIndex + 1];
      return nextValue === newValue;
    },
  },
  {
    name: 'suit-rotation',
    description: 'Suits must rotate in order: hearts, diamonds, clubs, spades',
    difficulty: 'hard',
    judge: (lastCard, newCard) => {
      const suitOrder: Record<string, string> = {
        'hearts': 'diamonds',
        'diamonds': 'clubs',
        'clubs': 'spades',
        'spades': 'hearts',
      };
      return suitOrder[lastCard.suit] === newCard.suit;
    },
  },
  {
    name: 'rank-difference-equals-3',
    description: 'Absolute difference between ranks must equal 3',
    difficulty: 'hard',
    judge: (lastCard, newCard) => {
      const diff = Math.abs(getRankValue(newCard.rank) - getRankValue(lastCard.rank));
      return diff === 3;
    },
  },
  {
    name: 'matching-parity-different-color',
    description: 'Same even/odd parity but different color',
    difficulty: 'hard',
    judge: (lastCard, newCard) => {
      const sameParity = isEvenRank(lastCard.rank) === isEvenRank(newCard.rank);
      const differentColor = getSuitColor(lastCard.suit) !== getSuitColor(newCard.suit);
      return sameParity && differentColor;
    },
  },
  {
    name: 'opposite-parity-same-color',
    description: 'Opposite even/odd parity and same color',
    difficulty: 'hard',
    judge: (lastCard, newCard) => {
      const oppositeParity = isEvenRank(lastCard.rank) !== isEvenRank(newCard.rank);
      const sameColor = getSuitColor(lastCard.suit) === getSuitColor(newCard.suit);
      return oppositeParity && sameColor;
    },
  },
  {
    name: 'rank-product-less-than-20',
    description: 'Product of both rank values must be less than 20',
    difficulty: 'hard',
    judge: (lastCard, newCard) => {
      const product = getRankValue(lastCard.rank) * getRankValue(newCard.rank);
      return product < 20;
    },
  },
  {
    name: 'alternating-red-black-faces',
    description: 'Alternating colors, but only face cards allowed',
    difficulty: 'hard',
    judge: (lastCard, newCard) => {
      const alternatingColors = getSuitColor(lastCard.suit) !== getSuitColor(newCard.suit);
      const isFace = isFaceCard(newCard.rank);
      return alternatingColors && isFace;
    },
  },
  {
    name: 'hearts-or-even-clubs',
    description: 'Hearts allowed, or clubs with even rank',
    difficulty: 'hard',
    judge: (_lastCard, newCard) => {
      if (newCard.suit === 'hearts') return true;
      if (newCard.suit === 'clubs') return isEvenRank(newCard.rank);
      return false;
    },
  },
  {
    name: 'spades-ascending-others-descending',
    description: 'Spades must ascend in rank, all others must descend',
    difficulty: 'hard',
    judge: (lastCard, newCard) => {
      const lastValue = getRankValue(lastCard.rank);
      const newValue = getRankValue(newCard.rank);

      if (newCard.suit === 'spades') {
        return newValue > lastValue;
      } else {
        return newValue < lastValue;
      }
    },
  },
  {
    name: 'rank-modulo-suit-count',
    description: 'Rank value modulo 4 equals suit index (H=0, D=1, C=2, S=3)',
    difficulty: 'hard',
    judge: (_lastCard, newCard) => {
      const suitIndex: Record<string, number> = {
        'hearts': 0,
        'diamonds': 1,
        'clubs': 2,
        'spades': 3,
      };
      const rankValue = getRankValue(newCard.rank);
      return rankValue % 4 === suitIndex[newCard.suit];
    },
  },
  {
    name: 'same-color-or-adjacent-rank',
    description: 'Must have same color OR adjacent rank (not both)',
    difficulty: 'hard',
    judge: (lastCard, newCard) => {
      const sameColor = getSuitColor(lastCard.suit) === getSuitColor(newCard.suit);
      const diff = Math.abs(getRankValue(newCard.rank) - getRankValue(lastCard.rank));
      const adjacentRank = diff === 1;

      // XOR: one must be true, but not both
      return (sameColor && !adjacentRank) || (!sameColor && adjacentRank);
    },
  },
  {
    name: 'low-red-high-black',
    description: 'Red cards must be 7 or lower, black cards must be 8 or higher',
    difficulty: 'hard',
    judge: (_lastCard, newCard) => {
      const value = getRankValue(newCard.rank);
      const color = getSuitColor(newCard.suit);

      if (color === 'red') {
        return value <= 7;
      } else {
        return value >= 8;
      }
    },
  },
  {
    name: 'power-of-2-or-face',
    description: 'Rank must be a power of 2 (2, 4, 8) or a face card',
    difficulty: 'hard',
    judge: (_lastCard, newCard) => {
      const value = getRankValue(newCard.rank);
      const isPowerOf2 = [2, 4, 8].includes(value);
      return isPowerOf2 || isFaceCard(newCard.rank);
    },
  },
  {
    name: 'composite-rank-only',
    description: 'Only composite numbers (4, 6, 8, 9, 10, 12)',
    difficulty: 'hard',
    judge: (_lastCard, newCard) => {
      const composites = [4, 6, 8, 9, 10, 12];
      return composites.includes(getRankValue(newCard.rank));
    },
  },
  {
    name: 'alternating-high-low',
    description: 'Alternate between high (8+) and low (7-) ranks',
    difficulty: 'hard',
    judge: (lastCard, newCard) => {
      const lastValue = getRankValue(lastCard.rank);
      const newValue = getRankValue(newCard.rank);
      const lastIsHigh = lastValue >= 8;
      const newIsHigh = newValue >= 8;
      return lastIsHigh !== newIsHigh;
    },
  },
  {
    name: 'sum-divisible-by-5',
    description: 'Sum of both rank values must be divisible by 5',
    difficulty: 'hard',
    judge: (lastCard, newCard) => {
      const sum = getRankValue(lastCard.rank) + getRankValue(newCard.rank);
      return sum % 5 === 0;
    },
  },
  {
    name: 'wrapping-adjacent',
    description: 'Adjacent ranks with wrapping (K wraps to A)',
    difficulty: 'hard',
    judge: (lastCard, newCard) => {
      const lastValue = getRankValue(lastCard.rank);
      const newValue = getRankValue(newCard.rank);

      // Normal adjacency or wrap-around (13 to 1 or 1 to 13)
      const diff = Math.abs(newValue - lastValue);
      return diff === 1 || diff === 12;
    },
  },
  {
    name: 'zigzag-ranks',
    description: 'Ranks form zigzag: up, down, up, down pattern',
    difficulty: 'hard',
    judge: (lastCard, newCard) => {
      // This is challenging - would need state to track the pattern
      // For now, we implement a simple version: alternating up/down
      const lastValue = getRankValue(lastCard.rank);
      const newValue = getRankValue(newCard.rank);

      // On odd positions go up, on even go down (simplified without global state)
      // Using rank sum parity as proxy for position
      const shouldGoUp = (lastValue + newValue) % 2 === 0;
      return shouldGoUp ? newValue > lastValue : newValue < lastValue;
    },
  },
];

/**
 * Get a random rule from the rule bank
 */
export function getRandomRule(): Rule {
  return RULE_BANK[Math.floor(Math.random() * RULE_BANK.length)];
}

/**
 * Get a random rule by difficulty level
 */
export function getRandomRuleByDifficulty(difficulty: Difficulty): Rule {
  const rulesOfDifficulty = RULE_BANK.filter(rule => rule.difficulty === difficulty);
  if (rulesOfDifficulty.length === 0) {
    throw new Error(`No rules found for difficulty: ${difficulty}`);
  }
  return rulesOfDifficulty[Math.floor(Math.random() * rulesOfDifficulty.length)];
}

/**
 * Get a rule by name
 */
export function getRuleByName(name: string): Rule | undefined {
  return RULE_BANK.find(rule => rule.name === name);
}

/**
 * Get all rules of a specific difficulty
 */
export function getRulesByDifficulty(difficulty: Difficulty): Rule[] {
  return RULE_BANK.filter(rule => rule.difficulty === difficulty);
}
