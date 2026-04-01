# Roadmap: MK Ultra Gravel

## Milestones

- ✅ **v1.0 MVP** - Phases 1-10 (shipped 2026-03-27)
- ✅ **v2.0 Interactivity + Polish** - Phases 11-16 (shipped 2026-03-28)
- ✅ **v3.0 Escher Identity + Data Fixes + UX Polish** - Phases 17-21 (shipped 2026-03-29)
- ✅ **v4.0 Route Update + UX Overhaul** - Phases 22-26 (shipped 2026-03-30)
- ✅ **v5.0 Strava Integration + Results** - Phases 27-32 (shipped 2026-03-30)
- ✅ **v6.0 UI Polish + Dev Tools** - Phases 33-35 (shipped 2026-03-30)
- ✅ **v7.0 Strava Go-Live** - Phases 36-40 (shipped 2026-03-31)
- 🚧 **v8.0 Visual Polish + Content** - Phases 41-46 (in progress)

---

<details>
<summary>✅ v7.0 Strava Go-Live (Phases 36-40) — SHIPPED 2026-03-31</summary>

- [x] Phase 36: Environment Configuration (1/1 plans) — completed 2026-03-31
- [x] Phase 37: Data Pipeline Verification (1/1 plans) — completed 2026-03-31
- [x] Phase 38: OAuth Flow Testing (1/1 plans) — completed 2026-03-31
- [x] Phase 39: Webhook Registration (1/1 plans) — completed 2026-03-31
- [x] Phase 40: Strava App Review (1/1 plans) — completed 2026-03-31

See: `.planning/milestones/v7.0-ROADMAP.md`

</details>

---

### 🚧 v8.0 Visual Polish + Content (In Progress)

**Milestone Goal:** Elevate the site's visual texture and photo presentation with six additive features — updated route data, 19 new photos, horizontal masonry gallery, tone image integration, topographic meatball dividers, and animated lizard background — without touching the existing brutalist identity or regressing Lighthouse mobile 96 / TBT 0ms / CLS 0.054 baselines.

#### Phase 41: GPX Route Update + Pipeline Validation

**Goal**: The route data source is replaced and all downstream artifacts verified correct — hero stats, elevation profile, map polyline, sector/KOM coordinates, and photo positions all derive from the new GPX file.
**Depends on**: Phase 40 (v7.0 complete)
**Requirements**: DATA-07, DATA-08, DATA-09
**Success Criteria** (what must be TRUE):
  1. `route-data.json` reports `totalMi` in the range 99–101 miles (new MKULTRA.gpx fully parsed)
  2. Elevation profile and Leaflet map polyline render without gaps or coordinate errors
  3. All sector and KOM mile markers remain correctly positioned — no pipeline clamping warnings in prebuild output
  4. `photos.json` photo positions align with the new route geometry — no "mile marker exceeds route end" warnings
  5. `npm run prebuild` completes cleanly end-to-end on the new GPX file
**Plans**: 1 plan

Plans:
- [x] 41-01: Replace GPX source with MKULTRA.gpx, regenerate pipeline, verify artifacts, remove old GPX

#### Phase 42: Photo Pipeline Expansion

**Goal**: All 74 route photos are processed through the pipeline with correct mile markers, thumbnails, card crops, and cover photo assignments — the gallery and card components have full data before any layout work begins.
**Depends on**: Phase 41 (pipeline clean on new GPX)
**Requirements**: PHOTO-03, PHOTO-04, PHOTO-05
**Success Criteria** (what must be TRUE):
  1. `photos.json` contains exactly 74 entries, each with `width`, `height`, `thumb`, and `src` fields
  2. Thumbnails and card crops for all 74 photos exist in `public/thumbs/` and `public/card-crops/`
  3. Card cover photo assignments have been reviewed after the 19-photo expansion — any undesirable changes are corrected
  4. Prebuild runs cleanly with 74 photos and no unassigned or missing-thumbnail warnings
**Plans**: 1 plan

Plans:
- [x] 42-01: Add 16 photos to manifest and regenerate pipeline artifacts (3 excluded by owner)

#### Phase 43: Horizontal Masonry Gallery

**Goal**: The photo gallery displays all 74 photos in their natural aspect ratios as a horizontally scrollable fixed-height strip — no more fixed-crop vertical grid that damages landscape photos.
**Depends on**: Phase 42 (74 photos with correct dimensions in photos.json)
**Requirements**: GAL-01, GAL-02, GAL-03, GAL-04, GAL-05, GAL-06
**Success Criteria** (what must be TRUE):
  1. Gallery renders as a single horizontally scrollable row where each photo's width reflects its natural aspect ratio
  2. Swiping or scrolling horizontally through the gallery snaps approximately to image boundaries (scroll-snap proximity) without trapping vertical scroll
  3. The right edge of the last visible image is partially cropped, providing a visual affordance that more images exist beyond the viewport
  4. No layout shift occurs as photos load — CLS contribution from the gallery remains below 0.05
  5. Clicking any gallery photo opens the PhotoSwipe full-screen lightbox with swipe navigation unchanged from v7.0
**Plans**: 1 plan

Plans:
- [x] 43-01-PLAN.md — Refactor PhotoGallery.astro to CSS columns masonry grid with scroll-snap

#### Phase 44: Tone Image Integration

**Goal**: Tone images appear as full-width interstitial dividers between major sections and as subtle card accents inside 2-3 sector or KOM cards — the one major section currently without a tone image gains atmospheric texture.
**Depends on**: Phase 41 (pipeline clean; tone image pipeline script uses same prebuild chain)
**Requirements**: TONE-01, TONE-02, TONE-03, TONE-04
**Success Criteria** (what must be TRUE):
  1. At least one tone image appears as a full-width band between the sectors section and an adjacent section
  2. 2-3 sector or KOM cards display a tone image accent at `mix-blend-mode: lighten; opacity ~0.12`
  3. Card hover states and PhotoSwipe lightbox open correctly after tone image CSS is applied (no z-index or stacking context regression)
  4. With `prefers-reduced-motion: reduce` active, all tone images are static — no animation
**Plans**: 1 plan

Plans:
- [x] 44-01-PLAN.md — SVG lizard tessellation on #sectors, card accents on 2 sector + 1 KOM card

#### Phase 45: Topographic Meatball Dividers

**Goal**: Hollow topographic SVG meatballs appear between 2 or more sections, drawing in as the user scrolls — reinforcing the gravel/elevation aesthetic with a subtle animated signature.
**Depends on**: Phase 44 (section containers settled with tone image stacking contexts before inserting dividers)
**Requirements**: TOPO-01, TOPO-02, TOPO-03, TOPO-04
**Success Criteria** (what must be TRUE):
  1. `TopoDivider.astro` component exists and renders a hollow topographic concentric-ring SVG
  2. Scrolling to a divider triggers a stroke-dashoffset draw-in animation — the rings appear to trace themselves into view
  3. The component is placed between at least 2 separate sections on `index.astro`
  4. With `prefers-reduced-motion: reduce` active, dividers display as static SVGs with no draw-in animation
**Plans**: 1 plan

Plans:
- [x] 45-01: Build TopoDivider.astro component and place between sections

#### Phase 46: Lizard Background Animation

**Goal**: A subtly animated lizard tessellation layer sits behind all site content at z-index 9997, extending the existing Escher overlay language with a second motif calibrated to remain imperceptible at first glance — and all Core Web Vitals are verified green with the full v8.0 texture stack active.
**Depends on**: Phase 45 (full v8.0 visual stack assembled for opacity calibration and performance audit)
**Requirements**: LIZD-01, LIZD-02, LIZD-03, LIZD-04, LIZD-05, PERF-03, PERF-04, PERF-05
**Success Criteria** (what must be TRUE):
  1. `LizardBackground.astro` renders a repeating lizard SVG tile as a fixed layer at z-index 9997, below grain (9999) and Escher (9998)
  2. The tile animates with a slow drift using `transform`-only CSS keyframes — no JS, no layout recalculation
  3. With `prefers-reduced-motion: reduce` active, the tile is static
  4. Lighthouse mobile Performance score is 90 or higher with the complete v8.0 visual stack active
  5. Total Blocking Time remains 0ms — no synchronous JS animation, no DOM measurement
  6. CLS is 0.1 or lower — gallery image dimensions prevent layout shift
**Plans**: TBD

Plans:
- [ ] 46-01: Build LizardBackground.astro and run final performance audit

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-10. MVP | v1.0 | 30/30 | Complete | 2026-03-27 |
| 11-16. Interactivity + Polish | v2.0 | 15/15 | Complete | 2026-03-28 |
| 17-21. Escher Identity + Data Fixes | v3.0 | 6/6 | Complete | 2026-03-29 |
| 22-26. Route Update + UX Overhaul | v4.0 | 7/7 | Complete | 2026-03-30 |
| 27-32. Strava Integration + Results | v5.0 | 10/10 | Complete | 2026-03-30 |
| 33-35. UI Polish + Dev Tools | v6.0 | 3/3 | Complete | 2026-03-30 |
| 36-40. Strava Go-Live | v7.0 | 5/5 | Complete | 2026-03-31 |
| 41. GPX Route Update + Pipeline Validation | v8.0 | 1/1 | Complete | 2026-03-31 |
| 42. Photo Pipeline Expansion | v8.0 | 1/1 | Complete | 2026-03-31 |
| 43. Horizontal Masonry Gallery | v8.0 | 1/1 | Complete | 2026-03-31 |
| 44. Tone Image Integration | v8.0 | 1/1 | Complete | 2026-03-31 |
| 45. Topographic Meatball Dividers | v8.0 | 1/1 | Complete | 2026-03-31 |
| 46. Lizard Background Animation | v8.0 | 0/TBD | Not started | - |
