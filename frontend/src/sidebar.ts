// ═══════════════════════════════════════════════════════════════════════════
// MAD Explorer v2 - Sidebar (position, neighbor host, pass-point + minima lists)
// ═══════════════════════════════════════════════════════════════════════════

import { state, h } from './state';
import { cmapCss } from './colormap';
import { HISTORY } from './history';
import { backtrack, editNote } from './actions';
import { buildNeighbor } from './neighbor';

export function updateSidebar(): void {
  const ht = h(state.pos.x, state.pos.y);
  document.getElementById('pos-display')!.textContent = `(${state.pos.x}, ${state.pos.y})`;
  document.getElementById('height-val')!.textContent = `h = ${ht.toFixed(4)}`;
  document.getElementById('step-count')!.textContent = `Steps: ${state.stepCount}`;
  const bar = document.getElementById('height-bar')!;
  bar.style.width = `${ht * 100}%`;
  bar.style.background = cmapCss(ht, state.cmapMode);

  (document.getElementById('btn-undo') as HTMLButtonElement).disabled = !HISTORY.undo.length;
  (document.getElementById('btn-redo') as HTMLButtonElement).disabled = !HISTORY.redo.length;
  document.getElementById('seed-label')!.textContent = `seed ${state.seed}`;

  buildNeighbor();
  buildPassList();
  buildMinList();
}

function buildPassList(): void {
  const c = document.getElementById('pp-list')!;
  document.getElementById('pp-count')!.textContent = String(state.passPoints.length);
  if (!state.passPoints.length) {
    c.innerHTML = '<div class="empty">None yet</div>';
    return;
  }
  c.innerHTML = '';
  state.passPoints.forEach((pp, i) => {
    const el = document.createElement('div');
    el.className = 'list-item' + (pp.x === state.pos.x && pp.y === state.pos.y ? ' here' : '');
    el.innerHTML =
      `<div class="pp-dot"></div>` +
      `<span>#${i + 1} (${pp.x},${pp.y})</span>` +
      `<span class="ml-auto">h=${h(pp.x, pp.y).toFixed(4)}</span>` +
      `<button class="note-btn" title="${pp.note ? 'Edit note' : 'Add note'}">${pp.note ? '✎' : '+'}</button>`;
    el.querySelector('span')!.addEventListener('click', () => backtrack(i));
    el.querySelector('.pp-dot')!.addEventListener('click', () => backtrack(i));
    el.querySelector('.note-btn')!.addEventListener('click', (e) => {
      e.stopPropagation();
      editNote('pp', i);
    });
    if (pp.note) {
      const n = document.createElement('div');
      n.className = 'note-text';
      n.textContent = pp.note;
      const wrap = document.createElement('div');
      wrap.className = 'list-wrap';
      wrap.appendChild(el);
      wrap.appendChild(n);
      c.appendChild(wrap);
      return;
    }
    c.appendChild(el);
  });
}

function buildMinList(): void {
  const c = document.getElementById('min-list')!;
  document.getElementById('min-count')!.textContent = String(state.minima.length);
  if (!state.minima.length) {
    c.innerHTML = '<div class="empty">None yet</div>';
    return;
  }
  c.innerHTML = '';
  state.minima.forEach((m, i) => {
    const el = document.createElement('div');
    el.className = 'list-item min-item';
    el.innerHTML =
      `<span class="min-star">★</span>` +
      `<span>#${i + 1} (${m.x},${m.y})</span>` +
      `<span class="ml-auto" style="color:var(--minimum)">h=${m.h.toFixed(4)}</span>` +
      `<button class="note-btn">${m.note ? '✎' : '+'}</button>`;
    el.querySelector('.note-btn')!.addEventListener('click', (e) => {
      e.stopPropagation();
      editNote('min', i);
    });
    if (m.note) {
      const n = document.createElement('div');
      n.className = 'note-text';
      n.textContent = m.note;
      const wrap = document.createElement('div');
      wrap.className = 'list-wrap';
      wrap.appendChild(el);
      wrap.appendChild(n);
      c.appendChild(wrap);
      return;
    }
    c.appendChild(el);
  });
}
