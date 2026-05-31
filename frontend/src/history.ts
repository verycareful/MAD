// ═══════════════════════════════════════════════════════════════════════════
// MAD Explorer v2 - Undo/redo history (snapshot-based)
//
// Snapshots capture everything except `heights` (regenerable from seed). A whole
// backtrack animation is wrapped as a single undo step by its caller calling
// pushUndo() once before the animation begins.
// ═══════════════════════════════════════════════════════════════════════════

import { state } from './state';
import { HISTORY_CAP } from './constants';
import type { Snapshot } from './types';

interface History {
  undo: Snapshot[];
  redo: Snapshot[];
}

export const HISTORY: History = { undo: [], redo: [] };

export function snapshot(): Snapshot {
  return {
    revealed: Array.from(state.revealed),
    pos: { ...state.pos },
    prev: state.prev ? { ...state.prev } : null,
    path: state.path.map((p) => ({ ...p })),
    passPoints: state.passPoints.map((p) => ({ ...p })),
    minima: state.minima.map((m) => ({ ...m })),
    phase: state.phase,
    stepCount: state.stepCount,
    nextId: state.nextId,
    description: state.description,
  };
}

export function restore(snap: Snapshot): void {
  state.revealed = new Set(snap.revealed);
  state.pos = { ...snap.pos };
  state.prev = snap.prev ? { ...snap.prev } : null;
  state.path = snap.path.map((p) => ({ ...p }));
  state.passPoints = snap.passPoints.map((p) => ({ ...p }));
  state.minima = snap.minima.map((m) => ({ ...m }));
  state.phase = snap.phase;
  state.stepCount = snap.stepCount;
  state.nextId = snap.nextId;
  state.description = snap.description;
}

// Call before each mutating action; clears the redo stack and caps the undo stack.
export function pushUndo(): void {
  HISTORY.undo.push(snapshot());
  if (HISTORY.undo.length > HISTORY_CAP) HISTORY.undo.shift();
  HISTORY.redo.length = 0;
}

export function undo(): boolean {
  if (!HISTORY.undo.length || state.isAnimating) return false;
  HISTORY.redo.push(snapshot());
  restore(HISTORY.undo.pop()!);
  return true;
}

export function redo(): boolean {
  if (!HISTORY.redo.length || state.isAnimating) return false;
  HISTORY.undo.push(snapshot());
  restore(HISTORY.redo.pop()!);
  return true;
}

export function clearHistory(): void {
  HISTORY.undo.length = 0;
  HISTORY.redo.length = 0;
}
