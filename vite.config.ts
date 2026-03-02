import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ruleCompilerPlugin } from './server/ruleCompilerPlugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), ruleCompilerPlugin()],
  base: './',
  optimizeDeps: {
    // @huggingface/transformers ships pre-built ONNX/WASM bundles.
    // Excluding it from Vite's dep pre-bundler prevents extremely slow
    // startup during `npm test` and `npm run dev`.
    exclude: ['@huggingface/transformers'],
    // Don't scan Capacitor's pre-built assets for dependencies
    entries: ['index.html', 'src/**/*.{ts,tsx}'],
  },
})
