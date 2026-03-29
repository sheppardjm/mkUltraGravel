# Phase 21: Escher Background + Penrose Favicon — Research

**Researched:** 2026-03-29
**Domain:** SVG geometry authoring, CSS background animation, favicon replacement
**Confidence:** HIGH

---

## Summary

Phase 21 has two independent deliverables with different implementation patterns and risk profiles. Plan 21-01 (favicon) is a single-file SVG replacement requiring no CSS or layout changes — it is low risk and can ship first. Plan 21-02 (Escher background) requires authoring an SVG tile, URL-encoding it into a CSS data URI, and adding a compositor-safe CSS animation — it is the only TBT risk in the v3.0 milestone and must be Lighthouse-verified before visual review.

The core approach for both features is already established in `.planning/research/STACK.md` and `.planning/research/PITFALLS.md` from the v3.0 pre-research. This document synthesizes those findings with fresh verification and provides the specific implementation details the planner needs.

**The isometric cube tile geometry is confirmed.** The reference Escher boxes SVG (fetched from the CDN) uses two `<rect>` elements with `skewY(30)` and `skewY(-30)` in a 300×573 pattern unit. This is the tile to adapt for the dark brutalist palette. The CSS animation must use `transform: translate` (not `background-position`) on the overlay div to remain compositor-safe and maintain TBT 0ms.

**The Penrose triangle path data is confirmed.** The Wikipedia Penrose triangle SVG provides three polygon paths with verified coordinates that produce the correct impossible-triangle illusion. The favicon is a content swap of `public/favicon.svg` — no changes to `<head>` link tags, no PNG fallback needed for this audience.

**Primary recommendation:** Author the isometric cube SVG tile directly (3–4 SVG elements, under 500 bytes), inline it as a URL-encoded CSS data URI in `global.css`, and animate it with `transform: translate` at 40–60s cycle. Replace `public/favicon.svg` with three Penrose triangle polygons using site accent green. Zero new dependencies. Two separate plans, favicon first.

---

## Standard Stack

### Core

No new packages. This phase uses only CSS, SVG, and the existing Astro 6 static build.

| Technology | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| SVG `<pattern>` element | Browser native | Repeating tile geometry | Tiles declaratively without JavaScript; identical to existing `grain-overlay` pattern |
| CSS `@keyframes` + `transform` | Browser native | Compositor-safe animation | Only `transform` and `opacity` animate on the GPU compositor thread with zero TBT impact |
| CSS `@media (prefers-reduced-motion)` | Browser native | Accessibility gate | Required for WCAG 2.3.3 compliance; already used in `global.css` for other animations |
| SVG `<polygon>` elements | Browser native | Penrose triangle favicon geometry | Three polygons represent the three arm faces of the impossible triangle |

### Supporting

| Approach | Purpose | When to Use |
|---------|---------|-------------|
| URL-encoded SVG in `background-image: url("data:image/svg+xml,...")` | Inline tile without HTTP request | Always — matches existing `grain-overlay` at `global.css:87` |
| `will-change: transform` | GPU layer promotion for animation | On the animated overlay div only |
| `aria-hidden="true"` | Screen reader exclusion | On the decorative background div |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|-----------|-----------|----------|
| `transform: translate` animation | `background-position` animation | `background-position` triggers repaint (paint-level, not layout); `transform` is compositor-only. Use `transform`. |
| URL-encoded SVG data URI | External `/public/*.svg` file | External file adds HTTP request and Vite path complications. Inline matches existing pattern. |
| `polygon` elements for favicon | `path` elements with curves | `polygon` is simpler to hand-author for geometric shapes; no behavioral difference |
| Three-color Penrose triangle | Single-color outline | Three tonal values for the three faces communicate the 3D illusion better at 32px scale |
| CSS `@keyframes` animation | SMIL `<animate>` inside SVG | CSS `@keyframes` is more predictable with `prefers-reduced-motion`; SMIL is deprecated in some browser paths |

**Installation:** No `npm install` needed.

---

## Architecture Patterns

### Recommended Project Structure

No new files beyond the two being modified/replaced:

```
src/styles/global.css     ← add .escher-overlay CSS class + @keyframes
src/layouts/BaseLayout.astro  ← add <div class="escher-overlay"> after grain-overlay div
public/favicon.svg        ← replace content with Penrose triangle polygons
```

### Pattern 1: Inline SVG Tile as CSS Background Data URI

**What:** Define an SVG `<pattern>` containing the isometric cube tile, inline the entire SVG as a URL-encoded data URI in a CSS `background-image` property.

**When to use:** Any fixed decorative overlay that needs no HTTP request and no JavaScript.

**Example:**
```css
/* Source: existing grain-overlay at global.css:87 — same pattern */
.escher-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.07;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='75' height='143'%3E%3Cdefs%3E%3Cpattern id='boxes' x='0' y='0' width='75' height='143' patternUnits='userSpaceOnUse'%3E%3Crect id='left' width='37.5' height='50' transform='skewY(30)' fill='%23b0f0b0'/%3E%3Crect id='right' width='37.5' height='50' transform='translate(37.5,43.25) skewY(-30)' fill='%2378c878'/%3E%3Cuse href='%23right' transform='translate(-37.5,71.25)'/%3E%3Cuse href='%23left' transform='translate(37.5,71.25)'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23boxes)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 75px 143px;
  z-index: 9998;               /* below grain-overlay at 9999 */
  will-change: transform;
}
```

**URL-encoding note:** Replace `"` with `'` inside the SVG, `#` → `%23`, `<` → `%3C`, `>` → `%3E`, space → `%20`. Do NOT base64-encode — URL encoding is smaller for SVG text (verified from the existing `grain-overlay` source).

### Pattern 2: Compositor-Safe Transform Animation with Reduced-Motion Gate

**What:** A CSS `@keyframes` that translates the overlay div by exactly one tile width/height so the loop is seamless. The animation is gated behind `prefers-reduced-motion: no-preference` so users who opt out of motion see the static pattern.

**When to use:** Any continuously looping background animation that must maintain TBT 0ms.

**Example:**
```css
/* Source: web.dev/articles/animations-guide — transform/opacity are compositor-safe */
@keyframes escher-drift {
  from { transform: translate(0, 0); }
  to   { transform: translate(-75px, -143px); } /* exactly one tile — seamless loop */
}

@media (prefers-reduced-motion: no-preference) {
  .escher-overlay {
    animation: escher-drift 50s linear infinite;
  }
}
```

**Why `prefers-reduced-motion: no-preference` (not `reduce`):**
The `no-preference` value applies animation only to users who have NOT requested reduced motion. The `reduce` value disables it. Using `no-preference` as the enabling condition is the correct semantic — animation is opt-in, not opt-out. The existing `global.css` uses the `reduce` guard pattern for other animations, but the phase description explicitly requires: "users with reduced-motion preference see the static pattern only" — confirm with planner which convention to use.

**Critical: `transform` on `.escher-overlay` must not break `position: fixed` grain overlay.** The `.escher-overlay` is `position: fixed` itself — it creates no stacking context that could trap the `.grain-overlay`. Both are siblings in `<body>`, so z-index layering (9998 vs 9999) works correctly. Do NOT apply `transform` to any ancestor of either overlay div.

### Pattern 3: Penrose Triangle Polygon Construction

**What:** Three `<polygon>` elements with four points each representing the three arm faces of the impossible triangle, using the site's accent green palette.

**Verified path data (Wikipedia SVG, adapted to 32×32 viewBox):**

The Wikipedia Penrose triangle (280×243 viewport) uses these three face polygons:
- Face 1 (lightest): `M 55.0625,182.4375 L 80.6875,182.5625 L 151.21875,59.84375 L 252.21615,228.15076 L 264.76729,205.25818 L 151.5625,13.25 Z` — fill `#ffffdc`
- Face 2 (mid): `M 15.625,206.0625 L 27.5,228.4375 L 252.30454,228.28334 L 151.23246,59.859344 L 138.54873,81.934334 L 211.73429,205.92661 Z` — fill `#c9e1d4`
- Face 3 (darkest): `M 124.05609,12.990601 L 15.638759,206.0253 L 211.76418,205.96833 L 197.88064,182.51185 L 54.948939,182.532 L 151.67357,13.253813 Z` — fill `#e2d8e5`

For the 32×32 favicon, these coordinates need to be scaled by approximately `32/280 = 0.114` (horizontal) and `32/243 = 0.132` (vertical). Use `transform="scale(0.114, 0.132)"` on a wrapper `<g>` element, or recalculate coordinates. The planner should choose a clean approach — either scaling or providing pre-scaled coordinates.

**Recommended color mapping (accent green palette):**
- Face 1 (top/brightest): `oklch(0.85 0.24 145)` — matches `--color-accent-green`
- Face 2 (mid): `oklch(0.65 0.20 145)` — darker tint
- Face 3 (shadow): `oklch(0.45 0.16 145)` — darkest tint

**Background:** `--color-bg-base` = `oklch(0.10 0.01 250)` — the dark navy already in use.

### Anti-Patterns to Avoid

- **Animating `background-position`:** Causes paint-level operations on every frame. Use `transform: translate` on the div instead.
- **Animating fill, stroke, or color:** These trigger repaint. Only `transform` and `opacity` are compositor-safe.
- **SMIL `<animate>` inside the SVG data URI:** `prefers-reduced-motion` enforcement is unreliable for SMIL. Use CSS `@keyframes` only.
- **`will-change: transform` on multiple elements:** Each creates a GPU layer. Only apply to `.escher-overlay`.
- **z-index >= 9999 on the background:** The `grain-overlay` is at 9999; the background must be at 9998 or lower.
- **Base64-encoding the SVG data URI:** URL-encoding is smaller and more readable for SVG text; base64 adds 25-30% size with no benefit.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|------------|-------------|-----|
| Tile animation loop | Custom JS requestAnimationFrame loop | CSS `@keyframes` with `transform: translate` | JS animation risks TBT; CSS compositor-safe |
| Reduced-motion detection | JS `matchMedia` check | `@media (prefers-reduced-motion: no-preference)` CSS gate | CSS approach requires zero JS; matches existing codebase pattern |
| Penrose triangle geometry | Custom generative algorithm | Three hand-authored `<polygon>` elements | A Penrose triangle at 32px is 3 shapes; any library/algorithm is overkill |
| SVG background tiling | JS-driven background management | `background-repeat: repeat` + `background-size` in CSS | Pure CSS; zero JavaScript; matches grain-overlay approach |

**Key insight:** Every capability needed already exists in CSS + SVG without JavaScript. Adding animation libraries (GSAP, Motion One) or SVG generators introduces bundle weight and risks TBT regression — the phase description explicitly disallows both.

---

## Common Pitfalls

### Pitfall 1: `background-position` Animation Causes Repaint — Use `transform` Instead

**What goes wrong:** Developer animates `background-position` on `.escher-overlay` to drift the tile. This works visually but triggers paint-level operations on every frame. While not a TBT event itself (TBT measures main thread blocking, not paint frequency), it is CPU-bound and causes jank on low-end mobile.

**Why it happens:** `background-position` is not compositor-safe. Only `transform` and `opacity` are guaranteed GPU-composited.

**How to avoid:** Apply `@keyframes` to `transform: translate(0,0)` → `transform: translate(-75px, -143px)` on the div. The background-image stays static; the div moves. With `background-repeat: repeat`, the pattern appears to scroll.

**Warning signs:** Chrome DevTools Performance panel shows "Paint" events during animation.

### Pitfall 2: `transform` on Animated Overlay Breaks Sibling `position: fixed` Elements

**What goes wrong:** Applying `transform` to a parent element creates a new CSS stacking context. Any `position: fixed` descendants of that transformed element stop being fixed to the viewport and start being fixed to the transformed ancestor.

**How to avoid:** The `.escher-overlay` is `position: fixed` and a direct child of `<body>`. Applying `transform` directly to `.escher-overlay` itself (not a parent) is safe — its own transform does not trap any children because it has no children. The `grain-overlay` is a sibling, not a descendant.

**Confidence:** HIGH — verified from MDN stacking context docs and Chrome DevTools stacking changes blog.

### Pitfall 3: `prefers-reduced-motion` Override Missing or in Wrong Scope

**What goes wrong:** The reduced-motion override is added to a component `<style>` block instead of `global.css`, so it only applies within that component's shadow scope. Or it is added but targets the wrong selector.

**How to avoid:** Both the `.escher-overlay` animation rule and its `prefers-reduced-motion` override must live in `global.css` (the same file where `.grain-overlay` is defined). The phase description requires: "gated behind `prefers-reduced-motion: no-preference`". Implement as:
```css
@media (prefers-reduced-motion: no-preference) {
  .escher-overlay { animation: escher-drift 50s linear infinite; }
}
```

### Pitfall 4: Z-Index Ordering — Escher Must Be Below Grain

**What goes wrong:** Developer assigns `.escher-overlay` z-index 10000 intending it to be "on top of content but below grain." Because `grain-overlay` is at z-index 9999, z-index 10000 puts the background above the grain, breaking the layered aesthetic.

**How to avoid:** Use `z-index: 9998` for `.escher-overlay`. Explicit stack order is:
- z-index 9999: `.grain-overlay` (existing, topmost)
- z-index 9998: `.escher-overlay` (new, below grain)
- z-index 10+: page sections with `position: relative`

### Pitfall 5: SVG `<use>` Across Data URI Boundaries

**What goes wrong:** The reference CDN Escher boxes SVG uses `<use href="#left">` and `<use href="#right">` to reference pattern elements. When the SVG is inlined as a CSS data URI, these cross-origin `href` references may fail in some browsers, causing missing tile elements.

**Why it happens:** SVG `<use>` with fragment references inside an `<image>` or CSS `background-image` is treated differently from inline SVG. Some browsers sandbox the data URI and don't resolve fragment IDs.

**How to avoid:** Either (a) duplicate the geometry instead of using `<use>`, or (b) verify that the specific `<use>` pattern works across Chrome/Firefox/Safari before shipping. The original CDN SVG uses `<use>` within the same pattern element — test this first.

**Confidence:** MEDIUM — browser behavior with `<use>` inside CSS background SVGs has historically been inconsistent. Recommend duplicating geometry to avoid the risk.

### Pitfall 6: Penrose Triangle Requires Scale Adaptation for 32×32 Viewport

**What goes wrong:** Developer copies the Wikipedia polygon coordinates (designed for 280×243 viewport) into a 32×32 SVG without rescaling. The triangle renders outside the viewport bounds.

**How to avoid:** Either apply a `transform="scale(0.114, 0.132)"` on a `<g>` wrapper, or pre-calculate coordinates. The scale factors are `32/280 ≈ 0.114` (x) and `32/243 ≈ 0.132` (y).

Alternatively, use a simplified 32×32-native geometry:
- Three equilateral triangle corners at approximately `(16,2)`, `(2,29)`, `(30,29)`
- Inner triangle at `(16,22)`, `(7,22)`, `(16,7)` (hole)
- Each arm as a filled parallelogram derived from these anchor points

This avoids the coordinate translation entirely and gives pixel-aligned shapes at the target size.

---

## Code Examples

Verified patterns from official and codebase sources:

### Isometric Cube SVG Tile (Reference Geometry)

```svg
<!-- Source: https://s3-us-west-2.amazonaws.com/s.cdpn.io/4273/boxes.svg -->
<!-- Pattern: 300×573 units, scaled to 0.25× (= 75×143px displayed) -->
<svg xmlns="http://www.w3.org/2000/svg" width="75" height="143">
  <defs>
    <pattern id="boxes" x="0" y="0" width="75" height="143"
             patternUnits="userSpaceOnUse">
      <!-- Left face: skewY(30) creates left parallelogram -->
      <rect id="left" width="37.5" height="50"
            transform="skewY(30)" fill="#b0f0b0"/>
      <!-- Right face: translated + skewY(-30) creates right parallelogram -->
      <rect id="right" width="37.5" height="50"
            transform="translate(37.5,43.25) skewY(-30)" fill="#78c878"/>
      <!-- Second row — duplicate without <use> to avoid data URI fragment issues -->
      <rect width="37.5" height="50"
            transform="translate(37.5,71.25) skewY(-30)" fill="#78c878"/>
      <rect width="37.5" height="50"
            transform="translate(0,71.25) skewY(30)" fill="#b0f0b0"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#boxes)"/>
</svg>
```

**Color adaptation for dark brutalist theme:** Replace the gray tones (`#888`, `#666`) with muted green tones at very low opacity. Since the overall `opacity: 0.07` on the overlay already makes the pattern subliminal, the SVG fill colors can be near-white (`#b0f0b0`, `#78c878`) without looking garish.

### Escher Overlay CSS Class (Complete)

```css
/* Source: pattern matches existing grain-overlay at global.css:87 */
/* Source: transform animation confirmed compositor-safe via web.dev/articles/animations-guide */
.escher-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.07;
  background-image: url("data:image/svg+xml,[URL-ENCODED-SVG]");
  background-repeat: repeat;
  background-size: 75px 143px;
  z-index: 9998;
  will-change: transform;
}

@keyframes escher-drift {
  from { transform: translate(0, 0); }
  to   { transform: translate(-75px, -143px); }
}

@media (prefers-reduced-motion: no-preference) {
  .escher-overlay {
    animation: escher-drift 50s linear infinite;
  }
}
```

### BaseLayout.astro Addition

```html
<!-- Source: existing grain-overlay pattern in BaseLayout.astro:34 -->
<body>
  <div class="grain-overlay" aria-hidden="true"></div>
  <div class="escher-overlay" aria-hidden="true"></div>  <!-- NEW: z-index 9998, below grain -->
  <slot />
</body>
```

### Penrose Triangle Favicon (public/favicon.svg)

```svg
<!-- Source: path data adapted from Wikipedia Penrose_triangle.svg (public domain) -->
<!-- Source: color palette from global.css --color-accent-green = oklch(0.85 0.24 145) -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="oklch(0.10 0.01 250)"/><!-- bg-base -->
  <g transform="scale(0.114, 0.132)">
    <!-- Face 1: lightest (accent-green equivalent) -->
    <path d="M 55.0625,182.4375 L 80.6875,182.5625 L 151.21875,59.84375
             L 252.21615,228.15076 L 264.76729,205.25818 L 151.5625,13.25 Z"
          fill="oklch(0.85 0.24 145)"/>
    <!-- Face 2: mid tone -->
    <path d="M 15.625,206.0625 L 27.5,228.4375 L 252.30454,228.28334
             L 151.23246,59.859344 L 138.54873,81.934334 L 211.73429,205.92661 Z"
          fill="oklch(0.65 0.20 145)"/>
    <!-- Face 3: darkest -->
    <path d="M 124.05609,12.990601 L 15.638759,206.0253 L 211.76418,205.96833
             L 197.88064,182.51185 L 54.948939,182.532 L 151.67357,13.253813 Z"
          fill="oklch(0.45 0.16 145)"/>
  </g>
</svg>
```

**Note on `oklch` in SVG:** `oklch()` color syntax requires SVG 2 support. Modern Chrome and Firefox support it. For maximum compatibility, consider converting to hex or `rgb()`. The existing `favicon.svg` uses hex (`#1a1a2e`, `#b0f0b0`). Hex equivalents for the accent green tones:
- `oklch(0.85 0.24 145)` ≈ `#a3f0a0` (bright accent green)
- `oklch(0.65 0.20 145)` ≈ `#6db86a` (mid green)
- `oklch(0.45 0.16 145)` ≈ `#3d7a3a` (dark green)
- `oklch(0.10 0.01 250)` ≈ `#14141e` (dark navy bg)

### URL Encoding Pattern for SVG Data URI

```
Replace in SVG string before embedding in CSS url():
  "  → '       (use single quotes inside SVG attributes)
  #  → %23     (hash must be encoded)
  <  → %3C
  >  → %3E
  (space) → %20

Do NOT base64-encode — URL-encoding is more compact for SVG text.
Source: Existing grain-overlay in global.css:87 uses URL-encoding (not base64).
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|-------------|-----------------|--------------|--------|
| PNG/ICO-only favicons | SVG favicons with `type="image/svg+xml"` | Chrome 80+, FF 41+, Safari 15.6+ | SVG favicons support dark mode media queries; file size ~500B vs 4KB+ ICO |
| `background-position` animated backgrounds | `transform: translate` animated overlay div | Chrome compositor updates ~2018 | `transform` is compositor-safe; no repaints; zero TBT |
| SMIL `<animate>` in SVG | CSS `@keyframes` with `prefers-reduced-motion` | CSS Animations L1 widespread ~2020 | More accessible; predictable `prefers-reduced-motion` behavior |
| Multiple favicon files (16, 32, 48, 180px PNGs + ICO) | Single SVG + favicon.ico fallback | 2021 Evil Martians guide | 72%+ browser support; far simpler; SVG scales cleanly |

**Deprecated/outdated:**
- SMIL `<animate>` / `<animateTransform>`: Still browser-supported but CSS `@keyframes` is preferred for `prefers-reduced-motion` reliability
- Base64-encoded SVG in CSS: URL-encoding is smaller; base64 adds ~30% size for SVG text with no benefit

---

## Open Questions

1. **`<use>` element inside CSS background-image SVG data URI**
   - What we know: The reference CDN SVG uses `<use href="#left">` and `<use href="#right">` within the pattern. Some browsers sandbox CSS background SVGs and don't resolve fragment IDs.
   - What's unclear: Whether Chrome/Firefox/Safari all resolve `<use href="...">` inside a CSS data URI without issue.
   - Recommendation: Duplicate the rectangle elements instead of relying on `<use>`. Four `<rect>` elements instead of two + two `<use>` refs. Slightly more bytes but zero browser risk.

2. **`oklch()` color syntax in `public/favicon.svg`**
   - What we know: `oklch()` is CSS Color Level 4, supported in Chrome 111+, Firefox 113+, Safari 15.4+. The existing `global.css` uses `oklch()` throughout.
   - What's unclear: Whether `oklch()` in SVG `fill` attributes (not CSS properties) has identical support. The existing `favicon.svg` uses hex fills.
   - Recommendation: Use hex fills in `favicon.svg` to match the existing file's pattern and avoid any SVG-specific color parsing edge case.

3. **Animation cycle length: 40s vs 50s vs 60s**
   - What we know: The phase description requires "40-60s cycle." The exact value affects perceived motion subtlety — shorter cycle is more visible.
   - What's unclear: Which duration best matches the "subliminal — felt not watched" goal against the existing grain overlay.
   - Recommendation: Default to 50s (midpoint of the specified range). Visual iteration during review can adjust.

4. **Opacity level for the Escher overlay**
   - What we know: The `grain-overlay` is at `opacity: 0.06`. The existing `tone-image` backgrounds are at `opacity: 0.12`. The tile at full-size squares will be more geometrically prominent than noise grain.
   - What's unclear: Whether 7% opacity correctly balances visibility vs. content clarity before visual review.
   - Recommendation: Start at `opacity: 0.07` (slightly above grain). Success Criterion 1 requires it to be "visible against the dark background without obscuring content" — the author must tune this during visual review.

---

## Sources

### Primary (HIGH confidence)

- Existing `.planning/research/STACK.md` — Full v3.0 stack analysis; SVG tessellation approach; Penrose favicon geometry; zero-dependency confirmation
- Existing `.planning/research/PITFALLS.md` — Pitfalls 28-30 directly address TBT regression, z-index ordering, and `prefers-reduced-motion` gaps for VIS-14
- Existing `.planning/research/ARCHITECTURE.md` — Confirmed file locations, existing `grain-overlay` pattern, z-index stack
- Fetched CDN source `https://s3-us-west-2.amazonaws.com/s.cdpn.io/4273/boxes.svg` — Verified tile geometry: 300×573 pattern units, two `<rect>` elements with `skewY(±30)`, fill `#888`/`#666`, pattern scaled 0.25×
- Fetched `https://upload.wikimedia.org/wikipedia/commons/f/f4/Penrose_triangle.svg` — Verified path data for three Penrose triangle faces (public domain); confirmed three-path construction with width=280, height=243
- `https://web.dev/articles/animations-guide` — Confirmed: "Restrict animations to `opacity` and `transform`"; `transform` operates at compositing stage; zero TBT
- `https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion` — Confirmed: `no-preference` value; correct syntax `@media (prefers-reduced-motion: no-preference)`

### Secondary (MEDIUM confidence)

- `https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs` — Current favicon minimal setup; SVG `type="image/svg+xml"` link tag already in BaseLayout.astro; no additional tags needed
- `https://motion.dev/docs/performance` — Confirmed: `transform` and `opacity` are "widely supported compositor styles"
- `https://www.peerigon.com/en/blog/css-animation-how-to-avoid-unnecessary-repaints/` — Confirmed: `transform` skips layout+paint; `will-change` promotes to compositor layer
- CSS-Tricks animated grainy texture pattern — Confirmed: `position: fixed` + oversized element + `transform: translate` keyframes is the established technique; `grain-overlay` follows this exactly

### Tertiary (LOW confidence)

- General web search results on isometric cube SVGs — Multiple sources confirm `skewY(30)` / `skewY(-30)` as the standard technique; CodePen examples corroborate CDN SVG geometry

---

## Metadata

**Confidence breakdown:**
- Isometric cube tile geometry: HIGH — directly fetched from the CDN reference source; confirmed `skewY(30)`/`skewY(-30)` with exact dimensions
- CSS animation approach: HIGH — verified compositor-safe via official web.dev docs; matches existing codebase pattern
- Penrose triangle path data: HIGH — directly fetched from Wikipedia SVG (public domain); coordinates verified
- Favicon approach: HIGH — no link tag changes needed; existing `<link rel="icon" href="/favicon.svg" type="image/svg+xml">` confirmed in BaseLayout.astro:23
- `prefers-reduced-motion` syntax: HIGH — verified from MDN official docs
- `<use>` inside CSS background SVG: MEDIUM — flagged as risk; recommend avoiding by duplicating geometry
- `oklch()` in SVG fill attributes: MEDIUM — recommend using hex fills instead to match existing favicon.svg pattern

**Research date:** 2026-03-29
**Valid until:** 2026-04-30 (CSS specs and browser support are stable; favicon spec is stable; SVG geometry is static)
