---
phase: 20-bike-icon-crosshair
plan: 01
subsystem: ui
tags: [leaflet, divIcon, svg, elevation-profile, crosshair, ux]

# Dependency graph
requires:
  - phase: 19-kom-elevation-profile
    provides: elevation chart with hover events (elevation:hover, elevation:hoverEnd) dispatching lat/lon
provides:
  - Bike SVG divIcon crosshair marker replacing plain cyan circleMarker on elevation chart hover
affects:
  - 21-escher-background (unrelated visual phase — no dependency on crosshair)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "L.marker + L.divIcon with inline SVG for brand-appropriate map crosshair"
    - "iconAnchor [w/2, h/2] centers divIcon on GPS coordinate at all zoom levels"
    - "setOpacity(1/0) for L.marker show/hide (vs setStyle() which is circleMarker-only)"
    - ":global(.bike-crosshair) CSS in Astro component for Leaflet-injected DOM outside component scope"

key-files:
  created: []
  modified:
    - src/components/RouteMap.astro

key-decisions:
  - "L.marker + L.divIcon chosen over L.circleMarker — enables arbitrary SVG, brand-appropriate icon"
  - "iconAnchor: [12, 12] on 24x24 icon centers the bike on the GPS coordinate regardless of zoom level"
  - "interactive: false prevents the bike icon from capturing mouse events (hover/click passthrough)"
  - "zIndexOffset: 1000 renders crosshair above sector/KOM polylines"
  - "setOpacity() used for show/hide — L.marker has no setStyle(); setStyle() is circleMarker-only"

patterns-established:
  - "L.marker show/hide pattern: setOpacity(1) / setOpacity(0) — not setStyle()"
  - "Astro :global() required for any Leaflet divIcon className CSS (DOM injected outside Astro scope)"

# Metrics
duration: 2min
completed: 2026-03-29
---

# Phase 20 Plan 01: Bike Icon Crosshair Summary

**Elevation hover crosshair replaced from plain cyan circleMarker dot to 24x24 Lucide-derived bike SVG divIcon, centered via iconAnchor [12,12] with setOpacity show/hide and interactive: false passthrough**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-29T18:02:32Z
- **Completed:** 2026-03-29T18:04:48Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Replaced L.circleMarker with L.marker + L.divIcon containing inline bicycle SVG (#22d3ee cyan, matches existing marker palette)
- Added :global(.bike-crosshair) CSS rule for transparent background/no border (required for Leaflet divIcon DOM injection)
- Updated elevation:hover and elevation:hoverEnd listeners to use setOpacity(1/0) — L.marker API, no setStyle()
- Icon centered on GPS coordinate at all zoom levels via iconAnchor: [12, 12] on 24x24 icon
- interactive: false and zIndexOffset: 1000 ensure clean rendering above polylines without mouse interference

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace circleMarker crosshair with bike divIcon marker** - `a4361e7` (feat)
2. **Task 2: Verify crosshair behavior at multiple zoom levels** - verification only (no additional commit — all changes in Task 1)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `src/components/RouteMap.astro` - Replaced L.circleMarker crosshair with L.marker + L.divIcon bike SVG; updated show/hide to setOpacity(); added :global(.bike-crosshair) CSS

## Decisions Made
- Used `setOpacity()` for L.marker show/hide — L.marker does not have `setStyle()`, which is a circleMarker/path method
- `iconAnchor: [12, 12]` on a 24x24 icon — half width/height — centers the icon precisely on the route GPS point at any zoom level
- `interactive: false` on the crosshair marker prevents the bike SVG from capturing mouseover/click events that belong to sector polylines beneath it
- No separate Task 2 commit — Task 2 was purely a verification checklist; all code changes were complete in Task 1

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The system Node.js (v20) is below Astro's required minimum (>=22.12.0). Build was run with `/usr/local/opt/node@25/bin/node` (v25.8.2) via PATH override — consistent with previous phases.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 20 complete — bike icon crosshair ships with the next deploy
- Phase 21 (Escher background) is ready to begin — no dependency on this phase
- Active blockers from STATE.md remain: Down Jeep KOM photo fallback, Billie Helmer KOM photo fallback, Android onHover performance unverified

---
*Phase: 20-bike-icon-crosshair*
*Completed: 2026-03-29*
