# Phase 43: Horizontal Masonry Gallery - Research

**Researched:** 2026-03-31
**Domain:** CSS horizontal scroll-snap gallery, CLS prevention, PhotoSwipe 5 lightbox integration
**Confidence:** HIGH

## Summary

This phase refactors `PhotoGallery.astro` from a fixed-aspect-ratio vertical grid into a horizontally scrollable strip where each image occupies width proportional to its natural aspect ratio. The key technical challenge is implementing this purely in CSS (no JS library), while (a) not blocking vertical page scroll, (b) escaping the parent section's `overflow-hidden` constraint, and (c) keeping PhotoSwipe 5 lightbox working without changes to its initialization logic.

All images in `photos.json` already have correct `width` and `height` dimensions written by `generate-thumbnails.js`. Thumbnails are generated at 400px wide, preserving aspect ratio — so the thumbnail `src` dimensions are computable from the full-image aspect ratio: thumb width is 400px and thumb height is `round(400 / (width/height))`. The gallery has 71 photos with aspect ratios of 0.68, 0.75, 1.33, 1.62, and 1.78. The majority (62 of 71) are portrait orientation.

**Primary recommendation:** Use CSS flexbox with `overflow-x: auto`, `scroll-snap-type: x proximity`, and `overscroll-behavior-x: contain`. Each image item gets `height: var(--gallery-h)` (a fixed row height CSS variable) and computes its own width via `width: calc(var(--gallery-h) * (W / H))` using inline styles from Astro. The parent section `overflow-hidden` must be replaced with `overflow-x-visible` on the photos section or the gallery must use negative horizontal margins to escape section padding.

## Standard Stack

No additional libraries are needed. All required capabilities are native CSS + existing dependencies.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| CSS scroll-snap | Native | Horizontal gallery snapping | No JS needed, all modern browsers |
| CSS flexbox | Native | Variable-width horizontal strip | Simplest layout for this use case |
| PhotoSwipe | 5.4.4 (installed) | Lightbox on click | Already integrated, no changes needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | v4 (installed) | Utility classes for snap | Use Tailwind snap-* utilities for container classes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pure CSS flexbox | CSS Grid | Grid is better for multi-row; this is single row, flexbox is simpler |
| `scroll-snap-type: x proximity` | `x mandatory` | Mandatory can feel restrictive; proximity better for a gallery in a long page |
| Native CSS | Swiper.js or similar | No new dependency needed; requirements explicitly say no JS library |

**Installation:** No new packages required.

## Architecture Patterns

### Recommended Project Structure

Only `PhotoGallery.astro` and the parent section in `index.astro` need changes.

```
src/
├── components/
│   └── PhotoGallery.astro     # Full rewrite — flexbox strip with scroll-snap
├── pages/
│   └── index.astro            # Section id="photos": remove overflow-hidden, adjust padding
└── styles/
    └── global.css             # No changes needed
```

### Pattern 1: CSS Flexbox Horizontal Strip with Variable Width

**What:** A flex container set to `overflow-x: auto` with `scroll-snap-type: x proximity`. Each child `<a>` element has a fixed height (from a CSS variable) and a computed width derived from the photo's aspect ratio.

**When to use:** Single-row gallery with images of mixed aspect ratios at a consistent height.

**Example:**
```html
<!-- Source: MDN Web Docs + ishadeed.com/article/css-scroll-snap -->
<div
  id="photo-gallery"
  class="flex overflow-x-auto snap-x snap-proximity overscroll-x-contain gap-1"
  style="--gallery-h: 280px; height: var(--gallery-h);"
>
  {photos.map((photo) => {
    const aspectRatio = photo.width / photo.height;
    const itemWidth = Math.round(280 * aspectRatio);
    return (
      <a
        href={`/images/${photo.filename}`}
        data-pswp-width={photo.width}
        data-pswp-height={photo.height}
        class="gallery-item flex-none snap-start overflow-hidden cursor-pointer"
        style={`width: ${itemWidth}px; height: var(--gallery-h);`}
        aria-label={`View route photo at mile ${photo.mi}`}
      >
        <img
          src={`/images/thumbs/${photo.filename.replace(/\.(jpg|jpeg|png|avif)$/i, '.webp')}`}
          alt={`Route photo at mile ${photo.mi}`}
          width={400}
          height={Math.round(400 / aspectRatio)}
          loading="lazy"
          decoding="async"
          class="w-full h-full object-cover"
        />
      </a>
    );
  })}
</div>
```

### Pattern 2: Escaping Parent Section's `overflow-hidden`

**What:** The `#photos` section in `index.astro` currently has `overflow-hidden` which clips the horizontal scroller. Two clean options:

**Option A — Modify the section (recommended):** Remove `overflow-hidden` from the section and add `overflow-x: clip` (clips horizontally without creating a new scroll context). This preserves the vertical overflow behavior needed by the `.tone-image` absolute background.

```html
<!-- index.astro: change this -->
<section id="photos" class="relative min-h-screen px-4 py-16 overflow-hidden border-t border-border">

<!-- to this -->
<section id="photos" class="relative min-h-screen px-4 py-16 overflow-x-clip border-t border-border">
```

**Option B — Break out with negative margins:** Keep `overflow-hidden` on the section but make the gallery escape section's horizontal padding using negative margins:
```css
.photo-gallery-wrapper {
  margin-left: -1rem;   /* cancel px-4 = 1rem */
  margin-right: -1rem;
  width: calc(100% + 2rem);
}
```
This fails if the section has `overflow: hidden` (clips the gallery). Option A is correct.

**Note:** `overflow-x: clip` is the modern equivalent — it prevents the element from becoming a scroll container while still clipping overflow. Browser support is Baseline 2022, widely available. Do not use `overflow-x: hidden` as a replacement; it creates an implicit scroll container that breaks scroll chaining.

### Pattern 3: Partial Peek (Scroll Affordance)

**What:** Show the right edge of the next image partially cropped at the viewport edge to signal horizontal scrollability.

**How:** Do NOT set `padding-right` on the container. The gallery items extend beyond the viewport naturally. Use `scroll-padding-left` on the container to control where items snap to:

```css
#photo-gallery {
  scroll-padding-left: 0; /* snap to left edge of each item */
}
```

For the partial peek: the gallery items have explicit widths from aspect ratios. Since the viewport is unlikely to perfectly contain an integer number of images, the next image will naturally peek at the right edge. No extra CSS needed.

If more explicit peeking is required (e.g., the last item could be the only one and fills the viewport), add `padding-right` to the container:
```css
/* Ensures last image never fills 100% width */
#photo-gallery {
  padding-right: 48px; /* ~12% peek at common widths */
}
```

### Pattern 4: CLS Prevention

**What:** Prevent layout shift as images load.

**How:** Provide explicit `width` and `height` HTML attributes on each `<img>` tag. The browser injects `aspect-ratio: auto W / H` from these attributes, reserving space before the image loads.

The thumbnail dimensions are computable at build time:
- Thumb width: `400` (all thumbs are 400px wide per `generate-thumbnails.js`)
- Thumb height: `Math.round(400 / aspectRatio)` where `aspectRatio = photo.width / photo.height`

The gallery items have fixed dimensions via inline styles, so no aspect-ratio reservation is needed at the item level — the container dimension is already fixed. The `<img>` attributes are still best practice for PhotoSwipe's thumbnail display during lightbox open transition.

### Anti-Patterns to Avoid

- **`scroll-snap-type: x mandatory` inside a page with vertical scroll:** The requirement says `proximity` — mandatory prevents the user from freely scrolling and can trap touch input.
- **`overflow: hidden` on the gallery's scroll container:** This is what the current section does; it must be removed or replaced with `overflow-x: clip`.
- **`overflow-x: hidden` instead of `overflow-x: clip`:** `overflow-x: hidden` creates an implicit scroll context, which interferes with `position: sticky` and nested scrollers.
- **`width: auto; height: auto` on gallery images with lazy loading:** Without explicit dimensions, lazy-loaded images cause CLS. Always provide `width` and `height` attributes.
- **Using `overscroll-behavior: contain` (2-axis) when only horizontal:** Use `overscroll-behavior-x: contain` (Tailwind: `overscroll-x-contain`) to contain only horizontal momentum without affecting vertical scroll chain.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Lightbox / swipe navigation | Custom modal + touch handlers | PhotoSwipe 5.4.4 (already installed) | Handles zoom, swipe, keyboard, accessibility |
| Scroll momentum / physics | JS scroll listener | `scroll-snap-type: x proximity` + `overscroll-behavior-x: contain` | Native browser behavior, works on iOS |
| Image lazy loading | JS IntersectionObserver | `loading="lazy"` HTML attribute | Native, no JS cost |

**Key insight:** The entire gallery refactor is pure CSS + Astro template changes. No new JS is needed. PhotoSwipe initialization code is unchanged — it already uses `gallery: '#photo-gallery'` and `children: 'a'`, which works regardless of whether the gallery is a grid or flexbox strip.

## Common Pitfalls

### Pitfall 1: `overflow-hidden` on parent clips horizontal gallery

**What goes wrong:** The `#photos` section has `overflow-hidden`. The gallery's horizontal scroller appears but cannot scroll — the overflow is clipped before content reaches the scroll container's edges visually.

**Why it happens:** `overflow: hidden` on an ancestor creates a clipping context that prevents the scrollable child's overflow from being visible outside the ancestor's bounds.

**How to avoid:** Replace `overflow-hidden` on the section with `overflow-x-clip` (clips only the X axis without creating a scroll context) or remove it and handle the background image positioning via `position: absolute` with `inset: 0` (which is already the pattern used — the `.tone-image` does not need `overflow-hidden` to be clipped, it uses `position: absolute`).

**Warning signs:** Gallery items render but horizontal scroll does not work; the strip appears truncated.

### Pitfall 2: Scroll-snap trap on mobile

**What goes wrong:** With `scroll-snap-type: x mandatory`, a user attempting to scroll down the page while their touch begins with a horizontal component gets "trapped" — the browser interprets the gesture as horizontal gallery scroll.

**Why it happens:** Mandatory snap strictness captures the scroll event.

**How to avoid:** Use `scroll-snap-type: x proximity` (Tailwind: `snap-x snap-proximity`). This is specified in requirement GAL-03.

**Warning signs:** Users on mobile cannot scroll the page past the photos section; they must start the vertical scroll gesture above or below the gallery.

### Pitfall 3: `width` attribute missing on gallery images causes CLS

**What goes wrong:** Without `width` and `height` on `<img>`, the browser cannot compute reserved height before the image loads. Since each gallery item has a fixed height via inline style, the item itself doesn't shift — but the `<img>` may cause a reflow within the item.

**Why it happens:** The current `PhotoGallery.astro` does NOT set `width`/`height` on `<img>` tags (verified in source). Images use `object-cover`, which requires the container to have set dimensions. If the container is already sized by inline style, actual CLS may be minimal — but GAL-05 requires attributes anyway.

**How to avoid:** Add `width={400}` and `height={Math.round(400 / aspectRatio)}` to every `<img>` tag. These match actual thumbnail dimensions.

**Warning signs:** CLS > 0.05 in Lighthouse; layout jump visible during initial load on slow connections.

### Pitfall 4: Thumbnail `src` regex only replaces first match

**What goes wrong:** The current regex `photo.filename.replace(/\.(jpg|jpeg|png|avif)$/i, '.webp')` correctly replaces only the extension. However, some filenames contain spaces (e.g., `"HPBlbKhBz0-5_T0sbj2ih_5vs1nQMxLG63JgbSmpYcc-1536x2048 (1).jpg"`). This is not a regex issue but URL encoding must be handled.

**Why it happens:** Filenames with spaces or special chars in `src` attributes are valid HTML but may fail on strict servers if not URL-encoded. Current code works (checked in existing gallery).

**How to avoid:** Keep existing regex pattern. No change needed — this is already working.

### Pitfall 5: PhotoSwipe `children` selector must still match

**What goes wrong:** If the `<a>` tags are wrapped in extra elements or the class changes, PhotoSwipe's `children: '.gallery-item'` selector fails silently — images appear in gallery but clicking does nothing.

**Why it happens:** PhotoSwipe walks the DOM tree from `gallery` to `children` selector to find clickable slides.

**How to avoid:** Preserve the class `gallery-item` on each `<a>`. The existing init code uses `children: '.gallery-item'` — keep this class on refactored items.

## Code Examples

Verified patterns from official sources:

### PhotoSwipe 5 — Existing init is unchanged
```javascript
// Source: photoswipe.com/getting-started (confirmed version 5.4.4)
// This code in PhotoGallery.astro requires NO changes.
const lightbox = new PhotoSwipeLightbox({
  gallery: '#photo-gallery',
  children: '.gallery-item',   // must match class on <a> elements
  pswpModule: () => import('photoswipe'),
  bgOpacity: 0.95,
});
lightbox.init();
```

### CLS-Safe Image with Width/Height
```html
<!-- Source: web.dev/articles/optimize-cls -->
<!-- Thumb width=400 (generate-thumbnails.js resizes to 400px wide) -->
<!-- Thumb height computed from aspect ratio -->
<img
  src="/images/thumbs/photo.webp"
  alt="Route photo at mile 13.8"
  width="400"
  height="533"
  loading="lazy"
  decoding="async"
  class="w-full h-full object-cover"
/>
```

### Gallery Item with Inline-Computed Width
```astro
<!-- Source: pattern derived from MDN scroll-snap + Astro template syntax -->
{photos.map((photo) => {
  const aspectRatio = photo.width / photo.height;
  const itemWidth = Math.round(280 * aspectRatio);  // 280 = gallery height
  const thumbHeight = Math.round(400 / aspectRatio);

  return (
    <a
      href={`/images/${photo.filename}`}
      data-pswp-width={photo.width}
      data-pswp-height={photo.height}
      class="gallery-item flex-none snap-start overflow-hidden cursor-pointer"
      style={`width: ${itemWidth}px;`}
      aria-label={`View route photo at mile ${photo.mi}`}
    >
      <img
        src={`/images/thumbs/${photo.filename.replace(/\.(jpg|jpeg|png|avif)$/i, '.webp')}`}
        alt={`Route photo at mile ${photo.mi}`}
        width={400}
        height={thumbHeight}
        loading="lazy"
        decoding="async"
        class="w-full h-full object-cover"
      />
    </a>
  );
})}
```

### Horizontal Scroll Container (Tailwind + inline style)
```html
<!-- Source: tailwindcss.com/docs/scroll-snap-type + MDN overscroll-behavior-x -->
<div
  id="photo-gallery"
  class="flex overflow-x-auto snap-x snap-proximity overscroll-x-contain gap-1 pb-2"
  style="height: 280px;"
>
  <!-- gallery items -->
</div>
```

### Parent Section Fix in index.astro
```html
<!-- Remove overflow-hidden, replace with overflow-x-clip to preserve background image clipping -->
<!-- Source: MDN docs on overflow-x: clip (Baseline 2022) -->
<section id="photos" class="relative min-h-screen px-4 py-16 overflow-x-clip border-t border-border">
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `overflow: hidden` for clip | `overflow-x: clip` for axis-specific clip | Baseline 2022 | Prevents accidental scroll container creation |
| `webkit-overflow-scrolling: touch` | Not needed | iOS 13+ (2019) | Native momentum scrolling is default on iOS |
| JS-driven carousel (Swipe.js, Slick) | Pure CSS scroll-snap | ~2020 | No JS dependency, better performance |

**Deprecated/outdated:**
- `-webkit-overflow-scrolling: touch`: No longer needed; native momentum scrolling is enabled by default on iOS 13+. Including it is harmless but unnecessary.
- `scroll-snap-points-x`: Old draft spec property. Use `scroll-snap-type` + `scroll-snap-align` instead.

## Open Questions

1. **Gallery height on mobile vs desktop**
   - What we know: The gallery needs a fixed height (CSS variable). 280px is a reasonable starting value.
   - What's unclear: Whether the same height is appropriate for all screen widths, or if a responsive height (e.g., 200px mobile / 320px desktop) is preferred.
   - Recommendation: Use a single fixed height first (280px). If it looks wrong on mobile, add a breakpoint via a second custom property. This is a visual decision that can be adjusted in iteration.

2. **Scrollbar visibility**
   - What we know: `overflow-x: auto` shows a scrollbar on desktop browsers that display scrollbars (e.g., Windows Chrome). On macOS/iOS, scrollbars appear on hover/scroll only.
   - What's unclear: Whether the scrollbar should be hidden on desktop for aesthetic reasons.
   - Recommendation: Use `scrollbar-width: none` CSS (+ `-webkit-scrollbar: none` for Safari) if a scrollbar-free look is desired. This is purely aesthetic and does not affect functionality.

3. **Phase 42 photo count (71 vs 74)**
   - What we know: Current `photos.json` has 71 entries. The phase description says "74 photos." Phase 42 is marked as the dependency.
   - What's unclear: Whether Phase 42 adds 3 more photos before Phase 43 runs.
   - Recommendation: Write the code generically — it reads `photos.json` dynamically, so it will work with whatever count is present.

## Sources

### Primary (HIGH confidence)
- MDN Web Docs — `scroll-snap-type`, `overscroll-behavior-x`, `overflow-x: clip` (all current spec docs)
- web.dev/articles/optimize-cls — CLS prevention with `width`/`height` attributes and `aspect-ratio`
- photoswipe.com/getting-started — PhotoSwipe 5 initialization API (verified version 5.4.4 installed)
- Context7 not used — all domains covered by MDN/web.dev directly

### Secondary (MEDIUM confidence)
- tailwindcss.com/docs/scroll-snap-type — Tailwind v4 snap utility class names (verified current)
- ishadeed.com/article/css-scroll-snap — Horizontal gallery pattern, iOS `-webkit-overflow-scrolling` note
- css-tricks.com/practical-css-scroll-snapping — `scroll-padding` and peek patterns

### Tertiary (LOW confidence)
- None — all key claims verified with authoritative sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; pure CSS + existing PhotoSwipe 5
- Architecture: HIGH — patterns verified from MDN, web.dev, and existing codebase inspection
- Pitfalls: HIGH — `overflow-hidden` issue directly confirmed from codebase source inspection
- CLS prevention: HIGH — web.dev/optimize-cls is authoritative

**Research date:** 2026-03-31
**Valid until:** 2026-06-30 (CSS scroll-snap is stable spec; no churn expected)
