---
phase: 24-css-layout-content
plan: 01
subsystem: ui
tags: [leaflet, css, tailwind, touch-targets, wcag, card-layout]

# Dependency graph
requires:
  - phase: 23-new-photos
    provides: GravelSectors.astro and KomSegments.astro with card markup used as edit target
provides:
  - Leaflet zoom controls enlarged to 44x44px via global.css @layer components override
  - Gravel sector and KOM segment card wrappers equalized to min-h-[280px]
affects: [24-02, any future component touching GravelSectors.astro or KomSegments.astro]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Leaflet CSS override: use !important in @layer components, both .leaflet-bar a and .leaflet-touch .leaflet-bar a selectors"
    - "Card height equalization: min-h-[Npx] on outer classified-border wrapper in both components"

key-files:
  created: []
  modified:
    - src/styles/global.css
    - src/components/GravelSectors.astro
    - src/components/KomSegments.astro

key-decisions:
  - "min-h-[280px] chosen as card equalization value — accommodates KOM 4-item grid plus aspect-video image at column widths"
  - "Comment in CSS acknowledges grep count of 7 vs plan's expected 6 (comment line contains '44x44px' which counts as a match)"

patterns-established:
  - "Leaflet override pattern: both .leaflet-bar a and .leaflet-touch .leaflet-bar a must be overridden; placed after .leaflet-control-zoom a:hover in @layer components"

# Metrics
duration: 1min
completed: 2026-03-30
---

# Phase 24 Plan 01: CSS Layout + Touch Targets Summary

**Leaflet zoom controls enlarged to WCAG-compliant 44x44px via CSS override; gravel sector and KOM segment card wrappers equalized to min-h-[280px] for visual rhythm**

## Performance

- **Duration:** ~4 min (elapsed from first read to final commit)
- **Started:** 2026-03-30T00:30:27Z
- **Completed:** 2026-03-30T00:31:44Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Leaflet zoom +/- buttons are now 44x44px touch targets (WCAG 2.5.5 Level AAA) on both desktop and touch devices
- Both `.leaflet-bar a` and `.leaflet-touch .leaflet-bar a` selectors overridden — covers default 26px and touch-mode 30px defaults
- Gravel sector and KOM segment cards share `min-h-[280px]` on their outer wrapper, establishing visual parity in the sectors grid

## Task Commits

1. **Task 1: Enlarge Leaflet zoom controls to 44x44px** - `4c695fc` (feat)
2. **Task 2: Equalize card heights between gravel sectors and KOM segments** - `660be02` (feat)

**Plan metadata:** (see docs commit below)

## Files Created/Modified

- `src/styles/global.css` - Added MAP-10 zoom control 44px overrides in @layer components
- `src/components/GravelSectors.astro` - Added min-h-[280px] to classified-border card wrapper
- `src/components/KomSegments.astro` - Added min-h-[280px] to classified-border card wrapper

## Decisions Made

- **min-h-[280px]** chosen as card equalization value. Both cards use `aspect-video` images + `p-4` content areas. KOM cards have a 4-item 2-column grid vs sector cards' 2-item flex row. 280px accommodates the KOM content area at typical column widths without being excessive.
- **`!important` on zoom overrides** — matches convention of existing Leaflet overrides in global.css (`.leaflet-control-attribution`, `.leaflet-control-zoom a` both use `!important`). Belt-and-suspenders but consistent.

## Deviations from Plan

None - plan executed exactly as written.

Note: The plan's verification step states `grep -c "44px"` returns 6. Actual count is 7 because the comment line "MAP-10: Enlarge zoom controls to 44×44px touch targets" contains one "44px" match. All 6 required CSS declarations (3 per selector × 2 selectors) are present and correct. This is a documentation counting artifact, not a functional deviation.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- MAP-10 and LAYOUT-01 complete. Ready for Phase 24 Plan 02 (LAYOUT-02 Penrose triangle + CONT-06 Grinduro explainer).
- No blockers.

---
*Phase: 24-css-layout-content*
*Completed: 2026-03-30*
