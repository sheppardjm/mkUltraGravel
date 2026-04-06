# Roadmap: MK Ultra Gravel

## Milestones

- ✅ **v1.0 MVP** - Phases 1-10 (shipped 2026-03-22)
- ✅ **v2.0 Content + Sync** - Phases 11-16 (shipped 2026-03-24)
- ✅ **v3.0 Visual Polish** - Phases 17-21 (shipped 2026-03-25)
- ✅ **v4.0 Route Update + UX** - Phases 22-26 (shipped 2026-03-27)
- ✅ **v5.0 Strava Scoring** - Phases 27-32 (shipped 2026-03-28)
- ✅ **v6.0 Color + Nav** - Phases 33-35 (shipped 2026-03-28)
- ✅ **v7.0 Production Hardening** - Phases 36-40 (shipped 2026-03-31)
- ✅ **v8.0 Visual Texture + Content** - Phases 41-46 (shipped 2026-04-02)
- ✅ **v9.0 BAA Sector** - Phase 47 (shipped 2026-04-06)
- 🚧 **v10.0 Strava Decoupling** - Phases 48-49 (in progress)

## Phases

### 🚧 v10.0 Strava Decoupling (In Progress)

**Milestone Goal:** Remove Strava OAuth submission, scoring engine, and results leaderboards from MK Ultra. Replace /results with CTA to Iron & Pine Omnium (ironpineomnium.com). MK Ultra becomes a pure static event site with no Netlify Functions dependency.

- [ ] **Phase 48: Strava Infrastructure Removal** - Delete all Strava OAuth, scoring, submission, and results infrastructure
- [ ] **Phase 49: Results CTA and Nav Update** - Replace /results with ironpineomnium.com CTA, update navigation, verify preserved functionality

## Phase Details

### Phase 48: Strava Infrastructure Removal
**Goal**: All Strava OAuth, scoring, submission, and results code is removed from the codebase
**Depends on**: Nothing (first phase of v10.0)
**Requirements**: REM-01, REM-02, REM-03, REM-04, REM-05, REM-06, CLN-01
**Success Criteria** (what must be TRUE):
  1. No Netlify Functions exist in the repository (netlify/functions/ directory empty or removed)
  2. No /submit or /submit-confirm pages exist (visiting those paths returns 404)
  3. No scoring engine code exists (scoring.js, scoring.test.js, validate-results.mjs all deleted)
  4. No results athlete data exists (public/data/results/ directory removed)
  5. KomSegments.astro no longer displays KOM/QOM time data on cards
**Plans**: TBD

Plans:
- [ ] 48-01: TBD

### Phase 49: Results CTA and Nav Update
**Goal**: Users visiting /results see a styled CTA page directing them to ironpineomnium.com, and site navigation reflects the simplified structure
**Depends on**: Phase 48
**Requirements**: REP-01, REP-02, PRE-01, PRE-02, PRE-03
**Success Criteria** (what must be TRUE):
  1. Visiting /results shows a styled page with clear CTA linking to ironpineomnium.com for leaderboards
  2. SiteNav shows Home and Results links only (no Submit link)
  3. Strava segment links on all 7 gravel sector cards open correct Strava segment pages
  4. Strava segment links on all 3 KOM cards open correct Strava segment pages
  5. Site builds and deploys as fully static with zero Netlify Functions invocations
**Plans**: TBD

Plans:
- [ ] 49-01: TBD

## Progress

**Execution Order:** 48 → 49

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 48. Strava Infrastructure Removal | v10.0 | 0/? | Not started | - |
| 49. Results CTA and Nav Update | v10.0 | 0/? | Not started | - |

---
*Roadmap created: 2026-04-06*
*Last updated: 2026-04-06*
