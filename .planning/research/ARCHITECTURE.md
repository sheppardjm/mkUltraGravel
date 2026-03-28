# Architecture Patterns — v3.0 Escher Identity + Data Fixes + UX Polish

**Domain:** Static gravel cycling event website (Astro 6 + Leaflet + Chart.js)
**Project:** MK Ultra Gravel
**Researched:** 2026-03-28
**Focus:** How v3.0 features integrate with the v2.0 shipped architecture
**Overall confidence:** HIGH (all six features traced to specific file locations with exact integration points)

---

## Existing Architecture Snapshot (v2.0 Baseline)

The v2.0 site is a single-page Astro 6 static site. Key structures that v3.0 operates within:

**Component inventory:**
- `src/components/RouteMap.astro` — Leaflet map, lazy-initialized on scroll via IntersectionObserver. All map logic is inside a single `initMap()` async function. The crosshair is a `L.circleMarker` (plain dot, `#22d3ee` fill) that repositions via `elevation:hover` CustomEvents. Sector polylines and KOM polylines are rendered at startup.
- `src/components/ElevationProfile.astro` — Chart.js with chartjs-plugin-annotation. Sector bands are annotation `box` objects keyed `sector_0`, `sector_1`, etc. KOM segments exist in `annotations.json` but are NOT rendered on the elevation chart — only the map polylines show them. Chart `onHover` emits `elevation:hover`; `mouseleave` emits `elevation:hoverEnd`.
- `src/components/GravelSectors.astro` — Pure Astro/SSR. Reads `annotations.json` at build time via `readFileSync`. Renders sector cards with `coverPhoto` images and star ratings colored via `starColors` map (inline Astro frontmatter).
- `src/components/KomSegments.astro` — Pure Astro/SSR. Same `readFileSync` pattern. Renders KOM cards. No annotation integration with the elevation chart.
- `src/components/EventInfoBlock.astro` — Static HTML component. Contains GLRC donation link at `https://www.glrc.org/donate` plus plain-text "GLRC" and "Great Lakes Recovery Centers" mentions.
- `src/layouts/BaseLayout.astro` — HTML shell. `<div class="grain-overlay">` is a fixed SVG noise overlay at `z-index: 9999`. No other background pattern exists.
- `src/pages/index.astro` — Page composition. Hosts the hero section with `.tone-image` (opacity 0.12, `mix-blend-mode: lighten`, `grayscale(100%)`). Contains plain text "Great Lakes Recovery Centers" in the hero subtitle text (not a link).
- `src/styles/global.css` — All design tokens and layer-ordered CSS. `@layer leaflet, base, components, utilities` order defined here. `.grain-overlay`, `.tone-image`, `.classified-border`, `.card-hover` all live here.
- `public/favicon.svg` — Plain "MK" text in a monospace font on dark background. 32×32px SVG.

**starColors map — three independent copies:**

The `starColors` constant (`{ 1: '#888888', 2: '#aaaaaa', 3: '#f5a623', 4: '#e86d1f', 5: '#c0392b' }`) is duplicated verbatim across three files with no shared source:

| File | Context | How used |
|------|---------|----------|
| `src/components/RouteMap.astro:78-84` | Runtime JS inside `initMap()` | Colors polyline strokes + badge icon HTML |
| `src/components/ElevationProfile.astro:57-63` | Runtime JS inside `initElevation()` | Colors annotation box fills and borders |
| `src/components/GravelSectors.astro:15-21` | Astro frontmatter (build time) | Inline style on star rating `<span>` |

Stars 1 and 2 are gray (`#888888`, `#aaaaaa`). The v3.0 requirement (VIS-12) changes all five values. All three files must be updated in the same commit to avoid visual inconsistency between the map, chart, and sector cards.

**CustomEvent bus — established in v2.0:**

```
elevation:hover     { lat, lon }     ElevationProfile → RouteMap
elevation:hoverEnd  (no payload)     ElevationProfile → RouteMap
elevation:sectorClick { sectorIndex } ElevationProfile → RouteMap
map:sectorHover     { sectorIndex | null } RouteMap → ElevationProfile
map:sectorClick     { sectorIndex }  RouteMap → ElevationProfile
```

All listeners use `AbortController` + `{ signal }` for cleanup. Both components lazy-initialize on first scroll — no initialization race condition because all listeners are registered inside the respective `initMap()` / `initElevation()` async functions after data loads.

**Build pipeline:**
```
parse-gpx.js          → route-data.json
resolve-annotations.js → annotations.json
match-photos.js        → photos.json        ← reads photo-manifest.js
assign-card-photos.js  → annotations.json (enriched with coverPhoto)
generate-thumbnails.js → public/images/cards/*.webp
```
`scripts/photo-manifest.js` holds the curated 54-photo manifest with mile-marker positions. `public/data/photos.json` is the pipeline output — it is what the map reads at runtime. As of 2026-03-28, `photo-manifest.js` and `photos.json` are synchronized (54 photos, no mismatches). The MEMORY note about stale photos.json (from an extended GPX) is **resolved** — the pipeline was regenerated for the current 100mi route (max mi: 98.23).

---

## Feature 1: Sector Color Spectrum (VIS-12)

**What:** Change star ratings 1-2 from gray to a yellow-to-red spectrum, making the full 5-star range chromatic.

**Integration points — three files, coordinated change:**

```
src/components/RouteMap.astro       lines 78-84   (runtime JS)
src/components/ElevationProfile.astro lines 57-63  (runtime JS)
src/components/GravelSectors.astro  lines 15-21   (build-time Astro frontmatter)
```

**How the color change propagates:**

- `RouteMap`: `starColors[sector.stars]` drives `color` on sector polylines (line 93), badge icon HTML `style="color:..."` (line 128), and the restore-after-click style (line 267). All three reference the same `const starColors` declared at line 78.
- `ElevationProfile`: `starColors[sector.stars]` drives `backgroundColor` and `borderColor` on annotation boxes (lines 72-73), and the stored `_baseColor` used for hover/click highlight/restore (line 75). One `const starColors` at line 57.
- `GravelSectors`: `starColors[sector.stars]` drives the inline `style` on the star rating `<span>` (line 44). One `const starColors` at line 15.

**Change required:** Replace the five hex values in all three locations simultaneously. No structural code change — just value replacement. The values at stars 3, 4, 5 (`#f5a623`, `#e86d1f`, `#c0392b`) are already chromatic and may stay, or the spectrum can be remapped uniformly.

**Performance impact:** None. Color values are strings in JS objects / CSS inline styles. No new DOM operations, no layout change.

**New components needed:** None.

---

## Feature 2: Photo Map Position Fix (DATA-06)

**What:** Regenerate `public/data/photos.json` from the corrected mile markers already in `photo-manifest.js`.

**Current state verified (2026-03-28):**
- `photo-manifest.js` has 54 photos.
- `photos.json` has 54 photos.
- Mile markers match between manifest and `photos.json`.
- Coordinates in `photos.json` match what `match-photos.js` would produce from the current route-data.json for those mile values.

**Conclusion:** DATA-06 as described ("regenerate photos.json from corrected mile markers") is **already done**. The pipeline was regenerated at commit `dec592a` (2026-03-28). No pipeline script change is required.

**If the intent is to re-verify or re-run:** `node scripts/match-photos.js` from the repo root is the correct command. Output goes to `public/data/photos.json`. Commit the result. No code changes needed.

**Integration points:** `scripts/match-photos.js` (run only), `public/data/photos.json` (output). No component changes.

---

## Feature 3: Bike Icon Crosshair (UX-01)

**What:** Replace the elevation hover crosshair from a plain `L.circleMarker` (dot) to a bike icon marker.

**Current crosshair implementation (RouteMap.astro lines 222-229):**
```javascript
const crosshair = L.circleMarker([0, 0], {
  radius: 6,
  color: '#ffffff',
  fillColor: '#22d3ee',
  fillOpacity: 0,
  weight: 2,
  opacity: 0
}).addTo(map);
```
Hidden by default via `opacity: 0, fillOpacity: 0`. Shown/hidden via `crosshair.setStyle({ opacity: 1, fillOpacity: 0.9 })` in the `elevation:hover` listener (lines 237-243) and `crosshair.setStyle({ opacity: 0, fillOpacity: 0 })` in the `elevation:hoverEnd` listener (lines 246-248). Position updated via `crosshair.setLatLng([lat, lon])` (line 239).

**Replacement approach — `L.divIcon`:**

`L.divIcon` is already used throughout the codebase for restock markers, photo markers, photo clusters, and sector badges. It is the established pattern for custom HTML/SVG markers. Replace the `L.circleMarker` with a `L.marker` using `L.divIcon`.

```javascript
// Replace L.circleMarker with L.marker + L.divIcon:
const bikeIcon = L.divIcon({
  className: 'bike-crosshair',   // CSS in global.css or RouteMap <style>
  html: '<svg ...>bike path...</svg>',
  iconSize: [20, 20],
  iconAnchor: [10, 10]           // center the icon on the GPS coordinate
});

const crosshair = L.marker([0, 0], {
  icon: bikeIcon,
  opacity: 0,
  interactive: false
}).addTo(map);
```

Show/hide changes: `L.circleMarker` used `.setStyle()` for opacity. `L.marker` uses `.setOpacity(1)` and `.setOpacity(0)`. The `setLatLng()` call is identical — same Leaflet API for both marker types.

**CSS scoping:** The `.bike-crosshair` class will be appended by Leaflet outside the Astro component's scoped styles. Must use `:global(.bike-crosshair)` in the component `<style>` block (same pattern as existing `:global(.restock-marker)`, `:global(.photo-marker)`, `:global(.photo-cluster)` at lines 19-33 of RouteMap.astro).

**SVG source options:**
- Inline SVG string in the `html` field (no new file, self-contained)
- External `/public/icons/bike.svg` fetched as a URL via `<img>` tag inside the `html` field

Inline SVG is preferable — no additional network request, no async load timing issue, consistent with the existing pattern for cluster icons (which embed full SVG-like HTML inline in the `html` field).

**Integration points — one file:**
```
src/components/RouteMap.astro   lines 222-248   (crosshair declaration + show/hide listeners)
src/styles/global.css           (add :global(.bike-crosshair) if needed, or use RouteMap <style>)
```

**Performance impact:** `L.marker` with `L.divIcon` is the same DOM cost as existing markers. No layout impact. The `elevation:hover` listener logic is identical — just swap `.setStyle()` calls for `.setOpacity()`. TBT unaffected.

**New components needed:** None. SVG markup is inline in the `html` field.

---

## Feature 4: KOM Bands on Elevation Chart (VIS-13)

**What:** Show KOM segment ranges on the elevation profile chart, visually distinct from sector bands.

**Current state:** KOM polylines exist on the map (RouteMap.astro lines 149-165, dashed `#7fff00` chartreuse). The elevation chart has sector annotation boxes (`sector_0`, `sector_1`, etc.) but **zero KOM annotations**. `annotations.json` contains a `kom` array with `startMi` and `endMi` (derived from `startMi + lengthMi`) for each KOM segment.

**Integration point — one file:**
```
src/components/ElevationProfile.astro   lines 66-82   (annotationBoxes object construction)
```

**How to add KOM bands:**

The `annotationBoxes` object currently only populates `sector_${i}` keys. Add KOM annotations in the same block using different visual treatment:

```javascript
// After sector annotations loop:
annotations.kom.forEach((kom, i) => {
  annotationBoxes[`kom_${i}`] = {
    type: 'box',
    xMin: kom.startMi,
    xMax: kom.startMi + kom.lengthMi,
    backgroundColor: '#7fff0015',   // chartreuse at ~8% opacity (vs sector's ~13%)
    borderColor: '#7fff0066',       // chartreuse at ~40% opacity
    borderDash: [4, 2],            // dashed border to visually distinguish from sector solid
    borderWidth: 1,
    label: {
      display: true,
      content: kom.name,
      color: '#7fff00',
      font: { size: 9, family: 'monospace' },
      position: { x: 'start', y: 'start' }
    }
  };
});
```

The `borderDash` option in chartjs-plugin-annotation 3.x controls the box border dash pattern — matches the dashed polyline treatment on the map. The chartreuse `#7fff00` color matches the map KOM polyline color exactly, creating visual consistency between the two components.

**Visual differentiation from sectors:**
- Color: chartreuse `#7fff00` vs sector amber/orange/red spectrum
- Border: dashed vs solid
- Opacity: slightly lower fill opacity to keep sector bands dominant
- Label: small KOM name text at top-left of band (optional, but useful for narrow segments)

**Key data field check:** `annotations.json` sectors have `startMi` and `endMi` (confirmed in the annotations file). KOM entries have `startMi` and `lengthMi` — so `xMax = kom.startMi + kom.lengthMi`. This calculation is already used in the map's KOM popup rendering.

**Performance impact:** Adding N more annotation objects (N = number of KOM segments, currently 3 per annotations.json) to the Chart.js annotation plugin is negligible. The annotation plugin renders during `chart.draw()` which is already happening. No additional fetches or listeners.

**New components needed:** None.

---

## Feature 5: GLRC Link Fix (CONT-05)

**What:** Make all GLRC/Great Lakes Recovery Centers mentions clickable links to `https://www.glrc.org/donate`.

**Current state — two files contain mentions:**

```
src/components/EventInfoBlock.astro   line 24
  → Already a link: <a href={GLRC_URL}>Great Lakes Recovery Centers</a>
  → GLRC_URL = 'https://www.glrc.org/donate'  (line 3)
  → This one is DONE.

src/components/EventInfoBlock.astro   line 25
  → Plain text: "GLRC provides substance abuse..."
  → "GLRC" appears as plain text, not a link.

src/pages/index.astro   line 226
  → Plain text: "$10 suggested donation to Great Lakes Recovery Centers"
  → "Great Lakes Recovery Centers" is plain text, not a link.
```

**Changes required:**

1. `src/pages/index.astro` line 226: Wrap "Great Lakes Recovery Centers" in an `<a>` tag linking to `https://www.glrc.org/donate`. The BIKEREG_URL constant is already at the top of the file — add `const GLRC_URL = 'https://www.glrc.org/donate'` to the frontmatter block (lines 1-21), then use it in the template.

2. `src/components/EventInfoBlock.astro` line 25: The paragraph starting "GLRC provides substance abuse..." has "GLRC" as plain text. Minimal fix: link the word "GLRC" using the existing `GLRC_URL` constant. The anchor pattern is already established two lines above.

**No component changes to GravelSectors.astro or KomSegments.astro** — grep confirmed no GLRC/Great Lakes mentions there.

**Integration points — two files:**
```
src/pages/index.astro               line 226   (hero section subtitle)
src/components/EventInfoBlock.astro line 25    (second GLRC paragraph)
```

**Performance impact:** Zero. Static HTML link additions, no JS.

---

## Feature 6: Escher/Penrose SVG Background Patterns (VIS-14)

**What:** Add tessellating geometric background patterns (Escher/Penrose-style) to page sections, with subtle animation, without breaking TBT 0ms.

**Where in the DOM/CSS stack:**

The existing visual layering in each section:
```
z-index 9999: .grain-overlay (position: fixed, SVG noise texture, pointer-events: none)
z-index 10+:  .relative z-10 (section content — text, maps, charts)
z-index 0:    .tone-image (position: absolute, opacity 0.12, mix-blend-mode: lighten)
              (page background: oklch(0.10 0.01 250) — near-black)
```

The Escher/Penrose pattern belongs in the same visual layer as `.tone-image` — a positioned background element below content, above the solid `--color-bg-base`, with low opacity and pointer-events: none. It sits between `z-index 0` (page background) and `z-index 10` (content).

**Implementation approach:**

Option A — CSS `background-image` with `url('data:image/svg+xml,...')` on a section's `::before` pseudo-element:
- No new DOM nodes
- Pattern defined entirely in CSS
- Animation via CSS `@keyframes` on `transform: rotate()` or `background-position`
- Perfectly compositor-safe (transform/opacity only)

Option B — Inline `<svg>` element in the section HTML (same pattern as existing `.tone-image` images):
- Full SVG control (gradients, clip-paths, complex path animations)
- Can use `<pattern>` and `<use>` elements for tessellation
- Animated via CSS animation on the SVG element or SMIL (avoid SMIL — deprecated in Chrome)

**Recommended approach: Option B — inline SVG with CSS animation**

Reasons: The tessellation pattern (Penrose tiling or Escher-style rhombus grid) requires `<pattern>` and `<use>` SVG elements to avoid repeating path data. A CSS `background-image` SVG cannot contain `<use>` referencing external elements. For a complex geometric pattern, inline SVG is the right tool.

**DOM integration:**

Follow the `.tone-image` pattern exactly. Each section that gets the pattern gets an inline SVG:
```astro
<section class="relative overflow-hidden ...">
  <svg aria-hidden="true" class="escher-pattern" ...>
    <defs>
      <pattern id="penrose-tile" ...>
        <!-- path data -->
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#penrose-tile)" />
  </svg>
  <div class="relative z-10">
    <!-- section content -->
  </div>
</section>
```

**CSS for the pattern:**
```css
/* global.css — @layer components */
.escher-pattern {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0.05;          /* very subtle — does not compete with content */
  mix-blend-mode: lighten;
}

@media (prefers-reduced-motion: no-preference) {
  .escher-pattern {
    animation: escher-rotate 60s linear infinite;
  }
}

@keyframes escher-rotate {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
```

**TBT impact assessment:**

- SVG `<pattern>` elements are rendered by the GPU compositor when animated with `transform` only. Rotating an SVG with `transform: rotate()` via CSS `@keyframes` is compositor-safe — identical to rotating a `<div>`.
- The `prefers-reduced-motion: no-preference` media query guard respects user accessibility preferences and is consistent with existing animation patterns in `global.css`.
- The animation is a simple `rotate` — one CSS property, fully compositor-safe. TBT 0ms will not be affected.
- Opacity (0.05) ensures the pattern does not draw visual attention away from content or add perceivable render cost.

**Pattern ID uniqueness:** If the pattern SVG appears in multiple sections, each `<pattern id="...">` needs a unique ID (`id="penrose-tile-hero"`, `id="penrose-tile-route"`, etc.) to avoid SVG DOM ID conflicts. Alternatively, declare the pattern once in a hidden `<svg>` in `BaseLayout.astro` and `<use href="#penrose-tile">` it per section.

**Favicon update (VIS-15):**

The current `public/favicon.svg` is 5 lines — "MK" text in monospace on a dark rect. A Penrose triangle favicon requires replacing this file with a new SVG path. The favicon is referenced in `BaseLayout.astro` line 23:
```astro
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
```
No code change needed — just replace the file content. The browser caches favicons aggressively; users may need to hard-refresh to see the update.

**Integration points:**
```
src/pages/index.astro          (add SVG elements to hero, route, sector sections)
src/styles/global.css          (add .escher-pattern class + @keyframes)
src/layouts/BaseLayout.astro   (optional: declare shared <defs> once here)
public/favicon.svg             (replace with Penrose triangle SVG)
```

**New components needed:** None required. A new `EscherPattern.astro` component could encapsulate the SVG markup if it appears in 3+ sections — call it a judgment call based on repetition.

---

## Modified vs New Components Summary

| File | Status | Changes for v3.0 |
|------|--------|-----------------|
| `src/components/RouteMap.astro` | Modified | Replace `L.circleMarker` crosshair with `L.marker` + `L.divIcon` bike SVG; add `:global(.bike-crosshair)` style |
| `src/components/ElevationProfile.astro` | Modified | Add KOM annotation boxes to `annotationBoxes` object alongside existing sector boxes |
| `src/components/GravelSectors.astro` | Modified | Update `starColors` values (sector color spectrum) |
| `src/styles/global.css` | Modified | Add `.escher-pattern` class, `@keyframes escher-rotate` |
| `src/pages/index.astro` | Modified | Add GLRC link in hero subtitle; add `GLRC_URL` const to frontmatter; add SVG pattern elements to sections |
| `src/components/EventInfoBlock.astro` | Modified | Link "GLRC" plain text in second paragraph |
| `public/favicon.svg` | Modified | Replace "MK" text favicon with Penrose triangle SVG |
| `public/data/photos.json` | No change needed | Already synchronized with photo-manifest.js (verified 2026-03-28) |
| `src/layouts/BaseLayout.astro` | Optional | Add shared `<svg><defs>` block if Escher pattern is used in 3+ sections |
| `EscherPattern.astro` (new) | Optional | Component wrapper for SVG pattern, if repetition justifies it |

**No new npm packages required.** All six features use existing capabilities: Leaflet `L.divIcon` (already used), chartjs-plugin-annotation (already registered), inline SVG (no library), static HTML links.

---

## Data Flow Changes

No build pipeline changes are required for v3.0. The pipeline scripts (`parse-gpx.js`, `resolve-annotations.js`, `match-photos.js`, `assign-card-photos.js`, `generate-thumbnails.js`) are unchanged.

The only data-adjacent task (DATA-06) is a pipeline re-run, not a pipeline code change: `node scripts/match-photos.js` if re-verification is desired. Current output is correct.

---

## Suggested Build Order Based on Dependencies

Dependencies are minimal across all six v3.0 features — most are fully independent surgical changes. Ordering is driven by risk and verification clarity:

```
1. Sector color update (VIS-12)
   Files: RouteMap.astro, ElevationProfile.astro, GravelSectors.astro
   Rationale: Lowest risk, highest visual impact, zero runtime logic change.
   All three files must change in one commit to avoid visual inconsistency
   between map colors, chart colors, and card colors.
   Verify: visual check map polylines, chart bands, and sector card stars
   all match the new spectrum simultaneously.

2. GLRC link fix (CONT-05)
   Files: index.astro, EventInfoBlock.astro
   Rationale: Trivial one-liner per file. No JS, no data.
   Zero regression risk. Do it early to check it off.

3. Data verification (DATA-06)
   Files: public/data/photos.json (if re-run needed)
   Rationale: Already done per 2026-03-28 verification. If PROJECT.md
   description changes again, re-run match-photos.js and commit output.
   No code changes.

4. KOM bands on elevation chart (VIS-13)
   Files: ElevationProfile.astro
   Rationale: Confined to one file. No cross-component event changes.
   Builds on existing annotation plugin already registered.
   Verify: KOM bands appear in chartreuse, dashed, correctly positioned
   at the right mile ranges. Confirm sector bands still work.
   Run Lighthouse to confirm TBT 0ms unchanged.

5. Bike icon crosshair (UX-01)
   Files: RouteMap.astro, global.css
   Rationale: Replaces existing crosshair logic — need to verify show/hide
   still works correctly with L.marker vs L.circleMarker opacity API.
   Test: hover elevation chart at various points, confirm bike icon appears
   and moves correctly. Test elevation:hoverEnd hides the marker.
   Medium risk due to Leaflet API difference (setOpacity vs setStyle).

6. Escher/Penrose patterns + favicon (VIS-14, VIS-15)
   Files: index.astro, global.css, BaseLayout.astro (optional), favicon.svg
   Rationale: Most visual work; highest creative/iteration cost.
   Last because it doesn't block anything else and requires the most
   iteration to get the aesthetic right.
   Performance gate: Run Lighthouse after adding the SVG pattern and
   animation. If TBT ticks above 0ms, reduce animation complexity
   (slower rotation, static pattern, lower opacity).
```

---

## Performance Impact on TBT 0ms

Each feature assessed against the TBT 0ms baseline:

| Feature | TBT Risk | Rationale |
|---------|----------|-----------|
| Sector color update | None | String value change only |
| GLRC links | None | Static HTML |
| Photos.json re-run | None | Data file, no JS change |
| KOM chart bands | None | Adds annotation objects to existing plugin; negligible render cost |
| Bike icon crosshair | Low | `L.divIcon` is same DOM cost as existing markers; `setOpacity` is Leaflet-native |
| Escher SVG pattern | Low-Medium | CSS `transform: rotate()` is compositor-safe; risk is if SVG complexity causes rasterization. Mitigation: keep path count low, use `will-change: transform` if needed, gate animation behind `prefers-reduced-motion: no-preference` |

**Mitigation protocol for Escher patterns:** Run Lighthouse in mobile throttled mode after adding the pattern. If TBT > 0ms, the animation is the likely culprit — remove the `animation` property first to confirm, then either simplify the SVG path data or disable animation entirely. A static pattern at 0.05 opacity is better than no pattern.

---

## Anti-Patterns to Avoid for v3.0

### Anti-Pattern A: Partial starColors Update

**What:** Updating starColors in only one or two of the three files.
**Why bad:** Map polylines show new colors but sector cards show old colors, or chart bands mismatch the map. The visual system falls apart immediately and inconsistently.
**Instead:** Stage all three file edits in one commit. Do a visual side-by-side check of all three surfaces before merging.

### Anti-Pattern B: Using `setStyle()` on `L.marker` for Visibility

**What:** After replacing `L.circleMarker` with `L.marker`, calling `crosshair.setStyle({ opacity: 0 })`.
**Why bad:** `L.marker` does not have a `setStyle()` method that accepts `opacity`. `L.circleMarker` (which extends `L.Path`) does — it inherits the Path stroke/fill style API. `L.marker` uses `setOpacity()` instead.
**Instead:** Use `crosshair.setOpacity(0)` and `crosshair.setOpacity(1)` for the bike icon marker. The `setLatLng()` call is identical for both types.

### Anti-Pattern C: Duplicate SVG `<pattern>` IDs

**What:** Copying the same SVG block into multiple page sections without changing the `id` attribute on the `<pattern>` element.
**Why bad:** SVG ID collisions in the same document cause only the first definition to render correctly; subsequent sections show broken/wrong patterns.
**Instead:** Assign unique IDs per section (`id="penrose-hero"`, `id="penrose-route"`) or declare the pattern once in a `<defs>` block in `BaseLayout.astro` and reference it via `<use href="#penrose">` in each section.

### Anti-Pattern D: Animating SVG Properties That Trigger Layout

**What:** Using CSS animations on SVG attributes like `width`, `height`, `x`, `y`, or `stroke-width`.
**Why bad:** These trigger layout recalculation on every frame, which will add main-thread cost and potentially break TBT 0ms.
**Instead:** Animate only `transform` (rotation, translation, scale) and `opacity` on the SVG element itself. The GPU compositor handles these without main-thread involvement.

### Anti-Pattern E: KOM Annotations Without `_baseColor` Equivalent

**What:** Adding KOM annotation boxes without the `_baseColor` metadata field that sector boxes use for hover/click highlight restore.
**Why bad:** If any future phase adds map:komHover events (KOM cards highlighting the chart), the restore logic breaks because there's no stored base color to restore from.
**Instead:** Add `_baseColor: '#7fff00'` to each KOM annotation box at creation time, matching the sector pattern. Even if no hover logic is added in v3.0, this makes the data structure consistent and forward-compatible.

---

## Confidence Assessment

| Area | Confidence | Source | Notes |
|------|------------|--------|-------|
| starColors map locations (3 files) | HIGH | Direct file inspection — lines confirmed | Three exact locations with line numbers |
| L.marker vs L.circleMarker opacity API | HIGH | Leaflet source code inspection patterns + existing codebase use of both types | `setOpacity` is `L.marker`-specific; `setStyle` is `L.Path`-specific |
| chartjs-plugin-annotation `borderDash` | MEDIUM | Plugin API consistent with Chart.js borderDash pattern; verify against plugin docs | Confirmed in plugin v3.x feature set |
| SVG `<pattern>` approach for tessellation | HIGH | SVG specification — `<pattern>` is the correct SVG primitive for this purpose | CSS `background-image` SVG cannot use `<use>` referencing external elements |
| CSS `transform: rotate()` compositor safety | HIGH | Established compositor rule (Chrome Developers doc); consistent with existing `.card-hover` implementation | Already used in existing animation system |
| GLRC link locations | HIGH | Direct grep — two files, two locations confirmed | `src/pages/index.astro:226`, `EventInfoBlock.astro:25` |
| DATA-06 already resolved | HIGH | Direct comparison of manifest vs photos.json — 54 entries, 0 mismatches, git log confirms pipeline ran 2026-03-28 | May need re-run if project description changes |

---

## Sources

- Direct file inspection: `src/components/RouteMap.astro`, `src/components/ElevationProfile.astro`, `src/components/GravelSectors.astro`, `src/components/KomSegments.astro`, `src/components/EventInfoBlock.astro`, `src/styles/global.css`, `src/layouts/BaseLayout.astro`, `src/pages/index.astro`, `public/favicon.svg`
- Runtime verification: `node` script comparing `scripts/photo-manifest.js` against `public/data/photos.json` — 54 entries, 0 mismatches (2026-03-28)
- Git log inspection: `public/data/photos.json` last modified commit `dec592a` (2026-03-28), `scripts/photo-manifest.js` last modified commit `08f6e45` (2026-03-28)
- [Leaflet API Reference — L.marker](https://leafletjs.com/reference.html#marker) — `setOpacity()` method on `L.Marker`
- [Leaflet API Reference — L.circleMarker / L.Path](https://leafletjs.com/reference.html#path) — `setStyle()` on `L.Path` only
- [chartjs-plugin-annotation — Box annotation options](https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/types/box.html) — `borderDash` option
- [MDN: SVG `<pattern>` element](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/pattern) — Tessellation pattern approach
- [Chrome Developers: Avoid non-composited animations](https://developer.chrome.com/docs/lighthouse/performance/non-composited-animations) — `transform`/`opacity` compositor rule
- v2.0 ARCHITECTURE.md (this repo) — CustomEvent bus design, established patterns
