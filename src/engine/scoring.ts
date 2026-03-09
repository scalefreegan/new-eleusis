/**
 * Scoring formulas for New Eleusis
 */

import type { Player, GameState, PlayedCard } from './types';
import { flattenPlayedCards } from './utils';

/**
 * Calculate score for a player based on played cards (Official Rules)
 */
export function calculatePlayerScore(player: Player, state: GameState): number {
  // Find highest hand count among all players (including prophet)
  const highCount = Math.max(...state.players.map(p => p.hand.length));

  // Base score: highCount - cardsInHand
  let score = highCount - player.hand.length;

  // Bonus for empty hand
  if (player.hand.length === 0) {
    score += 4;
  }

  // True Prophet bonus (only if still Prophet at game end)
  if (player.isProphet && state.prophetMarkerIndex !== undefined) {
    // Get cards played after the Prophet marker
    const cardsAfterMarker = state.mainLine.slice(state.prophetMarkerIndex + 1);
    const allCardsAfterMarker = flattenPlayedCards(cardsAfterMarker);

    // +1 for each right card (main line), +2 for each wrong card (branch)
    for (const card of allCardsAfterMarker) {
      if (card.correct) {
        score += 1;
      } else {
        score += 2;
      }
    }
  }

  return score;
}

/**
 * Calculate score for the god (Official Rules)
 */
export function calculateGodScore(state: GameState): number {
  const god = state.players.find(p => p.isGod);
  if (!god) {
    return 0;
  }

  // Find highest player score (non-god)
  const playerScores = state.players
    .filter(p => !p.isGod)
    .map(p => calculatePlayerScore(p, state));
  const highestPlayerScore = playerScores.length > 0 ? Math.max(...playerScores) : 0;

  // Count cards played before Prophet started (if Prophet existed)
  let cardsBeforeProphet = state.mainLine.length;
  if (state.prophetMarkerIndex !== undefined) {
    cardsBeforeProphet = state.prophetMarkerIndex + 1;
  }

  // God score = min(highest player score, 2 * cards played before Prophet)
  const score = Math.min(highestPlayerScore, 2 * cardsBeforeProphet);

  return score;
}

/**
 * Calculate final scores for all players
 */
export function calculateFinalScores(state: GameState): Record<string, number> {
  const scores: Record<string, number> = {};

  for (const player of state.players) {
    if (player.isGod) {
      scores[player.id] = calculateGodScore(state);
    } else {
      scores[player.id] = calculatePlayerScore(player, state);
    }
  }

  return scores;
}

/**
 * Get the current leader
 */
export function getLeader(state: GameState): Player | null {
  if (state.players.length === 0) {
    return null;
  }

  const scores = calculateFinalScores(state);
  const sortedPlayers = [...state.players].sort((a, b) => scores[b.id] - scores[a.id]);

  return sortedPlayers[0];
}
