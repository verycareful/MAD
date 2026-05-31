// ═══════════════════════════════════════════════════════════════════════════
// MAD Explorer v2 — App controller: actions, input, sidebar, boot
// ═══════════════════════════════════════════════════════════════════════════

let saveTimer = null;
function commit() { render(); updateSidebar(); clearTimeout(saveTimer); saveTimer = setTimeout(autosave, 250); }

// ─── Actions ─────────────────────────────────────────────────────────────────
function move(dx, dy) {
  if (S.isAnimating) return;
  const nx = S.pos.x + dx, ny = S.pos.y + dy;
  if (!inBounds(nx, ny)) { toast('Edge of world!'); return; }
  pushUndo();
  S.prev = { ...S.pos };
  S.pos = { x: nx, y: ny };
  revealAround(nx, ny);
  markBaseDirty();
  S.path.push({ ...S.pos, phase: S.phase });
  S.stepCount++;
  commit();
}

function markMinimum() {
  if (S.isAnimating) return;
  if (S.minima.some(m => m.x === S.pos.x && m.y === S.pos.y)) { toast('Already marked here!'); return; }
  pushUndo();
  const ht = h(S.pos.x, S.pos.y);
  S.minima.push({ x: S.pos.x, y: S.pos.y, h: ht, id: S.nextId++, note: '' });
  toast(`★ Minimum #${S.minima.length}  (h = ${ht.toFixed(4)})`);
  commit();
}

function addPassPoint() {
  if (S.isAnimating) return;
  if (S.passPoints.some(p => p.x === S.pos.x && p.y === S.pos.y)) { toast('Pass point already here!'); return; }
  pushUndo();
  S.passPoints.push({ x: S.pos.x, y: S.pos.y, pathLen: S.path.length, id: S.nextId++, note: '' });
  toast(`◉ Pass point #${S.passPoints.length} added`);
  commit();
}

async function backtrack(ppIdx) {
  if (S.isAnimating) return;
  if (!S.passPoints.length) { toast('No pass points!'); return; }
  const idx = ppIdx !== undefined ? ppIdx : S.passPoints.length - 1;
  const target = S.passPoints[idx];
  if (S.pos.x === target.x && S.pos.y === target.y) { toast('Already at this pass point!'); return; }

  pushUndo();
  S.isAnimating = true;
  const stepsAfter = S.path.slice(target.pathLen);
  const backPath = [...stepsAfter].reverse();
  for (const step of backPath) {
    S.prev = { ...S.pos };
    S.pos = { x: step.x, y: step.y };
    S.path.push({ ...S.pos, phase: PHASE.backtrack });
    S.stepCount++;
    render(); updateSidebar();
    await sleep(45);
  }
  S.prev = { ...S.pos };
  S.pos = { x: target.x, y: target.y };
  S.path.push({ ...S.pos, phase: PHASE.backtrack });
  S.isAnimating = false;
  toast(`↩ Backtracked to pass point #${idx + 1}`);
  commit();
}

function setPhase(p) {
  S.phase = p;
  document.querySelectorAll('.phase-btn').forEach(b => b.classList.toggle('active', b.dataset.phase === p));
  autosave();
}

function setCmapMode(mode) {
  S.cmapMode = mode;
  document.querySelectorAll('.cmap-btn').forEach(b => b.classList.toggle('active', b.dataset.cmap === mode));
  markBaseDirty();
  commit();
}

function setTheme(mode) {
  S.theme = mode;
  document.documentElement.setAttribute('data-theme', mode);
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === mode));
  _stripePattern = null;        // rebuild striped previous-cell pattern in new theme
  markBaseDirty();
  commit();
}

// ─── Notes ───────────────────────────────────────────────────────────────────
function editNote(kind, idx) {
  const arr = kind === 'pp' ? S.passPoints : S.minima;
  const item = arr[idx];
  const label = kind === 'pp' ? `Pass point #${idx + 1}` : `Minimum #${idx + 1}`;
  const note = prompt(`Note for ${label} @ (${item.x}, ${item.y}):\nWhy does this matter? What's the intent here?`, item.note || '');
  if (note === null) return;
  pushUndo();
  item.note = note.trim();
  commit();
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function updateSidebar() {
  const ht = h(S.pos.x, S.pos.y);
  document.getElementById('pos-display').textContent = `(${S.pos.x}, ${S.pos.y})`;
  document.getElementById('height-val').textContent = `h = ${ht.toFixed(4)}`;
  document.getElementById('step-count').textContent = `Steps: ${S.stepCount}`;
  const bar = document.getElementById('height-bar');
  bar.style.width = `${ht * 100}%`;
  bar.style.background = cmapCss(ht);

  document.getElementById('btn-undo').disabled = !HISTORY.undo.length;
  document.getElementById('btn-redo').disabled = !HISTORY.redo.length;
  document.getElementById('seed-label').textContent = `seed ${S.seed}`;

  buildNeighbor();
  buildPassList();
  buildMinList();
}

function buildPassList() {
  const c = document.getElementById('pp-list');
  document.getElementById('pp-count').textContent = S.passPoints.length;
  if (!S.passPoints.length) { c.innerHTML = '<div class="empty">None yet</div>'; return; }
  c.innerHTML = '';
  S.passPoints.forEach((pp, i) => {
    const el = document.createElement('div');
    el.className = 'list-item' + (pp.x === S.pos.x && pp.y === S.pos.y ? ' here' : '');
    el.innerHTML =
      `<div class="pp-dot"></div>` +
      `<span>#${i + 1} (${pp.x},${pp.y})</span>` +
      `<span class="ml-auto">h=${h(pp.x, pp.y).toFixed(4)}</span>` +
      `<button class="note-btn" title="${pp.note ? 'Edit note' : 'Add note'}">${pp.note ? '✎' : '+'}</button>`;
    el.querySelector('span').addEventListener('click', () => backtrack(i));
    el.querySelector('.pp-dot').addEventListener('click', () => backtrack(i));
    el.querySelector('.note-btn').addEventListener('click', e => { e.stopPropagation(); editNote('pp', i); });
    if (pp.note) {
      const n = document.createElement('div'); n.className = 'note-text'; n.textContent = pp.note;
      const wrap = document.createElement('div'); wrap.className = 'list-wrap';
      wrap.appendChild(el); wrap.appendChild(n); c.appendChild(wrap); return;
    }
    c.appendChild(el);
  });
}

function buildMinList() {
  const c = document.getElementById('min-list');
  document.getElementById('min-count').textContent = S.minima.length;
  if (!S.minima.length) { c.innerHTML = '<div class="empty">None yet</div>'; return; }
  c.innerHTML = '';
  S.minima.forEach((m, i) => {
    const el = document.createElement('div');
    el.className = 'list-item min-item';
    el.innerHTML =
      `<span class="min-star">★</span>` +
      `<span>#${i + 1} (${m.x},${m.y})</span>` +
      `<span class="ml-auto" style="color:var(--minimum)">h=${m.h.toFixed(4)}</span>` +
      `<button class="note-btn">${m.note ? '✎' : '+'}</button>`;
    el.querySelector('.note-btn').addEventListener('click', e => { e.stopPropagation(); editNote('min', i); });
    if (m.note) {
      const n = document.createElement('div'); n.className = 'note-text'; n.textContent = m.note;
      const wrap = document.createElement('div'); wrap.className = 'list-wrap';
      wrap.appendChild(el); wrap.appendChild(n); c.appendChild(wrap); return;
    }
    c.appendChild(el);
  });
}

// ─── Canvas interaction: click-to-move, drag-to-pan, wheel-zoom ──────────────
function setupCanvas() {
  const cv = document.getElementById('grid');
  let down = null, moved = false, panning = false;

  cv.addEventListener('mousedown', e => {
    down = { x: e.clientX, y: e.clientY, ox: S.view.ox, oy: S.view.oy };
    moved = false; panning = false;
  });
  window.addEventListener('mousemove', e => {
    if (!down) return;
    const ddx = e.clientX - down.x, ddy = e.clientY - down.y;
    if (!panning && Math.hypot(ddx, ddy) > 4) panning = true;
    if (panning) { moved = true; S.view.ox = down.ox + ddx; S.view.oy = down.oy + ddy; render(); }
  });
  window.addEventListener('mouseup', e => {
    if (!down) return;
    const wasPan = moved;
    down = null;
    if (wasPan) { autosave(); return; }
    if (S.isAnimating) return;
    const rect = cv.getBoundingClientRect();
    const { x: gx, y: gy } = screenToCell(e.clientX - rect.left, e.clientY - rect.top);
    const dx = gx - S.pos.x, dy = gy - S.pos.y;
    if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx || dy)) { move(dx, dy); return; }
    const ppIdx = S.passPoints.findIndex(pp => pp.x === gx && pp.y === gy);
    if (ppIdx !== -1) { backtrack(ppIdx); return; }
    if (inBounds(gx, gy)) toast('Move to adjacent cells only (or click a pass point)');
  });
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = cv.getBoundingClientRect();
    zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    render(); autosave();
  }, { passive: false });
}

// ─── Keyboard ────────────────────────────────────────────────────────────────
const KEY_MAP = {
  q: [-1, -1], w: [0, -1], e: [1, -1], a: [-1, 0], d: [1, 0],
  z: [-1, 1], x: [0, 1], c: [1, 1],
  arrowup: [0, -1], arrowdown: [0, 1], arrowleft: [-1, 0], arrowright: [1, 0],
};

function setupKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === 'z') { e.preventDefault(); (e.shiftKey ? redo() : undo()) && commit(); return; }
    if ((e.metaKey || e.ctrlKey) && k === 'y') { e.preventDefault(); redo() && commit(); return; }
    const dir = KEY_MAP[k];
    if (dir) { e.preventDefault(); move(dir[0], dir[1]); return; }
    if (k === 'm') markMinimum();
    else if (k === 'p') addPassPoint();
    else if (k === 'b') backtrack();
    else if (k === '1') setPhase(PHASE.descent);
    else if (k === '2') setPhase(PHASE.ascent);
    else if (k === '3') setPhase(PHASE.backtrack);
    else if (k === 'f') { fitView(); render(); }
    else if (k === '+' || k === '=') { const cv = document.getElementById('grid'); zoomAt(cv.clientWidth / 2, cv.clientHeight / 2, 1.2); render(); }
    else if (k === '-' || k === '_') { const cv = document.getElementById('grid'); zoomAt(cv.clientWidth / 2, cv.clientHeight / 2, 1 / 1.2); render(); }
  });
}

// ─── Wiring ──────────────────────────────────────────────────────────────────
function wireUI() {
  document.querySelectorAll('.phase-btn').forEach(b => b.addEventListener('click', () => setPhase(b.dataset.phase)));
  document.querySelectorAll('.cmap-btn').forEach(b => b.addEventListener('click', () => setCmapMode(b.dataset.cmap)));
  document.querySelectorAll('.theme-btn').forEach(b => b.addEventListener('click', () => setTheme(b.dataset.theme)));
  document.getElementById('btn-mark').addEventListener('click', markMinimum);
  document.getElementById('btn-pass').addEventListener('click', addPassPoint);
  document.getElementById('btn-back').addEventListener('click', () => backtrack());
  document.getElementById('btn-undo').addEventListener('click', () => undo() && commit());
  document.getElementById('btn-redo').addEventListener('click', () => redo() && commit());
  document.getElementById('btn-zoom-in').addEventListener('click', () => { const cv = document.getElementById('grid'); zoomAt(cv.clientWidth / 2, cv.clientHeight / 2, 1.2); render(); });
  document.getElementById('btn-zoom-out').addEventListener('click', () => { const cv = document.getElementById('grid'); zoomAt(cv.clientWidth / 2, cv.clientHeight / 2, 1 / 1.2); render(); });
  document.getElementById('btn-fit').addEventListener('click', () => { fitView(); render(); });

  document.getElementById('btn-new').addEventListener('click', () => {
    if (!confirm('Start a new random landscape? (current session is exported-only after this)')) return;
    newGame(); defaultView(); commit();
  });
  document.getElementById('btn-seed').addEventListener('click', () => {
    const s = prompt('Load landscape by seed number:', S.seed);
    if (s === null) return;
    newGame(parseInt(s, 10)); defaultView(); commit();
  });

  document.getElementById('btn-export').addEventListener('click', exportTrace);
  document.getElementById('btn-png').addEventListener('click', exportPNG);
  document.getElementById('btn-import').addEventListener('click', () => document.getElementById('file-input').click());
  document.getElementById('file-input').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try { importTrace(JSON.parse(r.result)); markBaseDirty(); fitView(); commit(); toast('Trace imported'); }
      catch (err) { toast('Import failed: ' + err.message); }
    };
    r.readAsText(f); e.target.value = '';
  });

  const desc = document.getElementById('session-desc');
  desc.value = S.description;
  desc.addEventListener('input', () => { S.description = desc.value; clearTimeout(saveTimer); saveTimer = setTimeout(autosave, 400); });

  window.addEventListener('resize', () => { render(); });
}

// ─── PNG export ──────────────────────────────────────────────────────────────
function exportPNG() {
  const savedView = { ...S.view };
  const out = document.createElement('canvas');
  const PAD = 1, s = 9;
  out.width = (W + PAD * 2) * s; out.height = (H + PAD * 2) * s;
  // Temporarily render into a detached canvas by swapping the live one's context.
  // Simpler: draw directly here using base + vectors.
  if (_baseDirty) buildBase();
  const ctx = out.getContext('2d');
  ctx.fillStyle = TH().voidFill; ctx.fillRect(0, 0, out.width, out.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(_baseCanvas, 0, 0, W, H, PAD * s, PAD * s, W * s, H * s);
  // reuse render by temporarily pointing view at out? Keep it simple: vectors via render math.
  const ox = PAD * s, oy = PAD * s;
  if (S.path.length > 1) {
    ctx.lineWidth = Math.max(1, s * 0.16); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 1; i < S.path.length; i++) {
      const a = S.path[i - 1], b = S.path[i];
      ctx.strokeStyle = PHASE_COLOR[b.phase] + 'cc';
      ctx.beginPath(); ctx.moveTo(ox + (a.x + 0.5) * s, oy + (a.y + 0.5) * s);
      ctx.lineTo(ox + (b.x + 0.5) * s, oy + (b.y + 0.5) * s); ctx.stroke();
    }
  }
  S.minima.forEach((m, i) => { const cx = ox + (m.x + 0.5) * s, cy = oy + (m.y + 0.5) * s; drawStar(ctx, cx, cy, TH().starFill, s * 0.7); ctx.fillStyle = TH().starNum; ctx.font = `bold ${s * 0.5}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(i + 1, cx, cy); });
  S.passPoints.forEach((pp, i) => { const cx = ox + (pp.x + 0.5) * s, cy = oy + (pp.y + 0.5) * s; ctx.beginPath(); ctx.arc(cx, cy, s * 0.4, 0, Math.PI * 2); ctx.fillStyle = TH().ringFill; ctx.fill(); ctx.strokeStyle = TH().ringStroke; ctx.lineWidth = s * 0.1; ctx.stroke(); ctx.fillStyle = TH().ringNum; ctx.font = `bold ${s * 0.45}px monospace`; ctx.fillText(i + 1, cx, cy); });
  out.toBlob(b => { const url = URL.createObjectURL(b); const a = document.createElement('a'); a.href = url; a.download = `mad-map-seed${S.seed}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
  S.view = savedView;
}

// ─── Utilities ───────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ─── Boot ────────────────────────────────────────────────────────────────────
function boot() {
  const restored = loadAutosave();
  if (!restored) newGame();
  document.querySelectorAll('.cmap-btn').forEach(b => b.classList.toggle('active', b.dataset.cmap === S.cmapMode));
  setTheme(S.theme);
  setPhase(S.phase);
  markBaseDirty();
  setupCanvas(); setupKeyboard(); wireUI();
  if (!restored) defaultView();
  commit();
}
window.addEventListener('DOMContentLoaded', boot);
