/**
 * AI Dealer implementation
 */

import type { Card } from '../types';
import { getRandomRule, getRuleByName, getRandomRuleByDifficulty, type Rule, type Difficulty } from './rules';

export interface DealerOptions {
  ruleName?: string;
  difficulty?: Difficulty;
}

/**
 * AI Dealer that selects and enforces a rule
 */
export class AIDealer {
  private rule: Rule;

  constructor(options?: string | DealerOptions) {
    if (typeof options === 'string') {
      // Legacy: ruleName as string
      const namedRule = getRuleByName(options);
      this.rule = namedRule || getRandomRule();
    } else if (options?.ruleName) {
      const namedRule = getRuleByName(options.ruleName);
      this.rule = namedRule || getRandomRule();
    } else if (options?.difficulty) {
      this.rule = getRandomRuleByDifficulty(options.difficulty);
    } else {
      this.rule = getRandomRule();
    }
  }

  /**
   * Get the selected rule name
   */
  getRuleName(): string {
    return this.rule.name;
  }

  /**
   * Get the rule description
   */
  getRuleDescription(): string {
    return this.rule.description;
  }

  /**
   * Get the rule difficulty
   */
  getRuleDifficulty(): Difficulty {
    return this.rule.difficulty;
  }

  /**
   * Judge if a card can be played after the last card
   */
  judgeCard(lastCard: Card, newCard: Card): boolean {
    return this.rule.judge(lastCard, newCard);
  }

  /**
   * Get the rule function for use in game state
   */
  getRuleFunction(): (lastCard: Card, newCard: Card) => boolean {
    return this.rule.judge;
  }
}

/**
 * Create a new AI dealer with optional rule name or options
 */
export function createAIDealer(options?: string | DealerOptions): AIDealer {
  return new AIDealer(options);
}
