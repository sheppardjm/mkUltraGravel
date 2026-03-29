# Architecture Patterns -- v4.0 Route Update + UX Overhaul

**Domain:** Static gravel cycling event website (Astro 6 + Leaflet + Chart.js)
**Project:** MK Ultra Gravel
**Researched:** 2026-03-29
**Focus:** How 8 v4.0 features integrate with the v3.0 shipped architecture
**Overall confidence:** HIGH (all features traced to specific files, line ranges, and integration points by direct codebase inspection)

---

## Existing Architecture Snapshot (v3.0 Baseline)

### Component Inventory

| Component | File | Init Pattern | Data Source |
|-----------|------|--------------|-------------|
| RouteMap | `src/components/RouteMap.astro` | Lazy scroll/IntersectionObserver -> `initMap()` async | `/data/route-data.json`, `/data/annotations.json`, `/data/photos.json` fetched at runtime |
| ElevationProfile | `src/components/ElevationProfile.astro` | Lazy scroll/IntersectionObserver -> `initElevation()` async | `/data/route-data.json`, `/data/annotations.json` fetched at runtime |
| GravelSectors | `src/components/GravelSectors.astro` | SSR/build-time | `annotations.json` via `readFileSync` |
| KomSegments | `src/components/KomSegments.astro` | SSR/build-time | `annotations.json` via `readFileSync` |
| PhotoGallery | `src/components/PhotoGallery.astro` | SSR template + runtime PhotoSwipe init | `photos.json` via `readFileSync` (SSR), PhotoSwipe lightbox init on `astro:page-load` |
| RestockPoints | `src/components/RestockPoints.astro` | SSR/build-time | `annotations.json` via `readFileSync` |
| MkUltraExplainer | `src/components/MkUltraExplainer.astro` | Static HTML | None |
| EventInfoBlock | `src/components/EventInfoBlock.astro` | Static HTML | None (hardcoded URLs) |
| CountdownTimer | `src/components/CountdownTimer.astro` | Runtime JS | None (hardcoded date) |
| BaseLayout | `src/layouts/BaseLayout.astro` | Astro layout | None |

### CustomEvent Bus (Established v2.0, Unchanged in v3.0)

```
elevation:hover      { lat, lon }            ElevationProfile -> RouteMap    (crosshair position)
elevation:hoverEnd   (no payload)            ElevationProfile -> RouteMap    (hide crosshair)
elevation:sectorClick { sectorIndex }        ElevationProfile -> RouteMap    (zoom to sector)
map:sectorHover      { sectorIndex | null }  RouteMap -> ElevationProfile   (highlight band)
map:sectorClick      { sectorIndex }         RouteMap -> ElevationProfile   (dim others, highlight one)
```

All listeners registered inside `initMap()` / `initElevation()` async functions with `AbortController` + `{ signal }` cleanup.

### Build Pipeline

```
scripts/generate-data.js (coordinator -- runs steps sequentially):
  1. Copy images/ -> public/images/
  2. parse-gpx.js         -> public/data/route-data.json + public/mk-ultra.gpx
  3. resolve-annotations.js -> public/data/annotations.json
  4. match-photos.js      -> public/data/photos.json
  5. generate-thumbnails.js -> public/images/thumbs/*.webp + enriches photos.json (width/height)
  6. assign-card-photos.js -> annotations.json (enriched with coverPhoto) + public/images/cards/*.webp
  7. convert-hero.js      -> public/images/hero.webp
  8. convert-tone-images.js -> public/tone/*.webp
```

**Critical pipeline detail:** `parse-gpx.js` reads from `MK Ultra.gpx` (hardcoded at line 29 as `const GPX_SOURCE = path.join(ROOT, 'MK Ultra.gpx')`). The output `route-data.json` contains `{ meta: { totalMi, elevationGainFt, trackpoints }, track: [...] }`. Every downstream script depends on `route-data.json` existing and being correct.

### starColors Map (3 Independent Copies)

The `starColors` constant exists identically in three files (updated to yellow-to-red spectrum in v3.0):

| File | Line Range | Context |
|------|-----------|---------|
| `RouteMap.astro` | Lines 83-89 | Runtime JS in `initMap()` |
| `ElevationProfile.astro` | Lines 57-63 | Runtime JS in `initElevation()` |
| `GravelSectors.astro` | Lines 15-21 | Build-time Astro frontmatter |

v4.0 does not change these values, but any sector data changes from the GPX swap propagate through the same color system.

### Page Layout in index.astro

```
BaseLayout
  grain-overlay (fixed, z-9999)
  escher-overlay (fixed, z-9998)
  main
    #hero          -- tone-image bg, h1 "MK Ultra Gravel", countdown, register CTA
    MkUltraExplainer -- declassified section
    #route         -- tone-image bg, RouteMap + ElevationProfile
    register CTA   -- mid-page registration block
    #sectors       -- GravelSectors (2-col) + KomSegments + RestockPoints (1-col)
    #photos        -- tone-image bg, PhotoGallery
    #info          -- tone-image bg, EventInfoBlock
```

---

## Feature 1: GPX Replacement (100mi Route)

**What:** Replace `MK Ultra.gpx` (80mi, tracked) with `MK_Ultra.gpx` (100mi, untracked). Re-run entire pipeline. Update all downstream references.

**Integration points and exact changes:**

### 1a. GPX Source File

`scripts/parse-gpx.js` line 29:
```javascript
const GPX_SOURCE = path.join(ROOT, 'MK Ultra.gpx');
```

Two options:
- **Option A (rename):** Rename `MK_Ultra.gpx` to `MK Ultra.gpx`, overwriting the old file. Zero code changes -- pipeline reads the same filename.
- **Option B (update reference):** Change `parse-gpx.js` line 29 to read `MK_Ultra.gpx` instead.

**Recommendation: Option A (rename).** The filename `MK Ultra.gpx` is the canonical source name baked into the pipeline. Renaming avoids touching pipeline code and eliminates risk of inconsistency. The old 80mi GPX is tracked in git history if ever needed.

### 1b. Pipeline Re-run

After GPX replacement, run `node scripts/generate-data.js`. This regenerates:
- `public/data/route-data.json` -- new trackpoints, new `meta.totalMi` (~100), new `meta.elevationGainFt`
- `public/mk-ultra.gpx` -- copied from source
- `public/data/annotations.json` -- re-resolved coordinates from new trackpoints (annotation mile markers are hardcoded in `resolve-annotations.js` lines 118-155; they reference mile positions that must still exist on the new route)
- `public/data/photos.json` -- re-resolved photo coordinates from new trackpoints

### 1c. Annotation Mile Marker Validation

`resolve-annotations.js` hardcodes sector/KOM/restock mile positions:
```
Sectors: 23.4, 39.5, 43.0, 50.7, 58.7, 83.55
KOMs: 21.9, 37.6, 78.55
Restocks: 37.3, 46.3, 76.1
```

Maximum annotation mile = 83.55 + 0.6 = 84.15 (Down Jeep end). The 80mi route ended at ~98.23mi (per existing route-data.json meta). The new 100mi route will extend further. All annotations fall within both route lengths, so no clamping warnings will appear. But the physical path may have shifted -- verify that annotation GPS coordinates still land on-route after re-running.

### 1d. Photo Manifest Validation

`photo-manifest.js` has 53 photos with mile markers from 19.6 to 80.2. Maximum photo mile = 80.2. Both the old and new routes cover this range. Any new photos (Feature 7) will be added with mile markers that must exist on the new 100mi route.

### 1e. index.astro Route Stats

`index.astro` line 249:
```astro
{Math.round(routeMeta.totalMi)} miles -- {routeMeta.elevationGainFt.toLocaleString()} ft elevation gain
```
This reads `routeDataJson.meta` at build time (lines 5-7). The pipeline re-run updates `route-data.json`, so this auto-updates. No code change needed.

### 1f. ElevationProfile X-Axis

`ElevationProfile.astro` line 196:
```javascript
max: 100,  // forward-compatible with 100mi route
```
Already set to 100. No change needed.

### 1g. Downstream File Changes (Committed)

After pipeline re-run, these files will have new content to commit:
- `public/data/route-data.json`
- `public/data/annotations.json`
- `public/data/photos.json`
- `public/mk-ultra.gpx`
- Potentially regenerated thumbnails/card images (if photo coordinates shift enough to change assignment)

**Risk level:** MEDIUM. The GPX swap is the foundation -- all other data-dependent features rely on correct pipeline output. Verify pipeline completes without errors and spot-check annotation positions on the map.

---

## Feature 2: New Photos (Down Jeep + Billie Helmer B&W)

**What:** Add 2 new photos to the pipeline, producing new entries in `photos.json` and gallery.

**Integration points:**

### 2a. Image Files

Place new `.jpg`/`.png` files in the repo-root `images/` directory. The pipeline copies `images/` to `public/images/` at step 1 of `generate-data.js` (line 26: `fs.readdirSync(srcImagesDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))`).

### 2b. Photo Manifest

Add entries to `scripts/photo-manifest.js` in the correct mile-marker sorted position:

```javascript
// Down Jeep sector photo -- mi ~83-84 (within Down Jeep sector at 83.55-84.15)
{ filename: 'new-down-jeep-photo.jpg', mi: 83.8 },
// Billie Helmer B&W -- mi ~21-22 (within Billie Helmer KOM at 21.9-22.59)
{ filename: 'billie-helmer-bw.jpg', mi: 22.0 },
```

The manifest is sorted by mile marker. Insert at the appropriate position.

### 2c. Pipeline Re-run

`node scripts/generate-data.js` will:
1. Copy new images to `public/images/`
2. `match-photos.js` reads manifest, resolves GPS from `route-data.json`, writes `photos.json` (now 55 entries)
3. `generate-thumbnails.js` creates 400px WebP thumbs in `public/images/thumbs/`
4. `assign-card-photos.js` may assign new photos as `coverPhoto` on annotations if they are closer (by Haversine distance) to a sector/KOM midpoint than existing cover photos

### 2d. Downstream Consumers

- **PhotoGallery.astro:** SSR reads `photos.json` at build time. New photos appear in the grid automatically. PhotoSwipe lightbox discovers all `.gallery-item` children. No code change.
- **RouteMap.astro:** Runtime fetches `photos.json`. New photo markers appear in cluster group automatically. No code change.
- **GravelSectors.astro / KomSegments.astro:** If `assign-card-photos.js` changes `coverPhoto` fields, cards automatically render the new cover photos. No code change.

**Risk level:** LOW. Fully additive -- no existing code changes. Only risk is incorrect mile marker causing wrong GPS position.

---

## Feature 3: Map Reset Button

**What:** A button below the map that resets the Leaflet map to original bounds AND resets the Chart.js elevation profile to default state.

**This is the most architecturally interesting feature because it bridges two lazy-initialized components that currently have no "reset" concept.**

### 3a. Current State

- **Map:** `map.fitBounds(routeLine.getBounds(), { padding: [20, 20] })` is called once at init (RouteMap.astro line 80). After user interaction (zoom, pan, flyToBounds from sector clicks), there is no way to return to original bounds.
- **Elevation profile:** Chart.js chart is initialized once with static options. Sector click events change annotation `backgroundColor`/`borderColor` and call `chart.update('none')`. There is no "restore all annotations to default" function.
- **Communication:** The two components communicate exclusively via CustomEvents on `window`. There is no shared state object or module-level reference.

### 3b. Recommended Architecture

**Add a `map:reset` CustomEvent to the established bus.**

The reset button lives in `index.astro` (or a thin wrapper component) between `<RouteMap />` and `<ElevationProfile />`. It dispatches a single event; both components listen independently.

```
New event: map:reset (no payload)  Button -> RouteMap + ElevationProfile
```

**Button placement in index.astro** (between RouteMap and ElevationProfile in the `#route` section):

```html
<RouteMap />
<div class="flex justify-end mt-2 mb-1">
  <button id="map-reset-btn" class="text-text-muted text-xs uppercase tracking-widest
    border border-border px-3 py-1.5 hover:text-accent-green hover:border-accent-green
    transition-colors" type="button">
    Reset View
  </button>
</div>
<ElevationProfile />
```

**Button script (in index.astro or inline):**
```javascript
document.getElementById('map-reset-btn')?.addEventListener('click', () => {
  window.dispatchEvent(new CustomEvent('map:reset'));
});
```

### 3c. RouteMap.astro Changes

Inside `initMap()`, after the route bounds are calculated, store the original bounds and add a reset listener:

```javascript
// Store original bounds for reset
const originalBounds = routeLine.getBounds();

// Listen for reset
window.addEventListener('map:reset', () => {
  map.flyToBounds(originalBounds, { padding: [20, 20] });
  // Restore all sector polyline styles to default
  sectorPolylines.forEach((p, i) => {
    const sector = annotations.sectors[i];
    p.setStyle({
      color: starColors[sector.stars] || '#ffffff',
      weight: 5,
      opacity: 0.9
    });
  });
  // Hide crosshair
  crosshair.setOpacity(0);
}, { signal });
```

The `sectorPolylines` array and `annotations.sectors` are already in scope within `initMap()`. The `crosshair` marker is in scope. The `signal` from the existing `AbortController` handles cleanup.

### 3d. ElevationProfile.astro Changes

Inside `initElevation()`, after the annotation boxes are built, add a reset listener:

```javascript
window.addEventListener('map:reset', () => {
  // Restore all sector annotation bands to default state
  const annots = chartInstance.options.plugins.annotation.annotations;
  Object.keys(annots).forEach(key => {
    const annot = annots[key];
    if (annot._baseColor) {
      annot.backgroundColor = annot._baseColor + '22';
      annot.borderColor = annot._baseColor + '66';
    }
  });
  chartInstance.update('none');
}, { signal });
```

This is nearly identical to the existing `map:sectorHover` handler (lines 228-246) when `sectorIndex === null` -- it resets all bands to their default opacity. The pattern is already established.

### 3e. Initialization Race Condition

The button exists in the DOM immediately (SSR HTML). The map and elevation components lazy-initialize on scroll. If a user clicks "Reset View" before scrolling to the map, the `map:reset` event fires but no listener exists yet. This is harmless -- no error thrown, no state corruption, the event simply has no subscribers. Once both components initialize, they register their listeners and future clicks work. This is the same non-issue that exists for all existing CustomEvents (e.g., `elevation:hover` fires before the map initializes if the user somehow hovers the chart first -- impossible in practice because both are below the fold).

**Risk level:** LOW. Extends the established CustomEvent bus pattern. One new event, two new listeners, one new DOM element.

---

## Feature 4: Photo Lightbox from Map

**What:** Map photo marker clicks open PhotoSwipe lightbox instead of showing a popup with a link to the full image.

### 4a. Current Photo Marker Behavior

RouteMap.astro lines 196-204:
```javascript
const photoMarkers = photos.map((photo) =>
  L.marker([photo.lat, photo.lon], { icon: photoIcon })
    .bindPopup(
      `<a href="/images/${photo.filename}" target="_blank" rel="noopener">` +
      `<img src="/images/${photo.filename}" width="260" ...>` +
      `</a>`,
      { className: 'dark-popup', maxWidth: 300 }
    )
);
```

Clicking a marker opens a Leaflet popup with an `<img>` thumbnail wrapped in an `<a>` link that opens the full image in a new tab.

### 4b. Current PhotoSwipe Initialization

PhotoGallery.astro lines 37-48:
```javascript
const lightbox = new PhotoSwipeLightbox({
  gallery: '#photo-gallery',
  children: '.gallery-item',
  pswpModule: () => import('photoswipe'),
  bgOpacity: 0.95,
});
lightbox.init();
```

PhotoSwipe is scoped to `#photo-gallery` and its `.gallery-item` children. It uses the `data-pswp-width` and `data-pswp-height` attributes on each `<a>` element for sizing.

### 4c. Approach: Programmatic PhotoSwipe Open from Map

PhotoSwipe 5.x supports programmatic opening via its `loadAndOpen()` API. Instead of binding to a gallery container, we can create a data source array and open a specific slide.

**In RouteMap.astro** (inside `initMap()`, after photos are fetched):

```javascript
// Build PhotoSwipe data source from photos array
const pswpDataSource = photos.map((photo) => ({
  src: `/images/${photo.filename}`,
  width: photo.width,   // available in photos.json (enriched by generate-thumbnails.js)
  height: photo.height,
}));

// Replace bindPopup with click handler that opens PhotoSwipe
const photoMarkers = photos.map((photo, index) =>
  L.marker([photo.lat, photo.lon], { icon: photoIcon })
    .on('click', async () => {
      const { default: PhotoSwipe } = await import('photoswipe');
      const pswp = new PhotoSwipe({
        dataSource: pswpDataSource,
        index: index,
        bgOpacity: 0.95,
      });
      pswp.init();
    })
);
```

This dynamically imports `photoswipe` (the core module, not the lightbox helper) on first click. Subsequent clicks reuse the cached module. The `index` parameter opens the clicked photo. The user can swipe through all route photos.

**Key detail:** `photos.json` already contains `width` and `height` fields (added by `generate-thumbnails.js`). This means we have the dimensions PhotoSwipe needs without any additional data.

### 4d. Larger Thumbnails in Popup (Alternative)

If the intent is to keep Leaflet popups BUT make the thumbnail larger and clickable to lightbox, a hybrid approach works:

1. Keep the `bindPopup` with a larger thumbnail image
2. Add a click listener on the popup content that opens PhotoSwipe
3. This requires waiting for `popupopen` event to attach the click handler

The pure PhotoSwipe approach (4c) is cleaner -- fewer DOM layers, no popup-within-lightbox confusion, direct click-to-lightbox UX.

### 4e. PhotoSwipe CSS

PhotoSwipe CSS is already imported in `global.css` line 13:
```css
@import "photoswipe/style.css" layer(components);
```
And dark theme overrides exist at lines 217-221. No additional CSS needed.

### 4f. Photo Cluster Behavior

When a cluster is clicked, `leaflet.markercluster` zooms to show individual markers (`zoomToBoundsOnClick: true`, line 209). At max zoom with `spiderfyOnMaxZoom: true`, individual markers splay out and become individually clickable. The click handler on each marker then triggers PhotoSwipe. This works with no special cluster handling.

**Risk level:** LOW. PhotoSwipe is already bundled. The programmatic API is well-documented. The main change is replacing `bindPopup` with a `click` event handler on each photo marker.

---

## Feature 5: Larger Zoom Controls

**What:** Increase the size of Leaflet's built-in zoom +/- buttons for better touch targets.

### 5a. Current Zoom Control Styles

`global.css` lines 200-207:
```css
.leaflet-control-zoom a {
  background: oklch(0.18 0.01 250) !important;
  color: oklch(0.85 0.01 90) !important;
  border-color: oklch(0.25 0.01 250) !important;
}
.leaflet-control-zoom a:hover {
  background: oklch(0.25 0.01 250) !important;
}
```

Currently only colors are overridden. Leaflet's default zoom buttons are 26x26px.

### 5b. CSS Override

Add size overrides to the existing block in `global.css`:

```css
.leaflet-control-zoom a {
  background: oklch(0.18 0.01 250) !important;
  color: oklch(0.85 0.01 90) !important;
  border-color: oklch(0.25 0.01 250) !important;
  width: 36px !important;
  height: 36px !important;
  line-height: 36px !important;
  font-size: 18px !important;
}
```

The `!important` declarations are already established in this block (lines 201-203) because Leaflet's own CSS has specificity from the leaflet layer. The existing `@layer leaflet` ensures Tailwind and component styles override Leaflet defaults, but the `.leaflet-control-zoom` overrides use `!important` as the established pattern.

### 5c. Touch Target Compliance

WCAG 2.5.8 (Target Size) recommends minimum 44x44px touch targets. At 36px we improve significantly from 26px. Going to 44px may be too visually heavy for the dark minimal aesthetic. 36px is a reasonable compromise -- document the tradeoff.

**Integration point:** `src/styles/global.css` lines 200-207 only. No JS changes.

**Risk level:** VERY LOW. Pure CSS, confined to one rule block.

---

## Feature 6: Card Equalization (Sector Cards Match KOM Cards)

**What:** Make GravelSectors.astro card dimensions match KomSegments.astro cards.

### 6a. Current Card Structures

**GravelSectors.astro card:**
```html
<div class="classified-border bg-bg-surface card-hover">
  <div class="overflow-hidden">
    {coverPhoto && <img class="w-full aspect-video object-cover" />}
    <div class="p-4">
      <div class="flex items-start justify-between gap-4">
        <h3 class="text-accent-white text-lg">{name}</h3>
        <span class="text-base tracking-widest shrink-0">{stars}</span>
      </div>
      <div class="flex gap-6 text-text-muted text-sm mt-1">
        <span>Mile {startMi}</span>
        <span>{lengthMi} mi</span>
      </div>
    </div>
  </div>
</div>
```

**KomSegments.astro card:**
```html
<div class="classified-border bg-bg-surface card-hover">
  <div class="overflow-hidden">
    {coverPhoto && <img class="w-full aspect-video object-cover" />}
    <div class="p-4">
      <h3 class="text-accent-green mb-2">{name}</h3>
      <div class="grid grid-cols-2 gap-x-6 gap-y-1 text-text-muted text-sm">
        <span>Mile {startMi}</span>
        <span>{lengthMi} mi</span>
        <span>{grade}% grade</span>
        <span>{elevFt} ft gain</span>
      </div>
    </div>
  </div>
</div>
```

### 6b. Structural Differences

| Aspect | GravelSectors | KomSegments |
|--------|--------------|-------------|
| Cover image | `aspect-video` (16:9) | `aspect-video` (16:9) |
| Title color | `text-accent-white text-lg` | `text-accent-green mb-2` |
| Title layout | `flex justify-between` with star rating | Single `h3` |
| Metadata | `flex gap-6` (horizontal pair) | `grid grid-cols-2` (2x2 grid) |
| Data fields | 2 (mile, length) | 4 (mile, length, grade, elev) |

The structural difference is in the metadata layout. GravelSectors uses a horizontal flex row; KomSegments uses a 2-column grid. If both are in `space-y-4` containers, card height differences come from:
1. Number of metadata lines (2 fields in 1 row vs 4 fields in 2 rows)
2. Star rating span in the title row (adds width pressure, may wrap)

### 6c. Equalization Approach

The cards live in different grid columns on the page (index.astro lines 272-280):
```html
<div class="grid md:grid-cols-3 gap-8">
  <div class="md:col-span-2">   <!-- GravelSectors: 2/3 width -->
    <GravelSectors />
  </div>
  <div>                          <!-- KomSegments + RestockPoints: 1/3 width -->
    <KomSegments />
    <RestockPoints />
  </div>
</div>
```

GravelSectors cards are wider (2 columns) and KomSegments are narrower (1 column). True pixel-perfect height matching across different column widths with different content is not practical with CSS alone -- content drives height.

**Practical equalization means:**
1. Same padding (`p-4` on both -- already true)
2. Same image aspect ratio (`aspect-video` on both -- already true)
3. Same title typography (align heading sizes)
4. Consistent metadata layout approach (both use `grid grid-cols-2` or both use `flex`)

The most impactful change: Give GravelSectors the same `grid grid-cols-2` metadata layout as KomSegments, and make title styling consistent. This creates visual rhythm even if absolute pixel heights differ.

**Integration points:**
- `src/components/GravelSectors.astro` -- change metadata `<div>` from `flex gap-6` to `grid grid-cols-2 gap-x-6 gap-y-1`, optionally adjust title styling
- No JS changes. No data changes.

**Risk level:** VERY LOW. HTML/CSS template changes in one file.

---

## Feature 7: Grinduro Explainer

**What:** New content block explaining the Grinduro-style timed sector format. Placed in or near the #sectors section.

### 7a. Content Placement Options

The #sectors section (index.astro lines 269-285) contains the 3-column grid with GravelSectors, KomSegments, and RestockPoints. The Grinduro explainer introduces the concept that sectors are timed segments.

**Option A: Above the grid, below the section heading.**
```html
<h2 data-reveal>Gravel Sectors</h2>
<GrinduroExplainer />   <!-- NEW -->
<div class="grid md:grid-cols-3 gap-8">
  ...existing grid...
</div>
```
Pro: Explains the format before the reader sees individual sectors.
Con: Pushes cards further down.

**Option B: Inside the grid, spanning all columns.**
```html
<div class="grid md:grid-cols-3 gap-8">
  <div class="md:col-span-3">
    <GrinduroExplainer />
  </div>
  <div class="md:col-span-2">
    <GravelSectors />
  </div>
  ...
</div>
```
Pro: Part of the grid layout.
Con: Breaks the clean 2-col + 1-col rhythm.

**Recommendation: Option A.** The explainer is contextual prose, not a card. It belongs between the heading and the cards, same as the "Paris-Roubaix Rated Sectors" subheading already there. The pattern matches MkUltraExplainer (contextual prose block between sections).

### 7b. Component Structure

Create `src/components/GrinduroExplainer.astro`:

```astro
---
// No frontmatter required -- purely static HTML
---
<div class="classified-border p-6 md:p-8 mb-8 text-text-body text-sm leading-relaxed">
  <p>...</p>
</div>
```

Follow the pattern of `MkUltraExplainer.astro` (static HTML, `classified-border` treatment, prose content).

### 7c. Integration in index.astro

Add import at top:
```astro
import GrinduroExplainer from "../components/GrinduroExplainer.astro";
```

Place in the #sectors section, between heading and grid:
```astro
<h2 class="text-3xl md:text-5xl mb-8" data-reveal>Gravel Sectors</h2>
<GrinduroExplainer />
<div class="grid md:grid-cols-3 gap-8">
```

**Integration points:**
- New file: `src/components/GrinduroExplainer.astro`
- Modified: `src/pages/index.astro` (import + template insertion)

**Risk level:** VERY LOW. New static component, pure HTML.

---

## Feature 8: Penrose Triangle Above Page Title

**What:** SVG Penrose triangle element positioned above the "MK Ultra Gravel" h1 in the hero section, with subtle animation.

### 8a. Hero Section Structure

`index.astro` lines 195-233 (hero):
```html
<section id="hero" class="relative min-h-screen flex items-center justify-center ...">
  <img src="/tone/CIA-MKULTRA-IG_Page_01.webp" class="tone-image ..." />
  <div class="relative z-10 text-center max-w-3xl">
    <p class="stamp mb-6">Classification: Ultra</p>
    <h1 ...>MK Ultra Gravel</h1>
    ...
  </div>
</section>
```

The Penrose triangle goes between the "Classification: Ultra" stamp and the h1:

```html
<p class="stamp mb-6">Classification: Ultra</p>
<div class="penrose-hero mb-4" aria-hidden="true">
  <svg viewBox="0 0 280 243" width="80" ...>
    <!-- Penrose triangle paths (same as favicon) -->
  </svg>
</div>
<h1 ...>MK Ultra Gravel</h1>
```

### 8b. SVG Source

The Penrose triangle SVG already exists as `public/favicon.svg` (confirmed by inspection -- three-path impossible triangle in green shades). The same path data can be reused at a larger size.

Current favicon SVG viewBox paths:
```svg
<path d="M 55.0625,182.4375 L 80.6875,182.5625 L 151.21875,59.84375 ..." fill="#a3f0a0"/>
<path d="M 15.625,206.0625 L 27.5,228.4375 L 252.30454,228.28334 ..." fill="#6db86a"/>
<path d="M 124.05609,12.990601 L 15.638759,206.0253 ..." fill="#3d7a3a"/>
```

### 8c. Animation

The existing Escher overlay uses `escher-drift` animation (global.css lines 253-257):
```css
@keyframes escher-drift {
  0%   { transform: translate(0, 0) scale(1); }
  50%  { transform: translate(-50px, -50px) scale(1.3); }
  100% { transform: translate(-100px, -100px) scale(1); }
}
```

The favicon itself already has a `scale` animation defined in the favicon component (from v3.0). For the hero Penrose, a subtle rotation or scale pulse works:

```css
@keyframes penrose-breathe {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50%      { transform: scale(1.05); opacity: 1; }
}

.penrose-hero svg {
  animation: penrose-breathe 4s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .penrose-hero svg {
    animation: none;
  }
}
```

Compositor-safe (transform + opacity only). Gated behind `prefers-reduced-motion`.

### 8d. Integration Points

- Modified: `src/pages/index.astro` (add SVG element in hero section)
- Modified: `src/styles/global.css` (add `.penrose-hero` class and `@keyframes penrose-breathe`)
- No JS changes.

**Risk level:** VERY LOW. Static SVG element with CSS animation. Same pattern as existing Escher overlay.

---

## Modified vs New Components Summary

| File | Status | v4.0 Changes |
|------|--------|-------------|
| `MK Ultra.gpx` | Replaced | Overwrite with `MK_Ultra.gpx` content (100mi route) |
| `scripts/photo-manifest.js` | Modified | Add 2 new photo entries with mile markers |
| `src/pages/index.astro` | Modified | Add reset button HTML/JS, import GrinduroExplainer, add Penrose SVG in hero |
| `src/components/RouteMap.astro` | Modified | Store original bounds, add `map:reset` listener, replace `bindPopup` with PhotoSwipe click handler |
| `src/components/ElevationProfile.astro` | Modified | Add `map:reset` listener to restore annotation defaults |
| `src/components/GravelSectors.astro` | Modified | Equalize card layout to match KomSegments |
| `src/styles/global.css` | Modified | Add zoom control size overrides, `.penrose-hero` animation |
| `src/components/GrinduroExplainer.astro` | **NEW** | Static HTML Grinduro format explainer |
| `public/data/route-data.json` | Regenerated | Pipeline output from new GPX |
| `public/data/annotations.json` | Regenerated | Pipeline output (re-resolved coordinates) |
| `public/data/photos.json` | Regenerated | Pipeline output (new photos + re-resolved coordinates) |
| `public/mk-ultra.gpx` | Regenerated | Pipeline copies source GPX to public |

---

## CustomEvent Bus -- Updated for v4.0

```
EXISTING (unchanged):
elevation:hover      { lat, lon }            ElevationProfile -> RouteMap
elevation:hoverEnd   (no payload)            ElevationProfile -> RouteMap
elevation:sectorClick { sectorIndex }        ElevationProfile -> RouteMap
map:sectorHover      { sectorIndex | null }  RouteMap -> ElevationProfile
map:sectorClick      { sectorIndex }         RouteMap -> ElevationProfile

NEW:
map:reset            (no payload)            Reset button -> RouteMap + ElevationProfile
```

One new event. Follows the same `window.dispatchEvent` / `window.addEventListener` pattern with `AbortController` signal cleanup.

---

## Data Flow Changes

### GPX Swap Cascade

```
MK_Ultra.gpx (new 100mi)
    |
    v (rename to "MK Ultra.gpx" or update parse-gpx.js reference)
parse-gpx.js
    |
    v
route-data.json (new trackpoints, meta.totalMi ~100)
    |
    +---> resolve-annotations.js ---> annotations.json (re-resolved coordinates)
    |
    +---> match-photos.js ---> photos.json (re-resolved photo coords, +2 new photos)
    |
    +---> generate-thumbnails.js ---> thumbs/ (new photo thumbs)
    |
    +---> assign-card-photos.js ---> annotations.json (coverPhoto, potentially updated)
```

### Photo Data Flow (New Photos)

```
images/new-photo.jpg   (source file)
    |
    +---> photo-manifest.js  (manual entry: filename + mi)
    |
    +---> generate-data.js step 1: copy to public/images/
    |
    +---> match-photos.js: resolve lat/lon from route-data.json
    |
    +---> generate-thumbnails.js: create public/images/thumbs/new-photo.webp
    |
    +---> assign-card-photos.js: consider for card coverPhoto assignment
```

---

## Suggested Build Order (Dependency-Driven)

```
Phase 1: GPX Replacement + Pipeline (FOUNDATION)
  Files: MK Ultra.gpx, scripts/parse-gpx.js (maybe), run pipeline
  Rationale: MUST come first. Every data-dependent feature relies on
  correct route-data.json from the new 100mi GPX. Also generates the
  annotation coordinates that downstream features display.
  Verify: Pipeline completes without warnings. route-data.json meta
  shows ~100mi. Annotation GPS positions land on-route visually.
  Dev server shows updated route on map, correct elevation profile.

Phase 2: New Photos
  Files: images/*.jpg, scripts/photo-manifest.js, re-run pipeline
  Rationale: Depends on Phase 1 (correct route-data.json for GPS
  resolution). Must come before Photo Lightbox (Feature 4) to ensure
  the photos.json data source has all photos including width/height.
  Verify: 55 photos in photos.json. New markers visible on map.
  New thumbnails in gallery grid.

Phase 3: Card Equalization + Grinduro Explainer (LAYOUT)
  Files: GravelSectors.astro, GrinduroExplainer.astro (new), index.astro
  Rationale: Independent of map/chart JS. Pure HTML/CSS template work.
  No dependency on other features. Can be done in parallel with Phase 4-6
  but grouping layout work together makes review easier.
  Verify: Sector cards visually consistent with KOM cards. Grinduro
  explainer renders correctly above sector grid.

Phase 4: Larger Zoom Controls (CSS-ONLY)
  Files: global.css
  Rationale: Single CSS rule addition. Zero risk. Independent.
  Verify: Zoom buttons visually larger. Touch target improved.

Phase 5: Map Reset Button (EVENT BUS)
  Files: index.astro, RouteMap.astro, ElevationProfile.astro
  Rationale: Extends the CustomEvent bus. Depends on Phase 1 (map must
  display correctly to verify reset). Independent of other features.
  Verify: Click reset after zooming/panning -- map returns to full
  route bounds. Click reset after sector click -- elevation chart
  annotations return to default opacity.

Phase 6: Photo Lightbox from Map (PHOTOSWIPE)
  Files: RouteMap.astro
  Rationale: Depends on Phase 2 (photos.json must have width/height
  for all photos). Replaces existing popup behavior with PhotoSwipe.
  Verify: Click map photo marker -- PhotoSwipe opens showing that
  photo. Swipe left/right navigates to other route photos. Cluster
  expand then click works correctly.

Phase 7: Penrose Header (VISUAL POLISH)
  Files: index.astro, global.css
  Rationale: Pure visual addition. Zero functional dependencies.
  Last because it is decorative polish -- highest creative iteration
  cost, lowest functional value.
  Verify: Penrose triangle visible above title. Animation runs
  smoothly. Reduced-motion respected. LCP not impacted.
```

### Dependency Graph

```
Phase 1 (GPX)
  |
  +---> Phase 2 (Photos)
  |       |
  |       +---> Phase 6 (Photo Lightbox)
  |
  +---> Phase 5 (Reset Button)
  |
  +--- (independent) ---> Phase 3 (Cards + Grinduro)
  +--- (independent) ---> Phase 4 (Zoom CSS)
  +--- (independent) ---> Phase 7 (Penrose Header)
```

Phases 3, 4, and 7 have zero dependencies on other v4.0 features. They can be built in any order or parallelized. Phase 1 is the critical path foundation. Phase 2 depends on Phase 1. Phase 6 depends on Phase 2. Phase 5 depends on Phase 1.

---

## Performance Impact Assessment

| Feature | TBT Risk | LCP Risk | CLS Risk |
|---------|----------|----------|----------|
| GPX replacement | None | None | None (data is fetched post-LCP) |
| New photos | None | None | None (lazy-loaded below fold) |
| Map reset button | None | None | None (static HTML button) |
| Photo lightbox | None | None | None (PhotoSwipe already bundled; dynamic import defers load) |
| Larger zoom controls | None | None | Minimal (36px vs 26px, controls are absolutely positioned in map) |
| Card equalization | None | None | None (SSR HTML, same content) |
| Grinduro explainer | None | None | None (SSR HTML, known height) |
| Penrose header | None | Minimal | Possible (SVG element above h1 shifts layout) |

**Penrose CLS mitigation:** Give the SVG container a fixed height (`h-20` or explicit `height: 80px`) so the browser reserves space during SSR. Since the SVG is inline HTML (not dynamically loaded), the space is allocated at initial paint and CLS is zero.

---

## Anti-Patterns to Avoid for v4.0

### Anti-Pattern A: Running Pipeline Before GPX Swap

**What:** Running `node scripts/generate-data.js` while `MK Ultra.gpx` still points to the 80mi route.
**Why bad:** Generates route data for the old route. All downstream data (annotations, photos) resolve to old-route coordinates. If new photos are added to the manifest referencing mile 80+, they clamp to the old route endpoint.
**Instead:** Swap the GPX file FIRST, then run the pipeline once.

### Anti-Pattern B: Two PhotoSwipe Instances Without Coordination

**What:** Creating a second PhotoSwipe Lightbox instance in RouteMap for map photo clicks, while the existing gallery instance also runs.
**Why bad:** Two lightbox instances can conflict -- both may attempt to handle keyboard events (escape, arrow keys), accessibility focus trapping, and body scroll locking simultaneously.
**Instead:** Use the programmatic `new PhotoSwipe()` API (not `PhotoSwipeLightbox`) for map clicks. This creates a one-shot instance per click that auto-destroys on close. The gallery's persistent `PhotoSwipeLightbox` instance only activates on gallery clicks. They never overlap because the user cannot be in both the map section and gallery section simultaneously.

### Anti-Pattern C: Storing Map/Chart References Globally

**What:** Exposing `map`, `chartInstance`, or `routeLine` as `window.mapRef` etc. for the reset button to access directly.
**Why bad:** Breaks the encapsulation that `initMap()` / `initElevation()` closures provide. Creates global state that is hard to reason about and test. Other scripts could accidentally modify map state.
**Instead:** Use the established CustomEvent bus pattern. The reset button dispatches `map:reset`; each component handles its own reset logic within its own closure scope. No global state needed.

### Anti-Pattern D: Hardcoding New Route Distance in Multiple Places

**What:** Changing "100 miles" text in index.astro line 210 and other places after GPX swap.
**Why bad:** The route-data.json `meta.totalMi` is the source of truth. The hero section already uses `{Math.round(routeMeta.totalMi)} miles` (line 249). Hardcoded distance references elsewhere may become stale.
**Instead:** The hero text at line 210 (`100 miles`) is intentionally hardcoded marketing copy ("Marquette Fire Bell -- 100 miles -- Free"). This is acceptable because it is aspirational branding, not data. The actual distance in the #route section reads from `routeMeta.totalMi`. Verify both after pipeline re-run.

---

## Confidence Assessment

| Area | Confidence | Source | Notes |
|------|------------|--------|-------|
| GPX pipeline cascade | HIGH | Direct inspection of `parse-gpx.js`, `resolve-annotations.js`, `match-photos.js` | Hardcoded path at line 29 confirmed |
| CustomEvent bus extension (reset) | HIGH | Established pattern in 5 existing events; 2 components; same `AbortController` | Zero new patterns -- pure extension |
| PhotoSwipe programmatic API | MEDIUM | Training data for PhotoSwipe 5.x; not verified against Context7 | PhotoSwipe programmatic open needs phase-specific verification |
| Leaflet zoom control CSS | HIGH | Existing `!important` overrides in global.css confirmed working | Same specificity pattern |
| Card equalization scope | HIGH | Direct comparison of GravelSectors.astro vs KomSegments.astro templates | Both inspected line-by-line |
| Photo marker click handler | HIGH | Leaflet `.on('click')` is established API; used on sector polylines already | RouteMap.astro lines 120-121 |
| Penrose SVG paths | HIGH | Favicon SVG inspected; same paths reusable at any scale | ViewBox-based scaling works natively |
| CLS risk of Penrose | MEDIUM | Theoretical analysis; not measured | Mitigated by fixed-height container |

---

## Sources

All findings derived from direct codebase inspection of the following files:

- `src/pages/index.astro` -- page composition, hero section, route section, sectors section
- `src/components/RouteMap.astro` -- Leaflet map, photo markers, crosshair, sector polylines, CustomEvent listeners
- `src/components/ElevationProfile.astro` -- Chart.js, annotation boxes, sector/KOM bands, CustomEvent listeners
- `src/components/GravelSectors.astro` -- sector card template, starColors
- `src/components/KomSegments.astro` -- KOM card template
- `src/components/PhotoGallery.astro` -- PhotoSwipe lightbox initialization, gallery grid
- `src/components/RestockPoints.astro` -- restock point list
- `src/components/MkUltraExplainer.astro` -- explainer component pattern
- `src/components/EventInfoBlock.astro` -- static HTML component
- `src/layouts/BaseLayout.astro` -- layout shell, overlays
- `src/styles/global.css` -- design tokens, leaflet overrides, animations
- `scripts/generate-data.js` -- pipeline coordinator
- `scripts/parse-gpx.js` -- GPX parser, hardcoded source path
- `scripts/resolve-annotations.js` -- annotation resolver, hardcoded mile positions
- `scripts/match-photos.js` -- photo position resolver
- `scripts/photo-manifest.js` -- photo manifest (53 entries)
- `public/favicon.svg` -- Penrose triangle SVG paths
- `public/data/route-data.json` -- generated route data (verified present)
- `public/data/annotations.json` -- generated annotations (verified present)
- `public/data/photos.json` -- generated photo data (verified present)
- `package.json` -- dependency versions confirmed
- `.planning/PROJECT.md` -- project context, feature list, key decisions
