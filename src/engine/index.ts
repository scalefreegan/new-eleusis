/**
 * New Eleusis Game Engine
 * Pure TypeScript game logic with no UI dependencies
 */

// Core types
export type {
  Suit,
  Rank,
  Card,
  PlayerType,
  Player,
  PlayerConfig,
  ProphetPrediction,
  PlayedCard,
  GamePhase,
  NoPlayDeclaration,
  GameState,
  GameAction,
} from './types';

// Deck utilities
export {
  createDeck,
  shuffle,
  dealCards,
  getRankValue,
  getSuitColor,
  isFaceCard,
  isEvenRank,
} from './deck';

// State management
export {
  createInitialState,
  gameReducer,
} from './reducer';

// Validation
export {
  canPlayCard,
  canDeclareProphet,
  canDeclareNoPlay,
  validatePlay,
  shouldReceiveSuddenDeathMarker,
  shouldBeExpelled,
  shouldGameEnd,
} from './validation';

// Scoring
export {
  calculatePlayerScore,
  calculateGodScore,
  calculateFinalScores,
  getLeader,
} from './scoring';

// AI
export type { Rule, Difficulty } from './ai/rules';
export {
  RULE_BANK,
  getRandomRule,
  getRuleByName,
  getRandomRuleByDifficulty,
  getRulesByDifficulty,
} from './ai/rules';

export type { DealerOptions } from './ai/dealer';
export {
  AIDealer,
  createAIDealer,
} from './ai/dealer';

export {
  selectRandomCard,
  selectCardCount,
  selectCardsToPlay,
  shouldDeclareNoPlay,
  shouldDeclareProphet,
  createHypothesisEngine,
  updateHypothesisEngine,
} from './ai/player';

export type { Observation } from './ai/hypothesis';
export {
  HypothesisEngine,
} from './ai/hypothesis';
