# Milestone v4.0: Route Update + UX Overhaul

**Status:** In Progress
**Phases:** 22-26
**Total Plans:** TBD

## Overview

Update the route from 80mi to 100mi (cascading through the entire data pipeline), add two new photos, then deliver five UX improvements ranging from CSS quick wins to a PhotoSwipe-Leaflet integration -- all within the existing stack with zero new dependencies.

## Phases

- [x] **Phase 22: GPX Route Replacement** - Replace 80mi GPX with 100mi, re-run pipeline, verify all data
- [x] **Phase 23: New Photos** - Process Down Jeep + Billie Helmer B&W through pipeline
- [x] **Phase 24: CSS + Layout + Content** - Zoom controls, card sizing, Penrose hero, Grinduro explainer
- [ ] **Phase 25: Map Reset** - Reset button restores map + elevation chart to default state
- [ ] **Phase 26: Photo Lightbox from Map** - Larger thumbnails + PhotoSwipe lightbox from map markers

## Phase Details

### Phase 22: GPX Route Replacement
**Goal**: The site displays the correct 100-mile route with all sectors, KOMs, restocks, and photos resolved to accurate positions on the new track.
**Depends on**: Nothing (first v4.0 phase). BLOCKED until new GPX file arrives from Strava.
**Requirements**: ROUTE-04, ROUTE-05, ROUTE-06
**Research flag**: Yes -- annotation position impact cannot be predicted until GPX file arrives.
**Success Criteria** (what must be TRUE):
  1. Map displays a ~100mi route polyline (not the old 80mi track)
  2. All 6 sector overlays and 3 KOM overlays land on correct road segments at zoom 14+
  3. Elevation profile x-axis spans the full route distance (no clipping)
  4. Every "80 mile" / "80-mile" text reference across the site reads "100 miles" or "100-mile"
  5. GPX download link serves the new 100mi file
**Plans**: 1 plan

Plans:
- [x] 22-01-PLAN.md -- Swap GPX source, regenerate pipeline, fix display rounding, verify route

### Phase 23: New Photos
**Goal**: Two new photos (Down Jeep + Billie Helmer B&W) are fully integrated -- visible on the map, in the gallery, and assigned to cards where applicable.
**Depends on**: Phase 22 (photos must be positioned against the 100mi route geometry)
**Requirements**: PHOTO-01, PHOTO-02
**Success Criteria** (what must be TRUE):
  1. Down Jeep photo appears as a map marker at the correct mile position and displays in the gallery
  2. Billie Helmer B&W photo appears as a map marker at the correct mile position and displays in the gallery
  3. Gallery shows 55 photos total (up from 53)
  4. Card cover photo assignments are correct (Down Jeep photo fills the coverage gap at mi 83-84 if in range)
**Plans**: 1 plan

Plans:
- [x] 23-01-PLAN.md -- Add AVIF support, manifest entries, and run pipeline for Down Jeep + Billie Helmer photos

### Phase 24: CSS + Layout + Content
**Goal**: Four independent visual and content improvements ship together -- larger touch-friendly zoom controls, equalized card sizes, Penrose triangle branding in the hero, and a Grinduro format explainer for first-time visitors.
**Depends on**: Nothing (parallel-safe, no data dependencies on Phase 22/23)
**Requirements**: MAP-10, LAYOUT-01, LAYOUT-02, CONT-06
**Success Criteria** (what must be TRUE):
  1. Map zoom +/- buttons are at least 44x44px and easily tappable on mobile
  2. Gravel sector cards and KOM segment cards have matching dimensions (height and width)
  3. A Penrose triangle SVG is visible above the page title with a subtle CSS animation
  4. A Grinduro-style format explainer appears above the sector cards, describing timed sectors, KOM/QOM segments, and untimed connecting route
**Plans**: 2 plans

Plans:
- [x] 24-01-PLAN.md -- Zoom control 44px touch targets (MAP-10) + card height equalization (LAYOUT-01)
- [x] 24-02-PLAN.md -- Penrose triangle hero SVG (LAYOUT-02) + Grinduro format explainer (CONT-06)

### Phase 25: Map Reset
**Goal**: Users can return the map and elevation chart to their default state with a single click, clearing all highlights, popups, and zoom changes.
**Depends on**: Phase 22 (reset needs correct default bounds from new route data to verify)
**Requirements**: MAP-09
**Research flag**: No -- pure extension of the established CustomEvent bus pattern.
**Success Criteria** (what must be TRUE):
  1. A reset button is visible below the map
  2. Clicking reset returns the map to its original zoom/bounds (same as initial page load)
  3. Clicking reset clears all active state: sector/KOM highlights, elevation band highlights, crosshair position, open popups
**Plans**: TBD

Plans:
- [ ] 25-01: TBD

### Phase 26: Photo Lightbox from Map
**Goal**: Clicking a photo marker on the map opens a full-screen PhotoSwipe lightbox instead of opening a new browser tab, with swipe navigation through all route photos.
**Depends on**: Phase 23 (photos.json must include all 55 photos with width/height data)
**Requirements**: MAP-11, MAP-12
**Research flag**: Yes -- PhotoSwipe programmatic API pattern needs validation during planning.
**Success Criteria** (what must be TRUE):
  1. Photo markers on the map display larger thumbnail images (not small icons)
  2. Clicking a photo marker opens PhotoSwipe lightbox showing that photo full-screen
  3. User can swipe/arrow through all route photos from within the lightbox
  4. Closing the lightbox returns to the map without navigation or state loss
**Plans**: TBD

Plans:
- [ ] 26-01: TBD

---

## Progress

**Execution Order:** 22 -> 23 -> 24 -> 25 -> 26
(Phase 24 is parallel-safe and can execute alongside 22 or 23 if desired)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 22. GPX Route Replacement | v4.0 | 1/1 | ✓ Complete | 2026-03-29 |
| 23. New Photos | v4.0 | 1/1 | ✓ Complete | 2026-03-29 |
| 24. CSS + Layout + Content | v4.0 | 2/2 | ✓ Complete | 2026-03-30 |
| 25. Map Reset | v4.0 | 0/TBD | Not started | - |
| 26. Photo Lightbox from Map | v4.0 | 0/TBD | Not started | - |

---

_For current project status, see .planning/PROJECT.md_
