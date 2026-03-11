/**
 * Shared request handler for the rule compiler API.
 * Used by both the Vite dev server plugin and the standalone server.
 */

import { spawn } from 'child_process';
import type { IncomingMessage, ServerResponse } from 'http';
import { buildCompilerPrompt } from './compilerPrompt';
import { extractJson as extractJsonShared } from '../src/services/extractJson';

interface CompileRequest {
  ruleText: string;
  clarifications?: string;
}

interface CardExample {
  lastCard: { rank: string; suit: string; id: string };
  newCard: { rank: string; suit: string; id: string };
  expected: boolean;
  explanation: string;
}

interface CompileResponse {
  functionBody: string;
  examples: CardExample[];
  ambiguities: string[];
}

/** Extract JSON from text, throwing on failure (server needs errors, not null) */
function extractJson(text: string): unknown {
  const result = extractJsonShared(text);
  if (result === null) {
    throw new Error(`Could not extract JSON. Raw (500 chars): ${text.slice(0, 500)}`);
  }
  return result;
}

/** Timeout for the claude CLI subprocess (ms). Client timeout must be >= this. */
export const CLAUDE_CLI_TIMEOUT_MS = 60_000;

/** Run `claude -p <prompt> --output-format json --max-turns 1` */
export function runClaudeCli(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'claude',
      ['-p', prompt, '--output-format', 'json', '--max-turns', '1'],
      { shell: false }
    );

    let stdout = '';
    let stderr = '';
    let settled = false;
    let killTimer: ReturnType<typeof setTimeout> | undefined;

    const settle = (fn: typeof resolve | typeof reject, value: string | Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      if (killTimer) clearTimeout(killTimer);
      (fn as (v: string | Error) => void)(value);
    };

    const timeoutId = setTimeout(() => {
      proc.kill('SIGTERM');
      // Escalate to SIGKILL after 5s grace period
      killTimer = setTimeout(() => proc.kill('SIGKILL'), 5000);
      settle(reject, new Error(`claude CLI timed out after ${CLAUDE_CLI_TIMEOUT_MS / 1000}s`));
    }, CLAUDE_CLI_TIMEOUT_MS);

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        settle(reject, new Error(`claude exited with code ${code}: ${stderr.slice(0, 500)}`));
        return;
      }
      settle(resolve, stdout);
    });

    proc.on('error', (err) => {
      settle(reject, new Error(`Failed to spawn claude: ${err.message}`));
    });
  });
}

/** Read the raw body from an HTTP request as a string */
export function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    let settled = false;
    const MAX_BYTES = 10 * 1024; // 10KB
    req.on('data', (chunk: Buffer) => {
      if (settled) return;
      body += chunk.toString();
      if (Buffer.byteLength(body) > MAX_BYTES) {
        settled = true;
        req.destroy(new Error('Request body too large (max 10KB)'));
        reject(new Error('Request body too large (max 10KB)'));
      }
    });
    req.on('end', () => { if (!settled) { settled = true; resolve(body); } });
    req.on('error', (err) => { if (!settled) { settled = true; reject(err); } });
  });
}

export function sendJson(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

/** Handle POST /api/compile-rule */
export async function handleCompileRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const rawBody = await readRequestBody(req);
    const { ruleText, clarifications } = JSON.parse(rawBody) as CompileRequest;

    if (!ruleText || typeof ruleText !== 'string' || ruleText.trim().length === 0) {
      sendJson(res, 400, { error: 'ruleText is required' });
      return;
    }

    const prompt = buildCompilerPrompt(ruleText.trim(), clarifications);

    console.log('[rule-compiler] Invoking claude CLI for rule:', ruleText.slice(0, 80));

    const rawOutput = await runClaudeCli(prompt);

    // Parse the outer claude -p JSON wrapper: {"type":"result","result":"...","...":"..."}
    let agentText: string;
    try {
      const wrapper = JSON.parse(rawOutput) as Record<string, unknown>;
      if (wrapper.is_error === true) {
        throw new Error(`Claude CLI returned an error: ${wrapper.result ?? wrapper.error ?? rawOutput.slice(0, 500)}`);
      }
      agentText = typeof wrapper.result === 'string' ? wrapper.result : rawOutput;
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Claude CLI')) throw e;
      agentText = rawOutput;
    }

    const compiled = extractJson(agentText) as CompileResponse;

    // Validate required fields
    if (typeof compiled.functionBody !== 'string') {
      throw new Error('Compiled output missing functionBody');
    }
    if (!Array.isArray(compiled.examples)) {
      throw new Error('Compiled output missing examples array');
    }

    console.log('[rule-compiler] Compiled successfully, examples:', compiled.examples.length);

    sendJson(res, 200, compiled);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[rule-compiler] Error:', message);
    sendJson(res, 500, { error: message });
  }
}

/** Handle GET /api/compile-rule/health */
export function handleHealthCheck(_req: IncomingMessage, res: ServerResponse): void {
  sendJson(res, 200, { ok: true });
}
