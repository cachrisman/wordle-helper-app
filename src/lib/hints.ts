import { CandidateStats, Constraints } from '../types';

export interface ExplorationHints {
  lettersToProbe: string[];
  guidance: string[];
}

function letterIsAlreadyLocked(letter: string, constraints: Constraints): boolean {
  const min = constraints.minCounts[letter] ?? 0;
  const max = constraints.maxCounts[letter];
  return max !== undefined && min > 0 && min === max;
}

export function buildExplorationHints(
  stats: CandidateStats,
  constraints: Constraints
): ExplorationHints {
  const lettersToProbe = stats.uniqueCoverage
    .filter((entry) => (constraints.maxCounts[entry.letter] ?? Infinity) > 0)
    .filter((entry) => !letterIsAlreadyLocked(entry.letter, constraints))
    .slice(0, 10)
    .map((entry) => entry.letter);

  const guidance: string[] = [];

  if (stats.candidateCount === 0) {
    guidance.push('No candidates remain. Resolve contradictions or relax one clue.');
  } else if (stats.candidateCount > 70) {
    guidance.push('Try guesses with mostly unique letters to maximize information gain.');
  } else if (stats.candidateCount > 20) {
    guidance.push('Probe 2-3 high-coverage letters you have not confirmed yet.');
  } else {
    guidance.push('Use position frequencies to test where your likely letters should go.');
  }

  if (stats.avgUniqueLetters < 4) {
    guidance.push('Many candidates repeat letters, so duplicate-letter checks are important.');
  } else {
    guidance.push('Avoid repeated letters in probe guesses when your goal is new information.');
  }

  return { lettersToProbe, guidance };
}

export function pickRandomCandidates(candidates: string[], limit = 20): string[] {
  if (candidates.length <= limit) {
    return [...candidates];
  }

  const copy = [...candidates];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, limit);
}
