#!/usr/bin/env node
/**
 * Pre-downloads the Qwen2.5-Coder-1.5B-Instruct ONNX Q4 model files
 * to the local HuggingFace cache so the browser doesn't need to download
 * ~900MB on first use during development.
 *
 * Usage: npm run download-model
 */

import { pipeline } from '@huggingface/transformers';

const MODEL_ID = 'Qwen/Qwen2.5-Coder-1.5B-Instruct';
const DTYPE = 'q4';

console.log(`Downloading ${MODEL_ID} (${DTYPE})...`);
console.log('This may take several minutes on first run (~900MB).\n');

// Clean exit on Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\nDownload interrupted. Re-run to resume.');
  process.exit(0);
});

try {
  const pipe = await pipeline('text-generation', MODEL_ID, {
    dtype: DTYPE,
    progress_callback: (event) => {
      if (event.status === 'progress') {
        const loaded = event.loaded ?? 0;
        const total = event.total ?? 0;
        const file = event.file ?? event.name ?? '';
        const pct = total > 0 ? ((loaded / total) * 100).toFixed(1) : '?';
        const loadedMB = (loaded / 1_048_576).toFixed(1);
        const totalMB = total > 0 ? (total / 1_048_576).toFixed(1) : '?';
        process.stdout.write(`\r  ${file} ${loadedMB}/${totalMB} MB (${pct}%)    `);
      }
      if (event.status === 'done' && event.file) {
        process.stdout.write(`\r  done ${event.file}                              \n`);
      }
    },
  });

  console.log('\nModel loaded. Running smoke test...');
  const result = await pipe(
    [{ role: 'user', content: 'return true;' }],
    { max_new_tokens: 10, temperature: 0.1, do_sample: false },
  );
  console.log('Smoke test passed');
  console.log('\nModel is cached and ready for use.');
} catch (err) {
  console.error('\nDownload failed:', err.message);
  process.exit(1);
}
