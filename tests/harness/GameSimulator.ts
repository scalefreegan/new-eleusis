import { gameReducer, createInitialState } from '../../src/engine/reducer';
import { AIDealer } from '../../src/engine/ai/dealer';
import { createDeck } from '../../src/engine/deck';
import { calculateFinalScores } from '../../src/engine/scoring';
import { canDeclareProphet, canDeclareNoPlay } from '../../src/engine/validation';
import type { GameState, GameAction, Card } from '../../src/engine/types';
import type { SimulatorConfig, GameResult, Violation, ActionLogEntry } from './types';
import { checkInvariants } from './invariants';

// Mulberry32 seeded PRNG
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle with seeded RNG
function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export class GameSimulator {
  private _state: GameState;
  private _violations: Violation[] = [];
  private _actionLog: ActionLogEntry[] = [];
  private readonly config: SimulatorConfig;
  private readonly dealer: AIDealer;
  private readonly rng: () => number;
  private turnCount = 0;

  constructor(config: SimulatorConfig) {
    this.config = config;
    this.rng = mulberry32(config.seed);
    this.dealer = new AIDealer(config.ruleName ?? { difficulty: config.difficulty ?? 'easy' });
    this._state = createInitialState();
  }

  get state(): GameState {
    return this._state;
  }

  get violations(): Violation[] {
    return this._violations;
  }

  get actionLog(): ActionLogEntry[] {
    return this._actionLog;
  }

  dispatch(action: GameAction): void {
    const prev = this._state;
    let next: GameState;
    try {
      next = gameReducer(prev, action);
    } catch (err) {
      this._violations.push({
        type: 'CRASH',
        severity: 'error',
        message: `gameReducer threw on ${action.type}: ${err instanceof Error ? err.message : String(err)}`,
        turnNumber: this.turnCount,
        action,
      });
      throw err;
    }

    // Log the action
    this._actionLog.push({
      turnNumber: this.turnCount,
      action,
      stateBefore: {
        phase: prev.phase,
        deckSize: prev.deck.length,
        playerHands: prev.players.map(p => p.hand.length),
      },
      stateAfter: {
        phase: next.phase,
        deckSize: next.deck.length,
        playerHands: next.players.map(p => p.hand.length),
      },
    });

    // Run invariant checks
    const newViolations = checkInvariants(prev, action, next, this.dealer.judgeCard.bind(this.dealer));
    this._violations.push(...newViolations);

    this._state = next;
  }

  runFullGame(): GameResult {
    // 1. INIT_GAME
    const playerIds = ['god'];
    for (let i = 1; i <= this.config.playerCount; i++) {
      playerIds.push(`player-${i}`);
    }

    this.dispatch({
      type: 'INIT_GAME',
      godId: 'god',
      playerIds,
    });

    // 2. SET_GOD_RULE
    this.dispatch({
      type: 'SET_GOD_RULE',
      rule: this.dealer.getRuleName(),
      ruleFunction: this.dealer.getRuleFunction(),
    });

    // 3. Overwrite deck with seeded shuffle for reproducibility.
    //    Use a fresh createDeck() (deterministic order) so the shuffle result
    //    depends only on the seed, not on Math.random() from INIT_GAME.
    this._state = {
      ...this._state,
      deck: seededShuffle(createDeck(), this.rng),
    };

    // 4. DEAL_CARDS
    this.dispatch({ type: 'DEAL_CARDS', count: 14 });

    // 5. Main game loop
    while (this._state.phase !== 'game_over' && this.turnCount < this.config.maxTurns) {
      if (this._state.phase !== 'playing') {
        // Unexpected phase in main loop - game may have ended or errored
        break;
      }

      const currentPlayer = this._state.players[this._state.currentPlayerIndex];

      // Skip God, expelled, and prophet players
      if (currentPlayer.isGod || currentPlayer.isExpelled || currentPlayer.isProphet) {
        this.dispatch({ type: 'END_TURN' });
        this.turnCount++;
        continue;
      }

      // Get strategy decision
      const decision = this.config.strategy.decide(currentPlayer, this._state, this.rng);

      if (decision.type === 'declare_prophet' && this.config.enableProphetPlay && canDeclareProphet(this._state, currentPlayer.id)) {
        // Prophet declaration
        this.dispatch({ type: 'DECLARE_PROPHET', playerId: currentPlayer.id });
        this.dispatch({ type: 'END_TURN' });
      } else if (decision.type === 'declare_no_play' && this.config.enableNoPlay && canDeclareNoPlay(this._state, currentPlayer.id)) {
        // No-play declaration
        this.dispatch({ type: 'DECLARE_NO_PLAY', playerId: currentPlayer.id });
        this.resolveNoPlay(currentPlayer.id);
        // END_TURN after RESOLVE_NO_PLAY when phase returns to 'playing'
        if (this._state.phase === 'playing') {
          this.dispatch({ type: 'END_TURN' });
        }
      } else {
        // Play card(s)
        let cardIds = decision.type === 'play_card' ? decision.cardIds : [];
        // Fallback: if strategy returned no cards or invalid, pick 1 random card
        const hand = this._state.players[this._state.currentPlayerIndex]?.hand;
        if (cardIds.length === 0 && hand && hand.length > 0) {
          const idx = Math.floor(this.rng() * hand.length);
          cardIds = [hand[idx].id];
        }

        if (cardIds.length === 0) {
          // Player has no cards to play - just end turn
          this.dispatch({ type: 'END_TURN' });
          this.turnCount++;
          continue;
        }

        this.dispatch({ type: 'PLAY_CARD', playerId: currentPlayer.id, cardIds });

        // Judge each pending card
        if (this._state.pendingPlay) {
          this.judgeAllPendingCards();
        }

        // END_TURN
        if (this._state.phase === 'playing') {
          this.dispatch({ type: 'END_TURN' });
        }
      }

      this.turnCount++;

      if (this._state.phase === 'game_over') {
        break;
      }
    }

    // If game didn't end naturally, force it
    if (this._state.phase !== 'game_over') {
      if (this.turnCount >= this.config.maxTurns) {
        this._violations.push({
          type: 'GAME_NEVER_ENDS',
          severity: 'warning',
          message: `Game did not end after ${this.config.maxTurns} turns`,
          turnNumber: this.turnCount,
        });
      }
      this.dispatch({ type: 'END_GAME' });
    }

    // Calculate final scores
    const finalScores = calculateFinalScores(this._state);

    return {
      completed: this.turnCount < this.config.maxTurns,
      turns: this.turnCount,
      finalScores,
      violations: this._violations,
      ruleName: this.dealer.getRuleName(),
      playerCount: this.config.playerCount,
    };
  }

  private judgeAllPendingCards(): void {
    while (this._state.pendingPlay && this._state.pendingPlay.cards.length > 0) {
      const card = this._state.pendingPlay.cards[0];
      const lastCard = this._state.mainLine[this._state.mainLine.length - 1];
      const correct = this.dealer.judgeCard(lastCard, card);

      // Check for prophet - if prophet exists and is not the playing player
      const prophet = this._state.players.find(p => p.isProphet && !p.isExpelled);
      if (prophet && prophet.id !== this._state.pendingPlay.playerId && this.config.enableProphetPlay) {
        // Prophet predicts
        const prediction = this.config.strategy.prophetPredict(prophet, card, this._state, this.rng);
        this.dispatch({
          type: 'PROPHET_PREDICT',
          playerId: prophet.id,
          cardId: card.id,
          prediction,
        });

        // Compare prediction to god's judgment
        if (prediction === correct) {
          // Prophet was right
          this.dispatch({
            type: 'PROPHET_VERIFY',
            prediction,
            godJudgment: correct,
            cardId: card.id,
          });
          this.dispatch({
            type: 'JUDGE_CARD',
            cardId: card.id,
            correct,
          });
        } else {
          // Prophet was wrong - overthrow
          this.dispatch({
            type: 'OVERTHROW_PROPHET',
            prophetId: prophet.id,
          });
          this.dispatch({
            type: 'JUDGE_CARD',
            cardId: card.id,
            correct,
            skipPenalty: true,
          });
        }
      } else {
        // No prophet flow - just judge
        this.dispatch({
          type: 'JUDGE_CARD',
          cardId: card.id,
          correct,
        });
      }

      if (this._state.phase === 'game_over') {
        break;
      }
    }
  }

  private resolveNoPlay(playerId: string): void {
    // Check if the player has a valid card
    const player = this._state.players.find(p => p.id === playerId);
    if (!player) return;

    const lastCard = this._state.mainLine[this._state.mainLine.length - 1];
    let firstValidCard: Card | undefined;

    for (const card of player.hand) {
      if (this.dealer.judgeCard(lastCard, card)) {
        firstValidCard = card;
        break;
      }
    }

    if (firstValidCard) {
      // Player lied - they had a valid card
      this.dispatch({
        type: 'RESOLVE_NO_PLAY',
        valid: false,
        correctCardId: firstValidCard.id,
      });
    } else {
      // Player was right - no valid cards
      this.dispatch({
        type: 'RESOLVE_NO_PLAY',
        valid: true,
      });
    }
  }
}
