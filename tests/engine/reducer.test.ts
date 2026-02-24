import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialState, gameReducer } from '../../src/engine/reducer';
import type { GameState } from '../../src/engine/types';

describe('gameReducer', () => {
  let initialState: GameState;

  beforeEach(() => {
    initialState = createInitialState();
  });

  describe('INIT_GAME', () => {
    it('creates players and shuffled deck', () => {
      const state = gameReducer(initialState, {
        type: 'INIT_GAME',
        dealerId: 'dealer',
        playerIds: ['dealer', 'player1', 'player2'],
      });

      expect(state.phase).toBe('dealing');
      expect(state.players).toHaveLength(3);
      expect(state.deck).toHaveLength(104);
      expect(state.mainLine).toHaveLength(0);
    });

    it('assigns dealer role correctly', () => {
      const state = gameReducer(initialState, {
        type: 'INIT_GAME',
        dealerId: 'dealer',
        playerIds: ['dealer', 'player1'],
      });

      const dealer = state.players.find(p => p.id === 'dealer');
      const player = state.players.find(p => p.id === 'player1');

      expect(dealer?.isDealer).toBe(true);
      expect(player?.isDealer).toBe(false);
    });

    it('sets optional dealer rule', () => {
      const state = gameReducer(initialState, {
        type: 'INIT_GAME',
        dealerId: 'dealer',
        playerIds: ['dealer', 'player1'],
        dealerRule: 'alternating-colors',
      });

      expect(state.dealerRule).toBe('alternating-colors');
    });
  });

  describe('SET_DEALER_RULE', () => {
    it('sets the dealer rule', () => {
      const state = gameReducer(initialState, {
        type: 'SET_DEALER_RULE',
        rule: 'same-suit-or-same-rank',
      });

      expect(state.dealerRule).toBe('same-suit-or-same-rank');
    });

    it('sets the rule function', () => {
      const ruleFn = (lastCard: any, newCard: any) => true;
      const state = gameReducer(initialState, {
        type: 'SET_DEALER_RULE',
        rule: 'custom',
        ruleFunction: ruleFn,
      });

      expect(state.dealerRuleFunction).toBe(ruleFn);
    });
  });

  describe('DEAL_CARDS', () => {
    beforeEach(() => {
      initialState = gameReducer(initialState, {
        type: 'INIT_GAME',
        dealerId: 'dealer',
        playerIds: ['dealer', 'player1', 'player2'],
      });
    });

    it('deals cards to non-dealer players', () => {
      const state = gameReducer(initialState, {
        type: 'DEAL_CARDS',
        count: 7,
      });

      const dealer = state.players.find(p => p.isDealer);
      const player1 = state.players.find(p => p.id === 'player1');
      const player2 = state.players.find(p => p.id === 'player2');

      expect(dealer?.hand).toHaveLength(0);
      expect(player1?.hand).toHaveLength(7);
      expect(player2?.hand).toHaveLength(7);
    });

    it('places starter card on main line', () => {
      const state = gameReducer(initialState, {
        type: 'DEAL_CARDS',
        count: 7,
      });

      expect(state.mainLine).toHaveLength(1);
      expect(state.mainLine[0].correct).toBe(true);
      expect(state.mainLine[0].playedBy).toBe('dealer');
    });

    it('reduces deck size', () => {
      const state = gameReducer(initialState, {
        type: 'DEAL_CARDS',
        count: 7,
      });

      // 104 - 14 (2 players * 7) - 1 (starter) = 89
      expect(state.deck).toHaveLength(89);
    });

    it('changes phase to playing', () => {
      const state = gameReducer(initialState, {
        type: 'DEAL_CARDS',
        count: 7,
      });

      expect(state.phase).toBe('playing');
    });
  });

  describe('DECLARE_PROPHET', () => {
    beforeEach(() => {
      initialState = gameReducer(initialState, {
        type: 'INIT_GAME',
        dealerId: 'dealer',
        playerIds: ['dealer', 'player1', 'player2'],
      });
    });

    it('sets player as prophet', () => {
      const state = gameReducer(initialState, {
        type: 'DECLARE_PROPHET',
        playerId: 'player1',
      });

      const prophet = state.players.find(p => p.id === 'player1');
      expect(prophet?.isProphet).toBe(true);
    });

    it('does not affect other players', () => {
      const state = gameReducer(initialState, {
        type: 'DECLARE_PROPHET',
        playerId: 'player1',
      });

      const player2 = state.players.find(p => p.id === 'player2');
      expect(player2?.isProphet).toBe(false);
    });
  });

  describe('RESIGN_PROPHET', () => {
    beforeEach(() => {
      initialState = gameReducer(initialState, {
        type: 'INIT_GAME',
        dealerId: 'dealer',
        playerIds: ['dealer', 'player1', 'player2'],
      });
      initialState = gameReducer(initialState, {
        type: 'DECLARE_PROPHET',
        playerId: 'player1',
      });
    });

    it('removes prophet status', () => {
      const state = gameReducer(initialState, {
        type: 'RESIGN_PROPHET',
        playerId: 'player1',
      });

      const player = state.players.find(p => p.id === 'player1');
      expect(player?.isProphet).toBe(false);
    });
  });

  describe('DECLARE_NO_PLAY', () => {
    beforeEach(() => {
      initialState = gameReducer(initialState, {
        type: 'INIT_GAME',
        dealerId: 'dealer',
        playerIds: ['dealer', 'player1', 'player2'],
      });
      initialState = gameReducer(initialState, {
        type: 'DEAL_CARDS',
        count: 7,
      });
    });

    it('changes phase to no_play_dispute', () => {
      const state = gameReducer(initialState, {
        type: 'DECLARE_NO_PLAY',
        playerId: 'player1',
      });

      expect(state.phase).toBe('no_play_dispute');
    });

    it('records the declaration', () => {
      const state = gameReducer(initialState, {
        type: 'DECLARE_NO_PLAY',
        playerId: 'player1',
      });

      expect(state.noPlayDeclaration).toBeDefined();
      expect(state.noPlayDeclaration?.playerId).toBe('player1');
      expect(state.noPlayDeclaration?.disputed).toBe(false);
    });
  });

  describe('DISPUTE_NO_PLAY', () => {
    beforeEach(() => {
      initialState = gameReducer(initialState, {
        type: 'INIT_GAME',
        dealerId: 'dealer',
        playerIds: ['dealer', 'player1', 'player2'],
      });
      initialState = gameReducer(initialState, {
        type: 'DEAL_CARDS',
        count: 7,
      });
      initialState = gameReducer(initialState, {
        type: 'DECLARE_NO_PLAY',
        playerId: 'player1',
      });
    });

    it('marks declaration as disputed', () => {
      const state = gameReducer(initialState, {
        type: 'DISPUTE_NO_PLAY',
        disputerId: 'player2',
      });

      expect(state.noPlayDeclaration?.disputed).toBe(true);
      expect(state.noPlayDeclaration?.disputedBy).toBe('player2');
    });
  });

  describe('RESOLVE_NO_PLAY', () => {
    beforeEach(() => {
      initialState = gameReducer(initialState, {
        type: 'INIT_GAME',
        dealerId: 'dealer',
        playerIds: ['dealer', 'player1', 'player2'],
      });
      initialState = gameReducer(initialState, {
        type: 'DEAL_CARDS',
        count: 7,
      });
      initialState = gameReducer(initialState, {
        type: 'DECLARE_NO_PLAY',
        playerId: 'player1',
      });
    });

    it('draws card for valid no-play', () => {
      const deckSizeBefore = initialState.deck.length;
      const state = gameReducer(initialState, {
        type: 'RESOLVE_NO_PLAY',
        valid: true,
      });

      const player = state.players.find(p => p.id === 'player1');
      expect(player?.hand).toHaveLength(8); // 7 + 1
      expect(state.deck).toHaveLength(deckSizeBefore - 1);
    });

    it('penalizes invalid no-play', () => {
      const state = gameReducer(initialState, {
        type: 'RESOLVE_NO_PLAY',
        valid: false,
      });

      const player = state.players.find(p => p.id === 'player1');
      expect(player?.score).toBe(-5);
    });

    it('clears declaration and returns to playing', () => {
      const state = gameReducer(initialState, {
        type: 'RESOLVE_NO_PLAY',
        valid: true,
      });

      expect(state.phase).toBe('playing');
      expect(state.noPlayDeclaration).toBeUndefined();
    });
  });

  describe('ADD_SUDDEN_DEATH_MARKER', () => {
    beforeEach(() => {
      initialState = gameReducer(initialState, {
        type: 'INIT_GAME',
        dealerId: 'dealer',
        playerIds: ['dealer', 'player1'],
      });
    });

    it('increments sudden death markers', () => {
      const state = gameReducer(initialState, {
        type: 'ADD_SUDDEN_DEATH_MARKER',
        playerId: 'player1',
      });

      const player = state.players.find(p => p.id === 'player1');
      expect(player?.suddenDeathMarkers).toBe(1);
    });

    it('expels player at 3 markers', () => {
      let state = initialState;
      state = gameReducer(state, {
        type: 'ADD_SUDDEN_DEATH_MARKER',
        playerId: 'player1',
      });
      state = gameReducer(state, {
        type: 'ADD_SUDDEN_DEATH_MARKER',
        playerId: 'player1',
      });
      state = gameReducer(state, {
        type: 'ADD_SUDDEN_DEATH_MARKER',
        playerId: 'player1',
      });

      const player = state.players.find(p => p.id === 'player1');
      expect(player?.suddenDeathMarkers).toBe(3);
      expect(player?.isExpelled).toBe(true);
    });
  });

  describe('EXPEL_PLAYER', () => {
    beforeEach(() => {
      initialState = gameReducer(initialState, {
        type: 'INIT_GAME',
        dealerId: 'dealer',
        playerIds: ['dealer', 'player1'],
      });
    });

    it('marks player as expelled', () => {
      const state = gameReducer(initialState, {
        type: 'EXPEL_PLAYER',
        playerId: 'player1',
      });

      const player = state.players.find(p => p.id === 'player1');
      expect(player?.isExpelled).toBe(true);
    });
  });

  describe('END_TURN', () => {
    beforeEach(() => {
      initialState = gameReducer(initialState, {
        type: 'INIT_GAME',
        dealerId: 'dealer',
        playerIds: ['dealer', 'player1', 'player2'],
      });
      initialState = gameReducer(initialState, {
        type: 'DEAL_CARDS',
        count: 7,
      });
    });

    it('advances to next player', () => {
      const state = gameReducer(initialState, {
        type: 'END_TURN',
      });

      expect(state.currentPlayerIndex).not.toBe(initialState.currentPlayerIndex);
    });

    it('increments round number', () => {
      const state = gameReducer(initialState, {
        type: 'END_TURN',
      });

      expect(state.roundNumber).toBe(initialState.roundNumber + 1);
    });

    it('skips expelled players', () => {
      let state = { ...initialState };
      state.players[1] = { ...state.players[1], isExpelled: true };
      state.currentPlayerIndex = 0;

      state = gameReducer(state, {
        type: 'END_TURN',
      });

      // Should skip player1 and go to player2
      expect(state.currentPlayerIndex).toBe(2);
    });

    it('ends game when deck is empty', () => {
      let state = { ...initialState, deck: [] };
      state = gameReducer(state, {
        type: 'END_TURN',
      });

      expect(state.phase).toBe('game_over');
    });
  });

  describe('END_GAME', () => {
    it('sets phase to game_over', () => {
      const state = gameReducer(initialState, {
        type: 'END_GAME',
      });

      expect(state.phase).toBe('game_over');
    });
  });

  describe('PLAY_CARD with pendingPlay', () => {
    beforeEach(() => {
      initialState = gameReducer(initialState, {
        type: 'INIT_GAME',
        dealerId: 'dealer',
        playerIds: ['dealer', 'player1', 'player2'],
      });
      initialState = gameReducer(initialState, {
        type: 'DEAL_CARDS',
        count: 7,
      });
    });

    it('removes cards from player hand', () => {
      const player = initialState.players.find(p => p.id === 'player1')!;
      const cardId = player.hand[0].id;

      const state = gameReducer(initialState, {
        type: 'PLAY_CARD',
        playerId: 'player1',
        cardIds: [cardId],
      });

      const updatedPlayer = state.players.find(p => p.id === 'player1');
      expect(updatedPlayer?.hand).toHaveLength(6);
      expect(updatedPlayer?.hand.find(c => c.id === cardId)).toBeUndefined();
    });

    it('stores cards in pendingPlay', () => {
      const player = initialState.players.find(p => p.id === 'player1')!;
      const cardId = player.hand[0].id;

      const state = gameReducer(initialState, {
        type: 'PLAY_CARD',
        playerId: 'player1',
        cardIds: [cardId],
      });

      expect(state.pendingPlay).toBeDefined();
      expect(state.pendingPlay?.playerId).toBe('player1');
      expect(state.pendingPlay?.cards).toHaveLength(1);
      expect(state.pendingPlay?.cards[0].id).toBe(cardId);
      expect(state.pendingPlay?.judgedCards).toHaveLength(0);
      expect(state.pendingPlay?.predictions).toEqual({});
    });

    it('sets phase to awaiting_judgment when no dealer rule function', () => {
      const player = initialState.players.find(p => p.id === 'player1')!;
      const cardId = player.hand[0].id;

      const state = gameReducer(initialState, {
        type: 'PLAY_CARD',
        playerId: 'player1',
        cardIds: [cardId],
      });

      expect(state.phase).toBe('awaiting_judgment');
    });

    it('stays in playing phase when dealer rule function exists', () => {
      const stateWithRuleFunction = gameReducer(initialState, {
        type: 'SET_DEALER_RULE',
        rule: 'test-rule',
        ruleFunction: () => true,
      });

      const player = stateWithRuleFunction.players.find(p => p.id === 'player1')!;
      const cardId = player.hand[0].id;

      const state = gameReducer(stateWithRuleFunction, {
        type: 'PLAY_CARD',
        playerId: 'player1',
        cardIds: [cardId],
      });

      expect(state.phase).toBe('playing');
    });

    it('handles multiple cards', () => {
      const player = initialState.players.find(p => p.id === 'player1')!;
      const cardIds = [player.hand[0].id, player.hand[1].id];

      const state = gameReducer(initialState, {
        type: 'PLAY_CARD',
        playerId: 'player1',
        cardIds,
      });

      expect(state.pendingPlay?.cards).toHaveLength(2);
      const updatedPlayer = state.players.find(p => p.id === 'player1');
      expect(updatedPlayer?.hand).toHaveLength(5);
    });
  });

  describe('JUDGE_CARD with pendingPlay', () => {
    beforeEach(() => {
      initialState = gameReducer(initialState, {
        type: 'INIT_GAME',
        dealerId: 'dealer',
        playerIds: ['dealer', 'player1', 'player2'],
      });
      initialState = gameReducer(initialState, {
        type: 'DEAL_CARDS',
        count: 7,
      });
    });

    it('adds correct card to mainLine', () => {
      const player = initialState.players.find(p => p.id === 'player1')!;
      const cardId = player.hand[0].id;

      let state = gameReducer(initialState, {
        type: 'PLAY_CARD',
        playerId: 'player1',
        cardIds: [cardId],
      });

      const mainLineLength = state.mainLine.length;
      state = gameReducer(state, {
        type: 'JUDGE_CARD',
        cardId,
        correct: true,
      });

      expect(state.mainLine).toHaveLength(mainLineLength + 1);
      expect(state.mainLine[state.mainLine.length - 1].correct).toBe(true);
      expect(state.mainLine[state.mainLine.length - 1].playedBy).toBe('player1');
    });

    it('adds incorrect card to branch', () => {
      const player = initialState.players.find(p => p.id === 'player1')!;
      const cardId = player.hand[0].id;

      let state = gameReducer(initialState, {
        type: 'PLAY_CARD',
        playerId: 'player1',
        cardIds: [cardId],
      });

      state = gameReducer(state, {
        type: 'JUDGE_CARD',
        cardId,
        correct: false,
      });

      const lastCard = state.mainLine[state.mainLine.length - 1];
      expect(lastCard.branches).toBeDefined();
      expect(lastCard.branches).toHaveLength(1);
      expect(lastCard.branches![0].correct).toBe(false);
      expect(lastCard.branches![0].playedBy).toBe('player1');
    });

    it('clears pendingPlay and returns to playing when all cards judged', () => {
      const player = initialState.players.find(p => p.id === 'player1')!;
      const cardId = player.hand[0].id;

      let state = gameReducer(initialState, {
        type: 'PLAY_CARD',
        playerId: 'player1',
        cardIds: [cardId],
      });

      state = gameReducer(state, {
        type: 'JUDGE_CARD',
        cardId,
        correct: true,
      });

      expect(state.pendingPlay).toBeUndefined();
      expect(state.phase).toBe('playing');
    });

    it('keeps pendingPlay when multiple cards need judgment', () => {
      const player = initialState.players.find(p => p.id === 'player1')!;
      const cardIds = [player.hand[0].id, player.hand[1].id];

      let state = gameReducer(initialState, {
        type: 'PLAY_CARD',
        playerId: 'player1',
        cardIds,
      });

      state = gameReducer(state, {
        type: 'JUDGE_CARD',
        cardId: cardIds[0],
        correct: true,
      });

      expect(state.pendingPlay).toBeDefined();
      expect(state.pendingPlay?.cards).toHaveLength(1);
      expect(state.pendingPlay?.cards[0].id).toBe(cardIds[1]);
      expect(state.pendingPlay?.judgedCards).toHaveLength(1);
      expect(state.phase).toBe('awaiting_judgment');
    });

    it('includes prophet prediction when judging', () => {
      const player = initialState.players.find(p => p.id === 'player1')!;
      const cardId = player.hand[0].id;

      let state = gameReducer(initialState, {
        type: 'PLAY_CARD',
        playerId: 'player1',
        cardIds: [cardId],
      });

      // Prophet makes a prediction
      state = gameReducer(state, {
        type: 'DECLARE_PROPHET',
        playerId: 'player2',
      });

      state = gameReducer(state, {
        type: 'PROPHET_PREDICT',
        playerId: 'player2',
        cardId,
        prediction: true,
      });

      state = gameReducer(state, {
        type: 'JUDGE_CARD',
        cardId,
        correct: true,
      });

      const playedCard = state.mainLine[state.mainLine.length - 1];
      expect(playedCard.prophetPrediction).toBeDefined();
      expect(playedCard.prophetPrediction?.predictedBy).toBe('player2');
      expect(playedCard.prophetPrediction?.prediction).toBe(true);
    });
  });

  describe('PROPHET_PREDICT with pendingPlay', () => {
    beforeEach(() => {
      initialState = gameReducer(initialState, {
        type: 'INIT_GAME',
        dealerId: 'dealer',
        playerIds: ['dealer', 'player1', 'player2'],
      });
      initialState = gameReducer(initialState, {
        type: 'DEAL_CARDS',
        count: 7,
      });
      initialState = gameReducer(initialState, {
        type: 'DECLARE_PROPHET',
        playerId: 'player2',
      });
    });

    it('attaches prediction to pending card', () => {
      const player = initialState.players.find(p => p.id === 'player1')!;
      const cardId = player.hand[0].id;

      let state = gameReducer(initialState, {
        type: 'PLAY_CARD',
        playerId: 'player1',
        cardIds: [cardId],
      });

      state = gameReducer(state, {
        type: 'PROPHET_PREDICT',
        playerId: 'player2',
        cardId,
        prediction: true,
      });

      expect(state.pendingPlay?.predictions[cardId]).toBeDefined();
      expect(state.pendingPlay?.predictions[cardId].predictedBy).toBe('player2');
      expect(state.pendingPlay?.predictions[cardId].prediction).toBe(true);
    });

    it('attaches prediction to card in mainLine if not pending', () => {
      const lastCard = initialState.mainLine[initialState.mainLine.length - 1];

      const state = gameReducer(initialState, {
        type: 'PROPHET_PREDICT',
        playerId: 'player2',
        cardId: lastCard.id,
        prediction: false,
      });

      const updatedCard = state.mainLine.find(c => c.id === lastCard.id);
      expect(updatedCard?.prophetPrediction).toBeDefined();
      expect(updatedCard?.prophetPrediction?.predictedBy).toBe('player2');
      expect(updatedCard?.prophetPrediction?.prediction).toBe(false);
    });
  });
});
