# Requirements: MK Ultra Gravel

**Defined:** 2026-03-29
**Core Value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.

## v4.0 Requirements

Requirements for v4.0 — Route Update + UX Overhaul. Each maps to roadmap phases.

### Route Data

- [ ] **ROUTE-04**: 100mi GPX replaces 80mi GPX and pipeline regenerates all data (route-data.json, annotations.json, photos.json)
- [ ] **ROUTE-05**: All "80 mile" / "80-mile" references updated to 100 miles across site content
- [ ] **ROUTE-06**: Sector and KOM mile markers verified correct against new 100mi track

### Photos

- [ ] **PHOTO-01**: Down Jeep photo added to manifest, processed through pipeline, visible on map and in gallery
- [ ] **PHOTO-02**: Billie Helmer B&W photo added to manifest, processed through pipeline, visible on map and in gallery

### Map UX

- [ ] **MAP-09**: Reset button below map returns map to default bounds and clears all active state (highlights, crosshair, popups, elevation bands)
- [ ] **MAP-10**: Map zoom controls enlarged to 44x44px minimum touch targets
- [ ] **MAP-11**: Photo markers on map display larger thumbnails
- [ ] **MAP-12**: Clicking a photo marker opens PhotoSwipe lightbox at that photo with swipe navigation through all route photos

### Layout

- [ ] **LAYOUT-01**: Gravel sector cards resized to match KOM segment cards in both height and width
- [ ] **LAYOUT-02**: Penrose triangle SVG displayed above page title with subtle CSS animation

### Content

- [ ] **CONT-06**: Grinduro-style format explainer added above sector cards — describes timed gravel sectors, KOM/QOM segments, and that the rest of the route is challenging but untimed

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
| ROUTE-04 | — | Pending |
| ROUTE-05 | — | Pending |
| ROUTE-06 | — | Pending |
| PHOTO-01 | — | Pending |
| PHOTO-02 | — | Pending |
| MAP-09 | — | Pending |
| MAP-10 | — | Pending |
| MAP-11 | — | Pending |
| MAP-12 | — | Pending |
| LAYOUT-01 | — | Pending |
| LAYOUT-02 | — | Pending |
| CONT-06 | — | Pending |

**Coverage:**
- v4.0 requirements: 12 total
- Mapped to phases: 0
- Unmapped: 12 ⚠️

---
*Requirements defined: 2026-03-29*
*Last updated: 2026-03-29 after initial definition*
