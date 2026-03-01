import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ruleCompilerPlugin } from './server/ruleCompilerPlugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), ruleCompilerPlugin()],
  base: './',
})
