import { describe, it, expect, beforeEach } from 'vitest';
import { state } from '../src/state';
import { W, H } from '../src/constants';
import { localRange, localT } from '../src/neighbor';

function setHeights(fn: (x: number, y: number) => number): void {
  const g = new Float64Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) g[y * W + x] = fn(x, y);
  }
  state.heights = g;
}

describe('localT', () => {
  it('maps the current tile to 0.5 (white midpoint)', () => {
    expect(localT(0.5, { cur: 0.5, lo: 0.4, hi: 0.6, maxDev: 0.1 })).toBeCloseTo(0.5);
  });

  it('puts lower-than-current on the blue side (<0.5) and higher on the red side (>0.5)', () => {
    const r = { cur: 0.5, lo: 0.4, hi: 0.6, maxDev: 0.1 };
    expect(localT(0.45, r)).toBeLessThan(0.5);
    expect(localT(0.55, r)).toBeGreaterThan(0.5);
  });

  it('clamps to [0, 1]', () => {
    const r = { cur: 0.5, lo: 0, hi: 1, maxDev: 0.1 };
    expect(localT(0.0, r)).toBe(0);
    expect(localT(1.0, r)).toBe(1);
  });
});

describe('localRange', () => {
  beforeEach(() => {
    state.prev = null;
  });

  it('derives cur/lo/hi/maxDev from in-bounds neighbours', () => {
    setHeights((x) => x / 100); // height increases to the east
    state.pos = { x: 50, y: 50 };
    const r = localRange();
    expect(r.cur).toBeCloseTo(0.5);
    expect(r.lo).toBeCloseTo(0.49);
    expect(r.hi).toBeCloseTo(0.51);
    expect(r.maxDev).toBeCloseTo(0.01);
  });

  it('floors maxDev so a flat patch never divides by zero', () => {
    setHeights(() => 0.3);
    state.pos = { x: 50, y: 50 };
    expect(localRange().maxDev).toBeGreaterThan(0);
  });

  it('ignores out-of-bounds neighbours at a corner', () => {
    setHeights((x, y) => (x + y) / 200);
    state.pos = { x: 0, y: 0 };
    const r = localRange();
    expect(r.cur).toBeCloseTo(0);
    expect(r.lo).toBeCloseTo(0); // current is the lowest in view
    expect(r.hi).toBeGreaterThan(0);
  });
});
