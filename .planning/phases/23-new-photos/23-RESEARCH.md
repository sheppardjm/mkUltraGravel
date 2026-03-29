# Phase 23: New Photos - Research

**Researched:** 2026-03-29
**Domain:** Photo pipeline integration (manifest, pipeline scripts, gallery, map)
**Confidence:** HIGH — all findings sourced from direct codebase inspection

---

## Summary

Phase 23 integrates two new photos into the existing pipeline. Both image files are already present in `images/` but are not yet in `photo-manifest.js` or processed through the pipeline. The pipeline is well-understood from prior phases; the primary non-trivial complication is that PHOTO-02 (Billie Helmer B&W) is an AVIF file, and the pipeline has four places that filter or manipulate paths by extension, all of which exclude `.avif`.

The standard approach is: add entries to `photo-manifest.js` with correct mile markers, fix AVIF support in four extension-specific code locations, run `generate-data.js`, and verify the outputs. Both photos need mile markers placed within their respective annotation ranges to fix the existing cover-photo fallback issues.

**Primary recommendation:** Fix the four AVIF extension points in the codebase, then add both photo manifest entries and run the pipeline. Do not convert the AVIF — extend the regexes so future AVIF photos work automatically.

---

## Standard Stack

No new libraries needed. The existing pipeline uses:

### Core
| Component | Version | Purpose |
|-----------|---------|---------|
| `sharp` | ^0.34.5 | Thumbnail generation, card crops — processes AVIF via `heif` codec |
| `exifr` | ^7.1.3 | EXIF GPS extraction (no EXIF in current photos; falls through to manual) |
| `photoswipe` | ^5.4.4 | Lightbox — renders `<img>` tags, supports AVIF natively in modern browsers |

### No new installs required
Sharp 0.34.5 already reads AVIF input as `heif` format (confirmed via `sharp.format.heif.input.fileSuffix: [".avif"]`). No additional packages needed.

---

## Architecture Patterns

### How photos are added to the site

The entire photo pipeline is a single-pass data transformation:

```
images/{filename}              ← source files (already present for both new photos)
  ↓
scripts/photo-manifest.js      ← add { filename, mi } entries here
  ↓
scripts/generate-data.js       ← orchestrates pipeline:
  1. copies images/ → public/images/  (filter: /\.(jpg|jpeg|png|webp)$/i)
  2. match-photos.js → public/data/photos.json
  3. generate-thumbnails.js → public/images/thumbs/*.webp, enriches photos.json
  4. assign-card-photos.js → updates annotations.json coverPhoto, generates public/images/cards/*.webp
  ↓
src/components/PhotoGallery.astro  ← reads photos.json, renders gallery grid
src/components/RouteMap.astro      ← reads photos.json at runtime, renders map markers
src/components/GravelSectors.astro ← reads annotations.json, renders sector cards
src/components/KomSegments.astro   ← reads annotations.json, renders KOM cards
```

### Card cover photo selection algorithm (assign-card-photos.js)

```javascript
// Pass 1: find photos within [startMi, startMi+lengthMi], pick closest to midpoint
// Pass 2 (fallback): nearest photo in entire manifest (with WARNING log)
```

- **Down Jeep sector**: `startMi=83.55, lengthMi=0.6` → range 83.55–84.15, midpoint 83.85
  - Current: fallback to `AU6maRolPI2hBS7Tu7...` at mi 80.2 (last photo in manifest)
  - Fix: place PHOTO-01 anywhere in 83.55–84.15 → Pass 1 selects it
- **Billie Helmer KOM**: `startMi=21.9, lengthMi=0.69` → range 21.9–22.59, midpoint 22.245
  - Current: fallback to `SvBAhzwpTg...` at mi 21.1 (nearest outside range)
  - Fix: place PHOTO-02 anywhere in 21.9–22.59 → Pass 1 selects it

### Card crop idempotency
`assign-card-photos.js` skips crops where `public/images/cards/{stem}.webp` already exists. A new photo filename means a new card path → will be generated. Old card crops for deselected photos remain as orphaned files (benign, but planner may want to note cleanup is out of scope).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Converting AVIF to WebP thumb | Custom converter | `sharp(src).resize(400).webp().toFile()` — already does this |
| Reading AVIF dimensions | Custom AVIF parser | `sharp(src).metadata()` returns `{width, height, format:'heif'}` |
| Placing photo on map | Manual lat/lon lookup | `findPointAtMile(routeData, mi)` in `match-photos.js` |
| Thumbnail path derivation | Regex on filename | `path.parse(filename).name + '.webp'` (already used in generate-thumbnails.js) |

---

## Common Pitfalls

### Pitfall 1: AVIF excluded from image copy (BLOCKER)
**What goes wrong:** `generate-data.js` L26 filters source images with `/\.(jpg|jpeg|png|webp)$/i`. AVIF files are silently skipped — not copied to `public/images/`. PHOTO-02 never reaches the browser.
**Why it happens:** The filter was written before AVIF photos existed.
**How to avoid:** Change filter to `/\.(jpg|jpeg|png|webp|avif)$/i`.
**Warning signs:** PHOTO-02 missing from `public/images/` after pipeline run.

### Pitfall 2: AVIF thumbnail path broken in PhotoGallery (VISUAL BUG)
**What goes wrong:** `PhotoGallery.astro` L24 derives thumb path via `.replace(/\.(jpg|jpeg|png)$/i, '.webp')`. For PHOTO-02 (`*.avif`), the regex doesn't match — the `src` attribute becomes `/images/thumbs/photo-xxx.avif` instead of `/images/thumbs/photo-xxx.webp`. The `.webp` thumb exists (generate-thumbnails uses `path.parse(f).name + '.webp'`) but the wrong path is served → broken image.
**How to avoid:** Change regex to `/\.(jpg|jpeg|png|avif)$/i` OR use `path.parse` approach: `photo.filename.replace(/\.[^.]+$/, '.webp')`.

### Pitfall 3: AVIF card path broken in GravelSectors + KomSegments (VISUAL BUG)
**What goes wrong:** Same extension-replace pattern appears in two component files. If PHOTO-02 is selected as a KOM cover photo, the card `<img>` src derives to `photo-xxx.avif` instead of `photo-xxx.webp`.
**Files:** `GravelSectors.astro` L30, `KomSegments.astro` L23
**How to avoid:** Same fix — add `avif` to the replace regex in both files.

### Pitfall 4: Mile markers must be within annotation ranges for cover photo fix
**What goes wrong:** If PHOTO-01 is placed outside `83.55–84.15` or PHOTO-02 outside `21.9–22.59`, `assign-card-photos.js` uses the fallback algorithm — the cover photo does NOT update, and the blocker is not resolved.
**How to avoid:** Confirm mile markers are within the respective ranges before running pipeline.

### Pitfall 5: Node version (pre-existing blocker)
**What goes wrong:** Default PATH uses node@20; Astro requires node>=22.
**How to avoid:** Use `PATH=/usr/local/opt/node@25/bin/:$PATH node scripts/generate-data.js` for pipeline, same prefix for `npm run dev`. Both `.node-version` (22) and `volta.node` (22.22.2) are set but node@20 is first on PATH.

### Pitfall 6: assign-card-photos.js is NOT fully re-entrant when cover changes
**What goes wrong:** If pipeline is run once with wrong mile markers, old card crops exist. After fixing mile markers and re-running, the new photo gets a new crop generated, but the old crop (from fallback photo) is not deleted — it remains orphaned. This is not a functional bug but could cause confusion during debugging.
**How to avoid:** Understand this behavior; don't mistake orphaned card files for the active cover.

---

## Code Examples

### Extending extension regexes (all four locations)

**generate-data.js L26** — image copy filter:
```javascript
// Before
const jpgs = fs.readdirSync(srcImagesDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
// After
const jpgs = fs.readdirSync(srcImagesDir).filter(f => /\.(jpg|jpeg|png|webp|avif)$/i.test(f));
```

**PhotoGallery.astro L24** — thumbnail src path:
```javascript
// Before
src={`/images/thumbs/${photo.filename.replace(/\.(jpg|jpeg|png)$/i, '.webp')}`}
// After
src={`/images/thumbs/${photo.filename.replace(/\.(jpg|jpeg|png|avif)$/i, '.webp')}`}
```

**GravelSectors.astro L30** — card src path:
```javascript
// Before
src={`/images/cards/${sector.coverPhoto.replace(/\.(jpg|jpeg|png)$/i, '.webp')}`}
// After
src={`/images/cards/${sector.coverPhoto.replace(/\.(jpg|jpeg|png|avif)$/i, '.webp')}`}
```

**KomSegments.astro L23** — card src path:
```javascript
// Before
src={`/images/cards/${segment.coverPhoto.replace(/\.(jpg|jpeg|png)$/i, '.webp')}`}
// After
src={`/images/cards/${segment.coverPhoto.replace(/\.(jpg|jpeg|png|avif)$/i, '.webp')}`}
```

### Photo manifest entries to add

```javascript
// photo-manifest.js additions:

// -- Mi 83-84: Down Jeep sector --
{ filename: '68686675_2890293017652424_6952024628709556224_n.jpg', mi: 83.8 },

// -- Mi 21-23: Billie Helmer KOM --
{ filename: 'photo-1675213442182-24e1c1671387.avif', mi: 22.1 },
```

> **NOTE on mile values:** `mi: 83.8` and `mi: 22.1` are educated guesses based on sector/KOM midpoints. The route owner must confirm or supply the actual mile values before committing to manifest. For the cover photo fix to work, PHOTO-01 must be in `83.55–84.15` and PHOTO-02 in `21.9–22.59`.

### Pipeline run command

```bash
PATH=/usr/local/opt/node@25/bin/:$PATH node scripts/generate-data.js
```

---

## State of the Art

No framework changes; this phase purely extends the established photo pipeline.

| Aspect | Current State | Phase 23 Change |
|--------|--------------|-----------------|
| Photo count (manifest) | 53 | 55 |
| Photo count (photos.json) | 53 | 55 |
| Down Jeep sector coverPhoto | `AU6maRolPI2hBS7Tu7...` (mi 80.2 fallback) | `68686675_...` (mi 83.8 in-range) |
| Billie Helmer KOM coverPhoto | `SvBAhzwpTg...` (mi 21.1 fallback) | `photo-1675213442182...` (mi 22.1 in-range) |
| AVIF support | Not supported | Supported via 4 regex extensions |

---

## Open Questions

1. **Exact mile markers for PHOTO-01 and PHOTO-02**
   - What we know: PHOTO-01 must be in 83.55–84.15; PHOTO-02 must be in 21.9–22.59
   - What's unclear: Exact mile values — the route owner knows where each photo was taken
   - Recommendation: Treat mi=83.8 and mi=22.1 as defaults; note in plan that user should confirm

2. **PHOTO-01 landscape dimensions (2048x1152)**
   - What we know: Most existing photos are portrait (1536x2048); PHOTO-01 is landscape
   - What's unclear: Whether the landscape aspect ratio causes visual issues in the gallery grid (aspect-[3/4] container)
   - Recommendation: Accept it — the gallery uses `object-cover`, so landscape images crop to fit; verify visually

3. **PHOTO-02 AVIF — convert or extend?**
   - Chosen approach above: extend 4 regexes
   - Alternative: `sharp(avif).jpeg().toFile(newName.jpg)` then use `.jpg` in manifest
   - Recommendation: Extend regexes (future-proof); conversion creates an orphaned AVIF file

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)

- `scripts/photo-manifest.js` — manifest format, current 53 entries
- `scripts/match-photos.js` — pipeline logic, `findPointAtMile`, validation
- `scripts/generate-data.js` — orchestration, image copy filter (L26)
- `scripts/generate-thumbnails.js` — thumbnail generation, path.parse stem approach
- `scripts/assign-card-photos.js` — cover photo selection algorithm, idempotency logic
- `src/components/PhotoGallery.astro` — thumbnail path regex (L24)
- `src/components/GravelSectors.astro` — card path regex (L30)
- `src/components/KomSegments.astro` — card path regex (L23)
- `src/components/RouteMap.astro` — uses `photo.filename` directly (no extension handling)
- `public/data/photos.json` — current 53 entries verified
- `public/data/annotations.json` — Down Jeep sector (83.55–84.15), Billie Helmer KOM (21.9–22.59)
- Sharp format inspection: `sharp.format.heif.input.fileSuffix: [".avif"]` — AVIF readable as heif
- Images inventory: both new files confirmed present in `images/`

### Secondary (MEDIUM confidence)

- Browser AVIF support (Chrome 85+, Firefox 93+, Safari 16+) — relevant for `<img>` tags in gallery/map

---

## Metadata

**Confidence breakdown:**
- Pipeline mechanics: HIGH — inspected all scripts directly
- AVIF support in sharp: HIGH — confirmed via live node invocation
- AVIF bugs in pipeline: HIGH — confirmed by tracing code paths
- Mile marker values: LOW — educated guesses from sector midpoints; user must confirm
- Browser AVIF display: MEDIUM — well-established support, not tested in this project

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable pipeline, no fast-moving dependencies)
