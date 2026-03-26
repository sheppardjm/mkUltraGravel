---
phase: 01-data-pipeline
plan: "04"
subsystem: data
tags: [exifr, node, json, photos, gps, mile-markers]

# Dependency graph
requires:
  - phase: 01-01
    provides: route-data.json with 1827 trackpoints and mile markers
  - phase: 01-02
    provides: photo-manifest.js with 33 curated photos and estimated mile markers

provides:
  - scripts/match-photos.js — photo-to-route matcher with EXIF-first, manual fallback
  - public/data/photos.json — 33 photos with lat/lon positions, mi, and source fields

affects:
  - 05-map (consumes photos.json for photo markers on Leaflet map)
  - 08-gallery (consumes photos.json for photo gallery with route position data)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "EXIF-first GPS resolution with manual mile-marker fallback (forward-compatible)"
    - "findPointAtMile linear scan with early-exit optimization (duplicated from resolve-annotations.js — scripts intentionally self-contained)"

key-files:
  created:
    - scripts/match-photos.js
    - public/data/photos.json
  modified: []

key-decisions:
  - "Duplicated findPointAtMile from resolve-annotations.js — scripts are intentionally self-contained and independently runnable; no shared module needed for two small scripts"
  - "EXIF GPS attempted for all photos as forward-compatible pattern — returns undefined for all 33 current photos; all positions resolved via manual mile-marker lookup"
  - "Validation enforced before write: exact count (33), file existence, no duplicates, coordinate bounds check (Marquette County ~46.2-46.8 lat, ~-87.5 to -86.5 lon)"

patterns-established:
  - "Photo position resolution: exifr.gps() → catch undefined → findPointAtMile fallback"
  - "Idempotent script: can be re-run safely; always overwrites photos.json with fresh output"

# Metrics
duration: 1min
completed: 2026-03-26
---

# Phase 01 Plan 04: Photo Matcher Summary

**33 route photos matched to lat/lon coordinates via mile-marker lookup against route-data.json, with EXIF GPS as a forward-compatible primary strategy (returns undefined for all current photos)**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-26T19:06:21Z
- **Completed:** 2026-03-26T19:07:24Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- `scripts/match-photos.js` reads photo-manifest.js (33 entries) and route-data.json (1827 trackpoints)
- EXIF GPS extraction attempted via exifr for every photo (forward-compatible, returns undefined for all 33)
- Manual fallback resolves all 33 positions via mile-marker lookup using `findPointAtMile`
- Pre-write validation: exact count, file existence in images/, no duplicates, coordinate bounds
- `public/data/photos.json` generated: 33 entries, all `source: 'manual'`, mi 4.0 to 76.0

## Task Commits

Each task was committed atomically:

1. **Task 1: Write match-photos.js and generate photos.json** - `1eced48` (feat)

**Plan metadata:** _(pending final metadata commit)_

## Files Created/Modified

- `scripts/match-photos.js` - Photo-to-route matcher: exifr GPS attempt + findPointAtMile fallback, validation, JSON output
- `public/data/photos.json` - 33 photos with filename, lat, lon, mi, source fields

## Decisions Made

- **Duplicated findPointAtMile** from resolve-annotations.js rather than extracting to a shared module. Both scripts are small and independently runnable; a shared module adds complexity for minimal benefit. This matches the plan's explicit note: "Duplication is fine for two small scripts."
- **EXIF-first pattern preserved** even though all 33 photos lack GPS data. If photos are ever re-exported with GPS tags, the script will use them automatically without code changes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `photos.json` is ready for Phase 5 (map photo markers) and Phase 8 (photo gallery)
- All 33 photos have verified file existence in `images/` and valid coordinates within Marquette County bounds
- Script is idempotent — re-runnable if manifest is updated

---
*Phase: 01-data-pipeline*
*Completed: 2026-03-26*
