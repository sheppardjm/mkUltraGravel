# Project Research Summary

**Project:** MK Ultra Gravel — v8.0 Visual Polish + Content
**Domain:** High-performance event website — visual texture and photo presentation layer
**Researched:** 2026-03-31
**Confidence:** HIGH

## Executive Summary

v8.0 is a visual polish milestone that adds six surface-area features to a site already scoring Lighthouse mobile 96, TBT 0ms, CLS 0.054. The defining constraint is that every feature must layer on top of an existing texture stack (fixed Escher tessellation at 0.05 opacity, film grain at 0.06) without tipping the site from "subtle and atmospheric" to "distracting." Research confirmed that all six features — horizontal masonry gallery, lizard background animation, topographic meatball dividers, tone image expansion, 19 new route photos, and GPX replacement — can be implemented with zero new npm dependencies. The existing Astro 6 / Tailwind v4 / sharp / PhotoSwipe stack handles everything.

The recommended approach is CSS-first with a hard rule against JS masonry libraries or JS animation libraries. The horizontal gallery (the highest-impact feature) is best implemented as a CSS flexbox fixed-height horizontal strip where each image's display width derives from its natural aspect ratio — this achieves zero CLS (the existing `photos.json` already has `width`/`height` per photo), zero TBT (no JS layout calculations), and keeps PhotoSwipe lightbox wiring completely unchanged. Animations for the lizard background use `transform`-only CSS keyframes, which are compositor-safe and leave the 0ms TBT baseline untouched.

The single highest-risk element is the GPX replacement, not for its own complexity but because replacing the route file cascades through five downstream pipeline consumers (`parse-gpx.js` → `route-data.json` → `annotations.json` + `photos.json` → Leaflet map + elevation chart + hero stats). The risk is silent coordinate drift: photo mile markers and sector/KOM positions valid on the old route geometry may silently shift on the new one without pipeline errors. This must be the first phase of v8.0, run in isolation and verified against expected outputs before any visual work begins.

---

## Key Findings

### Recommended Stack

No new dependencies are needed for v8.0. The entire milestone builds on the existing stack. All "needs a library" questions resolve to CSS or tiny inline patterns.

The masonry gallery resolves to CSS flexbox (`display: flex; overflow-x: auto; height: 300px`) with per-image inline `aspect-ratio` set from `photos.json` data already available at Astro build time. The lizard background and topographic dividers resolve to Astro components with inline SVG and `@keyframes` CSS — the same pattern already used for the Escher overlay. The tone image expansion uses the existing `.tone-image` CSS class and `convert-tone-images.js` pipeline script with array entries added for new images.

**Core technologies — all existing:**
- **Astro 6** — component shells for `LizardBackground.astro` and `TopoDivider.astro`; build-time data access for gallery photo dimensions
- **Tailwind v4** — scroll container utilities; spacing for divider placement
- **CSS flexbox + scroll-snap** — horizontal masonry layout; zero JS, zero TBT impact
- **CSS keyframes (`transform` only)** — lizard drift animation; compositor-safe, gated behind `prefers-reduced-motion: no-preference`
- **sharp 0.34.5** — existing thumbnail pipeline; handles 19 new photos without code changes
- **PhotoSwipe 5.4.4** — existing lightbox; `PhotoGallery.astro` changes to layout only, not to lightbox wiring

**Explicitly rejected:**
Masonry.js (8 years old, absolute-position layout, causes CLS + TBT regression), GSAP (JS animation, adds TBT), Swiper.js (40KB carousel library), CSS native masonry (`grid-template-rows: masonry` is flag-only in all stable browsers as of March 2026).

### Expected Features

All six features have clear, well-researched implementation paths. Priority order by impact-to-effort ratio:

**Must have (table stakes — blocks v8.0 milestone):**
- GPX replacement with pipeline verification — data accuracy prerequisite; hero stats show wrong mileage without it
- 19 new route photos (55 → 74) — prerequisite for horizontal masonry (needs updated `photos.json`)
- Horizontal masonry gallery — highest visual impact; the vertical fixed-crop grid actively damages landscape photos
- Tone images in sectors section + card accents — existing class, proven placement pattern; `section#sectors` is the only major section without a tone image

**Should have (differentiators):**
- Topographic meatball dividers (2–3 placements) — strong thematic fit with gravel/elevation aesthetic; scroll-triggered draw-in distinguishes it from static decoration
- Lizard background animation (section-scoped at `opacity: 0.03–0.05`) — extends the existing Escher tessellation language into a specific section

**Can defer post-v8.0 if constrained:**
- Lizard background — the Escher tessellation already exists page-wide; a second tessellation in one section risks stacking opacity; calibration may require iteration
- Divider draw-in animation — static dividers deliver most of the visual value; animated draw-in is a differentiator, not table stakes

**Anti-features (confirmed, do not build):**
- Autoplay gallery, arrow navigation, dot pagination for 74 photos, any JS carousel library
- Global `position: fixed` for lizard background (third fixed texture layer exceeds subtlety threshold)
- Opacity above 0.06 for lizard; above 0.16 for card tone accents
- Tone image on every sector card (select 2–3 maximum)
- `scroll-snap-type: x mandatory` (traps scroll; use `x proximity` instead)

### Architecture Approach

v8.0 changes are additive and well-isolated. The page structure (`BaseLayout` → body fixed overlays → `main` sections) is unchanged. Two new Astro components are created (`LizardBackground.astro`, `TopoDivider.astro`), one existing component is modified (`PhotoGallery.astro` layout only), and two pipeline scripts get array entries added (`convert-tone-images.js`, `photo-manifest.js`).

The z-index stack after v8.0:

```
10000  SiteNav (fixed)
 9999  grain-overlay (fixed)
 9998  escher-overlay (fixed, will-change: transform)
 9997  LizardBackground [NEW] (fixed, transform-only animation, no will-change)
    —  Section content (relative z-10 local stacking contexts)
```

All three global overlays are `pointer-events: none`. All animations are `transform`/`opacity` only — compositor thread, TBT remains 0ms.

**Major components:**
1. **`LizardBackground.astro`** — new; fixed animated tessellation; added to `BaseLayout.astro` body before `<slot />`; no props, no script block
2. **`TopoDivider.astro`** — new; reusable inline SVG section divider; placed between sections in `index.astro`; no JS, accepts optional `class` prop
3. **`PhotoGallery.astro`** — modified; CSS grid replaced with flex horizontal strip; `aspect-ratio` inline styles set from `photos.json` `width`/`height`; PhotoSwipe wiring and `data-pswp-*` attributes unchanged

**Pipeline architecture note:** `convert-tone-images.js` currently reads from AND writes to `public/tone/`, but the 32 source images live in `images/tone/`. Recommended fix: update the script's `srcDir` to `images/tone/` so source of truth is consistent. This is an architecture cleanup, not a blocker.

### Critical Pitfalls

1. **Masonry gallery without explicit image dimensions causes CLS regression** — Pass `photo.width` and `photo.height` from `photos.json` as `width`/`height` HTML attributes on every `<img>` in the gallery. These values exist in the data; they are currently unused in the template. Without them, the masonry container has zero height on first paint and shifts layout as images load. CLS must stay below 0.1 (currently 0.054).

2. **GPX replacement cascades silently through five downstream consumers** — Run `npm run prebuild` in isolation immediately after GPX swap. Check `route-data.json` `meta.totalMi` against expected ~100mi. Scan `match-photos.js` output for ANY "mile marker exceeds route end" warnings. Visually verify photo markers at route start, middle, and end on the Leaflet map. Do not proceed to visual phases until this passes.

3. **JS masonry library destroys TBT** — Do not use Masonry.js, Macy.js, Isotope, or any library that measures DOM element heights post-render. All require synchronous reflow + absolute-position assignment for 74 items — expect 100–300ms TBT regression from the current 0ms baseline. Use CSS flexbox fixed-height rows; widths are pre-calculated at Astro build time.

4. **`mix-blend-mode` on tone images creates stacking contexts that break card interactivity** — Add `isolation: isolate` to section and card containers that receive tone images. Without it, `mix-blend-mode: lighten` on an absolutely-positioned tone image can interfere with hover states and PhotoSwipe lightbox z-ordering. Test by clicking a gallery item after adding tone images to any section.

5. **Animated lizard background with `will-change` on too many elements degrades mobile scroll** — The existing `escher-overlay` already has `will-change: transform`. Do NOT add `will-change` to `LizardBackground`. Use `animation` with `transform` only; the browser promotes the layer only when needed. Target: DevTools Layers panel shows 3 or fewer simultaneously active layers. Test on CPU-throttled Chrome DevTools profile (4x slowdown) before shipping.

---

## Implications for Roadmap

Based on combined research, the natural phase structure has one strict ordering dependency (GPX first) and four largely independent phases.

### Phase 1: GPX + Route Data Validation
**Rationale:** The GPX file is the root data source for the entire route display — hero stats, elevation profile, Leaflet map, sector/KOM positions, and photo geo-matching all derive from it. The project MEMORY notes the route was extended to 100mi but the updated GPX has not been verified. Any route data drift discovered after visual phases are built would require rebuilding against new coordinates. This must be isolated and verified first.
**Delivers:** Verified `route-data.json` with `totalMi ≈ 100`, clean `annotations.json` sector/KOM coordinates, zero pipeline clamping warnings
**Addresses:** Feature 6 (GPX replacement)
**Avoids:** Pitfall 3 (silent downstream cascade), the open MEMORY flag ("awaiting updated GPX from Strava before Phase 1 verification can pass")
**Research flag:** No additional research needed — pipeline chain fully documented in ARCHITECTURE.md

### Phase 2: Photo Pipeline Expansion (55 → 74 Photos)
**Rationale:** Adding photos to `images/` and updating `photo-manifest.js` is a data pipeline operation. It must complete before the horizontal masonry gallery is built because the gallery's flex layout depends on `photos.json` having all 74 entries with correct `width`/`height`. Running this phase early also surfaces any card cover photo reassignments that need visual review.
**Delivers:** 74 entries in `photos.json` with thumbnails; card cover photo reassignment diff for review; `photo-manifest.js` updated
**Addresses:** Feature 5 (19 new route photos)
**Avoids:** Pitfall 8 (thumbnail audit, card cover photo diff after `assign-card-photos.js` reruns)
**Research flag:** No additional research needed — pipeline is idempotent and fully documented

### Phase 3: Horizontal Masonry Gallery
**Rationale:** Highest visual impact of all v8.0 features. Self-contained to `PhotoGallery.astro` — no pipeline changes, no new components. Depends on Phases 1 and 2 completing so all 74 photos with correct dimensions are in `photos.json`.
**Delivers:** Horizontal fixed-height photo strip replacing the fixed-crop vertical grid; aspect-ratio-correct display for all 74 photos; PhotoSwipe lightbox unchanged
**Addresses:** Feature 1 (horizontal masonry gallery)
**Avoids:** Pitfall 1 (CLS — pass `width`/`height` attributes), Pitfall 2 (TBT — no JS masonry library), Pitfall 11 (touch scroll capture — add `touch-action: pan-y`)
**Stack:** CSS flexbox + `scroll-snap-type: x proximity`, inline `aspect-ratio` from build-time data
**Research flag:** No additional research needed — implementation pattern fully specified in STACK.md and PITFALLS.md

### Phase 4: Tone Image Expansion
**Rationale:** Low-risk, additive. Extends the established `.tone-image` pattern to the one major section currently without it (`#sectors`) and adds card-corner accents to 2–3 selected cards. Pipeline config change (`convert-tone-images.js` array) plus template HTML only.
**Delivers:** Tone image in `section#sectors`; 1 interstitial tone band; 2–3 card accents in `GravelSectors.astro` or `KomSegments.astro`
**Addresses:** Feature 4 (tone image integration)
**Avoids:** Pitfall 4 (LCP — all new images use `loading="lazy"`), Pitfall 7 (`mix-blend-mode` stacking context — add `isolation: isolate` to card containers)
**Research flag:** No additional research needed — placement patterns and anti-patterns fully documented in FEATURES.md

### Phase 5: Topographic Meatball Dividers
**Rationale:** Zero dependencies on other phases. Purely additive: new `TopoDivider.astro` component inserted between existing sections in `index.astro`. No pipeline changes. The scroll-triggered draw-in reuses the existing IntersectionObserver pattern from `index.astro`.
**Delivers:** 2–3 topographic SVG section dividers with scroll-triggered stroke-dashoffset draw-in animation; `aria-hidden="true"` decorative elements
**Addresses:** Feature 3 (topographic meatball dividers)
**Avoids:** Pitfall 9 (missing `aria-hidden`), Pitfall 10 (reduced-motion gate on new animation)
**Research flag:** SVG path data must be extracted from codepen.io/hollandblumer/pen/RNGLjNQ by opening in a browser — not fetchable programmatically (403 on non-browser requests). The component shell and CSS animation pattern are fully specified; only SVG paths require manual extraction during implementation.

### Phase 6: Lizard Background Animation
**Rationale:** Lowest priority in v8.0. The Escher tessellation already exists page-wide. A second tessellation risks pushing the texture stack past the "subtle" threshold. Implementing this last allows opacity calibration against all other v8.0 changes already visible. If calibration proves difficult, this phase can slip to v8.1 without affecting any other feature.
**Delivers:** `LizardBackground.astro` as fixed layer at z-index 9997; `transform`-only 70s drift animation at `opacity: 0.04`
**Addresses:** Feature 2 (lizard background animation)
**Avoids:** Pitfall 5 (compositor layer budget — no `will-change`), Pitfall 6 (CodePen dark-background color adjustment), Pitfall 10 (reduced-motion gate), Pitfall 12 (`will-change` audit with all three overlay layers active)
**Research flag:** SVG tile must be extracted from codepen.io/andybarefoot/pen/MEbORa in a browser. Colors must be adjusted from CodePen's assumed light background to the site's `oklch(0.10)` dark background. The `position: fixed` vs. `position: absolute` (section-scoped) decision should be revisited at implementation time — both options are specified in research; calibrate with full v8.0 texture stack visible.

### Phase Ordering Rationale

- **GPX first:** Route data is the root dependency for hero stats, map, elevation, photo positions, and sector/KOM coordinates. Changing it after visual phases risks rebuilding against corrected geometry.
- **Photos before gallery:** The masonry gallery's flex widths derive from `photos.json` `width`/`height`. Building the gallery against 55 photos and later adding 19 more requires re-testing the layout.
- **Tone images before dividers/animation:** Tone images modify section containers (adding `isolation: isolate`, verifying `overflow: hidden`). Settling that work before inserting dividers between sections reduces unexpected stacking context interactions.
- **Animation last:** Calibrating the lizard background opacity against the complete v8.0 texture stack (Escher + grain + new tone images + new interstitial band) is more accurate than calibrating against the v7.0 baseline. Also allows `will-change` audit across all three animated overlays simultaneously.

### Research Flags

Phases needing manual asset extraction during implementation (not further research-phase):
- **Phase 5 (Topo Dividers):** SVG path data requires opening codepen.io/hollandblumer/pen/RNGLjNQ in a browser to copy source. Component shell is fully specified.
- **Phase 6 (Lizard Background):** SVG tile requires opening codepen.io/andybarefoot/pen/MEbORa in a browser. Colors require adjustment for dark background. Fixed vs. section-scoped placement decision requires visual evaluation.

Phases with standard well-documented patterns (no research-phase needed):
- **Phase 1 (GPX):** Pure pipeline operation; scripts fully understood from codebase inspection.
- **Phase 2 (Photos):** Idempotent pipeline; add manifest entries, run, verify count and thumbnails.
- **Phase 3 (Gallery):** CSS flexbox + scroll-snap; pattern fully specified in STACK.md and PITFALLS.md.
- **Phase 4 (Tone Images):** Established `.tone-image` pattern extended to new placements.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All conclusions from official MDN docs, web.dev, sharp changelog, and direct codebase inspection. Zero new dependencies confirmed across all six features. |
| Features | HIGH | All six features researched with table stakes, differentiators, and anti-features documented. Priority order is opinionated and sourced. |
| Architecture | HIGH | Based entirely on direct codebase inspection. All component files, pipeline scripts, z-index values, and data schemas verified against actual source. |
| Pitfalls | HIGH | Critical pitfalls sourced from web.dev official documentation and direct codebase inspection. Two moderate pitfalls (CodePen adaptation issues, `will-change` layer budget) rated MEDIUM — consistent across community sources but no single authoritative reference. |

**Overall confidence:** HIGH

### Gaps to Address

- **Lizard background opacity calibration:** Research specifies the constraint range (0.03–0.05 to stay below subtlety threshold with existing overlays) but the exact value must be calibrated visually during Phase 6 with all other v8.0 textures active.

- **Topo divider SVG geometry:** The exact `d` path data for topographic-feeling concentric rings must be authored or extracted from the CodePen. Research specifies irregular ring spacing mimicking real topography and `fill: none; stroke: currentColor` technique; the actual SVG paths are authored during Phase 5 implementation.

- **CodePen fetch restriction:** Both referenced CodePens (andybarefoot/MEbORa for lizard, hollandblumer/RNGLjNQ for topo) return 403 to non-browser HTTP fetches. SVG content was not directly verified in research; component shells and integration patterns are fully specified, but SVG paths require manual extraction in a browser during implementation.

- **Lizard background scope — fixed vs. section-scoped:** FEATURES.md recommends `position: absolute` scoped to `#sectors` to avoid a third global fixed texture layer. ARCHITECTURE.md shows `position: fixed` at z-index 9997 for implementation simplicity. Resolve visually during Phase 6 with full v8.0 stack visible.

- **Thumbnail width optimization:** PITFALLS.md notes the current 400px thumbnail width may exceed what a 300px-height masonry row needs, wasting ~40% bandwidth on portrait images. Evaluate during Phase 3; reducing to 300px is an optional optimization that requires a one-line change in `generate-thumbnails.js`.

---

## Sources

### Primary (HIGH confidence)
- [MDN CSS Masonry Layout](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Masonry_layout) — native masonry is experimental and flag-only; not production viable
- [Chrome for Developers — Brick by brick: CSS Masonry](https://developer.chrome.com/blog/masonry-update) — Chrome 140+ still behind flag
- [web.dev — High-performance CSS animations](https://web.dev/articles/animations-guide) — `transform`/`opacity` only for compositor safety; `will-change` has layer budget costs
- [web.dev — Optimize CLS](https://web.dev/articles/optimize-cls) — images without `width`/`height` attributes as primary CLS cause
- [web.dev — LCP lazy loading](https://web.dev/articles/lcp-lazy-loading) — above-fold lazy loading causes 500ms+ regression
- [MDN — mix-blend-mode](https://developer.mozilla.org/en-US/docs/Web/CSS/mix-blend-mode) — confirmed "Creates stacking context: yes"
- [MDN — scroll-snap-type](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scroll-snap-type) — `x proximity` vs `x mandatory` behavior
- [sharp changelog v0.34.5](https://sharp.pixelplumbing.com/changelog/v0.34.5/) — no breaking API changes in 0.34.x
- [WCAG 2.3.3](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html) — reduced-motion requirements for continuous animations
- Direct codebase inspection (`global.css`, `PhotoGallery.astro`, `BaseLayout.astro`, `index.astro`, all pipeline scripts) — z-index stack, tone-image class, pipeline execution order, `photos.json` schema

### Secondary (MEDIUM confidence)
- [Andy Barefoot — Masonry Style Layout with CSS Grid (Medium)](https://medium.com/@andybarefoot/a-masonry-style-layout-using-css-grid-8c663d355ebb) — JS row-span technique is vertical-column masonry only; confirmed not suited for horizontal strip
- [Chrome for Developers — Hardware-accelerated animations](https://developer.chrome.com/blog/hardware-accelerated-animations) — `clip-path` not fully compositor-safe in Firefox (24.5% CPU increase)
- [UX Collective — Best Practices for Horizontal Lists in Mobile](https://uxdesign.cc/best-practices-for-horizontal-lists-in-mobile-21480b9b73e5) — right-edge peek affordance pattern
- [LogRocket — How to Animate SVG with CSS](https://blog.logrocket.com/how-to-animate-svg-css-tutorial-examples/) — stroke-dashoffset draw-in animation technique
- [Motion.dev — Web Animation Performance Tier List](https://motion.dev/magazine/web-animation-performance-tier-list) — mobile GPU layer budget concern
- [npm masonry-layout](https://www.npmjs.com/package/masonry-layout) — version 4.2.2, 8 years since last publish

### Not directly accessible (CodePen returns 403 to non-browser fetches)
- codepen.io/andybarefoot/pen/MEbORa — lizard tessellation source; SVG paths require manual extraction in browser during Phase 6
- codepen.io/hollandblumer/pen/RNGLjNQ — topographic divider source; SVG paths require manual extraction in browser during Phase 5

---

*Research completed: 2026-03-31*
*Ready for roadmap: yes*
