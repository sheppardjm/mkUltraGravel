# Phase 3: Map Core - Research

**Researched:** 2026-03-26
**Domain:** Leaflet 1.9.4, Astro script-tag island pattern, tile providers, mobile gesture handling, overlay rendering
**Confidence:** HIGH (Leaflet API, tile URLs, gesture handling), MEDIUM (Astro+Leaflet integration pattern), LOW (Stadia Maps dark style free-tier production behavior)

---

## Summary

Phase 3 adds an interactive Leaflet map to the Astro static site. The map renders the 100-mile GPX route as a polyline, highlights 6 gravel sectors and 3 KOM segments as colored overlays, and marks 4 restock points — all sourced from the already-built `public/data/route-data.json` and `public/data/annotations.json`.

The standard integration pattern for Leaflet in an Astro static site (no React/Svelte/Vue) is a vanilla `.astro` component containing a `<div id="map">` and a `<script>` tag that uses **dynamic import** (`await import('leaflet')`) inside a `document.addEventListener('DOMContentLoaded')` or a Web Components `connectedCallback()`. This sidesteps the Vite SSR `window is undefined` error that occurs when Leaflet is statically imported at the top of a module. The `client:load` directive only applies to framework components (React, Svelte, etc.) — for vanilla Astro components, the `<script>` tag pattern is correct.

Two tile provider options are verified: **Stadia Maps Alidade Smooth Dark** (free tier, API key optional for localhost; domain auth required for production) and **CARTO Dark Matter** (free with attribution, no API key required). CARTO Dark Matter is the safer fallback for zero-friction deployment. Leaflet.GestureHandling (npm: `leaflet-gesture-handling`) solves mobile scroll-trap in a single config option. Leaflet 1.9.4 is CommonJS and requires a Vite `optimizeDeps` hint if bundled statically — but the dynamic import pattern avoids this entirely.

**Primary recommendation:** Use an `.astro` component with a `<script>` tag and dynamic imports; wire CARTO Dark Matter as the tile layer (no API key needed); use `leaflet-gesture-handling` from first commit; build all overlays from the existing JSON data files using `L.polyline` and `L.marker` with `L.divIcon`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| leaflet | 1.9.4 | Interactive map with polylines, markers, popups | Roadmap decision; stable, well-documented, huge ecosystem |
| leaflet-gesture-handling | 1.2.2 | Prevents mobile scroll-trap | Roadmap decision; plug-and-play, one option flag |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CARTO Dark Matter tiles | CDN | Dark basemap tiles, no API key | Primary tile provider; free with attribution |
| Stadia Maps alidade_smooth_dark | CDN | Darker, higher-quality tile option | If Stadia signup completes before 03-01 ships |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CARTO Dark Matter | Stadia alidade_smooth_dark | Stadia requires domain auth for production; CARTO has no auth requirement |
| L.polyline (from JSON) | leaflet-gpx plugin | leaflet-gpx loads raw GPX XML; project already has JSON track arrays — no plugin needed |
| L.divIcon (custom HTML) | L.marker default icon | Default icon has broken path issue in Vite builds (see Pitfalls); divIcon is explicit and styleable |
| Astro .astro + script tag | React/Svelte island with client:load | No framework needed; adds zero bundle weight; pattern is simpler |

**Installation:**
```bash
volta run npm install leaflet leaflet-gesture-handling
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   └── RouteMap.astro       # Map island: div#map + <script> with dynamic imports
├── styles/
│   └── global.css           # Already has @layer leaflet declared; add @import here
└── pages/
    └── index.astro          # Slots in <RouteMap /> inside the #route section
```

### Pattern 1: Vanilla Astro Map Island (Dynamic Import)

**What:** An `.astro` component with an HTML container div and a `<script>` that dynamically imports Leaflet only in the browser, preventing Vite SSR `window` errors.

**When to use:** Always — for any browser-only library in a vanilla Astro component.

**Example:**
```astro
<!-- src/components/RouteMap.astro -->
<div id="map" style="height: 500px; width: 100%;"></div>

<script>
  // Dynamic import defers evaluation to browser runtime only.
  // Static `import L from 'leaflet'` would cause SSR "window is undefined" error.
  const L = (await import('leaflet')).default;
  await import('leaflet/dist/leaflet.css');

  // GestureHandling: must be wired before map init
  const { GestureHandling } = await import('leaflet-gesture-handling');
  await import('leaflet-gesture-handling/dist/leaflet-gesture-handling.css');
  L.Map.addInitHook('addHandler', 'gestureHandling', GestureHandling);

  const map = L.map('map', { gestureHandling: true });
  // ... tile layer, overlays ...
</script>
```

**Note on CSS imports via dynamic import:** Vite supports `await import('some-pkg/dist/file.css')` but the behavior can be inconsistent. The safer approach is to import the CSS statically at the top of the Astro `<style>` or in `global.css` using `@import "leaflet/dist/leaflet.css" layer(leaflet)` — which `global.css` already has as a placeholder comment. Both the Leaflet CSS and the gesture-handling CSS should go through `global.css` with the `layer(leaflet)` wrapper.

### Pattern 2: Tile Layer Setup

```javascript
// Source: https://docs.stadiamaps.com/tutorials/raster-maps-with-leaflet/
// CARTO Dark Matter (no API key required)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 20
}).addTo(map);

// Stadia Alidade Smooth Dark (free tier, needs domain auth for production)
// L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
//   attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
//   maxZoom: 20
// }).addTo(map);
```

### Pattern 3: Rendering GPX Route Polyline

The `route-data.json` is a flat array of `{lat, lon, ele, mi}` objects (2498 points). Map to `[lat, lon]` pairs for Leaflet.

```javascript
// Source: https://leafletjs.com/reference.html
const routeData = await fetch('/data/route-data.json').then(r => r.json());
const latlngs = routeData.map(pt => [pt.lat, pt.lon]);

const routePolyline = L.polyline(latlngs, {
  color: '#e8e8e8',     // off-white to match accent-white token
  weight: 3,
  opacity: 0.7,
  smoothFactor: 1       // Leaflet default; increase to reduce points at cost of fidelity
}).addTo(map);

// Fit map to route bounds on load
map.fitBounds(routePolyline.getBounds(), { padding: [20, 20] });
```

### Pattern 4: Sector Overlays from annotations.json

Each sector in `annotations.json` has a `track` array (array of `{lat, lon}`), `stars` (1-5), and `name`. Map `stars` to a color scale.

```javascript
// annotations.json shape: { sectors[], kom[], restock[] }
// Sector track arrays are pre-sliced polyline points
const annotations = await fetch('/data/annotations.json').then(r => r.json());

const starColors = {
  1: '#666666',   // muted - light gravel
  2: '#aaaaaa',   // gray
  3: '#f5a623',   // amber - moderate
  4: '#e86d1f',   // orange - hard
  5: '#c0392b'    // red - brutal
};

annotations.sectors.forEach(sector => {
  const latlngs = sector.track.map(pt => [pt.lat, pt.lon]);
  L.polyline(latlngs, {
    color: starColors[sector.stars] || '#ffffff',
    weight: 5,
    opacity: 0.9
  })
  .bindPopup(`<strong>${sector.name}</strong><br>${'★'.repeat(sector.stars)}${'☆'.repeat(5 - sector.stars)}<br>${sector.lengthMi.toFixed(1)} mi`)
  .addTo(map);
});
```

### Pattern 5: KOM Segment Overlays

KOM entries have `track`, `name`, and currently-null `gradient`/`elevGain` fields. Popup shows available data gracefully.

```javascript
annotations.kom.forEach(kom => {
  const latlngs = kom.track.map(pt => [pt.lat, pt.lon]);
  L.polyline(latlngs, {
    color: '#7fff00',   // chartreuse - distinct from sector colors
    weight: 6,
    opacity: 0.85,
    dashArray: '8, 4'  // dashed to visually distinguish from sectors
  })
  .bindPopup([
    `<strong>${kom.name}</strong>`,
    kom.gradient ? `Gradient: ${kom.gradient}%` : '',
    kom.elevGain ? `Elev gain: ${kom.elevGain} ft` : ''
  ].filter(Boolean).join('<br>'))
  .addTo(map);
});
```

### Pattern 6: Restock Point Markers with divIcon

Default Leaflet marker icons break in Vite builds (path resolution issue). Use `L.divIcon` with inline HTML for all custom markers — avoids the image path problem entirely.

```javascript
// Source: https://leafletjs.com/reference.html#divicon
annotations.restock.forEach(stop => {
  const icon = L.divIcon({
    className: 'restock-marker',
    html: `<div class="marker-inner">&#x25CF;</div>`,  // filled circle
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14]
  });

  L.marker([stop.lat, stop.lon], { icon })
    .bindPopup(`<strong>${stop.name}</strong><br>Mile ${stop.mi}`)
    .addTo(map);
});
```

Note: `restock` entries in the current `annotations.json` only have `{name, mi}` — no `lat/lon`. Verify during implementation; you may need to resolve coordinates from the route track at the given mile marker, or add lat/lon to the data.

### Pattern 7: Custom Popup CSS via className

```css
/* In global.css @layer components */
.leaflet-popup-content-wrapper,
.leaflet-popup.dark-popup .leaflet-popup-content-wrapper {
  background: var(--color-bg-elevated);
  color: var(--color-text-body);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
}
.leaflet-popup.dark-popup .leaflet-popup-tip {
  background: var(--color-bg-elevated);
}
```

Wire by passing `className: 'dark-popup'` to bindPopup options.

### Pattern 8: GestureHandling Setup

Must be called before `L.map()` init:
```javascript
// Source: https://github.com/elmarquis/Leaflet.GestureHandling
L.Map.addInitHook('addHandler', 'gestureHandling', GestureHandling);
const map = L.map('map', { gestureHandling: true });
```

### Anti-Patterns to Avoid

- **Static top-level `import L from 'leaflet'`:** Causes Vite SSR `window is undefined` build error. Always use dynamic import in the `<script>` body.
- **Relying on Leaflet's default marker icon (`L.marker` without custom icon):** The default icon PNG paths break in Vite production builds. Use `L.divIcon` or explicitly re-assign icon URLs.
- **Importing Leaflet CSS statically in the `<script>` tag as a side effect:** Use `global.css` `@import` with `layer(leaflet)` instead to respect cascade ordering.
- **Setting map height with `height: 100%`:** Only works if all ancestors have explicit heights. Use a fixed px or vh value on the map container.
- **Creating the map before DOM is ready:** The `<script>` in `.astro` runs after the document loads (it's type="module"), but `document.getElementById('map')` can still be null if script executes before paint. Use `DOMContentLoaded` or check element existence.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mobile scroll trap | Custom touch event interceptors | `leaflet-gesture-handling` | Plugin handles 52 languages, pointer events, and edge cases |
| GPX parsing | Custom XML parser | Not needed — JSON already built | `annotations.json` track arrays are ready; leaflet-gpx only reads raw GPX |
| Tile attribution display | Hide or custom-build attribution control | Leaflet's built-in attribution control | Attribution is a legal requirement for OSM/CARTO tiles; Leaflet handles it automatically |
| Point simplification for large polylines | Manual Douglas-Peucker | Leaflet's `smoothFactor` option | Built into L.polyline; set to 2-3 for performance on the 2498-point route |
| Zoom-based label visibility | Complex CSS media queries | `map.on('zoomend', ...)` with layer add/remove or pane visibility toggle | Leaflet event system cleanly handles this |

**Key insight:** The annotations data is already structured as polyline-ready track arrays. There is no GPX parsing or segment extraction needed — just iterate the JSON and call `L.polyline(segment.track.map(...))`.

---

## Common Pitfalls

### Pitfall 1: Vite SSR "window is not defined"

**What goes wrong:** Importing Leaflet with `import L from 'leaflet'` at module top level causes Vite's SSR step to throw because Leaflet's source accesses `window` during module evaluation.

**Why it happens:** Astro builds with Vite in SSR mode for static generation; any module-level browser globals fail at build time.

**How to avoid:** Use dynamic import inside the `<script>` body: `const L = (await import('leaflet')).default`

**Warning signs:** Build error mentioning `window is not defined` or `document is not defined` during `astro build`.

### Pitfall 2: Default Marker Icons Broken in Production

**What goes wrong:** `L.marker([lat, lon]).addTo(map)` shows a broken image icon in production builds but works in dev.

**Why it happens:** Leaflet's default icon images use a dynamic path resolution (`_getIconUrl`) that Vite's bundler cannot follow to correctly hash/copy the PNG files.

**How to avoid:** Use `L.divIcon` for all custom markers (restock points). If default markers are ever needed, apply this fix immediately after importing L:
```javascript
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';
L.Icon.Default.prototype.options.iconUrl = markerIconUrl;
L.Icon.Default.prototype.options.iconRetinaUrl = markerIconRetinaUrl;
L.Icon.Default.prototype.options.shadowUrl = markerShadowUrl;
L.Icon.Default.imagePath = '';
```
(Source: https://willschenk.com/labnotes/2024/leaflet_markers_with_vite_build/)

**Warning signs:** Missing marker images in `astro build` output; images present in `astro dev`.

### Pitfall 3: Leaflet CSS Cascade Conflict with Tailwind

**What goes wrong:** Tailwind's reset or utility classes override Leaflet's popup/control styles, causing map UI to render broken (popups transparent, controls unstyled).

**Why it happens:** Cascade layer order matters. Leaflet's default styles conflict with Tailwind's base/preflight layer.

**How to avoid:** `global.css` already declares `@layer leaflet, base, components, utilities` at the top. The Leaflet CSS import must be: `@import "leaflet/dist/leaflet.css" layer(leaflet)`. This is already stubbed as a comment in the existing `global.css`. Same for gesture-handling CSS.

**Warning signs:** Popup backgrounds transparent; zoom control buttons missing; tiles not rendering.

### Pitfall 4: Map Container Has Zero Height

**What goes wrong:** Map div renders blank; no tiles load; `map.fitBounds()` does nothing.

**Why it happens:** Leaflet requires the container element to have a non-zero height before initialization. A div with `height: auto` or percentage heights without explicit ancestors defaults to 0px.

**How to avoid:** Set explicit height on the map container: `style="height: 500px"` or Tailwind class `h-[500px]` or `h-[60vh]`. Do not rely on `height: 100%` unless the parent chain has explicit heights.

**Warning signs:** Grey/white blank area where the map should be; no console errors (Leaflet initializes silently with zero viewport).

### Pitfall 5: Restock Points Missing Lat/Lon

**What goes wrong:** `annotations.json` restock entries currently only contain `{name, mi}` — no `lat/lon` coordinates. Calling `L.marker([stop.lat, stop.lon])` would produce `[undefined, undefined]`.

**Why it happens:** The data pipeline in Phase 1 stored mile-marker positions but did not interpolate GPS coordinates for restock points.

**How to avoid:** During task 03-06, inspect restock entries. If lat/lon are absent, interpolate from `route-data.json` by finding the track point nearest to the mile value. Write a small utility function.

**Warning signs:** NaN lat/lon in Leaflet marker causing silent failure or console error.

### Pitfall 6: GestureHandling Not Registered Before Map Init

**What goes wrong:** Map scroll-trap on mobile occurs despite importing `leaflet-gesture-handling`.

**Why it happens:** `L.Map.addInitHook('addHandler', 'gestureHandling', GestureHandling)` must be called before `L.map()` is called. If the import is dynamic and await order is wrong, the hook registration is skipped.

**How to avoid:** Ensure import and `addInitHook` call happen before the `L.map(...)` call in execution order.

**Warning signs:** Mobile users trapped in map; no two-finger prompt overlay shown.

---

## Code Examples

Verified patterns from official sources:

### Complete Map Initialization (Astro component)

```astro
<!-- src/components/RouteMap.astro -->
---
// No frontmatter needed — all logic is client-side
---
<div id="map" class="route-map"></div>

<style>
  /* Map container must have explicit height */
  .route-map {
    height: 500px;
    width: 100%;
    /* Leaflet CSS is imported in global.css @layer leaflet */
  }
</style>

<script>
  // All Leaflet code runs browser-side only via dynamic import
  const L = (await import('leaflet')).default;
  const { GestureHandling } = await import('leaflet-gesture-handling');

  // Wire gesture handling before map init
  L.Map.addInitHook('addHandler', 'gestureHandling', GestureHandling);

  const map = L.map('map', { gestureHandling: true });

  // CARTO Dark Matter tiles (no API key)
  // Source: https://github.com/CartoDB/basemap-styles
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  // Load data and render
  const [routeData, annotations] = await Promise.all([
    fetch('/data/route-data.json').then(r => r.json()),
    fetch('/data/annotations.json').then(r => r.json())
  ]);

  // Route polyline + fitBounds
  // Source: https://leafletjs.com/reference.html
  const routePolyline = L.polyline(
    routeData.map(pt => [pt.lat, pt.lon]),
    { color: '#d4d4d4', weight: 3, opacity: 0.7, smoothFactor: 1 }
  ).addTo(map);
  map.fitBounds(routePolyline.getBounds(), { padding: [20, 20] });

  // Sector, KOM, and restock rendering follows...
</script>
```

### global.css CSS Imports (add to existing file)

```css
/* In global.css — after the @layer declaration, before @import tailwindcss */
@import "leaflet/dist/leaflet.css" layer(leaflet);
@import "leaflet-gesture-handling/dist/leaflet-gesture-handling.css" layer(leaflet);
```

### fitBounds after Data Load

```javascript
// Source: https://leafletjs.com/reference.html#map-fitbounds
// polyline.getBounds() returns LatLngBounds; fitBounds adjusts zoom to show full route
map.fitBounds(polyline.getBounds(), {
  padding: [20, 20],   // pixels of breathing room on all edges
  maxZoom: 14          // don't zoom too far in if route is small
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Leaflet via CDN `<script>` tag | Leaflet via npm + dynamic import in Astro `<script>` | Astro/Vite-era (2022+) | Enables bundling, tree-shaking, avoids SSR errors |
| MapBox tiles (usage-fee after free tier) | CARTO/Stadia tiles (free with attribution) | 2022 (MapBox pricing change) | Zero cost for small sites |
| `leaflet/dist/leaflet-src.esm.js` direct import | `import('leaflet')` (CJS) | Leaflet 2.0 not yet stable as of 2026-03 | Leaflet 2.0 will be true ESM; 1.9.4 is still CJS |

**Deprecated/outdated:**
- Leaflet 2.0 alpha: ESM-only, broken API — do not use. Project roadmap explicitly locks 1.9.4.
- `L.mapbox` / official MapBox Leaflet plugin: now requires paid API key for reasonable usage.
- `@raruto/leaflet-gesture-handling`: An alternative fork; use the canonical `leaflet-gesture-handling` from `elmarquis`.

---

## Open Questions

1. **Restock point lat/lon coordinates**
   - What we know: `annotations.json` restock entries have `{name, mi}` only
   - What's unclear: Whether lat/lon were ever added (or need to be interpolated from the route track at the given mile value)
   - Recommendation: In task 03-06, print the restock entries first; if lat/lon missing, add an interpolation helper that walks `route-data.json` to find the point closest to `mi`

2. **KOM gradient and elevGain data**
   - What we know: `annotations.json` KOM entries have `gradient: null` and `elevGain: null`
   - What's unclear: Whether this data will be added before Phase 3 or should be treated as optional in popups
   - Recommendation: Render KOM popups with graceful fallback (omit null fields); popups still show name

3. **Stadia Maps production auth**
   - What we know: Stadia Maps is free for localhost; domain auth required for production (no API key needed if domain is whitelisted)
   - What's unclear: Whether the Stadia signup from the roadmap blocker note has been completed
   - Recommendation: Use CARTO Dark Matter as primary tile layer — it has zero auth requirements. Keep Stadia as a commented-out alternative.

4. **Map height on the page**
   - What we know: The `#route` section in `index.astro` has `min-h-screen` and is a placeholder
   - What's unclear: The desired map height (500px? 60vh? full-screen?)
   - Recommendation: Use `60vh` with a `min-height: 400px` for the map container — respects mobile viewports without forcing full-screen scroll

---

## Sources

### Primary (HIGH confidence)
- https://leafletjs.com/reference.html — Leaflet 1.9.4 API: polyline, marker, popup, divIcon, fitBounds, path options, tile layer
- https://leafletjs.com/download.html — npm install pattern
- https://github.com/elmarquis/Leaflet.GestureHandling — gesture handling install, API, options
- https://github.com/CartoDB/basemap-styles — CARTO tile URLs, style identifiers, attribution
- https://docs.stadiamaps.com/map-styles/alidade-smooth-dark/ — Stadia tile URL, free tier confirmation

### Secondary (MEDIUM confidence)
- https://willschenk.com/labnotes/2024/leaflet_markers_with_vite_build/ — Default marker icon Vite fix (verified against Leaflet source)
- https://docs.astro.build/en/guides/client-side-scripts/ — Astro script tag dynamic import pattern
- https://astro-tips.dev/tips/script-tag-dynamic-imports/ — Async dynamic import inside Astro script tags
- https://npmjs.com/package/leaflet-gesture-handling — CSS import path confirmed

### Tertiary (LOW confidence)
- Various WebSearch results on Astro+Leaflet community patterns — general direction confirmed but not individually verified against official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Leaflet 1.9.4 and leaflet-gesture-handling confirmed via official repos/npm; tile URLs verified against provider docs
- Architecture (Astro pattern): MEDIUM — dynamic import + script tag pattern confirmed via Astro docs and community guides; no single official Astro+Leaflet guide exists
- Pitfalls: HIGH — Vite SSR error, default icon break, container height, CSS cascade all confirmed from multiple official/semi-official sources
- Data shape: HIGH — directly inspected `annotations.json` and `route-data.json` via Python

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (Leaflet 1.9.4 stable; tile providers unlikely to change; Astro script pattern stable)
