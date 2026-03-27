# Roadmap: MK Ultra Gravel

## Overview

A 10-phase build that starts with the load-bearing data pipeline and ends with a deployed,
audited site ready to convert gravel cyclists into registered participants for June 7, 2026.
The data pipeline feeds everything — map, annotations, photo markers, gallery, static route
cards — so it executes first. The map is the centrepiece feature and gets the second major
slot. Static content sections follow independently. Mobile audit and deployment close the build.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Data Pipeline** — Build-time GPX parser, annotation resolver, photo geo-matcher
- [x] **Phase 2: Scaffold + Design System** — Astro project, Tailwind tokens, dark brutalist identity
- [x] **Phase 3: Map Core** — Leaflet island with GPX polyline, sector/KOM/restock overlays
- [x] **Phase 4: Elevation Profile** — Profile chart integrated alongside the map
- [x] **Phase 5: Photo Map Markers** — Geolocated photo markers with clustering on the map
- [x] **Phase 6: Route Info Sections** — Sector cards, KOM listings, restock listings
- [x] **Phase 7: Hero + Event Info + CTAs** — Above-fold content, event details, donation, GPX download
- [x] **Phase 8: Photo Gallery + Lightbox** — 33-photo grid with full-screen lightbox
- [ ] **Phase 9: Mobile + Performance Audit** — Scroll trap, contrast, animation, Core Web Vitals
- [ ] **Phase 10: Deployment** — Cloudflare Pages, custom domain, live preview

---

## Phase Details

### Phase 1: Data Pipeline

**Goal:** All downstream components have machine-readable data to consume — the GPX track,
sector/KOM/restock annotations resolved to lat/lon, and 33 photos with position assignments.

**Depends on:** Nothing (first phase)

**Requirements:** _(no direct v1 UI requirements — this is the shared foundation that enables
MAP-01 through MAP-07, ROUTE-01, ROUTE-02, ROUTE-03, VIS-01, VIS-02, MAP-06)_

**Success Criteria** (what must be TRUE):
1. `public/data/route-data.json` exists with lat/lon/elevation/mile-marker per trackpoint
2. `public/data/annotations.json` exists with all 6 sectors, 3 KOM segments, and 4 restock points each carrying resolved lat/lon coordinates and correct mile markers
3. `public/data/photos.json` exists with all 33 photos each assigned a lat/lon position (EXIF-derived or manually assigned from mile marker estimate)
4. The raw GPX file is available at a public URL path for download with the correct filename

**Plans:** 5 plans in 3 waves

Plans:
- [x] 01-01-PLAN.md — Init project + GPX parser (wave 1)
- [x] 01-02-PLAN.md — Photo manifest curation with user verification (wave 1)
- [x] 01-03-PLAN.md — Annotation resolver: sectors/KOMs/restocks to lat/lon (wave 2)
- [x] 01-04-PLAN.md — Photo matcher: manifest + route-data to photos.json (wave 2)
- [x] 01-05-PLAN.md — Build pipeline wiring + full validation (wave 3)

---

### Phase 2: Scaffold + Design System

**Goal:** The Astro project exists, the dark brutalist psychedelic identity is encoded as CSS
tokens, and every subsequent component can be styled without rework.

**Depends on:** Nothing (can run in parallel with Phase 1)

**Requirements:** VIS-03, VIS-04, VIS-05

**Success Criteria** (what must be TRUE):
1. `astro dev` starts and serves a base page with no build errors
2. The dark palette (near-black backgrounds, acid-green/blood-red/off-white accents) is defined as CSS custom properties and applied to the base layout
3. A creepy display font (headers) and a monospaced font (body) are loaded with no flash of unstyled text
4. Escher/CIA/surrealist visual motifs — distorted geometry, redacted-document texture, surveillance imagery — are present as design elements visible on the base page
5. Tailwind v4 configured with `@theme` CSS config; cascade layers prevent Leaflet CSS conflicts

**Plans:** 3 plans in 3 waves

Plans:
- [x] 02-01-PLAN.md — Astro 6 + Tailwind v4 init with cascade layers (wave 1)
- [x] 02-02-PLAN.md — Design tokens, fonts, BaseLayout, page scaffold (wave 2)
- [x] 02-03-PLAN.md — Visual motifs: grain overlay, tone images, surrealist elements (wave 3)

---

### Phase 3: Map Core

**Goal:** The map is fully interactive — the GPX route is rendered, all 6 gravel sectors and
3 KOM segments are highlighted as colored overlays, all 4 restock points are marked, and the
map works correctly on mobile without scroll-trapping.

**Depends on:** Phase 1 (route-data.json, annotations.json), Phase 2 (design system)

**Requirements:** MAP-01, MAP-02, MAP-03, MAP-04, MAP-05

**Success Criteria** (what must be TRUE):
1. The full 80-mile GPX route appears as a polyline on the map; the map auto-fits to the route bounds on load
2. All 6 gravel sectors are highlighted as distinct colored segments with star-rating badges visible at reasonable zoom levels (e.g., zoom 10+)
3. All 3 KOM segments are highlighted with a distinct color and show name, gradient, and elevation gain in a popup
4. All 4 restock points appear as map markers that show name and mile marker in a popup
5. On a real mobile device, single-finger scroll moves the page past the map without trapping the user inside it

**Plans:** 4 plans in 4 waves

Plans:
- [x] 03-01-PLAN.md — Install Leaflet, create RouteMap.astro with Carto tiles + GPX polyline + gesture handling (wave 1)
- [x] 03-02-PLAN.md — Add sector/KOM/restock annotation overlays with popups (wave 2)
- [x] 03-03-PLAN.md — Dark-theme popup/control styling + mobile verification (wave 3)
- [x] 03-04-PLAN.md — Gap closure: persistent star-rating badges at sector midpoints (wave 1)

---

### Phase 4: Elevation Profile

**Goal:** An elevation profile chart is displayed alongside (or integrated below) the map,
showing the full 80-mile elevation character at a glance, synchronized with the route.

**Depends on:** Phase 1 (route-data.json with elevation per point), Phase 2 (design system), Phase 3 (map rendered)

**Requirements:** MAP-07

**Success Criteria** (what must be TRUE):
1. The elevation profile is visible on the same screen area as the map (below or beside it — not a separate page or section)
2. The profile accurately represents the 80-mile elevation shape from the GPX data
3. Gravel sector mile-marker ranges are visually indicated on the profile (shaded bands or tick marks)
4. The profile renders correctly at mobile viewport widths without overflow or illegibility

**Plans:** 1 plan in 1 wave

Plans:
- [x] 04-01-PLAN.md — Install Chart.js, create ElevationProfile.astro with sector bands, wire into index.astro (wave 1)

---

### Phase 5: Photo Map Markers

**Goal:** All 33 route photos appear as clickable clustered markers on the map; clicking a
marker shows a thumbnail and opens the full photo.

**Depends on:** Phase 1 (photos.json with lat/lon), Phase 3 (map stable)

**Requirements:** MAP-06

**Success Criteria** (what must be TRUE):
1. All 33 photos are represented as markers on the map at their geo-matched positions
2. Markers cluster at low zoom levels so the map is not crowded with 33 overlapping icons
3. Clicking a marker shows a thumbnail preview and a link/button to view the full-size photo
4. Photo markers do not cause visible pan or zoom jank on mid-range mobile hardware

**Plans:** 2 plans in 2 waves

Plans:
- [x] 05-01-PLAN.md — Install markercluster, copy photos to public/images/, wire 33 photo markers with clustering + thumbnail popups into RouteMap.astro (wave 1)
- [x] 05-02-PLAN.md — Mobile performance verification: cluster/uncluster, tap popups, pan/zoom smoothness on real device (wave 2)

---

### Phase 6: Route Info Sections

**Goal:** Below the map, riders can read structured information about every gravel sector,
KOM segment, and restock point — rendered as styled cards from the annotation data.

**Depends on:** Phase 1 (annotations.json), Phase 2 (design system)

**Requirements:** ROUTE-01, ROUTE-02, ROUTE-03

**Success Criteria** (what must be TRUE):
1. All 6 gravel sectors appear as Paris-Roubaix style cards showing name, mile marker, distance, and star rating (rendered as filled stars, 1-5)
2. All 3 KOM segments appear in a listing showing name, mile marker, distance, gradient percentage, and elevation gain
3. All 4 restock points appear in a listing showing name and mile marker
4. Sector star ratings are visually distinct — a 5-star C4 sector reads as more serious than a 2-star Forest Service Rd at a glance

**Plans:** 2 plans in 2 waves

Plans:
- [x] 06-01-PLAN.md — Build GravelSectors, KomSegments, RestockPoints components + wire into index.astro (wave 1)
- [x] 06-02-PLAN.md — Visual verification of rendered cards at desktop and mobile widths (wave 2)

---

### Phase 7: Hero + Event Info + CTAs

**Goal:** A visitor who lands on the page immediately knows when and where the event is, how
to register, and what the ride costs — and is compelled to click Register before scrolling.

**Depends on:** Phase 2 (design system)

**Requirements:** EVENT-01, EVENT-02, EVENT-03, EVENT-04, MAP-08

**Success Criteria** (what must be TRUE):
1. The event date (June 7, 2026), start location (Marquette Fire Bell), distance (80 miles), and cost (free / $10 suggested donation) are visible above the fold without scrolling on both desktop and mobile
2. A BikeReg registration CTA button appears above the fold AND again below the map section — neither instance requires scrolling past non-CTA content to find it
3. A live countdown timer showing days/hours/minutes to June 7, 2026 is visible on page load
4. The Great Lakes Recovery Centers donation info ($10 suggested) is displayed with enough context to explain the cause
5. A GPX file download link uses the correct filename attribute (`mk-ultra-gravel-2026.gpx`) and is accessible from the page

**Plans:** 3 plans in 2 waves

Plans:
- [x] 07-01-PLAN.md — BaseLayout head slot + CountdownTimer.astro (wave 1)
- [x] 07-02-PLAN.md — EventInfoBlock.astro with donation info + GPX download (wave 1)
- [x] 07-03-PLAN.md — Wire hero, CTAs, countdown, event info into index.astro (wave 2)

---

### Phase 8: Photo Gallery + Lightbox

**Goal:** Riders can browse all 33 route photos in a grid and open any photo full-screen to
feel the character of the terrain before committing to register.

**Depends on:** Phase 1 (photos.json), Phase 2 (design system)

**Requirements:** VIS-01, VIS-02

**Success Criteria** (what must be TRUE):
1. All 33 route photos appear in a CSS grid layout styled to match the dark brutalist design
2. Thumbnail images are optimized (WebP, resized) via Astro image pipeline so the gallery loads without significant delay on a 4G connection
3. Clicking any photo opens a full-screen lightbox viewer with the full-size image
4. The lightbox can be closed with a visible button, the Escape key, and by clicking outside the image

**Plans:** 3 plans in 3 waves

Plans:
- [x] 08-01-PLAN.md — Install sharp, create thumbnail generator, wire into prebuild pipeline, enrich photos.json with dimensions (wave 1)
- [x] 08-02-PLAN.md — Install PhotoSwipe, build PhotoGallery.astro grid + lightbox, wire into index.astro (wave 2)
- [x] 08-03-PLAN.md — Human verification of gallery grid + lightbox on desktop and mobile (wave 3)

---

### Phase 9: Mobile + Performance Audit

**Goal:** The site is confirmed usable on a real mobile device in outdoor conditions — no
scroll traps, readable contrast, no animation jank, acceptable load times.

**Depends on:** All preceding phases (audits complete product)

**Requirements:** PERF-01, PERF-02

**Success Criteria** (what must be TRUE):
1. On a real mobile device, a user can scroll past the map using a single finger without being trapped inside it
2. Every body text / background color combination passes WCAG AA contrast (4.5:1 minimum); every large text / background passes 3:1 minimum
3. All CSS animations use only `transform` and `opacity` — no layout-triggering properties (`top`, `left`, `width`) are animated
4. Largest Contentful Paint (LCP) is under 2.5 seconds on a simulated 4G mobile connection (Chrome DevTools)
5. The site layout is functional and readable at 375px viewport width (iPhone SE baseline)

**Plans:** 4 plans in 3 waves

Plans:
- [ ] 09-01-PLAN.md — WCAG contrast audit: calculate all oklch token pairs, fix failures (wave 1)
- [ ] 09-02-PLAN.md — Hero image WebP conversion + fetchpriority + animation audit confirmation (wave 1)
- [ ] 09-03-PLAN.md — 375px layout audit + real-device mobile scroll/usability verification (wave 2)
- [ ] 09-04-PLAN.md — Lighthouse mobile Core Web Vitals baseline + final fixes (wave 3)

---

### Phase 10: Deployment

**Goal:** The site is live at its production URL, served from Cloudflare Pages, ready to
receive traffic and survive a viral share from the cycling community.

**Depends on:** Phase 9 (audit-clean build)

**Requirements:** _(no direct v1 requirement — enables delivery of all requirements to users)_

**Success Criteria** (what must be TRUE):
1. `astro build` produces a fully static output with no errors or warnings
2. The site is accessible at the production domain with valid HTTPS
3. A Cloudflare Pages project is connected to the git repository — pushing to main triggers an automatic rebuild and deploy
4. The site loads correctly on a real mobile device via the production URL (not localhost)

**Plans:** TBD (2-4 plans estimated)

Plans:
- [ ] 10-01: Create Cloudflare Pages project; connect to git repository; configure build command (`astro build`) and output directory (`dist`)
- [ ] 10-02: Configure custom domain and verify HTTPS certificate
- [ ] 10-03: Smoke test production URL on desktop and mobile — all features functional, no localhost references

---

## Progress

**Execution Order:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

Note: Phases 2 and 1 can run in parallel. Phases 6, 7, and 8 can run in parallel once Phases 1-2 are complete.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Pipeline | 5/5 | Complete | 2026-03-26 |
| 2. Scaffold + Design System | 3/3 | Complete | 2026-03-26 |
| 3. Map Core | 4/4 | Complete | 2026-03-26 |
| 4. Elevation Profile | 1/1 | Complete | 2026-03-26 |
| 5. Photo Map Markers | 2/2 | Complete | 2026-03-27 |
| 6. Route Info Sections | 2/2 | Complete | 2026-03-26 |
| 7. Hero + Event Info + CTAs | 3/3 | Complete | 2026-03-26 |
| 8. Photo Gallery + Lightbox | 3/3 | Complete | 2026-03-27 |
| 9. Mobile + Performance Audit | 0/4 | Not started | - |
| 10. Deployment | 0/3 | Not started | - |
