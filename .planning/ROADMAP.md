# Roadmap: MK Ultra Gravel

## Milestones

- ✅ **v1.0 MVP** - Phases 1-10 (shipped 2026-03-27)
- ✅ **v2.0 Interactivity + Polish** - Phases 11-16 (shipped 2026-03-28)
- ✅ **v3.0 Escher Identity + Data Fixes + UX Polish** - Phases 17-21 (shipped 2026-03-29)
- ✅ **v4.0 Route Update + UX Overhaul** - Phases 22-26 (shipped 2026-03-30)
- ✅ **v5.0 Strava Integration + Results** - Phases 27-32 (shipped 2026-03-30)
- ✅ **v6.0 UI Polish + Dev Tools** - Phases 33-35 (shipped 2026-03-30)
- ✅ **v7.0 Strava Go-Live** - Phases 36-40 (shipped 2026-03-31)
- ✅ **v8.0 Visual Polish + Content** - Phases 41-46 (shipped 2026-04-01)
- 🚧 **v9.0 New Sector Addition** - Phase 47 (in progress)

---

<details>
<summary>✅ v7.0 Strava Go-Live (Phases 36-40) — SHIPPED 2026-03-31</summary>

- [x] Phase 36: Environment Configuration (1/1 plans) — completed 2026-03-31
- [x] Phase 37: Data Pipeline Verification (1/1 plans) — completed 2026-03-31
- [x] Phase 38: OAuth Flow Testing (1/1 plans) — completed 2026-03-31
- [x] Phase 39: Webhook Registration (1/1 plans) — completed 2026-03-31
- [x] Phase 40: Strava App Review (1/1 plans) — completed 2026-03-31

See: `.planning/milestones/v7.0-ROADMAP.md`

</details>

<details>
<summary>✅ v8.0 Visual Polish + Content (Phases 41-46) — SHIPPED 2026-04-01</summary>

- [x] Phase 41: GPX Route Update + Pipeline Validation (1/1 plans) — completed 2026-03-31
- [x] Phase 42: Photo Pipeline Expansion (1/1 plans) — completed 2026-03-31
- [x] Phase 43: Horizontal Masonry Gallery (1/1 plans) — completed 2026-03-31
- [x] Phase 44: Tone Image Integration (1/1 plans) — completed 2026-03-31
- [x] Phase 45: Topographic Meatball Dividers (1/1 plans) — completed 2026-03-31
- [x] Phase 46: Lizard Background Animation (1/1 plans) — completed 2026-04-01

See: `.planning/milestones/v8.0-ROADMAP.md`

</details>

---

### 🚧 v9.0 New Sector Addition (In Progress)

**Milestone Goal:** Add BAA gravel sector (Strava segment 41159670, 2-star, mile 12.9) to every surface where existing sectors appear -- map, elevation profile, sector card, and scoring engine.

#### Phase 47: BAA Sector Integration
**Goal**: BAA gravel sector is fully integrated across the site -- visible on map, elevation profile, sector cards, and scoring engine -- indistinguishable from the 6 existing sectors
**Depends on**: Nothing (self-contained addition to existing pipeline)
**Requirements**: SECT-01, SECT-02, SECT-03, SECT-04, SECT-05, SECT-06
**Success Criteria** (what must be TRUE):
  1. BAA appears as a colored polyline on the interactive map at mile 12.9 with 2-star color coding matching the existing yellow-to-red spectrum
  2. BAA appears as a labeled band on the elevation profile with matching 2-star color, sector name, and star rating
  3. BAA sector card renders with pipeline-assigned cover photo, 2-star rating display, and clickable Strava link showing segment distance and average grade
  4. Gravel Champion scoring engine counts 7 required sectors (up from 6) and BAA segment effort contributes to cumulative time scoring
**Plans**: TBD

Plans:
- [ ] 47-01: TBD

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-10. MVP | v1.0 | 30/30 | Complete | 2026-03-27 |
| 11-16. Interactivity + Polish | v2.0 | 15/15 | Complete | 2026-03-28 |
| 17-21. Escher Identity + Data Fixes | v3.0 | 6/6 | Complete | 2026-03-29 |
| 22-26. Route Update + UX Overhaul | v4.0 | 7/7 | Complete | 2026-03-30 |
| 27-32. Strava Integration + Results | v5.0 | 10/10 | Complete | 2026-03-30 |
| 33-35. UI Polish + Dev Tools | v6.0 | 3/3 | Complete | 2026-03-30 |
| 36-40. Strava Go-Live | v7.0 | 5/5 | Complete | 2026-03-31 |
| 41-46. Visual Polish + Content | v8.0 | 6/6 | Complete | 2026-04-01 |
| 47. BAA Sector Integration | v9.0 | 0/1 | Not started | - |
