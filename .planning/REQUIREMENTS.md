# Requirements: MK Ultra Gravel v6.0

**Defined:** 2026-03-30
**Core Value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.

## v6.0 Requirements

Requirements for UI Polish + Dev Tools milestone. Each maps to roadmap phases.

### Color Consistency

- [ ] **CLR-01**: Extract shared `starColors` module from duplicate definitions in RouteMap, ElevationProfile, and GravelSectors
- [ ] **CLR-02**: Map polylines for 2-star and 3-star sectors use same colors as sector cards
- [ ] **CLR-03**: Elevation profile bands for 2-star and 3-star sectors use same colors as sector cards

### Elevation Profile Labels

- [ ] **ELEV-01**: Each gravel sector displays its name on the elevation profile
- [ ] **ELEV-02**: Each gravel sector displays its star rating on the elevation profile
- [ ] **ELEV-03**: Labels positioned at bottom of chart (below elevation line)
- [ ] **ELEV-04**: Labels staggered to avoid overlap on narrow/adjacent sectors

### Site Navigation

- [ ] **NAV-01**: Fixed header nav visible on all pages
- [ ] **NAV-02**: Nav links to Home, Results, and Submission pages
- [ ] **NAV-03**: Active page visually indicated (build-time, no flash)
- [ ] **NAV-04**: Nav z-index clears grain and Escher overlays

## Future Requirements

Deferred to later milestones.

### Dev Tools

- **TOOL-01**: Local CLI script for entering KOM/QOM times per segment
- **TOOL-02**: Pipeline merges KOM/QOM times from source file into annotations at build

## Out of Scope

| Feature | Reason |
|---------|--------|
| KOM/QOM input tool | Deferred — times not needed until post-event |
| Scroll-based section highlighting | Overengineered for 3-link nav |
| CSS overlay label strip | User chose annotation label approach |
| Mobile hamburger menu | 3 links fit inline at 375px+ |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLR-01 | Phase 33 | Pending |
| CLR-02 | Phase 33 | Pending |
| CLR-03 | Phase 33 | Pending |
| ELEV-01 | Phase 34 | Pending |
| ELEV-02 | Phase 34 | Pending |
| ELEV-03 | Phase 34 | Pending |
| ELEV-04 | Phase 34 | Pending |
| NAV-01 | Phase 35 | Pending |
| NAV-02 | Phase 35 | Pending |
| NAV-03 | Phase 35 | Pending |
| NAV-04 | Phase 35 | Pending |

**Coverage:**
- v6.0 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-30*
*Last updated: 2026-03-30 after roadmap creation*
