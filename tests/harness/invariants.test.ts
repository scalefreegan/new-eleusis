import { describe, it, expect, beforeEach } from 'vitest';
import { checkInvariants } from './invariants';
import { createInitialState, gameReducer } from '../../src/engine/reducer';
import type { GameState, GameAction, Card, Player, PlayedCard, PendingPlay } from './types';

function makeCard(id: string, suit = 'hearts' as const, rank = '5' as const): Card {
  return { id, suit, rank };
}

function makePlayedCard(id: string, correct: boolean, playedBy = 'player1'): PlayedCard {
  return { id, suit: 'hearts', rank: '5', correct, playedBy };
}

function makePlayer(id: string, overrides: Partial<Player> = {}): Player {
  return {
    id,
    name: id,
    hand: [],
    score: 0,
    isProphet: false,
    isGod: false,
    type: 'ai',
    wasProphet: false,
    isExpelled: false,
    ...overrides,
  };
}

function makePlayingState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: 'playing',
    players: [
      makePlayer('god', { isGod: true }),
      makePlayer('player1', { hand: [makeCard('c1'), makeCard('c2')] }),
      makePlayer('player2', { hand: [makeCard('c3'), makeCard('c4')] }),
    ],
    currentPlayerIndex: 1,
    deck: Array.from({ length: 96 }, (_, i) => makeCard(`deck-${i}`)),
    mainLine: [makePlayedCard('starter', true, 'god')],
    godRule: 'test-rule',
    pendingPlay: undefined,
    prophetMarkerIndex: undefined,
    prophetHandAside: undefined,
    prophetCorrectCalls: 0,
    prophetIncorrectCalls: 0,
    roundNumber: 1,
    gameStartTime: 0,
    totalCardsPlayed: 0,
    ...overrides,
  };
}

// Total cards in makePlayingState: 96 (deck) + 2 + 2 (hands) + 1 (mainLine) = 101

describe('checkInvariants', () => {
  describe('card conservation', () => {
    it('passes when card count is conserved', () => {
      const prev = makePlayingState();
      const action: GameAction = { type: 'END_TURN' };
      const next = { ...prev, currentPlayerIndex: 2, roundNumber: 2 };

      const violations = checkInvariants(prev, action, next);
      const cardViolations = violations.filter(v => v.type === 'CARD_CONSERVATION');
      expect(cardViolations).toHaveLength(0);
    });

    it('fires when cards are created from nowhere', () => {
      const prev = makePlayingState();
      const action: GameAction = { type: 'END_TURN' };
      const next = makePlayingState({
        deck: [...prev.deck, makeCard('extra')],
        currentPlayerIndex: 2,
        roundNumber: 2,
      });

      const violations = checkInvariants(prev, action, next);
      const cardViolations = violations.filter(v => v.type === 'CARD_CONSERVATION');
      expect(cardViolations).toHaveLength(1);
      expect(cardViolations[0].message).toContain('101');
      expect(cardViolations[0].message).toContain('102');
    });

    it('fires when cards disappear', () => {
      const prev = makePlayingState();
      const action: GameAction = { type: 'END_TURN' };
      const next = makePlayingState({
        deck: prev.deck.slice(1),
        currentPlayerIndex: 2,
        roundNumber: 2,
      });

      const violations = checkInvariants(prev, action, next);
      expect(violations.some(v => v.type === 'CARD_CONSERVATION')).toBe(true);
    });

    it('counts cards in pendingPlay', () => {
      const pending: PendingPlay = {
        playerId: 'player1',
        cards: [makeCard('p1')],
        judgedCards: [makePlayedCard('p2', true)],
        predictions: {},
      };
      const prev = makePlayingState({
        phase: 'awaiting_judgment',
        pendingPlay: pending,
        players: [
          makePlayer('god', { isGod: true }),
          makePlayer('player1', { hand: [] }), // cards moved to pending
          makePlayer('player2', { hand: [makeCard('c3'), makeCard('c4')] }),
        ],
        // deck(96) + hands(0+2) + mainLine(1) + pending(1+1) = 101
      });
      const action: GameAction = { type: 'JUDGE_CARD', cardId: 'p1', correct: true };
      const next = { ...prev }; // same count

      const violations = checkInvariants(prev, action, next);
      expect(violations.filter(v => v.type === 'CARD_CONSERVATION')).toHaveLength(0);
    });

    it('counts cards in prophetHandAside', () => {
      const prev = makePlayingState({
        prophetHandAside: [makeCard('aside1'), makeCard('aside2')],
        players: [
          makePlayer('god', { isGod: true }),
          makePlayer('player1', { hand: [], isProphet: true }), // hand set aside
          makePlayer('player2', { hand: [makeCard('c3'), makeCard('c4')] }),
        ],
        // deck(96) + hands(0+2) + mainLine(1) + aside(2) = 101
      });
      const action: GameAction = { type: 'END_TURN' };
      const next = { ...prev, currentPlayerIndex: 2, roundNumber: 2 };

      const violations = checkInvariants(prev, action, next);
      expect(violations.filter(v => v.type === 'CARD_CONSERVATION')).toHaveLength(0);
    });

    it('counts cards in branches', () => {
      const mainLineWithBranch: PlayedCard[] = [
        {
          ...makePlayedCard('starter', true, 'god'),
          branches: [makePlayedCard('branch1', false)],
        },
      ];
      const prev = makePlayingState({
        mainLine: mainLineWithBranch,
        // deck(96) + hands(2+2) + mainLine(1) + branches(1) = 102
        // need to adjust deck to keep total at 101
        deck: Array.from({ length: 95 }, (_, i) => makeCard(`deck-${i}`)),
      });
      const action: GameAction = { type: 'END_TURN' };
      const next = { ...prev, currentPlayerIndex: 2, roundNumber: 2 };

      const violations = checkInvariants(prev, action, next);
      expect(violations.filter(v => v.type === 'CARD_CONSERVATION')).toHaveLength(0);
    });
  });

  describe('negative hand size', () => {
    it('passes with valid hand sizes', () => {
      const prev = makePlayingState();
      const action: GameAction = { type: 'END_TURN' };
      const next = { ...prev, currentPlayerIndex: 2, roundNumber: 2 };

      const violations = checkInvariants(prev, action, next);
      expect(violations.filter(v => v.type === 'PLAYER_HAND_NEGATIVE')).toHaveLength(0);
    });

    it('fires when a player has negative hand size', () => {
      const prev = makePlayingState();
      const action: GameAction = { type: 'END_TURN' };
      const next = makePlayingState({
        players: [
          makePlayer('god', { isGod: true }),
          makePlayer('player1', { hand: [] }),
          makePlayer('player2', { hand: [] }),
        ],
        currentPlayerIndex: 2,
        roundNumber: 2,
      });
      // Force negative hand length via Object.defineProperty
      Object.defineProperty(next.players[1], 'hand', {
        get: () => ({ length: -1 } as Card[]),
      });

      const violations = checkInvariants(prev, action, next);
      expect(violations.some(v => v.type === 'PLAYER_HAND_NEGATIVE')).toBe(true);
    });
  });

  describe('deck underflow', () => {
    it('passes with non-negative deck', () => {
      const prev = makePlayingState();
      const action: GameAction = { type: 'END_TURN' };
      const next = { ...prev, currentPlayerIndex: 2, roundNumber: 2 };

      const violations = checkInvariants(prev, action, next);
      expect(violations.filter(v => v.type === 'DECK_UNDERFLOW')).toHaveLength(0);
    });

    it('fires when deck length is negative', () => {
      const prev = makePlayingState();
      const action: GameAction = { type: 'END_TURN' };
      const next = makePlayingState({ currentPlayerIndex: 2, roundNumber: 2 });
      Object.defineProperty(next, 'deck', {
        get: () => ({ length: -1 } as Card[]),
      });

      const violations = checkInvariants(prev, action, next);
      expect(violations.some(v => v.type === 'DECK_UNDERFLOW')).toBe(true);
    });
  });

  describe('phase transition validity', () => {
    it('allows valid transitions', () => {
      const prev = makePlayingState({ phase: 'setup' });
      const action: GameAction = { type: 'INIT_GAME', godId: 'god', playerIds: ['god', 'p1'] };
      const next = makePlayingState({ phase: 'dealing' });

      const violations = checkInvariants(prev, action, next);
      expect(violations.filter(v => v.type === 'INVALID_PHASE')).toHaveLength(0);
    });

    it('fires on invalid phase transitions', () => {
      const prev = makePlayingState({ phase: 'setup' });
      const action: GameAction = { type: 'INIT_GAME', godId: 'god', playerIds: ['god', 'p1'] };
      const next = makePlayingState({ phase: 'game_over' });

      const violations = checkInvariants(prev, action, next);
      expect(violations.some(v => v.type === 'INVALID_PHASE')).toBe(true);
      expect(violations.find(v => v.type === 'INVALID_PHASE')!.message).toContain('setup');
      expect(violations.find(v => v.type === 'INVALID_PHASE')!.message).toContain('game_over');
    });

    it('allows playing -> playing (END_TURN staying in playing)', () => {
      const prev = makePlayingState({ phase: 'playing' });
      const action: GameAction = { type: 'END_TURN' };
      const next = makePlayingState({ phase: 'playing', currentPlayerIndex: 2, roundNumber: 2 });

      const violations = checkInvariants(prev, action, next);
      expect(violations.filter(v => v.type === 'INVALID_PHASE')).toHaveLength(0);
    });

    it('does not fire when phase stays the same', () => {
      const prev = makePlayingState({ phase: 'playing' });
      const action: GameAction = { type: 'END_TURN' };
      const next = makePlayingState({ phase: 'playing', currentPlayerIndex: 2, roundNumber: 2 });

      const violations = checkInvariants(prev, action, next);
      expect(violations.filter(v => v.type === 'INVALID_PHASE')).toHaveLength(0);
    });
  });

  describe('orphan pendingPlay', () => {
    it('passes when no pendingPlay during playing', () => {
      const prev = makePlayingState();
      const action: GameAction = { type: 'END_TURN' };
      const next = makePlayingState({ pendingPlay: undefined, currentPlayerIndex: 2, roundNumber: 2 });

      const violations = checkInvariants(prev, action, next);
      expect(violations.filter(v => v.type === 'ORPHAN_PENDING_PLAY')).toHaveLength(0);
    });

    it('fires when pendingPlay exists in playing phase', () => {
      const prev = makePlayingState({ phase: 'awaiting_judgment' });
      const action: GameAction = { type: 'JUDGE_CARD', cardId: 'c1', correct: true };
      const orphanPending: PendingPlay = {
        playerId: 'player1',
        cards: [makeCard('leftover')],
        judgedCards: [],
        predictions: {},
      };
      const next = makePlayingState({ phase: 'playing', pendingPlay: orphanPending });

      const violations = checkInvariants(prev, action, next);
      expect(violations.some(v => v.type === 'ORPHAN_PENDING_PLAY')).toBe(true);
    });
  });

  describe('wrong player turn', () => {
    it('passes when current player is a valid player', () => {
      const prev = makePlayingState();
      const action: GameAction = { type: 'END_TURN' };
      const next = makePlayingState({ currentPlayerIndex: 2, roundNumber: 2 });

      const violations = checkInvariants(prev, action, next);
      expect(violations.filter(v => v.type === 'WRONG_PLAYER_TURN')).toHaveLength(0);
    });

    it('fires when current player is God during playing phase', () => {
      const prev = makePlayingState();
      const action: GameAction = { type: 'END_TURN' };
      const next = makePlayingState({ currentPlayerIndex: 0, roundNumber: 2 }); // index 0 is god

      const violations = checkInvariants(prev, action, next);
      expect(violations.some(v => v.type === 'WRONG_PLAYER_TURN')).toBe(true);
      expect(violations.find(v => v.type === 'WRONG_PLAYER_TURN')!.message).toContain('God');
    });

    it('fires when current player is expelled during playing phase', () => {
      const prev = makePlayingState();
      const action: GameAction = { type: 'END_TURN' };
      const next = makePlayingState({
        currentPlayerIndex: 1,
        players: [
          makePlayer('god', { isGod: true }),
          makePlayer('player1', { hand: [makeCard('c1')], isExpelled: true }),
          makePlayer('player2', { hand: [makeCard('c3')] }),
        ],
        roundNumber: 2,
      });

      const violations = checkInvariants(prev, action, next);
      expect(violations.some(v => v.type === 'WRONG_PLAYER_TURN')).toBe(true);
      expect(violations.find(v => v.type === 'WRONG_PLAYER_TURN')!.message).toContain('expelled');
    });

    it('does not fire during non-playing phases', () => {
      const prev = makePlayingState({ phase: 'dealing' });
      const action: GameAction = { type: 'DEAL_CARDS', count: 14 };
      const next = makePlayingState({ phase: 'playing', currentPlayerIndex: 1 });

      const violations = checkInvariants(prev, action, next);
      // Should not fire WRONG_PLAYER_TURN for dealing phase prev
      // The check is only on next.phase === 'playing', and index 1 is player1 (not God)
      expect(violations.filter(v => v.type === 'WRONG_PLAYER_TURN')).toHaveLength(0);
    });
  });

  describe('prophet invariants', () => {
    it('passes with zero or one prophet', () => {
      const prev = makePlayingState({
        players: [
          makePlayer('god', { isGod: true }),
          makePlayer('player1', { hand: [makeCard('c1')], isProphet: true }),
          makePlayer('player2', { hand: [makeCard('c3')] }),
        ],
      });
      const action: GameAction = { type: 'END_TURN' };
      const next = { ...prev, currentPlayerIndex: 2, roundNumber: 2 };

      const violations = checkInvariants(prev, action, next);
      expect(violations.filter(v => v.type === 'PROPHET_INVARIANT')).toHaveLength(0);
    });

    it('fires when multiple prophets exist', () => {
      const prev = makePlayingState();
      const action: GameAction = { type: 'END_TURN' };
      const next = makePlayingState({
        players: [
          makePlayer('god', { isGod: true }),
          makePlayer('player1', { hand: [makeCard('c1')], isProphet: true }),
          makePlayer('player2', { hand: [makeCard('c3')], isProphet: true }),
        ],
        currentPlayerIndex: 2,
        roundNumber: 2,
      });

      const violations = checkInvariants(prev, action, next);
      expect(violations.some(v => v.type === 'PROPHET_INVARIANT')).toBe(true);
      expect(violations.find(v => v.type === 'PROPHET_INVARIANT')!.message).toContain('Multiple');
    });

    it('fires when God is also prophet', () => {
      const prev = makePlayingState();
      const action: GameAction = { type: 'END_TURN' };
      const next = makePlayingState({
        players: [
          makePlayer('god', { isGod: true, isProphet: true }),
          makePlayer('player1', { hand: [makeCard('c1')] }),
          makePlayer('player2', { hand: [makeCard('c3')] }),
        ],
        currentPlayerIndex: 2,
        roundNumber: 2,
      });

      const violations = checkInvariants(prev, action, next);
      expect(violations.some(v => v.type === 'PROPHET_INVARIANT')).toBe(true);
      expect(violations.find(v => v.type === 'PROPHET_INVARIANT')!.message).toContain('God');
    });
  });

  describe('totalCardsPlayed monotonicity', () => {
    it('passes when totalCardsPlayed stays the same or increases', () => {
      const prev = makePlayingState({ totalCardsPlayed: 5 });
      const action: GameAction = { type: 'END_TURN' };
      const next = makePlayingState({ totalCardsPlayed: 5, currentPlayerIndex: 2, roundNumber: 2 });

      const violations = checkInvariants(prev, action, next);
      expect(violations.filter(v => v.type === 'MAINLINE_CORRUPTION')).toHaveLength(0);
    });

    it('fires when totalCardsPlayed decreases', () => {
      const prev = makePlayingState({ totalCardsPlayed: 5 });
      const action: GameAction = { type: 'END_TURN' };
      const next = makePlayingState({ totalCardsPlayed: 3, currentPlayerIndex: 2, roundNumber: 2 });

      const violations = checkInvariants(prev, action, next);
      expect(violations.some(v => v.type === 'MAINLINE_CORRUPTION')).toBe(true);
      expect(violations.find(v => v.type === 'MAINLINE_CORRUPTION')!.message).toContain('decreased');
    });
  });

  describe('judgment consistency', () => {
    it('passes when judgment matches rule function', () => {
      const lastCard = makePlayedCard('last', true, 'god');
      const pendingCard = makeCard('judged');
      const prev = makePlayingState({
        phase: 'awaiting_judgment',
        mainLine: [lastCard],
        pendingPlay: {
          playerId: 'player1',
          cards: [pendingCard],
          judgedCards: [],
          predictions: {},
        },
        players: [
          makePlayer('god', { isGod: true }),
          makePlayer('player1', { hand: [] }),
          makePlayer('player2', { hand: [makeCard('c3'), makeCard('c4')] }),
        ],
      });
      const action: GameAction = { type: 'JUDGE_CARD', cardId: 'judged', correct: true };
      const next = makePlayingState({
        phase: 'playing',
        mainLine: [lastCard, makePlayedCard('judged', true)],
        players: [
          makePlayer('god', { isGod: true }),
          makePlayer('player1', { hand: [] }),
          makePlayer('player2', { hand: [makeCard('c3'), makeCard('c4')] }),
        ],
        // deck must be same size: prev has 96 deck + 0+2 hands + 1 mainLine + 1 pending = 100
        // next has deck + 0+2 hands + 2 mainLine = must total 100, so deck = 96
      });

      const judgeFn = () => true;
      const violations = checkInvariants(prev, action, next, judgeFn);
      expect(violations.filter(v => v.type === 'JUDGMENT_MISMATCH')).toHaveLength(0);
    });

    it('fires when judgment contradicts rule function', () => {
      const lastCard = makePlayedCard('last', true, 'god');
      const pendingCard = makeCard('judged');
      const prev = makePlayingState({
        phase: 'awaiting_judgment',
        mainLine: [lastCard],
        pendingPlay: {
          playerId: 'player1',
          cards: [pendingCard],
          judgedCards: [],
          predictions: {},
        },
        players: [
          makePlayer('god', { isGod: true }),
          makePlayer('player1', { hand: [] }),
          makePlayer('player2', { hand: [makeCard('c3'), makeCard('c4')] }),
        ],
      });
      const action: GameAction = { type: 'JUDGE_CARD', cardId: 'judged', correct: true };
      const next = makePlayingState({
        phase: 'playing',
        mainLine: [lastCard, makePlayedCard('judged', true)],
      });

      // Rule says it should be false, but God said true
      const judgeFn = () => false;
      const violations = checkInvariants(prev, action, next, judgeFn);
      expect(violations.some(v => v.type === 'JUDGMENT_MISMATCH')).toBe(true);
      expect(violations.find(v => v.type === 'JUDGMENT_MISMATCH')!.message).toContain('true');
      expect(violations.find(v => v.type === 'JUDGMENT_MISMATCH')!.message).toContain('false');
    });

    it('does not fire without a judgeFn', () => {
      const lastCard = makePlayedCard('last', true, 'god');
      const pendingCard = makeCard('judged');
      const prev = makePlayingState({
        phase: 'awaiting_judgment',
        mainLine: [lastCard],
        pendingPlay: {
          playerId: 'player1',
          cards: [pendingCard],
          judgedCards: [],
          predictions: {},
        },
      });
      const action: GameAction = { type: 'JUDGE_CARD', cardId: 'judged', correct: true };
      const next = makePlayingState({ phase: 'playing' });

      const violations = checkInvariants(prev, action, next);
      expect(violations.filter(v => v.type === 'JUDGMENT_MISMATCH')).toHaveLength(0);
    });
  });

  describe('silent no-op detection', () => {
    it('fires when a mutating action returns the same state reference', () => {
      const state = makePlayingState();
      const action: GameAction = { type: 'END_TURN' };

      const violations = checkInvariants(state, action, state);
      expect(violations.some(v => v.type === 'SILENT_NO_OP')).toBe(true);
    });

    it('does not fire when a different state reference is returned', () => {
      const prev = makePlayingState();
      const action: GameAction = { type: 'END_TURN' };
      const next = { ...prev, currentPlayerIndex: 2, roundNumber: 2 };

      const violations = checkInvariants(prev, action, next);
      expect(violations.filter(v => v.type === 'SILENT_NO_OP')).toHaveLength(0);
    });
  });

  describe('scoring sanity', () => {
    it('passes with valid scores at game_over', () => {
      const prev = makePlayingState();
      const action: GameAction = { type: 'END_GAME' };
      const next = makePlayingState({
        phase: 'game_over',
        players: [
          makePlayer('god', { isGod: true, score: 10 }),
          makePlayer('player1', { hand: [makeCard('c1')], score: 5 }),
          makePlayer('player2', { hand: [makeCard('c3')], score: 8 }),
        ],
      });

      const violations = checkInvariants(prev, action, next);
      expect(violations.filter(v => v.type === 'SCORING_ANOMALY')).toHaveLength(0);
    });

    it('fires on negative score at game_over', () => {
      const prev = makePlayingState();
      const action: GameAction = { type: 'END_GAME' };
      const next = makePlayingState({
        phase: 'game_over',
        players: [
          makePlayer('god', { isGod: true, score: 10 }),
          makePlayer('player1', { hand: [makeCard('c1')], score: -5 }),
          makePlayer('player2', { hand: [makeCard('c3')], score: 8 }),
        ],
      });

      const violations = checkInvariants(prev, action, next);
      expect(violations.some(v => v.type === 'SCORING_ANOMALY')).toBe(true);
    });

    it('fires on NaN score at game_over', () => {
      const prev = makePlayingState();
      const action: GameAction = { type: 'END_GAME' };
      const next = makePlayingState({
        phase: 'game_over',
        players: [
          makePlayer('god', { isGod: true, score: NaN }),
          makePlayer('player1', { hand: [makeCard('c1')], score: 5 }),
          makePlayer('player2', { hand: [makeCard('c3')], score: 8 }),
        ],
      });

      const violations = checkInvariants(prev, action, next);
      expect(violations.some(v => v.type === 'SCORING_ANOMALY')).toBe(true);
    });

    it('fires on Infinity score at game_over', () => {
      const prev = makePlayingState();
      const action: GameAction = { type: 'END_GAME' };
      const next = makePlayingState({
        phase: 'game_over',
        players: [
          makePlayer('god', { isGod: true, score: 10 }),
          makePlayer('player1', { hand: [makeCard('c1')], score: Infinity }),
          makePlayer('player2', { hand: [makeCard('c3')], score: 8 }),
        ],
      });

      const violations = checkInvariants(prev, action, next);
      expect(violations.some(v => v.type === 'SCORING_ANOMALY')).toBe(true);
    });

    it('does not check scores outside game_over phase', () => {
      const prev = makePlayingState();
      const action: GameAction = { type: 'END_TURN' };
      const next = makePlayingState({
        players: [
          makePlayer('god', { isGod: true, score: -999 }),
          makePlayer('player1', { hand: [makeCard('c1')], score: NaN }),
          makePlayer('player2', { hand: [makeCard('c3')] }),
        ],
        currentPlayerIndex: 2,
        roundNumber: 2,
      });

      const violations = checkInvariants(prev, action, next);
      expect(violations.filter(v => v.type === 'SCORING_ANOMALY')).toHaveLength(0);
    });
  });

  describe('integration with real reducer', () => {
    it('no violations on INIT_GAME -> DEAL_CARDS sequence', () => {
      const state0 = createInitialState();
      const action1: GameAction = {
        type: 'INIT_GAME',
        godId: 'god',
        playerIds: ['god', 'p1', 'p2', 'p3'],
      };
      const state1 = gameReducer(state0, action1);
      const v1 = checkInvariants(state0, action1, state1);
      expect(v1.filter(v => v.severity === 'critical')).toHaveLength(0);

      const action2: GameAction = { type: 'DEAL_CARDS', count: 14 };
      const state2 = gameReducer(state1, action2);
      const v2 = checkInvariants(state1, action2, state2);
      expect(v2.filter(v => v.severity === 'critical')).toHaveLength(0);
    });

    it('no violations through a play-and-judge cycle', () => {
      let state = createInitialState();

      const initAction: GameAction = {
        type: 'INIT_GAME',
        godId: 'god',
        playerIds: ['god', 'p1', 'p2'],
      };
      state = gameReducer(state, initAction);

      const dealAction: GameAction = { type: 'DEAL_CARDS', count: 14 };
      state = gameReducer(state, dealAction);

      // Find the current player and pick a card
      const currentPlayer = state.players[state.currentPlayerIndex];
      if (currentPlayer.hand.length > 0) {
        const cardId = currentPlayer.hand[0].id;
        const playAction: GameAction = {
          type: 'PLAY_CARD',
          playerId: currentPlayer.id,
          cardIds: [cardId],
        };
        const prevState = state;
        state = gameReducer(state, playAction);
        const playViolations = checkInvariants(prevState, playAction, state);
        expect(playViolations.filter(v => v.severity === 'critical')).toHaveLength(0);

        // Judge the card
        if (state.pendingPlay && state.pendingPlay.cards.length > 0) {
          const judgeAction: GameAction = {
            type: 'JUDGE_CARD',
            cardId: state.pendingPlay.cards[0].id,
            correct: true,
          };
          const prevState2 = state;
          state = gameReducer(state, judgeAction);
          const judgeViolations = checkInvariants(prevState2, judgeAction, state);
          expect(judgeViolations.filter(v => v.severity === 'critical')).toHaveLength(0);
        }
      }
    });
  });
});
