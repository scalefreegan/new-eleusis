import { describe, it, expect, beforeEach } from 'vitest';
import type { GameState, Player } from '../../src/engine/types';
import {
  canPlayCard,
  canDeclareProphet,
  canDeclareNoPlay,
  validatePlay,
  shouldReceiveSuddenDeathMarker,
  shouldBeExpelled,
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
        isDealer: true,
        type: 'ai',
        suddenDeathMarkers: 0,
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
        isDealer: false,
        type: 'ai',
        suddenDeathMarkers: 0,
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
        isDealer: false,
        type: 'ai',
        suddenDeathMarkers: 0,
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
      dealerRule: 'test-rule',
      prophetsCorrectCount: 0,
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

  describe('shouldReceiveSuddenDeathMarker', () => {
    it('returns true when hand exceeds threshold', () => {
      const player: Player = {
        ...players[1],
        hand: Array(25).fill({ suit: 'hearts', rank: 'A', id: 'test' }),
      };
      expect(shouldReceiveSuddenDeathMarker(player)).toBe(true);
    });

    it('returns false when hand is below threshold', () => {
      const player: Player = {
        ...players[1],
        hand: Array(20).fill({ suit: 'hearts', rank: 'A', id: 'test' }),
      };
      expect(shouldReceiveSuddenDeathMarker(player)).toBe(false);
    });

    it('returns false when player is expelled', () => {
      const player: Player = {
        ...players[1],
        hand: Array(30).fill({ suit: 'hearts', rank: 'A', id: 'test' }),
        isExpelled: true,
      };
      expect(shouldReceiveSuddenDeathMarker(player)).toBe(false);
    });

    it('uses custom threshold', () => {
      const player: Player = {
        ...players[1],
        hand: Array(15).fill({ suit: 'hearts', rank: 'A', id: 'test' }),
      };
      expect(shouldReceiveSuddenDeathMarker(player, 15)).toBe(true);
      expect(shouldReceiveSuddenDeathMarker(player, 20)).toBe(false);
    });
  });

  describe('shouldBeExpelled', () => {
    it('returns true when player has 3 markers', () => {
      const player: Player = {
        ...players[1],
        suddenDeathMarkers: 3,
      };
      expect(shouldBeExpelled(player)).toBe(true);
    });

    it('returns false when player has fewer than 3 markers', () => {
      const player: Player = {
        ...players[1],
        suddenDeathMarkers: 2,
      };
      expect(shouldBeExpelled(player)).toBe(false);
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
          p.isDealer ? p : { ...p, isExpelled: true }
        ),
      };
      expect(shouldGameEnd(state)).toBe(true);
    });

    it('returns true when prophet is correct 3 times', () => {
      const state = { ...baseState, prophetsCorrectCount: 3 };
      expect(shouldGameEnd(state)).toBe(true);
    });

    it('returns false when game should continue', () => {
      expect(shouldGameEnd(baseState)).toBe(false);
    });
  });
});
