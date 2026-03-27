---
phase: 03-map-core
plan: 01
subsystem: ui
tags: [leaflet, maps, carto, gesture-handling, astro, tailwind-cascade-layers]

# Dependency graph
requires:
  - phase: 01-data-pipeline
    provides: route-data.json with lat/lon trackpoints used for GPX polyline
  - phase: 02-scaffold-design-system
    provides: global.css with @layer leaflet cascade layer already declared; index.astro with #route section anchor

provides:
  - Leaflet 1.9.4 + leaflet-gesture-handling 1.2.2 installed as npm dependencies
  - Leaflet and gesture-handling CSS imported in global.css within @layer leaflet
  - RouteMap.astro island component with Carto Dark Matter tiles, GPX polyline, gesture handling, auto-fitBounds
  - RouteMap wired into the #route section of index.astro

affects:
  - 03-map-core (all subsequent map plans build on this base map)
  - 04-elevation-profile (map section already rendered, elevation goes alongside)
  - 05-sector-overlays (sector polylines added to this map)
  - 08-photo-gallery (geolocated markers added to this map)

# Tech tracking
tech-stack:
  added:
    - leaflet@1.9.4
    - leaflet-gesture-handling@1.2.2
  patterns:
    - Dynamic import of Leaflet in <script> tag to prevent SSR window-is-undefined errors
    - GestureHandling wired via addInitHook BEFORE L.map() initialization
    - Leaflet CSS in @layer leaflet via global.css @import (not dynamic CSS import in script)
    - Route data fetched client-side from /data/route-data.json, mapped to [lat, lon] pairs

key-files:
  created:
    - src/components/RouteMap.astro
  modified:
    - package.json (added leaflet, leaflet-gesture-handling)
    - package-lock.json
    - src/styles/global.css (replaced Phase 3 placeholder with actual @import lines)
    - src/pages/index.astro (import + <RouteMap /> in #route section)

key-decisions:
  - "Carto Dark Matter tiles used (no API key required) — Stadia Maps free-tier signup was not completed"
  - "Dynamic import of leaflet via await import('leaflet') in script block to avoid SSR window errors"
  - "GestureHandling addInitHook called before L.map() — required for correct plugin initialization order"
  - "Route polyline color #d4d4d4 (close to --color-accent-white token) — subtle on dark tiles"
  - "CSS in global.css @layer leaflet, not dynamic script import — safer cascade layer control"

patterns-established:
  - "Leaflet map components use dynamic imports only — never static import L from 'leaflet' at module top"
  - "All Leaflet CSS via global.css @import with layer(leaflet) — never in component <style> or script"
  - "Map plugins (gesture-handling, future overlays) registered via addInitHook before L.map()"

# Metrics
duration: 2min
completed: 2026-03-26
---

# Phase 3 Plan 01: Map Core - Leaflet Foundation Summary

**Leaflet 1.9.4 map on Carto Dark Matter tiles with full 100-mile GPX route polyline, gesture handling, and auto-fitBounds — wired into the #route section of index.astro**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-27T00:17:52Z
- **Completed:** 2026-03-27T00:19:26Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Installed leaflet@1.9.4 and leaflet-gesture-handling@1.2.2 as npm dependencies
- Updated global.css to replace Phase 3 placeholder comment with real @import lines wrapped in layer(leaflet)
- Created RouteMap.astro — interactive Leaflet map with Carto Dark Matter tiles, full GPX route polyline fetched from /data/route-data.json, gesture handling preventing mobile scroll-trap, and auto-fitBounds to show the entire route on load
- Wired RouteMap into index.astro #route section, replacing placeholder text; `astro build` succeeds with exit code 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Leaflet dependencies and add CSS imports to global.css** - `945b674` (chore)
2. **Task 2: Create RouteMap.astro component and wire into index.astro** - `3a53e94` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/components/RouteMap.astro` - Leaflet map island: Carto Dark Matter tiles, GPX polyline from route-data.json, GestureHandling, auto-fitBounds
- `src/styles/global.css` - Replaced Phase 3 placeholder with `@import "leaflet/dist/leaflet.css" layer(leaflet)` and gesture-handling CSS
- `src/pages/index.astro` - Added RouteMap import and `<RouteMap />` in #route section; removed placeholder text
- `package.json` - Added leaflet and leaflet-gesture-handling to dependencies
- `package-lock.json` - Updated lockfile

## Decisions Made

- **Carto Dark Matter tiles** — plan noted Stadia Maps free-tier signup was not completed; fell back to Carto (no API key required) as specified in plan's blocker notes
- **Dynamic import pattern** — `await import('leaflet')` in script block prevents SSR window-is-undefined; static top-level import would cause build failure
- **GestureHandling before map init** — `addInitHook` must be called before `L.map()` for the plugin to register correctly
- **CSS in global.css only** — Leaflet CSS goes through global.css @layer leaflet, not dynamic CSS import in script; preserves cascade layer ordering declared in line 4

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - build succeeded on first attempt, no SSR errors.

## User Setup Required

None - no external service configuration required. Carto tiles require no API key.

## Next Phase Readiness

- Map foundation is complete: tiles, route polyline, gesture handling, fitBounds all working
- Route polyline is at z-index 0, grain overlay at z-index 9999 — overlay stack correctly ordered
- Phase 3 Plan 02 (sector overlays) and Plan 03 (KOM overlays) can layer directly on top of this map instance
- Phase 4 elevation profile can be added alongside the #route section
- One concern: route-data.json shows total distance 98.2255 miles (expected ~100mi) — GPX from Strava may need updating before Phase 1 verification is considered fully passed (see project memory)

---
*Phase: 03-map-core*
*Completed: 2026-03-26*
