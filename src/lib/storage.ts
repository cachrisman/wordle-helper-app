import { PersistedState } from '../types';
import { createEmptyGrid } from './grid';

const STORAGE_KEY = 'wordle-hint-coach:v1';

export function defaultPersistedState(): PersistedState {
  return {
    grid: createEmptyGrid(),
    activeRow: 0,
    activeCol: 0,
    viewMode: 'hints',
    showAllCandidates: false
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

    return {
      ...defaultPersistedState(),
      ...parsed
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
