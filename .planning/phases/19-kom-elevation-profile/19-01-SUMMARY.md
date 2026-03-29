---
phase: 19-kom-elevation-profile
plan: 01
subsystem: ui
tags: [chart.js, chartjs-plugin-annotation, elevation-profile, kom, visualization]

# Dependency graph
requires:
  - phase: 17-sector-colors
    provides: sector annotation pattern (annotationBoxes, _baseColor, event handlers)
  - phase: 18-photo-position-verification
    provides: verified photo mile markers and annotations.json with kom array
provides:
  - KOM segment bands on elevation chart as dashed chartreuse box annotations
affects:
  - 20-kom-cards (KOM card detail views — elevation context already visible)
  - 21-escher-background (unrelated visual phase)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "KOM annotations use drawTime: beforeDatasetsDraw to layer beneath elevation line"
    - "KOM annotations intentionally omit _baseColor to exclude them from sector hover/click event logic"
    - "Chartreuse #7fff00 with borderDash: [6, 3] mirrors map KOM polyline style"

key-files:
  created: []
  modified:
    - src/components/ElevationProfile.astro

key-decisions:
  - "drawTime: beforeDatasetsDraw renders KOM bands beneath the elevation line, keeping line as primary visual"
  - "No _baseColor on KOM annotations — isolates them from map:sectorHover and map:sectorClick handlers"
  - "borderDash: [6, 3] echoes map KOM polyline dashArray: 8,4 style for visual consistency"
  - "backgroundColor #7fff0018 (~9% opacity) — subtle fill so KOM region identifiable without competing with sector colors"

patterns-established:
  - "Annotation layering: KOM uses beforeDatasetsDraw, sectors use default afterDatasetsDraw"
  - "Event isolation via _baseColor presence check — annotations without _baseColor are immune to sector interactions"

# Metrics
duration: 4min
completed: 2026-03-29
---

# Phase 19 Plan 01: KOM Elevation Profile Summary

**Dashed chartreuse KOM band annotations (Billie Helmer, Leaving Chatham, Silver Creek) added to elevation chart, rendering beneath the elevation line via beforeDatasetsDraw with no interaction with existing sector hover/click logic**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-29T17:48:27Z
- **Completed:** 2026-03-29T17:52:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added `annotations.kom.forEach` block to ElevationProfile.astro after the existing sector forEach
- 3 KOM bands render as dashed chartreuse (#7fff00) box annotations at correct mile positions (Billie Helmer mi 21.9-22.58, Leaving Chatham mi 37.6-38.0, Silver Creek mi 78.6-80.1)
- KOM bands draw beneath the elevation line (`drawTime: 'beforeDatasetsDraw'`), keeping the route profile as primary visual
- KOM annotations have no `_baseColor` property, completely isolating them from sector hover/click event handlers
- Build passes with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add KOM box annotations to elevation chart** - `1c689a3` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `src/components/ElevationProfile.astro` - Added KOM forEach block building `kom_N` annotation keys with chartreuse dashed style and `drawTime: beforeDatasetsDraw`

## Decisions Made

- **drawTime: beforeDatasetsDraw** — Renders KOM bands beneath the elevation line so the line remains the primary visual element. Sector bands use the default (afterDatasetsDraw), creating an intentional visual layer order.
- **No _baseColor on KOM annotations** — The map:sectorHover and map:sectorClick event handlers check for `_baseColor` presence before modifying annotations. Omitting it from KOM annotations ensures they are never dimmed, highlighted, or otherwise affected by sector interactions.
- **borderDash: [6, 3]** — Matches the map's KOM polyline `dashArray: '8, 4'` style, creating visual language consistency between map overlays and elevation chart.
- **backgroundColor #7fff0018** (~9% opacity) — Extremely subtle fill so the KOM region is identifiable but doesn't compete with the yellow-to-red sector color bands or the elevation line itself.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Node.js version mismatch:** Default node (v20.19.5) rejected by Astro requiring >=22.12.0. Resolved by using `/usr/local/opt/node/bin` (Homebrew node v25.8.2) for the build command. This is an environment issue not requiring code changes — the project's `.nvmrc` specifies node 22.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- VIS-13 satisfied: KOM segments now visible on elevation profile as dashed chartreuse bands
- Phase 20 (KOM cards) can proceed — elevation context for KOM segments is now established on chart
- No new blockers introduced

---
*Phase: 19-kom-elevation-profile*
*Completed: 2026-03-29*
