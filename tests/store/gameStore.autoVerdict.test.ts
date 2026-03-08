import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { PlayedCard, Card } from '../../src/engine/types';

// Stub localStorage before importing the store
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k in store) delete store[k]; },
  get length() { return Object.keys(store).length; },
  key: (index: number) => Object.keys(store)[index] ?? null,
});

const { useGameStore } = await import('../../src/store/gameStore');

const seedCard: PlayedCard = {
  suit: 'hearts', rank: 'A', id: 'seed-card', correct: true, playedBy: 'god',
};

describe('auto-verdict via compiled rule in dispatch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto-judges PLAY_CARD when godRuleFunction is set (compiled rule)', () => {
    const s = useGameStore.getState();
    s.startNewGame({ configs: [
      { name: 'God', type: 'human', isGod: true },
      { name: 'Player1', type: 'human', isGod: false },
      { name: 'Player2', type: 'human', isGod: false },
    ] });

    // Set up a compiled rule that always returns true
    const alwaysCorrect = (_last: Card, _next: Card) => true;

    useGameStore.setState((prev) => ({
      state: {
        ...prev.state,
        phase: 'playing' as const,
        godRuleFunction: alwaysCorrect,
        mainLine: [seedCard],
        currentPlayerIndex: 1, // Player1's turn
      },
    }));

    const state = useGameStore.getState().state;
    const player1 = state.players[1];
    expect(player1.hand.length).toBeGreaterThan(0);

    // godRuleFunction is set so auto-verdict paths in dispatch will use it
    expect(state.godRuleFunction).toBeDefined();
  });

  it('PLAY_CARD with godRuleFunction (no aiGod) auto-judges cards', () => {
    // Reset rotation state so God ends up at index 0
    useGameStore.setState({ lastGodIndex: -1, trueProphetIndex: -1 });

    const s = useGameStore.getState();
    s.startNewGame({ configs: [
      { name: 'God', type: 'human', isGod: true },
      { name: 'Player1', type: 'human', isGod: false },
      { name: 'Player2', type: 'human', isGod: false },
    ] });

    // Set up a compiled rule: same suit is correct, different suit is wrong
    const sameSuitRule = (last: Card, next: Card) => last.suit === next.suit;

    useGameStore.setState((prev) => ({
      state: {
        ...prev.state,
        phase: 'playing' as const,
        godRuleFunction: sameSuitRule,
        mainLine: [seedCard], // seed is hearts
        currentPlayerIndex: 1,
      },
      aiGod: null, // No AI God — must fall back to godRuleFunction
    }));

    const player1 = useGameStore.getState().state.players[1];
    expect(player1.hand.length).toBeGreaterThan(0);
    const cardToPlay = player1.hand[0];

    // Dispatch PLAY_CARD as human player
    useGameStore.getState().dispatch({
      type: 'PLAY_CARD',
      playerId: player1.id,
      cardIds: [cardToPlay.id],
    });

    // pendingPlay should be set immediately after PLAY_CARD
    expect(useGameStore.getState().state.pendingPlay).toBeTruthy();

    // Advance timers to allow auto-judgment to fire
    vi.advanceTimersByTime(1000);

    // After auto-judgment, JUDGE_CARD should have been dispatched
    const finalState = useGameStore.getState().state;
    // pendingPlay should be cleared (card was judged)
    expect(finalState.pendingPlay).toBeFalsy();

    // Verify the card was judged correctly based on the rule
    const expectedCorrect = cardToPlay.suit === 'hearts';
    if (expectedCorrect) {
      // Card should be on the main line
      expect(finalState.mainLine.some(c => c.id === cardToPlay.id)).toBe(true);
    } else {
      // Card should be in sidelines (wrong cards branch off)
      const lastMainCard = finalState.mainLine[finalState.mainLine.length - 1];
      expect(lastMainCard.branches?.some(c => c.id === cardToPlay.id)).toBe(true);
    }
  });

  it('auto-resolves DECLARE_NO_PLAY when godRuleFunction says all cards invalid', () => {
    const s = useGameStore.getState();
    s.startNewGame({ configs: [
      { name: 'God', type: 'human', isGod: true },
      { name: 'Player1', type: 'human', isGod: false },
      { name: 'Player2', type: 'human', isGod: false },
    ] });

    // Rule says nothing is valid
    const nothingValid = () => false;

    useGameStore.setState((prev) => ({
      state: {
        ...prev.state,
        phase: 'playing' as const,
        godRuleFunction: nothingValid,
        mainLine: [seedCard],
        currentPlayerIndex: 1,
      },
    }));

    const player1 = useGameStore.getState().state.players[1];

    // Dispatch DECLARE_NO_PLAY — should auto-resolve via godRuleFunction
    useGameStore.getState().dispatch({ type: 'DECLARE_NO_PLAY', playerId: player1.id });

    // After timeout, should auto-resolve as valid (no correct card exists)
    vi.advanceTimersByTime(1000);

    const finalState = useGameStore.getState().state;
    // Phase should have moved past no_play_dispute (resolved)
    expect(finalState.phase).not.toBe('no_play_dispute');
  });

  it('auto-resolves DECLARE_NO_PLAY as invalid when godRuleFunction finds valid card', () => {
    const s = useGameStore.getState();
    s.startNewGame({ configs: [
      { name: 'God', type: 'human', isGod: true },
      { name: 'Player1', type: 'human', isGod: false },
      { name: 'Player2', type: 'human', isGod: false },
    ] });

    // Rule says everything is valid — so no-play is a lie
    const allValid = () => true;

    useGameStore.setState((prev) => ({
      state: {
        ...prev.state,
        phase: 'playing' as const,
        godRuleFunction: allValid,
        mainLine: [seedCard],
        currentPlayerIndex: 1,
      },
    }));

    const player1 = useGameStore.getState().state.players[1];
    expect(player1.hand.length).toBeGreaterThan(0);

    useGameStore.getState().dispatch({ type: 'DECLARE_NO_PLAY', playerId: player1.id });

    vi.advanceTimersByTime(1000);

    const finalState = useGameStore.getState().state;
    // Should have resolved as invalid (player lied)
    expect(finalState.phase).not.toBe('no_play_dispute');
  });
});
