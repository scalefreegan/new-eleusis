/**
 * Prompt template for the local LLM rule compiler.
 * Trimmed vs. the server-side prompt — no examples in output (generated programmatically),
 * only functionBody + ambiguities. Reduces token load on smaller models.
 */

export function buildLocalCompilerPrompt(ruleText: string, clarifications?: string): string {
  const clarificationSection = clarifications
    ? `\nThe God has also provided these clarifications:\n${clarifications}\n`
    : '';

  return `You are a rule compiler for the card game New Eleusis. Convert a natural language card rule into a JavaScript function body.

## Card Type
interface Card { rank: 'A'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K'; suit: 'hearts'|'diamonds'|'clubs'|'spades'; id: string; }

## Helper Functions (available as \`helpers\`)
helpers.getRankValue(rank): number  // A=1, 2=2, ..., 10=10, J=11, Q=12, K=13
helpers.getSuitColor(suit): 'red'|'black'  // hearts/diamonds=red, clubs/spades=black
helpers.isFaceCard(rank): boolean  // J, Q, K
helpers.isEvenRank(rank): boolean  // true for 2,4,6,8,10,Q

## Function Signature
Parameters: lastCard (Card), newCard (Card), helpers
Returns: true if newCard is valid after lastCard, false otherwise.

## Rule to Compile
"${ruleText}"
${clarificationSection}
## Output — respond ONLY with valid JSON, no markdown:
{
  "functionBody": "<JS code ending with return <boolean>;>",
  "ambiguities": ["question if rule is unclear", ...]
}

## Rules for functionBody
- Use ONLY: lastCard, newCard, helpers, standard JS math/logic/arrays
- NO: eval, fetch, window, document, import, require, globalThis, process, Function, setTimeout, setInterval, localStorage, navigator, prototype, constructor
- Must end with return <boolean expression>;
- Must be synchronous

## Examples of valid functionBody values
Rule "alternate red and black":
  return helpers.getSuitColor(lastCard.suit) !== helpers.getSuitColor(newCard.suit);

Rule "rank must increase by 1 or 2":
  const diff = helpers.getRankValue(newCard.rank) - helpers.getRankValue(lastCard.rank);
  return diff === 1 || diff === 2;

Rule "suits cycle hearts->diamonds->clubs->spades->hearts":
  const order = ['hearts', 'diamonds', 'clubs', 'spades'];
  const lastIdx = order.indexOf(lastCard.suit);
  return newCard.suit === order[(lastIdx + 1) % 4];

Rule "new card rank is a Fibonacci number":
  const fibs = [1, 2, 3, 5, 8, 13];
  return fibs.includes(helpers.getRankValue(newCard.rank));

Now output ONLY the JSON object for: "${ruleText}"`;
}
