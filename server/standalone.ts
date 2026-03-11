/**
 * Standalone HTTP server for the rule compiler API.
 * Use: npm run server
 */

import { createServer } from 'http';
import { handleCompileRequest, handleHealthCheck, sendJson } from './handler';

const PORT = parseInt(process.env.PORT || '3001', 10);

const server = createServer(async (req, res) => {
  // CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url ?? '';

  if (url === '/api/compile-rule/health' || url === '/api/compile-rule/health/') {
    handleHealthCheck(req, res);
  } else if (url === '/api/compile-rule' || url === '/api/compile-rule/') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    await handleCompileRequest(req, res);
  } else {
    sendJson(res, 404, { error: 'Not found' });
  }
});

server.listen(PORT, () => {
  console.log(`[rule-compiler] Standalone server listening on http://localhost:${PORT}`);
  console.log(`[rule-compiler] Health: http://localhost:${PORT}/api/compile-rule/health`);
  console.log(`[rule-compiler] Compile: POST http://localhost:${PORT}/api/compile-rule`);
});

process.on('SIGINT', () => {
  console.log('\n[rule-compiler] Shutting down...');
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
