---
phase: 22-gpx-route-replacement
plan: 01
subsystem: data-pipeline
tags: [gpx, route-data, chart.js, astro, pipeline, elevation-profile]

# Dependency graph
requires:
  - phase: prior-data-pipeline
    provides: parse-gpx.js, generate-data.js pipeline architecture
provides:
  - 100mi GPX source swap (MK_Ultra.gpx replaces MK Ultra.gpx)
  - Regenerated route-data.json with 100.71mi / 2779 trackpoints / 3595ft gain
  - Regenerated annotations.json (6 sectors, 3 KOMs, 3 restock points) resolved against 100mi track
  - Regenerated photos.json (53 photos) resolved against 100mi track
  - Updated public/mk-ultra.gpx downloadable file (237KB, 100mi)
  - Dynamic elevation profile x-axis (Math.ceil from meta.totalMi)
  - Floor-rounded route distance display ("100 miles" not "101 miles")
affects: [23-phase-next, all phases reading route-data.json or annotations.json]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Extract meta from route JSON before narrowing to track array for Chart.js data"
    - "Use Math.floor not Math.round for marketed distance display (100.71 -> 100)"
    - "Use Math.ceil for chart axis max (100.71 -> 101, prevents clipping)"

key-files:
  created: []
  modified:
    - scripts/parse-gpx.js
    - public/data/route-data.json
    - public/data/annotations.json
    - public/data/photos.json
    - public/mk-ultra.gpx
    - src/components/ElevationProfile.astro
    - src/pages/index.astro

key-decisions:
  - "GPX filename changed from 'MK Ultra.gpx' (space) to 'MK_Ultra.gpx' (underscore)"
  - "Old 'MK Ultra.gpx' removed from git with git rm (preserved in git history)"
  - "Math.floor used for distance display: 100.71 -> 100 matches marketed ride distance"
  - "Math.ceil used for chart x-axis: 100.71 -> 101 prevents elevation line clipping"
  - "No annotation mile markers modified: all 6 sectors and 3 KOMs fall below mi 84.15 (shared track geometry)"

patterns-established:
  - "Fetch route-data.json as raw JSON first, extract meta.totalMi before narrowing to track array"
  - "Pipeline always run via npm run data (generate-data.js), never individual scripts"

# Metrics
duration: 15min
completed: 2026-03-29
---

# Phase 22 Plan 01: GPX Route Replacement Summary

**100mi GPX source swapped via pipeline, route-data.json regenerated (100.71mi/2779pts/3595ft), elevation x-axis dynamic via Math.ceil(meta.totalMi), distance display Math.floor'd to "100 miles"**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-29T20:21:07Z
- **Completed:** 2026-03-29T20:36:00Z
- **Tasks:** 2 auto + 1 checkpoint
- **Files modified:** 7

## Accomplishments
- Swapped GPX source from `MK Ultra.gpx` (space, old 80mi Strava file) to `MK_Ultra.gpx` (underscore, 100mi file) in parse-gpx.js
- Ran full `npm run data` pipeline: all 7 scripts executed, regenerating route-data.json (100.71mi, 2779 trackpoints, 3595ft gain), annotations.json (6 sectors, 3 KOMs, 3 restock points), photos.json (53 photos), public/mk-ultra.gpx (237KB)
- Removed old GPX from git tracking via `git rm "MK Ultra.gpx"`
- Fixed ElevationProfile.astro: retains meta object from route JSON, x-axis max is now `Math.ceil(totalMi)` (dynamic, no clipping)
- Fixed index.astro: `Math.round` -> `Math.floor` so 100.71mi displays as "100 miles" not "101 miles"
- Build succeeds with node@25 (node@20 is pre-existing env mismatch unrelated to this plan)
- Dev server already running on :4321 showing "100 miles" after hot-reload

## Task Commits

Each task was committed atomically:

1. **Task 1: Swap GPX source and regenerate pipeline data** - `f03aea5` (feat)
2. **Task 2: Fix elevation profile x-axis and route distance display** - `2fca22f` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified
- `scripts/parse-gpx.js` - GPX_SOURCE changed from 'MK Ultra.gpx' to 'MK_Ultra.gpx'
- `public/data/route-data.json` - Regenerated: 100.71mi, 2779 trackpoints, 3595ft elevation gain
- `public/data/annotations.json` - Regenerated: 6 sectors, 3 KOMs, 3 restock points resolved against 100mi track
- `public/data/photos.json` - Regenerated: 53 photos resolved against 100mi track
- `public/mk-ultra.gpx` - Updated: 100mi downloadable file (237KB, from MK_Ultra.gpx)
- `src/components/ElevationProfile.astro` - Dynamic x-axis max via meta.totalMi + Math.ceil
- `src/pages/index.astro` - Math.round -> Math.floor for distance display

## Decisions Made
- Used `Math.floor` for displayed distance (not `Math.round`): 100.71 rounds up to 101 which is wrong for a marketed "100 mile" event
- Used `Math.ceil` for chart x-axis max: ensures elevation line never clips at right edge
- Did not modify annotation mile markers: research confirmed all 6 sectors/3 KOMs fall below mi 84.15, within shared track geometry between old and new GPX
- Removed old `MK Ultra.gpx` from git tracking with `git rm` - preserved in git history if ever needed

## Deviations from Plan

None - plan executed exactly as written.

### Note: Build environment
`npm run build` fails with node@20 (default PATH) because Astro requires node>=22. This is a pre-existing environment constraint not introduced by this plan. Running with `PATH="/usr/local/opt/node@25/bin:$PATH" npm run build` succeeds. Dev server at :4321 was already running with node@20 and hot-reloaded changes correctly.

## Issues Encountered
- `npm run build` with default node@20 emits "Node.js v20.19.5 is not supported by Astro!" warning and exits 1. Resolved by using node@25 available at `/usr/local/opt/node@25/bin/`. This is a pre-existing environment configuration issue, not introduced by this plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All pipeline data regenerated with 100mi source
- Dev server at http://localhost:4321 ready for visual verification
- Checkpoint: user should verify route polyline, distance display, elevation profile x-axis, sector/KOM overlays, and GPX download
- After checkpoint approval, Phase 22 plan 01 is complete

---
*Phase: 22-gpx-route-replacement*
*Completed: 2026-03-29*
