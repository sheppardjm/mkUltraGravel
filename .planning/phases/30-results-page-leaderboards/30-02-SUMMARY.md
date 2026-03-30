---
phase: 30-results-page-leaderboards
plan: 02
subsystem: ui
tags: [astro, leaderboard, segments, strava, scoring]

# Dependency graph
requires:
  - phase: 30-results-page-leaderboards-01
    provides: results.astro with SECTOR_SEGMENT_IDS, KOM_SEGMENT_IDS, SECTOR_NAMES, KOM_NAMES, formatTime helper
  - phase: 28-scoring-engine-results-schema
    provides: athlete JSON schema with segments[segId].elapsed_time
provides:
  - "Individual segment leaderboards for all 9 timed segments on /results page"
  - "buildSegmentLeaderboard() utility function for per-segment time ranking"
  - "Combined-gender rankings showing all riders sorted by elapsed_time ascending"
  - "Grouped display: 6 Gravel Sectors + 3 KOM Climbs sub-sections"
affects: [phase-31]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-segment leaderboard map built at build time — loop over ALL_SEGMENT_IDS, store in plain object keyed by segId"
    - "Combined genders for segment boards — avoids 27 mini-boards, segment purpose differs from champion boards"
    - "SEG_DISPLAY_MAX=10 cap with overflow indicator — keeps page compact regardless of field size"

key-files:
  created: []
  modified:
    - src/pages/results.astro

key-decisions:
  - "Combined genders per segment (not per-gender tabs) — individual segment performance vs. overall gender ranking serve different purposes"
  - "Max 10 entries per segment with 'and X more' overflow note — prevents unbounded page growth"
  - "buildSegmentLeaderboard typed as any[] input with mapped return — avoids needing full athlete type definition in .astro frontmatter"
  - "ALL_SEGMENT_IDS = [...SECTOR_SEGMENT_IDS, ...KOM_SEGMENT_IDS] spread — single loop builds all 9 leaderboards cleanly"

patterns-established:
  - "Segment leaderboard card: classified-border p-4 mb-4 with data-reveal + staggered animation-delay"
  - "Compact table columns: # | Name | Time | Cat | Activity — consistent pattern for all 9 segment cards"

# Metrics
duration: 5min
completed: 2026-03-30
---

# Phase 30 Plan 02: Segment Leaderboards Summary

**Per-segment leaderboards for all 9 timed segments (6 gravel sectors + 3 KOM climbs) on /results, combined-gender, sorted by elapsed time, capped at 10 entries**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-30T20:24:32Z
- **Completed:** 2026-03-30T20:29:42Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- `buildSegmentLeaderboard(athletes, segId)` helper added to frontmatter — filters to riders with a time, sorts ascending by elapsed_time, returns typed array
- All 9 segment leaderboards pre-built at Astro build time into a `segmentLeaderboards` map keyed by segment ID
- "Segment Leaderboards" section appended below KOM/QOM Champion with "Gravel Sectors" and "KOM Climbs" sub-groups
- Compact 5-column table per segment: rank, name, formatted time, gender badge (M/F/NB), Strava icon link
- 10-entry display cap with "and X more" overflow indicator; "No times recorded." empty state for zero-entry segments

## Task Commits

Each task was committed atomically:

1. **Task 1: Add per-segment leaderboard builder and render segment sections** - `fd902cf` (feat)

**Plan metadata:** _(pending docs commit)_

## Files Created/Modified

- `src/pages/results.astro` — Added `buildSegmentLeaderboard()`, segment leaderboard build loop, and full Segment Leaderboards template section with Gravel Sectors and KOM Climbs sub-groups

## Decisions Made

- Combined genders per segment leaderboard (not per-gender tabs) — per the research recommendation. Individual segment boards show cross-category performance while champion boards rank within gender. Keeping them combined avoids 27 mini-boards and reflects the different purpose.
- Max 10 entries per segment with "and X more" overflow note — seed data with 23 athletes generates ~23 entries per segment; capping at 10 keeps the page compact for post-event field sizes.
- `buildSegmentLeaderboard` typed with `any[]` input — avoids needing a full athlete TypeScript interface in the .astro frontmatter, which is consistent with the approach used for the rest of the file.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. Build succeeded in 3.39s on first run.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `/results` page now has complete leaderboard coverage: Gravel Champion + KOM/QOM Champion (gender tabs) + all 9 individual segment boards
- Phase 30 is fully complete — both plans delivered
- Ready for Phase 31 (final phase)
- Results page is accessible at `/results` after deploy with all leaderboard sections functional

---
*Phase: 30-results-page-leaderboards*
*Completed: 2026-03-30*
