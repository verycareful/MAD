// ═══════════════════════════════════════════════════════════════════════════
// MAD Explorer v2 - Single shared state singleton + grid helpers
//
// This is a leaf module: it imports only constants/types and is imported by
// every feature module. Feature modules mutate `state` directly and then call
// commit() (see actions.ts) to re-render and autosave - the same imperative
// model as the prototype, now with explicit imports instead of globals.
// ═══════════════════════════════════════════════════════════════════════════

import { W, H, PHASE } from './constants';
import type { State } from './types';

export const state: State = {
  W,
  H,
  seed: 0,
  heights: null,
  revealed: new Set<number>(),
  pos: { x: Math.floor(W / 2), y: Math.floor(H / 2) },
  prev: null,
  path: [],
  passPoints: [],
  minima: [],
  phase: PHASE.descent,
  stepCount: 0,
  nextId: 1,
  isAnimating: false,
  description: '',
  cmapMode: 'rdbu',
  theme: 'dark',
  view: { scale: 6, ox: 0, oy: 0 },
};

// Height lookup. heights is always populated (newGame/loadAutosave) before any
// read, at boot, so the non-null assertion is safe.
export function h(x: number, y: number): number {
  return state.heights![y * W + x];
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < W && y >= 0 && y < H;
}

// Fog of war: reveal the 3×3 block around (x, y).
export function revealAround(x: number, y: number): void {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (inBounds(x + dx, y + dy)) state.revealed.add((y + dy) * W + (x + dx));
    }
  }
}
