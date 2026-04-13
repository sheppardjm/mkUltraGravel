# Feature Landscape: Magazine Editorial Layout + Elevation Label Fix

**Domain:** Action sports / cycling editorial web design
**Project:** MK Ultra Gravel — v10.6 Explainer Redesign
**Researched:** 2026-04-13
**Confidence:** HIGH (CSS properties), MEDIUM (editorial pattern conventions)

---

## Context: What This Milestone Adds

The milestone has two scopes:

1. **Grinduro explainer redesign:** Replace the current `classified-border` box containing 3 paragraphs with a magazine editorial spread — text broken by filtered tone images between paragraphs.
2. **Elevation label fix:** A separate, smaller scope (likely a bug fix to KOM or sector labels on the elevation profile).

This FEATURES.md covers both. The editorial redesign is the primary creative scope.

---

## Existing Design System (What the Redesign Must Integrate With)

| Token | Value | Notes |
|-------|-------|-------|
| `--color-bg-base` | `oklch(0.10 0.01 250)` | Near-black; all tone images render against this |
| `--color-accent-green` | `oklch(0.85 0.24 145)` | Chartreuse — primary accent, Special Elite headers |
| `--color-accent-red` | `oklch(0.60 0.22 25)` | Stamp / classified label |
| `--color-accent-white` | `oklch(0.92 0.01 90)` | Strong text emphasis |
| `--color-text-body` | `oklch(0.85 0.01 90)` | Body copy |
| `--color-text-muted` | `oklch(0.70 0.01 90)` | Labels, captions |
| `--color-border` | `oklch(0.25 0.01 250)` | Subtle separator |
| `--font-display` | Special Elite | Headers, stamps |
| `--font-mono` | Space Mono | All body copy |

**Existing animated overlay layers (must NOT be broken or duplicated by the redesign):**
- `.grain-overlay` — fixed, z-index 9999, 6% opacity SVG noise, full viewport
- `.escher-overlay` — fixed, z-index 9998, 5% opacity Penrose tessellation with 50s drift
- `.lizard-bg` — animating background texture
- All three use `pointer-events: none` and `position: fixed` — they are viewport-level, not section-level

**Existing `.tone-image` class:**
```css
.tone-image {
  opacity: 0.12;
  mix-blend-mode: lighten;
  filter: grayscale(100%) contrast(1.3);
  position: absolute;
  pointer-events: none;
}
```
This is the baseline treatment already in use on `MkUltraExplainer.astro`. The redesign should branch from here, not reinvent it.

**Tone image inventory (32 files in `images/tone/`):**
CIA documents, MK Ultra imagery, Escher art, LSD visuals, stickers, movie stills. Mix of JPG, WebP, AVIF. No processed derivatives exist yet — all full-resolution originals.

---

## Table Stakes

Features that must exist for the redesign to feel like a magazine editorial. Missing any of these = it reads as a basic text block with pictures stuck in.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Images between paragraphs** | Action sports magazine cadence: text → image → text. Rhythm breaks text monotony. | LOW | 3 paragraphs = 2 image breaks. Each break is one tone image per gap. |
| **Full-width image breaks** | Print magazines use full-bleed images as section dividers. Web equivalent is edge-to-edge, escaping content column constraint. | LOW-MEDIUM | CSS Grid full-bleed technique: wrapper with `1fr [content] 1fr`, `.full-bleed { grid-column: 1 / -1 }` |
| **CSS-filtered tone images** | The design system already establishes this language via `.tone-image`. Editorial spreads in this aesthetic use heavily filtered imagery — not clean photos. | LOW | Layer on top of existing `.tone-image` baseline; vary filter chains per image for visual distinctiveness |
| **Image opacity low enough to read against** | If tone images are purely decorative texture between paragraphs (not placed behind text), opacity can be higher than the 0.12 background treatment. 20–40% range is workable for between-paragraph images. | LOW | Already controlled by the `.tone-image` class; adjust per-image inline if needed |
| **Section label / header above explainer** | Editorial sections always have a department label or section header — e.g., "FORMAT EXPLAINER" or "HOW IT WORKS". Currently only "Grinduro Format" in muted text. | LOW | Use `--font-display` (Special Elite) in uppercase with tracking — matches `.stamp` pattern |
| **Consistent left-edge text column width** | Magazine body copy never runs full viewport width. 45–65 character line length is the reading standard. Current `max-w-2xl` (672px) is appropriate. Maintain on mobile. | LOW | Already achieved; do not break this in the redesign |
| **Vertical spacing rhythm** | Magazine spreads have generous whitespace between text and image — not tight web padding. `py-8` to `py-12` between elements minimum. | LOW | Tailwind spacing tokens; already exists in design system |

---

## Differentiators

Features that make this feel like a real magazine spread — not just text with pictures dropped in.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Varied filter chains per tone image** | Single identical filter applied to all 32 images looks like a template. Each break gets a distinct treatment — one green-tinted, one high-contrast noir, one hue-rotated psychedelic. Visual variety signals editorial curation, not automation. | LOW | CSS filter order matters; see recipe table below |
| **Oversized display type for paragraph openers** | Action sports magazines (Transworld, Dirt, Pinkbike features) use large initial letters or visually heavy first-line type to open feature sections. A `::first-letter` drop cap or scaled first-line with `font-size: 1.5–2em` using Special Elite signals editorial investment. | LOW-MEDIUM | `::first-letter` has 97%+ browser support; `initial-letter` is NOT baseline (missing Firefox as of 2026). Use `::first-letter` with `float: left` + `font-size: 3em` for safe cross-browser drop cap. |
| **Pull quote between paragraphs** | A key phrase extracted and displayed at larger type creates a visual anchor — tells the reader what the paragraph means before they read it. For Grinduro, "Race the sectors. Suffer together." as a pull quote between paragraphs 2 and 3 lands with weight. | LOW | `blockquote` or `aside` element. Use `--font-display`, large size, `--color-accent-green`, slightly rotated (`transform: rotate(-1deg)`). |
| **Image caption / source label** | Editorial images have minimal captions below them — one line, muted text, identifying source. For CIA documents this is on-brand: "CIA MKULTRA Collection, 1953" in `text-text-muted text-xs uppercase tracking-widest`. Already used in `MkUltraExplainer.astro` source attribution. | LOW | `<figcaption>` element. Do not over-label — one per image at most. |
| **Slight rotation on tone images** | Print magazines use subtle tilt on photos for editorial informality — not grid-locked. `transform: rotate(-1deg)` or `rotate(1deg)` alternating per image creates collage texture. | LOW | CSS transform only. Combine with `overflow: hidden` on wrapper to clip rotated edges if needed. |
| **`mix-blend-mode: lighten` to reveal image on dark bg** | Already established in `.tone-image`. `lighten` means dark pixels in the image disappear into the dark background — only light content shows. This is the core technique for "ghosting" CIA documents onto the dark background. | LOW | Already present in design system; confirmed HIGH confidence from MDN docs |
| **Different image aspect ratios in sequence** | Magazines break rhythm with a landscape image followed by a portrait crop. Using a wide CIA document scan (landscape) then a portrait LSD artwork creates visual surprise. All tone images are pre-existing assets — no new image creation required. | LOW | `object-fit: cover` on consistent container heights; vary container height between breaks (e.g., `h-32` vs `h-48`) |

---

## CSS Filter Recipes

These are concrete filter combinations for the tone images. Apply via inline `style` attribute or Tailwind's `[filter:...]` arbitrary property to vary per image.

**Recipe A — Green phantom (CIA document reveal):**
```css
filter: grayscale(100%) contrast(1.4) brightness(0.7);
mix-blend-mode: lighten;
opacity: 0.25;
```
Effect: Stark black-and-white document, faint chartreuse tint from background bleeds through via `lighten` blend mode.

**Recipe B — Invert burn (psychedelic/LSD imagery):**
```css
filter: invert(1) hue-rotate(100deg) saturate(1.5) contrast(1.2);
mix-blend-mode: screen;
opacity: 0.15;
```
Effect: Colors shift dramatically — green-dominant psychedelic wash. `screen` blend mode on dark background creates additive glow effect.

**Recipe C — Sepia ghost (Escher / vintage print):**
```css
filter: sepia(0.8) contrast(1.3) brightness(0.65);
mix-blend-mode: lighten;
opacity: 0.30;
```
Effect: Warm amber-brown ghost tone — reads as aged paper or vintage print.

**Recipe D — Hard noir (high-contrast CIA document):**
```css
filter: grayscale(100%) brightness(0.5) contrast(2.0);
mix-blend-mode: lighten;
opacity: 0.35;
```
Effect: Extreme two-tone — only the whitest parts of the image ghost through. Best for text documents where you want letter fragments to emerge.

**Recipe E — Hue-rotated landscape (outdoor photo):**
```css
filter: hue-rotate(180deg) saturate(0.8) contrast(1.1);
mix-blend-mode: lighten;
opacity: 0.20;
```
Effect: Familiar scene becomes alien — blues become orange-red, greens become purple. Disorienting for LSD sticker imagery.

**Note on filter order:** `grayscale()` before `sepia()` yields full gray (sepia has no hue to work with). `sepia()` before `grayscale()` yields full gray too. If combining both, apply `sepia()` only and omit `grayscale()`. `hue-rotate()` after `invert()` shifts the inverted colors, not the originals — useful for psychedelic stacking.

**Blend mode selection guide for dark backgrounds:**
- `lighten`: Image only visible where lighter than background. On near-black background, most of image shows. Safe default.
- `screen`: Additive — brighter than `lighten`. Use for glowing/neon effects at low opacity.
- `multiply`: Image only visible where darker than background. On dark bg, nearly everything disappears. Avoid.
- `overlay`: Boosted contrast on mid-tones. Works on mid-gray toned images.

---

## Anti-Features

Features to deliberately NOT build. These degrade UX or conflict with the existing design.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Parallax scrolling on tone images** | Scrolljacking anti-pattern confirmed by NN/g and multiple sources. Breaks vestibular accessibility, fails on iOS Safari, penalizes users who scroll fast. The existing escher and lizard animations already provide motion texture — more scroll-triggered motion is noise. | Static positioned images. Motion comes from existing fixed-position overlay layers. |
| **Carousel / slider between paragraphs** | Adds JavaScript, hidden-image SEO penalty, and breaks the linear reading flow that editorial spreads depend on. Action sports magazines do not carousel their feature images. | Static single image per break. Two images total (3 paragraphs = 2 gaps). |
| **Image caption that restates the paragraph** | Redundant. Captions in editorial design are source attribution or oblique one-liners, not summaries. | Max one-line caption: source name + year. Or omit entirely. |
| **Border or card box around tone images** | The existing `classified-border` box is used for the text content. Adding more boxes around the images makes everything feel like a data dashboard, not a magazine spread. | Full-bleed images, no border, no background fill, no card chrome. |
| **JavaScript-based fade-in for images** | The existing `scroll-reveal` animation system already handles entrance animations via IntersectionObserver on `[data-reveal]` elements. Duplicating this with custom JS is a regression. | Add `data-reveal` attribute to tone image containers — they get the standard 0.35s ease-out reveal for free. |
| **Multiple animated overlay layers per section** | The grain, escher, and lizard overlays are fixed-position at viewport level. Adding section-level animated overlays creates visual noise and performance cost. The fixed layers already provide sufficient texture. | One static tone image per paragraph break. The viewport-level overlays do the animation work. |
| **Font change from Space Mono** | The monospace font is load-bearing for the brutalist aesthetic. Introducing a display serif or script font for captions or pull quotes would fracture the visual language. Special Elite is already the display face. | Pull quotes: Special Elite. Captions: Space Mono in `text-xs`. These are already the system fonts. |
| **`initial-letter` CSS property for drop caps** | Not Baseline as of 2026 — absent in Firefox. Using it without fallback creates inconsistent rendering across browsers. | `::first-letter` with `float: left`, `font-size: 3em`, `line-height: 0.8`, `padding-right: 0.15em`. Universal support (97%+). |
| **Inline SVG or Canvas texture layers per section** | The metaball `TopoDivider.astro` canvas already exists as a section divider. Adding more Canvas elements in the explainer section adds performance cost for marginal visual gain. | CSS filter + blend mode on existing tone images. No new Canvas elements. |
| **`shape-outside` text wrap around images** | `shape-outside` requires floated elements and is best for silhouetted images with transparency channels. Tone images are rectangular and heavily filtered — there is no meaningful silhouette to wrap. Text should remain in its constrained column, images break out full-bleed between paragraphs. | Full-bleed image breaks. Text column stays constrained with `max-w-2xl`. |

---

## Feature Dependencies

```
CSS Grid full-bleed layout
  └── required by: full-width image breaks
  └── requires: wrapper element with grid-template-columns: 1fr min(content) 1fr
  └── text paragraphs default to center column
  └── .full-bleed images span 1 / -1

CSS filter recipes
  └── requires: tone images loaded in /public/tone/ (already exists)
  └── enhances: mix-blend-mode: lighten (already on .tone-image)
  └── varies per image via inline style or Tailwind arbitrary

Drop cap (::first-letter)
  └── applies to: first paragraph of redesigned explainer only
  └── requires: Special Elite font (already loaded)
  └── uses: float: left pattern (no new dependencies)

Pull quote
  └── placed between: paragraph 2 and paragraph 3
  └── uses: Special Elite + accent-green (already tokens)
  └── conflicts with: classified-border box if kept (pull quote should NOT be inside classified-border)

scroll-reveal entrance
  └── tone images get: data-reveal attribute
  └── uses: existing IntersectionObserver in global.css + layout script
  └── no new JS required
```

### Dependency Notes

- **Full-bleed layout requires a grid wrapper at section level.** The current `GrinduroExplainer.astro` wraps content in a `classified-border div`. That box must be removed or restructured — a `classified-border` that constrains everything cannot coexist with full-bleed image breaks that escape the column. Choose: either keep `classified-border` for the text content only (and place images outside/between), or drop the box entirely in favor of the magazine spread structure.
- **`mix-blend-mode` requires `isolation: isolate` on parent.** If the tone images blend incorrectly with elements behind them (e.g., the fixed overlay layers), add `isolation: isolate` to the section wrapper. This creates a new stacking context, preventing blend modes from compositing against fixed-position ancestors.

---

## MVP Recommendation

This is a single-component redesign. "MVP" here means the minimum that delivers magazine feel vs. the current text box.

### Launch With (Phase 1: core editorial structure)

- [ ] Remove `classified-border` wrapper from Grinduro explainer (or restructure to allow full-bleed breaks)
- [ ] Implement CSS Grid full-bleed layout on the section
- [ ] Add two tone image breaks (between paragraphs 1–2 and 2–3) with filter Recipe A and Recipe D
- [ ] Apply `data-reveal` to image containers for existing scroll-reveal entrance
- [ ] Preserve `p.text-text-muted` section label ("Grinduro Format")

### Add After Phase 1 (Phase 2: editorial flourish)

- [ ] Drop cap on first paragraph using `::first-letter` (Special Elite, `float: left`, `font-size: 3em`)
- [ ] Pull quote between paragraphs 2 and 3: "Race the sectors. Suffer together." — Special Elite, accent-green, slight negative rotation
- [ ] Figure captions under tone images: source attribution line in `text-text-muted text-xs uppercase`
- [ ] Vary filter recipe between the two image breaks (A + D or B + C — not two identical treatments)

### Elevation Label Fix (Separate Phase)

The phase title includes "elevation label fix" — this is distinct from the editorial redesign. Based on existing phase plans (phases 19 and 20 added KOM bands and bike icon crosshair to the elevation profile), the likely fix is a label positioning or display issue on KOM segment labels or sector bands. Research for that specific bug is in the debug files.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Full-bleed image breaks | HIGH — primary visual impact | LOW | P1 |
| CSS Grid full-bleed layout | HIGH — enables image breaks | LOW | P1 |
| CSS filter recipes on tone images | HIGH — CIA aesthetic texture | LOW | P1 |
| Drop cap (first letter) | MEDIUM — editorial signal | LOW | P2 |
| Pull quote | MEDIUM — readability anchor | LOW | P2 |
| Image captions | LOW — attribution only | LOW | P3 |
| Slight image rotation | LOW — collage texture | LOW | P3 |

---

## Sources

- [MDN — CSS filter property](https://developer.mozilla.org/en-US/docs/Web/CSS/filter) — HIGH confidence: all filter functions, parameter ranges, order effects
- [Josh W. Comeau — CSS full-bleed layout](https://www.joshwcomeau.com/css/full-bleed/) — HIGH confidence: CSS Grid full-bleed technique with named columns
- [MDN — mix-blend-mode](https://developer.mozilla.org/en-US/docs/Web/CSS/mix-blend-mode) — HIGH confidence: blend mode values and dark background behavior
- [MDN — initial-letter](https://developer.mozilla.org/en-US/docs/Web/CSS/initial-letter) — HIGH confidence: "not Baseline" status confirmed, Firefox missing
- [caniuse.com — CSS initial-letter](https://caniuse.com/css-initial-letter) — HIGH confidence: browser support table
- [caniuse.com — ::first-letter](https://caniuse.com/css-first-letter) — HIGH confidence: 97%+ support confirmed
- [DEV Community — CSS Image Filters Guide 2025](https://dev.to/satyam_gupta_0d1ff2152dcc/css-image-filters-the-ultimate-guide-to-stunning-visual-effects-in-2025-2mc4) — MEDIUM confidence: filter combination recipes
- [NN/g — Parallax Usability](https://www.nngroup.com/articles/parallax-usability/) — HIGH confidence: parallax anti-pattern, scrolljacking UX problems
- [Beamtic — Avoid Scrolljacking](https://beamtic.com/scrolljacking-a-ux-problem) — MEDIUM confidence: scrolljacking UX anti-pattern
- [Wikipedia — Pull quote](https://en.wikipedia.org/wiki/Pull_quote) — HIGH confidence: definition and editorial role
- [Smashing Magazine — Magazine Layout with CSS Grid Areas](https://www.smashingmagazine.com/2023/02/build-magazine-layout-css-grid-areas/) — MEDIUM confidence: CSS Grid editorial patterns
- Direct codebase inspection: `GrinduroExplainer.astro`, `MkUltraExplainer.astro`, `global.css` — HIGH confidence on existing `.tone-image` class, overlay layer structure, design tokens

---

*Feature research for: MK Ultra Gravel v10.6 Explainer Redesign*
*Researched: 2026-04-13*
