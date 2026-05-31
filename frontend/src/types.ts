// ═══════════════════════════════════════════════════════════════════════════
// MAD Explorer v2 - Shared type declarations
// ═══════════════════════════════════════════════════════════════════════════

export type Phase = 'descent' | 'ascent' | 'backtrack';
export type CmapMode = 'rdbu' | 'mono';
export type Theme = 'dark' | 'light';

export interface XY {
  x: number;
  y: number;
}

export interface PathStep {
  x: number;
  y: number;
  phase: Phase;
}

export interface PassPoint {
  x: number;
  y: number;
  pathLen: number;
  id: number;
  note: string;
}

export interface Minimum {
  x: number;
  y: number;
  h: number;
  id: number;
  note: string;
}

export interface View {
  scale: number;
  ox: number;
  oy: number;
}

// ─── Global application state ─────────────────────────────────────────────────
export interface State {
  W: number;
  H: number;
  seed: number;
  heights: Float64Array | null; // length W*H, normalized 0..1; regenerable from seed
  revealed: Set<number>; // flat indices revealed by fog-of-war
  pos: XY;
  prev: XY | null; // immediately-previous cell (striped on map)
  path: PathStep[];
  passPoints: PassPoint[];
  minima: Minimum[];
  phase: Phase;
  stepCount: number;
  nextId: number;
  isAnimating: boolean;
  description: string;
  cmapMode: CmapMode;
  theme: Theme;
  view: View;
}

// ─── Undo/redo + persistence snapshot (everything except regenerable heights) ──
export interface Snapshot {
  revealed: number[];
  pos: XY;
  prev: XY | null;
  path: PathStep[];
  passPoints: PassPoint[];
  minima: Minimum[];
  phase: Phase;
  stepCount: number;
  nextId: number;
  description: string;
}

export interface AutosavePayload {
  seed: number;
  cmapMode: CmapMode;
  theme: Theme;
  view: View;
  state: Snapshot;
}

// ─── Intent trace (the primary export artifact) ───────────────────────────────
export interface TracePhaseRun {
  phase: Phase;
  points: [number, number][];
}

export interface TraceMarker {
  index: number;
  at: [number, number];
  height: number;
  note: string;
}

export interface TraceEvent {
  kind: 'pass_point' | 'minimum';
  index: number;
  at: [number, number];
  height?: number;
  note: string;
}

export interface Trace {
  format: 'mad-explorer-trace';
  version: 2;
  createdAt: string;
  description: string;
  landscape: {
    generator: 'gaussian-sum';
    width: number;
    height: number;
    seed: number;
    note: string;
  };
  start: [number, number];
  finish: [number, number];
  stepCount: number;
  phaseRuns: TracePhaseRun[];
  passPoints: TraceMarker[];
  minima: TraceMarker[];
  events: TraceEvent[];
  fullPath: [number, number, string][];
}
