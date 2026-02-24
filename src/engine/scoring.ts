/**
 * Scoring formulas for New Eleusis
 */

import type { Player, GameState, PlayedCard } from './types';

/**
 * Calculate score for a player based on played cards
 */
export function calculatePlayerScore(player: Player, playedCards: PlayedCard[]): number {
  let score = 0;

  // Score points for cards played correctly (in main line)
  const correctCards = playedCards.filter(
    pc => pc.playedBy === player.id && pc.correct
  );
  score += correctCards.length;

  // Score points for successful prophet predictions
  const prophetPredictions = playedCards.filter(
    pc => pc.prophetPrediction?.predictedBy === player.id
  );
  for (const card of prophetPredictions) {
    const predictionCorrect = card.prophetPrediction!.prediction === card.correct;
    if (predictionCorrect) {
      score += 2; // Bonus for correct prediction
    } else {
      score -= 1; // Penalty for wrong prediction
    }
  }

  // Penalty for cards left in hand at end of game
  score -= player.hand.length;

  // Penalty for sudden death markers
  score -= player.suddenDeathMarkers * 5;

  return score;
}

/**
 * Calculate score for the dealer
 */
export function calculateDealerScore(state: GameState): number {
  const dealer = state.players.find(p => p.isDealer);
  if (!dealer) {
    return 0;
  }

  let score = 0;

  // Count total incorrect plays by all players
  const incorrectPlays = state.mainLine.filter(pc => !pc.correct);
  score += incorrectPlays.length * 2;

  // Bonus if dealer not overthrown (prophet didn't get 3 correct in a row)
  if (state.prophetsCorrectCount < 3) {
    score += 10;
  }

  // Penalty if dealer was overthrown
  if (state.prophetsCorrectCount >= 3) {
    score -= 15;
  }

  // Count cards remaining in all players' hands
  const totalCardsRemaining = state.players
    .filter(p => !p.isDealer)
    .reduce((sum, p) => sum + p.hand.length, 0);
  score += Math.floor(totalCardsRemaining / 5);

  return score;
}

/**
 * Calculate final scores for all players
 */
export function calculateFinalScores(state: GameState): Record<string, number> {
  const scores: Record<string, number> = {};

  for (const player of state.players) {
    if (player.isDealer) {
      scores[player.id] = calculateDealerScore(state);
    } else {
      scores[player.id] = calculatePlayerScore(player, state.mainLine);
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
