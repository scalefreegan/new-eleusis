import { describe, it, expect, beforeEach } from 'vitest';
import type { GameState, Player, PlayedCard } from '../../src/engine/types';
import {
  calculatePlayerScore,
  calculateDealerScore,
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
      isDealer: false,
      type: 'ai',
      suddenDeathMarkers: 0,
      isExpelled: false,
    };

    player2 = {
      id: 'player2',
      name: 'Player 2',
      hand: [],
      score: 0,
      isProphet: false,
      isDealer: false,
      type: 'ai',
      suddenDeathMarkers: 0,
      isExpelled: false,
    };

    dealer = {
      id: 'dealer',
      name: 'Dealer',
      hand: [],
      score: 0,
      isProphet: false,
      isDealer: true,
      type: 'ai',
      suddenDeathMarkers: 0,
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
    it('scores points for correct plays', () => {
      const score = calculatePlayerScore(player1, playedCards);
      expect(score).toBe(2); // 2 correct cards
    });

    it('does not score points for incorrect plays', () => {
      const score = calculatePlayerScore(player2, playedCards);
      expect(score).toBe(0); // 1 incorrect card
    });

    it('penalizes cards in hand', () => {
      const playerWithHand = {
        ...player1,
        hand: [
          { suit: 'spades', rank: '2', id: 's-2-0' },
          { suit: 'spades', rank: '3', id: 's-3-0' },
        ],
      };
      const score = calculatePlayerScore(playerWithHand, playedCards);
      expect(score).toBe(0); // 2 correct - 2 in hand
    });

    it('scores correct prophet predictions', () => {
      const cardsWithProphet: PlayedCard[] = [
        {
          suit: 'hearts',
          rank: 'A',
          id: 'h-a-0',
          correct: true,
          playedBy: 'player2',
          prophetPrediction: {
            predictedBy: 'player1',
            prediction: true,
          },
        },
      ];
      const score = calculatePlayerScore(player1, cardsWithProphet);
      expect(score).toBe(2); // +2 for correct prediction
    });

    it('penalizes incorrect prophet predictions', () => {
      const cardsWithProphet: PlayedCard[] = [
        {
          suit: 'hearts',
          rank: 'A',
          id: 'h-a-0',
          correct: true,
          playedBy: 'player2',
          prophetPrediction: {
            predictedBy: 'player1',
            prediction: false,
          },
        },
      ];
      const score = calculatePlayerScore(player1, cardsWithProphet);
      expect(score).toBe(-1); // -1 for wrong prediction
    });

    it('penalizes sudden death markers', () => {
      const playerWithMarkers = {
        ...player1,
        suddenDeathMarkers: 2,
      };
      const score = calculatePlayerScore(playerWithMarkers, playedCards);
      expect(score).toBe(-8); // 2 correct - 10 penalty
    });

    it('combines all scoring factors', () => {
      const playerWithEverything = {
        ...player1,
        hand: [{ suit: 'spades', rank: '2', id: 's-2-0' }],
        suddenDeathMarkers: 1,
      };
      const cardsWithProphet: PlayedCard[] = [
        ...playedCards,
        {
          suit: 'hearts',
          rank: 'Q',
          id: 'h-q-0',
          correct: true,
          playedBy: 'player2',
          prophetPrediction: {
            predictedBy: 'player1',
            prediction: true,
          },
        },
      ];
      const score = calculatePlayerScore(playerWithEverything, cardsWithProphet);
      // 2 correct plays + 2 prophet bonus - 1 in hand - 5 marker = -2
      expect(score).toBe(-2);
    });
  });

  describe('calculateDealerScore', () => {
    it('scores points for incorrect plays', () => {
      const state: GameState = {
        phase: 'game_over',
        players: [dealer, player1, player2],
        currentPlayerIndex: 0,
        deck: [],
        mainLine: playedCards,
        dealerRule: 'test',
        prophetsCorrectCount: 0,
        roundNumber: 1,
        gameStartTime: Date.now(),
      };
      const score = calculateDealerScore(state);
      // 1 incorrect play * 2 = 2, + 10 for not overthrown = 12
      expect(score).toBe(12);
    });

    it('awards bonus for not being overthrown', () => {
      const state: GameState = {
        phase: 'game_over',
        players: [dealer, player1],
        currentPlayerIndex: 0,
        deck: [],
        mainLine: [],
        dealerRule: 'test',
        prophetsCorrectCount: 2,
        roundNumber: 1,
        gameStartTime: Date.now(),
      };
      const score = calculateDealerScore(state);
      expect(score).toBe(10); // Bonus for not overthrown
    });

    it('penalizes being overthrown', () => {
      const state: GameState = {
        phase: 'game_over',
        players: [dealer, player1],
        currentPlayerIndex: 0,
        deck: [],
        mainLine: [],
        dealerRule: 'test',
        prophetsCorrectCount: 3,
        roundNumber: 1,
        gameStartTime: Date.now(),
      };
      const score = calculateDealerScore(state);
      expect(score).toBe(-15); // Penalty for overthrown
    });

    it('scores points for cards in player hands', () => {
      const state: GameState = {
        phase: 'game_over',
        players: [
          dealer,
          {
            ...player1,
            hand: Array(10).fill({ suit: 'hearts', rank: 'A', id: 'test' }),
          },
        ],
        currentPlayerIndex: 0,
        deck: [],
        mainLine: [],
        dealerRule: 'test',
        prophetsCorrectCount: 0,
        roundNumber: 1,
        gameStartTime: Date.now(),
      };
      const score = calculateDealerScore(state);
      // 10 cards / 5 = 2 + 10 bonus = 12
      expect(score).toBe(12);
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
        dealerRule: 'test',
        prophetsCorrectCount: 0,
        roundNumber: 1,
        gameStartTime: Date.now(),
      };
      const scores = calculateFinalScores(state);

      expect(scores['dealer']).toBe(12); // 1 incorrect * 2 + 10 bonus
      expect(scores['player1']).toBe(2); // 2 correct
      expect(scores['player2']).toBe(0); // 0 correct
    });
  });

  describe('getLeader', () => {
    it('returns player with highest score', () => {
      const state: GameState = {
        phase: 'game_over',
        players: [dealer, player1, player2],
        currentPlayerIndex: 0,
        deck: [],
        mainLine: playedCards,
        dealerRule: 'test',
        prophetsCorrectCount: 0,
        roundNumber: 1,
        gameStartTime: Date.now(),
      };
      const leader = getLeader(state);
      expect(leader?.id).toBe('dealer');
    });

    it('returns null when no players', () => {
      const state: GameState = {
        phase: 'game_over',
        players: [],
        currentPlayerIndex: 0,
        deck: [],
        mainLine: [],
        dealerRule: 'test',
        prophetsCorrectCount: 0,
        roundNumber: 1,
        gameStartTime: Date.now(),
      };
      const leader = getLeader(state);
      expect(leader).toBeNull();
    });
  });
});
