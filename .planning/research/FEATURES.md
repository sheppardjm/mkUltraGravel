# Feature Landscape — v4.0 Route Update + UX Overhaul

**Domain:** Gravel cycling event website — route update, UX improvements, visual polish
**Researched:** 2026-03-29
**Project:** MK Ultra Gravel — v4.0 features layered onto shipped v3.0

---

## Context: What This Research Covers

v3.0 shipped Escher tessellation background, Penrose favicon, yellow-to-red sector spectrum, corrected photo positions, bike icon crosshair, and KOM elevation bands. This research covers the v4.0 feature categories:

1. **Map reset/home button** — reset map + elevation to default view
2. **Photo lightbox from map** — map photo markers open in lightbox (replace new-tab)
3. **Larger map zoom controls** — accessibility and mobile usability
4. **Card layout equalization** — sector cards match KOM card sizing
5. **Grinduro format explainer** — describe the hybrid race format
6. **Penrose triangle in header** — brand element above page title
7. **GPX route update** — swap to 100mi route, cascade data changes

---

## Feature 1: Map Reset / Home Button

### Current State

After a user zooms into a sector (via click), explores photo clusters, or pans the map manually, there is **no way to return to the default view** without reloading the page. The elevation chart similarly has no "reset" concept — it always shows the full route, but the map can be in any zoom/pan state.

The map initializes with `map.fitBounds(routeLine.getBounds(), { padding: [20, 20] })` — this is the "home" state.

### Expected Behavior (Industry Standard)

**How cycling and outdoor sites handle map reset:**

- **RideWithGPS:** Provides a "fit to route" button that zooms the map to show the entire route. This is the standard pattern for route-centric cycling maps.
- **Leaflet.zoomhome** (established plugin): Adds a home button between +/- zoom controls. Stores initial bounds via `setHomeBounds()`. Uses a home icon (typically Font Awesome `fa-home`). Tooltip text explains the function.
- **Leaflet.ResetView** (alternative plugin): Provides a reset view control that returns to original location and zoom level.
- **Google Maps / Mapbox:** "Zoom to fit" or "Reset" is typically available as a button with a compass or home icon.

**Consensus:** The universal pattern is a button with a home/globe/compass icon that calls `fitBounds()` on the stored initial bounds. It resets zoom and pan simultaneously.

### What View State to Reset

The button should reset:
1. **Map view** — `map.flyToBounds(routeLine.getBounds(), { padding: [20, 20] })` (animated return to initial bounds)
2. **Sector highlights** — any highlighted sector polylines return to default styles
3. **Elevation chart** — any highlighted annotation bands return to default opacity

The reset is a CustomEvent (`map:reset`) on the window — both RouteMap and ElevationProfile listen and restore defaults. This follows the existing CustomEvent bus architecture.

### Implementation Approach

**Recommended: Custom HTML button below the map (not a Leaflet control inside the map).**

Rationale: The milestone spec says "map reset button below map." Placing it outside the Leaflet container avoids z-index conflicts with tiles, doesn't compete visually with zoom controls, and is more discoverable on mobile where the map is touch-interactive.

```html
<button id="map-reset" class="...brutalist styles...">
  Reset Map View
</button>
```

On click: dispatch `window.dispatchEvent(new CustomEvent('map:reset'))`.

RouteMap.astro listens and calls `map.flyToBounds(initialBounds)`.
ElevationProfile.astro listens and restores all annotation opacities to defaults.

**Alternative considered:** Using `leaflet.zoomhome` plugin. Rejected because: (a) adds a dependency for one button, (b) places the button inside the map container (spec says "below map"), (c) uses Font Awesome icon (project uses no icon fonts).

### Table Stakes vs Differentiator

| Aspect | Category | Notes |
|--------|----------|-------|
| Ability to return to default map view | **TABLE STAKES** | Users expect this after any zoom/pan interaction |
| Button below map (outside container) | **TABLE STAKES** | More discoverable than tiny icon in map corner |
| Animated flyToBounds transition | **DIFFERENTIATOR** | Smooth return vs jarring snap; low effort |
| Resets both map AND elevation highlights | **DIFFERENTIATOR** | Cross-component reset via CustomEvent bus |

### Anti-Features

| Anti-Feature | Why Avoid |
|--------------|-----------|
| Plugin dependency for reset button | One-button function doesn't justify a new npm package |
| Reset button inside map container | Competes with zoom controls; less discoverable on mobile |
| Reset that reloads the page | Destroys lazy-loaded state; slow and disorienting |

### Complexity: **LOW**

Dependencies on existing features:
- CustomEvent bus (built in v2.0)
- `routeLine.getBounds()` already computed at map init
- Annotation opacity restore pattern already exists in `map:sectorHover` handler

### Confidence: HIGH

Standard Leaflet pattern verified via official docs. Implementation requires ~20 lines.

---

## Feature 2: Photo Lightbox from Map Markers

### Current State

Photo map markers use `bindPopup()` with an `<a href="/images/${photo.filename}" target="_blank">` wrapping a 260px `<img>`. Clicking a photo marker opens a popup with a small image preview. Clicking the image opens it in a **new browser tab** at full resolution. There is no lightbox integration — the existing PhotoSwipe instance in PhotoGallery.astro is entirely separate.

The photo markers are 10x10px cyan squares — functional but hard to identify as "photos" at a glance. Markers use `L.markerClusterGroup` for clustering.

### Expected Behavior (Industry Standard)

**How map-based photo browsers work:**

1. **Thumbnail in popup:** When the user clicks a photo marker on the map, a popup opens showing a thumbnail-sized preview (typically 200-300px wide). This is what the site currently does.

2. **Lightbox on click:** When the user clicks the thumbnail in the popup, a full-screen lightbox opens showing the high-resolution image. This is what Google Maps, Flickr maps, and Komoot do.

3. **Bidirectional navigation** (advanced): The lightbox can navigate to other photos, and the map can highlight the currently-viewed photo's marker. The Leaflet-PhotoSwipe integration article demonstrates this pattern using state management.

**The key UX expectation:** Clicking a thumbnail in a map popup should NOT open a new tab. It should open in-context (lightbox). Opening a new tab is a jarring navigation that breaks the user's spatial context.

### Implementation Pattern

**Approach A: Programmatic PhotoSwipe `loadAndOpen()` (RECOMMENDED)**

PhotoSwipe's `loadAndOpen(index, dataSource)` method opens the lightbox at a specific image index. The approach:

1. Store the PhotoSwipe lightbox instance as a module-scoped variable accessible to both components
2. In the map popup HTML, add a click handler on the thumbnail that calls `lightbox.loadAndOpen(photoIndex)`
3. The lightbox opens showing the clicked photo at full resolution

**Technical challenge:** RouteMap.astro and PhotoGallery.astro are separate Astro `<script>` blocks. They don't share module scope. The solution is the same CustomEvent bus already in use:

```javascript
// In RouteMap.astro popup click handler:
window.dispatchEvent(new CustomEvent('photo:openLightbox', {
  detail: { index: photoIndex }
}));

// In PhotoGallery.astro (or a new script):
window.addEventListener('photo:openLightbox', (e) => {
  lightbox.loadAndOpen(e.detail.index);
});
```

This maintains the decoupled architecture. No shared imports across components.

**Approach B: Separate PhotoSwipe instance per popup (AVOID)**

Creating a new PhotoSwipeLightbox for each popup would duplicate initialization, waste memory, and create inconsistent UI state between map lightbox and gallery lightbox.

### Thumbnail Size in Popup

The current popup shows a 260px-wide full-resolution image loaded via `<img src="/images/${photo.filename}">`. This is wasteful — full-res images can be 1-2MB each. The project already has WebP thumbnails at `/images/thumbs/`.

**Recommendation:** Use the existing 400px WebP thumbnail in the popup instead of the full-resolution image. Change popup HTML to reference the thumbnail path. This reduces popup load from ~1MB to ~30KB per image.

### Larger Photo Markers

The current 10x10px cyan square markers are hard to identify as "photos." Options:

1. **Thumbnail markers** (divIcon with actual image) — Show a small ~40x40px crop of the photo as the marker itself. High visual impact but increases tile-level DOM complexity for 53+ markers. With clustering, only ~10-15 markers are visible at most zoom levels.

2. **Camera icon markers** — Replace the cyan square with a small camera SVG icon (similar to the bike crosshair pattern). Clear semantic meaning. Low complexity.

3. **Larger cyan squares/circles** — Scale the existing 10px marker to 16-20px. Minimal change, some improvement.

**Recommendation:** Option 2 (camera icon) for the marker itself. Increase from 10x10 to 16x16px. Keep the cluster icon as-is (already 32x32px with count).

### Photo Index Mapping

To call `loadAndOpen(index)`, the map marker click handler needs to know which index the photo occupies in the PhotoSwipe gallery. Since both components load from the same `photos.json`, the array index is consistent. Store the index as a `data-photo-index` attribute on each marker, or pass it through the CustomEvent.

### Table Stakes vs Differentiator

| Aspect | Category | Notes |
|--------|----------|-------|
| Thumbnail in popup | **TABLE STAKES** | Already exists |
| Click thumbnail opens lightbox (not new tab) | **TABLE STAKES** | New-tab behavior is a UX regression; users expect in-context viewing |
| WebP thumbnails in popup (not full-res) | **TABLE STAKES** | Performance; 1MB per popup image is unacceptable on mobile |
| Larger/camera-icon markers | **DIFFERENTIATOR** | Visual clarity; most small event sites use default markers |
| Bidirectional map-gallery sync | **ANTI-FEATURE for v4.0** | High complexity (state management); defer to v5+ if ever needed |

### Anti-Features

| Anti-Feature | Why Avoid |
|--------------|-----------|
| New-tab behavior on thumbnail click | Breaks spatial context; mobile creates tab sprawl |
| Full-resolution images in popup | 1MB per popup on mobile is a performance failure |
| Separate PhotoSwipe instance per popup | Memory waste; inconsistent UI |
| Bidirectional map-gallery navigation | Requires state management layer; overengineered for 53 photos |

### Complexity: **MEDIUM**

This is the most architecturally complex v4.0 feature because it bridges two independent components (RouteMap and PhotoGallery) through the event bus. Key risks:
- Ensuring photo index consistency between map markers and gallery order
- PhotoSwipe lightbox must be initialized before map popup click can trigger it
- Popup DOM is created dynamically by Leaflet — event delegation needed for click handlers inside popups

Dependencies on existing features:
- PhotoSwipe already initialized in PhotoGallery.astro
- Photos.json loaded by both RouteMap and PhotoGallery
- CustomEvent bus architecture (built in v2.0)

### Confidence: HIGH

PhotoSwipe `loadAndOpen()` API verified via official docs. CustomEvent pattern proven in v2.0.

---

## Feature 3: Larger Map Zoom Controls

### Current State

Leaflet's default zoom controls are small: the +/- buttons are approximately 26x26px. They use the project's dark theme overrides (dark background, light text, dark border). The controls are in the default `topleft` position.

### Expected Behavior (Accessibility Standards)

**WCAG 2.5.5 (AAA):** Interactive targets should be at least **44x44 CSS pixels**. This is the practical standard for mobile-first design. Apple HIG recommends 44pt; Google Material Design recommends 48dp.

**WCAG 2.5.8 (AA):** Interactive targets must be at least **24x24 CSS pixels** OR have 24px spacing around them. The default Leaflet controls meet AA but fall short of AAA.

**The cycling audience skews mobile.** Riders exploring a route are often on phones. Fat-finger errors on tiny zoom buttons are frustrating. Most cycling map sites (RideWithGPS, Komoot) use larger-than-default controls.

### Implementation Approach

**CSS-only override (RECOMMENDED).** The Leaflet zoom control elements have well-known class names (`.leaflet-control-zoom-in`, `.leaflet-control-zoom-out`). Override their dimensions in global.css:

```css
.leaflet-control-zoom a {
  width: 44px !important;
  height: 44px !important;
  line-height: 44px !important;
  font-size: 22px !important;
}
```

This meets WCAG 2.5.5 AAA target size without any JavaScript changes, new plugins, or custom controls. The existing dark theme overrides in global.css already target `.leaflet-control-zoom a` — the size overrides go in the same rule.

**Alternative considered:** Custom L.Control.Zoom extension. Rejected because CSS achieves the same result with zero JavaScript.

**Alternative considered:** Zoom slider plugin. Rejected because it adds complexity and the +/- pattern is universally understood.

### Table Stakes vs Differentiator

| Aspect | Category | Notes |
|--------|----------|-------|
| Zoom controls visible and functional | **TABLE STAKES** | Already exists |
| 44x44px touch targets (WCAG AAA) | **TABLE STAKES** | Accessibility requirement; mobile cycling audience |
| Dark-themed controls matching site design | **TABLE STAKES** | Already exists via global.css overrides |

### Anti-Features

| Anti-Feature | Why Avoid |
|--------------|-----------|
| Custom zoom control plugin | Adds dependency for CSS-achievable result |
| Removing zoom controls entirely | Some mobile users lack pinch-zoom familiarity |
| Zoom slider | Unfamiliar interaction pattern; adds complexity |

### Complexity: **VERY LOW**

Three CSS properties on an existing selector. No JavaScript changes. No new dependencies.

Dependencies on existing features:
- `.leaflet-control-zoom a` already styled in global.css

### Confidence: HIGH

CSS override approach verified via Leaflet community and documentation. Standard pattern.

---

## Feature 4: Card Layout Equalization

### Current State

Sector cards and KOM cards use the same visual structure (`.classified-border`, cover photo, metadata). However, they appear in **different grid columns** in the page layout:

```html
<div class="grid md:grid-cols-3 gap-8">
  <div class="md:col-span-2">  <!-- Sectors: 2/3 width -->
    <GravelSectors />
  </div>
  <div>                         <!-- KOM + Restock: 1/3 width -->
    <KomSegments />
    <RestockPoints />
  </div>
</div>
```

Sectors get 2/3 width; KOM cards get 1/3. This means sector cards are wider than KOM cards. The milestone spec says "gravel sector cards resized to match KOM cards" — this implies equalizing the card sizes, likely by changing the grid layout.

### Expected Behavior (Industry Standard)

**Card grids in cycling/event sites:**

Responsive card grids using CSS Grid with `auto-fill` or `auto-fit` and `minmax()` are the standard approach. Equal-height cards happen automatically with CSS Grid when items are in the same row (`grid-auto-rows: 1fr` or `align-items: stretch`).

The common pattern for mixed content types (sectors + KOMs) is either:
1. **Unified grid** — all cards in the same grid with equal column widths
2. **Section-separated** — sectors and KOMs in separate sections, each with their own grid

Since sectors (6 cards) and KOM segments (3 cards) have different content structures and quantities, the current two-column layout makes sense conceptually. The issue is the width disparity.

### Implementation Options

**Option A: Equal-width columns**

Change `md:grid-cols-3` with `md:col-span-2` to a simpler layout where both columns are equal width:

```html
<div class="grid md:grid-cols-2 gap-8">
  <div>  <!-- Sectors -->
  <div>  <!-- KOM + Restock -->
```

This gives each column 50% width. Cards in both columns will be similar widths.

**Option B: Full-width unified grid**

Remove the two-column split entirely. Place all cards (sectors, KOMs, restock) in a single responsive grid:

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <!-- All sector cards -->
  <!-- All KOM cards -->
  <!-- Restock cards -->
</div>
```

With `grid-auto-rows: 1fr`, all cards in the same row will have equal heights. This is the most robust equalization approach.

**Option C: Match card internal layout only**

Keep the 2/3 + 1/3 column split but ensure the card internal structure (photo aspect ratio, padding, font sizes) is identical. The cards themselves would be "equal" in proportion even though their container widths differ.

**Recommendation: Option A (equal-width columns).**

It's the simplest change that achieves the spec requirement ("sector cards resized to match KOM cards"). The 2-column layout preserves the sector/KOM conceptual grouping while equalizing widths. The Grinduro format explainer (Feature 5) can be placed above or below the sector cards in the same column, or as a full-width element above the grid.

### Table Stakes vs Differentiator

| Aspect | Category | Notes |
|--------|----------|-------|
| Cards readable and well-formatted | **TABLE STAKES** | Already exists |
| Equal-width cards across sections | **TABLE STAKES** | Visual consistency; unequal widths look unfinished |
| Auto-equal-height rows (CSS Grid) | **DIFFERENTIATOR** | Polished presentation; most small event sites don't achieve this |

### Anti-Features

| Anti-Feature | Why Avoid |
|--------------|-----------|
| JavaScript-based height equalization | CSS Grid handles this natively; JS adds complexity and flash of unstyled content |
| Fixed pixel heights on cards | Fragile; breaks when content length varies |
| Removing the sector/KOM grouping | Conceptual grouping aids comprehension; mixing card types is confusing |

### Complexity: **LOW**

CSS grid class changes in index.astro. No JavaScript. No new dependencies.

Dependencies on existing features:
- Existing grid layout in index.astro (#sectors section)
- GravelSectors.astro and KomSegments.astro card structure

### Confidence: HIGH

CSS Grid equalization is standard practice, verified via MDN and CSS-Tricks.

---

## Feature 5: Grinduro Format Explainer

### Current State

The site describes MK Ultra Gravel as having "timed gravel sectors and KOM/QOM segments" but doesn't explain what this means. The Grinduro format is niche — even experienced cyclists may not know how it works. There is no "how the race works" section.

### How Grinduro Describes Their Format

From the official Grinduro website (verified via direct fetch):

> "Gravel Road Race + Mountain Bike-Style Enduro = one long loop of pavement and dirt, where finishing times aren't based on overall loop time, but four timed segments."

Key language patterns Grinduro uses:
- **"Timed segments"** — consistent term for the competitive portions
- **"Gran Fondo-style mass start"** — the non-competitive beginning
- **"Overall time doesn't matter"** — the critical differentiator from a normal race
- **"Reward the most well-rounded of rouleurs"** — segments test different skills
- **"Not just a bike race"** but **"a celebration of cycling"** — festival framing

Grinduro's segments are typically 5-15 minutes long and test different skills: dirt road climb, dirt road roller, dirt road descent, singletrack descent.

### Content Recommendations

The explainer should answer three questions:

1. **What is it?** Mass start, ride the full route at your own pace, but specific sectors are timed.
2. **How does timing work?** Only your sector times count. You can cruise/socialize between sectors.
3. **What does it reward?** The most well-rounded rider — sectors test climbing, descending, and technical skill.

**Recommended placement:** In the #sectors section, above the sector cards. This gives context before the user sees the sector-by-sector breakdown.

**Recommended tone:** Match the existing MK Ultra voice — brutalist, direct, slightly conspiratorial. Not corporate marketing copy.

**Example structure:**

```
## How It Works

Mass start. 100 miles. Six timed gravel sectors.

Your finishing time doesn't matter. Only your sector times count. Ride
the full route at whatever pace you want — then turn it up to eleven
when you hit the timed sectors.

Each sector tests something different: technical descents, grinding
climbs, fast rollers. The most well-rounded rider wins.

Think Grinduro meets Paris-Roubaix. With less singletrack and more
gravel.
```

### Content from Grinduro to Adapt (Not Copy)

The site should explain the format in MK Ultra's voice, not quote Grinduro directly. Key concepts to adapt:
- "Overall time doesn't matter" → MK Ultra version
- "Timed segments" → "Timed sectors" (the site already uses "sectors" language)
- "Reward the most well-rounded" → align with Paris-Roubaix difficulty framing
- Festival/fun emphasis → align with MK Ultra's counterculture identity

### Table Stakes vs Differentiator

| Aspect | Category | Notes |
|--------|----------|-------|
| Explaining the race format somewhere on the page | **TABLE STAKES** | Most riders won't know what Grinduro-style means |
| Placed in context above sector cards | **TABLE STAKES** | Context before detail is standard information architecture |
| Voice-matched to MK Ultra brand | **DIFFERENTIATOR** | Most event sites use generic marketing copy |
| Connecting format to Paris-Roubaix sector tradition | **DIFFERENTIATOR** | Bridges two cycling traditions the audience knows |

### Anti-Features

| Anti-Feature | Why Avoid |
|--------------|-----------|
| Quoting Grinduro website directly | Copyright concern; the site should have its own voice |
| Multi-paragraph essay on race formats | Brevity is the brand; 3-5 short sentences max |
| Comparing to other specific events by name | Could imply affiliation; keep it conceptual |
| FAQ-style expandable sections | Overengineered for ~50 words of content |

### Complexity: **VERY LOW**

HTML content addition to index.astro in the #sectors section. No JavaScript. No new dependencies. Matches existing `MkUltraExplainer.astro` pattern.

Dependencies on existing features:
- #sectors section layout in index.astro

### Confidence: HIGH

Grinduro format verified directly from official website. Content structure is editorial, not technical.

---

## Feature 6: Penrose Triangle in Header

### Current State

The hero section contains:
1. CIA document background image
2. "Classification: Ultra" stamp
3. "MK Ultra Gravel" glitch-animated h1
4. Event details (date, location, distance)
5. Countdown timer
6. Register CTA button
7. Donation link

There is no brand icon or logo above the title. The Penrose triangle exists only as the favicon (shipped in v3.0).

### Expected Behavior (Industry Standard)

**Hero section branding patterns:**

The "icon above title" pattern is well-established:
- Brand mark or logo icon sits centered above the main heading
- Typically 60-120px in size
- Serves as a visual anchor that draws the eye down to the title
- Common in event sites, landing pages, and product pages

**For cycling events specifically:** Most use their logo above the event name. The Penrose triangle would serve as MK Ultra Gravel's logo mark.

### Implementation

The existing Penrose triangle SVG from the favicon can be reused at larger scale. The favicon uses hex fills for browser compatibility, but an inline SVG in the hero can use the full oklch color space.

**Placement:** Centered above the h1, below the "Classification: Ultra" stamp. Approximate sizing: 60-80px width.

**Animation:** The milestone spec says "subtle animation." Options:
1. **Slow rotation** — `transform: rotate(360deg)` over 20-30s. Compositor-safe. Fits the psychedelic theme. Simple.
2. **Color cycling** — animate the three triangle faces through different hues. Requires animating `fill`, which is NOT compositor-safe. Avoid.
3. **Pulse/breathe** — `transform: scale(1) → scale(1.05)` oscillation. Compositor-safe. Subtle.
4. **Floating** — `transform: translateY(0) → translateY(-8px)` oscillation. Compositor-safe.

**Recommendation:** Slow rotation (option 1). It directly evokes the "impossible" nature of the Penrose triangle — it appears to rotate in a way that shouldn't be possible. Gated behind `prefers-reduced-motion: no-preference` per existing project pattern.

```css
@keyframes penrose-rotate {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: no-preference) {
  .penrose-hero {
    animation: penrose-rotate 25s linear infinite;
  }
}
```

### Table Stakes vs Differentiator

| Aspect | Category | Notes |
|--------|----------|-------|
| Having a visual brand mark on the page | **TABLE STAKES** | Event sites need visual identity beyond text |
| Penrose triangle specifically | **DIFFERENTIATOR** | Unique, on-brand impossible geometry |
| Subtle rotation animation | **DIFFERENTIATOR** | Adds dynamism; rare in cycling event sites |
| prefers-reduced-motion gate | **TABLE STAKES** | Accessibility requirement; matches existing pattern |

### Anti-Features

| Anti-Feature | Why Avoid |
|--------------|-----------|
| Animating fill/stroke color | Not compositor-safe; causes paint on every frame |
| Large (>120px) hero icon | Competes with h1 for visual hierarchy; pushes content below fold |
| Complex multi-step animation | Distracting; the hero already has glitch text animation |
| Canvas-rendered triangle | Breaks zero-TBT; unnecessary for a single SVG element |

### Complexity: **LOW**

Inline SVG in index.astro hero section. CSS animation in global.css or component style. No JavaScript. No new dependencies.

Dependencies on existing features:
- Penrose triangle SVG design (created in v3.0 as favicon)
- Hero section structure in index.astro

### Confidence: HIGH

SVG inline + CSS animation is a standard, proven pattern.

---

## Feature 7: GPX Route Update (80mi to 100mi)

### Current State

The site uses an 80mi GPX file (`MK_Ultra.gpx` or `MK Ultra.gpx` in repo root). The prebuild pipeline processes this into:
- `public/data/route-data.json` — track points with lat, lon, ele, mi
- `public/data/annotations.json` — sectors, KOMs, restock points with track arrays
- `public/data/photos.json` — 53 photos with lat, lon, mi positions
- Route metadata (totalMi, elevationGainFt) displayed on the page

The elevation chart x-axis is already set to `max: 100` (forward-compatible from v3.0).

### What Changes When a Cycling Route Is Updated

When replacing a GPX file for a cycling event, a cascade of dependent data must be verified or updated:

1. **Total distance** — route-data.json `meta.totalMi` changes
2. **Total elevation gain** — `meta.elevationGainFt` changes
3. **Sector positions** — `startMi`, `endMi`, and `track` arrays in annotations.json. If the route changed significantly, sectors may start/end at different mile markers even if the physical location didn't change (because mile markers shift when the route changes).
4. **KOM positions** — same as sectors: `startMi`, `endMi`, track arrays
5. **Restock point positions** — lat/lon may stay the same but `mi` values shift
6. **Photo positions** — lat/lon are fixed (photos are geolocated) but `mi` values shift
7. **Page content** — any hardcoded distance references ("80 miles" becomes "100 miles")
8. **Map bounds** — initial fitBounds changes to encompass the longer route
9. **Elevation profile** — new data renders automatically; x-axis max already 100

### Pipeline Re-run

The existing prebuild pipeline (`scripts/` directory) should handle most of this automatically when the new GPX file is placed in the repo. The pipeline:
1. Parses GPX to generate route-data.json
2. Maps sector/KOM annotations to track points (snaps to nearest route point)
3. Assigns photo mile markers by lat/lon proximity (haversine calculation)

**Critical verification needed:** If the route changed significantly (not just extended at the end), all sector/KOM start/end positions in annotations.json need manual verification. The pipeline auto-generates track arrays from mile-marker ranges, but the mile markers themselves may need updating.

### New Photos

The milestone spec mentions two new photos: "Down Jeep" and "Billie Helmer B&W." These need:
1. Placed in `/images/` directory
2. Mile-marker positions assigned in the photo data
3. Pipeline run to generate WebP thumbnails
4. Card crop photos generated if assigned to a sector/KOM

### Content References to Update

Hardcoded distance references in the codebase:

| Location | Current | Needs Update |
|----------|---------|--------------|
| `index.astro` hero subtitle | "100 miles" | Already correct (updated in v3.0) |
| `BaseLayout.astro` meta description | "100 miles" | Already correct |
| Elevation chart x-axis | `max: 100` | Already correct |
| Route stats display | Dynamic from `routeMeta` | Auto-updates |
| PROJECT.md | "100-mile" | Already correct |

The main content references appear to already say "100 miles" from earlier updates. The actual route data will change when the GPX file is swapped.

### Table Stakes vs Differentiator

| Aspect | Category | Notes |
|--------|----------|-------|
| Route data matches actual event route | **TABLE STAKES** | Inaccurate route data destroys site credibility |
| Pipeline auto-regeneration | **TABLE STAKES** | Already built; ensures consistency |
| Manual verification of sector/KOM positions | **TABLE STAKES** | Pipeline can't verify semantic correctness |
| New photos integrated | **TABLE STAKES** | Fresh content for updated route |

### Anti-Features

| Anti-Feature | Why Avoid |
|--------------|-----------|
| Manually editing route-data.json | The pipeline exists for a reason; manual edits bypass validation |
| Skipping sector position verification | Shifted mile markers = wrong sector annotations on map |
| Deploying without visual QA | Route shape changes could cause unexpected map rendering |

### Complexity: **MEDIUM**

The GPX swap itself is trivial, but the cascade of verification work is significant:
- Sector and KOM mile-marker verification (6 sectors + 3 KOMs)
- Photo mile-marker positions (53 photos)
- Visual QA of map rendering with new route
- Two new photos through the pipeline

The pipeline handles the mechanical work, but human verification is needed for semantic correctness.

Dependencies on existing features:
- Prebuild pipeline scripts (built in v1.0, refined in v2.0)
- annotations.json sector/KOM data
- photos.json positioning data

### Confidence: MEDIUM

Pipeline reliability is HIGH (proven across v1-v3). But the **new GPX file is not yet available** (per memory: "awaiting updated GPX from Strava before Phase 1 verification can pass"). This is a blocking external dependency.

---

## Feature Dependency Map (v4.0)

```
GPX Route Update (Feature 7) — BLOCKING DEPENDENCY: new GPX file from Strava
  |
  +-- triggers pipeline re-run
  |     +-- regenerates route-data.json (distances, elevation)
  |     +-- regenerates annotations.json (sector/KOM track arrays)
  |     +-- regenerates photos.json (mile markers shift)
  |
  +-- requires manual verification of sector/KOM positions
  +-- requires visual QA

Map Reset Button (Feature 1) — INDEPENDENT
  +-- depends on: map init bounds (will update with new GPX automatically)
  +-- depends on: CustomEvent bus (exists)

Photo Lightbox from Map (Feature 2) — INDEPENDENT
  +-- depends on: PhotoSwipe initialized (exists)
  +-- depends on: photos.json (shared data source)
  +-- depends on: CustomEvent bus (exists)

Larger Zoom Controls (Feature 3) — INDEPENDENT
  +-- depends on: global.css Leaflet overrides (exists)

Card Layout Equalization (Feature 4) — INDEPENDENT
  +-- depends on: grid layout in index.astro (exists)

Grinduro Format Explainer (Feature 5) — INDEPENDENT
  +-- depends on: #sectors section in index.astro (exists)

Penrose Header Triangle (Feature 6) — INDEPENDENT
  +-- depends on: hero section in index.astro (exists)
  +-- depends on: Penrose SVG from favicon (exists, v3.0)
```

**All features except Feature 7 (GPX update) are fully independent and can be built in any order.** Feature 7 has an external dependency (new GPX file) and should be scheduled first if the file is available, or deferred if not.

---

## Phase Ordering Recommendation

**Phase 1: GPX Route Update** (if GPX available)
- Swap GPX file, run pipeline, verify all sector/KOM/photo positions
- Process two new photos
- Rationale: All other features render on top of the route data; get the foundation right first

**Phase 2: Quick UX Wins** (parallel-safe)
- Larger zoom controls (Feature 3) — 5 minutes, CSS only
- Grinduro format explainer (Feature 5) — 15 minutes, HTML only
- Penrose header triangle (Feature 6) — 20 minutes, SVG + CSS
- Card layout equalization (Feature 4) — 10 minutes, CSS only
- Rationale: All are low-complexity, zero-dependency, high-visibility improvements

**Phase 3: Map Reset Button** (Feature 1)
- CustomEvent integration with both map and elevation chart
- Rationale: Simple but touches two components; test after route data is finalized

**Phase 4: Photo Lightbox from Map** (Feature 2)
- Most architecturally complex feature: bridges RouteMap and PhotoGallery
- Rationale: Needs photo index consistency, which depends on finalized photos.json

---

## MVP Recommendation

All seven features are scoped for v4.0 and all should ship. None are deferrable — they represent the minimum bar for the route update milestone.

Priority if time-constrained:
1. GPX route update (Feature 7) — **must ship** (route accuracy is existential)
2. Photo lightbox from map (Feature 2) — **must ship** (new-tab behavior is a UX bug)
3. Map reset button (Feature 1) — **must ship** (no way to recover from zoom is broken UX)
4. Grinduro explainer (Feature 5) — **should ship** (format confusion hurts registration)
5. Card equalization (Feature 4) — **should ship** (visual polish)
6. Zoom controls (Feature 3) — **should ship** (accessibility)
7. Penrose header (Feature 6) — **nice to have** (brand polish)

---

## Confidence Assessment

| Finding | Confidence | Source |
|---------|------------|--------|
| Leaflet fitBounds for map reset | HIGH | Leaflet official docs |
| PhotoSwipe loadAndOpen(index) API | HIGH | PhotoSwipe official docs (photoswipe.com/methods/) |
| CustomEvent bus for cross-component communication | HIGH | Proven in existing codebase (v2.0+) |
| WCAG 2.5.5 44x44px touch target for zoom | HIGH | W3C WCAG 2.1 official spec |
| CSS Grid auto-equalization of card heights | HIGH | MDN, CSS-Tricks, ModernCSS.dev |
| Grinduro format description and language | HIGH | Direct fetch of grinduro.com/about/ and grinduro.com/california/ |
| Penrose SVG rotation is compositor-safe | HIGH | Standard CSS transform animation; same pattern as Escher drift |
| GPX pipeline regeneration reliability | HIGH | Proven across v1-v3 (3 milestone cycles) |
| New GPX file availability | LOW | External dependency; "awaiting updated GPX from Strava" per memory |
| Photo index consistency between components | MEDIUM | Both load from photos.json; ordering verified by inspection but not tested across lightbox trigger |

---

## Sources

- [Leaflet.zoomhome — GitHub](https://github.com/torfsen/leaflet.zoomhome)
- [Leaflet.ResetView — GitHub](https://github.com/drustack/Leaflet.ResetView)
- [Leaflet issue #2498 — Reset view control](https://github.com/Leaflet/Leaflet/issues/2498)
- [PhotoSwipe Methods — photoswipe.com](https://photoswipe.com/methods/)
- [PhotoSwipe Data Sources — photoswipe.com](https://photoswipe.com/data-sources/)
- [Leaflet-PhotoSwipe integration — DEV Community](https://dev.to/trincadev/from-leaflet-popup-marker-to-photo-gallery-image-and-back-2f6k)
- [WCAG 2.5.5 Target Size — W3C](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [WCAG 2.5.8 Target Size Minimum — AllAccessible](https://www.allaccessible.org/blog/wcag-258-target-size-minimum-implementation-guide)
- [Equal Height Elements: Flexbox vs Grid — ModernCSS.dev](https://moderncss.dev/equal-height-elements-flexbox-vs-grid/)
- [CSS Grid Best Practices — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Common_grid_layouts)
- [Grinduro About Page — grinduro.com](https://grinduro.com/about/)
- [Grinduro California — grinduro.com](https://grinduro.com/california/)
- [Leaflet Custom Icons — leafletjs.com](https://leafletjs.com/examples/custom-icons/)
- [L.DivIcon reference — leafletjs.com](https://leafletjs.com/reference.html#divicon)
- [Extending Leaflet Controls — leafletjs.com](https://leafletjs.com/examples/extending/extending-3-controls.html)
- [RideWithGPS Elevation Profile — support.ridewithgps.com](https://support.ridewithgps.com/hc/en-us/articles/4419005868315-The-Elevation-Profile-on-Web)
- [Leaflet Zoom Control CSS — Google Groups](https://groups.google.com/g/leaflet-js/c/smRL1O8PCuY)
