/**
 * Core type definitions for New Eleusis card game
 */

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
}

export type PlayerType = 'human' | 'ai';

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  score: number;
  isProphet: boolean;
  isGod: boolean;
  type: PlayerType;
  wasProphet: boolean;
  isExpelled: boolean;
}

export interface ProphetPrediction {
  predictedBy: string;
  prediction: boolean;
}

export interface PlayedCard extends Card {
  correct: boolean;
  playedBy: string;
  prophetPrediction?: ProphetPrediction;
  branches?: PlayedCard[];
}

export type GamePhase =
  | 'setup'
  | 'dealing'
  | 'playing'
  | 'awaiting_judgment'
  | 'prophet_declaration'
  | 'prophet_verify'
  | 'no_play_dispute'
  | 'sudden_death'
  | 'game_over';

export interface NoPlayDeclaration {
  playerId: string;
  hand: Card[];
  disputed: boolean;
  disputedBy?: string;
}

export interface PendingPlay {
  playerId: string;
  cards: Card[];
  judgedCards: PlayedCard[];
  predictions: Record<string, ProphetPrediction>;
}

export interface PlayerConfig {
  name: string;
  type: PlayerType;
  isGod: boolean;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  deck: Card[];
  mainLine: PlayedCard[];
  godRule: string;
  godRuleFunction?: (lastCard: Card, newCard: Card) => boolean;
  noPlayDeclaration?: NoPlayDeclaration;
  pendingPlay?: PendingPlay;
  prophetsCorrectCount: number;
  prophetMarkerIndex?: number;
  prophetHandAside?: Card[];
  prophetCorrectCalls: number;
  prophetIncorrectCalls: number;
  roundNumber: number;
  gameStartTime: number;
  totalCardsPlayed: number;
}

export type GameAction =
  | { type: 'INIT_GAME'; godId: string; playerIds: string[]; godRule?: string }
  | { type: 'SET_GOD_RULE'; rule: string; ruleFunction?: (lastCard: Card, newCard: Card) => boolean }
  | { type: 'DEAL_CARDS'; count: number }
  | { type: 'PLAY_CARD'; playerId: string; cardIds: string[] }
  | { type: 'JUDGE_CARD'; cardId: string; correct: boolean; skipPenalty?: boolean }
  | { type: 'DECLARE_PROPHET'; playerId: string }
  | { type: 'RESIGN_PROPHET'; playerId: string }
  | { type: 'PROPHET_PREDICT'; playerId: string; cardId: string; prediction: boolean }
  | { type: 'PROPHET_VERIFY'; prediction: boolean; godJudgment: boolean; cardId: string }
  | { type: 'OVERTHROW_PROPHET'; prophetId: string }
  | { type: 'DECLARE_NO_PLAY'; playerId: string }
  | { type: 'DISPUTE_NO_PLAY'; disputerId: string }
  | { type: 'RESOLVE_NO_PLAY'; valid: boolean; correctCardId?: string }
  | { type: 'EXPEL_PLAYER'; playerId: string }
  | { type: 'END_TURN' }
  | { type: 'END_GAME' };
