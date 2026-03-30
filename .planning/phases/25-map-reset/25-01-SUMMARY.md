---
phase: 25-map-reset
plan: 01
subsystem: ui
tags: [leaflet, chartjs, custom-events, map, elevation]

# Dependency graph
requires:
  - phase: 20-bike-icon-crosshair
    provides: crosshair marker and elevation:hover/hoverEnd event pattern
  - phase: 19-kom-elevation-profile
    provides: annotation band _baseColor pattern in ElevationProfile
  - phase: 13-map-elevation-interactivity
    provides: map:sectorHover/Click event bus, AbortController signal cleanup pattern
provides:
  - Reset View button below elevation profile with brutalist border styling
  - map:reset CustomEvent dispatch from index.astro
  - RouteMap.astro map:reset listener: restores fitBounds, closePopup, sector styles, hides crosshair
  - ElevationProfile.astro map:reset listener: restores all sector annotation bands to default opacity
affects: [future-map-phases, future-elevation-phases]

# Tech tracking
tech-stack:
  added: []
  patterns: [map:reset CustomEvent for global state restore, initialBounds captured after fitBounds for reset fidelity]

key-files:
  created: []
  modified:
    - src/pages/index.astro
    - src/components/RouteMap.astro
    - src/components/ElevationProfile.astro

key-decisions:
  - "map.fitBounds (not flyTo) used for reset — guarantees identical framing to initial page load"
  - "initialBounds captured immediately after map.fitBounds(routeLine.getBounds()) before any user interaction"
  - "map:reset listener registered with AbortController signal — consistent with elevation:hover and map:sectorHover cleanup pattern"
  - "KOM annotations skipped naturally by _baseColor guard — no _baseColor means no state to reset"

patterns-established:
  - "map:reset CustomEvent: dispatch from index.astro, listen in RouteMap + ElevationProfile via window"
  - "State restore via same values used at init (initialBounds/initialPadding, _baseColor + hex suffix)"

# Metrics
duration: 6min
completed: 2026-03-30
---

# Phase 25 Plan 01: Map Reset Summary

**Single-click Reset View button restores map bounds, closes popups, clears sector highlights, hides crosshair, and resets elevation annotation bands via map:reset CustomEvent**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-30T00:48:30Z
- **Completed:** 2026-03-30T00:54:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Reset View button rendered below ElevationProfile with brutalist border/hover styling consistent with site design system
- RouteMap listens for map:reset and restores exact initial state: fitBounds with same padding, closePopup, sector polyline styles, crosshair hidden
- ElevationProfile listens for map:reset and restores all sector annotation bands to default `_baseColor + '22'` / `_baseColor + '66'` values

## Task Commits

Each task was committed atomically:

1. **Task 1: Add reset button and map:reset handler** - `1171b63` (feat)
2. **Task 2: Add elevation chart reset handler** - `0e964f3` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `src/pages/index.astro` - Reset View button HTML + click handler dispatching map:reset CustomEvent
- `src/components/RouteMap.astro` - initialBounds capture + map:reset listener restoring all map state
- `src/components/ElevationProfile.astro` - map:reset listener restoring sector annotation band opacity

## Decisions Made
- `map.fitBounds` (not `flyTo`) for reset — guarantees pixel-identical framing to initial page load with no animation delay
- `initialBounds` captured immediately after the initial `map.fitBounds` call, before any user interaction could change bounds
- All listeners registered with `{ signal }` on the existing AbortController — consistent cleanup pattern across the map/elevation event bus
- KOM annotations skipped naturally by the `if (annot._baseColor)` guard — KOM annotations have no `_baseColor`, so they're never affected by sector interactions and need no reset logic

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Map reset feature complete, no regressions in hover/click/elevation interactivity
- Ready for Phase 26 (final phase in v4.0 milestone)

---
*Phase: 25-map-reset*
*Completed: 2026-03-30*
