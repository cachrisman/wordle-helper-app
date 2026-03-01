import { describe, expect, it } from 'vitest';
import { FeedbackValue, GridState } from '../types';
import { buildConstraintsFromGrid, filterWords } from './constraints';
import { createEmptyGrid } from './grid';

function withCells(
  cells: Array<{ row: number; col: number; letter: string; feedback: FeedbackValue }>
): GridState {
  const grid = createEmptyGrid();
  cells.forEach(({ row, col, letter, feedback }) => {
    grid[row][col] = { letter, feedback };
  });
  return grid;
}

describe('filterWords', () => {
  it('applies green and yellow positional constraints', () => {
    const constraints = buildConstraintsFromGrid(
      withCells([
        { row: 0, col: 0, letter: 'c', feedback: 2 },
        { row: 0, col: 1, letter: 'r', feedback: 1 }
      ])
    );

    const words = ['cigar', 'cairn', 'caper', 'crane'];
    expect(filterWords(words, constraints)).toEqual(['cigar', 'cairn', 'caper']);
  });

  it('treats all-grey letters as absent when no present evidence exists', () => {
    const constraints = buildConstraintsFromGrid(
      withCells([
        { row: 0, col: 0, letter: 's', feedback: 0 },
        { row: 0, col: 1, letter: 't', feedback: 0 },
        { row: 0, col: 2, letter: 'a', feedback: 0 },
        { row: 0, col: 3, letter: 'r', feedback: 0 },
        { row: 0, col: 4, letter: 'e', feedback: 0 }
      ])
    );

    const words = ['cloud', 'prong', 'cider', 'shout'];
    expect(filterWords(words, constraints)).toEqual(['cloud']);
  });

  it('infers min and max count for duplicates from mixed feedback in one guess', () => {
    const constraints = buildConstraintsFromGrid(
      withCells([
        { row: 0, col: 0, letter: 'a', feedback: 1 },
        { row: 0, col: 1, letter: 'a', feedback: 0 }
      ])
    );

    expect(constraints.minCounts.a).toBe(1);
    expect(constraints.maxCounts.a).toBe(1);

    const words = ['cigar', 'banjo', 'aback', 'mamma'];
    expect(filterWords(words, constraints)).toEqual(['cigar', 'banjo']);
  });

  it('enforces min count evidence across guesses', () => {
    const constraints = buildConstraintsFromGrid(
      withCells([
        { row: 0, col: 0, letter: 'a', feedback: 2 },
        { row: 1, col: 2, letter: 'a', feedback: 1 }
      ])
    );

    expect(constraints.minCounts.a).toBe(2);

    const words = ['array', 'alarm', 'amass', 'abbey'];
    expect(filterWords(words, constraints)).toEqual(['array']);
  });

  it('caps max count when duplicate letter has extra grey tile', () => {
    const constraints = buildConstraintsFromGrid(
      withCells([
        { row: 0, col: 0, letter: 'a', feedback: 2 },
        { row: 0, col: 1, letter: 'a', feedback: 1 },
        { row: 0, col: 2, letter: 'a', feedback: 0 }
      ])
    );

    expect(constraints.minCounts.a).toBe(2);
    expect(constraints.maxCounts.a).toBe(2);

    const words = ['array', 'abaca', 'adapt'];
    expect(filterWords(words, constraints)).toEqual(['array', 'adapt']);
  });

  it('detects contradiction when min count exceeds inferred max', () => {
    const constraints = buildConstraintsFromGrid(
      withCells([
        { row: 0, col: 0, letter: 'a', feedback: 1 },
        { row: 0, col: 1, letter: 'a', feedback: 0 },
        { row: 1, col: 2, letter: 'a', feedback: 1 },
        { row: 1, col: 3, letter: 'a', feedback: 0 }
      ])
    );

    const conflict = constraints.conflicts.find((item) => item.type === 'minExceedsMax');
    expect(conflict).toBeDefined();
    expect(conflict?.letter).toBe('a');
    expect(conflict?.min).toBe(2);
    expect(conflict?.max).toBe(1);
  });

  it('uses exact feedback patterns for filtering duplicate cases', () => {
    const constraints = buildConstraintsFromGrid(
      withCells([
        { row: 0, col: 0, letter: 'a', feedback: 0 },
        { row: 0, col: 1, letter: 'l', feedback: 1 },
        { row: 0, col: 2, letter: 'l', feedback: 0 },
        { row: 0, col: 3, letter: 'e', feedback: 0 },
        { row: 0, col: 4, letter: 'e', feedback: 0 }
      ])
    );

    const words = ['lobby', 'hello', 'allow', 'fella'];
    expect(filterWords(words, constraints)).toEqual(['lobby']);
  });
});
