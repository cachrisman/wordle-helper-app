import { GRID_COLS, GRID_ROWS, GridCell, GridState, TileState } from '../types';

const TILE_CYCLE: TileState[] = ['unknown', 'grey', 'yellow', 'green'];

export function createEmptyGrid(rows = GRID_ROWS, cols = GRID_COLS): GridState {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (): GridCell => ({ letter: '', state: 'unknown' }))
  );
}

export function cloneGrid(grid: GridState): GridState {
  return grid.map((row) => row.map((cell) => ({ ...cell })));
}

export function cycleTileState(state: TileState): TileState {
  const idx = TILE_CYCLE.indexOf(state);
  return TILE_CYCLE[(idx + 1) % TILE_CYCLE.length];
}

export function normalizeLetter(value: string): string {
  return value.trim().slice(0, 1).toLowerCase().replace(/[^a-z]/g, '');
}
