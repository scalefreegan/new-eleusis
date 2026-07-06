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
  canDisputeNoPlay,
  validatePlay,
  isSuddenDeath,
  shouldExpelPlayer,
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
  createHypothesisEngine,
  updateHypothesisEngine,
} from './ai/player';

export {
  GOD_SUDDEN_DEATH_CARD_COUNT,
  PROPHET_SUDDEN_DEATH_CARD_COUNT,
  flattenPlayedCards,
  getPlayedCardPositions,
  countPlayedCardsUpToMainLineIndex,
  countRejectedCards,
  type PlayedCardPosition,
} from './utils';

export type { Observation } from './ai/hypothesis';
export {
  HypothesisEngine,
} from './ai/hypothesis';
