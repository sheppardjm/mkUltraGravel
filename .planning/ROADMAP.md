# Roadmap: MK Ultra Gravel

## Milestones

- ✅ **v1.0 MVP** - Phases 1-10 (shipped 2026-03-27)
- ✅ **v2.0 Interactivity + Polish** - Phases 11-16 (shipped 2026-03-28)
- ✅ **v3.0 Escher Identity + Data Fixes + UX Polish** - Phases 17-21 (shipped 2026-03-29)
- ✅ **v4.0 Route Update + UX Overhaul** - Phases 22-26 (shipped 2026-03-30)
- ✅ **v5.0 Strava Integration + Results** - Phases 27-32 (shipped 2026-03-30)
- 🚧 **v6.0 UI Polish + Dev Tools** - Phases 33-35 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-10) - SHIPPED 2026-03-27</summary>

Phases 1-10 delivered the complete event website: interactive Leaflet map with GPX polyline, Paris-Roubaix sector ratings, KOM segments, restock markers, clustered photo markers, Chart.js elevation profile, dark brutalist design system, 33-photo gallery with PhotoSwipe, live countdown, registration CTAs, and GPX download.

30 plans completed across 10 phases.

</details>

<details>
<summary>✅ v2.0 Interactivity + Polish (Phases 11-16) - SHIPPED 2026-03-28</summary>

Phases 11-16 delivered bidirectional map-elevation sync, automated photo pipeline, brutalist animations, content additions, and UAT-verified polish.

15 plans completed across 6 phases.

</details>

<details>
<summary>✅ v3.0 Escher Identity + Data Fixes + UX Polish (Phases 17-21) - SHIPPED 2026-03-29</summary>

Phases 17-21 delivered: yellow-to-red sector spectrum, 33 corrected photo positions, KOM bands on elevation chart, bike icon crosshair, Penrose favicon, Escher tessellation background.

6 plans completed across 5 phases.

</details>

<details>
<summary>✅ v4.0 Route Update + UX Overhaul (Phases 22-26) - SHIPPED 2026-03-30</summary>

Phases 22-26 delivered: 100mi GPX replacement with full pipeline re-run, 2 new photos with AVIF support, photo marker thumbnails with PhotoSwipe lightbox, map reset control, enlarged controls, card height parity, Penrose hero animation, Grinduro explainer.

7 plans completed across 5 phases.

</details>

<details>
<summary>✅ v5.0 Strava Integration + Results (Phases 27-32) - SHIPPED 2026-03-30</summary>

Phases 27-32 delivered: Strava segment links on all 9 cards, scoring engine (Gravel Champion + KOM/QOM Champion), Strava OAuth activity submission via 4 Netlify Functions, results page with dual leaderboards and gender tabs, deauthorization webhook for TOS compliance, prebuild pipeline gap closure.

10 plans completed across 6 phases.

</details>

### 🚧 v6.0 UI Polish + Dev Tools (In Progress)

**Milestone Goal:** Fix color inconsistencies across map/chart/cards, label gravel sectors on the elevation profile, and add a site navigation header for wayfinding between pages.

---

### Phase 33: Color Consistency ✅

**Goal**: All star-rating colors are sourced from a single shared module — map polylines, elevation bands, and sector cards show identical colors for every rating.

**Completed**: 2026-03-30

**Requirements**: CLR-01, CLR-02, CLR-03

Plans:
- [x] 33-01: Extract starColors to src/lib/starColors.ts and update all three consumers

---

### Phase 34: Elevation Profile Sector Labels

**Goal**: Every gravel sector on the elevation profile is identified by name and star rating — a user can read the chart and know which sectors are ahead without cross-referencing the sector cards.

**Depends on**: Phase 33 (starColors module must exist before labels import it)

**Requirements**: ELEV-01, ELEV-02, ELEV-03, ELEV-04

**Success Criteria** (what must be TRUE):
  1. Each colored sector band on the elevation profile displays the sector name
  2. Each sector band displays the star rating (e.g., "★★★" or "3-star") alongside or below the name
  3. Labels appear at the bottom of the chart area, below the elevation line, not obscuring the terrain profile
  4. On narrow or adjacent sectors, labels are staggered vertically so no two labels overlap
  5. Labels remain visible at the chart's default rendered size (no clipping at chart edges)

**Plans**: TBD

Plans:
- [ ] 34-01: Add sector label annotations to ElevationProfile.astro with stagger strategy

---

### Phase 35: Site Navigation

**Goal**: Every page on the site has a fixed navigation header — a user can reach Home, Results, and Submission from any page without using the browser back button, and can see at a glance which page they are on.

**Depends on**: Phase 32 (v5.0 complete; independent of Phases 33-34)

**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04

**Success Criteria** (what must be TRUE):
  1. A fixed navigation bar is visible at the top of every page (Home, Results, Submission)
  2. The nav contains links to Home (`/`), Results (`/results`), and Submission (`/submit`) pages
  3. The link for the current page is visually distinguished (active state) on page load with no flash of unstyled content
  4. The nav renders above the grain texture overlay and Escher background on all pages

**Plans**: TBD

Plans:
- [ ] 35-01: Build SiteNav.astro component and integrate into BaseLayout.astro

---

## Progress

**Execution Order:** 33 → 34 → 35

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-10. MVP | v1.0 | 30/30 | Complete | 2026-03-27 |
| 11-16. Interactivity | v2.0 | 15/15 | Complete | 2026-03-28 |
| 17-21. Escher Identity | v3.0 | 6/6 | Complete | 2026-03-29 |
| 22-26. Route Update | v4.0 | 7/7 | Complete | 2026-03-30 |
| 27-32. Strava + Results | v5.0 | 10/10 | Complete | 2026-03-30 |
| 33. Color Consistency | v6.0 | 1/1 | Complete | 2026-03-30 |
| 34. Elevation Labels | v6.0 | 0/TBD | Not started | - |
| 35. Site Navigation | v6.0 | 0/TBD | Not started | - |
