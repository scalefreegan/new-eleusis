import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TurnTransitionOverlay } from '../../src/components/TurnTransitionOverlay';

describe('TurnTransitionOverlay', () => {
  it('renders player name', () => {
    const onReady = vi.fn();
    render(<TurnTransitionOverlay playerName="Alice" onReady={onReady} />);

    // Player name should appear twice (in heading and in text)
    const aliceElements = screen.getAllByText(/Alice/);
    expect(aliceElements.length).toBeGreaterThanOrEqual(1);
  });

  it('displays pass device message', () => {
    const onReady = vi.fn();
    render(<TurnTransitionOverlay playerName="Bob" onReady={onReady} />);

    expect(screen.getByText(/Pass the device to Bob/i)).toBeInTheDocument();
  });

  it('renders I\'M READY button', () => {
    const onReady = vi.fn();
    render(<TurnTransitionOverlay playerName="Charlie" onReady={onReady} />);

    const readyButton = screen.getByText("I'M READY");
    expect(readyButton).toBeInTheDocument();
  });

  it('calls onReady when button is clicked', () => {
    const onReady = vi.fn();
    render(<TurnTransitionOverlay playerName="Dave" onReady={onReady} />);

    const readyButton = screen.getByText("I'M READY");
    fireEvent.click(readyButton);

    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('displays privacy message', () => {
    const onReady = vi.fn();
    render(<TurnTransitionOverlay playerName="Eve" onReady={onReady} />);

    expect(screen.getByText(/prevents other players from seeing your hand/i)).toBeInTheDocument();
  });

  it('has dark overlay background', () => {
    const onReady = vi.fn();
    const { container } = render(<TurnTransitionOverlay playerName="Frank" onReady={onReady} />);

    const overlay = container.firstChild as HTMLElement;
    expect(overlay.style.background).toBe('rgb(0, 0, 0)');
  });

  it('covers full viewport', () => {
    const onReady = vi.fn();
    const { container } = render(<TurnTransitionOverlay playerName="Grace" onReady={onReady} />);

    const overlay = container.firstChild as HTMLElement;
    expect(overlay.style.position).toBe('fixed');
    expect(overlay.style.width).toBe('100vw');
    expect(overlay.style.height).toBe('100vh');
  });

  it('has high z-index for proper stacking', () => {
    const onReady = vi.fn();
    const { container } = render(<TurnTransitionOverlay playerName="Henry" onReady={onReady} />);

    const overlay = container.firstChild as HTMLElement;
    expect(overlay.style.zIndex).toBe('1000');
  });
});
