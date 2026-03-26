---
phase: 01-data-pipeline
plan: 05
subsystem: data-pipeline
tags: [node, execSync, npm-lifecycle, astro, build-integration, coordinator]

# Dependency graph
requires:
  - phase: 01-data-pipeline/01-01
    provides: parse-gpx.js producing route-data.json (1,827 trackpoints) and mk-ultra.gpx
  - phase: 01-data-pipeline/01-03
    provides: resolve-annotations.js producing annotations.json (6 sectors, 3 KOMs, 4 restocks)
  - phase: 01-data-pipeline/01-04
    provides: match-photos.js producing photos.json (33 photos, all manual)
provides:
  - scripts/generate-data.js coordinator running all three pipeline scripts in sequence
  - package.json prebuild/build/dev/data scripts wiring data generation into Astro lifecycle
  - Single command (node scripts/generate-data.js) producing all four data files
  - Idempotent and clean-state-recoverable data pipeline
affects:
  - Phase 2+ (all downstream Astro phases expect public/data/ to exist via prebuild hook)
  - Phase 3 map component (consumes route-data.json, annotations.json, photos.json)
  - CI/CD (npm run build will auto-generate data before Astro build)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "npm prebuild lifecycle hook: runs before `npm run build` automatically (no explicit wiring needed)"
    - "execSync with stdio:inherit and cwd:project-root pattern for coordinator scripts"
    - "Fail-fast exit code 1 propagation: child script failure stops parent build"

key-files:
  created:
    - scripts/generate-data.js
  modified:
    - package.json

key-decisions:
  - "prebuild chosen over postinstall for data generation - more explicit and only runs when building"
  - "dev script runs data generation once then starts Astro dev server (not watch mode - data is static)"
  - "build script references astro build even though Astro not yet installed - correct eventual command; data pipeline validated independently"

patterns-established:
  - "Coordinator pattern: single entry point running pipeline scripts via execSync in sequence"
  - "npm lifecycle integration: prebuild auto-runs before build, no CI/CD config changes needed"

# Metrics
duration: 1min
completed: 2026-03-26
---

# Phase 1 Plan 05: Data Pipeline Coordinator Summary

**Single-command data pipeline coordinator wiring parse-gpx.js, resolve-annotations.js, and match-photos.js into npm prebuild lifecycle with idempotent, clean-state-recoverable output**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-26T19:10:11Z
- **Completed:** 2026-03-26T19:11:32Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created scripts/generate-data.js coordinator running all three scripts in order with error propagation
- Updated package.json with prebuild (auto-runs before build), build, dev, and data scripts
- Validated all four Phase 1 success criteria: route-data.json (1,827 pts), annotations.json (6/3/4), photos.json (33), mk-ultra.gpx (171KB)
- Confirmed pipeline is idempotent (diff produces no changes on second run)
- Confirmed clean-state recovery (delete public/data/, regenerate, all files restored)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create generate-data.js coordinator and wire package.json scripts** - `1344e5c` (feat)
2. **Task 2: Final validation of all Phase 1 success criteria** - (validation-only, no artifact changes; included in plan metadata commit)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `scripts/generate-data.js` - Coordinator script running parse-gpx.js, resolve-annotations.js, match-photos.js in sequence via execSync
- `package.json` - Added prebuild, build, dev, data scripts for Astro lifecycle integration

## Decisions Made
- `prebuild` npm lifecycle hook chosen for automatic pre-build execution — no CI/CD config changes needed; runs automatically before `npm run build`
- `dev` script runs data generation once then starts `astro dev` — data is static/pre-generated, not hot-reloaded
- `build` script references `astro build` even though Astro not yet installed (Phase 2) — correct eventual command; Plan 01-05 validates data pipeline only

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 1 complete. All data pipeline success criteria validated:
- route-data.json: 1,827 trackpoints with lat/lon/ele/mi
- annotations.json: 6 sectors, 3 KOM segments, 4 restock points — all with resolved lat/lon and track arrays
- photos.json: 33 photos, all manual source, mi 4.0 to 76.0
- public/mk-ultra.gpx: 171,266 bytes

Phase 2 (Astro project setup) can proceed. `npm run build` will auto-generate data via prebuild hook before the Astro build.

Concerns carrying forward:
- Stadia Maps API key not yet obtained (needed before Phase 3 map tiles) — fall back to Carto Dark Matter if blocked
- BikeReg registration URL not confirmed — needed before Phase 7 CTAs

---
*Phase: 01-data-pipeline*
*Completed: 2026-03-26*
