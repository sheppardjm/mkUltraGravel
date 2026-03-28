---
phase: 16-v2-fixes
plan: 02
subsystem: ui
tags: [chart.js, elevation, map-interactivity, crosshair, helpers]

# Dependency graph
requires:
  - phase: 13-map-elevation-interactivity
    provides: ElevationProfile.astro onHover CustomEvent bus dispatching elevation:hover to RouteMap
provides:
  - getRelativePosition imported from chart.js/helpers (not Chart.helpers which is undefined in auto bundle)
  - Elevation-chart-to-map crosshair sync now functional on hover
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "chart.js/helpers direct import pattern — use `import('chart.js/helpers')` not `Chart.helpers.*` when using chart.js/auto bundle"

key-files:
  created: []
  modified:
    - src/components/ElevationProfile.astro

key-decisions:
  - "chart.js/auto does not expose Chart.helpers namespace — getRelativePosition must be imported from chart.js/helpers directly"

patterns-established:
  - "chart.js/helpers import: when chart.js/auto is used for tree-shaking, helpers are accessed via separate import('chart.js/helpers') not Chart.helpers.*"

# Metrics
duration: 1min
completed: 2026-03-28
---

# Phase 16 Plan 02: v2 Fix — Elevation-to-Map Crosshair Summary

**Fixed elevation chart hover-to-map crosshair sync by importing getRelativePosition from chart.js/helpers — Chart.helpers is undefined in the chart.js/auto bundle**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-28T05:03:41Z
- **Completed:** 2026-03-28T05:04:32Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Identified root cause: `Chart.helpers.getRelativePosition` is undefined when using `chart.js/auto` because the auto bundle does not expose the helpers namespace
- Added `const { getRelativePosition } = await import('chart.js/helpers')` after AnnotationPlugin registration
- Replaced `Chart.helpers.getRelativePosition(event.native, chart)` with direct `getRelativePosition(event.native, chart)` call
- Build confirmed clean with Node 22

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix getRelativePosition import in ElevationProfile.astro** - `1d07f86` (fix)

**Plan metadata:** (see docs commit below)

## Files Created/Modified
- `src/components/ElevationProfile.astro` - Added chart.js/helpers import; replaced Chart.helpers.getRelativePosition with direct call

## Decisions Made
- `chart.js/auto` bundles all chart types for convenience but does NOT expose `Chart.helpers` — the helpers are a separate submodule at `chart.js/helpers`. Any code needing `getRelativePosition` (or other helpers) must import from that submodule explicitly.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Node.js v20.19.5 installed in shell environment; Astro requires >=22.12.0. Used `npx node@22 node_modules/.bin/astro build` to verify build success. This is a pre-existing environment constraint unrelated to this change.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Elevation chart hover crosshair on map is now functional
- No remaining blockers from this fix — hovering the elevation profile will dispatch `elevation:hover` CustomEvent with lat/lon, and RouteMap will show the crosshair marker at that position

---
*Phase: 16-v2-fixes*
*Completed: 2026-03-28*
