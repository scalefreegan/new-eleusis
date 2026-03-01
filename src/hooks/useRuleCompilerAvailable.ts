/**
 * Hook that detects whether the Vite dev server's rule compiler endpoint is available.
 * Returns false on Android/production where the endpoint doesn't exist.
 */

import { useState, useEffect } from 'react';
import { isCompilerAvailable } from '../services/ruleCompiler';

interface UseRuleCompilerAvailableResult {
  available: boolean;
  loading: boolean;
}

let cachedAvailable: boolean | null = null;

export function useRuleCompilerAvailable(): UseRuleCompilerAvailableResult {
  const [available, setAvailable] = useState<boolean>(cachedAvailable ?? false);
  const [loading, setLoading] = useState<boolean>(cachedAvailable === null);

  useEffect(() => {
    if (cachedAvailable !== null) {
      setAvailable(cachedAvailable);
      setLoading(false);
      return;
    }

    let cancelled = false;

    isCompilerAvailable().then((result) => {
      if (!cancelled) {
        cachedAvailable = result;
        setAvailable(result);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { available, loading };
}
