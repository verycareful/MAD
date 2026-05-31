// ═══════════════════════════════════════════════════════════════════════════
// MAD Explorer v2 — Neighbor visualization (local-normalized 3×3 grid)
//   Colored RELATIVE TO THE CURRENT TILE: shades of blue = lower than current,
//   shades of red = higher than current, current itself = white (mid). Intensity
//   scales by the largest neighbour deviation so micro-slopes are still vivid.
//   Values shown to 4 decimals; value text auto-flips dark/light for legibility.
// ═══════════════════════════════════════════════════════════════════════════

const NB_DIRS = [
  { dx: -1, dy: -1, label: 'NW' }, { dx: 0, dy: -1, label: 'N' }, { dx: 1, dy: -1, label: 'NE' },
  { dx: -1, dy: 0,  label: 'W'  }, { dx: 0, dy: 0,  label: '●' }, { dx: 1, dy: 0,  label: 'E'  },
  { dx: -1, dy: 1,  label: 'SW' }, { dx: 0, dy: 1,  label: 'S' }, { dx: 1, dy: 1,  label: 'SE' },
];

// Local frame is centered on the CURRENT tile: blue = lower than current,
// red = higher than current. Intensity scales by the largest deviation among
// the 8 immediate in-bounds neighbours (symmetric, so steeper side = stronger).
function localRange() {
  const cur = h(S.pos.x, S.pos.y);
  let lo = cur, hi = cur, maxDev = 0;
  for (const { dx, dy, label } of NB_DIRS) {
    if (label === '●') continue;
    const nx = S.pos.x + dx, ny = S.pos.y + dy;
    if (!inBounds(nx, ny)) continue;
    const v = h(nx, ny);
    if (v < lo) lo = v; if (v > hi) hi = v;
    const d = Math.abs(v - cur);
    if (d > maxDev) maxDev = d;
  }
  return { cur, lo, hi, maxDev: maxDev || 1e-9 };
}

// t < 0.5 → lower than current (blue) ; t > 0.5 → higher (red) ; current = 0.5 (white)
function localT(v, range) {
  return Math.max(0, Math.min(1, 0.5 + 0.5 * (v - range.cur) / range.maxDev));
}

function buildNeighbor() {
  const host = document.getElementById('neighbor-host');
  host.innerHTML = '';
  const range = localRange();
  const rr = document.getElementById('nb-range');
  if (rr) rr.innerHTML =
    `<span style="color:#5b8fc9">▼${range.lo.toFixed(4)}</span> ` +
    `<span style="color:#c8a96e">●${range.cur.toFixed(4)}</span> ` +
    `<span style="color:#c96a5b">▲${range.hi.toFixed(4)}</span>`;
  buildGrid(host, range);
}

function buildGrid(host, range) {
  const grid = document.createElement('div');
  grid.id = 'neighbor-grid';
  const currentH = h(S.pos.x, S.pos.y);

  NB_DIRS.forEach(({ dx, dy, label }) => {
    const el = document.createElement('div');
    el.className = 'nb-cell';
    const isCenter = label === '●';
    const nx = S.pos.x + dx, ny = S.pos.y + dy;

    if (isCenter) {
      const tc = localT(currentH, range);
      el.style.background = cmapCss(tc);
      el.classList.add('current');
      el.innerHTML =
        `<span class="nb-dir" style="color:${textOn(tc)};opacity:0.7">●</span>` +
        `<span class="nb-val" style="color:${textOn(tc)}">${currentH.toFixed(4)}</span>`;
    } else if (!inBounds(nx, ny)) {
      el.classList.add('oob');
      el.innerHTML = `<span class="nb-dir">${label}</span><span class="nb-val" style="color:#333">—</span>`;
    } else {
      const v = h(nx, ny);
      const t = localT(v, range);
      const txt = textOn(t);
      el.style.background = cmapCss(t);
      el.classList.add('clickable');
      if (S.prev && S.prev.x === nx && S.prev.y === ny) el.classList.add('was-here');
      const diff = v - currentH;
      const arr = diff < -1e-4 ? '↓' : diff > 1e-4 ? '↑' : '—';
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
