import { describe, it, expect } from 'vitest';
import { GameSimulator } from './GameSimulator';
import { RandomStrategy } from './strategies';
import type { SimulatorConfig } from './types';

function makeConfig(overrides?: Partial<SimulatorConfig>): SimulatorConfig {
  return {
    playerCount: 3,
    seed: 42,
    strategy: new RandomStrategy(),
    maxTurns: 500,
    enableProphetPlay: true,
    enableNoPlay: true,
    ...overrides,
  };
}

describe('GameSimulator', () => {
  it('completes a 3-player game with alternating-colors rule without crash', () => {
    const config = makeConfig({ ruleName: 'alternating-colors' });
    const sim = new GameSimulator(config);
    const result = sim.runFullGame();

    expect(result.ruleName).toBe('alternating-colors');
    expect(result.playerCount).toBe(3);
    expect(result.turns).toBeGreaterThan(0);
    expect(result.finalScores).toBeDefined();
    expect(Object.keys(result.finalScores)).toHaveLength(4); // god + 3 players
  });

  it('completes a 5-player game with a random rule', () => {
    const config = makeConfig({ playerCount: 5, seed: 123 });
    const sim = new GameSimulator(config);
    const result = sim.runFullGame();

    expect(result.playerCount).toBe(5);
    expect(result.turns).toBeGreaterThan(0);
    expect(Object.keys(result.finalScores)).toHaveLength(6); // god + 5 players
  });

  it('has no violations for 10 seeded random games', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const config = makeConfig({
        seed,
        ruleName: 'alternating-colors',
        enableProphetPlay: false,
        enableNoPlay: false,
      });
      const sim = new GameSimulator(config);
      const result = sim.runFullGame();

      const errors = result.violations.filter(v => v.severity === 'error');
      expect(errors).toEqual([]);
    }
  });

  it('produces deterministic results with the same seed', () => {
    const config = makeConfig({ seed: 999, ruleName: 'same-color' });

    const sim1 = new GameSimulator(config);
    const result1 = sim1.runFullGame();

    const sim2 = new GameSimulator(config);
    const result2 = sim2.runFullGame();

    expect(result1.turns).toBe(result2.turns);
    expect(result1.finalScores).toEqual(result2.finalScores);
  });

  it('handles prophet flow without crashing', () => {
    const config = makeConfig({
      seed: 77,
      ruleName: 'same-suit',
      enableProphetPlay: true,
      enableNoPlay: false,
      strategy: new RandomStrategy({ prophetChance: 0.3 }),
    });
    const sim = new GameSimulator(config);
    const result = sim.runFullGame();

    expect(result.turns).toBeGreaterThan(0);
    // No crash violations
    const crashes = result.violations.filter(v => v.type === 'CRASH');
    expect(crashes).toEqual([]);
  });

  it('handles no-play flow without crashing', () => {
    const config = makeConfig({
      seed: 55,
      ruleName: 'only-red',
      enableProphetPlay: false,
      enableNoPlay: true,
      strategy: new RandomStrategy({ noPlayChance: 0.4 }),
    });
    const sim = new GameSimulator(config);
    const result = sim.runFullGame();

    expect(result.turns).toBeGreaterThan(0);
    const crashes = result.violations.filter(v => v.type === 'CRASH');
    expect(crashes).toEqual([]);
  });

  it('logs actions during gameplay', () => {
    const config = makeConfig({ seed: 10, ruleName: 'alternating-colors' });
    const sim = new GameSimulator(config);
    sim.runFullGame();

    expect(sim.actionLog.length).toBeGreaterThan(0);
    // First actions should be INIT_GAME, SET_GOD_RULE, DEAL_CARDS
    expect(sim.actionLog[0].action.type).toBe('INIT_GAME');
    expect(sim.actionLog[1].action.type).toBe('SET_GOD_RULE');
    expect(sim.actionLog[2].action.type).toBe('DEAL_CARDS');
  });
});
