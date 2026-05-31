import { describe, it, expect, beforeEach } from 'vitest';
import { state } from '../src/state';
import { newGame } from '../src/game';
import { buildTrace, importTrace } from '../src/trace';
import { PHASE } from '../src/constants';

beforeEach(() => {
  newGame(2024);
});

describe('buildTrace', () => {
  it('emits the v2 trace envelope', () => {
    const t = buildTrace();
    expect(t.format).toBe('mad-explorer-trace');
    expect(t.version).toBe(2);
    expect(t.landscape.generator).toBe('gaussian-sum');
    expect(t.landscape.seed).toBe(2024);
  });

  it('compresses the path into consecutive same-phase runs', () => {
    state.path = [
      { x: 50, y: 50, phase: PHASE.descent },
      { x: 50, y: 51, phase: PHASE.descent },
      { x: 50, y: 52, phase: PHASE.ascent },
      { x: 51, y: 52, phase: PHASE.ascent },
      { x: 51, y: 53, phase: PHASE.descent },
    ];
    const t = buildTrace();
    expect(t.phaseRuns.map((r) => r.phase)).toEqual(['descent', 'ascent', 'descent']);
    expect(t.phaseRuns.map((r) => r.points.length)).toEqual([2, 2, 1]);
  });

  it('encodes fullPath with phase initials', () => {
    state.path = [
      { x: 1, y: 1, phase: PHASE.descent },
      { x: 1, y: 2, phase: PHASE.ascent },
      { x: 1, y: 3, phase: PHASE.backtrack },
    ];
    expect(buildTrace().fullPath).toEqual([
      [1, 1, 'd'],
      [1, 2, 'a'],
      [1, 3, 'b'],
    ]);
  });

  it('records ordered events for pass points and minima', () => {
    state.passPoints = [{ x: 10, y: 10, pathLen: 1, id: 1, note: 'branch' }];
    state.minima = [{ x: 20, y: 20, h: 0.1234, id: 2, note: 'deep' }];
    const t = buildTrace();
    expect(t.events.map((e) => e.kind)).toEqual(['pass_point', 'minimum']);
    const min = t.events.find((e) => e.kind === 'minimum')!;
    expect(min.height).toBeCloseTo(0.1234, 4);
    expect(min.note).toBe('deep');
  });
});

describe('importTrace round-trip', () => {
  it('restores path, markers, description, and position from an exported trace', () => {
    state.path = [
      { x: 50, y: 50, phase: PHASE.descent },
      { x: 50, y: 51, phase: PHASE.descent },
      { x: 51, y: 51, phase: PHASE.ascent },
    ];
    state.pos = { x: 51, y: 51 };
    state.stepCount = 2;
    state.description = 'demo intent';
    state.passPoints = [{ x: 50, y: 51, pathLen: 2, id: 1, note: 'branch here' }];
    state.minima = [{ x: 50, y: 50, h: 0.5, id: 2, note: 'basin' }];
    const originalSeed = state.seed;

    const exported = JSON.parse(JSON.stringify(buildTrace()));
    newGame(0); // wipe to a different landscape/state
    importTrace(exported);

    expect(state.seed).toBe(originalSeed);
    expect(state.description).toBe('demo intent');
    expect(state.pos).toEqual({ x: 51, y: 51 });
    expect(state.path.length).toBe(3);
    expect(state.path[2].phase).toBe('ascent');
    expect(state.passPoints).toHaveLength(1);
    expect(state.passPoints[0].note).toBe('branch here');
    expect(state.minima).toHaveLength(1);
    expect(state.minima[0].note).toBe('basin');
  });

  it('rejects objects that are not MAD Explorer traces', () => {
    expect(() => importTrace({ foo: 1 })).toThrow();
    expect(() => importTrace(null)).toThrow();
  });
});
