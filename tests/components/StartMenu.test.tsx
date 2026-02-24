import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StartMenu } from '../../src/components/StartMenu';

// Mock the game store
vi.mock('../../src/store/gameStore', () => ({
  useGameStore: () => ({
    hasSavedGame: false,
    loadSavedGame: vi.fn(),
  }),
}));

describe('StartMenu', () => {
  it('renders the title', () => {
    const onStartGame = vi.fn();
    render(<StartMenu onStartGame={onStartGame} />);
    expect(screen.getByText('NEW ELEUSIS')).toBeInTheDocument();
  });

  it('starts with default player configuration', () => {
    const onStartGame = vi.fn();
    const { container } = render(<StartMenu onStartGame={onStartGame} />);

    // Should show 3 players by default (not including dealer in the count)
    expect(container.textContent).toContain('PLAYERS (3)');
  });

  it('allows changing dealer name', () => {
    const onStartGame = vi.fn();
    render(<StartMenu onStartGame={onStartGame} />);

    const dealerInput = screen.getAllByPlaceholderText('Dealer Name')[0] as HTMLInputElement;
    fireEvent.change(dealerInput, { target: { value: 'Custom Dealer' } });

    expect(dealerInput.value).toBe('Custom Dealer');
  });

  it('allows adding players', () => {
    const onStartGame = vi.fn();
    const { container } = render(<StartMenu onStartGame={onStartGame} />);

    const addButton = screen.getByText('+ ADD PLAYER');
    fireEvent.click(addButton);

    // Should now have 4 players
    expect(container.textContent).toContain('PLAYERS (4)');
  });

  it('prevents adding more than 7 players', () => {
    const onStartGame = vi.fn();
    const { container } = render(<StartMenu onStartGame={onStartGame} />);

    const addButton = screen.getByText('+ ADD PLAYER');

    // Add 4 more players (starts with 3, max is 7)
    fireEvent.click(addButton);
    fireEvent.click(addButton);
    fireEvent.click(addButton);
    fireEvent.click(addButton);

    expect(container.textContent).toContain('PLAYERS (7)');

    // Button should be disabled now
    expect(addButton).toBeDisabled();
  });

  it('allows removing players', () => {
    const onStartGame = vi.fn();
    const { container } = render(<StartMenu onStartGame={onStartGame} />);

    // Find remove button (✕)
    const removeButtons = screen.getAllByText('✕');
    fireEvent.click(removeButtons[0]);

    // Should now have 2 players
    expect(container.textContent).toContain('PLAYERS (2)');
  });

  it('prevents removing below 2 players', () => {
    const onStartGame = vi.fn();
    const { container } = render(<StartMenu onStartGame={onStartGame} />);

    // Remove one player to get to 2
    const removeButtons = screen.getAllByText('✕');
    fireEvent.click(removeButtons[0]);

    // Should have 2 players now
    expect(container.textContent).toContain('PLAYERS (2)');

    // Try to remove another player - should not work
    const updatedRemoveButtons = screen.getAllByText('✕');
    fireEvent.click(updatedRemoveButtons[0]);

    // Should still have 2 players (removal was prevented)
    expect(container.textContent).toContain('PLAYERS (2)');
  });

  it('calls onStartGame with player configs when start button is clicked', () => {
    const onStartGame = vi.fn();
    render(<StartMenu onStartGame={onStartGame} />);

    const startButton = screen.getByText('START GAME');
    fireEvent.click(startButton);

    expect(onStartGame).toHaveBeenCalledTimes(1);
    const configs = onStartGame.mock.calls[0][0];

    // Should have 4 configs (1 dealer + 3 players)
    expect(configs).toHaveLength(4);
    expect(configs[0].isDealer).toBe(true);
    expect(configs[1].isDealer).toBe(false);
  });

  it('applies Solo vs AI preset correctly', () => {
    const onStartGame = vi.fn();
    const { container } = render(<StartMenu onStartGame={onStartGame} />);

    const soloButton = screen.getByText('Solo vs AI');
    fireEvent.click(soloButton);

    // Should have 3 players (1 human + 2 AI)
    expect(container.textContent).toContain('PLAYERS (3)');
  });

  it('applies 2 Players preset correctly', () => {
    const onStartGame = vi.fn();
    const { container } = render(<StartMenu onStartGame={onStartGame} />);

    const duoButton = screen.getByText('2 Players');
    fireEvent.click(duoButton);

    // Should have 2 players
    expect(container.textContent).toContain('PLAYERS (2)');
  });

  it('applies Party Mode preset correctly', () => {
    const onStartGame = vi.fn();
    const { container } = render(<StartMenu onStartGame={onStartGame} />);

    const partyButton = screen.getByText('Party Mode');
    fireEvent.click(partyButton);

    // Should have 4 players
    expect(container.textContent).toContain('PLAYERS (4)');
  });

  it('toggles dealer between Human and AI', () => {
    const onStartGame = vi.fn();
    render(<StartMenu onStartGame={onStartGame} />);

    // Find dealer Human/AI buttons (they're in the first group)
    const buttons = screen.getAllByText('Human');
    const dealerHumanButton = buttons[0];

    fireEvent.click(dealerHumanButton);

    // Should show the secret rule textarea when dealer is human
    expect(screen.getByPlaceholderText('Describe your secret rule...')).toBeInTheDocument();
  });
});
