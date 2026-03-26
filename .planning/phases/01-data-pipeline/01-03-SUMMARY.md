---
phase: 01-data-pipeline
plan: 03
subsystem: data
tags: [nodejs, json, gpx, coordinates, geolocation, annotations]

# Dependency graph
requires:
  - phase: 01-01
    provides: route-data.json with 1,827 trackpoints and cumulative mile markers
provides:
  - scripts/resolve-annotations.js - mile-marker-to-lat/lon resolver for all annotation types
  - public/data/annotations.json - 6 sectors, 3 KOMs, 4 restock points with resolved coordinates and track arrays
affects:
  - 03-map (needs annotations.json for sector overlays, KOM highlights, restock markers)
  - 06-route-info (consumes annotations.json for route info cards)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Linear scan with early-exit (break at targetMile + 0.5) for mile-marker-to-point lookup"
    - "findPointsForSegment collects intermediate track array for polyline rendering"
    - "Clamping pattern: out-of-range mile markers clamp to last trackpoint with console.warn"

key-files:
  created:
    - scripts/resolve-annotations.js
    - public/data/annotations.json
  modified: []

key-decisions:
  - "Hardcoded annotation data directly in script rather than parsing free-form data.md text"
  - "Track arrays for segments include all intermediate trackpoints (not just start/end) to enable polyline rendering"
  - "Clamped Down Jeep (83mi) to last trackpoint (79.6253mi); provides 2-point fallback track so callers always get non-empty array"

patterns-established:
  - "findPointAtMile: standard helper for any future mile-marker lookups in Phase 3+"
  - "annotations.json shape: { sectors, kom, restock } - downstream consumers should read this shape"

# Metrics
duration: 4min
completed: 2026-03-26
---

# Phase 01 Plan 03: Annotation Resolver Summary

**Mile-marker resolver script generates annotations.json with 6 sectors, 3 KOMs, and 4 restock points resolved to lat/lon coordinates from route-data.json, including intermediate track arrays for polyline rendering**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-26T19:05:37Z
- **Completed:** 2026-03-26T19:09:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Created `scripts/resolve-annotations.js` with `findPointAtMile` and `findPointsForSegment` helpers
- Generated `public/data/annotations.json` with all 13 annotations resolved to Marquette County lat/lon coordinates
- Down Jeep sector (83mi) correctly clamped to last trackpoint (79.6253mi) with console warning

## Task Commits

Each task was committed atomically:

1. **Task 1: Write resolve-annotations.js** - `29a466f` (feat)

**Plan metadata:** (committed with SUMMARY/STATE)

## Files Created/Modified

- `scripts/resolve-annotations.js` - Mile-marker-to-lat/lon resolver; findPointAtMile, findPointsForSegment helpers; hardcoded sector/KOM/restock data; writes annotations.json
- `public/data/annotations.json` - Generated output: 6 sectors with track arrays, 3 KOM segments with track arrays, 4 restock points; all with resolved lat/lon

## Decisions Made

- Hardcoded annotation data directly from data.md values rather than attempting to parse the free-form text file - simpler, more reliable, and data.md rarely changes
- Track arrays include all intermediate trackpoints (not just start/end) so the map phase can render accurate polyline overlays for sectors and KOM segments
- When a segment's start/end is beyond route end (Down Jeep: 83mi > 79.6mi), clamped both to last trackpoint and provided a 2-point fallback track array so callers always receive a non-empty array

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed empty track array for clamped segment (Down Jeep)**

- **Found during:** Task 1 (post-run validation)
- **Issue:** `findPointsForSegment` filtered trackpoints between `startMi` and `endMiTarget` — when both exceed route end, no points match the filter, producing an empty track array
- **Fix:** After filter, if track is empty, populate with the resolved start/end coordinates (which are both the clamped last trackpoint) to ensure non-empty array
- **Files modified:** `scripts/resolve-annotations.js`
- **Verification:** Re-ran script; Down Jeep now shows `track pts: 2`
- **Committed in:** `29a466f` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix for downstream map rendering — empty track arrays would silently produce no polyline for Down Jeep sector. No scope creep.

## Issues Encountered

None beyond the auto-fixed empty track array described above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `annotations.json` is ready for Phase 3 (map) and Phase 6 (route info cards)
- Shape confirmed: `{ sectors[], kom[], restock[] }` with lat/lon, track arrays on segments
- Down Jeep clamping is documented; Phase 3 map should treat it as a near-end-of-route marker
- Silver Creek KOM (78.1mi, 1.61mi long) resolves correctly just before route end — verified `endMi` ~79.71 clamped cleanly

---
*Phase: 01-data-pipeline*
*Completed: 2026-03-26*
