---
phase: 28-scoring-engine-results-schema
plan: 02
subsystem: scoring
tags: [json-schema, seed-data, validation, scoring, strava, segments, leaderboard, esm, node]

# Dependency graph
requires:
  - phase: 28-scoring-engine-results-schema (plan 01)
    provides: scoring.js with computeGravelChampion and computeKomChampion exports
provides:
  - JSON Schema (draft-07) for per-athlete result file format
  - 23 seed athlete JSON files (12 M, 8 F, 3 NB) with realistic segment times
  - validate-results.mjs script confirming schema + end-to-end scoring correctness
affects:
  - 29-netlify-oauth-submission
  - 30-leaderboard-rendering

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Per-athlete result files are pure event-owned data (no raw Strava API fields)
    - Seed files use last-athlete-per-gender DNF pattern (8 segments vs 9)
    - Validation script uses .mjs extension for ESM import without "type: module" in package.json

key-files:
  created:
    - public/data/results/schema.json
    - public/data/results/athletes/seed-m-01.json (x12)
    - public/data/results/athletes/seed-f-01.json (x8)
    - public/data/results/athletes/seed-nb-01.json (x3)
    - scripts/validate-results.mjs
  modified:
    - package.json

key-decisions:
  - "Seed data uses a deterministic pseudo-random seed (42) for reproducible output"
  - "DNF case: last athlete in each gender group has one sector missing to exercise partial-completion logic"
  - "validate-results.mjs uses .mjs extension (not .js) to support ESM import of scoring.js without adding type:module to package.json"
  - "athleteId stored as string per schema spec to avoid JSON integer precision issues"

patterns-established:
  - "Per-athlete result files contain ONLY: athleteId, name, gender, activityUrl, submittedAt, segments"
  - "segments keyed by numeric string Strava segment ID, value has only elapsed_time (integer seconds)"
  - "Gender categories M/F/NB always present in scoring output, including when field is empty"

# Metrics
duration: 2min
completed: 2026-03-30
---

# Phase 28 Plan 02: Results Schema + Seed Data Summary

**JSON Schema draft-07 for athlete result format, 23 realistic seed files (12M/8F/3NB) with Upper Peninsula Michigan names, and a validation script that confirms schema compliance and produces non-empty leaderboards for all 6 gender-category combinations**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-30T18:16:36Z
- **Completed:** 2026-03-30T18:18:58Z
- **Tasks:** 2
- **Files modified:** 26

## Accomplishments

- `public/data/results/schema.json` — JSON Schema draft-07 documenting all required fields, enums, and segment key pattern
- 23 seed athlete files covering all 3 gender categories with realistic times (sectors 1000-3000s, KOMs 400-1400s), natural skill spread, and DNF case per group
- `scripts/validate-results.mjs` — validates required fields, gender enum, numeric segment keys, positive elapsed_time, then runs scoring engine and prints all 6 ranked leaderboards

## Task Commits

Each task was committed atomically:

1. **Task 1: Create JSON schema and seed athlete data files** - `dfc84bd` (feat)
2. **Task 2: Create validation script and verify scoring engine end-to-end** - `b39f164` (feat)

## Files Created/Modified

- `public/data/results/schema.json` — JSON Schema with athleteId, name, gender, activityUrl, submittedAt, segments; patternProperties for numeric segment keys
- `public/data/results/athletes/seed-m-01..12.json` — 12 men with UP Michigan cycling names (Jake Morrison through Luke Ojibway)
- `public/data/results/athletes/seed-f-01..08.json` — 8 women (Sarah Marquette through Lauren Houghton)
- `public/data/results/athletes/seed-nb-01..03.json` — 3 non-binary (Alex Keweenaw, Jordan Superior, Casey Pictured)
- `scripts/validate-results.mjs` — ESM validation + scoring script, 77 lines
- `package.json` — Added `"validate": "node scripts/validate-results.mjs"` npm script

## Decisions Made

- **Deterministic seed (42):** Used a linear congruential RNG seeded at 42 so seed files are reproducible and version-controlled diffs are stable.
- **DNF pattern:** Last athlete in each gender group has one randomly-chosen sector deleted. Exercises the completedSectors < 6 leaderboard sorting path.
- **.mjs extension for validation script:** Avoids adding `"type": "module"` to package.json which would break existing CommonJS scripts (generate-data.js, etc.).
- **No additionalProperties:** Schema uses `additionalProperties: false` at top level and in segment effort objects to prevent raw Strava API fields from sneaking in.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 29 (OAuth submission) must write athlete JSON files conforming to `public/data/results/schema.json`
- Phase 30 (Results Page) can import seed files immediately for UI development without waiting for real Strava data
- `npm run validate` is the integration test for the entire data pipeline — run it after any seed data changes
- Gravel Champion M leaderboard: 12 athletes, F: 8, NB: 3 (all non-empty, all verified)
- KOM/QOM M leaderboard: top 10 have points (29 down to 3), 11th has 1 pt, 12th has 0 — exercises full scoring range

---
*Phase: 28-scoring-engine-results-schema*
*Completed: 2026-03-30*
