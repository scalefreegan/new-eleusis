import type { PlayedCard } from './types';

export function flattenPlayedCards(mainLine: PlayedCard[]): PlayedCard[] {
  const all: PlayedCard[] = [];
  for (const card of mainLine) {
    all.push(card);
    if (card.branches) {
      all.push(...card.branches);
    }
  }
  return all;
}
