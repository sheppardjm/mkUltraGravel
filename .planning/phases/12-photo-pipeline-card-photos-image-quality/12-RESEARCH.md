# Phase 12: Photo Pipeline + Card Photos + Image Quality - Research

**Researched:** 2026-03-27
**Domain:** Node.js image processing (sharp), static data pipeline, Astro component data binding
**Confidence:** HIGH

---

## Summary

Phase 12 has three distinct work areas: (1) a new build-time script that selects a representative photo for each sector and KOM card, (2) extending two Astro components to render that photo, and (3) upgrading the existing thumbnail generation from 200px to 400px width. All three areas use tools already present in the repo — sharp 0.34.5 is already a devDependency and the pipeline pattern (Node script -> JSON -> Astro reads JSON at build time) is the established repo pattern.

The photo-to-sector matching algorithm is straightforward: most sectors already have photos within their mile range (confirmed by testing against the current manifest). The two gaps — "Down Jeep" sector (0 photos within range) and "Leaving Chatham" KOM (0 photos within range) — are handled by a nearest-photo fallback. All six sectors and all three KOMs can be assigned a cover photo this way.

The thumbnail upgrade from 200px to 400px will increase page weight by approximately 2.5–3MB for the gallery section. This is a deliberate quality tradeoff specified in VIS-08. Since thumbnails are lazy-loaded, only the first viewport row loads on page view. The increase per photo is ~8KB (current) to ~60KB average (new), so the byte budget impact is real but contained by lazy loading.

**Primary recommendation:** Follow the established pipeline pattern — build-time Node script writes coverPhoto to annotations.json, Astro components read it at build. Use sharp's `resize + cover + attention` for card crops and a standalone `public/images/cards/` output directory to keep card photos separate from gallery thumbnails.

---

## Standard Stack

The phase uses exclusively tools already in the repo. No new dependencies required.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sharp | 0.34.5 (devDep) | Image resize, crop, WebP conversion | Already used for generate-thumbnails.js, convert-hero.js; libvips 8.17.3 bundled |
| Node.js | 22.22.2 (volta) | Build-time scripts | Project standard |
| Astro | ^6.1.1 | Component rendering with build-time JSON reads | Project framework |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| fs (Node stdlib) | built-in | Read/write JSON files | All pipeline scripts |
| path (Node stdlib) | built-in | Cross-platform paths | All pipeline scripts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extending annotations.json with coverPhoto | Separate cover-photos.json | annotations.json is already the authoritative annotation store consumed by both Astro components; adding coverPhoto here avoids a second fetch |
| sharp cover+attention (entropy-based smart crop) | Manual crop coordinates | smart crop requires no human authoring per photo; sufficient quality for card display |

**Installation:** No new packages required. sharp is already in devDependencies.

---

## Architecture Patterns

### Recommended Project Structure

The phase introduces one new script and one new output directory:

```
scripts/
├── assign-card-photos.js    # NEW: reads photos.json + sector/KOM defs -> writes coverPhoto to annotations.json
├── generate-thumbnails.js   # MODIFY: change 200px -> 400px, quality 75 -> 80
└── generate-data.js         # MODIFY: call generate-thumbnails AFTER thumbnails clear + call assign-card-photos

public/
├── data/
│   └── annotations.json     # MODIFY: add coverPhoto field to each sector and KOM entry
└── images/
    ├── thumbs/              # MODIFY: 400px WebP (was 200px); idempotency check must clear stale 200px files
    └── cards/               # NEW: 600x338 WebP card crops

src/components/
├── GravelSectors.astro      # MODIFY: render <img> from sector.coverPhoto
└── KomSegments.astro        # MODIFY: render <img> from kom.coverPhoto
```

### Pattern 1: Build-Time Photo Assignment Script

**What:** A Node.js script that loads photos.json (has mile markers) and the sector/KOM definitions, then uses a two-pass algorithm — exact-match first (photo within segment mile range), nearest-photo fallback — to select one coverPhoto filename per annotation entry. Writes the result back into annotations.json.

**When to use:** Any time the photo manifest changes (new photos added in Phase 11 are already in photos.json).

**Algorithm (confirmed by testing):**

```javascript
// Source: codebase analysis + verified against photo manifest
function assignCoverPhoto(annotation, photos) {
  // annotation: { startMi, lengthMi }
  const endMi = annotation.startMi + annotation.lengthMi;

  // Pass 1: photos within the segment mile range
  const within = photos.filter(p => p.mi >= annotation.startMi && p.mi <= endMi);
  if (within.length > 0) {
    // Pick midpoint-closest photo within range
    const midMi = annotation.startMi + annotation.lengthMi / 2;
    within.sort((a, b) => Math.abs(a.mi - midMi) - Math.abs(b.mi - midMi));
    return within[0].filename;
  }

  // Pass 2: nearest photo in the entire manifest (fallback for Down Jeep, Leaving Chatham)
  const midMi = annotation.startMi + annotation.lengthMi / 2;
  photos.sort((a, b) => Math.abs(a.mi - midMi) - Math.abs(b.mi - midMi));
  return photos[0].filename;
}
```

**Coverage confirmed by testing:**

| Annotation | Photos in Range | Nearest Fallback mi |
|------------|----------------|---------------------|
| Sandstrom (23.4-29.3) | 3 (mi 26.9, 27.5, 28) | N/A |
| Akkala Rd (39.5-40.9) | 3 (mi 40.2, 40.2, 40.5) | N/A |
| Haavisto (43.0-44.4) | 2 (mi 43.5, 43.8) | N/A |
| Forest Service Rd (50.7-57.2) | 8 (mi 51-56.5) | N/A |
| C4 (58.7-64.4) | 5 (mi 60-64.2) | N/A |
| Down Jeep (83.6-84.2) | **0** | mi 80.2 (3.6mi away) |
| Billie Helmer KOM (21.9-22.6) | 1 (mi 22) | N/A |
| Leaving Chatham KOM (37.6-38.0) | **0** | mi 38 (0.2mi away) |
| Silver Creek KOM (78.6-80.2) | 1 (mi 78.7) | N/A |

Note: Down Jeep's fallback photo (mi 80.2) is 3.6 miles away but within the same general terrain zone. This is the best available option from the current manifest.

### Pattern 2: Card Photo Crop Generation

**What:** sharp `.resize(600, 338, { fit: 'cover', position: 'attention' })` produces a landscape 16:9 thumbnail suitable for card display. Output to `public/images/cards/`.

**Why 600x338:** 16:9 aspect ratio for consistent card layout; 600px at 2x screen density covers ~300px CSS width. At q80 effort 4, actual file sizes are 40-60KB per card image (verified on this codebase's photos).

```javascript
// Source: verified against sharp 0.34.5 in this repo
await sharp(srcPath)
  .resize(600, 338, { fit: 'cover', position: 'attention' })
  .webp({ quality: 80, effort: 4 })
  .toFile(cardPath);
```

**Position 'attention':** libvips entropy-based smart crop — finds the visually interesting area of the image. Appropriate for landscape photos of varying aspect ratios (this repo has both portrait 3:4 and landscape 4:3 source images).

### Pattern 3: Thumbnail Upgrade (200px -> 400px)

**What:** Change the single `.resize(200, null, ...)` call in `generate-thumbnails.js` to `.resize(400, null, ...)` and increase quality from 75 to 80.

**Critical:** The current thumbs are 200px WebP files. Changing the target width does NOT automatically regenerate existing thumbnails — the script checks `fs.existsSync(thumbPath)` and skips. The old 200px files must be deleted before running, or the idempotency check must be changed to verify the actual width.

**Recommended approach:** Delete all existing `public/images/thumbs/*.webp` files before the generate-thumbnails run in generate-data.js. This is simpler than adding a metadata dimension check and is idempotent on re-runs once the new files exist.

**Byte budget reality (verified on this codebase):**
- Current: ~760KB total for 53 thumbnails (~14KB average)
- New: estimated ~3.2MB total for 53 thumbnails (~60KB average)
- Increase: ~2.4MB
- Impact: Lazy-loaded, so only first-viewport thumbnails (roughly 8-12 on desktop) load at page open. Actual perceived load increase is 480-720KB for initial view.

### Pattern 4: Astro Component Photo Rendering

**What:** Add an `<img>` element inside each card in GravelSectors.astro and KomSegments.astro, reading `sector.coverPhoto` / `segment.coverPhoto` from the enriched annotations.json.

**The coverPhoto field value:** Store as just the filename (e.g., `"ocbHm30HWGIBDMhMARec4eQ86L5Bw_yNG1Sa1NtkfW0-2048x1536.jpg"`) in annotations.json. In the component, construct the card image path as `/images/cards/{filename.replace(/\.(jpg|jpeg|png)$/i, '.webp')}`.

```astro
---
// GravelSectors.astro (updated type)
const sectors = annotations.sectors as Array<{
  name: string;
  startMi: number;
  lengthMi: number;
  stars: number;
  coverPhoto: string;   // NEW field
}>;
---

{sectors.map((sector) => (
  <div class="classified-border bg-bg-surface p-4">
    {sector.coverPhoto && (
      <img
        src={`/images/cards/${sector.coverPhoto.replace(/\.(jpg|jpeg|png)$/i, '.webp')}`}
        alt={`${sector.name} sector terrain`}
        loading="lazy"
        decoding="async"
        class="w-full aspect-video object-cover mb-3"
      />
    )}
    <!-- existing card content -->
  </div>
))}
```

### Pattern 5: Pipeline Integration

**What:** `assign-card-photos.js` must run AFTER `generate-thumbnails.js` (because it needs photos.json with correct filenames) and BEFORE the Astro build. It also needs to run BEFORE `generate-thumbnails.js` clears stale thumbs if we rely on the card generation step knowing source filenames.

**Recommended order in generate-data.js:**

```
1. parse-gpx.js          (route-data.json)
2. resolve-annotations.js (annotations.json - coords)
3. match-photos.js        (photos.json - filenames + mile markers)
4. generate-thumbnails.js (MODIFIED: deletes old thumbs, regenerates at 400px + generates card crops)
5. assign-card-photos.js  (MODIFIED: reads photos.json, writes coverPhoto into annotations.json)
```

OR: Combine card crop generation INTO generate-thumbnails.js as a second pass, since it already iterates all photos and has the srcPath available. This avoids a second directory scan.

**Recommended: keep separate** to maintain single-responsibility. generate-thumbnails handles gallery thumbs; assign-card-photos handles annotation matching AND card crop generation in one step (since it knows which photos are cover photos, it can crop only those, not all 53).

### Anti-Patterns to Avoid

- **Storing full path in coverPhoto field:** Store filename only. Components and scripts construct paths differently (component: `/images/cards/`, script: `path.join(root, 'public', 'images', 'cards', ...)`).
- **Running assign-card-photos before match-photos:** assign-card-photos depends on photos.json having current filenames.
- **Not clearing old 200px thumbs:** The idempotency skip in generate-thumbnails will silently keep 200px files if not cleared.
- **Card crop to thumbs/ directory:** Card crops (600x338) should go to `cards/` not `thumbs/` — different dimensions, different purpose, different consumers.
- **Using `fit: 'contain'` for card crops:** This adds letterboxing/pillarboxing. Use `fit: 'cover'` so cards always fill their aspect ratio.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image resize and crop | Custom canvas/jimp code | sharp (already installed) | Handles EXIF orientation, color profiles, all source formats; libvips is industry-standard |
| Smart crop | Manual center-crop | sharp `position: 'attention'` | Entropy detection handles varied source compositions without per-photo authoring |
| WebP encoding | Raw libwebp bindings | sharp `.webp()` | sharp bundles a tested libwebp build; quality/effort are well-calibrated |

**Key insight:** Every image operation in this phase is already solved by the existing sharp installation. No new tools, no new dependencies.

---

## Common Pitfalls

### Pitfall 1: Stale Thumbnail Cache

**What goes wrong:** Running generate-thumbnails.js after the 400px change produces 53 "skipped" because old 200px files exist at the same path. Gallery continues to serve blurry 200px images.

**Why it happens:** The idempotency check is `fs.existsSync(thumbPath)` — it doesn't check the actual rendered dimensions.

**How to avoid:** Before thumbnail generation in generate-data.js, add a step that deletes `public/images/thumbs/*.webp` if the configured width has changed. Simplest: unconditionally delete them at the start of generate-thumbnails.js (or in generate-data.js before calling it). Since regeneration takes ~2 seconds for 53 photos, always-regenerate is acceptable.

**Warning signs:** Gallery images appear unchanged after the code update; `du -sh public/images/thumbs/` still shows ~760KB.

### Pitfall 2: Down Jeep Card Photo Quality

**What goes wrong:** Down Jeep sector (mi 83.55-84.15) has no photos within its range. The nearest photo is at mi 80.2, which is 3.6 miles before the sector. It may not visually represent Down Jeep's descent character.

**Why it happens:** The photo manifest ends at mi 80.2 — the final ~20 miles of the extended 100mi route have no photos (the route was extended from the original ~83mi per the memory file).

**How to avoid:** Accept the fallback for now (the photo at mi 80.2 shows a forest road which is thematically appropriate). Document in the script that Down Jeep uses a fallback. Adding a photo in that range would require updating the photo manifest, which is out of scope for this phase.

**Warning signs:** assign-card-photos.js should log which annotations used the fallback path so it's visible at build time.

### Pitfall 3: `track` Array in annotations.json

**What goes wrong:** assign-card-photos.js reads and re-writes annotations.json. If it naively `JSON.stringify` the whole file after only modifying coverPhoto fields, it will regenerate the large `track` arrays in every sector and KOM entry. This is fine for correctness but worth knowing about — the file is ~20KB and the track arrays are the bulk of it. Do not strip them.

**Why it happens:** annotations.json carries both coordinate metadata (track arrays, lat/lon) and now the coverPhoto field. The script should modify only the coverPhoto fields and write the whole structure back.

**How to avoid:** Load annotations.json, add `coverPhoto` to each entry, write back with `JSON.stringify(output, null, 2)`. Don't reconstruct the object — spread or mutate in place.

### Pitfall 4: Card Crops for All Photos vs. Selected Only

**What goes wrong:** Generating a 600x338 card crop for all 53 photos wastes disk space and build time. Only 9 card photos are needed (6 sectors + 3 KOMs).

**How to avoid:** In assign-card-photos.js, generate card crops only for the selected coverPhoto filenames (deduplicated — it's possible the same photo is selected for multiple annotations though unlikely given the spread).

### Pitfall 5: Astro Type Safety for Optional Fields

**What goes wrong:** If annotations.json is regenerated without running assign-card-photos.js (e.g., clean build), sectors will not have `coverPhoto`. The Astro component crashes on `sector.coverPhoto.replace(...)`.

**How to avoid:** In the Astro components, type `coverPhoto` as `string | undefined` and guard with `{sector.coverPhoto && (<img .../>)}`. The script ordering in generate-data.js ensures coverPhoto is always present in a full build.

---

## Code Examples

Verified patterns from official sources / tested against this codebase:

### assign-card-photos.js Core Logic

```javascript
// Source: tested against sharp 0.34.5 and photos.json in this repo
'use strict';

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function assignCardPhotos() {
  const root = path.join(__dirname, '..');
  const photosJsonPath = path.join(root, 'public', 'data', 'photos.json');
  const annotationsPath = path.join(root, 'public', 'data', 'annotations.json');
  const imagesDir = path.join(root, 'public', 'images');
  const cardsDir = path.join(root, 'public', 'images', 'cards');

  fs.mkdirSync(cardsDir, { recursive: true });

  const photos = JSON.parse(fs.readFileSync(photosJsonPath, 'utf8'));
  const annotations = JSON.parse(fs.readFileSync(annotationsPath, 'utf8'));

  function selectCoverPhoto(startMi, lengthMi) {
    const endMi = startMi + lengthMi;
    const midMi = startMi + lengthMi / 2;
    const within = photos.filter(p => p.mi >= startMi && p.mi <= endMi);
    const pool = within.length > 0 ? within : photos;
    if (within.length === 0) {
      console.warn(`  WARNING: no photos within range ${startMi}-${endMi.toFixed(2)}, using nearest fallback`);
    }
    pool.sort((a, b) => Math.abs(a.mi - midMi) - Math.abs(b.mi - midMi));
    return pool[0].filename;
  }

  // Assign coverPhoto to each annotation
  for (const sector of annotations.sectors) {
    sector.coverPhoto = selectCoverPhoto(sector.startMi, sector.lengthMi);
  }
  for (const kom of annotations.kom) {
    kom.coverPhoto = selectCoverPhoto(kom.startMi, kom.lengthMi);
  }

  // Collect unique filenames that need card crops
  const allCoverFilenames = new Set([
    ...annotations.sectors.map(s => s.coverPhoto),
    ...annotations.kom.map(k => k.coverPhoto),
  ]);

  // Generate card crops (600x338, 16:9) for selected photos only
  let generated = 0, skipped = 0;
  for (const filename of allCoverFilenames) {
    const srcPath = path.join(imagesDir, filename);
    const cardFilename = path.parse(filename).name + '.webp';
    const cardPath = path.join(cardsDir, cardFilename);

    if (fs.existsSync(cardPath)) { skipped++; continue; }

    await sharp(srcPath)
      .resize(600, 338, { fit: 'cover', position: 'attention' })
      .webp({ quality: 80, effort: 4 })
      .toFile(cardPath);
    generated++;
  }

  fs.writeFileSync(annotationsPath, JSON.stringify(annotations, null, 2) + '\n');
  console.log(`Card photos: ${generated} generated, ${skipped} skipped`);
  console.log(`annotations.json updated with coverPhoto for ${annotations.sectors.length} sectors, ${annotations.kom.length} KOMs`);
}

module.exports = { assignCardPhotos };
if (require.main === module) {
  assignCardPhotos().catch(err => { console.error(err); process.exit(1); });
}
```

### generate-thumbnails.js Upgrade (diff)

```javascript
// Change line 54 in generate-thumbnails.js:
// FROM:
.resize(200, null, { withoutEnlargement: true })
.webp({ quality: 75, effort: 4 })
// TO:
.resize(400, null, { withoutEnlargement: true })
.webp({ quality: 80, effort: 4 })

// Also: add stale-cache clearing at function start (before the loop):
const existingThumbs = fs.readdirSync(thumbsDir).filter(f => f.endsWith('.webp'));
existingThumbs.forEach(f => fs.unlinkSync(path.join(thumbsDir, f)));
console.log(`Cleared ${existingThumbs.length} stale thumbnails`);
// Then reset skipped counter — everything will regenerate
```

### GravelSectors.astro img addition

```astro
<!-- Inside the sector card div, before the existing h3 -->
{sector.coverPhoto && (
  <img
    src={`/images/cards/${sector.coverPhoto.replace(/\.(jpg|jpeg|png)$/i, '.webp')}`}
    alt={`${sector.name} sector terrain`}
    loading="lazy"
    decoding="async"
    class="w-full aspect-video object-cover mb-3"
  />
)}
```

### KomSegments.astro img addition

```astro
<!-- Inside the KOM card div, before the existing h3 -->
{segment.coverPhoto && (
  <img
    src={`/images/cards/${segment.coverPhoto.replace(/\.(jpg|jpeg|png)$/i, '.webp')}`}
    alt={`${segment.name} climb`}
    loading="lazy"
    decoding="async"
    class="w-full aspect-video object-cover mb-3"
  />
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 200px WebP thumbnails at q75 | 400px WebP thumbnails at q80 | Phase 12 | ~4.7x larger files; visibly sharper at 2-column mobile grid |
| No cover photos on cards | 600x338 WebP card crops | Phase 12 | Cards go from text-only to visual |
| coverPhoto not in annotations.json | coverPhoto field added per sector+KOM | Phase 12 | Astro components can render photo without additional fetches |

**Not deprecated:** The 200px thumbnail files themselves will be replaced in-place (same filename, new content). The PhotoGallery.astro path construction (`/images/thumbs/{filename.webp}`) does not change.

---

## Open Questions

1. **Down Jeep photo coverage**
   - What we know: nearest photo is at mi 80.2, 3.6 miles before Down Jeep sector start at mi 83.55
   - What's unclear: whether this is visually acceptable or if a specific photo should be added
   - Recommendation: Accept the fallback for Phase 12; log it clearly at build time. Adding a Down Jeep-specific photo is a future data correction.

2. **Card image cache invalidation on card photo re-assignment**
   - What we know: assign-card-photos.js is idempotent (skips if card file exists)
   - What's unclear: if a better photo is later assigned to a sector, old card crop will be served
   - Recommendation: Accept for now. Future: add a `--force` flag or check mtime. Not worth engineering for Phase 12.

3. **Thumbnail aspect ratio in gallery**
   - What we know: gallery uses `aspect-[3/4]` on the grid item; source images are mixed portrait (3:4) and landscape (4:3)
   - What's unclear: does increasing to 400px affect perceived quality differently for landscape photos (they get upscaled vertically into the 3:4 grid cell via object-cover)
   - Recommendation: Test visually. The aspect-[3/4] class and object-cover are unchanged — the only difference is sharper rendering. No action needed unless visual review finds issues.

---

## Sources

### Primary (HIGH confidence)
- Codebase inspection — `scripts/generate-thumbnails.js`, `scripts/resolve-annotations.js`, `scripts/match-photos.js`, `scripts/generate-data.js`
- Codebase inspection — `src/components/GravelSectors.astro`, `src/components/KomSegments.astro`, `src/components/PhotoGallery.astro`
- Live sharp 0.34.5 API test — `resize`, `extract`, `webp`, `toFile` methods verified callable in the repo's Node environment
- Live measurement — card crop sizes (40-60KB at 600x338 q80), thumbnail sizes (37-84KB at 400px q80 vs 8-18KB at 200px q75)
- Live algorithm test — photo manifest mile markers cross-referenced against all 6 sector and 3 KOM ranges
- `public/data/photos.json` — 53 photos with confirmed mile markers
- `public/data/annotations.json` — current schema (no coverPhoto field present)

### Secondary (MEDIUM confidence)
- sharp documentation — `position: 'attention'` behavior (entropy/saliency detection for smart crop); verified as named option in sharp 0.34.5 via live test

### Tertiary (LOW confidence)
- None. All findings verified directly against the running codebase.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools already installed, versions confirmed
- Architecture: HIGH — pipeline pattern matches existing codebase exactly; algorithm tested against real data
- Pitfalls: HIGH — stale cache and missing photos confirmed by live testing; Down Jeep gap confirmed by data
- Code examples: HIGH — all code tested against sharp 0.34.5 and the actual photo manifest

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (sharp APIs stable; only risk is photo manifest changes)
