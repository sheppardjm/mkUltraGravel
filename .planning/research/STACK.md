# Technology Stack — v3.0 Escher Identity + Data Fixes + UX Polish

**Project:** MK Ultra Gravel — v3.0 milestone additions
**Researched:** 2026-03-28
**Scope:** New capabilities only — SVG tessellation backgrounds, custom bike map marker, KOM elevation bands, Penrose triangle favicon
**Confidence:** HIGH for all four features (verified against official docs and existing codebase)

---

## Executive Summary

All four v3.0 visual features are achievable with **zero new npm dependencies**. The existing stack (Astro 6, Tailwind v4, Leaflet 1.9.4, chartjs-plugin-annotation 3.1.0) already provides every primitive required. This is a pure implementation milestone.

| Feature | Approach | New deps |
|---------|----------|---------|
| SVG tessellation backgrounds (Escher boxes, Penrose triangles) | Inline SVG `<pattern>` + CSS animation on `opacity`/`transform` | None |
| Custom bike icon on Leaflet crosshair marker | Replace `L.circleMarker` with `L.marker` + `L.divIcon` (SVG string in `html`) | None |
| KOM segment bands on Chart.js elevation profile | Add `box` annotation entries alongside existing sector annotations using chartjs-plugin-annotation 3.1.0 already installed | None |
| Penrose triangle SVG favicon | Replace existing `public/favicon.svg` (currently a text "MK" rect) with hand-authored Penrose triangle SVG | None |

**Net new mandatory dependencies: zero.**

---

## Feature 1: SVG Tessellation Pattern Backgrounds

### What the reference SVG does

The Escher boxes SVG at `https://s3-us-west-2.amazonaws.com/s.cdpn.io/4273/boxes.svg` uses:

- An SVG `<pattern>` element with `id="boxes"`, dimensions 300×573, scaled to 0.25×
- Two `<rect>` elements with `skewY(30)` and `skewY(-30)` transforms in a grayscale palette (`#888`, `#666`)
- A full-viewport `<rect fill="url(#boxes)">` that tiles the pattern across the entire surface
- Zero JavaScript — entirely declarative SVG

This is identical in structure to the existing `grain-overlay` in `global.css`, which is also an inline SVG `background-image` data URI (see `global.css` line 87). The tessellation backgrounds follow the same pattern.

### Recommended approach: Inline SVG as CSS `background-image` data URI

Inline the tessellation SVG directly in a CSS class, the same way the existing `grain-overlay` is implemented. No external file request, no JS, no extra DOM elements beyond the overlay div.

```css
/* Example structure — matches existing grain-overlay pattern */
.escher-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.08;               /* tune: ~6-12% for subliminal background */
  background-image: url("data:image/svg+xml,[URL-encoded SVG]");
  background-repeat: repeat;
  background-size: 150px;      /* tune tile size for visual density */
  z-index: 9998;               /* below grain-overlay at 9999 */
  will-change: transform;      /* promote to GPU compositor layer */
}
```

**Why inline data URI over external file:**
- Eliminates a network request (the grain overlay follows this exact pattern — see `global.css:87`)
- No CORS or path issues in Astro's `/public` asset pipeline
- SVG at this complexity (3 elements) is tiny — well under 500 bytes URL-encoded

**Animation approach — CSS only, compositor-safe:**

The Escher boxes background should use a slow CSS `background-position` drift or `transform: translate` animation. Animating `background-position` causes repaint but NOT layout; it is CPU-bound but acceptable at low opacity. Animating `transform` on the overlay div is fully compositor-safe (zero TBT impact).

Recommended: animate `transform: translate` on the overlay `div`, not `background-position`, to stay compositor-safe:

```css
@keyframes escher-drift {
  from { transform: translate(0, 0); }
  to   { transform: translate(-150px, -150px); } /* one full tile = seamless loop */
}

.escher-overlay {
  animation: escher-drift 40s linear infinite;
  will-change: transform;
}
```

A 40-second cycle at 6-8% opacity is subliminal — felt not watched. Match tile size in `background-size` to the `translate` distance for a seamless loop.

**`prefers-reduced-motion` guard — mandatory:**

```css
@media (prefers-reduced-motion: reduce) {
  .escher-overlay { animation: none; }
}
```

The existing `global.css` already has this pattern for other animations (lines 115, 231, 251).

**Performance impact on TBT:**
- `transform` + `opacity` animate on compositor thread — zero main thread blocking
- `will-change: transform` promotes to GPU layer — no layout or paint on animation frames
- TBT 0ms target is maintained

### Penrose triangle background variant

The Penrose triangle CSS technique (from the reference CodePen) uses the CSS border trick (zero-width/height element with strategic border transparency) combined with layered `::before`/`::after` pseudo-elements. This is more suited to a static decorative element (e.g., section dividers, hero corner decorations) than a repeating background tile.

For a **repeating tessellation background**, stay with the SVG `<pattern>` approach — it tiles cleanly. For a **single Penrose triangle decorative element**, use pure CSS with `clip-path: polygon()` (modern, no border hack needed):

```css
/* Single Penrose triangle — pure CSS, no library */
.penrose-decoration {
  position: relative;
  width: 120px;
  height: 104px;
  /* Three segments built via pseudo-elements and borders */
}
```

The CodePen at https://codepen.io/guestn/pen/AXvKOd (403 on direct fetch — access via browser only) uses the CSS border trick with multiple nested elements. The `clip-path` alternative is cleaner for an Astro component.

### Where to apply

- **Hero/above-the-fold section:** Escher boxes SVG tile at ~8% opacity, slow drift animation. This replaces or layers with the existing tone image (`escharian_stairs_fb.webp` at 12% opacity via `.tone-image` class).
- **Section dividers or cards:** Static Penrose triangle elements as decorative geometry in CSS

---

## Feature 2: Custom Bike Icon on Leaflet Crosshair Marker

### Current implementation

The crosshair is a `L.circleMarker` (RouteMap.astro, line 222–228): radius-6, white stroke, cyan fill, hidden by default, repositioned by `elevation:hover` events. It is purely a position indicator, not a persistent map marker.

### Recommended approach: Replace with `L.marker` + `L.divIcon` (SVG string)

`L.divIcon` accepts any HTML string in its `html` option, including inline SVG. This is the established pattern already used in this codebase for sector badges (line 126–134), restock markers (line 169–174), and photo markers (line 183–188). No plugin required — Leaflet 1.9.4 supports this natively.

```typescript
// Replace the L.circleMarker with a divIcon bike marker
const bikeIcon = L.divIcon({
  className: 'bike-crosshair',   // CSS class for .leaflet-marker-icon override
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
    <!-- Simple bicycle SVG path — hand-authored or from public domain source -->
    <path fill="#22d3ee" stroke="#ffffff" stroke-width="0.5" d="..."/>
  </svg>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],          // center the icon on the GPS coordinate
  popupAnchor: [0, -14]
});

const crosshair = L.marker([0, 0] as [number, number], {
  icon: bikeIcon,
  opacity: 0,                    // hidden until elevation:hover fires
  zIndexOffset: 1000             // render above sector polylines
}).addTo(map);
```

**CSS override needed in RouteMap.astro `<style>`:**

```css
:global(.bike-crosshair) {
  background: transparent !important;
  border: none !important;
}
```

This is the same pattern as the existing `:global(.restock-marker)` and `:global(.photo-marker)` rules (RouteMap.astro lines 19–32).

**Switching from `L.circleMarker` to `L.marker` for visibility toggling:**

`L.circleMarker.setStyle({ opacity: 0 })` is used currently. `L.marker.setOpacity(value)` is the equivalent for a `L.marker`. Update the event listeners:

```typescript
// elevation:hover — show
crosshair.setLatLng([lat, lon]);
crosshair.setOpacity(1);

// elevation:hoverEnd — hide
crosshair.setOpacity(0);
```

**Why `L.divIcon` over `L.icon` (image file):**
- `L.icon` requires an external image file and a Vite asset import. The existing codebase deliberately uses `L.divIcon` everywhere to avoid Vite's broken default icon path issue (noted in RouteMap.astro comment, line 167: "cyan divIcon avoids broken default icon paths in Vite builds").
- `L.divIcon` with inline SVG: zero external requests, no Vite asset path issues, consistent with all other markers in this codebase.

**Why not `leaflet-svgicon` plugin:**
- leaflet-svgicon (github.com/iatkin/leaflet-svgicon) adds complexity and a plugin load for a feature already achievable with Leaflet's built-in `L.divIcon`. The existing codebase has zero Leaflet plugins beyond gesture handling and markercluster — maintain that discipline.

**Bike SVG path:**
The bicycle shape needs to be hand-authored as a compact SVG or taken from a public domain icon (Noun Project CC0, Heroicons, etc.). Target: viewBox="0 0 24 24", under 300 bytes of path data, `#22d3ee` fill to match the existing cyan marker palette.

---

## Feature 3: KOM Segment Visualization on Elevation Profile

### Current state

The annotation plugin already renders sector bands as `box` annotations with `xMin`/`xMax` and semi-transparent fills (ElevationProfile.astro lines 66–82). The plugin is registered and functioning. KOM segments have `startMi` and `endMi` fields in `annotations.json` (confirmed: `kom[0]` keys include `startMi`, `endMi`, `lengthMi`).

### Recommended approach: Separate `box` annotation entries with distinct visual style

Add KOM segment annotations alongside the existing sector annotations in `annotationBoxes`. Use visual differentiation:

| Property | Sector bands (existing) | KOM bands (new) |
|----------|------------------------|-----------------|
| `backgroundColor` | `starColors[stars] + '22'` (per-star color, 13% opacity) | `'#7fff00' + '18'` (~10% chartreuse fill) |
| `borderColor` | `starColors[stars] + '66'` (40% opacity) | `'#7fff0088'` (dashed chartreuse) |
| `borderDash` | not set (solid) | `[4, 4]` (dashed) |
| `borderWidth` | `1` | `2` |
| `label.display` | `false` | `true` (KOM name, small text) |
| `label.content` | — | `kom.name` |
| `label.font.size` | — | `9` |
| `drawTime` | default | `'beforeDatasetsDraw'` (renders behind the line) |

The `borderDash` property is confirmed available in chartjs-plugin-annotation 3.1.0 (verified via official docs). The `label` property on box annotations is confirmed supported: `label.display`, `label.content`, `label.font`, `label.color`, `label.position` are all available.

```typescript
// Add to annotationBoxes object alongside sector_0, sector_1, etc.
annotations.kom.forEach((kom: { name: string; startMi: number; endMi: number }, i: number) => {
  annotationBoxes[`kom_${i}`] = {
    type: 'box',
    xMin: kom.startMi,
    xMax: kom.endMi,
    // yMin/yMax omitted — spans full chart height (confirmed in docs)
    backgroundColor: '#7fff0018',
    borderColor: '#7fff0088',
    borderDash: [4, 4],
    borderWidth: 2,
    drawTime: 'beforeDatasetsDraw',
    label: {
      display: true,
      content: kom.name,
      position: { x: 'start', y: 'start' },
      color: '#7fff00',
      font: { size: 9, family: 'monospace' }
    }
  };
});
```

**Why `box` annotation over `line` annotation:**
KOM segments span a range of miles (e.g., startMi=22.3, endMi=23.8). A `line` annotation marks a single x-value. A `box` annotation with `xMin`/`xMax` correctly represents a segment range. Use the same type as the sector bands for consistency — the visual differentiation (dashed border, chartreuse color, label) distinguishes KOM from sector without adding a different annotation type.

**Why `'#7fff00'` (chartreuse):**
The RouteMap already uses `color: '#7fff00'` with `dashArray: '8, 4'` for KOM polylines (RouteMap.astro line 151). Matching the chart color to the map color creates visual consistency across the two synchronized components.

**No version upgrade needed:** chartjs-plugin-annotation is already at v3.1.0 (the latest release as of October 2024 — confirmed via GitHub releases). No update needed.

**No new import needed:** `AnnotationPlugin` is already imported and registered in `ElevationProfile.astro` (lines 40–41).

---

## Feature 4: Penrose Triangle SVG Favicon

### Current state

`public/favicon.svg` is a placeholder — a dark rectangle with "MK" monospace text (4 lines, verified). It needs to be replaced with a Penrose triangle.

### Recommended approach: Hand-authored SVG, replace `public/favicon.svg` in place

The existing `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` tag (in the site's `<head>`) already serves an SVG favicon. Modern browser support is sufficient: Chrome (full), Firefox (full), Safari 15.6+ (tab icons). The existing ICO fallback pattern recommended for legacy browsers is optional for this project (dark psychedelic gravel race — the audience is not using IE11).

**SVG favicon construction — Penrose triangle geometry:**

A Penrose (impossible) triangle rendered in SVG uses three isometric parallelogram faces arranged to suggest three-dimensional depth. The key insight is that it's three trapezoidal shapes meeting at corners with deliberate overlap creating the optical illusion.

Minimal hand-authored approach:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <!-- Three faces of the impossible triangle -->
  <!-- Face 1: top-left arm (accent-green) -->
  <polygon points="..." fill="oklch(0.85 0.24 145)" />
  <!-- Face 2: right arm (darker green) -->
  <polygon points="..." fill="oklch(0.65 0.20 145)" />
  <!-- Face 3: bottom arm (darkest) -->
  <polygon points="..." fill="oklch(0.45 0.16 145)" />
</svg>
```

Use the site's `--color-accent-green` (`oklch(0.85 0.24 145)`) as the primary color for the lightest face, with two darker tints for depth. This ties the favicon to the visual identity.

**Why hand-authored over a library:**
- The favicon is a one-time static SVG asset, ~500 bytes
- No runtime dependency — it is a file in `public/`
- The geometry is well-understood: three isometric faces, each a parallelogram, arranged in a cycle. At 32×32 it benefits from simplified geometry rather than pixel-perfect detail.

**Practical geometry for 32×32 viewport:**

The standard Penrose triangle at small sizes uses three "arm" shapes arranged around a central point. Each arm is a parallelogram with corners at approximately:
- Center: `(16, 16)` of the viewport
- The triangle's outer vertices at the three equilateral triangle corners

Reference: the Wikipedia SVG file `Penrose-dreieck.svg` (526×477 nominal, 1KB file size) shows the canonical construction. At 32×32 the geometry simplifies to 3 `<polygon>` elements with 4 points each.

**No additional `<link>` tags needed** — the existing favicon.svg reference in the layout's `<head>` already serves SVG. Replacing the file is sufficient.

---

## Full v3.0 Dependency Delta

| Package | Action | Version | Reason |
|---------|--------|---------|--------|
| All existing packages | No change | — | No new capabilities needed |
| Any animation library (`motion`, GSAP) | DO NOT ADD | — | CSS `@keyframes` + `transform` is sufficient and keeps TBT 0ms |
| Any SVG library (svg.js, snap.svg) | DO NOT ADD | — | Static declarative SVG; no manipulation needed at runtime |
| `leaflet-svgicon` | DO NOT ADD | — | `L.divIcon` with inline SVG HTML is sufficient; matches existing codebase pattern |
| Any icon library | DO NOT ADD | — | Bike SVG path is hand-authored; adding a dependency for one icon is wasteful |

**Net new mandatory dependencies: zero.**

---

## Integration Points with Existing Stack

| Existing Component | v3.0 Change | Integration Note |
|---------------------|-------------|-----------------|
| `global.css` | Add `.escher-overlay` class using inline SVG data URI + CSS animation | Same pattern as existing `.grain-overlay` at line 87 |
| `src/layouts/BaseLayout.astro` | Add `<div class="escher-overlay">` after the existing grain overlay div | `z-index: 9998` (below grain at 9999) |
| `RouteMap.astro` | Replace `L.circleMarker` with `L.marker` + `L.divIcon` bike SVG; update `setStyle`→`setOpacity` calls | Same event listener structure; same `elevation:hover` / `elevation:hoverEnd` events |
| `ElevationProfile.astro` | Add `kom_${i}` annotation boxes in the `annotationBoxes` loop, after sector loop | Uses already-registered `AnnotationPlugin`; no new import |
| `public/favicon.svg` | Replace placeholder "MK" text with Penrose triangle polygon SVG | In-place file replacement; no layout/head changes needed |

---

## What NOT to Add

| Library / Approach | Reason to avoid |
|-------------------|----------------|
| Any JS animation library (`motion`, GSAP, anime.js) | CSS `@keyframes` with `transform`/`opacity` is compositor-safe and achieves the same visual result. Adding a library for CSS-equivalent work introduces bundle weight and risks TBT regression. |
| `leaflet-svgicon` plugin | The feature is already in `L.divIcon`'s `html` option. The entire codebase uses `L.divIcon` consistently. One more plugin to load, maintain, and keep compatible is not justified. |
| External SVG sprite file for bike icon | Requires a Vite asset import or `/public` static path — the existing codebase explicitly notes Vite's broken default icon path issue (RouteMap.astro line 167). `L.divIcon` with inline SVG avoids this entirely. |
| Base64-encoded SVG in data URI | URL-encoding (not base64) is the correct approach for SVG in CSS `background-image`. Base64 is larger and provides no benefit for SVG text content. The existing `grain-overlay` uses URL-encoded SVG. |
| SMIL animations inside SVG | SMIL `<animate>` / `<animateTransform>` are browser-supported but less predictable for `prefers-reduced-motion` enforcement than CSS `@keyframes`. Use CSS animations only. |
| `chartjs-plugin-datalabels` or any other Chart.js plugin | The annotation plugin's built-in `label` property on box annotations handles KOM segment labeling. No additional plugin needed. |

---

## Performance Impact Assessment

| Change | TBT Impact | Compositor-safe? | Notes |
|--------|-----------|-----------------|-------|
| Escher overlay CSS animation | None | Yes | `transform` on overlay div; `will-change: transform` promotes to GPU layer |
| `L.divIcon` bike SVG marker | None | N/A | Renders via DOM; no JS animation |
| KOM annotation boxes | None | N/A | `chart.update('none')` (no animation) — same as existing sector band updates |
| Penrose favicon SVG | None | N/A | Static file; loaded once by browser tab |

All four features maintain the existing Lighthouse mobile 96 / TBT 0ms baseline.

---

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| Zero new npm deps needed | HIGH | Verified against existing codebase APIs: Leaflet 1.9.4 `L.divIcon` docs, chartjs-plugin-annotation 3.1.0 box annotation docs, CSS animation capabilities |
| SVG `<pattern>` data URI approach | HIGH | Existing `grain-overlay` in `global.css:87` uses identical technique |
| `L.divIcon` accepts inline SVG string | HIGH | Leaflet official docs (custom icons guide); existing codebase uses `L.divIcon` for all 4 marker types already |
| `chartjs-plugin-annotation` box label support | HIGH | Official docs at chartjs.org/chartjs-plugin-annotation/latest verified: `label.display`, `label.content`, `label.font` confirmed |
| `chartjs-plugin-annotation` 3.1.0 is current | HIGH | GitHub releases verified: v3.1.0 released October 16, 2024 — matches installed version in package.json |
| `borderDash` on box annotations | HIGH | Official docs explicitly list `borderDash: number[]` as option |
| `yMin`/`yMax` omit for full-height box | HIGH | Official docs: "if not specified, the box is expanded out to the edges in the respective direction" |
| CSS `transform` animation is compositor-safe | HIGH | MDN, CSS-Tricks, Chrome DevTools docs — `transform` and `opacity` are GPU-composited |
| SVG favicon browser support | MEDIUM | caniuse.com: ~72% browsers; Chrome full, Firefox full, Safari 15.6+ partial. The existing `favicon.svg` already uses SVG — this is a content swap, not a format change. |

---

## Sources

- Leaflet custom icons guide: https://leafletjs.com/examples/custom-icons/
- Leaflet DivIcon reference: https://leafletjs.com/reference.html#divicon-l-divicon
- Data URI SVG icons with Leaflet (Gist): https://gist.github.com/clhenrick/6791bb9040a174cd93573f85028e97af
- chartjs-plugin-annotation box annotations: https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/types/box.html
- chartjs-plugin-annotation line annotations: https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/types/line.html
- chartjs-plugin-annotation GitHub releases: https://github.com/chartjs/chartjs-plugin-annotation/releases
- Escher boxes SVG reference: https://s3-us-west-2.amazonaws.com/s.cdpn.io/4273/boxes.svg
- Penrose triangle CSS CodePen: https://codepen.io/guestn/pen/AXvKOd (403 on server fetch; view in browser)
- SVG favicon browser support: https://caniuse.com/link-icon-svg
- How to favicon in 2026: https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs
- Optimizing SVGs in data URIs: https://codepen.io/tigt/post/optimizing-svgs-in-data-uris
- SVG animation performance: https://www.crmarsh.com/svg-performance/
