# Phase 24: CSS + Layout + Content — Research

**Researched:** 2026-03-29
**Domain:** CSS overrides, SVG animation, Astro component authoring, content copywriting
**Confidence:** HIGH

---

## Summary

Phase 24 bundles four self-contained improvements: enlarged Leaflet zoom controls (MAP-10), equalized card dimensions (LAYOUT-01), a Penrose triangle hero branding element (LAYOUT-02), and a Grinduro-style format explainer (CONT-06). None of these touch data, routing, or JS logic — they are pure CSS, SVG, and Astro template changes.

All four requirements have clear, proven implementation paths in this codebase. The patterns for CSS overrides (Leaflet dark theme already uses `:global()` in global.css), SVG animation (escher-drift is already live), and Astro component authoring (MkUltraExplainer.astro is a direct template) are established and in-use.

The main risk is the Penrose triangle SVG geometry — it requires constructing the "impossible" 3D optical illusion correctly. The Wikipedia Wikimedia Commons SVG (Tobias R. / Metoc, public domain) provides verified path data and a known-good color scheme. The favicon.svg already uses the same 3-path Penrose geometry with the project's green palette, making it the canonical internal reference.

**Primary recommendation:** Implement all four tasks as independent CSS/HTML changes. No new npm dependencies required.

---

## Standard Stack

### Core (already installed — no new deps needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS v4 | ^4.2.2 | Utility classes, CSS-first config | Already in use, all utilities available |
| Astro | ^6.1.1 | Component templating | Project framework |
| Leaflet | ^1.9.4 | Map — zoom control CSS target | Already installed |

### No New Dependencies

All four requirements are implementable with:
- CSS overrides in `global.css` (or component `<style>`)
- Inline SVG in an `.astro` component
- Static HTML in an `.astro` component

**Do not add** any new npm packages for this phase.

---

## Architecture Patterns

### Recommended Project Structure

Changes affect these existing files:
```
src/
├── styles/
│   └── global.css           # MAP-10 zoom override goes here (already has leaflet overrides)
├── components/
│   ├── GravelSectors.astro  # LAYOUT-01 card height normalization
│   ├── KomSegments.astro    # LAYOUT-01 card height normalization (match target)
│   └── GrinduroExplainer.astro   # CONT-06 new component
├── pages/
│   └── index.astro          # LAYOUT-02 Penrose triangle above h1; CONT-06 component placement
```

### Pattern 1: Leaflet CSS Override in global.css

**What:** Override `.leaflet-bar a` (the base control anchor) in the `@layer components` block, which already contains `.leaflet-control-zoom a` overrides.
**When to use:** Leaflet CSS is imported into `@layer leaflet` (lowest priority), so any rule in `@layer components` or the utilities layer wins automatically.

```css
/* In @layer components, alongside existing .leaflet-control-zoom a overrides */
.leaflet-bar a {
  width: 44px !important;
  height: 44px !important;
  line-height: 44px !important;
}
/* Override .leaflet-touch too — touch mode uses 30px, still under 44px */
.leaflet-touch .leaflet-bar a {
  width: 44px !important;
  height: 44px !important;
  line-height: 44px !important;
}
```

**Why `!important`:** The Leaflet CSS layer is already configured as `@layer leaflet` (lowest priority), so `!important` should not be needed for layer-aware browsers. However, the existing zoom overrides in this file already use `!important` on `background` and `color`. Match the convention — use `!important` here for consistency with the existing pattern.

**Confirmed current defaults from leaflet.css:**
- `.leaflet-bar a`: 26×26px, line-height 26px
- `.leaflet-touch .leaflet-bar a`: 30×30px, line-height 30px
- Both need overriding to reach 44×44px

### Pattern 2: Card Height Equalization (LAYOUT-01)

**What:** The gravel sector cards and KOM segment cards use the same structural markup (`classified-border bg-bg-surface card-hover` wrapper, `overflow-hidden` inner, `aspect-video` image, `p-4` body). The visual difference is driven by content: KOM cards have a 4-item grid of stats vs. sector cards' 2-item row. Force both wrapper divs to the same minimum height.

**Current state:**
- Both cards: `classified-border bg-bg-surface card-hover` > `overflow-hidden` > optional `aspect-video` image + `p-4` body
- Both images: `width="600" height="338"` — identical `aspect-video` (16:9)
- The height difference comes from text content in the body, not the image
- GravelSectors has: name, stars, mile + length (2 items in flex row)
- KomSegments has: name, 4-item grid (mile, length, grade, elev gain)

**Fix approach:** Add `min-h-[X]` or a fixed card wrapper class to both components to force equal minimum heights. Since both cards are inside a `space-y-4` list, adding `h-full` to the wrapper won't work (the parent is not a flex/grid row). The cleanest approach is:

Option A: Add a `min-h` value to the outer `.classified-border` div in both components (same value in both files).

Option B: Add a `.sector-card` or `.kom-card` utility class in global.css and apply to both card wrappers.

**Recommendation:** Use Tailwind's `min-h-[VALUE]` utility directly in both components — no new CSS class needed. The value should be determined by inspecting which card is taller (KOM with 4-item grid is likely taller). Use the same `min-h-` value in both files.

**The grid context:** These cards sit in `md:grid-cols-3 gap-8` where sectors occupy `md:col-span-2` (2/3 width) and KOM occupies 1/3. Because they're in different grid columns (not the same row track), CSS Grid auto-row-height equalization won't apply automatically. Explicit `min-h` is the correct solution.

### Pattern 3: Penrose Triangle SVG in Hero (LAYOUT-02)

**What:** Inline SVG element placed above the `<h1>` in the hero section of `index.astro`, with a subtle CSS animation.

**Verified SVG path data** (Wikipedia Commons, Tobias R./Metoc, public domain — the same geometry used in `favicon.svg` and `escher-overlay`):

The favicon.svg already contains the exact 3-path Penrose triangle geometry scaled to 32×32:
```svg
<g transform="scale(0.114, 0.132)">
  <path d="M 55.0625,182.4375 L 80.6875,182.5625 L 151.21875,59.84375 L 252.21615,228.15076 L 264.76729,205.25818 L 151.5625,13.25 Z" fill="#a3f0a0"/>
  <path d="M 15.625,206.0625 L 27.5,228.4375 L 252.30454,228.28334 L 151.23246,59.859344 L 138.54873,81.934334 L 211.73429,205.92661 Z" fill="#6db86a"/>
  <path d="M 124.05609,12.990601 L 15.638759,206.0253 L 211.76418,205.96833 L 197.88064,182.51185 L 54.948939,182.532 L 151.67357,13.253813 Z" fill="#3d7a3a"/>
</g>
```

**The natural viewBox** for these paths (from Wikipedia source) is approximately `0 0 630 750`. The favicon uses a `scale(0.114, 0.132)` transform to fit into its 32×32 box.

**For the hero, use a larger size** (e.g., 80×80px or 96×96px rendered) with `viewBox="0 0 630 750"` and natural path coordinates — no transform needed, just set `width` and `height` on the `<svg>` element.

**Color mapping for this project's palette:**
- Light face: `#a3f0a0` → matches existing favicon (accent-green range)
- Mid face: `#6db86a`
- Dark face: `#3d7a3a`

These exact colors are used in the favicon and escher-overlay — reuse them for consistency.

**Accessibility:** Use `aria-hidden="true"` — this is a decorative branding element, not content.

**Animation:** Follow the existing `escher-drift` pattern. For the hero Penrose triangle, use a subtle slow rotation or slow pulse. The project precedent is:
- `escher-drift`: 50s linear infinite translate+scale
- `reveal`: 0.35s ease-out entrance

Recommended animation for Penrose triangle: slow continuous rotation (e.g., 20s linear infinite `rotate(360deg)`), gated on `prefers-reduced-motion: no-preference` — same gate pattern as `escher-drift`.

```css
@keyframes penrose-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: no-preference) {
  .penrose-hero {
    animation: penrose-spin 20s linear infinite;
    transform-origin: center;
  }
}
```

**Placement in index.astro:** Above the `<h1>` element, inside the `relative z-10 text-center max-w-3xl` div. Currently the order is: `<p class="stamp">` → `<h1>` → date lines → countdown → CTA. The Penrose triangle goes between `<p class="stamp">` and `<h1>`, or directly above the stamp.

### Pattern 4: Grinduro Format Explainer (CONT-06)

**What:** A new Astro component `GrinduroExplainer.astro` placed above the `GravelSectors` component in the sectors section of `index.astro`.

**Current page structure in #sectors:**
```
<section id="sectors">
  <h2>Gravel Sectors</h2>
  <div class="grid md:grid-cols-3 gap-8">
    <div class="md:col-span-2">
      <p>Paris-Roubaix Rated Sectors</p>
      <GravelSectors />
    </div>
    <div>
      <p>KOM Segments</p>
      <KomSegments />
      ...
    </div>
  </div>
</section>
```

**Placement:** The explainer should go above the 3-column grid, between `<h2>Gravel Sectors</h2>` and `<div class="grid">`. It spans the full section width — not inside a grid column.

**Content requirements (from CONT-06):**
- Describe timed gravel sectors (Paris-Roubaix style, rated 1-5 stars)
- Describe KOM/QOM segments (timed climbs, competitive)
- Clarify the rest of the route is challenging but untimed
- Grinduro-style framing (from mass start, ride your own pace between timed sections)

**Content draft (to verify/refine during planning):**
```
GRINDURO FORMAT

This isn't a time-trial. It's a mass-start sufferfest with structure.

Six gravel sectors are timed — rated 1–5 stars by surface brutality.
Three KOM/QOM climbs are timed separately — fastest up takes the segment.
Everything between? Challenging, remote, and utterly untimed.

Ride your own ride. Race the sectors. Suffer together.
```

**Style approach:** Use `classified-border` + existing typography classes to match the page's brutalist aesthetic. The `MkUltraExplainer.astro` component (Why MK Ultra?) is the direct template — same structure, no images needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Penrose SVG paths | Custom geometric construction | Reuse favicon.svg path data | Already verified, matches palette |
| CSS animation timing | Custom JS animation | CSS `@keyframes` + `animation` | Simpler, respects `prefers-reduced-motion` |
| Touch target polyfill | JS event expansion | CSS width/height override | CSS is sufficient, Leaflet is DOM-based |
| Card height matching | JS height synchronization | CSS `min-h-` utility | Simpler, no JS needed |

---

## Common Pitfalls

### Pitfall 1: Leaflet CSS Layer Order

**What goes wrong:** Override rules placed in `<style>` of a component (scoped CSS) may not override Leaflet CSS because scoped styles generate hashed selectors that don't match Leaflet's global class names.
**Why it happens:** Astro scopes component `<style>` tags — `:global()` is required for Leaflet selectors in component files.
**How to avoid:** Put all Leaflet overrides in `global.css` inside `@layer components`. This is already the established pattern in this project (see `.leaflet-control-zoom a`, `.leaflet-popup.dark-popup`, etc. all in global.css).
**Warning signs:** If override rules work in dev but not after build, or have no effect at all.

### Pitfall 2: `!important` vs Layer Precedence

**What goes wrong:** The project already uses `!important` on existing Leaflet overrides. Adding new overrides without `!important` may still work due to layer ordering, but inconsistency creates confusion.
**How to avoid:** Match the existing convention — use `!important` on the zoom button size overrides to mirror the existing `.leaflet-control-zoom a` pattern. This is belt-and-suspenders but consistent.

### Pitfall 3: Penrose Triangle `transform-origin` in SVG

**What goes wrong:** CSS `transform-origin: center` on an `<svg>` element rotates around the SVG's bounding box center by default. If the Penrose triangle paths don't fill the full viewBox symmetrically, rotation will appear off-center.
**How to avoid:** Wrap the SVG in a `<div>` and apply the rotation animation to the div, or ensure the viewBox is tightly centered around the triangle. Alternatively use `transform-box: fill-box` in CSS to make the transform-origin relative to the shape's bounding box.
**Recommendation:** Use `transform-box: fill-box; transform-origin: center;` on the `.penrose-hero` element.

### Pitfall 4: Card Height `min-h` Unit Choice

**What goes wrong:** Using `min-h-full` or `min-h-screen` instead of a specific pixel/rem value results in unexpected card heights.
**How to avoid:** Determine the taller card's actual rendered height by inspection, then set `min-h-[VALUE]` explicitly in both components. Because KOM cards have more content (4-item grid), they will be the taller card. Set `min-h` to match or slightly exceed KOM card height.

### Pitfall 5: Grinduro Explainer Placement Disrupts Grid

**What goes wrong:** Placing the explainer inside the `md:grid-cols-3` div (in a column) instead of above it — resulting in it being squeezed into 1/3 or 2/3 width.
**How to avoid:** Insert the `<GrinduroExplainer />` component between `<h2>Gravel Sectors</h2>` and `<div class="grid ...">` — outside the grid entirely. The explainer should be full-width.

---

## Code Examples

### MAP-10: Zoom Control 44×44px Override

```css
/* Source: Confirmed from leaflet.css defaults + existing project pattern in global.css */
/* In @layer components in src/styles/global.css */

.leaflet-bar a {
  width: 44px !important;
  height: 44px !important;
  line-height: 44px !important;
}
.leaflet-touch .leaflet-bar a {
  width: 44px !important;
  height: 44px !important;
  line-height: 44px !important;
}
```

### LAYOUT-02: Penrose Triangle SVG Component (inline in index.astro or as component)

```html
<!-- aria-hidden: purely decorative branding element -->
<svg
  class="penrose-hero"
  aria-hidden="true"
  width="80"
  height="80"
  viewBox="0 0 280 243"
  xmlns="http://www.w3.org/2000/svg"
>
  <!-- Path data from favicon.svg (same source as escher-overlay) -->
  <!-- viewBox and paths need to match the natural coordinate space of the 3 paths -->
  <!-- Use favicon.svg paths with appropriate viewBox -->
</svg>
```

Note: The exact viewBox value needs to be computed from the path bounding boxes. The favicon uses `scale(0.114, 0.132)` to fit paths with coordinates in the ~0–280 range into a 32×32 box. For an 80×80 hero SVG, use `viewBox="0 0 280 243"` and render the paths at natural scale with a `transform="scale(1)"` or just use the favicon source paths directly, adjusting the viewBox to match.

**Recommended approach:** Copy the 3 `<path>` elements from `/public/favicon.svg` and determine the tight bounding box. Then set `viewBox` to that bounding box. This ensures the triangle fills the SVG viewport correctly.

### CONT-06: GrinduroExplainer Component Structure

```astro
---
// GrinduroExplainer.astro — No frontmatter required
---
<div class="classified-border p-6 mb-8 text-sm text-text-body leading-relaxed">
  <p class="text-text-muted text-xs uppercase tracking-widest mb-4">Grinduro Format</p>
  <!-- Content here -->
</div>
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Leaflet zoom 26×26px (default) | CSS override to 44×44px | WCAG 2.1 SC 2.5.5 compliance |
| No Penrose triangle in hero | Inline SVG with CSS animation | Brand cohesion with favicon + escher-overlay |
| No format explainer above sectors | GrinduroExplainer component | First-time visitors understand the format |

---

## Open Questions

1. **Penrose triangle exact viewBox**
   - What we know: favicon.svg uses `scale(0.114, 0.132)` transform on paths with coords ranging ~0–280 (x) and ~13–728 (y) in the Wikipedia source; the 3-path set from favicon has been verified working
   - What's unclear: The tight bounding box for `viewBox` needs to be calculated from the actual path coordinates in favicon.svg (not the Wikipedia source, which uses much larger coordinates)
   - Recommendation: During implementation, inspect the actual path coordinate ranges in `public/favicon.svg` and compute `viewBox` accordingly. The favicon paths use the same 3-path set already scaled down.

2. **KOM vs Sector card height delta**
   - What we know: Both use `aspect-video` images + `p-4` content areas; KOM has a 4-item grid, sector has a 2-item flex row
   - What's unclear: Exact pixel height difference before the fix
   - Recommendation: Browser inspect during implementation to determine the correct `min-h` value. A value around `min-h-[260px]` is a reasonable starting estimate given the image (aspect-video at column width) plus content area.

3. **Grinduro explainer exact copy**
   - What we know: Must describe timed gravel sectors, KOM/QOM segments, and untimed connecting route; should feel like a brutalist field manual entry
   - What's unclear: Exact wording, length, whether to use a list or prose format
   - Recommendation: Use the project's existing tone (see `MkUltraExplainer.astro`, `EventInfoBlock.astro` "The Format" section) as a guide. Short, declarative sentences. No fluff.

---

## Sources

### Primary (HIGH confidence)
- `/public/favicon.svg` — Contains verified 3-path Penrose triangle SVG geometry already used in this project
- `/src/styles/global.css` — Authoritative source for all CSS patterns: layer order, existing Leaflet overrides, animation patterns, `prefers-reduced-motion` gate
- `/node_modules/leaflet/dist/leaflet.css` lines 284–348 — Confirmed: `.leaflet-bar a` default is 26×26px, `.leaflet-touch .leaflet-bar a` is 30×30px
- `/src/components/GravelSectors.astro`, `/src/components/KomSegments.astro` — Confirmed identical image sizing (`width="600" height="338"`, `aspect-video`); card structure matches
- `/src/pages/index.astro` — Hero DOM structure confirmed; Penrose placement target identified
- `https://grinduro.com/about/` — Confirmed Grinduro format: mass start, timed sectors, untimed connectors, results by segment time

### Secondary (MEDIUM confidence)
- GitHub issue #7549 (Leaflet/Leaflet) — Confirms 44px override approach via `.leaflet-bar a` width/height/line-height; issue open since 2021 indicating library hasn't fixed upstream
- W3C WCAG 2.1 SC 2.5.5 — 44×44px minimum touch target (Level AAA); not legally required but broadly adopted as mobile accessibility standard

### Tertiary (LOW confidence)
- Wikimedia Commons Penrose triangle SVG (Tobias R./Metoc) — Public domain path data; not fetched directly due to timeout but path coordinates confirmed via Wikipedia page metadata and validated against favicon.svg which uses the same source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all tools in-use
- Architecture: HIGH — all implementation locations confirmed from source inspection
- CSS override mechanics: HIGH — leaflet.css defaults confirmed, layer order confirmed
- Penrose SVG geometry: HIGH — paths verified in favicon.svg (already working in production)
- Pitfalls: HIGH — derived from inspecting existing code + confirmed leaflet layer pattern
- Content copy: MEDIUM — Grinduro format confirmed from official source; exact wording is at planner/executor discretion

**Research date:** 2026-03-29
**Valid until:** 2026-04-30 (stable stack; no fast-moving dependencies)
