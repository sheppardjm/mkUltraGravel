# Phase 26: Photo Lightbox from Map - Research

**Researched:** 2026-03-29
**Domain:** PhotoSwipe 5 programmatic API + Leaflet divIcon thumbnail markers
**Confidence:** HIGH

## Summary

PhotoSwipe 5 (already installed at v5.4.4) has two modes of operation: a DOM-anchored mode (`PhotoSwipeLightbox` with `gallery`/`children` selectors) and a fully programmatic mode using a `dataSource` array. Phase 26 requires the programmatic mode because map markers are Leaflet divIcons, not `<a>` elements with `data-pswp-*` attributes.

The key API is `lightbox.loadAndOpen(index, dataSource)` — confirmed in PhotoSwipe docs and verified in the GitHub issue tracker. A single `PhotoSwipeLightbox` instance is initialized with the full 55-photo `dataSource` array on page load. When a map marker is clicked, `loadAndOpen(photoIndex)` is called to open at that photo. This is a well-documented pattern with no known breaking changes.

MAP-11 (larger thumbnail markers) is a straightforward Leaflet `divIcon` change: replace the current 10x10px colored square with an `<img>` tag pointing to `/images/thumbs/*.webp`. The current PhotoGallery already uses these thumbnails. MAP-12 is the programmatic lightbox open. Both changes live entirely in `RouteMap.astro`.

**Primary recommendation:** Initialize a single `PhotoSwipeLightbox` with `dataSource` array (no `gallery`/`children`), then call `lightbox.loadAndOpen(index)` directly from Leaflet marker click handlers. No DOM intermediary needed.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| photoswipe | 5.4.4 (already installed) | Full-screen lightbox with swipe | Already in use in PhotoGallery; v5 is framework-agnostic |
| leaflet | 1.9.4 (already installed) | Map markers + click handlers | Already the map library |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| photoswipe/lightbox | (part of photoswipe) | Lazy-loads the core module | Use `PhotoSwipeLightbox` with `pswpModule: () => import('photoswipe')` for code-splitting |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Programmatic dataSource | DOM `<a>` elements with `data-pswp-*` | DOM approach requires actual anchor elements on the page — impossible with Leaflet divIcons |
| `loadAndOpen()` direct call | Custom event bus (Pinia, etc.) | Overkill for Astro/vanilla JS; direct call is simpler |
| thumbnail img in marker | base64 data URI | Larger JS bundle; no benefit over `/images/thumbs/*.webp` which are already served |

**Installation:** No new packages needed. `photoswipe@5.4.4` is already in `package.json`.

## Architecture Patterns

### Recommended Project Structure

Only `RouteMap.astro` is modified. No new files.

```
src/components/RouteMap.astro     # All changes live here
public/images/thumbs/*.webp       # Already exists, used for thumbnail markers
public/data/photos.json           # Already has width/height/lat/lon for all 55 photos
src/styles/global.css             # Already imports photoswipe/style.css (no change needed)
```

### Pattern 1: Programmatic PhotoSwipe with dataSource Array

**What:** Initialize `PhotoSwipeLightbox` with a `dataSource` array built from `photos.json`. Call `lightbox.loadAndOpen(index)` from Leaflet click handlers.

**When to use:** When there are no anchor DOM elements — i.e., map markers, buttons, custom triggers.

**Example:**
```typescript
// Source: https://photoswipe.com/data-sources/
import PhotoSwipeLightbox from 'photoswipe/lightbox';

// Build dataSource from photos.json (already fetched for markers)
const dataSource = photos.map((photo: { filename: string; width: number; height: number; mi: number }) => ({
  src: `/images/${photo.filename}`,
  width: photo.width,
  height: photo.height,
  msrc: `/images/thumbs/${photo.filename.replace(/\.(jpg|jpeg|png|avif)$/i, '.webp')}`,
  alt: `Route photo at mile ${photo.mi}`,
}));

const lightbox = new PhotoSwipeLightbox({
  dataSource,
  pswpModule: () => import('photoswipe'),
  bgOpacity: 0.95,
  showHideAnimationType: 'fade',  // no DOM anchor to zoom from
});
lightbox.init();

// In marker click handler:
// lightbox.loadAndOpen(photoIndex);  // photoIndex = position in photos array
```

### Pattern 2: Leaflet divIcon with Thumbnail Image

**What:** Replace the current 10x10px colored square with an `<img>` showing the webp thumbnail. Set appropriate `iconSize` and `iconAnchor`.

**When to use:** MAP-11 — photo markers should display recognizable photo thumbnails, not abstract dots.

**Example:**
```typescript
// Source: https://leafletjs.com/reference.html (L.divIcon)
const photoIcon = (photo: { filename: string; mi: number }) => L.divIcon({
  className: 'photo-marker',
  html: `<img
    src="/images/thumbs/${photo.filename.replace(/\.(jpg|jpeg|png|avif)$/i, '.webp')}"
    alt="Route photo at mile ${photo.mi}"
    style="width:48px;height:48px;object-fit:cover;border:2px solid #22d3ee;border-radius:3px;display:block;"
    loading="lazy"
  />`,
  iconSize: [52, 52],    // img size + border
  iconAnchor: [26, 26],  // center anchor
  popupAnchor: [0, -28],
});
```

### Pattern 3: Per-Marker Click Handler with Index

**What:** Each Leaflet marker stores its index into the `photos` array. The click handler calls `loadAndOpen` with that index.

**When to use:** This is the bridge between the two patterns above.

**Example:**
```typescript
// photos is already fetched: photos.json array, sorted consistently
photos.forEach((photo: { filename: string; lat: number; lon: number; mi: number; width: number; height: number }, index: number) => {
  const icon = createPhotoIcon(photo);
  const marker = L.marker([photo.lat, photo.lon], { icon });

  marker.on('click', () => {
    lightbox.loadAndOpen(index);
  });

  photoMarkers.push(marker);
});
```

### Anti-Patterns to Avoid

- **Using popup for lightbox trigger:** Don't keep the `bindPopup` on photo markers. Clicking a marker should open the lightbox directly, not a popup first. Remove the current popup-with-image pattern.
- **Multiple lightbox instances:** Don't create one `PhotoSwipeLightbox` per marker. Create one instance with the full `dataSource` array, reuse it for all markers.
- **Anchor-based pattern in RouteMap:** Don't add hidden `<a>` elements to the page DOM just to satisfy PhotoSwipeLightbox's `gallery`/`children` mode. Use `dataSource` array directly.
- **Reinitializing PhotoSwipeLightbox after `destroy()`:** Once destroyed, an instance cannot be reinitiated. Don't call `lightbox.init()` again on the same instance.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Swipe navigation between photos | Custom swipe gesture detector | PhotoSwipe built-in | Touch events, velocity, rubber-band, edge cases |
| Keyboard navigation (arrow/esc) | Custom key handlers | PhotoSwipe built-in (`arrowKeys: true`, `escKey: true` defaults) | Focus trapping, accessibility included |
| Photo zoom/pan | Custom pinch-zoom handler | PhotoSwipe built-in | Multi-pointer, inertia, bounds |
| Opening animation | CSS transition from marker position | PhotoSwipe `showHideAnimationType: 'fade'` | No DOM anchor to compute zoom origin from |
| Loading spinner while full-res loads | Custom placeholder overlay | PhotoSwipe `msrc` property (shows thumbnail while loading) | Already built in |

**Key insight:** PhotoSwipe v5 handles the entire lightbox UX including swipe, zoom, keyboard, transitions, and accessibility. The only custom code needed is the data wiring (array construction + `loadAndOpen` call).

## Common Pitfalls

### Pitfall 1: AVIF filename → thumbnail mapping

**What goes wrong:** The `photos` array contains one AVIF file (`photo-1675213442182-24e1c1671387.avif`). The thumbnail regex must handle `.avif` extension, not just `.jpg/.jpeg/.png`.

**Why it happens:** The regex `replace(/\.(jpg|jpeg|png)$/i, '.webp')` silently fails for `.avif`, leaving the thumbnail src as the full-res AVIF file path with `.avif` extension, which has no corresponding thumbnail.

**How to avoid:** Use the same regex pattern already in `PhotoGallery.astro`:
```typescript
photo.filename.replace(/\.(jpg|jpeg|png|avif)$/i, '.webp')
```

**Warning signs:** Broken thumbnail images for the Billie Helmer B&W photo marker at mile 22.1.

### Pitfall 2: loadAndOpen called before lightbox.init()

**What goes wrong:** Clicking a marker immediately after page load (before Leaflet lazy-init completes) may fail if `lightbox` is not yet initialized. But this won't happen in practice because both the lightbox and markers are set up inside `initMap()`.

**How to avoid:** Initialize both the `PhotoSwipeLightbox` and the Leaflet markers inside the same `initMap()` function. Since `initMap()` is already guarded by `mapInitialized`, the lightbox will always exist before any markers are clickable.

### Pitfall 3: photoswipe/style.css double-import

**What goes wrong:** If `RouteMap.astro` imports `photoswipe/style.css` and `global.css` already does, CSS layers may conflict or duplicate.

**Why it happens:** Astro deduplicates same-file imports in static imports, but `import 'photoswipe/style.css'` inside `<script>` is runtime bundled differently.

**How to avoid:** Do NOT import `photoswipe/style.css` in `RouteMap.astro`. The CSS is already in `global.css` at line 13 under `@layer components`. The styles are globally available.

**Warning signs:** PhotoSwipe opens but backdrop/UI is unstyled, or there are cascade order warnings.

### Pitfall 4: Cluster click vs marker click

**What goes wrong:** `markerClusterGroup` intercepts cluster clicks (zoom to bounds) but must not intercept individual marker clicks. Individual marker `.on('click', ...)` handlers on the Leaflet marker objects are called after spiderfying/unclustering.

**Why it happens:** MarkerCluster fires its own click handlers; individual marker handlers fire independently.

**How to avoid:** Register click handlers on individual `L.marker` instances (not on `photoCluster`). MarkerCluster passes through individual marker events correctly. No special configuration needed.

**Warning signs:** Clicking a spiderfied (unclustered) marker opens lightbox at wrong index, or opens lightbox instead of spiderfying.

### Pitfall 5: Marker popup still shows after removing

**What goes wrong:** The current code calls `.bindPopup(...)` on each photo marker. If you remove the popup but keep the marker variable, a stale popup reference may remain.

**How to avoid:** Do not call `.bindPopup()` on photo markers at all in the new implementation. Clicking should open the lightbox, not a popup.

### Pitfall 6: showHideAnimationType must be 'fade' not 'zoom'

**What goes wrong:** Using `showHideAnimationType: 'zoom'` (the default) requires PhotoSwipe to find a DOM thumbnail element to zoom from. With `dataSource` array and no DOM anchor, the zoom animation has no origin element and falls back to `fade` anyway — but may throw a console error.

**How to avoid:** Set `showHideAnimationType: 'fade'` explicitly when using programmatic `dataSource` without DOM anchors.

## Code Examples

Verified patterns from official sources:

### Complete Programmatic Lightbox (no DOM gallery)
```typescript
// Source: https://photoswipe.com/data-sources/
import PhotoSwipeLightbox from 'photoswipe/lightbox';

const dataSource = photos.map((photo, index) => ({
  src: `/images/${photo.filename}`,
  width: photo.width,
  height: photo.height,
  msrc: `/images/thumbs/${photo.filename.replace(/\.(jpg|jpeg|png|avif)$/i, '.webp')}`,
  alt: `Route photo at mile ${photo.mi}`,
}));

const lightbox = new PhotoSwipeLightbox({
  dataSource,
  pswpModule: () => import('photoswipe'),
  bgOpacity: 0.95,
  showHideAnimationType: 'fade',
});
lightbox.init();
```

### loadAndOpen at Specific Index
```typescript
// Source: https://photoswipe.com/methods/
// Opens lightbox at the photo clicked (0-based index into dataSource array)
marker.on('click', () => {
  lightbox.loadAndOpen(index);
});
```

### Photo Thumbnail divIcon
```typescript
// Source: https://leafletjs.com/reference.html
const icon = L.divIcon({
  className: 'photo-marker',
  html: `<img
    src="/images/thumbs/${thumbFilename}"
    style="width:48px;height:48px;object-fit:cover;border:2px solid #22d3ee;border-radius:3px;"
    loading="lazy"
  />`,
  iconSize: [52, 52],
  iconAnchor: [26, 26],
});
```

### Cleanup on Map Reset (optional)
```typescript
// Source: PhotoSwipe methods docs
// If map:reset should also close any open lightbox:
window.addEventListener('map:reset', () => {
  // lightbox exposes .pswp if currently open
  if (lightbox.pswp) {
    lightbox.pswp.close();
  }
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PhotoSwipe 4 (jQuery-dependent) | PhotoSwipe 5 (no jQuery, ES modules, framework-agnostic) | 2022 | Full API rewrite; v4 patterns don't apply |
| `openPhotoSwipe()` global function (v4) | `lightbox.loadAndOpen(index)` (v5) | v5 release | Direct method call on instance |
| `items` array (v4) | `dataSource` option (v5) | v5 release | Cleaner initialization, filter API for dynamic data |

**Deprecated/outdated:**
- PhotoSwipe v4 API (`openPhotoSwipe`, `items` array, jQuery dependency): Completely replaced in v5. Any v4 tutorials are inapplicable.
- `pswpModule` as static import: Works but bypasses code splitting. Use `pswpModule: () => import('photoswipe')` for lazy loading.

## Open Questions

1. **Thumbnail size for MAP-11 ("larger thumbnails")**
   - What we know: Current markers are 10x10px colored squares. The requirement says "larger thumbnails."
   - What's unclear: No specific pixel size is defined in MAP-11. 48x48px is a reasonable default (matches 44px minimum touch target guideline + 4px border).
   - Recommendation: Use 48x48px thumbnail with 2px border = 52x52 logical icon. Adjust in verification if it looks wrong on the actual map.

2. **Cluster icon behavior with photo thumbnails**
   - What we know: Clusters currently show a count badge with cyan border. Individual markers change from dots to thumbnail images.
   - What's unclear: Should cluster icons also show a photo montage, or keep the count badge?
   - Recommendation: Keep the existing cluster icon (count badge). Only change individual marker icons. Cluster montage would require significant custom logic with no clear UX benefit.

3. **`lightbox.pswp` property availability**
   - What we know: The `pswp` property on the lightbox instance is documented as accessible after opening. But the exact availability during `map:reset` is not documented.
   - What's unclear: Whether calling `lightbox.pswp?.close()` on reset is safe if nothing is open.
   - Recommendation: Use optional chaining: `lightbox.pswp?.close()`. This is safe — if `pswp` is null/undefined, nothing happens.

## Sources

### Primary (HIGH confidence)
- https://photoswipe.com/data-sources/ — dataSource array structure, `loadAndOpen` with array
- https://photoswipe.com/methods/ — `loadAndOpen(index, dataSource, point)` signature, `init()`, `destroy()`
- https://photoswipe.com/options/ — `dataSource`, `pswpModule`, `bgOpacity`, `showHideAnimationType` options
- https://photoswipe.com/getting-started/ — CSS import path (`photoswipe/style.css`), NPM module paths
- https://github.com/dimsemenov/PhotoSwipe/releases — v5.4.4 is current, v5.4.2 made `dataSource` param optional in `loadAndOpen`
- project `package.json` — PhotoSwipe 5.4.4 already installed
- project `src/styles/global.css` line 13 — `photoswipe/style.css` already imported globally

### Secondary (MEDIUM confidence)
- https://github.com/dimsemenov/PhotoSwipe/issues/1848 — Confirmed `loadAndOpen(index, { gallery })` pattern for opening from outside gallery HTML; also confirms direct `loadAndOpen(index)` when `dataSource` is set on lightbox options
- https://dev.to/trincadev/from-leaflet-popup-marker-to-photo-gallery-image-and-back-2f6k — Real-world Leaflet + PhotoSwipe integration pattern (uses Pinia but confirms `loadAndOpen(index)` call)

### Tertiary (LOW confidence)
- WebSearch results for Leaflet divIcon thumbnail sizes — community conventions only, no authoritative spec

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — PhotoSwipe already installed; API verified against official docs
- Architecture: HIGH — `loadAndOpen` with `dataSource` is documented; Leaflet `divIcon` with `<img>` is standard
- Pitfalls: HIGH — AVIF regex and CSS double-import verified against actual project code; cluster behavior verified against Leaflet MarkerCluster docs behavior

**Research date:** 2026-03-29
**Valid until:** 2026-04-29 (stable library, no fast-moving parts)
