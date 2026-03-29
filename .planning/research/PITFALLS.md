# Domain Pitfalls

**Domain:** Gravel cycling event website -- static site with interactive map, GPX overlay, geo-located photos, dark brutalist design
**Project:** MK Ultra Gravel
**Researched:** 2026-03-29
**Scope:** v4.0 -- Route Update + UX Overhaul (adding features to existing Astro 6 + Leaflet + Chart.js system)

---

> This file replaces the v2.0 pitfalls document. It addresses what can go wrong when
> updating the GPX route (80mi to 100mi), integrating PhotoSwipe with Leaflet map markers,
> adding a map reset button, resizing Leaflet zoom controls, equalizing card layouts,
> adding a Penrose triangle animation, processing new photos, and updating content references.
> All pitfalls are grounded in actual code inspection of the codebase (2,703 LOC).

---

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or break the deployed site.

### Pitfall 1: GPX Replacement Cascading Data Corruption

**What goes wrong:** Replacing `MK Ultra.gpx` with a new 100mi GPX file changes the underlying track geometry. Every mile marker in the system is resolved against this track via `findPointAtMile()` in `resolve-annotations.js` and `match-photos.js`. If the new GPX has a different start point, different routing through Marquette, or different trackpoint density, then:

1. **Sector coordinates shift.** `resolve-annotations.js` hardcodes sectors by `startMi` (e.g., Sandstrom at 23.4, C4 at 58.7, Down Jeep at 83.55). These mile markers were calibrated to the OLD GPX. A new GPX with a different path will map these mile values to different lat/lon positions -- potentially placing sector overlays off the actual road.

2. **Photo positions shift.** `photo-manifest.js` has 53 entries with hardcoded `mi` values (19.6 through 80.2). These were "verified by route owner 2026-03-29 via photo-verify tool" against the current GPX. A new GPX changes where `mi: 40.2` maps to on the ground.

3. **KOM segments shift.** Same mechanism -- Billie Helmer (21.9mi), Leaving Chatham (37.6mi), Silver Creek (78.55mi) all resolve via mile-marker lookup.

4. **Restock points shift.** Chatham Convenience Store (37.3mi), Rumely Gas Station (46.3mi), Dollar General (76.1mi) resolve the same way.

5. **Card cover photos break silently.** `assign-card-photos.js` selects coverPhoto by finding photos within `[startMi, startMi+lengthMi]`. If sector boundaries shift relative to photo positions, different (wrong) cover photos get selected -- or the fallback nearest-photo path triggers with no warning visible in the deployed site.

**Why it happens:** The pipeline architecture ties ALL annotation positions to mile-marker values that are only meaningful relative to a specific GPX track. There is no position-pinning mechanism (no lat/lon anchors for annotations).

**Consequences:** Sector overlays appear on wrong roads. Photo markers float in forests. KOM climb overlays miss the actual hill. Everything looks subtly wrong but the build succeeds with zero errors.

**Warning signs:**
- `resolve-annotations.js` emits `WARNING: Mile marker X exceeds route end` for any annotation past the new GPX's total distance
- `match-photos.js` emits similar warnings for photos past route end
- Sector polylines on the map visibly don't align with the road
- `route-data.json` meta shows different `totalMi` than expected

**Prevention:**
1. Run the pipeline (`npm run prebuild`) immediately after GPX replacement
2. Visually inspect EVERY sector overlay on the map at zoom level 14+
3. Check that all restock markers are on or adjacent to roads
4. Verify photo markers cluster along the route polyline, not in empty forest
5. If ANY mile markers are wrong, update them in `resolve-annotations.js` (sectors/KOMs/restocks) and `photo-manifest.js` (photos) BEFORE considering the GPX swap complete
6. Consider: if the route changed significantly, ALL 53 photo mile markers need re-verification

**Detection:** Compare before/after screenshots at each sector. Diff `annotations.json` lat/lon values pre and post pipeline run.

**Phase:** Must be addressed FIRST -- before any other v4.0 work. All other features depend on correct route data.

**Confidence:** HIGH -- verified by reading `resolve-annotations.js` lines 43-71, `match-photos.js` lines 58-86, `assign-card-photos.js` lines 49-68.

---

### Pitfall 2: Two GPX Files -- Wrong One Gets Used

**What goes wrong:** The repo currently contains TWO GPX files:
- `MK Ultra.gpx` (231KB, 7516 lines, dated Mar 26) -- the current active file
- `MK_Ultra.gpx` (237KB, 8352 lines, dated Mar 29) -- a newer file with underscore naming

`parse-gpx.js` line 29 hardcodes: `const GPX_SOURCE = path.join(ROOT, 'MK Ultra.gpx');` (with SPACE, not underscore). The newer `MK_Ultra.gpx` file is ignored by the pipeline entirely.

**Why it happens:** The GPX source path is hardcoded with a space in the filename. If the new 100mi GPX is saved as `MK_Ultra.gpx` (or any name other than exactly `MK Ultra.gpx`), the pipeline will silently continue using the old file.

**Consequences:** You think you updated the route but the site still shows the old track. Worse: if you delete the old file without renaming the new one, the pipeline fails with "GPX source file not found" and the build breaks entirely.

**Warning signs:**
- `route-data.json` meta `totalMi` doesn't change after "replacing" the GPX
- The map shows the same route geometry as before

**Prevention:**
1. Before replacing: document which file is the active source (`MK Ultra.gpx` with space)
2. Replace by overwriting the exact filename, or update the path in `parse-gpx.js` line 29
3. After pipeline run, verify `route-data.json` meta shows the expected new `totalMi` and `trackpoints` count
4. Delete the unused GPX file to prevent future confusion

**Phase:** Route update phase. First step.

**Confidence:** HIGH -- verified by reading `parse-gpx.js` line 29 and `ls` output showing both files.

---

### Pitfall 3: Elevation Profile X-Axis Max Mismatch After Route Change

**What goes wrong:** `ElevationProfile.astro` line 196 hardcodes `max: 100` for the x-axis:
```
x: { type: 'linear', min: 0, max: 100, ... }
```

The current GPX produces `totalMi: 98.23`. If the new 100mi GPX produces exactly 100.0mi, this is fine. But if it produces 101.2mi or 99.5mi, the chart either clips the last mile or has dead space. More critically: if the new route is genuinely 100mi, sector bands for "Down Jeep" at 83.55mi will render correctly, but any new annotations past mile 100 would be invisible.

**Why it happens:** The x-axis max was set to 100 as a "forward-compatible" value (noted in the code comment) but it's still a hardcoded assumption about route length.

**Prevention:**
1. After GPX replacement, check `route-data.json` meta `totalMi`
2. If > 100, update the `max` value in ElevationProfile.astro
3. Consider making it dynamic: read from route-data.json meta instead of hardcoding

**Phase:** Route update phase. Verify after pipeline re-run.

**Confidence:** HIGH -- verified by reading `ElevationProfile.astro` line 196.

---

## Moderate Pitfalls

Mistakes that cause broken UX, visual bugs, or require non-trivial fixes.

### Pitfall 4: PhotoSwipe + Leaflet Popup Integration -- Event Propagation Conflict

**What goes wrong:** Currently, photo markers on the map open popups with `<a href="/images/..." target="_blank">` links (RouteMap.astro lines 198-204). The v4.0 goal is to replace this with PhotoSwipe lightbox on click. The problem: Leaflet popups intercept click events before they bubble to PhotoSwipe. Specifically:

1. Leaflet's popup content is injected into a `.leaflet-popup-content` div that sits inside Leaflet's event capture layer
2. PhotoSwipe expects to bind to gallery items via CSS selector (`gallery: '#photo-gallery', children: '.gallery-item'`)
3. Leaflet popup HTML is dynamically created/destroyed on each marker click -- it doesn't exist in the DOM until the popup opens
4. PhotoSwipe's `lightbox.init()` runs once at page load and scans for `.gallery-item` elements -- it will NOT find dynamically created popup content

**Why it happens:** PhotoSwipe and Leaflet have completely separate DOM ownership models. PhotoSwipe expects static gallery markup. Leaflet creates/destroys popup DOM dynamically.

**Consequences:** Clicking a photo marker either: (a) opens the popup but PhotoSwipe doesn't trigger, (b) triggers PhotoSwipe but from the wrong context, or (c) both fire causing double-open behavior.

**Warning signs:**
- Photo marker click opens a popup with an image but no lightbox
- Console errors about missing PhotoSwipe gallery items
- Lightbox opens but with wrong image index

**Prevention:**
1. Do NOT try to put PhotoSwipe gallery markup inside Leaflet popups
2. Instead: intercept the marker click event BEFORE it opens a popup. Use `marker.on('click', ...)` to trigger PhotoSwipe programmatically via its API (`lightbox.loadAndOpen(index)`)
3. The photo markers array (`photoMarkers` in RouteMap.astro line 196) already has the photo data -- use the marker's index to open the correct PhotoSwipe slide
4. Remove `bindPopup()` from photo markers entirely -- replace with direct PhotoSwipe open
5. PhotoSwipe needs a data source (array of `{src, width, height}` items) that matches the photos array. This data exists in `photos.json` (which includes `width` and `height` from the thumbnail generator)

**Alternative approach:** Use PhotoSwipe's dynamic slide data source pattern instead of DOM-based gallery. Feed it the photos array directly and trigger `loadAndOpen(index)` from marker click.

**Phase:** PhotoSwipe integration phase.

**Confidence:** HIGH -- verified by reading PhotoSwipe init pattern (PhotoGallery.astro lines 37-48), Leaflet marker binding (RouteMap.astro lines 196-204), and understanding Leaflet's popup lifecycle.

---

### Pitfall 5: Map Reset Button -- Incomplete State Restoration

**What goes wrong:** The map has at least 8 independent pieces of state that can diverge from the initial view. A reset button that only calls `map.fitBounds(routeLine.getBounds())` will leave ghost state:

| State | How it changes | What reset must do |
|-------|---------------|-------------------|
| Zoom + center | `flyToBounds()` on sector click (RouteMap.astro line 270) | `fitBounds(routeLine.getBounds(), { padding: [20, 20] })` |
| Open popups | Clicking any marker/sector | `map.closePopup()` |
| Sector highlight styles | `map:sectorClick` sets weight:7/opacity:1 on one, dims others to 0.4 (RouteMap.astro lines 263-268) | Restore ALL polylines to `originalStyle` (weight:5, opacity:0.9) |
| Elevation chart sector highlight | `map:sectorClick` event persists highlighted band (ElevationProfile.astro lines 249-265) | Dispatch reset event to restore all annotation band colors |
| Bike crosshair marker | `elevation:hover` sets opacity:1 (RouteMap.astro line 249) | `crosshair.setOpacity(0)` |
| Sector badge visibility | Zoom-dependent (`zoomend` handler, RouteMap.astro line 143) | Will auto-correct when zoom resets |
| MarkerCluster state | Spiderfy state if user clicked a cluster | `photoCluster.unspiderfy()` or let fitBounds handle it |
| Chart tooltip | Hovering over elevation chart | Chart.js tooltip auto-hides, no action needed |

**Why it happens:** The map + elevation chart communicate via 6 CustomEvents (`elevation:hover`, `elevation:hoverEnd`, `elevation:sectorClick`, `map:sectorHover`, `map:sectorClick`). Each event modifies state in the receiving component. A reset must either reverse all these state changes or dispatch a new "reset" event that both components listen to.

**Consequences:** User clicks "Reset" but sectors remain dimmed, or the elevation chart still shows a highlighted band, or the bike crosshair is still visible at the last hovered position.

**Warning signs:**
- After clicking reset, visual artifacts remain (dimmed sectors, highlighted bands)
- Reset works for zoom/center but sectors look wrong
- Crosshair visible at [0,0] after reset

**Prevention:**
1. Define a `map:reset` CustomEvent that both RouteMap and ElevationProfile listen to
2. In RouteMap's handler: `fitBounds()`, `closePopup()`, restore all sector styles, hide crosshair, unspiderfy clusters
3. In ElevationProfile's handler: restore all annotation band colors to defaults, call `chart.update('none')`
4. The reset button should be OUTSIDE both components (in index.astro or a wrapper) and dispatch the single event
5. Store `initialBounds` at map init time -- don't recalculate from routeLine every time (the polyline reference is inside the initMap closure)

**Phase:** Map reset button phase. Design the event contract first, implement in both components.

**Confidence:** HIGH -- verified by tracing all state mutations in RouteMap.astro and ElevationProfile.astro.

---

### Pitfall 6: Leaflet Zoom Control CSS Specificity War

**What goes wrong:** The existing zoom control styles in `global.css` lines 200-207 use `!important` on every property:

```css
.leaflet-control-zoom a {
  background: oklch(0.18 0.01 250) !important;
  color: oklch(0.85 0.01 90) !important;
  border-color: oklch(0.25 0.01 250) !important;
}
```

To make controls larger, you need to override `width`, `height`, `line-height`, and `font-size`. But Leaflet's own CSS (imported via `@import "leaflet/dist/leaflet.css" layer(leaflet)`) sets these properties. The `@layer leaflet` declaration in `global.css` line 4 means Leaflet CSS has the LOWEST priority in the cascade. This is actually good -- it means overrides in `@layer components` should win without `!important`.

BUT: the existing `!important` declarations set a precedent. If new sizing styles are added WITHOUT `!important` while neighboring properties use it, the cascade behavior becomes confusing to maintain. Worse: if someone later adds `!important` to Leaflet's own CSS import (thinking they need it), the entire layer system breaks.

**Why it happens:** The layer system (`@layer leaflet, base, components, utilities`) was designed correctly, but `!important` was added as a belt-and-suspenders measure on the color overrides. New size overrides must follow the same pattern for consistency.

**Consequences:** Zoom controls either don't resize (Leaflet's inline styles win) or resize inconsistently (width changes but not height).

**Prevention:**
1. Add size overrides in the same `@layer components` block as existing Leaflet overrides (global.css ~line 200)
2. Use `!important` on ALL new properties to match the existing pattern -- don't mix `!important` and non-`!important` in the same selector block
3. Target `.leaflet-control-zoom a` for both `+` and `-` buttons
4. Set `width`, `height`, `line-height`, and `font-size` together -- they are interdependent
5. Test at mobile and desktop breakpoints -- Leaflet has no responsive controls by default
6. Check that the zoom control doesn't overlap the attribution control when made larger

**Phase:** Map zoom controls phase.

**Confidence:** HIGH -- verified by reading `global.css` lines 1-4 (layer declaration) and lines 200-207 (existing zoom styles).

---

### Pitfall 7: Card Layout Equalization -- `space-y-4` Prevents CSS Grid Alignment

**What goes wrong:** Both `GravelSectors.astro` and `KomSegments.astro` use `<div class="space-y-4">` as their root wrapper, which applies `margin-top` between children. The parent in `index.astro` (line 272) uses:

```html
<div class="grid md:grid-cols-3 gap-8">
  <div class="md:col-span-2"> <!-- sectors -->
  <div> <!-- KOM + restock -->
```

The v4.0 goal is to make sector cards the same size as KOM cards. The problem: these are in SEPARATE grid cells. The sectors are in a `col-span-2` column, KOM in a `col-span-1` column. CSS Grid can equalize heights of items in the SAME row, but it cannot equalize card heights across different grid cells unless you restructure the layout.

Additionally, both card components use `space-y-4` (vertical stack) -- cards are NOT in a sub-grid. Even within the sectors column, cards are vertically stacked, not in a card grid. Making them "the same size" requires either:
- Converting both to a shared CSS grid with `auto-rows: 1fr` (forces equal height)
- Setting explicit `min-height` on cards (brittle, breaks with content changes)
- Using `subgrid` (limited browser support with older Safari)

**Why it happens:** The current layout treats sectors and KOMs as independent vertical lists in separate columns. "Same size" across columns requires a fundamentally different layout strategy.

**Consequences:** Either cards are the wrong height, or the layout restructure breaks the existing responsive behavior.

**Prevention:**
1. Clarify the requirement: does "same size" mean same card HEIGHT, same card WIDTH, or both?
2. If same height: wrap cards in a grid with `grid-auto-rows: 1fr` within each column
3. If matching across columns: this requires restructuring the parent grid or using JavaScript to measure and set heights
4. Preserve the `aspect-video` image ratio (16:9) on card images -- don't stretch
5. Test with cover photos of different aspect ratios (the pipeline generates 600x338 but display is `object-cover`)

**Phase:** Card layout phase. Clarify requirement before implementation.

**Confidence:** MEDIUM -- the exact requirement for "resized to match KOM cards" needs clarification.

---

### Pitfall 8: Penrose Triangle Animation Z-Index Collision

**What goes wrong:** The site has a crowded z-index stack:

| Element | z-index | Source |
|---------|---------|--------|
| grain-overlay | 9999 | global.css line 90 |
| escher-overlay | 9998 | global.css line 101 |
| Section content | 10 (via Tailwind `z-10`) | index.astro lines 203, 245, 270, 294, 307 |
| Route map | 0 | RouteMap.astro line 15 |
| Leaflet internal layers | 400-800 (Leaflet's own z-index system) | Leaflet CSS |
| Bike crosshair | +1000 (zIndexOffset) | RouteMap.astro line 238 |

A Penrose triangle "above page title" in the hero section must:
- Appear ABOVE the hero background image (`.tone-image` with `position: absolute`)
- Appear ABOVE the hero content (`z-10`)
- Appear BELOW the grain-overlay (9999) and escher-overlay (9998) for visual consistency
- NOT interfere with the Leaflet map's internal z-index system when scrolled past

**Why it happens:** The z-index values jump from 10 to 9998 with nothing in between. Any new fixed/absolute element must pick a value in this gap. But the hero section uses `overflow: hidden`, which creates a new stacking context -- z-index values inside it are relative to the section, not the page.

**Consequences:** Triangle either hidden behind overlays, or appears above everything (including map controls and popups), or doesn't animate because `will-change: transform` creates a new stacking context that fights with existing ones.

**Prevention:**
1. Place the Penrose triangle as a sibling of the hero content div (inside `#hero` section, alongside the `z-10` div)
2. Give it `z-index: 5` (below content text at z-10, above tone image at z-auto)
3. Do NOT use `position: fixed` -- use `position: absolute` within the hero section
4. Use `will-change: transform` sparingly -- only during animation, remove after (or accept the stacking context)
5. Test that grain-overlay and escher-overlay still render on top

**Phase:** Penrose triangle phase.

**Confidence:** HIGH -- verified z-index values by reading global.css and all component styles.

---

### Pitfall 9: Penrose Triangle Animation Performance -- Compositor Thread vs Main Thread

**What goes wrong:** The existing animations in the codebase are all compositor-safe:
- `escher-drift` uses only `transform` (global.css lines 253-257)
- `reveal` uses only `opacity` + `transform` (global.css lines 37-46)
- `card-hover` uses only `box-shadow` with `transition: 0ms step-start` (effectively no transition cost)

PROJECT.md explicitly notes: "All animations compositor-safe (transform/opacity only). TBT 0ms baseline."

If the Penrose triangle animation uses properties like `scale`, `rotate`, or `filter` (not `transform: scale()/rotate()`), or triggers layout (e.g., `width`, `height`, `margin`), it will break the TBT 0ms baseline.

**Why it happens:** CSS `scale` and `rotate` are now standalone properties (not sub-properties of `transform`). They ARE compositor-safe in modern browsers, but they create new stacking contexts. The risk is using properties that LOOK safe but aren't (e.g., `filter: drop-shadow()` forces main-thread repaint, `clip-path` forces repaint on some engines).

**Consequences:** Lighthouse Performance score drops. TBT increases from 0ms. CLS potentially increases if animation causes layout shift.

**Prevention:**
1. Use ONLY `transform` and `opacity` for the animation
2. Gate behind `@media (prefers-reduced-motion: no-preference)` -- same pattern as `escher-drift` (global.css line 259)
3. Use `will-change: transform` on the element (but be aware of stacking context implications from Pitfall 8)
4. Keep animation duration long and easing smooth (like escher-drift at 50s) to avoid visual jank
5. Test with Lighthouse after implementation -- verify TBT stays 0ms
6. The existing `escher-overlay` animation (global.css line 262) is a good template to follow

**Phase:** Penrose triangle phase.

**Confidence:** HIGH -- verified animation patterns and performance baseline in PROJECT.md and global.css.

---

### Pitfall 10: New Photo Addition -- Pipeline Assumptions and Manual Steps

**What goes wrong:** Adding 2 new photos (Down Jeep + Billie Helmer B&W) requires 5 coordinated manual steps, any of which silently breaks the pipeline:

1. **File placement.** Photos must go in `/images/` (root, not `public/images/`). The pipeline copies from `images/` to `public/images/` at line 21-29 of `generate-data.js`. Placing them directly in `public/images/` means they bypass the pipeline and won't get thumbnails or photos.json entries.

2. **Manifest entry format.** Each entry in `photo-manifest.js` is `{ filename: 'exact-filename.jpg', mi: 40.2 }`. The filename must EXACTLY match the file in `images/`. Case-sensitive. No path prefix.

3. **Mile marker accuracy.** The `mi` value must correspond to where on the NEW route (after GPX replacement) the photo was taken. If you assign `mi: 83.55` for a Down Jeep photo but the new GPX puts mile 83.55 at a different location, the photo marker will be misplaced.

4. **Photo dimensions.** `generate-thumbnails.js` reads original image dimensions via `sharp(srcPath).metadata()` and writes them to `photos.json`. PhotoGallery.astro reads `data-pswp-width` and `data-pswp-height` from this data. If sharp can't read the image (corrupt file, unsupported format), the entire pipeline fails.

5. **File format.** The manifest filter (generate-data.js line 26) matches `/\.(jpg|jpeg|png|webp)$/i`. The PhotoGallery thumbnail path replacement (PhotoGallery.astro line 24) does `.replace(/\.(jpg|jpeg|png)$/i, '.webp')`. If a new photo is `.webp` format, the thumbnail regex won't match and the thumbnail `src` will be wrong.

**Why it happens:** The pipeline was designed for batch processing of a fixed photo set. Adding individual photos requires understanding the full chain: `images/` -> `photo-manifest.js` -> `match-photos.js` -> `photos.json` -> `generate-thumbnails.js` -> `photos.json` (enriched) -> `assign-card-photos.js` -> `annotations.json`.

**Consequences:** Missing thumbnails (404 in gallery), wrong photo positions on map, pipeline build failure, or PhotoSwipe lightbox showing wrong dimensions.

**Warning signs:**
- `npm run prebuild` fails with sharp error
- New photos don't appear in gallery
- New photos appear at wrong position on map
- Gallery shows broken image icons for thumbnails

**Prevention:**
1. Place source files in `/images/` (NOT `public/images/`)
2. Add manifest entries with verified mile markers for the NEW GPX
3. Run `npm run prebuild` and check for warnings
4. Verify `photos.json` has the new entries with correct `width`/`height`
5. Verify `public/images/thumbs/` has new `.webp` thumbnails
6. Check that the gallery grid shows the new photos at the correct position

**Phase:** Photo addition phase. Must happen AFTER GPX replacement (Pitfall 1) so mile markers are accurate.

**Confidence:** HIGH -- verified by tracing the complete pipeline in generate-data.js, photo-manifest.js, match-photos.js, and generate-thumbnails.js.

---

### Pitfall 11: Content "80 miles" to "100 miles" -- Scattered References

**What goes wrong:** The distance reference exists in multiple places with different update mechanisms:

| Location | Current Value | Update Mechanism |
|----------|--------------|------------------|
| `index.astro` line 210 | "100 miles" (hardcoded) | Manual edit |
| `index.astro` line 249 | `{Math.round(routeMeta.totalMi)} miles` | Dynamic from route-data.json |
| `BaseLayout.astro` line 12 | "100 miles" (meta description) | Manual edit |
| `MkUltraExplainer.astro` line 33 | "100 miles" (body text) | Manual edit |
| `ElevationProfile.astro` line 196 | `max: 100` (x-axis range) | Manual edit |
| `PROJECT.md` line 108 | "Distance: 100 miles" | Manual edit |

The hero (line 210) and meta description (BaseLayout line 12) already say "100 miles". The route section (line 249) dynamically reads from `route-data.json` which currently shows 98.23mi, producing "98 miles" after `Math.round()`. This is the EXISTING inconsistency noted in v2.0 verification.

After the 100mi GPX replacement, `routeMeta.totalMi` should become ~100.x, and `Math.round()` will produce 100 or 101. If the GPX total is 100.6mi, the route section will say "101 miles" while everything else says "100 miles".

**Why it happens:** Mix of hardcoded strings and dynamic values. The dynamic value was intentionally left dynamic to "auto-update when GPX changes" but `Math.round()` doesn't guarantee matching the marketing copy.

**Consequences:** Users see "100 miles" in the hero but "101 miles" (or "98 miles") in the route section. Minor credibility issue.

**Prevention:**
1. After GPX replacement, check `route-data.json` meta `totalMi` exact value
2. If `Math.round(totalMi)` != 100, consider `Math.floor()` or hardcoding "100" in the route section
3. Search all files for distance references: `grep -r "miles\|100 mi\|80 mi" src/`
4. The `ElevationProfile.astro` x-axis `max: 100` is already correct if the route is ~100mi
5. Decide: is the canonical distance "100 miles" (marketing) or the actual GPS distance?

**Phase:** Content update phase. Verify after GPX replacement.

**Confidence:** HIGH -- verified all references via grep and code inspection.

---

## Minor Pitfalls

Mistakes that cause annoyance, visual inconsistency, or minor rework.

### Pitfall 12: Grinduro Explainer Placement -- Section Scroll Anchor Confusion

**What goes wrong:** The v4.0 target says "Grinduro-style event format explainer in sector section." The current sector section (`#sectors` in index.astro line 269) contains the grid with GravelSectors + KomSegments + RestockPoints. Adding a Grinduro explainer here increases the section length and pushes the actual cards further down. If users navigate via `#sectors` anchor, they'll see the explainer text first, not the cards.

**Why it happens:** Section anchors point to the top of the section. Adding content above the cards shifts everything down.

**Prevention:**
1. Place the explainer ABOVE the card grid but BELOW the section heading
2. Keep it concise (1-2 short paragraphs)
3. Test the `#sectors` anchor scroll position after adding content
4. Consider: should this be a separate component like `MkUltraExplainer.astro`?

**Phase:** Content phase.

**Confidence:** MEDIUM -- depends on exact placement decision.

---

### Pitfall 13: Photo Marker Popup to Lightbox -- Losing Context

**What goes wrong:** Currently, clicking a photo marker opens a Leaflet popup showing a small image with a link to the full image. The v4.0 change to PhotoSwipe lightbox means the user leaves the map context entirely (PhotoSwipe covers the full screen). After closing PhotoSwipe, the user is back on the page but potentially scrolled to the gallery section (if PhotoSwipe was also initialized there).

**Why it happens:** PhotoSwipe maintains its own scroll/focus state. Opening a lightbox from the map section and closing it should return focus to the map, but PhotoSwipe's default behavior doesn't guarantee this.

**Prevention:**
1. Use separate PhotoSwipe instances for map and gallery (different `gallery` selectors)
2. Or use the programmatic API (`loadAndOpen(index, dataSource)`) with a separate data source for map photos
3. Test that closing the lightbox returns focus/scroll to the map section
4. Consider: should map PhotoSwipe show only the clicked photo, or allow swiping through all route photos?

**Phase:** PhotoSwipe integration phase.

**Confidence:** MEDIUM -- depends on PhotoSwipe's programmatic API behavior.

---

### Pitfall 14: Map Reset Button Position and Accessibility

**What goes wrong:** The v4.0 spec says "below map." The map is followed immediately by the ElevationProfile in the DOM (index.astro lines 251-252):

```html
<RouteMap />
<ElevationProfile />
```

A reset button "below map" could mean between map and elevation chart, or below both. If placed between them, it visually breaks the map-elevation pairing. If placed below both, it's far from the map (the elevation chart is 140-180px tall).

Additionally, the button must be keyboard accessible and discoverable. A plain text button near a canvas chart can be overlooked.

**Prevention:**
1. Place the button between map and elevation chart but styled to feel like part of the map (position it absolutely over the map's bottom edge, or as a floating button)
2. OR place it below the elevation chart with clear visual connection to the map
3. Use a visible button with clear label ("Reset Map") not just an icon
4. Include `aria-label` if using an icon button
5. The button dispatches a single `map:reset` event (see Pitfall 5)

**Phase:** Map reset phase. Design decision needed before implementation.

**Confidence:** MEDIUM -- placement is a design decision.

---

### Pitfall 15: Down Jeep Sector at Mile 83.55 -- Beyond Current Photo Coverage

**What goes wrong:** The photo manifest ends at mile 80.2 (`AU6maRolPI2hBS7Tu7-zDxC6u20udvzQv6Dix2f_jhQ-1536x2048.jpg`). The Down Jeep sector spans miles 83.55-84.15. `assign-card-photos.js` will use the nearest-photo fallback (the mi:80.2 photo) for Down Jeep's card cover, which is 3+ miles away from the actual sector.

The v4.0 goal includes adding a Down Jeep photo. If this photo is added BEFORE the card assignment runs, the new photo should be selected as Down Jeep's cover. But if the photo's mile marker in the manifest is wrong (e.g., assigned mi:84.0 when the new GPX puts the sector at a different mile), the assignment may still use the fallback.

**Why it happens:** The card photo algorithm (assign-card-photos.js line 54) checks `p.mi >= startMi && p.mi <= endMi`. The new photo must have a `mi` value within [83.55, 84.15] to be selected for Down Jeep.

**Prevention:**
1. Add the Down Jeep photo to the manifest with a `mi` value between 83.55 and 84.15
2. Run the pipeline and verify `annotations.json` shows the new photo as Down Jeep's `coverPhoto`
3. Check the console output for "no photos within range" warnings -- there should be NONE for Down Jeep after adding the photo
4. Same applies for Billie Helmer (mi 21.9-22.59) -- the new photo's `mi` must fall in this range

**Phase:** Photo addition phase. Coordinate with GPX replacement.

**Confidence:** HIGH -- verified by reading assign-card-photos.js algorithm and current photo coverage gaps.

---

## Phase-Specific Warnings

Summary table mapping each v4.0 feature to its most likely pitfall and mitigation.

| Phase/Feature | Primary Pitfall | Severity | Mitigation |
|---------------|----------------|----------|------------|
| GPX route replacement | Cascading data corruption (P1) + wrong file (P2) | CRITICAL | Replace exact filename, re-run pipeline, visually verify ALL annotations |
| GPX route replacement | Elevation x-axis mismatch (P3) | MODERATE | Check totalMi, update max if needed |
| GPX route replacement | Content distance inconsistency (P11) | MINOR | Grep all "miles" references, decide canonical distance |
| PhotoSwipe from map markers | Event propagation conflict (P4) | MODERATE | Use programmatic API, don't nest PhotoSwipe in popups |
| PhotoSwipe from map markers | Losing map context (P13) | MINOR | Separate PhotoSwipe instances for map vs gallery |
| Map reset button | Incomplete state restoration (P5) | MODERATE | Define reset event, handle ALL 8 state items |
| Map reset button | Button placement (P14) | MINOR | Design decision -- between map+chart or below both |
| Map zoom controls | CSS specificity war (P6) | MODERATE | Match existing !important pattern, set all size props together |
| Card layout equalization | Grid alignment across columns (P7) | MODERATE | Clarify requirement (height vs width), restructure if needed |
| Penrose triangle | Z-index collision (P8) | MODERATE | Use z-5 inside hero section, test overlay layering |
| Penrose triangle | Animation performance (P9) | MODERATE | Transform/opacity only, reduced-motion gate, verify TBT 0ms |
| New photos | Pipeline assumptions (P10) | MODERATE | Follow 5-step checklist, place in /images/ not /public/images/ |
| New photos | Down Jeep coverage gap (P15) | MINOR | Ensure mi value falls within sector range |
| Grinduro explainer | Scroll anchor shift (P12) | MINOR | Place below heading, keep concise |

## Dependency Order for v4.0

Based on pitfall analysis, the safest implementation order is:

1. **GPX replacement first** -- everything depends on correct route data (P1, P2, P3)
2. **New photos second** -- mile markers must be set against the new GPX (P10, P15)
3. **Content updates third** -- distance references need final totalMi value (P11)
4. **Map reset button fourth** -- requires understanding current state model (P5)
5. **PhotoSwipe integration fifth** -- depends on photos.json being correct (P4, P13)
6. **Card layout sixth** -- independent of data pipeline (P7)
7. **Zoom controls seventh** -- CSS-only change, low risk (P6)
8. **Penrose triangle eighth** -- purely additive, no data dependencies (P8, P9)
9. **Grinduro explainer ninth** -- content only, lowest risk (P12)

## Sources

All pitfalls verified by direct codebase inspection:

- `scripts/parse-gpx.js` -- GPX source path (line 29), track parsing, route-data.json output format
- `scripts/resolve-annotations.js` -- hardcoded sector/KOM/restock mile markers, findPointAtMile algorithm
- `scripts/match-photos.js` -- photo position resolution, validation checks
- `scripts/photo-manifest.js` -- manifest format, mile marker values, curated 53-photo list
- `scripts/generate-thumbnails.js` -- sharp metadata read, thumbnail generation, photos.json enrichment
- `scripts/assign-card-photos.js` -- cover photo selection algorithm (two-pass: within-range, then nearest fallback)
- `scripts/generate-data.js` -- pipeline orchestration, image copy from images/ to public/images/
- `src/components/RouteMap.astro` -- map init, sector overlays, photo markers, crosshair, event bus
- `src/components/ElevationProfile.astro` -- chart init, sector bands, x-axis max:100, event bus
- `src/components/GravelSectors.astro` -- card layout (space-y-4), cover photo rendering
- `src/components/KomSegments.astro` -- card layout (space-y-4), cover photo rendering
- `src/components/PhotoGallery.astro` -- PhotoSwipe init pattern, thumbnail path construction
- `src/styles/global.css` -- layer order, z-index values, animation patterns, Leaflet overrides
- `src/pages/index.astro` -- section structure, distance references, z-index usage
- `src/layouts/BaseLayout.astro` -- meta description, overlay divs
- File system inspection -- two GPX files, 73 images in /images/
