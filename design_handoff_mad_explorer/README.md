# Handoff: MAD Explorer v2

## Overview

**MAD Explorer** is an interactive tool for *manually* walking a 2D loss landscape — the
human plays the role of the optimizer. Its real purpose is **communication**: it lets a
person *demonstrate the intent* of the MAD (Minimum Ascent Descent) global-optimization
algorithm to an AI agent / developer in a way that's hard to put into words. The human
descends into a basin, marks a minimum, climbs back out via the shallowest path, drops a
"pass point" where the valley branches, and backtracks through the pass-point stack —
exactly the four-phase loop the MAD algorithm implements (Descent → Ascent → Backtrack →
Terminate).

v2 is an upgrade of an earlier prototype. The goals of this round were: **(1)** make it far
more usable (zoom/pan, undo/redo), **(2)** let a session be **saved and exported** as a
structured "intent trace" an agent can read, and **(3)** sharpen the per-tile readout so
fine height differences are legible.

## About the Design Files

The files in this bundle are **design references created in HTML/CSS/vanilla-JS** — a
working prototype showing the intended look and behavior. They are **not** prescribed
production code. The task is to **recreate this tool inside the target codebase's
environment** (the MAD project is C++ core + a web frontend; if you rebuild the frontend in
React/Vue/etc., use that stack's idioms). If you keep it as a standalone static tool, the
prototype JS is already clean and modular and can be adopted close to as-is.

The prototype is intentionally framework-free (no build step): plain `<canvas>` + DOM, four
small JS files loaded with `<script src>`. Globals are shared across files (no modules).

## Fidelity

**High-fidelity.** Final colors, layout, type, spacing, and interactions are all specified
below and visible in the prototype. Recreate the UI faithfully, but feel free to map it onto
the host codebase's component/styling conventions.

---

## Screens / Views

This is a **single-screen** application: a fixed 42px header over a two-column body
(map canvas + 268px sidebar). No routing.

### Header (height 42px, `background #13121a`, bottom border `#2a2630`)
Left → right, separated by 1px × 20px `#2a2630` dividers:
1. **Title** — "MAD EXPLORER", 12px, color `#c8a96e`, `letter-spacing: 2px`, uppercase.
2. **Phase buttons** (segmented) — `▼ Descent`, `▲ Ascent`, `↩ Backtrack`. The active one
   fills with its phase color and uses black text; inactive are transparent with `#5a5460`
   text. Phase colors: descent `#7eb8d4`, ascent `#d47e7e`, backtrack `#b07ed4`.
3. **Undo / Redo** icon buttons (`↶ ↷`), disabled (opacity 0.3) when their stack is empty.
4. **Zoom group** — `−`, `⤢` (fit), `+` icon buttons (24px wide).
5. **Steps: N** and **seed N** readouts (`#5a5460`, 10px / 9px).
6. **Colormap toggle** (segmented) — `Red–Blue` / `Mono`. Active fills `#c8a96e` w/ black text.
7. **Theme toggle** (segmented) — `◐ Dark` / `◑ Light`. Switches the whole UI *and* the
   canvas-drawn colors live (see *Theming* below).
8. **⌖ Seed** and **↺ New** text buttons.

All header buttons: 1px `#2a2630` border, 2px radius, 10px monospace, hover → border+text
`#c8a96e`.

### Map (left column, fills remaining width; wrapper `background #070608`)
A full-size `<canvas>` rendering a 100×100 cell landscape with **fog of war** (only cells
within the 3×3 around each visited position are ever revealed; unrevealed cells draw as
`rgb(10,9,13)`). Drawn on top of the heightmap, in this order:
- **Path** — poly-line through visited cells, each segment colored by the phase it was taken
  in (see phase colors), ~`scale*0.16` px wide, round caps, `cc` (80%) alpha.
- **Previous-location cell** — the single cell you just left, filled with a grey/dark
  diagonal-stripe pattern + a `rgba(150,142,156,0.8)` outline.
- **Minima** — gold (`#f0c060`) 5-point stars with a black index number.
- **Pass points** — white rings (`rgba(255,255,255,0.12)` fill, `#ffffffdd` stroke) with a
  white index number. A small colored dot in the upper-right of a marker indicates it has a
  note attached.
- **Start marker** — gold (`#c8a96e`) upward triangle.
- **Current cell** — `#00ffcc` (cyan) square outline + center dot.
- Faint grid lines (`rgba(255,255,255,0.04)`) appear once zoomed in past scale ≥ 11 px/cell.

Bottom-left **hint pill**: "scroll = zoom · drag = pan · click adjacent = move · F = fit".

### Sidebar (right column, width 268px, left border `#2a2630`, scrollable, 6px gap of panels)
Panels (`background #13121a`, 1px `#2a2630` border, 3px radius, 7–8px padding). Each panel
title `h3`: 9px, uppercase, `letter-spacing: 1.5px`, color `#c8a96e`.

1. **Position** — current `(x, y)` at 14px; a 5px height bar whose width = height×100% and
   whose fill color = the current colormap at that height; `h = 0.NNNN` (4 decimals) below.
2. **Neighbors** — title shows the live local frame right-aligned: `▼low ●current ▲high`
   (lowest neighbour / current tile / highest neighbour). Below it the **current-relative 3×3
   grid** (see *Neighbor grid* spec below).
3. **Actions** — three full-width left-aligned buttons with a key-chip: `M ★ Mark Minimum`,
   `P ◉ Add Pass Point`, `B ↩ Backtrack (latest)`.
4. **Pass Points (count)** — list of `#i (x,y)  h=0.NNNN` rows; clicking the row or its dot
   backtracks to it; a `+`/`✎` button adds/edits a note (shown as an italic sub-row).
5. **Minima Found (count)** — same pattern with gold `★`, no backtrack action, notes editable.
6. **Session** — a `<textarea>` for a freeform "what am I trying to show" description, plus a
   row of three buttons: `⤓ JSON`, `⤓ PNG`, `⤒ Import`.
7. **Keyboard** — a QWE/ASD/ZXC 3×3 key legend + a list of remaining shortcuts.

#### Neighbor grid (the key readout — implement exactly)
A 3×3 grid (`gap: 2px`, square cells, 2px radius) of the 8 surrounding tiles + center:
- **Colored RELATIVE TO THE CURRENT TILE (diverging):** the current cell is the midpoint
  (white). **Shades of blue = neighbours lower than current; shades of red = neighbours
  higher than current.** Intensity scales by the largest absolute deviation among the 8
  immediate in-bounds neighbours (symmetric, so the steeper of up/down reads stronger and a
  tiny slope still shows as a faint tint). Concretely:
  `t = clamp(0.5 + 0.5*(h - currentH)/maxDev, 0, 1)`, then `cmap(t)`.
- **4-decimal values**: each cell shows its height to 4 decimals (`toFixed(4)`).
- **Adaptive text color**: value/label text is black (`#0a0a0c`) on light backgrounds and
  white (`#ffffff`) on dark, chosen by the cell's relative luminance
  (`0.2126R + 0.7152G + 0.0722B > 150` → dark text). This is required because both colormaps
  produce light *and* dark tiles.
- Each non-center cell also shows its compass label (NW/N/NE/…) and an arrow `↓`/`↑`/`—`
  vs. the current cell.
- The **center cell** has a `#00ffcc` outline; the **previous-location** neighbour gets the
  same diagonal-stripe overlay used on the map.
- Clicking any in-bounds neighbour moves there. Out-of-bounds cells render `#0d0d10` with `—`.

> Design history: the prototype briefly offered three neighbour visualizations
> (Grid / Compass / Inset). Per review, **only the Grid is kept**; the others were removed.

---

## Interactions & Behavior

- **Move** (8-directional): arrow keys (cardinal), Q/W/E/A/D/Z/X/C (incl. diagonals),
  clicking an adjacent map cell, or clicking a neighbour-grid cell. Each move reveals the new
  3×3, appends to the path tagged with the **current phase**, and sets the previous-cell.
- **Phase** is a mode the human sets (`1`/`2`/`3` or the header buttons); it only colors the
  path and tags trace steps — it does not constrain movement.
- **Mark Minimum** (`M`) / **Add Pass Point** (`P`): record a marker at the current cell
  (de-duplicated). **Backtrack** (`B` or clicking a pass point / its list row): animates the
  position back along the recorded path to that pass point (~45 ms/step), tagging those steps
  as `backtrack`.
- **Zoom/Pan**: mouse wheel zooms toward the cursor (scale clamped 1.5–60 px/cell); drag pans
  (a >4px drag is treated as pan, otherwise mouseup is a click→move); `F` fits, `+`/`−` zoom
  about center; `⤢` button fits. Default view on a fresh game ≈ 34 cells across, centered.
- **Undo/Redo**: `Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z` (or `Ctrl+Y`), or the header buttons.
  Snapshot-based; a whole backtrack animation is one undo step.
- **Notes**: `+`/`✎` on any pass point or minimum opens a prompt to attach/edit a note.
- **Colormap toggle**: switches all height coloring between `rdbu` and `mono` live.
- **New / Seed**: New generates a random seed; Seed prompts for a specific seed number.
- Transient **toast** (bottom-center) for feedback ("Edge of world!", "★ Minimum #1", …).

## State Management

Single global state object `S` plus an undo/redo history. Key fields:
`seed`, `heights` (Float64Array, length 100×100, normalized 0–1), `revealed` (Set of flat
indices), `pos {x,y}`, `prev {x,y}|null`, `path [{x,y,phase}]`, `passPoints
[{x,y,pathLen,id,note}]`, `minima [{x,y,h,id,note}]`, `phase`, `stepCount`, `nextId`,
`isAnimating`, `description`, `cmapMode ('rdbu'|'mono')`, `theme ('dark'|'light')`,
`view {scale, ox, oy}`.

- **History**: `{undo:[], redo:[]}` of `snapshot()` objects (everything except `heights`,
  which is regenerable from `seed`). `pushUndo()` is called before each mutating action and
  clears the redo stack. Cap ~300.
- **Persistence**: debounced **autosave to `localStorage`** (key `mad_explorer_v2`) holding
  `seed`, `cmapMode`, `theme`, `view`, and a state snapshot; restored on boot. Landscape is
  *not* stored — it is regenerated from the seed.

### Reproducible landscape (important)
The landscape is **deterministic from its seed**: a `mulberry32(seed)` PRNG sums 24 random
Gaussian bumps over the 100×100 grid, then normalizes to [0,1]. Same seed ⇒ identical
landscape. This is what makes a saved/exported/shared session replayable, and is the hook for
the planned "run the real algorithm on the same landscape" comparison.

## Export / Import — the "intent trace" (most important output)

`⤓ JSON` downloads `mad-trace-seed<N>.json`. This is the artifact meant for an AI agent /
developer to read. Shape (`format: "mad-explorer-trace", version: 2`):
- `description` (the session textarea), `createdAt`
- `landscape: { generator: "gaussian-sum", width, height, seed, note }` — regenerate to get
  the exact surface back.
- `start`, `finish`, `stepCount`
- `phaseRuns: [{ phase, points: [[x,y],…] }]` — path compressed into consecutive same-phase runs
- `passPoints` / `minima`: `[{ index, at:[x,y], height, note }]`
- `events`: ordered decision narrative (pass_point / minimum, with notes) — quick to read
- `fullPath: [[x, y, 'd'|'a'|'b'], …]` — every step, phase as initial letter

`⤒ Import` reads such a JSON back (regenerates the landscape from the seed, restores path,
markers, notes, description, position). `⤓ PNG` downloads an annotated image of the explored
map (heightmap + path + markers) at 9px/cell.

## Theming (dark + light)
Two themes. The **DOM** is themed entirely by CSS custom properties: dark values live in
`:root`, light values in a `[data-theme="light"]` block that overrides the tokens plus a
handful of hardcoded surface colors. `setTheme()` sets `data-theme` on `<html>`.

The **canvas** can't read CSS vars, so canvas-drawn colors come from a JS `THEME` object in
`core.js` with `dark`/`light` variants (`TH()` returns the active set): map void fill,
unrevealed-cell RGB, grid lines, the striped previous-cell pattern, marker fills/strokes/
numbers, start triangle, current-cell highlight, and note-tick outline. Switching theme must
`markBaseDirty()` (recolor the fog base) and reset the cached stripe pattern. The neighbour
grid needs no theme branch — its tile text already auto-flips via `textOn()`, and its tile
colors are the (theme-independent) colormap.

```
Light palette
  --bg #ece6da  --surface #fbf8f1  --surface2 #f1ece1  --border #d6cdbd
  --accent #9a7636  --text #2a251c  --dim #8a8073
  --minimum #c8870f  --current #008f6b  --passpoint #6a6256
  map void #e7e0d2 ; unrevealed cell rgb(206,198,183)
  canvas markers (light): star #c8870f/num #fff8e8 · ring rgba(20,16,10,0.14)/stroke
    #2a241acc/num #1c1812 · start #9a7636 · current #008f6b · note outline #fbf8f1
```

## Design Tokens

```
Colors
  --bg        #0a0a0c     app background
  --surface   #13121a     panels / header
  --surface2  #1a1922
  --border    #2a2630
  --accent    #c8a96e     titles, active toggles, focus
  --text      #e2d8c8
  --dim       #5a5460     secondary text
  map void    #070608 (wrapper) / rgb(10,9,13) (unrevealed cell)

Phase / marker colors
  --descent   #7eb8d4     --ascent  #d47e7e     --backtrack #b07ed4
  --minimum   #f0c060 (gold star)   --passpoint #ffffff (ring)
  --current   #00ffcc (cyan)        start marker #c8a96e
  previous-cell stripe: rgba(150,142,156,0.5–0.55) over rgba(20,18,26,0.85), 45° repeating

Colormaps (value t ∈ [0,1])
  rdbu  ColorBrewer RdBu, blue(low) → white(mid) → red(high). In the neighbour grid the
        scale is centered on the current tile (blue = lower, red = higher). Stops (0–1 RGB):
        [0.019,0.188,0.380] [0.129,0.400,0.674] [0.262,0.576,0.764] [0.572,0.772,0.870]
        [0.819,0.898,0.941] [0.968,0.968,0.968] [0.992,0.858,0.780] [0.956,0.647,0.510]
        [0.839,0.376,0.302] [0.698,0.094,0.168] [0.404,0.000,0.121]
  mono  grayscale: rgb(t*255, t*255, t*255)
  text-on-tile: luminance(0.2126R+0.7152G+0.0722B) > 150 ? #0a0a0c : #ffffff

Type
  Font: 'Courier New', Courier, monospace everywhere. tabular-nums on numeric lists.
  Sizes: panel h3 9px / title 12px / pos 14px / values 10–11px / captions 8–9px.

Radius: 2px (controls/cells), 3px (panels/toast).
Layout: header 42px; body grid 1fr / 268px; panel gap 6px; sidebar scrollbar 5px.
Grid: 100×100 cells; reveal radius 1 (3×3); zoom scale clamp 1.5–60 px/cell.
```

## Assets
None — no images, icon fonts, or external libraries. All glyphs are Unicode characters
(▼ ▲ ↩ ↶ ↷ ⤢ ★ ◉ ⌖ ↺ ⤓ ⤒ ●) and all graphics are canvas-drawn. No network requests.

## Files
- `MAD Explorer v2.html` — markup, all CSS (`:root` tokens), bundler thumbnail, script tags.
- `mad/core.js` — colormaps + `textOn`, `mulberry32` PRNG + landscape generation, global
  state `S`, undo/redo, autosave/load, trace build/export/import.
- `mad/render.js` — canvas heightmap (offscreen 100×100 scaled pixelated) + view (zoom/pan/
  fit/center) + path/marker/previous-cell drawing.
- `mad/neighbor.js` — local-normalized 3×3 neighbour grid (the key readout).
- `mad/app.js` — actions (move/mark/pass/backtrack), notes, sidebar build, input handling
  (mouse/keyboard), wiring, PNG export, boot.

Load order matters: `core → render → neighbor → app` (app boots on `DOMContentLoaded`).

## Context: the MAD algorithm (for understanding intent)
MAD is a global optimizer that treats a loss surface as traversable terrain:
**Phase 1 Descent** (steepest descent until a minimum, or abort if heading toward a known
minimum), **Phase 2 Ascent** (climb out via the *shallowest* valid uphill direction, avoiding
directions that point back toward known minima — the "exclusion cone" — and recording a *pass
point* wherever a new downhill branch opens), **Phase 3 Backtrack** (pop the pass-point stack
to try its other candidate branches), **Phase 4 Terminate** (stack empty → return best
minimum found). The Explorer is the human-driven mirror of this loop; the exported trace is a
demonstration of how a human *intends* the traversal to go.
```
```
