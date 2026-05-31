// ═══════════════════════════════════════════════════════════════════════════
// MAD Explorer v2 - Seeded RNG + deterministic landscape (pure)
//
// DETERMINISM CONTRACT: a seed fully determines the surface. The RNG draw order
// (cx, cy, neg, amp, sig per bump) and arithmetic are fixed so the same seed
// reproduces an identical landscape - across reloads, exports, shared traces,
// and a future "run the real algorithm on the same landscape" comparison.
// Do not reorder rng() calls or alter the constants without versioning the trace.
// ═══════════════════════════════════════════════════════════════════════════

import {
  W, H, BUMP_COUNT, BUMP_NEG_PROB,
  BUMP_AMP_MIN, BUMP_AMP_RANGE, BUMP_SIGMA_MIN, BUMP_SIGMA_RANGE,
} from './constants';

// mulberry32 - small fast seeded PRNG. The hex/shift constants ARE the algorithm.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function (): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Sum BUMP_COUNT random gaussian bumps over the grid, then normalize to [0,1].
export function generateLandscape(seed: number): Float64Array {
  const rng = mulberry32(seed);
  const grid = new Float64Array(W * H);

  for (let b = 0; b < BUMP_COUNT; b++) {
    const cx = rng() * W;
    const cy = rng() * H;
    const neg = rng() < BUMP_NEG_PROB;
    const amp = (neg ? -1 : 1) * (BUMP_AMP_MIN + rng() * BUMP_AMP_RANGE);
    const sig = BUMP_SIGMA_MIN + rng() * BUMP_SIGMA_RANGE;
    const inv = 1 / (2 * sig * sig);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = x - cx;
        const dy = y - cy;
        grid[y * W + x] += amp * Math.exp(-(dx * dx + dy * dy) * inv);
      }
    }
  }

  let mn = Infinity;
  let mx = -Infinity;
  for (const v of grid) {
    if (v < mn) mn = v;
    if (v > mx) mx = v;
  }
  const range = mx - mn || 1;
  for (let i = 0; i < grid.length; i++) grid[i] = (grid[i] - mn) / range;
  return grid;
}
