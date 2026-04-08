# Phase 54: Overlay Contrast — Research

**Researched:** 2026-04-08
**Domain:** CSS opacity/contrast tuning, WCAG contrast compliance, dark-theme layering
**Confidence:** HIGH

---

## Summary

Phase 54 is a CSS-only tuning task with a single constraint: the `.escher-overlay` (a fixed, full-viewport SVG Penrose-tile pattern at `z-index: 9998`) is currently set to `opacity: 0.05` in `global.css`. The requirement is to verify that light-colored text (white, muted, accent green) maintains readable contrast against the dark base background at every scroll position while the Escher tessellation remains perceptible as a background texture.

The problem is understood as follows: the `.escher-overlay` uses `mix-blend-mode` implicitly (it does not — current code has no blend mode set on `.escher-overlay`). Its SVG fills are greens (`#a3f0a0`, `#6db86a`, `#3d7a3a`) against a dark `bg-base` (`oklch(0.10 0.01 250)` ≈ near-black). At opacity 0.05, the overlay adds a very faint greenish tint but does not significantly change the background luminance that text sits on. However, in some scroll positions the overlay drifts (via `escher-drift` animation) and in the `#sectors` section, a second Escher layer exists: the `EscherLizards.astro` component (an `<svg>` with `position: absolute`, `opacity: 0.12`, `mix-blend-mode: lighten`, `filter: grayscale(100%) contrast(1.3)`). This second layer applies `mix-blend-mode: lighten`, which can locally brighten areas of the page, potentially degrading contrast for muted text (`oklch(0.70 0.01 90)`) sitting above it.

The fix is CSS-only: either reduce `.escher-overlay` opacity further, add a `brightness()` filter, remove the `mix-blend-mode: lighten` from EscherLizards, or tune the `opacity` on EscherLizards. No new dependencies are required. No JavaScript, no layout changes.

**Primary recommendation:** Reduce `EscherLizards.astro`'s `opacity` from `0.12` to `0.07`–`0.08` (matching the fixed overlay), and verify that `mix-blend-mode: lighten` on that component does not boost background luminance above the threshold that makes `text-text-muted` fail WCAG AA contrast (4.5:1 for normal text).

---

## Standard Stack

### Core

No new packages. This phase uses only CSS property adjustments.

| Technology | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| CSS `opacity` | Browser native | Reduce overlay brightness | Direct property; zero side effects |
| CSS `filter: brightness()` | Browser native | Alternative opacity-like dimming | Useful if opacity change alone shifts blend-mode effects |
| CSS `mix-blend-mode` | Browser native | The EscherLizards lightening effect | Already in use; may be tuned or removed |
| WCAG contrast formula | W3C standard | Verify text legibility | 4.5:1 normal text, 3:1 large text (Level AA) |

### Supporting

| Tool | Purpose | When to Use |
|------|---------|-------------|
| Browser DevTools → Accessibility panel | Measure real contrast ratio at any point on screen | Required for verification — pick text color + background at that spot |
| CSS `prefers-reduced-motion` | Already gated for animation; no change needed | N/A for this phase |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|-----------|-----------|----------|
| Lowering `EscherLizards` opacity | Removing `mix-blend-mode: lighten` | Removing blend mode changes the visual character more dramatically; opacity tuning is smaller change |
| Lowering `EscherLizards` opacity | Adding a scrim `<div>` behind text | Scrim adds a new element and may clash with brutalist aesthetic |
| CSS opacity only | CSS `filter: brightness(X)` | `filter` also affects saturation; opacity is a purer tool for this use case |

**Installation:** No `npm install` needed.

---

## Architecture Patterns

### Affected Files

```
src/styles/global.css              ← .escher-overlay opacity (currently 0.05)
src/components/EscherLizards.astro ← opacity: 0.12, mix-blend-mode: lighten (only in #sectors)
src/components/LizardBackground.astro  ← opacity: 0.04 (fixed layer, z-index 9997) — likely not the issue
```

### The Full Overlay Stack (z-index order, highest first)

```
z-index 10000:  SiteNav (.site-nav)           — not a background issue
z-index 9999:   .grain-overlay (global.css)   — opacity 0.06, SVG noise
z-index 9998:   .escher-overlay (global.css)  — opacity 0.05, SVG Penrose tile, animated
z-index 9997:   .lizard-bg (LizardBackground) — opacity 0.04, SVG lizards, animated
z-index 10+:    page section content (relative z-10)
z-index 0:      .escher-lizards (EscherLizards, position:absolute in #sectors) — opacity 0.12, mix-blend-mode: lighten
```

### Pattern 1: Opacity-Only Reduction

**What:** Reduce the `opacity` value on `EscherLizards.astro` from `0.12` to a lower value.
**When to use:** When the visual texture needs to remain — just dimmer.

```css
/* In EscherLizards.astro <style> block */
.escher-lizards {
  opacity: 0.07;  /* was 0.12 */
  mix-blend-mode: lighten;
  filter: grayscale(100%) contrast(1.3);
}
```

### Pattern 2: Remove mix-blend-mode: lighten

**What:** Change `mix-blend-mode: lighten` to `normal` on `.escher-lizards`.
**When to use:** When the lighten blend is the primary contrast problem (it adds luminance to dark backgrounds locally). With `mix-blend-mode: normal`, the SVG simply composites at its opacity level without boosting surrounding pixels.

```css
.escher-lizards {
  opacity: 0.08;
  mix-blend-mode: normal;  /* was lighten */
  filter: grayscale(100%) contrast(1.3);
}
```

### Pattern 3: Add brightness filter to .escher-overlay (global.css)

**What:** Chain a `brightness()` filter on the fixed Penrose tile overlay, reducing its effective visual contribution independent of opacity.

```css
.escher-overlay {
  filter: brightness(0.5);  /* halve SVG brightness before the opacity layer */
  opacity: 0.05;
}
```

**Note:** This is probably unnecessary — the global `.escher-overlay` is already at opacity 0.05 (very faint). The contrast problem more likely comes from EscherLizards at opacity 0.12 with `mix-blend-mode: lighten`.

### Anti-Patterns to Avoid

- **Adding a dark scrim behind text:** Introduces a new element, changes page structure, looks inconsistent with the brutalist aesthetic.
- **Using `backdrop-filter: brightness()` on text containers:** Not intended for this use case; would affect sibling elements and blow up stacking contexts.
- **Setting `opacity: 0` on EscherLizards:** Defeats the "texture still perceptible" success criterion.
- **Adjusting `--color-text-muted` globally:** Text muted is used across many contexts; changing it to satisfy one background situation may harm others.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|------------|-------------|-----|
| Contrast measurement | Custom contrast calculator | Browser DevTools Accessibility panel | DevTools picks up blend-mode and opacity compositing that CSS tools miss |
| Dynamic opacity adjustment | JavaScript scroll listener that changes opacity | Static CSS opacity value | Phase requirement is "at all scroll positions" — all positions must pass with a single static value |
| Text shadow workaround | `text-shadow` on every text element | Opacity reduction on background | text-shadow adds visual clutter; background tuning is the correct lever |

**Key insight:** This is a one-property CSS change. The only verification work is measuring contrast in DevTools, not engineering work.

---

## Common Pitfalls

### Pitfall 1: Checking Only One Scroll Position

**What goes wrong:** Developer reduces opacity and tests only the hero section. Because EscherLizards is scoped to `#sectors` (the gravel sectors section), the contrast problem only manifests in that section — not the hero.

**Why it happens:** The `.escher-overlay` (fixed, global) is at opacity 0.05 and uses no blend mode — it is unlikely to cause contrast failures. The `EscherLizards` (absolute, sectors section only) is at opacity 0.12 with `mix-blend-mode: lighten` — it adds luminance to the dark background in sectors.

**How to avoid:** Test contrast at both (a) the `#route` section which uses `tone-image` at opacity 0.12, and (b) the `#sectors` section which has EscherLizards + the global `.escher-overlay`. The hardest text to read will be `text-text-muted` (`oklch(0.70 0.01 90)`) over the locally brightened sectors background.

**Warning signs:** Fix works in hero/route, but sectors shows legibility problems.

### Pitfall 2: Treating `opacity` and `mix-blend-mode: lighten` as Additive

**What goes wrong:** Developer reduces `opacity` from 0.12 to 0.10 (small change) but `mix-blend-mode: lighten` still picks the lighter of the SVG's fill pixels or the background pixels at that point. Even a small opacity lightening in `lighten` mode can push the effective background lightness above the threshold where `text-text-muted` fails.

**Why it happens:** `mix-blend-mode: lighten` does not blend by opacity — it picks the per-channel maximum at each pixel. The net effect on background luminance is not simply proportional to opacity.

**How to avoid:** When tuning, use DevTools Accessibility → Color Contrast to measure the ACTUAL rendered contrast ratio, not to estimate it from opacity values.

### Pitfall 3: Forgetting `EscherLizards` Is a Separate Component from `.escher-overlay`

**What goes wrong:** Developer adjusts `.escher-overlay` in `global.css` (the Penrose SVG tile) and sees no visible change in the sectors section — because the contrast problem is in `EscherLizards.astro`, a separate SVG component.

**Why it happens:** There are three distinct visual layers in play:
1. `.escher-overlay` (global.css) — global fixed overlay, Penrose tessellation, opacity 0.05
2. `.escher-lizards` (EscherLizards.astro) — inline SVG in `#sectors` only, opacity 0.12, mix-blend-mode: lighten
3. `.lizard-bg` (LizardBackground.astro) — global fixed layer, lizard tessellation, opacity 0.04

The requirement references "Escher tessellation background" which could mean any of these. The most likely culprit is #2 (EscherLizards) due to its higher opacity and blend mode.

**How to avoid:** Read all three components before making changes. Identify the correct CSS target before editing.

### Pitfall 4: Forgetting the `will-change: transform` Layer on `.escher-overlay`

**What goes wrong:** Adding `filter` to `.escher-overlay` after `will-change: transform` creates a stacking context conflict in some browsers (notably older Safari). `filter` combined with `will-change: transform` may produce unexpected compositing.

**Why it happens:** Both `filter` and `will-change` promote elements to their own compositing layer. When combined, layer promotion behavior can be non-deterministic.

**How to avoid:** If adding `filter: brightness()` to `.escher-overlay`, test in Safari. Prefer opacity-only changes on `.escher-overlay`. This pitfall is avoided entirely if the fix is applied to `EscherLizards` (which has `filter` already but no `will-change`).

---

## Code Examples

Verified patterns from codebase:

### Current EscherLizards.astro CSS (the most likely target)

```css
/* Source: src/components/EscherLizards.astro:34-44 */
.escher-lizards {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0.12;
  mix-blend-mode: lighten;
  filter: grayscale(100%) contrast(1.3);
}
```

### Recommended Change — Reduce opacity, consider removing blend mode

```css
/* Option A: opacity reduction only */
.escher-lizards {
  opacity: 0.07;  /* was 0.12 — keeps texture but reduces lightening contribution */
  mix-blend-mode: lighten;
  filter: grayscale(100%) contrast(1.3);
}

/* Option B: opacity reduction + remove lighten blend mode */
.escher-lizards {
  opacity: 0.08;
  mix-blend-mode: normal;  /* removes the additive luminance boost */
  filter: grayscale(100%) contrast(1.3);
}
```

### Current .escher-overlay CSS (global.css, likely not the issue but included for reference)

```css
/* Source: src/styles/global.css:95-105 */
.escher-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.05;
  background-image: url("data:image/svg+xml,...");
  background-repeat: repeat;
  background-size: 100px 100px;
  z-index: 9998;
  will-change: transform;
}
```

### Text colors and their approximate contrast against bg-base

The base background is `oklch(0.10 0.01 250)` ≈ `#14141e` (very dark navy, ~L1.6%).

| Token | oklch | Approx hex | Estimated contrast vs bg-base |
|-------|-------|------------|-------------------------------|
| `--color-accent-white` | `oklch(0.92 0.01 90)` | ~`#e8e8e4` | ~17:1 (passes) |
| `--color-text-body` | `oklch(0.85 0.01 90)` | ~`#d5d5cf` | ~13:1 (passes) |
| `--color-text-muted` | `oklch(0.70 0.01 90)` | ~`#ababab` | ~7.5:1 (passes, but margin shrinks with background brightening) |
| `--color-accent-green` | `oklch(0.85 0.24 145)` | ~`#a3f0a0` | ~12:1 (passes) |

**The risk:** `text-text-muted` passes WCAG AA at 4.5:1 against the raw dark background, with margin of ~7.5:1. But with `mix-blend-mode: lighten` at `opacity: 0.12`, local background pixels in the sectors section may be brightened from near-black to `~oklch(0.25 0.03 145)` (dark green), reducing the contrast ratio for `text-text-muted` text to potentially ~3.5:1 — below the 4.5:1 threshold.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|-------------|-----------------|--------------|--------|
| `background: rgba` tinting for legibility | CSS `opacity` on overlay elements | Always current | Pure CSS, no JS |
| Measuring contrast by eye | DevTools Accessibility panel with computed contrast ratio | Chrome ~88+, Firefox ~96+ | Exact numerical verification |

---

## Open Questions

1. **Which layer is the actual problem?**
   - What we know: Phase description says "Escher tessellation background" — could mean `.escher-overlay` (global, Penrose tile) or `EscherLizards` (sectors section, lizard tessellation). The `escherian_stairs_fb.webp` used in `#route` section as a `tone-image` at `opacity: 0.12` is a third candidate.
   - What's unclear: Without visual inspection, it's uncertain which layer(s) are actually failing contrast.
   - Recommendation: During execution, inspect `#route` section (has `escharian_stairs_fb.webp` + global `.escher-overlay`) and `#sectors` section (has `EscherLizards` + global `.escher-overlay`). Use DevTools to pick exact contrast ratios before and after changes.

2. **Does the `escharian_stairs_fb.webp` `tone-image` also need treatment?**
   - What we know: The `#route` section uses `<img src="/tone/escharian_stairs_fb.webp" class="tone-image ...">`. The `.tone-image` class is `opacity: 0.12, mix-blend-mode: lighten`. The webp file was recently modified (appears in git status as `M public/tone/escharian_stairs_fb.webp`).
   - What's unclear: Whether this image at opacity 0.12 with lighten blend mode is causing the problem in `#route`, or whether it's subtle enough to pass.
   - Recommendation: Measure contrast in `#route` as well. If the image is the problem, the `.tone-image` class opacity may need adjustment — but note this class is shared across ALL tone images. Reduce per-element via inline style or a modifier class to avoid breaking other sections.

3. **What is the precise threshold for "Escher still perceptible"?**
   - What we know: Success Criterion 2 says texture must be perceptible. No specific opacity floor is defined.
   - What's unclear: How low opacity can go before the texture disappears at typical viewing distances.
   - Recommendation: Qualitative judgment. Below `opacity: 0.04`, SVG fills against a near-black background become imperceptible. Aim to stay at `0.05`+.

---

## Sources

### Primary (HIGH confidence)

- `src/styles/global.css` — Current `.escher-overlay` implementation (lines 95–105, 289–299): opacity 0.05, no blend mode, animated via `escher-drift`
- `src/components/EscherLizards.astro` — Current `.escher-lizards` implementation: opacity 0.12, `mix-blend-mode: lighten`, `filter: grayscale(100%) contrast(1.3)`
- `src/components/LizardBackground.astro` — Current `.lizard-bg`: opacity 0.04, no blend mode
- `src/layouts/BaseLayout.astro` — Confirmed `.escher-overlay` div placement; no blend mode
- `src/pages/index.astro` — Confirmed `.tone-image` usage in `#route`, `#sectors`, `#photos`, `#info` sections; all text containers use `relative z-10`
- WCAG 2.1 SC 1.4.3 — 4.5:1 contrast ratio for normal text (Level AA), 3:1 for large text

### Secondary (MEDIUM confidence)

- CSS Color Level 4 `oklch()` luminance calculations — Used to estimate contrast ratios for design tokens

---

## Metadata

**Confidence breakdown:**
- Problem identification: HIGH — all source files read; layer stack confirmed
- Fix approach: HIGH — opacity reduction and/or blend mode removal are standard CSS tuning levers
- Exact opacity values: MEDIUM — final values require visual + DevTools verification
- Which component is the primary culprit: MEDIUM — EscherLizards is most likely due to higher opacity + blend mode, but requires runtime inspection to confirm

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (CSS properties stable; no external dependencies)
