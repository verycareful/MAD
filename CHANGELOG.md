# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Versioning uses the `A.B.C.D` scheme (A: 0 = Alpha, 1 = Beta, R = Release; B: major;
C: minor; D: patch, where `.1` is reserved for test-suite releases). The npm package
in `frontend/` mirrors the numeric mapping, e.g. `0.1.0.0` maps to `0.1.0`.

## [0.1.0.0] - 2026-05-31

Initial Alpha. Recreated the MAD Explorer v2 design handoff as a framework-free
Vite + TypeScript frontend, and prepared the repository for GitHub and Pages.

### Added
- **MAD Explorer v2** (`frontend/`): a human-driven 2D loss-landscape walker, built
  as modular ES-module TypeScript with a Vite build and no UI framework.
  - Deterministic seeded landscape (mulberry32 + 24 gaussian bumps), reproducible from its seed.
  - Fog-of-war canvas map with zoom/pan, phase-colored path, and minima / pass-point / start markers.
  - Current-relative diverging **neighbor grid** (blue = lower, red = higher, white = current) with 4-decimal heights and adaptive text contrast.
  - Four-phase tagging (descent / ascent / backtrack), mark-minimum, add-pass-point, and animated backtrack.
  - Undo/redo (snapshot history) and localStorage autosave (seed only; landscape regenerated on load).
  - **Intent-trace** JSON export/import (`format: "mad-explorer-trace"`, `version: 2`) and annotated PNG export.
  - Dark and light themes (DOM via CSS custom properties, canvas via a JS palette).
- **32 Vitest unit tests** covering the pure logic: colormap, landscape determinism, history, trace round-trip, and neighbor math.
- **GitHub Pages deploy** workflow (`.github/workflows/pages.yml`) that builds `frontend/` and publishes `frontend/dist`.
- Repository scaffolding: `.gitignore`, `.gitattributes`, a root `README.md`, and verification screenshots under `docs/assets/`.

### Changed
- Archived the v1 single-file Explorer to `legacy/frontend-v1/` (previously `frontend/index.html`).

### Removed
- The redundant root `MAD Explorer.html` (a browser Save-As copy of the v1 frontend).

[Unreleased]: https://github.com/verycareful/MAD/compare/v0.1.0.0...HEAD
[0.1.0.0]: https://github.com/verycareful/MAD/releases/tag/v0.1.0.0
