# Phase 61: GrinduroExplainer Magazine Editorial Redesign - Research

**Researched:** 2026-04-13
**Domain:** CSS Grid full-bleed layout, CSS filters, drop cap typography, pull quote styling, scroll-reveal
**Confidence:** HIGH

## Summary

Phase 61 redesigns `GrinduroExplainer.astro` from a simple bordered div into a magazine editorial section. The three existing paragraphs of explainer copy are separated by two full-bleed filtered tone images that escape the surrounding `max-w-6xl` column. A drop cap opens the section and a pull quote adds rhythmic emphasis.

The primary technical challenge is the **full-bleed breakout**: GrinduroExplainer renders inside `div.relative.z-10.max-w-6xl.mx-auto` in index.astro (line 206). To achieve images that break out of this column, the component must become a CSS Grid container using the proven three-column grid pattern (`1fr min([width], 100%) 1fr`), where text children default to the center column and images use `grid-column: 1 / -1`. This is self-contained within the component and requires no changes to index.astro's layout structure.

The tone image pipeline is already in place. `square-limit-mc-escher.webp` is already processed and available. A second new image must be sourced from `images/tone/` (best candidate: `PAN_EscherNatWorld-1.webp`), copied to `public/tone/`, and added to `convert-tone-images.js`. Each tone image gets a **distinct CSS filter recipe** inline on the element — these are heavier than the existing `.tone-image` base (which is only `opacity: 0.12; mix-blend-mode: lighten; filter: grayscale(100%) contrast(1.3)`). The new recipes layer additional sepia, hue-rotate, or high-contrast treatments while still using the `.tone-image` class for the shared `position: absolute; mix-blend-mode: lighten; pointer-events: none` foundation.

**Primary recommendation:** Self-contain the full-bleed grid inside GrinduroExplainer.astro using CSS Grid with named column lines. Use `::first-letter` + `float: left` for drop cap (not `initial-letter` — limited browser support). Extend the `.tone-image` class with inline `filter` overrides per-image.

---

## Standard Stack

No new libraries required.

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Tailwind CSS v4 | `^4.2.2` | Utility classes, layout | Already in project, all utilities available |
| `global.css` `.tone-image` class | N/A | Base tone image positioning/blend pattern | Established, used by 5 existing sections |
| CSS Grid (native) | Baseline | Full-bleed column-escape technique | No library needed — CSS Grid `1fr min() 1fr` pattern |
| CSS `::first-letter` | Baseline (Widely available since 2015) | Drop cap | No library, native browser feature |
| `sharp` | `^0.34.5` | WebP conversion for new tone source | Already in devDependencies + `convert-tone-images.js` |
| IntersectionObserver (native) | Baseline | Scroll-reveal via existing `data-reveal` pattern | Already wired in index.astro script |

### No New Installation Required

All tooling is present. Do not add npm packages for this phase.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `::first-letter` float drop cap | `initial-letter` CSS property | `initial-letter` is NOT Baseline — limited browser support as of April 2026. Use `::first-letter` + `float: left`. |
| CSS Grid full-bleed (self-contained) | Negative margin `calc(-50vw + 50%)` hack | Negative margin technique works but causes overflow-x issues; CSS Grid is cleaner and already established in project |
| Inline `style` filter overrides | New CSS class per filter | Inline overrides are appropriate here — each image gets a unique recipe, no reuse across components |

---

## Architecture Patterns

### Component Structure After Redesign

The component becomes a CSS Grid container. Index.astro's wrapping `max-w-6xl` is not changed — the component self-contains the breakout.

```
GrinduroExplainer.astro
├── <section> with display:grid 3-column layout
│   ├── <p> label — center column
│   ├── <p> paragraph 1 + drop cap — center column
│   ├── <div.full-bleed> tone image 1 — full span (grid-column: 1 / -1)
│   ├── <p> paragraph 2 — center column
│   ├── <blockquote.pull-quote> — center column (with slight width breakout optionally)
│   ├── <div.full-bleed> tone image 2 — full span (grid-column: 1 / -1)
│   └── <p> paragraph 3 — center column
```

### Pattern 1: CSS Grid Full-Bleed Within a Constrained Ancestor

**What:** The component's root element is a CSS Grid container with three columns. All direct children default to the center column. Full-bleed images span all three.

**When to use:** Any time a component lives inside a `max-w-*` container but needs some children to escape to full viewport width.

**Key insight:** The outer `max-w-6xl` container clips the outer `1fr` columns at the edges of the container — so "full-bleed" here means edge-to-edge of the `max-w-6xl` box, not the viewport. If true viewport-width bleed is needed, the component must be moved outside the `max-w-6xl` wrapper in index.astro. Given the requirements say "escaping the text column," full-bleed to the edges of the sectors container is the correct interpretation and requires no index.astro changes.

**Example:**
```css
/* Source: Josh W. Comeau https://www.joshwcomeau.com/css/full-bleed/ */
/* Adapted for component-level use */
.explainer-grid {
  display: grid;
  grid-template-columns:
    1fr
    min(52ch, 100%)
    1fr;
}

.explainer-grid > * {
  grid-column: 2;
}

.explainer-grid .full-bleed {
  grid-column: 1 / -1;
  width: 100%;
}
```

**Astro component root element:**
```astro
<section class="explainer-grid py-8">
  <!-- all direct children default to center column via CSS -->
</section>
```

**Note on existing `.classified-border` wrapper:** The current component wraps all content in a single `div.classified-border`. In the redesign, this wrapper is removed or restructured. The "CLASSIFIED" label and border styling can be repurposed as a drop cap accent or pull quote border rather than a full-section border.

### Pattern 2: Full-Bleed Tone Image Breaks

**What:** Each break is a `<div>` or `<figure>` with `class="full-bleed"` containing a `<img>` with `.tone-image` + inline filter override.

**Critical stacking context issue:** The `#sectors` section already has a tone background image using `.tone-image` (from phase 44). The GrinduroExplainer's full-bleed tone images will render inside the `relative z-10` content div, ABOVE the section's background tone image. The `.tone-image` class uses `mix-blend-mode: lighten` — the inline images will blend with the content layer, not the section background (which is behind `z-10`). This is the correct behavior.

**Full-bleed break element:**
```astro
<div class="full-bleed relative overflow-hidden" style="height: 280px;" data-reveal>
  <img
    src="/tone/square-limit-mc-escher.webp"
    alt=""
    aria-hidden="true"
    class="tone-image inset-0 w-full h-full object-cover"
    style="opacity: 0.35; filter: grayscale(100%) contrast(2.2) brightness(0.6);"
    loading="lazy"
  />
</div>
```

**Why `position: relative` + `height` on wrapper, not on `<img>` directly:** `.tone-image` uses `position: absolute` — it needs a positioned ancestor to contain it. Setting `height` on the wrapper gives the break visual weight. Without a wrapper height, the absolute-positioned image would collapse the container to 0.

### Pattern 3: Drop Cap via `::first-letter`

**What:** CSS `::first-letter` on the first paragraph with `float: left` to wrap text around the enlarged initial.

**When to use:** The opening paragraph only. Use a scoped CSS selector to target specifically the first `<p>` inside the component.

**Example:**
```css
/* Source: MDN https://developer.mozilla.org/en-US/docs/Web/CSS/::first-letter */
.explainer-drop-cap::first-letter {
  float: left;
  font-family: var(--font-display); /* Special Elite — matches headings */
  font-size: 4em;
  line-height: 0.85;
  margin-right: 0.1em;
  margin-bottom: 0;
  color: var(--color-accent-green);
  /* Optional decorative border */
  padding: 0 0.05em;
}
```

**Applied in Astro:**
```astro
<p class="explainer-drop-cap text-text-body text-sm leading-relaxed">
  This isn&apos;t a time trial. It&apos;s a mass-start sufferfest with structure.
</p>
```

**`::first-letter` restrictions to know:**
- Only `font-*`, `color`, `margin-*`, `padding-*`, `border-*`, `float`, `text-*`, `background-*`, `box-shadow` properties work on `::first-letter`
- `transform` does NOT apply to `::first-letter`
- `initial-letter` is NOT Baseline — do NOT use it

### Pattern 4: Pull Quote

**What:** A highlighted excerpt in a `<blockquote>` or styled `<p>` with magazine-style left border and larger text. Does not escape the center column (stays in text flow).

**Example:**
```css
.pull-quote {
  border-left: 3px solid var(--color-accent-green);
  padding-left: 1.25em;
  margin: 1.5em 0;
  font-family: var(--font-display);
  font-size: 1.15em;
  color: var(--color-accent-white);
  font-style: italic;
}
```

**Applied in Astro:**
```astro
<blockquote class="pull-quote" data-reveal>
  Race the sectors. Suffer together.
</blockquote>
```

### Pattern 5: Scroll-Reveal (Existing Pattern)

**What:** Add `data-reveal` attribute. The IntersectionObserver in index.astro script automatically picks up all `[data-reveal]` elements site-wide. No changes to index.astro required.

**Apply to:** Full-bleed break divs and paragraphs. Use `animation-delay` inline style for staggered entrance if desired.

```astro
<div class="full-bleed ..." data-reveal style="animation-delay: 100ms">
```

### Anti-Patterns to Avoid

- **Using `initial-letter` CSS property:** Limited browser availability as of 2026 — does not work in Firefox stable. Use `::first-letter` + `float: left` instead.
- **Placing tone images with `position: relative` directly (no wrapper div):** `.tone-image` is `position: absolute`. Without a positioned wrapper with explicit height, the image has no containment and the layout breaks.
- **Applying `overflow: hidden` on the grid container:** This clips the full-bleed columns at the content column boundary, defeating the breakout entirely. The grid container must NOT have `overflow: hidden`.
- **Relying on `100vw` for full-bleed width:** `100vw` includes scrollbar width and causes horizontal overflow. The CSS Grid `1fr` approach is cleaner and avoids this.
- **Adding the component's own tone images on top of the section background tone image at the same z-layer:** The `.tone-image` class uses `position: absolute` — the full-bleed wrapper divs must have `position: relative` and `overflow: hidden` to contain them.
- **Keeping the `classified-border` wrapper unchanged:** The single classified-border div that currently wraps all three paragraphs will need to be dismantled. The grid layout replaces it. Individual text blocks can use border-left or border styling for editorial decoration instead.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Full-bleed column escape | Negative margin `calc(-50vw + 50%)` hack | CSS Grid 3-column pattern | Negative margin causes overflow-x issues; Grid is stable and already proven in community |
| Drop cap | Custom `<span>` wrapping first letter with JS | `::first-letter` CSS pseudo-element | CSS pseudo-element is simpler, no JS needed, semantically correct |
| Scroll-reveal on new elements | New IntersectionObserver instance | Existing `data-reveal` pattern in index.astro | Observer already initialized globally — just add the attribute |
| Tone image pipeline for new source | Manual WebP conversion | `convert-tone-images.js` + `sharp` | Pipeline already handles this — add one entry to `TONE_IMAGES` array |
| Filter presets | SVG filter elements | CSS `filter` property inline | CSS filter is fully Baseline since 2016, no SVG infrastructure needed |

**Key insight:** The project has all the infrastructure. This phase assembles existing pieces (grid, tone images, scroll-reveal) into a new layout configuration, plus adds two CSS-only typographic patterns (drop cap + pull quote).

---

## Common Pitfalls

### Pitfall 1: Grid Container with `overflow: hidden` Blocks Full-Bleed

**What goes wrong:** Full-bleed images clip at the center column boundary — breakout appears to do nothing.
**Why it happens:** `overflow: hidden` creates a new block formatting context that clips children. The outer `div.max-w-6xl.mx-auto` in index.astro uses overflow `visible` by default, so this risk is inside the component itself.
**How to avoid:** Do NOT add `overflow: hidden` to the grid container. Only add it to the individual full-bleed wrapper divs (to contain the absolutely-positioned tone images inside each break).
**Warning signs:** Full-bleed div appears the same width as the text column.

### Pitfall 2: Full-Bleed Break Collapses to Zero Height

**What goes wrong:** The tone image is `position: absolute` and the wrapper div has no explicit height, so the div collapses and the image is invisible.
**Why it happens:** Absolutely-positioned children don't contribute to parent's intrinsic height.
**How to avoid:** Always set an explicit `height` (e.g., `style="height: 240px"` or `min-height`) on the full-bleed wrapper div.
**Warning signs:** Visual gap in layout but no image visible; DevTools shows `height: 0` on wrapper.

### Pitfall 3: Drop Cap with Wrong `line-height` Causes Misalignment

**What goes wrong:** The enlarged `::first-letter` character pushes down the first line of body text, creating an awkward gap.
**Why it happens:** The drop cap's font-size increase raises line height. Setting `line-height: 0.8` to `0.9` on `::first-letter` is the standard fix.
**How to avoid:** Set explicit `line-height` on `::first-letter` (typically 0.8–0.9). Test with 2+ lines of following text.
**Warning signs:** Large vertical gap between the drop cap letter and the first line of body text.

### Pitfall 4: Full-Bleed Images Outside `max-w-6xl` Boundary

**What goes wrong:** Full-bleed images only reach the edges of the `max-w-6xl` container, not the viewport edges.
**Why it happens:** The CSS Grid `1fr` outer columns are clamped by the nearest block ancestor's width. The `max-w-6xl` ancestor limits `1fr` to that width.
**How to avoid:** This is expected behavior. Requirements say "escaping the text column" — full-bleed to the container edges (not viewport) satisfies this. If true viewport-width bleed is required, the component would need to be pulled outside the `max-w-6xl` div in index.astro — which requires an index.astro structural change.
**Warning signs:** Designer expects images to reach viewport edges but they stop at `max-w-6xl` boundary (≈72rem/1152px on large screens).

### Pitfall 5: `mix-blend-mode` Interaction with `#sectors` Section Background

**What goes wrong:** The full-bleed tone images blend unexpectedly with the section's existing background tone image (`square-limit-mc-escher.webp` from phase 44).
**Why it happens:** The section background tone image is `position: absolute` and uses `mix-blend-mode: lighten`. The new inline tone break images also use `lighten`. Both are in the same compositing layer.
**How to avoid:** The content wrapper `div.relative.z-10` already creates a stacking context that separates content from the background tone image. The inline break images are positioned inside the `z-10` content div, so they blend against the content layer, not the background layer. Verify visually after implementation.
**Warning signs:** Full-bleed break images look washed out or interact with the section background in an unexpected way.

### Pitfall 6: `::first-letter` Not Matching Expected Character

**What goes wrong:** The drop cap matches punctuation before the first letter (e.g., if an opening quote `"` precedes "This").
**Why it happens:** CSS spec includes Unicode punctuation classes in `::first-letter` matching.
**How to avoid:** The first paragraph starts with "This" — no leading punctuation. No action needed. If quotes are ever added to the opening, the `::first-letter` will match the quote, not the "T". Avoid leading quotes on the drop cap paragraph.

---

## Code Examples

### Full-Bleed Grid Container (Component Root)
```css
/* Source: Josh W. Comeau https://www.joshwcomeau.com/css/full-bleed/ */
/* Applied to GrinduroExplainer root element */
.explainer-grid {
  display: grid;
  grid-template-columns:
    1fr
    min(52ch, 100%)
    1fr;
}

.explainer-grid > * {
  grid-column: 2;
}

.full-bleed {
  grid-column: 1 / -1;
  width: 100%;
}
```

### Full-Bleed Tone Break Markup
```astro
<!-- Full-bleed image break — escapes center text column -->
<div class="full-bleed relative overflow-hidden" style="height: 260px;" data-reveal>
  <img
    src="/tone/square-limit-mc-escher.webp"
    alt=""
    aria-hidden="true"
    class="tone-image inset-0 w-full h-full object-cover"
    style="opacity: 0.40; filter: grayscale(100%) contrast(2.5) brightness(0.55);"
    loading="lazy"
  />
</div>
```

### Distinct Filter Recipes

**Recipe A — High-Contrast Posterize (for Escher geometry image):**
```css
/* Heavy grayscale + pushed contrast: original obscured, becomes stark geometry */
filter: grayscale(100%) contrast(2.5) brightness(0.55);
opacity: 0.40;
mix-blend-mode: lighten;
```

**Recipe B — Duotone Green (for second image):**
```css
/* Grayscale → sepia warmth → hue-rotate into green range → saturate */
/* Result: image takes on the site's accent-green character */
filter: grayscale(100%) sepia(80%) hue-rotate(60deg) saturate(4) contrast(1.4) brightness(0.7);
opacity: 0.35;
mix-blend-mode: lighten;
```

**Important:** These values go as inline `style` on the `<img>`, NOT in the `.tone-image` CSS class. The `.tone-image` class provides shared `position`, `pointer-events`, and `mix-blend-mode`. The filter/opacity are per-image overrides.

### Drop Cap
```css
/* Source: MDN https://developer.mozilla.org/en-US/docs/Web/CSS/::first-letter */
/* Scoped to component via Astro <style> block or explicit class */
.explainer-drop-cap::first-letter {
  float: left;
  font-family: var(--font-display); /* Special Elite */
  font-size: 3.8em;
  line-height: 0.85;
  margin-right: 0.1em;
  color: var(--color-accent-green);
  padding-right: 0.05em;
}
```

### Pull Quote
```css
.pull-quote {
  border-left: 3px solid var(--color-accent-green);
  padding-left: 1.25em;
  margin: 1.5em 0;
  font-family: var(--font-display);
  font-size: 1.1em;
  color: var(--color-accent-white);
  font-style: italic;
  line-height: 1.4;
}
```

### Scroll-Reveal (No Changes to index.astro)
```astro
<!-- Add data-reveal to any element to hook into existing observer -->
<p class="explainer-drop-cap ..." data-reveal>...</p>
<blockquote class="pull-quote" data-reveal style="animation-delay: 80ms">...</blockquote>
<div class="full-bleed ..." data-reveal>...</div>
```

### New Tone Image Pipeline Entry
```javascript
// Source: scripts/convert-tone-images.js — add to TONE_IMAGES array
// First: copy images/tone/PAN_EscherNatWorld-1.webp to public/tone/PAN_EscherNatWorld-1.webp
{ src: 'PAN_EscherNatWorld-1.webp', dest: 'pan-escher-nat-world.webp', width: 1000, quality: 50 },
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `initial-letter` for drop caps | `::first-letter` + `float: left` | `initial-letter` limited support as of 2026 | `::first-letter` is the safe cross-browser choice |
| Single `.tone-image` class filter | Base class + per-element inline overrides | Phase 44 established base; Phase 61 extends | Distinct filter recipes without polluting global CSS |
| Section-level tone backgrounds only | Full-bleed inline tone breaks within text | Phase 61 | Images integrated into text flow, not just behind it |
| Negative margin full-bleed hack | CSS Grid 3-column breakout | 2019 onwards, widely adopted | No overflow issues, self-contained, responsive |

**Not deprecated but confirm scope:**
- The `.classified-border` CSS class still exists and is used throughout the site — reusing its visual language (border, CLASSIFIED label) in the redesigned component is appropriate, but the single-wrapper structure must be replaced with the grid layout.

---

## Open Questions

1. **Should full-bleed truly mean viewport-width, or container-width?**
   - What we know: GrinduroExplainer renders inside `max-w-6xl mx-auto` in index.astro. CSS Grid `1fr` columns expand to the container boundary, not the viewport.
   - What's unclear: Whether "full-bleed breaks between paragraphs" means edge-to-edge of the viewport or edge-to-edge of the max-width container.
   - Recommendation: Implement as container-width full-bleed (no index.astro structural change needed). This is visually distinct from the text column and satisfies EDIT-01. If true viewport-width bleed is desired later, it requires moving the component outside `max-w-6xl` in index.astro — a separate change.

2. **Which two images to use for the breaks?**
   - What we know: `square-limit-mc-escher.webp` is already in `public/tone/` (processed). A second image needs to come from `images/tone/`. Best candidates: `PAN_EscherNatWorld-1.webp` (Escher geometric/natural world, 478KB, thematically consistent), or `NqkRju0.jpg` (823KB, subject unknown).
   - Recommendation: Use `square-limit-mc-escher.webp` (Break 1, Recipe A: high-contrast geometry) and `PAN_EscherNatWorld-1.webp` (Break 2, Recipe B: duotone green). Both are Escher motifs matching the site aesthetic.

3. **Which phrase becomes the pull quote?**
   - What we know: The current three paragraphs end with "Race the sectors. Suffer together." — already punchy and magazine-ready.
   - Recommendation: Use "Race the sectors. Suffer together." as the pull quote, extracted from paragraph 3 and rendered as a `<blockquote class="pull-quote">` after paragraph 2 (before the second image break). This creates the rhythm: para1 → break1 → para2 → pullquote → break2 → para3.

---

## Sources

### Primary (HIGH confidence)
- `src/components/GrinduroExplainer.astro` — current markup read directly; 3 paragraphs in single `.classified-border` div
- `src/pages/index.astro` lines 204–222 — GrinduroExplainer location inside `max-w-6xl` container confirmed by direct read
- `src/styles/global.css` lines 163–168 — `.tone-image` class definition confirmed by direct read
- `public/tone/` directory listing — `square-limit-mc-escher.webp` already exists and processed
- `scripts/convert-tone-images.js` — pipeline confirmed; add entry to `TONE_IMAGES` array
- `images/tone/` directory listing — `PAN_EscherNatWorld-1.webp` (478KB) confirmed as viable second source
- MDN `https://developer.mozilla.org/en-US/docs/Web/CSS/::first-letter` — drop cap allowable properties confirmed, Baseline widely available
- MDN `https://developer.mozilla.org/en-US/docs/Web/CSS/initial-letter` — confirmed NOT Baseline (limited availability)
- MDN `https://developer.mozilla.org/en-US/docs/Web/CSS/filter` — filter functions confirmed, Baseline since 2016
- MDN `https://developer.mozilla.org/en-US/docs/Web/CSS/mix-blend-mode` — creates stacking context confirmed
- Tailwind v4 docs `https://tailwindcss.com/docs/isolation` — `isolate` utility confirmed present in v4
- Josh W. Comeau `https://www.joshwcomeau.com/css/full-bleed/` — CSS Grid full-bleed pattern verified
- Ryan Mulligan `https://ryanmulligan.dev/blog/layout-breakouts/` — named grid lines variant verified

### Secondary (MEDIUM confidence)
- WebSearch CSS magazine editorial patterns 2026 — confirmed pull quote + drop cap as standard editorial CSS techniques
- CSS filter duotone recipes — `grayscale → sepia → hue-rotate → saturate` chain confirmed from multiple community sources

### Tertiary (LOW confidence)
- Specific filter numeric values (opacity: 0.35–0.40, contrast: 2.2–2.5) are starting-point estimates requiring visual tuning

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all files read directly, no assumptions, no new libraries
- Architecture: HIGH — full-bleed CSS Grid pattern verified from authoritative source; stacking context rules MDN-confirmed
- Drop cap: HIGH — `::first-letter` MDN-confirmed; `initial-letter` NOT Baseline confirmed from MDN
- Filter recipes: MEDIUM — CSS filter functions are Baseline (HIGH), but specific numeric recipe values need visual tuning (LOW starting points)
- Pitfalls: HIGH — stacking context, grid overflow, and absolute-position-height traps verified from codebase + MDN

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable CSS patterns; tone image file availability confirmed)
