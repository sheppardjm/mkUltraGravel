# Phase 46: Lizard Background Animation - Research

**Researched:** 2026-04-01
**Domain:** CSS-only background tessellation animation, SVG data URI encoding, Core Web Vitals with stacked fixed overlays
**Confidence:** HIGH

---

## Summary

Phase 46 adds a fixed-position `LizardBackground.astro` component at z-index 9997, below the existing `grain-overlay` (9999) and `escher-overlay` (9998) in `BaseLayout.astro`. The component is a direct extension of the existing `.escher-overlay` pattern: a `position: fixed; inset: 0` div with a data-URI SVG tile as `background-image`, animated via transform-only CSS keyframes.

The project already has a proven implementation pattern: `escher-overlay` uses `background-image: url(data:image/svg+xml,...)` with `@keyframes escher-drift` that animates `transform: translate + scale`. The lizard background follows the same recipe — extract the 200x200 SVG tile from `EscherLizards.astro`'s `<pattern>` element, encode it as a data URI, and apply a slow drift keyframe. No JavaScript, no library, no new dependencies.

The critical encoding rule: within `url("data:image/svg+xml,...")`, `<` becomes `%3C`, `>` becomes `%3E`, `#` becomes `%23`, and `"` becomes `'` (or `%22`). The project already demonstrates this pattern in `global.css` for the grain and escher overlays. For seamless infinite tiling drift, animate `transform: translate()` from `0` to one full tile dimension (e.g., `translateX(200px)`) — the background-image repeats fill in behind, so the seam is invisible. For two-axis drift, use diagonal translation up to the tile repeat width × height.

**Primary recommendation:** Add `.lizard-bg` div to `BaseLayout.astro` (alongside the existing overlays), define the class in `global.css` following the `.escher-overlay` pattern at z-index 9997, and gate animation with `@media (prefers-reduced-motion: no-preference)`.

---

## Standard Stack

No new libraries required. This phase uses only what is already installed.

### Core

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| CSS `@keyframes` | Native | Transform-only animation | No JS, no TBT, compositor-safe |
| SVG `<pattern>` data URI | Native | Infinite background tiling | Same approach as grain-overlay and escher-overlay in this project |
| `@media (prefers-reduced-motion)` | Native | Accessibility gate | MDN-recommended; used throughout this project already |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| Astro `.astro` component | Astro 6.x | Encapsulate markup + scoped style | Match pattern of `EscherLizards.astro`, `TopoDivider.astro` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS `transform` keyframes | `background-position` animation | `background-position` is NOT compositor-safe; triggers paint on every frame. Do not use. |
| CSS `transform` keyframes | JS `requestAnimationFrame` | rAF adds TBT risk if any synchronous work; CSS-only is zero TBT |
| Inline data URI SVG | External `.svg` file | External file adds a network request; data URI is zero-latency, matching existing overlays |
| `@media (prefers-reduced-motion: no-preference)` | `@media (prefers-reduced-motion: reduce)` to disable | Both work; the project uses `no-preference` to enable motion (see `escher-drift`). Follow the existing project convention. |

**Installation:** None required.

---

## Architecture Patterns

### Recommended Component Structure

The component mirrors the existing overlay system in `BaseLayout.astro`:

```
src/
├── components/
│   └── LizardBackground.astro   # New component (optional, see below)
├── layouts/
│   └── BaseLayout.astro          # Add <div class="lizard-bg"> here
└── styles/
    └── global.css                 # Add .lizard-bg class here
```

**Option A (preferred): Class-only in `global.css`, div in `BaseLayout.astro`**
This matches how `grain-overlay` and `escher-overlay` work. No separate component file needed unless the SVG data URI is too large for global.css readability.

**Option B: Separate `LizardBackground.astro` component**
Appropriate if the encoded SVG is complex (the lizard tile has 4 paths). Keeps `BaseLayout.astro` clean. The component is `aria-hidden="true"`, `pointer-events: none`, `position: fixed`. The requirement spec names the file `LizardBackground.astro`, so use Option B.

### Pattern 1: Fixed Overlay with Data URI Background

**What:** A `position: fixed; inset: 0` element with a tiling SVG background-image.
**When to use:** Site-wide decorative overlay that stays fixed during scroll.

```astro
---
// LizardBackground.astro — no frontmatter script needed
---
<div class="lizard-bg" aria-hidden="true"></div>

<style>
  .lizard-bg {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 9997;
    opacity: 0.04;  /* Calibrate against grain + escher stack */
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E...%3C/svg%3E");
    background-repeat: repeat;
    background-size: 200px 200px;
    will-change: transform;
  }
</style>
```

### Pattern 2: Seamless Infinite Drift via Transform Translation

**What:** Keyframe animation using `transform: translate()` that drifts from 0 to exactly one tile dimension, then loops. Because `background-repeat: repeat` fills the infinite canvas, translating by one tile width creates a seamless loop.

**Why transform, not background-position:** `transform` runs on the GPU compositor thread. `background-position` triggers paint on every frame. This distinction is critical for TBT 0ms and Lighthouse score 90+.

```css
/* Source: web.dev/articles/animations-guide + this project's escher-drift pattern */
@keyframes lizard-drift {
  0%   { transform: translate(0, 0); }
  100% { transform: translate(200px, 200px); }
}

@media (prefers-reduced-motion: no-preference) {
  .lizard-bg {
    animation: lizard-drift 80s linear infinite;
  }
}
```

**Tile size note:** The `EscherLizards.astro` pattern unit is `width="200" height="200"`. Set the CSS `background-size: 200px 200px` and animate `translate(200px, 200px)` for a perfect seamless loop. The existing `escher-overlay` uses 100px tiles with `translate(-100px, -100px)` — same principle.

**Duration note:** The `escher-overlay` uses 50s. Use 80s or longer for the lizard layer to differentiate the drift speeds and keep the lizard layer more subliminal.

### Pattern 3: `prefers-reduced-motion` Gate

**What:** Restrict the keyframe animation to users who have not requested reduced motion.
**Pattern:** Apply the animation ONLY inside `@media (prefers-reduced-motion: no-preference)`. The element is static (no animation property) by default.

```css
/* Static by default (no animation) */
.lizard-bg {
  /* base styles without animation */
}

/* Motion only if user permits */
@media (prefers-reduced-motion: no-preference) {
  .lizard-bg {
    animation: lizard-drift 80s linear infinite;
  }
}
```

This matches the existing project pattern in `global.css` for `.escher-overlay`.

### Pattern 4: SVG Data URI Encoding

**What:** Encode the SVG tile for use inside `url("...")` in CSS.
**Rules:**
- Replace `"` (double quotes) inside the SVG with `'` (single quotes) — simpler than `%22`
- Replace `#` with `%23`
- Replace `<` with `%3C`
- Replace `>` with `%3E`
- Keep `xmlns='http://www.w3.org/2000/svg'` attribute on the root SVG element
- Use `url("data:image/svg+xml,...")` with the outer value in double quotes and the SVG content using only single quotes

The existing `grain-overlay` and `escher-overlay` in `global.css` demonstrate this encoding pattern. Match their style.

### Anti-Patterns to Avoid

- **Animating `background-position`:** Triggers browser paint on every frame. NOT compositor-safe. Will hurt Lighthouse score and cause visible stutter on mobile.
- **Using `left`/`top` instead of `transform`:** Triggers layout recalculation. Never animate positional properties.
- **Applying `will-change: transform` without removing after:** Creates persistent GPU layer overhead. Since this overlay is always visible, `will-change: transform` is acceptable here (same as the existing `.escher-overlay`).
- **Using SMIL `animateTransform` on `<pattern>`:** Browser support for animating `patternTransform` attribute is inconsistent across browsers. Use CSS `transform` on the containing element instead.
- **Base64 encoding the SVG:** 33% size overhead vs. percent-encoding. The project uses percent-encoding for both existing overlays; match that pattern.
- **Adding JS for animation:** Any synchronous JS = TBT risk. Requirements mandate 0ms TBT. CSS-only is the correct path.
- **Using `@media (prefers-reduced-motion: reduce)` to disable:** The project's existing convention uses `@media (prefers-reduced-motion: no-preference)` to ENABLE motion (see `escher-drift` and `penrose-spin` in `global.css`). Follow the project's convention.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SVG tile encoding | Custom encoding function | Manually encode the SVG with the minimal rule set (replace `"` with `'`, `#` with `%23`, `<` with `%3C`, `>` with `%3E`) | Project already does this; no tooling needed |
| Seamless tiling | Two-element duplicate technique | Single element with `background-repeat: repeat` + `transform: translate(tile-width)` | Simpler; the existing grain and escher overlays prove this works |
| Cross-browser motion reduction | JS `matchMedia` listener | CSS `@media (prefers-reduced-motion)` | Pure CSS; zero JS; requirement is LIZD-05 |

**Key insight:** The entire implementation is a ~30-line CSS class plus a 4-path SVG tile encoded as a data URI. The project already has two overlays using this exact pattern. LizardBackground.astro is an extension, not a new invention.

---

## Common Pitfalls

### Pitfall 1: SVG Encoding Breaks the Background Image

**What goes wrong:** The background image renders as nothing, or the entire overlay is invisible.
**Why it happens:** Unencoded `#`, `<`, `>`, or `"` inside a data URI break URL parsing. A single unescaped `#` causes the browser to interpret everything after it as a URL fragment.
**How to avoid:** Before encoding: replace all `"` in SVG attribute values with `'`. Then: `#` → `%23`, `<` → `%3C`, `>` → `%3E`. Verify in DevTools: Inspect → Styles → hover the background-image url → it should show a preview thumbnail.
**Warning signs:** Background shows as transparent in DevTools even when opacity > 0; no tile preview in DevTools style inspector.

### Pitfall 2: Non-Seamless Loop at Keyframe Wrap

**What goes wrong:** A visible "jump" or seam appears every N seconds when the animation loops.
**Why it happens:** The translate distance at 100% keyframe does not exactly match one tile dimension. If the background-size is 200px but the animation translates 195px, a gap appears at wrap time.
**How to avoid:** Set `translate(Xpx, Ypx)` where X and Y are exact multiples of the background-size values. For `background-size: 200px 200px`, use `translate(200px, 200px)` or `translate(200px, 0)`, not fractional values.
**Warning signs:** Visible "snap" in the animation at the loop point. Inspect the keyframe: verify translate values equal background-size exactly.

### Pitfall 3: Over-Opacity with Three Stacked Overlays

**What goes wrong:** The page background looks too busy; the lizard layer overwhelms the grain and Escher.
**Why it happens:** Three semi-transparent overlays compound. Grain is at 6% opacity; Escher at 5%. If lizard is also at 5-6%, the total overlay opacity is perceptible and distracting.
**How to avoid:** Start the lizard layer at 3-4% opacity. Because the requirement is "imperceptible at first glance," calibrate lower than grain and Escher. Visual calibration is a human-in-the-loop step.
**Warning signs:** User notices the lizard pattern immediately without looking for it.

### Pitfall 4: Stacking Context Disruption

**What goes wrong:** The lizard background appears above the Escher overlay or grain, or obscures page content.
**Why it happens:** `position: fixed` creates a stacking context. Z-index order must be: lizard (9997) < escher (9998) < grain (9999) < nav (10000). If z-index is wrong, the layer renders above its intended slot.
**How to avoid:** Explicitly set `z-index: 9997` on `.lizard-bg`. Verify in DevTools Layers panel that the layer order is correct.
**Warning signs:** Lizard tiles appear on top of text, or the Escher pattern disappears.

### Pitfall 5: `pointer-events` Not Set

**What goes wrong:** The overlay captures mouse/touch events, breaking all interactive elements below it.
**Why it happens:** A fixed full-viewport element intercepts pointer events by default.
**How to avoid:** Always set `pointer-events: none`. Both existing overlays do this.
**Warning signs:** Buttons, links, and map interactions stop working.

### Pitfall 6: CLS from Gallery Images (PERF-05)

**What goes wrong:** Lighthouse reports CLS > 0.1 from the photo gallery.
**Why it happens:** `<img>` elements without explicit `width`/`height` attributes or `aspect-ratio` CSS cause layout shifts when they load.
**How to avoid:** This is a pre-existing concern (PERF-05). The `PhotoGallery.astro` component uses CSS columns masonry. Verify gallery images have `aspect-ratio` or explicit dimensions. This is NOT caused by the lizard overlay but is a required verification step in the same plan.
**Warning signs:** Lighthouse shows CLS > 0.1; DevTools Performance panel shows layout shifts during image load.

---

## Code Examples

### Example 1: Complete `LizardBackground.astro` structure

```astro
---
// LizardBackground.astro
// Fixed lizard tessellation layer — z-index 9997 (below Escher 9998, grain 9999)
// CSS-only animation: transform-only drift, no JS, TBT 0ms guaranteed
// prefers-reduced-motion: static tile (no animation property applied)
---
<div class="lizard-bg" aria-hidden="true"></div>

<style>
  .lizard-bg {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 9997;
    opacity: 0.04;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cdefs%3E%3Cpattern id='t' patternUnits='userSpaceOnUse' width='200' height='200'%3E...paths...%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23t)'/%3E%3C/svg%3E");
    background-repeat: repeat;
    background-size: 200px 200px;
    will-change: transform;
  }
</style>
```

**Note on SVG pattern in data URI:** When the SVG tile itself uses `<pattern id="t">`, the `url(#t)` reference inside the SVG must be encoded as `url(%23t)` in the data URI. This is why the grain overlay uses a self-contained SVG with inline filter rather than a `<pattern>` ref — it avoids the internal `#` reference problem.

**Recommended approach:** Inline the four lizard paths directly as `<g>` elements (not inside a `<pattern>` element) by positioning them with `transform` to tile the 200x200 cell — exactly as `EscherLizards.astro` already does. This avoids the `url(#...)` internal reference encoding problem entirely.

### Example 2: Seamless loop keyframes

```css
/* Source: project pattern (escher-drift in global.css) */
@keyframes lizard-drift {
  /* Translate exactly one tile width+height for seamless loop */
  0%   { transform: translate(0, 0); }
  100% { transform: translate(200px, 200px); }
}

@media (prefers-reduced-motion: no-preference) {
  .lizard-bg {
    animation: lizard-drift 80s linear infinite;
  }
}
```

### Example 3: BaseLayout.astro insertion point

```astro
<!-- Existing BaseLayout.astro body structure (add LizardBackground before other overlays) -->
<body class="pt-12">
  <SiteNav />
  <div class="grain-overlay" aria-hidden="true"></div>
  <div class="escher-overlay" aria-hidden="true"></div>
  <LizardBackground />    <!-- NEW: renders its own div with z-index 9997 -->
  <slot />
</body>
```

OR equivalently, without a separate component:

```astro
<body class="pt-12">
  <SiteNav />
  <div class="grain-overlay" aria-hidden="true"></div>
  <div class="escher-overlay" aria-hidden="true"></div>
  <div class="lizard-bg" aria-hidden="true"></div>   <!-- inline in BaseLayout -->
  <slot />
</body>
```

The requirement names the file `LizardBackground.astro`, so use the component approach and import it in `BaseLayout.astro`.

### Example 4: Lighthouse audit command

```bash
# Build first, then serve; Lighthouse needs a running server
npx astro build && npx serve dist/ -p 4321
# In a second terminal or browser DevTools:
# Open http://localhost:4321 → DevTools → Lighthouse → Mobile → Performance → Generate report
# Or use CLI:
npx lighthouse http://localhost:4321 --only-categories=performance --form-factor=mobile --output=json
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `background-position` animation | `transform: translate()` animation | ~2014 (Chrome/Firefox compositor improvements) | Compositor-safe; zero paint cost |
| Base64 SVG data URI | Percent-encoded SVG data URI | Best practice since IE11 era | 33% smaller; human-readable in DevTools |
| SMIL `<animateTransform>` on `<pattern>` | CSS `transform` keyframes on container element | ~2019 (SMIL deprecated in Chrome, then un-deprecated) | CSS approach is more reliable and maintainable |
| JS `matchMedia` for reduced motion | CSS `@media (prefers-reduced-motion)` | CSS support reached broad coverage ~2020 | No JS required for accessibility gate |

**Deprecated/outdated:**
- `background-attachment: fixed` for parallax: Causes repaint on scroll on most browsers. Not relevant here (not using it), but avoid if tempted.
- SMIL `<animateTransform>` on SVG `<pattern>`: Inconsistent browser support. Use CSS on the outer element.

---

## Open Questions

1. **Opacity calibration value**
   - What we know: Grain is at 6% (`opacity: 0.06`), Escher is at 5% (`opacity: 0.05`), `EscherLizards` section overlay is at 12% (but section-scoped, not global fixed)
   - What's unclear: The right value for a third fixed overlay that remains subliminal. 3-4% is a reasonable starting point.
   - Recommendation: Start at `opacity: 0.04`. Treat visual calibration as a required human-in-the-loop checkpoint step.

2. **Should the SVG use the full 4-lizard tile from `EscherLizards.astro`, or a simplified 1-lizard tile?**
   - What we know: The full 4-cell tessellation (200x200) in `EscherLizards.astro` uses 4 `<path>` elements with complex transforms. This is the correct tiling unit.
   - What's unclear: Whether a simpler 1-path version would suffice visually at 4% opacity.
   - Recommendation: Use the full 4-cell tile from `EscherLizards.astro` — it's already proven to tessellate correctly. Simplification risks incorrect tiling geometry.

3. **`mix-blend-mode` needed?**
   - What we know: `EscherLizards.astro` uses `mix-blend-mode: lighten`. The `escher-overlay` in `global.css` does NOT use mix-blend-mode.
   - What's unclear: Whether the fixed lizard layer should use a blend mode against the dark background.
   - Recommendation: Do not use `mix-blend-mode` by default. On a near-black background (`oklch(0.10 0.01 250)`), blend modes add complexity without benefit at very low opacity. Calibrate with opacity alone.

---

## Sources

### Primary (HIGH confidence)

- `src/styles/global.css` in this repository — Verified existing `.grain-overlay` (z-index 9999), `.escher-overlay` (z-index 9998), `@keyframes escher-drift` using `transform: translate`, `@media (prefers-reduced-motion: no-preference)` convention
- `src/components/EscherLizards.astro` in this repository — Verified 200x200 SVG pattern tile with 4 lizard paths
- `src/layouts/BaseLayout.astro` in this repository — Verified grain-overlay and escher-overlay insertion points
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) — Verified syntax: `@media (prefers-reduced-motion: reduce)` and `no-preference` values, recommended pattern
- [web.dev: High-performance CSS animations](https://web.dev/articles/animations-guide) — Verified: `transform` and `opacity` are the only compositor-safe properties; `will-change` use guidance

### Secondary (MEDIUM confidence)

- [Motion.dev: Web Animation Performance Tier List](https://motion.dev/magazine/web-animation-performance-tier-list) — Verified: `transform`, `opacity`, `filter`, `clip-path` are S-tier compositor properties; `background-color` triggers paint (C-tier); CSS variables "always trigger paint"
- [web.dev: Optimize CLS](https://web.dev/articles/optimize-cls) — Verified: Fixed elements outside document flow do not contribute to CLS; `pointer-events: none` does not affect CLS calculation

### Tertiary (LOW confidence)

- [Alex Wlchan: Inline SVG in CSS](https://alexwlchan.net/notes/2024/inline-svg-in-css/) — Single source for minimal encoding rule (only `"` → `'` and `#` → `%23` required). Consistent with the project's existing practice in `global.css`.
- [Medium: CSS-Only Infinite Scrolling Backgrounds](https://medium.com/@farihatulmaria/css-only-infinite-scrolling-backgrounds-building-seamless-animations-without-javascript-91e396ed5301) — Single source supporting seamless loop via translate equal to tile dimension; consistent with `escher-drift` approach already in the project.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — No new dependencies; pure CSS pattern already proven in this project by two existing overlays
- Architecture: HIGH — Component structure and CSS pattern are directly derived from reading existing `BaseLayout.astro`, `global.css`, and `EscherLizards.astro`
- Pitfalls: HIGH for encoding/z-index/pointer-events (verified from codebase); MEDIUM for opacity calibration (requires visual judgment)
- Performance: HIGH — Transform-only animation is compositor-safe by MDN/web.dev specification; CSS-only means TBT 0ms; fixed overlay outside document flow means CLS 0

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (CSS fundamentals are extremely stable; SVG encoding rules do not change)
