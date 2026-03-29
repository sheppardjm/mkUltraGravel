# Project Research Summary

**Project:** MK Ultra Gravel -- v4.0 Route Update + UX Overhaul
**Domain:** Static gravel cycling event website (Astro 6 + Leaflet + Chart.js + PhotoSwipe)
**Researched:** 2026-03-29
**Confidence:** HIGH

---

## Executive Summary

MK Ultra Gravel v4.0 is a maintenance-and-polish milestone on top of a mature, shipped v3.0 codebase (2,703 LOC). The milestone delivers two categories of work: (1) a foundational GPX route replacement from 80mi to 100mi that cascades through the entire data pipeline, and (2) seven UI/UX improvements ranging from trivial CSS changes to a medium-complexity PhotoSwipe-Leaflet integration. The dominant finding across all four research areas is that **zero new npm dependencies are required** -- every feature is achievable with existing APIs (Leaflet `L.Control.extend`, PhotoSwipe `loadAndOpen`, CSS overrides, static Astro components). The existing stack is complete and well-suited for all v4.0 work.

The recommended approach is pipeline-first: swap the GPX file, re-run the prebuild pipeline, and verify all annotation/photo positions before touching any UI code. The GPX replacement is the only feature with a cascading data dependency -- every map overlay, photo marker, elevation profile, and card cover photo resolves against the route track data. Getting this wrong silently corrupts the entire site without build errors. After the pipeline is verified, the remaining features are independent and can be built in parallel or any order, with the photo-lightbox integration being the only one requiring careful architectural attention (bridging RouteMap and PhotoSwipe via programmatic API).

The key risk is the GPX replacement itself. Two GPX files already exist in the repo with confusingly similar names (`MK Ultra.gpx` with space vs `MK_Ultra.gpx` with underscore), the pipeline hardcodes the space-variant filename, and every annotation mile marker was calibrated to the old route geometry. The new GPX file is also an external dependency still awaiting delivery from Strava. All other features carry low risk -- they follow established codebase patterns (CustomEvent bus, CSS `!important` overrides on Leaflet controls, static Astro components, compositor-safe CSS animations).

---

## Key Findings

### Recommended Stack

No stack changes. The existing dependency set handles all v4.0 features without additions.

**Core technologies (unchanged):**
- **Astro 6.1.1:** SSR + static build -- new GrinduroExplainer component follows existing MkUltraExplainer pattern
- **Leaflet 1.9.4:** `L.Control.extend()` for reset button, CSS overrides for zoom sizing, `.on('click')` for photo lightbox trigger
- **PhotoSwipe 5.4.4:** `loadAndOpen(index, dataSource)` API for programmatic lightbox from map markers -- no DOM gallery required
- **Chart.js 4.5.1:** Existing annotation plugin handles elevation band reset via `chart.update('none')`
- **sharp 0.34.5 + exifr 7.1.3:** Pipeline processes new photos automatically -- drop-in, zero code changes
- **Tailwind v4:** All new UI uses existing design tokens (`classified-border`, `stamp`, `text-text-body`, oklch colors)

**Total new packages: 0. Total bundle size change: 0 bytes. TBT impact: 0ms.**

### Expected Features

**Must have (table stakes):**
- GPX route replacement to 100mi with full pipeline re-verification -- route accuracy is existential for an event site
- Photo lightbox from map markers (replace new-tab behavior) -- current new-tab UX is a regression
- Map reset button -- no way to recover from zoom/pan is broken UX
- Grinduro format explainer -- riders will not understand the timed-sector format without explanation
- Larger zoom controls (44px touch targets) -- WCAG accessibility, mobile cycling audience
- Card layout equalization -- visual consistency between sector and KOM cards
- Two new photos through pipeline -- fresh content for updated route

**Should have (differentiators):**
- Animated `flyToBounds` on map reset (smooth transition vs jarring snap)
- Cross-component reset via CustomEvent (map AND elevation chart reset together)
- Penrose triangle above title with compositor-safe animation (brand identity)
- Voice-matched Grinduro explainer copy (brutalist tone, not generic marketing)

**Defer (v5+):**
- Bidirectional map-gallery photo sync (state management overhead, overengineered for 55 photos)
- Camera icon markers (scope creep vs thumbnail markers specified in milestone)
- CSS subgrid for cross-column card alignment (overkill when cards are in separate grid cells)

### Architecture Approach

The v3.0 architecture is clean and extensible. Components communicate via a window-level CustomEvent bus with AbortController cleanup. The prebuild pipeline (8 sequential steps) cascades from GPX source through route data, annotations, photos, thumbnails, and card assignments. v4.0 adds exactly one new CustomEvent (`map:reset`), one new Astro component (`GrinduroExplainer.astro`), and modifies 6 existing files. No new architectural patterns are introduced.

**Major components affected:**
1. **Build pipeline** (`scripts/generate-data.js` and children) -- re-run with new GPX + 2 new photos; no code changes unless GPX filename differs
2. **RouteMap.astro** -- store original bounds for reset, add `map:reset` listener, replace `bindPopup` with PhotoSwipe `loadAndOpen` click handler
3. **ElevationProfile.astro** -- add `map:reset` listener to restore annotation band defaults
4. **index.astro** -- add reset button HTML/JS between map and elevation chart, add GrinduroExplainer import, add Penrose SVG in hero
5. **GravelSectors.astro** -- harmonize metadata layout from `flex` to `grid grid-cols-2` to match KomSegments
6. **global.css** -- add zoom control size overrides (4 properties), add `.penrose-hero` animation keyframes

### Critical Pitfalls

1. **GPX replacement cascading data corruption** -- Every annotation mile marker (6 sectors, 3 KOMs, 3 restocks, 53 photos) is calibrated to the old GPX geometry. The pipeline re-resolves coordinates from mile markers, but if the route path shifted, annotations land on wrong roads. **Prevention:** Visually verify EVERY sector overlay at zoom 14+ after pipeline re-run. Diff `annotations.json` lat/lon values before and after.

2. **Wrong GPX file used** -- `parse-gpx.js` hardcodes `MK Ultra.gpx` (with space). The repo also has `MK_Ultra.gpx` (with underscore) which the pipeline ignores entirely. **Prevention:** Overwrite the exact filename `MK Ultra.gpx` with the new 100mi file, or update line 29 of `parse-gpx.js`. Delete the unused file.

3. **PhotoSwipe + Leaflet popup DOM conflict** -- PhotoSwipe expects static gallery markup, but Leaflet creates/destroys popup DOM dynamically. Nesting PhotoSwipe inside popups will fail. **Prevention:** Do NOT use popups at all. Remove `bindPopup()` from photo markers. Use `marker.on('click', () => pswp.init())` with programmatic PhotoSwipe API and a `dataSource` array.

4. **Map reset incomplete state restoration** -- The map has 8 independent state dimensions (zoom, pan, popups, sector highlight styles, elevation band highlights, crosshair visibility, cluster spiderfy state, chart tooltip). A reset that only calls `fitBounds()` leaves ghost artifacts. **Prevention:** Define a comprehensive `map:reset` event handler that addresses all 8 state items in both RouteMap and ElevationProfile.

5. **New photos placed in wrong directory** -- Photos must go in repo-root `images/` (not `public/images/`). The pipeline copies from `images/` to `public/images/`. Placing directly in `public/images/` bypasses thumbnails, `photos.json`, and card assignment. **Prevention:** Always add source photos to `images/` and entries to `photo-manifest.js`.

---

## Implications for Roadmap

Based on research, the suggested phase structure follows a strict dependency chain for the first two phases, then opens up to parallel-safe work.

### Phase 1: GPX Route Replacement + Pipeline Verification
**Rationale:** Every data-dependent feature (map overlays, photo markers, elevation profile, card covers) renders against `route-data.json` and `annotations.json`. The pipeline must produce correct output from the new 100mi GPX before any UI work begins. This is the critical path foundation with the highest risk.
**Delivers:** Correct route-data.json (~100mi), re-resolved annotations.json, re-resolved photos.json, verified sector/KOM overlays on map
**Addresses:** GPX route update (Feature 7), content distance reference verification
**Avoids:** Pitfall 1 (cascading data corruption), Pitfall 2 (wrong GPX file), Pitfall 3 (elevation x-axis mismatch), Pitfall 11 (scattered distance references)
**BLOCKER:** New GPX file from Strava is an external dependency. Phase cannot start until file is received.

### Phase 2: New Photos + Pipeline Re-run
**Rationale:** The two new photos (Down Jeep + Billie Helmer B&W) must be processed against the new route data from Phase 1. Their mile markers must reference the new GPX geometry. The Down Jeep photo specifically fills a coverage gap at mile 83-84 that enables correct card cover assignment for the Down Jeep sector. Must complete before Phase 5 (photo lightbox needs finalized photos.json with width/height data).
**Delivers:** 55-photo photos.json with new entries, new thumbnails, potentially updated card cover assignments
**Addresses:** New photo processing, Down Jeep sector cover gap
**Avoids:** Pitfall 10 (pipeline assumptions), Pitfall 15 (Down Jeep coverage gap)

### Phase 3: Quick CSS + Layout Wins (Parallel-Safe)
**Rationale:** Four independent, low-risk changes that are CSS/HTML-only with no data dependencies and no cross-component interactions. Grouping them minimizes context-switching and delivers high-visibility improvements early.
**Delivers:** Larger zoom controls (36-44px touch targets), equalized sector/KOM card layout, Penrose triangle in hero with animation, Grinduro format explainer content
**Addresses:** Features 3 (zoom controls), 4 (card equalization), 5 (Grinduro explainer), 6 (Penrose triangle)
**Avoids:** Pitfall 6 (CSS specificity -- match existing `!important` pattern), Pitfall 7 (card grid alignment -- harmonize internal structure, not cross-column pixels), Pitfall 8 (z-index -- use z-5 inside hero stacking context), Pitfall 9 (animation performance -- transform/opacity only), Pitfall 12 (scroll anchor -- place explainer below heading, keep concise)

### Phase 4: Map Reset Button
**Rationale:** Extends the established CustomEvent bus with one new event (`map:reset`). Touches both RouteMap and ElevationProfile, so it needs the route data finalized (Phase 1) to verify correctly. Architecturally clean -- follows the exact same event bus pattern used for sector hover/click since v2.0.
**Delivers:** Reset button between map and elevation chart, comprehensive state restoration across both components
**Addresses:** Feature 1 (map reset)
**Avoids:** Pitfall 5 (incomplete state restoration -- must handle all 8 state dimensions), Pitfall 14 (button placement -- between map and chart, not inside Leaflet container)

### Phase 5: Photo Lightbox from Map
**Rationale:** The most architecturally complex feature. Replaces Leaflet popup behavior with programmatic PhotoSwipe, bridging two previously independent components. Depends on Phase 2 (photos.json must have width/height for all 55 photos). Should be last among functional features because it has the most integration risk.
**Delivers:** Map photo markers open in PhotoSwipe lightbox instead of new-tab links, larger thumbnail markers (48x48 divIcon with actual photo thumbnails)
**Addresses:** Feature 2 (photo lightbox from map)
**Avoids:** Pitfall 4 (event propagation -- use programmatic API, not nested gallery markup), Pitfall 13 (losing context -- use separate one-shot PhotoSwipe instance per click, not shared lightbox)

### Phase Ordering Rationale

- **Dependency chain:** Phase 1 (GPX) -> Phase 2 (Photos) -> Phase 5 (Photo Lightbox). This is a strict ordering -- each phase produces data consumed by the next.
- **Phase 3 is parallel-safe:** All four items (zoom CSS, card layout, Penrose SVG, Grinduro explainer) have zero dependencies on other v4.0 features. They can be built during Phase 1/2 if desired, or at any point in the milestone.
- **Phase 4 before Phase 5:** The reset button is simpler and validates that the CustomEvent bus extension pattern works before the more complex PhotoSwipe integration.
- **Risk front-loading:** The highest-risk item (GPX pipeline) is Phase 1. If it reveals problems (shifted annotations, unexpected route geometry), all downstream work pauses cleanly without wasted effort.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (GPX Replacement):** Needs `/gsd:research-phase` -- the exact impact of the new GPX on annotation positions cannot be predicted until the file arrives. Verification checklist required.
- **Phase 5 (Photo Lightbox):** Needs `/gsd:research-phase` -- PhotoSwipe programmatic API (`new PhotoSwipe()` vs `PhotoSwipeLightbox`) behavior with dynamic data sources should be verified against current docs. The architecture research flagged this at MEDIUM confidence.

Phases with standard patterns (skip research-phase):
- **Phase 2 (New Photos):** Pipeline is proven across v1-v3. Drop-in process documented in photo-manifest.js.
- **Phase 3 (CSS + Layout):** All four items use established codebase patterns (CSS overrides, static Astro components, inline SVG animation). Zero novel patterns.
- **Phase 4 (Map Reset):** Pure extension of the v2.0 CustomEvent bus. One new event, two new listeners. Identical pattern to existing 5 events.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All APIs verified against official docs (Leaflet, PhotoSwipe, Chart.js). Zero new dependencies. |
| Features | HIGH | All 7 features traced to specific implementation approaches with code references. Feature scope is well-defined. |
| Architecture | HIGH | Direct codebase inspection of all affected files. CustomEvent bus pattern proven across 3 milestones. |
| Pitfalls | HIGH | 15 pitfalls identified via line-by-line code inspection. Prevention strategies are concrete and actionable. |

**Overall confidence: HIGH**

### Gaps to Address

- **New GPX file not yet available:** The 100mi GPX from Strava is an external blocker. Phase 1 cannot start until this arrives. All downstream phases (2, 4, 5) depend on Phase 1 output. Phase 3 is the only work that can proceed without it.
- **"Resized to match" requirement ambiguity:** The exact meaning of "gravel sector cards resized to match KOM cards" needs clarification -- same width (requires grid restructure), same height (requires content normalization), or same visual structure (harmonize internal layout). Research recommends harmonizing internal structure as the pragmatic interpretation.
- **PhotoSwipe programmatic API confidence:** MEDIUM. The `loadAndOpen(index, dataSource)` API is documented but the exact pattern for one-shot `new PhotoSwipe()` instances (vs persistent `PhotoSwipeLightbox`) needs validation during Phase 5 planning. Architecture research flagged potential keyboard event conflicts between gallery and map lightbox instances.
- **Elevation x-axis hardcoded max:** If the new GPX produces a `totalMi` significantly different from 100 (e.g., 101.2mi), the elevation chart x-axis `max: 100` clips the last mile. Should be made dynamic or verified post-pipeline.

---

## Sources

### Primary (HIGH confidence -- official documentation)
- [Leaflet Extending Controls tutorial](https://leafletjs.com/examples/extending/extending-3-controls.html)
- [Leaflet L.Control reference](https://leafletjs.com/reference.html#control)
- [Leaflet L.DomEvent reference](https://leafletjs.com/reference.html#domevent)
- [PhotoSwipe Methods: loadAndOpen](https://photoswipe.com/methods/)
- [PhotoSwipe Data Sources](https://photoswipe.com/data-sources/)
- [PhotoSwipe Opening Transition](https://photoswipe.com/opening-or-closing-transition/)
- [WCAG 2.5.5 Target Size (AAA)](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [CSS Grid Common Layouts -- MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Common_grid_layouts)

### Secondary (HIGH confidence -- direct codebase inspection)
- All 15 pitfalls verified against specific file paths and line numbers in the 2,703 LOC codebase
- Pipeline behavior traced through `generate-data.js`, `parse-gpx.js`, `resolve-annotations.js`, `match-photos.js`, `generate-thumbnails.js`, `assign-card-photos.js`
- CustomEvent bus architecture verified across `RouteMap.astro`, `ElevationProfile.astro` (5 existing events, AbortController cleanup)
- Z-index stack mapped across `global.css`, `index.astro`, `RouteMap.astro`

### Tertiary (MEDIUM confidence -- community patterns)
- [Grinduro format description](https://grinduro.com/about/) -- event format language and concepts
- [Leaflet zoom control CSS patterns](https://codepen.io/leemark/pen/dGgqLZ) -- community styling examples
- [Equal Height Elements: Flexbox vs Grid](https://moderncss.dev/equal-height-elements-flexbox-vs-grid/) -- layout equalization patterns

---
*Research completed: 2026-03-29*
*Ready for roadmap: yes*
