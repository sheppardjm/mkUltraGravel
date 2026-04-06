# Requirements: MK Ultra Gravel

**Defined:** 2026-04-06
**Core Value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.

## v10.0 Requirements

Requirements for decoupling Strava submission/scoring/results from MK Ultra. Leaderboard features move to Iron & Pine Omnium (ironpineomnium.com).

### Removal

- [ ] **REM-01**: Delete 4 Netlify Functions — strava-auth, strava-callback, submit-result, strava-webhook
- [ ] **REM-02**: Delete /submit page and /submit-confirm page
- [ ] **REM-03**: Delete scoring engine (scoring.js) and test suite (scoring.test.js)
- [ ] **REM-04**: Delete ScoringExplainer component and its import from index.astro
- [ ] **REM-05**: Delete validate-results.mjs script
- [ ] **REM-06**: Delete results athlete data (public/data/results/)

### Replacement

- [ ] **REP-01**: Replace /results page with CTA redirecting to ironpineomnium.com for leaderboard viewing
- [ ] **REP-02**: Update SiteNav — remove Submit link, update Results to point to new CTA page or Omnium link

### Preservation

- [ ] **PRE-01**: Strava segment links on GravelSectors.astro cards remain functional
- [ ] **PRE-02**: Strava segment links on KomSegments.astro cards remain functional
- [ ] **PRE-03**: Site builds and deploys as fully static (no Netlify Functions required)

### Cleanup

- [ ] **CLN-01**: Remove KOM/QOM time display from KomSegments.astro (data source removed)

## Future Requirements

None — single-focus subtraction milestone.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Removing Strava segment links from cards | These are static links to strava.com, not OAuth-dependent |
| Removing annotations.json Strava fields | stravaSegmentId used by card links (PRE-01, PRE-02) |
| Netlify env var cleanup | Manual step in Netlify dashboard, not code |
| Removing /api/* redirect rule in netlify.toml | Harmless no-op, no functions to route to |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REM-01 | — | Pending |
| REM-02 | — | Pending |
| REM-03 | — | Pending |
| REM-04 | — | Pending |
| REM-05 | — | Pending |
| REM-06 | — | Pending |
| REP-01 | — | Pending |
| REP-02 | — | Pending |
| PRE-01 | — | Pending |
| PRE-02 | — | Pending |
| PRE-03 | — | Pending |
| CLN-01 | — | Pending |

**Coverage:**
- v10.0 requirements: 12 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 12

---
*Requirements defined: 2026-04-06*
*Last updated: 2026-04-06 after initial definition*
