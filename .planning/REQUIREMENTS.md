# Requirements: MK Ultra Gravel

**Defined:** 2026-03-26
**Core Value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Map & Route

- [x] **MAP-01**: User can view the full 80-mile route on an interactive map
- [x] **MAP-02**: GPX track is rendered as a polyline on the map
- [x] **MAP-03**: Gravel sectors are highlighted as distinct colored segments on the map with star ratings
- [x] **MAP-04**: KOM segments are highlighted on the map with gradient/elevation info
- [x] **MAP-05**: Restock points are displayed as markers on the map
- [x] **MAP-06**: Geo-located photos are displayed as clickable markers on the map
- [x] **MAP-07**: Elevation profile is displayed alongside the map, synchronized with the route
- [ ] **MAP-08**: User can download the GPX file

### Route Information

- [ ] **ROUTE-01**: Gravel sectors displayed as Paris-Roubaix style cards with name, mile marker, distance, and star rating (1-5)
- [ ] **ROUTE-02**: KOM segments displayed with name, mile marker, distance, gradient percentage, and elevation gain
- [ ] **ROUTE-03**: Restock points displayed with name and mile marker

### Event Information

- [ ] **EVENT-01**: Event date (June 7, 2026), start time, and start location (Marquette Fire Bell) are prominently displayed
- [ ] **EVENT-02**: Donation information for Great Lakes Recovery Centers is displayed with suggested $10 amount
- [ ] **EVENT-03**: BikeReg registration CTA is prominent and appears multiple times on the page (above fold and below map)
- [ ] **EVENT-04**: Live countdown timer to June 7, 2026

### Visual & Gallery

- [ ] **VIS-01**: Photo gallery displays route photos in a grid layout
- [ ] **VIS-02**: Lightbox viewer opens photos full-size when clicked
- [x] **VIS-03**: Dark brutalist psychedelic design aesthetic throughout the site
- [x] **VIS-04**: Creepy display font for headers, monospaced font for body text
- [x] **VIS-05**: Escher/CIA/surrealist visual elements integrated into design using tone reference images

### Performance & Mobile

- [ ] **PERF-01**: Site is responsive and usable on mobile devices
- [ ] **PERF-02**: Map handles touch gestures correctly without scroll-trapping on mobile

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Interactivity

- **INT-01**: Clicking a sector card scrolls/highlights that sector on the map
- **INT-02**: Map hover shows elevation at cursor position
- **INT-03**: Animated route fly-through on page load

### Social

- **SOC-01**: Social media sharing meta tags with route preview image
- **SOC-02**: Links to relevant Strava club or Facebook group

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Registration system | Handled by BikeReg — site just links to it |
| User accounts / login | Zero value for a static single-event site |
| Results / timing / leaderboard | This is not a race |
| Blog / news feed | Abandoned blogs look worse than no blog; use social media |
| Email list signup | Single event, high obligation (GDPR/CAN-SPAM), low return |
| Merchandise / shop | Not the site's purpose, adds payment complexity |
| Multiple distance options | The event is one distance: 80 miles |
| Strava live segment embeds | API rate limits make live embeds brittle; link instead |
| Weather widget | Irrelevant before event day |
| Mobile app | Web-first, this is a static site |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MAP-01 | Phase 3 | Complete |
| MAP-02 | Phase 3 | Complete |
| MAP-03 | Phase 3 | Complete |
| MAP-04 | Phase 3 | Complete |
| MAP-05 | Phase 3 | Complete |
| MAP-06 | Phase 5 | Complete |
| MAP-07 | Phase 4 | Complete |
| MAP-08 | Phase 7 | Pending |
| ROUTE-01 | Phase 6 | Pending |
| ROUTE-02 | Phase 6 | Pending |
| ROUTE-03 | Phase 6 | Pending |
| EVENT-01 | Phase 7 | Pending |
| EVENT-02 | Phase 7 | Pending |
| EVENT-03 | Phase 7 | Pending |
| EVENT-04 | Phase 7 | Pending |
| VIS-01 | Phase 8 | Pending |
| VIS-02 | Phase 8 | Pending |
| VIS-03 | Phase 2 | Complete |
| VIS-04 | Phase 2 | Complete |
| VIS-05 | Phase 2 | Complete |
| PERF-01 | Phase 9 | Pending |
| PERF-02 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

---
*Requirements defined: 2026-03-26*
*Last updated: 2026-03-26 after roadmap creation — traceability complete*
