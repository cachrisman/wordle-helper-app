import { describe, expect, it } from 'vitest';
import { computeFeedback } from './feedback';

describe('computeFeedback', () => {
  it('handles duplicate letters with green pass before yellow pass', () => {
    expect(computeFeedback('allee', 'apple')).toEqual([2, 1, 0, 0, 2]);
  });

  it('limits yellow count by remaining unmatched letters', () => {
    expect(computeFeedback('sassy', 'class')).toEqual([1, 1, 0, 2, 0]);
  });

  it('keeps extra repeated letters grey when solution has fewer copies', () => {
    expect(computeFeedback('array', 'cigar')).toEqual([0, 1, 0, 2, 0]);
  });
});
