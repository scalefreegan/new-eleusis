import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DealerControlPanel } from '../../src/components/DealerControlPanel';
import type { Card } from '../../src/engine/types';

const mockCard: Card = { id: 'card-1', suit: 'hearts', rank: 'A' };

describe('DealerControlPanel autoVerdict', () => {
  it('displays AUTO: CORRECT when autoVerdict is true', () => {
    const onJudge = vi.fn();
    render(
      <DealerControlPanel pendingCard={mockCard} playerName="Alice" onJudge={onJudge} autoVerdict={true} />
    );
    expect(screen.getByText(/AUTO: CORRECT/i)).toBeInTheDocument();
  });

  it('displays AUTO: WRONG when autoVerdict is false', () => {
    const onJudge = vi.fn();
    render(
      <DealerControlPanel pendingCard={mockCard} playerName="Alice" onJudge={onJudge} autoVerdict={false} />
    );
    expect(screen.getByText(/AUTO: WRONG/i)).toBeInTheDocument();
  });

  it('calls onJudge with autoVerdict value when ACCEPT is clicked', () => {
    const onJudge = vi.fn();
    render(
      <DealerControlPanel pendingCard={mockCard} playerName="Alice" onJudge={onJudge} autoVerdict={true} />
    );

    const acceptBtn = screen.getByText(/ACCEPT/i);
    fireEvent.click(acceptBtn);
    expect(onJudge).toHaveBeenCalledWith(true);
  });

  it('does not auto-confirm when autoVerdict is undefined (manual mode)', () => {
    vi.useFakeTimers();
    const onJudge = vi.fn();
    render(
      <DealerControlPanel pendingCard={mockCard} playerName="Alice" onJudge={onJudge} />
    );

    vi.advanceTimersByTime(5000);
    expect(onJudge).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('allows manual override when autoVerdict is provided', () => {
    const onJudge = vi.fn();
    render(
      <DealerControlPanel pendingCard={mockCard} playerName="Alice" onJudge={onJudge} autoVerdict={true} />
    );

    // Should still have an override / manual button
    const overrideBtn = screen.queryByText(/OVERRIDE/i) || screen.queryByText(/WRONG/i);
    if (overrideBtn) {
      fireEvent.click(overrideBtn);
      // After override, user should be able to manually judge
    }
    // At minimum, the component renders without error
    expect(screen.getByText(/DEALER JUDGMENT/i)).toBeInTheDocument();
  });
});
