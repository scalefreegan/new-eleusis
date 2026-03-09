import { describe, it, expect } from 'vitest';
import { RULE_BANK, getRandomRule, getRuleByName, getRandomRuleByDifficulty, getRulesByDifficulty } from '../../../src/engine/ai/rules';
import type { Card } from '../../../src/engine/types';

describe('AI rules', () => {
  const redCard: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
  const blackCard: Card = { suit: 'spades', rank: '7', id: 's-7-0' };
  const redCard2: Card = { suit: 'diamonds', rank: '3', id: 'd-3-0' };
  const aceHearts: Card = { suit: 'hearts', rank: 'A', id: 'h-a-0' };
  const aceSpades: Card = { suit: 'spades', rank: 'A', id: 's-a-0' };

  describe('alternating-colors', () => {
    it('accepts alternating colors', () => {
      const rule = getRuleByName('alternating-colors')!;
      expect(rule.judge(redCard, blackCard)).toBe(true);
      expect(rule.judge(blackCard, redCard)).toBe(true);
    });

    it('rejects same color', () => {
      const rule = getRuleByName('alternating-colors')!;
      expect(rule.judge(redCard, redCard2)).toBe(false);
      expect(rule.judge(blackCard, blackCard)).toBe(false);
    });
  });

  describe('same-color', () => {
    it('accepts same color', () => {
      const rule = getRuleByName('same-color')!;
      expect(rule.judge(redCard, redCard2)).toBe(true);
      expect(rule.judge(blackCard, blackCard)).toBe(true);
    });

    it('rejects different colors', () => {
      const rule = getRuleByName('same-color')!;
      expect(rule.judge(redCard, blackCard)).toBe(false);
    });
  });

  describe('ascending-rank', () => {
    it('accepts higher rank', () => {
      const rule = getRuleByName('ascending-rank')!;
      const card5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const card7: Card = { suit: 'hearts', rank: '7', id: 'h-7-0' };
      expect(rule.judge(card5, card7)).toBe(true);
    });

    it('rejects lower rank', () => {
      const rule = getRuleByName('ascending-rank')!;
      const card7: Card = { suit: 'hearts', rank: '7', id: 'h-7-0' };
      const card5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      expect(rule.judge(card7, card5)).toBe(false);
    });

    it('rejects equal rank', () => {
      const rule = getRuleByName('ascending-rank')!;
      expect(rule.judge(aceHearts, aceSpades)).toBe(false);
    });
  });

  describe('descending-rank', () => {
    it('accepts lower rank', () => {
      const rule = getRuleByName('descending-rank')!;
      const card7: Card = { suit: 'hearts', rank: '7', id: 'h-7-0' };
      const card5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      expect(rule.judge(card7, card5)).toBe(true);
    });

    it('rejects higher rank', () => {
      const rule = getRuleByName('descending-rank')!;
      const card5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const card7: Card = { suit: 'hearts', rank: '7', id: 'h-7-0' };
      expect(rule.judge(card5, card7)).toBe(false);
    });
  });

  describe('same-suit-or-same-rank', () => {
    it('accepts same suit', () => {
      const rule = getRuleByName('same-suit-or-same-rank')!;
      const card5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const card7: Card = { suit: 'hearts', rank: '7', id: 'h-7-0' };
      expect(rule.judge(card5, card7)).toBe(true);
    });

    it('accepts same rank', () => {
      const rule = getRuleByName('same-suit-or-same-rank')!;
      expect(rule.judge(aceHearts, aceSpades)).toBe(true);
    });

    it('rejects different suit and rank', () => {
      const rule = getRuleByName('same-suit-or-same-rank')!;
      const card5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const card7: Card = { suit: 'spades', rank: '7', id: 's-7-0' };
      expect(rule.judge(card5, card7)).toBe(false);
    });
  });

  describe('alternating-even-odd', () => {
    it('accepts even after odd', () => {
      const rule = getRuleByName('alternating-even-odd')!;
      const odd: Card = { suit: 'hearts', rank: '3', id: 'h-3-0' };
      const even: Card = { suit: 'hearts', rank: '4', id: 'h-4-0' };
      expect(rule.judge(odd, even)).toBe(true);
    });

    it('accepts odd after even', () => {
      const rule = getRuleByName('alternating-even-odd')!;
      const even: Card = { suit: 'hearts', rank: '4', id: 'h-4-0' };
      const odd: Card = { suit: 'hearts', rank: '3', id: 'h-3-0' };
      expect(rule.judge(even, odd)).toBe(true);
    });

    it('rejects same parity', () => {
      const rule = getRuleByName('alternating-even-odd')!;
      const odd1: Card = { suit: 'hearts', rank: '3', id: 'h-3-0' };
      const odd2: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      expect(rule.judge(odd1, odd2)).toBe(false);
    });
  });

  describe('only-even', () => {
    it('accepts even ranks', () => {
      const rule = getRuleByName('only-even')!;
      const even1: Card = { suit: 'hearts', rank: '2', id: 'h-2-0' };
      const even2: Card = { suit: 'hearts', rank: '4', id: 'h-4-0' };
      expect(rule.judge(even1, even2)).toBe(true);
    });

    it('rejects odd ranks', () => {
      const rule = getRuleByName('only-even')!;
      const even: Card = { suit: 'hearts', rank: '2', id: 'h-2-0' };
      const odd: Card = { suit: 'hearts', rank: '3', id: 'h-3-0' };
      expect(rule.judge(even, odd)).toBe(false);
    });
  });

  describe('only-odd', () => {
    it('accepts odd ranks', () => {
      const rule = getRuleByName('only-odd')!;
      const odd1: Card = { suit: 'hearts', rank: '3', id: 'h-3-0' };
      const odd2: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      expect(rule.judge(odd1, odd2)).toBe(true);
    });

    it('rejects even ranks', () => {
      const rule = getRuleByName('only-odd')!;
      const odd: Card = { suit: 'hearts', rank: '3', id: 'h-3-0' };
      const even: Card = { suit: 'hearts', rank: '4', id: 'h-4-0' };
      expect(rule.judge(odd, even)).toBe(false);
    });
  });

  describe('no-face-cards', () => {
    it('accepts non-face cards', () => {
      const rule = getRuleByName('no-face-cards')!;
      const card5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const ace: Card = { suit: 'hearts', rank: 'A', id: 'h-a-0' };
      expect(rule.judge(card5, ace)).toBe(true);
    });

    it('rejects face cards', () => {
      const rule = getRuleByName('no-face-cards')!;
      const card5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const jack: Card = { suit: 'hearts', rank: 'J', id: 'h-j-0' };
      const queen: Card = { suit: 'hearts', rank: 'Q', id: 'h-q-0' };
      const king: Card = { suit: 'hearts', rank: 'K', id: 'h-k-0' };
      expect(rule.judge(card5, jack)).toBe(false);
      expect(rule.judge(card5, queen)).toBe(false);
      expect(rule.judge(card5, king)).toBe(false);
    });
  });

  describe('adjacent-ranks', () => {
    it('accepts adjacent ranks', () => {
      const rule = getRuleByName('adjacent-ranks')!;
      const card5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const card6: Card = { suit: 'hearts', rank: '6', id: 'h-6-0' };
      const card4: Card = { suit: 'hearts', rank: '4', id: 'h-4-0' };
      expect(rule.judge(card5, card6)).toBe(true);
      expect(rule.judge(card5, card4)).toBe(true);
    });

    it('rejects non-adjacent ranks', () => {
      const rule = getRuleByName('adjacent-ranks')!;
      const card5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const card8: Card = { suit: 'hearts', rank: '8', id: 'h-8-0' };
      expect(rule.judge(card5, card8)).toBe(false);
    });
  });

  describe('RULE_BANK', () => {
    it('contains at least 30 rules', () => {
      expect(RULE_BANK.length).toBeGreaterThanOrEqual(30);
    });

    it('all rules have required properties', () => {
      RULE_BANK.forEach(rule => {
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.difficulty).toBeDefined();
        expect(['easy', 'medium', 'hard']).toContain(rule.difficulty);
        expect(typeof rule.judge).toBe('function');
      });
    });
  });

  describe('getRandomRule', () => {
    it('returns a rule from the bank', () => {
      const rule = getRandomRule();
      expect(RULE_BANK).toContain(rule);
    });

    it('returns different rules (probabilistic)', () => {
      const rules = new Set();
      for (let i = 0; i < 50; i++) {
        rules.add(getRandomRule().name);
      }
      // Should get at least 2 different rules in 50 tries
      expect(rules.size).toBeGreaterThan(1);
    });
  });

  describe('getRuleByName', () => {
    it('returns correct rule by name', () => {
      const rule = getRuleByName('alternating-colors');
      expect(rule?.name).toBe('alternating-colors');
    });

    it('returns undefined for non-existent rule', () => {
      const rule = getRuleByName('non-existent-rule');
      expect(rule).toBeUndefined();
    });
  });

  describe('getRandomRuleByDifficulty', () => {
    it('returns easy rule when asked', () => {
      const rule = getRandomRuleByDifficulty('easy');
      expect(rule.difficulty).toBe('easy');
    });

    it('returns medium rule when asked', () => {
      const rule = getRandomRuleByDifficulty('medium');
      expect(rule.difficulty).toBe('medium');
    });

    it('returns hard rule when asked', () => {
      const rule = getRandomRuleByDifficulty('hard');
      expect(rule.difficulty).toBe('hard');
    });
  });

  describe('getRulesByDifficulty', () => {
    it('returns all easy rules', () => {
      const rules = getRulesByDifficulty('easy');
      expect(rules.length).toBeGreaterThan(0);
      rules.forEach(rule => expect(rule.difficulty).toBe('easy'));
    });

    it('returns all medium rules', () => {
      const rules = getRulesByDifficulty('medium');
      expect(rules.length).toBeGreaterThan(0);
      rules.forEach(rule => expect(rule.difficulty).toBe('medium'));
    });

    it('returns all hard rules', () => {
      const rules = getRulesByDifficulty('hard');
      expect(rules.length).toBeGreaterThan(0);
      rules.forEach(rule => expect(rule.difficulty).toBe('hard'));
    });
  });

  // ===== NEW RULE TESTS =====

  describe('same-suit', () => {
    it('accepts same suit', () => {
      const rule = getRuleByName('same-suit')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const h7: Card = { suit: 'hearts', rank: '7', id: 'h-7-0' };
      expect(rule.judge(h5, h7)).toBe(true);
    });

    it('rejects different suit', () => {
      const rule = getRuleByName('same-suit')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s7: Card = { suit: 'spades', rank: '7', id: 's-7-0' };
      expect(rule.judge(h5, s7)).toBe(false);
    });
  });

  describe('only-red', () => {
    it('accepts red cards', () => {
      const rule = getRuleByName('only-red')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const d7: Card = { suit: 'diamonds', rank: '7', id: 'd-7-0' };
      expect(rule.judge(h5, d7)).toBe(true);
    });

    it('rejects black cards', () => {
      const rule = getRuleByName('only-red')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s7: Card = { suit: 'spades', rank: '7', id: 's-7-0' };
      expect(rule.judge(h5, s7)).toBe(false);
    });
  });

  describe('only-black', () => {
    it('accepts black cards', () => {
      const rule = getRuleByName('only-black')!;
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      const c7: Card = { suit: 'clubs', rank: '7', id: 'c-7-0' };
      expect(rule.judge(s5, c7)).toBe(true);
    });

    it('rejects red cards', () => {
      const rule = getRuleByName('only-black')!;
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      const h7: Card = { suit: 'hearts', rank: '7', id: 'h-7-0' };
      expect(rule.judge(s5, h7)).toBe(false);
    });
  });

  describe('only-face-cards', () => {
    it('accepts face cards', () => {
      const rule = getRuleByName('only-face-cards')!;
      const hJ: Card = { suit: 'hearts', rank: 'J', id: 'h-j-0' };
      const sQ: Card = { suit: 'spades', rank: 'Q', id: 's-q-0' };
      expect(rule.judge(hJ, sQ)).toBe(true);
    });

    it('rejects non-face cards', () => {
      const rule = getRuleByName('only-face-cards')!;
      const hJ: Card = { suit: 'hearts', rank: 'J', id: 'h-j-0' };
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      expect(rule.judge(hJ, s5)).toBe(false);
    });
  });

  describe('same-rank', () => {
    it('accepts same rank', () => {
      const rule = getRuleByName('same-rank')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      expect(rule.judge(h5, s5)).toBe(true);
    });

    it('rejects different rank', () => {
      const rule = getRuleByName('same-rank')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const h7: Card = { suit: 'hearts', rank: '7', id: 'h-7-0' };
      expect(rule.judge(h5, h7)).toBe(false);
    });
  });

  describe('higher-than-7', () => {
    it('accepts cards higher than 7', () => {
      const rule = getRuleByName('higher-than-7')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s8: Card = { suit: 'spades', rank: '8', id: 's-8-0' };
      expect(rule.judge(h5, s8)).toBe(true);
    });

    it('rejects cards 7 or lower', () => {
      const rule = getRuleByName('higher-than-7')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s7: Card = { suit: 'spades', rank: '7', id: 's-7-0' };
      expect(rule.judge(h5, s7)).toBe(false);
    });
  });

  describe('lower-than-7', () => {
    it('accepts cards lower than 7', () => {
      const rule = getRuleByName('lower-than-7')!;
      const h8: Card = { suit: 'hearts', rank: '8', id: 'h-8-0' };
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      expect(rule.judge(h8, s5)).toBe(true);
    });

    it('rejects cards 7 or higher', () => {
      const rule = getRuleByName('lower-than-7')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s8: Card = { suit: 'spades', rank: '8', id: 's-8-0' };
      expect(rule.judge(h5, s8)).toBe(false);
    });
  });

  describe('rank-sum-even', () => {
    it('accepts when sum is even', () => {
      const rule = getRuleByName('rank-sum-even')!;
      const h3: Card = { suit: 'hearts', rank: '3', id: 'h-3-0' };
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      expect(rule.judge(h3, s5)).toBe(true); // 3 + 5 = 8 (even)
    });

    it('rejects when sum is odd', () => {
      const rule = getRuleByName('rank-sum-even')!;
      const h3: Card = { suit: 'hearts', rank: '3', id: 'h-3-0' };
      const s4: Card = { suit: 'spades', rank: '4', id: 's-4-0' };
      expect(rule.judge(h3, s4)).toBe(false); // 3 + 4 = 7 (odd)
    });
  });

  describe('rank-sum-odd', () => {
    it('accepts when sum is odd', () => {
      const rule = getRuleByName('rank-sum-odd')!;
      const h3: Card = { suit: 'hearts', rank: '3', id: 'h-3-0' };
      const s4: Card = { suit: 'spades', rank: '4', id: 's-4-0' };
      expect(rule.judge(h3, s4)).toBe(true); // 3 + 4 = 7 (odd)
    });

    it('rejects when sum is even', () => {
      const rule = getRuleByName('rank-sum-odd')!;
      const h3: Card = { suit: 'hearts', rank: '3', id: 'h-3-0' };
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      expect(rule.judge(h3, s5)).toBe(false); // 3 + 5 = 8 (even)
    });
  });

  describe('alternating-suit', () => {
    it('accepts different suit', () => {
      const rule = getRuleByName('alternating-suit')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      expect(rule.judge(h5, s5)).toBe(true);
    });

    it('rejects same suit', () => {
      const rule = getRuleByName('alternating-suit')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const h7: Card = { suit: 'hearts', rank: '7', id: 'h-7-0' };
      expect(rule.judge(h5, h7)).toBe(false);
    });
  });

  describe('rank-divisible-by-3', () => {
    it('accepts ranks divisible by 3', () => {
      const rule = getRuleByName('rank-divisible-by-3')!;
      const h2: Card = { suit: 'hearts', rank: '2', id: 'h-2-0' };
      const s3: Card = { suit: 'spades', rank: '3', id: 's-3-0' };
      expect(rule.judge(h2, s3)).toBe(true); // 3 % 3 = 0
    });

    it('rejects ranks not divisible by 3', () => {
      const rule = getRuleByName('rank-divisible-by-3')!;
      const h2: Card = { suit: 'hearts', rank: '2', id: 'h-2-0' };
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      expect(rule.judge(h2, s5)).toBe(false); // 5 % 3 != 0
    });
  });

  describe('prime-ranks-only', () => {
    it('accepts prime ranks', () => {
      const rule = getRuleByName('prime-ranks-only')!;
      const h2: Card = { suit: 'hearts', rank: '2', id: 'h-2-0' };
      const s3: Card = { suit: 'spades', rank: '3', id: 's-3-0' };
      expect(rule.judge(h2, s3)).toBe(true);
    });

    it('rejects non-prime ranks', () => {
      const rule = getRuleByName('prime-ranks-only')!;
      const h2: Card = { suit: 'hearts', rank: '2', id: 'h-2-0' };
      const s4: Card = { suit: 'spades', rank: '4', id: 's-4-0' };
      expect(rule.judge(h2, s4)).toBe(false);
    });
  });

  describe('red-ascending-black-descending', () => {
    it('accepts red ascending', () => {
      const rule = getRuleByName('red-ascending-black-descending')!;
      const h3: Card = { suit: 'hearts', rank: '3', id: 'h-3-0' };
      const d5: Card = { suit: 'diamonds', rank: '5', id: 'd-5-0' };
      expect(rule.judge(h3, d5)).toBe(true);
    });

    it('rejects red descending', () => {
      const rule = getRuleByName('red-ascending-black-descending')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const d3: Card = { suit: 'diamonds', rank: '3', id: 'd-3-0' };
      expect(rule.judge(h5, d3)).toBe(false);
    });

    it('accepts black descending', () => {
      const rule = getRuleByName('red-ascending-black-descending')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s3: Card = { suit: 'spades', rank: '3', id: 's-3-0' };
      expect(rule.judge(h5, s3)).toBe(true);
    });

    it('rejects black ascending', () => {
      const rule = getRuleByName('red-ascending-black-descending')!;
      const h3: Card = { suit: 'hearts', rank: '3', id: 'h-3-0' };
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      expect(rule.judge(h3, s5)).toBe(false);
    });
  });

  describe('fibonacci-sequence', () => {
    it('accepts fibonacci progression', () => {
      const rule = getRuleByName('fibonacci-sequence')!;
      const h2: Card = { suit: 'hearts', rank: '2', id: 'h-2-0' };
      const s3: Card = { suit: 'spades', rank: '3', id: 's-3-0' };
      expect(rule.judge(h2, s3)).toBe(true);
    });

    it('rejects non-fibonacci progression', () => {
      const rule = getRuleByName('fibonacci-sequence')!;
      const h2: Card = { suit: 'hearts', rank: '2', id: 'h-2-0' };
      const s4: Card = { suit: 'spades', rank: '4', id: 's-4-0' };
      expect(rule.judge(h2, s4)).toBe(false);
    });
  });

  describe('suit-rotation', () => {
    it('accepts correct suit rotation', () => {
      const rule = getRuleByName('suit-rotation')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const d7: Card = { suit: 'diamonds', rank: '7', id: 'd-7-0' };
      expect(rule.judge(h5, d7)).toBe(true);
    });

    it('rejects incorrect suit rotation', () => {
      const rule = getRuleByName('suit-rotation')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s7: Card = { suit: 'spades', rank: '7', id: 's-7-0' };
      expect(rule.judge(h5, s7)).toBe(false);
    });
  });

  describe('rank-difference-equals-3', () => {
    it('accepts difference of 3', () => {
      const rule = getRuleByName('rank-difference-equals-3')!;
      const h2: Card = { suit: 'hearts', rank: '2', id: 'h-2-0' };
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      expect(rule.judge(h2, s5)).toBe(true);
    });

    it('rejects difference not equal to 3', () => {
      const rule = getRuleByName('rank-difference-equals-3')!;
      const h2: Card = { suit: 'hearts', rank: '2', id: 'h-2-0' };
      const s4: Card = { suit: 'spades', rank: '4', id: 's-4-0' };
      expect(rule.judge(h2, s4)).toBe(false);
    });
  });

  describe('matching-parity-different-color', () => {
    it('accepts same parity different color', () => {
      const rule = getRuleByName('matching-parity-different-color')!;
      const h2: Card = { suit: 'hearts', rank: '2', id: 'h-2-0' };
      const s4: Card = { suit: 'spades', rank: '4', id: 's-4-0' };
      expect(rule.judge(h2, s4)).toBe(true);
    });

    it('rejects different parity', () => {
      const rule = getRuleByName('matching-parity-different-color')!;
      const h2: Card = { suit: 'hearts', rank: '2', id: 'h-2-0' };
      const s3: Card = { suit: 'spades', rank: '3', id: 's-3-0' };
      expect(rule.judge(h2, s3)).toBe(false);
    });

    it('rejects same color', () => {
      const rule = getRuleByName('matching-parity-different-color')!;
      const h2: Card = { suit: 'hearts', rank: '2', id: 'h-2-0' };
      const d4: Card = { suit: 'diamonds', rank: '4', id: 'd-4-0' };
      expect(rule.judge(h2, d4)).toBe(false);
    });
  });

  describe('opposite-parity-same-color', () => {
    it('accepts opposite parity same color', () => {
      const rule = getRuleByName('opposite-parity-same-color')!;
      const h2: Card = { suit: 'hearts', rank: '2', id: 'h-2-0' };
      const d3: Card = { suit: 'diamonds', rank: '3', id: 'd-3-0' };
      expect(rule.judge(h2, d3)).toBe(true);
    });

    it('rejects same parity', () => {
      const rule = getRuleByName('opposite-parity-same-color')!;
      const h2: Card = { suit: 'hearts', rank: '2', id: 'h-2-0' };
      const d4: Card = { suit: 'diamonds', rank: '4', id: 'd-4-0' };
      expect(rule.judge(h2, d4)).toBe(false);
    });

    it('rejects different color', () => {
      const rule = getRuleByName('opposite-parity-same-color')!;
      const h2: Card = { suit: 'hearts', rank: '2', id: 'h-2-0' };
      const s3: Card = { suit: 'spades', rank: '3', id: 's-3-0' };
      expect(rule.judge(h2, s3)).toBe(false);
    });
  });

  describe('rank-product-less-than-20', () => {
    it('accepts product less than 20', () => {
      const rule = getRuleByName('rank-product-less-than-20')!;
      const h2: Card = { suit: 'hearts', rank: '2', id: 'h-2-0' };
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      expect(rule.judge(h2, s5)).toBe(true); // 2 * 5 = 10
    });

    it('rejects product 20 or greater', () => {
      const rule = getRuleByName('rank-product-less-than-20')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      expect(rule.judge(h5, s5)).toBe(false); // 5 * 5 = 25
    });
  });

  describe('alternating-red-black-faces', () => {
    it('accepts alternating colors with face cards', () => {
      const rule = getRuleByName('alternating-red-black-faces')!;
      const hJ: Card = { suit: 'hearts', rank: 'J', id: 'h-j-0' };
      const sQ: Card = { suit: 'spades', rank: 'Q', id: 's-q-0' };
      expect(rule.judge(hJ, sQ)).toBe(true);
    });

    it('rejects non-face cards', () => {
      const rule = getRuleByName('alternating-red-black-faces')!;
      const hJ: Card = { suit: 'hearts', rank: 'J', id: 'h-j-0' };
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      expect(rule.judge(hJ, s5)).toBe(false);
    });

    it('rejects same color face cards', () => {
      const rule = getRuleByName('alternating-red-black-faces')!;
      const hJ: Card = { suit: 'hearts', rank: 'J', id: 'h-j-0' };
      const dQ: Card = { suit: 'diamonds', rank: 'Q', id: 'd-q-0' };
      expect(rule.judge(hJ, dQ)).toBe(false);
    });
  });

  describe('hearts-or-even-clubs', () => {
    it('accepts hearts', () => {
      const rule = getRuleByName('hearts-or-even-clubs')!;
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      const h7: Card = { suit: 'hearts', rank: '7', id: 'h-7-0' };
      expect(rule.judge(s5, h7)).toBe(true);
    });

    it('accepts even clubs', () => {
      const rule = getRuleByName('hearts-or-even-clubs')!;
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      const c4: Card = { suit: 'clubs', rank: '4', id: 'c-4-0' };
      expect(rule.judge(s5, c4)).toBe(true);
    });

    it('rejects odd clubs', () => {
      const rule = getRuleByName('hearts-or-even-clubs')!;
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      const c5: Card = { suit: 'clubs', rank: '5', id: 'c-5-0' };
      expect(rule.judge(s5, c5)).toBe(false);
    });

    it('rejects other suits', () => {
      const rule = getRuleByName('hearts-or-even-clubs')!;
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      const d4: Card = { suit: 'diamonds', rank: '4', id: 'd-4-0' };
      expect(rule.judge(s5, d4)).toBe(false);
    });
  });

  describe('spades-ascending-others-descending', () => {
    it('accepts spades ascending', () => {
      const rule = getRuleByName('spades-ascending-others-descending')!;
      const h3: Card = { suit: 'hearts', rank: '3', id: 'h-3-0' };
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      expect(rule.judge(h3, s5)).toBe(true);
    });

    it('rejects spades descending', () => {
      const rule = getRuleByName('spades-ascending-others-descending')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s3: Card = { suit: 'spades', rank: '3', id: 's-3-0' };
      expect(rule.judge(h5, s3)).toBe(false);
    });

    it('accepts other suits descending', () => {
      const rule = getRuleByName('spades-ascending-others-descending')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const d3: Card = { suit: 'diamonds', rank: '3', id: 'd-3-0' };
      expect(rule.judge(h5, d3)).toBe(true);
    });

    it('rejects other suits ascending', () => {
      const rule = getRuleByName('spades-ascending-others-descending')!;
      const h3: Card = { suit: 'hearts', rank: '3', id: 'h-3-0' };
      const d5: Card = { suit: 'diamonds', rank: '5', id: 'd-5-0' };
      expect(rule.judge(h3, d5)).toBe(false);
    });
  });

  describe('rank-modulo-suit-count', () => {
    it('accepts correct modulo match', () => {
      const rule = getRuleByName('rank-modulo-suit-count')!;
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      expect(rule.judge(s5, h5)).toBe(true); // 5 % 4 = 1 (hearts=1)
    });

    it('rejects incorrect modulo', () => {
      const rule = getRuleByName('rank-modulo-suit-count')!;
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      const h4: Card = { suit: 'hearts', rank: '4', id: 'h-4-0' };
      expect(rule.judge(s5, h4)).toBe(false); // 4 % 4 = 0 (not hearts=1)
    });
  });

  describe('same-color-or-adjacent-rank', () => {
    it('accepts same color only', () => {
      const rule = getRuleByName('same-color-or-adjacent-rank')!;
      const h2: Card = { suit: 'hearts', rank: '2', id: 'h-2-0' };
      const d5: Card = { suit: 'diamonds', rank: '5', id: 'd-5-0' };
      expect(rule.judge(h2, d5)).toBe(true);
    });

    it('accepts adjacent rank only', () => {
      const rule = getRuleByName('same-color-or-adjacent-rank')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s6: Card = { suit: 'spades', rank: '6', id: 's-6-0' };
      expect(rule.judge(h5, s6)).toBe(true);
    });

    it('rejects both conditions true', () => {
      const rule = getRuleByName('same-color-or-adjacent-rank')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const d6: Card = { suit: 'diamonds', rank: '6', id: 'd-6-0' };
      expect(rule.judge(h5, d6)).toBe(false);
    });

    it('rejects neither condition true', () => {
      const rule = getRuleByName('same-color-or-adjacent-rank')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s8: Card = { suit: 'spades', rank: '8', id: 's-8-0' };
      expect(rule.judge(h5, s8)).toBe(false);
    });
  });

  describe('low-red-high-black', () => {
    it('accepts low red cards', () => {
      const rule = getRuleByName('low-red-high-black')!;
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      expect(rule.judge(s5, h5)).toBe(true);
    });

    it('rejects high red cards', () => {
      const rule = getRuleByName('low-red-high-black')!;
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      const h9: Card = { suit: 'hearts', rank: '9', id: 'h-9-0' };
      expect(rule.judge(s5, h9)).toBe(false);
    });

    it('accepts high black cards', () => {
      const rule = getRuleByName('low-red-high-black')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s9: Card = { suit: 'spades', rank: '9', id: 's-9-0' };
      expect(rule.judge(h5, s9)).toBe(true);
    });

    it('rejects low black cards', () => {
      const rule = getRuleByName('low-red-high-black')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      expect(rule.judge(h5, s5)).toBe(false);
    });
  });

  describe('power-of-2-or-face', () => {
    it('accepts powers of 2', () => {
      const rule = getRuleByName('power-of-2-or-face')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s2: Card = { suit: 'spades', rank: '2', id: 's-2-0' };
      expect(rule.judge(h5, s2)).toBe(true);
    });

    it('accepts face cards', () => {
      const rule = getRuleByName('power-of-2-or-face')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const sJ: Card = { suit: 'spades', rank: 'J', id: 's-j-0' };
      expect(rule.judge(h5, sJ)).toBe(true);
    });

    it('rejects other numbers', () => {
      const rule = getRuleByName('power-of-2-or-face')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      expect(rule.judge(h5, s5)).toBe(false);
    });
  });

  describe('composite-rank-only', () => {
    it('accepts composite numbers', () => {
      const rule = getRuleByName('composite-rank-only')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s4: Card = { suit: 'spades', rank: '4', id: 's-4-0' };
      expect(rule.judge(h5, s4)).toBe(true);
    });

    it('rejects prime numbers', () => {
      const rule = getRuleByName('composite-rank-only')!;
      const h4: Card = { suit: 'hearts', rank: '4', id: 'h-4-0' };
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      expect(rule.judge(h4, s5)).toBe(false);
    });
  });

  describe('alternating-high-low', () => {
    it('accepts high after low', () => {
      const rule = getRuleByName('alternating-high-low')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s9: Card = { suit: 'spades', rank: '9', id: 's-9-0' };
      expect(rule.judge(h5, s9)).toBe(true);
    });

    it('accepts low after high', () => {
      const rule = getRuleByName('alternating-high-low')!;
      const h9: Card = { suit: 'hearts', rank: '9', id: 'h-9-0' };
      const s5: Card = { suit: 'spades', rank: '5', id: 's-5-0' };
      expect(rule.judge(h9, s5)).toBe(true);
    });

    it('rejects two high', () => {
      const rule = getRuleByName('alternating-high-low')!;
      const h9: Card = { suit: 'hearts', rank: '9', id: 'h-9-0' };
      const s10: Card = { suit: 'spades', rank: '10', id: 's-10-0' };
      expect(rule.judge(h9, s10)).toBe(false);
    });

    it('rejects two low', () => {
      const rule = getRuleByName('alternating-high-low')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s6: Card = { suit: 'spades', rank: '6', id: 's-6-0' };
      expect(rule.judge(h5, s6)).toBe(false);
    });
  });

  describe('sum-divisible-by-5', () => {
    it('accepts sum divisible by 5', () => {
      const rule = getRuleByName('sum-divisible-by-5')!;
      const h2: Card = { suit: 'hearts', rank: '2', id: 'h-2-0' };
      const s3: Card = { suit: 'spades', rank: '3', id: 's-3-0' };
      expect(rule.judge(h2, s3)).toBe(true); // 2 + 3 = 5
    });

    it('rejects sum not divisible by 5', () => {
      const rule = getRuleByName('sum-divisible-by-5')!;
      const h2: Card = { suit: 'hearts', rank: '2', id: 'h-2-0' };
      const s4: Card = { suit: 'spades', rank: '4', id: 's-4-0' };
      expect(rule.judge(h2, s4)).toBe(false); // 2 + 4 = 6
    });
  });

  describe('wrapping-adjacent', () => {
    it('accepts normal adjacent ranks', () => {
      const rule = getRuleByName('wrapping-adjacent')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s6: Card = { suit: 'spades', rank: '6', id: 's-6-0' };
      expect(rule.judge(h5, s6)).toBe(true);
    });

    it('accepts K to A wrap', () => {
      const rule = getRuleByName('wrapping-adjacent')!;
      const hK: Card = { suit: 'hearts', rank: 'K', id: 'h-k-0' };
      const sA: Card = { suit: 'spades', rank: 'A', id: 's-a-0' };
      expect(rule.judge(hK, sA)).toBe(true);
    });

    it('accepts A to K wrap', () => {
      const rule = getRuleByName('wrapping-adjacent')!;
      const hA: Card = { suit: 'hearts', rank: 'A', id: 'h-a-0' };
      const sK: Card = { suit: 'spades', rank: 'K', id: 's-k-0' };
      expect(rule.judge(hA, sK)).toBe(true);
    });

    it('rejects non-adjacent ranks', () => {
      const rule = getRuleByName('wrapping-adjacent')!;
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s8: Card = { suit: 'spades', rank: '8', id: 's-8-0' };
      expect(rule.judge(h5, s8)).toBe(false);
    });
  });
});
