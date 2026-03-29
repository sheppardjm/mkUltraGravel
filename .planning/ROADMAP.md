# Roadmap: MK Ultra Gravel

## Milestones

- SHIPPED **v1.0 MK Ultra Gravel** — Phases 1-10 (shipped 2026-03-27)
- SHIPPED **v2.0 Interactivity + Polish** — Phases 11-16 (shipped 2026-03-28)
- **v3.0 Escher Identity + Data Fixes + UX Polish** — Phases 17-21 (in progress)

## Phases

<details>
<summary>v1.0 MK Ultra Gravel (Phases 1-10) — SHIPPED 2026-03-27</summary>

- [x] Phase 1: Data Pipeline (5/5 plans) — completed 2026-03-26
- [x] Phase 2: Scaffold + Design System (3/3 plans) — completed 2026-03-26
- [x] Phase 3: Map Core (4/4 plans) — completed 2026-03-26
- [x] Phase 4: Elevation Profile (1/1 plan) — completed 2026-03-26
- [x] Phase 5: Photo Map Markers (2/2 plans) — completed 2026-03-27
- [x] Phase 6: Route Info Sections (2/2 plans) — completed 2026-03-26
- [x] Phase 7: Hero + Event Info + CTAs (3/3 plans) — completed 2026-03-26
- [x] Phase 8: Photo Gallery + Lightbox (3/3 plans) — completed 2026-03-27
- [x] Phase 9: Mobile + Performance Audit (4/4 plans) — completed 2026-03-27
- [x] Phase 10: Deployment (3/3 plans) — completed 2026-03-27

Full details: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

<details>
<summary>v2.0 Interactivity + Polish (Phases 11-16) — SHIPPED 2026-03-28</summary>

- [x] Phase 11: Data Corrections (2/2 plans) — completed 2026-03-27
- [x] Phase 12: Photo Pipeline + Card Photos (3/3 plans) — completed 2026-03-27
- [x] Phase 13: Map-Elevation Interactivity (2/2 plans) — completed 2026-03-27
- [x] Phase 14: Content (2/2 plans) — completed 2026-03-27
- [x] Phase 15: Animations (2/2 plans) — completed 2026-03-28
- [x] Phase 16: v2.0 UAT Fixes (4/4 plans) — completed 2026-03-28

Full details: [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md)

</details>

### v3.0 Escher Identity + Data Fixes + UX Polish (Phases 17-21)

**Milestone Goal:** Refine visual identity (sector color spectrum, Escher background, Penrose favicon), fix photo map positions, and polish UX (bike crosshair, KOM on elevation chart, GLRC links) — all within the existing stack, zero new dependencies, TBT 0ms maintained.

#### Phase 17: Sector Colors + GLRC Links

**Goal:** The map, elevation chart, and sector cards all display a consistent yellow-to-red difficulty spectrum, and every GLRC mention is a live link to the donation page.
**Depends on:** Nothing (first v3.0 phase)
**Requirements:** VIS-12, CONT-05
**Research flag:** skip-research — all integration points confirmed with line numbers
**Success Criteria** (what must be TRUE):
  1. Sector star ratings 1-5 render in a perceptually distinct yellow-to-red spectrum with no gray tones visible on map polylines, elevation chart bands, or sector card stars
  2. A 3-star sector's polyline color, elevation band color, and card star color are identical — confirming all three `starColors` constants were updated together
  3. Every occurrence of "GLRC" and "Great Lakes Recovery Centers" in the page is a clickable anchor that opens glrc.org/donate
**Plans:** 1 plan (coordinated multi-file commit: RouteMap.astro + ElevationProfile.astro + GravelSectors.astro + EventInfoBlock.astro + index.astro)

Plans:
- [x] 17-01: Sector color recolor (3 files) + GLRC link additions (2 files)

#### Phase 18: Photo Position Verification

**Goal:** Photo markers on the map are confirmed to be at correct mile positions, with photos.json regenerated if any mismatch is found.
**Depends on:** Nothing (independent verification)
**Requirements:** DATA-06
**Research flag:** skip-research — verification command confirmed (`node scripts/match-photos.js`), DATA-06 likely already resolved
**Success Criteria** (what must be TRUE):
  1. Running `node scripts/match-photos.js` produces no mismatch warnings between photo-manifest.js and photos.json
  2. All 54 photo entries in photos.json have mile values that match their intended positions from photo-manifest.js
  3. Clicking a photo marker on the map opens a photo that is visually consistent with the terrain at that map location
**Plans:** 1 plan (verification script run + diff check + conditional regeneration)

Plans:
- [x] 18-01: Verify photos.json against photo-manifest.js; regenerate if stale

#### Phase 19: KOM Segments on Elevation Profile

**Goal:** KOM segment bands appear on the elevation chart in chartreuse, matching the existing KOM polyline style on the map.
**Depends on:** Phase 17 (colors established for visual reference during review)
**Requirements:** VIS-13
**Research flag:** skip-research — chartjs-plugin-annotation 3.1.0 box annotations confirmed; `startMi`/`lengthMi` fields confirmed in annotations.json
**Success Criteria** (what must be TRUE):
  1. KOM segments appear as distinct chartreuse bands on the elevation chart, visually distinguishable from the colored sector bands
  2. KOM bands render beneath the elevation dataset line (using `drawTime: 'beforeDatasetsDraw'`) with no opacity stacking artifacts where KOM and sector regions overlap
  3. A user can identify where the named climbs fall on the elevation curve without referring to the map
**Plans:** 1 plan (ElevationProfile.astro annotation additions only)

Plans:
- [ ] 19-01: Add KOM box annotations to elevation chart

#### Phase 20: Bike Icon Crosshair

**Goal:** The elevation hover crosshair on the map is a bike SVG icon instead of a plain dot.
**Depends on:** Phase 19 (both modify ElevationProfile.astro; sequence prevents merge conflicts)
**Requirements:** UX-01
**Research flag:** skip-research — Leaflet L.divIcon + setOpacity() API confirmed; Lucide bicycle icon path confirmed as source
**Success Criteria** (what must be TRUE):
  1. Hovering over the elevation chart displays a bike icon on the map route at the corresponding position instead of a plain circle
  2. The bike icon appears and disappears cleanly — no ghost marker or CSS flicker — when the cursor enters and exits the chart
  3. The icon is correctly centered on the route point at zoom levels 8, 12, and 16 (no anchor drift)
**Plans:** 1 plan (RouteMap.astro L.circleMarker → L.divIcon replacement + show/hide API update)

Plans:
- [ ] 20-01: Replace elevation crosshair circleMarker with bike divIcon

#### Phase 21: Escher Background + Penrose Favicon

**Goal:** The page has a subtle animated Escher tessellation background and the favicon is a Penrose triangle SVG replacing the "MK" text placeholder.
**Depends on:** Phases 17-20 complete (placed last — highest iteration cost and only TBT risk in milestone)
**Requirements:** VIS-14, VIS-15
**Research flag:** needs-research — SVG tile geometry must be authored; isometric cube path data vs. Penrose tile geometry decision requires visual iteration
**Success Criteria** (what must be TRUE):
  1. The page background shows a repeating Escher-style tessellation pattern (isometric cubes or Penrose-derived tile) visible against the dark background without obscuring content
  2. The pattern has a slow CSS transform drift animation (40-60s cycle) that is gated behind `prefers-reduced-motion: no-preference` — users with reduced-motion preference see the static pattern only
  3. A Lighthouse mobile trace with 4x CPU throttle shows TBT 0ms — no "Paint" events caused by the animation
  4. The browser tab favicon displays a Penrose triangle SVG instead of the "MK" text placeholder
**Plans:** 2 plans (background pattern is a separate iteration from favicon — favicon is a single file replacement; background requires authoring + TBT gate)

Plans:
- [ ] 21-01: Penrose triangle favicon (public/favicon.svg replacement)
- [ ] 21-02: Escher animated background pattern (global.css + index.astro)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Data Pipeline | v1.0 | 5/5 | Complete | 2026-03-26 |
| 2. Scaffold + Design System | v1.0 | 3/3 | Complete | 2026-03-26 |
| 3. Map Core | v1.0 | 4/4 | Complete | 2026-03-26 |
| 4. Elevation Profile | v1.0 | 1/1 | Complete | 2026-03-26 |
| 5. Photo Map Markers | v1.0 | 2/2 | Complete | 2026-03-27 |
| 6. Route Info Sections | v1.0 | 2/2 | Complete | 2026-03-26 |
| 7. Hero + Event Info + CTAs | v1.0 | 3/3 | Complete | 2026-03-26 |
| 8. Photo Gallery + Lightbox | v1.0 | 3/3 | Complete | 2026-03-27 |
| 9. Mobile + Performance Audit | v1.0 | 4/4 | Complete | 2026-03-27 |
| 10. Deployment | v1.0 | 3/3 | Complete | 2026-03-27 |
| 11. Data Corrections | v2.0 | 2/2 | Complete | 2026-03-27 |
| 12. Photo Pipeline + Card Photos | v2.0 | 3/3 | Complete | 2026-03-27 |
| 13. Map-Elevation Interactivity | v2.0 | 2/2 | Complete | 2026-03-27 |
| 14. Content | v2.0 | 2/2 | Complete | 2026-03-27 |
| 15. Animations | v2.0 | 2/2 | Complete | 2026-03-28 |
| 16. v2.0 UAT Fixes | v2.0 | 4/4 | Complete | 2026-03-28 |
| 17. Sector Colors + GLRC Links | v3.0 | 1/1 | Complete | 2026-03-28 |
| 18. Photo Position Verification | v3.0 | 1/1 | Complete | 2026-03-29 |
| 19. KOM Segments on Elevation | v3.0 | 0/1 | Not started | - |
| 20. Bike Icon Crosshair | v3.0 | 0/1 | Not started | - |
| 21. Escher Background + Favicon | v3.0 | 0/2 | Not started | - |
