// ═══════════════════════════════════════════════════════════════════════════
// MAD Explorer v2 - Main-map render (heightmap + fog + path + markers)
//
// The 100×100 fog/heightmap is built once into an offscreen canvas and scaled up
// pixelated; vectors (path, markers, current/previous cells) are drawn on top in
// device-pixel space each frame.
// ═══════════════════════════════════════════════════════════════════════════

import { state } from '../state';
import { TH } from '../theme';
import { cmap } from '../colormap';
import { W, H, GRID_LINE_MIN_SCALE, PHASE_COLOR } from '../constants';

let baseCanvas: HTMLCanvasElement | null = null;
let baseDirty = true;
let stripePattern: CanvasPattern | null = null;

export function markBaseDirty(): void {
  baseDirty = true;
}

// Theme switch changes the stripe colors, so the cached pattern must be rebuilt.
export function resetStripePattern(): void {
  stripePattern = null;
}

export function buildBase(): void {
  if (!baseCanvas) {
    baseCanvas = document.createElement('canvas');
    baseCanvas.width = W;
    baseCanvas.height = H;
  }
  const ctx = baseCanvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const d = img.data;
  const un = TH().unrevealed;
  for (let i = 0; i < W * H; i++) {
    let r: number;
    let g: number;
    let b: number;
    if (state.revealed.has(i)) {
      [r, g, b] = cmap(state.heights![i], state.cmapMode);
    } else {
      r = un[0];
      g = un[1];
      b = un[2];
    }
    const p = i * 4;
    d[p] = r;
    d[p + 1] = g;
    d[p + 2] = b;
    d[p + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  baseDirty = false;
}

// Used by the PNG exporter, which draws the same base into its own canvas.
export function getBaseCanvas(): HTMLCanvasElement {
  if (baseDirty || !baseCanvas) buildBase();
  return baseCanvas!;
}

function makeStripePattern(): CanvasPattern | null {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 8;
  const x = c.getContext('2d')!;
  x.fillStyle = TH().stripeFill;
  x.fillRect(0, 0, 8, 8);
  x.strokeStyle = TH().stripeLine;
  x.lineWidth = 2;
  x.beginPath();
  for (let i = -8; i < 16; i += 4) {
    x.moveTo(i, 8);
    x.lineTo(i + 8, 0);
  }
  x.stroke();
  return x.createPattern(c, 'repeat');
}

export function render(): void {
  const cv = document.getElementById('grid') as HTMLCanvasElement;
  const dpr = window.devicePixelRatio || 1;
  const cw = cv.clientWidth;
  const ch = cv.clientHeight;
  if (cv.width !== cw * dpr || cv.height !== ch * dpr) {
    cv.width = cw * dpr;
    cv.height = ch * dpr;
  }
  const ctx = cv.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = TH().voidFill;
  ctx.fillRect(0, 0, cw, ch);

  if (baseDirty) buildBase();
  if (!stripePattern) stripePattern = makeStripePattern();

  const s = state.view.scale;
  const ox = state.view.ox;
  const oy = state.view.oy;

  // Heightmap (pixelated scale-up)
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(baseCanvas!, 0, 0, W, H, ox, oy, W * s, H * s);

  // Subtle grid lines when zoomed in
  if (s >= GRID_LINE_MIN_SCALE) {
    ctx.strokeStyle = TH().gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = 0; gx <= W; gx++) {
      const x = ox + gx * s;
      ctx.moveTo(x, oy);
      ctx.lineTo(x, oy + H * s);
    }
    for (let gy = 0; gy <= H; gy++) {
      const y = oy + gy * s;
      ctx.moveTo(ox, y);
      ctx.lineTo(ox + W * s, y);
    }
    ctx.stroke();
  }

  // Path (each segment colored by the phase it was taken in)
  if (state.path.length > 1) {
    ctx.lineWidth = Math.max(1, s * 0.16);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < state.path.length; i++) {
      const a = state.path[i - 1];
      const b = state.path[i];
      ctx.strokeStyle = PHASE_COLOR[b.phase] + 'cc';
      ctx.beginPath();
      ctx.moveTo(ox + (a.x + 0.5) * s, oy + (a.y + 0.5) * s);
      ctx.lineTo(ox + (b.x + 0.5) * s, oy + (b.y + 0.5) * s);
      ctx.stroke();
    }
  }

  // Previous location - striped / greyed
  if (state.prev && (state.prev.x !== state.pos.x || state.prev.y !== state.pos.y)) {
    const px = ox + state.prev.x * s;
    const py = oy + state.prev.y * s;
    ctx.fillStyle = stripePattern ?? TH().stripeFill;
    ctx.save();
    ctx.translate(px, py);
    ctx.fillRect(0, 0, s, s);
    ctx.restore();
    ctx.strokeStyle = TH().prevStroke;
    ctx.lineWidth = Math.max(1, s * 0.08);
    ctx.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
  }

  // Minima (stars)
  state.minima.forEach((m, i) => {
    const cx = ox + (m.x + 0.5) * s;
    const cy = oy + (m.y + 0.5) * s;
    drawStar(ctx, cx, cy, TH().starFill, Math.max(5, s * 0.7));
    if (s >= 7) {
      ctx.fillStyle = TH().starNum;
      ctx.font = `bold ${Math.max(6, s * 0.5)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), cx, cy);
    }
    if (m.note) drawNoteTick(ctx, cx, cy, s, TH().starFill);
  });

  // Pass points (rings)
  state.passPoints.forEach((pp, i) => {
    const cx = ox + (pp.x + 0.5) * s;
    const cy = oy + (pp.y + 0.5) * s;
    const r = Math.max(3, s * 0.4);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = TH().ringFill;
    ctx.fill();
    ctx.strokeStyle = TH().ringStroke;
    ctx.lineWidth = Math.max(1, s * 0.1);
    ctx.stroke();
    if (s >= 8) {
      ctx.fillStyle = TH().ringNum;
      ctx.font = `bold ${Math.max(6, s * 0.45)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), cx, cy);
    }
    if (pp.note) drawNoteTick(ctx, cx, cy, s, TH().ringStroke);
  });

  // Start marker (triangle)
  const sp = state.path[0];
  if (sp && (sp.x !== state.pos.x || sp.y !== state.pos.y)) {
    const x = ox + (sp.x + 0.5) * s;
    const y = oy + (sp.y + 0.5) * s;
    const r = Math.max(3, s * 0.36);
    ctx.fillStyle = TH().start;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y + r);
    ctx.lineTo(x - r, y + r);
    ctx.closePath();
    ctx.fill();
  }

  // Current cell (cyan outline + center dot)
  const lw = Math.max(1.5, s * 0.12);
  const curx = ox + state.pos.x * s;
  const cury = oy + state.pos.y * s;
  ctx.strokeStyle = TH().current;
  ctx.lineWidth = lw;
  ctx.strokeRect(curx + lw / 2, cury + lw / 2, s - lw, s - lw);
  ctx.beginPath();
  ctx.arc(ox + (state.pos.x + 0.5) * s, oy + (state.pos.y + 0.5) * s, Math.max(1.5, s * 0.1), 0, Math.PI * 2);
  ctx.fillStyle = TH().current;
  ctx.fill();
}

function drawNoteTick(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string): void {
  const r = Math.max(4, s * 0.4);
  ctx.beginPath();
  ctx.arc(cx + r * 0.8, cy - r * 0.8, Math.max(2, s * 0.13), 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = TH().noteOutline;
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  color: string,
  outerR: number,
): void {
  const innerR = outerR * 0.42;
  const spikes = 5;
  const step = Math.PI / spikes;
  let rot = -Math.PI / 2;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    ctx[i === 0 ? 'moveTo' : 'lineTo'](cx + Math.cos(rot) * r, cy + Math.sin(rot) * r);
    rot += step;
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
}
