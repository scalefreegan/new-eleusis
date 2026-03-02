/**
 * Hook that indicates the rule compiler is available.
 *
 * With the local LLM backend (Transformers.js WASM), the compiler works
 * everywhere — browser, production builds, and Capacitor WebView.
 * The cloud backend (Claude CLI dev server) is now a user-selectable option
 * rather than a prerequisite.
 *
 * Always returns available: true immediately.
 */

export interface UseRuleCompilerAvailableResult {
  available: boolean;
  loading: boolean;
}

export function useRuleCompilerAvailable(): UseRuleCompilerAvailableResult {
  return { available: true, loading: false };
}
