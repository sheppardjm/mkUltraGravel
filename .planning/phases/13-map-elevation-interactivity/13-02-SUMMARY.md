---
phase: 13-map-elevation-interactivity
plan: 02
subsystem: ui
tags: [leaflet, chart.js, customevent, sector-polyline, annotation, bidirectional-sync, interactive-map]

# Dependency graph
requires:
  - phase: 13-01
    provides: ElevationProfile.astro chartInstance variable, AbortController pattern, window CustomEvent bus; RouteMap.astro crosshair and signal-scoped listener pattern
  - phase: 04-elevation-profile
    provides: ElevationProfile.astro with annotationBoxes annotation plugin setup
  - phase: 03-map-core
    provides: RouteMap.astro with sector polyline rendering loop and starColors palette

provides:
  - RouteMap.astro sector polylines dispatch map:sectorHover {sectorIndex} on mouseover/mouseout and map:sectorClick {sectorIndex} on click
  - RouteMap.astro elevation:sectorClick listener zooms map via flyToBounds to the selected sector polyline
  - ElevationProfile.astro map:sectorHover listener highlights corresponding annotation band in the chart
  - ElevationProfile.astro map:sectorClick listener strongly highlights clicked band and dims all others
  - ElevationProfile.astro annotation click dispatches elevation:sectorClick {sectorIndex} via CustomEvent
  - Full bidirectional sync: hover/click map sector highlights elevation band; click elevation band zooms map to sector

affects:
  - any future phase touching ElevationProfile or RouteMap interactivity
  - Phase 14 (continuity) — no interactivity dependencies expected

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "sectorPolylines reference array — store Leaflet polyline refs during forEach for later programmatic access"
    - "originalStyle closure — capture style object in forEach closure for correct per-polyline restore on mouseout"
    - "chart.update('none') — mandatory for all annotation mutations to avoid TBT-contributing animation"
    - "_baseColor on annotation object — chartjs-plugin-annotation ignores unknown properties; safe to piggyback metadata"
    - "annotation.click callback — chartjs-plugin-annotation fires click inside box area, dispatches CustomEvent upward"
    - "map.flyToBounds + map.once('moveend') — zoom to sector then restore all polyline styles after transition completes"

key-files:
  created: []
  modified:
    - src/components/RouteMap.astro
    - src/components/ElevationProfile.astro

key-decisions:
  - "sectorPolylines array populated during forEach (not a second pass) — O(1) lookup by index, no re-query needed"
  - "map.once('moveend') restores polyline styles after flyToBounds — ensures styles aren't frozen in highlight state if user then hovers"
  - "AbortController added to ElevationProfile for map: listeners — plan assumed signal was pre-existing; added inline as Rule 3 deviation (blocking: needed for { signal } option)"
  - "chart.update('none') on every annotation mutation — never chart.update() without 'none'; enforced to keep TBT at 0ms"

patterns-established:
  - "Bidirectional CustomEvent sync: mapComponent and elevationComponent communicate exclusively via window CustomEvents with no direct coupling"
  - "Reference array pattern: store component object refs (polylines, markers) in index-keyed arrays during init for O(1) programmatic access later"

# Metrics
duration: 3min
completed: 2026-03-27
---

# Phase 13 Plan 02: Map-to-Elevation Bidirectional Sync Summary

**Sector polyline hover/click on the Leaflet map highlights Chart.js annotation bands; annotation click dispatches elevation:sectorClick that flies the map to that sector's bounds — full bidirectional sync via window CustomEvents**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-27T22:59:52Z
- **Completed:** 2026-03-27T23:02:49Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- RouteMap.astro: sector polylines now store references in `sectorPolylines[]` array, dispatch `map:sectorHover` / `map:sectorClick` CustomEvents on interaction, and bold on hover
- RouteMap.astro: `elevation:sectorClick` listener uses `flyToBounds` to zoom to the selected sector, dims all other polylines during flight, then restores all styles on `moveend`
- ElevationProfile.astro: annotation boxes carry `_baseColor` and `click` callback; click dispatches `elevation:sectorClick {sectorIndex}`
- ElevationProfile.astro: `map:sectorHover` and `map:sectorClick` listeners update annotation `backgroundColor`/`borderColor` via `chart.update('none')` — zero animation, zero TBT contribution

## Task Commits

Each task was committed atomically:

1. **Task 1: Add sector polyline events + elevation:sectorClick listener to RouteMap** - `974ed21` (feat)
2. **Task 2: Add map:sectorHover/Click listeners + elevation:sectorClick dispatch to ElevationProfile** - `d0150b6` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/components/RouteMap.astro` - sectorPolylines array, mouseover/mouseout/click events on each polyline, elevation:sectorClick listener with flyToBounds + moveend restore
- `src/components/ElevationProfile.astro` - _baseColor + click on annotationBoxes, AbortController/signal, map:sectorHover and map:sectorClick listeners, chart.update('none') on all mutations

## Decisions Made

- **sectorPolylines array instead of re-querying DOM:** index-keyed array from the init forEach gives O(1) polyline access in event handlers without re-querying Leaflet's internal layers
- **map.once('moveend') for style restore:** flyToBounds is async; restoring styles inside the callback ensures they're never frozen in "dimmed other polylines" state if the user hovers immediately after clicking an elevation band
- **chart.update('none') mandatory enforcement:** all three mutation sites (map:sectorHover, map:sectorClick, and the initial defaults) use 'none' mode — documented as a hard constraint to maintain TBT 0ms

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added AbortController to ElevationProfile.astro**
- **Found during:** Task 2 (adding map: event listeners)
- **Issue:** Plan stated "AbortController and signal from 13-01 are already in scope" but ElevationProfile.astro had no AbortController — it was RouteMap.astro that had one in 13-01. The new map: listeners use `{ signal }` option and cannot be added without it.
- **Fix:** Added `const controller = new AbortController()` + `const { signal } = controller` + `window.addEventListener('beforeunload', () => controller.abort(), { once: true })` immediately after the canvas mouseleave listener, following the identical pattern from RouteMap.astro
- **Files modified:** src/components/ElevationProfile.astro
- **Verification:** Build passes; signal referenced correctly in both new listener registrations
- **Committed in:** d0150b6 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for cleanup correctness. No scope creep — the AbortController was explicitly expected by the plan spec and simply wasn't yet present.

## Issues Encountered

Build requires `volta run npm run build` (not bare `npm run build`) — pre-existing environment condition where shell PATH uses Node 20.19.5 but project's `volta` pin specifies Node 22.x required by Astro 6.x. Identical to 13-01.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 13 is fully complete: elevation-to-map crosshair sync (13-01) + bidirectional sector sync (13-02) are both wired
- **Active blocker remains:** onHover performance on mid-range Android unverified — must test with Chrome DevTools Performance tab before Phase 13 is considered done
- Phase 14 (content/continuity) can proceed in parallel with Android performance testing since it has no interactivity dependencies

---
*Phase: 13-map-elevation-interactivity*
*Completed: 2026-03-27*
