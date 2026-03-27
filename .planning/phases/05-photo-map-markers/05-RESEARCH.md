# Phase 5: Photo Map Markers - Research

**Researched:** 2026-03-26
**Domain:** Leaflet marker clustering, photo serving, popup thumbnails, mobile performance
**Confidence:** HIGH

---

## Summary

Phase 5 adds 33 clickable photo markers to the existing Leaflet map. Research covered four
domains: (1) the Leaflet.markercluster plugin API and its global-L dependency trap in Vite/Astro,
(2) photo file serving — images live in `/images/` at project root and are not currently in
`/public/`, meaning they are not served by the browser, (3) Leaflet popup patterns for thumbnail
images including a known autopan/image-load timing bug, and (4) mobile performance with 33 markers
which is trivially within markercluster's documented capabilities.

The critical technical finding is that `leaflet.markercluster@1.5.4` expects a global `L` to be
present at import time. Leaflet's UMD build (which is what Vite resolves for `await import('leaflet')`
since `package.json#main` points to `dist/leaflet-src.js`) **does** set `window.L` as a side
effect of loading. Therefore the correct pattern is: await import Leaflet first, then await import
markercluster as a side effect. The already-populated `window.L` satisfies the plugin's implicit
dependency.

Photos in `/images/` must be made browser-accessible before Phase 5 can render thumbnails. The
simplest approach in this project's existing pipeline is to add a copy step to `generate-data.js`
that copies the images into `public/images/` (Astro copies `public/` to `dist/` verbatim). No
Astro image optimization is needed — these are served as static assets.

**Primary recommendation:** Install `leaflet.markercluster@1.5.4`. Import Leaflet first, then
import markercluster as a side effect. Add photo copy step to generate-data.js. Use `addLayers()`
(bulk) not `addLayer()` (per-marker) for best performance. Use `L.divIcon` for photo markers (same
pattern as Phase 3 restock markers). Bind popup with HTML thumbnail `<img>` tag, fixed width to
avoid autopan/load-timing bug.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `leaflet.markercluster` | 1.5.4 | Cluster overlapping markers at low zoom, spiderfy at max zoom | The reference clustering plugin for Leaflet; maintained by the Leaflet org |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@types/leaflet.markercluster` | latest | TypeScript types for MarkerClusterGroup API | Install alongside for type safety in the Astro script block |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `leaflet.markercluster` | `supercluster` + custom layer | Faster for huge datasets (10k+); overkill for 33 markers, requires more wiring |
| `leaflet.markercluster` | Leaflet.PixiOverlay + clustering | WebGL rendering; massive overkill, adds complexity |

**Installation:**
```bash
npm install leaflet.markercluster @types/leaflet.markercluster
```

**CSS to add to `src/styles/global.css` (in `@layer leaflet`):**
```css
@import "leaflet.markercluster/dist/MarkerCluster.css" layer(leaflet);
@import "leaflet.markercluster/dist/MarkerCluster.Default.css" layer(leaflet);
```
Note: `MarkerCluster.Default.css` provides the default blue/yellow cluster icon styles. If using
a fully custom `iconCreateFunction`, `MarkerCluster.Default.css` can be omitted (but `MarkerCluster.css`
is still required for animation/spiderfy styles).

---

## Architecture Patterns

### Recommended Project Structure

No new directories needed. The changes are:
```
scripts/generate-data.js    — add photo copy step (images/ → public/images/)
src/components/RouteMap.astro — add markercluster import and photo layer
src/styles/global.css       — add two CSS imports for markercluster
public/images/              — created by generate-data.js copy step (33 JPGs)
```

### Pattern 1: Import Ordering for Leaflet Plugins with Global-L Dependency

**What:** `leaflet.markercluster` reads the global `L` at module evaluation time. Leaflet's UMD
build sets `window.L` as a side effect when the module is loaded. If you await import Leaflet
before importing markercluster, `window.L` is guaranteed to be populated.

**When to use:** Any Leaflet plugin that extends `L.*` namespace (markercluster, gesture-handling,
etc.).

**Example:**
```typescript
// Source: Verified pattern from VitePress/Astro community + UMD source inspection
const L = (await import('leaflet')).default;
// window.L is now set by Leaflet's UMD side effect
await import('leaflet.markercluster'); // reads window.L, attaches MarkerClusterGroup to it
// L.markerClusterGroup() is now available
```

This matches how `leaflet-gesture-handling` is already imported in RouteMap.astro (Phase 3
pattern). The same ordering discipline applies.

**Do NOT do:**
```typescript
// WRONG — parallel import; window.L may not be set when markercluster executes
const [L, _cluster] = await Promise.all([
  import('leaflet'),
  import('leaflet.markercluster')
]);
```

### Pattern 2: Bulk Add All Markers Before Adding Group to Map

**What:** Call `addLayers(markersArray)` with all markers at once, then `map.addLayer(clusterGroup)`.
This is faster than adding the cluster group to the map first, then calling `addLayer()` per marker.

**When to use:** Always when initializing. For 33 markers performance difference is minor, but the
pattern is documented as best practice.

**Example:**
```typescript
// Source: Official Leaflet.markercluster README
const photoMarkers = photos.map(photo =>
  L.marker([photo.lat, photo.lon], { icon: photoIcon })
    .bindPopup(buildPopupHtml(photo), { className: 'dark-popup', maxWidth: 200 })
);
const clusterGroup = L.markerClusterGroup({ /* options */ });
clusterGroup.addLayers(photoMarkers);   // bulk add before map.addLayer
map.addLayer(clusterGroup);
```

### Pattern 3: L.divIcon for Photo Markers (Consistent with Phase 3)

**What:** Use `L.divIcon` with inline styles for the individual photo marker icon. This avoids the
broken default icon PNG path bug in Vite builds (Phase 3 prior decision).

**Example:**
```typescript
// Source: Phase 3 prior decision [03-02] + official Leaflet docs
const photoIcon = L.divIcon({
  className: 'photo-marker',
  html: '<div style="width:10px;height:10px;background:#22d3ee;border:2px solid #fff;border-radius:2px;"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -10]
});
```

The `className: 'photo-marker'` needs a `:global(.photo-marker)` rule in the component's `<style>`
block to suppress Leaflet's default divIcon styling (same pattern as `.restock-marker` in Phase 3).

### Pattern 4: Popup HTML with Fixed-Width Thumbnail Image

**What:** Build the popup content as an HTML string with a fixed-width `<img>` tag. Setting a
fixed width (not auto) prevents the autopan/image-load race condition where the popup opens at
one size before the image loads and then jumps to a larger size.

**Example:**
```typescript
// Source: Leaflet issue #724 workaround + community pattern
function buildPopupHtml(photo: { filename: string }) {
  const imgPath = `/images/${photo.filename}`;
  return `<img src="${imgPath}" width="180" style="display:block;border-radius:2px;" loading="lazy">`;
}
```

Key details:
- `width="180"` is a hard attribute, not CSS `width: auto` — this fixes autopan sizing
- `loading="lazy"` is safe here since the popup only opens on click (image not needed until then)
- The full-size view requirement from the success criteria: add a link wrapping the img, or a
  separate anchor element pointing to `/images/${photo.filename}` that opens in a new tab

### Pattern 5: Custom Cluster Icon (Dark Theme)

**What:** Use `iconCreateFunction` to replace the default blue/yellow cluster icons with dark-
themed divIcons consistent with the project's dark brutalist palette.

**Example:**
```typescript
// Source: Official README iconCreateFunction + Phase 3 divIcon pattern
const clusterGroup = L.markerClusterGroup({
  iconCreateFunction: (cluster) => {
    const count = cluster.getChildCount();
    return L.divIcon({
      className: 'photo-cluster',
      html: `<div style="width:32px;height:32px;background:oklch(0.18 0.01 250);border:2px solid #22d3ee;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;color:#22d3ee;">${count}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  }
});
```

Note: Raw `oklch()` values are required here (same as Phase 3 popup CSS decision [03-03]) because
`iconCreateFunction` returns HTML injected at document root, outside the Astro component's
`@theme` variable scope.

### Anti-Patterns to Avoid

- **Parallel import of Leaflet and markercluster:** `Promise.all([import('leaflet'), import('leaflet.markercluster')])` can race and fail if markercluster executes before `window.L` is set.
- **addLayer() in a loop:** Call `addLayers(array)` once instead of `addLayer()` per marker. Functionally equivalent for 33 markers, but wrong pattern to establish.
- **Default L.icon() for photo markers:** Vite breaks the PNG path resolution (Phase 3 decision [03-02]). Always use `L.divIcon`.
- **CSS width: auto on popup images:** Causes autopan to calculate size before image loads, then jump. Use a fixed integer `width` attribute instead.
- **Photos served from `/images/` root path:** The `/images/` directory is at project root and is NOT in `/public/`. Astro only copies `/public/` to the build output. Files in `/images/` are never served by the browser. Must copy to `public/images/` first.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Marker clustering | Custom zoom-level visibility logic | `L.markerClusterGroup()` | Handles cluster radius, spiderfy at max zoom, animation, convex hull — dozens of edge cases |
| Cluster count badge | Custom div with manual positioning | `iconCreateFunction` with `cluster.getChildCount()` | Built-in count, proper icon lifecycle, cluster event hooks |
| Click-to-zoom on cluster | Map.setView() on cluster click | Default `zoomToBoundsOnClick: true` | Leaflet.markercluster handles zoom + spiderfy transition automatically |

**Key insight:** For 33 markers, clustering is about UX (not performance) — markercluster provides
the expected "click cluster to zoom in" behavior that users expect from map UIs, plus spiderfy
when markers overlap at max zoom. This is not trivially replicable.

---

## Common Pitfalls

### Pitfall 1: Global L Race Condition

**What goes wrong:** `L.markerClusterGroup is not a function` at runtime, or `L.FeatureGroup is undefined` inside the plugin.

**Why it happens:** `leaflet.markercluster` uses a UMD wrapper that reads the free variable `L`
(which resolves to `window.L` in browser global scope). If markercluster's module body executes
before Leaflet's UMD side effect sets `window.L`, the plugin cannot attach itself.

**How to avoid:** Always `await import('leaflet')` in a separate statement before `await import('leaflet.markercluster')`. Never use `Promise.all()` for these two imports.

**Warning signs:** TypeError at map initialization, not at import time. The import itself may
succeed (module resolved), but `L.markerClusterGroup` is undefined when called.

### Pitfall 2: Photos Not Served (Wrong Directory)

**What goes wrong:** `<img>` tags in popups result in 404 errors. Thumbnails appear broken.

**Why it happens:** Source photos are in `/images/` at project root. Astro only copies `/public/`
to the build output (`dist/`). Files in `/images/` are inaccessible at runtime.

**How to avoid:** Add a copy step to `scripts/generate-data.js` (or a dedicated script) that
copies all 33 JPGs from `/images/` to `public/images/` before the Astro build. This step is
already needed for Phase 8 (gallery) as well — establish it now.

**Warning signs:** Images display as broken icons in popup; browser network tab shows 404 for
`/images/*.jpg` paths.

### Pitfall 3: Popup Autopan Jump on Image Load

**What goes wrong:** When a photo popup opens, the map autopans to fit the popup. But if the image
hasn't loaded yet, the popup is sized too small, autopan runs, then the image loads and the popup
expands, leaving the popup partially off-screen.

**Why it happens:** Leaflet calculates autopan bounds synchronously when the popup opens, before
the `<img>` has loaded (and before the browser knows its rendered height). Known Leaflet issue #724.

**How to avoid:** Set a fixed integer `width` attribute directly on the `<img>` HTML tag (e.g.,
`width="180"`). This makes the popup's rendered width predictable at open time, giving Leaflet
accurate dimensions for autopan. Do NOT use CSS `width: auto` for popup images.

**Warning signs:** Popup appears then jumps/shifts after a brief moment when the image loads.

### Pitfall 4: MarkerCluster.Default.css Not Imported

**What goes wrong:** Cluster icons appear as plain text count numbers with no background, or CSS
classes exist but have no styles applied.

**Why it happens:** The default cluster icon styling (`.marker-cluster-small`, `.marker-cluster-medium`,
`.marker-cluster-large`) lives in `MarkerCluster.Default.css`. If only `MarkerCluster.css` is
imported, animation/spiderfy works but cluster icons have no visual styling.

**How to avoid:** If using the default cluster appearance OR a hybrid (custom count, default
background), import both CSS files in `global.css`. If using a fully custom `iconCreateFunction`
that returns completely custom HTML/CSS, `MarkerCluster.Default.css` is optional but `MarkerCluster.css`
is still required.

### Pitfall 5: :global() Missing for Cluster/Marker CSS Classes

**What goes wrong:** Styles defined in RouteMap.astro's `<style>` block for `.photo-marker` or
`.photo-cluster` have no effect on the map.

**Why it happens:** Leaflet injects divIcon and cluster DOM elements at document root, outside
the Astro component's scoped CSS boundary. Astro's scoped CSS adds a unique attribute selector
that does not match Leaflet-managed DOM. (Same issue as Phase 3 `.restock-marker` and `.sector-badge`.)

**How to avoid:** Use `:global(.photo-marker)` and `:global(.photo-cluster)` in the component's
`<style>` block. Alternatively, use inline styles in the `html` property of `L.divIcon` (already
established as the primary approach in Phase 3).

---

## Code Examples

Verified patterns from official sources and codebase context:

### Complete Import Sequence (SSR-safe, Astro script block)

```typescript
// Source: Phase 3 established pattern + Leaflet UMD global-L behavior
// L must be imported and window.L set BEFORE markercluster loads
const L = (await import('leaflet')).default;
const { GestureHandling } = await import('leaflet-gesture-handling');
L.Map.addInitHook('addHandler', 'gestureHandling', GestureHandling);
// ... map initialization ...
await import('leaflet.markercluster'); // side-effect import; attaches to window.L
// Now L.markerClusterGroup is available
```

### Creating the Cluster Group with Custom Dark Icons

```typescript
// Source: Official Leaflet.markercluster README + Phase 3 divIcon pattern
const photoCluster = L.markerClusterGroup({
  maxClusterRadius: 60,             // tighter than default 80 — 33 markers spread across 100mi
  spiderfyOnMaxZoom: true,          // default true — keep for overlapping photos at same location
  showCoverageOnHover: false,       // suppress polygon on hover — clean UI
  zoomToBoundsOnClick: true,        // default true — click cluster to zoom in
  iconCreateFunction: (cluster) => {
    return L.divIcon({
      className: 'photo-cluster',
      html: `<span style="...">${cluster.getChildCount()}</span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  }
});
```

### Building Photo Markers and Adding to Cluster

```typescript
// Source: Official README addLayers pattern + Phase 3 L.divIcon pattern
const photoIcon = L.divIcon({
  className: 'photo-marker',
  html: '<div style="width:10px;height:10px;background:#22d3ee;border:2px solid #fff;border-radius:2px;"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -10]
});

const photoData = await fetch('/data/photos.json').then(r => r.json());
const markers = photoData.map((photo: { filename: string; lat: number; lon: number }) =>
  L.marker([photo.lat, photo.lon], { icon: photoIcon })
    .bindPopup(
      `<a href="/images/${photo.filename}" target="_blank" rel="noopener">` +
      `<img src="/images/${photo.filename}" width="180" style="display:block;border-radius:2px;" loading="lazy">` +
      `</a>`,
      { className: 'dark-popup', maxWidth: 200 }
    )
);
photoCluster.addLayers(markers);   // bulk — best practice per README
map.addLayer(photoCluster);
```

### CSS in global.css (layer import additions)

```css
/* Source: MarkerCluster official docs — both files required for default OR animation-only use */
@import "leaflet.markercluster/dist/MarkerCluster.css" layer(leaflet);
@import "leaflet.markercluster/dist/MarkerCluster.Default.css" layer(leaflet);
```

### Photo Copy Step in generate-data.js

```javascript
// Source: Astro docs — public/ is the only directory Astro copies to dist/
const fs = require('fs');
const path = require('path');

const srcImagesDir = path.join(__dirname, '..', 'images');
const destImagesDir = path.join(__dirname, '..', 'public', 'images');

if (!fs.existsSync(destImagesDir)) {
  fs.mkdirSync(destImagesDir, { recursive: true });
}

const jpgs = fs.readdirSync(srcImagesDir).filter(f => f.endsWith('.jpg'));
jpgs.forEach(filename => {
  const src = path.join(srcImagesDir, filename);
  const dest = path.join(destImagesDir, filename);
  fs.copyFileSync(src, dest);
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `leaflet.markercluster` v1.4.x | v1.5.4 (current) | 2021 | Minor API improvements; same core API |
| Default L.icon with PNG | L.divIcon with inline HTML | Phase 3 decision | Avoids Vite broken PNG path issue |
| CSS in component `<style>` for Leaflet DOM | Raw oklch() values in HTML + `:global()` | Phase 3 decision [03-03] | @theme vars not accessible in Leaflet-injected DOM |

**Deprecated/outdated:**
- `MarkerCluster.Default.css` default styling: Still valid but can be replaced entirely with custom `iconCreateFunction` returning a `L.divIcon`
- `leaflet.markercluster.esm` (alternate package): Exists as a separate npm package but is less maintained and has same global-L issues in a different form. Use `leaflet.markercluster` (the official package).

---

## Open Questions

1. **Photo serving — copy vs symlink vs Astro publicDir config**
   - What we know: Photos are in `/images/`. Astro serves only `/public/`. A copy step to `public/images/` works but duplicates ~50 JPGs on disk.
   - What's unclear: Whether Astro's `publicDir` config option (pointing to a different directory) could be used instead — but this would replace `/public/` entirely, not add a second public dir. Not viable.
   - Recommendation: Use the copy step in `generate-data.js`. Accept the disk duplication; these are static assets and it's the cleanest solution consistent with the existing pipeline pattern.

2. **TypeScript types for markercluster**
   - What we know: `@types/leaflet.markercluster` exists on DefinitelyTyped.
   - What's unclear: Whether the types are current for 1.5.4 and cover `iconCreateFunction` callback types cleanly.
   - Recommendation: Install `@types/leaflet.markercluster` and check if type errors arise; fall back to `any` annotations where needed (acceptable in Astro script blocks given the `as any` pattern already used in Phase 3).

3. **`maxClusterRadius` tuning for 100-mile spread**
   - What we know: 33 photos over ~100 miles means at most 0.33 photos/mile. At route-overview zoom (where all 100 miles fit in a ~60vh map), most markers will be far apart and may not cluster at all except at the start/finish area.
   - What's unclear: Exact zoom level at which clustering kicks in for this specific dataset.
   - Recommendation: Use `maxClusterRadius: 60` as a starting value (tighter than default 80) and verify visually in 05-03. The success criterion is "no crowded overlapping icons at low zoom" — the default of 80 likely satisfies this but 60 is safer for a small dataset.

---

## Sources

### Primary (HIGH confidence)

- GitHub `Leaflet/Leaflet.markercluster` README — API, options, addLayers pattern, iconCreateFunction
- `node_modules/leaflet/dist/leaflet-src.js` lines 14503-14509 — confirmed `window.L = exports` side effect
- `public/data/photos.json` — confirmed 33 photos, `filename`/`lat`/`lon`/`mi`/`source` schema
- `src/components/RouteMap.astro` — established `await import('leaflet')` pattern, L.divIcon, Promise.all fetch, dark-popup className
- `src/styles/global.css` — established `@import ... layer(leaflet)` pattern

### Secondary (MEDIUM confidence)

- VitePress/Astro community pattern: `await import('leaflet')` then `await import('leaflet.markercluster')` — cross-verified with UMD source inspection
- Leaflet issue #724 — image autopan bug; fixed via `width` attribute (HTML attribute, not CSS)
- Astro docs — `public/` is the only directory copied to `dist/` verbatim

### Tertiary (LOW confidence)

- `maxClusterRadius: 60` recommendation — based on reasoning about 100-mile spread, not tested against actual data
- `@types/leaflet.markercluster` currency for v1.5.4 — not verified against DefinitelyTyped source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — version confirmed via GitHub package.json (1.5.4), npm package name confirmed
- Architecture: HIGH — patterns derived from codebase inspection + official docs + UMD source verification
- Pitfalls: HIGH — most pitfalls verified against source code (window.L), official Leaflet issues (#724), or Phase 3 prior decisions
- Photo serving: HIGH — confirmed by direct inspection of project structure (images/ not in public/)

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable libraries; markercluster has not had a release since 2021)
