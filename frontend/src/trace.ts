// ═══════════════════════════════════════════════════════════════════════════
// MAD Explorer v2 - Intent trace: build / export / import (the primary output)
//
// The export DEMONSTRATES intent to an agent/developer: the ordered, phase-tagged
// decisions a human made, with notes explaining the "why". Import regenerates the
// landscape from the seed and restores path, markers, notes, and description.
// ═══════════════════════════════════════════════════════════════════════════

import { state, h, revealAround } from './state';
import { generateLandscape } from './landscape';
import { clearHistory } from './history';
import { W, H, PHASE } from './constants';
import type { Trace, TraceEvent, TracePhaseRun } from './types';

export function buildTrace(): Trace {
  // Compress the path into consecutive same-phase runs for readability.
  const runs: TracePhaseRun[] = [];
  for (const p of state.path) {
    const last = runs[runs.length - 1];
    if (last && last.phase === p.phase) last.points.push([p.x, p.y]);
    else runs.push({ phase: p.phase, points: [[p.x, p.y]] });
  }

  // Ordered narrative of decision events.
  const events: TraceEvent[] = [];
  state.passPoints.forEach((pp, i) =>
    events.push({ kind: 'pass_point', index: i + 1, at: [pp.x, pp.y], note: pp.note || '' }),
  );
  state.minima.forEach((m, i) =>
    events.push({
      kind: 'minimum',
      index: i + 1,
      at: [m.x, m.y],
      height: +m.h.toFixed(4),
      note: m.note || '',
    }),
  );

  return {
    format: 'mad-explorer-trace',
    version: 2,
    createdAt: new Date().toISOString(),
    description: state.description,
    landscape: {
      generator: 'gaussian-sum',
      width: W,
      height: H,
      seed: state.seed,
      note: 'Regenerate identical landscape via mulberry32(seed) + 24 gaussian bumps.',
    },
    start: [state.path[0].x, state.path[0].y],
    finish: [state.pos.x, state.pos.y],
    stepCount: state.stepCount,
    phaseRuns: runs,
    passPoints: state.passPoints.map((p, i) => ({
      index: i + 1,
      at: [p.x, p.y],
      height: +h(p.x, p.y).toFixed(4),
      note: p.note || '',
    })),
    minima: state.minima.map((m, i) => ({
      index: i + 1,
      at: [m.x, m.y],
      height: +m.h.toFixed(4),
      note: m.note || '',
    })),
    events,
    fullPath: state.path.map((p) => [p.x, p.y, p.phase[0]]),
  };
}

export function download(filename: string, text: string, mime = 'application/json'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportTrace(): void {
  download(`mad-trace-seed${state.seed}.json`, JSON.stringify(buildTrace(), null, 2));
}

// Import a previously-exported trace. `obj` is untrusted parsed JSON.
export function importTrace(obj: unknown): void {
  const t = obj as Trace | null;
  if (!t || t.format !== 'mad-explorer-trace') throw new Error('Not a MAD Explorer trace.');

  state.seed = t.landscape.seed >>> 0;
  state.heights = generateLandscape(state.seed);
  state.revealed = new Set();

  state.path = (t.fullPath || []).map(([x, y, p]) => ({
    x,
    y,
    phase: p === 'a' ? PHASE.ascent : p === 'b' ? PHASE.backtrack : PHASE.descent,
  }));
  if (!state.path.length) state.path = [{ x: t.start[0], y: t.start[1], phase: PHASE.descent }];

  for (const p of state.path) revealAround(p.x, p.y);

  const last = state.path[state.path.length - 1];
  state.pos = { x: last.x, y: last.y };
  state.prev =
    state.path.length > 1
      ? { x: state.path[state.path.length - 2].x, y: state.path[state.path.length - 2].y }
      : null;
  state.phase = last.phase;
  state.stepCount = t.stepCount || state.path.length - 1;
  state.description = t.description || '';

  state.passPoints = (t.passPoints || []).map((p, i) => ({
    x: p.at[0],
    y: p.at[1],
    pathLen: state.path.length,
    id: i + 1,
    note: p.note || '',
  }));
  state.minima = (t.minima || []).map((m, i) => ({
    x: m.at[0],
    y: m.at[1],
    h: m.height ?? h(m.at[0], m.at[1]),
    id: 1000 + i,
    note: m.note || '',
  }));

  state.nextId = state.passPoints.length + state.minima.length + 1;
  state.isAnimating = false;
  clearHistory();
}
