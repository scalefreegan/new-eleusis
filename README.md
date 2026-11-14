<h1 align="center">New Eleusis</h1>

<p align="center"><b>A digital take on the card game that turns the scientific method into play.</b></p>
<p align="center">One player invents a secret rule. Everyone else runs experiments, one card at a time, to work out what it is.</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Android-Capacitor-3DDC84?style=flat-square&logo=android&logoColor=white" alt="Android via Capacitor">
</p>

<p align="center">
  <img src="docs/hero.png" alt="New Eleusis gameplay: a sequence of cards on a table, with accepted and rejected plays" width="800">
</p>
<!-- TODO: generate docs/hero.png from docs/hero-image-prompt.md -->
<p align="center"><sub><i>Play a card, learn from the verdict, and narrow in on the hidden rule.</i></sub></p>

## Features

- **AI or human God**: the dealer can be an AI that picks from 41 built-in rules, or a human who invents their own.
- **Rule compiler**: human Gods describe a rule in plain English and it is compiled into a deterministic judge function, using a cloud or a local LLM backend.
- **Prophet system**: declare yourself Prophet when you think you know the rule, then predict outcomes for other players.
- **Hot-seat multiplayer**: pass-and-play with turn transition overlays.
- **Validated board and rubbish bin**: accepted plays build the main line, rejected plays go to a rubbish bin you can review.
- **Scoring and sudden death**: New Eleusis scoring, markers, and sudden death mechanics.
- **Android build**: wrapped with Capacitor.

## How it works

New Eleusis simulates scientific research. The dealer ("God" or "Nature") writes a secret rule that decides which cards may be played, based only on the cards already played correctly. The other players ("Scientists") play cards as experiments: legal plays extend the main line, illegal ones are set aside. Players race to form a theory, and the first with a good one can become Prophet. Others then try to overthrow the Prophet by finding an experiment whose result cannot be predicted.

The full rules are in [`NEW_ELEUSIS_RULES.md`](./NEW_ELEUSIS_RULES.md).

## Get started

```bash
npm install       # Install dependencies
npm run dev       # Start the development server
```

Other scripts:

```bash
npm run build     # Type-check and build for production
npm run lint      # Lint the codebase
npm run server    # Standalone rule compiler API (default port 3001)
npm run download-model  # Pre-download the local model
npm test          # Run the test suite
```

### Android (Capacitor)

```bash
npm run cap:sync  # Build and sync to Android
npm run cap:open  # Open in Android Studio
npm run cap:run   # Run on a connected device
```

## Rule compiler

The rule compiler turns natural language (for example, "alternate red and black cards") into a deterministic JavaScript judge function. Two backends are available:

- **Cloud** (dev only): routes through a Vite dev server plugin to the Claude CLI for high-quality compilation with examples.
- **Local** (everywhere): runs a quantized Qwen2.5-Coder 1.5B model in the browser with Transformers.js over WASM (about a 900 MB first-time download, cached, and cancellable from the UI).

Compiled functions are sandboxed with forbidden-pattern detection and stress-tested before use.

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
├── store/            # Zustand state management (wraps the reducer)
├── components/       # React UI (retro arcade aesthetic)
├── utils/            # Shared card helpers
├── services/         # Rule compiler client service
└── audio/            # Sound effects
server/               # Rule compiler API (Vite dev plugin + standalone server)
scripts/              # Model download script
tests/                # Vitest suite, including a game-simulation harness
```

## Testing

```bash
npm test              # Unit + integration tests (873 tests across 39 files)
npm run test:rules    # Rule bank cross-validation (requires dev server + Claude CLI)
```

## License

Private project. All rights reserved.
