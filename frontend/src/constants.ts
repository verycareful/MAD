// ═══════════════════════════════════════════════════════════════════════════
// MAD Explorer v2 - Named constants (no magic numbers scattered in logic)
// ═══════════════════════════════════════════════════════════════════════════

import type { Phase } from './types';

// ─── Grid ─────────────────────────────────────────────────────────────────────
export const W = 100;
export const H = 100;

// ─── Phases ───────────────────────────────────────────────────────────────────
export const PHASE = {
  descent: 'descent',
  ascent: 'ascent',
  backtrack: 'backtrack',
} as const satisfies Record<Phase, Phase>;

export const PHASE_COLOR: Record<Phase, string> = {
  descent: '#7eb8d4',
  ascent: '#d47e7e',
  backtrack: '#b07ed4',
};

// ─── Persistence + history ────────────────────────────────────────────────────
export const LS_KEY = 'mad_explorer_v2';
export const HISTORY_CAP = 300;
export const AUTOSAVE_DEBOUNCE_MS = 250;
export const DESC_AUTOSAVE_DEBOUNCE_MS = 400;

// ─── Landscape generation (gaussian-sum) ──────────────────────────────────────
export const BUMP_COUNT = 24;
export const BUMP_NEG_PROB = 0.4;
export const BUMP_AMP_MIN = 0.5;
export const BUMP_AMP_RANGE = 1.5;
export const BUMP_SIGMA_MIN = 5;
export const BUMP_SIGMA_RANGE = 20;

// ─── View / zoom (px per cell) ────────────────────────────────────────────────
export const SCALE_MIN = 1.5;
export const SCALE_MAX = 60;
export const ZOOM_WHEEL_FACTOR = 1.12;
export const ZOOM_BTN_FACTOR = 1.2;
export const GRID_LINE_MIN_SCALE = 11; // grid lines appear once zoomed past this
export const FIT_SCALE_MIN = 2;
export const DEFAULT_VIEW_CELLS = 34; // fresh-game view spans ~this many cells
export const DEFAULT_VIEW_SCALE_MIN = 6;
export const DEFAULT_VIEW_SCALE_MAX = 28;

// ─── Interaction / timing ─────────────────────────────────────────────────────
export const DRAG_THRESHOLD_PX = 4; // >this is a pan, otherwise mouseup is a click
export const BACKTRACK_STEP_MS = 45; // animation cadence per step
export const TOAST_MS = 2200;

// ─── Neighbor grid ────────────────────────────────────────────────────────────
export const ARROW_EPSILON = 1e-4; // |Δh| below this renders as flat "-"
export const MIN_DEV = 1e-9; // floor for local deviation to avoid divide-by-zero
