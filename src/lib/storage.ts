import { PersistedState } from '../types';
import { createEmptyGrid } from './grid';

const STORAGE_KEY = 'wordle-hint-coach:v2';

export function defaultPersistedState(): PersistedState {
  return {
    grid: createEmptyGrid(),
    activeRow: 0,
    activeCol: 0,
    viewMode: 'hints',
    showAllCandidates: false,
    showExplorationGuesses: false,
    hardMode: false,
    themePreference: 'dark',
    followSystemTheme: false,
    constraintsSnapshot: null,
    candidatePage: 1
  };
}

export function loadPersistedState(): PersistedState {
  if (typeof window === 'undefined') {
    return defaultPersistedState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultPersistedState();
    }
    const parsed = JSON.parse(raw) as PersistedState;

    if (!Array.isArray(parsed.grid) || parsed.grid.length === 0) {
      return defaultPersistedState();
    }

    const normalizedGrid = parsed.grid.map((row) =>
      row.map((cell) => ({
        letter: typeof cell.letter === 'string' ? cell.letter : '',
        feedback:
          typeof cell.feedback === 'number'
            ? cell.feedback
            : typeof cell.letter === 'string' && cell.letter
              ? 0
              : null
      }))
    );

    return {
      ...defaultPersistedState(),
      ...parsed,
      grid: normalizedGrid
    };
  } catch {
    return defaultPersistedState();
  }
}

export function savePersistedState(state: PersistedState): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
