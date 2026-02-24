/**
 * Hypothesis-Elimination AI Engine
 * Uses information theory to narrow down possible rules
 */

import type { Card, PlayedCard } from '../types';
import { RULE_BANK, type Rule } from './rules';

/**
 * Hypothesis tracking for a single rule
 */
interface Hypothesis {
  rule: Rule;
  consistent: boolean;
  score: number; // How well it matches observed plays
}

/**
 * Observation of a card play and its outcome
 */
export interface Observation {
  lastCard: Card;
  playedCard: Card;
  wasCorrect: boolean;
}

/**
 * HypothesisEngine uses observations to eliminate impossible rules
 * and select cards that maximize information gain
 */
export class HypothesisEngine {
  private hypotheses: Map<string, Hypothesis>;
  private observations: Observation[];

  constructor() {
    this.hypotheses = new Map();
    this.observations = [];

    // Initialize with all rules as possible hypotheses
    RULE_BANK.forEach(rule => {
      this.hypotheses.set(rule.name, {
        rule,
        consistent: true,
        score: 0,
      });
    });
  }

  /**
   * Add an observation from the game
   */
  addObservation(observation: Observation): void {
    this.observations.push(observation);
    this.updateHypotheses(observation);
  }

  /**
   * Extract observations from the main line
   */
  extractObservationsFromMainLine(mainLine: PlayedCard[]): void {
    for (let i = 1; i < mainLine.length; i++) {
      const lastCard = mainLine[i - 1];
      const currentCard = mainLine[i];

      this.addObservation({
        lastCard: { suit: lastCard.suit, rank: lastCard.rank, id: lastCard.id },
        playedCard: { suit: currentCard.suit, rank: currentCard.rank, id: currentCard.id },
        wasCorrect: currentCard.correct,
      });
    }
  }

  /**
   * Update hypotheses based on a new observation
   */
  private updateHypotheses(observation: Observation): void {
    this.hypotheses.forEach((hypothesis, _ruleName) => {
      if (!hypothesis.consistent) return;

      const predicted = hypothesis.rule.judge(observation.lastCard, observation.playedCard);
      const actual = observation.wasCorrect;

      if (predicted !== actual) {
        // Rule is inconsistent with observation, eliminate it
        hypothesis.consistent = false;
        hypothesis.score = -1000;
      } else {
        // Rule is consistent, increase score
        hypothesis.score += 1;
      }
    });
  }

  /**
   * Get all consistent hypotheses
   */
  getConsistentHypotheses(): Rule[] {
    return Array.from(this.hypotheses.values())
      .filter(h => h.consistent)
      .sort((a, b) => b.score - a.score)
      .map(h => h.rule);
  }

  /**
   * Get the most likely rule
   */
  getMostLikelyRule(): Rule | null {
    const consistent = this.getConsistentHypotheses();
    return consistent.length > 0 ? consistent[0] : null;
  }

  /**
   * Calculate information gain for playing a specific card
   * Returns a score - higher is better
   */
  calculateInformationGain(lastCard: Card, candidateCard: Card): number {
    const consistentHypotheses = Array.from(this.hypotheses.values())
      .filter(h => h.consistent);

    if (consistentHypotheses.length === 0) {
      // No consistent hypotheses, play randomly
      return Math.random();
    }

    // Count how many hypotheses predict success vs failure
    let predictSuccess = 0;
    let predictFailure = 0;

    consistentHypotheses.forEach(hypothesis => {
      if (hypothesis.rule.judge(lastCard, candidateCard)) {
        predictSuccess++;
      } else {
        predictFailure++;
      }
    });

    // Information gain is maximized when predictions are split 50/50
    // This gives us the most information about which rules are correct
    const total = predictSuccess + predictFailure;
    const ratio = Math.min(predictSuccess, predictFailure) / total;

    // Add bias toward cards that are more likely to succeed
    // (we still want to learn, but we also want to win)
    const successProbability = predictSuccess / total;

    // 70% weight on information gain, 30% weight on success probability
    return ratio * 0.7 + successProbability * 0.3;
  }

  /**
   * Select the best card from hand to maximize learning
   */
  selectBestCard(hand: Card[], lastCard: Card): Card | null {
    if (hand.length === 0) return null;

    const consistentCount = Array.from(this.hypotheses.values())
      .filter(h => h.consistent).length;

    // If we have very few hypotheses left, play to win
    if (consistentCount <= 3) {
      return this.selectMostLikelySuccessCard(hand, lastCard);
    }

    // Otherwise, maximize information gain
    let bestCard: Card | null = null;
    let bestScore = -1;

    hand.forEach(card => {
      const score = this.calculateInformationGain(lastCard, card);
      if (score > bestScore) {
        bestScore = score;
        bestCard = card;
      }
    });

    return bestCard;
  }

  /**
   * Select the card most likely to succeed based on current hypotheses
   */
  private selectMostLikelySuccessCard(hand: Card[], lastCard: Card): Card | null {
    if (hand.length === 0) return null;

    const consistentHypotheses = Array.from(this.hypotheses.values())
      .filter(h => h.consistent);

    let bestCard: Card | null = null;
    let bestSuccessRate = -1;

    hand.forEach(card => {
      let successCount = 0;

      consistentHypotheses.forEach(hypothesis => {
        if (hypothesis.rule.judge(lastCard, card)) {
          successCount++;
        }
      });

      const successRate = consistentHypotheses.length > 0
        ? successCount / consistentHypotheses.length
        : 0;

      if (successRate > bestSuccessRate) {
        bestSuccessRate = successRate;
        bestCard = card;
      }
    });

    return bestCard;
  }

  /**
   * Get statistics about current hypotheses
   */
  getStats(): {
    totalRules: number;
    consistentRules: number;
    observations: number;
    mostLikelyRule: string | null;
    topHypotheses: Array<{ name: string; score: number }>;
  } {
    const consistent = this.getConsistentHypotheses();

    return {
      totalRules: RULE_BANK.length,
      consistentRules: consistent.length,
      observations: this.observations.length,
      mostLikelyRule: consistent.length > 0 ? consistent[0].name : null,
      topHypotheses: consistent.slice(0, 5).map(h => ({
        name: h.name,
        score: this.hypotheses.get(h.name)!.score,
      })),
    };
  }

  /**
   * Reset the engine to initial state
   */
  reset(): void {
    this.observations = [];
    this.hypotheses.clear();

    RULE_BANK.forEach(rule => {
      this.hypotheses.set(rule.name, {
        rule,
        consistent: true,
        score: 0,
      });
    });
  }
}
