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
  - mask-image gate hiding lizard from hero section (first viewport height)
  - Complete v8.0 three-layer texture stack (grain 9999, escher 9998, lizard 9997)
  - Lighthouse mobile Performance 96, TBT 0ms, CLS 0.073 — full v8.0 stack verified
affects: [lighthouse-audit, performance, v8.0-milestone]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSS data URI SVG background: percent-encode paths directly (no <pattern>/url(#id) references)"
    - "Keyframes in global.css outside scoped styles — matches escher-drift pattern"
    - "prefers-reduced-motion gate via @media (prefers-reduced-motion: no-preference)"
    - "will-change: transform for compositor promotion on animation-bearing overlays"
    - "mask-image linear-gradient to exclude fixed overlay from hero section without JS"

key-files:
  created:
    - src/components/LizardBackground.astro
  modified:
    - src/styles/global.css
    - src/layouts/BaseLayout.astro

key-decisions:
  - "opacity: 0.04 — below grain (0.06) and escher (0.05), approved at checkpoint"
  - "80s drift duration — slower than escher 50s to differentiate layers and keep lizard subliminal"
  - "translate(200px, 200px) matches background-size exactly for seamless tiling loop"
  - "SVG paths inlined directly in data URI (no <pattern>/<defs>) to avoid url(#id) encoding issues"
  - "z-index 9997 — below escher (9998) and grain (9999)"
  - "mask-image: linear-gradient hides lizard behind hero/Penrose section (too visually busy)"

patterns-established:
  - "Three-layer texture stack: grain (9999) > escher (9998) > lizard (9997)"
  - "All decorative overlays use pointer-events: none and aria-hidden=true"
  - "All overlay animations use transform-only keyframes for compositor safety"
  - "mask-image on fixed overlays uses viewport-relative transparent zone to gate visibility per section"

# Metrics
duration: 25min
completed: 2026-04-01
---

# Phase 46 Plan 01: Lizard Background Animation Summary

**CSS-only lizard tessellation overlay completing v8.0 three-layer texture stack, with hero-section mask gate and Lighthouse 96/100 mobile performance score (TBT 0ms, CLS 0.073)**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-02T00:05:00Z
- **Completed:** 2026-04-02T00:14:00Z
- **Tasks:** 3 of 3 complete
- **Files modified:** 3

## Accomplishments

- Created `LizardBackground.astro` with 4 lizard SVG paths percent-encoded as a CSS `background-image` data URI, drifting diagonally at 80s with `prefers-reduced-motion` gate
- Added `@keyframes lizard-drift` and reduced-motion media query gate to `global.css` following the `escher-drift` pattern
- Applied `mask-image` linear-gradient to hide the lizard layer behind the hero/Penrose section (viewport 0 to 100vh) — prevents visual noise over the already-busy first screen
- Integrated `<LizardBackground />` into `BaseLayout.astro` at z-index 9997, below escher (9998) and grain (9999)
- Lighthouse mobile audit on full v8.0 stack: Performance **96**, TBT **0ms**, CLS **0.073** — all Core Web Vitals green

## Lighthouse Results (Mobile, Production Build)

| Metric | Result | Threshold | Status |
| ------ | ------ | --------- | ------ |
| Performance Score | 96 | >= 90 | PASS |
| Total Blocking Time | 0 ms | 0 ms | PASS |
| Cumulative Layout Shift | 0.073 | <= 0.1 | PASS |
| First Contentful Paint | 1.9 s | informational | — |
| Largest Contentful Paint | 2.3 s | informational | — |
| Speed Index | 1.9 s | informational | — |
| Time to Interactive | 2.3 s | informational | — |

## Task Commits

1. **Task 1: Create LizardBackground.astro and integrate into BaseLayout** - `aa6958b` (feat)
2. **Task 1b: Mask lizard overlay from hero section** - `379f4cf` (fix)
3. **Task 3: Lighthouse performance audit** — verification only, no files modified

**Plan metadata:** pending this commit (docs)

## Files Created/Modified

- `src/components/LizardBackground.astro` - Fixed-position lizard tessellation overlay, z-index 9997, opacity 0.04, 200px repeat tile, will-change: transform, mask-image hero gate
- `src/styles/global.css` - Added `@keyframes lizard-drift` and `prefers-reduced-motion: no-preference` gate for `.lizard-bg`
- `src/layouts/BaseLayout.astro` - Import and render `<LizardBackground />` after escher-overlay div

## Decisions Made

- opacity 0.04 approved at visual calibration checkpoint, below grain (0.06) and escher (0.05)
- 80s animation duration, slower than escher 50s, keeps lizard subliminal and differentiates drift speeds
- translate(200px, 200px) exactly matches background-size (200px 200px) for seamless tiling
- SVG paths inlined directly in data URI without `<pattern>` or `<defs>` to avoid url(#id) encoding complexity
- Keyframes placed in global.css (not scoped `<style>`) following escher-drift precedent
- mask-image applied on the fixed lizard overlay to hide it behind hero section — Penrose + Escher already dominate that viewport, lizard would add noise

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added hero-section mask gate to LizardBackground.astro**

- **Found during:** Task 2 checkpoint (visual calibration)
- **Issue:** At opacity 0.04 the lizard layer was visually competing with the Penrose + Escher patterns already saturating the hero section
- **Fix:** Added `mask-image: linear-gradient(to bottom, transparent 0, transparent 100vh, black 110vh)` — excludes lizard from first viewport, fades in at section boundary
- **Files modified:** `src/components/LizardBackground.astro`
- **Verification:** Visual checkpoint approved by user; mask is paint-free (no layout or compositing impact)
- **Committed in:** `379f4cf` (fix)

---

**Total deviations:** 1 auto-fixed (Rule 1 visual bug — hero section visual conflict)
**Impact on plan:** Required for correct visual experience. No scope creep; `mask-image` is a single CSS property addition.

## Issues Encountered

Node.js 20 in PATH by default; project requires v22+. Used Volta (`~/.volta/bin/node`) to build and run Lighthouse. Build and audit passed cleanly.

## User Setup Required

None.

## Next Phase Readiness

- v8.0 visual polish milestone complete: grain + escher + lizard overlays, topographic metaball dividers, masonry gallery, 71 route photos
- Lighthouse mobile 96/100 with full stack active — no CWV regression from any v8.0 additions
- All 46 phases complete; project is production-ready for June 7, 2026 event date

---
*Phase: 46-lizard-background-animation*
*Completed: 2026-04-01*
