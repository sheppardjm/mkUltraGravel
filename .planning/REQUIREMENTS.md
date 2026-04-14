# Requirements: MK Ultra Gravel v10.6

**Defined:** 2026-04-13
**Core Value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.

## v10.6 Requirements

### Elevation Profile

- [x] **ELEV-09**: Down Jeep sector label rendered horizontally without clipping on the elevation profile

### Explainer Layout

- [x] **EDIT-01**: GrinduroExplainer uses CSS Grid full-bleed layout with tone images breaking up the three paragraphs
- [x] **EDIT-02**: Tone images from `images/tone/` rendered with heavy CSS filters (grayscale, contrast, blur, brightness) obscuring originals
- [x] **EDIT-03**: Each tone image uses a distinct filter recipe (duotone, posterize, high-contrast, etc.)
- [x] **EDIT-04**: Mix-blend-mode compositing correct on dark background with existing overlay layers

### Explainer Typography

- [x] **EDIT-05**: Drop cap on opening paragraph using `::first-letter`
- [x] **EDIT-06**: Pull quote styling on key phrases with magazine-style emphasis

### Explainer Animation

- [x] **EDIT-07**: Scroll-reveal entrance animations on images and text blocks (matching existing site pattern)

## Future Requirements

None deferred — tight milestone scope.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Parallax scrolling on tone images | Vestibular accessibility risk + compounds with existing 3-layer animated overlays |
| Image carousel/slider | Anti-pattern for editorial layout; static breaks are more magazine-authentic |
| Sharp preprocessing of tone images | CSS-only filtering sufficient at low opacity; processing overhead not justified |
| New JS animation library (GSAP, etc.) | Existing scroll-reveal pattern uses CSS; TBT 0ms target |
| Mobile label threshold adjustment | Down Jeep fix targets desktop; mobile suppression (< 640px) is existing behavior |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ELEV-09 | Phase 60 | Complete |
| EDIT-01 | Phase 61 | Complete |
| EDIT-02 | Phase 61 | Complete |
| EDIT-03 | Phase 61 | Complete |
| EDIT-04 | Phase 61 | Complete |
| EDIT-05 | Phase 61 | Complete |
| EDIT-06 | Phase 61 | Complete |
| EDIT-07 | Phase 61 | Complete |

**Coverage:**
- v10.6 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-13*
*Last updated: 2026-04-13 after Phase 61 completion*
