import { describe, it, expect } from 'vitest';
import { mulberry32, generateLandscape } from '../src/landscape';
import { W, H } from '../src/constants';

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 8; i++) expect(a()).toBe(b());
  });
  it('produces values in [0, 1)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('diverges across seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe('generateLandscape - determinism contract', () => {
  it('has length W*H', () => {
    expect(generateLandscape(123).length).toBe(W * H);
  });

  it('normalizes to [0, 1] with both extremes present', () => {
    const g = generateLandscape(123);
    let mn = Infinity;
    let mx = -Infinity;
    for (const v of g) {
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    expect(mn).toBeCloseTo(0, 12);
    expect(mx).toBeCloseTo(1, 12);
  });

  it('reproduces an identical surface from the same seed', () => {
    const g1 = generateLandscape(123);
    const g2 = generateLandscape(123);
    expect(Array.from(g1)).toEqual(Array.from(g2));
  });

  it('produces different surfaces for different seeds', () => {
    const a = generateLandscape(1);
    const b = generateLandscape(2);
    let identical = true;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        identical = false;
        break;
      }
    }
    expect(identical).toBe(false);
  });
});
