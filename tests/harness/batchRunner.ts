import { GameSimulator } from './GameSimulator';
import type { SimulatorConfig, GameResult, PlayerStrategy } from './types';

export interface BatchConfig {
  /** Number of games to run */
  gameCount: number;
  /** Player count per game */
  playerCount: number;
  /** Difficulty for AI dealer rules */
  difficulty: 'easy' | 'medium' | 'hard';
  /** Strategy to use for all players */
  strategy: PlayerStrategy;
  /** Max turns per game before forced end */
  maxTurns: number;
  /** Starting seed (each game increments by 1) */
  baseSeed: number;
  /** Enable prophet declarations */
  enableProphetPlay?: boolean;
  /** Enable no-play declarations */
  enableNoPlay?: boolean;
  /** Optional rule name (overrides random selection) */
  ruleName?: string;
}

export interface BatchResult {
  config: BatchConfig;
  results: GameResult[];
  report: BatchReport;
}

export interface BatchReport {
  totalGames: number;
  completedGames: number;
  timedOutGames: number;
  totalViolations: number;
  violationsByType: Record<string, number>;
  violationsBySeverity: Record<string, number>;
  avgTurns: number;
  minTurns: number;
  maxTurns: number;
  crashCount: number;
}

/**
 * Runs a batch of game simulations and aggregates results.
 */
export function runBatch(config: BatchConfig): BatchResult {
  const results: GameResult[] = [];

  for (let i = 0; i < config.gameCount; i++) {
    const simConfig: SimulatorConfig = {
      playerCount: config.playerCount,
      difficulty: config.difficulty,
      ruleName: config.ruleName ?? `batch-${config.difficulty}`,
      seed: config.baseSeed + i,
      strategy: config.strategy,
      maxTurns: config.maxTurns,
      enableProphetPlay: config.enableProphetPlay ?? true,
      enableNoPlay: config.enableNoPlay ?? true,
    };

    try {
      const sim = new GameSimulator(simConfig);
      const result = sim.runFullGame();
      results.push(result);
    } catch {
      // Game crashed — record it as a result with CRASH violation
      results.push({
        completed: false,
        turns: 0,
        finalScores: {},
        violations: [{
          type: 'CRASH',
          severity: 'critical',
          message: 'Game crashed during simulation',
          turnNumber: 0,
          action: { type: 'INIT_GAME', godId: 'god', playerIds: [] },
        }],
        ruleName: config.ruleName ?? 'unknown',
        playerCount: config.playerCount,
      });
    }
  }

  return {
    config,
    results,
    report: generateReport(config, results),
  };
}

function generateReport(config: BatchConfig, results: GameResult[]): BatchReport {
  const completedGames = results.filter(r => r.completed).length;
  const timedOutGames = results.filter(r => !r.completed).length;

  const allViolations = results.flatMap(r => r.violations);
  const violationsByType: Record<string, number> = {};
  const violationsBySeverity: Record<string, number> = {};

  for (const v of allViolations) {
    violationsByType[v.type] = (violationsByType[v.type] ?? 0) + 1;
    violationsBySeverity[v.severity] = (violationsBySeverity[v.severity] ?? 0) + 1;
  }

  const turns = results.map(r => r.turns);
  const totalTurns = turns.reduce((sum, t) => sum + t, 0);

  return {
    totalGames: config.gameCount,
    completedGames,
    timedOutGames,
    totalViolations: allViolations.length,
    violationsByType,
    violationsBySeverity,
    avgTurns: turns.length > 0 ? totalTurns / turns.length : 0,
    minTurns: turns.length > 0 ? Math.min(...turns) : 0,
    maxTurns: turns.length > 0 ? Math.max(...turns) : 0,
    crashCount: allViolations.filter(v => v.type === 'CRASH').length,
  };
}

/**
 * Formats a batch report as a readable string.
 */
export function formatReport(batch: BatchResult): string {
  const r = batch.report;
  const lines: string[] = [
    `=== Batch Report ===`,
    `Games: ${r.totalGames} (${r.completedGames} completed, ${r.timedOutGames} timed out)`,
    `Turns: avg=${r.avgTurns.toFixed(1)}, min=${r.minTurns}, max=${r.maxTurns}`,
    `Violations: ${r.totalViolations} total, ${r.crashCount} crashes`,
  ];

  if (Object.keys(r.violationsByType).length > 0) {
    lines.push(`By type: ${Object.entries(r.violationsByType).map(([t, c]) => `${t}=${c}`).join(', ')}`);
  }

  if (Object.keys(r.violationsBySeverity).length > 0) {
    lines.push(`By severity: ${Object.entries(r.violationsBySeverity).map(([s, c]) => `${s}=${c}`).join(', ')}`);
  }

  return lines.join('\n');
}
