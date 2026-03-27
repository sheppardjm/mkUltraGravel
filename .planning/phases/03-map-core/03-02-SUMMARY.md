---
phase: 03-map-core
plan: 02
subsystem: ui
tags: [leaflet, polyline, divicon, annotations, gravel, map-overlays]

# Dependency graph
requires:
  - phase: 03-01
    provides: RouteMap.astro with Leaflet, Carto tiles, and GPX route polyline
  - phase: 01-03
    provides: annotations.json with sectors[], kom[], restock[] arrays and track coordinates
provides:
  - 6 gravel sector polylines colored by star rating on the map
  - 3 KOM segment polylines as dashed chartreuse green overlays
  - 4 restock point markers as cyan divIcon circles
  - Popups for every overlay with relevant data (stars, grade, elevation, mile marker)
affects: [03-03, phase 5 photos, phase 6 route-info]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Promise.all for parallel fetch of multiple JSON data files
    - L.divIcon with inline styles avoids Vite production build broken default icon path
    - :global() CSS selector for Leaflet-managed DOM elements outside Astro scoped styles

key-files:
  created: []
  modified:
    - src/components/RouteMap.astro

key-decisions:
  - "Use Promise.all to fetch route-data.json and annotations.json in parallel — single await, cleaner than sequential"
  - "Star colors use brutalist palette: gray (1-2) → amber (3) → orange (4) → red (5) — matches design system intent"
  - "KOM polylines use chartreuse green (#7fff00) with dashArray '8, 4' — visually distinct from all sector colors"
  - "Restock markers use L.divIcon with inline styles — avoids Leaflet default PNG icon path broken in Vite production builds"
  - ":global(.restock-marker) CSS reset required — Leaflet appends divIcon to DOM outside Astro component scope"

patterns-established:
  - "Pattern: fetch annotations.json alongside route-data.json in Promise.all for any map overlay work"
  - "Pattern: L.divIcon with inline HTML for simple markers — never default L.icon in Astro/Vite builds"
  - "Pattern: :global() for Leaflet-managed DOM elements in Astro <style> blocks"

# Metrics
duration: 1min
completed: 2026-03-26
---

# Phase 3 Plan 02: Annotation Overlays Summary

**6 gravel sector polylines (star-rating color scale), 3 dashed KOM polylines, and 4 cyan divIcon restock markers all rendered from annotations.json with interactive popups**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-27T00:23:02Z
- **Completed:** 2026-03-27T00:24:28Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- All 6 gravel sectors visible as colored polylines on the map — gray (1-2 stars), amber (3), orange (4), red (5)
- All 3 KOM segments visible as dashed chartreuse (#7fff00) polylines with grade/elevation popups
- All 4 restock points visible as cyan (#22d3ee) divIcon circle markers with name and mile marker popups
- Production build clean — no SSR errors, no broken Leaflet default icon paths

## Task Commits

Each task was committed atomically:

1. **Task 1+2: Sector, KOM, and restock overlays** - `f012925` (feat)

**Plan metadata:** (to follow)

## Files Created/Modified
- `src/components/RouteMap.astro` - Added parallel annotations.json fetch, 6 sector polylines, 3 KOM polylines, 4 restock divIcon markers, :global CSS reset

## Decisions Made
- Promise.all used to fetch both route-data.json and annotations.json in parallel — cleaner than two sequential awaits
- `kom.grade` and `kom.elevFt` field names verified against actual annotations.json before coding (plan noted research had incorrect field name alternatives `gradient`/`elevGain`)
- `stop.mi` used for popup display (rounded value) and `stop.lat`/`stop.lon` used directly — no interpolation needed (verified)
- Tasks 1 and 2 committed together as one atomic commit: both modify the same file and Task 2's restock code depends on the Promise.all fetch introduced in Task 1

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Map overlay layer is complete: route + sectors + KOMs + restock points all render
- 03-03 (photo markers on map) can proceed — same Promise.all pattern, same divIcon approach
- All popup data fields render correctly from annotations.json

---
*Phase: 03-map-core*
*Completed: 2026-03-26*
