// ═══════════════════════════════════════════════════════════════════════════
// MAD Explorer v2 — Core: colormap, seeded RNG, landscape, state, history, I/O
// ═══════════════════════════════════════════════════════════════════════════

const W = 100, H = 100;

const PHASE = { descent: 'descent', ascent: 'ascent', backtrack: 'backtrack' };
const PHASE_COLOR = {
  descent:   '#7eb8d4',
  ascent:    '#d47e7e',
  backtrack: '#b07ed4',
};

// ─── Colormaps ──────────────────────────────────────────────────────────────
// Two palettes, both better for reading fine differences than inferno and both
// requiring the value text to flip dark/light depending on background luminance.
//   'rdbu' — diverging Red(high) ↔ White(mid) ↔ Blue(low)   [ColorBrewer RdBu]
//   'mono' — Black(low) → White(high) grayscale
const RDBU = [
  [0.019, 0.188, 0.380], [0.129, 0.400, 0.674], [0.262, 0.576, 0.764],
  [0.572, 0.772, 0.870], [0.819, 0.898, 0.941], [0.968, 0.968, 0.968],
  [0.992, 0.858, 0.780], [0.956, 0.647, 0.510], [0.839, 0.376, 0.302],
  [0.698, 0.094, 0.168], [0.404, 0.000, 0.121],
];

function lerpStops(stops, t) {
  t = Math.max(0, Math.min(1, t));
  const n = stops.length - 1, i = t * n, lo = Math.floor(i), f = i - lo, hi = Math.min(lo + 1, n);
  const a = stops[lo], b = stops[hi];
  return [
    ((a[0] + (b[0] - a[0]) * f) * 255) | 0,
    ((a[1] + (b[1] - a[1]) * f) * 255) | 0,
    ((a[2] + (b[2] - a[2]) * f) * 255) | 0,
  ];
}

function cmap(t) {
  if (S.cmapMode === 'mono') { const v = (Math.max(0, Math.min(1, t)) * 255) | 0; return [v, v, v]; }
  return lerpStops(RDBU, t);
}
function cmapCss(t) { const [r, g, b] = cmap(t); return `rgb(${r},${g},${b})`; }

// ─── Canvas theme (DOM side uses CSS vars; canvas needs explicit colors) ─────
const THEME = {
  dark: {
    voidFill:    '#070608',
    unrevealed:  [10, 9, 13],
    gridLine:    'rgba(255,255,255,0.05)',
    stripeFill:  'rgba(90,84,96,0.55)',
    stripeLine:  'rgba(20,18,26,0.9)',
    prevStroke:  'rgba(150,142,156,0.8)',
    starFill:    '#f0c060',
    starNum:     '#0a0a0c',
    ringFill:    'rgba(255,255,255,0.12)',
    ringStroke:  '#ffffffdd',
    ringNum:     '#ffffff',
    start:       '#c8a96e',
    current:     '#00ffcc',
    noteOutline: '#0a0a0c',
  },
  light: {
    voidFill:    '#e7e0d2',
    unrevealed:  [206, 198, 183],
    gridLine:    'rgba(0,0,0,0.08)',
    stripeFill:  'rgba(120,112,100,0.5)',
    stripeLine:  'rgba(235,230,220,0.9)',
    prevStroke:  'rgba(70,64,54,0.85)',
    starFill:    '#c8870f',
    starNum:     '#fff8e8',
    ringFill:    'rgba(20,16,10,0.14)',
    ringStroke:  '#2a241acc',
    ringNum:     '#1c1812',
    start:       '#9a7636',
    current:     '#008f6b',
    noteOutline: '#fbf8f1',
  },
};
function TH() { return THEME[S.theme] || THEME.dark; }

// Relative luminance → choose readable text color for a given normalized value.
function textOn(t) {
  const [r, g, b] = cmap(t);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 150 ? '#0a0a0c' : '#ffffff';
}

// ─── Seeded RNG (mulberry32) — makes a landscape reproducible from its seed ──
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateLandscape(seed) {
  const rng = mulberry32(seed);
  const grid = new Float64Array(W * H);
  for (let b = 0; b < 24; b++) {
    const cx = rng() * W, cy = rng() * H;
    const neg = rng() < 0.4;
    const amp = (neg ? -1 : 1) * (0.5 + rng() * 1.5);
    const sig = 5 + rng() * 20;
    const inv = 1 / (2 * sig * sig);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const dx = x - cx, dy = y - cy;
        grid[y * W + x] += amp * Math.exp(-(dx * dx + dy * dy) * inv);
      }
  }
  let mn = Infinity, mx = -Infinity;
  for (const v of grid) { if (v < mn) mn = v; if (v > mx) mx = v; }
  const rng2 = mx - mn || 1;
  for (let i = 0; i < grid.length; i++) grid[i] = (grid[i] - mn) / rng2;
  return grid;
}

// ─── Global state ────────────────────────────────────────────────────────────
const S = {
  W, H,
  seed: 0,
  heights: null,
  revealed: new Set(),
  pos: { x: 50, y: 50 },
  prev: null,                 // immediately-previous cell (striped on map)
  path: [],                   // [{x,y,phase}]
  passPoints: [],             // [{x,y,pathLen,id,note}]
  minima: [],                 // [{x,y,h,id,note}]
  phase: PHASE.descent,
  stepCount: 0,
  nextId: 1,
  isAnimating: false,
  description: '',
  cmapMode: 'rdbu',           // rdbu | mono
  theme: 'dark',              // dark | light
  view: { scale: 6, ox: 0, oy: 0 },
};

const HISTORY = { undo: [], redo: [] };
const HISTORY_CAP = 300;

function h(x, y) { return S.heights[y * W + x]; }
function inBounds(x, y) { return x >= 0 && x < W && y >= 0 && y < H; }

function revealAround(x, y) {
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if (inBounds(x + dx, y + dy)) S.revealed.add((y + dy) * W + (x + dx));
}

// ─── Snapshot / restore (for undo, save, export) ─────────────────────────────
function snapshot() {
  return {
    revealed: Array.from(S.revealed),
    pos: { ...S.pos },
    prev: S.prev ? { ...S.prev } : null,
    path: S.path.map(p => ({ ...p })),
    passPoints: S.passPoints.map(p => ({ ...p })),
    minima: S.minima.map(m => ({ ...m })),
    phase: S.phase,
    stepCount: S.stepCount,
    nextId: S.nextId,
    description: S.description,
  };
}

function restore(snap) {
  S.revealed = new Set(snap.revealed);
  S.pos = { ...snap.pos };
  S.prev = snap.prev ? { ...snap.prev } : null;
  S.path = snap.path.map(p => ({ ...p }));
  S.passPoints = snap.passPoints.map(p => ({ ...p }));
  S.minima = snap.minima.map(m => ({ ...m }));
  S.phase = snap.phase;
  S.stepCount = snap.stepCount;
  S.nextId = snap.nextId;
  S.description = snap.description;
}

function pushUndo() {
  HISTORY.undo.push(snapshot());
  if (HISTORY.undo.length > HISTORY_CAP) HISTORY.undo.shift();
  HISTORY.redo.length = 0;
}

function undo() {
  if (!HISTORY.undo.length || S.isAnimating) return false;
  HISTORY.redo.push(snapshot());
  restore(HISTORY.undo.pop());
  return true;
}

function redo() {
  if (!HISTORY.redo.length || S.isAnimating) return false;
  HISTORY.undo.push(snapshot());
  restore(HISTORY.redo.pop());
  return true;
}

// ─── New game ────────────────────────────────────────────────────────────────
function newGame(seed) {
  S.seed = (seed === undefined || seed === null || isNaN(seed))
    ? (Math.random() * 0xffffffff) >>> 0
    : (seed >>> 0);
  S.heights = generateLandscape(S.seed);
  S.revealed = new Set();
  S.pos = { x: Math.floor(W / 2), y: Math.floor(H / 2) };
  S.prev = null;
  S.path = [{ ...S.pos, phase: PHASE.descent }];
  S.passPoints = [];
  S.minima = [];
  S.phase = PHASE.descent;
  S.stepCount = 0;
  S.nextId = 1;
  S.isAnimating = false;
  S.description = '';
  HISTORY.undo.length = 0;
  HISTORY.redo.length = 0;
  revealAround(S.pos.x, S.pos.y);
}

// ─── Persistence (localStorage autosave) ─────────────────────────────────────
const LS_KEY = 'mad_explorer_v2';

function autosave() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      seed: S.seed,
      cmapMode: S.cmapMode,
      theme: S.theme,
      view: S.view,
      state: snapshot(),
    }));
  } catch (e) { /* ignore quota */ }
}

function loadAutosave() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    S.seed = d.seed >>> 0;
    S.heights = generateLandscape(S.seed);
    if (d.cmapMode) S.cmapMode = d.cmapMode;
    if (d.theme) S.theme = d.theme;
    if (d.view) S.view = d.view;
    restore(d.state);
    return true;
  } catch (e) { return false; }
}

// ─── Export: structured intent trace ─────────────────────────────────────────
// The point of the export is to DEMONSTRATE intent to an agent: the ordered,
// phase-tagged decisions a human made, with notes explaining the "why".
function buildTrace() {
  // Compress path into phase-runs for readability.
  const runs = [];
  for (const p of S.path) {
    const last = runs[runs.length - 1];
    if (last && last.phase === p.phase) last.points.push([p.x, p.y]);
    else runs.push({ phase: p.phase, points: [[p.x, p.y]] });
  }
  // Ordered narrative of decision events.
  const events = [];
  S.passPoints.forEach((pp, i) =>
    events.push({ kind: 'pass_point', index: i + 1, at: [pp.x, pp.y], note: pp.note || '' }));
  S.minima.forEach((m, i) =>
    events.push({ kind: 'minimum', index: i + 1, at: [m.x, m.y], height: +m.h.toFixed(4), note: m.note || '' }));

  return {
    format: 'mad-explorer-trace',
    version: 2,
    createdAt: new Date().toISOString(),
    description: S.description,
    landscape: { generator: 'gaussian-sum', width: W, height: H, seed: S.seed,
                 note: 'Regenerate identical landscape via mulberry32(seed) + 24 gaussian bumps.' },
    start: [S.path[0].x, S.path[0].y],
    finish: [S.pos.x, S.pos.y],
    stepCount: S.stepCount,
    phaseRuns: runs,
    passPoints: S.passPoints.map((p, i) => ({ index: i + 1, at: [p.x, p.y],
      height: +h(p.x, p.y).toFixed(4), note: p.note || '' })),
    minima: S.minima.map((m, i) => ({ index: i + 1, at: [m.x, m.y],
      height: +m.h.toFixed(4), note: m.note || '' })),
    events,
    fullPath: S.path.map(p => [p.x, p.y, p.phase[0]]), // p=phase initial: d/a/b
  };
}

function download(filename, text, mime = 'application/json') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportTrace() {
  download(`mad-trace-seed${S.seed}.json`, JSON.stringify(buildTrace(), null, 2));
}

// Import a previously-exported trace (restores landscape + path + notes).
function importTrace(obj) {
  if (!obj || obj.format !== 'mad-explorer-trace') throw new Error('Not a MAD Explorer trace.');
  S.seed = obj.landscape.seed >>> 0;
  S.heights = generateLandscape(S.seed);
  S.revealed = new Set();
  S.path = (obj.fullPath || []).map(([x, y, p]) => ({
    x, y, phase: p === 'a' ? PHASE.ascent : p === 'b' ? PHASE.backtrack : PHASE.descent,
  }));
  if (!S.path.length) S.path = [{ x: obj.start[0], y: obj.start[1], phase: PHASE.descent }];
  for (const p of S.path) revealAround(p.x, p.y);
  const last = S.path[S.path.length - 1];
  S.pos = { x: last.x, y: last.y };
  S.prev = S.path.length > 1 ? { x: S.path[S.path.length - 2].x, y: S.path[S.path.length - 2].y } : null;
  S.phase = last.phase;
  S.stepCount = obj.stepCount || S.path.length - 1;
  S.description = obj.description || '';
  S.passPoints = (obj.passPoints || []).map((p, i) => ({
    x: p.at[0], y: p.at[1], pathLen: S.path.length, id: i + 1, note: p.note || '',
  }));
  S.minima = (obj.minima || []).map((m, i) => ({
    x: m.at[0], y: m.at[1], h: m.height ?? h(m.at[0], m.at[1]), id: 1000 + i, note: m.note || '',
  }));
  S.nextId = S.passPoints.length + S.minima.length + 1;
  S.isAnimating = false;
  HISTORY.undo.length = 0; HISTORY.redo.length = 0;
}
