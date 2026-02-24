/**
 * Deck utilities for New Eleusis
 */

import type { Card, Suit, Rank } from './types';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/**
 * Create a standard 104-card deck (2 x 52 cards)
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];

  // Create two standard 52-card decks
  for (let deckNum = 0; deckNum < 2; deckNum++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({
          suit,
          rank,
          id: `${suit}-${rank}-${deckNum}`,
        });
      }
    }
  }

  return deck;
}

/**
 * Fisher-Yates shuffle algorithm
 */
export function shuffle(deck: Card[]): Card[] {
  const shuffled = [...deck];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Deal N cards from the deck
 * @returns Object with dealt cards and remaining deck
 */
export function dealCards(deck: Card[], count: number): { dealt: Card[]; remaining: Card[] } {
  const dealt = deck.slice(0, count);
  const remaining = deck.slice(count);

  return { dealt, remaining };
}

/**
 * Get numeric value of a rank for comparison
 */
export function getRankValue(rank: Rank): number {
  const values: Record<Rank, number> = {
    'A': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    'J': 11,
    'Q': 12,
    'K': 13,
  };
  return values[rank];
}

/**
 * Get color of a suit
 */
export function getSuitColor(suit: Suit): 'red' | 'black' {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

/**
 * Check if a rank is a face card
 */
export function isFaceCard(rank: Rank): boolean {
  return rank === 'J' || rank === 'Q' || rank === 'K';
}

/**
 * Check if a rank is even
 */
export function isEvenRank(rank: Rank): boolean {
  const value = getRankValue(rank);
  return value % 2 === 0;
}
