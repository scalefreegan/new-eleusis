/**
 * Client-side rule compiler service.
 *
 * Two backends:
 *  - 'cloud'  — Calls the Vite dev server's /api/compile-rule endpoint (Claude CLI)
 *  - 'local'  — Runs Qwen2.5-Coder-1.5B-Instruct locally via Transformers.js WASM
 *
 * Backend preference is persisted in localStorage under 'ruleCompilerBackend'.
 * Defaults to 'local' when the cloud endpoint is unavailable (production/Android).
 */

import * as acorn from 'acorn';
import * as acornWalk from 'acorn-walk';
import { getRankValue, getSuitColor, isFaceCard, isEvenRank } from '../engine/deck';
import type { Card } from '../engine/types';
import { createLCG, randomCard } from './cardSampling';
// llmBackend, compilerPromptLocal, generateExamples are lazy-imported inside
// compileRuleLocal() so that the heavy @huggingface/transformers package is
// never loaded during tests or in code paths that only use the cloud backend.
import type { DownloadProgress } from './llmBackend';

// ────────────────────────────────────────────
// Compiler error types
// ────────────────────────────────────────────

export type CompilerErrorCategory =
  | 'model_download'   // Model download/load failed
  | 'model_output'     // LLM produced invalid output (JSON parse failure)
  | 'validation'       // Generated code failed AST security validation
  | 'stress_test'      // Generated code throws or returns non-boolean
  | 'unknown';         // Uncategorized error

export class CompilerError extends Error {
  category: CompilerErrorCategory;
  rawOutput?: string;

  constructor(category: CompilerErrorCategory, message: string, rawOutput?: string) {
    super(message);
    this.name = 'CompilerError';
    this.category = category;
    this.rawOutput = rawOutput;
  }
}

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export interface CardExample {
  lastCard: Card;
  newCard: Card;
  expected: boolean;
  explanation: string;
}

export interface CompileResult {
  functionBody: string;
  examples: CardExample[];
  ambiguities: string[];
}

export type CompilerBackend = 'cloud' | 'local';

const BACKEND_STORAGE_KEY = 'ruleCompilerBackend';

export function getPreferredBackend(): CompilerBackend {
  try {
    const stored = localStorage.getItem(BACKEND_STORAGE_KEY);
    if (stored === 'cloud' || stored === 'local') return stored;
  } catch {
    // localStorage unavailable
  }
  return 'local';
}

export function setPreferredBackend(backend: CompilerBackend): void {
  try {
    localStorage.setItem(BACKEND_STORAGE_KEY, backend);
  } catch {
    // localStorage unavailable
  }
}

export interface LocalCompileOptions {
  /** Called during model download with progress info */
  onProgress?: (progress: DownloadProgress) => void;
  /** Whether to prefer WebGPU acceleration when available */
  preferWebGPU?: boolean;
  /** If provided, aborting this signal cancels the download/compile */
  signal?: AbortSignal;
}

export interface CompiledRule {
  fn: (lastCard: Card, newCard: Card) => boolean;
  examples: CardExample[];
  ambiguities: string[];
  functionBody: string;
}

export interface TestResult {
  passed: boolean;
  failures: Array<{ lastCard: Card; newCard: Card; expected: boolean; actual: boolean; explanation: string }>;
}

// ────────────────────────────────────────────
// Helpers injected into sandboxed functions
// ────────────────────────────────────────────

const HELPERS = {
  getRankValue,
  getSuitColor,
  isFaceCard,
  isEvenRank,
};

// ────────────────────────────────────────────
// Security: AST-based validation
// ────────────────────────────────────────────

/** Identifiers that must never appear as free references in the function body. */
const FORBIDDEN_GLOBALS = new Set([
  'eval', 'Function', 'fetch', 'window', 'document', 'globalThis',
  'process', 'XMLHttpRequest', 'WebSocket', 'setTimeout', 'setInterval',
  'clearTimeout', 'clearInterval', 'localStorage', 'sessionStorage',
  'IndexedDB', 'navigator', 'performance', 'crypto', 'atob', 'btoa',
  'Blob', 'Worker', 'SharedArrayBuffer', 'importScripts',
  'require', 'Proxy', 'Reflect',
]);

/** Property names that must never be accessed (dot or bracket). */
const FORBIDDEN_PROPERTIES = new Set([
  '__proto__', 'prototype', 'constructor',
]);

/** Allowed top-level identifiers (function params + injected helpers). */
const ALLOWED_REFS = new Set([
  'lastCard', 'newCard', 'helpers',
  // Standard safe globals needed for card logic
  'Math', 'Array', 'String', 'Number', 'Boolean', 'parseInt', 'parseFloat',
  'isNaN', 'isFinite', 'undefined', 'NaN', 'Infinity', 'JSON',
  'Object',
  'true', 'false', 'null',
]);

export function validateFunctionBody(body: string): { valid: boolean; error?: string } {
  if (typeof body !== 'string' || body.trim().length === 0) {
    return { valid: false, error: 'Function body is empty' };
  }
  if (!body.includes('return')) {
    return { valid: false, error: 'Function body must contain a return statement' };
  }

  // Parse as a function body by wrapping in an async function (never executed)
  let ast: acorn.Node;
  try {
    ast = acorn.parse(
      `(function(lastCard, newCard, helpers) { 'use strict';\n${body}\n})`,
      { ecmaVersion: 2022, sourceType: 'script' }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { valid: false, error: `Parse error: ${msg}` };
  }

  // Collect locally declared variable names so we don't flag them as forbidden globals
  const declaredLocals = new Set<string>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const asAny = (node: acorn.Node) => node as any;

  // First pass: collect all locally declared identifiers
  acornWalk.simple(ast, {
    VariableDeclarator(node: acorn.Node) {
      const n = asAny(node);
      if (n.id?.type === 'Identifier') {
        declaredLocals.add(n.id.name);
      }
    },
    FunctionDeclaration(node: acorn.Node) {
      const n = asAny(node);
      if (n.id?.type === 'Identifier') {
        declaredLocals.add(n.id.name);
      }
      for (const param of n.params ?? []) {
        if (param.type === 'Identifier') declaredLocals.add(param.name);
      }
    },
    FunctionExpression(node: acorn.Node) {
      const n = asAny(node);
      for (const param of n.params ?? []) {
        if (param.type === 'Identifier') declaredLocals.add(param.name);
      }
    },
    ArrowFunctionExpression(node: acorn.Node) {
      const n = asAny(node);
      for (const param of n.params ?? []) {
        if (param.type === 'Identifier') declaredLocals.add(param.name);
      }
    },
  });

  let error: string | undefined;

  acornWalk.simple(ast, {
    // Block `this` expressions
    ThisExpression(_node: acorn.Node) {
      if (!error) error = 'Forbidden: this expression';
    },

    // Block import expressions: import('...')
    ImportExpression(_node: acorn.Node) {
      if (!error) error = 'Forbidden: dynamic import()';
    },

    // Check all identifier references
    Identifier(node: acorn.Node) {
      if (error) return;
      const n = asAny(node);
      const name: string = n.name;
      if (FORBIDDEN_GLOBALS.has(name) && !declaredLocals.has(name)) {
        error = `Forbidden global reference: ${name}`;
      }
    },

    // Check property access (both dot and bracket notation)
    MemberExpression(node: acorn.Node) {
      if (error) return;
      const n = asAny(node);

      // Dot access: obj.constructor
      if (!n.computed && n.property?.type === 'Identifier') {
        if (FORBIDDEN_PROPERTIES.has(n.property.name)) {
          error = `Forbidden property access: .${n.property.name}`;
        }
      }

      // Bracket access with string literal: obj['constructor']
      if (n.computed && n.property?.type === 'Literal' && typeof n.property.value === 'string') {
        if (FORBIDDEN_PROPERTIES.has(n.property.value)) {
          error = `Forbidden property access: ['${n.property.value}']`;
        }
      }

      // Bracket access with template literal: obj[`constructor`]
      if (n.computed && n.property?.type === 'TemplateLiteral') {
        // Only allow template literals with no expressions (pure string)
        if (n.property.expressions.length === 0 && n.property.quasis.length === 1) {
          const val = n.property.quasis[0].value.cooked;
          if (typeof val === 'string' && FORBIDDEN_PROPERTIES.has(val)) {
            error = `Forbidden property access: [\`${val}\`]`;
          }
        }
        // Template literals with expressions in bracket access are blocked
        // since they could construct forbidden property names at runtime
        if (n.property.expressions.length > 0) {
          error = 'Forbidden: computed property access with template expression';
        }
      }

      // Bracket access with any non-trivial expression (binary ops, calls, etc.)
      // that could construct a forbidden property name at runtime.
      // Allow: literal numbers, literal strings (checked above), identifiers (for array indexing)
      if (n.computed && n.property) {
        const ptype = n.property.type;
        const safeTypes = new Set(['Literal', 'Identifier', 'UnaryExpression']);
        if (!safeTypes.has(ptype)) {
          error = `Forbidden: computed property access with ${ptype}`;
        }
      }
    },

    // Block Object.assign, Object.defineProperty, etc.
    CallExpression(node: acorn.Node) {
      if (error) return;
      const n = asAny(node);
      if (
        n.callee?.type === 'MemberExpression' &&
        !n.callee.computed &&
        n.callee.object?.type === 'Identifier' &&
        n.callee.object.name === 'Object' &&
        n.callee.property?.type === 'Identifier'
      ) {
        const method = n.callee.property.name;
        const forbidden = new Set([
          'assign', 'defineProperty', 'defineProperties',
          'setPrototypeOf', 'getPrototypeOf', 'create',
          'getOwnPropertyDescriptor', 'getOwnPropertyDescriptors',
        ]);
        if (forbidden.has(method)) {
          error = `Forbidden: Object.${method}()`;
        }
      }
    },
  });

  if (error) {
    return { valid: false, error };
  }
  return { valid: true };
}

// ────────────────────────────────────────────
// Sandboxed function creation
// ────────────────────────────────────────────

export function createSandboxedFunction(
  body: string
): (lastCard: Card, newCard: Card) => boolean {
  // eslint-disable-next-line no-new-func
  const fn = new Function('lastCard', 'newCard', 'helpers', `'use strict';\n${body}`) as (
    lastCard: Card,
    newCard: Card,
    helpers: typeof HELPERS
  ) => boolean;

  return (lastCard: Card, newCard: Card) => {
    const result = fn(lastCard, newCard, HELPERS);
    return Boolean(result);
  };
}

// ────────────────────────────────────────────
// Testing
// ────────────────────────────────────────────

export function testCompiledFunction(
  fn: (lastCard: Card, newCard: Card) => boolean,
  examples: CardExample[]
): TestResult {
  const failures: TestResult['failures'] = [];

  for (const ex of examples) {
    const actual = fn(ex.lastCard, ex.newCard);
    if (actual !== ex.expected) {
      failures.push({
        lastCard: ex.lastCard,
        newCard: ex.newCard,
        expected: ex.expected,
        actual,
        explanation: ex.explanation,
      });
    }
  }

  return { passed: failures.length === 0, failures };
}

/** Stress-test with 200 random pairs using a seeded PRNG */
export function stressTestFunction(fn: (lastCard: Card, newCard: Card) => boolean): boolean {
  const rng = createLCG(42);

  for (let i = 0; i < 200; i++) {
    const last = randomCard(rng);
    const next = randomCard(rng);
    try {
      const result = fn(last, next);
      if (typeof result !== 'boolean') return false;
    } catch (err) {
      console.error('[ruleCompiler] stressTest: function threw on iteration', i, err);
      return false;
    }
  }
  return true;
}

/** Validate a function body, create a sandboxed function, and stress-test it. */
function validateAndCreateFunction(functionBody: string): (lastCard: Card, newCard: Card) => boolean {
  const validation = validateFunctionBody(functionBody);
  if (!validation.valid) {
    throw new Error(`Security validation failed: ${validation.error}`);
  }

  const fn = createSandboxedFunction(functionBody);

  const stable = stressTestFunction(fn);
  if (!stable) {
    throw new Error('Compiled function failed stability test (throws or returns non-boolean)');
  }

  return fn;
}

// ────────────────────────────────────────────
// Configurable backend URL
// ────────────────────────────────────────────

function getCompilerBaseUrl(): string {
  // VITE_COMPILER_URL env var for production builds pointing to standalone server.
  // Falls back to relative URL for Vite dev server.
  return import.meta.env.VITE_COMPILER_URL || '';
}

// ────────────────────────────────────────────
// Availability check (cloud endpoint)
// ────────────────────────────────────────────

export async function isCloudCompilerAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${getCompilerBaseUrl()}/api/compile-rule/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ────────────────────────────────────────────
// Cloud compile (Claude CLI via dev server)
// ────────────────────────────────────────────

async function compileRuleCloud(
  ruleText: string,
  clarifications?: string
): Promise<CompiledRule> {
  // Server kills the claude CLI subprocess at 60s (CLAUDE_CLI_TIMEOUT_MS in
  // ruleCompilerPlugin.ts). Allow 5s extra for HTTP round-trip overhead.
  const res = await fetch(`${getCompilerBaseUrl()}/api/compile-rule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ruleText, clarifications }),
    signal: AbortSignal.timeout(65_000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error: string };
    throw new Error(`Compile failed: ${err.error || res.statusText}`);
  }

  const data = await res.json() as CompileResult;
  const fn = validateAndCreateFunction(data.functionBody);

  return {
    fn,
    examples: data.examples,
    ambiguities: data.ambiguities ?? [],
    functionBody: data.functionBody,
  };
}

// ────────────────────────────────────────────
// Local compile (Transformers.js WASM)
// ────────────────────────────────────────────

/** Local JSON response shape — no examples (generated programmatically) */
interface LocalCompileResult {
  functionBody: string;
  ambiguities?: string[];
}

const MAX_RETRIES = 3;

export async function compileRuleLocal(
  ruleText: string,
  clarifications?: string,
  opts: LocalCompileOptions = {}
): Promise<CompiledRule> {
  console.log(`[ruleCompiler] Starting local compile for: "${ruleText.slice(0, 80)}"`);

  // Lazy-load the LLM-specific modules so @huggingface/transformers is never
  // imported in tests or in the cloud-backend code path.
  const [{ getLLMBackend, extractJsonFromOutput }, { buildLocalCompilerPrompt, buildRetryPrompt }, { generateExamples }] =
    await Promise.all([
      import('./llmBackend'),
      import('./compilerPromptLocal'),
      import('./generateExamples'),
    ]);

  let backend;
  try {
    backend = await getLLMBackend({
      onProgress: opts.onProgress,
      preferWebGPU: opts.preferWebGPU ?? false,
      signal: opts.signal,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ruleCompiler] Backend failed to load:', msg);
    throw new CompilerError('model_download', `Model failed to load: ${msg}`);
  }
  console.log('[ruleCompiler] Backend ready');

  let lastError: CompilerError | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Don't retry if user cancelled
    if (opts.signal?.aborted) {
      throw opts.signal.reason ?? new DOMException('Compilation cancelled', 'AbortError');
    }

    const prompt = attempt === 0
      ? buildLocalCompilerPrompt(ruleText, clarifications)
      : buildRetryPrompt(ruleText, lastError?.message ?? 'Unknown error', clarifications);

    opts.onProgress?.({
      progress: -1,
      status: attempt === 0 ? 'Generating rule function…' : `Retrying (attempt ${attempt + 1}/${MAX_RETRIES})…`,
      total: 0, loaded: 0,
    });

    try {
      let rawOutput: string;
      try {
        rawOutput = await backend.generate(prompt);
      } catch (err) {
        // Don't retry AbortError
        if (err instanceof Error && err.name === 'AbortError') throw err;
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[ruleCompiler] Generation failed:', msg);
        throw new CompilerError('model_output', `Model generation failed: ${msg}`);
      }
      console.log(`[ruleCompiler] Attempt ${attempt + 1}: raw output (${rawOutput.length} chars): "${rawOutput.slice(0, 300)}"`);

      const parsed = extractJsonFromOutput(rawOutput) as LocalCompileResult | null;

      if (!parsed || typeof parsed.functionBody !== 'string') {
        console.error(`[ruleCompiler] Attempt ${attempt + 1}: JSON extraction failed`);
        throw new CompilerError(
          'model_output',
          'AI produced output that could not be parsed as a valid rule function.',
          rawOutput.slice(0, 500),
        );
      }
      console.log(`[ruleCompiler] Attempt ${attempt + 1}: JSON extraction success`);

      const validation = validateFunctionBody(parsed.functionBody);
      if (!validation.valid) {
        console.error(`[ruleCompiler] Attempt ${attempt + 1}: AST validation failed: ${validation.error}`);
        throw new CompilerError(
          'validation',
          `Generated code failed security check: ${validation.error}`,
          parsed.functionBody,
        );
      }
      console.log(`[ruleCompiler] Attempt ${attempt + 1}: AST validation passed`);

      const fn = createSandboxedFunction(parsed.functionBody);

      const stable = stressTestFunction(fn);
      if (!stable) {
        console.error(`[ruleCompiler] Attempt ${attempt + 1}: stress test failed`);
        throw new CompilerError(
          'stress_test',
          'Generated code is unstable — it throws errors or returns non-boolean values on random card pairs.',
          parsed.functionBody,
        );
      }
      console.log(`[ruleCompiler] Attempt ${attempt + 1}: stress test passed`);

      // Success!
      opts.onProgress?.({ progress: -1, status: 'Generating examples…', total: 0, loaded: 0 });
      const examples = generateExamples(fn, 10);

      console.log(`[ruleCompiler] Compile complete (attempt ${attempt + 1})`);
      return {
        fn,
        examples,
        ambiguities: parsed.ambiguities ?? [],
        functionBody: parsed.functionBody,
      };

    } catch (err) {
      // Don't retry AbortError
      if ((err instanceof Error && err.name === 'AbortError') || opts.signal?.aborted) throw err;

      lastError = err instanceof CompilerError
        ? err
        : new CompilerError('unknown', err instanceof Error ? err.message : String(err));

      console.warn(`[ruleCompiler] Attempt ${attempt + 1}/${MAX_RETRIES} failed: ${lastError.message}`);

      if (attempt === MAX_RETRIES - 1) {
        throw lastError;
      }
    }
  }

  // Unreachable, but satisfies TypeScript
  throw lastError ?? new CompilerError('unknown', 'All compilation attempts failed');
}

// ────────────────────────────────────────────
// Main compile function (routes by backend)
// ────────────────────────────────────────────

export async function compileRule(
  ruleText: string,
  clarifications?: string,
  opts: LocalCompileOptions & { backend?: CompilerBackend } = {}
): Promise<CompiledRule> {
  const backend = opts.backend ?? getPreferredBackend();

  if (backend === 'local') {
    return compileRuleLocal(ruleText, clarifications, opts);
  }

  return compileRuleCloud(ruleText, clarifications);
}
