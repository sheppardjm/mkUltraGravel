# Project Research Summary

**Project:** MK Ultra Gravel — v3.0 Escher Identity + Data Fixes + UX Polish
**Domain:** Static gravel cycling event website (Astro 6 + Leaflet + Chart.js)
**Researched:** 2026-03-28
**Confidence:** HIGH

---

## Executive Summary

v3.0 is a pure implementation milestone layered onto a fully-shipped, optimized v2.0 baseline. All seven work items — Escher/Penrose tessellation backgrounds, Penrose triangle favicon, gravel sector color recolor (gray to yellow-to-red spectrum), photo map position fix, bike icon for elevation hover crosshair, KOM segments on the elevation profile, and GLRC link fixes — are achievable with zero new npm dependencies. Every required API (Leaflet `L.divIcon`, chartjs-plugin-annotation box annotations, CSS `@keyframes`) is already present and in active use in the codebase. This is the key finding from STACK research: the existing stack already provides every primitive for all four visual features.

The recommended approach is surgical, file-by-file changes that respect the v2.0 architecture's deliberate patterns: compositor-safe CSS animations only (transform/opacity), `L.divIcon` inline SVG for all Leaflet markers (no external image assets), and the existing CustomEvent bus for map-chart synchronization. The single most important architectural constraint is the three-way duplication of `starColors` across `RouteMap.astro`, `ElevationProfile.astro`, and `GravelSectors.astro` — all three must be updated in a single coordinated commit for VIS-12, or the map, chart, and sector cards will show mismatched colors. Architecture research confirmed that DATA-06 (photo position fix) is already resolved as of 2026-03-28 and only requires verification, not implementation.

The primary risk for this milestone is the Escher animated background breaking the TBT 0ms Lighthouse baseline. The mitigation is strict: animate only `transform` and `opacity` on the SVG element (never `stroke-dashoffset`, `fill`, `d`, or geometry attributes), gate animation behind `prefers-reduced-motion: no-preference`, and run a mobile Lighthouse trace before any visual review. Every other feature in this milestone has no TBT risk — they are string value changes, static HTML, or annotation object additions to an already-running plugin.

---

## Key Findings

### Recommended Stack

All v3.0 features use exclusively the existing stack. No packages should be added. The prohibition is explicit: no animation libraries (GSAP, motion, anime.js), no Leaflet SVG plugins (`leaflet-svgicon`), no icon libraries, no chart plugins beyond the already-installed chartjs-plugin-annotation 3.1.0. The existing grain overlay in `global.css` (line 87) is an inline SVG data URI with CSS animation — this is the exact pattern for the Escher background. The existing `L.divIcon` usage for restock markers, photo markers, and sector badges is the exact pattern for the bike crosshair icon.

**Core technologies (unchanged from v2.0):**
- **Astro 6**: Static site generation — no change; HTML structure edits only
- **Leaflet 1.9.4**: Map rendering — `L.divIcon` with inline SVG replaces `L.circleMarker` for crosshair
- **chartjs-plugin-annotation 3.1.0**: Elevation chart overlays — add KOM `box` annotations alongside existing sector boxes; already at latest version
- **CSS `@keyframes` + `transform`**: All animation — compositor-safe, zero TBT impact; `will-change: transform` for GPU promotion on Escher overlay only
- **Inline SVG**: Favicon, background pattern tile, bike crosshair icon — no external files, no Vite asset path issues

### Expected Features

**Must have (table stakes):**
- Sector colors 1-2 changed from gray to warm spectrum — gray breaks cyclist mental model; yellow-to-red is universal difficulty encoding (BikeRoll, cycle.travel, Komoot all use it)
- KOM segments visible on elevation profile — cycling audience expects named climbs demarcated on the chart; the map already shows them; chart parity is the standard (RideWithGPS does this)
- GLRC link fixes — two plain-text mentions in `EventInfoBlock.astro` and `index.astro` should be live links; trivial correctness issue
- DATA-06 verification — confirm photos.json is synchronized (architecture research indicates it already is)

**Should have (differentiators):**
- Bike icon on elevation hover crosshair — no major platform uses a bike icon here; brand-appropriate and memorable; technically straightforward
- Escher tessellation background with subtle animation — directly references the CIA/psychedelic identity; reinforces brand coherence; rare in cycling event sites
- Penrose triangle favicon — replaces the placeholder "MK" text; ties favicon to visual identity; one-time file replacement

**Defer (not in v3.0 scope):**
- Bearing-aligned bike icon rotation (faces direction of travel) — MEDIUM complexity; optional enhancement after base divIcon is working
- Header inline Penrose triangle logo with animation — design iteration cost; may not justify the effort vs the favicon alone
- KOM-to-sector hover sync (hovering a KOM band highlights the map KOM polyline) — cross-component event wiring; second-pass feature
- `starColors` shared module extraction — correct architecture move but not required to unblock VIS-12; defer as tech debt item

### Architecture Approach

v3.0 operates entirely within the v2.0 component structure. No new components are required (an `EscherPattern.astro` component is optional if the pattern appears in 3+ sections). The change surface is 7 files: `RouteMap.astro` (bike crosshair), `ElevationProfile.astro` (KOM annotations), `GravelSectors.astro` (star colors), `global.css` (escher pattern class + keyframes), `index.astro` (GLRC link + optional escher SVG elements), `EventInfoBlock.astro` (GLRC link), and `public/favicon.svg` (replace content). `BaseLayout.astro` is optional — only needed if Escher pattern SVG `<defs>` are declared once globally. `public/data/photos.json` requires no code change, only verification.

**Key integration constraints:**
1. `starColors` duplication across 3 files — must change all three simultaneously (VIS-12)
2. Crosshair: `L.circleMarker.setStyle()` → `L.marker.setOpacity()` — API difference must be updated in both the `elevation:hover` and `elevation:hoverEnd` listeners
3. SVG `<pattern>` IDs must be unique if the pattern appears in multiple sections — or declare once in `<defs>` and `<use>` per section
4. Escher background z-index must be below `z-index: 9999` (grain overlay) — assign `-1` relative to positioned ancestor or `0` with `position: fixed` at root level
5. KOM annotations: use `drawTime: 'beforeDatasetsDraw'` to separate rendering layer from sector bands (which default to `afterDatasetsDraw`) and prevent opacity stacking artifacts where KOM and sector overlap

### Critical Pitfalls

1. **Animated SVG background breaks TBT 0ms** (Pitfall 28) — Animating `stroke-dashoffset`, `fill`, or path `d` attributes triggers CPU repaint at 60fps. Animate ONLY `transform` and `opacity`. Run DevTools Performance trace with 4x CPU throttle before shipping. If "Paint" events appear in the trace, the animation is unsafe.

2. **starColors updated in one file only** (Pitfall 31) — Three independent `starColors` constants exist: `ElevationProfile.astro:57`, `RouteMap.astro:78`, `GravelSectors.astro:15`. Update all three in one commit. Visual verification: compare a 3-star sector's polyline color, chart band color, and card star color — they must match.

3. **`L.marker.setStyle()` call after divIcon replacement** (Pitfall + Anti-Pattern B in ARCHITECTURE.md) — `L.marker` does not have `setStyle()`. After replacing `L.circleMarker`, all show/hide calls must use `crosshair.setOpacity(1)` and `crosshair.setOpacity(0)`. Using `setStyle()` on an `L.marker` silently fails.

4. **`prefers-reduced-motion` not applied to Escher animation** (Pitfall 30) — The existing global reduced-motion queries only cover `[data-reveal]` and `.redacted-reveal` selectors. Every new `@keyframes` needs its own explicit `@media (prefers-reduced-motion: reduce) { animation: none }` override in the same commit.

5. **SVG favicon fill attribute specificity overrides embedded styles** (Pitfall 34) — SVG element `fill="..."` attributes have higher specificity than a `<style>` block inside the SVG. Remove `fill` attributes from path elements and use CSS classes inside the SVG `<style>` block instead. Also: Safari does not apply embedded SVG styles to favicons — provide a PNG/ICO fallback.

6. **KOM and sector annotation opacity stacking** (Pitfall 33) — If KOM box annotations use the same `drawTime` as sector boxes and overlap geographically, the overlapping opacity fills produce muddy brown artifacts. Use `drawTime: 'beforeDatasetsDraw'` for KOM boxes to separate the rendering pass.

---

## Implications for Roadmap

All v3.0 features are independent of each other. There are no hard dependencies between them beyond the `starColors` three-file coordination. Ordering is driven by risk, visual impact, and verification clarity — not technical dependencies.

### Phase 1: Sector Color Spectrum + GLRC Links (VIS-12, CONT-05)

**Rationale:** Lowest combined risk; highest visual impact relative to effort. Both are pure value/content changes with no runtime logic changes. The `starColors` three-file coordination makes this a single multi-file commit — doing it first establishes the new color palette that all subsequent visual review sessions will use. GLRC links are two-line fixes with zero regression risk — batch them here to clear the backlog immediately.

**Delivers:** Correct yellow-to-red sector color spectrum visible on map polylines, elevation chart bands, and sector card stars simultaneously. Two GLRC plain-text mentions converted to live links.

**Addresses:** VIS-12, CONT-05

**Avoids:** starColors partial update pitfall (Pitfall 31) — commit must include all three component files

**Research flag:** No additional research needed. Standard pattern; all integration points confirmed with line numbers.

### Phase 2: DATA-06 Verification (DATA-06)

**Rationale:** Architecture research indicates photos.json is already synchronized as of the 2026-03-28 pipeline re-run. This phase is a verification task, not an implementation task. It should happen early so it can be closed quickly or escalated if re-work is needed. It does not block any other v3.0 phase.

**Delivers:** Confirmed correct photo map positions, or a re-run of `node scripts/match-photos.js` if any mismatch is found. Cache purge on Netlify after deploy (Pitfall 35 prevention).

**Addresses:** DATA-06

**Research flag:** No research needed. Pipeline re-run command confirmed: `node scripts/match-photos.js`. Verification method: compare 54 entries in `photo-manifest.js` against `public/data/photos.json` mile values.

### Phase 3: KOM Segments on Elevation Profile (VIS-13)

**Rationale:** Confined to a single file (`ElevationProfile.astro`). No cross-component event changes. Builds directly on the already-registered `AnnotationPlugin` and the existing `annotationBoxes` object structure. Zero TBT risk. Delivers meaningful UX improvement — cyclists can now see where the named climbs fall on the elevation curve.

**Delivers:** KOM segment bands on the elevation chart in chartreuse (#7fff00), visually consistent with the existing KOM polyline color on the map. Dashed border matches the map's `dashArray: '8, 4'`. Optional text label inside each band showing the KOM name.

**Addresses:** VIS-13

**Avoids:** Annotation z-order conflict (Pitfall 33) — use `drawTime: 'beforeDatasetsDraw'` on KOM boxes; add `_baseColor: '#7fff00'` for forward compatibility with any future KOM hover events

**Research flag:** No additional research needed. `borderDash`, `label.display`, and `yMin/yMax omit` all confirmed in chartjs-plugin-annotation 3.1.0 official docs. Data field confirmed: `startMi` and `lengthMi` in `annotations.json` KOM entries.

### Phase 4: Bike Icon Crosshair (UX-01)

**Rationale:** Medium risk due to the Leaflet API difference between `L.circleMarker.setStyle()` and `L.marker.setOpacity()`. Placing this after the simpler annotation work allows the visual review session for Phase 3 to also cover the map behavior independently. Follows the established `L.divIcon` inline SVG pattern already used for 4 other marker types in `RouteMap.astro`.

**Delivers:** Bike SVG icon replacing the plain cyan dot on the elevation hover crosshair. Icon centered at `iconAnchor: [12, 12]` for a 24×24 icon. Show/hide via `setOpacity()`. `:global(.bike-crosshair)` CSS rule matching existing `:global(.restock-marker)` pattern.

**Addresses:** UX-01

**Avoids:** `setStyle()` called on `L.marker` (Anti-Pattern B); wrong `iconAnchor` causing zoom drift (Pitfall 32) — set `iconAnchor: [12, 12]` and verify at zoom levels 8, 12, and 16

**Research flag:** No additional research needed. Leaflet `L.divIcon` + `setOpacity()` API confirmed. SVG bike path source: Lucide `bicycle` icon (MIT license, 24×24 viewBox, single path) is the recommended source.

### Phase 5: Escher/Penrose Background + Favicon (VIS-14, VIS-15)

**Rationale:** Most visual iteration cost; highest creative/aesthetic risk. Placed last because it does not block any other feature and requires the most back-and-forth to get the aesthetic right. The performance gate (Lighthouse mobile trace with 4x CPU throttle) must pass before visual review. The favicon is a file replacement with no code change.

**Delivers:** Subtle animated Escher-style tessellation pattern (isometric cubes / hex rhombus grid, SVG `<pattern>`) as a background element below page content, above the solid dark background. Slow CSS transform drift animation (40–60s cycle) gated behind `prefers-reduced-motion: no-preference`. Penrose triangle SVG replacing the "MK" text placeholder favicon.

**Addresses:** VIS-14, VIS-15

**Avoids:** Non-compositor animation (Pitfall 28) — animate only `transform`; SVG favicon fill specificity trap (Pitfall 34) — use CSS classes inside `<style>`, not `fill=` attributes; wrong z-index (Pitfall 29) — z-index below 9999; omitting `prefers-reduced-motion` (Pitfall 30) — override in same commit; GPU memory over-promotion (Pitfall 37) — `will-change: transform` on animating element only

**Research flag:** MEDIUM complexity. SVG tile geometry requires authoring work. Two recommended options from research:
- Isometric Escher cubes (three rhombuses in a hex arrangement) — the referenced `boxes.svg` CDN file uses this pattern; matches the `escharian_stairs_fb.webp` existing asset theme
- Penrose triangle as a repeating tile — more complex geometry but highest brand fit

The animated approach (Option B in ARCHITECTURE.md: inline SVG with CSS rotation/translate) is confirmed as compositor-safe. Static fallback (no animation) is always acceptable if TBT ticks above 0ms.

### Phase Ordering Rationale

- Phases 1-2 are pure data/content changes with zero regression risk — do them first to build momentum and establish the new color palette for visual reviews
- Phase 3 (KOM chart bands) is contained to one file and zero TBT risk — de-risks the annotation system before touching the map
- Phase 4 (bike crosshair) has the highest Leaflet API change risk — sequence it after the annotation work to isolate concerns
- Phase 5 (Escher + favicon) is last because it has the highest iteration cost and the only non-trivial TBT risk in the milestone
- All five phases are independent — if Phase 5 is blocked by aesthetic iteration, Phases 1-4 can ship as a point release

### Research Flags

Phases that need no additional research — standard patterns, all integration points confirmed:
- **Phase 1:** starColors value substitution; static HTML `<a>` tag additions — well-documented, direct code inspection confirmed
- **Phase 2:** Data pipeline re-run only — command confirmed, no code change
- **Phase 3:** chartjs-plugin-annotation box annotation additions — official docs verified, existing usage confirmed
- **Phase 4:** Leaflet `L.divIcon` with inline SVG — official docs verified, 4 existing usages in codebase as templates

Phase with moderate implementation unknowns:
- **Phase 5:** SVG tile geometry authoring for the Escher pattern requires design iteration. The CSS/DOM integration approach is fully confirmed. The visual output depends on the tile path data, which must be authored and tuned visually. If the isometric cube SVG from the CDN reference (`boxes.svg`) can be adapted directly, complexity is LOW. If custom geometry is required, allow extra iteration time.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new deps confirmed by verifying all 4 feature implementations against existing codebase APIs. Leaflet `L.divIcon` docs, chartjs-plugin-annotation 3.1.0 docs, and CSS `@keyframes` capabilities all verified. |
| Features | HIGH | Feature landscape grounded in direct codebase inspection. KOM startMi/endMi field existence confirmed. starColors three-file duplication confirmed with line numbers. Cycling difficulty color conventions verified against BikeRoll, cycle.travel. |
| Architecture | HIGH | All 7 integration points confirmed with specific file paths and line numbers via direct code inspection. DATA-06 already-resolved status confirmed by comparing photo-manifest.js (54 entries) against photos.json (54 entries, no mismatches). |
| Pitfalls | HIGH for critical pitfalls | Pitfalls 28-31 (animated SVG TBT, starColors coordination, L.marker API, prefers-reduced-motion) are all HIGH confidence from official documentation. Pitfalls 33-35 (KOM drawTime, favicon specificity, cache) range MEDIUM-HIGH. |

**Overall confidence:** HIGH

### Gaps to Address

- **oklch color values for new sector spectrum:** Specific oklch or hex values for stars 1-4 need visual QA against the dark map tiles and the CARTO dark background. Research provides a range (`oklch(0.82 0.18 85)` through `oklch(0.45 0.20 25)`) but specific values must be tuned to achieve perceptual uniformity and WCAG 4.5:1 contrast. Keep chroma below 0.2 for WCAG safety on sRGB displays (Pitfall 36).

- **Escher SVG tile geometry:** The isometric cubes pattern is recommended and the CDN reference exists, but the specific `<pattern>` path data must be authored. The tile should be validated at multiple `background-size` values (100px, 150px, 200px) to find the right visual density before shipping.

- **Bike SVG path selection:** Lucide `bicycle` is recommended as the source. The path data must be confirmed as compact (<300 bytes), render correctly at 24×24, and have the right visual weight at the map zoom levels used (8-16). Verify at both 1x and 2x DPR.

- **DATA-06 re-verification:** Architecture research confirms photos.json was regenerated at commit `dec592a` (2026-03-28). Phase 2 should re-run the comparison programmatically (`node scripts/match-photos.js` output diff against current file) as a formal verification step rather than relying on the research finding alone.

---

## Sources

### Primary (HIGH confidence)
- Leaflet custom icons guide: https://leafletjs.com/examples/custom-icons/
- Leaflet DivIcon reference: https://leafletjs.com/reference.html#divicon-l-divicon
- Leaflet L.marker.setOpacity: https://leafletjs.com/reference.html#marker
- chartjs-plugin-annotation box annotations: https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/types/box.html
- chartjs-plugin-annotation GitHub releases (v3.1.0 is current): https://github.com/chartjs/chartjs-plugin-annotation/releases
- Chrome for Developers — avoid non-composited animations: https://developer.chrome.com/docs/lighthouse/performance/non-composited-animations
- MDN — prefers-reduced-motion: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion
- W3C WCAG 2.3.3 — Animation from Interactions: https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html
- MDN — SVG stacking context: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Understanding_z-index/Stacking_context/
- Direct codebase inspection: RouteMap.astro, ElevationProfile.astro, GravelSectors.astro, global.css, BaseLayout.astro, index.astro, EventInfoBlock.astro, public/favicon.svg, scripts/photo-manifest.js, public/data/photos.json

### Secondary (MEDIUM confidence)
- BikeRoll route planner color grading: https://www.cyclingabout.com/bikeroll-bike-route-planner/
- cycle.travel elevation chart key: https://cycle.travel/post/5728
- SVG animation encyclopedia: https://www.svgai.org/blog/research/svg-animation-encyclopedia-complete-guide
- SVG favicon dark mode guide: https://owenconti.com/posts/supporting-dark-mode-with-svg-favicons
- OKLCH WCAG gamut interaction: https://blog.logrocket.com/oklch-css-consistent-accessible-color-palettes
- Optimizing SVGs in data URIs: https://codepen.io/tigt/post/optimizing-svgs-in-data-uris
- Escher boxes SVG reference (CDN): https://s3-us-west-2.amazonaws.com/s.cdpn.io/4273/boxes.svg
- Smashing Magazine — GPU Animation: https://www.smashingmagazine.com/2016/12/gpu-animation-doing-it-right/
- Netlify default cache header behavior: https://docs.netlify.com/build/caching/caching-overview/

### Tertiary (for implementation reference only)
- Penrose triangle free SVG: https://freesvg.org/penrose-triangle
- SVG Repo impossible triangle: https://www.svgrepo.com/svg/173286/impossible-triangle
- How to favicon in 2026: https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs
- Lucide bicycle icon (MIT): https://lucide.dev/icons/bicycle

---

*Research completed: 2026-03-28*
*Ready for roadmap: yes*
