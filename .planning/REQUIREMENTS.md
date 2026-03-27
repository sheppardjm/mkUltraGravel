# Requirements: MK Ultra Gravel v2.0

**Defined:** 2026-03-27
**Core Value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.

## v2.0 Requirements

### Data Fixes

- [x] **DATA-01**: Segment mile markers corrected in resolve-annotations.js (Down Jeep, Silver Creek, others as needed)
- [x] **DATA-02**: Photo mile-marker positions corrected in photo-manifest.js
- [x] **DATA-03**: Laughing Whitefish River removed from restock points
- [x] **DATA-04**: New photos added to manifest and processed through pipeline (thumbnails, WebP, photos.json)
- [x] **DATA-05**: Route total distance and elevation gain computed and available in route-data.json

### Map-Elevation Interactivity

- [ ] **SYNC-01**: Hovering on elevation chart shows a position marker on the map at the corresponding mile/lat-lon
- [ ] **SYNC-02**: Hovering on the map route polyline highlights the corresponding position on the elevation chart
- [ ] **SYNC-03**: Clicking a sector band in the elevation profile highlights that segment on the map and scrolls/zooms to it
- [ ] **SYNC-04**: Clicking a sector overlay on the map highlights the corresponding band in the elevation profile

### Visual Enhancements

- [x] **VIS-06**: Each sector card displays a representative photo
- [x] **VIS-07**: Each KOM card displays a representative photo
- [x] **VIS-08**: Gallery thumbnails increased from 200px to 400px width with improved WebP quality
- [ ] **VIS-09**: Subtle hover animations on buttons and cards (brutalist-appropriate: hard shifts, not smooth easing)
- [ ] **VIS-10**: Subtle load/entrance animations on sections as they scroll into view
- [ ] **VIS-11**: Click feedback animations on interactive elements

### Content

- [ ] **CONT-01**: MK Ultra name explainer section with CIA program history and redaction-reveal styling
- [ ] **CONT-02**: BikeReg registration URL updated from placeholder to correct URL
- [ ] **CONT-03**: GLRC donation URL updated to correct link
- [ ] **CONT-04**: Route total distance and elevation gain displayed on map section and route description

## Future Requirements

### Strava Integration (deferred)

- **STRAVA-01**: Live KOM/QOM leaderboard from Strava segment data
- **STRAVA-02**: Athlete profile links on leaderboard entries

### Sponsors

- **SPONS-01**: Sponsor/partner logo section with links

## Out of Scope

| Feature | Reason |
|---------|--------|
| Live Strava leaderboard | API endpoint blocked since June 2020; TOS prohibits displaying user data to third parties |
| News/updates section | Abandoned blogs look worse than no blog; update site directly as needed |
| Sponsor section | No sponsors confirmed yet; scaffold when needed |
| Strava segment embeds | Unreliable due to Chrome third-party cookie deprecation |
| Backend / serverless functions | Site stays fully static; no runtime server dependencies |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 11 | Complete |
| DATA-02 | Phase 11 | Complete |
| DATA-03 | Phase 11 | Complete |
| DATA-04 | Phase 11 | Complete |
| DATA-05 | Phase 11 | Complete |
| VIS-06 | Phase 12 | Complete |
| VIS-07 | Phase 12 | Complete |
| VIS-08 | Phase 12 | Complete |
| SYNC-01 | Phase 13 | Pending |
| SYNC-02 | Phase 13 | Pending |
| SYNC-03 | Phase 13 | Pending |
| SYNC-04 | Phase 13 | Pending |
| CONT-01 | Phase 14 | Pending |
| CONT-02 | Phase 14 | Pending |
| CONT-03 | Phase 14 | Pending |
| CONT-04 | Phase 14 | Pending |
| VIS-09 | Phase 15 | Pending |
| VIS-10 | Phase 15 | Pending |
| VIS-11 | Phase 15 | Pending |

**Coverage:**
- v2.0 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-03-27*
*Last updated: 2026-03-27 — traceability mapped to Phases 11-15*
