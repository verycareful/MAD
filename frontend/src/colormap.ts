// ═══════════════════════════════════════════════════════════════════════════
// MAD Explorer v2 - Colormaps + adaptive text color (pure)
//   'rdbu' - diverging Blue(low) ↔ White(mid) ↔ Red(high)  [ColorBrewer RdBu]
//   'mono' - Black(low) → White(high) grayscale
// Mode is passed explicitly so this module stays free of global state.
// ═══════════════════════════════════════════════════════════════════════════

import type { CmapMode } from './types';

export type RGB = [number, number, number];

// Text flips dark/light by relative luminance because both colormaps produce
// light AND dark tiles. Threshold on 0..255 luminance.
const LUM_TEXT_THRESHOLD = 150;

const RDBU: RGB[] = [
  [0.019, 0.188, 0.380], [0.129, 0.400, 0.674], [0.262, 0.576, 0.764],
  [0.572, 0.772, 0.870], [0.819, 0.898, 0.941], [0.968, 0.968, 0.968],
  [0.992, 0.858, 0.780], [0.956, 0.647, 0.510], [0.839, 0.376, 0.302],
  [0.698, 0.094, 0.168], [0.404, 0.000, 0.121],
];

export function lerpStops(stops: RGB[], t: number): RGB {
  t = Math.max(0, Math.min(1, t));
  const n = stops.length - 1;
  const i = t * n;
  const lo = Math.floor(i);
  const f = i - lo;
  const hi = Math.min(lo + 1, n);
  const a = stops[lo];
  const b = stops[hi];
  return [
    ((a[0] + (b[0] - a[0]) * f) * 255) | 0,
    ((a[1] + (b[1] - a[1]) * f) * 255) | 0,
    ((a[2] + (b[2] - a[2]) * f) * 255) | 0,
  ];
}

export function cmap(t: number, mode: CmapMode): RGB {
  if (mode === 'mono') {
    const v = (Math.max(0, Math.min(1, t)) * 255) | 0;
    return [v, v, v];
  }
  return lerpStops(RDBU, t);
}

export function cmapCss(t: number, mode: CmapMode): string {
  const [r, g, b] = cmap(t, mode);
  return `rgb(${r},${g},${b})`;
}

export function textOn(t: number, mode: CmapMode): string {
  const [r, g, b] = cmap(t, mode);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > LUM_TEXT_THRESHOLD ? '#0a0a0c' : '#ffffff';
}
