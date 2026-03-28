# Roadmap: MK Ultra Gravel

## Milestones

- SHIPPED **v1.0 MK Ultra Gravel** — Phases 1-10 (shipped 2026-03-27)
- **v2.0 Interactivity + Polish** — Phases 11-15 (in progress)

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

### v2.0 Interactivity + Polish (In Progress)

**Milestone Goal:** Elevate the site from informational to interactive — correct underlying data, add map-elevation sync, put photos on cards, explain the MK Ultra name, and polish with animations.

#### Phase 11: Data Corrections

**Goal**: All underlying route data is accurate — segment positions, photo locations, restock markers, and route statistics reflect reality.
**Depends on**: Phase 10 (v1.0 deployed baseline)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05
**Success Criteria** (what must be TRUE):
  1. Down Jeep and Silver Creek sectors appear at their correct mile positions on the map and elevation profile
  2. Photo markers on the map match their actual locations on the route (corrected mile positions)
  3. Laughing Whitefish River no longer appears in the restock points list or map markers
  4. New photos are visible in the photo gallery and as map markers after deploy
  5. Route total distance and elevation gain are present in route-data.json (available for all downstream display)
**Plans**: 2 plans

Plans:
- [x] 11-01-PLAN.md — Add 20 new photos to manifest + sync data.md to corrected script values
- [x] 11-02-PLAN.md — Restructure route-data.json with meta wrapper + update all consumers

#### Phase 12: Photo Pipeline + Card Photos + Image Quality

**Goal**: Users see a representative photo on every sector card and every KOM card; gallery thumbnails are sharper and larger.
**Depends on**: Phase 11 (correct photo positions needed for accurate photo-to-sector matching)
**Requirements**: VIS-06, VIS-07, VIS-08
**Success Criteria** (what must be TRUE):
  1. Every gravel sector card displays a photo cropped to the sector's terrain
  2. Every KOM segment card displays a photo representative of that climb
  3. Gallery thumbnails display at 400px width and are visibly sharper than the current 200px versions
  4. No individual thumbnail degrades the page load time beyond an acceptable byte budget increase
**Plans**: 3 plans

Plans:
- [x] 12-01-PLAN.md — Build assign-card-photos.js script + extend annotations.json with coverPhoto field
- [x] 12-02-PLAN.md — Wire coverPhoto into GravelSectors.astro and KomSegments.astro card components
- [x] 12-03-PLAN.md — Upgrade thumbnails to 400px/q80 + wire assign-card-photos.js into pipeline

#### Phase 13: Map-Elevation Interactivity

**Goal**: Hovering and clicking between the map and elevation profile feel connected — moving on one updates the other in real time.
**Depends on**: Phase 11 (correct segment positions needed for accurate highlight mapping)
**Requirements**: SYNC-01, SYNC-02, SYNC-03, SYNC-04
**Success Criteria** (what must be TRUE):
  1. Hovering over any point on the elevation chart causes a crosshair marker to appear on the map at the corresponding GPS location, moving continuously with the cursor
  2. Hovering over a sector polyline on the map highlights the corresponding mileage band in the elevation profile
  3. Clicking a sector band in the elevation profile zooms the map to that segment and highlights its polyline
  4. Clicking a sector polyline on the map highlights the corresponding band in the elevation profile
  5. Lighthouse mobile TBT remains at 0ms after all sync interactions are wired (measured post-implementation)
**Plans**: 2 plans

Plans:
- [x] 13-01-PLAN.md — Elevation-to-map crosshair sync: Chart.js onHover, binary search track lookup, CustomEvent dispatch, Leaflet circleMarker crosshair, rAF throttle
- [x] 13-02-PLAN.md — Map-to-elevation sector sync: sector polyline hover/click events, annotation highlight updates, annotation click-to-zoom, flyToBounds

#### Phase 14: Content

**Goal**: The site explains its name, links correctly to registration and donation, and displays the route's distance and elevation gain.
**Depends on**: Phase 11 (CONT-04 depends on DATA-05 — route stats must be in route-data.json before they can be displayed)
**Requirements**: CONT-01, CONT-02, CONT-03, CONT-04
**Success Criteria** (what must be TRUE):
  1. A new section between event info and the map explains the CIA MK-Ultra program with redaction-reveal styling and at least one real FOIA document reference
  2. Both registration CTAs (hero and below-map) link to the confirmed BikeReg URL (not a placeholder)
  3. The GLRC donation link navigates to the correct Great Lakes Recovery Centers donation page
  4. The map section and route description display the total route distance and elevation gain
**Plans**: 2 plans

Plans:
- [x] 14-01-PLAN.md — Build MkUltraExplainer.astro component with redaction-reveal CSS, CIA history content, FOIA citation, insert between hero and map
- [x] 14-02-PLAN.md — Update BikeReg/GLRC URL constants in both files, add GLRC donation anchor, display route stats from route-data.json

#### Phase 15: Animations

**Goal**: Interactive elements and sections respond to user actions with subtle, brutalist-appropriate motion that enhances the dark aesthetic without degrading performance.
**Depends on**: Phase 13 (animations must not introduce TBT regression; clean Lighthouse baseline measured after interactivity phase before adding motion)
**Requirements**: VIS-09, VIS-10, VIS-11
**Success Criteria** (what must be TRUE):
  1. Hovering a sector card, KOM card, or button produces an immediate hard visual shift (box-shadow or transform snap — no smooth ease-in-out curves)
  2. Card lists and section content fade and slide into view as the user scrolls down the page
  3. Clicking an interactive element (button, card, map marker) produces visible click feedback
  4. All animations are disabled when the user has prefers-reduced-motion enabled
  5. Lighthouse mobile TBT remains at 0ms after all animations are added
**Plans**: TBD

Plans:
- [ ] 15-01: Hover + click animations on buttons and cards (CSS transition utilities, brutalist hard shifts)
- [ ] 15-02: Scroll-reveal entrance animations on sections and card lists (IntersectionObserver + CSS keyframes, prefers-reduced-motion compliance)

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
| 15. Animations | v2.0 | 0/TBD | Not started | - |
