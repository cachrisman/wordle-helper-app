import { FeedbackValue, GRID_COLS, GRID_ROWS, GridCell, GridState } from '../types';

const TILE_CYCLE: FeedbackValue[] = [0, 1, 2];

export function createEmptyGrid(rows = GRID_ROWS, cols = GRID_COLS): GridState {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (): GridCell => ({ letter: '', feedback: null }))
  );
}

export function cloneGrid(grid: GridState): GridState {
  return grid.map((row) => row.map((cell) => ({ ...cell })));
}

export function cycleTileFeedback(feedback: FeedbackValue): FeedbackValue {
  const idx = TILE_CYCLE.indexOf(feedback);
  return TILE_CYCLE[(idx + 1) % TILE_CYCLE.length];
}

export function normalizeLetter(value: string): string {
  return value.trim().slice(0, 1).toLowerCase().replace(/[^a-z]/g, '');
}
