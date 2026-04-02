---
phase: 46-lizard-background-animation
plan: 01
subsystem: ui
tags: [svg, css-animation, performance, accessibility, astro, lighthouse, cwv]

# Dependency graph
requires:
  - phase: 44-escher-svg-overlay
    provides: EscherLizards.astro lizard SVG paths and escher-overlay z-index pattern
  - phase: 21-grain-overlay
    provides: grain-overlay at z-index 9999, global.css keyframe pattern
provides:
  - LizardBackground.astro fixed overlay at z-index 9997 with CSS-only drift
  - lizard-drift keyframes with reduced-motion gate in global.css
  - Complete v8.0 three-layer texture stack (grain 9999, escher 9998, lizard 9997)
affects: [lighthouse-audit, performance, v8.0-milestone]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSS data URI SVG background: percent-encode paths directly (no <pattern>/url(#id) references)"
    - "Keyframes in global.css outside scoped styles — matches escher-drift pattern"
    - "prefers-reduced-motion gate via @media (prefers-reduced-motion: no-preference)"
    - "will-change: transform for compositor promotion on animation-bearing overlays"

key-files:
  created:
    - src/components/LizardBackground.astro
  modified:
    - src/styles/global.css
    - src/layouts/BaseLayout.astro

key-decisions:
  - "opacity: 0.04 starting value — below grain (0.06) and escher (0.05), subject to visual calibration at checkpoint"
  - "80s drift duration — slower than escher 50s to differentiate layers and keep lizard subliminal"
  - "translate(200px, 200px) matches background-size exactly for seamless tiling loop"
  - "SVG paths inlined directly in data URI (no <pattern>/<defs>) to avoid url(#id) encoding issues"
  - "z-index 9997 — below escher (9998) and grain (9999)"

patterns-established:
  - "Three-layer texture stack: grain (9999) > escher (9998) > lizard (9997)"
  - "All decorative overlays use pointer-events: none and aria-hidden=true"
  - "All overlay animations use transform-only keyframes for compositor safety"

# Metrics
duration: 5min
completed: 2026-04-02
---

# Phase 46 Plan 01: Lizard Background Animation Summary

**CSS-only lizard tessellation overlay at z-index 9997 completing v8.0 three-layer texture stack (grain 9999, escher 9998, lizard 9997) with 80s diagonal drift animation gated by prefers-reduced-motion**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-02T00:05:06Z
- **Completed:** 2026-04-02T00:10:00Z
- **Tasks:** 1 of 3 complete (checkpoint reached at Task 2)
- **Files modified:** 3

## Accomplishments

- Created `LizardBackground.astro` with 4 lizard paths from `EscherLizards.astro` encoded as a percent-encoded SVG data URI CSS background-image
- Added `@keyframes lizard-drift` and `@media (prefers-reduced-motion: no-preference)` gate to `global.css` following the escher-drift pattern
- Integrated `<LizardBackground />` into `BaseLayout.astro` after the escher-overlay div
- Production build passes cleanly; dev server confirms HTML contains `lizard-bg` class and `lizard-drift` keyframes

## Task Commits

1. **Task 1: Create LizardBackground.astro and integrate into BaseLayout** - `aa6958b` (feat)

_Note: Task 2 is a checkpoint:human-verify (blocking). Task 3 (Lighthouse audit) pending checkpoint approval._

## Files Created/Modified

- `src/components/LizardBackground.astro` - Fixed-position lizard tessellation overlay, z-index 9997, opacity 0.04, 200px repeat tile, will-change: transform
- `src/styles/global.css` - Added `@keyframes lizard-drift` and prefers-reduced-motion gate for `.lizard-bg`
- `src/layouts/BaseLayout.astro` - Import and render `<LizardBackground />` after escher-overlay div

## Decisions Made

- opacity 0.04 as starting value, below grain (0.06) and escher (0.05) — subject to checkpoint calibration
- 80s animation duration, slower than escher 50s, to keep lizard layer more subliminal and differentiate drift speeds
- translate(200px, 200px) exactly matches background-size (200px 200px) for seamless tiling
- SVG paths inlined directly in data URI without `<pattern>` or `<defs>` to avoid url(#id) encoding complexity
- Keyframes placed in global.css (not scoped `<style>`) following escher-drift precedent

## Deviations from Plan

None — Task 1 was already committed from the previous session (`aa6958b`). Verified implementation matches plan specification exactly. All three files updated correctly.

## Issues Encountered

Node.js 20 in PATH by default; project requires v22. Used Volta (`~/.volta/bin/node`) to build with Node 22. Build passes cleanly.

## User Setup Required

None.

## Next Phase Readiness

- Task 1 complete and committed at `aa6958b`
- Dev server running at http://localhost:4323/ (ports 4321-4322 occupied)
- Awaiting visual calibration checkpoint approval before proceeding to Task 3 (Lighthouse audit)
- After approval: `npx astro build && npx lighthouse` for CWV verification

---
*Phase: 46-lizard-background-animation*
*Completed: 2026-04-02 (partial — pending checkpoint)*
