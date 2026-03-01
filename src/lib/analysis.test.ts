import { describe, expect, it } from 'vitest';
import { computeLetterStats, scoreGuessInfoGain } from './analysis';

describe('computeLetterStats', () => {
  it('supports optional weighted frequencies', () => {
    const words = ['cigar', 'cider', 'canny'];
    const weights = {
      cigar: 0.7,
      cider: 0.2,
      canny: 0.1
    };

    const stats = computeLetterStats(words, weights);
    const cEntry = stats.presenceFrequency.find((entry) => entry.letter === 'c');
    const yEntry = stats.presenceFrequency.find((entry) => entry.letter === 'y');

    expect(cEntry?.ratio).toBeCloseTo(1, 6);
    expect(yEntry?.ratio).toBeCloseTo(0.1, 6);
  });
});

describe('scoreGuessInfoGain', () => {
  it('returns zero information when only one candidate remains', () => {
    const candidates = ['cigar'];
    const weights = { cigar: 1 };
    const score = scoreGuessInfoGain('cigar', candidates, weights);
    expect(score.bits).toBeCloseTo(0, 6);
    expect(score.expectedRemaining).toBeCloseTo(1, 6);
  });

  it('gives higher info to discriminative guess than useless guess', () => {
    const candidates = ['cigar', 'cider'];
    const weights = { cigar: 0.5, cider: 0.5 };

    const discriminative = scoreGuessInfoGain('cigar', candidates, weights);
    const weak = scoreGuessInfoGain('mummy', candidates, weights);

    expect(discriminative.bits).toBeGreaterThan(weak.bits);
  });
});
