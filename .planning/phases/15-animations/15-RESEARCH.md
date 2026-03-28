# Phase 15: Animations - Research

**Researched:** 2026-03-27
**Domain:** CSS animations, IntersectionObserver scroll-reveal, brutalist motion aesthetics, Lighthouse TBT safety
**Confidence:** HIGH

---

## Summary

Phase 15 adds three categories of motion to the MK Ultra Gravel site: (1) hover/click feedback on cards and buttons, (2) scroll-reveal entrance animations on sections and card lists, and (3) prefers-reduced-motion compliance across all of them. The site is Astro 6 + Tailwind v4 with no JS framework — all animation work is CSS keyframes + vanilla JS IntersectionObserver.

The correct approach requires zero new npm dependencies. Tailwind v4 already ships `motion-safe:` and `motion-reduce:` variants, `transition-*` utilities, `active:` states, and supports custom `@keyframes` defined inside the `@theme` block in `global.css`. Scroll-reveal needs ~15 lines of vanilla JS in a `<script>` tag inside the Astro component that contains the card list — the IntersectionObserver marks elements `.is-visible` when they enter the viewport, and CSS handles the actual animation.

The key constraint from the phase description: **no smooth ease-in-out curves** on hover states. Brutalist hard shifts use `transition-duration: 0ms` (`duration-0`) or `ease-[steps(1)]` on transforms, or simply no transition at all (instant state change). Box-shadow animation is the one property that requires special handling — direct `box-shadow` transitions are compositor-unsafe; the correct pattern is a pseudo-element `::after` holding the elevated shadow, animated via `opacity` transition instead.

**Primary recommendation:** Pure CSS (Tailwind utility classes + custom keyframes in `global.css`) for hover/click states; vanilla JS IntersectionObserver for scroll-reveal; `motion-safe:` prefix on all animation classes. Zero new dependencies.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS v4 | 4.2.2 (already installed) | `motion-safe:`, `active:`, `hover:`, `transition-*`, `animate-*` utilities | CSS-first config, already in project |
| CSS `@keyframes` in `@theme` | native | Custom entrance animations (fade+slide) | Tailwind v4 pattern: `--animate-*` vars inside `@theme` block |
| IntersectionObserver API | browser-native, Baseline 2019 | Trigger `.is-visible` class when elements scroll into viewport | No JS dependency, async off main thread |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS `steps()` timing function | native | Hard-snap hover shifts (brutalist aesthetic) | Hover transforms that must be instantaneous |
| CSS pseudo-element shadow trick | native | Performant box-shadow "animation" | When a card needs a shadow shift on hover |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vanilla IntersectionObserver | AOS (Animate On Scroll library) | AOS adds ~6KB JS + requires npm install; IntersectionObserver is 15 lines and already used in this codebase (RouteMap + ElevationProfile use it for lazy init) |
| Vanilla IntersectionObserver | GSAP ScrollTrigger | GSAP is heavy (~45KB), not justified for simple fade+slide |
| `motion-safe:` Tailwind variant | `@media (prefers-reduced-motion: no-preference)` in CSS | Equivalent, but Tailwind variant is already available and DRYer |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── styles/
│   └── global.css           # Add @keyframes + --animate-* vars inside @theme
├── components/
│   ├── GravelSectors.astro  # Add scroll-reveal <script> + data-reveal attrs
│   ├── KomSegments.astro    # Add scroll-reveal <script> + data-reveal attrs
│   └── [others].astro       # Add hover/active utility classes inline
└── pages/
    └── index.astro          # Section-level scroll-reveal data attrs
```

### Pattern 1: Brutalist Hard-Shift Hover (Tailwind utility classes)

**What:** Hover state produces an instant visual shift — no easing, no duration. Transform and box-shadow jump to new value the moment cursor enters.

**When to use:** Sector cards, KOM cards, all `classified-border` card containers.

**How the hard shift works in CSS:** Use `duration-0` (sets `transition-duration: 0ms`) paired with `transition-transform`. Or, for a truly instantaneous box-shadow effect, use the pseudo-element opacity trick below.

```html
<!-- Source: Tailwind v4 docs — hover-focus-and-other-states + transition-duration -->
<!-- Hard transform snap on hover: instant translate with no easing -->
<div class="classified-border bg-bg-surface overflow-hidden
            transition-transform duration-0
            hover:-translate-y-0.5 hover:translate-x-0.5
            motion-reduce:transition-none motion-reduce:hover:transform-none">
  <!-- card content -->
</div>
```

**For box-shadow hard shift:** Direct `transition: box-shadow` is compositor-unsafe (causes repaint). Use the pseudo-element trick:

```css
/* Source: tobiasahlin.com/blog/how-to-animate-box-shadow/ — verified */
/* In global.css @layer components */
.card-hover {
  position: relative;
}
.card-hover::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  box-shadow: 4px 4px 0 0 var(--color-accent-green);
  opacity: 0;
  transition: opacity 0ms step-start; /* hard snap */
}
.card-hover:hover::after {
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  .card-hover::after { transition: none; }
}
```

### Pattern 2: Active/Click Feedback (CSS active: state)

**What:** Pressing a button or card produces a visible downward shift — immediate feedback that registers the click.

**When to use:** Register Now CTAs, Download GPX button, all buttons.

```html
<!-- Source: Tailwind v4 docs — active: variant -->
<a class="inline-block bg-accent-green text-bg-base font-bold uppercase tracking-widest
          px-8 py-4 text-lg
          hover:opacity-90 transition-opacity
          active:translate-y-px active:scale-[0.98]
          transition-transform duration-0
          motion-safe:transition motion-reduce:transition-none">
  Register Now
</a>
```

**Note:** `active:` maps to CSS `:active` pseudo-class. It fires on mousedown and touch, giving immediate click feedback without JavaScript.

### Pattern 3: Scroll-Reveal Entrance Animations (IntersectionObserver)

**What:** Elements fade+slide into view as the page scrolls down. Initial state: `opacity: 0; transform: translateY(16px)`. Visible state: `opacity: 1; transform: translateY(0)`.

**When to use:** Section headings, card lists (GravelSectors, KomSegments), RestockPoints.

**Step 1:** Define keyframe + utility in `global.css @theme` block:

```css
/* Source: Tailwind v4 docs — custom @keyframes in @theme */
@theme {
  --animate-reveal: reveal 0.35s ease-out both;

  @keyframes reveal {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}

/* In @layer utilities — initial hidden state + triggered state */
@layer utilities {
  [data-reveal] {
    opacity: 0;
  }
  [data-reveal].is-visible {
    animation: var(--animate-reveal);
  }
  @media (prefers-reduced-motion: reduce) {
    [data-reveal] {
      opacity: 1 !important;
      animation: none !important;
    }
  }
}
```

**Step 2:** Add `data-reveal` attribute to elements, add stagger via `data-reveal-delay`:

```html
<!-- In GravelSectors.astro -->
{sectors.map((sector, i) => (
  <div
    class="classified-border bg-bg-surface overflow-hidden card-hover"
    data-reveal
    style={`animation-delay: ${i * 60}ms`}
  >
    <!-- card content -->
  </div>
))}
```

**Step 3:** Vanilla JS IntersectionObserver in an Astro `<script>` tag:

```javascript
// Source: MDN IntersectionObserver API — verified
// Place in component <script> tag (Astro bundles and dedupes automatically)
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target); // fire once
      }
    });
  },
  {
    rootMargin: "0px 0px -40px 0px", // trigger 40px before bottom edge
    threshold: 0.05,
  }
);

document.querySelectorAll("[data-reveal]").forEach((el) => {
  revealObserver.observe(el);
});
```

**Critical:** `unobserve(entry.target)` after triggering ensures the observer doesn't hold references or fire repeatedly. This keeps the pattern leak-free.

### Pattern 4: Shared Script Deduplication in Astro

**What:** Astro deduplicates `<script>` tags with identical content across multiple components. If `GravelSectors.astro` and `KomSegments.astro` both include the same IntersectionObserver script, Astro emits it once.

**When to use:** The scroll-reveal IntersectionObserver can be placed in one component's `<script>` and it will work for all `[data-reveal]` elements across the page via `document.querySelectorAll`.

**Recommendation:** Put the IntersectionObserver script in a single `<script>` tag in `index.astro` or extract to a shared script file. Avoids any potential duplicate-observer risk.

### Anti-Patterns to Avoid

- **Smooth easing on hover cards:** `ease-in-out` with `duration-150` or `duration-300` is not brutalist. Use `duration-0` or no transition at all for transform/translate hover shifts.
- **Animating `box-shadow` directly via `transition-shadow`:** This triggers compositor-unsafe repaints. Use the `::after` opacity trick instead.
- **Animating `width`, `height`, `top`, `left`, `margin`, `padding`:** These trigger layout recalculation. Only `transform` and `opacity` are GPU-compositor-safe. Phase 9 already verified this constraint applies.
- **Adding `will-change: transform` to all cards preemptively:** Use sparingly — only on elements that are actively animating, not as a blanket default. Excess `will-change` creates unnecessary GPU layers and increases memory pressure.
- **Heavy IntersectionObserver callbacks:** Keep the callback to `classList.add()` + `unobserve()` only. No DOM queries, no `getBoundingClientRect()` calls inside the callback.
- **Not calling `unobserve()`:** Without unobserving after the element becomes visible, the observer holds element references indefinitely. For one-shot reveal animations, always unobserve.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scroll position detection | Manual `scroll` event listener with `getBoundingClientRect()` | `IntersectionObserver` | IntersectionObserver runs async off main thread; scroll listeners run sync on main thread and contribute to TBT |
| Animation on reduced-motion | Custom JS to detect `matchMedia('(prefers-reduced-motion)')` | `motion-safe:` Tailwind variant + CSS `@media (prefers-reduced-motion: reduce)` | Already built into Tailwind v4; zero JS needed |
| Box-shadow animation | `transition-shadow` on the element | `::after` pseudo-element with `opacity` transition | Direct `box-shadow` transition triggers repaint on every frame; pseudo-element approach stays compositor-safe |
| Staggered card delays | JS-computed `setTimeout` per card | CSS `animation-delay` inline style (`style="animation-delay: ${i * 60}ms"`) | Computed at build time in Astro template; zero runtime JS |

**Key insight:** The IntersectionObserver API is already used in this codebase for lazy-loading the map and elevation chart. Phase 15 reuses the same pattern — the scroll-reveal observer is a simpler version of what's already proven to work.

---

## Common Pitfalls

### Pitfall 1: Breaking the 0ms TBT Baseline

**What goes wrong:** Adding a `scroll` event listener (instead of IntersectionObserver) to trigger reveal animations. Scroll events fire synchronously on the main thread and, if the callback does any meaningful work, can create Long Tasks (>50ms) that register as TBT.

**Why it happens:** Devs reach for `window.addEventListener('scroll', ...)` because it's familiar. IntersectionObserver is less well-known but is the correct tool.

**How to avoid:** Use only IntersectionObserver for scroll-triggered behavior. Keep IntersectionObserver callbacks minimal: one `classList.add()` call + `unobserve()`.

**Warning signs:** Lighthouse TBT > 0ms after adding animations; Chrome Performance panel showing Long Tasks during page scroll.

### Pitfall 2: Smooth Easing on Hover (Wrong Brutalist Aesthetic)

**What goes wrong:** Using `transition hover:scale-105 duration-300 ease-in-out` produces a smooth scale-up on cards. This looks like generic SaaS UI, not brutalist design.

**Why it happens:** Tailwind's default transition duration is 150ms with `ease-in-out`. Adding `transition` without explicit `duration-0` will produce smooth animation.

**How to avoid:** For brutalist hard shifts, use `duration-0` explicitly. Or omit `transition` entirely and apply `hover:` class changes that have no easing — state changes with no transition declared are always instant.

**Correct pattern:** `hover:-translate-y-0.5 hover:translate-x-0.5 transition-transform duration-0` — the transform changes instantly.

### Pitfall 3: CSS `[data-reveal]` Elements Invisible When JS Disabled

**What goes wrong:** If you set `opacity: 0` on `[data-reveal]` and JS fails to load, all reveal-targeted elements remain invisible forever.

**Why it happens:** The reveal pattern depends on JS adding `.is-visible` to unblock visibility.

**How to avoid:** The `@media (prefers-reduced-motion: reduce)` rule that sets `opacity: 1 !important; animation: none !important;` covers the no-JS case incidentally (most no-JS environments also don't report motion preferences). More robustly, use `<noscript>` CSS or prefer the JS-adds-initial-class pattern: add `data-reveal` via JS so the hidden state is only applied when JS is running.

**Recommended approach:** In the IntersectionObserver script, add `data-reveal-ready` to `<html>` on DOMContentLoaded, and target `[data-reveal-ready] [data-reveal]` in CSS for the opacity: 0 initial state. This way, without JS, elements are fully visible.

### Pitfall 4: Multiple IntersectionObserver Instances Across Components

**What goes wrong:** If `GravelSectors.astro`, `KomSegments.astro`, and `RestockPoints.astro` each create their own IntersectionObserver, there are three observers doing the same job. Astro deduplicates identical script content, but if there are slight differences, all three run.

**Why it happens:** Natural instinct to co-locate the observer with the component.

**How to avoid:** Centralize the scroll-reveal IntersectionObserver in one place — a single `<script>` in `index.astro` or a shared `src/scripts/scroll-reveal.js` file imported once. The observer uses `document.querySelectorAll("[data-reveal]")` so it covers all elements regardless of which component rendered them.

### Pitfall 5: Box-Shadow `transition-shadow` Causing Repaint TBT

**What goes wrong:** Adding `transition-shadow hover:shadow-accent-green` to cards to get a glow effect on hover. Every frame of the transition repaints the element (box-shadow is not GPU-composited).

**Why it happens:** `transition-shadow` looks harmless in Tailwind; the performance cost is invisible until measured.

**How to avoid:** Use the pseudo-element opacity trick (see Pattern 1). The shadow is pre-rendered in `::after`; only `opacity` animates, which is compositor-safe.

---

## Code Examples

Verified patterns from official sources:

### Custom @keyframes in Tailwind v4 @theme

```css
/* Source: tailwindcss.com/docs/animation — Tailwind v4 CSS-first config */
@theme {
  --animate-reveal: reveal 0.35s ease-out both;

  @keyframes reveal {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
}
```

### motion-safe: Variant (Tailwind v4)

```html
<!-- Source: tailwindcss.com/docs/hover-focus-and-other-states -->
<!-- Cleaner than motion-reduce: because no need to "undo" -->
<div class="motion-safe:animate-reveal ...">content</div>
```

### motion-reduce: Variant for Transitions

```html
<!-- Source: tailwindcss.com/docs/transition-property -->
<button class="transition hover:-translate-y-0.5
               motion-reduce:transition-none
               motion-reduce:hover:translate-y-0">
  Click me
</button>
```

### active: State for Click Feedback

```html
<!-- Source: tailwindcss.com/docs/hover-focus-and-other-states -->
<a class="... active:translate-y-px active:scale-[0.98]
          transition-transform duration-0
          motion-reduce:transition-none">
  Register Now
</a>
```

### IntersectionObserver Scroll-Reveal (Vanilla JS)

```javascript
// Source: MDN IntersectionObserver API (Baseline since 2019)
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target); // fire once, release reference
      }
    });
  },
  { rootMargin: "0px 0px -40px 0px", threshold: 0.05 }
);

document.querySelectorAll("[data-reveal]").forEach((el) => {
  revealObserver.observe(el);
});
```

### step-start for Instantaneous CSS Transitions

```css
/* Source: MDN CSS transition-timing-function — step-start syntax */
/* For hard snap with explicit transition property (not duration-0) */
.element {
  transition: transform 1ms step-start;
}
.element:hover {
  transform: translate(-2px, -2px);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `scroll` event listener for reveal | `IntersectionObserver` | ~2019 (Baseline) | Off main thread, no TBT risk |
| `tailwind.config.js` for custom keyframes | `@theme { @keyframes ... }` in CSS | Tailwind v4 (2024) | CSS-first, no JS config file |
| `@media (prefers-reduced-motion: no-preference)` wrapper | `motion-safe:` variant prefix | Tailwind v3+ | DRYer, utility-first |
| Direct `box-shadow` transition | `::after` pseudo-element opacity | Best practice since ~2015 | Compositor-safe, no repaint |
| CSS Scroll-Driven Animations (`animation-timeline`) | IntersectionObserver (for this project) | Chrome 115+ / partial support | `animation-timeline` has incomplete browser support as of 2026 — Firefox and Safari support is still catching up for some use cases. IntersectionObserver is more reliable for cross-browser. |

**Deprecated/outdated:**
- `ScrollReveal.js` library: Adds unnecessary JS payload when IntersectionObserver is native and ~15 lines.
- jQuery `.animate()` for scroll effects: Not applicable to this stack.
- GSAP for simple fade-in: Overkill — 45KB for what 15 lines of vanilla JS handles.

---

## Codebase Context

Critical facts about this specific project that affect how Phase 15 should be planned:

**Existing animation precedent (Phase 9 verified):**
- `transition-opacity` on two CTA buttons — already in use
- `transition-transform hover:scale-105` on gallery thumbnails — already in use
- `transition-colors` on the GPX download link — already in use
- `.redacted-reveal:hover` uses `transition: color 0.2s ease, background-color 0.2s ease` with `motion-reduce` — already in use

**Already-established brutalist constraint:** Phase 9 verification confirmed "all CSS animations use only transform/opacity" is a satisfied requirement. Phase 15 must maintain this.

**IntersectionObserver already used:** `RouteMap.astro` (line 220-236) and `ElevationProfile.astro` (line 162-175) both use IntersectionObserver + scroll event for lazy init. Phase 15's scroll-reveal reuses the same browser API — no conceptual novelty.

**Tailwind v4 cascade layer order:** `global.css` declares layers as `@layer leaflet, photoswipe, base, components, utilities`. New scroll-reveal CSS should go in `@layer utilities` for highest specificity.

**Component structure for card lists:**
- `GravelSectors.astro` — renders `sectors.map()` as `.classified-border` divs
- `KomSegments.astro` — renders `kom.map()` as `.classified-border` divs
- `RestockPoints.astro` — renders restock points list

All three use the same `.classified-border.bg-bg-surface` pattern — hover state additions apply uniformly.

**Glitch animation already exists:** `index.astro` has a `@keyframes noise-anim` glitch effect on the hero `<h1>`. This is in a `<style>` scoped block, not `global.css`. Phase 15 adds to `global.css @theme`, not to this scoped block.

---

## Open Questions

1. **Stagger delay amount for card lists**
   - What we know: Stagger creates a cascade effect — each card reveals slightly after the previous
   - What's unclear: Optimal delay interval (40ms? 60ms? 80ms?) for 6-8 sector cards
   - Recommendation: Start at 60ms per card. Too long feels sluggish; too short looks simultaneous. Can be tuned in the plan.

2. **Whether `index.astro` sections themselves get scroll-reveal**
   - What we know: Requirement VIS-10 says "sections and card lists fade and slide into view"
   - What's unclear: Should the `<section>` wrappers themselves animate, or just the content inside them?
   - Recommendation: Animate section headings and card lists (`[data-reveal]`) rather than full `<section>` elements. Full sections animating can cause layout jumps on mobile if the section height contributes to layout.

3. **TBT baseline measurement timing**
   - What we know: Phase 13 TBT verification was human_needed (Lighthouse run required). The baseline may be 0ms or may have changed.
   - What's unclear: Actual current TBT value before Phase 15 begins
   - Recommendation: Phase 15 plan should include a pre-implementation TBT baseline measurement step (human Lighthouse run) before adding any animation code, so the delta is measurable.

---

## Sources

### Primary (HIGH confidence)
- `tailwindcss.com/docs/animation` — Custom @keyframes in @theme, animate-* utilities, motion-safe/reduce variants
- `tailwindcss.com/docs/transition-property` — All transition utilities, motion-reduce:transition-none pattern
- `tailwindcss.com/docs/hover-focus-and-other-states` — active: variant, motion-safe/motion-reduce variants, stacking
- `tailwindcss.com/docs/transition-timing-function` — ease-* utilities, custom bracket syntax, note on steps()
- `developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API` — Constructor options, observe/unobserve pattern, browser support
- `developer.mozilla.org/en-US/docs/Web/CSS/transition-timing-function#step_functions` — step-start, step-end, steps() syntax

### Secondary (MEDIUM confidence)
- `tobiasahlin.com/blog/how-to-animate-box-shadow/` — Pseudo-element opacity trick for performant box-shadow hover; technique is widely cited and aligns with MDN's "only opacity/transform are compositor-safe" guidance
- `docs.astro.build/en/guides/client-side-scripts/` — Astro script bundling, deduplication, custom elements pattern

### Tertiary (LOW confidence)
- WebSearch results on brutalist animation trends 2025-2026 — General ecosystem direction confirming hard-shift aesthetic; not authoritative but consistent across multiple sources

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Tailwind v4 docs + MDN verified; no new dependencies
- Architecture patterns: HIGH — All patterns verified against official docs or MDN
- Pitfalls: HIGH for TBT/compositor safety (Phase 9 already established these constraints); MEDIUM for stagger timing (aesthetic judgment)
- Codebase context: HIGH — verified against actual source files read during research

**Research date:** 2026-03-27
**Valid until:** 2026-06-27 (stable APIs — Tailwind v4 + IntersectionObserver; neither is fast-moving)
