import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Scoreboard } from '../../src/components/Scoreboard';
import type { Player } from '../../src/engine/types';

describe('Scoreboard', () => {
  const createMockPlayer = (overrides: Partial<Player> = {}): Player => ({
    id: '1',
    name: 'Test Player',
    hand: [],
    score: 0,
    isProphet: false,
    isDealer: false,
    type: 'human',
    suddenDeathMarkers: 0,
    isExpelled: false,
    ...overrides,
  });

  it('renders all players', () => {
    const players: Player[] = [
      createMockPlayer({ id: '1', name: 'Alice' }),
      createMockPlayer({ id: '2', name: 'Bob', type: 'ai' }),
      createMockPlayer({ id: '3', name: 'Charlie' }),
    ];

    render(<Scoreboard players={players} currentPlayerIndex={0} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('highlights the current player', () => {
    const players: Player[] = [
      createMockPlayer({ id: '1', name: 'Alice' }),
      createMockPlayer({ id: '2', name: 'Bob' }),
    ];

    const { container } = render(<Scoreboard players={players} currentPlayerIndex={1} />);

    // The second player (Bob) should have the highlighted styles
    const playerDivs = container.querySelectorAll('[style*="background"]');
    expect(playerDivs.length).toBeGreaterThan(0);
  });

  it('displays Prophet icon for prophet player', () => {
    const players: Player[] = [
      createMockPlayer({ id: '1', name: 'Alice', isProphet: true }),
    ];

    const { container } = render(<Scoreboard players={players} currentPlayerIndex={0} />);

    expect(container.textContent).toContain('👑');
  });

  it('displays AI badge for AI players', () => {
    const players: Player[] = [
      createMockPlayer({ id: '1', name: 'Bot', type: 'ai' }),
    ];

    render(<Scoreboard players={players} currentPlayerIndex={0} />);

    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  it('displays expelled icon for expelled players', () => {
    const players: Player[] = [
      createMockPlayer({ id: '1', name: 'Alice', isExpelled: true }),
    ];

    const { container } = render(<Scoreboard players={players} currentPlayerIndex={0} />);

    expect(container.textContent).toContain('⛔');
  });

  it('displays player score and card count', () => {
    const hand = Array(5).fill(null).map((_, i) => ({
      id: `card-${i}`,
      suit: 'hearts' as const,
      rank: 'A' as const,
    }));

    const players: Player[] = [
      createMockPlayer({ id: '1', name: 'Alice', score: 42, hand }),
    ];

    const { container } = render(<Scoreboard players={players} currentPlayerIndex={0} />);

    expect(container.textContent).toContain('42');
    expect(container.textContent).toContain('5');
  });

  it('displays warning icons for high card counts', () => {
    const createHand = (count: number) =>
      Array(count).fill(null).map((_, i) => ({
        id: `card-${i}`,
        suit: 'hearts' as const,
        rank: 'A' as const,
      }));

    const players20: Player[] = [
      createMockPlayer({ id: '1', name: 'Alice', hand: createHand(20) }),
    ];
    const { container: container20 } = render(<Scoreboard players={players20} currentPlayerIndex={0} />);
    expect(container20.textContent).toContain('⚠️');

    const players25: Player[] = [
      createMockPlayer({ id: '1', name: 'Bob', hand: createHand(25) }),
    ];
    const { container: container25 } = render(<Scoreboard players={players25} currentPlayerIndex={0} />);
    expect(container25.textContent).toContain('💀');
  });

  it('displays sudden death markers', () => {
    const players: Player[] = [
      createMockPlayer({ id: '1', name: 'Alice', suddenDeathMarkers: 2 }),
    ];

    const { container } = render(<Scoreboard players={players} currentPlayerIndex={0} />);

    expect(container.textContent).toContain('💀');
    expect(container.textContent).toContain('2 Markers');
  });

  it('renders title', () => {
    const players: Player[] = [createMockPlayer()];

    render(<Scoreboard players={players} currentPlayerIndex={0} />);

    expect(screen.getByText('Players')).toBeInTheDocument();
  });
});
