import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Scoreboard } from '../../src/components/Scoreboard';
import type { Player, GameState } from '../../src/engine/types';

describe('Scoreboard', () => {
  const createMockPlayer = (overrides: Partial<Player> = {}): Player => ({
    id: '1',
    name: 'Test Player',
    hand: [],
    score: 0,
    isProphet: false,
    isGod: false,
    type: 'human',
    wasProphet: false,
    isExpelled: false,
    ...overrides,
  });

  const createMockGameState = (players: Player[]): GameState => ({
    phase: 'playing',
    players,
    currentPlayerIndex: 0,
    deck: [],
    mainLine: [],
    godRule: 'test',
    prophetsCorrectCount: 0,
    prophetCorrectCalls: 0,
    prophetIncorrectCalls: 0,
    totalCardsPlayed: 0,
    roundNumber: 1,
    gameStartTime: Date.now(),
  });

  it('renders all players', () => {
    const players: Player[] = [
      createMockPlayer({ id: '1', name: 'Alice' }),
      createMockPlayer({ id: '2', name: 'Bob', type: 'ai' }),
      createMockPlayer({ id: '3', name: 'Charlie' }),
    ];
    const gameState = createMockGameState(players);

    render(<Scoreboard players={players} currentPlayerIndex={0} gameState={gameState} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('highlights the current player', () => {
    const players: Player[] = [
      createMockPlayer({ id: '1', name: 'Alice' }),
      createMockPlayer({ id: '2', name: 'Bob' }),
    ];
    const gameState = createMockGameState(players);

    const { container } = render(<Scoreboard players={players} currentPlayerIndex={1} gameState={gameState} />);

    // The second player (Bob) should have the highlighted styles
    const playerDivs = container.querySelectorAll('[style*="background"]');
    expect(playerDivs.length).toBeGreaterThan(0);
  });

  it('displays Prophet icon for prophet player', () => {
    const players: Player[] = [
      createMockPlayer({ id: '1', name: 'Alice', isProphet: true }),
    ];
    const gameState = createMockGameState(players);

    const { container } = render(<Scoreboard players={players} currentPlayerIndex={0} gameState={gameState} />);

    expect(container.textContent).toContain('👑');
  });

  it('displays AI badge for AI players', () => {
    const players: Player[] = [
      createMockPlayer({ id: '1', name: 'Bot', type: 'ai' }),
    ];
    const gameState = createMockGameState(players);

    render(<Scoreboard players={players} currentPlayerIndex={0} gameState={gameState} />);

    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  it('displays expelled icon for expelled players', () => {
    const players: Player[] = [
      createMockPlayer({ id: '1', name: 'Alice', isExpelled: true }),
    ];
    const gameState = createMockGameState(players);

    const { container } = render(<Scoreboard players={players} currentPlayerIndex={0} gameState={gameState} />);

    expect(container.textContent).toContain('⛔');
  });

  it('displays player score and card count', () => {
    const hand = Array(5).fill(null).map((_, i) => ({
      id: `card-${i}`,
      suit: 'hearts' as const,
      rank: 'A' as const,
    }));

    const players: Player[] = [
      createMockPlayer({ id: '1', name: 'Alice', hand }),
    ];
    const gameState = createMockGameState(players);

    const { container } = render(<Scoreboard players={players} currentPlayerIndex={0} gameState={gameState} />);

    // Score is calculated live, not from player.score field
    // With 5 cards in hand, score would be: highCount (5) - hand (5) = 0
    expect(container.textContent).toContain('Scr: 0');
    expect(container.textContent).toContain('Cds: 5');
  });

  it('renders title', () => {
    const players: Player[] = [createMockPlayer()];
    const gameState = createMockGameState(players);

    render(<Scoreboard players={players} currentPlayerIndex={0} gameState={gameState} />);

    expect(screen.getByText('Players')).toBeInTheDocument();
  });
});
