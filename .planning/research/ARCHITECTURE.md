# Architecture Patterns — v8.0 Visual Polish Integration

**Project:** MK Ultra Gravel
**Research date:** 2026-03-31
**Scope:** How v8.0 features integrate with existing Astro 6 / Tailwind v4 architecture
**Overall confidence:** HIGH — all claims sourced from direct codebase inspection

---

## Existing Architecture Baseline

**Page structure (`src/pages/index.astro`):**
```
BaseLayout
  └─ body.pt-12
       ├─ SiteNav (fixed, z-index 10000)
       ├─ div.grain-overlay (fixed, z-index 9999)
       ├─ div.escher-overlay (fixed, z-index 9998)
       └─ main
            ├─ section#hero (tone-image + content)
            ├─ MkUltraExplainer (section, tone-image + content)
            ├─ section#route (tone-image + RouteMap + ElevationProfile)
            ├─ div [CTA block]
            ├─ section#sectors (GrinduroExplainer + ScoringExplainer + GravelSectors + KomSegments)
            ├─ section#photos (tone-image + PhotoGallery)
            └─ section#info (tone-image + EventInfoBlock)
```

**Fixed overlay z-index stack (current):**
```
10000  SiteNav (.site-nav — position: fixed, in BaseLayout body)
 9999  grain-overlay (div.grain-overlay — position: fixed, in BaseLayout body)
 9998  escher-overlay (div.escher-overlay — position: fixed, in BaseLayout body)
    0  .route-map (Leaflet creates its own stacking context internally)
    —  section content (div.relative.z-10 inside each section — local stacking context)
```

**`tone-image` CSS class (global.css):**
```css
.tone-image {
  opacity: 0.12;
  mix-blend-mode: lighten;
  filter: grayscale(100%) contrast(1.3);
  position: absolute;
  pointer-events: none;
}
```
Every section that uses a tone image has `position: relative; overflow: hidden` and places `<img class="tone-image inset-0 w-full h-full object-cover">` before a `<div class="relative z-10">` content wrapper. The content wrapper's z-10 lifts it above the absolutely-positioned tone image within the section's stacking context.

**Pipeline execution order (`scripts/generate-data.js`):**
```
copy images/*.{jpg,jpeg,png,webp,avif} → public/images/
1. parse-gpx.js            → public/data/route-data.json + public/mk-ultra.gpx
2. resolve-annotations.js  → public/data/annotations.json
3. match-photos.js         → public/data/photos.json
4. generate-thumbnails.js  → public/images/thumbs/*.webp + enriches photos.json (width/height)
5. assign-card-photos.js   → enriches annotations.json (coverPhoto) + public/images/cards/*.webp
6. convert-hero.js         → public/tone/CIA-MKULTRA-IG_Page_01.webp
7. convert-tone-images.js  → public/tone/*.webp (3 images currently)
```

**Image source directories:**
- `images/` — 75 files (route photos). Copied to `public/images/` by pipeline at startup.
- `images/tone/` — 32 files (CIA docs, Escher art, psychedelic imagery). NOT automatically copied. Tone images must be in `public/tone/` directly for the pipeline to process them.
- `public/tone/` — 8 files currently. This is the pipeline's source AND destination for tone images (convert-tone-images.js reads and writes here).

**`photos.json` schema (per entry, after full pipeline):**
```json
{
  "filename": "...",
  "lat": 46.xxxxx,
  "lon": -87.xxxxx,
  "mi": 45.2,
  "source": "manual",
  "width": 1536,
  "height": 2048
}
```

---

## Feature 1: Horizontal Masonry Gallery (VIS-18)

### Current state
`PhotoGallery.astro` renders a uniform CSS grid: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2`. Every item has `aspect-[3/4] overflow-hidden` — all cells forced to portrait ratio regardless of original photo orientation.

### Integration approach

**Modify `PhotoGallery.astro` directly.** No new component. Changes are internal to the component.

**Data available:** `photos.json` already contains `width` and `height` per photo (enriched by `generate-thumbnails.js`). These are full-resolution dimensions. The thumbnail is always 400px wide with height scaled proportionally:
```
thumbHeight = Math.round((photo.height / photo.width) * 400)
```

**Layout change:** Replace the uniform grid with a flex-wrap row approach. Set a fixed row height (e.g., 220px mobile, 300px desktop). Each item's width derives from its aspect ratio at the target row height:
```
itemWidth = Math.round((photo.width / photo.height) * rowHeight)
```
This width can be applied as an inline `style` on each `<a>` element in the template using the already-loaded `width`/`height` fields.

**PhotoSwipe compatibility:** No changes. PhotoSwipe reads `data-pswp-width` and `data-pswp-height` from anchor elements — these pass full-resolution dimensions and remain correct. The init script is unchanged.

**What changes in `PhotoGallery.astro`:**
- CSS: remove `aspect-[3/4]` per-item, add flex wrap container with fixed height rows
- Template: add inline `style` attribute per item computing width from aspect ratio

**What does NOT change:**
- `photos.json` schema — no pipeline changes
- PhotoSwipe init script — unchanged
- `data-pswp-width` / `data-pswp-height` attributes — unchanged
- Thumbnail generation — unchanged

---

## Feature 2: Lizard Background Animation (VIS-17)

### Z-index placement
The lizard background is full-page and fixed. It sits below grain and Escher but above the base background color:

```
10000  SiteNav
 9999  grain-overlay
 9998  escher-overlay
 9997  LizardBackground  ← NEW
    —  page section content
```

### Integration approach

**New Astro component: `src/components/LizardBackground.astro`.**

Add to `BaseLayout.astro` alongside the existing grain/Escher divs, before the `<slot />`.

**Component pattern (follows Escher exactly):**
```astro
---
// LizardBackground.astro — no props needed
---
<div class="lizard-background" aria-hidden="true"></div>

<style>
  .lizard-background {
    position: fixed;
    inset: 0;
    pointer-events: none;
    opacity: 0.04;
    /* SVG background-image with lizard tessellation */
    background-image: url("data:image/svg+xml,...");
    background-repeat: repeat;
    background-size: 120px 120px;
    z-index: 9997;
    will-change: transform;
  }
  @keyframes lizard-drift {
    0%   { transform: translate(0, 0); }
    50%  { transform: translate(-60px, -60px); }
    100% { transform: translate(-120px, -120px); }
  }
  @media (prefers-reduced-motion: no-preference) {
    .lizard-background {
      animation: lizard-drift 70s linear infinite;
    }
  }
</style>
```

**Integration in `BaseLayout.astro`:**
```astro
import LizardBackground from "../components/LizardBackground.astro";
// in body:
<div class="grain-overlay" aria-hidden="true"></div>
<div class="escher-overlay" aria-hidden="true"></div>
<LizardBackground />
<slot />
```

**Animation constraints to preserve:**
- `transform` only — compositor-safe, TBT remains 0ms
- `will-change: transform` on the element
- `prefers-reduced-motion` gate (same pattern as escher-drift)
- `pointer-events: none` so it never intercepts clicks

**Why new component vs bare div in global.css:** The lizard SVG data URI will be substantial. Keeping it in a dedicated component avoids bloating global.css further. The grain and Escher overlays are bare divs because their SVGs were added when the component count was smaller — consistency would be cleaner with components for all three, but changing the existing two is not necessary for v8.0.

---

## Feature 3: Topo Meatball Section Dividers (VIS-19)

### Integration approach

**New reusable Astro component: `src/components/TopoDivider.astro`.**

Zero JavaScript. Zero data dependencies. Placed between sections in `index.astro`.

**Component pattern:**
```astro
---
interface Props {
  class?: string;
}
const { class: className = '' } = Astro.props;
---
<div class={`topo-divider ${className}`} aria-hidden="true">
  <!-- inline SVG: circle with topographic contour lines -->
  <svg ...>...</svg>
</div>

<style>
  .topo-divider {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1rem 0;
    opacity: 0.25;
  }
</style>
```

**Usage in `index.astro`:**
```astro
<MkUltraExplainer />
<TopoDivider />
<section id="route" ...>
  ...
</section>
<TopoDivider class="mt-4" />
<section id="sectors" ...>
```

**Reusability note:** Astro `.astro` components do not auto-forward attributes to the root element. The `class` prop must be explicitly destructured from `Astro.props` and applied to the wrapper `div`. This is the correct Astro pattern for prop-forwarding.

---

## Feature 4: Tone Images in New Sections (VIS-16)

### Current state
Tone images are in 5 of 6 sections. `section#sectors` has no tone image.

### Pipeline changes

**`scripts/convert-tone-images.js` — add entries to `TONE_IMAGES` array** for each new tone image to be used. The array is the configuration manifest. Current array has 3 entries; add as many as needed for v8.0 placements.

**Source path issue:** `convert-tone-images.js` currently reads from AND writes to `public/tone/`. The 32 source images are in `images/tone/`, not `public/tone/`. To use new images from `images/tone/`, either:

1. **Manual copy** (current pattern): Manually place selected images in `public/tone/` before committing. Simple but requires a manual step.
2. **Update script srcDir** (recommended): Update `convert-tone-images.js` to accept a source directory, defaulting to `images/tone/`, writing to `public/tone/`. This eliminates manual copies and makes the source of truth `images/tone/` for all tone images.

Option 2 is architecturally cleaner and prevents `public/tone/` from needing unprocessed source files committed.

**Template placement** — same pattern as existing tone images. No new CSS needed; `.tone-image` class handles everything:
```astro
<section id="sectors" class="relative min-h-screen px-4 py-16 overflow-hidden border-t border-border">
  <img
    src="/tone/new-image.webp"
    alt=""
    class="tone-image inset-0 w-full h-full object-cover"
    loading="lazy"
  />
  <div class="relative z-10">
    <!-- existing content unchanged -->
  </div>
</section>
```

**Tone images inside sector/KOM cards:** Both `GravelSectors.astro` and `KomSegments.astro` cards already have `position: relative` (via `classified-border`) and `overflow-hidden`. An additional `<img class="tone-image">` inside a card would need the card wrapper to explicitly have these — it does, but the visual effect at card scale may look different from section-scale. This is a visual judgment call, not an architecture constraint.

---

## Feature 5: 19 New Route Photos (PHOTO-03)

### The only file that needs editing

**`scripts/photo-manifest.js`** — add 19 new entries with `{ filename, mi }`. The manifest is manually curated. No automation.

**Pre-requisite:** New photo files must be placed in `images/` before running the pipeline. `generate-data.js` copies `images/*.{jpg,jpeg,png,webp,avif}` to `public/images/` at startup.

**Automatic downstream regeneration (no further changes needed):**

| Step | What happens |
|------|-------------|
| `match-photos.js` | Adds 19 new entries to `photos.json` with lat/lon from mile markers |
| `generate-thumbnails.js` | Generates 19 new WebP thumbnails in `public/images/thumbs/`; adds width/height to new entries |
| `assign-card-photos.js` | Re-evaluates cover photo assignments — new photos expand the candidate pool, may update some coverPhoto fields in annotations.json |
| `PhotoGallery.astro` | Reads photos.json at build time — 74 photos now appear in gallery automatically |
| `RouteMap.astro` | Fetches photos.json at runtime — 74 markers appear on map automatically |

**`photos.json` schema does NOT change.** The `width`/`height` fields added by `generate-thumbnails.js` are already present in the schema and consumed by `PhotoGallery.astro`.

**Validation checks run automatically by `match-photos.js`:**
- All filenames exist in `images/`
- No duplicate filenames
- Coordinates within Marquette County bounds (~46.2–46.8 lat, -87.5 to -86.5 lon)
- Mile markers beyond route end get clamped with a warning

---

## Feature 6: GPX Replacement (ROUTE-07)

### Which scripts consume the GPX

Only `parse-gpx.js` reads the GPX directly:
```js
const GPX_SOURCE = path.join(ROOT, 'MK_Ultra.gpx');  // hardcoded
```

**Simplest approach:** Rename the new GPX file to `MK_Ultra.gpx` and replace the existing file at the repo root. No code changes needed.

**Alternative:** Update `GPX_SOURCE` in `parse-gpx.js` to the new filename. This requires a code change but is transparent about the new file name.

### Full downstream regeneration chain

All artifacts regenerate automatically on next `npm run dev` or `npm run build`:

| Artifact | Regenerated by | What changes |
|----------|---------------|--------------|
| `public/data/route-data.json` | `parse-gpx.js` | New trackpoints, totalMi, elevationGainFt |
| `public/mk-ultra.gpx` | `parse-gpx.js` | Copied to public/ for the GPX download link |
| `public/data/annotations.json` | `resolve-annotations.js` | Sector/KOM lat/lon/track arrays recalculated |
| `public/data/photos.json` | `match-photos.js` | Photo lat/lon recalculated (manual mile markers re-mapped to new trackpoints) |
| `public/images/thumbs/` | `generate-thumbnails.js` | No change to thumbnails themselves |
| `public/images/cards/` | `assign-card-photos.js` | No change to card crops |
| Elevation profile | `ElevationProfile.astro` | Fetches route-data.json at runtime — reflects new route automatically |
| Route map | `RouteMap.astro` | Fetches route-data.json at runtime — reflects new route automatically |
| Route stats in hero | `index.astro` | `routeMeta.totalMi` and `elevationGainFt` updated at Astro build time |

**Photo mile-marker drift:** `photo-manifest.js` uses manually assigned mile markers. If the new GPX has slightly different cumulative distances, absolute lat/lon coordinates shift slightly. This is expected and acceptable — photos still appear at the correct relative position on the route.

**Sector/KOM startMi verification:** Sector and KOM start mile markers are hardcoded in `resolve-annotations.js`. After GPX replacement, verify that all `startMi + lengthMi` values still fall within the new track's total distance. If the route is longer, existing mile markers are unaffected. If it is shorter (unlikely), the clamping logic in `findPointAtMile` will warn.

---

## New and Modified Components Summary

**New components:**
| Component | File | Purpose | Where Used |
|-----------|------|---------|-----------|
| `LizardBackground` | `src/components/LizardBackground.astro` | Fixed animated lizard tessellation behind all content | `BaseLayout.astro` body, before `<slot />` |
| `TopoDivider` | `src/components/TopoDivider.astro` | Decorative topo meatball between page sections | `src/pages/index.astro` between sections |

**Modified components:**
| Component | Change |
|-----------|--------|
| `src/components/PhotoGallery.astro` | Replace uniform CSS grid with horizontal masonry flex layout |
| `src/layouts/BaseLayout.astro` | Import and render `<LizardBackground />` |
| `src/pages/index.astro` | Insert `<TopoDivider />` between sections; add tone images where missing (sectors section) |

**Modified scripts:**
| Script | Change |
|--------|--------|
| `scripts/photo-manifest.js` | Add 19 new `{ filename, mi }` entries |
| `scripts/convert-tone-images.js` | Add `TONE_IMAGES` entries for new tone images; optionally update source directory to `images/tone/` |
| `scripts/parse-gpx.js` | Update `GPX_SOURCE` path if new GPX has different filename (or rename GPX to `MK_Ultra.gpx`) |

---

## Z-Index Stack (Complete, Post-v8.0)

```
10000  SiteNav (.site-nav — position: fixed — SiteNav.astro inline style)
 9999  grain-overlay (div — position: fixed — BaseLayout.astro + global.css)
 9998  escher-overlay (div — position: fixed — BaseLayout.astro + global.css)
 9997  LizardBackground [NEW] (div — position: fixed — LizardBackground.astro)
    —  Section content: div.relative.z-10 (local stacking context within each section)
    —  Tone images: position: absolute, no explicit z-index (below z-10 content within section)
    0  .route-map Leaflet container (creates its own stacking context)
```

**Constraints preserved:**
- Nav at 10000 clears all overlays (established in SiteNav.astro comments)
- All three global overlays are `pointer-events: none` — clicks pass through to page content
- All animations are `transform`/`opacity` only — compositor-safe, TBT 0ms preserved
- All new animations gated behind `prefers-reduced-motion: no-preference`

---

## Suggested Build Order for v8.0 Phases

**Phase 1 — GPX + Photo Pipeline (ROUTE-07, PHOTO-03)**
Do this first. All route-distance statistics, sector/KOM coordinates, and photo positions derive from the GPX. Updating it early ensures all subsequent visual work is built on accurate data.
- Replace `MK_Ultra.gpx` at repo root
- Run pipeline, verify `route-data.json` totalMi and elevationGainFt
- Verify annotations.json sector/KOM coordinates
- Add 19 new photos to `images/`, add entries to `photo-manifest.js`
- Run pipeline, verify `photos.json` count = 74, verify thumbnails generated

**Phase 2 — Tone Images (VIS-16)**
Simple pipeline config change + template HTML. No component API surface.
- Update `convert-tone-images.js` `TONE_IMAGES` array
- Optionally update srcDir to `images/tone/`
- Add `<img class="tone-image">` to `section#sectors` in `index.astro`

**Phase 3 — Horizontal Masonry Gallery (VIS-18)**
Self-contained to `PhotoGallery.astro`. No pipeline or data schema changes.
- Modify CSS and template in `PhotoGallery.astro`
- Uses `width`/`height` already in `photos.json`

**Phase 4 — Lizard Background (VIS-17)**
New component + BaseLayout import. Isolated from page content.
- Create `LizardBackground.astro` with SVG + animation
- Import and render in `BaseLayout.astro`

**Phase 5 — Topo Dividers (VIS-19)**
Zero dependencies. Purely additive.
- Create `TopoDivider.astro`
- Insert at section boundaries in `index.astro`

**Phases 2–5 are independent** — they can be worked in parallel or in any order after Phase 1 completes.

---

## Data Flow (v8.0 Complete)

```
images/tone/[32 files]      images/[75 files]        MK_Ultra.gpx
     │                            │                        │
     │ (manual copy or            │ (copied by             │
     │  updated script)           │  generate-data.js)     │
     ▼                            ▼                        ▼
convert-tone-images.js      public/images/          parse-gpx.js
     │                            │                        │
     ▼                            ▼                        ▼
public/tone/*.webp          match-photos.js       route-data.json
     │                            │                   meta.totalMi
     ▼                            ▼               meta.elevationGainFt
Astro templates            photos.json                     │
(.tone-image class)         lat/lon/mi/w/h                 ▼
section bg decorations           │             resolve-annotations.js
                                 │                         │
                    generate-thumbnails.js                 ▼
                                 │              annotations.json
                                 ▼              sector/KOM coords
                        thumbs/*.webp
                        photos.json (w/h)
                                 │
                    assign-card-photos.js ←── annotations.json
                                 │
                                 ▼
                        cards/*.webp
                        annotations.json (coverPhoto)
                                 │
                        ─────────┴────────────────────
                        ▼                             ▼
                Astro build-time               Runtime fetch
                (PhotoGallery,                 (RouteMap.astro,
                 GravelSectors,                 ElevationProfile.astro
                 KomSegments,                   fetch /data/*.json)
                 index.astro routeMeta)
```

---

## Integration Points Summary

| v8.0 Feature | Integration Point | Files Touched | Dependencies |
|---|---|---|---|
| Masonry gallery (VIS-18) | Modify `PhotoGallery.astro` layout | `src/components/PhotoGallery.astro` | `photos.json` width/height (already present) |
| Lizard background (VIS-17) | New component + BaseLayout | `src/components/LizardBackground.astro`, `src/layouts/BaseLayout.astro` | None |
| Topo dividers (VIS-19) | New component + index.astro | `src/components/TopoDivider.astro`, `src/pages/index.astro` | None |
| Tone images (VIS-16) | Pipeline config + template | `scripts/convert-tone-images.js`, `src/pages/index.astro` | New images in `public/tone/` |
| 19 new photos (PHOTO-03) | Photo manifest + image files | `scripts/photo-manifest.js`, `images/` | New JPGs present in `images/` |
| GPX replacement (ROUTE-07) | Parse script source | `scripts/parse-gpx.js` or rename GPX | New GPX at repo root |

---

## Sources

All findings from direct codebase inspection. No external research required for this architecture-dimension question.

- `src/pages/index.astro` — section structure, tone image placements, z-index usage
- `src/layouts/BaseLayout.astro` — overlay render order, nav/grain/Escher structure
- `src/components/PhotoGallery.astro` — current grid layout, PhotoSwipe init, photos.json consumption
- `src/components/MkUltraExplainer.astro` — tone-image pattern reference
- `src/components/GravelSectors.astro` — card structure, position/overflow for potential tone image placement
- `src/components/SiteNav.astro` — z-index 10000 confirmation
- `src/styles/global.css` — tone-image class, grain-overlay/escher-overlay z-index, complete overlay definitions
- `scripts/generate-data.js` — pipeline execution order and image copy logic
- `scripts/parse-gpx.js` — GPX source path, downstream output
- `scripts/match-photos.js` — photos.json schema, mile-marker resolution
- `scripts/generate-thumbnails.js` — thumbnail dimensions, width/height enrichment
- `scripts/assign-card-photos.js` — card photo selection, annotations enrichment
- `scripts/convert-tone-images.js` — TONE_IMAGES config, source/dest paths
- `scripts/photo-manifest.js` — current 55-entry manifest, format reference
- `scripts/resolve-annotations.js` — hardcoded sector/KOM mile markers
- `.planning/PROJECT.md` — v8.0 requirements, key decisions log
