export const GRID_ROWS = 6;
export const GRID_COLS = 5;
export const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

export type FeedbackValue = 0 | 1 | 2;

export interface GridCell {
  letter: string;
  feedback: FeedbackValue | null;
}

export type GridState = GridCell[][];

export interface GuessPattern {
  guess: string;
  pattern: FeedbackValue[];
}

export interface ConstraintConflict {
  id: string;
  type:
    | 'positionExcluded'
    | 'minExceedsMax'
    | 'greenPositionConflict'
    | 'feedbackMismatch';
  message: string;
  letter?: string;
  position?: number;
  min?: number;
  max?: number;
  row?: number;
}

export interface Constraints {
  exactPositions: Array<string | null>;
  excludedPositions: Record<string, number[]>;
  minCounts: Record<string, number>;
  maxCounts: Record<string, number>;
  excludedLetters: string[];
  rowPatterns: GuessPattern[];
  conflicts: ConstraintConflict[];
}

export interface FrequencyEntry {
  letter: string;
  score: number;
  ratio: number;
  topPositions: number[];
}

export interface LetterStats {
  overallFrequency: FrequencyEntry[];
  byPosition: FrequencyEntry[][];
  presenceFrequency: FrequencyEntry[];
  totalWeight: number;
}

export type ViewMode = 'hints' | 'candidates';
export type ThemePreference = 'dark' | 'light';

export interface PersistedState {
  grid: GridState;
  activeRow: number;
  activeCol: number;
  viewMode: ViewMode;
  showAllCandidates: boolean;
  showExplorationGuesses: boolean;
  hardMode: boolean;
  themePreference: ThemePreference;
  followSystemTheme: boolean;
  constraintsSnapshot: Constraints | null;
  candidatePage: number;
}

export interface GuessInfoGainScore {
  guess: string;
  bits: number;
  expectedRemaining: number;
  meter: number;
}
