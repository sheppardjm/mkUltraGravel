# Pitfalls Research

**Domain:** Adding CSS-filtered editorial image layout + Chart.js annotation label fix to an existing Astro 6 dark-themed static site with animated overlay layers
**Project:** MK Ultra Gravel — Explainer Redesign + Down Jeep annotation fix milestone
**Researched:** 2026-04-13
**Confidence:** HIGH (primary sources: direct codebase inspection, chartjs-plugin-annotation official docs, MDN, web.dev)

---

## Context

This file covers pitfalls specific to this milestone on the existing MK Ultra Gravel site. The site has:

- Three `position: fixed` overlay layers covering the full page: grain (z-9999), escher (z-9998), lizard (z-9997), all `pointer-events: none`
- A `SiteNav` at z-10000
- Existing `.tone-image` component class: `position: absolute; opacity: 0.12; mix-blend-mode: lighten; filter: grayscale(100%) contrast(1.3); pointer-events: none`
- Design tokens in oklch color space; CSS filters operate in sRGB
- TBT 0ms and Lighthouse mobile 96 targets
- Tailwind v4 CSS-first config (`@theme` block, no `tailwind.config.js`)
- Chart.js 4.5.1 with chartjs-plugin-annotation 3.1.0

The two workstreams are independent but share the page:

1. **Editorial explainer layout** — adding CSS-filtered tone images to the explainer section(s), likely with a magazine-style column layout
2. **Down Jeep annotation label** — fixing the narrow (0.59mi / ~0.6% chart width) sector annotation that currently omits the sector name

---

## Critical Pitfalls

---

### Pitfall 1: `position: absolute` on `.tone-image` Escapes Containment When Parent Lacks `position: relative`

**What goes wrong:**
The `.tone-image` CSS class (defined in `global.css`) sets `position: absolute`. For `inset-0` (which computes to `top: 0; right: 0; bottom: 0; left: 0`) to constrain the image to its intended section, the parent element must have `position: relative` (or `sticky`/`fixed`/`absolute`).

In `GravelSectors.astro`, the `relative` class is conditionally applied only to `i < 2` cards. Any new explainer section that drops a `.tone-image` inside a container without `relative` will have the image escape to the nearest positioned ancestor — potentially filling the entire viewport or climbing to the `<section>` element above it in the stacking context.

This failure is visually obvious in development but easy to miss when adding a new component because the parent's positioning is often set by a sibling's needs, not the tone image's needs.

**Why it happens:**
Developers see the existing pattern (e.g., `MkUltraExplainer.astro` using `<section class="relative ...">`) and assume `relative` is implied by the section wrapper. Adding tone images to new components that don't have `relative` on the wrapper — particularly when the component is a `<div>` without explicit positioning — breaks containment silently until visually inspected.

**How to avoid:**
- Every element that contains a `.tone-image` must have `position: relative` (Tailwind: `relative`) on a direct or ancestor wrapper
- Run a visual check at mobile (375px) and desktop (1280px) — the image escaping its container is immediately visible as a full-viewport grey wash
- The `.tone-image` class itself could gain a note comment in `global.css` to enforce this contract

**Warning signs:**
- The tone image covers content from adjacent sections (the previous or next section's heading appears greyed out)
- DevTools shows the `.tone-image` `<img>` element's containing block is `<body>` or `<html>` rather than the intended section/div
- Opacity-reduced grey wash appears across section boundaries

**Phase to address:**
Explainer layout implementation phase — verify containment structure before adding any `.tone-image` to new sections.

---

### Pitfall 2: New Images Without Explicit `width`/`height` Attributes Cause CLS Regression

**What goes wrong:**
Tone images in existing sections (hero, route, photos, info) all use `loading="lazy"` but lack explicit `width` and `height` attributes. They are absolutely positioned, so they do not contribute to document flow and do not cause layout shift themselves. However, if the new explainer layout includes images that ARE in normal document flow (e.g., a magazine-style column with an image alongside text), omitting `width` and `height` will cause the browser to reserve zero height until the image loads, causing a layout shift.

The site currently achieves CLS < 0.1. A single in-flow image without dimensions in a prominent section can push this above the 0.1 threshold.

**Why it happens:**
The existing tone images are all `position: absolute` and thus flow-removed — dimensions do not affect CLS. Developers copying this pattern to an in-flow context miss the fundamental difference. Even with `object-cover` and `w-full h-full`, a normal-flow image without dimensions collapses to 0 height until loaded.

**How to avoid:**
- If the tone images remain `position: absolute` (flow-removed), no CLS risk
- If any image enters normal document flow in a column layout, add explicit `width` and `height` attributes matching the image's natural dimensions, and use `aspect-ratio` or a padding-based container to reserve space
- Preferred pattern for editorial columns: container with `aspect-video` or explicit aspect ratio, with the image absolutely positioned inside

**Warning signs:**
- Lighthouse CLS score > 0.1 in local PageSpeed run
- Chrome DevTools Performance panel shows layout shift events tied to image loading
- The element shifts down when a lazy-loaded image above it loads

**Phase to address:**
Explainer layout implementation phase — define the image composition pattern (absolutely positioned vs. in-flow) before implementation begins.

---

### Pitfall 3: CSS Filters on Tone Images Conflict with oklch Color Tokens — Visual Drift on Tinted Images

**What goes wrong:**
The existing `.tone-image` class applies `filter: grayscale(100%) contrast(1.3)`. This operates in sRGB color space, not oklch. For the current all-white/dark CIA document images this is invisible — greyscale on a document image looks the same regardless of color space.

However, if any new tone images for the explainer contain color content (e.g., tinted photos, images with hue variation), the `grayscale()` + `contrast()` filter pipeline will produce different visual output than the designer expects when previewing the image in a color-aware editor. The `mix-blend-mode: lighten` compounds this: lighten blend mode compares channel values in sRGB. An image with oklch-designed tones at specific chroma values will produce different blend output when the filter-sRGB pipeline transforms those values.

The practical effect: tone images that look correct in Figma/Photoshop (which use the display P3 or relative colorimetric intent) will look slightly brighter, flatter, or differently-contrasted when filtered through sRGB `grayscale` + `contrast`.

**Why it happens:**
CSS filters (`filter` property) are defined in the Filter Effects specification as operating on sRGB linearized values. This is a spec-level fact, not a browser quirk. The oklch tokens define UI colors, but the images being filtered are processed in sRGB regardless.

**How to avoid:**
- For document/archival tone images (primarily greyscale already), this is a non-issue — no chroma to lose
- For any new color tone images, preview them rendered in the browser with the actual `.tone-image` class applied before deciding on opacity/contrast values
- Do not calibrate tone image appearance in a design tool; calibrate it in the browser against the actual dark background (`--color-bg-base: oklch(0.10 0.01 250)`)
- If a tinted effect is desired and the sRGB filter flattens it, consider skipping `grayscale()` and relying only on `opacity` and `mix-blend-mode` for tone

**Warning signs:**
- Tone image looks "flatter" or "grayer" in the browser than in the design mockup
- `invert-100` (used in `MkUltraExplainer.astro`) produces an unexpectedly bright white result on a color image

**Phase to address:**
Explainer layout design/implementation phase — establish image treatment rules before sourcing new images.

---

### Pitfall 4: New Animated Elements Without `prefers-reduced-motion` Gate Break the Reduced-Motion Contract

**What goes wrong:**
All three existing overlay animations (escher-drift, lizard-drift, penrose-spin) are gated behind `@media (prefers-reduced-motion: no-preference)` in `global.css`. The scroll-reveal system also checks `window.matchMedia("(prefers-reduced-motion: reduce)").matches` and skips the IntersectionObserver entirely.

If the explainer redesign introduces any new CSS animations (parallax scroll, fade-in transitions on image reveal, section-entry animations), they must follow the same pattern. Missing the reduced-motion gate on even one new animation breaks the site's accessibility contract.

**Why it happens:**
Tailwind v4's animation utilities (`animate-*`) do NOT automatically respect `prefers-reduced-motion`. Writing `class="animate-fade-in"` applies the animation unconditionally. The gate must be added explicitly in CSS or via a `@media` wrapper.

**How to avoid:**
- Any new `@keyframes` definition must be wrapped in `@media (prefers-reduced-motion: no-preference)` before applying it to any element
- Tailwind's `motion-reduce:` variant can disable an animation inline: `class="animate-reveal motion-reduce:animate-none"` — but this is per-element; for global patterns, define in CSS
- The existing pattern in `global.css` is the canonical reference for this project

**Warning signs:**
- Animation plays in a browser with "Reduce Motion" enabled in OS settings
- Chrome DevTools > Rendering > "Emulate CSS media feature prefers-reduced-motion" shows animations still running

**Phase to address:**
Any phase that adds animations — enforce as a hard rule before implementation.

---

### Pitfall 5: Chart.js Annotation Label `display` Callback Uses `window.innerWidth` — Breaks SSR Context and Has a Narrow Mobile Bug

**What goes wrong:**
The current annotation label display callback is:
```javascript
display: () => window.innerWidth >= 640,
```

This is a runtime callback evaluated during canvas draw. In the current `<script>` (client-only module) this is fine, but it has a subtle edge case: the label suppression at `< 640px` applies to ALL labels including Down Jeep. At viewport widths of 375–639px (common iPhone sizes), no sector labels are shown — so the Down Jeep fix only benefits desktop users. If the design intent is to show the Down Jeep label at mobile widths too (since the fix adds useful information), the threshold logic must be explicitly considered.

More practically: the `() => window.innerWidth >= 640` closure is created during `initElevation()`. If the chart is initialized before the user resizes the window, the closure captures the correct initial width. But on resize, the chart does not re-evaluate annotations unless `chart.update()` is called. Label visibility can become stale after orientation change or resize.

**Why it happens:**
The callback fires on each `draw`, so `window.innerWidth` is re-read each draw cycle. This is actually correct — the closure doesn't capture a stale value because `window.innerWidth` is a live property. However, the 640px threshold means the Down Jeep fix is invisible on most mobile viewports.

**How to avoid:**
- When implementing the Down Jeep fix, explicitly decide: should the label show at mobile widths?
- If yes, adjust the threshold or add a special case for the Down Jeep sector
- If no, document that the fix only applies to `>= 640px` viewports

**Warning signs:**
- Testing the fix on a 375px-wide DevTools viewport shows no change (labels are suppressed)
- The `display` callback logs `false` for Down Jeep on mobile

**Phase to address:**
Down Jeep annotation fix phase — decide mobile behavior before implementing.

---

### Pitfall 6: `chartjs-plugin-annotation` v3.x Label on Narrow Box — Label Overflows Chart Area Silently, Not the Box

**What goes wrong:**
The debug document (`down-jeep-label.md`) correctly identifies that chartjs-plugin-annotation does NOT clip labels to their parent box boundary — it only clips to the chart area. This is a v2+ behavior change (v2 removed box-level clipping).

The current implementation with `rotation: -90` and `content: [starsStr]` (5 star characters at 9px) for Down Jeep produces a label that is technically rendered but occupies approximately 45px height × 9px width when rotated 90 degrees. The Down Jeep box is approximately 3–6 CSS pixels wide. The rotated label overflows left and right of the box into adjacent sectors (C4 to the left, the chart end to the right).

This overflow means the label text may visually collide with or be obscured by the C4 sector annotation text/fill. At 9px font size, 5 stars rotated -90° render as a thin vertical strip that is likely lost in the visual noise of the neighboring C4 annotation.

The recommended fix (Option A in the debug document: include `sector.name` in the label for narrow sectors) is correct. The name adds vertical length (taller text stack) which is exactly the dimension that is abundant when rotated. The fix was already partially applied: `global.css` inspection of `ElevationProfile.astro` line 66 shows `labelContent` is now `[sector.name, starsStr]` unconditionally — the `isNarrow` branch was already removed.

**Verify this before implementing**: if the fix is already in place, the milestone may only need visual verification, not a code change.

**Why it happens:**
The original `isNarrow` guard was added as a defensive measure assuming the sector name would not fit horizontally. But `rotation: -90` already solves the horizontal constraint — the name renders vertically where there is ample room.

**How to avoid:**
- Do not use both `rotation: -90` and `content: [starsStr]` (name omitted) simultaneously — rotation makes vertical space abundant, omitting the name is wasteful
- For any future narrow annotations, the pattern is: rotate -90, include full content, let the chart-area clip handle the boundary
- Do not use the box boundary as a clipping container (it does not clip in v2+)

**Warning signs:**
- Down Jeep annotation shows only star characters with no text label at desktop widths
- `display: () => window.innerWidth >= 640` returns `true` but label content is just stars
- DevTools canvas inspection shows the label text overflowing into the C4 annotation area

**Phase to address:**
Down Jeep annotation fix phase — verify current code state first; fix may already be in place from a prior session.

---

## Moderate Pitfalls

---

### Pitfall 7: Large Unoptimized Tone Images Loaded Eagerly Regress LCP or TBT

**What goes wrong:**
The tone image directory contains `CIA-MKULTRA-IG_Page_01.jpg` at 1.4MB, `lsd-mind-control.jpg` at 611KB, and `square-limit-mc-escher-1964.jpg` at 602KB. Their webp counterparts are 83KB, 13KB, and 101KB respectively — already converted and in use. However, `square-limit-mc-escher-1964.jpg` has no `*_fb.webp` equivalent, unlike `escharian_stairs_fb.webp`.

If any new explainer section uses an unoptimized `.jpg` instead of the `.webp`, the bandwidth cost is 4–70x higher. For a tone image that renders at 12% opacity with a grayscale filter, this cost is entirely wasted.

More specifically: the hero tone image (`CIA-MKULTRA-IG_Page_01.webp` at 83KB) is `loading="eager"` with `fetchpriority="high"` and a `<link rel="preload">` tag. Any new LCP-path tone image added to the explainer section must follow this pattern if it appears above the fold, or use `loading="lazy"` if below fold.

**How to avoid:**
- Always use `.webp` equivalents for tone images — they exist for all currently used images
- New images must be converted to webp and sized to display dimensions before adding to `public/tone/`
- A 12%-opacity grayscale background image does not need to be larger than ~100KB after webp conversion
- Follow the existing pattern: `loading="eager" fetchpriority="high"` for above-fold, `loading="lazy"` for below-fold

**Warning signs:**
- Network tab shows a `.jpg` file being fetched for a tone image
- Lighthouse LCP flags a render-blocking large image
- TBT > 0ms could indicate a long-running script triggered by a synchronously-loaded large image

**Phase to address:**
Explainer layout implementation — audit image sizes before adding to the explainer.

---

### Pitfall 8: `will-change: transform` on Fixed Overlay Layers Creates a New Stacking Context That Clips `z-index` of Section Content

**What goes wrong:**
The escher overlay and lizard background both set `will-change: transform`. This promotes them to compositor layers. A `position: fixed` element with `will-change: transform` creates a new stacking context.

In practice: any element with `z-index` lower than 9997 (the lizard layer) that is rendered inside a section without its own stacking context may appear behind the overlay layers. The existing content avoids this because section content uses `relative z-10` which creates a local stacking context above the section's own background but below the fixed overlays.

If the new explainer layout creates a stacking context (e.g., via `isolation: isolate`, `transform`, or `opacity < 1` on a wrapper) without an explicit `z-index`, that stacking context may unexpectedly be sorted behind the overlay layers.

The `isolation: isolate` pattern is already used in `GravelSectors.astro` for the first two cards (`i < 2`) specifically to scope `mix-blend-mode` effects. New layout containers should not use `isolation: isolate` unless the blend mode scoping is intentional, as it creates a stacking context.

**How to avoid:**
- For explainer section wrappers, use `relative` without `isolation: isolate`
- Content that must be clickable/interactive: use `relative z-10` on the content wrapper — this is the established pattern in every existing section
- Tone images: always set `pointer-events: none` (handled by `.tone-image` class)
- Do not set `opacity` < 1 on a content wrapper (opacity creates a stacking context in the overlay z-space)

**Warning signs:**
- Section text appears through the grain/escher overlay as expected, but click events on links fail
- An interactive element (button, link) inside the section receives no click events even with `pointer-events: none` on the overlay
- DevTools z-index display shows the content wrapper as a stacking context with a z-index lower than 9997

**Phase to address:**
Explainer layout implementation — validate stacking context on first implementation pass.

---

### Pitfall 9: Tailwind v4 `@theme` Token Syntax Does Not Support Runtime CSS Variable Reads in Filter Values

**What goes wrong:**
Tailwind v4 uses a CSS-first `@theme` block for tokens. The `--color-bg-base` token (`oklch(0.10 0.01 250)`) can be referenced in CSS as `var(--color-bg-base)` at compile time. However, CSS `filter` functions do not accept `var()` references in all browsers:

```css
/* Does NOT work in any browser */
filter: grayscale(100%) color-adjust(var(--some-token));
```

The existing `.tone-image` filter (`grayscale(100%) contrast(1.3)`) is hardcoded with literal values — this is correct. If the explainer redesign attempts to make the filter opacity or contrast responsive to a design token (e.g., `filter: grayscale(var(--tone-grayscale))`), it will silently fail and the filter will not apply.

Additionally, the `backdrop-filter` property cannot read CSS custom properties as filter function arguments.

**How to avoid:**
- Keep filter values hardcoded as literals, not CSS variable references
- If multiple filter presets are needed, define them as distinct utility classes rather than token-driven values

**Warning signs:**
- A tone image appears in full color instead of grayscale when a token reference is used in the filter value
- The filter applies in Chrome but not Safari (inconsistent var() support in filter arguments across browser versions)

**Phase to address:**
Explainer layout design phase — establish filter constants before implementation.

---

### Pitfall 10: `mix-blend-mode: lighten` on Tone Images Requires Dark Backgrounds to Work — Breaks on Light Ancestors

**What goes wrong:**
The `.tone-image` class uses `mix-blend-mode: lighten`. Lighten blend mode selects the lighter of each channel value between the source and destination. On the site's dark backgrounds (`--color-bg-base: oklch(0.10 0.01 250)` ≈ very dark near-black), the grayscale tone image at 12% opacity blends subtly over the dark surface — the effect is correct.

If any ancestor element of the tone image has a background-color that is lighter than the image content (e.g., a card with `bg-bg-surface` at oklch 0.14, or worse, any element approaching white), the lighten blend will make the image pop to full brightness instead of the subtle overlay effect. The tone image will appear as a harsh white wash instead of a ghostly overlay.

In `GravelSectors.astro`, the card has `bg-bg-surface` — `oklch(0.14 0.01 250)`. The lighten blend against this slightly-lighter surface should still work because the image at 12% opacity is darker than the surface. But if any new explainer section uses a surface color lighter than `oklch(0.3 ...`, the blend breaks visually.

**How to avoid:**
- Keep tone images inside sections that use `--color-bg-base` or `--color-bg-surface` backgrounds only
- If a magazine layout requires a lighter card or panel, either disable the lighten blend on that panel's tone image or switch to `mix-blend-mode: multiply`
- Preview the blend mode visually at the actual background color, not in isolation

**Warning signs:**
- Tone image appears as a bright white rectangle instead of a faint ghost
- The overlay effect looks correct at full page width but breaks inside a card/panel with slightly lighter background

**Phase to address:**
Explainer layout implementation — visual QA pass across all viewport widths.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip `width`/`height` on absolutely positioned tone images | Fewer attributes to maintain | No CLS impact since flow-removed, but if layout changes to include in-flow images the debt surfaces immediately | Acceptable only for `position: absolute` images; never for in-flow images |
| `window.innerWidth >= 640` display threshold (no resize listener) | Simple implementation, no event handling | Labels show/hide incorrectly after orientation change without page reload | Acceptable given static chart pattern; add resize handler only if orientation bugs are reported |
| Hardcoded filter values (`grayscale(100%) contrast(1.3)`) | Avoids CSS variable limitation in filter context | Requires code change to adjust visual tone | Acceptable — tone treatment is design-constant, not dynamic |
| `isolation: isolate` on cards with tone images | Scopes mix-blend-mode to card context | Creates stacking context, can cause z-index collisions in overlay-heavy system | Acceptable for specific blend-scope use cases; document each use |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `.tone-image` class + new section | Missing `position: relative` on parent — image escapes to wrong containing block | Always add `relative` (or `relative overflow-hidden`) to the direct parent of any `.tone-image` |
| chartjs-plugin-annotation v3 + narrow box | Expecting box-boundary clipping of label — labels overflow box | Labels only clip to chart area; design for chart-area overflow, not box-boundary overflow |
| CSS filters + oklch design tokens | Passing `var(--color-token)` as a filter argument | Filter functions require literal values; use hardcoded numbers |
| Fixed overlay layers + new stacking contexts | Adding `transform` or `opacity < 1` on section wrappers without explicit z-index | Always pair stacking context creation with `z-index` to control layering relative to overlays |
| Tailwind v4 + animation | Applying `animate-*` utilities without `motion-reduce:` variant or CSS media query gate | Every animation must be wrapped in `prefers-reduced-motion: no-preference` gate |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Unoptimized tone image on LCP path | LCP regression, Lighthouse performance < 90 | Use webp, keep below 100KB for overlay images, use `fetchpriority="high"` for above-fold | On first load at slow network (3G simulation) |
| Multiple tone images with `will-change: transform` | Excessive compositor layer count, GPU memory pressure on mobile | Do not add `will-change` to tone images — they are static content; reserve it for animated elements | On low-memory mobile devices (< 3GB RAM) |
| Overly large `background-size` on overlay SVGs | Browser re-tiles on resize, causing paint jank | Keep overlay SVG patterns at existing 100-200px sizes | On aggressive window resize |
| Chart.js annotation `update('none')` called on every rAF tick | Canvas repaint on every mouse move frame | Already throttled via `rafPending` flag — maintain this pattern for any new interactions | Visible as jank on low-end hardware during fast hover |

---

## "Looks Done But Isn't" Checklist

- [ ] **Tone image containment:** Every `.tone-image` has a `position: relative` ancestor — verify in DevTools "Containing Block" panel
- [ ] **Down Jeep fix verification:** Check at >= 640px viewport that "Down Jeep" text appears in the annotation label (not just star characters)
- [ ] **Reduced-motion gate:** Any new animation has `@media (prefers-reduced-motion: no-preference)` wrapper — verify by emulating in Chrome DevTools Rendering panel
- [ ] **Mobile label suppression:** Down Jeep annotation is suppressed at 375px (by `window.innerWidth >= 640` check) — decide if this is intentional and document it
- [ ] **Webp images only:** `public/tone/` directory contains only `.webp` files being referenced in markup (no `.jpg` fallback being loaded)
- [ ] **Overlay pointer-events:** New section content is reachable by click/tap — verify no new element accidentally captures pointer events

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Tone image escapes containment | LOW | Add `relative` to parent div — one-line fix |
| CLS regression from in-flow image | LOW | Add `width`/`height` attributes and `aspect-ratio` CSS to container |
| Animation without reduced-motion gate | LOW | Wrap animation in `@media (prefers-reduced-motion: no-preference)` |
| Down Jeep label still not visible | LOW-MEDIUM | Confirm `ElevationProfile.astro` line 66 uses `[sector.name, starsStr]` unconditionally; adjust `rotation` to 0 with `xAdjust` if name still clips |
| mix-blend-mode lighten breaks on new section background | LOW | Change container background to `bg-bg-base` or switch to `mix-blend-mode: screen` |
| New stacking context hides behind overlays | MEDIUM | Add explicit `z-index` to the new stacking context wrapper (any value < 9997 renders below all overlays; use `z-10` for page content) |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Tone image containment (missing `relative`) | Explainer layout implementation | DevTools Containing Block check on `.tone-image` elements |
| CLS from in-flow images | Explainer layout design (decide absolute vs. in-flow) | Lighthouse CLS score remains < 0.1 |
| sRGB filter vs. oklch color drift | Explainer design phase — establish image treatment rules | Visual QA: browser rendering matches design intent |
| Reduced-motion gate missing | Any animation phase | Chrome DevTools Rendering emulation with reduce-motion enabled |
| Down Jeep label invisible at mobile | Down Jeep fix phase | QA at 375px and 1280px viewports |
| Down Jeep name omitted from label | Down Jeep fix phase | Confirm `[sector.name, starsStr]` on line 66 of `ElevationProfile.astro` |
| `will-change` stacking context clip | Explainer layout implementation | Check z-index layer order in DevTools Elements panel |
| Lighten blend on light background | Explainer layout QA | Visual QA at all section backgrounds |
| Unoptimized image on LCP path | Image prep before implementation | Network tab webp-only, Lighthouse LCP >= current baseline |

---

## Sources

- Direct codebase inspection: `src/styles/global.css` (overlay z-index values, `.tone-image` class, `@keyframes` reduced-motion gates), `src/components/ElevationProfile.astro` (annotation label construction, display callback), `src/components/LizardBackground.astro` (z-9997, `will-change: transform`), `src/pages/index.astro` (tone image usage pattern), `src/components/GravelSectors.astro` (`isolation: isolate` pattern) — HIGH confidence
- `.planning/debug/down-jeep-label.md` — root cause analysis of Down Jeep annotation visibility, including sector widths and recommended fix — HIGH confidence
- [chartjs-plugin-annotation Box Annotations documentation](https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/types/box.html) — label overflow behavior, no box-level clipping in v2+ — HIGH confidence
- [chartjs-plugin-annotation Configuration documentation](https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/configuration.html) — `clip` option (clips to chart area only) — HIGH confidence
- [MDN: CSS filter property](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/filter) — filter functions operate in sRGB linearized color space — HIGH confidence
- [web.dev: Optimize Cumulative Layout Shift](https://web.dev/articles/optimize-cls) — absolute positioned images do not contribute to CLS; in-flow images without dimensions do — HIGH confidence
- [Aleksandr Hovhannisyan: Set width and height on images](https://www.aleksandrhovhannisyan.com/blog/setting-width-and-height-on-images/) — CLS prevention pattern for in-flow images — MEDIUM confidence (community source, consistent with web.dev)

---
*Pitfalls research for: CSS-filtered editorial layout + Chart.js annotation label fix on MK Ultra Gravel dark-themed Astro 6 site*
*Researched: 2026-04-13*
