export const GRID_ROWS = 6;
export const GRID_COLS = 5;
export const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

export type TileState = 'unknown' | 'grey' | 'yellow' | 'green';

export interface GridCell {
  letter: string;
  state: TileState;
}

export type GridState = GridCell[][];

export interface ConstraintConflict {
  id: string;
  type: 'positionExcluded' | 'minExceedsMax' | 'greenPositionConflict';
  message: string;
  letter?: string;
  position?: number;
  min?: number;
  max?: number;
}

export interface Constraints {
  exactPositions: Array<string | null>;
  excludedPositions: Record<string, number[]>;
  minCounts: Record<string, number>;
  maxCounts: Record<string, number>;
  conflicts: ConstraintConflict[];
}

export interface FrequencyEntry {
  letter: string;
  count: number;
  ratio: number;
}

export interface CandidateStats {
  candidateCount: number;
  overallFrequency: FrequencyEntry[];
  positionFrequency: FrequencyEntry[][];
  uniqueCoverage: FrequencyEntry[];
  avgUniqueLetters: number;
}

export type ViewMode = 'hints' | 'candidates';

export interface PersistedState {
  grid: GridState;
  activeRow: number;
  activeCol: number;
  viewMode: ViewMode;
  showAllCandidates: boolean;
}
