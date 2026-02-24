import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DealerControlPanel } from '../../src/components/DealerControlPanel';
import type { Card } from '../../src/engine/types';

describe('DealerControlPanel', () => {
  const mockCard: Card = {
    id: 'card-1',
    suit: 'hearts',
    rank: 'A',
  };

  it('renders dealer judgment heading', () => {
    const onJudge = vi.fn();
    render(<DealerControlPanel pendingCard={mockCard} playerName="Alice" onJudge={onJudge} />);

    expect(screen.getByText(/DEALER JUDGMENT/i)).toBeInTheDocument();
  });

  it('displays player name in context message', () => {
    const onJudge = vi.fn();
    render(<DealerControlPanel pendingCard={mockCard} playerName="Bob" onJudge={onJudge} />);

    expect(screen.getByText(/Card played by Bob/i)).toBeInTheDocument();
  });

  it('renders CORRECT button', () => {
    const onJudge = vi.fn();
    render(<DealerControlPanel pendingCard={mockCard} playerName="Charlie" onJudge={onJudge} />);

    const correctButton = screen.getByText(/CORRECT/i);
    expect(correctButton).toBeInTheDocument();
  });

  it('renders WRONG button', () => {
    const onJudge = vi.fn();
    render(<DealerControlPanel pendingCard={mockCard} playerName="Dave" onJudge={onJudge} />);

    const wrongButton = screen.getByText(/WRONG/i);
    expect(wrongButton).toBeInTheDocument();
  });

  it('calls onJudge with true when CORRECT is clicked', () => {
    const onJudge = vi.fn();
    render(<DealerControlPanel pendingCard={mockCard} playerName="Eve" onJudge={onJudge} />);

    const correctButton = screen.getByText(/CORRECT/i);
    fireEvent.click(correctButton);

    expect(onJudge).toHaveBeenCalledTimes(1);
    expect(onJudge).toHaveBeenCalledWith(true);
  });

  it('calls onJudge with false when WRONG is clicked', () => {
    const onJudge = vi.fn();
    render(<DealerControlPanel pendingCard={mockCard} playerName="Frank" onJudge={onJudge} />);

    const wrongButton = screen.getByText(/WRONG/i);
    fireEvent.click(wrongButton);

    expect(onJudge).toHaveBeenCalledTimes(1);
    expect(onJudge).toHaveBeenCalledWith(false);
  });

  it('displays instruction text', () => {
    const onJudge = vi.fn();
    render(<DealerControlPanel pendingCard={mockCard} playerName="Grace" onJudge={onJudge} />);

    expect(screen.getByText(/Judge this card according to your secret rule/i)).toBeInTheDocument();
  });

  it('has fixed position at bottom center', () => {
    const onJudge = vi.fn();
    const { container } = render(
      <DealerControlPanel pendingCard={mockCard} playerName="Henry" onJudge={onJudge} />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.position).toBe('fixed');
    expect(wrapper.style.bottom).toBe('2rem');
    expect(wrapper.style.left).toBe('50%');
    expect(wrapper.style.transform).toBe('translateX(-50%)');
  });

  it('has high z-index for proper stacking', () => {
    const onJudge = vi.fn();
    const { container } = render(
      <DealerControlPanel pendingCard={mockCard} playerName="Iris" onJudge={onJudge} />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.zIndex).toBe('100');
  });

  it('works with different card suits', () => {
    const onJudge = vi.fn();
    const diamondCard: Card = { id: 'card-2', suit: 'diamonds', rank: 'K' };

    render(<DealerControlPanel pendingCard={diamondCard} playerName="Jack" onJudge={onJudge} />);

    // Component should render without errors
    expect(screen.getByText(/DEALER JUDGMENT/i)).toBeInTheDocument();
  });

  it('works with different card ranks', () => {
    const onJudge = vi.fn();
    const numberCard: Card = { id: 'card-3', suit: 'clubs', rank: '7' };

    render(<DealerControlPanel pendingCard={numberCard} playerName="Kelly" onJudge={onJudge} />);

    // Component should render without errors
    expect(screen.getByText(/DEALER JUDGMENT/i)).toBeInTheDocument();
  });
});
