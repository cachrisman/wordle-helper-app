# Wordle Hint Coach (PWA)

Hints-first Wordle-style helper built with **Vite + React + TypeScript**.
It focuses on **analysis and information gain**, not auto-solving or forcing a single answer.

## Version

Current version: **1.2.0**.

## Features

- Mobile-first SPA with 44px+ touch targets and iPhone safe-area padding.
- Installable PWA (`vite-plugin-pwa`) with manifest + service worker.
- Offline support after first load:
  - app shell
  - embedded allowed guesses list
  - embedded candidate dictionary
  - embedded frequency/prior data
- Wordle-style 6x5 grid with required tile model:
  - empty tile = blank
  - typing fills tile and defaults feedback to **GREY**
  - tap cycles **GREY -> YELLOW -> GREEN -> GREY**
  - long-press clears a tile back to empty
  - backspace clears and moves cursor back
- Built-in on-screen keyboard (A–Z + Enter + Backspace) for iOS reliability.
- Physical keyboard support on desktop.
- Keyboard key coloring from best-known constraints (green/yellow/grey/neutral).
- WordleBot-inspired analysis model:
  - dictionary priors from embedded frequency scores
  - heuristic penalties (past tense `-ed`, plural/singular `-s/-es`, British variants, derived forms, name-likeness)
  - normalized posterior probabilities over remaining likely solutions
- Information theory scoring:
  - exact Wordle feedback engine with duplicate handling
  - expected info gained in bits
  - 0–100 info meter
  - expected remaining solutions
- Hints-first UX:
  - valid guesses remaining + likely solutions remaining (weighted effective count)
  - “what changed” deltas
  - weighted letter frequencies (overall + by position)
  - high-value letters to test next
  - optional exploration guesses panel (not answers)
  - conflict detection + one-tap fixes
  - “why” explanations per letter
  - zero-candidate rescue mode with one-tap relax actions
- Hard Mode toggle for exploration guess recommendations.
- Theme support:
  - dark default
  - manual dark/light toggle
  - optional follow-system mode
- Sticky bottom action bar:
  - reset
  - undo
  - hints/candidates toggle
  - theme toggle
- Automatic localStorage persistence for:
  - grid
  - derived constraints snapshot
  - mode/toggles (view, hard mode, exploration visibility)
  - theme settings
- Offline indicator when `navigator.onLine` is false.
- Unit tests with Vitest for feedback, filtering/duplicates, and info-gain sanity.

## Embedded Data Assets (Fully Included In Repo)

All runtime data is embedded locally under `src/assets`:

- `src/assets/allowed-guesses.txt`
  - full valid 5-letter guess list (target game vocabulary)
- `src/assets/dictionary.txt`
  - broader candidate dictionary used for likelihood model
  - currently aligned with the allowed list, but architecture supports replacing with a larger dictionary
- `src/assets/frequency.json`
  - embedded `word -> zipf-like score` mapping used for base priors

No external API calls are required at runtime.

### Replacing / Updating Word Lists

1. Replace `allowed-guesses.txt` with one lowercase 5-letter word per line.
2. Replace `dictionary.txt` similarly (can be same or broader).
3. Update `frequency.json` so dictionary words have scores:
   - format: `{ "word": number, ... }`
   - words missing from frequency map will fall back to a tiny base prior.
4. Run:
   ```bash
   npm run test:run
   npm run build
   ```
5. Commit updated assets.

## Tech Stack

- React 19
- TypeScript
- Vite 7
- Vitest
- `vite-plugin-pwa`

## Getting Started

```bash
npm install
npm run dev
```

Build + preview:

```bash
npm run build
npm run preview
```

Run tests:

```bash
npm run test:run
```

## iPhone "Add to Home Screen" Instructions

1. Open the deployed app URL in **Safari** on iPhone.
2. Tap the **Share** icon.
3. Select **Add to Home Screen**.
4. Confirm the name and tap **Add**.
5. Launch from your Home Screen for standalone app mode.

## Offline Behavior Notes

- After first successful load, the service worker precaches the app shell + embedded assets.
- Word lists and frequency data are bundled and available offline.
- If the network drops, the app continues functioning from cache.
- An offline banner appears automatically when the browser reports offline status.

## Testing Focus

- `src/lib/feedback.test.ts`
  - exact Wordle feedback behavior, including duplicate edge cases
- `src/lib/constraints.test.ts`
  - constraint inference, filtering, duplicate min/max logic, conflict detection
- `src/lib/analysis.test.ts`
  - weighted letter stats and info-gain scoring sanity

## Changelog

### 1.2.0 - 2026-02-28

- Added full embedded dual-list architecture:
  - allowed guesses list
  - candidate dictionary list
- Added embedded frequency prior file for weighted likelihood modeling.
- Implemented WordleBot-like offline prior weighting with heuristic penalties.
- Added exact Wordle feedback engine (`computeFeedback`) with duplicate handling.
- Updated filtering to use feedback-pattern consistency from completed rows.
- Added information-theory scoring (`scoreGuessInfoGain`) with bits + expected remaining.
- Added high-value letter suggestions and optional exploration guess disclosure.
- Added hard mode toggle for exploration guess generation.
- Reworked tile model to empty/filled with required color cycle and long-press clear.
- Added keyboard status coloring and improved iOS-first on-screen keyboard.
- Added dark/light theming + optional follow-system mode.
- Added zero-candidate rescue mode actions.
- Expanded test suite (feedback, constraints, analysis).

### 1.1.0 - 2026-02-28

- Built full React + TypeScript single-page app from scratch.
- Added installable PWA setup (manifest + service worker).
- Added offline indicator and local persistence.
- Added embedded 2315-word list.
- Implemented constraints model and duplicate-aware filtering engine.
- Implemented hints-first UX with secondary candidates panel.
- Added sticky action bar with Reset / Undo / View toggle.
- Added accessibility-minded sizing and focus styles.
- Added Vitest tests for filtering + duplicate edge cases.