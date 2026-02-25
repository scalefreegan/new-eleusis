import { describe, it, expect, beforeEach } from 'vitest';
import type { GameState, Player } from '../../src/engine/types';
import {
  canPlayCard,
  canDeclareProphet,
  canDeclareNoPlay,
  validatePlay,
  isSuddenDeath,
  shouldExpelPlayer,
  shouldGameEnd,
} from '../../src/engine/validation';
import { createDeck } from '../../src/engine/deck';

describe('validation', () => {
  let baseState: GameState;
  let players: Player[];

  beforeEach(() => {
    players = [
      {
        id: 'dealer',
        name: 'Dealer',
        hand: [],
        score: 0,
        isProphet: false,
        isGod: true,
        type: 'ai',
        wasProphet: false,
        isExpelled: false,
      },
      {
        id: 'player1',
        name: 'Player 1',
        hand: [
          { suit: 'hearts', rank: 'A', id: 'h-a-0' },
          { suit: 'clubs', rank: '5', id: 'c-5-0' },
        ],
        score: 0,
        isProphet: false,
        isGod: false,
        type: 'ai',
        wasProphet: false,
        isExpelled: false,
      },
      {
        id: 'player2',
        name: 'Player 2',
        hand: [
          { suit: 'diamonds', rank: 'K', id: 'd-k-0' },
        ],
        score: 0,
        isProphet: false,
        isGod: false,
        type: 'ai',
        wasProphet: false,
        isExpelled: false,
      },
      {
        id: 'player3',
        name: 'Player 3',
        hand: [
          { suit: 'spades', rank: '7', id: 's-7-0' },
        ],
        score: 0,
        isProphet: false,
        isGod: false,
        type: 'ai',
        wasProphet: false,
        isExpelled: false,
      },
    ];

    baseState = {
      phase: 'playing',
      players,
      currentPlayerIndex: 1,
      deck: createDeck(),
      mainLine: [
        {
          suit: 'spades',
          rank: '2',
          id: 's-2-0',
          correct: true,
          playedBy: 'dealer',
        },
      ],
      godRule: 'test-rule',
      prophetsCorrectCount: 0,
      prophetCorrectCalls: 0,
      prophetIncorrectCalls: 0,
      totalCardsPlayed: 1,
      roundNumber: 1,
      gameStartTime: Date.now(),
    };
  });

  describe('canPlayCard', () => {
    it('returns true when player can play', () => {
      expect(canPlayCard(baseState, 'player1')).toBe(true);
    });

    it('returns false when not in playing phase', () => {
      const state = { ...baseState, phase: 'setup' as const };
      expect(canPlayCard(state, 'player1')).toBe(false);
    });

    it('returns false when not current player', () => {
      expect(canPlayCard(baseState, 'player2')).toBe(false);
    });

    it('returns false when player is expelled', () => {
      const state = {
        ...baseState,
        players: baseState.players.map(p =>
          p.id === 'player1' ? { ...p, isExpelled: true } : p
        ),
      };
      expect(canPlayCard(state, 'player1')).toBe(false);
    });

    it('returns false when player has no cards', () => {
      const state = {
        ...baseState,
        players: baseState.players.map(p =>
          p.id === 'player1' ? { ...p, hand: [] } : p
        ),
      };
      expect(canPlayCard(state, 'player1')).toBe(false);
    });

    it('returns false when player is dealer', () => {
      expect(canPlayCard(baseState, 'dealer')).toBe(false);
    });
  });

  describe('canDeclareProphet', () => {
    it('returns true when player can declare prophet', () => {
      expect(canDeclareProphet(baseState, 'player1')).toBe(true);
    });

    it('returns false when not in playing phase', () => {
      const state = { ...baseState, phase: 'setup' as const };
      expect(canDeclareProphet(state, 'player1')).toBe(false);
    });

    it('returns false when player is already prophet', () => {
      const state = {
        ...baseState,
        players: baseState.players.map(p =>
          p.id === 'player1' ? { ...p, isProphet: true } : p
        ),
      };
      expect(canDeclareProphet(state, 'player1')).toBe(false);
    });

    it('returns false when player is expelled', () => {
      const state = {
        ...baseState,
        players: baseState.players.map(p =>
          p.id === 'player1' ? { ...p, isExpelled: true } : p
        ),
      };
      expect(canDeclareProphet(state, 'player1')).toBe(false);
    });

    it('returns false when player is dealer', () => {
      expect(canDeclareProphet(baseState, 'dealer')).toBe(false);
    });

    it('returns false when main line is empty', () => {
      const state = { ...baseState, mainLine: [] };
      expect(canDeclareProphet(state, 'player1')).toBe(false);
    });
  });

  describe('canDeclareNoPlay', () => {
    it('returns true when player can declare no play', () => {
      expect(canDeclareNoPlay(baseState, 'player1')).toBe(true);
    });

    it('returns false when player cannot play', () => {
      expect(canDeclareNoPlay(baseState, 'player2')).toBe(false);
    });

    it('returns false when player has no cards', () => {
      const state = {
        ...baseState,
        players: baseState.players.map(p =>
          p.id === 'player1' ? { ...p, hand: [] } : p
        ),
      };
      expect(canDeclareNoPlay(state, 'player1')).toBe(false);
    });
  });

  describe('validatePlay', () => {
    it('validates correct play', () => {
      const result = validatePlay(baseState, ['h-a-0']);
      expect(result.valid).toBe(true);
    });

    it('rejects play with no cards', () => {
      const result = validatePlay(baseState, []);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('1-4 cards');
    });

    it('rejects play with too many cards', () => {
      const result = validatePlay(baseState, ['h-a-0', 'c-5-0', 'x-1', 'x-2', 'x-3']);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('1-4 cards');
    });

    it('rejects play with cards player does not have', () => {
      const result = validatePlay(baseState, ['d-k-0']);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('does not have');
    });

    it('rejects duplicate cards', () => {
      const result = validatePlay(baseState, ['h-a-0', 'h-a-0']);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('duplicate');
    });
  });

  describe('isSuddenDeath', () => {
    it('returns true when totalCardsPlayed >= 40', () => {
      const state: GameState = {
        ...baseState,
        totalCardsPlayed: 40,
      };
      expect(isSuddenDeath(state)).toBe(true);
    });

    it('returns false when totalCardsPlayed < 40', () => {
      const state: GameState = {
        ...baseState,
        totalCardsPlayed: 39,
      };
      expect(isSuddenDeath(state)).toBe(false);
    });

    it('returns true when 30 cards played after prophet marker', () => {
      const mainLine = Array(35).fill(null).map((_, i) => ({
        suit: 'hearts' as const,
        rank: 'A' as const,
        id: `card-${i}`,
        correct: true,
        playedBy: 'player1',
      }));
      const state: GameState = {
        ...baseState,
        mainLine,
        prophetMarkerIndex: 4, // 30 cards after index 4 = 35 total - 5 before prophet
        totalCardsPlayed: 35,
      };
      expect(isSuddenDeath(state)).toBe(true);
    });

    it('returns false when fewer than 30 cards after prophet marker', () => {
      const mainLine = Array(30).fill(null).map((_, i) => ({
        suit: 'hearts' as const,
        rank: 'A' as const,
        id: `card-${i}`,
        correct: true,
        playedBy: 'player1',
      }));
      const state: GameState = {
        ...baseState,
        mainLine,
        prophetMarkerIndex: 4,
        totalCardsPlayed: 30,
      };
      expect(isSuddenDeath(state)).toBe(false);
    });
  });

  describe('shouldExpelPlayer', () => {
    it('returns true when in sudden death', () => {
      const state: GameState = {
        ...baseState,
        totalCardsPlayed: 40,
      };
      expect(shouldExpelPlayer(state)).toBe(true);
    });

    it('returns false when not in sudden death', () => {
      const state: GameState = {
        ...baseState,
        totalCardsPlayed: 20,
      };
      expect(shouldExpelPlayer(state)).toBe(false);
    });
  });

  describe('shouldGameEnd', () => {
    it('returns true when deck is empty', () => {
      const state = { ...baseState, deck: [] };
      expect(shouldGameEnd(state)).toBe(true);
    });

    it('returns true when all non-dealer players are expelled', () => {
      const state = {
        ...baseState,
        players: baseState.players.map(p =>
          p.isGod ? p : { ...p, isExpelled: true }
        ),
      };
      expect(shouldGameEnd(state)).toBe(true);
    });

    it('returns true when any player has empty hand', () => {
      const state = {
        ...baseState,
        players: baseState.players.map(p =>
          p.id === 'player1' ? { ...p, hand: [] } : p
        ),
      };
      expect(shouldGameEnd(state)).toBe(true);
    });

    it('returns false when game should continue', () => {
      expect(shouldGameEnd(baseState)).toBe(false);
    });

    it('returns false when prophet has empty hand', () => {
      const state = {
        ...baseState,
        players: baseState.players.map(p =>
          p.id === 'player1' ? { ...p, hand: [], isProphet: true } : p
        ),
      };
      expect(shouldGameEnd(state)).toBe(false);
    });

    it('returns false when expelled player has empty hand', () => {
      const state = {
        ...baseState,
        players: baseState.players.map(p =>
          p.id === 'player1' ? { ...p, hand: [], isExpelled: true } : p
        ),
      };
      expect(shouldGameEnd(state)).toBe(false);
    });
  });
});
