import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { PlayedCard } from '../../src/engine/types';

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
    s.startNewGame([
      { name: 'God', type: 'human', isGod: true },
      { name: 'Player1', type: 'human', isGod: false },
      { name: 'Player2', type: 'human', isGod: false },
    ]);

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
    s.startNewGame([
      { name: 'God', type: 'human', isGod: true },
      { name: 'Player1', type: 'human', isGod: false },
      { name: 'Player2', type: 'human', isGod: false },
    ]);

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
    s.startNewGame([
      { name: 'God', type: 'human', isGod: true },
      { name: 'Player1', type: 'human', isGod: false },
      { name: 'Player2', type: 'human', isGod: false },
    ]);

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
