---
phase: 32-prebuild-preserve-strava-fields
plan: 01
subsystem: infra
tags: [prebuild, pipeline, strava, annotations, resolve-annotations, generate-data, assign-card-photos]

# Dependency graph
requires:
  - phase: 27-segment-links-scoring-explainer
    provides: stravaSegmentId, komTime, qomTime fields originally added to annotations.json
  - phase: 01-data-pipeline
    provides: resolve-annotations.js pipeline script and annotations.json structure
provides:
  - stravaSegmentId embedded in resolve-annotations.js source arrays (6 sectors, 3 KOMs)
  - komTime and qomTime (null) embedded in resolve-annotations.js koms array
  - Idempotent prebuild pipeline — npm run prebuild always produces annotations.json with Strava fields
affects: [all Astro components consuming annotations.json, sector/KOM card rendering, Strava link generation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Source-of-truth pattern: Strava fields live in resolve-annotations.js hardcoded arrays, spread via { ...sector/kom, ...coords } to annotations.json"
    - "Pipeline idempotency: no manual JSON edits — all fields regenerate from script on every prebuild"

key-files:
  created: []
  modified:
    - scripts/resolve-annotations.js
    - public/data/annotations.json

key-decisions:
  - "stravaSegmentId stored as integer (not string) — matches Phase 27's pattern and Strava's integer segment IDs"
  - "komTime/qomTime initialized as null (not undefined) — JSON.stringify drops undefined; null serializes and is JSON-safe"
  - "No changes to assign-card-photos.js — it reads full object and writes back via JSON.stringify, so Strava fields pass through automatically"
  - "Fix applied to source-of-truth script (resolve-annotations.js), not annotations.json directly — root-cause fix, not workaround"

patterns-established:
  - "Any new Strava fields must be added to the hardcoded sectors/koms arrays in resolve-annotations.js, not directly to annotations.json"

# Metrics
duration: 2min
completed: 2026-03-30
---

# Phase 32 Plan 01: Prebuild Preserve Strava Fields Summary

**stravaSegmentId (all 9 entries) and komTime/qomTime (3 KOM entries) embedded in resolve-annotations.js source arrays, making every `npm run prebuild` produce annotations.json with Strava fields intact**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-30T21:22:58Z
- **Completed:** 2026-03-30T21:24:52Z
- **Tasks:** 2
- **Files modified:** 2 (scripts/resolve-annotations.js, public/data/annotations.json)

## Accomplishments
- Added stravaSegmentId to all 6 sectors in the hardcoded sectors array: Sandstrom (24479292), Akkala Rd (24479426), Haavisto (24479467), Forest Service Rd (24479496), C4 (34573011), Down Jeep (6809754)
- Added stravaSegmentId, komTime: null, qomTime: null to all 3 koms: Billie Helmer (24479270), Leaving Chatham (41126651), Silver Creek (16438243)
- Verified full prebuild pipeline (`npm run prebuild`) preserves all Strava fields after assign-card-photos.js pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Strava fields to hardcoded sectors and koms arrays in resolve-annotations.js** - `1712c1f` (feat)
2. **Task 2: Run full prebuild pipeline and verify end-to-end field preservation** - `4c4cadc` (feat)

## Files Created/Modified
- `scripts/resolve-annotations.js` - Added stravaSegmentId to sectors array; added stravaSegmentId, komTime, qomTime to koms array
- `public/data/annotations.json` - Rebuilt by pipeline — now contains all Strava fields for all 9 entries

## Decisions Made
- stravaSegmentId stored as integer — matches Phase 27 pattern and Strava's native integer segment IDs
- komTime/qomTime initialized as null — JSON.stringify drops undefined, null is JSON-serializable and semantically correct (no times recorded yet)
- No changes needed to assign-card-photos.js — it spreads the full annotation object when writing back, so new fields pass through automatically
- Root-cause fix in source script, not manual JSON edit — ensures idempotency on every subsequent build

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 32 is complete. This was the final gap-closure phase in the v5.0 milestone.
- The prebuild pipeline is now idempotent with respect to Strava fields — every build will produce annotations.json with stravaSegmentId, komTime, and qomTime.
- Astro components rendering Strava segment links and KOM/QOM times will work correctly after any build.
- v5.0 milestone (Strava Integration + Results) is fully complete.

---
*Phase: 32-prebuild-preserve-strava-fields*
*Completed: 2026-03-30*
