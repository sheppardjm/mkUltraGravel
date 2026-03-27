---
phase: 11-data-corrections
plan: 02
subsystem: data-pipeline
tags: [node, json, route-data, gpx, elevation, astro, leaflet, chartjs]

# Dependency graph
requires:
  - phase: 11-01
    provides: photo manifest with 53 photos and synced data.md
  - phase: 01-data-pipeline
    provides: parse-gpx.js, route-data.json, resolve-annotations.js, match-photos.js

provides:
  - route-data.json with { meta: { totalMi, elevationGainFt, trackpoints }, track: [...] } structure
  - meta.totalMi = 98.23, meta.elevationGainFt = 3189, meta.trackpoints = 2498
  - All 4 consumers updated to handle new structure with backward-compat fallback
  - Full data pipeline passing with zero errors

affects:
  - phase-14-content-copy (needs meta.totalMi and meta.elevationGainFt for route stats display)
  - phase-12-card-photos (reads route-data.json via match-photos.js consumer)
  - phase-13-map-elevation-interactivity (reads route-data.json in ElevationProfile.astro + RouteMap.astro)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "route-data.json is always { meta, track } — never a bare array"
    - "Consumers use parsed.track ?? parsed fallback for backward-compat during transitions"
    - "Astro components inline .then(d => d.track ?? d) in Promise.all chain to extract track array"

key-files:
  created: []
  modified:
    - scripts/parse-gpx.js
    - public/data/route-data.json
    - scripts/resolve-annotations.js
    - scripts/match-photos.js
    - src/components/ElevationProfile.astro
    - src/components/RouteMap.astro

key-decisions:
  - "meta wrapper in route-data.json (not separate file) — avoids third parallel fetch in Astro components"
  - "?? fallback pattern in consumers — safe during any future structural transition"
  - "Elevation gain computed as sum of positive trackpoint deltas in parse-gpx.js — same source data, no new logic"

patterns-established:
  - "Pattern: route-data.json always has { meta, track } shape — all consumers must destructure track"
  - "Pattern: ?? fallback (parsed.track ?? parsed) allows scripts to tolerate both old and new formats during transitions"

# Metrics
duration: 3min
completed: 2026-03-27
---

# Phase 11 Plan 02: Route Data Restructure Summary

**route-data.json restructured to { meta: { totalMi: 98.23, elevationGainFt: 3189 }, track: [...] } with all 4 consumers updated atomically**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-27T21:36:03Z
- **Completed:** 2026-03-27T21:39:24Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- parse-gpx.js now computes elevation gain from trackpoint deltas and writes structured output with meta wrapper
- All 4 route-data.json consumers (resolve-annotations.js, match-photos.js, ElevationProfile.astro, RouteMap.astro) updated to destructure track array from new structure
- Full data pipeline passes with zero errors: 6 sectors, 3 koms, 3 restocks, 53 photos, build complete

## Task Commits

Each task was committed atomically:

1. **Task 1: Restructure parse-gpx.js to output meta + track wrapper** - `e8d0448` (feat)
2. **Task 2: Update all 4 consumers for new route-data.json structure** - `405e4ba` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `scripts/parse-gpx.js` - Added elevation gain computation loop; wraps output in { meta, track }; updates summary log
- `public/data/route-data.json` - Now shape { meta: { totalMi: 98.23, elevationGainFt: 3189, trackpoints: 2498 }, track: [...] }
- `scripts/resolve-annotations.js` - Destructures parsed.track with ?? fallback
- `scripts/match-photos.js` - Destructures parsed.track with ?? fallback
- `src/components/ElevationProfile.astro` - Inline .then(d => d.track ?? d) in route-data fetch chain
- `src/components/RouteMap.astro` - Inline .then(d => d.track ?? d) in route-data fetch chain

## Decisions Made

- Meta wrapper in route-data.json instead of a separate route-stats.json file: avoids a third parallel fetch in ElevationProfile.astro and RouteMap.astro which already fetch route-data.json. All route data stays co-located.
- Used `?? parsed` backward-compat fallback in pipeline scripts: allows scripts to tolerate a bare-array route-data.json if it ever appears during tooling transitions.
- Inline `.then(d => d.track ?? d)` in Astro component fetch chains: cleaner than post-destructure; downstream `.map()` calls require no changes since `routeData` variable remains a plain array.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reinstalled sharp with optional deps to resolve darwin-x64 binary mismatch**

- **Found during:** Task 2 verification (npm run prebuild)
- **Issue:** `generate-thumbnails.js` crashed with "Could not load the sharp module using the darwin-x64 runtime". System had homebrew Node 20 (x64 ABI) in PATH but repo pins Node 22 (arm64 ABI) via volta. sharp binary compiled for x64 was missing.
- **Fix:** Ran `npm install --include=optional sharp` to reinstall correct platform binary
- **Files modified:** node_modules/sharp (binary only, no package.json change)
- **Verification:** `node -e "require('sharp'); console.log('sharp ok')"` passes; full prebuild completes
- **Committed in:** 405e4ba (included in Task 2 commit as blocking fix)

**2. [Observation] match-photos.js count validation was already dynamic**

- The research notes and plan described a hardcoded `33` at line 149 of match-photos.js. Direct inspection showed it was already `photoManifest.length` — fixed in a prior commit (11-01 work). No change needed.

---

**Total deviations:** 1 auto-fixed (blocking), 1 no-op (already done)
**Impact on plan:** Sharp fix necessary for prebuild to complete. No scope creep.

## Issues Encountered

- Node version in PATH (homebrew Node 20 v20.19.5) differs from volta-pinned version (Node 22.22.2). `npm run build` via system node reports "Node.js v20.19.5 is not supported by Astro". Build passes when invoked via `volta run --node 22.22.2 npm run build`. This is an existing environment configuration issue, not caused by this plan's changes.

## Next Phase Readiness

- DATA-05 complete: route-data.json meta fields available for Phase 14 content display (totalMi, elevationGainFt)
- Phase 11 complete: both plans done, full data pipeline passing
- Phase 12 (card-photo assignment) can proceed: photos.json has 53 entries with correct coordinates
- Phase 13 (map-elevation interactivity): both Astro components confirmed building correctly against new structure

---
*Phase: 11-data-corrections*
*Completed: 2026-03-27*
