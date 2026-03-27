---
phase: 13-map-elevation-interactivity
plan: 01
subsystem: ui
tags: [chart.js, leaflet, customevent, crosshair, elevation-profile, interactive-map]

# Dependency graph
requires:
  - phase: 04-elevation-profile
    provides: ElevationProfile.astro with Chart.js canvas and routeData array
  - phase: 03-map-core
    provides: RouteMap.astro with Leaflet map instance and L.circleMarker API
  - phase: 01-data-pipeline
    provides: route-data.json with {lat, lon, mi} track points for binary search

provides:
  - ElevationProfile.astro dispatches elevation:hover {lat, lon} via window CustomEvent on rAF-throttled mouse move
  - ElevationProfile.astro dispatches elevation:hoverEnd via window CustomEvent on canvas mouseleave
  - RouteMap.astro hidden cyan circleMarker repositions on elevation:hover and hides on elevation:hoverEnd
  - findNearestTrackPoint binary search (O(log n)) in ElevationProfile for mile-to-GPS lookup

affects:
  - 13-02-map-to-elevation-sync
  - any future phase touching ElevationProfile or RouteMap interactivity

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "window CustomEvent as decoupled component communication bus (elevation:hover, elevation:hoverEnd)"
    - "rAF boolean gate (rafPending) to prevent main-thread flooding on rapid mouse movement"
    - "Binary search (lo/hi >> 1) for O(log n) nearest-point lookup in sorted track array"
    - "L.circleMarker with opacity:0 for pre-created hidden marker, setStyle to show/hide"
    - "AbortController with { signal } on window listeners for beforeunload cleanup"

key-files:
  created: []
  modified:
    - src/components/ElevationProfile.astro
    - src/components/RouteMap.astro

key-decisions:
  - "window CustomEvent (not shared module/store) keeps components fully decoupled — no import coupling across Astro script tags"
  - "Binary search over routeData (already in scope from fetch) avoids second fetch or data duplication"
  - "circleMarker pre-added at [0,0] with opacity 0 avoids addLayer/removeLayer calls on every hover"
  - "AbortController added on both sides for symmetric cleanup — not strictly required (map/chart only init once) but good practice"

patterns-established:
  - "CustomEvent bus pattern: component A dispatches on window, component B listens with { signal } for cleanup"
  - "rAF gate: single boolean rafPending guards animation frame queue — reset inside rAF callback"
  - "Marker visibility: opacity 0/1 toggle via setStyle avoids add/remove layer overhead"

# Metrics
duration: 2min
completed: 2026-03-27
---

# Phase 13 Plan 01: Elevation-to-Map Crosshair Sync Summary

**Chart.js onHover dispatches lat/lon CustomEvents via window; Leaflet circleMarker repositions on those events forming the elevation-to-map half of bidirectional sync**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-27T22:54:42Z
- **Completed:** 2026-03-27T22:56:41Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- ElevationProfile.astro: `findNearestTrackPoint` binary search maps x-axis mile value to GPS {lat, lon} in O(log n)
- ElevationProfile.astro: `onHover` callback with rAF throttle dispatches `elevation:hover` CustomEvent on every frame-budgeted mouse move
- ElevationProfile.astro: canvas `mouseleave` listener dispatches `elevation:hoverEnd` for crosshair hide
- RouteMap.astro: hidden cyan `circleMarker` (opacity 0) pre-created; `elevation:hover` repositions and shows it, `elevation:hoverEnd` hides it
- Both sides use `AbortController` with `{ signal }` for clean window listener teardown

## Task Commits

Each task was committed atomically:

1. **Task 1: Add onHover + binary search + CustomEvent dispatch to ElevationProfile** - `8223f4e` (feat)
2. **Task 2: Add crosshair circleMarker + CustomEvent listeners to RouteMap** - `9b38e39` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/components/ElevationProfile.astro` - Added `findNearestTrackPoint`, `rafPending`, `onHover` callback, and `mouseleave` listener dispatching `elevation:hover` / `elevation:hoverEnd`
- `src/components/RouteMap.astro` - Added hidden `crosshair` circleMarker and window listeners for `elevation:hover` / `elevation:hoverEnd`

## Decisions Made

- **window CustomEvent bus over shared module:** Astro script tags can't import from each other cleanly; window CustomEvents keep the components fully decoupled with zero import coupling
- **Binary search over linear scan:** routeData has ~2498 points; binary search is O(log n) ≈ 11 comparisons vs 2498 — meaningful on mid-range Android per the Phase 13 blocker concern
- **Pre-created marker at [0,0] with opacity 0:** Avoids `addLayer`/`removeLayer` on every hover frame; simpler state machine (opacity toggle only)
- **No AbortController for `mouseleave`:** Canvas listener attached directly to DOM element, auto-cleaned when canvas is removed; AbortController only needed for window-level listeners

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Build required `volta run npm run build` (not bare `npm run build`) because the shell PATH uses Node 20.19.5, but the project's `volta` pin in package.json specifies Node 22.22.2 which is required by Astro 6.x. This is a pre-existing environment condition, not introduced by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Elevation-to-map crosshair sync is complete and verified at build time
- Plan 13-02 (map-to-elevation sync: hover on map highlights the elevation profile) can proceed immediately
- **Active concern:** onHover performance on mid-range Android remains unverified — must test with Chrome DevTools Performance tab after both 13-01 and 13-02 are complete before considering Phase 13 done

---
*Phase: 13-map-elevation-interactivity*
*Completed: 2026-03-27*
