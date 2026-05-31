// ═══════════════════════════════════════════════════════════════════════════
// MAD Explorer v2 - Input: click-to-move, drag-to-pan, wheel-zoom, keyboard
// ═══════════════════════════════════════════════════════════════════════════

import { state, inBounds } from './state';
import { move, markMinimum, addPassPoint, backtrack, setPhase, commit } from './actions';
import { undo, redo } from './history';
import { screenToCell, zoomAt, fitView } from './render/view';
import { render } from './render/map';
import { autosave } from './persistence';
import { toast } from './toast';
import { PHASE, ZOOM_WHEEL_FACTOR, ZOOM_BTN_FACTOR, DRAG_THRESHOLD_PX } from './constants';

function gridEl(): HTMLCanvasElement {
  return document.getElementById('grid') as HTMLCanvasElement;
}

// 8-direction key map (QWE/ASD/ZXC + arrows). Undefined for any other key.
const KEY_MAP: Record<string, [number, number] | undefined> = {
  q: [-1, -1], w: [0, -1], e: [1, -1],
  a: [-1, 0], d: [1, 0],
  z: [-1, 1], x: [0, 1], c: [1, 1],
  arrowup: [0, -1], arrowdown: [0, 1], arrowleft: [-1, 0], arrowright: [1, 0],
};

export function setupCanvas(): void {
  const cv = gridEl();
  let down: { x: number; y: number; ox: number; oy: number } | null = null;
  let moved = false;
  let panning = false;

  cv.addEventListener('mousedown', (e) => {
    down = { x: e.clientX, y: e.clientY, ox: state.view.ox, oy: state.view.oy };
    moved = false;
    panning = false;
  });

  window.addEventListener('mousemove', (e) => {
    if (!down) return;
    const ddx = e.clientX - down.x;
    const ddy = e.clientY - down.y;
    if (!panning && Math.hypot(ddx, ddy) > DRAG_THRESHOLD_PX) panning = true;
    if (panning) {
      moved = true;
      state.view.ox = down.ox + ddx;
      state.view.oy = down.oy + ddy;
      render();
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (!down) return;
    const wasPan = moved;
    down = null;
    if (wasPan) {
      autosave();
      return;
    }
    if (state.isAnimating) return;
    const rect = cv.getBoundingClientRect();
    const { x: gx, y: gy } = screenToCell(e.clientX - rect.left, e.clientY - rect.top);
    const dx = gx - state.pos.x;
    const dy = gy - state.pos.y;
    if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx || dy)) {
      move(dx, dy);
      return;
    }
    const ppIdx = state.passPoints.findIndex((pp) => pp.x === gx && pp.y === gy);
    if (ppIdx !== -1) {
      backtrack(ppIdx);
      return;
    }
    if (inBounds(gx, gy)) toast('Move to adjacent cells only (or click a pass point)');
  });

  cv.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const rect = cv.getBoundingClientRect();
      zoomAt(
        e.clientX - rect.left,
        e.clientY - rect.top,
        e.deltaY < 0 ? ZOOM_WHEEL_FACTOR : 1 / ZOOM_WHEEL_FACTOR,
      );
      render();
      autosave();
    },
    { passive: false },
  );
}

export function setupKeyboard(): void {
  document.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === 'z') {
      e.preventDefault();
      if (e.shiftKey ? redo() : undo()) commit();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && k === 'y') {
      e.preventDefault();
      if (redo()) commit();
      return;
    }

    const dir = KEY_MAP[k];
    if (dir) {
      e.preventDefault();
      move(dir[0], dir[1]);
      return;
    }

    if (k === 'm') markMinimum();
    else if (k === 'p') addPassPoint();
    else if (k === 'b') backtrack();
    else if (k === '1') setPhase(PHASE.descent);
    else if (k === '2') setPhase(PHASE.ascent);
    else if (k === '3') setPhase(PHASE.backtrack);
    else if (k === 'f') {
      fitView();
      render();
    } else if (k === '+' || k === '=') {
      const cv = gridEl();
      zoomAt(cv.clientWidth / 2, cv.clientHeight / 2, ZOOM_BTN_FACTOR);
      render();
    } else if (k === '-' || k === '_') {
      const cv = gridEl();
      zoomAt(cv.clientWidth / 2, cv.clientHeight / 2, 1 / ZOOM_BTN_FACTOR);
      render();
    }
  });
}
