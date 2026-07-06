import type { PlayedCard } from './types';

export const GOD_SUDDEN_DEATH_CARD_COUNT = 40;
export const PROPHET_SUDDEN_DEATH_CARD_COUNT = 30;

export interface PlayedCardPosition {
  card: PlayedCard;
  mainLineIndex: number;
  branchIndex?: number;
  flatIndex: number;
  turn: number;
}

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

export function getPlayedCardPositions(mainLine: PlayedCard[]): PlayedCardPosition[] {
  const positions: PlayedCardPosition[] = [];
  let flatIndex = 0;

  for (let mainLineIndex = 0; mainLineIndex < mainLine.length; mainLineIndex++) {
    const card = mainLine[mainLineIndex];
    positions.push({
      card,
      mainLineIndex,
      flatIndex,
      turn: flatIndex,
    });
    flatIndex++;

    for (let branchIndex = 0; branchIndex < (card.branches?.length ?? 0); branchIndex++) {
      positions.push({
        card: card.branches![branchIndex],
        mainLineIndex,
        branchIndex,
        flatIndex,
        turn: flatIndex,
      });
      flatIndex++;
    }
  }

  return positions;
}

export function countPlayedCardsUpToMainLineIndex(mainLine: PlayedCard[], index: number): number {
  if (index < 0) return 0;
  let count = 0;
  const end = Math.min(index, mainLine.length - 1);

  for (let i = 0; i <= end; i++) {
    count++;
    count += mainLine[i].branches?.length ?? 0;
  }

  return Math.max(0, count - 1);
}

export function countRejectedCards(mainLine: PlayedCard[]): number {
  return mainLine.reduce((sum, card) => sum + (card.branches?.length ?? 0), 0);
}
