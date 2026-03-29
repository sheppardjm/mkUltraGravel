# Requirements: MK Ultra Gravel

**Defined:** 2026-03-28
**Core Value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.

## v3.0 Requirements

Requirements for Escher Identity + Data Fixes + UX Polish milestone.

### Visual Identity

- [x] **VIS-12**: Sector color spectrum uses yellow-to-red gradient for all star ratings (1-5) — no gray tones
- [x] **VIS-13**: KOM segments displayed on elevation profile as dashed chartreuse bands matching map KOM polyline style
- [ ] **VIS-14**: Escher/Penrose tessellation SVG background pattern with subtle CSS transform animation and `prefers-reduced-motion` compliance
- [ ] **VIS-15**: Penrose triangle SVG replaces current "MK" text favicon

### Data Accuracy

- [x] **DATA-06**: Photo map positions verified correct — photos.json regenerated from corrected mile markers if stale

### Map UX

- [ ] **UX-01**: Elevation hover crosshair uses bike icon (L.divIcon with inline SVG) instead of plain circleMarker dot

### Content

- [x] **CONT-05**: All GLRC / Great Lakes Recovery Centers text mentions are clickable links to glrc.org/donate

## Future Requirements

Deferred to later milestones.

### Visual Identity

- **VIS-16**: Billie Helmer sector card photo replacement (pending photo from route owner)
- **VIS-17**: Optional bike icon bearing rotation based on route direction

### Performance

- **PERF-03**: Verify onHover performance on mid-range Android devices

## Out of Scope

| Feature | Reason |
|---------|--------|
| Strava API integration | TOS prohibits displaying other athletes' data to anonymous visitors |
| Animated page transitions | Incompatible with Astro static rendering model |
| Animation libraries (GSAP, Motion) | CSS handles all cases; bundle cost not justified |
| starColors shared module extraction | Three-file duplication is acceptable for 5-line constant |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| VIS-12 | Phase 17 | Complete |
| CONT-05 | Phase 17 | Complete |
| DATA-06 | Phase 18 | Complete |
| VIS-13 | Phase 19 | Complete |
| UX-01 | Phase 20 | Pending |
| VIS-14 | Phase 21 | Pending |
| VIS-15 | Phase 21 | Pending |

**Coverage:**
- v3.0 requirements: 7 total
- Mapped to phases: 7
- Unmapped: 0

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 after v3.0 roadmap created*
