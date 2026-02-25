import { describe, it, expect } from 'vitest';
import {
  selectRandomCard,
  selectCardCount,
  selectCardsToPlay,
  shouldDeclareNoPlay,
  shouldDeclareProphet,
  createHypothesisEngine,
  updateHypothesisEngine,
} from '../../../src/engine/ai/player';
import type { Card, GameState, PlayedCard } from '../../../src/engine/types';

describe('AI Player', () => {
  const mockCards: Card[] = [
    { suit: 'hearts', rank: '5', id: 'h-5-0' },
    { suit: 'spades', rank: '7', id: 's-7-0' },
    { suit: 'diamonds', rank: 'K', id: 'd-k-0' },
  ];

  const mockState: GameState = {
    phase: 'playing',
    players: [],
    currentPlayerIndex: 0,
    deck: [],
    mainLine: [],
    dealerRule: 'test',
    roundNumber: 1,
    gameStartTime: Date.now(),
  };

  describe('selectRandomCard', () => {
    it('returns a card from the hand', () => {
      const card = selectRandomCard(mockCards);
      expect(mockCards).toContain(card);
    });

    it('returns null for empty hand', () => {
      const card = selectRandomCard([]);
      expect(card).toBeNull();
    });

    it('selects different cards (probabilistic)', () => {
      const selections = new Set();
      for (let i = 0; i < 50; i++) {
        const card = selectRandomCard(mockCards);
        if (card) {
          selections.add(card.id);
        }
      }
      // Should select at least 2 different cards in 50 tries
      expect(selections.size).toBeGreaterThan(1);
    });
  });

  describe('selectCardCount', () => {
    it('returns 1 for non-empty hand', () => {
      expect(selectCardCount(mockCards)).toBe(1);
    });

    it('returns 0 for empty hand', () => {
      expect(selectCardCount([])).toBe(0);
    });

    it('returns 1 for single card', () => {
      expect(selectCardCount([mockCards[0]])).toBe(1);
    });
  });

  describe('selectCardsToPlay', () => {
    it('returns array of card IDs', () => {
      const cardIds = selectCardsToPlay(mockCards, mockState);
      expect(Array.isArray(cardIds)).toBe(true);
      expect(cardIds.length).toBeGreaterThan(0);
    });

    it('returns card IDs from hand', () => {
      const cardIds = selectCardsToPlay(mockCards, mockState);
      const handIds = mockCards.map(c => c.id);
      cardIds.forEach(id => {
        expect(handIds).toContain(id);
      });
    });

    it('returns empty array for empty hand', () => {
      const cardIds = selectCardsToPlay([], mockState);
      expect(cardIds).toEqual([]);
    });

    it('returns unique card IDs', () => {
      const cardIds = selectCardsToPlay(mockCards, mockState);
      const uniqueIds = new Set(cardIds);
      expect(uniqueIds.size).toBe(cardIds.length);
    });
  });

  describe('shouldDeclareNoPlay', () => {
    it('returns false for Phase 3 AI', () => {
      expect(shouldDeclareNoPlay(mockCards, mockState)).toBe(false);
    });

    it('returns false even with empty hand', () => {
      expect(shouldDeclareNoPlay([], mockState)).toBe(false);
    });
  });

  describe('shouldDeclareProphet', () => {
    it('returns false for Phase 3 AI', () => {
      expect(shouldDeclareProphet(mockState, 'player1')).toBe(false);
    });
  });

  describe('createHypothesisEngine', () => {
    it('creates a new hypothesis engine', () => {
      const engine = createHypothesisEngine();
      expect(engine).toBeDefined();
      const stats = engine.getStats();
      expect(stats.observations).toBe(0);
      expect(stats.consistentRules).toBeGreaterThan(0);
    });
  });

  describe('updateHypothesisEngine', () => {
    it('updates engine with main line observations', () => {
      const engine = createHypothesisEngine();
      const stateWithMainLine: GameState = {
        ...mockState,
        mainLine: [
          { suit: 'hearts', rank: '5', id: 'h-5-0', correct: true, playedBy: 'p1' },
          { suit: 'spades', rank: '7', id: 's-7-0', correct: true, playedBy: 'p2' },
          { suit: 'diamonds', rank: '3', id: 'd-3-0', correct: true, playedBy: 'p3' },
        ],
      };

      updateHypothesisEngine(engine, stateWithMainLine);

      const stats = engine.getStats();
      expect(stats.observations).toBe(2); // n-1 for n cards
    });

    it('resets engine before updating', () => {
      const engine = createHypothesisEngine();

      // First update
      const state1: GameState = {
        ...mockState,
        mainLine: [
          { suit: 'hearts', rank: '5', id: 'h-5-0', correct: true, playedBy: 'p1' },
          { suit: 'spades', rank: '7', id: 's-7-0', correct: true, playedBy: 'p2' },
        ],
      };
      updateHypothesisEngine(engine, state1);
      expect(engine.getStats().observations).toBe(1);

      // Second update with more cards
      const state2: GameState = {
        ...mockState,
        mainLine: [
          { suit: 'hearts', rank: '5', id: 'h-5-0', correct: true, playedBy: 'p1' },
          { suit: 'spades', rank: '7', id: 's-7-0', correct: true, playedBy: 'p2' },
          { suit: 'diamonds', rank: '3', id: 'd-3-0', correct: true, playedBy: 'p3' },
          { suit: 'clubs', rank: '9', id: 'c-9-0', correct: true, playedBy: 'p4' },
        ],
      };
      updateHypothesisEngine(engine, state2);
      expect(engine.getStats().observations).toBe(3); // Should be reset to just state2
    });
  });

  describe('selectCardsToPlay with hypothesis engine', () => {
    it('uses hypothesis engine when provided with main line', () => {
      const engine = createHypothesisEngine();
      const stateWithMainLine: GameState = {
        ...mockState,
        mainLine: [
          { suit: 'hearts', rank: '5', id: 'h-5-0', correct: true, playedBy: 'p1' },
          { suit: 'spades', rank: '7', id: 's-7-0', correct: true, playedBy: 'p2' },
        ],
      };

      updateHypothesisEngine(engine, stateWithMainLine);

      const hand: Card[] = [
        { suit: 'diamonds', rank: '3', id: 'd-3-0' },
        { suit: 'clubs', rank: '9', id: 'c-9-0' },
      ];

      const cardIds = selectCardsToPlay(hand, stateWithMainLine, engine);
      expect(cardIds.length).toBeGreaterThan(0);
      expect(hand.map(c => c.id)).toContain(cardIds[0]);
    });

    it('falls back to random when no main line', () => {
      const engine = createHypothesisEngine();
      const cardIds = selectCardsToPlay(mockCards, mockState, engine);
      expect(cardIds.length).toBeGreaterThan(0);
    });

    it('falls back to random when no engine provided', () => {
      const stateWithMainLine: GameState = {
        ...mockState,
        mainLine: [
          { suit: 'hearts', rank: '5', id: 'h-5-0', correct: true, playedBy: 'p1' },
        ],
      };
      const cardIds = selectCardsToPlay(mockCards, stateWithMainLine);
      expect(cardIds.length).toBeGreaterThan(0);
    });
  });
});
