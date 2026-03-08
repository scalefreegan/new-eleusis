import type { Card, GameState, Player } from '../../src/engine/types';
import { canDeclareProphet, canDeclareNoPlay } from '../../src/engine/validation';
import type { PlayerStrategy, Decision } from './types';

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
