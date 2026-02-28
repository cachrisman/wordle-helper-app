import { CandidateStats, ConstraintConflict, Constraints, GridState } from '../types';
import { normalizeLetter } from './grid';

interface RowEvidence {
  positive: number;
  grey: number;
}

function countLetters(word: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const letter of word) {
    counts[letter] = (counts[letter] ?? 0) + 1;
  }
  return counts;
}

function toSortedFrequency(
  counts: Record<string, number>,
  denominator: number
): CandidateStats['overallFrequency'] {
  return Object.entries(counts)
    .map(([letter, count]) => ({
      letter,
      count,
      ratio: denominator > 0 ? count / denominator : 0
    }))
    .sort((a, b) => b.count - a.count || a.letter.localeCompare(b.letter));
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
  const confirmedTotals: Record<string, number> = {};

  gridState.forEach((row) => {
    const rowEvidence: Record<string, RowEvidence> = {};

    row.forEach((cell, colIdx) => {
      const letter = normalizeLetter(cell.letter);
      if (!letter) {
        return;
      }

      rowEvidence[letter] ??= { positive: 0, grey: 0 };

      if (cell.state === 'green') {
        rowEvidence[letter].positive += 1;
        confirmedTotals[letter] = (confirmedTotals[letter] ?? 0) + 1;

        greenLettersByPosition[colIdx] ??= new Set();
        greenLettersByPosition[colIdx].add(letter);
        exactPositions[colIdx] = letter;
      } else if (cell.state === 'yellow') {
        rowEvidence[letter].positive += 1;
        confirmedTotals[letter] = (confirmedTotals[letter] ?? 0) + 1;
        excludedPositionSets[letter] ??= new Set();
        excludedPositionSets[letter].add(colIdx);
      } else if (cell.state === 'grey') {
        rowEvidence[letter].grey += 1;
      }
    });

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
        message: `Letter "${letter.toUpperCase()}" needs at least ${min} but max is ${max}.`
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
          message: `Letter "${letter.toUpperCase()}" is both fixed and excluded in position ${pos + 1}.`
        });
      }
    });
  });

  const excludedPositions: Record<string, number[]> = {};
  Object.entries(excludedPositionSets).forEach(([letter, positions]) => {
    excludedPositions[letter] = [...positions].sort((a, b) => a - b);
  });

  return {
    exactPositions,
    excludedPositions,
    minCounts,
    maxCounts,
    conflicts
  };
}

export function filterWords(words: string[], constraints: Constraints): string[] {
  const { exactPositions, excludedPositions, minCounts, maxCounts } = constraints;
  const expectedLength = exactPositions.length;
  const excludedEntries = Object.entries(excludedPositions);
  const minEntries = Object.entries(minCounts);
  const maxEntries = Object.entries(maxCounts);

  return words.filter((candidateWord) => {
    const word = candidateWord.toLowerCase();

    if (word.length !== expectedLength || /[^a-z]/.test(word)) {
      return false;
    }

    for (let i = 0; i < expectedLength; i += 1) {
      const required = exactPositions[i];
      if (required && word[i] !== required) {
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

    return true;
  });
}

export function analyzeCandidates(candidates: string[]): CandidateStats {
  const candidateCount = candidates.length;
  const overallCounts: Record<string, number> = {};
  const coverageCounts: Record<string, number> = {};
  const positionCounts = Array.from({ length: 5 }, () => ({} as Record<string, number>));
  let uniqueTotal = 0;

  candidates.forEach((word) => {
    const uniqueLetters = new Set(word);
    uniqueTotal += uniqueLetters.size;

    uniqueLetters.forEach((letter) => {
      coverageCounts[letter] = (coverageCounts[letter] ?? 0) + 1;
    });

    word.split('').forEach((letter, idx) => {
      overallCounts[letter] = (overallCounts[letter] ?? 0) + 1;
      positionCounts[idx][letter] = (positionCounts[idx][letter] ?? 0) + 1;
    });
  });

  return {
    candidateCount,
    overallFrequency: toSortedFrequency(overallCounts, candidateCount * 5),
    positionFrequency: positionCounts.map((counts) => toSortedFrequency(counts, candidateCount)),
    uniqueCoverage: toSortedFrequency(coverageCounts, candidateCount),
    avgUniqueLetters: candidateCount > 0 ? uniqueTotal / candidateCount : 0
  };
}
