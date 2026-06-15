import { describe, expect, it } from 'vitest';
import { comparePhash, compareHistogram, compareEmbedding, scoreMatch } from '../src/vision/fingerprint';

describe('fingerprint comparisons', () => {
  it('computes pHash similarity', () => {
    expect(comparePhash('0101', '0100')).toBeCloseTo(0.75);
  });

  it('computes histogram similarity', () => {
    expect(compareHistogram([10, 20], [10, 30])).toBeCloseTo(0.9166667, 5);
  });

  it('computes embedding similarity', () => {
    expect(compareEmbedding([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('computes final score', () => {
    expect(scoreMatch(0.5, 0.5, 0.5)).toBe(0.5);
  });
});
