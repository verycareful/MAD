// ═══════════════════════════════════════════════════════════════════════════
// MAD Explorer v2 - localStorage autosave/restore
//
// The landscape is NOT stored - only the seed plus a state snapshot. On load the
// landscape is regenerated from the seed, keeping storage tiny and deterministic.
// ═══════════════════════════════════════════════════════════════════════════

import { state } from './state';
import { generateLandscape } from './landscape';
import { snapshot, restore } from './history';
import { LS_KEY } from './constants';
import type { AutosavePayload } from './types';

export function autosave(): void {
  try {
    const payload: AutosavePayload = {
      seed: state.seed,
      cmapMode: state.cmapMode,
      theme: state.theme,
      view: state.view,
      state: snapshot(),
    };
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / unavailable storage */
  }
}

export function loadAutosave(): boolean {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw) as AutosavePayload;
    state.seed = d.seed >>> 0;
    state.heights = generateLandscape(state.seed);
    if (d.cmapMode) state.cmapMode = d.cmapMode;
    if (d.theme) state.theme = d.theme;
    if (d.view) state.view = d.view;
    restore(d.state);
    return true;
  } catch {
    return false;
  }
}
