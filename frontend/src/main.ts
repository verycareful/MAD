// ═══════════════════════════════════════════════════════════════════════════
// MAD Explorer v2 - Boot
// Load order is enforced by the module graph: core → render → neighbor → app.
// ═══════════════════════════════════════════════════════════════════════════

import './style.css';
import { state } from './state';
import { loadAutosave } from './persistence';
import { newGame } from './game';
import { setTheme, setPhase, commit } from './actions';
import { markBaseDirty } from './render/map';
import { defaultView } from './render/view';
import { setupCanvas, setupKeyboard } from './input';
import { wireUI } from './ui';

function boot(): void {
  const restored = loadAutosave();
  if (!restored) newGame();

  document.querySelectorAll<HTMLElement>('.cmap-btn').forEach((b) =>
    b.classList.toggle('active', b.dataset.cmap === state.cmapMode),
  );
  setTheme(state.theme);
  setPhase(state.phase);
  markBaseDirty();

  setupCanvas();
  setupKeyboard();
  wireUI();

  if (!restored) defaultView();
  commit();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
