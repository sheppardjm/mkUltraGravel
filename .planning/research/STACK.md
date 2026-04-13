# Stack Research

**Domain:** Editorial magazine-style explainer layout + Chart.js annotation label fix
**Researched:** 2026-04-13
**Confidence:** HIGH (CSS filters via MDN official docs, Chart.js annotation via official docs, Tailwind v4 via official docs, codebase directly inspected)

---

## Scope

Two discrete tasks share this research:

1. **GrinduroExplainer redesign** — Snowboarding magazine editorial layout using tone images with heavy CSS filtering
2. **Down Jeep label fix** — Chart.js annotation label clipping when box is 0.59mi wide on a ~110mi x-axis

Neither task requires new npm packages. Everything resolves with existing stack + CSS authoring decisions.

---

## Recommended Stack

### Core Technologies (unchanged — do not re-add)

| Technology | Version | Purpose | Why Relevant |
|------------|---------|---------|-------------|
| Astro | 6.1.1 | Static site generation | Component authoring for new layout |
| Tailwind v4 | 4.2.2 | Utility CSS + design tokens | Filter utilities, grid, mix-blend-mode classes |
| Chart.js | 4.5.1 | Elevation profile canvas | Annotation label config for Down Jeep fix |
| chartjs-plugin-annotation | 3.1.0 | Sector band overlays | Label `rotation`, `yAdjust`, `position` options |
| sharp | 0.34.5 | Build-time image processing | Available but NOT needed for this milestone |

### Supporting Libraries (no additions required)

The 10 production-ready images in `public/tone/` are already built-format WebP/JPG served statically. No new image pipeline is required. CSS filters handle all visual transformation at paint time. The 32 images in `images/tone/` are source assets; the 10 in `public/tone/` are the already-processed outputs available to `<img src="/tone/...">` tags.

---

## CSS Filter Strategy for Tone Images

### Why CSS-only (no sharp preprocessing)

The tone images serve as ghosted background texture, not foreground content. Their purpose is atmosphere, not fidelity. CSS filters applied at paint time:

- Require zero build pipeline changes
- Allow per-image variation via inline style or utility class modifiers
- Are reversible — no destructive preprocessing of source files
- Have zero runtime JS cost (GPU-composited layer by the browser)
- Work in all browsers since 2016 (Baseline Widely Available per MDN)

Sharp preprocessing would be warranted only if tone images were performance-critical above-the-fold content needing format negotiation. They are not. The existing `public/tone/` pattern (plain `<img>` with `/tone/` URL) is correct.

### Existing baseline (from `global.css` `.tone-image` class)

```css
.tone-image {
  opacity: 0.12;
  mix-blend-mode: lighten;
  filter: grayscale(100%) contrast(1.3);
  position: absolute;
  pointer-events: none;
}
```

This is the correct foundation. `mix-blend-mode: lighten` on a dark background (`oklch(0.10)`) means only pixels brighter than the background bleed through — creating a photographic ghost effect. `grayscale(100%)` removes all source color so the oklch palette controls all hue in the composition. `contrast(1.3)` sharpens edges for a documentary/xerox aesthetic. The existing `MkUltraExplainer.astro` extends this with Tailwind's `invert-100` class to flip dark/light areas for specific images.

### CSS filter functions available (verified via MDN)

Ten native CSS filter functions exist. There is no `posterize()`. Posterization requires an SVG `feComponentTransfer` filter referenced via `filter: url(#id)` — not worth the DOM complexity for background textures.

| Function | Use for tone images |
|----------|-------------------|
| `grayscale(100%)` | Always — strip source color |
| `contrast(1.3–2.5)` | Amplify — higher = more xerox/dossier feel |
| `brightness(0.5–1.2)` | Lower to deepen, raise to lighten halos |
| `invert(100%)` | Flip dark/light — good for text-heavy CIA documents |
| `sepia(100%)` | Warm tint without color; lower opacity version looks aged |
| `hue-rotate(90deg–180deg)` | Psychedelic color cast — works post-grayscale only if paired with `saturate()` |
| `blur(px)` | Soft diffusion — use sparingly, degrades at high contrast values |

**Order matters:** `grayscale()` before other filters eliminates color; applying `sepia()` after `grayscale()` produces a warm grey, not brown.

### Filter combination recipes for editorial magazine feel

All CSS-only. Applied via `style` attribute or additional utility classes on the `<img>`.

**Recipe 1: CIA document / declassified xerox**
```css
filter: grayscale(100%) contrast(2) brightness(0.7);
mix-blend-mode: lighten;
opacity: 0.15;
```
Effect: Crushes midtones, lifts edges, looks like a photocopied dossier. Recommended for CIA-MKULTRA document images. Higher opacity than baseline because high contrast already obscures recognizability.

**Recipe 2: Deep ghost / subtle texture**
```css
filter: grayscale(100%) contrast(1.5) brightness(0.5);
mix-blend-mode: lighten;
opacity: 0.10;
```
Effect: Very subdued — retreats behind text without competing. Use for large images spanning the full explainer section height.

**Recipe 3: Inverted negative (already used in MkUltraExplainer)**
```css
filter: grayscale(100%) contrast(1.3) invert(100%);
mix-blend-mode: lighten;
opacity: 0.12;
```
Effect: Flips dark/light — text-heavy documents read as white-on-dark ghost. Tailwind `invert` class handles this, no custom CSS needed.

**Recipe 4: Screen mode glow**
```css
filter: grayscale(100%) contrast(1.8) brightness(1.2);
mix-blend-mode: screen;
opacity: 0.08;
```
Effect: Screen brightens and spreads light areas, creating halo-like luminance. Lower opacity required to prevent washout. Use for images with large bright regions (e.g., Escher drawings with white backgrounds).

**What NOT to attempt:**
- Posterize via SVG `feComponentTransfer` — complexity exceeds visual gain for background texture
- CSS `color-mix()` for image tinting — only works on color values, not raster image pixels
- Canvas 2D pixel manipulation — no JS animation libraries per project constraint, and CSS achieves the same result at lower cost

### Mix-blend-mode selection for dark backgrounds (oklch(0.10))

| Mode | Effect on dark bg | Recommended |
|------|------------------|-------------|
| `lighten` | Only pixels brighter than dark bg show — perfect ghost effect | YES — default |
| `screen` | Spreads and brightens light areas — halo/glow | YES — for bright-region images |
| `overlay` | Punches contrast, dark stays dark | YES — for texture punch |
| `multiply` | Darkens everything — images become invisible on dark bg | NO |
| `color-dodge` | Very bright, can blow out at any opacity | ONLY at opacity < 0.05 |
| `difference` | Unpredictable inversion relative to bg | AVOID |

**Use `lighten` as the default. Use `screen` for images with large bright white regions (CIA documents, Escher drawings) where you want the white to appear to glow.**

### Tailwind v4 utilities available (no custom CSS needed for standard combos)

```html
<!-- Grayscale -->
<img class="grayscale ..." />

<!-- Contrast via arbitrary value bracket syntax -->
<img class="contrast-[2] ..." />

<!-- Blend mode -->
<img class="mix-blend-lighten ..." />
<img class="mix-blend-screen ..." />
<img class="mix-blend-overlay ..." />

<!-- Invert -->
<img class="invert ..." />

<!-- Opacity -->
<img class="opacity-10 ..." />
```

For multi-filter combinations (e.g., `grayscale(100%) contrast(2) brightness(0.7)`), use an inline `style` attribute or a scoped `<style>` block in the `.astro` component. The `.tone-image` global class handles the shared baseline; per-image variation belongs in the component.

---

## Editorial Magazine Layout (GrinduroExplainer)

### CSS Grid pattern — two-column editorial

Snowboarding magazine editorial = large atmospheric image occupies one visual zone, dense mono-spaced text occupies another, they abut or overlap dramatically. No JavaScript required.

**Recommended structure for GrinduroExplainer redesign:**

```html
<section class="relative overflow-hidden">
  <!-- Tone image — absolute background, full bleed -->
  <img class="tone-image inset-0 w-full h-full object-cover [recipe filter]" />
  
  <!-- Two-column grid for content -->
  <div class="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-0">
    <!-- Left column: large decorative image (second tone image, different recipe) -->
    <div class="hidden md:block relative overflow-hidden">
      <img class="w-full h-full object-cover [stronger filter recipe]" />
    </div>
    <!-- Right column: text content -->
    <div class="classified-border p-6 md:p-8 ...">
      <!-- existing text content -->
    </div>
  </div>
</section>
```

Alternative: Full-bleed single-image approach already proven in `MkUltraExplainer.astro` — this is simpler if only one tone image is needed and the text overlays it. The two-column grid adds visual separation between image-zone and text-zone, closer to the magazine-editorial feel.

### Typography tokens (no additions needed)

The existing design system covers all editorial typography requirements:

- `font-display` (Special Elite) — headlines, pull quotes, drop-caps via `::first-letter`
- `font-mono` (Space Mono) — body, captions, labels — the mono font itself reads editorial
- `.stamp` component — rotated red-border classification stamp, already editorial
- `.classified-border` component — CLASSIFIED header, already editorial
- `text-accent-green` / `text-accent-red` / `text-accent-white` — existing emphasis hierarchy

No new fonts or component additions are required.

---

## Chart.js Annotation: Down Jeep Label Fix

### The problem precisely

Down Jeep: `startMi: 83.55`, `endMi: 84.14`, width = **0.59mi** on a 110mi x-axis. At a 700px-wide chart, each mile ≈ 6.4px, so the box is ≈ 3.8px wide. Any label at `rotation: 0` overflows the box width immediately. At `rotation: -90`, the label renders vertically and should theoretically have room — but the label may be clipping against the chart canvas boundary or the box's own narrow pixel footprint.

### Available label options (chartjs-plugin-annotation 3.1.0, verified from official docs)

Complete label sub-object API for `type: 'box'`:

| Option | Type | Default | Relevant to fix |
|--------|------|---------|----------------|
| `rotation` | number | undefined | -90 for narrow — keep or adjust |
| `position` | `{x, y}` or string | `'center'` | Move anchor point within box |
| `xAdjust` | number | 0 | Shift label left/right from anchor (pixels) |
| `yAdjust` | number | 0 | Shift label up/down from anchor |
| `font.size` | number | — | Reduce for narrow boxes |
| `content` | string[] | null | Shorten to abbreviation only |
| `textStrokeWidth` | number | 0 | Halo for legibility |
| `textStrokeColor` | Color | undefined | Halo color |
| `display` | boolean/function | false | Suppress entirely |

**There is no `clip`, `overflow`, or `maxWidth` option on the label sub-object.** The label paints wherever its computed center lands, extending freely beyond the parent box boundary.

The global `clip` option on the annotation plugin (`plugins.annotation.clip`) defaults to `true` — this clips all annotation rendering to the chart area. Labels that try to extend beyond the canvas edge get cut off by this clipping.

### Root cause

With `position: { x: 'center', y: 'end' }` and `rotation: -90`, the label anchor is at the center-x of the 3.8px-wide box (≈ mile 83.85 on screen). The text extends vertically from that point. On a chart that ends at ~110mi, mile 83.85 is ≈ 24px from the right edge — so if the rotated label text extends rightward, it can clip against the canvas boundary. The current code places both label lines (`sector.name` + stars) into `content: labelContent`, which at font-size 9 and -90 rotation means the text extends upward from the anchor. This should work if the box bottom is not at the canvas bottom — but the `yAdjust: i % 2 === 0 ? 0 : -16` alternation is designed for horizontal labels and may position the rotated label unexpectedly.

### Fix options (in order of implementation simplicity)

**Option A: Shorten content + reduce font for narrow sectors (simplest, 2-line change)**
Remove the stars row for narrow sectors; use only the first word of the sector name:
```js
content: isNarrow ? [sector.name] : labelContent,
font: { size: isNarrow ? 7 : 9, family: 'Space Mono, monospace' },
```
The sector name "Down Jeep" fits in ~50px at size 7. With -90 rotation from `center/end` anchor, this has adequate vertical clearance.

**Option B: Shift anchor to `'start'` + xAdjust (RECOMMENDED — clean, no new annotations)**
Move the anchor to the left edge of the box and nudge the label into the open chart space to the left:
```js
position: isNarrow ? { x: 'start', y: 'end' } : { x: 'center', y: 'end' },
xAdjust: isNarrow ? -8 : 0,
yAdjust: isNarrow ? -8 : (i % 2 === 0 ? 0 : -16),
rotation: isNarrow ? -90 : 0,
```
At mile 83.55 with `x: 'start'`, the anchor is at the left edge of the box. `xAdjust: -8` shifts the label 8px left of that edge, placing it in the open chart area. The -90 rotation then extends the text vertically in space that has room. This keeps one annotation object per sector.

**Option C: Separate standalone `type: 'label'` annotation for narrow sectors (most precise)**
Disable the in-box label for narrow sectors and create a sibling `type: 'label'` annotation positioned just to the left:
```js
// In the box annotation:
label: { display: false },

// Sibling annotation:
annotationBoxes[`sector_${i}_label`] = {
  type: 'label',
  xValue: sector.startMi - 0.4,
  content: labelContent,
  color: starColors[sector.stars] + 'cc',
  font: { size: 9, family: 'Space Mono, monospace' },
  rotation: -90,
  callout: { display: true, position: 'right' },
};
```
Label annotations support callouts (line connecting to a point), which would visually link the floating label to the Down Jeep box. This is the cleanest visual result but adds an annotation object to the map.

**Option D: Suppress label on narrow sectors (acceptable fallback)**
Set `label.display: false` for `isNarrow` sectors. The hover tooltip (already implemented via Chart.js tooltip callbacks) provides sector name on interaction. Down Jeep is the only narrow sector; suppressing its annotation label has minimal information loss.

**Recommendation: Try Option B first.** It is a targeted 3-property change to the existing annotation config with no new objects. If the label still clips at narrow viewport widths (mobile), fall back to Option D — the tooltip handles identification at all sizes, and the box border/color still visually identifies the sector.

### No new npm packages needed

`chartjs-plugin-annotation` 3.1.0 is already installed and has all required options. No upgrade is warranted — the fix is configuration, not a missing capability.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| GSAP or any JS animation library | TBT 0ms goal; CSS `@keyframes` already handles grain/escher/lizard overlays | CSS `animation` property |
| Canvas 2D image library (Fabric.js, Konva) | Tone images are static textures, not interactive elements | CSS `filter` property |
| SVG `feColorMatrix` / `feComponentTransfer` for posterize | Requires inline SVG markup per image; `grayscale + contrast + mix-blend-mode` achieves equivalent result with less DOM | CSS filter chain |
| Astro `<Image>` component for tone images | Tone images live in `public/tone/` for a reason — Astro's image service is bypassed by design | Plain `<img src="/tone/...">` |
| New Astro integrations for image effects | CSS handles all required transformations at zero build cost | Existing CSS |
| `chartjs-plugin-annotation` version upgrade | 3.1.0 is current stable (Oct 2024); upgrading for a label position fix risks regression in existing hover/click event handling | Existing API options |
| CSS `backdrop-filter` | No frosted-glass needed; blend modes are the correct primitive for image-over-dark-background effects | `mix-blend-mode: lighten/screen` |
| `color-mix()` in oklch for image tinting | Cannot tint raster images; only works on CSS color values | `filter: hue-rotate()` + `mix-blend-mode` |
| Sharp preprocessing of tone images | Destructive, requires build step changes, gain is nil since CSS achieves the same visual result at paint time | CSS `filter` on `<img>` |

---

## Version Compatibility

| Package | Version | Note |
|---------|---------|------|
| chartjs-plugin-annotation | 3.1.0 | Requires Chart.js 4.x — already matched at 4.5.1 |
| Tailwind v4 | 4.2.2 | CSS-first config: filter utilities (`grayscale`, `contrast-[val]`, `invert`, `mix-blend-*`) all present via utility classes |
| Astro | 6.1.1 | No image service configured — `public/tone/` images bypass Astro entirely, correct for this use |
| CSS filter | — | Baseline Widely Available since September 2016 per MDN; no polyfill needed |
| CSS mix-blend-mode | — | Baseline Widely Available; creates stacking context, GPU-composited in modern browsers |

---

## Sources

| Source | Confidence | What it informed |
|--------|------------|-----------------|
| [MDN: CSS filter](https://developer.mozilla.org/en-US/docs/Web/CSS/filter) | HIGH | All 10 filter functions confirmed, no posterize(), Baseline Widely Available since 2016, filter order semantics |
| [MDN: mix-blend-mode](https://developer.mozilla.org/en-US/docs/Web/CSS/mix-blend-mode) | HIGH | All blend mode values, stacking context behavior, lighten/screen behavior on dark backgrounds |
| [chartjs-plugin-annotation: Box annotation](https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/types/box.html) | HIGH | Complete label sub-object API table, all properties with defaults, confirmed 3.1.0 |
| [chartjs-plugin-annotation: Configuration](https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/configuration.html) | HIGH | Global clip option behavior (clip: true by default clips annotations to chart area) |
| [chartjs-plugin-annotation: Label annotation type](https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/types/label.html) | HIGH | Standalone label type with callout feature — Option C basis |
| [Tailwind CSS: mix-blend-mode](https://tailwindcss.com/docs/mix-blend-mode) | HIGH | Full utility class name list, responsive variants, isolate utility |
| [Tailwind CSS: filter utilities](https://tailwindcss.com/docs/filter-grayscale) | HIGH | grayscale, contrast, invert utility classes; arbitrary value bracket syntax confirmed |
| Direct codebase inspection | HIGH | Confirmed `.tone-image` baseline in global.css, Down Jeep width (0.59mi), existing annotation config structure in ElevationProfile.astro, public/tone/ image list |

---
*Stack research for: mkUltraGravel editorial explainer redesign + Down Jeep annotation label fix*
*Researched: 2026-04-13*
