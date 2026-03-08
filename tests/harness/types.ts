import type { Card, Player, GameState, GameAction, GamePhase, PlayedCard, PendingPlay } from '../../src/engine/types';

export type { Card, Player, GameState, GameAction, GamePhase, PlayedCard, PendingPlay };
export type { Suit, Rank } from '../../src/engine/types';

export interface SimulatorConfig {
  playerCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  ruleName: string;
  seed: number;
  strategy: PlayerStrategy;
  maxTurns: number;
  enableProphetPlay: boolean;
  enableNoPlay: boolean;
}

export interface PlayerStrategy {
  decide(player: Player, state: GameState): Decision;
  prophetPredict(prophet: Player, card: Card, state: GameState): boolean;
}

export type Decision =
  | { type: 'play_card'; cardIds: string[] }
  | { type: 'declare_no_play' }
  | { type: 'declare_prophet' };

export type ViolationSeverity = 'critical' | 'error' | 'warning';

export type ViolationType =
  | 'CRASH'
  | 'SILENT_NO_OP'
  | 'INVALID_PHASE'
  | 'CARD_CONSERVATION'
  | 'PLAYER_HAND_NEGATIVE'
  | 'DECK_UNDERFLOW'
  | 'ORPHAN_PENDING_PLAY'
  | 'INFINITE_LOOP'
  | 'SCORING_ANOMALY'
  | 'GAME_NEVER_ENDS'
  | 'WRONG_PLAYER_TURN'
  | 'PROPHET_INVARIANT'
  | 'MAINLINE_CORRUPTION'
  | 'JUDGMENT_MISMATCH';

export interface Violation {
  type: ViolationType;
  severity: ViolationSeverity;
  message: string;
  turnNumber: number;
  action: GameAction;
  stateSnapshot: Partial<GameState>;
}

export interface GameResult {
  completed: boolean;
  turns: number;
  finalScores: Record<string, number>;
  violations: Violation[];
  ruleName: string;
  playerCount: number;
}

export interface ActionLogEntry {
  turnNumber: number;
  action: GameAction;
  stateBefore: Partial<GameState>;
  stateAfter: Partial<GameState>;
}
