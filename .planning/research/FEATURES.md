# Feature Landscape: v8.0 Visual Polish

**Domain:** Event/portfolio website — visual texture and photo presentation layer
**Project:** MK Ultra Gravel
**Milestone:** v8.0 Visual Polish
**Researched:** 2026-03-31

---

## Context: What Already Exists

The site has a working texture stack that establishes the intensity baseline. New features must layer on top without fighting it.

- Escher tessellation SVG background: `position: fixed; opacity: 0.05` with 50s drift animation (global)
- Film grain overlay: `position: fixed; opacity: 0.06` (SVG feTurbulence, z-index 9999, global)
- `.tone-image` class: `opacity: 0.12`, `mix-blend-mode: lighten`, `grayscale(100%) contrast(1.3)`, `position: absolute`
- Tone images already in: hero (CIA doc), route (Escher stairs), photos (LSD doc), info (MK Ultra doc)
- Penrose triangle hero with CSS rotation, H1 glitch animation
- Vertical CSS grid gallery: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`, fixed `aspect-[3/4]` crop, 55 photos, PhotoSwipe lightbox
- Scroll-reveal IntersectionObserver on `[data-reveal]` elements, already respects `prefers-reduced-motion`
- 32 tone images in `images/tone/`; 55 route photos in `images/`; WebP thumbnails in `public/images/thumbs/`

**Intensity target: SUBTLE.** The site goal is that each element is barely noticeable individually but collectively adds life. The existing baseline already achieves this — new elements must not break that calibration.

---

## Feature 1: Horizontal Masonry Gallery

**Replacing:** Current vertical CSS grid with fixed `aspect-[3/4]` crop enforced by Tailwind. 55 photos expanding to 74.

### How This Feature Typically Works

**Core technique — CSS Grid row-span with JS height measurement:** A grid is established with `grid-auto-rows` set to a small implicit row height (typically 10px). JavaScript measures each image's natural rendered height after load and sets `grid-row-end: span N` where N = ceil((imageHeight + gap) / (rowHeight + gap)). Images render at their natural aspect ratio — no crops. The spanning formula: `S = ceil((H + G) / (R + G))`.

Source: [w3bits.com/css-grid-masonry](https://w3bits.com/css-grid-masonry/), [Andy Barefoot CSS Grid Masonry (Medium)](https://medium.com/@andybarefoot/a-masonry-style-layout-using-css-grid-8c663d355ebb)

**Horizontal scroll container:** The masonry grid sits inside an `overflow-x: auto` container. `scroll-snap-type: x proximity` on the container and `scroll-snap-align: start` on items gives native touch momentum on iOS/Android. No JavaScript carousel library required — the browser handles momentum scrolling.

Source: [MDN scroll-snap-type](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scroll-snap-type)

**Critical: image-load timing.** The row-span calculation must run AFTER images load, not just after DOMContentLoaded. Images load asynchronously; running the calculation before images load yields zero height and wrong spans. The reliable pattern is a `load` listener on each `<img>` element, or wrapping in a Promise that resolves after all images in the gallery fire their `load` events.

Source: [Andy Barefoot Medium article — imagesLoaded discussion](https://medium.com/@andybarefoot/a-masonry-style-layout-using-css-grid-8c663d355ebb)

**Partially visible right-edge peek:** The standard affordance that a horizontal container continues is showing a partial image at the right edge. Achieved by NOT applying padding to the last item — let the container's `overflow-x: auto` clip it. A `::after` gradient fade on the container (`background: linear-gradient(to left, var(--color-bg-base), transparent)`) reinforces the affordance without navigation chrome.

Source: [UX Collective — Best Practices for Horizontal Lists in Mobile](https://uxdesign.cc/best-practices-for-horizontal-lists-in-mobile-21480b9b73e5)

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Natural aspect ratios — no crop | 74 photos mix 3:4 portrait and 4:3 landscape; forced crop destroys landscape photos | Medium | Requires JS row-span calculation after image load events |
| Touch/swipe on mobile | Native horizontal swipe via `overflow-x: auto` — no JS carousel library | Low | CSS property only; browser handles momentum |
| Right-edge peek visual cue | Standard affordance that scroll continues; users expect it | Low | `overflow-x: auto` clips partial image; `::after` gradient reinforces |
| `loading="lazy"` preserved | 74 images; lazy load must remain on the component | Low | Already in current `PhotoGallery.astro`; preserve on rewrite |
| PhotoSwipe lightbox integration preserved | Existing UX; users can tap to full-screen any photo | Low | Keep `data-pswp-width`, `data-pswp-height`, `.gallery-item` class, `href` to full image |
| `prefers-reduced-motion` compliance | Site already uses this consistently | Low | No motion in masonry layout itself; only JS measurements |
| Invisible scrollbar | Webkit scrollbars look jarring against dark design | Low | `::-webkit-scrollbar { display: none }` + `scrollbar-width: none` |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Photos sorted by mile marker | Route photos ordered by `photo.mi` create a narrative arc — a visual ride-along that matches the event's story | Low | Data already has `mi` field; array order in JSON drives visual order |
| Right-edge fade gradient | More subtle than arrows; consistent with the site's dark brutalist restraint | Low | CSS `::after` pseudo-element on scroll container |
| `resize` event recalculation | Row spans become wrong if user rotates device or resizes browser — ResizeObserver fires recalculation | Low | Add `ResizeObserver` on the grid element alongside the image-load listeners |

### Anti-Features (Do NOT Build)

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Autoplay carousel / auto-advance | Strips user control; NN/G calls this hostile UX; nauseating on mobile | Static horizontal scroll; user initiates all movement |
| Arrow navigation buttons | Visual clutter; fights the brutalist aesthetic; redundant on mobile (swipe) and desktop (scroll) | Gradient fade cue is sufficient |
| Dot pagination indicators | 74 photos = 74 dots; absurd at this count; pagination only makes sense for 5-15 items | Photo count in section heading is sufficient |
| JavaScript carousel library (Swiper, Splide, Flickity, etc.) | 30-60KB for behavior CSS already provides natively via scroll-snap | CSS `scroll-snap-type` + `overflow-x: auto` |
| `scroll-snap-type: x mandatory` | "Mandatory" traps scroll position between snaps — user cannot stop mid-scroll; frustrating | Use `x proximity` — snaps if near a snap point, but doesn't force |
| Pinch-to-zoom inside gallery container | Conflicts with mobile browser's native page zoom | PhotoSwipe handles zoom inside the lightbox; gallery container stays non-zoomable |

### Dependencies on Existing Features

- `public/data/photos.json` exists and has `width`, `height`, `mi`, `filename` fields — must be regenerated when 19 photos are added (Feature 5)
- PhotoSwipe lightbox already initialized in `PhotoGallery.astro` — preserve the `#photo-gallery` ID, `.gallery-item` class, `data-pswp-*` attributes, and `import PhotoSwipeLightbox` script block
- Tailwind v4 is available but the masonry JS will set inline styles (`grid-row-end: span N`) — do not conflict with Tailwind grid utility classes on the container

### Mobile Behavior

- Touch momentum scrolling: provided natively by `overflow-x: auto`; works on iOS Safari and Android Chrome
- Snap: `scroll-snap-type: x proximity` prevents snap-trap while still giving satisfying landing behavior
- Scrollbar: hidden via CSS on both WebKit and Firefox
- Gallery width: should be full-bleed (`100vw`) at small screens; contain within section padding at large screens
- Column count: With `grid-template-columns: repeat(auto-fill, minmax(200px, auto))`, mobile shows 1-2 columns, desktop shows 4-6

---

## Feature 2: Responsive Lizard Background

**Based on:** [codepen.io/andybarefoot/pen/MEbORa](https://codepen.io/andybarefoot/pen/MEbORa) — CSS grid tessellation using Escher lizard SVG tiles

### How This Feature Typically Works

**Andy Barefoot's tessellation technique:** CSS Grid with `repeat(auto-fill, minmax(Xpx, 1fr))` lays out SVG tiles. The number of columns automatically adjusts to viewport width — narrow screens get fewer tiles, wide screens get more. Each grid cell contains an SVG element with `width: 100%; height: 100%` and a `viewBox` — the SVG scales within its cell, preserving the tessellation pattern.

Source: [Andy Barefoot CSS Grid Experiments collection (CodePen)](https://codepen.io/collection/DapBxW), [Andy Barefoot Medium — Stretching the Grid](https://medium.com/@andybarefoot/stretching-the-grid-5-fun-ways-to-use-css-grid-5931166f467f)

**Animation approach:** CSS `@keyframes` applying `opacity` and `transform` to individual tiles with staggered `animation-delay` values. No JavaScript. Only animating `opacity` and `transform` — these run on the GPU compositor thread and do not trigger layout or paint recalculation.

Source: [web.dev — High Performance CSS Animations](https://web.dev/articles/animations-guide)

**Responsiveness:** `grid-template-columns: repeat(auto-fill, minmax(60px, 1fr))` is pure CSS responsiveness. On a 320px mobile viewport this yields ~5 columns; on a 1440px desktop ~24 columns. No JavaScript resize listener needed.

**Where to place it:** `position: fixed` would compete with the existing fixed Escher overlay and grain. Prefer `position: absolute; inset: 0` scoped to one section — this makes it a contextual accent, not another page-wide texture layer.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| CSS-only responsiveness | Must reflow at all breakpoints without JS | Low | `auto-fill` + `minmax()` handles this natively |
| `opacity` low enough to not overwhelm | Existing Escher (0.05) + grain (0.06) baseline already established; lizard must stay in same register | Low | Target 0.03–0.05; verify text legibility after compositing |
| `pointer-events: none` | Must not intercept clicks on cards or links above it | Low | One CSS property on the container |
| `prefers-reduced-motion` compliance | All animations must stop; static tiles acceptable | Low | `@media (prefers-reduced-motion: reduce) { animation: none }` |
| `position: absolute` scoped to section | Must NOT be `position: fixed` — the existing Escher overlay is already fixed; two fixed textures = double-stacking | Medium | Must identify which section gets this treatment |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Escher lizard SVG specifically | Thematically consistent — Escher imagery already established in existing background overlay | Medium | SVG paths must be adapted from the CodePen source or the existing Escher tessellation SVG already in the site |
| Same hue as existing Escher (`#a3f0a0` green) | One fewer color in the page; background elements feel like one coherent system | Low | Match fill color to the existing Escher SVG paths in global.css |
| Section-scoped to Gravel Sectors or KOM section | Adds texture specifically to the most "technical" section of the site; other sections remain unaffected | Low | `position: absolute` within the `#sectors` section |
| Slow drift speed matching existing Escher (50s) | Feels like one coherent breathing background rather than competing textures | Low | `animation-duration: 45s–55s` |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Global fixed-position placement | A third fixed texture layer on top of Escher + grain exceeds the subtlety threshold | Scope to one section with `position: absolute` |
| Opacity above 0.06 | At this level on the darkest sections, three stacked textures become distracting | Test at 0.03–0.05; the lizard pattern is denser than the Escher triangles |
| `will-change: transform` on all tiles | Applying to 20-50+ SVG elements creates 20-50+ GPU layers — worse than no `will-change` at all | Do not use `will-change` on background grid tiles |
| Animating `fill` or `color` directly | Triggers paint recalculation; kills performance | Use `opacity` and `transform` only |
| Parallax scroll effect | Requires JS scroll listener; creates vestibular issues; conflicts with the existing fixed overlays | Static drift animation only; no scroll coupling |
| JavaScript resize listener to recount tiles | Unnecessary — CSS `auto-fill` handles this natively | Pure CSS grid |

### Dependencies on Existing Features

- Existing `escher-overlay` class in `global.css` is `position: fixed; inset: 0` — new lizard background must be `position: absolute` to avoid occupying the same fixed-position layer
- The existing Escher SVG fill uses `#a3f0a0` (light green) and `#6db86a` and `#3d7a3a` — lizard tiles should use the lightest value to appear consistent
- If placed in `#sectors`, that section already uses `position: relative; overflow: hidden` — verify this before placing the absolute background

### Mobile Behavior

- Fewer columns at small viewports — `minmax(50px, 1fr)` yields appropriate tile count automatically, no JS needed
- CSS `transform` animation on tiles: minimal battery impact; runs entirely on compositor thread
- Background must not affect touch hit targets — `pointer-events: none` required on container

---

## Feature 3: Hollow Topographic Meatball Dividers

**Based on:** [codepen.io/hollandblumer/pen/RNGLjNQ](https://codepen.io/hollandblumer/pen/RNGLjNQ) — SVG concentric contour-map ellipses as section divider

### How This Feature Typically Works

**SVG stroke-only concentric rings:** The "meatball" shape is an SVG with concentric ellipses (or circles) drawn using `stroke` only, `fill: none`. No background, no fill — just ink-like lines resembling a topographic contour map viewed from above. The outermost ring defines the visible extent; inner rings tighten concentrically with irregular spacing to mimic real topography (closer rings = steeper terrain).

**CSS stroke-dasharray animation (draw-in effect):** The classic SVG line animation: set `stroke-dasharray` equal to the path's total length (`getTotalLength()` via JS, or pre-calculated as a large value), set `stroke-dashoffset` to the same value (making the path invisible), then animate `stroke-dashoffset` to 0. The path appears to trace itself. This is a draw-in reveal.

Source: [LogRocket — How to Animate SVG with CSS](https://blog.logrocket.com/how-to-animate-svg-css-tutorial-examples/)

**Scroll-triggered one-shot:** The site already has an IntersectionObserver in `index.astro` for `[data-reveal]`. The same pattern — add a CSS class when the element enters the viewport — triggers the stroke-dashoffset animation. Set `animation-fill-mode: forwards` so the drawn state persists after animation completes.

**Placement:** Sits between `<section>` elements, horizontally centered. Not inside a section — between them. Replaces or supplements the existing `border-t border-border` section separators.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Horizontally centered | Dividers are structural punctuation; centering is minimum viable | Low | `margin: 0 auto` or flexbox centering |
| Stroke color consistent with palette | Must not introduce a new color; `--color-accent-green` or `--color-border` | Low | CSS `stroke` property on SVG |
| `fill: none` (hollow) | "Meatball" means the visual is just contour lines, not a filled oval | Low | SVG `fill: none` attribute |
| Responsive width | Must not overflow on mobile | Low | `width: 100%; max-width: 280px` on the SVG |
| Low opacity (0.30–0.50) | Divider is punctuation, not content; should sit quietly | Low | `opacity` on the SVG parent |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Stroke-dashoffset draw-in on scroll-enter | Contour lines that trace themselves as the user reaches the divider — feels purposeful and topographic | Medium | IntersectionObserver (same pattern already in `index.astro`) adds class that starts CSS animation |
| Irregular ring spacing (real topography) | Uneven gaps between rings reads as terrain more than a bullseye; looks designed rather than default | Low | SVG authored with uneven `r` increments; no extra code required |
| One-shot animation | Plays once when entering viewport; stays drawn; no looping | Low | `animation-fill-mode: forwards; animation-iteration-count: 1` |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Infinite looping animation | A divider that continuously redraws is perpetually distracting; defeats "subtle" goal | One-shot draw-in that completes and stays |
| Height greater than 100px | Dividers are structural punctuation, not content; oversized dividers consume scroll distance | Keep rendered height 60–90px |
| Filled rings or gradient fill | Looks like a loading spinner; defeats the topographic concept | `fill: none; stroke: color` only |
| Used on every section boundary | Over-use makes it wallpaper; site has 5+ section transitions | Use on 2–3 transitions maximum; keep `border-t border-border` on the others |
| Drop shadow, glow, or blur filter | Fights the flat brutalist aesthetic | Raw stroke lines only; no filters |
| Gradient stroke | Adds SVG complexity with minimal benefit at this scale and opacity | Flat `stroke` color |

### Dependencies on Existing Features

- The IntersectionObserver in `index.astro` (lines ~348-362) handles `[data-reveal]` — the divider can piggyback on the same observer or use a `data-topo-reveal` attribute
- Current section transitions use `border-t border-border` — dividers sit in the gap between sections; they may replace the border or coexist with it
- Inline SVG preferred over `<img src="...">` so CSS `stroke` can be set via CSS custom properties referencing `--color-accent-green`

### Mobile Behavior

- SVG scales via `viewBox` — no media queries needed; `max-width: 280px` keeps it from dominating small screens
- IntersectionObserver works identically on mobile
- Touch scrolling must not make the animation feel janky — `animation-timing-function: ease-out` for natural deceleration on the draw-in

---

## Feature 4: Tone Image Integration

**Context:** The `.tone-image` class already exists and is already used in 4 sections. 32 tone images are available in `images/tone/`. The task is expanding placement into cards and interstitial positions.

### How This Feature Typically Works

**Full-section background (existing pattern):** `position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover` on an `<img>` inside a `position: relative; overflow: hidden` section. The image covers the whole section without disturbing layout.

**Card corner accent (new pattern):** An image placed at a fixed position inside a card — typically `position: absolute; bottom: 0; right: 0; width: 60–80%; opacity: 0.08–0.12`. The card needs `position: relative; overflow: hidden`. This adds texture without competing with card text.

**Interstitial band (new pattern):** A full-width image placed between sections as a visual pause — a `<div>` with `height: 180–240px; overflow: hidden; position: relative` containing the tone image. Not a content section; purely atmospheric. Works well with CIA document images (landscape format).

**Blend mode mechanics:** `mix-blend-mode: lighten` on a near-black background (`oklch(0.10)`) makes only the brightest pixels in the tone image visible. The dark areas of the image disappear entirely. This is why high-contrast images (CIA documents with white text on dark, Escher prints) work best — they produce texture without muddy overlay at low opacities.

Source: [MDN mix-blend-mode](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/mix-blend-mode), [CSS-Tricks mix-blend-mode](https://css-tricks.com/almanac/properties/m/mix-blend-mode/)

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| `alt=""` on all tone images | These are decorative — screen readers must skip them | Low | Already the pattern in `index.astro` |
| `loading="lazy"` on below-fold images | Multiple tone images eager-loading blocks page render | Low | Already the pattern; maintain on all new placements |
| `pointer-events: none` | Tone images must not intercept link/button/card click events | Low | Already on `.tone-image` (check: `pointer-events: none` is in the class definition in `global.css`) |
| `overflow: hidden` on parent container | Absolute-positioned images must be clipped at container boundary | Low | Already on sections via `overflow-hidden` Tailwind class |
| Text contrast maintained | Adding a tone image to a card background must not drop text below WCAG AA | Medium | Visual check; reduce opacity if needed; dark backgrounds with `mix-blend-mode: lighten` rarely cause contrast failures |

### Differentiators (Placement Strategies)

| Strategy | Value Proposition | Complexity | Where to Use |
|----------|-------------------|------------|-------------|
| Corner accent in sector/KOM cards | CIA doc fragments peeking from card corners — reinforces "classified dossier" metaphor | Low-Medium | `GravelSectors.astro` and/or `KomSegments.astro` — card elements need `position: relative; overflow: hidden` |
| Interstitial visual pause between major sections | A ~200px full-width band between sectors and photos creates breathing room and tonal rhythm | Low | Between `#sectors` and `#photos` sections |
| Diagonal placement with slight rotation | `transform: rotate(-4deg) scale(1.15)` makes a document look casually placed, not wallpapered | Low | 2–3 select placements; never all of them |
| Second layered image at different `object-position` | Two tone images at different opacities (0.06 + 0.10) create a pentimento depth effect | Low | Hero already has one; a second at `object-position: right top` could work |

### Thematic Image Assignments

Based on the 32 available images in `images/tone/`:

| Section | Current | Recommendation |
|---------|---------|---------------|
| Hero | `CIA-MKULTRA-IG_Page_01.webp` | Keep — strongest CIA document image |
| Route | `escharian_stairs_fb.webp` | Keep — Escher thematically matches route complexity |
| Gravel Sectors | None | Add: LSD/lab imagery (suggests experimentation and altered states; fits "sector testing" framing) |
| KOM cards | None | Add: MK Ultra program documents as card corner accents |
| Photos | `lsd-mind-control.webp` | Keep |
| Info | `Mkultra-lsd-doc.webp` | Keep |
| Interstitial (sectors→photos) | None | Add: Escher variant or cycling silhouette if available |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Tone image on every sector card | 10 sector cards all with images = overwhelming; every card looks identical | Select 2–3 cards that benefit most (e.g., highest-rated sectors) |
| Opacity above 0.16 for card accents | Above this threshold the image competes with card text for attention | 0.08–0.12 for card accents; 0.12–0.14 for section backgrounds |
| Color images without grayscale filter | Introduces uncontrolled hues into the `oklch` palette | Always use the `.tone-image` class which applies `grayscale(100%)` |
| Tone images inside `<a>` or `<button>` | Creates unexpected hover/focus behavior | Section and card backgrounds only; never inside interactive elements |
| Animated tone images | Movement in what should be static texture creates cognitive dissonance with the "document" metaphor | `animation: none` always; static only |
| More than 2 interstitial bands on the full page | Becomes a visual pattern users start to ignore or mistake for content sections | 1 interstitial band maximum |

### Dependencies on Existing Features

- `.tone-image` class in `global.css` is the single definition point — all new placements use this class, not inline styles
- Cards in `GravelSectors.astro` and `KomSegments.astro` may need `position: relative; overflow: hidden` added if not already present
- The `<link rel="preload">` for the hero tone image in `index.astro` must not be removed

### Mobile Behavior

- `object-fit: cover` with `position: absolute; inset: 0` scales correctly at all viewport sizes with no additional CSS
- Card accent images with `position: absolute; right: 0; bottom: 0` need `overflow: hidden` on card parent — verify per-component
- No behavior differences on mobile; tone images are purely visual and not interactive

---

## Feature 5: 19 New Route Photos (Gallery Expansion 55 → 74)

**Nature:** Data pipeline operation, not visual design. Required prerequisite for Feature 1 (horizontal masonry).

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| WebP thumbnails generated for all 19 new images | Gallery reads from `public/images/thumbs/` — missing thumbs = broken gallery items | Low | Run existing photo processing script on new images |
| `photos.json` updated with new entries | Gallery reads this file; entries need correct `width`, `height`, `mi`, `filename` fields | Low | Script handles this; manually assign or verify `mi` values |
| `width` and `height` reflect actual image dimensions | Required for PhotoSwipe lightbox; required for horizontal masonry row-span calculation | Low | Sharp metadata extraction should handle this automatically |
| Photos sorted or sortable by mile marker | Narrative arc depends on ordering; tie-breaking by filename is acceptable | Low | Sort `photos.json` array by `mi` before writing |

### Anti-Features

| Anti-Feature | Why Avoid |
|--------------|-----------|
| Serving JPEG originals as thumbnails | 1536x2048 JPEGs at 3-5MB each would make the gallery section unusably slow | Always serve WebP thumbs; originals only in PhotoSwipe lightbox |
| Switching from WebP to AVIF for thumbnails mid-project | Browser support for AVIF is now near-universal but the WebP pipeline is proven and working; changing format mid-project introduces risk for no user benefit | Keep WebP |
| Committing images without regenerating `photos.json` | Stale JSON = gallery doesn't show new photos | Always run the pipeline and commit the updated JSON |

### Dependencies

- `public/data/photos.json` — regenerate after adding images to `images/`
- `public/images/thumbs/` — WebP thumbnails must exist for every photo in the JSON
- Feature 1 (horizontal masonry) depends on correct `width`/`height` in this data for row-span calculations

---

## Feature 6: Updated GPX Route

**Nature:** Data pipeline operation. Feeds route display (`<RouteMap>`, `<ElevationProfile>`, hero stats). The existing MEMORY.md notes this is pending: "Route extended to 100mi; awaiting updated GPX from Strava before Phase 1 verification can pass."

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| GPX file replaced | Two stale GPX files currently exist (`MK_Ultra.gpx`, `MKULTRA.gpx`) — new file must be clearly named and the pipeline re-run | Low | Naming convention matters for pipeline scripts |
| `route-data.json` regenerated | `index.astro` reads `routeMeta.totalMi` and `routeMeta.elevationGainFt` — wrong data = wrong hero display | Low | Run GPX processing pipeline; verify output |
| Output verified: `totalMi` ≈ 100 | The 100mi target is the core claim of the route extension; wrong value = false advertising | Low | Manual check of generated JSON before committing |
| Route map and elevation profile recheck | Visual QA that the new route renders correctly in Leaflet map and elevation SVG | Low | Manual QA step; look for path discontinuities |

### Anti-Features

| Anti-Feature | Why Avoid |
|--------------|-----------|
| Committing both old and new GPX files | Creates ambiguity about which file is active; pipeline scripts may pick the wrong one | Archive or delete old GPX files after new one validates |
| Skipping output verification | GPX processing can produce unexpected results (wrong units, coordinate order) — always verify `totalMi` in the JSON | Check JSON before committing |

---

## Cross-Cutting: Intensity Calibration

The project brief specifies **SUBTLE** — each element barely noticeable individually but collectively adding life and texture. The existing baseline achieves this. New features must not break it.

### The Opacity Stacking Problem

Multiple texture layers in the same section are additive in perceived intensity:

| Layer | Opacity | Type |
|-------|---------|------|
| Film grain | 0.06 | Fixed, page-wide |
| Escher tessellation | 0.05 | Fixed, page-wide |
| Section tone image | 0.12 | Per-section |
| Lizard background (new) | 0.04–0.05 | Per-section |
| Card tone accent (new) | 0.08–0.12 | Per-card |

**Rule:** No section should have more than two simultaneous texture layers (not counting the page-wide grain and Escher, which are always present). The lizard background and a section tone image together approach the limit.

### Performance Budget for New Elements

- All animations: `opacity` and `transform` only — compositor thread, 60fps on mobile with no layout recalculation
- `will-change`: Do not apply to background grid tiles; too many GPU layers hurts performance more than it helps
- Tone images: Maintain `loading="lazy"` on all below-fold images
- SVG dividers: Inline SVG preferred over `<img>` for crisp rendering and CSS stroke access without file fetches

### Accessibility Baseline (Maintain What Exists)

| Requirement | Status | Notes |
|-------------|--------|-------|
| `prefers-reduced-motion` | Existing — all new CSS animations must respect it | Add `@media (prefers-reduced-motion: reduce) { animation: none }` to every new keyframe |
| `alt=""` on decorative images | Existing pattern — all tone images | No change needed |
| Text contrast WCAG AA | Must verify after card tone images added | `mix-blend-mode: lighten` on dark background rarely fails, but check |
| `pointer-events: none` on all backgrounds | Required on all new background elements | Lizard grid, tone images, dividers |

---

## MVP Recommendation: Priority Order

For v8.0, ordered by impact-to-effort ratio:

1. **Updated GPX route** — zero-effort data pipeline; blocks hero stats accuracy; do first
2. **19 new route photos** — data pipeline prerequisite for Feature 1; do alongside GPX
3. **Horizontal masonry gallery** — highest visual impact of all six features; transforms the most-visited content area; medium complexity
4. **Tone image integration — section accents** — keep existing 4 placements; add 1 interstitial and 2-3 card accents; low effort, high character
5. **Hollow topographic meatball dividers** — 2 dividers on key transitions; medium implementation effort; strong thematic fit with gravel/topo aesthetic
6. **Responsive lizard background** — lowest priority; an Escher tessellation already exists page-wide; a second tessellation in one section risks stacking too much texture; can ship without it if time is constrained

**Can defer to post-v8.0:**
- Lizard background if opacity calibration proves tricky
- Divider scroll-triggered draw-in animation (static divider delivers most of the value)

---

## Sources

- [Andy Barefoot — Masonry Style Layout with CSS Grid (Medium)](https://medium.com/@andybarefoot/a-masonry-style-layout-using-css-grid-8c663d355ebb)
- [w3bits — Create Horizontal Masonry Layouts with CSS Grid](https://w3bits.com/css-grid-masonry/)
- [Andy Barefoot — CSS Grid Experiments collection (CodePen)](https://codepen.io/collection/DapBxW)
- [MDN — scroll-snap-type](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scroll-snap-type)
- [UX Collective — Best Practices for Horizontal Lists in Mobile](https://uxdesign.cc/best-practices-for-horizontal-lists-in-mobile-21480b9b73e5)
- [NN/G — Usability Guidelines for Better Carousels](https://www.nngroup.com/articles/designing-effective-carousels/)
- [Smashing Magazine — Designing Better Carousel UX](https://www.smashingmagazine.com/2022/04/designing-better-carousel-ux/)
- [web.dev — High Performance CSS Animations](https://web.dev/articles/animations-guide)
- [MDN — mix-blend-mode](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/mix-blend-mode)
- [CSS-Tricks — mix-blend-mode](https://css-tricks.com/almanac/properties/m/mix-blend-mode/)
- [LogRocket — How to Animate SVG with CSS](https://blog.logrocket.com/how-to-animate-svg-css-tutorial-examples/)
- [W3C — C39: Using prefers-reduced-motion](https://www.w3.org/WAI/WCAG21/Techniques/css/C39)
- [Existing codebase: `src/components/PhotoGallery.astro`, `src/styles/global.css`, `src/pages/index.astro`]
