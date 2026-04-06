---
phase: 48-strava-infrastructure-removal
plan: 01
subsystem: ui
tags: [astro, strava, cleanup, pages, components]

# Dependency graph
requires: []
provides:
  - Deleted results.astro, submit.astro, submit-confirm.astro (Strava-gated pages)
  - Deleted ScoringExplainer.astro component
  - Cleaned index.astro of ScoringExplainer import/usage and "Powered by Strava" text
  - Removed KOM/QOM time display block from KomSegments.astro
affects:
  - 48-02-strava-infrastructure-removal (scoring.js + Netlify Functions safe to delete now)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Delete pages before their dependencies to avoid build failures"

key-files:
  created: []
  modified:
    - src/pages/index.astro
    - src/components/KomSegments.astro
  deleted:
    - src/pages/results.astro
    - src/pages/submit.astro
    - src/pages/submit-confirm.astro
    - src/components/ScoringExplainer.astro

key-decisions:
  - "Delete page files before their backend dependencies (results.astro before scoring.js) to prevent cascading build failures"
  - "Preserve Strava segment links on KOM cards — only remove time data fetched from Strava API"

patterns-established:
  - "Strava segment links (static URLs) are retained; only dynamic/API-fetched data is removed"

# Metrics
duration: 3min
completed: 2026-04-06
---

# Phase 48 Plan 01: Strava Infrastructure Removal Summary

**Deleted 4 Strava-dependent files and stripped Strava UI references from index.astro and KomSegments.astro, leaving site buildable with 1 page**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-06T14:02:26Z
- **Completed:** 2026-04-06T14:04:36Z
- **Tasks:** 2
- **Files modified:** 2 edited, 4 deleted

## Accomplishments
- Deleted results.astro (which imported scoring.js at build time — must precede Plan 02)
- Deleted submit.astro and submit-confirm.astro (Strava OAuth flow pages)
- Deleted ScoringExplainer.astro component
- Removed ScoringExplainer import and usage from index.astro
- Removed "Powered by Strava" paragraph from index.astro
- Removed KOM/QOM komTime/qomTime type fields and display block from KomSegments.astro
- Preserved Strava segment links ("View on Strava") on KOM cards
- Site builds to 1 page cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete Strava-dependent pages and ScoringExplainer component** - `082f9cf` (chore)
2. **Task 2: Clean up index.astro and KomSegments.astro** - `32f40d8` (feat)

**Plan metadata:** (see docs commit below)

## Files Created/Modified
- `src/pages/index.astro` - Removed ScoringExplainer import/usage and "Powered by Strava" paragraph
- `src/components/KomSegments.astro` - Removed komTime/qomTime type fields and KOM/QOM time display block
- `src/pages/results.astro` - DELETED
- `src/pages/submit.astro` - DELETED
- `src/pages/submit-confirm.astro` - DELETED
- `src/components/ScoringExplainer.astro` - DELETED

## Decisions Made
- Delete page files in this plan (before backend removal in Plan 02) to maintain build integrity throughout the decoupling sequence. results.astro imports scoring.js at build time — deleting scoring.js first would cause an immediate build failure.
- Retain Strava segment links on KOM cards. These are static `href` URLs embedded in annotations.json, not API calls, so they remain valid and useful to riders without any Strava integration.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Node.js v20.19.5 (active shell version) is below Astro's `>=22.12.0` requirement. This is pre-existing infrastructure — not caused by this plan. Build was verified using `/usr/local/opt/node/bin/node` (v25.8.2) which confirmed clean build with 1 page output.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 02 (48-02) is unblocked: scoring.js, Netlify Functions, and remaining Strava infrastructure can now be safely deleted without build failures
- Site currently builds to 1 page (index.html) with no broken imports

---
*Phase: 48-strava-infrastructure-removal*
*Completed: 2026-04-06*
