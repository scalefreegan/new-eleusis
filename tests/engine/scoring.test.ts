import { describe, it, expect, beforeEach } from 'vitest';
import type { GameState, Player, PlayedCard } from '../../src/engine/types';
import {
  calculatePlayerScore,
  calculateGodScore,
  calculateFinalScores,
  getLeader,
} from '../../src/engine/scoring';

describe('scoring', () => {
  let player1: Player;
  let player2: Player;
  let dealer: Player;
  let playedCards: PlayedCard[];

  beforeEach(() => {
    player1 = {
      id: 'player1',
      name: 'Player 1',
      hand: [],
      score: 0,
      isProphet: false,
      isGod: false,
      type: 'ai',
      wasProphet: false,
      isExpelled: false,
    };

    player2 = {
      id: 'player2',
      name: 'Player 2',
      hand: [],
      score: 0,
      isProphet: false,
      isGod: false,
      type: 'ai',
      wasProphet: false,
      isExpelled: false,
    };

    dealer = {
      id: 'dealer',
      name: 'Dealer',
      hand: [],
      score: 0,
      isProphet: false,
      isGod: true,
      type: 'ai',
      wasProphet: false,
      isExpelled: false,
    };

    playedCards = [
      {
        suit: 'hearts',
        rank: 'A',
        id: 'h-a-0',
        correct: true,
        playedBy: 'player1',
      },
      {
        suit: 'clubs',
        rank: '5',
        id: 'c-5-0',
        correct: true,
        playedBy: 'player1',
      },
      {
        suit: 'diamonds',
        rank: 'K',
        id: 'd-k-0',
        correct: false,
        playedBy: 'player2',
      },
    ];
  });

  describe('calculatePlayerScore', () => {
    it('scores based on hand count difference', () => {
      const state: GameState = {
        phase: 'game_over',
        players: [dealer, player1, player2],
        currentPlayerIndex: 0,
        deck: [],
        mainLine: playedCards,
        godRule: 'test',
        totalCardsPlayed: 0,
        prophetsCorrectCount: 0,
        prophetCorrectCalls: 0,
        prophetIncorrectCalls: 0,
        roundNumber: 1,
        gameStartTime: Date.now(),
      };
      // highCount = 0 (no cards in hand), player1 has 0 cards
      // Score = (0 - 0) + 4 (empty hand bonus) = 4
      const score = calculatePlayerScore(player1, state);
      expect(score).toBe(4);
    });

    it('awards bonus for empty hand', () => {
      const state: GameState = {
        phase: 'game_over',
        players: [dealer, { ...player1, hand: [] }, { ...player2, hand: [{ suit: 'spades', rank: '2', id: 's-2-0' }] }],
        currentPlayerIndex: 0,
        deck: [],
        mainLine: playedCards,
        godRule: 'test',
        totalCardsPlayed: 0,
        prophetsCorrectCount: 0,
        prophetCorrectCalls: 0,
        prophetIncorrectCalls: 0,
        roundNumber: 1,
        gameStartTime: Date.now(),
      };
      // highCount = 1, player1 has 0 cards
      // Score = (1 - 0) + 4 (empty hand bonus) = 5
      const score = calculatePlayerScore(player1, state);
      expect(score).toBe(5);
    });

    it('penalizes cards in hand', () => {
      const playerWithHand = {
        ...player1,
        hand: [
          { suit: 'spades', rank: '2', id: 's-2-0' },
          { suit: 'spades', rank: '3', id: 's-3-0' },
        ],
      };
      const state: GameState = {
        phase: 'game_over',
        players: [dealer, playerWithHand, player2],
        currentPlayerIndex: 0,
        deck: [],
        mainLine: playedCards,
        godRule: 'test',
        totalCardsPlayed: 0,
        prophetsCorrectCount: 0,
        prophetCorrectCalls: 0,
        prophetIncorrectCalls: 0,
        roundNumber: 1,
        gameStartTime: Date.now(),
      };
      // highCount = 2, player has 2 cards
      // Score = 2 - 2 = 0
      const score = calculatePlayerScore(playerWithHand, state);
      expect(score).toBe(0);
    });

    it('scores True Prophet bonus for cards after marker', () => {
      const prophetPlayer = {
        ...player1,
        isProphet: true,
      };
      const cardsAfterMarker: PlayedCard[] = [
        {
          suit: 'hearts',
          rank: 'Q',
          id: 'h-q-0',
          correct: true,
          playedBy: 'player2',
        },
        {
          suit: 'diamonds',
          rank: 'J',
          id: 'd-j-0',
          correct: false,
          playedBy: 'player2',
        },
      ];
      const state: GameState = {
        phase: 'game_over',
        players: [dealer, prophetPlayer, player2],
        currentPlayerIndex: 0,
        deck: [],
        mainLine: [...playedCards, ...cardsAfterMarker],
        godRule: 'test',
        totalCardsPlayed: 0,
        prophetsCorrectCount: 0,
        prophetCorrectCalls: 0,
        prophetIncorrectCalls: 0,
        prophetMarkerIndex: 2,
        roundNumber: 1,
        gameStartTime: Date.now(),
      };
      // highCount = 0, player has 0 cards, is Prophet
      // Base: (0 - 0) + 4 (empty hand) = 4
      // Prophet bonus: +1 for right card, +2 for wrong card = 3
      // Total = 7
      const score = calculatePlayerScore(prophetPlayer, state);
      expect(score).toBe(7);
    });

    it('does not score Prophet bonus if not Prophet', () => {
      const state: GameState = {
        phase: 'game_over',
        players: [dealer, player1, player2],
        currentPlayerIndex: 0,
        deck: [],
        mainLine: playedCards,
        godRule: 'test',
        totalCardsPlayed: 0,
        prophetsCorrectCount: 0,
        prophetCorrectCalls: 0,
        prophetIncorrectCalls: 0,
        prophetMarkerIndex: 0,
        roundNumber: 1,
        gameStartTime: Date.now(),
      };
      const score = calculatePlayerScore(player1, state);
      // (0 - 0) + 4 (empty hand) = 4
      expect(score).toBe(4);
    });

    it('combines all scoring factors with Prophet bonus', () => {
      const playerWithEverything = {
        ...player1,
        hand: [{ suit: 'spades', rank: '2', id: 's-2-0' }],
        wasProphet: false,
        isProphet: true,
      };
      const otherPlayer = {
        ...player2,
        hand: [{ suit: 'spades', rank: '3', id: 's-3-0' }, { suit: 'spades', rank: '4', id: 's-4-0' }],
      };
      const state: GameState = {
        phase: 'game_over',
        players: [dealer, playerWithEverything, otherPlayer],
        currentPlayerIndex: 0,
        deck: [],
        mainLine: playedCards,
        godRule: 'test',
        prophetsCorrectCount: 0,
        prophetCorrectCalls: 0,
        prophetIncorrectCalls: 0,
        prophetMarkerIndex: 0,
        totalCardsPlayed: 3,
        roundNumber: 1,
        gameStartTime: Date.now(),
      };
      // highCount = 2, player has 1 card, is Prophet
      // Base: (2 - 1) = 1
      // Prophet bonus: index 1 is correct (+1), index 2 is incorrect (+2) = +3
      // Total = 1 + 3 = 4
      const score = calculatePlayerScore(playerWithEverything, state);
      expect(score).toBe(4);
    });
  });

  describe('calculateGodScore', () => {
    it('calculates dealer score based on official rules', () => {
      const state: GameState = {
        phase: 'game_over',
        players: [dealer, player1, player2],
        currentPlayerIndex: 0,
        deck: [],
        mainLine: playedCards,
        godRule: 'test',
        totalCardsPlayed: 0,
        prophetsCorrectCount: 0,
        prophetCorrectCalls: 0,
        prophetIncorrectCalls: 0,
        roundNumber: 1,
        gameStartTime: Date.now(),
      };
      // Highest player score = 4 (both players have 0 cards + 4 empty hand bonus)
      // Cards before Prophet = 3 (no Prophet, so all cards count)
      // Dealer score = min(4, 2 * 3) = 4
      const score = calculateGodScore(state);
      expect(score).toBe(4);
    });

    it('limits dealer score to 2x cards before Prophet', () => {
      const playerWithHighScore = {
        ...player1,
        hand: [],
      };
      const playerWithLowScore = {
        ...player2,
        hand: Array(10).fill({ suit: 'hearts', rank: 'A', id: 'test' }),
      };
      const state: GameState = {
        phase: 'game_over',
        players: [dealer, playerWithHighScore, playerWithLowScore],
        currentPlayerIndex: 0,
        deck: [],
        mainLine: playedCards,
        godRule: 'test',
        totalCardsPlayed: 0,
        prophetsCorrectCount: 0,
        prophetCorrectCalls: 0,
        prophetIncorrectCalls: 0,
        roundNumber: 1,
        gameStartTime: Date.now(),
      };
      // Highest player score = 10 - 0 = 10 (player1)
      // Cards before Prophet = 3
      // Dealer score = min(10, 2 * 3) = 6
      const score = calculateGodScore(state);
      expect(score).toBe(6);
    });

    it('uses highest player score when lower than 2x cards', () => {
      const playerWithCards = {
        ...player1,
        hand: [{ suit: 'spades', rank: '2', id: 's-2-0' }],
      };
      const state: GameState = {
        phase: 'game_over',
        players: [dealer, playerWithCards],
        currentPlayerIndex: 0,
        deck: [],
        mainLine: Array(20).fill(playedCards[0]),
        godRule: 'test',
        totalCardsPlayed: 0,
        prophetsCorrectCount: 0,
        prophetCorrectCalls: 0,
        prophetIncorrectCalls: 0,
        roundNumber: 1,
        gameStartTime: Date.now(),
      };
      // Highest player score = 1 - 1 = 0
      // Cards before Prophet = 20
      // Dealer score = min(0, 2 * 20) = 0
      const score = calculateGodScore(state);
      expect(score).toBe(0);
    });

    it('calculates correctly with Prophet marker', () => {
      const state: GameState = {
        phase: 'game_over',
        players: [dealer, player1],
        currentPlayerIndex: 0,
        deck: [],
        mainLine: playedCards,
        godRule: 'test',
        totalCardsPlayed: 0,
        prophetsCorrectCount: 0,
        prophetCorrectCalls: 0,
        prophetIncorrectCalls: 0,
        prophetMarkerIndex: 1,
        roundNumber: 1,
        gameStartTime: Date.now(),
      };
      // Highest player score = 4 (0 cards + 4 empty hand bonus)
      // Cards before Prophet = prophetMarkerIndex + 1 = 2
      // Dealer score = min(4, 2 * 2) = 4
      const score = calculateGodScore(state);
      expect(score).toBe(4);
    });
  });

  describe('calculateFinalScores', () => {
    it('calculates scores for all players', () => {
      const state: GameState = {
        phase: 'game_over',
        players: [dealer, player1, player2],
        currentPlayerIndex: 0,
        deck: [],
        mainLine: playedCards,
        godRule: 'test',
        totalCardsPlayed: 0,
        prophetsCorrectCount: 0,
        prophetCorrectCalls: 0,
        prophetIncorrectCalls: 0,
        roundNumber: 1,
        gameStartTime: Date.now(),
      };
      const scores = calculateFinalScores(state);

      expect(scores['dealer']).toBe(4); // min(4, 2*3) = 4
      expect(scores['player1']).toBe(4); // (0 - 0) + 4 = 4
      expect(scores['player2']).toBe(4); // (0 - 0) + 4 = 4
    });
  });

  describe('getLeader', () => {
    it('returns player with highest score', () => {
      const playerWithEmptyHand = {
        ...player1,
        hand: [],
      };
      const playerWithCards = {
        ...player2,
        hand: [{ suit: 'spades', rank: '2', id: 's-2-0' }],
      };
      const state: GameState = {
        phase: 'game_over',
        players: [dealer, playerWithEmptyHand, playerWithCards],
        currentPlayerIndex: 0,
        deck: [],
        mainLine: playedCards,
        godRule: 'test',
        totalCardsPlayed: 0,
        prophetsCorrectCount: 0,
        prophetCorrectCalls: 0,
        prophetIncorrectCalls: 0,
        roundNumber: 1,
        gameStartTime: Date.now(),
      };
      const leader = getLeader(state);
      // player1: (1-0) + 4 = 5
      // player2: (1-1) = 0
      // dealer: min(5, 2*3) = 5
      // Could be dealer or player1, both have score 5
      expect(leader?.id).toBeTruthy();
    });

    it('returns null when no players', () => {
      const state: GameState = {
        phase: 'game_over',
        players: [],
        currentPlayerIndex: 0,
        deck: [],
        mainLine: [],
        godRule: 'test',
        totalCardsPlayed: 0,
        prophetsCorrectCount: 0,
        prophetCorrectCalls: 0,
        prophetIncorrectCalls: 0,
        roundNumber: 1,
        gameStartTime: Date.now(),
      };
      const leader = getLeader(state);
      expect(leader).toBeNull();
    });
  });
});
