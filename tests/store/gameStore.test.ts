import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { PlayedCard, Card } from '../../src/engine/types';

// Stub localStorage before importing the store (zustand persist reads it on init)
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k in store) delete store[k]; },
  get length() { return Object.keys(store).length; },
  key: (index: number) => Object.keys(store)[index] ?? null,
});

// Now import the store after localStorage is stubbed
const { useGameStore } = await import('../../src/store/gameStore');

describe('resolveNoPlayAsHumanGod', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const seedCard: PlayedCard = {
    suit: 'hearts', rank: 'A', id: 'seed-card', correct: true, playedBy: 'god',
  };

  it('shows error when godRuleFunction is missing', () => {
    const s = useGameStore.getState();
    s.startNewGame({ configs: [
      { name: 'God', type: 'human', isGod: true },
      { name: 'Player1', type: 'human', isGod: false },
      { name: 'Player2', type: 'human', isGod: false },
    ] });

    const players = useGameStore.getState().state.players;
    const player1 = players.find(p => p.name === 'Player1')!;

    useGameStore.setState((prev) => ({
      state: {
        ...prev.state,
        phase: 'no_play_dispute' as const,
        noPlayDeclaration: { playerId: player1.id, hand: player1.hand, disputed: false },
        mainLine: [seedCard],
        godRuleFunction: undefined,
      },
    }));

    useGameStore.getState().resolveNoPlayAsHumanGod(false);

    expect(useGameStore.getState().errorMessage).toBe(
      'Cannot resolve no-play: no rule is set. Please set a rule first.'
    );

    vi.advanceTimersByTime(4000);
    expect(useGameStore.getState().errorMessage).toBeNull();
  });

  it('shows error when no valid card found in player hand', () => {
    const s = useGameStore.getState();
    s.startNewGame({ configs: [
      { name: 'God', type: 'human', isGod: true },
      { name: 'Player1', type: 'human', isGod: false },
      { name: 'Player2', type: 'human', isGod: false },
    ] });

    const players = useGameStore.getState().state.players;
    const player1 = players.find(p => p.name === 'Player1')!;

    useGameStore.setState((prev) => ({
      state: {
        ...prev.state,
        phase: 'no_play_dispute' as const,
        noPlayDeclaration: { playerId: player1.id, hand: player1.hand, disputed: false },
        mainLine: [seedCard],
        godRuleFunction: () => false,
      },
    }));

    useGameStore.getState().resolveNoPlayAsHumanGod(false);

    expect(useGameStore.getState().errorMessage).toBe(
      "No valid card found in player's hand. The no-play declaration may be correct."
    );

    vi.advanceTimersByTime(4000);
    expect(useGameStore.getState().errorMessage).toBeNull();
  });

  it('does not show error for valid no-play resolution', () => {
    const s = useGameStore.getState();
    s.startNewGame({ configs: [
      { name: 'God', type: 'human', isGod: true },
      { name: 'Player1', type: 'human', isGod: false },
      { name: 'Player2', type: 'human', isGod: false },
    ] });

    const players = useGameStore.getState().state.players;
    const player1 = players.find(p => p.name === 'Player1')!;

    useGameStore.setState((prev) => ({
      state: {
        ...prev.state,
        phase: 'no_play_dispute' as const,
        noPlayDeclaration: { playerId: player1.id, hand: player1.hand, disputed: false },
        mainLine: [seedCard],
        godRuleFunction: () => true,
      },
      errorMessage: null,
    }));

    useGameStore.getState().resolveNoPlayAsHumanGod(true);

    expect(useGameStore.getState().errorMessage).toBeNull();
  });
});

describe('JUDGE_CARD after Prophet overthrow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const seedCard: PlayedCard = {
    suit: 'hearts', rank: 'A', id: 'seed-card', correct: true, playedBy: 'god',
  };

  it('dispatches END_TURN for AI player after Prophet overthrow', () => {
    // Set up game with God + human Prophet + AI player
    useGameStore.getState().startNewGame({ configs: [
      { name: 'God', type: 'human', isGod: true },
      { name: 'Prophet', type: 'human', isGod: false },
      { name: 'AIPlayer', type: 'ai', isGod: false },
    ] });

    const players = useGameStore.getState().state.players;
    const aiPlayer = players.find(p => p.name === 'AIPlayer')!;
    const prophetPlayer = players.find(p => p.name === 'Prophet')!;

    const playedCard: Card = { suit: 'clubs', rank: '5', id: 'ai-card-1' };

    // Set state: AI player's pending play with a prophet prediction, prophet already overthrown
    // This simulates the state AFTER OVERTHROW_PROPHET but BEFORE JUDGE_CARD
    useGameStore.setState((prev) => ({
      state: {
        ...prev.state,
        phase: 'awaiting_judgment' as const,
        mainLine: [seedCard],
        currentPlayerIndex: players.indexOf(aiPlayer),
        players: prev.state.players.map(p =>
          p.id === prophetPlayer.id
            ? { ...p, isProphet: false, wasProphet: true }
            : p
        ),
        pendingPlay: {
          playerId: aiPlayer.id,
          cards: [playedCard],
          judgedCards: [],
          predictions: {
            [playedCard.id]: { predictedBy: prophetPlayer.id, prediction: true },
          },
        },
      },
    }));

    // Dispatch JUDGE_CARD — should trigger END_TURN via setTimeout
    useGameStore.getState().dispatch({
      type: 'JUDGE_CARD',
      cardId: playedCard.id,
      correct: true,
      skipPenalty: true,
    });

    // Verify pendingPlay was cleared
    expect(useGameStore.getState().state.pendingPlay).toBeUndefined();

    // Advance timers — END_TURN should fire
    vi.advanceTimersByTime(500);

    // After END_TURN, currentPlayerIndex should have advanced
    const stateAfter = useGameStore.getState().state;
    expect(stateAfter.currentPlayerIndex).not.toBe(players.indexOf(aiPlayer));
  });
});

describe('loadSavedGame validation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    useGameStore.getState().resetGame();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const startValidGame = () => {
    useGameStore.getState().startNewGame({
      configs: [
        { name: 'Dealer', type: 'ai', isGod: true },
        { name: 'You', type: 'human', isGod: false },
        { name: 'AI', type: 'ai', isGod: false },
      ],
    });
  };

  it('returns false when no save exists', () => {
    expect(useGameStore.getState().loadSavedGame()).toBe(false);
  });

  it('returns false and discards a save missing players', () => {
    localStorage.setItem(
      'eleusis-game-save',
      JSON.stringify({ state: { phase: 'playing', currentPlayerIndex: 0, mainLine: [], deck: [] } }),
    );

    const ok = useGameStore.getState().loadSavedGame();

    expect(ok).toBe(false);
    expect(useGameStore.getState().hasSavedGame).toBe(false);
    // The corrupt save is gone — a second attempt has nothing loadable to offer.
    expect(useGameStore.getState().loadSavedGame()).toBe(false);
  });

  it('returns false and discards a save with corrupt JSON', () => {
    localStorage.setItem('eleusis-game-save', '{not valid json');

    const ok = useGameStore.getState().loadSavedGame();

    expect(ok).toBe(false);
    // The unparseable blob has been replaced; it never loads again.
    expect(useGameStore.getState().loadSavedGame()).toBe(false);
  });

  it('does not crash the player getters after an invalid load', () => {
    startValidGame();
    localStorage.setItem('eleusis-game-save', JSON.stringify({ state: { junk: true } }));

    useGameStore.getState().loadSavedGame();

    // The in-memory valid game is untouched and the getters stay safe.
    expect(() => useGameStore.getState().getCurrentPlayer()).not.toThrow();
    expect(() => useGameStore.getState().getActiveLocalPlayer()).not.toThrow();
    expect(useGameStore.getState().state.players.length).toBeGreaterThan(0);
  });

  it('loads a structurally valid saved game and returns true', () => {
    startValidGame();
    const live = useGameStore.getState().state;
    localStorage.setItem(
      'eleusis-game-save',
      JSON.stringify({
        state: { ...live, godRuleFunction: undefined },
        godRuleName: 'rule',
        godFunctionBody: null,
        lastGodIndex: 0,
        trueProphetIndex: -1,
      }),
    );

    const ok = useGameStore.getState().loadSavedGame();

    expect(ok).toBe(true);
    expect(useGameStore.getState().hasSavedGame).toBe(true);
    expect(useGameStore.getState().state.players.length).toBeGreaterThan(0);
  });
});
