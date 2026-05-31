// ═══════════════════════════════════════════════════════════════════════════
// MAD Explorer v2 - New game (reset state + generate landscape from seed)
// ═══════════════════════════════════════════════════════════════════════════

import { state, revealAround } from './state';
import { generateLandscape } from './landscape';
import { clearHistory } from './history';
import { W, H, PHASE } from './constants';

// seed omitted / NaN → random seed; otherwise the given (unsigned) seed.
export function newGame(seed?: number): void {
  state.seed =
    seed === undefined || seed === null || Number.isNaN(seed)
      ? (Math.random() * 0xffffffff) >>> 0
      : seed >>> 0;
  state.heights = generateLandscape(state.seed);
  state.revealed = new Set();
  state.pos = { x: Math.floor(W / 2), y: Math.floor(H / 2) };
  state.prev = null;
  state.path = [{ ...state.pos, phase: PHASE.descent }];
  state.passPoints = [];
  state.minima = [];
  state.phase = PHASE.descent;
  state.stepCount = 0;
  state.nextId = 1;
  state.isAnimating = false;
  state.description = '';
  clearHistory();
  revealAround(state.pos.x, state.pos.y);
}
