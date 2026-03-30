# Requirements: MK Ultra Gravel

**Defined:** 2026-03-29
**Core Value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.

## v4.0 Requirements

Requirements for v4.0 — Route Update + UX Overhaul. Each maps to roadmap phases.

### Route Data

- [x] **ROUTE-04**: 100mi GPX replaces 80mi GPX and pipeline regenerates all data (route-data.json, annotations.json, photos.json)
- [x] **ROUTE-05**: All "80 mile" / "80-mile" references updated to 100 miles across site content
- [x] **ROUTE-06**: Sector and KOM mile markers verified correct against new 100mi track

### Photos

- [x] **PHOTO-01**: Down Jeep photo added to manifest, processed through pipeline, visible on map and in gallery
- [x] **PHOTO-02**: Billie Helmer B&W photo added to manifest, processed through pipeline, visible on map and in gallery

### Map UX

- [x] **MAP-09**: Reset button below map returns map to default bounds and clears all active state (highlights, crosshair, popups, elevation bands)
- [x] **MAP-10**: Map zoom controls enlarged to 44x44px minimum touch targets
- [ ] **MAP-11**: Photo markers on map display larger thumbnails
- [ ] **MAP-12**: Clicking a photo marker opens PhotoSwipe lightbox at that photo with swipe navigation through all route photos

### Layout

- [x] **LAYOUT-01**: Gravel sector cards resized to match KOM segment cards in both height and width
- [x] **LAYOUT-02**: Penrose triangle SVG displayed above page title with subtle CSS animation

### Content

- [x] **CONT-06**: Grinduro-style format explainer added above sector cards — describes timed gravel sectors, KOM/QOM segments, and that the rest of the route is challenging but untimed

## Future Requirements

Deferred to later milestones.

- **PERF-03**: Verify onHover performance on mid-range Android devices
- **DATA-07**: Replace Down Jeep KOM fallback photo when better in-range photo available

## Out of Scope

| Feature | Reason |
|---------|--------|
| Bearing-aligned bike icon rotation | MEDIUM complexity; optional enhancement for future milestone |
| KOM-to-sector hover sync | Cross-component event wiring; second-pass feature |
| starColors shared module extraction | Correct architecture move but not required; tech debt |
| Social meta tags / Open Graph | Not requested for this milestone |
| Strava integration | TOS prohibits; permanently excluded |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ROUTE-04 | Phase 22 | Complete |
| ROUTE-05 | Phase 22 | Complete |
| ROUTE-06 | Phase 22 | Complete |
| PHOTO-01 | Phase 23 | Complete |
| PHOTO-02 | Phase 23 | Complete |
| MAP-09 | Phase 25 | Complete |
| MAP-10 | Phase 24 | Complete |
| MAP-11 | Phase 26 | Pending |
| MAP-12 | Phase 26 | Pending |
| LAYOUT-01 | Phase 24 | Complete |
| LAYOUT-02 | Phase 24 | Complete |
| CONT-06 | Phase 24 | Complete |

**Coverage:**
- v4.0 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0

---
*Requirements defined: 2026-03-29*
*Last updated: 2026-03-29 after Phase 25 completion*
