# Requirements: MK Ultra Gravel v8.0

**Defined:** 2026-03-31
**Core Value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.

## v8.0 Requirements

Requirements for visual polish + content update milestone.

### Data Pipeline

- [x] **DATA-07**: MKULTRA.gpx replaces MK_Ultra.gpx as route source with full pipeline re-run
- [x] **DATA-08**: All downstream artifacts regenerated (route-data.json, annotations.json, photos.json, elevation profile)
- [x] **DATA-09**: Pipeline validation confirms segment/KOM mile markers correct against new GPX
- [x] **PHOTO-03**: 16 new route photos added to photo-manifest.js with mile-marker positions (3 excluded by owner)
- [x] **PHOTO-04**: Thumbnails and card crops regenerated for all 71 photos
- [x] **PHOTO-05**: Card cover photo assignments reviewed after 16-photo expansion (all 9 unchanged)

### Gallery

- [x] **GAL-01**: PhotoGallery.astro refactored to CSS columns masonry grid (no JS library)
- [x] **GAL-02**: Variable-height items with aspect-ratio placeholders computed from photos.json
- [x] **GAL-03**: Max-height constrained container with horizontal scroll overflow
- [x] **GAL-04**: Aspect-ratio placeholders prevent empty space during lazy loading
- [x] **GAL-05**: Width/height attributes on all gallery images to prevent CLS
- [x] **GAL-06**: PhotoSwipe lightbox still opens from gallery image click

### Decorative — Tone Images

- [x] **TONE-01**: Tone images placed between major page sections as full-width dividers
- [x] **TONE-02**: Tone images as card accents inside sector and/or KOM cards
- [x] **TONE-03**: mix-blend-mode: lighten at opacity ~0.12, with isolation: isolate on card containers
- [x] **TONE-04**: Reduced-motion: tone images static (no animation) by default

### Decorative — Topographic Dividers

- [x] **TOPO-01**: TopoDivider.astro component with hollow topographic meatball SVG
- [x] **TOPO-02**: Canvas metaball animation with IntersectionObserver (upgraded from stroke-dashoffset)
- [x] **TOPO-03**: Reduced-motion gate (static display, no animation)
- [x] **TOPO-04**: Reusable — placed between 2+ sections on index.astro

### Decorative — Lizard Background

- [x] **LIZD-01**: LizardBackground.astro component with repeating CSS background tile
- [x] **LIZD-02**: Z-index 9997 (below Escher at 9998, below grain at 9999, below nav at 10000)
- [x] **LIZD-03**: Subtle opacity calibrated against existing grain + Escher stack
- [x] **LIZD-04**: Compositor-safe animation (transform/opacity only), TBT 0ms maintained
- [x] **LIZD-05**: Reduced-motion gate (static tile, no animation)

### Performance

- [x] **PERF-03**: Lighthouse mobile Performance score ≥ 90 after all additions
- [x] **PERF-04**: TBT remains 0ms (no JS animation libraries)
- [x] **PERF-05**: CLS ≤ 0.1 (gallery images sized, no layout shift)

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
| DATA-07 | Phase 41 | Complete |
| DATA-08 | Phase 41 | Complete |
| DATA-09 | Phase 41 | Complete |
| PHOTO-03 | Phase 42 | Complete |
| PHOTO-04 | Phase 42 | Complete |
| PHOTO-05 | Phase 42 | Complete |
| GAL-01 | Phase 43 | Complete |
| GAL-02 | Phase 43 | Complete |
| GAL-03 | Phase 43 | Complete |
| GAL-04 | Phase 43 | Complete |
| GAL-05 | Phase 43 | Complete |
| GAL-06 | Phase 43 | Complete |
| TONE-01 | Phase 44 | Complete |
| TONE-02 | Phase 44 | Complete |
| TONE-03 | Phase 44 | Complete |
| TONE-04 | Phase 44 | Complete |
| TOPO-01 | Phase 45 | Complete |
| TOPO-02 | Phase 45 | Complete |
| TOPO-03 | Phase 45 | Complete |
| TOPO-04 | Phase 45 | Complete |
| LIZD-01 | Phase 46 | Complete |
| LIZD-02 | Phase 46 | Complete |
| LIZD-03 | Phase 46 | Complete |
| LIZD-04 | Phase 46 | Complete |
| LIZD-05 | Phase 46 | Complete |
| PERF-03 | Phase 46 | Complete |
| PERF-04 | Phase 46 | Complete |
| PERF-05 | Phase 46 | Complete |

**Coverage:**
- v8.0 requirements: 25 total
- Mapped to phases: 25 ✓
- Unmapped: 0

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after v8.0 roadmap creation*
