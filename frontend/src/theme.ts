// ═══════════════════════════════════════════════════════════════════════════
// MAD Explorer v2 - Canvas theme palette
//
// The DOM is themed via CSS custom properties (see style.css). The canvas can't
// read CSS vars, so canvas-drawn colors come from here. TH() returns the active
// set. Switching theme is handled in actions.setTheme() (it must also mark the
// fog base dirty and reset the cached stripe pattern).
// ═══════════════════════════════════════════════════════════════════════════

import { state } from './state';
import type { RGB } from './colormap';
import type { Theme } from './types';

export interface CanvasTheme {
  voidFill: string;
  unrevealed: RGB;
  gridLine: string;
  stripeFill: string;
  stripeLine: string;
  prevStroke: string;
  starFill: string;
  starNum: string;
  ringFill: string;
  ringStroke: string;
  ringNum: string;
  start: string;
  current: string;
  noteOutline: string;
}

export const THEME: Record<Theme, CanvasTheme> = {
  dark: {
    voidFill: '#070608',
    unrevealed: [10, 9, 13],
    gridLine: 'rgba(255,255,255,0.05)',
    stripeFill: 'rgba(90,84,96,0.55)',
    stripeLine: 'rgba(20,18,26,0.9)',
    prevStroke: 'rgba(150,142,156,0.8)',
    starFill: '#f0c060',
    starNum: '#0a0a0c',
    ringFill: 'rgba(255,255,255,0.12)',
    ringStroke: '#ffffffdd',
    ringNum: '#ffffff',
    start: '#c8a96e',
    current: '#00ffcc',
    noteOutline: '#0a0a0c',
  },
  light: {
    voidFill: '#e7e0d2',
    unrevealed: [206, 198, 183],
    gridLine: 'rgba(0,0,0,0.08)',
    stripeFill: 'rgba(120,112,100,0.5)',
    stripeLine: 'rgba(235,230,220,0.9)',
    prevStroke: 'rgba(70,64,54,0.85)',
    starFill: '#c8870f',
    starNum: '#fff8e8',
    ringFill: 'rgba(20,16,10,0.14)',
    ringStroke: '#2a241acc',
    ringNum: '#1c1812',
    start: '#9a7636',
    current: '#008f6b',
    noteOutline: '#fbf8f1',
  },
};

export function TH(): CanvasTheme {
  return THEME[state.theme];
}
