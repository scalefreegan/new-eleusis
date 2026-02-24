import { describe, it, expect } from 'vitest';
import { AIDealer, createAIDealer } from '../../../src/engine/ai/dealer';
import type { Card } from '../../../src/engine/types';

describe('AIDealer', () => {
  describe('constructor', () => {
    it('creates dealer with random rule', () => {
      const dealer = new AIDealer();
      expect(dealer.getRuleName()).toBeDefined();
      expect(dealer.getRuleDescription()).toBeDefined();
    });

    it('creates dealer with specific rule', () => {
      const dealer = new AIDealer('alternating-colors');
      expect(dealer.getRuleName()).toBe('alternating-colors');
    });

    it('falls back to random rule for invalid name', () => {
      const dealer = new AIDealer('non-existent-rule');
      expect(dealer.getRuleName()).toBeDefined();
    });
  });

  describe('getRuleName', () => {
    it('returns the rule name', () => {
      const dealer = new AIDealer('same-color');
      expect(dealer.getRuleName()).toBe('same-color');
    });
  });

  describe('getRuleDescription', () => {
    it('returns the rule description', () => {
      const dealer = new AIDealer('same-color');
      expect(dealer.getRuleDescription()).toBe('All cards must be the same color');
    });
  });

  describe('judgeCard', () => {
    it('judges cards according to selected rule', () => {
      const dealer = new AIDealer('same-color');
      const redCard: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const redCard2: Card = { suit: 'diamonds', rank: '7', id: 'd-7-0' };
      const blackCard: Card = { suit: 'spades', rank: '3', id: 's-3-0' };

      expect(dealer.judgeCard(redCard, redCard2)).toBe(true);
      expect(dealer.judgeCard(redCard, blackCard)).toBe(false);
    });

    it('correctly judges alternating-colors rule', () => {
      const dealer = new AIDealer('alternating-colors');
      const redCard: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const blackCard: Card = { suit: 'spades', rank: '7', id: 's-7-0' };

      expect(dealer.judgeCard(redCard, blackCard)).toBe(true);
      expect(dealer.judgeCard(blackCard, redCard)).toBe(true);
      expect(dealer.judgeCard(redCard, redCard)).toBe(false);
    });

    it('correctly judges ascending-rank rule', () => {
      const dealer = new AIDealer('ascending-rank');
      const card3: Card = { suit: 'hearts', rank: '3', id: 'h-3-0' };
      const card5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const card2: Card = { suit: 'hearts', rank: '2', id: 'h-2-0' };

      expect(dealer.judgeCard(card3, card5)).toBe(true);
      expect(dealer.judgeCard(card3, card2)).toBe(false);
    });
  });

  describe('getRuleFunction', () => {
    it('returns a function', () => {
      const dealer = new AIDealer('same-color');
      const fn = dealer.getRuleFunction();
      expect(typeof fn).toBe('function');
    });

    it('returned function judges correctly', () => {
      const dealer = new AIDealer('same-color');
      const fn = dealer.getRuleFunction();
      const redCard: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const blackCard: Card = { suit: 'spades', rank: '7', id: 's-7-0' };

      expect(fn(redCard, redCard)).toBe(true);
      expect(fn(redCard, blackCard)).toBe(false);
    });
  });

  describe('createAIDealer', () => {
    it('creates dealer without rule name', () => {
      const dealer = createAIDealer();
      expect(dealer).toBeInstanceOf(AIDealer);
    });

    it('creates dealer with rule name', () => {
      const dealer = createAIDealer('only-even');
      expect(dealer.getRuleName()).toBe('only-even');
    });
  });
});
