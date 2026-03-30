# Requirements: MK Ultra Gravel

**Defined:** 2026-03-30
**Core Value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.

## v5.0 Requirements

Requirements for v5.0 — Strava Integration + Results. Each maps to roadmap phases.

### Strava Integration

- [x] **STRAVA-01**: Strava icon + link to segment page on all 9 sector/KOM cards
- [x] **STRAVA-02**: Segment metadata (distance, avg grade) displayed on cards
- [x] **STRAVA-03**: Manual KOM/QOM times displayed on 3 KOM cards

### Scoring

- [x] **SCORE-01**: Gravel Champion scoring — cumulative elapsed_time across 6 sectors, ranked by gender (men/women/non-binary)
- [x] **SCORE-02**: KOM/QOM Champion scoring — 10-1 points for top 10 per climb, most total points wins, ranked by gender
- [x] **SCORE-03**: Scoring system explainer component on site

### Submission

- [x] **SUBMIT-01**: Strava OAuth flow via Netlify Function (authorization code exchange)
- [x] **SUBMIT-02**: Segment_efforts extracted from submitted activity for 9 event segments
- [x] **SUBMIT-03**: Self-reported gender/category dropdown (men/women/non-binary) in submission form
- [x] **SUBMIT-04**: Explicit consent checkbox — results only displayed publicly after opt-in
- [x] **SUBMIT-05**: Per-athlete JSON files committed via GitHub API, rebuild triggered via Netlify build hook
- [x] **SUBMIT-06**: Activity validation — verify submitted activity contains matching event segment_efforts
- [x] **SUBMIT-07**: Deauthorization webhook — handle Strava deauth callback with 48hr data deletion

### Results

- [x] **RESULT-01**: Gravel Champion leaderboard page (cumulative time across 6 sectors, men/women/non-binary tabs)
- [x] **RESULT-02**: KOM/QOM Champion leaderboard page (total points across 3 climbs, men/women/non-binary tabs)
- [x] **RESULT-03**: Individual segment leaderboards (per-segment times and rankings)
- [x] **RESULT-04**: Per-segment time breakdown displayed within gravel leaderboard rows
- [x] **RESULT-05**: Strava activity link on each result row

## Future Requirements

Deferred to later milestones.

- **PERF-03**: Verify onHover performance on mid-range Android devices
- **DATA-07**: Replace Down Jeep KOM fallback photo when better in-range photo available
- **STRAVA-04**: Automated KOM/QOM data from Strava API (if xoms field proves reliable)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time leaderboard updates | Rebuild-on-commit latency (1-2 min) is acceptable |
| Database backend | JSON files sufficient for single-event ~100 participants |
| Strava segment embeds | Chrome third-party cookie deprecation makes them unreliable |
| Auto-scraping KOM/QOM from Strava | TOS violation — using manual entry instead |
| Live KOM/QOM holder data via API | Leaderboard endpoint removed June 2020; xoms field undocumented |
| Bearing-aligned bike icon rotation | MEDIUM complexity; optional enhancement |
| KOM-to-sector hover sync | Cross-component event wiring; second-pass feature |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| STRAVA-01 | Phase 27 | Complete |
| STRAVA-02 | Phase 27 | Complete |
| STRAVA-03 | Phase 27 | Complete |
| SCORE-01 | Phase 28 | Complete |
| SCORE-02 | Phase 28 | Complete |
| SCORE-03 | Phase 27 | Complete |
| SUBMIT-01 | Phase 29 | Complete |
| SUBMIT-02 | Phase 29 | Complete |
| SUBMIT-03 | Phase 29 | Complete |
| SUBMIT-04 | Phase 29 | Complete |
| SUBMIT-05 | Phase 29 | Complete |
| SUBMIT-06 | Phase 29 | Complete |
| SUBMIT-07 | Phase 31 | Complete |
| RESULT-01 | Phase 30 | Complete |
| RESULT-02 | Phase 30 | Complete |
| RESULT-03 | Phase 30 | Complete |
| RESULT-04 | Phase 30 | Complete |
| RESULT-05 | Phase 30 | Complete |

**Coverage:**
- v5.0 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0

---
*Requirements defined: 2026-03-30*
*Last updated: 2026-03-30 after roadmap creation*
