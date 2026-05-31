// ═══════════════════════════════════════════════════════════════════════════
// MAD Explorer v2 - Annotated PNG export of the explored map
// Renders heightmap + path + markers into a detached canvas at a fixed scale.
// ═══════════════════════════════════════════════════════════════════════════

import { state } from './state';
import { TH } from './theme';
import { getBaseCanvas, drawStar } from './render/map';
import { W, H, PHASE_COLOR } from './constants';

const PNG_PAD_CELLS = 1; // border around the map, in cells
const PNG_SCALE = 9; // px per cell in the exported image

export function exportPNG(): void {
  const out = document.createElement('canvas');
  const s = PNG_SCALE;
  out.width = (W + PNG_PAD_CELLS * 2) * s;
  out.height = (H + PNG_PAD_CELLS * 2) * s;

  const ctx = out.getContext('2d')!;
  ctx.fillStyle = TH().voidFill;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(getBaseCanvas(), 0, 0, W, H, PNG_PAD_CELLS * s, PNG_PAD_CELLS * s, W * s, H * s);

  const ox = PNG_PAD_CELLS * s;
  const oy = PNG_PAD_CELLS * s;

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

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  state.minima.forEach((m, i) => {
    const cx = ox + (m.x + 0.5) * s;
    const cy = oy + (m.y + 0.5) * s;
    drawStar(ctx, cx, cy, TH().starFill, s * 0.7);
    ctx.fillStyle = TH().starNum;
    ctx.font = `bold ${s * 0.5}px monospace`;
    ctx.fillText(String(i + 1), cx, cy);
  });

  state.passPoints.forEach((pp, i) => {
    const cx = ox + (pp.x + 0.5) * s;
    const cy = oy + (pp.y + 0.5) * s;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = TH().ringFill;
    ctx.fill();
    ctx.strokeStyle = TH().ringStroke;
    ctx.lineWidth = s * 0.1;
    ctx.stroke();
    ctx.fillStyle = TH().ringNum;
    ctx.font = `bold ${s * 0.45}px monospace`;
    ctx.fillText(String(i + 1), cx, cy);
  });

  out.toBlob((b) => {
    if (!b) return;
    const url = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mad-map-seed${state.seed}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
