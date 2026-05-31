import { describe, it, expect, beforeEach } from 'vitest';
import { state } from '../src/state';
import { snapshot, restore, pushUndo, undo, redo, clearHistory, HISTORY } from '../src/history';
import { newGame } from '../src/game';
import { HISTORY_CAP } from '../src/constants';

beforeEach(() => {
  newGame(99);
  clearHistory();
  state.isAnimating = false;
});

describe('snapshot / restore', () => {
  it('round-trips state (excluding regenerable heights)', () => {
    state.pos = { x: 10, y: 20 };
    state.stepCount = 5;
    state.description = 'hi';
    const snap = snapshot();

    state.pos = { x: 0, y: 0 };
    state.stepCount = 0;
    state.description = '';
    restore(snap);

    expect(state.pos).toEqual({ x: 10, y: 20 });
    expect(state.stepCount).toBe(5);
    expect(state.description).toBe('hi');
  });

  it('produces a deep copy (mutating state does not mutate the snapshot)', () => {
    state.pos = { x: 1, y: 1 };
    const snap = snapshot();
    state.pos.x = 99;
    expect(snap.pos.x).toBe(1);
  });
});

describe('undo / redo', () => {
  it('undo restores the previous snapshot and redo reapplies it', () => {
    state.pos = { x: 1, y: 1 };
    pushUndo();
    state.pos = { x: 2, y: 2 };

    expect(undo()).toBe(true);
    expect(state.pos).toEqual({ x: 1, y: 1 });
    expect(redo()).toBe(true);
    expect(state.pos).toEqual({ x: 2, y: 2 });
  });

  it('returns false on an empty stack', () => {
    clearHistory();
    expect(undo()).toBe(false);
    expect(redo()).toBe(false);
  });

  it('pushUndo clears the redo stack', () => {
    state.pos = { x: 1, y: 1 };
    pushUndo();
    state.pos = { x: 2, y: 2 };
    undo();
    expect(HISTORY.redo.length).toBe(1);
    pushUndo();
    expect(HISTORY.redo.length).toBe(0);
  });

  it('is blocked while animating', () => {
    state.pos = { x: 1, y: 1 };
    pushUndo();
    state.pos = { x: 2, y: 2 };
    state.isAnimating = true;
    expect(undo()).toBe(false);
    state.isAnimating = false;
  });
});

describe('cap', () => {
  it('caps the undo stack at HISTORY_CAP', () => {
    clearHistory();
    for (let i = 0; i < HISTORY_CAP + 50; i++) pushUndo();
    expect(HISTORY.undo.length).toBe(HISTORY_CAP);
  });
});
