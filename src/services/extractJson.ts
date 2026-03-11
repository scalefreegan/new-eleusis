/**
 * Extracts the first JSON object from a string that may contain
 * markdown fences, preamble text, or other non-JSON content.
 *
 * Shared by ruleCompilerPlugin.ts (server) and llmBackend.ts (client).
 */

/** Attempt lightweight repairs on malformed JSON text */
export function repairJson(text: string): string {
  let repaired = text;

  // Strip markdown fences if present
  repaired = repaired.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '');

  // Convert single-quoted JSON to double-quoted (common LLM output pattern)
  // Only apply when text looks like single-quoted JSON: starts with {' or ['
  if (/^\s*[\[{]\s*'/.test(repaired)) {
    // Replace single quotes acting as JSON delimiters, preserving apostrophes
    // Strategy: replace ' at JSON structural positions (key/value boundaries)
    repaired = repaired
      .replace(/'/g, '"');
  }

  // Remove trailing commas before } or ]
  repaired = repaired.replace(/,\s*([\]}])/g, '$1');

  // Handle truncated output: close unbalanced braces/brackets
  let openBraces = 0, openBrackets = 0;
  let inStr = false, escape = false;
  for (const ch of repaired) {
    if (escape) { escape = false; continue; }
    if (inStr) {
      if (ch === '\\') escape = true;
      else if (ch === '"') inStr = false;
    } else {
      if (ch === '"') inStr = true;
      else if (ch === '{') openBraces++;
      else if (ch === '}') openBraces--;
      else if (ch === '[') openBrackets++;
      else if (ch === ']') openBrackets--;
    }
  }
  if (inStr) repaired += '"';
  while (openBrackets > 0) { repaired += ']'; openBrackets--; }
  while (openBraces > 0) { repaired += '}'; openBraces--; }

  // Clean up trailing commas introduced by brace/bracket closing
  repaired = repaired.replace(/,\s*([\]}])/g, '$1');

  return repaired;
}

/** Extract the first JSON object from a string (strips markdown fences, preamble) */
export function extractJson(text: string): unknown {
  // Direct parse
  try { return JSON.parse(text); } catch { /* fall through */ }

  // Fenced code block ```json ... ```
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1]); } catch { /* fall through */ }
  }

  // First bare { ... }
  const start = text.indexOf('{');
  if (start !== -1) {
    // Walk forward tracking brace depth, skipping braces inside string literals
    let depth = 0;
    let inString = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (ch === '\\') {
          i++; // skip escaped character
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }
      if (ch === '"') {
        inString = true;
      } else if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(text.slice(start, i + 1)); } catch { /* fall through */ }
          break;
        }
      }
    }
  }

  // Before giving up, try repairing
  const repaired = repairJson(text);
  try { return JSON.parse(repaired); } catch { /* fall through */ }

  return null;
}
