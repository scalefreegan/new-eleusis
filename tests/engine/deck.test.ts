import { describe, it, expect } from 'vitest';
import {
  createDeck,
  shuffle,
  dealCards,
  getRankValue,
  getSuitColor,
  isFaceCard,
  isEvenRank,
} from '../../src/engine/deck';

describe('deck utilities', () => {
  describe('createDeck', () => {
    it('creates a 104-card deck', () => {
      const deck = createDeck();
      expect(deck).toHaveLength(104);
    });

    it('has correct number of each suit', () => {
      const deck = createDeck();
      const hearts = deck.filter(c => c.suit === 'hearts');
      const diamonds = deck.filter(c => c.suit === 'diamonds');
      const clubs = deck.filter(c => c.suit === 'clubs');
      const spades = deck.filter(c => c.suit === 'spades');

      expect(hearts).toHaveLength(26); // 13 ranks × 2 decks
      expect(diamonds).toHaveLength(26);
      expect(clubs).toHaveLength(26);
      expect(spades).toHaveLength(26);
    });

    it('has correct number of each rank', () => {
      const deck = createDeck();
      const aces = deck.filter(c => c.rank === 'A');
      const kings = deck.filter(c => c.rank === 'K');

      expect(aces).toHaveLength(8); // 4 suits × 2 decks
      expect(kings).toHaveLength(8);
    });

    it('assigns unique IDs to each card', () => {
      const deck = createDeck();
      const ids = deck.map(c => c.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(104);
    });
  });

  describe('shuffle', () => {
    it('returns same number of cards', () => {
      const deck = createDeck();
      const shuffled = shuffle(deck);
      expect(shuffled).toHaveLength(deck.length);
    });

    it('contains same cards as original', () => {
      const deck = createDeck();
      const shuffled = shuffle(deck);

      const originalIds = deck.map(c => c.id).sort();
      const shuffledIds = shuffled.map(c => c.id).sort();

      expect(shuffledIds).toEqual(originalIds);
    });

    it('does not mutate original deck', () => {
      const deck = createDeck();
      const firstCard = deck[0];
      shuffle(deck);

      expect(deck[0]).toEqual(firstCard);
    });

    it('produces different order (probabilistic)', () => {
      const deck = createDeck();
      const shuffled = shuffle(deck);

      // Very unlikely that all cards remain in same position
      const samePositions = deck.filter((card, i) => card.id === shuffled[i].id);
      expect(samePositions.length).toBeLessThan(104);
    });
  });

  describe('dealCards', () => {
    it('deals correct number of cards', () => {
      const deck = createDeck();
      const { dealt, remaining } = dealCards(deck, 7);

      expect(dealt).toHaveLength(7);
      expect(remaining).toHaveLength(97);
    });

    it('deals cards from top of deck', () => {
      const deck = createDeck();
      const expectedCards = deck.slice(0, 5);
      const { dealt } = dealCards(deck, 5);

      expect(dealt).toEqual(expectedCards);
    });

    it('handles dealing more cards than available', () => {
      const deck = createDeck();
      const { dealt, remaining } = dealCards(deck, 200);

      expect(dealt).toHaveLength(104);
      expect(remaining).toHaveLength(0);
    });

    it('does not mutate original deck', () => {
      const deck = createDeck();
      const firstCard = deck[0];
      dealCards(deck, 10);

      expect(deck[0]).toEqual(firstCard);
      expect(deck).toHaveLength(104);
    });
  });

  describe('getRankValue', () => {
    it('returns correct values for number cards', () => {
      expect(getRankValue('2')).toBe(2);
      expect(getRankValue('5')).toBe(5);
      expect(getRankValue('10')).toBe(10);
    });

    it('returns correct values for face cards', () => {
      expect(getRankValue('J')).toBe(11);
      expect(getRankValue('Q')).toBe(12);
      expect(getRankValue('K')).toBe(13);
    });

    it('returns 1 for Ace', () => {
      expect(getRankValue('A')).toBe(1);
    });
  });

  describe('getSuitColor', () => {
    it('returns red for hearts and diamonds', () => {
      expect(getSuitColor('hearts')).toBe('red');
      expect(getSuitColor('diamonds')).toBe('red');
    });

    it('returns black for clubs and spades', () => {
      expect(getSuitColor('clubs')).toBe('black');
      expect(getSuitColor('spades')).toBe('black');
    });
  });

  describe('isFaceCard', () => {
    it('returns true for J, Q, K', () => {
      expect(isFaceCard('J')).toBe(true);
      expect(isFaceCard('Q')).toBe(true);
      expect(isFaceCard('K')).toBe(true);
    });

    it('returns false for number cards', () => {
      expect(isFaceCard('2')).toBe(false);
      expect(isFaceCard('10')).toBe(false);
    });

    it('returns false for Ace', () => {
      expect(isFaceCard('A')).toBe(false);
    });
  });

  describe('isEvenRank', () => {
    it('returns true for even ranks', () => {
      expect(isEvenRank('2')).toBe(true);
      expect(isEvenRank('4')).toBe(true);
      expect(isEvenRank('6')).toBe(true);
      expect(isEvenRank('8')).toBe(true);
      expect(isEvenRank('10')).toBe(true);
      expect(isEvenRank('Q')).toBe(true); // 12
    });

    it('returns false for odd ranks', () => {
      expect(isEvenRank('A')).toBe(false); // 1
      expect(isEvenRank('3')).toBe(false);
      expect(isEvenRank('5')).toBe(false);
      expect(isEvenRank('7')).toBe(false);
      expect(isEvenRank('9')).toBe(false);
      expect(isEvenRank('J')).toBe(false); // 11
      expect(isEvenRank('K')).toBe(false); // 13
    });
  });
});
