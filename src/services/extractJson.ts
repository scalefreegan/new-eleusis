/**
 * Extracts the first JSON object from a string that may contain
 * markdown fences, preamble text, or other non-JSON content.
 *
 * Shared by ruleCompilerPlugin.ts (server) and llmBackend.ts (client).
 */

/** Extract the first JSON object from a string (strips markdown fences, preamble) */
export function extractJson(text: string): unknown {
  const errors: string[] = [];

  // Direct parse
  try { return JSON.parse(text); } catch (e) {
    errors.push(`direct: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Fenced code block ```json ... ```
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1]); } catch (e) {
      errors.push(`fence: ${e instanceof Error ? e.message : String(e)}`);
    }
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
          try { return JSON.parse(text.slice(start, i + 1)); } catch (e) {
            errors.push(`brace: ${e instanceof Error ? e.message : String(e)}`);
          }
          break;
        }
      }
    }
  }

  return null;
}
