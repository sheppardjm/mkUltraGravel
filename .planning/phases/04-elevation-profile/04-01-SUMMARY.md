---
phase: 04-elevation-profile
plan: 01
subsystem: ui
tags: [chart.js, chartjs-plugin-annotation, elevation-profile, data-visualization, canvas, astro]

# Dependency graph
requires:
  - phase: 01-data-pipeline
    provides: route-data.json (2498 points, mi/ele) and annotations.json (sectors with startMi/endMi)
  - phase: 03-map-core
    provides: established await import() pattern and Promise.all fetch pattern
provides:
  - ElevationProfile.astro component with Chart.js line chart
  - 6 sector band overlays via chartjs-plugin-annotation
  - Dark theme canvas background plugin
  - Meters-to-feet conversion in Y-axis ticks and tooltips
  - Responsive 140px/180px wrapper (fixed px heights, no resize loop)
affects: [05-photos, 06-sector-cards, future-phases]

# Tech tracking
tech-stack:
  added: [chart.js@4.5.1, chartjs-plugin-annotation@3.1.0]
  patterns:
    - "Chart.js dynamic import: await import('chart.js/auto') inside Astro script block (SSR-safe)"
    - "Responsive canvas: position:relative wrapper div + maintainAspectRatio:false"
    - "Sector bands: chartjs-plugin-annotation box type with xMin/xMax from startMi/endMi"
    - "Dark theme: beforeDraw canvas plugin with destination-over compositing"
    - "if (canvas) {...} guard instead of top-level return (top-level return invalid in ESM modules)"

key-files:
  created:
    - src/components/ElevationProfile.astro
  modified:
    - src/pages/index.astro
    - package.json

key-decisions:
  - "Use chart.js/auto import (all controllers pre-registered) rather than manual tree-shaking — bundle size negligible for static route page"
  - "X-axis max set to 100 (not 98.2255 actual) — forward-compatible with 100mi route when updated GPX arrives"
  - "Sector labels disabled — color band sufficient; names already on map via popup. Less clutter on narrow chart."
  - "if (canvas) guard instead of if (!canvas) return — top-level return is invalid in ESM module context"

patterns-established:
  - "Chart.js pattern: await import('chart.js/auto') + Chart.register(plugin) BEFORE new Chart()"
  - "Canvas wrapper: fixed px heights (140px/180px) avoid Chart.js infinite resize loop"
  - "ESM guard pattern: use if (canvas) { ... } not top-level return in Astro script blocks"

# Metrics
duration: 2min
completed: 2026-03-27
---

# Phase 4 Plan 01: Elevation Profile Chart Summary

**Chart.js line chart below the Leaflet map showing full 100mi elevation shape (600-1100ft) with 6 colored sector band overlays and dark-theme canvas background**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-27T01:12:56Z
- **Completed:** 2026-03-27T01:15:08Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Installed chart.js@4.5.1 and chartjs-plugin-annotation@3.1.0
- Created ElevationProfile.astro with LTTB-decimated line chart (2498 points → 500 samples)
- 6 sector band overlays from annotations.json using star-rating color palette matching the map
- Dark theme canvas background (oklch(0.14 0.01 250)) via beforeDraw plugin
- Meters-to-feet conversion in Y-axis ticks and hover tooltips
- Wired into index.astro directly below RouteMap — both visible in "The Route" section
- Build passes with zero SSR errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Chart.js and create ElevationProfile.astro** - `843a723` (feat)
2. **Task 2: Wire ElevationProfile into route section** - `38eee6e` (feat)

**Plan metadata:** (see final metadata commit)

## Files Created/Modified
- `src/components/ElevationProfile.astro` - Chart.js elevation profile component with sector bands, dark theme, responsive wrapper
- `src/pages/index.astro` - Added ElevationProfile import and usage below RouteMap
- `package.json` - Added chart.js and chartjs-plugin-annotation dependencies
- `package-lock.json` - Updated lockfile

## Decisions Made
- **chart.js/auto over manual registration:** Bundle size negligible; manual registration is error-prone for this project
- **X-axis max: 100 (not 98.2):** Forward-compatible with project memory note that route is planned to extend to 100mi
- **Sector labels disabled:** Color bands alone are sufficient at 140px chart height; sector names are accessible via map popups
- **if (canvas) guard pattern:** Top-level return is invalid in ESM modules (Astro script blocks compile to ESM); use conditional block instead

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed top-level return ESM error in ElevationProfile.astro**
- **Found during:** Task 2 (npm run build verification)
- **Issue:** Plan specified `if (!canvas) return;` as null guard — but top-level `return` is invalid in an ECMAScript module, causing esbuild to fail with "Top-level return cannot be used inside an ECMAScript module"
- **Fix:** Changed `if (!canvas) return; new Chart(canvas, {...})` to `if (canvas) new Chart(canvas, {...})` — functionally identical, ESM-valid
- **Files modified:** src/components/ElevationProfile.astro
- **Verification:** `npm run build` completes with zero errors after fix
- **Committed in:** 38eee6e (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — ESM top-level return)
**Impact on plan:** Required for build to pass. No scope creep. Fix is a 1-line change with identical runtime behavior.

## Issues Encountered
- Astro script blocks compile to ESM modules — top-level `return` is forbidden by the ECMAScript spec. The plan's null guard pattern `if (!canvas) return` must become `if (canvas) { ... }` in all Astro script blocks. This is a known ESM constraint, not a Chart.js issue.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- ElevationProfile renders below map in "The Route" section with full data — ready for human verification
- No blockers for Phase 4 plan 02 (if any), or Phase 5 onward
- Pattern established: Chart.js components follow same await import() + Promise.all pattern as RouteMap.astro

---
*Phase: 04-elevation-profile*
*Completed: 2026-03-27*
