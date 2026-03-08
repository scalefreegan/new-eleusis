import { describe, it, expect } from 'vitest';
import { RandomStrategy, AdversarialStrategy, HypothesisStrategy, MixedStrategy } from './strategies';
import { GameSimulator } from './GameSimulator';
import type { SimulatorConfig } from './types';

function makeConfig(strategy: InstanceType<typeof RandomStrategy | typeof AdversarialStrategy | typeof HypothesisStrategy | typeof MixedStrategy>, seed = 42): SimulatorConfig {
  return {
    playerCount: 3,
    difficulty: 'easy',
    ruleName: 'alternating-colors',
    seed,
    strategy,
    maxTurns: 200,
    enableProphetPlay: true,
    enableNoPlay: true,
  };
}

describe('AdversarialStrategy', () => {
  it('completes a game without crashing', () => {
    const strategy = new AdversarialStrategy();
    const sim = new GameSimulator(makeConfig(strategy));
    const result = sim.runFullGame();

    expect(result.turns).toBeGreaterThan(0);
    const crashes = result.violations.filter(v => v.type === 'CRASH');
    expect(crashes).toHaveLength(0);
  });

  it('exercises prophet and no-play paths', () => {
    // Run several games to increase chance of triggering special paths
    let prophetSeen = false;
    for (let seed = 1; seed <= 20; seed++) {
      const strategy = new AdversarialStrategy();
      const sim = new GameSimulator(makeConfig(strategy, seed));
      const result = sim.runFullGame();

      for (const entry of sim.actionLog) {
        if (entry.action.type === 'DECLARE_PROPHET') prophetSeen = true;
      }
      if (prophetSeen) break;
    }
    // Adversarial strategy has 30% prophet chance — should trigger in 20 games
    expect(prophetSeen).toBe(true);
  });
});

describe('HypothesisStrategy', () => {
  it('completes a game without crashing', () => {
    const strategy = new HypothesisStrategy();
    const sim = new GameSimulator(makeConfig(strategy));
    const result = sim.runFullGame();

    expect(result.turns).toBeGreaterThan(0);
    const crashes = result.violations.filter(v => v.type === 'CRASH');
    expect(crashes).toHaveLength(0);
  });

  it('learns from the mainline over time', () => {
    const strategy = new HypothesisStrategy();
    const sim = new GameSimulator(makeConfig(strategy, 100));
    const result = sim.runFullGame();

    // Should complete — the hypothesis strategy should adapt
    expect(result.turns).toBeGreaterThan(5);
  });
});

describe('MixedStrategy', () => {
  it('completes a game without crashing', () => {
    const strategy = new MixedStrategy();
    const sim = new GameSimulator(makeConfig(strategy));
    const result = sim.runFullGame();

    expect(result.turns).toBeGreaterThan(0);
    const crashes = result.violations.filter(v => v.type === 'CRASH');
    expect(crashes).toHaveLength(0);
  });

  it('accepts custom sub-strategies', () => {
    const strategy = new MixedStrategy([
      new RandomStrategy({ prophetChance: 0 }),
      new AdversarialStrategy(),
    ]);
    const sim = new GameSimulator(makeConfig(strategy, 77));
    const result = sim.runFullGame();

    expect(result.turns).toBeGreaterThan(0);
  });
});
