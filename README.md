# Wordle Hint Coach (PWA)

Hints-first Wordle-style helper built with **Vite + React + TypeScript**.

This app helps you reason about the puzzle by showing constraints, frequencies, and exploration guidance.
It intentionally avoids recommending a single "best answer" by default.

## Version

Current version: **1.1.0** (incremented).

## Features

- Mobile-friendly SPA with large touch targets and sticky bottom action bar.
- Installable PWA:
  - Web manifest
  - Service worker via `vite-plugin-pwa`
  - Offline app-shell + embedded word list support
- iPhone-safe layout (`viewport-fit=cover`) and safe-area paddings.
- Wordle-like 6x5 interactive grid:
  - Tap tiles to cycle status (`unknown -> grey -> yellow -> green`)
  - Keyboard letter input with auto-advance
  - Backspace behavior that steps backward
  - On-screen keyboard included
- Hints-first default view:
  - Remaining candidate count and delta
  - Letter frequencies (overall + by position)
  - Exploration suggestions (letters/guidance, not single-answer recommendation)
  - Contradiction detection + one-tap fixes
- Secondary Candidates view:
  - De-emphasized list
  - Random sample of 20 by default
- Automatic persistence to localStorage:
  - Grid state
  - View mode/preferences
  - Derived constraints snapshot
- Offline indicator when `navigator.onLine` is false.
- Embedded local word list at `src/assets/words.json` (no runtime network fetch).
- Unit tests with Vitest focused on filtering and duplicate-letter logic.

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

- After first successful load, the service worker caches the app shell assets.
- The embedded word list is bundled locally and available offline.
- If the network drops, the app keeps working with cached assets.
- An offline banner appears automatically when the browser reports offline status.

## Testing Focus

`src/lib/constraints.test.ts` covers:

- Green/yellow positional filtering
- Grey exclusion behavior
- Duplicate-letter min/max inference
- Cross-guess minCount handling
- Contradiction detection (min > max)

## Changelog

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