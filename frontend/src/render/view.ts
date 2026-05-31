// ═══════════════════════════════════════════════════════════════════════════
// MAD Explorer v2 - View transform (zoom / pan / fit / center)
// Screen px ↔ cell mapping. All view state lives in state.view {scale, ox, oy}.
// ═══════════════════════════════════════════════════════════════════════════

import { state } from '../state';
import {
  W, H, SCALE_MIN, SCALE_MAX, FIT_SCALE_MIN,
  DEFAULT_VIEW_CELLS, DEFAULT_VIEW_SCALE_MIN, DEFAULT_VIEW_SCALE_MAX,
} from '../constants';

function gridEl(): HTMLCanvasElement {
  return document.getElementById('grid') as HTMLCanvasElement;
}

export function screenToCell(sx: number, sy: number): { x: number; y: number } {
  return {
    x: Math.floor((sx - state.view.ox) / state.view.scale),
    y: Math.floor((sy - state.view.oy) / state.view.scale),
  };
}

export function fitView(): void {
  const cv = gridEl();
  const cw = cv.clientWidth;
  const ch = cv.clientHeight;
  const s = Math.max(FIT_SCALE_MIN, Math.min(cw / (W + 2), ch / (H + 2)));
  state.view.scale = s;
  state.view.ox = (cw - W * s) / 2;
  state.view.oy = (ch - H * s) / 2;
}

export function centerOnPos(): void {
  const cv = gridEl();
  state.view.ox = cv.clientWidth / 2 - (state.pos.x + 0.5) * state.view.scale;
  state.view.oy = cv.clientHeight / 2 - (state.pos.y + 0.5) * state.view.scale;
}

// Comfortable starting zoom: ~DEFAULT_VIEW_CELLS cells across, centered on pos.
export function defaultView(): void {
  const cv = gridEl();
  const cw = cv.clientWidth;
  const ch = cv.clientHeight;
  state.view.scale = Math.max(
    DEFAULT_VIEW_SCALE_MIN,
    Math.min(DEFAULT_VIEW_SCALE_MAX, Math.min(cw, ch) / DEFAULT_VIEW_CELLS),
  );
  centerOnPos();
}

// Zoom about a screen point, keeping the landscape point under it fixed.
export function zoomAt(screenX: number, screenY: number, factor: number): void {
  const beforeX = (screenX - state.view.ox) / state.view.scale;
  const beforeY = (screenY - state.view.oy) / state.view.scale;
  state.view.scale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, state.view.scale * factor));
  state.view.ox = screenX - beforeX * state.view.scale;
  state.view.oy = screenY - beforeY * state.view.scale;
}
