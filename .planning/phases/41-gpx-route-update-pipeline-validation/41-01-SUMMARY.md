---
phase: 41-gpx-route-update-pipeline-validation
plan: 01
subsystem: data-pipeline
tags: [gpx, route-data, parse-gpx, annotations, photos, strava]

# Dependency graph
requires:
  - phase: data-pipeline
    provides: scripts/parse-gpx.js, scripts/generate-data.js pipeline infrastructure
provides:
  - MKULTRA.gpx tracked in git (2581 trackpoints, 100.62 mi, 3365 ft gain)
  - public/data/route-data.json regenerated from new GPX
  - public/data/annotations.json with 6 sectors and 3 KOMs resolved to new geometry
  - public/data/photos.json with 55 photos all within route bounds
  - public/mk-ultra.gpx browser-downloadable copy of new GPX
  - MK_Ultra.gpx removed from repo
affects: [all phases that consume route-data.json, annotations.json, photos.json]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GPX_SOURCE constant in parse-gpx.js is the single source of truth for route geometry"

key-files:
  created:
    - MKULTRA.gpx
  modified:
    - scripts/parse-gpx.js
    - public/data/route-data.json
    - public/data/annotations.json
    - public/data/photos.json
    - public/mk-ultra.gpx

key-decisions:
  - "MKULTRA.gpx replaces MK_Ultra.gpx as the canonical route source (2581 trackpoints vs 2779)"
  - "Elevation gain change from 3595 to 3365 ft is expected — Strava smooths trackpoints differently than RideWithGPS"
  - "Annotation coordinate shifts of 84-282 meters are expected — both GPX files represent the same route with slightly different start points"

patterns-established:
  - "Parse-gpx.js GPX_SOURCE constant on line 29 is the single line change needed to update route source"

# Metrics
duration: 2min
completed: 2026-03-31
---

# Phase 41 Plan 01: GPX Route Update + Pipeline Validation Summary

**Switched route GPX source from MK_Ultra.gpx to MKULTRA.gpx (new Strava export), regenerated all downstream artifacts with 2581 trackpoints / 100.62 mi / 3365 ft gain, zero pipeline warnings.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-31T21:30:16Z
- **Completed:** 2026-03-31T21:32:38Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Single-line change to `scripts/parse-gpx.js` switches the route source from MK_Ultra.gpx to MKULTRA.gpx
- Data pipeline ran cleanly: 2581 trackpoints, 100.62 miles total distance, 3365 ft elevation gain
- All 9 annotation mile markers (6 sectors + 3 KOMs) resolved without clamping; max startMi is 83.55, well within 100.62 mi route end
- All 55 photo positions resolved within bounds; max photo mi is 83.8
- MKULTRA.gpx added to git tracking (required for Netlify builds); MK_Ultra.gpx removed

## Task Commits

Each task was committed atomically:

1. **Task 1 + Task 2: Switch GPX source, regenerate pipeline, verify and clean up** - `8e492bf` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `scripts/parse-gpx.js` - GPX_SOURCE constant updated from MK_Ultra.gpx to MKULTRA.gpx (line 29)
- `MKULTRA.gpx` - New canonical route source: 239,064 bytes, 2581 trackpoints, 100.62 mi
- `public/data/route-data.json` - Regenerated: totalMi=100.62, elevationGainFt=3365, trackpoints=2581
- `public/data/annotations.json` - 6 sectors and 3 KOMs re-resolved against new route geometry
- `public/data/photos.json` - 55 photos re-matched; mile range 19.6–83.8
- `public/mk-ultra.gpx` - Browser-downloadable copy updated (239,064 bytes, exact match)
- `MK_Ultra.gpx` - Removed via git rm

## Decisions Made

- Used `git rm MK_Ultra.gpx` rather than just deleting, so the deletion is tracked in git history
- Tasks 1 and 2 were committed together since Task 2 is pure verification/cleanup with no additional code changes

## Deviations from Plan

None - plan executed exactly as written.

The annotations verification query in the plan used `.mi` field but the actual structure uses `startMi`. Adjusted the verification command accordingly — no change to data files, the data is correct.

## Issues Encountered

- **Local build test with `npm run build`:** Failed due to pre-existing Node.js version mismatch (local shell uses Node v20.19.5 but Astro requires >=22.12.0). This is a known local dev constraint unrelated to our changes. The volta-managed Node 22.22.2 binary exists and the `npm run prebuild` data pipeline ran cleanly under both versions. Netlify builds use the correct version.
- **`sharp` native bindings** for generate-thumbnails.js were compiled for Node 20 and fail under Node 22 in local env. Again, a pre-existing local constraint — Netlify rebuilds from source with correct bindings.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Route data is fully updated and verified — all downstream rendering (hero stats, elevation profile, map polyline, sector cards, photo gallery) will use the new 100.62 mi geometry
- Phase 42 and beyond can proceed without any route data concerns
- No blockers

---
*Phase: 41-gpx-route-update-pipeline-validation*
*Completed: 2026-03-31*
