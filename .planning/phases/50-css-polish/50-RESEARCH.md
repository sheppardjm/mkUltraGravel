# Phase 50: CSS Polish - Research

**Researched:** 2026-04-06
**Domain:** CSS scrollbar theming, responsive image aspect ratios
**Confidence:** HIGH

## Summary

This phase has two independent CSS-only concerns: (1) styling all scrollbars to match the dark brutalist theme, and (2) fixing the gravel sector card images to display with a natural aspect ratio on wide screens instead of a fixed 180px height.

For scrollbars, the standard modern approach is the CSS Scrollbars Styling Module Level 1 (`scrollbar-color` + `scrollbar-width`), which reached Baseline 2025 (fully available across all major browsers as of December 2025). These two standard properties cover all requirements. For old WebKit browsers (iOS Safari <26.2), a `::-webkit-scrollbar` fallback exists. Since this is a gravel cycling event site — not a banking app — progressive enhancement is appropriate: old browsers get the native scrollbar, modern browsers get the dark theme.

For the card image aspect ratio fix, the current `h-[180px]` Tailwind class on `GravelSectors.astro` is a fixed height that clips images on wide screens. The fix is to replace the fixed height with `aspect-video` (16:9) or a similar ratio using CSS `aspect-ratio` (Baseline Widely Available since 2021). KomSegments.astro already uses `class="w-full aspect-video object-cover"` — this is the established pattern in the codebase.

**Primary recommendation:** Add `scrollbar-color`/`scrollbar-width` declarations to the `@layer base` block in `global.css`, with a `::-webkit-scrollbar` fallback scoped inside `@supports selector(::-webkit-scrollbar)`. Replace `h-[180px]` on the GravelSectors card image with `aspect-video` to match KomSegments.

## Standard Stack

### Core

No external libraries needed. All changes are plain CSS and Tailwind utility classes already in the project.

| Approach | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `scrollbar-color` + `scrollbar-width` | CSS Scrollbars Level 1 (Baseline 2025) | Theme scrollbar thumb and track colors | Standardized, widely supported, inherited by child elements |
| `::-webkit-scrollbar` pseudo-elements | Non-standard (WebKit/Blink) | Fallback for pre-standard Safari | Still needed for iOS Safari <26.2 |
| Tailwind `aspect-video` | Tailwind v4 (project current) | 16:9 aspect ratio on card images | Already used in KomSegments, consistent pattern |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `aspect-video` (16:9) | `aspect-[3/2]` or `aspect-[4/3]` | 16:9 matches the cover photo dimensions (width=600, height=338 in GravelSectors.astro) which is close to 16:9; use `aspect-video` |
| global `scrollbar-color` on `:root` | Per-component scoping | Global is simpler and correct here — all scrollable containers should use the same theme |
| Tailwind scrollbar plugin | Pure CSS | Tailwind v4 has no built-in scrollbar utilities. No plugin needed; write CSS directly in global.css |

## Architecture Patterns

### Pattern 1: Global Scrollbar Theme in `@layer base`

**What:** Declare `scrollbar-color` and `scrollbar-width` on `:root` inside `@layer base` in `global.css`. These properties inherit, so all scrollable elements automatically get the theme.

**When to use:** Any time all scrollbars on a dark-themed site should match.

**Example:**
```css
/* Source: MDN scrollbar-color (https://developer.mozilla.org/en-US/docs/Web/CSS/scrollbar-color) */
/* Source: MDN ::-webkit-scrollbar (https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-scrollbar) */

@layer base {
  :root {
    /* Standard (Baseline 2025) — Firefox 64+, Chrome 121+, Edge 121+, Safari 26.2+ */
    scrollbar-color: var(--color-accent-green) var(--color-bg-surface);
    scrollbar-width: thin;
  }
}

/* WebKit fallback — Chrome <121, Safari <26.2 (iOS Safari) */
@supports selector(::-webkit-scrollbar) {
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: var(--color-bg-surface);  /* oklch(0.14 0.01 250) */
  }
  ::-webkit-scrollbar-thumb {
    background: var(--color-accent-green);  /* oklch(0.85 0.24 145) */
  }
  ::-webkit-scrollbar-thumb:hover {
    background: var(--color-accent-white);  /* fallback on thumb hover */
  }
  ::-webkit-scrollbar-corner {
    background: var(--color-bg-base);
  }
}
```

**Important note on `@supports selector(::-webkit-scrollbar)`**: This `@supports` guard is the canonical MDN-recommended way to provide the WebKit fallback without conflicting with the standard property. When both the standard and WebKit styles apply (as in Chrome 121+), they don't conflict — the standard property wins. The guard simply prevents the fallback from being parsed in browsers that don't support WebKit pseudo-elements at all.

### Pattern 2: Card Image Aspect Ratio Fix

**What:** Replace the fixed `h-[180px]` class on the `<img>` in GravelSectors.astro with `aspect-video` (which computes to `aspect-ratio: 16 / 9`). The `w-full object-cover` classes stay.

**When to use:** When images should scale proportionally rather than clipping at a fixed pixel height.

**Current code (GravelSectors.astro line 31):**
```html
<img ... class="w-full h-[180px] object-cover" />
```

**Fixed code:**
```html
<img ... class="w-full aspect-video object-cover" />
```

**Why `aspect-video` (16:9)?** The image `width="600" height="338"` in GravelSectors.astro is already close to 16:9 (600/338 ≈ 1.775; 16/9 ≈ 1.778). KomSegments.astro (same card layout) already uses `aspect-video` — this unifies both.

**Mobile impact:** On mobile (375px), `w-full aspect-video` will produce `height = 375 / (16/9) ≈ 211px`, which is slightly taller than 180px but acceptable. The grid is `md:grid-cols-3`, so on mobile GravelSectors stacks vertically — extra height is fine. The success criteria explicitly requires no breakage at 375px.

### Anti-Patterns to Avoid

- **Don't declare `-webkit-scrollbar` styles without the `@supports selector(::-webkit-scrollbar)` guard.** Without the guard, browsers that support the standard properties may also apply the WebKit styles, potentially creating inconsistency.
- **Don't use `scrollbar-color` alone without `scrollbar-width`.** Without `scrollbar-width: thin` or `auto`, the default browser scrollbar width applies (which can be very wide on some platforms).
- **Don't set a fixed `height` AND `aspect-ratio` on the same element.** Only one dimension should be fixed; the other must be `auto` for `aspect-ratio` to work. For `<img>`, `w-full` sets width; removing the fixed `h-[180px]` allows `aspect-ratio` to compute height automatically.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-browser scrollbar theme | Custom JS scrollbar overlay | CSS standard properties + WebKit fallback | Native scrollbars work better for accessibility and performance |
| Card image proportional height | JavaScript resize observer | CSS `aspect-ratio` | Baseline 2021, zero JS, no layout jank |

**Key insight:** Both changes are pure CSS with no new dependencies, no JS, and no build changes needed.

## Common Pitfalls

### Pitfall 1: PhotoGallery's Horizontal Scrollbar

**What goes wrong:** The `masonry-gallery` in `PhotoGallery.astro` uses `overflow-x: auto` (horizontal scroll) and `overflow-y: hidden`. The scrollbar theme declared on `:root` will inherit, but the horizontal scrollbar on `.masonry-gallery` is what users actually see for SCROLL-02.

**Why it happens:** The horizontal scrollbar is a child element of a section with `overflow-y-hidden` on the `#photos` section. The `scrollbar-color` inherits to `.masonry-gallery`, so no extra rules are needed — but this should be verified during UAT.

**How to avoid:** No extra action needed; inheritance handles it. Just verify in UAT that the horizontal gallery scrollbar is also themed.

### Pitfall 2: `scrollbar-color` Syntax Order

**What goes wrong:** Confusing `thumb track` order. The syntax is `scrollbar-color: <thumb-color> <track-color>` — thumb first, then track.

**Why it happens:** Developers may assume track comes first (as it's the "background").

**How to avoid:** Remember: thumb first. `scrollbar-color: var(--color-accent-green) var(--color-bg-surface)` — green thumb on dark surface track.

### Pitfall 3: iOS Safari Scrollbar Support

**What goes wrong:** iOS Safari <26.2 does not support `scrollbar-color`/`scrollbar-width`. The WebKit fallback also does not work on iOS Safari (it supports `::-webkit-scrollbar` only on macOS Safari, not iOS).

**Why it happens:** iOS Safari hides scrollbars entirely by default on touch scrolling. Custom scrollbar styles have never applied on iOS Safari regardless of approach.

**How to avoid:** Accept this graceful degradation. iOS users see the OS-native scroll indicator (a thin translucent line that appears on scroll). This is expected behavior and does not violate the success criteria as long as desktop browsers display the theme.

### Pitfall 4: Card Image Height on Mobile vs Desktop

**What goes wrong:** On very wide screens (>1280px), the GravelSectors grid is 3 columns with `md:col-span-2` wrapping. `w-full aspect-video` on a card that's ~800px wide would produce a ~450px tall image — much taller than 180px. For gravel cycling photos (landscape terrain), this may actually be fine and is the intent of CARD-01. However, if the design requires a cap, a `max-h-` class could be added.

**How to avoid:** Per requirements, CARD-01 explicitly asks for "proportional height instead of fixed 180px clipping." No max-height cap is specified. Start without a cap. Observe in UAT.

## Code Examples

Verified patterns from official sources and codebase analysis:

### Complete Scrollbar Theme Block (for global.css)
```css
/* Source: MDN scrollbar-color https://developer.mozilla.org/en-US/docs/Web/CSS/scrollbar-color */
/* Covers SCROLL-01, SCROLL-02, SCROLL-03 */

@layer base {
  :root {
    scrollbar-color: var(--color-accent-green) var(--color-bg-surface);
    scrollbar-width: thin;
  }
}

/* WebKit fallback — Chrome <121, legacy Edge, macOS Safari <18 */
@supports selector(::-webkit-scrollbar) {
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: var(--color-bg-surface);
  }
  ::-webkit-scrollbar-thumb {
    background: var(--color-accent-green);
  }
  ::-webkit-scrollbar-thumb:hover {
    background: var(--color-accent-white);
  }
  ::-webkit-scrollbar-corner {
    background: var(--color-bg-base);
  }
}
```

### Card Image Fix (GravelSectors.astro)
```html
<!-- Before (line 31): fixed height clips on wide screens -->
<img ... class="w-full h-[180px] object-cover" />

<!-- After: proportional 16:9 ratio, matches KomSegments pattern -->
<img ... class="w-full aspect-video object-cover" />
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `::-webkit-scrollbar` only | `scrollbar-color` + `scrollbar-width` (standard) | Baseline 2025 (Dec 2025) | Standard approach is now preferred; WebKit pseudo-elements are a legacy fallback |
| Fixed `height` on card images | `aspect-ratio` with `auto` height | Baseline since 2021 | Responsive-by-default, no JS required |

**Deprecated/outdated:**
- `::-webkit-scrollbar` as the primary approach: Still works but is non-standard. Use standard `scrollbar-color`/`scrollbar-width` as primary, WebKit as fallback.

## Open Questions

1. **Max-height cap on wide-screen card images**
   - What we know: CARD-01 asks for proportional height instead of clipping. No max-height is mentioned in requirements.
   - What's unclear: Whether very tall images (450px+) on 4K screens are acceptable.
   - Recommendation: Implement without cap first; add `max-h-[320px]` only if UAT identifies an issue.

2. **KomSegments aspect ratio consistency**
   - What we know: KomSegments already uses `aspect-video`. No change needed there.
   - What's unclear: Whether the requirements intended KomSegments to also be reviewed.
   - Recommendation: CARD-01 mentions only "gravel sector card images." KomSegments is already correct. No change needed.

## Sources

### Primary (HIGH confidence)
- MDN `scrollbar-color` — https://developer.mozilla.org/en-US/docs/Web/CSS/scrollbar-color — syntax, values, browser support
- MDN `::-webkit-scrollbar` — https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-scrollbar — pseudo-elements, @supports guard pattern
- MDN `aspect-ratio` — https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio — baseline 2021, syntax
- Caniuse CSS Scrollbar — scrollbar-color/width ~91.83% global support as of 2026
- Codebase: `/src/styles/global.css` — existing design tokens and @layer structure
- Codebase: `/src/components/GravelSectors.astro` — current `h-[180px]` location
- Codebase: `/src/components/KomSegments.astro` — established `aspect-video` pattern

### Secondary (MEDIUM confidence)
- Tailwind v4 upgrade guide — confirmed no built-in scrollbar utilities; raw CSS in global.css is correct approach

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — both CSS properties verified against MDN official docs
- Architecture: HIGH — patterns verified against MDN, existing codebase patterns confirmed
- Pitfalls: HIGH (iOS Safari behavior) / MEDIUM (max-height question is a product/design call)

**Research date:** 2026-04-06
**Valid until:** 2026-07-06 (CSS specs are stable; Tailwind v4 API confirmed)
