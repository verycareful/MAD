// ═══════════════════════════════════════════════════════════════════════════
// MAD Explorer v2 - UI wiring (header + sidebar controls, session I/O)
// ═══════════════════════════════════════════════════════════════════════════

import { state } from './state';
import {
  setPhase, setCmapMode, setTheme,
  markMinimum, addPassPoint, backtrack, commit,
} from './actions';
import { undo, redo } from './history';
import { zoomAt, fitView, defaultView } from './render/view';
import { render, markBaseDirty } from './render/map';
import { newGame } from './game';
import { exportTrace, importTrace } from './trace';
import { exportPNG } from './png';
import { autosave } from './persistence';
import { toast } from './toast';
import { ZOOM_BTN_FACTOR, DESC_AUTOSAVE_DEBOUNCE_MS } from './constants';
import type { Phase, CmapMode, Theme } from './types';

let descTimer: ReturnType<typeof setTimeout> | undefined;

function byId(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function gridEl(): HTMLCanvasElement {
  return document.getElementById('grid') as HTMLCanvasElement;
}

export function wireUI(): void {
  // Segmented toggles
  document.querySelectorAll<HTMLElement>('.phase-btn').forEach((b) =>
    b.addEventListener('click', () => setPhase(b.dataset.phase as Phase)),
  );
  document.querySelectorAll<HTMLElement>('.cmap-btn').forEach((b) =>
    b.addEventListener('click', () => setCmapMode(b.dataset.cmap as CmapMode)),
  );
  document.querySelectorAll<HTMLElement>('.theme-btn').forEach((b) =>
    b.addEventListener('click', () => setTheme(b.dataset.theme as Theme)),
  );

  // Actions
  byId('btn-mark').addEventListener('click', markMinimum);
  byId('btn-pass').addEventListener('click', addPassPoint);
  byId('btn-back').addEventListener('click', () => backtrack());

  // Undo / redo
  byId('btn-undo').addEventListener('click', () => {
    if (undo()) commit();
  });
  byId('btn-redo').addEventListener('click', () => {
    if (redo()) commit();
  });

  // Zoom
  byId('btn-zoom-in').addEventListener('click', () => {
    const cv = gridEl();
    zoomAt(cv.clientWidth / 2, cv.clientHeight / 2, ZOOM_BTN_FACTOR);
    render();
  });
  byId('btn-zoom-out').addEventListener('click', () => {
    const cv = gridEl();
    zoomAt(cv.clientWidth / 2, cv.clientHeight / 2, 1 / ZOOM_BTN_FACTOR);
    render();
  });
  byId('btn-fit').addEventListener('click', () => {
    fitView();
    render();
  });

  // New / seed
  byId('btn-new').addEventListener('click', () => {
    if (!confirm('Start a new random landscape? (current session is exported-only after this)')) return;
    newGame();
    defaultView();
    commit();
  });
  byId('btn-seed').addEventListener('click', () => {
    const s = prompt('Load landscape by seed number:', String(state.seed));
    if (s === null) return;
    newGame(parseInt(s, 10));
    defaultView();
    commit();
  });

  // Session I/O
  byId('btn-export').addEventListener('click', exportTrace);
  byId('btn-png').addEventListener('click', exportPNG);
  byId('btn-import').addEventListener('click', () => byId('file-input').click());
  (byId('file-input') as HTMLInputElement).addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        importTrace(JSON.parse(String(r.result)));
        markBaseDirty();
        fitView();
        commit();
        toast('Trace imported');
      } catch (err) {
        toast('Import failed: ' + (err as Error).message);
      }
    };
    r.readAsText(f);
    input.value = '';
  });

  // Session description (debounced autosave)
  const desc = byId('session-desc') as HTMLTextAreaElement;
  desc.value = state.description;
  desc.addEventListener('input', () => {
    state.description = desc.value;
    clearTimeout(descTimer);
    descTimer = setTimeout(autosave, DESC_AUTOSAVE_DEBOUNCE_MS);
  });

  window.addEventListener('resize', () => {
    render();
  });
}
