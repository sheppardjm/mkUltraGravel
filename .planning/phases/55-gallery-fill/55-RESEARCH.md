# Phase 55: Gallery Fill - Research

**Researched:** 2026-04-08
**Domain:** CSS multi-column layout, column-fill balancing, horizontal-scroll masonry gallery
**Confidence:** HIGH

## Summary

Phase 43 built a CSS columns masonry gallery in `PhotoGallery.astro` using `column-fill: auto` and `max-height`. With 73 photos and a max-height that allows ~2-3 portrait photos per column, the gallery creates ~33 columns. The last column ends up with only 1 remaining photo (~300px), while all other columns are 600-776px tall — a gap of ~66% of the container height. This is the core problem GAL-02 targets.

The fix is a pure-CSS two-property change: switch `max-height` to `height` AND switch `column-fill: auto` to `column-fill: balance`. The `max-height` change is required because Chrome only activates `column-fill` (both `auto` and `balance`) when the container has an **explicitly defined block-dimension size** — `max-height` does not qualify. With a fixed `height`, `column-fill: balance` distributes content evenly across all columns including the last.

There is a known cross-browser inconsistency for `column-fill: balance` in overflow-column scenarios (CSS spec issue #2549). A JS fallback approach using explicit column divs with a shortest-column-first distribution algorithm is documented as the backup if browser testing reveals cross-browser divergence.

**Primary recommendation:** Two-line CSS change in `PhotoGallery.astro` — change `max-height` to `height` and `column-fill: auto` to `column-fill: balance` at every breakpoint. Test in Chrome, Firefox, Safari. If behavior diverges, fall back to the JS explicit-columns approach.

## Standard Stack

No new libraries required. This is a CSS change to the existing component.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| CSS column-fill | Native | Balance content across columns | Native, no JS cost |
| Astro | ^6.1.1 (installed) | Component rendering | Already the framework |
| PhotoSwipe | 5.4.4 (installed) | Lightbox | Already integrated, unchanged |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | v4 (installed) | Utility classes | No Tailwind changes needed for this fix |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS column-fill: balance | JS explicit column divs | JS approach is more reliable but adds layout complexity and minor CLS risk |
| CSS column-fill: balance | Build-time pre-ordering | Pre-ordering in Astro frontmatter can't reliably target multiple breakpoints with CSS columns |

**Installation:** No new packages required.

## Architecture Patterns

### File to Modify
Only one file needs changes:
```
src/
└── components/
    └── PhotoGallery.astro    # Two CSS property changes in .masonry-gallery
```

### Pattern 1: CSS column-fill: balance with Fixed Height

**What:** Changing `max-height` to `height` and `column-fill: auto` to `column-fill: balance` in the masonry gallery container.

**When to use:** CSS multi-column layout where content always fills the container (confirmed: 73 photos always exceed any breakpoint height). The fixed height is required because Chrome only activates `column-fill` when the container has an explicitly defined block-dimension size.

**Example — current (broken):**
```css
.masonry-gallery {
  columns: 2 160px;
  column-fill: auto;         /* fills sequentially, last column is short */
  max-height: 75vh;          /* Chrome ignores column-fill with max-height */
  overflow-x: auto;
  overflow-y: hidden;
}
```

**Example — fixed:**
```css
.masonry-gallery {
  columns: 2 160px;
  column-fill: balance;      /* distribute content evenly across all columns */
  height: 75vh;              /* fixed height satisfies Chrome's column-fill requirement */
  overflow-x: auto;
  overflow-y: hidden;
}
```

Apply to ALL four breakpoints:
```css
/* Base */
.masonry-gallery { columns: 2 160px; column-fill: balance; height: 75vh; }

@media (min-width: 480px) {
  .masonry-gallery { columns: 3 180px; height: 80vh; }
}

@media (min-width: 768px) {
  .masonry-gallery { columns: 4 200px; height: 85vh; }
}

@media (min-width: 1280px) {
  .masonry-gallery { columns: 5 220px; height: 90vh; }
}
```

**Mathematical verification (desktop breakpoint):**
- 73 photos, mostly portrait (0.75 ratio), col_width=220px
- Total item heights: ~20,802px
- With height=810px (90vh at ~900px): ceil(20802/810) = 26 columns
- Each column target height: ~800px (98.8% full)
- Last column: same ~800px — not short

### Pattern 2: JS Explicit Columns (Fallback)

**What:** Replace CSS multi-column with N explicit `<div class="gallery-col">` elements populated at build time using a shortest-column-first greedy algorithm.

**When to use:** If browser testing reveals `column-fill: balance` does not equalize the last column in Chrome or Safari.

**Example (Astro frontmatter compute):**
```typescript
// In PhotoGallery.astro frontmatter
const NUM_COLS = 5; // desktop target
const colHeights: number[] = new Array(NUM_COLS).fill(0);
const cols: typeof photos[] = Array.from({ length: NUM_COLS }, () => []);
const COL_WIDTH = 220; // px
const GAP = 8; // px

for (const photo of photos) {
  const itemH = COL_WIDTH * (photo.height / photo.width) + GAP;
  const minIdx = colHeights.indexOf(Math.min(...colHeights));
  cols[minIdx].push(photo);
  colHeights[minIdx] += itemH;
}
```
```html
<!-- Template: render each column as explicit div -->
<div id="photo-gallery" class="gallery-cols-wrapper">
  {cols.map((colPhotos) => (
    <div class="gallery-col">
      {colPhotos.map((photo) => (
        <a class="gallery-item" ...>
          <img ... />
        </a>
      ))}
    </div>
  ))}
</div>
```

**NOTE:** This approach only optimizes for ONE breakpoint's column count. At other breakpoints, columns may be unbalanced again. Full responsive balancing requires JS at runtime.

### Anti-Patterns to Avoid

- **`max-height` with `column-fill: balance`:** Chrome requires an explicitly defined block-dimension size (a fixed `height`), not a maximum. `max-height` does not satisfy this requirement, so `column-fill` is ignored in Chrome.
- **`column-fill: auto` (current):** Fills columns sequentially to `height`, leaving the last column with only the remainder — the exact problem to fix.
- **Build-time reordering the DOM without explicit column divs:** Pre-ordering photos in the Astro frontmatter does NOT fix CSS columns imbalance because CSS columns applies its own distribution algorithm based on item heights, not item position. Reordering the DOM items only shifts which items appear in which column, not whether the columns are balanced.
- **Using a masonry library (Masonry.js, Isotope):** Not needed. This is a two-property CSS change. No new dependencies.
- **`column-fill: balance-all`:** Defined in the spec for fragmented contexts, but no browser supports it as of 2026.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Column balancing | Custom JS that moves DOM nodes on resize | `column-fill: balance` + fixed `height` | Native CSS, no layout shift, no JS event listener |
| Responsive column counts | Multiple Astro render paths | Existing CSS `columns: N Wpx` breakpoints | Already implemented correctly |
| Lightbox integration | Any changes to PhotoSwipe | Leave PhotoSwipe as-is | PhotoSwipe uses `#photo-gallery .gallery-item` selector — unchanged by this fix |

**Key insight:** The gallery imbalance is caused by a missing CSS property interaction, not a missing library. `column-fill: balance` requires a fixed `height` to engage in Chrome. Adding both properties is the complete fix.

## Common Pitfalls

### Pitfall 1: `max-height` silences `column-fill` in Chrome

**What goes wrong:** Setting `column-fill: balance` without also changing `max-height` to `height` has no visible effect in Chrome (the dominant desktop browser). The gallery looks identical to `column-fill: auto`.

**Why it happens:** Chrome's implementation of `column-fill` (both `auto` and `balance`) requires the multicol container to have an explicitly defined size in the block dimension. `max-height` specifies a maximum, not a size. MDN documents this Chrome-specific behavior explicitly.

**How to avoid:** Change `max-height: Xvh` to `height: Xvh` at every breakpoint when adding `column-fill: balance`.

**Warning signs:** After changing only `column-fill` to `balance`, the last column remains short in Chrome.

### Pitfall 2: `column-fill: balance` behavior in overflow columns is under-specified

**What goes wrong:** The CSS spec (issue #2549) has unresolved wording about whether `balance` applies to overflow columns (columns created by horizontal overflow in a height-constrained multi-column layout). The spec originally said "no effect in overflow columns."

**Why it happens:** The CSSWG updated the spec to match "browser behavior," but browser implementations differ — especially between Chrome (Blink) and Firefox (Gecko).

**How to avoid:** Test the CSS change in Chrome, Firefox, and Safari before shipping. If the last column is still short in any major browser, use the JS explicit-columns approach (Pattern 2 above).

**Warning signs:** The last column is balanced in one browser but still short in another.

### Pitfall 3: Fixed `height` on gallery is only acceptable because content always exceeds it

**What goes wrong:** Switching from `max-height` to `height` means the gallery container ALWAYS occupies that full viewport height. If there were fewer photos (e.g., 5 photos), the gallery would have large empty whitespace below.

**Why it doesn't matter here:** With 73 photos at portrait aspect ratios, the total content height at every breakpoint far exceeds the fixed height. The container is always comfortably full. Verified: total photo height at 90vh desktop = ~20,802px vs container height = 810px.

**Warning signs:** Would only matter if the photo count dropped significantly. With 73 photos, this is not a risk.

### Pitfall 4: PhotoSwipe selector must not change

**What goes wrong:** If the gallery container `id` or the `.gallery-item` class changes, PhotoSwipe initialization fails silently — clicks on photos do nothing.

**Why it might happen:** A refactor that switches from CSS columns to explicit column divs might tempt wrapping photos in extra elements.

**How to avoid:** Keep `id="photo-gallery"` on the outermost gallery container. Keep `class="gallery-item"` on every `<a>` element. The PhotoSwipe init uses `gallery: '#photo-gallery', children: '.gallery-item'` — both must remain intact.

**Warning signs:** Photos display correctly but clicking them does not open the lightbox.

## Code Examples

### Current CSS (broken — last column short)
```css
/* Source: src/components/PhotoGallery.astro (current state) */
.masonry-gallery {
  columns: 2 160px;
  column-gap: 6px;
  max-height: 75vh;            /* max-height disables column-fill in Chrome */
  overflow-x: auto;
  overflow-y: hidden;
  column-fill: auto;           /* fills sequentially, last column is ~37% height of others */
}
```

### Fixed CSS (both properties changed)
```css
/* Source: derived from MDN column-fill + Chrome column-fill requirement */
.masonry-gallery {
  columns: 2 160px;
  column-gap: 6px;
  height: 75vh;                /* fixed height: Chrome now activates column-fill */
  overflow-x: auto;
  overflow-y: hidden;
  column-fill: balance;        /* distributes content evenly across all columns */
}

@media (min-width: 480px) {
  .masonry-gallery {
    columns: 3 180px;
    height: 80vh;              /* was max-height: 80vh */
  }
}

@media (min-width: 768px) {
  .masonry-gallery {
    columns: 4 200px;
    column-gap: 8px;
    height: 85vh;              /* was max-height: 85vh */
  }
}

@media (min-width: 1280px) {
  .masonry-gallery {
    columns: 5 220px;
    height: 90vh;              /* was max-height: 90vh */
  }
}
```

### No changes to PhotoSwipe init (preserved as-is)
```javascript
// Source: src/components/PhotoGallery.astro (unchanged)
const lightbox = new PhotoSwipeLightbox({
  gallery: '#photo-gallery',
  children: '.gallery-item',   // these selectors must not change
  pswpModule: () => import('photoswipe'),
  bgOpacity: 0.95,
});
lightbox.init();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `max-height` + `column-fill: auto` | `height` + `column-fill: balance` | This phase | Last column no longer short |
| JS masonry libraries (Masonry.js, Isotope) | CSS columns `column-fill: balance` | ~2020 | No JS dependency, no CLS from JS reorder |
| `column-fill: balance-all` | Not available | — | Spec defines it; zero browser support |

**Deprecated/outdated:**
- `column-fill: balance-all`: Spec value for fragmented contexts. No browser ships it. Ignore.
- Chrome 145+ `column-wrap` / `column-height`: New 2026 CSS multi-column features. Chrome only, not cross-browser. Not applicable here.

## Open Questions

1. **Does `column-fill: balance` actually balance overflow columns in Chrome stable (2026)?**
   - What we know: Chrome requires `height` (not `max-height`) for `column-fill` to engage. MDN documents this. Once engaged, `balance` distributes evenly.
   - What's unclear: Whether Chrome treats a height-constrained multi-column layout with overflow-x as "fragmented" (balance only affects last fragment) or "continuous" (balance affects all columns).
   - Recommendation: Must verify in browser. If Chrome shows balanced columns → CSS fix is complete. If not → use JS explicit-columns approach (Pattern 2).

2. **Does the fixed `height` (replacing `max-height`) cause layout problems at unusual viewport heights?**
   - What we know: With 73 photos, the gallery always exceeds 90vh. The container height change is cosmetic.
   - What's unclear: Very tall viewports (>1200px) where 90vh = 1080px might show some differently sized columns.
   - Recommendation: 90vh is the correct upper limit; no change needed.

## Sources

### Primary (HIGH confidence)
- [MDN column-fill](https://developer.mozilla.org/en-US/docs/Web/CSS/column-fill) — Chrome requires defined block-dimension size for column-fill to engage; `balance` vs `auto` behavior documented
- [MDN Spanning and balancing columns](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Multicol_layout/Spanning_balancing_columns) — `column-fill: balance` in continuous media applies to all columns
- [MDN Handling overflow in multi-column](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Multicol_layout/Handling_overflow) — overflow behavior confirmed: fixed height + overflow-x creates horizontal columns
- Codebase inspection: `PhotoGallery.astro` confirmed `column-fill: auto` + `max-height` (lines 44-54); photos.json confirmed 73 photos, 64 portrait (0.75 ratio), 9 landscape

### Secondary (MEDIUM confidence)
- [CSSWG issue #2549](https://github.com/w3c/csswg-drafts/issues/2549) — spec wording on balance in overflow columns is unresolved; implementations differ
- [CSS-Tricks column-fill almanac](https://css-tricks.com/almanac/properties/c/column-fill/) — `balance` distributes content evenly up to container height

### Tertiary (LOW confidence)
- WebSearch cross-browser behavior reports — Chrome/Firefox inconsistencies with `column-fill: balance` documented by community; needs direct browser testing to confirm current state

## Metadata

**Confidence breakdown:**
- Root cause diagnosis: HIGH — confirmed by codebase inspection + Python simulation showing last column at 37% height
- CSS fix (column-fill: balance + height): MEDIUM — Chrome requirement for `height` is HIGH confidence; whether `balance` works for overflow columns is MEDIUM (spec ambiguity)
- JS fallback (explicit column divs): HIGH — well-established pattern, fully deterministic
- PhotoSwipe unchanged: HIGH — no selector changes needed

**Research date:** 2026-04-08
**Valid until:** 2026-07-08 (CSS multi-column spec is stable; column-fill behavior unlikely to change)
