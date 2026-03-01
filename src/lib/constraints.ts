import { ConstraintConflict, Constraints, GridState } from '../types';
import { computeFeedback, encodePattern } from './feedback';
import { normalizeLetter } from './grid';

interface RowEvidence {
  positive: number;
  grey: number;
}

export type KeyboardLetterState = 'neutral' | 'grey' | 'yellow' | 'green';

function countLetters(word: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const letter of word) {
    counts[letter] = (counts[letter] ?? 0) + 1;
  }
  return counts;
}

export function buildConstraintsFromGrid(gridState: GridState): Constraints {
  const exactPositions: Array<string | null> = Array.from(
    { length: gridState[0]?.length ?? 5 },
    () => null
  );
  const excludedPositionSets: Record<string, Set<number>> = {};
  const minCounts: Record<string, number> = {};
  const maxCounts: Record<string, number> = {};
  const conflicts: ConstraintConflict[] = [];
  const greenLettersByPosition: Record<number, Set<string>> = {};
  const rowPatterns: Constraints['rowPatterns'] = [];
  const confirmedTotals: Record<string, number> = {};

  gridState.forEach((row, rowIdx) => {
    const rowEvidence: Record<string, RowEvidence> = {};
    const guessLetters = row.map((cell) => normalizeLetter(cell.letter));
    const isFilledRow = guessLetters.every((letter) => !!letter);

    row.forEach((cell, colIdx) => {
      const letter = normalizeLetter(cell.letter);
      if (!letter || cell.feedback === null) {
        return;
      }

      rowEvidence[letter] ??= { positive: 0, grey: 0 };

      if (cell.feedback === 2) {
        rowEvidence[letter].positive += 1;
        confirmedTotals[letter] = (confirmedTotals[letter] ?? 0) + 1;
        greenLettersByPosition[colIdx] ??= new Set();
        greenLettersByPosition[colIdx].add(letter);
        exactPositions[colIdx] = letter;
      } else if (cell.feedback === 1) {
        rowEvidence[letter].positive += 1;
        confirmedTotals[letter] = (confirmedTotals[letter] ?? 0) + 1;
        excludedPositionSets[letter] ??= new Set();
        excludedPositionSets[letter].add(colIdx);
      } else if (cell.feedback === 0) {
        rowEvidence[letter].grey += 1;
      }
    });

    if (isFilledRow) {
      const pattern = row.map((cell) => (cell.feedback === null ? 0 : cell.feedback));
      rowPatterns.push({
        guess: guessLetters.join(''),
        pattern
      });
    }

    Object.entries(rowEvidence).forEach(([letter, evidence]) => {
      if (evidence.positive > 0 && evidence.grey > 0) {
        const inferredMax = evidence.positive;
        maxCounts[letter] =
          maxCounts[letter] === undefined
            ? inferredMax
            : Math.min(maxCounts[letter], inferredMax);
      } else if (evidence.positive === 0 && evidence.grey > 0) {
        maxCounts[letter] =
          maxCounts[letter] === undefined ? 0 : Math.min(maxCounts[letter], 0);
      }
    });
  });

  Object.entries(confirmedTotals).forEach(([letter, total]) => {
    minCounts[letter] = total;
  });

  Object.entries(greenLettersByPosition).forEach(([idx, lettersSet]) => {
    if (lettersSet.size > 1) {
      const letters = [...lettersSet].sort().join(', ');
      conflicts.push({
        id: `greenPositionConflict:${idx}:${letters}`,
        type: 'greenPositionConflict',
        position: Number(idx),
        message: `Position ${Number(idx) + 1} has conflicting green letters (${letters}).`
      });
    }
  });

  Object.entries(maxCounts).forEach(([letter, max]) => {
    const min = minCounts[letter] ?? 0;
    if (min > max) {
      conflicts.push({
        id: `minExceedsMax:${letter}`,
        type: 'minExceedsMax',
        letter,
        min,
        max,
        message: `Letter "${letter.toUpperCase()}" needs at least ${min}, but max is ${max}.`
      });
    }
  });

  Object.entries(excludedPositionSets).forEach(([letter, positions]) => {
    positions.forEach((pos) => {
      if (exactPositions[pos] === letter) {
        conflicts.push({
          id: `positionExcluded:${letter}:${pos}`,
          type: 'positionExcluded',
          letter,
          position: pos,
          message: `Letter "${letter.toUpperCase()}" is both green and excluded at position ${
            pos + 1
          }.`
        });
      }
    });
  });

  const excludedPositions: Record<string, number[]> = {};
  Object.entries(excludedPositionSets).forEach(([letter, positions]) => {
    excludedPositions[letter] = [...positions].sort((a, b) => a - b);
  });

  const excludedLetters = Object.entries(maxCounts)
    .filter(([, value]) => value === 0)
    .map(([letter]) => letter);

  return {
    exactPositions,
    excludedPositions,
    minCounts,
    maxCounts,
    excludedLetters,
    rowPatterns,
    conflicts
  };
}

export function filterWords(words: string[], constraints: Constraints): string[] {
  const { exactPositions, excludedPositions, minCounts, maxCounts, rowPatterns } = constraints;
  const expectedLength = exactPositions.length;
  const excludedEntries = Object.entries(excludedPositions);
  const minEntries = Object.entries(minCounts);
  const maxEntries = Object.entries(maxCounts);
  const patternEntries = rowPatterns.map((entry) => ({
    ...entry,
    key: encodePattern(entry.pattern)
  }));

  return words.filter((candidateWord) => {
    const word = candidateWord.toLowerCase();

    if (word.length !== expectedLength || /[^a-z]/.test(word)) {
      return false;
    }

    for (let idx = 0; idx < expectedLength; idx += 1) {
      const required = exactPositions[idx];
      if (required && word[idx] !== required) {
        return false;
      }
    }

    for (const [letter, positions] of excludedEntries) {
      if (positions.some((position) => word[position] === letter)) {
        return false;
      }
    }

    const counts = countLetters(word);

    for (const [letter, min] of minEntries) {
      if ((counts[letter] ?? 0) < min) {
        return false;
      }
    }

    for (const [letter, max] of maxEntries) {
      if ((counts[letter] ?? 0) > max) {
        return false;
      }
    }

    for (const rowEntry of patternEntries) {
      const pattern = computeFeedback(rowEntry.guess, word);
      if (encodePattern(pattern) !== rowEntry.key) {
        return false;
      }
    }

    return true;
  });
}

export function deriveKeyboardLetterState(
  constraints: Constraints,
  gridState: GridState
): Record<string, KeyboardLetterState> {
  const states: Record<string, KeyboardLetterState> = {};
  for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
    states[letter] = 'neutral';
  }

  gridState.forEach((row) => {
    row.forEach((cell) => {
      const letter = normalizeLetter(cell.letter);
      if (!letter || cell.feedback === null) {
        return;
      }
      if (cell.feedback === 2) {
        states[letter] = 'green';
      } else if (cell.feedback === 1 && states[letter] !== 'green') {
        states[letter] = 'yellow';
      }
    });
  });

  Object.entries(constraints.maxCounts).forEach(([letter, max]) => {
    if (
      max === 0 &&
      states[letter] !== 'green' &&
      states[letter] !== 'yellow' &&
      (constraints.minCounts[letter] ?? 0) === 0
    ) {
      states[letter] = 'grey';
    }
  });

  return states;
}
