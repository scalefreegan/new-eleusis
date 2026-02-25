# New Eleusis Game Engine

Pure TypeScript game engine for New Eleusis card game. No UI dependencies - can be used in any JavaScript environment.

## Overview

The engine implements a complete state machine for the New Eleusis card game with:

- **Pure functions**: All state transformations are immutable
- **Type-safe**: Full TypeScript coverage
- **Well-tested**: 146 tests with 80%+ coverage
- **Predictable**: Deterministic state transitions

## Architecture

### Core Modules

#### `types.ts`
Type definitions for all game entities:
- `Card`, `Suit`, `Rank`
- `Player`, `PlayedCard`, `GameState`
- `GameAction` (discriminated union)
- `GamePhase` (state machine phases)

#### `deck.ts`
Deck utilities:
- `createDeck()` - Creates 2x52 card deck (104 cards)
- `shuffle()` - Fisher-Yates shuffle
- `dealCards()` - Deal N cards from deck
- Helper functions: `getRankValue()`, `getSuitColor()`, `isFaceCard()`, `isEvenRank()`

#### `reducer.ts`
State machine reducer:
- `createInitialState()` - Create new game state
- `gameReducer(state, action)` - Pure state transformation
- Handles all 15+ action types

#### `validation.ts`
Turn and rule validation:
- `canPlayCard()` - Check if player can play
- `canDeclareProphet()` - Check if player can become prophet
- `validatePlay()` - Validate a card play attempt
- `shouldGameEnd()` - Check end conditions

#### `scoring.ts`
Scoring calculations:
- `calculatePlayerScore()` - Score for scientist players
- `calculateDealerScore()` - Score for dealer
- `calculateFinalScores()` - All player scores
- `getLeader()` - Current leader

### AI Modules

#### `ai/rules.ts`
Rule bank with 10 rules for MVP:
- Alternating colors
- Same color
- Ascending/descending rank
- Same suit or rank
- Even/odd alternation
- Only even/odd
- No face cards
- Adjacent ranks

Each rule is a function: `(lastCard, newCard) => boolean`

#### `ai/dealer.ts`
AI Dealer implementation:
- Selects random rule from bank
- Judges cards according to rule
- Simple but effective for MVP

#### `ai/player.ts`
AI Player (Phase 3 MVP):
- Random card selection
- Always plays 1 card
- Never declares prophet or no-play
- Will be enhanced in Phase 6

## Usage

```typescript
import {
  createInitialState,
  gameReducer,
  createDeck,
  shuffle,
  createAIDealer,
} from './engine';

// Initialize game
let state = createInitialState();

// Set up players
state = gameReducer(state, {
  type: 'INIT_GAME',
  dealerId: 'dealer',
  playerIds: ['dealer', 'player1', 'player2'],
});

// Dealer selects rule
const dealer = createAIDealer();
state = gameReducer(state, {
  type: 'SET_DEALER_RULE',
  rule: dealer.getRuleName(),
  ruleFunction: dealer.getRuleFunction(),
});

// Deal cards
state = gameReducer(state, {
  type: 'DEAL_CARDS',
  count: 7,
});

// Play a card
state = gameReducer(state, {
  type: 'PLAY_CARD',
  playerId: 'player1',
  cardIds: ['h-5-0'],
});

// Dealer judges card
const lastCard = state.mainLine[state.mainLine.length - 1];
const newCard = state.players[0].hand[0];
const correct = dealer.judgeCard(lastCard, newCard);

state = gameReducer(state, {
  type: 'JUDGE_CARD',
  cardId: newCard.id,
  correct,
  skipPenalty: false, // Set to true when Prophet is overthrown to skip scientist penalty
});

// End turn
state = gameReducer(state, {
  type: 'END_TURN',
});
```

## Game Actions

All possible actions:

```typescript
type GameAction =
  | { type: 'INIT_GAME'; dealerId: string; playerIds: string[]; dealerRule?: string }
  | { type: 'SET_GOD_RULE'; rule: string; ruleFunction?: (lastCard: Card, newCard: Card) => boolean }
  | { type: 'DEAL_CARDS'; count: number }
  | { type: 'PLAY_CARD'; playerId: string; cardIds: string[] }
  | { type: 'JUDGE_CARD'; cardId: string; correct: boolean; skipPenalty?: boolean }
  | { type: 'DECLARE_PROPHET'; playerId: string }
  | { type: 'RESIGN_PROPHET'; playerId: string }
  | { type: 'PROPHET_PREDICT'; playerId: string; cardId: string; prediction: boolean }
  | { type: 'PROPHET_VERIFY'; cardId: string; dealerJudgment: boolean }
  | { type: 'OVERTHROW_PROPHET'; prophetId: string }
  | { type: 'DECLARE_NO_PLAY'; playerId: string }
  | { type: 'DISPUTE_NO_PLAY'; disputerId: string }
  | { type: 'RESOLVE_NO_PLAY'; valid: boolean; correctCardId?: string }
  | { type: 'EXPEL_PLAYER'; playerId: string }
  | { type: 'END_TURN' }
  | { type: 'END_GAME' }
```

## Testing

Run tests:
```bash
npm test
```

Run with coverage:
```bash
npm test -- --coverage
```

### Test Coverage

- **146 tests** across 7 test suites
- **80.58%** overall coverage
- **100%** coverage for deck and AI modules
- **93.1%** coverage for validation
- **97.67%** coverage for scoring

## Phase 2 Completion Checklist

- [x] Type definitions (types.ts)
- [x] Deck utilities (deck.ts)
- [x] State machine reducer (reducer.ts)
- [x] Turn validation logic (validation.ts)
- [x] Scoring formulas (scoring.ts)
- [x] AI rule bank (ai/rules.ts) - 10 rules
- [x] AI dealer (ai/dealer.ts)
- [x] AI player (ai/player.ts) - simple random selection
- [x] Vitest configuration
- [x] Comprehensive unit tests (146 tests)
- [x] >80% test coverage

## Next Steps (Phase 3)

Phase 3 will connect this engine to React UI:
- Zustand store wrapper
- Wire reducer to components
- Implement game loop
- Add animations
- Build playable MVP vs AI
