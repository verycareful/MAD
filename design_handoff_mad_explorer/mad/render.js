// ═══════════════════════════════════════════════════════════════════════════
// MAD Explorer v2 — Main-map render with zoom / pan
// ═══════════════════════════════════════════════════════════════════════════

let _baseCanvas = null;          // 100×100 offscreen fog/heightmap
let _baseDirty = true;
let _stripePattern = null;

function markBaseDirty() { _baseDirty = true; }

function buildBase() {
  if (!_baseCanvas) {
    _baseCanvas = document.createElement('canvas');
    _baseCanvas.width = W; _baseCanvas.height = H;
  }
  const ctx = _baseCanvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const d = img.data;
  const un = TH().unrevealed;
  for (let i = 0; i < W * H; i++) {
    let r, g, b;
    if (S.revealed.has(i)) { [r, g, b] = cmap(S.heights[i]); }
    else { r = un[0]; g = un[1]; b = un[2]; }
    const p = i * 4;
    d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  _baseDirty = false;
}

function makeStripePattern() {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 8;
  const x = c.getContext('2d');
  x.fillStyle = TH().stripeFill;
  x.fillRect(0, 0, 8, 8);
  x.strokeStyle = TH().stripeLine;
  x.lineWidth = 2;
  x.beginPath();
  for (let i = -8; i < 16; i += 4) { x.moveTo(i, 8); x.lineTo(i + 8, 0); }
  x.stroke();
  return x.createPattern(c, 'repeat');
}

// ─── View helpers ────────────────────────────────────────────────────────────
function cellToScreen(cx, cy) {
  return { sx: S.view.ox + cx * S.view.scale, sy: S.view.oy + cy * S.view.scale };
}
function screenToCell(sx, sy) {
  return {
    x: Math.floor((sx - S.view.ox) / S.view.scale),
    y: Math.floor((sy - S.view.oy) / S.view.scale),
  };
}

function fitView() {
  const cv = document.getElementById('grid');
  const cw = cv.clientWidth, ch = cv.clientHeight;
  const s = Math.max(2, Math.min(cw / (W + 2), ch / (H + 2)));
  S.view.scale = s;
  S.view.ox = (cw - W * s) / 2;
  S.view.oy = (ch - H * s) / 2;
}

function centerOnPos() {
  const cv = document.getElementById('grid');
  S.view.ox = cv.clientWidth / 2 - (S.pos.x + 0.5) * S.view.scale;
  S.view.oy = cv.clientHeight / 2 - (S.pos.y + 0.5) * S.view.scale;
}

// Comfortable starting zoom: ~34 cells across, centered on the explorer.
function defaultView() {
  const cv = document.getElementById('grid');
  const cw = cv.clientWidth, ch = cv.clientHeight;
  S.view.scale = Math.max(6, Math.min(28, Math.min(cw, ch) / 34));
  centerOnPos();
}

function zoomAt(screenX, screenY, factor) {
  const before = screenToCell(screenX, screenY);
  const beforeF = { x: (screenX - S.view.ox) / S.view.scale, y: (screenY - S.view.oy) / S.view.scale };
  S.view.scale = Math.max(1.5, Math.min(60, S.view.scale * factor));
  // keep landscape point under cursor fixed
  S.view.ox = screenX - beforeF.x * S.view.scale;
  S.view.oy = screenY - beforeF.y * S.view.scale;
  void before;
}

// ─── Render ──────────────────────────────────────────────────────────────────
function render() {
  const cv = document.getElementById('grid');
  const dpr = window.devicePixelRatio || 1;
  const cw = cv.clientWidth, ch = cv.clientHeight;
  if (cv.width !== cw * dpr || cv.height !== ch * dpr) {
    cv.width = cw * dpr; cv.height = ch * dpr;
  }
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = TH().voidFill;
  ctx.fillRect(0, 0, cw, ch);

  if (_baseDirty) buildBase();
  if (!_stripePattern) _stripePattern = makeStripePattern();

  const s = S.view.scale, ox = S.view.ox, oy = S.view.oy;

  // Heightmap (pixelated scale-up)
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(_baseCanvas, 0, 0, W, H, ox, oy, W * s, H * s);

  // Subtle grid lines when zoomed in
  if (s >= 11) {
    ctx.strokeStyle = TH().gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = 0; gx <= W; gx++) { const x = ox + gx * s; ctx.moveTo(x, oy); ctx.lineTo(x, oy + H * s); }
    for (let gy = 0; gy <= H; gy++) { const y = oy + gy * s; ctx.moveTo(ox, y); ctx.lineTo(ox + W * s, y); }
    ctx.stroke();
  }

  // Path
  if (S.path.length > 1) {
    ctx.lineWidth = Math.max(1, s * 0.16);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 1; i < S.path.length; i++) {
      const a = S.path[i - 1], b = S.path[i];
      ctx.strokeStyle = PHASE_COLOR[b.phase] + 'cc';
      ctx.beginPath();
      ctx.moveTo(ox + (a.x + 0.5) * s, oy + (a.y + 0.5) * s);
      ctx.lineTo(ox + (b.x + 0.5) * s, oy + (b.y + 0.5) * s);
      ctx.stroke();
    }
  }

  // Previous location — striped/greyed
  if (S.prev && (S.prev.x !== S.pos.x || S.prev.y !== S.pos.y)) {
    const px = ox + S.prev.x * s, py = oy + S.prev.y * s;
    ctx.fillStyle = _stripePattern;
    ctx.save();
    ctx.translate(px, py);
    ctx.fillRect(0, 0, s, s);
    ctx.restore();
    ctx.strokeStyle = TH().prevStroke;
    ctx.lineWidth = Math.max(1, s * 0.08);
    ctx.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
  }

  // Minima (stars)
  S.minima.forEach((m, i) => {
    const cx = ox + (m.x + 0.5) * s, cy = oy + (m.y + 0.5) * s;
    drawStar(ctx, cx, cy, TH().starFill, Math.max(5, s * 0.7));
    if (s >= 7) {
      ctx.fillStyle = TH().starNum;
      ctx.font = `bold ${Math.max(6, s * 0.5)}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(i + 1, cx, cy);
    }
    if (m.note) drawNoteTick(ctx, cx, cy, s, TH().starFill);
  });

  // Pass points (rings)
  S.passPoints.forEach((pp, i) => {
    const cx = ox + (pp.x + 0.5) * s, cy = oy + (pp.y + 0.5) * s;
    const r = Math.max(3, s * 0.4);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = TH().ringFill; ctx.fill();
    ctx.strokeStyle = TH().ringStroke; ctx.lineWidth = Math.max(1, s * 0.1); ctx.stroke();
    if (s >= 8) {
      ctx.fillStyle = TH().ringNum; ctx.font = `bold ${Math.max(6, s * 0.45)}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(i + 1, cx, cy);
    }
    if (pp.note) drawNoteTick(ctx, cx, cy, s, TH().ringStroke);
  });

  // Start marker (triangle)
  const sp = S.path[0];
  if (sp && (sp.x !== S.pos.x || sp.y !== S.pos.y)) {
    const x = ox + (sp.x + 0.5) * s, y = oy + (sp.y + 0.5) * s, r = Math.max(3, s * 0.36);
    ctx.fillStyle = TH().start;
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y + r); ctx.lineTo(x - r, y + r);
    ctx.closePath(); ctx.fill();
  }

  // Current cell
  const lw = Math.max(1.5, s * 0.12);
  const curx = ox + S.pos.x * s, cury = oy + S.pos.y * s;
  ctx.strokeStyle = TH().current; ctx.lineWidth = lw;
  ctx.strokeRect(curx + lw / 2, cury + lw / 2, s - lw, s - lw);
  ctx.beginPath();
  ctx.arc(ox + (S.pos.x + 0.5) * s, oy + (S.pos.y + 0.5) * s, Math.max(1.5, s * 0.1), 0, Math.PI * 2);
  ctx.fillStyle = TH().current; ctx.fill();
}

function drawNoteTick(ctx, cx, cy, s, color) {
  const r = Math.max(4, s * 0.4);
  ctx.beginPath();
  ctx.arc(cx + r * 0.8, cy - r * 0.8, Math.max(2, s * 0.13), 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = TH().noteOutline; ctx.lineWidth = 1; ctx.stroke();
}

function drawStar(ctx, cx, cy, color, outerR) {
  const innerR = outerR * 0.42, spikes = 5, step = Math.PI / spikes;
  let rot = -Math.PI / 2;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    ctx[i === 0 ? 'moveTo' : 'lineTo'](cx + Math.cos(rot) * r, cy + Math.sin(rot) * r);
    rot += step;
  }
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.8; ctx.stroke();
}
