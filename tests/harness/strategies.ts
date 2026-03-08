import type { Card, GameState, Player } from '../../src/engine/types';
import { canDeclareProphet, canDeclareNoPlay } from '../../src/engine/validation';
import { getRankValue, getSuitColor } from '../../src/engine/deck';
import type { PlayerStrategy, Decision } from './types';

/**
 * Plays random cards with configurable prophet/no-play chances.
 */
export class RandomStrategy implements PlayerStrategy {
  private readonly prophetChance: number;
  private readonly noPlayChance: number;

  constructor(options?: { prophetChance?: number; noPlayChance?: number }) {
    this.prophetChance = options?.prophetChance ?? 0.05;
    this.noPlayChance = options?.noPlayChance ?? 0.1;
  }

  decide(player: Player, state: GameState, rng: () => number): Decision {
    // Maybe declare prophet
    if (rng() < this.prophetChance && canDeclareProphet(state, player.id)) {
      return { type: 'declare_prophet' };
    }

    // Maybe declare no-play
    if (rng() < this.noPlayChance && canDeclareNoPlay(state, player.id)) {
      return { type: 'declare_no_play' };
    }

    // Play 1 or 2 cards randomly
    const cardCount = player.hand.length >= 2 && rng() < 0.3 ? 2 : 1;
    const hand = [...player.hand];
    const cardIds: string[] = [];
    for (let i = 0; i < cardCount && hand.length > 0; i++) {
      const idx = Math.floor(rng() * hand.length);
      cardIds.push(hand[idx].id);
      hand.splice(idx, 1);
    }

    return { type: 'play_card', cardIds };
  }

  prophetPredict(_prophet: Player, _card: Card, _state: GameState, rng: () => number): boolean {
    return rng() < 0.5;
  }
}

/**
 * Seeks edge cases: plays boundary ranks (A, K), mismatched suits,
 * and aggressively declares prophet/no-play to stress test game logic.
 */
export class AdversarialStrategy implements PlayerStrategy {
  decide(player: Player, state: GameState, rng: () => number): Decision {
    // Aggressively declare prophet when possible (stress-test prophet flow)
    if (rng() < 0.3 && canDeclareProphet(state, player.id)) {
      return { type: 'declare_prophet' };
    }

    // Aggressively declare no-play (stress-test dispute flow)
    if (rng() < 0.25 && canDeclareNoPlay(state, player.id)) {
      return { type: 'declare_no_play' };
    }

    // Prefer edge-case cards: aces, kings, face cards, mismatched colors
    const hand = [...player.hand];
    const lastCard = state.mainLine[state.mainLine.length - 1];

    // Sort by "adversarial value" — prefer boundary cards and color mismatches
    hand.sort((a, b) => {
      const aScore = adversarialScore(a, lastCard);
      const bScore = adversarialScore(b, lastCard);
      return bScore - aScore;
    });

    // Play 2 cards when possible to stress multi-card judgment
    const cardCount = hand.length >= 2 ? 2 : 1;
    const cardIds = hand.slice(0, cardCount).map(c => c.id);

    return { type: 'play_card', cardIds };
  }

  prophetPredict(_prophet: Player, _card: Card, _state: GameState, rng: () => number): boolean {
    // Alternate predictions to stress both correct/incorrect prophet paths
    return rng() < 0.5;
  }
}

function adversarialScore(card: Card, lastCard: Card | undefined): number {
  let score = 0;
  const rank = getRankValue(card.rank);

  // Prefer boundary ranks
  if (rank === 1 || rank === 13) score += 3;
  if (rank === 12 || rank === 11) score += 2;

  // Prefer color mismatches with last card
  if (lastCard && getSuitColor(card.suit) !== getSuitColor(lastCard.suit)) {
    score += 2;
  }

  // Prefer suit mismatches
  if (lastCard && card.suit !== lastCard.suit) {
    score += 1;
  }

  return score;
}

/**
 * Builds a hypothesis about the rule by tracking which plays were correct,
 * then plays cards consistent with the hypothesis. Falls back to random
 * when the hypothesis is uncertain.
 */
export class HypothesisStrategy implements PlayerStrategy {
  private correctPairs: Array<{ last: Card; played: Card }> = [];
  private incorrectPairs: Array<{ last: Card; played: Card }> = [];

  decide(player: Player, state: GameState, rng: () => number): Decision {
    // Observe the mainline to learn
    this.observeMainline(state);

    // Maybe declare prophet if we have a strong hypothesis
    if (this.correctPairs.length >= 5 && rng() < 0.15 && canDeclareProphet(state, player.id)) {
      return { type: 'declare_prophet' };
    }

    if (rng() < 0.05 && canDeclareNoPlay(state, player.id)) {
      return { type: 'declare_no_play' };
    }

    const lastCard = state.mainLine[state.mainLine.length - 1];
    if (!lastCard || this.correctPairs.length < 3) {
      // Not enough data — play random
      return playRandom(player, rng);
    }

    // Score each card in hand by similarity to historically correct plays
    const scored = player.hand.map(card => ({
      card,
      score: this.scoreCard(card, lastCard),
    }));
    scored.sort((a, b) => b.score - a.score);

    // Pick the best card, or random if all scores are 0
    const best = scored[0];
    if (best.score > 0) {
      return { type: 'play_card', cardIds: [best.card.id] };
    }

    return playRandom(player, rng);
  }

  prophetPredict(_prophet: Player, card: Card, state: GameState, _rng: () => number): boolean {
    this.observeMainline(state);
    const lastCard = state.mainLine[state.mainLine.length - 1];
    if (!lastCard || this.correctPairs.length < 3) return true;
    return this.scoreCard(card, lastCard) > 0;
  }

  private observeMainline(state: GameState): void {
    // Reset and rebuild from mainline (idempotent)
    this.correctPairs = [];
    this.incorrectPairs = [];

    for (let i = 1; i < state.mainLine.length; i++) {
      const last = state.mainLine[i - 1];
      const played = state.mainLine[i];
      if (played.correct) {
        this.correctPairs.push({ last, played });
      }
      // Branches are incorrect plays
      if (played.branches) {
        for (const branch of played.branches) {
          this.incorrectPairs.push({ last, played: branch });
        }
      }
    }
  }

  private scoreCard(card: Card, lastCard: Card): number {
    let score = 0;

    // Check patterns from correct plays
    for (const { last, played } of this.correctPairs) {
      // Same suit match
      if (last.suit === lastCard.suit && played.suit === card.suit) score += 1;
      // Same color match
      if (getSuitColor(last.suit) === getSuitColor(lastCard.suit) &&
          getSuitColor(played.suit) === getSuitColor(card.suit)) score += 0.5;
      // Same rank relationship
      const lastDiff = getRankValue(played.rank) - getRankValue(last.rank);
      const currDiff = getRankValue(card.rank) - getRankValue(lastCard.rank);
      if (lastDiff === currDiff) score += 1;
    }

    // Penalize patterns from incorrect plays
    for (const { last, played } of this.incorrectPairs) {
      if (last.suit === lastCard.suit && played.suit === card.suit) score -= 0.5;
      const lastDiff = getRankValue(played.rank) - getRankValue(last.rank);
      const currDiff = getRankValue(card.rank) - getRankValue(lastCard.rank);
      if (lastDiff === currDiff) score -= 0.5;
    }

    return score;
  }
}

/**
 * Randomly switches between the other strategies each turn.
 * Useful for testing diverse game scenarios in a single run.
 */
export class MixedStrategy implements PlayerStrategy {
  private readonly strategies: PlayerStrategy[];

  constructor(strategies?: PlayerStrategy[]) {
    this.strategies = strategies ?? [
      new RandomStrategy(),
      new AdversarialStrategy(),
      new HypothesisStrategy(),
    ];
  }

  decide(player: Player, state: GameState, rng: () => number): Decision {
    const idx = Math.floor(rng() * this.strategies.length);
    return this.strategies[idx].decide(player, state, rng);
  }

  prophetPredict(prophet: Player, card: Card, state: GameState, rng: () => number): boolean {
    const idx = Math.floor(rng() * this.strategies.length);
    return this.strategies[idx].prophetPredict(prophet, card, state, rng);
  }
}

function playRandom(player: Player, rng: () => number): Decision {
  const hand = [...player.hand];
  if (hand.length === 0) return { type: 'play_card', cardIds: [] };
  const idx = Math.floor(rng() * hand.length);
  return { type: 'play_card', cardIds: [hand[idx].id] };
}
