---
phase: 01-data-pipeline
plan: 01
subsystem: data
tags: [gpx, gpxparser, xmldom, node, json, route-data]

# Dependency graph
requires: []
provides:
  - "package.json with gpxparser, exifr, @xmldom/xmldom dependencies"
  - "scripts/parse-gpx.js: GPX-to-JSON converter with cumulative mile calculation"
  - "public/data/route-data.json: 1,827 trackpoints with lat/lon/ele/mi fields"
  - "public/mk-ultra.gpx: clean-URL copy of source GPX for download"
affects: [02-data-pipeline, 03-data-pipeline, 04-data-pipeline, 05-data-pipeline, map, elevation-profile, photo-matcher, annotation-resolver]

# Tech tracking
tech-stack:
  added: [gpxparser@3.0.8, exifr@7.1.3, "@xmldom/xmldom (DOMParser shim for Node.js)"]
  patterns: ["GPX parsed in Node.js script; cumul array offset handled by prepending 0; output written to public/data/"]

key-files:
  created:
    - package.json
    - package-lock.json
    - scripts/parse-gpx.js
    - public/data/route-data.json
    - public/mk-ultra.gpx
  modified: []

key-decisions:
  - "Install @xmldom/xmldom to provide DOMParser shim required by gpxparser in Node.js"
  - "cumul array from gpxparser has length equal to points.length (not N-1 as documented); handled by prepending 0 and slicing off last element"
  - "Round mile values to 4 decimal places (Math.round * 10000 / 10000)"
  - "exifr installed now (Plan 01-01) to avoid second npm install round in Plan 01-04"

patterns-established:
  - "Parse scripts live in scripts/; output JSON goes to public/data/"
  - "GPX source file stays in project root with spaces; public copy uses clean URL (mk-ultra.gpx)"
  - "route-data.json is the canonical data source for all downstream phases"

# Metrics
duration: 2min
completed: 2026-03-26
---

# Phase 01 Plan 01: Data Pipeline Foundation Summary

**gpxparser-based GPX-to-JSON pipeline producing 1,827 trackpoints with lat/lon/elevation/miles from MK Ultra Strava route**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-26T17:48:15Z
- **Completed:** 2026-03-26T17:49:56Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Node.js project initialized with gpxparser, exifr, @xmldom/xmldom dependencies
- GPX parser script (scripts/parse-gpx.js) reads MK Ultra.gpx and emits route-data.json
- 1,827 trackpoints written with lat, lon, ele, mi fields; first mi=0, last mi=79.6253
- GPX file copied to public/mk-ultra.gpx for clean-URL download access
- Script verified idempotent (running twice produces identical output)

## Task Commits

Each task was committed atomically:

1. **Task 1: Initialize Node.js project and install dependencies** - `fdc57a7` (chore)
2. **Task 2: Write parse-gpx.js and generate route-data.json** - `3e4fc3e` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `package.json` - Project manifest with gpxparser, exifr, @xmldom/xmldom dependencies
- `package-lock.json` - Lockfile for reproducible installs
- `scripts/parse-gpx.js` - GPX parsing script with DOMParser shim and cumul offset handling
- `public/data/route-data.json` - 1,827 trackpoints: lat/lon/ele/mi (foundational data file)
- `public/mk-ultra.gpx` - Clean-URL copy of MK Ultra.gpx for download links

## Decisions Made
- **@xmldom/xmldom required:** gpxparser calls DOMParser internally; Node.js lacks a built-in DOMParser, so @xmldom/xmldom provides the shim via `global.DOMParser = DOMParser`.
- **cumul array offset:** gpxparser's `track.distance.cumul` has length equal to `points.length` (not N-1). Script prepends 0 and slices off the last element so `cumulMiles[i]` correctly corresponds to `points[i]` with `cumulMiles[0] === 0`.
- **exifr pre-installed:** Installed alongside gpxparser in Task 1 to avoid a second npm install in Plan 01-04 (photo EXIF reader).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed @xmldom/xmldom for DOMParser shim**
- **Found during:** Task 2 (writing and running parse-gpx.js)
- **Issue:** gpxparser calls `new DOMParser()` internally; Node.js does not provide DOMParser globally, causing script to throw `Cannot find module '@xmldom/xmldom'` on first run
- **Fix:** `npm install @xmldom/xmldom`; script sets `global.DOMParser` before requiring gpxparser
- **Files modified:** package.json, package-lock.json, scripts/parse-gpx.js
- **Verification:** Script runs without error, produces 1,827 trackpoints
- **Committed in:** `3e4fc3e` (Task 2 commit)

**2. [Rule 1 - Bug] Corrected cumul array length assumption**
- **Found during:** Task 2 (implementing mile calculation)
- **Issue:** Plan documented cumul as length N-1 but gpxparser actually returns cumul with length N (equal to points). Used wrong branch would produce misaligned miles.
- **Fix:** Script detects actual cumul length and applies the correct offset strategy (`cumul.length === points.length` branch: prepend 0, slice last)
- **Files modified:** scripts/parse-gpx.js
- **Verification:** `cumulMiles[0] === 0`, `cumulMiles.length === points.length`, first mi output is 0
- **Committed in:** `3e4fc3e` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking dependency, 1 data alignment bug)
**Impact on plan:** Both fixes necessary for correct operation. No scope creep.

## Issues Encountered
- None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `public/data/route-data.json` is ready for consumption by all downstream phases (map polyline, elevation profile, annotation resolver, photo matcher)
- `scripts/parse-gpx.js` is idempotent; can be re-run if GPX source changes
- Blocker from pre-Phase 1: Photo EXIF GPS status still unknown — needs inspection in Plan 01-02 or 01-03

---
*Phase: 01-data-pipeline*
*Completed: 2026-03-26*
