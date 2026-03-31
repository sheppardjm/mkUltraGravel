# Technology Stack — v8.0 Visual Polish

**Project:** MK Ultra Gravel
**Milestone:** v8.0 visual polish + content
**Researched:** 2026-03-31
**Scope:** NEW stack decisions only. Existing Astro 6 + Tailwind v4 + Leaflet + Chart.js + PhotoSwipe + sharp stack is validated and unchanged.
**Confidence:** HIGH — primary findings from MDN official docs, web.dev, Andy Barefoot's own Medium post, sharp official changelog, and direct codebase inspection.

---

## Executive Summary

v8.0 introduces six new visual features. Most require zero new dependencies. The two that most resemble "needs a library" questions — masonry gallery layout and CodePen animation adaptation — resolve cleanly to CSS-only or minimal-JS CSS Grid patterns already compatible with the existing stack.

**Bottom line for each feature:**

| Feature | Approach | New dependency? |
|---------|----------|-----------------|
| Horizontal masonry gallery | CSS Grid + ~50 lines of inline JS | No |
| Lizard background animation | Inline SVG Astro component + CSS keyframes | No |
| Topo meatball dividers | Inline SVG Astro component + CSS | No |
| Tone image integration | `public/tone/` + existing `.tone-image` class | No |
| 19 new route photos | Existing sharp pipeline, no changes needed | No |
| Updated GPX file | Drop-in replacement, existing pipeline handles it | No |

No new npm dependencies are needed for v8.0.

---

## Feature 1: Horizontal Masonry Gallery

### What "horizontal masonry" means here

The goal is a gallery where photos scroll horizontally and have a masonry feel — adjacent photos of different natural heights are displayed at a uniform row height, with widths proportionally derived from each photo's aspect ratio. This produces a dense, film-strip visual rather than the traditional Pinterest vertical column masonry.

This is NOT traditional masonry (variable height in vertical columns). It is a fixed-height horizontal strip where widths vary by aspect ratio.

### CSS Native Masonry: Not viable

As of March 2026, CSS native masonry (`grid-template-rows: masonry` / `display: grid-lanes`) is experimental in all browsers and available only behind flags in Firefox, Safari Technology Preview, and Chrome/Edge 140. No stable browser ships it unflagged. Using it would break the gallery in production. (Source: [MDN Masonry Layout](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Masonry_layout), [Chrome for Developers — Brick by brick](https://developer.chrome.com/blog/masonry-update))

### Masonry.js / Isotope: Rejected

Masonry.js (`masonry-layout` on npm) is at version 4.2.2, last published 8 years ago. It does absolute-position layout and requires imagesLoaded as a companion. It adds ~16KB (min+gz) and was designed for vertical column masonry — not horizontal strip scrolling. Isotope is heavier still. Both are unnecessary. (Source: [npm masonry-layout](https://www.npmjs.com/package/masonry-layout))

### Recommended: CSS Grid with aspect-ratio + overflow-x scroll

This is a pure-CSS approach for fixed-height horizontal strip layout, with a small amount of JavaScript only if natural aspect-ratio scroll behavior is wanted. The core technique:

```css
/* Container: horizontal scroll strip */
.photo-strip {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  height: 280px;         /* fixed row height */
}

/* Items: width determined by natural aspect ratio */
.photo-strip-item {
  flex-shrink: 0;
  height: 100%;
  aspect-ratio: var(--photo-ar); /* set in Astro template from photo.width/photo.height */
  scroll-snap-align: start;
  overflow: hidden;
  cursor: pointer;
}

.photo-strip-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

In the Astro template, `--photo-ar` is set inline from the `photo.width / photo.height` values already in `photos.json`. PhotoSwipe lightbox wiring (existing) wraps the items as it does today in `PhotoGallery.astro`. No JS layout calculation needed. Scroll-snap adds momentum-scroll feel at no TBT cost (CSS-only, compositor-handled).

**This approach is entirely compositor-safe and adds TBT 0ms.** Flexbox layout, overflow scrolling, and scroll-snap are all handled in the browser's layout/composite pass with no main-thread blocking.

**Why not the traditional CSS Grid span technique from Andy Barefoot's Medium article?**
Barefoot's technique (`grid-auto-rows: 10px` + JS `grid-row-end: span N`) is designed for vertical column masonry (items of variable height in multiple columns). For a horizontal photo strip with a fixed row height, it adds complexity without benefit. The flex + aspect-ratio approach is simpler and more readable. (Source: [Andy Barefoot — Masonry style layout using CSS Grid](https://medium.com/@andybarefoot/a-masonry-style-layout-using-css-grid-8c663d355ebb))

**Integration with existing PhotoGallery.astro:**
The `photo.width` and `photo.height` fields are already populated in `photos.json` by `generate-thumbnails.js`. The Astro component reads `photos.json` at build time. No data format changes needed.

---

## Feature 2: Lizard Background Animation (from codepen.io/andybarefoot/pen/MEbORa)

### What the CodePen does

Andy Barefoot's "Animated Responsive Lizards — CSS Grid" creates an Escher-tessellation background using CSS Grid diagonal layout with SVG or CSS-clipped tile elements. The grid fills the viewport, JS resizes the grid on window resize to maintain tile count, and CSS handles tile coloring and transitions. The pen is titled "Animated Responsive Lizards" and uses CSS Grid with JS for grid resizing. (Source: web search of CodePen title; full pen source not fetchable due to 403, but Andy Barefoot's own Medium/blog confirms the CSS Grid + JS resize approach for his tessellation pens.)

**This project already has an Escher tessellation.** The `escher-overlay` in `global.css` is a fixed `position: fixed` SVG background tile with `animation: escher-drift 50s linear infinite` — a CSS transform animation that's already compositor-safe. The existing implementation IS the Escher pattern.

### Adaptation strategy: Astro component with inline SVG + CSS keyframes

The CodePen adaptation does NOT require copying its JavaScript. The correct approach for this project:

1. Extract the SVG tile definition from the CodePen as an inline SVG.
2. Create a new Astro component (e.g. `LizardBackground.astro`) that renders the inline SVG as a `position: fixed` background layer, styled like the existing `escher-overlay`.
3. Animate using CSS keyframes on `transform` only — same pattern as `escher-drift`.

```astro
---
// LizardBackground.astro — no script block needed
---
<div class="lizard-overlay" aria-hidden="true">
  <!-- SVG tile from CodePen extracted inline -->
</div>

<style>
  .lizard-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    opacity: 0.04;     /* subtle, not distracting */
    background-image: url("data:image/svg+xml,..."); /* lizard tile encoded */
    background-repeat: repeat;
    background-size: [tile-size];
    z-index: 9997;     /* below escher-overlay (9998) and grain-overlay (9999) */
    will-change: transform;
  }

  @media (prefers-reduced-motion: no-preference) {
    .lizard-overlay {
      animation: lizard-drift 70s linear infinite;
    }
  }

  @keyframes lizard-drift {
    from { transform: translate(0, 0); }
    to   { transform: translate(-[tile-width]px, -[tile-height]px); }
  }
</style>
```

**Performance characteristics:**
- `transform` animation: compositor-safe, TBT 0ms, no layout/paint (confirmed: [web.dev animations guide](https://web.dev/articles/animations-guide))
- `position: fixed` + `will-change: transform`: promotes to GPU layer — same pattern as existing `escher-overlay`
- `opacity: 0.04`: matches site aesthetic, subtle

**What NOT to do:** Do not copy the CodePen's JavaScript grid-resizing code. That code is for an interactive viewport-filling grid. This project needs a repeating background tile — the CSS `background-repeat` approach covers this with zero JS.

**Astro integration:** Inline SVG in `.astro` component is idiomatic Astro — SVG is just HTML, no special tooling needed. No `postcss-inline-svg` or `astro-icon` library required.

---

## Feature 3: Topographic Meatball Section Dividers (from codepen.io/hollandblumer/pen/RNGLjNQ)

### What the CodePen likely does

The pen title suggests hollow circular section dividers with topographic contour line styling (concentric rings suggesting elevation). Full source is not accessible (CodePen returns 403 to non-browser fetches), but topographic/contour SVG dividers are a well-understood pattern: concentric SVG `<circle>` elements with stroke-only fills (hollow), possibly with a `<clipPath>` to create the meatball/disc shape.

### Adaptation strategy: Astro component with inline SVG

```astro
---
// TopoMeatball.astro
interface Props {
  label?: string;
}
const { label } = Astro.props;
---
<div class="topo-divider" aria-hidden="true">
  <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <!-- Concentric circles — stroke only, no fill (hollow) -->
    <circle cx="60" cy="60" r="55" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>
    <circle cx="60" cy="60" r="45" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>
    <circle cx="60" cy="60" r="35" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>
    <circle cx="60" cy="60" r="25" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>
    <circle cx="60" cy="60" r="15" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>
  </svg>
  {label && <span class="sr-only">{label}</span>}
</div>
```

The exact ring shapes, distortion, and irregular topographic curves must be extracted manually from the CodePen (open in browser, copy the SVG source). The component shell is the same regardless of the exact SVG content.

**No JavaScript needed.** Section dividers are static visual elements. If the CodePen uses JavaScript for animation, that animation should be evaluated against the compositor-safe criterion — only adopt it if it uses `transform`/`opacity` keyframes.

**No new library needed.** Inline SVG in Astro components requires no tooling. Static SVG dividers are HTML.

---

## Feature 4: Tone Image Integration

### Current state

The site already has:
- `public/tone/` directory with WebP-converted images
- `.tone-image` CSS class in `global.css` (`opacity: 0.12; mix-blend-mode: lighten; filter: grayscale(100%) contrast(1.3)`)
- `convert-tone-images.js` pipeline script that processes source images in `images/tone/` into `public/tone/`

The `images/tone/` directory already contains 32 images of varying formats (JPEG, WebP, AVIF, PNG).

### What needs to happen

The `convert-tone-images.js` script currently only processes 3 hardcoded images. To integrate additional CIA/MK Ultra themed tone images into sectors and KOM cards, the script must be extended or the images placed directly into `public/tone/` as WebP.

**Recommended approach:** Extend `TONE_IMAGES` array in `convert-tone-images.js` for any new source images that need processing. For images already in `images/tone/` that are already WebP and reasonably sized, copy them directly to `public/tone/` (they'll be served as-is).

**Placement in templates:** Use the existing `.tone-image` class. For sector/KOM card overlays, add a `position: relative` wrapper and place the tone image with `position: absolute`. The existing CSS class handles opacity, blend mode, and grayscale — it's already designed for this use case.

**No new libraries needed.** The existing sharp pipeline and CSS class handle everything.

---

## Feature 5: 19 New Route Photos

### Current pipeline behavior

`generate-data.js` orchestrates the full pipeline:
1. Copies all images from `images/` to `public/images/`
2. Runs `match-photos.js` to build `photos.json` (GPS-matched photo manifest)
3. Runs `generate-thumbnails.js`: clears all stale thumbnails, regenerates 400px-wide WebP for each photo in `photos.json`
4. Runs `assign-card-photos.js`: assigns cover photos to sector/KOM cards, generates 600×338 WebP card crops

**The pipeline is already idempotent and handles new photos automatically.** Dropping 19 new JPEGs into `images/` and re-running `npm run prebuild` will:
- Auto-detect them via the `images/` directory scan
- Add them to `photos.json` via GPS coordinate matching
- Generate thumbnails for all (the stale-clear-then-regenerate logic means all thumbs are rebuilt)
- Potentially update cover photos for sectors if better photos are now available

### No pipeline changes needed

The sharp API used by the pipeline (`resize()`, `.webp({ quality, effort })`, `.toFile()`) is unchanged in sharp 0.34.x. The 0.34.x changelog shows no breaking API changes from the JPEG/WebP thumbnail workflow. (Source: [sharp changelog v0.34.5](https://sharp.pixelplumbing.com/changelog/v0.34.5/))

The existing `devDependencies: { "sharp": "^0.34.5" }` is already current.

**One consideration:** `generate-thumbnails.js` clears ALL thumbnails before regenerating. With 55+19=74 photos, regeneration is still fast (sharp is ~50-100ms per image at 400px WebP). No performance concern.

---

## Feature 6: Updated GPX Route File

The pipeline already handles GPX replacement via `parse-gpx.js`, which reads `MK_Ultra.gpx` (or `MKULTRA.gpx` — both exist in root). Dropping in an updated GPX and running `npm run prebuild` regenerates `public/data/route-data.json` automatically. No code changes needed.

---

## Performance Budget Analysis

**TBT budget: 0ms (must maintain)**

| Feature | TBT Impact | Reason |
|---------|------------|--------|
| Horizontal masonry gallery | 0ms | CSS flex layout + overflow-x, no JS layout calculations |
| Lizard background CSS animation | 0ms | `transform` only, compositor thread |
| Topo meatball SVGs | 0ms | Static SVG, no animation unless transform-only CSS added |
| Tone image integration | 0ms | Static img elements with CSS class |
| 19 new photos (lazy loaded) | 0ms | `loading="lazy" decoding="async"` already on all gallery imgs |

**Caveat on `clip-path` animations:** If the topo meatball or other features use `clip-path` animations, be aware that `clip-path` is not compositor-safe in Firefox as of March 2026 (causes 24.5% CPU increase in Firefox per performance research). Avoid animating `clip-path`. Use `transform: scale()` or `opacity` instead. (Source: [Chrome hardware-accelerated animations blog](https://developer.chrome.com/blog/hardware-accelerated-animations))

**Caveat on `filter` animations:** `filter` is compositor-safe in Chrome but the behavior varies. The existing `filter: grayscale(100%) contrast(1.3)` on `.tone-image` is not animated — it's a static filter. This is fine. Do not add animated `filter` values.

---

## What NOT to Add and Why

| Library | Why Rejected |
|---------|-------------|
| GSAP | Animation JS library; adds ~30KB and blocks main thread for JS-driven animations. Existing CSS-only approach achieves 0ms TBT. Project constraint: no JS animation libraries. |
| Masonry.js / Isotope | Designed for vertical column masonry. 8-year-old codebase, absolute-position based. The horizontal strip layout needed here is better served by CSS flex + aspect-ratio. |
| Swiper.js | Carousel library; 40KB+ min+gz. CSS scroll-snap achieves equivalent horizontal scroll UX at 0KB. |
| Isotope | Heavy (filtering/sorting grid). Not needed — gallery is display-only. |
| `@appnest/masonry-layout` | Web component; even at 1KB adds a custom element registration and mutation observer. Not needed for fixed-height strip. |
| `postcss-inline-svg` | PostCSS plugin for inlining SVGs in CSS. Not needed — Astro supports inline SVG in `.astro` files natively. |
| `astro-icon` | Overkill for adding 2-3 new SVG components. Direct inline SVG in Astro components is the idiomatic approach for custom shapes. |

---

## Dependency Summary

**No new dependencies are needed for v8.0.**

Existing stack that v8.0 builds on:

| Dependency | Version in package.json | v8.0 role |
|-----------|------------------------|-----------|
| `astro` | ^6.1.1 | Astro component shells for LizardBackground, TopoMeatball |
| `tailwindcss` | ^4.2.2 | Tailwind utilities for scroll container, spacing |
| `photoswipe` | ^5.4.4 | Existing lightbox — PhotoGallery.astro reuse |
| `sharp` (devDep) | ^0.34.5 | Existing — handles 19 new photos unchanged |

---

## Integration Points

### global.css additions

Three new CSS blocks in `@layer components`:

```css
/* Lizard background tile */
.lizard-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.04;
  background-image: url("data:image/svg+xml,...");
  background-repeat: repeat;
  background-size: [extracted-tile-size];
  z-index: 9997;
  will-change: transform;
}

/* Topo meatball divider */
.topo-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-accent-green);
  width: 80px;
  height: 80px;
  margin: 2rem auto;
}

/* Horizontal photo strip (replaces grid in PhotoGallery.astro) */
.photo-strip {
  display: flex;
  gap: 3px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  height: 280px;
}
.photo-strip-item {
  flex-shrink: 0;
  height: 100%;
  scroll-snap-align: start;
  overflow: hidden;
  cursor: pointer;
}
```

Add to `@keyframes` section:

```css
@keyframes lizard-drift {
  from { transform: translate(0, 0); }
  to   { transform: translate(-[tile-w]px, -[tile-h]px); }
}

@media (prefers-reduced-motion: no-preference) {
  .lizard-overlay { animation: lizard-drift 70s linear infinite; }
}
```

### New Astro components

| File | Purpose | Dependencies |
|------|---------|-------------|
| `src/components/LizardBackground.astro` | Fixed bg animation tile | None — inline SVG + CSS |
| `src/components/TopoMeatball.astro` | Section divider SVG | None — inline SVG |

Both components: no `<script>` block, no imports, no new npm packages.

### Modified Astro components

| File | Change |
|------|--------|
| `src/components/PhotoGallery.astro` | Replace `<div id="photo-gallery" class="grid grid-cols-2...">` with `<div class="photo-strip">` flex container; set `style="aspect-ratio: {photo.width}/{photo.height}"` on each item; keep existing PhotoSwipe lightbox JS unchanged |
| `src/components/GravelSectors.astro` | Add `.tone-image` positioned inside card where desired |
| `src/components/KomSegments.astro` | Add `.tone-image` positioned inside card where desired |

### Pipeline changes

| Script | Change |
|--------|--------|
| `scripts/convert-tone-images.js` | Extend `TONE_IMAGES` array for any new source images in `images/tone/` that need conversion |
| All other scripts | No changes |

---

## Sources

| Source | Confidence | What it informed |
|--------|------------|-----------------|
| [MDN CSS Masonry Layout](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Masonry_layout) | HIGH | CSS native masonry is not production-ready (experimental, flag-only) |
| [Chrome for Developers — Brick by brick help us build CSS Masonry](https://developer.chrome.com/blog/masonry-update) | HIGH | Chrome 140+ testing; still behind flag |
| [Andy Barefoot — Masonry style layout using CSS Grid](https://medium.com/@andybarefoot/a-masonry-style-layout-using-css-grid-8c663d355ebb) | HIGH | CSS Grid span technique for vertical masonry; confirmed JS-dependent |
| [web.dev — How to create high-performance CSS animations](https://web.dev/articles/animations-guide) | HIGH | Only `transform` and `opacity` are compositor-safe; verified `will-change: transform` pattern |
| [Chrome for Developers — Hardware-accelerated animations](https://developer.chrome.com/blog/hardware-accelerated-animations) | MEDIUM | `clip-path` coming to compositor but not fully there in Firefox (24.5% CPU cost) |
| [npm masonry-layout](https://www.npmjs.com/package/masonry-layout) | HIGH | Version 4.2.2, 8 years since last publish |
| [sharp changelog v0.34.5](https://sharp.pixelplumbing.com/changelog/v0.34.5/) | HIGH | No breaking API changes in 0.34.x affecting JPEG→WebP thumbnail workflow |
| [CSS Tricks — Making a Masonry Layout That Works Today](https://css-tricks.com/making-a-masonry-layout-that-works-today/) | MEDIUM | JS polyfill approach for masonry; confirms no pure CSS cross-browser solution today |
| [MDN CSS Scroll Snap](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll_snap) | HIGH | `scroll-snap-type: x mandatory` is CSS-only, compositor-handled |
| [Tobias Ahlin — Masonry with CSS](https://tobiasahlin.com/blog/masonry-with-css/) | MEDIUM | Flexbox + nth-child order technique; confirmed not suited for horizontal strip gallery |
| Direct codebase inspection | HIGH | Confirmed existing `photos.json` already has `width`/`height`; confirmed `.tone-image` CSS class; confirmed escher/grain overlay z-index layer ordering; confirmed sharp pipeline is already fully parameterized for new photos |
