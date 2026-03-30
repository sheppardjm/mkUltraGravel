# Milestone v5.0: Strava Integration + Results

**Status:** In progress
**Phases:** 27-31
**Total Plans:** TBD

## Overview

Integrate Strava segment data into the existing sector and KOM cards, build a Grinduro-style dual scoring engine (cumulative time for gravel, top-10 points for KOM/QOM), create a Strava OAuth activity submission flow on Netlify Functions with per-athlete JSON storage, and ship a results page with gravel champion and KOM/QOM champion leaderboards. Pre-event features (segment links, scoring explainer, manual KOM times) ship first with zero API dependency, while the Strava app registration begins immediately to clear its 2-4 week review window.

## Phases

### Phase 27: Segment Links + Scoring Explainer

**Goal**: Every sector and KOM card links to its Strava segment, displays segment metadata, shows manual KOM/QOM times on climb cards, and the site explains how scoring works -- all with zero Strava API dependency.
**Depends on**: Nothing (first v5.0 phase)
**Requirements**: STRAVA-01, STRAVA-02, STRAVA-03, SCORE-03
**Research flag**: None (simple href additions to existing Astro components)
**Success Criteria** (what must be TRUE):
  1. Each of the 9 sector/KOM cards displays a Strava icon that links to the correct segment page on strava.com
  2. Each card shows segment distance and average grade
  3. The 3 KOM cards display manually-entered KOM and QOM best times
  4. A scoring explainer section on the site describes both the Gravel Champion (cumulative time) and KOM/QOM Champion (top-10 points) formats clearly enough that a first-time visitor understands how results will work
  5. "Powered by Strava" attribution is visible on the site per Strava brand guidelines
**Plans:** 2 plans
Plans:
- [ ] 27-01-PLAN.md — Strava segment IDs in annotations.json + Strava links on all 9 card components
- [ ] 27-02-PLAN.md — ScoringExplainer component + Powered by Strava attribution in index.astro

### Phase 28: Scoring Engine + Results Schema

**Goal**: A tested scoring engine computes Gravel Champion rankings (cumulative elapsed time across 6 sectors) and KOM/QOM Champion rankings (10-1 points for top 10 per climb) with gender separation, and the results JSON schema is defined with seed data for downstream development.
**Depends on**: Phase 27 (segment ID configuration established)
**Requirements**: SCORE-01, SCORE-02
**Research flag**: None (pure computation logic, well-defined rules, no external dependencies)
**Success Criteria** (what must be TRUE):
  1. Given a set of athlete segment effort times, the scoring engine produces a correct Gravel Champion leaderboard ranked by total elapsed time across the 6 gravel sectors, separated by gender (men/women/non-binary)
  2. Given a set of athlete segment effort times, the scoring engine produces a correct KOM/QOM Champion leaderboard awarding 10-1 points to the top 10 per climb, ranked by total points, separated by gender
  3. Seed data files (per-athlete JSON) exist in the results directory with realistic test data covering all three gender categories and enough athletes to exercise top-10 scoring
  4. The results JSON schema stores only event-owned derived data (name, category, segment times), not raw Strava API fields
**Plans**: TBD

### Phase 29: Strava OAuth + Activity Submission

**Goal**: A rider can submit their Strava activity through the site, authenticate via OAuth, have their segment efforts extracted and scored, self-report their gender category, consent to public display, and have their results committed to the repository -- triggering a site rebuild.
**Depends on**: Phase 28 (scoring engine), Phase 27 (segment ID config)
**Requirements**: SUBMIT-01, SUBMIT-02, SUBMIT-03, SUBMIT-04, SUBMIT-05, SUBMIT-06
**Research flag**: YES -- OAuth state parameter security (CSRF), per-athlete GitHub API concurrency, Netlify Functions v2 env var availability
**Success Criteria** (what must be TRUE):
  1. A rider can paste their Strava activity URL into the submission form and be redirected to Strava's OAuth consent screen
  2. After authorizing, the rider sees a submission form with a gender/category dropdown (men/women/non-binary) and an explicit consent checkbox for public results display
  3. On submission, the system extracts segment_efforts matching the 9 event segments from the authorized activity and rejects activities that contain no matching segment efforts
  4. A per-athlete JSON result file is committed to the repository via GitHub API, and a Netlify build hook triggers site rebuild
  5. The rider sees confirmation that their results were submitted successfully
**Plans**: TBD

### Phase 30: Results Page + Leaderboards

**Goal**: The site has a results page showing Gravel Champion and KOM/QOM Champion leaderboards with gender tabs, individual segment rankings, per-segment time breakdowns, and Strava activity links -- rendered at build time from committed JSON.
**Depends on**: Phase 28 (scoring engine + seed data for development), Phase 29 (submission flow for real data)
**Requirements**: RESULT-01, RESULT-02, RESULT-03, RESULT-04, RESULT-05
**Research flag**: None (Astro SSG page reading JSON at build time, same pattern as index page with route-data.json)
**Success Criteria** (what must be TRUE):
  1. A results page exists at /results with Gravel Champion and KOM/QOM Champion leaderboard sections
  2. Each leaderboard has tabs for men, women, and non-binary categories
  3. Gravel Champion rows show each rider's total time and a per-segment time breakdown
  4. Individual segment leaderboards show per-segment times and rankings for all 9 segments
  5. Each result row includes a link to the rider's Strava activity
**Plans**: TBD

### Phase 31: Deauthorization Webhook + Privacy

**Goal**: The site handles Strava deauthorization callbacks and deletes athlete data within 48 hours, meeting TOS Section 5.4 requirements and displaying a privacy notice on the submission page.
**Depends on**: Phase 29 (submission flow must exist before deauth can reference athlete data)
**Requirements**: SUBMIT-07
**Research flag**: None (webhook handler is a standard Netlify Function responding to Strava POST callback)
**Success Criteria** (what must be TRUE):
  1. When Strava sends a deauthorization webhook POST for an athlete, the system deletes that athlete's result file from the repository within 48 hours
  2. The submission page displays a privacy notice explaining what data is collected, how it is used, and that deauthorizing the app on Strava will remove their results
**Plans**: TBD

---

## Coverage

| Requirement | Phase | Description |
|-------------|-------|-------------|
| STRAVA-01 | 27 | Strava icon + link on all 9 cards |
| STRAVA-02 | 27 | Segment metadata (distance, avg grade) on cards |
| STRAVA-03 | 27 | Manual KOM/QOM times on 3 KOM cards |
| SCORE-01 | 28 | Gravel Champion scoring engine |
| SCORE-02 | 28 | KOM/QOM Champion scoring engine |
| SCORE-03 | 27 | Scoring system explainer on site |
| SUBMIT-01 | 29 | Strava OAuth flow via Netlify Function |
| SUBMIT-02 | 29 | Segment_efforts extraction from activity |
| SUBMIT-03 | 29 | Self-reported gender/category dropdown |
| SUBMIT-04 | 29 | Explicit consent checkbox |
| SUBMIT-05 | 29 | Per-athlete JSON via GitHub API + rebuild |
| SUBMIT-06 | 29 | Activity validation (matching segment_efforts) |
| SUBMIT-07 | 31 | Deauthorization webhook + data deletion |
| RESULT-01 | 30 | Gravel Champion leaderboard page |
| RESULT-02 | 30 | KOM/QOM Champion leaderboard page |
| RESULT-03 | 30 | Individual segment leaderboards |
| RESULT-04 | 30 | Per-segment time breakdown in gravel rows |
| RESULT-05 | 30 | Strava activity link on result rows |

**Mapped: 17/17 -- no orphans, no duplicates.**

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 27. Segment Links + Scoring Explainer | 0/2 | Planned | - |
| 28. Scoring Engine + Results Schema | 0/TBD | Not started | - |
| 29. Strava OAuth + Activity Submission | 0/TBD | Not started | - |
| 30. Results Page + Leaderboards | 0/TBD | Not started | - |
| 31. Deauthorization Webhook + Privacy | 0/TBD | Not started | - |

---

## External Dependencies

- **Strava API App Registration**: Must be submitted for review immediately. 2-4 week review period. Blocks Phase 29 (OAuth flow). Phases 27-28 are independent.
- **Manual KOM/QOM Times**: Phase 27 uses manually-entered times. Future STRAVA-04 (deferred) would automate this if xoms field proves reliable.

---

_For current project status, see .planning/PROJECT.md_
