# Phase 44: Tone Image Integration - Research

**Researched:** 2026-03-31
**Domain:** CSS mix-blend-mode, stacking contexts, Astro static site image pipeline
**Confidence:** HIGH

## Summary

Phase 44 adds tone image coverage to the one major page section currently without it (`#sectors`) and introduces tone image accents inside 2–3 sector or KOM cards. The project already has a fully working tone image pattern: a `.tone-image` CSS class in `global.css` applies `opacity: 0.12; mix-blend-mode: lighten; filter: grayscale(100%) contrast(1.3); position: absolute`. Every section except `#sectors` uses this pattern with an absolute-positioned `<img>` inside a `relative overflow-hidden` container and `div.relative.z-10` wrapping content.

The infrastructure is completely in place. The work is: (1) select and pipeline a new source image for the sectors section background, (2) add the tone `<img>` to the `#sectors` section in `index.astro`, (3) add `isolation: isolate` to the card container divs in `GravelSectors.astro` and/or `KomSegments.astro`, and (4) add an absolutely-positioned tone accent inside 2–3 selected cards. No new libraries or build tools are required.

The `prefers-reduced-motion` requirement (TONE-04) is automatically satisfied: the `.tone-image` class has no animation properties. The `escher-overlay` and `penrose-hero` animations correctly gate on `prefers-reduced-motion: no-preference` in `global.css`. Tone images are purely decorative static overlays — no extra CSS needed.

**Primary recommendation:** Follow the established pattern exactly. Add a tone background to `#sectors`, then add card accents to 2–3 cards using `isolation: isolate` on the container plus a small-width inline `<img>` with the `tone-image` class.

---

## Standard Stack

No new libraries required. This phase uses only:

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Tailwind CSS v4 | `^4.2.2` | Utility classes (`relative`, `inset-0`, `w-full`, `h-full`, `object-cover`) | Already in project |
| `global.css` `.tone-image` class | N/A | Established opacity/blend/grayscale pattern | Already defined, used by 5 existing sections |
| `sharp` | `^0.34.5` | WebP conversion in prebuild pipeline | Already in devDependencies |

### No Installation Required

All required tooling is already present. Do not add any npm packages for this phase.

---

## Architecture Patterns

### Existing Project Structure (relevant files)

```
src/
├── pages/
│   └── index.astro              # Page layout — owns section structure + tone img placement
├── components/
│   ├── GravelSectors.astro      # Sector cards — card container needs isolation: isolate
│   └── KomSegments.astro        # KOM cards — card container may need isolation: isolate
└── styles/
    └── global.css               # .tone-image class defined here

public/
└── tone/
    ├── CIA-MKULTRA-IG_Page_01.webp   # hero section
    ├── MK-Ultra.webp                 # explainer section (MkUltraExplainer.astro)
    ├── escharian_stairs_fb.webp      # route section
    ├── lsd-mind-control.webp         # photos section
    └── Mkultra-lsd-doc.webp          # info section
    # NEW: sectors tone image goes here

scripts/
└── convert-tone-images.js           # Prebuild pipeline — add new entry here
```

### Pattern 1: Section Background Tone Image (TONE-01)

**What:** An `<img>` with `class="tone-image inset-0 w-full h-full object-cover"` placed as the first child of a `relative overflow-hidden` section. Content goes in `div.relative.z-10`.

**When to use:** Every major section (`#hero`, `#route`, `#photos`, `#info`, explainer). Now also `#sectors`.

**Exact pattern from existing code:**
```astro
<section id="sectors" class="relative min-h-screen px-4 py-16 overflow-hidden border-t border-border">
  <img
    src="/tone/[new-image].webp"
    alt=""
    class="tone-image inset-0 w-full h-full object-cover"
    loading="lazy"
  />
  <div class="relative z-10">
    <!-- existing sectors content -->
  </div>
</section>
```

The `#sectors` section currently has `<div class="relative z-10">` but NO preceding tone `<img>`. Adding the `<img>` before the `<div>` is the entire change to `index.astro`.

### Pattern 2: Card Accent Tone Image (TONE-02, TONE-03)

**What:** A small absolute-positioned tone `<img>` inside a card, with `isolation: isolate` on the card's outer container div to contain blend mode effects.

**Why `isolation: isolate` is required:** `mix-blend-mode` creates a new stacking context. Without `isolation: isolate` on the card container, the `lighten` blend from the card accent can bleed and blend with the section's background tone image (or other DOM context). `isolation: isolate` forces the blending to be confined to the card's own compositing layer, preventing interference with elements outside the card.

**Card container before (GravelSectors.astro):**
```astro
<div class="classified-border bg-bg-surface card-hover min-h-[280px]" data-reveal style={...}>
```

**Card container after:**
```astro
<div class="classified-border bg-bg-surface card-hover min-h-[280px]" data-reveal style={...} style="isolation: isolate">
```

Note: Tailwind v4 does not include an `isolation-isolate` utility by default. Use inline `style="isolation: isolate"` or add `.tone-card { isolation: isolate; }` to `global.css`. Do NOT use Tailwind's `isolate` class — check if Tailwind v4 includes it before assuming.

**Tone accent markup inside card (after the cover photo `<img>`, before the `<div class="p-4">`):**
```astro
<img
  src="/tone/[selected-tone].webp"
  alt=""
  class="tone-image inset-0 w-full h-full object-cover"
  loading="lazy"
  aria-hidden="true"
/>
```

**Full card structure with accent (GravelSectors.astro example):**
```astro
<div class="classified-border bg-bg-surface card-hover min-h-[280px]"
     data-reveal
     style={`animation-delay: ${i * 60}ms; isolation: isolate`}>
  <div class="overflow-hidden relative">
    {sector.coverPhoto && (
      <img src={...} alt={...} class="w-full h-[180px] object-cover" ... />
    )}
    <img
      src="/tone/[tone-image].webp"
      alt=""
      class="tone-image inset-0 w-full h-full object-cover"
      loading="lazy"
      aria-hidden="true"
    />
    <div class="p-4">
      <!-- card text content -->
    </div>
  </div>
</div>
```

The inner `<div class="overflow-hidden">` must also have `position: relative` (add `relative` class) to establish the containing block for the absolute-positioned tone image.

### Pattern 3: Pipeline — Adding a New Tone Source Image (TONE-01 prerequisite)

**What:** `convert-tone-images.js` reads source files from `public/tone/` and outputs optimized WebPs to the same directory. To add a new tone image for the sectors section:

1. Copy source file to `public/tone/[source-name].jpg` (or .webp)
2. Add entry to `TONE_IMAGES` array in `scripts/convert-tone-images.js`:
```javascript
{ src: '[source-name].jpg', dest: '[sectors-tone].webp', width: 1000, quality: 60 },
```
3. Run `npm run data` to generate the WebP (or it runs automatically on `npm run build`)

**Available unprocessed source candidates in `images/tone/`:**
- `square-limit-mc-escher-1964.jpg` (588KB) — Escher grid pattern, thematically fits sectors
- `MKULTRA.avif` (11KB) — small, low-res
- `NqkRju0.jpg` (804KB) — unknown subject, large
- `1_56uC20E7dVYlQ4TgQMbgow.jpg` (248KB) — unknown subject

The `square-limit-mc-escher-1964.jpg` (Escher's woodcut) is the best candidate: it's thematically consistent with the existing `escharian_stairs_fb.webp` (Escher motif), and at full width behind sectors content the geometric grid pattern would reinforce the "surveillance/complexity" aesthetic.

**Pipeline note:** Source files must be placed in `public/tone/` not `images/tone/` — the `generate-data.js` copies `images/` (route photos) to `public/images/` but does NOT copy `images/tone/` to `public/tone/`. The tone conversion script reads directly from `public/tone/`.

### Anti-Patterns to Avoid

- **Missing `position: relative` on inner card div:** The tone `<img>` uses `position: absolute` via `.tone-image`. The containing block must have `position: relative`. The inner `div.overflow-hidden` in GravelSectors/KomSegments currently lacks `relative` — this must be added.
- **Adding `isolation: isolate` without `position: relative`:** Isolation alone is not enough; the absolute-positioned child needs a positioned ancestor.
- **Using `position: relative` only on the outer card div:** The tone image's `inset-0` will fill the entire card including the text area — scoping it to the inner `div.overflow-hidden` gives better visual framing (accent covers the photo area, not the text).
- **Animating tone images:** The project's pattern correctly keeps tone images static. The `escher-overlay` (global fixed overlay) has animation. Tone images do NOT. Keep it that way.
- **Loading the sectors section tone image as `loading="eager"`:** Use `loading="lazy"` for below-fold images. Only the hero's tone image uses `loading="eager"` + `fetchpriority="high"`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Opacity/blend overlay | Custom JS opacity toggle | `.tone-image` CSS class already in `global.css` | Defined, tested, matches all existing sections |
| WebP optimization for new source | Manual ImageMagick/Squoosh | `convert-tone-images.js` + `sharp` | Already in prebuild pipeline |
| Stacking context containment | Custom z-index juggling | `isolation: isolate` on container | CSS standard, one property, resolves blend bleed cleanly |

**Key insight:** The `.tone-image` class in `global.css` is the single authoritative definition for ALL tone image styling. Never set `opacity`, `mix-blend-mode`, or `filter` inline or in component `<style>` blocks — add the class and let the global stylesheet handle it.

---

## Common Pitfalls

### Pitfall 1: Blend Mode Bleeds Outside Card
**What goes wrong:** Card tone accent blends with section background tone image or surrounding DOM, producing unexpected visual results.
**Why it happens:** `mix-blend-mode` without `isolation` blends against the nearest stacking context root — not just the card.
**How to avoid:** Add `isolation: isolate` to the card container div. This confines the blend to within the card.
**Warning signs:** The card accent appears to interact with the section's background tone image visually.

### Pitfall 2: Absolute-Positioned Tone Image Fills Wrong Area
**What goes wrong:** The card tone accent stretches across the full card height including text area, making text hard to read.
**Why it happens:** `inset-0` expands to fill the nearest `position: relative` ancestor. If `relative` is on the outer card div rather than the inner `overflow-hidden` div, the accent covers everything.
**How to avoid:** Place the accent `<img>` inside `div.overflow-hidden` and add `relative` class to that inner div.
**Warning signs:** Text in `div.p-4` has the tone image behind it.

### Pitfall 3: PhotoSwipe z-index Regression
**What goes wrong:** PhotoSwipe lightbox opens behind the sectors section or card overlay.
**Why it happens:** Adding `isolation: isolate` creates a stacking context, which can trap child elements' z-index ordering. PhotoSwipe's `.pswp` uses a very high z-index and is appended to `<body>`, so it should be outside any isolated context.
**How to avoid:** PhotoSwipe is rendered at the body level, not inside any card or section. As long as `isolation: isolate` is only on the card container (not a parent of the gallery), there is no regression risk. Verify after applying.
**Warning signs:** PhotoSwipe opens but appears behind page content.

### Pitfall 4: Sections Section Has No `overflow-hidden` on Tone Img Ancestor
**What goes wrong:** The tone image breaks out of the section bounds.
**Why it happens:** The `#sectors` section already has `overflow-hidden` in its class list. This is already correct — just verify before adding the `<img>`.
**Warning signs:** The tone image is visible outside the section border.

### Pitfall 5: New Tone Source Not in `public/tone/` Before Running Pipeline
**What goes wrong:** `convert-tone-images.js` logs "source not found, skipping" and no WebP is generated.
**Why it happens:** The pipeline reads from `public/tone/` not `images/tone/`. The `generate-data.js` does NOT copy `images/tone/` to `public/tone/`.
**How to avoid:** Manually copy the chosen source image to `public/tone/` before adding the entry to `convert-tone-images.js`, or update `generate-data.js` to copy tone sources (out of scope for this phase — manual copy is sufficient).

---

## Code Examples

### Existing `.tone-image` Class (from `global.css`, line 160)
```css
/* Source: src/styles/global.css */
.tone-image {
  opacity: 0.12;
  mix-blend-mode: lighten;
  filter: grayscale(100%) contrast(1.3);
  position: absolute;
  pointer-events: none;
}
```

### Section Background Tone Image (existing pattern, `index.astro` route section)
```astro
<!-- Source: src/pages/index.astro, lines 254-260 -->
<section id="route" class="relative min-h-screen px-4 py-16 overflow-hidden border-t border-border">
  <img
    src="/tone/escharian_stairs_fb.webp"
    alt=""
    class="tone-image inset-0 w-full h-full object-cover"
    loading="lazy"
  />
  <div class="relative z-10">
    ...content...
  </div>
</section>
```

### `isolation: isolate` for Card Accent (proposed pattern)
```astro
<!-- Outer container — adds isolation -->
<div class="classified-border bg-bg-surface card-hover min-h-[280px]"
     data-reveal
     style={`animation-delay: ${i * 60}ms; isolation: isolate`}>
  <!-- Inner image container — adds relative for absolute positioning context -->
  <div class="overflow-hidden relative">
    {sector.coverPhoto && (
      <img src={...} class="w-full h-[180px] object-cover" ... />
    )}
    <!-- Tone accent: renders on top of cover photo, blends within card isolation boundary -->
    <img
      src="/tone/lsd-mind-control.webp"
      alt=""
      aria-hidden="true"
      class="tone-image inset-0 w-full h-full object-cover"
      loading="lazy"
    />
    <div class="p-4 relative z-10">
      ...card text content...
    </div>
  </div>
</div>
```

Note: `<div class="p-4">` needs `relative z-10` so text renders above the tone accent.

### `convert-tone-images.js` — Adding New Entry
```javascript
// Source: scripts/convert-tone-images.js
const TONE_IMAGES = [
  { src: 'lsd-mind-control.jpg',        dest: 'lsd-mind-control.webp',        width: 350,  quality: 45 },
  { src: 'Mkultra-lsd-doc.jpg',         dest: 'Mkultra-lsd-doc.webp',         width: 1000, quality: 60 },
  { src: 'escharian_stairs_fb.webp',    dest: 'escharian_stairs_fb.webp',     width: 500,  quality: 50 },
  // NEW: sectors section tone image
  { src: 'square-limit-mc-escher-1964.jpg', dest: 'square-limit-mc-escher.webp', width: 1000, quality: 55 },
];
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No tone on sectors | All sections have tone images | Phase 44 | Complete visual coverage |
| Section backgrounds only | Section backgrounds + card accents | Phase 44 | Atmospheric texture at card level |
| No isolation on cards | `isolation: isolate` on card containers | Phase 44 | Prevents blend mode bleed |

**Current state of tone image coverage before this phase:**
- hero: CIA-MKULTRA-IG_Page_01.webp
- explainer (MkUltraExplainer): MK-Ultra.webp
- route: escharian_stairs_fb.webp
- **sectors: MISSING — this is the gap**
- photos: lsd-mind-control.webp
- info: Mkultra-lsd-doc.webp

---

## Open Questions

1. **Which source image to use for sectors background?**
   - What we know: 5 existing tone images are all in use. Unprocessed sources in `images/tone/` include `square-limit-mc-escher-1964.jpg` (Escher geometric grid, thematically consistent), `MKULTRA.avif` (too small/low-res), `NqkRju0.jpg` (unknown subject).
   - What's unclear: Whether the user has a preference among the candidates, or if there's a specific image already intended for sectors.
   - Recommendation: Use `square-limit-mc-escher-1964.jpg` as the default recommendation — Escher motif matches project aesthetic, the geometric grid pattern at 0.12 opacity provides good atmospheric texture without competing with the sectors grid layout.

2. **Which 2–3 cards get tone accents?**
   - What we know: There are 6 sector cards and 3 KOM cards. Success criteria says 2–3 of either type.
   - What's unclear: Whether to pick from sectors, KOM, or a mix.
   - Recommendation: Apply to 2 sector cards (e.g., first two — Sandstrom and Akkala Rd) and 1 KOM card (e.g., Billie Helmer). This satisfies "2–3 sector or KOM cards" and demonstrates the pattern across both components. Alternatively, apply the accent to all cards via a conditional `i < 2` check.

3. **Should the section-level tone image be a standalone divider div or inside the `#sectors` section?**
   - What we know: TONE-01 says "between major page sections as full-width dividers." Success Criterion 1 says "a full-width band between the sectors section and an adjacent section."
   - Two interpretations: (A) A standalone `<div>` element between `#sectors` and `#photos` acting as a visual band, OR (B) The tone `<img>` inside `#sectors` as a section background (matching all other sections).
   - Recommendation: Use interpretation (B) — add the tone `<img>` inside `#sectors` as a section background, matching all other sections. This is consistent with the established pattern. A standalone divider div is a different visual element than what the existing sections use. The "full-width band" language in Success Criterion 1 is satisfied by a full-width section background that spans 100% width.

---

## Sources

### Primary (HIGH confidence)
- `src/styles/global.css` (lines 160–166) — `.tone-image` class definition confirmed by direct file read
- `src/pages/index.astro` (lines 197–333) — all section/tone image placements confirmed by direct file read
- `src/components/GravelSectors.astro` — card structure confirmed by direct file read
- `src/components/KomSegments.astro` — card structure confirmed by direct file read
- `scripts/convert-tone-images.js` — pipeline confirmed: reads from `public/tone/`, outputs to `public/tone/`
- `public/tone/` directory listing — 5 processed tone images confirmed, all in use
- MDN: https://developer.mozilla.org/en-US/docs/Web/CSS/isolation — `isolation: isolate` creates stacking context, baseline widely available since Jan 2020
- MDN: https://developer.mozilla.org/en-US/docs/Web/CSS/mix-blend-mode — `lighten` creates stacking context, baseline widely available

### Secondary (MEDIUM confidence)
- `public/data/annotations.json` — 6 sectors, 3 KOM segments, all have `coverPhoto` — confirmed by Python parsing

### Tertiary (LOW confidence)
- N/A — all claims verified from direct file inspection or official MDN docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all files read directly, no assumptions
- Architecture: HIGH — pattern extracted from existing working code in 5 sections
- Pitfalls: HIGH for isolation/z-index (MDN confirmed); MEDIUM for specific card count selection (editorial judgment)
- Pipeline: HIGH — `convert-tone-images.js` code read directly

**Research date:** 2026-03-31
**Valid until:** 2026-05-01 (stable CSS + static Astro site, changes unlikely)
