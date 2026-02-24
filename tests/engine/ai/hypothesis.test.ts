import { describe, it, expect, beforeEach } from 'vitest';
import { HypothesisEngine } from '../../../src/engine/ai/hypothesis';
import type { Card, PlayedCard } from '../../../src/engine/types';
import { RULE_BANK, getRuleByName } from '../../../src/engine/ai/rules';

describe('HypothesisEngine', () => {
  let engine: HypothesisEngine;

  beforeEach(() => {
    engine = new HypothesisEngine();
  });

  describe('initialization', () => {
    it('starts with all rules as hypotheses', () => {
      const stats = engine.getStats();
      expect(stats.totalRules).toBe(RULE_BANK.length);
      expect(stats.consistentRules).toBe(RULE_BANK.length);
      expect(stats.observations).toBe(0);
    });

    it('has no most likely rule initially', () => {
      const mostLikely = engine.getMostLikelyRule();
      // With no observations, all rules have equal score
      expect(mostLikely).toBeDefined();
    });
  });

  describe('addObservation', () => {
    it('eliminates inconsistent rules', () => {
      const redCard: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const blackCard: Card = { suit: 'spades', rank: '7', id: 's-7-0' };

      // Observation: red -> black was correct
      engine.addObservation({
        lastCard: redCard,
        playedCard: blackCard,
        wasCorrect: true,
      });

      const stats = engine.getStats();
      expect(stats.observations).toBe(1);
      // Should eliminate rules that say this is wrong
      expect(stats.consistentRules).toBeLessThan(stats.totalRules);
    });

    it('increases score for consistent rules', () => {
      const redCard: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const blackCard: Card = { suit: 'spades', rank: '7', id: 's-7-0' };

      engine.addObservation({
        lastCard: redCard,
        playedCard: blackCard,
        wasCorrect: true,
      });

      const stats = engine.getStats();
      const topHypotheses = stats.topHypotheses;

      expect(topHypotheses.length).toBeGreaterThan(0);
      expect(topHypotheses[0].score).toBeGreaterThan(0);
    });

    it('handles multiple observations', () => {
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s7: Card = { suit: 'spades', rank: '7', id: 's-7-0' };
      const d3: Card = { suit: 'diamonds', rank: '3', id: 'd-3-0' };

      engine.addObservation({
        lastCard: h5,
        playedCard: s7,
        wasCorrect: true,
      });

      engine.addObservation({
        lastCard: s7,
        playedCard: d3,
        wasCorrect: true,
      });

      const stats = engine.getStats();
      expect(stats.observations).toBe(2);
    });
  });

  describe('extractObservationsFromMainLine', () => {
    it('extracts all observations from main line', () => {
      const mainLine: PlayedCard[] = [
        { suit: 'hearts', rank: '5', id: 'h-5-0', correct: true, playedBy: 'p1' },
        { suit: 'spades', rank: '7', id: 's-7-0', correct: true, playedBy: 'p1' },
        { suit: 'diamonds', rank: '3', id: 'd-3-0', correct: true, playedBy: 'p2' },
        { suit: 'clubs', rank: '9', id: 'c-9-0', correct: true, playedBy: 'p3' },
      ];

      engine.extractObservationsFromMainLine(mainLine);

      const stats = engine.getStats();
      // Should have n-1 observations for n cards
      expect(stats.observations).toBe(3);
    });

    it('handles incorrect cards in main line', () => {
      const mainLine: PlayedCard[] = [
        { suit: 'hearts', rank: '5', id: 'h-5-0', correct: true, playedBy: 'p1' },
        { suit: 'hearts', rank: '7', id: 'h-7-0', correct: false, playedBy: 'p1' },
      ];

      engine.extractObservationsFromMainLine(mainLine);

      const stats = engine.getStats();
      expect(stats.observations).toBe(1);
    });
  });

  describe('getConsistentHypotheses', () => {
    it('returns all hypotheses initially', () => {
      const consistent = engine.getConsistentHypotheses();
      expect(consistent.length).toBe(RULE_BANK.length);
    });

    it('returns sorted by score', () => {
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s7: Card = { suit: 'spades', rank: '7', id: 's-7-0' };

      engine.addObservation({
        lastCard: h5,
        playedCard: s7,
        wasCorrect: true,
      });

      const consistent = engine.getConsistentHypotheses();
      // Check that scores are in descending order
      for (let i = 1; i < consistent.length; i++) {
        const prevScore = engine.getStats().topHypotheses.find(h => h.name === consistent[i - 1].name)?.score || 0;
        const currScore = engine.getStats().topHypotheses.find(h => h.name === consistent[i].name)?.score || 0;
        expect(prevScore).toBeGreaterThanOrEqual(currScore);
      }
    });
  });

  describe('getMostLikelyRule', () => {
    it('returns highest scoring rule', () => {
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s7: Card = { suit: 'spades', rank: '7', id: 's-7-0' };

      engine.addObservation({
        lastCard: h5,
        playedCard: s7,
        wasCorrect: true,
      });

      const mostLikely = engine.getMostLikelyRule();
      expect(mostLikely).toBeDefined();
    });

    it('returns null when no consistent rules', () => {
      // Create impossible observations
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s7: Card = { suit: 'spades', rank: '7', id: 's-7-0' };

      // Add contradictory observations
      engine.addObservation({
        lastCard: h5,
        playedCard: s7,
        wasCorrect: true,
      });

      engine.addObservation({
        lastCard: h5,
        playedCard: s7,
        wasCorrect: false,
      });

      const stats = engine.getStats();
      if (stats.consistentRules === 0) {
        const mostLikely = engine.getMostLikelyRule();
        expect(mostLikely).toBeNull();
      }
    });
  });

  describe('calculateInformationGain', () => {
    it('returns a score for each card', () => {
      const lastCard: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const candidateCard: Card = { suit: 'spades', rank: '7', id: 's-7-0' };

      const score = engine.calculateInformationGain(lastCard, candidateCard);
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('prefers cards with high information gain', () => {
      // Add some observations to narrow down hypotheses
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s7: Card = { suit: 'spades', rank: '7', id: 's-7-0' };

      engine.addObservation({
        lastCard: h5,
        playedCard: s7,
        wasCorrect: true,
      });

      const lastCard: Card = { suit: 'spades', rank: '7', id: 's-7-0' };
      const card1: Card = { suit: 'hearts', rank: '3', id: 'h-3-0' };

      const score1 = engine.calculateInformationGain(lastCard, card1);
      expect(typeof score1).toBe('number');
    });
  });

  describe('selectBestCard', () => {
    it('returns null for empty hand', () => {
      const lastCard: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const card = engine.selectBestCard([], lastCard);
      expect(card).toBeNull();
    });

    it('returns a card from the hand', () => {
      const lastCard: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const hand: Card[] = [
        { suit: 'spades', rank: '7', id: 's-7-0' },
        { suit: 'diamonds', rank: '3', id: 'd-3-0' },
        { suit: 'clubs', rank: '9', id: 'c-9-0' },
      ];

      const card = engine.selectBestCard(hand, lastCard);
      expect(card).not.toBeNull();
      expect(hand).toContain(card);
    });

    it('selects card with highest information gain when many hypotheses remain', () => {
      const lastCard: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const hand: Card[] = [
        { suit: 'spades', rank: '7', id: 's-7-0' },
        { suit: 'diamonds', rank: '3', id: 'd-3-0' },
      ];

      const card = engine.selectBestCard(hand, lastCard);
      expect(card).not.toBeNull();
    });

    it('selects most likely success card when few hypotheses remain', () => {
      // Narrow down to a specific rule (alternating-colors)
      const rule = getRuleByName('alternating-colors')!;

      const observations: Array<{ last: Card; played: Card; correct: boolean }> = [
        {
          last: { suit: 'hearts', rank: '5', id: 'h-5-0' },
          played: { suit: 'spades', rank: '7', id: 's-7-0' },
          correct: true,
        },
        {
          last: { suit: 'spades', rank: '7', id: 's-7-0' },
          played: { suit: 'diamonds', rank: '3', id: 'd-3-0' },
          correct: true,
        },
        {
          last: { suit: 'diamonds', rank: '3', id: 'd-3-0' },
          played: { suit: 'clubs', rank: '9', id: 'c-9-0' },
          correct: true,
        },
      ];

      observations.forEach(obs => {
        engine.addObservation({
          lastCard: obs.last,
          playedCard: obs.played,
          wasCorrect: obs.correct,
        });
      });

      const stats = engine.getStats();
      // Verify we've narrowed down hypotheses
      expect(stats.consistentRules).toBeLessThan(RULE_BANK.length);

      const lastCard: Card = { suit: 'clubs', rank: '9', id: 'c-9-0' };
      const hand: Card[] = [
        { suit: 'hearts', rank: '2', id: 'h-2-0' }, // red - should be preferred
        { suit: 'clubs', rank: '4', id: 'c-4-0' },  // black - should be avoided
      ];

      const card = engine.selectBestCard(hand, lastCard);
      expect(card).not.toBeNull();
    });
  });

  describe('getStats', () => {
    it('returns correct statistics', () => {
      const stats = engine.getStats();

      expect(stats).toHaveProperty('totalRules');
      expect(stats).toHaveProperty('consistentRules');
      expect(stats).toHaveProperty('observations');
      expect(stats).toHaveProperty('mostLikelyRule');
      expect(stats).toHaveProperty('topHypotheses');

      expect(Array.isArray(stats.topHypotheses)).toBe(true);
    });

    it('updates after observations', () => {
      const initialStats = engine.getStats();

      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s7: Card = { suit: 'spades', rank: '7', id: 's-7-0' };

      engine.addObservation({
        lastCard: h5,
        playedCard: s7,
        wasCorrect: true,
      });

      const updatedStats = engine.getStats();

      expect(updatedStats.observations).toBe(initialStats.observations + 1);
    });
  });

  describe('reset', () => {
    it('clears all observations', () => {
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s7: Card = { suit: 'spades', rank: '7', id: 's-7-0' };

      engine.addObservation({
        lastCard: h5,
        playedCard: s7,
        wasCorrect: true,
      });

      expect(engine.getStats().observations).toBe(1);

      engine.reset();

      expect(engine.getStats().observations).toBe(0);
    });

    it('restores all hypotheses to consistent', () => {
      const h5: Card = { suit: 'hearts', rank: '5', id: 'h-5-0' };
      const s7: Card = { suit: 'spades', rank: '7', id: 's-7-0' };

      engine.addObservation({
        lastCard: h5,
        playedCard: s7,
        wasCorrect: true,
      });

      const beforeReset = engine.getStats();
      expect(beforeReset.consistentRules).toBeLessThan(beforeReset.totalRules);

      engine.reset();

      const afterReset = engine.getStats();
      expect(afterReset.consistentRules).toBe(afterReset.totalRules);
    });
  });

  describe('integration with known rule', () => {
    it('identifies alternating-colors rule', () => {
      const observations = [
        { last: { suit: 'hearts', rank: '5', id: 'h-5-0' }, played: { suit: 'spades', rank: '7', id: 's-7-0' }, correct: true },
        { last: { suit: 'spades', rank: '7', id: 's-7-0' }, played: { suit: 'diamonds', rank: '3', id: 'd-3-0' }, correct: true },
        { last: { suit: 'diamonds', rank: '3', id: 'd-3-0' }, played: { suit: 'clubs', rank: '9', id: 'c-9-0' }, correct: true },
        { last: { suit: 'clubs', rank: '9', id: 'c-9-0' }, played: { suit: 'hearts', rank: '2', id: 'h-2-0' }, correct: true },
        { last: { suit: 'hearts', rank: '2', id: 'h-2-0' }, played: { suit: 'hearts', rank: '4', id: 'h-4-0' }, correct: false },
      ];

      observations.forEach(obs => {
        engine.addObservation({
          lastCard: obs.last,
          playedCard: obs.played,
          wasCorrect: obs.correct,
        });
      });

      const stats = engine.getStats();
      expect(stats.consistentRules).toBeLessThan(stats.totalRules);

      const consistentHypotheses = engine.getConsistentHypotheses();
      const ruleNames = consistentHypotheses.map(h => h.name);

      // alternating-colors should still be consistent
      expect(ruleNames).toContain('alternating-colors');
      // same-color should be eliminated
      expect(ruleNames).not.toContain('same-color');
    });

    it('identifies same-suit rule', () => {
      const observations = [
        { last: { suit: 'hearts', rank: '5', id: 'h-5-0' }, played: { suit: 'hearts', rank: '7', id: 'h-7-0' }, correct: true },
        { last: { suit: 'hearts', rank: '7', id: 'h-7-0' }, played: { suit: 'hearts', rank: '3', id: 'h-3-0' }, correct: true },
        { last: { suit: 'hearts', rank: '3', id: 'h-3-0' }, played: { suit: 'hearts', rank: '9', id: 'h-9-0' }, correct: true },
        { last: { suit: 'hearts', rank: '9', id: 'h-9-0' }, played: { suit: 'spades', rank: '2', id: 's-2-0' }, correct: false },
      ];

      observations.forEach(obs => {
        engine.addObservation({
          lastCard: obs.last,
          playedCard: obs.played,
          wasCorrect: obs.correct,
        });
      });

      const consistentHypotheses = engine.getConsistentHypotheses();
      const ruleNames = consistentHypotheses.map(h => h.name);

      // same-suit should still be consistent
      expect(ruleNames).toContain('same-suit');
    });
  });
});
