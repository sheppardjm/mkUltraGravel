# Requirements: MK Ultra Gravel v8.0

**Defined:** 2026-03-31
**Core Value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.

## v8.0 Requirements

Requirements for visual polish + content update milestone.

### Data Pipeline

- [ ] **DATA-07**: MKULTRA.gpx replaces MK_Ultra.gpx as route source with full pipeline re-run
- [ ] **DATA-08**: All downstream artifacts regenerated (route-data.json, annotations.json, photos.json, elevation profile)
- [ ] **DATA-09**: Pipeline validation confirms segment/KOM mile markers correct against new GPX
- [ ] **PHOTO-03**: 19 new route photos added to photo-manifest.js with mile-marker positions
- [ ] **PHOTO-04**: Thumbnails and card crops regenerated for all 74 photos
- [ ] **PHOTO-05**: Card cover photo assignments reviewed after 19-photo expansion

### Gallery

- [ ] **GAL-01**: PhotoGallery.astro refactored to horizontal masonry strip (CSS flexbox, no JS library)
- [ ] **GAL-02**: Fixed-height rows with variable-width images computed from aspect ratios in photos.json
- [ ] **GAL-03**: Horizontal scroll with scroll-snap-type: x proximity for touch/swipe
- [ ] **GAL-04**: Partial-peek scroll indicator showing next image is available
- [ ] **GAL-05**: Width/height attributes on all gallery images to prevent CLS
- [ ] **GAL-06**: PhotoSwipe lightbox still opens from gallery image click

### Decorative — Tone Images

- [ ] **TONE-01**: Tone images placed between major page sections as full-width dividers
- [ ] **TONE-02**: Tone images as card accents inside sector and/or KOM cards
- [ ] **TONE-03**: mix-blend-mode: lighten at opacity ~0.12, with isolation: isolate on card containers
- [ ] **TONE-04**: Reduced-motion: tone images static (no animation) by default

### Decorative — Topographic Dividers

- [ ] **TOPO-01**: TopoDivider.astro component with hollow topographic meatball SVG
- [ ] **TOPO-02**: stroke-dashoffset draw-in animation triggered by IntersectionObserver
- [ ] **TOPO-03**: Reduced-motion gate (static display, no draw-in)
- [ ] **TOPO-04**: Reusable — placed between 2+ sections on index.astro

### Decorative — Lizard Background

- [ ] **LIZD-01**: LizardBackground.astro component with repeating CSS background tile
- [ ] **LIZD-02**: Z-index 9997 (below Escher at 9998, below grain at 9999, below nav at 10000)
- [ ] **LIZD-03**: Subtle opacity calibrated against existing grain + Escher stack
- [ ] **LIZD-04**: Compositor-safe animation (transform/opacity only), TBT 0ms maintained
- [ ] **LIZD-05**: Reduced-motion gate (static tile, no animation)

### Performance

- [ ] **PERF-03**: Lighthouse mobile Performance score ≥ 90 after all additions
- [ ] **PERF-04**: TBT remains 0ms (no JS animation libraries)
- [ ] **PERF-05**: CLS ≤ 0.1 (gallery images sized, no layout shift)

## Future Requirements

Deferred to post-event or future milestones.

- **POST-01**: Real segment matching verified with actual June 7 race activities
- **POST-02**: Multi-athlete concurrent submission load testing
- **POST-03**: KOM/QOM times populated on cards from real race data

## Out of Scope

| Feature | Reason |
|---------|--------|
| JS masonry library (Masonry.js, Isotope) | Kills TBT 0ms; CSS flexbox achieves same result |
| CSS native masonry (grid-template-rows: masonry) | Experimental — Firefox/Safari TP only as of March 2026 |
| Autoplay carousel for gallery | Anti-pattern; user controls scroll |
| Parallax scrolling | Performance risk on mobile; conflicts with existing overlays |
| Video backgrounds | Bandwidth/battery cost; not aligned with brutalist aesthetic |
| Infinite loop on topo dividers | Defeats "subtle" goal; draw-in once is sufficient |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-07 | TBD | Pending |
| DATA-08 | TBD | Pending |
| DATA-09 | TBD | Pending |
| PHOTO-03 | TBD | Pending |
| PHOTO-04 | TBD | Pending |
| PHOTO-05 | TBD | Pending |
| GAL-01 | TBD | Pending |
| GAL-02 | TBD | Pending |
| GAL-03 | TBD | Pending |
| GAL-04 | TBD | Pending |
| GAL-05 | TBD | Pending |
| GAL-06 | TBD | Pending |
| TONE-01 | TBD | Pending |
| TONE-02 | TBD | Pending |
| TONE-03 | TBD | Pending |
| TONE-04 | TBD | Pending |
| TOPO-01 | TBD | Pending |
| TOPO-02 | TBD | Pending |
| TOPO-03 | TBD | Pending |
| TOPO-04 | TBD | Pending |
| LIZD-01 | TBD | Pending |
| LIZD-02 | TBD | Pending |
| LIZD-03 | TBD | Pending |
| LIZD-04 | TBD | Pending |
| LIZD-05 | TBD | Pending |
| PERF-03 | TBD | Pending |
| PERF-04 | TBD | Pending |
| PERF-05 | TBD | Pending |

**Coverage:**
- v8.0 requirements: 25 total
- Mapped to phases: 0 ⚠️
- Unmapped: 25

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after initial definition*
