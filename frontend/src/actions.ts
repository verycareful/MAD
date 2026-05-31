// ═══════════════════════════════════════════════════════════════════════════
// MAD Explorer v2 - Actions controller (move / mark / pass / backtrack / modes)
//
// The single update loop: an action mutates `state`, then commit() re-renders the
// map + sidebar and schedules a debounced autosave. pushUndo() is called before
// each mutating action (a whole backtrack animation is one undo step).
// ═══════════════════════════════════════════════════════════════════════════

import { state, h, inBounds, revealAround } from './state';
import { pushUndo } from './history';
import { render, markBaseDirty, resetStripePattern } from './render/map';
import { updateSidebar } from './sidebar';
import { autosave } from './persistence';
import { toast } from './toast';
import { PHASE, BACKTRACK_STEP_MS, AUTOSAVE_DEBOUNCE_MS } from './constants';
import type { Phase, CmapMode, Theme } from './types';

let saveTimer: ReturnType<typeof setTimeout> | undefined;

export function commit(): void {
  render();
  updateSidebar();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(autosave, AUTOSAVE_DEBOUNCE_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Movement ─────────────────────────────────────────────────────────────────
export function move(dx: number, dy: number): void {
  if (state.isAnimating) return;
  const nx = state.pos.x + dx;
  const ny = state.pos.y + dy;
  if (!inBounds(nx, ny)) {
    toast('Edge of world!');
    return;
  }
  pushUndo();
  state.prev = { ...state.pos };
  state.pos = { x: nx, y: ny };
  revealAround(nx, ny);
  markBaseDirty();
  state.path.push({ ...state.pos, phase: state.phase });
  state.stepCount++;
  commit();
}

// ─── Markers ──────────────────────────────────────────────────────────────────
export function markMinimum(): void {
  if (state.isAnimating) return;
  if (state.minima.some((m) => m.x === state.pos.x && m.y === state.pos.y)) {
    toast('Already marked here!');
    return;
  }
  pushUndo();
  const ht = h(state.pos.x, state.pos.y);
  state.minima.push({ x: state.pos.x, y: state.pos.y, h: ht, id: state.nextId++, note: '' });
  toast(`★ Minimum #${state.minima.length}  (h = ${ht.toFixed(4)})`);
  commit();
}

export function addPassPoint(): void {
  if (state.isAnimating) return;
  if (state.passPoints.some((p) => p.x === state.pos.x && p.y === state.pos.y)) {
    toast('Pass point already here!');
    return;
  }
  pushUndo();
  state.passPoints.push({
    x: state.pos.x,
    y: state.pos.y,
    pathLen: state.path.length,
    id: state.nextId++,
    note: '',
  });
  toast(`◉ Pass point #${state.passPoints.length} added`);
  commit();
}

// ─── Backtrack (animated walk back along the recorded path) ────────────────────
export async function backtrack(ppIdx?: number): Promise<void> {
  if (state.isAnimating) return;
  if (!state.passPoints.length) {
    toast('No pass points!');
    return;
  }
  const idx = ppIdx !== undefined ? ppIdx : state.passPoints.length - 1;
  const target = state.passPoints[idx];
  if (state.pos.x === target.x && state.pos.y === target.y) {
    toast('Already at this pass point!');
    return;
  }

  pushUndo();
  state.isAnimating = true;
  const stepsAfter = state.path.slice(target.pathLen);
  const backPath = [...stepsAfter].reverse();
  for (const step of backPath) {
    state.prev = { ...state.pos };
    state.pos = { x: step.x, y: step.y };
    state.path.push({ ...state.pos, phase: PHASE.backtrack });
    state.stepCount++;
    render();
    updateSidebar();
    await sleep(BACKTRACK_STEP_MS);
  }
  state.prev = { ...state.pos };
  state.pos = { x: target.x, y: target.y };
  state.path.push({ ...state.pos, phase: PHASE.backtrack });
  state.isAnimating = false;
  toast(`↩ Backtracked to pass point #${idx + 1}`);
  commit();
}

// ─── Modes ──────────────────────────────────────────────────────────────────--
export function setPhase(p: Phase): void {
  state.phase = p;
  document
    .querySelectorAll<HTMLElement>('.phase-btn')
    .forEach((b) => b.classList.toggle('active', b.dataset.phase === p));
  autosave();
}

export function setCmapMode(mode: CmapMode): void {
  state.cmapMode = mode;
  document
    .querySelectorAll<HTMLElement>('.cmap-btn')
    .forEach((b) => b.classList.toggle('active', b.dataset.cmap === mode));
  markBaseDirty();
  commit();
}

export function setTheme(mode: Theme): void {
  state.theme = mode;
  document.documentElement.setAttribute('data-theme', mode);
  document
    .querySelectorAll<HTMLElement>('.theme-btn')
    .forEach((b) => b.classList.toggle('active', b.dataset.theme === mode));
  resetStripePattern(); // stripe colors are theme-dependent
  markBaseDirty();
  commit();
}

// ─── Notes ──────────────────────────────────────────────────────────────────--
export function editNote(kind: 'pp' | 'min', idx: number): void {
  const arr = kind === 'pp' ? state.passPoints : state.minima;
  const item = arr[idx];
  const label = kind === 'pp' ? `Pass point #${idx + 1}` : `Minimum #${idx + 1}`;
  const note = prompt(
    `Note for ${label} @ (${item.x}, ${item.y}):\nWhy does this matter? What's the intent here?`,
    item.note || '',
  );
  if (note === null) return;
  pushUndo();
  item.note = note.trim();
  commit();
}
