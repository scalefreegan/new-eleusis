/**
 * Vite plugin that adds the /api/compile-rule endpoint.
 * Spawns `claude -p` to compile natural language rules into JS function bodies.
 * Only active during `npm run dev` (Vite dev server). Not included in production builds.
 */

import type { Plugin } from 'vite';
import { spawn } from 'child_process';
import type { IncomingMessage, ServerResponse } from 'http';
import { buildCompilerPrompt } from './compilerPrompt';

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

/** Extract the first JSON object from a string (handles markdown fences etc.) */
function extractJson(text: string): unknown {
  let directError: unknown;
  let fenceError: unknown;
  let braceError: unknown;

  // Direct parse
  try {
    return JSON.parse(text);
  } catch (e) {
    directError = e;
  }

  // Fenced code block
  const fenceMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1]);
    } catch (e) {
      fenceError = e;
    }
  }

  // First bare { ... } — track brace depth to find the matching close
  const bracePos = text.indexOf('{');
  if (bracePos !== -1) {
    let depth = 0;
    for (let i = bracePos; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(text.slice(bracePos, i + 1));
          } catch (e) {
            braceError = e;
          }
          break;
        }
      }
    }
    if (!braceError) {
      braceError = new Error('No matching closing brace found');
    }
  }

  throw new Error(
    `Could not extract JSON. direct: ${directError}, fence: ${fenceError ?? 'no fence'}, brace: ${braceError ?? 'no brace'}. Raw (500 chars): ${text.slice(0, 500)}`
  );
}

/** Run `claude -p <prompt> --output-format json --max-turns 1` */
function runClaudeCli(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'claude',
      ['-p', prompt, '--output-format', 'json', '--max-turns', '1'],
      { shell: false }
    );

    let stdout = '';
    let stderr = '';

    const timeoutId = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('claude CLI timed out after 60s'));
    }, 60_000);

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timeoutId);
      if (code !== 0) {
        reject(new Error(`claude exited with code ${code}: ${stderr.slice(0, 500)}`));
        return;
      }
      resolve(stdout);
    });

    proc.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to spawn claude: ${err.message}`));
    });
  });
}

/** Read the raw body from an HTTP request as a string */
function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    let settled = false;
    const MAX_BYTES = 10 * 1024; // 10KB
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
      if (!settled && Buffer.byteLength(body) > MAX_BYTES) {
        settled = true;
        req.destroy(new Error('Request body too large (max 10KB)'));
        reject(new Error('Request body too large (max 10KB)'));
      }
    });
    req.on('end', () => { if (!settled) { settled = true; resolve(body); } });
    req.on('error', (err) => { if (!settled) { settled = true; reject(err); } });
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

export function ruleCompilerPlugin(): Plugin {
  return {
    name: 'rule-compiler',
    configureServer(server) {
      server.middlewares.use('/api/compile-rule/health', (_req, res) => {
        sendJson(res, 200, { ok: true });
      });

      server.middlewares.use('/api/compile-rule', async (req: IncomingMessage, res: ServerResponse, next) => {
        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
          res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' });
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          next();
          return;
        }

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
      });
    },
  };
}
