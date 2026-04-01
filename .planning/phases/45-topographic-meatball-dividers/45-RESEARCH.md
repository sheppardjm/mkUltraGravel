# Phase 45: Topographic Meatball Dividers - Research

**Researched:** 2026-03-31
**Domain:** SVG animation, IntersectionObserver, Astro components
**Confidence:** HIGH

---

## Summary

Phase 45 requires building `TopoDivider.astro`, a reusable component that renders a "hollow topographic meatball" — concentric rings that look like topo contour lines — between page sections on `index.astro`. The rings must draw in via `stroke-dashoffset` animation triggered by `IntersectionObserver` when the component scrolls into view. A `prefers-reduced-motion` gate disables the animation for users who prefer it.

The key technical problem is converting the codepen's canvas+SVG-filter approach (runtime-animated blobs → topo rings via `feGaussianBlur` + discrete `feFuncA`) into a static SVG that can drive a stroke-based draw-in. Two viable approaches exist: (1) pre-draw concentric `<circle>` elements with `stroke-dashoffset` animation — clean, maintainable, mathematically predictable; (2) inline SVG filter (`feGaussianBlur` + discrete `feFuncA`) applied to a static radial gradient blob — visually closer to the codepen but the filter rasterizes the output and cannot drive per-ring stroke animation. Approach 1 is the correct production choice.

The codebase already has a mature `IntersectionObserver` + `data-reveal` pattern (centralized in `index.astro`) and consistent `prefers-reduced-motion` gating in both CSS and JS. `TopoDivider.astro` should follow the same self-contained component pattern as `EscherLizards.astro` — inline SVG + scoped `<style>` + optional `<script>` block.

**Primary recommendation:** Build `TopoDivider.astro` as a pure SVG component with 4–6 concentric `<circle>` elements using `pathLength="1"` normalization, animated with CSS keyframes (`stroke-dashoffset: 1 → 0`) triggered by an IntersectionObserver class toggle, gated by `prefers-reduced-motion`.

---

## Standard Stack

No new npm packages are needed. This phase uses browser-native APIs and existing project infrastructure.

### Core
| Technology | Version | Purpose | Why Standard |
|------------|---------|---------|--------------|
| Inline SVG (`<circle>`) | SVG 1.1 / SVG 2 | Concentric ring shapes with stroke | No canvas, no JS required for static rendering |
| CSS `stroke-dashoffset` animation | CSS Animations Level 1 | Draw-in effect | Standard SVG stroke technique; GPU-composited |
| `pathLength="1"` | SVG 2 | Normalize stroke-dasharray/offset to 0–1 range | Avoids `2πr` circumference math for each radius |
| `IntersectionObserver` | Browser API | Trigger draw-in on scroll | Already used in `RouteMap.astro`, `ElevationProfile.astro`, and `index.astro` (revealObserver) |
| `prefers-reduced-motion` | CSS Media Query | Static fallback | Already gated in `global.css` and `index.astro` |
| Astro component | Astro 6.1.1 | Component wrapper | Project framework |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Concentric `<circle>` + stroke-dashoffset | SVG filter (feGaussianBlur + feFuncA) on radial gradient | Filter produces correct visual but rasterizes — can't animate individual rings; performance cost |
| Concentric `<circle>` + stroke-dashoffset | Canvas-rendered SVG filter (codepen approach) | Canvas requires JS, can't be static, heavier; original codepen is continuous JS animation not scroll-triggered |
| CSS `@keyframes` animation | GSAP / Web Animations API | GSAP is overkill; no animation library in project; WAA is lower-level without benefit here |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
└── components/
    └── TopoDivider.astro    # new — concentric ring SVG divider
src/
└── pages/
    └── index.astro          # add <TopoDivider /> between 2+ sections
```

### Pattern 1: Concentric Circle SVG with pathLength Normalization

**What:** 4–6 `<circle>` elements share the same center, increasing radii, `fill="none"`, stroked with the project's accent-green color. Each circle uses `pathLength="1"` so `stroke-dasharray="1" stroke-dashoffset="1"` works without computing circumference.

**When to use:** Whenever you need stroke-based path draw-in on circle primitives — avoids `getTotalLength()` JS calls.

**Example:**
```svg
<!-- Source: MDN pathLength docs, confirmed HIGH confidence -->
<svg viewBox="0 0 200 200" aria-hidden="true" class="topo-divider">
  <circle cx="100" cy="100" r="20"  fill="none" stroke="currentColor" stroke-width="1.5"
          pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" class="ring ring-1" />
  <circle cx="100" cy="100" r="38"  fill="none" stroke="currentColor" stroke-width="1.5"
          pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" class="ring ring-2" />
  <circle cx="100" cy="100" r="56"  fill="none" stroke="currentColor" stroke-width="1.5"
          pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" class="ring ring-3" />
  <circle cx="100" cy="100" r="74"  fill="none" stroke="currentColor" stroke-width="1.5"
          pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" class="ring ring-4" />
</svg>
```

### Pattern 2: CSS Class-Toggle Draw-In Animation

**What:** IntersectionObserver adds a class (e.g., `is-drawn`) to the SVG wrapper element. CSS uses that class + `:nth-child` to trigger staggered `stroke-dashoffset` transitions on each ring with increasing `animation-delay`. The initial `opacity: 0` state is applied on the SVG and removed when the observer fires.

**When to use:** One-shot scroll-triggered animation where rings trace themselves in sequentially.

**Example:**
```css
/* Source: Project pattern from data-reveal + global.css, extended for SVG strokes */
.topo-divider .ring {
  stroke-dashoffset: 1;
  transition: stroke-dashoffset 0.8s ease-out;
}

.topo-divider.is-drawn .ring-1 { stroke-dashoffset: 0; transition-delay: 0s; }
.topo-divider.is-drawn .ring-2 { stroke-dashoffset: 0; transition-delay: 0.1s; }
.topo-divider.is-drawn .ring-3 { stroke-dashoffset: 0; transition-delay: 0.2s; }
.topo-divider.is-drawn .ring-4 { stroke-dashoffset: 0; transition-delay: 0.3s; }

@media (prefers-reduced-motion: reduce) {
  .topo-divider .ring {
    stroke-dashoffset: 0;  /* immediately visible */
    transition: none;
  }
}
```

### Pattern 3: Self-Contained Component IntersectionObserver

**What:** `TopoDivider.astro` includes its own `<script>` block that wires an IntersectionObserver to elements with a data attribute (e.g., `data-topo-divider`). This is self-contained — no changes needed to `index.astro`'s existing `initReveal()` observer, which only handles `[data-reveal]` elements.

**When to use:** When a component needs its own scroll-triggered behavior not covered by the centralized observer.

**Example:**
```typescript
// Source: RouteMap.astro and ElevationProfile.astro patterns in this project
function initTopoDividers() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    // Skip observer — CSS already renders rings at dashoffset: 0
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-drawn");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: "0px 0px -60px 0px",  // Trigger slightly before bottom edge
      threshold: 0.1,
    }
  );

  document.querySelectorAll("[data-topo-divider]").forEach((el) => {
    observer.observe(el);
  });
}

// Astro View Transitions support
document.addEventListener("astro:page-load", initTopoDividers);
if (!document.querySelector("[data-astro-transition]")) {
  initTopoDividers();
}
```

### Pattern 4: EscherLizards.astro Structural Template

**What:** `EscherLizards.astro` is the closest existing component — pure inline SVG, no props, scoped `<style>`, no frontmatter JS. `TopoDivider.astro` should follow the same structure but add a `<script>` block for the IntersectionObserver.

**Key difference:** `EscherLizards` uses `<pattern>` for tiling; `TopoDivider` uses direct `<circle>` elements with stroke animation. EscherLizards has no animation (CSS drift is on the outer wrapper); TopoDivider needs JS-triggered class toggle.

### Pattern 5: Placement Between Sections on index.astro

**What:** `TopoDivider` is a divider, not a background. It should be placed in a `<div>` between `<section>` elements, not inside them. The existing `border-t border-border` divider `<div>` between the route section and sectors section (lines 272–284, `index.astro`) is a natural insertion point. A second placement between `#sectors` and `#photos` is also viable.

**Current index.astro section order:**
1. `#hero` (MkUltraExplainer inside)
2. `#route` (RouteMap, ElevationProfile) — separated by `border-t border-border` div with CTA
3. `#sectors` (GravelSectors, KomSegments, RestockPoints)
4. `#photos` (PhotoGallery)
5. `#info` (EventInfoBlock)

**Recommended placements:**
- Replace or augment the existing CTA div between `#route` and `#sectors` (already has `border-t border-border`)
- Add between `#sectors` and `#photos` (requires new wrapper div)

### Anti-Patterns to Avoid

- **Using the canvas+filter approach from the codepen:** The codepen's `requestAnimationFrame` loop running 15 orbiting dots is a continuous runtime animation — it cannot be paused to a static "drawn" state, requires canvas, and is incompatible with `stroke-dashoffset` draw-in. Do not port this approach.
- **Using SVG `<filter>` alone for draw-in:** Applying `feGaussianBlur + feFuncA discrete` to a static radial gradient produces the topo ring visual, but the output is a rasterized bitmap inside the filter composite pipeline — you cannot animate individual ring strokes with `stroke-dashoffset` on a filtered element. Use for visual variation only, not animation.
- **Calling `getTotalLength()` on circles:** The `pathLength="1"` normalization eliminates the need for `getTotalLength()`. Using `getTotalLength()` is error-prone at SSR time (Astro may execute the `<script>` block before the SVG is in the DOM) and unnecessary.
- **Piggybacking on index.astro's `revealObserver`:** The existing `revealObserver` only adds `is-visible` class + CSS animation via `--animate-reveal`. Topo draw-in needs `is-drawn` class toggling `stroke-dashoffset`. Keep separate observers.
- **Animating with CSS `animation` on `stroke-dashoffset`:** CSS `animation: dash Xs ease-out forwards` from initial hidden state will play immediately on page load regardless of scroll position. Use CSS `transition` instead — it only fires when the class changes via the IntersectionObserver trigger. Or use `animation-play-state: paused` + running on class add.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Path length for circles | Custom `getTotalLength()` call | `pathLength="1"` attribute | Built into SVG spec; avoids DOM measurement, SSR-safe |
| Scroll detection | Scroll event listeners with debouncing | `IntersectionObserver` | Already the project pattern; performant, correct threshold handling |
| Animation library | GSAP/anime.js | CSS transition + class toggle | No new dependencies; GPU-composited stroke animation works natively |

**Key insight:** This phase needs no new dependencies. All primitives (SVG circles, CSS transitions, IntersectionObserver, media queries) are browser-native and already used in the project.

---

## Common Pitfalls

### Pitfall 1: SVG Filter Cannot Drive stroke-dashoffset Animation
**What goes wrong:** Developer tries to apply the codepen's `feGaussianBlur + feFuncA discrete` filter to SVG circle elements and also animate their `stroke-dashoffset`. The filter pipeline composites the output into a bitmap — the rings exist as alpha bands in the pixel output, not as individual stroked paths. `stroke-dashoffset` has no effect on filter-composited shapes.
**Why it happens:** The codepen creates the ring visual via filter effects on canvas pixels, not via SVG stroke properties. The visual _looks_ like concentric ring strokes but is actually quantized alpha bands.
**How to avoid:** Use concentric `<circle>` elements with explicit radii and strokes — these are real SVG path primitives that respond to `stroke-dashoffset`. The visual will look like hand-drawn topo rings, which is appropriate for the gravel/elevation aesthetic.
**Warning signs:** If you find yourself blurring circle elements to get them to "merge" like the codepen — stop. That path requires canvas.

### Pitfall 2: Animation Fires on Page Load (Not on Scroll)
**What goes wrong:** CSS `@keyframes` with `animation: draw 1s forwards` applies immediately when the element renders, regardless of scroll position. If the divider is off-screen, the animation plays while hidden and the element appears fully drawn when scrolled to.
**Why it happens:** CSS animations fire on class/property assignment, not on viewport entry.
**How to avoid:** Use CSS `transition` (not `animation`) on `stroke-dashoffset`. Set initial state `stroke-dashoffset: 1`, then add `is-drawn` class via IntersectionObserver — the `transition` fires when the class is added.
**Alternative:** Use `animation-play-state: paused` initially and switch to `running` on class add — but the transition approach is simpler.

### Pitfall 3: SSR-Unsafe DOM Queries in Astro Script Blocks
**What goes wrong:** Running `document.querySelector` or `el.getTotalLength()` in the Astro script block at module-level (outside `document.addEventListener`) causes errors during SSR or before the DOM is ready.
**Why it happens:** Astro 6.x runs `<script>` blocks as client-side ES modules, but only if you defer DOM access until after the event fires.
**How to avoid:** Wrap all DOM queries in `initTopoDividers()` called from `document.addEventListener("astro:page-load", ...)` — exactly as done in `RouteMap.astro` and `ElevationProfile.astro`.

### Pitfall 4: Stacking Context Interference from Phase 44 Tone Images
**What goes wrong:** Tone images in `#sectors` use `isolation: isolate` on the first two sector cards (line 21, `GravelSectors.astro`). If `TopoDivider` is placed inside a section with tone images, the stacking contexts from `mix-blend-mode: lighten` may visually interact with the divider.
**Why it happens:** `mix-blend-mode` creates new stacking contexts.
**How to avoid:** Place `TopoDivider` as a sibling between `<section>` elements (not inside them). The existing inter-section `<div>` wrapper pattern provides a clean stacking context.

### Pitfall 5: stroke-dashoffset on Elements with fill
**What goes wrong:** If `fill` is not explicitly `none` on the circle elements, the circles render as filled disks — the topo ring effect disappears because fills are opaque.
**How to avoid:** Always set `fill="none"` on all ring `<circle>` elements.

### Pitfall 6: Reduced-Motion Gate Applied Only in JS, Not CSS
**What goes wrong:** If only the JS observer is skipped for reduced-motion users, and CSS still has `stroke-dashoffset: 1` as the initial state, users with JS disabled or prefers-reduced-motion will see invisible rings.
**How to avoid:** Apply `stroke-dashoffset: 0` in the `prefers-reduced-motion: reduce` media query in CSS — rings render statically without draw-in. The JS gate is a defense-in-depth optimization (skip the observer entirely), but CSS must be the primary fallback.

---

## Code Examples

Verified patterns from project source and official docs:

### Complete TopoDivider Component Skeleton
```astro
---
// TopoDivider.astro
// No props needed — reusable as-is
---

<svg
  class="topo-divider"
  data-topo-divider
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 200 200"
  aria-hidden="true"
  width="200"
  height="200"
>
  <circle cx="100" cy="100" r="18"  fill="none" stroke="currentColor" stroke-width="1.5" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" class="ring ring-1" />
  <circle cx="100" cy="100" r="34"  fill="none" stroke="currentColor" stroke-width="1.5" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" class="ring ring-2" />
  <circle cx="100" cy="100" r="52"  fill="none" stroke="currentColor" stroke-width="1.5" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" class="ring ring-3" />
  <circle cx="100" cy="100" r="70"  fill="none" stroke="currentColor" stroke-width="1.5" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" class="ring ring-4" />
  <circle cx="100" cy="100" r="88"  fill="none" stroke="currentColor" stroke-width="1.2" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" class="ring ring-5" />
</svg>

<style>
  .topo-divider {
    display: block;
    color: var(--color-accent-green);
    opacity: 0.5;
  }

  .topo-divider .ring {
    stroke-dashoffset: 1;
    transition: stroke-dashoffset 1s ease-out;
  }

  .topo-divider.is-drawn .ring-1 { stroke-dashoffset: 0; transition-delay: 0ms; }
  .topo-divider.is-drawn .ring-2 { stroke-dashoffset: 0; transition-delay: 100ms; }
  .topo-divider.is-drawn .ring-3 { stroke-dashoffset: 0; transition-delay: 200ms; }
  .topo-divider.is-drawn .ring-4 { stroke-dashoffset: 0; transition-delay: 300ms; }
  .topo-divider.is-drawn .ring-5 { stroke-dashoffset: 0; transition-delay: 400ms; }

  /* Reduced-motion: rings static, immediately visible */
  @media (prefers-reduced-motion: reduce) {
    .topo-divider .ring {
      stroke-dashoffset: 0;
      transition: none;
    }
  }
</style>

<script>
  function initTopoDividers() {
    // Respect prefers-reduced-motion — skip observer, CSS handles static state
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-drawn");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "0px 0px -60px 0px",
        threshold: 0.1,
      }
    );

    document.querySelectorAll("[data-topo-divider]").forEach((el) => {
      observer.observe(el);
    });
  }

  // Astro View Transitions support (mirrors index.astro pattern)
  document.addEventListener("astro:page-load", initTopoDividers);
  if (!document.querySelector("[data-astro-transition]")) {
    initTopoDividers();
  }
</script>
```

### Placement in index.astro (between route CTA div and sectors section)
```astro
<!-- Source: index.astro lines 272–286, project convention -->
<div class="relative px-4 py-12 text-center border-t border-border">
  <!-- existing CTA content -->
  <TopoDivider />
</div>

<section id="sectors" ...>
  ...
</section>
```

### pathLength Normalization (confirmed HIGH confidence)
```svg
<!-- pathLength="1" means dasharray/dashoffset work on 0–1 scale -->
<!-- No need to compute 2πr circumference for each circle radius -->
<circle cx="50" cy="50" r="40"
  pathLength="1"
  stroke-dasharray="1"
  stroke-dashoffset="1"
  fill="none"
  stroke="green"
/>
<!-- Animate dashoffset 1 → 0 to draw the full circle -->
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Canvas + SVG filter (codepen approach) | Static SVG `<circle>` + `stroke-dashoffset` | No JS animation loop; scroll-triggered; accessible |
| `getTotalLength()` for dash calculation | `pathLength="1"` normalization | SSR-safe; no DOM measurement; any radius works |
| GSAP ScrollTrigger | `IntersectionObserver` + CSS `transition` | Zero dependencies; GPU-composited |
| CSS `@keyframes` with `animation-fill-mode: forwards` | CSS `transition` on class toggle | Only fires on scroll entry, not on page load |

**Deprecated/outdated:**
- Canvas-based metaball animation: Works for the codepen demo but is the wrong architecture for a static Astro site divider.

---

## Open Questions

1. **SVG filter visual (optional enhancement)**
   - What we know: `feGaussianBlur` + discrete `feFuncA` can produce topographic ring visual from a radial gradient in inline SVG without canvas. Confirmed by MDN and the codepen.
   - What's unclear: Whether this effect looks good enough as a static background layer behind the concentric circle strokes — could add depth if combined.
   - Recommendation: Start with concentric circles only (meets all requirements). Planner can add as optional task if aesthetic requires more texture.

2. **Ring count and radii spacing**
   - What we know: Codepen uses ~15 overlapping blobs; the topo ring visual is created by the filter. The static SVG approach needs explicit ring choices.
   - What's unclear: Optimal ring count (4 vs 5 vs 6) and radii spacing for the gravel/topo aesthetic at typical container widths (320px–1200px).
   - Recommendation: 5 rings with even spacing (~18px gap per ring) fitting a 200×200 viewBox. The SVG will scale responsively. Planner should make this a configurable decision or plan a quick visual calibration step.

3. **Placement: replace vs. augment the CTA divider div**
   - What we know: The existing `border-t border-border` CTA div between `#route` and `#sectors` is a natural divider slot. `TopoDivider` could go inside it or replace the entire div.
   - What's unclear: Whether the existing "Register Now" CTA should be removed or kept alongside the topo divider.
   - Recommendation: Keep the CTA div; add `<TopoDivider />` above or below the existing CTA content. This is a layout decision for the planner — does not affect the component build.

---

## Sources

### Primary (HIGH confidence)
- MDN `stroke-dashoffset` documentation — draw-in animation pattern, value semantics
- MDN `pathLength` attribute documentation — 0–1 normalization confirmed, code example verified
- MDN `IntersectionObserver API` — constructor options, callback signature, one-shot pattern
- MDN `feComponentTransfer / feFuncA type=discrete` — tableValues semantics, ring banding mechanism
- Project `src/pages/index.astro` — existing IntersectionObserver pattern, prefers-reduced-motion gate, section structure
- Project `src/components/EscherLizards.astro` — component pattern to follow
- Project `src/styles/global.css` — prefers-reduced-motion CSS patterns, animate-reveal token
- Project `codepen/metaballs/index.html` — source of truth for the topo filter approach (canvas+filter)

### Secondary (MEDIUM confidence)
- CSS-Tricks "How SVG Line Animation Works" — getTotalLength() approach (superseded by pathLength normalization for circles)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all browser-native APIs; project already uses all of them
- Architecture (concentric circles + dashoffset): HIGH — MDN confirmed, pathLength normalization confirmed
- Architecture (SVG filter on circles): HIGH — MDN confirmed filter works in inline SVG; LOW on whether it looks good alongside stroke animation (needs visual testing)
- IntersectionObserver pattern: HIGH — two existing examples in codebase to follow exactly
- Pitfalls: HIGH — all derived from actual code in the project or official spec behavior

**Research date:** 2026-03-31
**Valid until:** 2026-05-01 (stable browser APIs; 30-day validity)
