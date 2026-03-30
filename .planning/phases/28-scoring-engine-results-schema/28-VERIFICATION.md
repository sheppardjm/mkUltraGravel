---
phase: 28-scoring-engine-results-schema
verified: 2026-03-30T18:21:36Z
status: passed
score: 4/4 must-haves verified
re_verification: false
---

# Phase 28: Scoring Engine + Results Schema Verification Report

**Phase Goal:** A tested scoring engine computes Gravel Champion rankings (cumulative elapsed time across 6 sectors) and KOM/QOM Champion rankings (10-1 points for top 10 per climb) with gender separation, and the results JSON schema is defined with seed data for downstream development.
**Verified:** 2026-03-30T18:21:36Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                                               | Status     | Evidence                                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | Given athlete segment effort times, scoring engine produces correct Gravel Champion leaderboard by cumulative sector time, by gender | ✓ VERIFIED | `computeGravelChampion` implemented (scoring.js:72), 4 gravel tests pass incl. ranking, gender sep, DNF handling       |
| 2   | Given athlete segment effort times, scoring engine produces correct KOM/QOM leaderboard (10-1 pts per climb, by gender)            | ✓ VERIFIED | `computeKomChampion` implemented (scoring.js:140), 5 KOM tests pass incl. scoring, gender sep, tiebreaker, small field |
| 3   | Seed data files (23 total: 12M/8F/3NB) exist with realistic data covering all gender categories and top-10 exercise                | ✓ VERIFIED | 23 files confirmed in public/data/results/athletes/; DNF case per group; validation script passes                     |
| 4   | Results JSON schema stores only event-owned derived data, no raw Strava API fields                                                  | ✓ VERIFIED | schema.json has `additionalProperties: false`; grep of all 23 seed files finds no raw Strava API fields               |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact                                 | Expected                                            | Status      | Details                                                               |
| ---------------------------------------- | --------------------------------------------------- | ----------- | --------------------------------------------------------------------- |
| `src/lib/scoring.js`                     | Scoring engine with named exports                   | ✓ VERIFIED  | 216 lines; exports SECTOR_SEGMENT_IDS, KOM_SEGMENT_IDS, GENDERS, computeGravelChampion, computeKomChampion |
| `src/lib/scoring.test.js`                | Test suite 80+ lines covering both scoring formats  | ✓ VERIFIED  | 332 lines; 13 tests across 3 describe blocks; all 13 pass             |
| `public/data/results/schema.json`        | JSON Schema draft-07 for per-athlete result files   | ✓ VERIFIED  | 52 lines; valid JSON Schema with athleteId, name, gender, activityUrl, submittedAt, segments required |
| `public/data/results/athletes/` (dir)    | 23 seed files (12M, 8F, 3NB)                        | ✓ VERIFIED  | Exactly 23 files; seed-m-01..12, seed-f-01..08, seed-nb-01..03       |
| `scripts/validate-results.mjs`           | Validation script 30+ lines, imports scoring module | ✓ VERIFIED  | 100 lines; ESM imports scoring.js directly; `npm run validate` passes |

### Key Link Verification

| From                                  | To                              | Via                                           | Status     | Details                                                                 |
| ------------------------------------- | ------------------------------- | --------------------------------------------- | ---------- | ----------------------------------------------------------------------- |
| `src/lib/scoring.js`                  | `public/data/annotations.json`  | Hardcoded segment IDs matching stravaSegmentId | ✓ WIRED    | All 6 sector IDs and 3 KOM IDs confirmed present in annotations.json    |
| `scripts/validate-results.mjs`        | `src/lib/scoring.js`            | ESM import at line 8                           | ✓ WIRED    | `import { computeGravelChampion, computeKomChampion, ... } from '../src/lib/scoring.js'` |
| `public/data/results/athletes/*.json` | `public/data/results/schema.json` | Schema conformance — same fields/types        | ✓ WIRED    | All 23 files have athleteId, name, gender (M/F/NB), activityUrl, submittedAt, segments with numeric keys and integer elapsed_time |

### Requirements Coverage

| Requirement                                                     | Status      | Notes                                                    |
| --------------------------------------------------------------- | ----------- | -------------------------------------------------------- |
| Gravel Champion: cumulative elapsed_time across 6 sector IDs    | ✓ SATISFIED | SECTOR_SEGMENT_IDS defined; computeGravelChampion sums them |
| KOM/QOM Champion: 10-1 points top-10 per climb                  | ✓ SATISFIED | KOM_SEGMENT_IDS defined; computeKomChampion scores correctly |
| Gender separation (M, F, NB) in both scoring formats            | ✓ SATISFIED | groupByGender helper; output always has M/F/NB keys      |
| DNF handling (missing sector ranked below complete athletes)     | ✓ SATISFIED | Sort by completedSectors desc first; test 3 verifies it  |
| KOM tiebreaker: segment wins then alphabetical                   | ✓ SATISFIED | Three-key sort; test 6 (trio) verifies it                |
| Seed data with 12M/8F/3NB athletes                              | ✓ SATISFIED | 23 files verified; validation script counts them         |
| Schema: no raw Strava API fields                                 | ✓ SATISFIED | additionalProperties: false; scan of all 23 files clean  |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| None | —    | —       | —        | —      |

No TODO/FIXME comments, no placeholder returns, no empty handlers found in any phase artifacts.

### Human Verification Required

None. All phase goals are verifiable programmatically:
- Test suite runs and all 13 tests pass
- Validation script runs against all 23 seed files and exits 0
- Leaderboards are printed and non-empty for all 6 gender-category combinations

### Gaps Summary

No gaps. All four must-have truths are verified.

---

## Detailed Evidence

### Test Run Output

```
 Test Files  1 passed (1)
      Tests  13 passed (13)
   Start at  14:21:05
   Duration  425ms
```

Tests cover: basic Gravel ranking, gender separation, DNF, KOM basic scoring, KOM gender separation, KOM tiebreaker (points tie → wins tie → alphabetical), small field (<10 athletes), empty input, and exported constants sanity checks.

### Validation Script Output (abbreviated)

```
Found 23 athlete files

--- Gravel Champion Leaderboards ---
M (12 athletes): Jake Morrison — 154:55 ... Luke Ojibway — 187:38 [5/6 sectors]
F (8 athletes):  Sarah Marquette — 164:33 ... Lauren Houghton — 180:07 [5/6 sectors]
NB (3 athletes): Alex Keweenaw — 159:25 ... Casey Pictured — 172:15 [5/6 sectors]

--- KOM/QOM Champion Leaderboards ---
M (12 athletes): Tyler Krueger — 29 pts ... Eric Negaunee — 0 pts
F (8 athletes):  Emily Copper — 29 pts ... Jess Baraga — 9 pts
NB (3 athletes): Alex Keweenaw — 30 pts ... Jordan Superior — 25 pts

VALIDATION PASSED: 23 files valid, scoring engine produced results for all categories
```

DNF cases confirmed: last athlete per gender group has [5/6 sectors].
KOM scoring confirmed: M leaderboard exercises full 1-12 range (some 0 pts, some points).

---

_Verified: 2026-03-30T18:21:36Z_
_Verifier: Claude (gsd-verifier)_
