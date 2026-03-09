/**
 * AI Player implementation
 * Uses hypothesis-elimination to learn the rule
 */

import type { Card, GameState } from '../types';
import { HypothesisEngine } from './hypothesis';

/**
 * Simple AI that randomly selects a card from hand
 */
export function selectRandomCard(hand: Card[]): Card | null {
  if (hand.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * hand.length);
  return hand[randomIndex];
}

/**
 * AI decides how many cards to play (1-4)
 * For now, always plays 1 card
 */
export function selectCardCount(hand: Card[]): number {
  return Math.min(1, hand.length);
}

/**
 * AI selects cards to play from hand using hypothesis engine
 * Returns array of card IDs
 */
export function selectCardsToPlay(
  hand: Card[],
  state: GameState,
  hypothesisEngine?: HypothesisEngine
): string[] {
  const count = selectCardCount(hand);
  const selectedCards: string[] = [];

  // If no hypothesis engine provided or no main line yet, use random selection
  if (!hypothesisEngine || state.mainLine.length === 0) {
    for (let i = 0; i < count; i++) {
      const card = selectRandomCard(hand.filter(c => !selectedCards.includes(c.id)));
      if (card) {
        selectedCards.push(card.id);
      }
    }
    return selectedCards;
  }

  // Use hypothesis engine to select best card
  const lastCard = state.mainLine[state.mainLine.length - 1];
  const availableHand = hand.filter(c => !selectedCards.includes(c.id));

  for (let i = 0; i < count; i++) {
    const card = hypothesisEngine.selectBestCard(availableHand, lastCard);
    if (card) {
      selectedCards.push(card.id);
    }
  }

  return selectedCards;
}

/**
 * Create a new hypothesis engine for an AI player
 */
export function createHypothesisEngine(): HypothesisEngine {
  return new HypothesisEngine();
}

/**
 * Update hypothesis engine with observations from game state
 */
export function updateHypothesisEngine(
  engine: HypothesisEngine,
  state: GameState
): void {
  // Clear and rebuild from main line
  engine.reset();
  engine.extractObservationsFromMainLine(state.mainLine);
}
