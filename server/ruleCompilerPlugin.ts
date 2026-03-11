/**
 * Vite plugin that adds the /api/compile-rule endpoint.
 * Delegates to shared handler logic in handler.ts.
 * Only active during `npm run dev` (Vite dev server). Not included in production builds.
 */

import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { handleCompileRequest, handleHealthCheck } from './handler';

export { CLAUDE_CLI_TIMEOUT_MS } from './handler';

export function ruleCompilerPlugin(): Plugin {
  return {
    name: 'rule-compiler',
    configureServer(server) {
      server.middlewares.use('/api/compile-rule/health', (req: IncomingMessage, res: ServerResponse) => {
        handleHealthCheck(req, res);
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

        await handleCompileRequest(req, res);
      });
    },
  };
}
