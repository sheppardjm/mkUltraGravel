---
phase: 28-scoring-engine-results-schema
plan: 01
subsystem: scoring
tags: [vitest, tdd, scoring, strava, segments, leaderboard, esm]

# Dependency graph
requires:
  - phase: 27-segment-links-scoring-explainer
    provides: Strava segment IDs confirmed in annotations.json
provides:
  - Pure scoring engine module (src/lib/scoring.js) with named ES module exports
  - computeGravelChampion — ranks by cumulative sector time, gender-separated
  - computeKomChampion — 10-1 pts per climb, gender-separated, tie-safe
  - Full test suite (13 tests) via src/lib/scoring.test.js
affects:
  - 29-netlify-oauth-submission
  - 30-leaderboard-rendering

# Tech tracking
tech-stack:
  added: [vitest@4.1.2]
  patterns:
    - TDD with vitest (RED → GREEN → REFACTOR cycle)
    - Pure ES module functions with named exports
    - Inline test fixtures (no seed file imports)
    - Dense tie ranking for segment time collisions

key-files:
  created:
    - src/lib/scoring.js
    - src/lib/scoring.test.js
  modified:
    - package.json

key-decisions:
  - "Segment IDs stored as strings (not integers) to match athlete segment object keys"
  - "Tie ranking: athletes with identical segment times share rank — both get same points and both count as wins"
  - "DNF handling: sort by completedSectors desc, then totalTime asc — partial finishers always rank below complete finishers"

patterns-established:
  - "Athlete result schema: { athleteId, name, gender, activityUrl, segments: { [segmentId]: { elapsed_time } } }"
  - "Gender keys: M, F, NB — all three always present in output even if empty"
  - "Scoring functions are pure — no I/O, no side effects"

# Metrics
duration: 4min
completed: 2026-03-30
---

# Phase 28 Plan 01: Scoring Engine Summary

**Pure ES module scoring engine with vitest test suite — computeGravelChampion (6-sector cumulative time) and computeKomChampion (10-1 pts per climb) with gender separation, DNF handling, and tie-safe segment ranking**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-30T18:09:40Z
- **Completed:** 2026-03-30T18:13:14Z
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files modified:** 3

## Accomplishments

- `src/lib/scoring.js` — 230-line pure scoring engine, zero external dependencies, ES module exports
- `src/lib/scoring.test.js` — 13 tests covering basic ranking, gender separation, DNF, ties, small fields, empty input; all pass
- vitest installed and wired to `npm test`

## Task Commits

Each task was committed atomically:

1. **Task 1: Install vitest and write RED tests** - `79ae08b` (test)
2. **Task 2: Implement scoring engine GREEN + REFACTOR** - `cc8f7c8` (feat)

_Note: TDD plan — test commit then feat commit as specified._

## Files Created/Modified

- `src/lib/scoring.js` — Scoring engine with `computeGravelChampion`, `computeKomChampion`, `SECTOR_SEGMENT_IDS`, `KOM_SEGMENT_IDS`, `GENDERS` exports
- `src/lib/scoring.test.js` — 13-test vitest suite with inline fixtures
- `package.json` — Added vitest devDependency + `"test": "vitest run"` script

## Decisions Made

- **String segment IDs throughout:** Strava segment IDs are stored as strings in athlete objects, so SECTOR_SEGMENT_IDS and KOM_SEGMENT_IDS arrays use string values. Avoids any type coercion bugs at callsites.
- **Tie-safe segment ranking:** When two athletes have identical elapsed_time on a segment, both receive the same rank and same points (dense ranking). Both count as "wins" (segmentWins++). This ensures test 6's alphabetical tiebreaker scenario works correctly.
- **DNF sort logic:** Sort by completedSectors descending first, then totalTime ascending. An athlete with 5/6 sectors always ranks below a 6/6 athlete regardless of how fast their partial time is.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Segment time tie handling produced non-deterministic ranking**

- **Found during:** Task 2 (GREEN phase — test 6 failing)
- **Issue:** When two athletes had identical segment times, Array.sort order determined who got rank=1 (the "win"). This caused non-deterministic segmentWins counts and broke the alphabetical tiebreaker test.
- **Fix:** Added dense tie ranking logic in the `withTime.forEach` loop. Athletes with identical times now share the same rank, both receiving the same points and both getting segmentWins credit.
- **Files modified:** `src/lib/scoring.js`
- **Verification:** All 13 tests pass including test 6 (tiebreaker with identical times → alphabetical sort)
- **Committed in:** cc8f7c8 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Bug fix was essential for correctness — tie ranking was producing wrong results. No scope creep.

## Issues Encountered

- Test 6 (tiebreaker) failed on first GREEN attempt because the rank=1 assignment was not tie-aware. Diagnosed immediately: athletes with the same time both need rank=1. Fixed in same task commit.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `src/lib/scoring.js` is fully importable with named exports, ready for Phase 29 (Netlify Function) and Phase 30 (Astro build-time rendering)
- Athlete result schema is defined and tested — Phase 29 must produce objects matching `{ athleteId, name, gender, activityUrl, segments: { [segmentId]: { elapsed_time } } }`
- No blockers

---
*Phase: 28-scoring-engine-results-schema*
*Completed: 2026-03-30*
