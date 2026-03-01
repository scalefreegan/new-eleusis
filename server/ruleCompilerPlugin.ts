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
  // Direct parse
  try {
    return JSON.parse(text);
  } catch {
    // ignore
  }

  // Fenced code block
  const fenceMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1]);
    } catch {
      // ignore
    }
  }

  // First bare { ... }
  const bracePos = text.indexOf('{');
  if (bracePos !== -1) {
    try {
      return JSON.parse(text.slice(bracePos));
    } catch {
      // ignore
    }
  }

  throw new Error(`Could not extract JSON from output: ${text.slice(0, 300)}`);
}

/** Run `claude -p <prompt> --output-format json --max-turns 1 --dangerously-skip-permissions` */
function runClaudeCli(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'claude',
      ['-p', prompt, '--output-format', 'json', '--max-turns', '1', '--dangerously-skip-permissions'],
      { shell: false }
    );

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`claude exited with code ${code}: ${stderr.slice(0, 500)}`));
        return;
      }
      resolve(stdout);
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn claude: ${err.message}`));
    });
  });
}

/** Parse the JSON body from an HTTP request */
function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
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
            agentText = typeof wrapper.result === 'string' ? wrapper.result : rawOutput;
          } catch {
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
