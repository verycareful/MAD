// ═══════════════════════════════════════════════════════════════════════════
// MAD Explorer v2 - Neighbor visualization (local-normalized 3×3 grid)
//
// Colored RELATIVE TO THE CURRENT TILE: blue = lower than current, red = higher,
// current = white (mid). Intensity scales by the largest neighbour deviation so
// micro-slopes are still vivid. Values to 4 decimals; text auto-flips for contrast.
// ═══════════════════════════════════════════════════════════════════════════

import { state, h, inBounds } from './state';
import { cmapCss, textOn } from './colormap';
import { move } from './actions';
import { ARROW_EPSILON, MIN_DEV } from './constants';

interface NbDir {
  dx: number;
  dy: number;
  label: string;
}

const CENTER_LABEL = '●';

const NB_DIRS: NbDir[] = [
  { dx: -1, dy: -1, label: 'NW' }, { dx: 0, dy: -1, label: 'N' }, { dx: 1, dy: -1, label: 'NE' },
  { dx: -1, dy: 0, label: 'W' },   { dx: 0, dy: 0, label: CENTER_LABEL }, { dx: 1, dy: 0, label: 'E' },
  { dx: -1, dy: 1, label: 'SW' },  { dx: 0, dy: 1, label: 'S' }, { dx: 1, dy: 1, label: 'SE' },
];

export interface LocalRange {
  cur: number;
  lo: number;
  hi: number;
  maxDev: number;
}

// Local frame centered on the current tile. maxDev = largest |neighbour - current|
// among in-bounds neighbours, floored at MIN_DEV to avoid divide-by-zero.
export function localRange(): LocalRange {
  const cur = h(state.pos.x, state.pos.y);
  let lo = cur;
  let hi = cur;
  let maxDev = 0;
  for (const { dx, dy, label } of NB_DIRS) {
    if (label === CENTER_LABEL) continue;
    const nx = state.pos.x + dx;
    const ny = state.pos.y + dy;
    if (!inBounds(nx, ny)) continue;
    const v = h(nx, ny);
    if (v < lo) lo = v;
    if (v > hi) hi = v;
    const d = Math.abs(v - cur);
    if (d > maxDev) maxDev = d;
  }
  return { cur, lo, hi, maxDev: maxDev || MIN_DEV };
}

// t < 0.5 → lower than current (blue); t > 0.5 → higher (red); current = 0.5 (white)
export function localT(v: number, range: LocalRange): number {
  return Math.max(0, Math.min(1, 0.5 + (0.5 * (v - range.cur)) / range.maxDev));
}

export function buildNeighbor(): void {
  const host = document.getElementById('neighbor-host')!;
  host.innerHTML = '';
  const range = localRange();
  const rr = document.getElementById('nb-range');
  if (rr) {
    rr.innerHTML =
      `<span style="color:#5b8fc9">▼${range.lo.toFixed(4)}</span> ` +
      `<span style="color:#c8a96e">●${range.cur.toFixed(4)}</span> ` +
      `<span style="color:#c96a5b">▲${range.hi.toFixed(4)}</span>`;
  }
  buildGrid(host, range);
}

function buildGrid(host: HTMLElement, range: LocalRange): void {
  const grid = document.createElement('div');
  grid.id = 'neighbor-grid';
  const currentH = h(state.pos.x, state.pos.y);
  const mode = state.cmapMode;

  NB_DIRS.forEach(({ dx, dy, label }) => {
    const el = document.createElement('div');
    el.className = 'nb-cell';
    const isCenter = label === CENTER_LABEL;
    const nx = state.pos.x + dx;
    const ny = state.pos.y + dy;

    if (isCenter) {
      const tc = localT(currentH, range);
      el.style.background = cmapCss(tc, mode);
      el.classList.add('current');
      el.innerHTML =
        `<span class="nb-dir" style="color:${textOn(tc, mode)};opacity:0.7">●</span>` +
        `<span class="nb-val" style="color:${textOn(tc, mode)}">${currentH.toFixed(4)}</span>`;
    } else if (!inBounds(nx, ny)) {
      el.classList.add('oob');
      el.innerHTML = `<span class="nb-dir">${label}</span><span class="nb-val" style="color:#333">-</span>`;
    } else {
      const v = h(nx, ny);
      const t = localT(v, range);
      const txt = textOn(t, mode);
      el.style.background = cmapCss(t, mode);
      el.classList.add('clickable');
      if (state.prev && state.prev.x === nx && state.prev.y === ny) el.classList.add('was-here');
      const diff = v - currentH;
      const arr = diff < -ARROW_EPSILON ? '↓' : diff > ARROW_EPSILON ? '↑' : '-';
      el.innerHTML =
        `<span class="nb-dir" style="color:${txt};opacity:0.65">${label}</span>` +
        `<span class="nb-val" style="color:${txt}">${v.toFixed(4)}</span>` +
        `<span class="nb-arr" style="color:${txt};opacity:0.85">${arr}</span>`;
      el.addEventListener('click', () => move(dx, dy));
    }
    grid.appendChild(el);
  });

  host.appendChild(grid);
}
