---
phase: 14-content
plan: 02
subsystem: ui
tags: [astro, content, url, route-data, build-time-data]

# Dependency graph
requires:
  - phase: 14-01
    provides: MkUltraExplainer component and .redacted-reveal CSS
  - phase: 11-02
    provides: route-data.json meta wrapper with distance and elevation gain
provides:
  - Both BikeReg registration CTAs linked to live https://www.bikereg.com/mk-ultra-gravel
  - GLRC donation text linked to https://www.glrc.org/donate
  - Route section heading subtitle showing dynamic distance and elevation gain from route-data.json
  - No PENDING URL placeholders remaining in the codebase
affects: [15-animations, future content updates]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Build-time JSON read in Astro frontmatter for dynamic route stats (readFileSync + resolve)
    - URL constants isolated to component frontmatter for single-line updates

key-files:
  created: []
  modified:
    - src/pages/index.astro
    - src/components/EventInfoBlock.astro

key-decisions:
  - "BIKEREG_URL constant updated from PENDING to https://www.bikereg.com/mk-ultra-gravel (human-verified)"
  - "GLRC_URL constant set to https://www.glrc.org/donate (human-verified)"
  - "Route stats subtitle reads from route-data.json at build time — auto-updates when GPX pipeline reruns"
  - "Distance formatted as integer miles (Math.round), elevation formatted with toLocaleString for commas"

patterns-established:
  - "Route stats pattern: import readFileSync+resolve in Astro frontmatter, parse route-data.json, use routeMeta.totalDistanceMiles and routeMeta.elevationGainFt"

# Metrics
duration: ~10min
completed: 2026-03-27
---

# Phase 14 Plan 02: URLs and Route Stats Summary

**BikeReg and GLRC donation URLs activated from PENDING placeholders; route section now shows dynamic distance and elevation gain read from route-data.json at build time.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-27T23:43:40Z
- **Completed:** 2026-03-27T23:55:00Z
- **Tasks:** 2 (+ human-verify checkpoint)
- **Files modified:** 2

## Accomplishments

- Replaced PENDING BikeReg placeholder in both `index.astro` and `EventInfoBlock.astro` with confirmed live URL
- Wrapped "Great Lakes Recovery Centers" in a styled anchor pointing to confirmed GLRC donation URL
- Added dynamic route subtitle beneath "The Route" h2 — reads distance and elevation from `route-data.json` at build time, auto-updates when GPX pipeline reruns
- Human-verified both URL changes and route stats display via checkpoint

## Task Commits

Each task was committed atomically:

1. **Task 1: Update BikeReg URL and add GLRC donation link** - `0ca5a78` (feat)
2. **Task 2: Display route stats from route-data.json in #route section** - `ce89b85` (feat)

**Plan metadata:** (docs: complete URLs and route stats plan — committed below)

## Files Created/Modified

- `src/pages/index.astro` - Updated BIKEREG_URL constant; added readFileSync/resolve imports and route stats subtitle
- `src/components/EventInfoBlock.astro` - Updated BIKEREG_URL constant; added GLRC_URL constant and donation anchor

## Decisions Made

- BIKEREG_URL: `https://www.bikereg.com/mk-ultra-gravel` — human-verified correct
- GLRC_URL: `https://www.glrc.org/donate` — human-verified correct
- Route stats formatted as: `"98 miles — 3,189 ft elevation gain"` — integer miles, locale-formatted elevation with commas
- Distance uses `Math.round(routeMeta.totalDistanceMiles)` and elevation uses `routeMeta.elevationGainFt.toLocaleString()` — clean formatting without new dependencies

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 14 is now complete (both plans 14-01 and 14-02 done)
- All content placeholders resolved: BikeReg URLs live, GLRC link live, route stats dynamic
- **Blocker cleared:** BikeReg registration URL placeholder (previously flagged in STATE.md) is now resolved
- Phase 15 (Animations) can proceed — all content is in final state

---
*Phase: 14-content*
*Completed: 2026-03-27*
