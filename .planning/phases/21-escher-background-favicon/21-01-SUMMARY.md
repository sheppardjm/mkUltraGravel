---
phase: 21-escher-background-favicon
plan: 01
subsystem: ui
tags: [svg, favicon, penrose-triangle, geometry]

# Dependency graph
requires:
  - phase: 20-bike-icon-crosshair
    provides: completed v3.0 UX polish — phase 21 builds on stable base
provides:
  - Penrose triangle SVG favicon replacing the "MK" text placeholder
affects: [none — favicon is a standalone visual identity asset]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hex fills in public/favicon.svg (not oklch) for maximum SVG browser compatibility"
    - "scale(0.114, 0.132) g-wrapper adapts 280x243 Wikipedia coordinates to 32x32 viewBox"

key-files:
  created: []
  modified:
    - public/favicon.svg

key-decisions:
  - "Hex fills (#a3f0a0, #6db86a, #3d7a3a) used instead of oklch() — SVG fill attribute oklch support is inconsistent; hex matches existing favicon.svg pattern"
  - "scale() transform on <g> wrapper chosen over pre-calculating coordinates — cleaner, preserves original path data provenance"
  - "Background #14141e (not #1a1a2e from old favicon) — exact hex equivalent of oklch(0.10 0.01 250) site bg-base"

patterns-established:
  - "Penrose triangle geometry: three <path> elements from Wikipedia SVG (public domain) scaled via transform on <g>"

# Metrics
duration: 3min
completed: 2026-03-29
---

# Phase 21 Plan 01: Penrose Triangle Favicon Summary

**Penrose impossible triangle SVG favicon using three tonal accent-green hex fills on dark navy background, replacing the MK text placeholder**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-29T18:36:38Z
- **Completed:** 2026-03-29T18:40:10Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Replaced `<text>MK</text>` placeholder with three Penrose triangle `<path>` elements
- Three tonal green fills (#a3f0a0 brightest / #6db86a mid / #3d7a3a darkest) communicate the 3D impossible-triangle illusion at 32px
- Dark navy background #14141e matches site's bg-base for correct rendering on browser tab chrome
- Build verified passing with Node 25 (project requires >=22.12.0)

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace favicon.svg with Penrose triangle polygons** - `0d91cc7` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `public/favicon.svg` — Penrose triangle with three hex-filled paths on dark background; 32x32 viewBox; no `<text>` elements

## Decisions Made

- Used hex fills (#a3f0a0, #6db86a, #3d7a3a) instead of oklch() color syntax — the research flagged oklch in SVG fill attributes as MEDIUM-confidence browser support, and the existing favicon.svg already used hex fills as its pattern. Matching the existing file convention is safer.
- Used `transform="scale(0.114, 0.132)"` on a `<g>` wrapper rather than pre-calculating all six polygon coordinate pairs — cleaner approach that preserves the original Wikipedia path data for future reference.
- Background changed from #1a1a2e (old placeholder) to #14141e — the hex equivalent of oklch(0.10 0.01 250) which is the actual --color-bg-base used site-wide.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Node 20 installed at default PATH rejects Astro 6 (`npx astro build` requires >=22.12.0). Resolved by running build with `/usr/local/opt/node@25/bin` prepended to PATH. This is a local environment issue, not a code issue — the build itself passes cleanly.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Favicon complete. `public/favicon.svg` is ready for browser tab display.
- Plan 21-02 (Escher isometric cube background) is the only remaining v3.0 plan. The global.css already has `.escher-overlay` CSS from an earlier session; BaseLayout.astro still needs the `<div class="escher-overlay">` element added.
- The Lighthouse TBT gate noted in STATE.md blockers applies to 21-02, not this plan.

---
*Phase: 21-escher-background-favicon*
*Completed: 2026-03-29*
