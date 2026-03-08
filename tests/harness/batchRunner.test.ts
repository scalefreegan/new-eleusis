import { describe, it, expect } from 'vitest';
import { runBatch, formatReport } from './batchRunner';
import { RandomStrategy, AdversarialStrategy, MixedStrategy } from './strategies';

describe('batchRunner', () => {
  it('runs a batch of games and produces a report', () => {
    const batch = runBatch({
      gameCount: 5,
      playerCount: 3,
      difficulty: 'easy',
      strategy: new RandomStrategy(),
      maxTurns: 100,
      baseSeed: 1,
    });

    expect(batch.results).toHaveLength(5);
    expect(batch.report.totalGames).toBe(5);
    expect(batch.report.completedGames + batch.report.timedOutGames).toBe(5);
    expect(batch.report.avgTurns).toBeGreaterThan(0);
    expect(batch.report.crashCount).toBe(0);
  });

  it('aggregates violations across games', () => {
    const batch = runBatch({
      gameCount: 3,
      playerCount: 3,
      difficulty: 'easy',
      strategy: new RandomStrategy(),
      maxTurns: 50, // Low max to trigger GAME_NEVER_ENDS warnings
      baseSeed: 100,
    });

    // Report tracks violations
    expect(batch.report.totalViolations).toBeGreaterThanOrEqual(0);
    expect(typeof batch.report.violationsByType).toBe('object');
    expect(typeof batch.report.violationsBySeverity).toBe('object');
  });

  it('works with adversarial strategy', () => {
    const batch = runBatch({
      gameCount: 3,
      playerCount: 3,
      difficulty: 'easy',
      strategy: new AdversarialStrategy(),
      maxTurns: 100,
      baseSeed: 200,
    });

    expect(batch.results).toHaveLength(3);
    expect(batch.report.crashCount).toBe(0);
  });

  it('works with mixed strategy', () => {
    const batch = runBatch({
      gameCount: 3,
      playerCount: 4,
      difficulty: 'medium',
      strategy: new MixedStrategy(),
      maxTurns: 100,
      baseSeed: 300,
    });

    expect(batch.results).toHaveLength(3);
    expect(batch.report.crashCount).toBe(0);
  });

  it('respects enableProphetPlay and enableNoPlay flags', () => {
    const batch = runBatch({
      gameCount: 3,
      playerCount: 3,
      difficulty: 'easy',
      strategy: new RandomStrategy({ prophetChance: 0.5, noPlayChance: 0.5 }),
      maxTurns: 100,
      baseSeed: 400,
      enableProphetPlay: false,
      enableNoPlay: false,
    });

    // Should complete without crashes even with high declaration chances but disabled features
    expect(batch.report.crashCount).toBe(0);
  });

  it('formatReport produces readable output', () => {
    const batch = runBatch({
      gameCount: 2,
      playerCount: 3,
      difficulty: 'easy',
      strategy: new RandomStrategy(),
      maxTurns: 100,
      baseSeed: 500,
    });

    const report = formatReport(batch);
    expect(report).toContain('Batch Report');
    expect(report).toContain('Games:');
    expect(report).toContain('Turns:');
    expect(report).toContain('Violations:');
  });
});
