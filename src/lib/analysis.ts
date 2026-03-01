import { GuessInfoGainScore, LetterStats } from '../types';
import { computeFeedback, encodePattern } from './feedback';

export interface HighValueLetter {
  letter: string;
  score: number;
  why: string;
}

function getWeight(word: string, weights?: Record<string, number>): number {
  return Math.max(0, weights?.[word] ?? 0);
}

function entropyFromProbabilities(probabilities: number[]): number {
  let entropy = 0;
  probabilities.forEach((value) => {
    if (value > 0) {
      entropy -= value * Math.log2(value);
    }
  });
  return entropy;
}

function normalizedWeights(words: string[], weights?: Record<string, number>): Record<string, number> {
  const normalized: Record<string, number> = {};
  if (words.length === 0) {
    return normalized;
  }

  let total = 0;
  words.forEach((word) => {
    const value = getWeight(word, weights);
    normalized[word] = value;
    total += value;
  });

  if (total <= 0) {
    const uniform = 1 / words.length;
    words.forEach((word) => {
      normalized[word] = uniform;
    });
    return normalized;
  }

  words.forEach((word) => {
    normalized[word] /= total;
  });

  return normalized;
}

export function computeLetterStats(
  remainingWords: string[],
  weights?: Record<string, number>
): LetterStats {
  const normalized = normalizedWeights(remainingWords, weights);
  const overallCounts: Record<string, number> = {};
  const presenceCounts: Record<string, number> = {};
  const positionCounts = Array.from({ length: 5 }, () => ({} as Record<string, number>));
  let totalWeight = 0;

  remainingWords.forEach((word) => {
    const weight = normalized[word] ?? 0;
    totalWeight += weight;
    const uniqueLetters = new Set(word);

    uniqueLetters.forEach((letter) => {
      presenceCounts[letter] = (presenceCounts[letter] ?? 0) + weight;
    });

    word.split('').forEach((letter, idx) => {
      overallCounts[letter] = (overallCounts[letter] ?? 0) + weight;
      positionCounts[idx][letter] = (positionCounts[idx][letter] ?? 0) + weight;
    });
  });

  const buildEntries = (counts: Record<string, number>, denominator: number) =>
    Object.entries(counts)
      .map(([letter, score]) => {
        const positionOrder = positionCounts
          .map((posCounts, idx) => ({
            idx,
            value: (posCounts[letter] ?? 0) / Math.max(totalWeight, 1e-10)
          }))
          .sort((a, b) => b.value - a.value);

        return {
          letter,
          score,
          ratio: denominator > 0 ? score / denominator : 0,
          topPositions: positionOrder.slice(0, 2).map((entry) => entry.idx)
        };
      })
      .sort((a, b) => b.score - a.score || a.letter.localeCompare(b.letter));

  return {
    overallFrequency: buildEntries(overallCounts, totalWeight * 5),
    byPosition: positionCounts.map((counts) => buildEntries(counts, totalWeight)),
    presenceFrequency: buildEntries(presenceCounts, totalWeight),
    totalWeight
  };
}

export function scoreGuessInfoGain(
  guess: string,
  remainingCandidates: string[],
  weights: Record<string, number>,
  hardMode = false
): GuessInfoGainScore {
  if (!guess || guess.length !== 5 || remainingCandidates.length === 0) {
    return { guess, bits: 0, expectedRemaining: 0, meter: hardMode ? 0 : 0 };
  }

  const normalized = normalizedWeights(remainingCandidates, weights);
  const priorDistribution = remainingCandidates.map((word) => normalized[word] ?? 0);
  const priorEntropy = entropyFromProbabilities(priorDistribution);

  const patternBuckets = new Map<string, { mass: number; members: number; probs: number[] }>();
  remainingCandidates.forEach((solution) => {
    const probability = normalized[solution] ?? 0;
    const key = encodePattern(computeFeedback(guess, solution));
    const bucket = patternBuckets.get(key) ?? { mass: 0, members: 0, probs: [] };
    bucket.mass += probability;
    bucket.members += 1;
    bucket.probs.push(probability);
    patternBuckets.set(key, bucket);
  });

  let expectedPosteriorEntropy = 0;
  let expectedRemaining = 0;
  patternBuckets.forEach((bucket) => {
    if (bucket.mass <= 0) {
      return;
    }
    const posteriorProbabilities = bucket.probs.map((value) => value / bucket.mass);
    const posteriorEntropy = entropyFromProbabilities(posteriorProbabilities);
    expectedPosteriorEntropy += bucket.mass * posteriorEntropy;
    expectedRemaining += bucket.mass * bucket.members;
  });

  return {
    guess,
    bits: Math.max(0, priorEntropy - expectedPosteriorEntropy),
    expectedRemaining,
    meter: 0
  };
}

function binaryEntropy(probability: number): number {
  if (probability <= 0 || probability >= 1) {
    return 0;
  }
  return -probability * Math.log2(probability) - (1 - probability) * Math.log2(1 - probability);
}

export function suggestHighValueLetters(
  remainingCandidates: string[],
  weights: Record<string, number>,
  limit = 8
): HighValueLetter[] {
  if (remainingCandidates.length === 0) {
    return [];
  }

  const normalized = normalizedWeights(remainingCandidates, weights);
  const letterProb: Record<string, number> = {};
  const pairProb: Record<string, Record<string, number>> = {};

  remainingCandidates.forEach((word) => {
    const p = normalized[word] ?? 0;
    const letters = [...new Set(word.split(''))];
    letters.forEach((letter) => {
      letterProb[letter] = (letterProb[letter] ?? 0) + p;
      pairProb[letter] ??= {};
      letters.forEach((other) => {
        pairProb[letter][other] = (pairProb[letter][other] ?? 0) + p;
      });
    });
  });

  const candidates = Object.entries(letterProb)
    .map(([letter, probability]) => ({
      letter,
      baseScore: binaryEntropy(probability),
      probability
    }))
    .sort((a, b) => b.baseScore - a.baseScore);

  const selected: HighValueLetter[] = [];
  const selectedLetters: string[] = [];

  while (selected.length < limit && candidates.length > 0) {
    let bestIdx = -1;
    let bestScore = -1;

    candidates.forEach((candidate, idx) => {
      let redundancyPenalty = 0;
      selectedLetters.forEach((chosen) => {
        const overlap = (pairProb[candidate.letter]?.[chosen] ?? 0) / Math.max(candidate.probability, 1e-10);
        redundancyPenalty = Math.max(redundancyPenalty, overlap);
      });
      const adjusted = candidate.baseScore * (1 - 0.65 * redundancyPenalty);
      if (adjusted > bestScore) {
        bestScore = adjusted;
        bestIdx = idx;
      }
    });

    if (bestIdx < 0) {
      break;
    }

    const picked = candidates.splice(bestIdx, 1)[0];
    selectedLetters.push(picked.letter);
    selected.push({
      letter: picked.letter,
      score: bestScore,
      why: `${picked.letter.toUpperCase()} appears in about ${Math.round(
        picked.probability * 100
      )}% of likely solutions.`
    });
  }

  return selected;
}

export function rankExplorationGuesses(
  guessPool: string[],
  remainingCandidates: string[],
  weights: Record<string, number>,
  hardMode: boolean,
  limit = 8
): GuessInfoGainScore[] {
  if (remainingCandidates.length === 0 || guessPool.length === 0) {
    return [];
  }

  const scores = guessPool.map((guess) =>
    scoreGuessInfoGain(guess, remainingCandidates, weights, hardMode)
  );
  scores.sort((a, b) => b.bits - a.bits || a.expectedRemaining - b.expectedRemaining);

  const maxBits = Math.max(...scores.map((score) => score.bits), 0.001);
  scores.forEach((score) => {
    score.meter = Math.round((score.bits / maxBits) * 100);
  });

  return scores.slice(0, limit);
}

export function entropyBits(words: string[], weights: Record<string, number>): number {
  const normalized = normalizedWeights(words, weights);
  return entropyFromProbabilities(words.map((word) => normalized[word] ?? 0));
}
