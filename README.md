# New Eleusis

A digital implementation of **New Eleusis**, the card game that simulates the scientific method. One player (the "God" or dealer) creates a secret rule governing which cards can be played, and the other players ("Scientists") perform experiments by playing cards to deduce the rule.

## Features

- **AI or Human God** — The dealer can be an AI that picks from 38+ built-in rules, or a human player who invents their own
- **Rule Compiler** — Human Gods can describe their rule in plain English and have it compiled into a deterministic judge function (cloud or local LLM backends)
- **Prophet System** — Players who think they know the rule can declare themselves Prophet and predict outcomes for other players
- **Hot-seat Multiplayer** — Pass-and-play support with turn transition overlays
- **Scoring & Sudden Death** — Full implementation of New Eleusis scoring, markers, and sudden death mechanics

## Getting Started

```bash
npm install       # Install dependencies
npm run dev       # Start development server
npm test          # Run test suite
npm run build     # Production build
```

### Android (Capacitor)

```bash
npm run cap:sync  # Build and sync to Android
npm run cap:open  # Open in Android Studio
npm run cap:run   # Run on connected device
```

## Architecture

```
src/
├── engine/           # Pure TypeScript game logic (no UI dependencies)
│   ├── ai/           # AI dealer (rule bank), AI player, hypothesis engine
│   ├── types.ts      # Core type definitions
│   ├── reducer.ts    # Pure reducer for all state transitions
│   ├── validation.ts # Rule validation
│   ├── scoring.ts    # Score calculation
│   └── deck.ts       # Card utilities
├── store/            # Zustand state management
│   └── gameStore.ts  # Store wrapping the reducer + side effects
├── components/       # React UI (retro arcade aesthetic)
├── services/         # Rule compiler client service
└── audio/            # Sound effects
server/               # Vite dev server plugins (rule compiler API)
tests/                # Vitest test suite
```

## Rule Compiler

The rule compiler converts natural language rules (e.g., "alternate red and black cards") into deterministic JavaScript judge functions. Two backends are available:

- **Cloud** (dev only) — Routes through a Vite dev server plugin to Claude CLI for high-quality compilation with examples
- **Local** (everywhere) — Uses Transformers.js with a quantized Qwen model running in-browser via WASM

Compiled functions are sandboxed with security validation (forbidden pattern detection) and stress-tested before use.

## Game Rules

See [`NEW_ELEUSIS_RULES.md`](./NEW_ELEUSIS_RULES.md) for the complete official rules of New Eleusis.

## Testing

```bash
npm test              # Unit + integration tests (~350 tests)
npm run test:rules    # Rule bank cross-validation (requires dev server + Claude CLI)
```

## License

Private project.
