# Technology Stack — v4.0 Route Update + UX Overhaul

**Project:** MK Ultra Gravel — v4.0 milestone
**Researched:** 2026-03-29
**Scope:** Stack additions/changes for 8 new features: map reset button, photo map thumbnails with PhotoSwipe lightbox, larger zoom controls, card size equalization, Grinduro-style explainer, Penrose title animation, 100mi GPX replacement, new photo pipeline processing
**Confidence:** HIGH — all verified against Leaflet 1.9.4 official docs, PhotoSwipe 5.4.4 official docs, and existing codebase patterns

---

## Executive Summary

All v4.0 features are achievable with **zero new npm dependencies**. The existing stack (Leaflet 1.9.4, PhotoSwipe 5.4.4, Chart.js 4.5.1, Tailwind v4, sharp 0.34.5) already provides every API primitive required. Three features are CSS-only, two are Leaflet API (`L.Control.extend`, `L.DomEvent`), one bridges Leaflet and PhotoSwipe via `loadAndOpen()` with a `dataSource` array, and two are pipeline re-runs with no code changes.

| Feature | Approach | New deps |
|---------|----------|----------|
| Map reset button | Custom `L.Control.extend()` calling `map.fitBounds(routeLine.getBounds())` | None |
| Photo map thumbnails + PhotoSwipe lightbox | Replace divIcon with thumbnail `<img>`, open PhotoSwipe via `loadAndOpen(index, dataSource)` | None |
| Larger zoom controls | CSS overrides on `.leaflet-control-zoom-in`, `.leaflet-control-zoom-out` | None |
| Gravel sector card resize | CSS grid equalization, match KOM card structure | None |
| Grinduro-style explainer | Static Astro component, Tailwind + existing design tokens | None |
| Penrose triangle above title | CSS `@keyframes` animation on existing inline SVG, compositor-safe (`transform`, `opacity`) | None |
| 100mi GPX replacement | Drop new `.gpx` file, re-run `npm run data` pipeline | None |
| Two new photos | Drop in `images/`, pipeline auto-processes via sharp | None |

**Net new mandatory dependencies: zero.**

---

## Feature 1: Map Reset Button (Custom Leaflet Control)

### Why not leaflet.zoomhome

The [leaflet.zoomhome](https://github.com/torfsen/leaflet.zoomhome) plugin adds a "Home" button to the zoom control. However, it:

- **Requires Font Awesome 4.x** as a peer dependency (the project uses zero icon libraries)
- **Has no ESM build** (distributed as minified UMD from 2020)
- **Last committed September 2020** — 6 years stale
- **Does more than needed** — replaces the entire zoom control with a 3-button variant

For a single button calling `map.fitBounds()`, a custom control is 15-20 lines of code with zero dependencies.

### Recommended approach: Custom `L.Control.extend()`

Leaflet's official [Extending Controls tutorial](https://leafletjs.com/examples/extending/extending-3-controls.html) documents this pattern. The API:

```javascript
const ResetControl = L.Control.extend({
  options: { position: 'topleft' },

  onAdd(map) {
    const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
    const button = L.DomUtil.create('a', 'leaflet-control-reset', container);
    button.href = '#';
    button.title = 'Reset view';
    button.setAttribute('role', 'button');
    button.setAttribute('aria-label', 'Reset map to full route view');
    button.innerHTML = '&#8634;'; // Unicode reset arrow, or inline SVG

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.on(button, 'click', (e) => {
      L.DomEvent.preventDefault(e);
      map.fitBounds(routeLine.getBounds(), { padding: [20, 20] });
      // Also dispatch CustomEvent to reset elevation profile if needed
      window.dispatchEvent(new CustomEvent('map:resetView'));
    });

    return container;
  }
});

new ResetControl().addTo(map);
```

**Key implementation details:**

| Concern | Solution |
|---------|----------|
| Position | `'topleft'` — adjacent to existing zoom control |
| Styling | Add `leaflet-bar` class to get Leaflet's default button styling, then override in `global.css` to match dark theme (already done for `.leaflet-control-zoom a`) |
| Click propagation | `L.DomEvent.disableClickPropagation(container)` prevents map click-through |
| Reset scope | Call `map.fitBounds(routeLine.getBounds(), { padding: [20, 20] })` — same as initial fit on line 80 of RouteMap.astro |
| Elevation sync | Dispatch `map:resetView` CustomEvent; ElevationProfile listens and resets x-axis scale to full range |
| Icon | Unicode `&#8634;` (clockwise open circle arrow) or inline SVG — no icon library needed |
| Accessibility | `role="button"`, `aria-label`, `title` attributes |

**Confidence: HIGH** — `L.Control.extend()` is the documented first-party pattern. The existing codebase already uses `L.DomEvent` for sector hover/click handling.

### Sources

- [Leaflet Extending Controls tutorial](https://leafletjs.com/examples/extending/extending-3-controls.html)
- [Leaflet L.Control reference](https://leafletjs.com/reference.html#control)

---

## Feature 2: Photo Map Thumbnails + PhotoSwipe Lightbox

### Current state

Photo markers in `RouteMap.astro` (lines 188-204) use a 10x10px cyan square `L.divIcon`. Clicking opens a popup with an `<img>` linking to the full image in a new tab (`target="_blank"`).

### Target state

Photo markers should show a small thumbnail preview (e.g., 48x48 or 64x64). Clicking opens the image in the existing PhotoSwipe lightbox instead of a new tab.

### Recommended approach: Two-part implementation

#### Part A: Thumbnail marker icons

Replace the cyan square divIcon with a thumbnail-bearing divIcon:

```javascript
const photoIcon = L.divIcon({
  className: 'photo-marker',
  html: `<img src="/images/thumbs/${thumbFilename}"
              width="48" height="48"
              style="object-fit:cover;border:2px solid #22d3ee;border-radius:2px;"
              loading="lazy" alt="">`,
  iconSize: [48, 48],
  iconAnchor: [24, 24],
  popupAnchor: [0, -28]
});
```

The thumbnail WebP files already exist in `public/images/thumbs/` (generated by `generate-thumbnails.js` at 400px width). The 48px display is well within that budget.

**Cluster icon**: The existing `markerClusterGroup` `iconCreateFunction` stays as-is (shows count badge). No change needed.

#### Part B: Open PhotoSwipe instead of new tab

PhotoSwipe 5.4.4 supports [programmatic opening via `loadAndOpen(index, dataSource)`](https://photoswipe.com/methods/). Instead of binding popups, bind click handlers that open PhotoSwipe with a `dataSource` array:

```javascript
// Build dataSource array from photos.json (already fetched in RouteMap.astro)
const photoDataSource = photos.map(photo => ({
  src: `/images/${photo.filename}`,
  width: photo.width,
  height: photo.height,
  alt: `Route photo at mile ${photo.mi}`
}));

// Initialize PhotoSwipe lightbox with array data source
const mapLightbox = new PhotoSwipeLightbox({
  dataSource: photoDataSource,
  pswpModule: () => import('photoswipe'),
  bgOpacity: 0.95,
});

// Use thumbEl filter for zoom animation from map thumbnail
mapLightbox.addFilter('thumbEl', (thumbEl, data, index) => {
  const marker = photoMarkers[index];
  if (marker) {
    const el = marker.getElement();
    const img = el?.querySelector('img');
    if (img) return img;
  }
  return thumbEl;
});

mapLightbox.init();

// Bind click to each photo marker
photoMarkers.forEach((marker, i) => {
  marker.on('click', () => {
    mapLightbox.loadAndOpen(i);
  });
});
```

**Key implementation details:**

| Concern | Solution |
|---------|----------|
| Data source | `photos.json` already has `width` and `height` fields (added by `generate-thumbnails.js`) |
| Opening animation | PhotoSwipe `thumbEl` filter finds the marker's thumbnail `<img>` for zoom-from-thumbnail transition. Falls back to fade if marker is clustered/hidden. |
| Popup removal | Remove `.bindPopup()` calls from photo markers — click now opens lightbox directly |
| Gallery coexistence | This is a separate `PhotoSwipeLightbox` instance from the PhotoGallery component's instance. PhotoSwipe 5 supports [multiple independent instances](https://photoswipe.com/getting-started/). |
| Dynamic import | `pswpModule: () => import('photoswipe')` — same lazy-load pattern as existing PhotoGallery component |
| Cluster handling | When a cluster is clicked, `markerClusterGroup` with `zoomToBoundsOnClick: true` zooms in. Individual marker click fires only on unclustered markers. No conflict. |

**Confidence: HIGH** — `loadAndOpen(index, dataSource)` is the [documented API](https://photoswipe.com/methods/). The `thumbEl` filter is documented on the [data sources page](https://photoswipe.com/data-sources/). PhotoSwipe 5.4.4 is already in `package.json`.

### Sources

- [PhotoSwipe Methods: loadAndOpen](https://photoswipe.com/methods/)
- [PhotoSwipe Data Sources: Separate DOM and data](https://photoswipe.com/data-sources/)
- [PhotoSwipe Opening Transition](https://photoswipe.com/opening-or-closing-transition/)
- [PhotoSwipe GitHub Issue #1848: Open from external button](https://github.com/dimsemenov/PhotoSwipe/issues/1848)

---

## Feature 3: Larger Map Zoom Controls

### Current state

Leaflet's default zoom control buttons are ~26x26px (Leaflet's default). The project already overrides their colors in `global.css` (lines 200-207) for the dark theme.

### Recommended approach: CSS-only resize

Extend the existing `.leaflet-control-zoom a` overrides in `global.css`:

```css
.leaflet-control-zoom a {
  width: 36px !important;
  height: 36px !important;
  line-height: 36px !important;
  font-size: 18px !important;
  /* existing dark theme overrides remain */
  background: oklch(0.18 0.01 250) !important;
  color: oklch(0.85 0.01 90) !important;
  border-color: oklch(0.25 0.01 250) !important;
}
.leaflet-control-zoom a:hover {
  background: oklch(0.25 0.01 250) !important;
}
```

The `!important` declarations are already used in the existing overrides (Leaflet CSS is in the lowest `@layer leaflet` priority, but these selectors have equal specificity, so `!important` is the established pattern).

**Size rationale:** 36px is a comfortable touch target (Apple HIG recommends 44pt minimum; 36px on a high-DPI display is close). Going larger risks overlapping the reset button or attribution. 40px is an option if testing shows 36px feels small.

**Confidence: HIGH** — Pure CSS, no API surface. The existing dark theme overrides prove this pattern works.

---

## Feature 4: Gravel Sector Cards Resized to Match KOM Cards

### Current state analysis

Both card components (`GravelSectors.astro` and `KomSegments.astro`) use identical outer structure:

- `classified-border bg-bg-surface card-hover` wrapper
- Optional `coverPhoto` image at `aspect-video` (16:9)
- `p-4` content area

The visual difference: GravelSectors cards are in a `md:col-span-2` column (wider), while KomSegments cards are in a single column. Within the card content, GravelSectors uses a flex row for title + stars, while KomSegments uses a 2-column grid for stats.

### Recommended approach: Unify card inner structure

**Option A (recommended): Harmonize the content layout**

Make GravelSectors cards use the same `grid grid-cols-2` stat layout as KomSegments:

```astro
<div class="p-4">
  <h3 class="text-accent-white text-lg">{sector.name}</h3>
  <div class="grid grid-cols-2 gap-x-6 gap-y-1 text-text-muted text-sm mt-1">
    <span style={`color: ${starColors[sector.stars]}`}>
      {"★".repeat(sector.stars)}{"☆".repeat(5 - sector.stars)}
    </span>
    <span>{sector.lengthMi.toFixed(1)} mi</span>
    <span>Mile {sector.startMi}</span>
    <span>&nbsp;</span>
  </div>
</div>
```

**Option B: CSS subgrid for cross-card alignment**

CSS subgrid (97%+ browser support as of 2025) allows child elements of grid items to align across siblings. However, this is overkill here because:

- Sector cards and KOM cards are in different grid columns (not siblings in the same grid row)
- The goal is visual consistency, not pixel-aligned cross-card rows
- Tailwind v4 supports `subgrid` via `grid-rows-subgrid` / `grid-cols-subgrid` if needed later

**Recommendation: Option A.** Harmonize the HTML structure and let the shared CSS classes (`classified-border`, `card-hover`, `aspect-video`, `p-4`) do the work. No CSS framework features needed.

**Confidence: HIGH** — This is a markup refactor using existing Tailwind utilities.

---

## Feature 5: Grinduro-Style Event Format Explainer

### Current state

The site has `MkUltraExplainer.astro` — a static content component explaining the MK Ultra name. The Grinduro explainer follows the same pattern: static content component with the project's brutalist design tokens.

### Recommended approach: Static Astro component

Create `GrinduroExplainer.astro` using existing design primitives:

- `classified-border` wrapper with `p-6 md:p-8`
- `stamp` for decorative labels
- `text-text-body`, `text-text-muted` for body text
- `tone-image` for background texture

No new CSS patterns, no new libraries. The existing `MkUltraExplainer.astro` is the template.

**Content structure for Grinduro format:** The Grinduro event format (mixed timed segments within a larger ride) maps naturally to a "how it works" section with numbered steps or a comparison table.

**Confidence: HIGH** — Copy-paste of an existing component pattern.

---

## Feature 6: Penrose Triangle Above Page Title with Animation

### Current state

The Penrose triangle SVG already exists as the favicon (`public/favicon.svg`). The Escher tessellation uses CSS `@keyframes` animation (`escher-drift` in `global.css`, lines 253-263). The hero section has the glitch text animation.

### Recommended approach: Inline SVG with CSS animation

Place the Penrose triangle SVG inline above the `<h1>` in the hero section. Animate with compositor-safe properties only (`transform`, `opacity`) to maintain TBT 0ms:

```css
@keyframes penrose-float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50%      { transform: translateY(-8px) rotate(3deg); }
}

.penrose-hero {
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
  animation: penrose-float 6s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .penrose-hero { animation: none; }
}
```

**Key details:**

| Concern | Solution |
|---------|----------|
| Performance | `transform` + `opacity` are compositor-only — no layout/paint, TBT stays 0ms |
| Reduced motion | `prefers-reduced-motion: reduce` disables animation (matches existing pattern in `global.css`) |
| SVG source | Copy from `public/favicon.svg`, adjust `viewBox` and colors for hero display size |
| Sizing | 80px on mobile, could scale up via `md:w-24 md:h-24` for desktop |

**Confidence: HIGH** — Same CSS animation pattern as existing `escher-drift` and `card-hover`.

---

## Feature 7: 100mi GPX Route Replacement

### Current state

The prebuild pipeline (`scripts/generate-data.js`) runs:
1. `parse-gpx.js` — reads `*.gpx` from project root, outputs `public/data/route-data.json`
2. `resolve-annotations.js` — reads annotations config, outputs `public/data/annotations.json`
3. `match-photos.js` — matches photo EXIF GPS to route, outputs `public/data/photos.json`
4. `generate-thumbnails.js` — creates WebP thumbs in `public/images/thumbs/`
5. `assign-card-photos.js` — assigns nearest photos to sector/KOM cards, generates card crops

### Recommended approach: Drop-in replacement

1. Replace the existing `.gpx` file in the project root with the new 100mi GPX from Strava
2. Run `npm run data` to re-process the entire pipeline
3. Verify `route-data.json` has `meta.totalMi` near 100
4. Verify `annotations.json` sector/KOM mile markers still resolve correctly

**Pipeline code changes:** Likely none. The `parse-gpx.js` script is GPX-agnostic. The elevation profile x-axis already has `max: 100` (line 196 in ElevationProfile.astro), which was future-proofed for the 100mi route.

**Risk:** Annotation `startMi`/`endMi` values in the annotations config may need updating if sector positions shifted in the new route. This is a data concern, not a stack concern.

**Confidence: HIGH** — Pipeline designed for GPX swap. See memory note: "Route extended to 100mi; awaiting updated GPX from Strava."

---

## Feature 8: Two New Photos Processed Through Pipeline

### Current state

The pipeline auto-discovers images in `images/` directory, reads EXIF GPS data via `exifr`, matches to route points, generates thumbnails via `sharp`, and assigns card crops.

### Recommended approach: Drop-in

1. Add the two new `.jpg` files to `images/` directory
2. Run `npm run data`
3. Pipeline auto-generates:
   - `public/images/thumbs/*.webp` (400px width thumbnails)
   - Updated `public/data/photos.json` with GPS coordinates and dimensions
   - Updated `public/data/annotations.json` if photos are nearer to sectors/KOMs than existing covers

**Prerequisite:** New photos must have EXIF GPS tags. If shot with a phone, they almost certainly do. If not, `match-photos.js` will skip them with a warning.

**Confidence: HIGH** — Existing pipeline, no changes needed.

---

## What NOT to Add (And Why)

| Temptation | Why Not |
|------------|---------|
| **leaflet.zoomhome** plugin | Requires Font Awesome 4.x, no ESM build, last updated 2020. Custom `L.Control.extend()` is 15 lines with zero deps. |
| **Leaflet.EasyButton** plugin | Another abstraction over `L.Control.extend()`. Adds a dependency for something that's trivial in vanilla Leaflet. |
| **Icon library** (Font Awesome, Lucide, Heroicons) | Unicode symbols and inline SVG cover all needs. The project already uses inline SVG for the bike crosshair (Lucide-derived, MIT). No bundle cost. |
| **CSS subgrid** for card equalization | Overkill — cards aren't siblings in the same grid row. Harmonizing HTML structure with existing Tailwind utilities is simpler and more maintainable. |
| **Leaflet popup plugin** for photo preview | Replacing popups entirely with PhotoSwipe lightbox is cleaner than enhancing popups. |
| **Additional thumbnail sizes** | The existing 400px WebP thumbnails serve both the gallery and the 48px map markers. Generating a separate 48px size would save ~2KB per image but adds pipeline complexity for negligible gain. |

---

## Stack Summary Table

| Layer | Technology | Version | Status |
|-------|-----------|---------|--------|
| Framework | Astro | ^6.1.1 | No change |
| CSS | Tailwind v4 | ^4.2.2 | No change |
| Map | Leaflet | ^1.9.4 | No change (use existing `L.Control.extend` API) |
| Map plugins | leaflet-gesture-handling | ^1.2.2 | No change |
| Map plugins | leaflet.markercluster | ^1.5.3 | No change |
| Charts | Chart.js | ^4.5.1 | No change |
| Charts | chartjs-plugin-annotation | ^3.1.0 | No change |
| Lightbox | PhotoSwipe | ^5.4.4 | No change (use existing `loadAndOpen` + `dataSource` API) |
| Image processing | sharp | ^0.34.5 | No change |
| EXIF | exifr | ^7.1.3 | No change |
| GPX | gpxparser | ^3.0.8 | No change |

**Total new packages: 0**
**Total bundle size change: 0 bytes**
**TBT impact: 0ms** (all animations compositor-safe, all new code is in existing lazy-loaded chunks)

---

## Integration Points Between Features

These features have cross-cutting concerns that should be implemented together:

```
Map Reset Button ──> dispatches map:resetView
                          │
Elevation Profile ──> listens for map:resetView, resets x-axis scale
                          │
Photo Thumbnails ──> use same photos.json data as PhotoGallery
                          │
PhotoSwipe Map ───> separate instance from PhotoGallery lightbox
                          │
GPX Replacement ──> triggers re-run of full pipeline
                          │
New Photos ────────> pipeline auto-includes in photos.json
```

**Critical ordering:** GPX replacement and new photos must happen first (pipeline produces data), then UI features can be built against the new data.

---

## Sources

### Leaflet (HIGH confidence — official docs)
- [Extending Controls tutorial](https://leafletjs.com/examples/extending/extending-3-controls.html)
- [L.Control reference](https://leafletjs.com/reference.html#control)
- [L.DomEvent reference](https://leafletjs.com/reference.html#domevent)
- [map.fitBounds reference](https://leafletjs.com/reference.html#map-fitbounds)

### PhotoSwipe (HIGH confidence — official docs)
- [Methods: loadAndOpen](https://photoswipe.com/methods/)
- [Data Sources: Separate DOM and data](https://photoswipe.com/data-sources/)
- [Opening/closing transition](https://photoswipe.com/opening-or-closing-transition/)

### Leaflet Zoom Control Styling (MEDIUM confidence — community patterns verified against existing codebase)
- [Styling Leaflet zoom controls (CodePen)](https://codepen.io/leemark/pen/dGgqLZ)
- [Leaflet zoom control customization (Sooi)](https://sooi.pk/2024/05/24/how-to-customize-the-appearance-of-the-zoom-control-leaflet-js-code-examples/)

### CSS Subgrid (HIGH confidence — MDN, not recommended for this use case)
- [CSS Subgrid browser support 2025](https://www.frontendtools.tech/blog/mastering-css-grid-2025)
