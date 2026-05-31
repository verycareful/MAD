import { describe, it, expect } from 'vitest';
import { cmap, textOn, lerpStops, type RGB } from '../src/colormap';

describe('cmap (mono)', () => {
  it('maps 0 → black and 1 → white', () => {
    expect(cmap(0, 'mono')).toEqual([0, 0, 0]);
    expect(cmap(1, 'mono')).toEqual([255, 255, 255]);
  });
  it('clamps out-of-range input', () => {
    expect(cmap(-1, 'mono')).toEqual([0, 0, 0]);
    expect(cmap(2, 'mono')).toEqual([255, 255, 255]);
  });
});

describe('cmap (rdbu)', () => {
  it('midpoint is near white', () => {
    const [r, g, b] = cmap(0.5, 'rdbu');
    expect(r).toBeGreaterThan(240);
    expect(g).toBeGreaterThan(240);
    expect(b).toBeGreaterThan(240);
  });
  it('low end leans blue, high end leans red', () => {
    const lo = cmap(0, 'rdbu');
    expect(lo[2]).toBeGreaterThan(lo[0]); // blue > red
    const hi = cmap(1, 'rdbu');
    expect(hi[0]).toBeGreaterThan(hi[2]); // red > blue
  });
});

describe('textOn', () => {
  it('uses white text on a dark tile and dark text on a light tile', () => {
    expect(textOn(0, 'mono')).toBe('#ffffff'); // black tile
    expect(textOn(1, 'mono')).toBe('#0a0a0c'); // white tile
  });
});

describe('lerpStops', () => {
  it('returns endpoints and a clamped midpoint', () => {
    const stops: RGB[] = [
      [0, 0, 0],
      [1, 1, 1],
    ];
    expect(lerpStops(stops, 0)).toEqual([0, 0, 0]);
    expect(lerpStops(stops, 1)).toEqual([255, 255, 255]);
    expect(lerpStops(stops, 0.5)).toEqual([127, 127, 127]); // (0.5*255)|0
  });
});
