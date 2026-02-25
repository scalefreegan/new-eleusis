# Claude Agent Guidelines for New Eleusis

## 🎯 PRIMARY DIRECTIVE: Official Rules Compliance

**ALL implementation decisions MUST support and NEVER conflict with the official New Eleusis rules.**

📖 **Complete official rules:** See [`NEW_ELEUSIS_RULES.md`](./NEW_ELEUSIS_RULES.md)

When implementing features or fixing bugs:
1. ✅ **Always reference the official rules first**
2. ✅ **Verify your changes match the documented rules**
3. ❌ **Never implement behavior that contradicts the rules**
4. ❌ **Never make assumptions about game mechanics without checking the rules**

If the rules are unclear or ambiguous, ask for clarification rather than guessing.

---

## 🎮 Game Overview

**New Eleusis** is a card game simulation of the scientific method where:
- **God/Dealer:** Creates a secret rule and judges card plays
- **Scientists/Players:** Perform "experiments" (play cards) to deduce the rule
- **Prophet:** A player who thinks they know the rule and can predict outcomes
- **Goal:** Players race to understand the hidden rule and minimize penalty cards

The game emphasizes:
- Deductive reasoning and pattern recognition
- Risk/reward in declaring Prophet status
- Strategic card play to test hypotheses

---

## 🏗️ Project Architecture

### Core Components

#### Game Engine (`src/engine/`)
Pure TypeScript game logic with **no UI dependencies**:
- `types.ts` - Core type definitions (GameState, GameAction, Player, Card, etc.)
- `reducer.ts` - Pure reducer function handling all game state transitions
- `validation.ts` - Rule validation (can play card, declare prophet, sudden death, etc.)
- `scoring.ts` - Score calculation for players and God
- `deck.ts` - Card utilities (shuffle, deal, rank/suit helpers)

#### AI System (`src/engine/ai/`)
- `rules.ts` - Bank of 70+ rules with difficulty ratings
- `dealer.ts` - AI God that judges cards according to selected rule
- `player.ts` - AI player decision-making (card selection, Prophet declaration)
- `hypothesis.ts` - Hypothesis engine for AI players to deduce rules

#### State Management (`src/store/`)
- `gameStore.ts` - Zustand store wrapping the game engine
- Handles post-dispatch effects (AI turns, auto-judgment, Prophet verification)
- Manages UI state (card selection, turn transitions)

#### UI Components (`src/components/`)
React components with retro arcade aesthetic:
- `GameScreen.tsx` - Main game interface
- `StartMenu.tsx` - Game setup and configuration
- `PlayerHand.tsx` - Card hand display with selection
- `MainLineBoard.tsx` - Visual display of played cards (correct sequence + branches)
- `ProphetPredictionPanel.tsx` - Prophet prediction UI
- `DealerControlPanel.tsx` - Human God judgment interface
- `NoPlayDisputePanel.tsx` - No-Play declaration resolution UI
- `Scoreboard.tsx` - Player scores and status

---

## 📋 Key Game Rules Implementation

### Prophet System
- **Declaration conditions:** No existing prophet, not been prophet this round, 2+ players besides God
- **Prophet overthrow:** When Prophet predicts wrong, they get 5 penalty cards and are overthrown
- **Critical:** When Prophet is overthrown, the scientist gets **NO penalty** for that wrong play (use `skipPenalty: true` in `JUDGE_CARD`)
- **Markers:** Black markers every 10 cards, sudden death after 30 cards (Prophet-based)

### Penalty System
- **Wrong plays:** 2 penalty cards per wrong card
- **Wrong sequences:** 2 penalty cards per card in the sequence (don't reveal which card(s) were wrong)
- **Prophet overthrow:** 5 penalty cards to Prophet
- **Invalid No-Play:** 5 penalty cards to declaring player
- **Sudden death:** Wrong plays result in expulsion (unless `skipPenalty` is set)

### No-Play Declaration
- Player shows their hand claiming no valid cards
- **If correct:** Player gets new hand with 4 fewer cards
- **If incorrect:** God/Prophet plays a correct card from hand, player gets 5 penalty cards
- **If Prophet wrong:** Card returned to player's hand without penalty, Prophet overthrown

### Sudden Death
- **White markers (God):** Every 10th card, sudden death after 40 cards
- **Black markers (Prophet):** Every 10th card, sudden death after 30 cards
- During sudden death: Wrong plays → immediate expulsion

### Scoring
- **Players:** `(high count - cards in hand)` + 4 if out
- **True Prophet:** +1 per right card, +2 per wrong card (after becoming Prophet)
- **God:** `min(highest player score, 2 × cards before True Prophet)`
- **Early end:** +10 to players who never were God

### God Rotation
- After each round, next player becomes God
- Game ends when everyone has been God once (or early termination)
- **True Prophet succession:** If a Prophet finishes the round without being overthrown, they become God next round

---

## 🔧 Development Guidelines

### Testing
- Run tests: `npm test`
- Tests use Vitest
- All game logic in `src/engine/` should be pure and testable
- UI components tested with React Testing Library

### Code Style
- TypeScript strict mode enabled
- Use type-only imports where possible (`import type { ... }`)
- Prefer pure functions in engine code
- Keep UI and game logic separated

### State Management Pattern
```typescript
// 1. Dispatch action through store
dispatch({ type: 'ACTION_TYPE', ...params });

// 2. Reducer updates state immutably
const newState = gameReducer(state, action);

// 3. Post-dispatch effects handle side effects
if (action.type === 'SOME_ACTION') {
  // Auto-dispatch follow-up actions
  // Trigger AI turns
  // Update UI state
}
```

### Adding New Game Actions
1. Add action type to `GameAction` union in `types.ts`
2. Implement handler in `reducer.ts` (pure function)
3. Add validation if needed in `validation.ts`
4. Add post-dispatch effects in `gameStore.ts` if needed
5. Write tests in `tests/engine/reducer.test.ts`
6. **Verify against official rules in `NEW_ELEUSIS_RULES.md`**

---

## 🎨 UI/UX Guidelines

### Theme
- Retro arcade aesthetic with neon accents
- Purple/gold color scheme (var(--accent-purple), var(--accent-gold))
- Press Start 2P font for headings
- Glass morphism effects for panels

### Accessibility
- Clear visual feedback for actions
- Sound effects for important events (correct/wrong plays, Prophet events)
- Collapsible panels to manage screen real estate
- Turn transition overlays for multiplayer hot-seat mode

---

## 🐛 Common Pitfalls to Avoid

### ❌ Don't:
- Implement game mechanics without checking official rules
- Mutate state directly (always use immutable updates)
- Mix UI logic into game engine
- Make breaking changes to `GameAction` or `GameState` types without considering all consumers
- Skip penalty cards when they should be applied (except Prophet overthrow)
- Apply penalty cards when Prophet is overthrown (use `skipPenalty: true`)

### ✅ Do:
- Reference `NEW_ELEUSIS_RULES.md` for all game mechanic questions
- Keep engine pure and UI-independent
- Write tests for new game logic
- Use TypeScript types to prevent errors
- Consider both AI and human player scenarios
- Test sudden death mechanics carefully
- Verify Prophet overthrow doesn't penalize the scientist

---

## 🚀 Getting Started

### Development Setup
```bash
npm install       # Install dependencies
npm run dev       # Start dev server
npm test          # Run tests
npm run build     # Build for production
```

### Project Structure
```
src/
├── engine/           # Pure game logic
│   ├── ai/          # AI player and dealer
│   ├── types.ts     # Type definitions
│   ├── reducer.ts   # State transitions
│   ├── validation.ts
│   ├── scoring.ts
│   └── deck.ts
├── store/           # State management
│   └── gameStore.ts
├── components/      # React UI
├── audio/           # Sound effects
└── App.tsx
```

---

## 📚 Key Resources

- **Official Rules:** [`NEW_ELEUSIS_RULES.md`](./NEW_ELEUSIS_RULES.md) ← **Read this first!**
- **Game Reducer:** `src/engine/reducer.ts` - Source of truth for game state
- **Type Definitions:** `src/engine/types.ts` - Complete type system
- **Tests:** `tests/engine/` - Examples of expected behavior

---

## 🎯 Current Implementation Status

### ✅ Implemented Features
- Complete game loop with all phases
- Prophet system with overthrow mechanics
- No-Play declarations with dispute resolution
- Sudden death (both God and Prophet markers)
- AI players and AI God
- Multiplayer hot-seat mode with turn transitions
- Score calculation with all bonuses
- God rotation between rounds
- True Prophet succession
- Comprehensive test suite (313+ tests)

### 🔄 Intentionally Deferred
- +10 points for players who were never God (early game end)
- Full game-end condition ("everyone has been God once" termination)
- Alternative rule modifications from official rules

---

## 💡 Decision-Making Framework

When making any decision:

1. **Check the rules:** Does `NEW_ELEUSIS_RULES.md` address this?
2. **Check existing code:** How is similar logic handled?
3. **Check tests:** What do existing tests expect?
4. **Verify consistency:** Does this match the game's existing patterns?
5. **Ask if unsure:** Better to clarify than implement incorrectly

**Remember: The official rules are the ultimate authority. When in doubt, follow the rules exactly as written.**

---

*This guide ensures all AI agents working on New Eleusis maintain consistency with the official game rules and project architecture.*
