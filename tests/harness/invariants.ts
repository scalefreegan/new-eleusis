import type { GameState, GameAction, GamePhase, PlayedCard, Card, Violation, ViolationType, ViolationSeverity } from './types';

type JudgeFn = (lastMainLineCard: Card, judgedCard: Card) => boolean;

function flattenPlayedCards(mainLine: PlayedCard[]): PlayedCard[] {
  const all: PlayedCard[] = [];
  for (const card of mainLine) {
    all.push(card);
    if (card.branches) {
      for (const branch of card.branches) {
        all.push(branch);
        // branches are only one level deep in the current engine
      }
    }
  }
  return all;
}

function countAllCards(state: GameState): number {
  let total = 0;
  total += state.deck.length;
  for (const player of state.players) {
    total += player.hand.length;
  }
  total += flattenPlayedCards(state.mainLine).length;
  if (state.pendingPlay) {
    total += state.pendingPlay.cards.length;
    total += state.pendingPlay.judgedCards.length;
  }
  if (state.prophetHandAside) {
    total += state.prophetHandAside.length;
  }
  return total;
}

function violation(
  type: ViolationType,
  severity: ViolationSeverity,
  message: string,
  turnNumber: number,
  action: GameAction,
  state: GameState,
): Violation {
  return {
    type,
    severity,
    message,
    turnNumber,
    action,
    stateSnapshot: {
      phase: state.phase,
      currentPlayerIndex: state.currentPlayerIndex,
      totalCardsPlayed: state.totalCardsPlayed,
      roundNumber: state.roundNumber,
    },
  };
}

const VALID_PHASE_TRANSITIONS: Record<string, GamePhase[]> = {
  setup: ['dealing'],
  dealing: ['playing'],
  playing: ['awaiting_judgment', 'no_play_dispute', 'playing', 'game_over'],
  awaiting_judgment: ['playing', 'awaiting_judgment', 'game_over'],
  no_play_dispute: ['no_play_dispute', 'playing', 'game_over'],
  prophet_declaration: ['playing'],
  prophet_verify: ['playing'],
  sudden_death: ['game_over', 'playing'],
  game_over: [],
};

export function checkInvariants(
  prev: GameState,
  action: GameAction,
  next: GameState,
  judgeFn?: JudgeFn,
): Violation[] {
  const violations: Violation[] = [];
  const turn = next.roundNumber;

  // 1. Card conservation (skip INIT_GAME which creates the deck from nothing)
  if (action.type !== 'INIT_GAME') {
    const prevCount = countAllCards(prev);
    const nextCount = countAllCards(next);
    if (prevCount !== nextCount) {
      violations.push(violation(
        'CARD_CONSERVATION',
        'critical',
        `Card count changed from ${prevCount} to ${nextCount} after ${action.type}`,
        turn, action, next,
      ));
    }
  }

  // 2. No negative hand size
  for (const player of next.players) {
    if (player.hand.length < 0) {
      violations.push(violation(
        'PLAYER_HAND_NEGATIVE',
        'critical',
        `Player ${player.id} has negative hand size: ${player.hand.length}`,
        turn, action, next,
      ));
    }
  }

  // 3. Deck length never negative
  if (next.deck.length < 0) {
    violations.push(violation(
      'DECK_UNDERFLOW',
      'critical',
      `Deck length is negative: ${next.deck.length}`,
      turn, action, next,
    ));
  }

  // 4. Phase transition validity
  if (prev.phase !== next.phase) {
    const allowed = VALID_PHASE_TRANSITIONS[prev.phase];
    if (allowed && !allowed.includes(next.phase)) {
      violations.push(violation(
        'INVALID_PHASE',
        'critical',
        `Invalid phase transition: ${prev.phase} -> ${next.phase} on ${action.type}`,
        turn, action, next,
      ));
    }
  }

  // 5. No orphaned pendingPlay when phase is 'playing'
  if (next.phase === 'playing' && next.pendingPlay !== undefined) {
    violations.push(violation(
      'ORPHAN_PENDING_PLAY',
      'error',
      `pendingPlay exists but phase is 'playing' after ${action.type}`,
      turn, action, next,
    ));
  }

  // 6. Current player is not God or expelled when phase is 'playing'
  if (next.phase === 'playing' && next.players.length > 0) {
    const currentPlayer = next.players[next.currentPlayerIndex];
    if (currentPlayer) {
      if (currentPlayer.isGod) {
        violations.push(violation(
          'WRONG_PLAYER_TURN',
          'error',
          `Current player ${currentPlayer.id} is God during playing phase`,
          turn, action, next,
        ));
      }
      if (currentPlayer.isExpelled) {
        violations.push(violation(
          'WRONG_PLAYER_TURN',
          'error',
          `Current player ${currentPlayer.id} is expelled during playing phase`,
          turn, action, next,
        ));
      }
    }
  }

  // 7. At most one prophet; prophet is never God
  const prophets = next.players.filter(p => p.isProphet);
  if (prophets.length > 1) {
    violations.push(violation(
      'PROPHET_INVARIANT',
      'critical',
      `Multiple prophets found: ${prophets.map(p => p.id).join(', ')}`,
      turn, action, next,
    ));
  }
  for (const prophet of prophets) {
    if (prophet.isGod) {
      violations.push(violation(
        'PROPHET_INVARIANT',
        'critical',
        `Prophet ${prophet.id} is also God`,
        turn, action, next,
      ));
    }
  }

  // 8. totalCardsPlayed never decreases
  if (next.totalCardsPlayed < prev.totalCardsPlayed) {
    violations.push(violation(
      'MAINLINE_CORRUPTION',
      'critical',
      `totalCardsPlayed decreased from ${prev.totalCardsPlayed} to ${next.totalCardsPlayed}`,
      turn, action, next,
    ));
  }

  // 9. Judgment consistency
  if (action.type === 'JUDGE_CARD' && judgeFn && prev.mainLine.length > 0) {
    const lastMainLineCard = prev.mainLine[prev.mainLine.length - 1];
    const judgedCard = prev.pendingPlay?.cards.find(c => c.id === action.cardId);
    if (judgedCard && lastMainLineCard) {
      const expected = judgeFn(lastMainLineCard, judgedCard);
      if (expected !== action.correct) {
        violations.push(violation(
          'JUDGMENT_MISMATCH',
          'error',
          `Judgment for card ${action.cardId}: God said ${action.correct}, rule says ${expected}`,
          turn, action, next,
        ));
      }
    }
  }

  // 10. Silent no-op detection
  if (prev === next && shouldHaveMutated(action)) {
    violations.push(violation(
      'SILENT_NO_OP',
      'warning',
      `Action ${action.type} returned same state reference (no-op)`,
      turn, action, next,
    ));
  }

  // 11. Scoring sanity at game_over
  if (next.phase === 'game_over') {
    for (const player of next.players) {
      if (player.score < 0 || !Number.isFinite(player.score)) {
        violations.push(violation(
          'SCORING_ANOMALY',
          'error',
          `Player ${player.id} has invalid score: ${player.score}`,
          turn, action, next,
        ));
      }
    }
  }

  return violations;
}

function shouldHaveMutated(action: GameAction): boolean {
  // Actions that should always produce a new state object
  const mutating = [
    'INIT_GAME', 'DEAL_CARDS', 'PLAY_CARD', 'JUDGE_CARD',
    'DECLARE_PROPHET', 'DECLARE_NO_PLAY', 'RESOLVE_NO_PLAY',
    'END_TURN', 'END_GAME', 'SET_GOD_RULE',
  ];
  return mutating.includes(action.type);
}
