---
phase: 30-results-page-leaderboards
verified: 2026-03-30T20:30:00Z
status: passed
score: 5/5 must-haves verified
---

# Phase 30: Results Page + Leaderboards Verification Report

**Phase Goal:** The site has a results page showing Gravel Champion and KOM/QOM Champion leaderboards with gender tabs, individual segment rankings, per-segment time breakdowns, and Strava activity links -- rendered at build time from committed JSON.
**Verified:** 2026-03-30T20:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                          | Status     | Evidence                                                                                                                              |
| --- | ---------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A results page exists at /results with Gravel Champion and KOM/QOM Champion sections           | VERIFIED   | `src/pages/results.astro` (814 lines); built `dist/results/index.html` present; "Gravel Champion" and "KOM/QOM Champion" headings each appear 2× in built HTML |
| 2   | Each leaderboard has tabs for Men, Women, and Non-binary categories                            | VERIFIED   | 6 tab buttons (3 `data-section="gravel"` + 3 `data-section="kom"`) and 6 tabpanels in built HTML; JS tab-switching script minified into output |
| 3   | Gravel Champion rows show each rider's total time and a per-segment time breakdown             | VERIFIED   | `formatTime(entry.totalTime)` rendered per row; `<details><summary>Sector breakdown</summary>` with `entry.sectorTimes[segId]` present for all 3 gender panels |
| 4   | Individual segment leaderboards show per-segment times and rankings for all 9 segments         | VERIFIED   | All 9 segment names (Sandstrom, Akkala Rd, Haavisto, Forest Service Rd, C4, Down Jeep, Billie Helmer, Leaving Chatham, Silver Creek) each appear 2× in built HTML; `buildSegmentLeaderboard()` function wired to all 9 segments via `ALL_SEGMENT_IDS` loop |
| 5   | Each result row includes a link to the rider's Strava activity                                 | VERIFIED   | 11 `strava.com/activities` URLs in built HTML; all links carry `target="_blank" rel="noopener noreferrer"` |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact                                    | Expected                                          | Status    | Details                                                                                    |
| ------------------------------------------- | ------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------ |
| `src/pages/results.astro`                   | Results page with all leaderboards and tab logic  | VERIFIED  | 814 lines; exports none (page file); no stubs; fully wired to scoring.js and athlete JSON  |
| `src/lib/scoring.js`                        | computeGravelChampion, computeKomChampion exports | VERIFIED  | 216 lines; all 4 named exports present: SECTOR_SEGMENT_IDS, KOM_SEGMENT_IDS, computeGravelChampion, computeKomChampion |
| `public/data/results/athletes/` (23 files)  | Seed athlete JSON files for build-time rendering  | VERIFIED  | 23 JSON files present (8 F, 12 M, 3 NB based on filenames); each has `segments[segId].elapsed_time`, `activityUrl`, `name`, `gender` |

### Key Link Verification

| From                          | To                                        | Via                                    | Status   | Details                                                                                       |
| ----------------------------- | ----------------------------------------- | -------------------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `src/pages/results.astro`     | `src/lib/scoring.js`                      | import in frontmatter                  | WIRED    | Line 4: `import { computeGravelChampion, computeKomChampion, SECTOR_SEGMENT_IDS, KOM_SEGMENT_IDS } from "../lib/scoring.js"` |
| `src/pages/results.astro`     | `public/data/results/athletes/`           | existsSync + readdirSync + readFileSync | WIRED    | Lines 9-14: athletesDir built with `join(process.cwd(), ...)`, existsSync guard, readdirSync + JSON.parse chain |
| scoring.js `computeGravelChampion` | athlete JSON `sectorTimes`          | entry.sectorTimes[segId]               | WIRED    | sectorTimes map built per-athlete from SECTOR_SEGMENT_IDS; iterated in template for sector breakdown |
| scoring.js `computeKomChampion`    | athlete JSON `climbPoints`          | entry.climbPoints[segId].elapsed_time  | WIRED    | climbPoints map built per-athlete per KOM segment; iterated in template for climb breakdown   |
| `buildSegmentLeaderboard()`   | `athlete.segments[segId].elapsed_time`    | filter + map + sort in frontmatter     | WIRED    | Lines 51-61: filters on `a.segments?.[segId]?.elapsed_time !== undefined`, sorts ascending; called for all 9 segment IDs |

### Requirements Coverage

| Requirement                                          | Status    | Notes                                                              |
| ---------------------------------------------------- | --------- | ------------------------------------------------------------------ |
| RESULT-01: Gravel Champion leaderboard               | SATISFIED | Section present with ranked rows, total time, sector breakdowns     |
| RESULT-02: KOM/QOM Champion leaderboard              | SATISFIED | Section present with ranked rows, total points (/30), climb breakdowns |
| RESULT-03: Individual segment leaderboards (9 segs)  | SATISFIED | All 9 segments rendered in two sub-groups (Gravel Sectors + KOM Climbs) |
| RESULT-04: Per-segment time breakdowns               | SATISFIED | `<details>` sector and climb breakdowns on all champion rows       |
| RESULT-05: Strava activity links                     | SATISFIED | 11 strava.com/activities links in built HTML with correct attributes |

### Anti-Patterns Found

None. No TODO/FIXME/placeholder patterns found in `src/pages/results.astro`. No empty handlers, no stub returns.

### Human Verification Required

The following items cannot be verified programmatically:

#### 1. Gender tab switching interaction

**Test:** Open `/results` in a browser. Click "Women" tab on the Gravel Champion leaderboard, then click "Men" tab on the KOM/QOM Champion leaderboard.
**Expected:** Each tab group switches independently — changing Gravel Champion gender does not affect KOM/QOM Champion gender and vice versa.
**Why human:** Tab JS is minified into the built HTML; behavioral correctness of `data-section` scoping requires a running browser.

#### 2. Sector breakdown expand/collapse

**Test:** Click "Sector breakdown" on any Gravel Champion row.
**Expected:** A definition list of sector names and formatted times expands inline below the row.
**Why human:** `<details>/<summary>` behavior is native HTML and cannot be verified from static HTML inspection.

#### 3. Seed athlete data completeness

**Test:** View the Men Gravel Champion leaderboard. Verify 12 men are ranked with valid names and formatted times.
**Expected:** 12 male athletes appear ranked by total time; times display as H:MM:SS format; no "[object Object]" or NaN rendering.
**Why human:** Data integrity of the 23 seed JSON files against the scoring engine output requires rendered inspection.

### Gaps Summary

No gaps. All 5 observable truths are fully verified against the codebase. `src/pages/results.astro` is a complete, non-stub 814-line implementation. All scoring engine imports resolve to substantive functions in `src/lib/scoring.js`. All 23 seed athlete JSON files are present with the correct schema. The built `dist/results/index.html` contains all expected content — leaderboard headings, 6 tab buttons, 6 tab panels, 9 segment names, 11 Strava links with correct attributes.

---

_Verified: 2026-03-30T20:30:00Z_
_Verifier: Claude (gsd-verifier)_
