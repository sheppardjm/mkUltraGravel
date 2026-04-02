---
phase: 47-baa-sector-integration
plan: 01
subsystem: ui
tags: [sectors, scoring, data-pipeline, annotations, gravel, strava, astro, vitest]

# Dependency graph
requires:
  - phase: any prior sector integration phases
    provides: existing 6-sector data pipeline, scoring engine, results page patterns
provides:
  - BAA sector (mile 12.9, 2.53mi, 2-star, Strava segment 41159670) in annotations.json
  - BAA sector card on map, elevation profile, and sector cards
  - 7-sector scoring engine with updated SECTOR_SEGMENT_IDS
  - Updated results page with BAA in SECTOR_NAMES and /7 sectors DNF labels
  - Updated content copy: "Seven gravel sectors" and "all 7 timed sectors"
affects: [results-page, scoring-engine, sector-cards, map, elevation-profile]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sector insertion at position 0 in sectors array to match mile-order (12.9 before 23.4)"
    - "SECTOR_SEGMENT_IDS and SECTOR_NAMES kept in pipeline order for consistency"

key-files:
  created: []
  modified:
    - scripts/resolve-annotations.js
    - data.md
    - src/components/GrinduroExplainer.astro
    - src/components/ScoringExplainer.astro
    - src/lib/scoring.js
    - src/lib/scoring.test.js
    - src/pages/results.astro
    - public/data/annotations.json

key-decisions:
  - "BAA inserted as first entry (mile 12.9) in all ordered arrays to maintain mile-order consistency"
  - "Segment ID '41159670' used as string throughout, consistent with existing IDs"
  - "makeGravelAthlete fixture updated to divide totalTime by 7 (not 6) to maintain correct sum semantics"

patterns-established:
  - "New sectors always inserted in mile-order in sectors array (resolve-annotations.js)"
  - "SECTOR_SEGMENT_IDS mirrors pipeline order in scoring.js"
  - "Test DNF fixture deletes Down Jeep ('6809754') — completedSectors = N-1 where N is total sectors"

# Metrics
duration: 4min
completed: 2026-04-02
---

# Phase 47 Plan 01: BAA Sector Integration Summary

**BAA gravel sector (Strava segment 41159670, mile 12.9, 2.53mi, 2-star) integrated as 7th sector across data pipeline, scoring engine, results page, and content components — all 13 tests green, site builds**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-02T17:01:56Z
- **Completed:** 2026-04-02T17:05:21Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- BAA sector resolves to lat=46.49059, lon=-87.16791 with 66 track points and a pipeline-assigned cover photo
- Scoring engine now counts 7 required sectors; `SECTOR_SEGMENT_IDS` has "41159670" as first entry
- All 13 vitest tests pass with updated 7-sector fixtures; site builds without errors via Volta Node 22

## Task Commits

Each task was committed atomically:

1. **Task 1: Add BAA to data pipeline and content components** - `5ef3321` (feat)
2. **Task 2: Add BAA to scoring engine, tests, and results page** - `ac24883` (feat)

**Plan metadata:** (to be committed)

## Files Created/Modified

- `scripts/resolve-annotations.js` - BAA added as first entry in sectors array (mile 12.9)
- `data.md` - 7 gravel sectors listed, BAA first, entries 2-7 renumbered
- `src/components/GrinduroExplainer.astro` - "Six gravel sectors" → "Seven gravel sectors"
- `src/components/ScoringExplainer.astro` - "all 6 timed sectors" → "all 7 timed sectors"
- `src/lib/scoring.js` - SECTOR_SEGMENT_IDS updated to 7 entries with BAA first; JSDoc updated
- `src/lib/scoring.test.js` - SECTOR_IDS fixture updated; makeGravelAthlete divides by 7; all count expectations updated
- `src/pages/results.astro` - SECTOR_NAMES includes BAA; 3 DNF spans changed to /7 sectors
- `public/data/annotations.json` - Regenerated with BAA sector (lat, lon, endLat, endLon, track, coverPhoto)

## Decisions Made

- BAA inserted as first entry in all ordered arrays (mile 12.9 < 23.4) to maintain mile-order consistency across pipeline, scoring, and results
- Test `makeGravelAthlete` updated to divide `totalTime` by 7 and produce 7 sector times so existing test values (7200, 8100, etc.) remain semantically correct
- DNF test 3 now expects `completedSectors` to be 6 (of 7), consistent with deleting one segment from a 7-sector athlete

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npm run build` initially failed with "Node.js v20.19.5 is not supported by Astro" — pre-existing environment issue (not caused by this change). Used Volta (`~/.volta/bin/volta run npm run build`) with Node 22.22.2 to build successfully. This is the expected workflow for this project (volta field in package.json pins Node 22).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- v9.0 milestone complete: BAA sector is live across all surfaces (map polyline, elevation profile, sector card, scoring engine, results page)
- All 7 sectors visible in annotations.json with resolved coordinates, stars, Strava segment IDs, and cover photos
- Strava app approval (REVIEW-03) remains the external gate for live results collection — submitted 2026-03-31, 7-10 business day window

---
*Phase: 47-baa-sector-integration*
*Completed: 2026-04-02*
