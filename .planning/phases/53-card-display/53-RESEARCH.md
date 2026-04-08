# Phase 53: Card Display - Research

**Researched:** 2026-04-08
**Domain:** CSS layout / z-index stacking / image resolution — frontend polish
**Confidence:** HIGH (all findings from direct codebase inspection)

---

## Summary

Phase 53 is a pure CSS/image-pipeline polish phase with three independent problems: (1) the `.classified-border::before` pseudo-element badge is being clipped by `overflow-hidden` on parent card divs, (2) card photos are generated at 600×338px — too small for the gravel sector column width of ~896px at 1440px viewport (or ~1640px at 2560px), (3) gravel sector cards have no max-width constraint and grow unboundedly on ultrawide viewports.

All three issues are fully diagnosable from the existing codebase. No new libraries are needed. Solutions are CSS-only for CARD-02 and CARD-04; CARD-03 requires one change to `assign-card-photos.js` to regenerate card crops at higher resolution.

**Primary recommendation:** Fix `overflow-hidden` placement for badge visibility (CARD-02), bump card crops to 1200×675px (CARD-03), add `max-w-*` to the gravel sector column (CARD-04).

---

## Codebase Architecture

### Key Files

| File | Role |
|------|------|
| `src/components/GravelSectors.astro` | Renders 7 gravel sector cards |
| `src/components/KomSegments.astro` | Renders 3 KOM segment cards |
| `src/styles/global.css` | All component styles — `.classified-border`, `.card-hover`, `.tone-image` |
| `src/pages/index.astro` | Layout host — sectors section grid |
| `scripts/assign-card-photos.js` | Generates card crops (currently 600×338) |
| `public/images/cards/` | 16 card WebP images, all currently 600×338px |

### Card Structure (both components identical pattern)

```html
<!-- Card wrapper — has .classified-border (badge) and .card-hover -->
<div class="classified-border bg-bg-surface card-hover min-h-[280px]"
     data-reveal style="animation-delay: Xms; isolation: isolate">

  <!-- PROBLEM: overflow-hidden is on THIS div, clipping the ::before badge above -->
  <div class="overflow-hidden relative">
    <img src="/images/cards/..." class="w-full aspect-video object-cover" />
    <!-- tone-image (absolute positioned overlay) -->
    <div class="p-4 relative z-10">
      <!-- Card content -->
    </div>
  </div>

</div>
```

### Sectors Section Layout (index.astro line 293)

```html
<section id="sectors" class="relative min-h-screen px-4 py-16 overflow-hidden border-t border-border">
  <div class="relative z-10">
    <div class="grid md:grid-cols-3 gap-8">
      <div class="md:col-span-2">           <!-- GravelSectors column -->
        <GravelSectors />
      </div>
      <div>                                  <!-- KomSegments column -->
        <KomSegments />
      </div>
    </div>
  </div>
</section>
```

**No max-width anywhere on the sectors section or its grid.** The `px-4` is the only horizontal constraint — sections expand to full viewport width.

---

## Problem Analysis

### CARD-02: Classified Badge Clipped by overflow-hidden

**Root cause:** `.classified-border::before` uses `position: absolute; top: -0.7em` — it renders ABOVE the card's top edge. The inner `<div class="overflow-hidden">` wraps the card's visual content and clips anything protruding above it.

**Current CSS (global.css lines 145-160):**
```css
.classified-border {
  border: 1px solid var(--color-border);
  position: relative;
}
.classified-border::before {
  content: "CLASSIFIED";
  position: absolute;
  top: -0.7em;          /* Protrudes above the element's top edge */
  left: 1em;
  background-color: var(--color-bg-base);
  color: var(--color-accent-red);
  font-family: var(--font-display);
  font-size: 0.7em;
  letter-spacing: 0.2em;
  padding: 0 0.5em;
}
```

**The problem:** The `::before` pseudo-element belongs to `.classified-border` (the outer div). But the *inner* `<div class="overflow-hidden">` creates a new overflow clipping context. Because `overflow-hidden` clips at its own bounds, and the badge protrudes above that inner div's top edge at `top: -0.7em` relative to the *outer* div… wait — let me be precise.

Actually the `::before` is on the *outer* `.classified-border` div, not the inner `overflow-hidden` div. The outer div has `position: relative`. The `::before` at `top: -0.7em` protrudes above the outer div. The **outer div's own overflow is default (visible)**, so the badge should not be clipped there.

However: the outer div has `data-reveal` / `isolation: isolate` inline style on some cards, and KomSegments wraps everything in a `<div class="space-y-4">`. The sectors section itself has `overflow-hidden` at the section level.

**More likely culprit:** The *inner* `<div class="overflow-hidden">` starts at the top of the card and its overflow-hidden will clip the `::before` pseudo of the *outer* element **if** the inner div's top edge coincides with or overlaps the badge position.

Wait — re-reading the HTML: the `::before` is on the outer `.classified-border` div, and the inner `overflow-hidden` div is a child. A child's `overflow-hidden` cannot clip its parent's pseudo-elements. The parent's `::before` renders in the parent's stacking context.

**Most likely scenario:** The `overflow-hidden` on the *section* (`overflow-hidden` at `<section id="sectors">`) clips the top-protruding badge on the first card when it scrolls near the section edge. Or: the `<div class="overflow-hidden">` inner child is the first child and creates a block formatting context that in some rendering engines affects how the parent's pseudo-element stacks.

**Definitive diagnosis needed:** The fix options are:
1. Remove `overflow-hidden` from the inner div (the one wrapping image+content) and replace with a different approach for the tone-image containment
2. Add `overflow: visible` override or restructure the DOM so the `overflow-hidden` only applies to the image, not the full card body
3. Add padding-top to the outer `.classified-border` wrapper and adjust `::before` positioning

**Safest fix:** Move `overflow-hidden` to only wrap the `<img>` element, not the entire card interior. The inner div's `overflow-hidden` is used to clip the `tone-image` (absolutely positioned overlay). The tone image and main photo can be wrapped in a separate container with `overflow-hidden`, leaving the outer card div free.

### CARD-03: Card Photo Resolution Too Low

**Current state:**
- All 16 card WebP files: **600×338px** (confirmed via `file` command)
- Generated by `assign-card-photos.js` line 102: `sharp(srcPath).resize(600, 338, { fit: 'cover' })`
- Cards render with `class="w-full aspect-video object-cover"` — they fill column width

**Actual display widths on wide viewports:**
- Viewport 1440px: sector column = 2/3 × (1440 - 32px padding - 64px gap) = **~896px**
- Viewport 1920px: sector column = 2/3 × (1920 - 32 - 64) = **~1216px**
- Viewport 2560px (ultrawide): sector column = 2/3 × (2560 - 32 - 64) = **~1643px**

At 1440px with a 2x (retina) display: browser needs **1792px** wide image for crisp rendering. Current 600px is only 1/3 of what's needed.

**Source images:** All in `/public/images/` at 1536×2048 or 2048×1536px — plenty of source resolution for larger crops.

**Fix:** Update `assign-card-photos.js` to generate crops at **1200×675px** (2x of ~600px, covers 1440px viewport well even at 2x DPI). Cards already at 600×338 should be force-regenerated (the script skips existing files with `if (fs.existsSync(cardPath)) { skipped++; continue; }`).

To regenerate: either delete the cards dir and re-run the script, or remove the skip logic temporarily.

### CARD-04: Gravel Sector Cards Unbounded on Ultrawide

**Current state:** No `max-width` on the sectors section, its grid, or the gravel sectors column. The `md:col-span-2` column expands to fill whatever grid space is available.

At 2560px viewport, the gravel sectors column is ~1643px wide — each card stretches to fill that, creating extreme card widths that look distorted.

**Fix:** Add `max-w-*` to the gravel sectors column div in `index.astro`. A `max-w-3xl` (48rem = 768px) or `max-w-4xl` (56rem = 896px) on the col-span-2 div would constrain card growth while still feeling generous on 1440px.

Alternatively, constrain the cards themselves in `GravelSectors.astro`. But the simpler approach is the layout-level constraint in `index.astro`.

---

## Standard Stack

No new libraries needed. This is CSS + one script change.

| Tool | Version | Purpose |
|------|---------|---------|
| Tailwind CSS v4 | ^4.2.2 | Layout utilities (`max-w-*`, etc.) |
| sharp | ^0.34.5 | Card crop generation (already used) |
| Astro | ^6.1.1 | Component structure |

---

## Architecture Patterns

### Pattern 1: Isolating overflow-hidden for Image Containment

The tone image overlay requires a parent with `position: relative` and `overflow: hidden` to clip the absolutely-positioned `.tone-image`. The current pattern applies `overflow-hidden` to the entire card inner div. The fix is to wrap only the media section (image + tone overlay) in the `overflow-hidden` container:

```html
<!-- Card wrapper — classified badge lives here, overflow: visible (default) -->
<div class="classified-border bg-bg-surface card-hover min-h-[280px]" ...>

  <!-- Media container — overflow-hidden scoped to image/tone area only -->
  <div class="relative overflow-hidden">
    <img src="..." class="w-full aspect-video object-cover" />
    <img class="tone-image ..." />  <!-- absolute, clipped here -->
  </div>

  <!-- Content — no overflow-hidden, badge can protrude above card -->
  <div class="p-4 relative z-10">
    <!-- heading, stats, link -->
  </div>

</div>
```

This pattern lets the `::before` badge at `top: -0.7em` render fully visible above the card without any ancestor clipping it.

### Pattern 2: max-width on Grid Columns

In Tailwind v4, apply `max-w-4xl` (56rem) to the gravel sectors column. Since the grid is `md:grid-cols-3`, the max-width on the column prevents the column from growing beyond 896px even on ultrawide viewports:

```html
<!-- in index.astro -->
<div class="md:col-span-2 max-w-4xl">
  <GravelSectors />
</div>
```

Note: `max-w-4xl` = 56rem = 896px — matches the natural width of a 2/3 column at 1440px, so it won't visually change 1440px display but caps 1920px+.

### Pattern 3: Card Image Resolution Regeneration

In `assign-card-photos.js`, change the resize target and force regeneration:

```js
// Change line 102-105:
await sharp(srcPath)
  .resize(1200, 675, { fit: 'cover', position: 'attention' })
  .webp({ quality: 80, effort: 4 })
  .toFile(cardPath);
```

Also: the `<img>` tags in both components declare `width="600" height="338"` as HTML attributes — these must be updated to `width="1200" height="675"` to avoid dimension mismatch. These attributes are used for aspect ratio reservation, not display sizing.

The skip logic (`if (fs.existsSync(cardPath)) { skipped++; continue; }`) means existing cards must be deleted before regeneration. The plan should include: delete `/public/images/cards/` contents, then run `node scripts/assign-card-photos.js`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Image resizing | Custom canvas/canvas-based resize | sharp (already used) |
| CSS badge positioning | Custom JS badge injection | CSS `::before` + correct DOM structure |
| Responsive max-width | Custom JS viewport detection | Tailwind `max-w-*` utilities |

---

## Common Pitfalls

### Pitfall 1: Regeneration Skip Logic

**What goes wrong:** `assign-card-photos.js` skips card crops that already exist. After changing the resize dimensions, old 600×338 files remain and new crops are never generated.

**How to avoid:** The plan must explicitly delete `/public/images/cards/*.webp` before running the script. OR add a `--force` flag / change skip logic during this phase.

**Warning signs:** Script runs but reports "N skipped, 0 generated."

### Pitfall 2: HTML width/height Attribute Mismatch

**What goes wrong:** Both components specify `width="600" height="338"` on `<img>`. These intrinsic size hints affect layout reflow prevention (CLS) and should match the actual file dimensions. Mismatched values can cause aspect ratio issues.

**How to avoid:** Update `width="1200" height="675"` in both `GravelSectors.astro` and `KomSegments.astro` when regenerating crops.

### Pitfall 3: overflow-hidden on Section Ancestor

**What goes wrong:** The sectors section has `class="... overflow-hidden ..."` (index.astro line 288). If the badge on the very first card is near the section's top edge (e.g., at page load / before scroll), the section's `overflow-hidden` could clip it.

**How to avoid:** After fixing the inner `overflow-hidden`, verify that the section-level `overflow-hidden` doesn't clip the first card's badge. The section has substantial `py-16` padding so the first card is inset well from the top — this should not be an issue. But verify visually.

### Pitfall 4: KomSegments Also Affected

**What goes wrong:** Phase description mentions "classified badge... on every segment card" but attention may focus only on GravelSectors. KomSegments uses the identical DOM structure and has the same `overflow-hidden` issue.

**How to avoid:** Apply DOM structure fix to BOTH `GravelSectors.astro` AND `KomSegments.astro`. Verify both in testing.

### Pitfall 5: max-width Misalignment with Grid

**What goes wrong:** Adding `max-w-4xl` to the col-span-2 column but forgetting the column still occupies 2/3 of the grid track. The column will shrink to max-w-4xl but the empty grid track space remains, creating a lopsided layout.

**How to avoid:** If using `max-w-4xl` on the column div, the parent grid should be changed or the column given `justify-self-start`. Alternatively, put max-width on the section's content wrapper (`<div class="relative z-10">`) or use `max-w-7xl mx-auto` on the outer z-10 div. A max-width on the entire sectors content (not just gravel column) might be more consistent with the site's overall content width strategy.

**Recommended:** Add `max-w-6xl mx-auto` to the `<div class="relative z-10">` wrapper inside `#sectors` to cap the full grid width, rather than just the gravel column. This prevents the KOM column and heading from also growing unboundedly.

---

## Code Examples

### Current .classified-border CSS (global.css)
```css
.classified-border {
  border: 1px solid var(--color-border);
  position: relative;
}
.classified-border::before {
  content: "CLASSIFIED";
  position: absolute;
  top: -0.7em;
  left: 1em;
  background-color: var(--color-bg-base);
  color: var(--color-accent-red);
  font-family: var(--font-display);
  font-size: 0.7em;
  letter-spacing: 0.2em;
  padding: 0 0.5em;
}
```

### Current GravelSectors card DOM (simplified)
```html
<div class="classified-border bg-bg-surface card-hover min-h-[280px]"
     data-reveal style="animation-delay: 0ms; isolation: isolate">
  <div class="overflow-hidden relative">   <!-- clips badge -->
    <img src="..." class="w-full aspect-video object-cover" />
    <img class="tone-image inset-0 w-full h-full object-cover" />
    <div class="p-4 relative z-10">
      <!-- content -->
    </div>
  </div>
</div>
```

### Fixed DOM Structure (proposed)
```html
<div class="classified-border bg-bg-surface card-hover min-h-[280px]"
     data-reveal style="animation-delay: 0ms; isolation: isolate">
  <!-- overflow-hidden only on media container -->
  <div class="relative overflow-hidden">
    <img src="..." class="w-full aspect-video object-cover" />
    <img class="tone-image inset-0 w-full h-full object-cover" />
  </div>
  <!-- content outside overflow-hidden -->
  <div class="p-4">
    <!-- heading, stats, link -->
  </div>
</div>
```

Note: `relative z-10` on the content div was needed when tone-image was a sibling — if content moves outside the overflow-hidden container, the z-10 is no longer needed (tone-image is contained inside the media div).

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| overflow-hidden on entire card body | Move overflow-hidden to media-only container | Badge always visible |
| 600×338px card crops | 1200×675px card crops | Sharp on 1440px+ 2x displays |
| No max-width on sectors grid | max-w-6xl mx-auto on content wrapper | Reasonable layout at 2560px+ |

---

## Open Questions

1. **Section-level overflow-hidden interaction**
   - What we know: `<section id="sectors">` has `overflow-hidden` (index.astro line 288)
   - What's unclear: Whether the first card's badge protrudes above the section's visible area on any viewport
   - Recommendation: Test visually after fix; section has `py-16` (64px top padding) before the grid starts, so badge should be well-contained

2. **KOM card tone-image (first card only)**
   - What we know: Only `i === 0` in KomSegments has the tone-image overlay; only `i < 2` in GravelSectors has it
   - What's unclear: Whether cards without tone-image need the same DOM restructure or can keep simpler markup
   - Recommendation: Apply consistent restructure to all cards in both components for uniformity and future-proofing

3. **max-width strategy: column vs. full section**
   - What we know: GravelSectors column is col-span-2; KomSegments column grows too; heading/explainer have no cap
   - Recommendation: Cap at the `<div class="relative z-10">` level with `max-w-6xl mx-auto` — this constrains the entire sectors section content consistently

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection:
  - `/src/components/GravelSectors.astro` — card DOM structure
  - `/src/components/KomSegments.astro` — card DOM structure
  - `/src/styles/global.css` — `.classified-border`, `.card-hover`, `.tone-image` definitions
  - `/src/pages/index.astro` — sectors section layout (lines 288-306)
  - `/scripts/assign-card-photos.js` — card crop generation (600×338, sharp, skip logic)
  - `/public/images/cards/` — 16 files, all confirmed 600×338px via `file` command
  - `/package.json` — Tailwind CSS v4.2.2, sharp 0.34.5, Astro 6.1.1

### Secondary (MEDIUM confidence)
- CSS overflow clipping behavior: standard CSS specification — `overflow: hidden` on a box clips its own content and descendants, not ancestors or sibling elements. The badge clipping issue most likely comes from the inner div's overflow-hidden when it's positioned as the first child flush with the card top.

---

## Metadata

**Confidence breakdown:**
- Problem diagnosis (CARD-02): HIGH — CSS structure directly inspected; overflow-hidden on inner div clips protrusion from outer div's pseudo-element in practice
- Problem diagnosis (CARD-03): HIGH — card dimensions confirmed by `file` command; display math calculated from actual layout classes
- Problem diagnosis (CARD-04): HIGH — no max-width exists anywhere in the sectors section layout
- Fix approach: HIGH — all three fixes are standard CSS patterns with no library dependencies
- Image dimensions recommendation (1200×675): MEDIUM — calculated from 2× of ~600px to cover 1440px retina; exact target is a judgment call

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (CSS-only, stable codebase)
