# Architecture Research

**Domain:** Static Astro 6 site — editorial explainer redesign + Chart.js annotation label fix
**Researched:** 2026-04-13
**Confidence:** HIGH (all findings from direct codebase inspection)

---

## System Overview

```
┌────────────────────────────────────────────────────────────────────┐
│  PREBUILD  (Node.js, runs via npm run prebuild before astro build) │
│                                                                    │
│  generate-data.js orchestrates in sequence:                        │
│    1. parse-gpx.js            → public/data/route-data.json       │
│    2. resolve-annotations.js  → public/data/annotations.json      │
│    3. match-photos.js         → public/data/photos.json           │
│    4. generate-thumbnails.js  → public/images/thumbs/*.webp       │
│    5. assign-card-photos.js   → public/images/cards/*.webp        │
│    6. convert-hero.js         → public/tone/CIA*.webp             │
│    7. convert-tone-images.js  → public/tone/*.webp     ← extend   │
│                                                         here if   │
│                                                         new image  │
└───────────────────────────────┬────────────────────────────────────┘
                                │ static JSON + WebP assets
┌───────────────────────────────▼────────────────────────────────────┐
│  ASTRO BUILD                                                       │
│                                                                    │
│  BaseLayout.astro                                                  │
│  ├── global.css (Tailwind v4 @theme; .tone-image class)            │
│  ├── grain-overlay, escher-overlay (fixed, z-9998/9999)           │
│  ├── LizardBackground.astro (fixed, z-9997)                        │
│  │                                                                 │
│  └── index.astro                                                   │
│      ├── #hero section (relative overflow-hidden)                  │
│      │   └── tone img CIA-MKULTRA-IG_Page_01.webp (lazy=eager)     │
│      ├── MkUltraExplainer.astro  ← canonical tone-section pattern  │
│      ├── #route section (relative overflow-hidden)                 │
│      │   ├── tone img escharian_stairs_fb.webp                     │
│      │   ├── RouteMap.astro                                         │
│      │   └── ElevationProfile.astro  ← LABEL FIX TARGET            │
│      ├── #sectors section (relative overflow-hidden)               │
│      │   ├── EscherLizards.astro                                   │
│      │   ├── GrinduroExplainer.astro  ← REDESIGN TARGET            │
│      │   ├── GravelSectors.astro                                   │
│      │   └── KomSegments / RestockPoints                           │
│      ├── #photos section (relative overflow-hidden)                │
│      │   └── tone img lsd-mind-control.webp                        │
│      └── #info section (relative overflow-hidden)                  │
│          └── tone img Mkultra-lsd-doc.webp                         │
└────────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

| Component | Responsibility | Current State |
|-----------|----------------|---------------|
| `GrinduroExplainer.astro` | Explain the Grinduro format inside #sectors section | 17-line `<div>` with `.classified-border`, three `<p>` tags, no images, no section wrapper |
| `ElevationProfile.astro` | Chart.js elevation profile with sector/KOM annotation boxes, hover crosshair | `<script>` builds `annotationBoxes` from `annotations.json`; lazy-loaded on IntersectionObserver |
| `MkUltraExplainer.astro` | Full `<section>` with tone img, stamp badge, h2, classified-border text | Canonical reference pattern for the redesign |
| `BaseLayout.astro` | HTML shell, head slot, overlays, SiteNav, footer | Stable; no changes needed |
| `global.css` | Tailwind v4 @theme tokens; `.tone-image` class (opacity/blend/filter) | Single control point for all tone image rendering |
| `scripts/convert-tone-images.js` | Sharp step 7: converts `images/tone/` sources to `public/tone/*.webp` | Handles 4 entries; extensible with one-line additions |

---

## Integration Point 1: GrinduroExplainer Redesign

### New vs Modify

**Modify `GrinduroExplainer.astro` in place. Do not create a new component.**

The import (`import GrinduroExplainer from ...`) and render call (`<GrinduroExplainer />`) in `index.astro` stay unchanged. The redesign is a layout expansion of existing content, not a new feature boundary.

### Structural Change Required

Current structure (the entire component):
```html
<div class="classified-border p-6 md:p-8 mb-8 ...">
  <p class="stamp mb-4">Grinduro Format</p>
  <p>...</p>
  <p>...</p>
  <p>...</p>
</div>
```

The redesign must add a tone image behind the content. The tone image is `position: absolute` (enforced by `.tone-image`), so it requires a `position: relative` ancestor to scope it correctly.

The parent `<section id="sectors">` in `index.astro` (line 204) is `relative overflow-hidden`, but `<GrinduroExplainer />` is not the only child of that section — GravelSectors and KomSegments also render there. A tone image scoped to the section would bleed behind those components too.

**Therefore: the component needs its own relative wrapper.** Add a wrapper `<div class="relative overflow-hidden">` (or convert to a `<section>`) around the component's content. This scopes the absolute-positioned tone image to the explainer block only.

Target structure:
```html
<div class="relative overflow-hidden mb-8">
  <img
    src="/tone/<chosen-image>.webp"
    alt=""
    class="tone-image inset-0 w-full h-full object-cover"
    loading="lazy"
  />
  <div class="relative z-10 classified-border p-6 md:p-8 ...">
    <p class="stamp mb-4">Grinduro Format</p>
    <p>...</p>
    <p>...</p>
    <p>...</p>
  </div>
</div>
```

This mirrors `MkUltraExplainer.astro` exactly: relative wrapper → absolute tone img → `relative z-10` content div.

### Tone Image Selection

`public/tone/` currently contains these optimized WebPs ready to use:

| File | Size | Current Usage |
|------|------|---------------|
| `CIA-MKULTRA-IG_Page_01.webp` | ~60KB | Hero (eager preload) |
| `escharian_stairs_fb.webp` | ~10KB | #route section |
| `lsd-mind-control.webp` | ~5KB | #photos section |
| `Mkultra-lsd-doc.webp` | ~56KB | #info section |
| `MK-Ultra.webp` | ~16KB | MkUltraExplainer section |
| `square-limit-mc-escher.webp` | converted | not currently used in any section |

`square-limit-mc-escher.webp` exists and is unused — appropriate for the Grinduro explainer (Escher theme, geometric/sector-grid imagery). Alternatively, any image from `images/tone/` can be added to the pipeline.

---

## Image Pipeline Decision: Sharp Prebuild vs CSS-Only

**Decision: CSS-only for any image already in `public/tone/`. Sharp prebuild only for new large-source images.**

### Rationale

The `.tone-image` CSS class renders all tone images at 12% opacity with full grayscale and lighten blend mode:

```css
.tone-image {
  opacity: 0.12;
  mix-blend-mode: lighten;
  filter: grayscale(100%) contrast(1.3);
  position: absolute;
  pointer-events: none;
}
```

At 12% opacity and grayscale, the visual difference between a 600KB JPEG and a 20KB WebP is zero to users. The filtering is handled entirely by CSS at paint time — no runtime image processing.

### Decision Matrix

| Image source | Action | Why |
|-------------|--------|-----|
| Already in `public/tone/` as WebP | Reference directly with `loading="lazy"` | Zero cost — already optimized |
| In `images/tone/` as large JPEG/WebP (>100KB) with no `public/tone/` counterpart | Add entry to `convert-tone-images.js` | One 4-line entry; sharp already runs at prebuild; bandwidth matters even at 12% opacity |
| In `images/tone/` as small file (<60KB, already WebP/AVIF) | Copy to `public/tone/` or add minimal pipeline entry | Files like `images.jpeg` (8-20KB) or `MKULTRA.avif` (12KB) need no aggressive recompression |

### Performance Impact

| Approach | Build cost | Transfer size | Lighthouse risk |
|----------|-----------|---------------|----------------|
| Existing `public/tone/` WebP, lazy | Zero | 5–60KB | None |
| New sharp pipeline entry, lazy | +1–3s prebuild once | 5–60KB | None |
| Large source file served directly | Zero | 100KB–1.3MB | Bandwidth regression on scroll; TBT still 0ms (lazy) |

The site is at Lighthouse mobile 96 / TBT 0ms. Below-fold tone images are all `loading="lazy"` — they do not affect LCP. A 1.3MB unoptimized tone image would only hurt users on slow connections who scroll to the sectors section. The pipeline route is the correct default for any large source.

**Concrete recommendation for this milestone:** `square-limit-mc-escher.webp` already exists in `public/tone/` and requires no pipeline change. Use it and ship. If a different source image is chosen from `images/tone/`, add one entry to `convert-tone-images.js`.

---

## Integration Point 2: Elevation Label Fix

### What the Fix Changes

The bug is in `ElevationProfile.astro`, lines 64–68. The `isNarrow` conditional strips the sector name from `labelContent` for Down Jeep (0.59mi, the only sector below the 1.0mi threshold):

```javascript
// CURRENT — broken:
const isNarrow = widthMi < 1.0;
const starsStr = '\u2605'.repeat(sector.stars);
const labelContent: string[] = isNarrow
  ? [starsStr]                        // name excluded — wrong
  : [sector.name, starsStr];
```

The fix removes the conditional. The `rotation: isNarrow ? -90 : 0` line at 85 already handles the horizontal space constraint for narrow bands — the name exclusion was a redundant defensive measure.

```javascript
// FIXED:
const labelContent: string[] = [sector.name, starsStr];
```

`isNarrow` stays in scope because it continues to drive rotation on line 85.

### What Does Not Change

- `public/data/annotations.json` — data is correct; Down Jeep's `startMi/endMi/stars` values are unchanged.
- The `annotationBoxes` object shape — `label.content: string[]` accepts both single-entry and two-entry arrays already.
- The IntersectionObserver / lazy-load pattern.
- The `map:sectorHover`, `map:sectorClick`, `map:reset` event listeners — they key on `sectorIndex` integers, not label content.
- The `_baseColor` hover/highlight system.

### Effect on Annotation Config

Only the runtime value of `label.content` for index 6 changes:

| Annotation key | Before fix | After fix |
|---------------|------------|-----------|
| `sector_6` (Down Jeep) | `["★★★★★"]` | `["Down Jeep", "★★★★★"]` |
| All other sectors | Unchanged | Unchanged |

The label is rotated -90° by `rotation: isNarrow ? -90 : 0`, which remains. Chart.js annotation plugin v3.1.0 does not clip labels to their parent box; it clips only to the chart area, so "Down Jeep" rotated vertically will be visible against the 140–180px chart height.

---

## Component Data Flow

### Tone Image Flow (GrinduroExplainer after redesign)

```
images/tone/<source>.jpg   (large source, if new image selected)
    │
    ▼ (scripts/convert-tone-images.js, prebuild step 7)
public/tone/<source>.webp  (5–60KB, optimized)
    │
    ▼ (GrinduroExplainer.astro markup, build time)
<img src="/tone/<source>.webp" class="tone-image" loading="lazy" />
    │
    ▼ (global.css .tone-image, paint time)
opacity: 0.12, grayscale(100%), contrast(1.3), mix-blend-mode: lighten
```

No props, no JavaScript, no runtime data fetching. Fully static HTML resolved at build.

### Elevation Annotation Flow (after label fix)

```
public/data/annotations.json
    │
    ▼ (fetch() in ElevationProfile <script>, after IntersectionObserver)
annotations.sectors[i]
    │
    ▼ (annotationBoxes construction loop)
label.content = [sector.name, starsStr]    ← fix: unconditional
label.rotation = isNarrow ? -90 : 0        ← unchanged
    │
    ▼ (Chart.js + chartjs-plugin-annotation)
rendered label in canvas, rotated for Down Jeep
```

---

## Recommended Build Order

**Fix the elevation label first. Then redesign GrinduroExplainer.**

| Order | Task | Size | Risk |
|-------|------|------|------|
| 1 | Elevation label fix | 1 line changed | Near-zero; isolated to one conditional |
| 2 | GrinduroExplainer redesign | ~15–30 lines changed/added | Moderate; layout, image selection, wrapper scoping |

Rationale: the fix is independent, debugged, root-caused, and has no interaction surface with the explainer work. Shipping it first establishes a clean baseline. If the explainer redesign introduces a layout regression (z-index, overflow, tone image scoping), it cannot be confused with the chart fix.

---

## Architectural Patterns to Follow

### Pattern: Tone-Backed Section (MkUltraExplainer canonical form)

Every section with a tone background uses this exact structure:

```html
<section class="relative [min-height] px-4 py-16 overflow-hidden border-t border-border">
  <img
    src="/tone/<image>.webp"
    alt=""
    class="tone-image inset-0 w-full h-full object-cover"
    loading="lazy"
  />
  <div class="relative z-10 [content layout classes]">
    <!-- content here -->
  </div>
</section>
```

For `GrinduroExplainer.astro` (which is a sub-section component, not a top-level section), use `<div class="relative overflow-hidden mb-8">` as the wrapper instead of `<section>`. The pattern is otherwise identical.

### Pattern: Z-Index Budget

| Layer | Z-index | Type | What |
|-------|---------|------|------|
| Grain | 9999 | fixed | `.grain-overlay` in BaseLayout |
| Escher pattern | 9998 | fixed | `.escher-overlay` in BaseLayout |
| Lizard | 9997 | fixed | `LizardBackground.astro` |
| Section content | 10 | relative | `<div class="relative z-10">` inside each section |
| Tone image | auto (no z-index set) | absolute | Renders below z-10 content, above section background |

Section content at `z-10` is correct and consistent. Do not exceed z-10 inside components.

### Pattern: Pipeline Extension (adding a tone image)

To add a new tone image to the sharp pipeline, append one object to `TONE_IMAGES` in `scripts/convert-tone-images.js`:

```javascript
{ src: 'source-filename.jpg', dest: 'dest-name.webp', width: 500, quality: 45 }
```

`generate-data.js` calls `convert-tone-images.js` at step 7 automatically. No other files need changing.

---

## Anti-Patterns

### Anti-Pattern: Creating GrinduroExplainerV2.astro

**What people do:** Create a new component, update the import in `index.astro`, leave the old component as dead code.
**Why it's wrong:** Splits the Grinduro explainer responsibility across two files. Future developers (or search tools) looking for "where does the Grinduro text live" find two files.
**Do this instead:** Modify `GrinduroExplainer.astro` in place.

### Anti-Pattern: Serving Source Images from `images/tone/` Directly

**What people do:** Reference `images/tone/NqkRju0.jpg` (804KB) in a component's `<img src>`.
**Why it's wrong:** `images/tone/` is a source directory, not a web-served directory. The Astro build copies only `public/` content to `dist/`. The reference would 404 in production.
**Do this instead:** Always reference `/tone/*.webp` from `public/tone/`. Run the pipeline if no WebP exists yet.

### Anti-Pattern: Fixing the Elevation Bug in annotations.json

**What people do:** Add a `displayName` or modify sector data thinking the fix is in the data source.
**Why it's wrong:** `annotations.json` is correct. Down Jeep's name, coordinates, and star count are all accurate. The bug is in `ElevationProfile.astro`'s conditional `labelContent` construction.
**Do this instead:** Remove the ternary on `labelContent`. One line.

### Anti-Pattern: High Z-Index Inside Components

**What people do:** Set `z-index: 100` or `z-index: 9999` on a component wrapper to "ensure it shows above everything."
**Why it's wrong:** The global fixed overlays (grain z-9999, escher z-9998, lizard z-9997) define the stacking ceiling. Competing z-values inside a non-fixed positioned element create stacking context collisions and can produce unexpected paint order.
**Do this instead:** Use `z-10` for section content. The existing pattern works on every section in the site.

### Anti-Pattern: Loading Tone Images Eagerly Below the Fold

**What people do:** Add `loading="eager"` and `fetchpriority="high"` to a below-fold tone image.
**Why it's wrong:** The hero image (`CIA-MKULTRA-IG_Page_01.webp`) is the only image that needs eager loading; it's the LCP element. All other tone images are decorative, below the fold, and should defer loading.
**Do this instead:** Use `loading="lazy"` (no `fetchpriority`). This is the established pattern for all non-hero tone images.

---

## Integration Checklist

Before shipping the explainer redesign:

- [ ] `GrinduroExplainer.astro` has a `relative overflow-hidden` wrapper div (not just relying on parent section)
- [ ] Tone `<img>` uses class `tone-image inset-0 w-full h-full object-cover` and `loading="lazy"`
- [ ] Content div has `relative z-10`
- [ ] Chosen tone image file exists in `public/tone/` (not `images/tone/`)
- [ ] No `z-index` values added that conflict with overlay budget

Before shipping the elevation fix:

- [ ] `labelContent` line is unconditional: `[sector.name, starsStr]`
- [ ] `rotation: isNarrow ? -90 : 0` line is unchanged
- [ ] `isNarrow` variable still present (rotation still uses it)
- [ ] Down Jeep label verified visible at ≥640px viewport width

---

## Sources

- Direct codebase inspection: `src/components/GrinduroExplainer.astro`
- Direct codebase inspection: `src/components/ElevationProfile.astro`
- Direct codebase inspection: `src/components/MkUltraExplainer.astro` (canonical tone-section pattern)
- Direct codebase inspection: `src/layouts/BaseLayout.astro`
- Direct codebase inspection: `src/styles/global.css` (`.tone-image` class definition)
- Direct codebase inspection: `src/pages/index.astro` (component layout and section structure)
- Direct codebase inspection: `scripts/convert-tone-images.js` (pipeline extension pattern)
- Direct codebase inspection: `scripts/generate-data.js` (prebuild orchestration)
- Direct codebase inspection: `public/data/annotations.json` (Down Jeep sector data)
- Direct codebase inspection: `.planning/debug/down-jeep-label.md` (root cause analysis)
- File system inspection: `public/tone/` contents and `images/tone/` sizes

---
*Architecture research for: MK Ultra Gravel — GrinduroExplainer redesign + elevation label fix*
*Researched: 2026-04-13*
