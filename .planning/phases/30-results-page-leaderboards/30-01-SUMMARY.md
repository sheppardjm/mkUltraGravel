---
phase: 30-results-page-leaderboards
plan: 01
subsystem: ui
tags: [astro, leaderboard, scoring, tabs, vanilla-js, strava, seed-data]

# Dependency graph
requires:
  - phase: 28-scoring-engine-results-schema
    provides: computeGravelChampion, computeKomChampion, SECTOR_SEGMENT_IDS, KOM_SEGMENT_IDS, seed athlete JSON files
  - phase: 29-strava-oauth-activity-submission
    provides: athlete JSON schema at public/data/results/athletes/{athleteId}.json
provides:
  - "Static /results page rendering scored leaderboards from athlete JSON at build time"
  - "Gravel Champion leaderboard with total time, sector breakdown, and DNF handling"
  - "KOM/QOM Champion leaderboard with total points and per-climb breakdown"
  - "Gender tab switching (Men/Women/Non-binary) per leaderboard section"
  - "Empty state for pre-event deploys"
affects: [phase-31, nav-links, index.astro-results-cta]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "readdirSync + readFileSync in Astro frontmatter for multi-file build-time JSON loading"
    - "data-section + data-gender attributes for independent tab group scoping"
    - "details/summary for collapsible per-row breakdowns without JS"
    - "existsSync guard before readdirSync to handle missing athletes directory gracefully"

key-files:
  created:
    - src/pages/results.astro
  modified: []

key-decisions:
  - "Both tasks (data pipeline + JS tabs) committed together in one file — single atomic commit since both are in results.astro and inseparable"
  - "data-section attribute scopes tab groups independently — avoids shared state between gravel and KOM tab rows"
  - "details/summary HTML for sector/climb breakdowns — native expand/collapse, no JS required, accessible"
  - "existsSync guard wraps readdirSync — graceful empty state if athletes directory is missing at build time"
  - "DNF indicator checks entry.completedSectors < SECTOR_SEGMENT_IDS.length — handled via scoring engine output"

patterns-established:
  - "data-section scoping pattern: use data-section + data-gender on both tab buttons and panels when multiple independent tab groups exist on one page"
  - "Leaderboard table structure: rank | name (with expandable breakdown) | score | activity-link"

# Metrics
duration: 3min
completed: 2026-03-30
---

# Phase 30 Plan 01: Results Page + Leaderboards Summary

**Static /results page with Gravel Champion and KOM/QOM Champion leaderboards, gender tabs, sector/climb breakdowns, and Strava links — scoring 23 seed athletes at build time**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-30T20:18:30Z
- **Completed:** 2026-03-30T20:21:53Z
- **Tasks:** 2 (committed together)
- **Files modified:** 1

## Accomplishments

- Build-time leaderboard rendering from 23 seed athlete JSON files using `readdirSync` + `readFileSync` in Astro frontmatter
- Gravel Champion leaderboard with total time, `<details>`-collapsible sector breakdowns, and DNF indicator for incomplete finishes
- KOM/QOM Champion leaderboard with total points (/30), `<details>`-collapsible climb breakdowns showing rank and points per climb
- Independent gender tab switching (Men/Women/Non-binary) scoped by `data-section` attribute — two separate tab groups on one page
- Empty state card for pre-event deploys when no athlete files exist

## Task Commits

Each task was committed atomically:

1. **Task 1 + 2: Create results.astro with data pipeline, leaderboards, and gender tabs** - `adfff9c` (feat)

**Plan metadata:** _(pending docs commit)_

## Files Created/Modified

- `src/pages/results.astro` — Results page: build-time scoring pipeline, Gravel Champion + KOM/QOM Champion leaderboards, gender tabs, sector/climb breakdowns, empty state, Strava attribution

## Decisions Made

- Both tasks committed together since they modify the same file and are logically inseparable at commit granularity
- `data-section` attribute added to both tab buttons and panels to scope tab switching independently per leaderboard — research recommended this pattern for multiple tab groups
- `existsSync` guard wraps `readdirSync` per research Pitfall 1 — prevents `ENOENT` if athletes directory missing
- `/30` suffix on KOM points uses scoring engine's max of 10pts × 3 climbs
- Time formatting uses integer arithmetic (`Math.floor`) not `Date` API — simpler for duration-as-seconds display

## Deviations from Plan

None — plan executed exactly as written. Both tasks implemented together in one file as designed.

## Issues Encountered

None. Build succeeded on first run in 3.44s.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `/results` page builds and renders 23 seed athletes from committed JSON files
- Page is accessible at `/results` after deploy
- Gender tabs work client-side via vanilla JS
- Ready for Phase 30 Plan 02 if there is one, or Phase 31 (final phase)
- Consider adding a nav link or CTA on `index.astro` pointing to `/results` so users can discover the page (flagged in research open questions)

---
*Phase: 30-results-page-leaderboards*
*Completed: 2026-03-30*
