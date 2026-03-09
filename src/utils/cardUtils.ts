export function getSuitSymbol(suit: string): '♥' | '♦' | '♣' | '♠' {
  const suitMap: Record<string, '♥' | '♦' | '♣' | '♠'> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };
  return suitMap[suit] || '♥';
}
