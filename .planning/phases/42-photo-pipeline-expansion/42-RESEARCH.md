# Phase 42: Photo Pipeline Expansion — Research

**Researched:** 2026-03-31
**Domain:** Photo manifest expansion + Node.js image pipeline (sharp, exifr)
**Confidence:** HIGH — all findings from direct codebase inspection

## Summary

Phase 42 adds 19 photos to `scripts/photo-manifest.js` and re-runs the full prebuild pipeline to reach 74 total photos. The pipeline is entirely custom Node.js scripts (no third-party service), well-understood from 41 prior phases of work. The standard sequence is: manifest edit → `npm run data` → review cover photo assignments.

The key constraint is that **mile markers must be manually assigned by the route owner** — none of the 19 new photos contain EXIF GPS data, so all 19 require explicit `{ filename, mi }` entries in the manifest. This is the only step that requires human input. Everything else is fully automated by `npm run data`.

The ROADMAP success criteria for this phase (criteria 1 and 2) reference `thumb`/`src` fields and `public/thumbs/`/`public/card-crops/` directories that do not match the actual codebase. The actual pipeline produces `filename`/`width`/`height` fields and outputs to `public/images/thumbs/` and `public/images/cards/`. The planner should target the actual codebase behavior, not the ROADMAP description.

**Primary recommendation:** Assign mile markers for all 19 new photos, then run `npm run data`. Review cover photo changes in annotations.json after the pipeline completes (PHOTO-05).

---

## Standard Stack

### Core
| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| `scripts/photo-manifest.js` | custom | Source of truth: filenames + mile markers | Edit this to add photos |
| `scripts/match-photos.js` | custom | Produces `public/data/photos.json` from manifest | Adds lat/lon/mi/source |
| `scripts/generate-thumbnails.js` | custom | 400px WebP thumbs + adds width/height to photos.json | Uses sharp |
| `scripts/assign-card-photos.js` | custom | Assigns cover photos to annotations, generates 600x338 card crops | Idempotent on crop files |
| `scripts/generate-data.js` | custom | Orchestrates full pipeline | `npm run data` or `npm run prebuild` |
| sharp | `^x.x` (in package.json) | Image resizing, WebP conversion | Already installed |
| exifr | `^7.1.3` | EXIF GPS extraction (unused for these photos — no GPS tags) | Already installed |

**Run command:**
```bash
npm run data
# equivalent to: node scripts/generate-data.js
```

---

## Architecture Patterns

### Pipeline Sequence (generate-data.js)
```
1. Copy images/ → public/images/          (fs.copyFileSync for all jpg/jpeg/png/webp/avif)
2. parse-gpx.js                           → public/data/route-data.json
3. resolve-annotations.js                 → public/data/annotations.json
4. match-photos.js                        → public/data/photos.json  (filename, lat, lon, mi, source)
5. generate-thumbnails.js                 → public/images/thumbs/*.webp + adds width/height to photos.json
6. assign-card-photos.js                  → public/images/cards/*.webp + coverPhoto in annotations.json
7. convert-hero.js                        → public/images/hero.webp
8. convert-tone-images.js                 → public/tone/*.webp
```

### Manifest Entry Format
```javascript
// Source: scripts/photo-manifest.js
{ filename: 'AQ8t34n9H_j2iXTnn4esifeYEl8BHrQvWj6-TWAgYDA-1536x2048.jpg', mi: XX.X },
```
- `filename` must be the exact basename (no path prefix)
- `mi` is a decimal mile marker within 0–100.62 (MKULTRA.gpx route)
- Manifest must remain sorted by `mi` ascending (match-photos.js re-sorts, but convention)
- Geographic section comments (`// -- Mi XX-YY: description --`) should be maintained

### photos.json Schema (actual, post-pipeline)
```json
{
  "filename": "photo.jpg",
  "lat": 46.47413,
  "lon": -87.04122,
  "mi": 19.6,
  "source": "manual",
  "width": 1200,
  "height": 1600
}
```
- `width` and `height` are added by `generate-thumbnails.js` (step 5), NOT by `match-photos.js` (step 4)
- **Running `match-photos.js` alone strips width/height** — always run the full pipeline via `npm run data`

### Cover Photo Assignment Algorithm
```
assign-card-photos.js selectCoverPhoto(startMi, lengthMi, name):
  Pass 1: photos within [startMi, startMi+lengthMi] → pick closest to midpoint
  Pass 2: if no photos in range → pick nearest in entire manifest (fallback, logs WARNING)
```
- Algorithm is idempotent: skips card crop if file already exists at `public/images/cards/`
- Adding 19 photos CAN change which photo is selected as cover for any sector/KOM

### Thumbnail Path Convention
- Pipeline writes to: `public/images/thumbs/{basename}.webp`
- Components read from: `/images/thumbs/{filename.replace(ext, '.webp')}`
- Both produce the same path — they are consistent

### Actual Output Paths (vs ROADMAP description)
| ROADMAP says | Actual codebase |
|---|---|
| `public/thumbs/` | `public/images/thumbs/` |
| `public/card-crops/` | `public/images/cards/` |
| `thumb` field in photos.json | Not stored; derived from `filename` at render time |
| `src` field in photos.json | Not stored; derived from `filename` at render time |

**The success criteria in ROADMAP.md are aspirational descriptions written before implementation.** The plan should verify against the actual codebase behavior.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image resize/WebP conversion | Custom sharp wrapper | `scripts/generate-thumbnails.js` (exists) | Already handles all edge cases, writes width/height back |
| Cover photo selection | Custom picker | `scripts/assign-card-photos.js` (exists) | Already has midpoint-closest + fallback algorithm |
| Pipeline orchestration | Partial scripts | `npm run data` (full pipeline) | Running partial pipeline = stale artifacts (e.g., missing width/height) |

**Key insight:** The pipeline is already complete and working. Phase 42 is a DATA task (update manifest + run pipeline), not a code task.

---

## Common Pitfalls

### Pitfall 1: Running match-photos.js Standalone
**What goes wrong:** `photos.json` loses `width` and `height` fields. Components break (PhotoSwipe needs dimensions for lightbox sizing).
**Why it happens:** `match-photos.js` only outputs `filename/lat/lon/mi/source`. `generate-thumbnails.js` adds `width/height` in a second pass.
**How to avoid:** Always run `npm run data` (full pipeline), never `node scripts/match-photos.js` alone.
**Warning signs:** `photos.json` entries missing `width`/`height` fields after pipeline run.

### Pitfall 2: Partial Pipeline Leaves Stale Card Crops
**What goes wrong:** Old card crops from previous cover photo selections remain in `public/images/cards/` after cover photo changes. This is harmless waste (unused files), not a functional error.
**Why it happens:** `assign-card-photos.js` is idempotent — skips generation if file exists, but never deletes old files.
**How to avoid:** Accept stale waste OR manually clear `public/images/cards/` before running pipeline if clean state is desired.

### Pitfall 3: Mile Marker Outside Route Bounds
**What goes wrong:** `match-photos.js` clamps to last trackpoint and emits a WARNING. Photo appears at wrong map position.
**Why it happens:** Manifest `mi` value exceeds route end (100.62 mi for MKULTRA.gpx).
**How to avoid:** All new mile markers must be ≤ 100.62. Validate output has zero WARNING lines.

### Pitfall 4: (1)-Suffix Files in manifest.js
**What goes wrong:** Filenames with spaces cause confusion. However, pipeline handles them correctly.
**Technical reality:** `path.parse('name (1).jpg').name` = `'name (1)'`, producing `'name (1).webp'`. Component `.replace(/\.(jpg|jpeg|png|avif)$/i, '.webp')` also produces `'name (1).webp'`. **They match** — spaces in filenames are safe throughout the pipeline.
**Action:** Include all 2 space-in-filename photos in manifest. The "(1)-suffix exclusion" in the manifest comment referred to near-duplicate shots; these are unique photos with no non-(1) counterpart.

### Pitfall 5: Three Untracked Images Not in Git
**What goes wrong:** Netlify build fails — images not in git = not available during `npm run prebuild`.
**Why it happens:** Three of the 19 new photos are untracked:
- `images/-puZf5h8FVPBCvKwc79j5fOPJ0zOaFvVubT62OaAWLw-1536x2048.jpg` (untracked)
- `images/3-QHvzJIeVE74Z49q3GF-yAIY99bvmpu1N23jDyj6ng-1536x2048.jpg` (untracked)
- `images/mXQPKVsctLmV9XN-4NbU2eSHyoyeMfJghqr9a3iryNQ-1542x2048.jpg` (untracked)
**How to avoid:** `git add` these 3 files before committing. The other 16 of the 19 are already tracked.

### Pitfall 6: Interpreting ROADMAP Success Criteria Literally
**What goes wrong:** Trying to add `thumb`/`src` fields to `photos.json` or move outputs to `public/thumbs/` would break working components.
**Why it happens:** ROADMAP.md success criteria were written before implementation and use informal descriptions.
**How to avoid:** Target actual codebase behavior: `public/images/thumbs/`, `public/images/cards/`, `filename`+`width`+`height` fields.

---

## Code Examples

### Adding Entries to photo-manifest.js
```javascript
// Source: scripts/photo-manifest.js (existing pattern)

// -- Mi XX-YY: description of route segment --
{ filename: 'AQ8t34n9H_j2iXTnn4esifeYEl8BHrQvWj6-TWAgYDA-1536x2048.jpg', mi: XX.X },
{ filename: 'HPBlbKhBz0-5_T0sbj2ih_5vs1nQMxLG63JgbSmpYcc-1536x2048 (1).jpg', mi: XX.X },
```
- Insert at correct sorted position by mile marker
- Maintain geographic section comments for readability
- Update manifest header comment to reflect new count: `curated list of 74 route photos`

### Running Pipeline and Validating Output
```bash
# Full pipeline (always use this)
npm run data

# Expected successful output endings:
#   "Validation: all checks passed."
#   "Thumbnails: 74 generated"
#   "photos.json updated with width/height for 74 entries"
#   "Card photos: X generated, Y skipped"
#   "annotations.json updated with coverPhoto for 6 sectors, 3 KOMs"

# Verify photo count
node -e "const p=require('./public/data/photos.json'); console.log(p.length)"
# Expected: 74
```

### Checking for Validation Warnings
```bash
# Run pipeline and grep for warnings
npm run data 2>&1 | grep -i "warning\|warn"
# Should produce NO output (zero warnings)
```

### Verifying Cover Photo Assignments After Expansion
```bash
# Print current cover photo assignments
node -e "
const a=require('./public/data/annotations.json');
[...a.sectors, ...a.kom].forEach(x => console.log(x.name + ':', x.coverPhoto));
"
```

---

## State of the Art

| Area | Current State | Notes |
|------|--------------|-------|
| Pipeline | 55 photos processed; 74 in images/ | 19 need to be added to manifest |
| photos.json | 55 entries; fields: filename/lat/lon/mi/source/width/height | Needs to reach 74 |
| public/images/thumbs/ | 55 WebP thumbnails | Will be fully regenerated (cleared + rebuilt) on next run |
| public/images/cards/ | 15 WebP card crops (some stale) | Only 9 currently active in annotations |
| 3 untracked images | Not in git | Must be `git add`-ed before commit |
| Mile markers | All 55 existing photos have verified mile markers | 19 new photos have NO mile markers yet |

---

## Key Inventory: The 19 New Photos

All 19 files currently in `images/` but absent from `photo-manifest.js`:

| Filename | Git Status | Has (1)? | Notes |
|----------|-----------|----------|-------|
| `-puZf5h8FVPBCvKwc79j5fOPJ0zOaFvVubT62OaAWLw-1536x2048.jpg` | UNTRACKED | No | Must `git add` |
| `3-QHvzJIeVE74Z49q3GF-yAIY99bvmpu1N23jDyj6ng-1536x2048.jpg` | UNTRACKED | No | Must `git add` |
| `AQ8t34n9H_j2iXTnn4esifeYEl8BHrQvWj6-TWAgYDA-1536x2048.jpg` | tracked | No | — |
| `HPBlbKhBz0-5_T0sbj2ih_5vs1nQMxLG63JgbSmpYcc-1536x2048 (1).jpg` | tracked | YES | No non-(1) version exists; include it |
| `Kd-ZcWFZTTubJxNhsBWi3_ZDJ5-yIMF0Jl0w8haYzZk-1536x2048.jpg` | tracked | No | — |
| `MvYek6iGTxbVXGtLxnR2BybaDFvgOg24w5w0c68qMxI-1536x2048.jpg` | tracked | No | — |
| `PMZhWpw1cRv1dd_9JoGQpOI_8z69OMPTCN4NfqsOst0-1536x2048.jpg` | tracked | No | — |
| `Rh4lqzbhHiwBzEJY6XG0Avc6haQL3ncD7rWHROJntSE-1536x2048.jpg` | tracked | No | — |
| `TDpZETSgQkDKgX_TPqtqdfrgeXYng1foZ0Sg0wYU7MM-2048x1536.jpg` | tracked | No | Landscape orientation |
| `ULyOG9yaMot_llHphjqi4bbQsFrMXSAyBNyDgrzeQIU-1536x2048.jpg` | tracked | No | — |
| `ZcCmXFNZmW3n0OLe8obmRBgjoZvUwbnmJJfKqxRA-Lk-1536x2048.jpg` | tracked | No | — |
| `bhQNOmQCAG6CF-cN3-IMST5n7mj0EmWXHiZLgbZdXDM-1536x2048.jpg` | tracked | No | — |
| `eaNbqktsmtOJsUc9lnp7Ifx77E7ErNvtb3gmtqEeZEU-945x2048.jpg` | tracked | No | Narrow portrait (945px wide) |
| `ipfw_ehbbc_x1yHQh1cRQ9m0aHTdFMgSn7eiTz4R2e0-1536x2048.jpg` | tracked | No | — |
| `mXQPKVsctLmV9XN-4NbU2eSHyoyeMfJghqr9a3iryNQ-1542x2048.jpg` | UNTRACKED | No | Must `git add` |
| `nMjnLjbpQB2Me4T92DAYFoEhF2zqz6_l_6eeCxmNlJY-1536x2048.jpg` | tracked | No | — |
| `waY-Dewnq6C_jc-o-6a7Xp77kMQWIaZPP8z9ajs_70I-1536x2048.jpg` | tracked | No | — |
| `y0WSG2McPuL78RzWGc9OK1gYNt83rE-a0B5tml43Qsg-1536x2048 (1).jpg` | tracked | YES | No non-(1) version exists; include it |
| `yqnQXlPieOGxPe0KpSQGTZvCbVSyyx3QqpqO1WaWSg0-1536x2048.jpg` | tracked | No | — |

**None of the 19 have EXIF GPS data** — all mile markers must come from the route owner.

---

## Current Cover Photo Assignments (pre-expansion)

After pipeline runs with 74 photos, the algorithm may select different covers for any of these:

| Card | Mile Range | Current Cover |
|------|-----------|---------------|
| Sandstrom sector | mi 23.4–29.3 | `ocbHm30HWGIBDMhMARec4eQ86L5Bw_yNG1Sa1NtkfW0-2048x1536.jpg` |
| Akkala Rd sector | mi 39.5–40.9 | `4DLSgkj2_jeCh_vruEj0nt7HKrZNpDsRJlCFOWm69u8-1536x2048.jpg` |
| Haavisto sector | mi 43.0–44.4 | `LpoxSYsBzxnVR1Z1bNDmCMY69nbZE3Wim8gzgExAqMs-1536x2048.jpg` |
| Forest Service Rd sector | mi 50.7–57.2 | `OQ3xED3f5T_KBXMhgpt-LZGU-yhIu36wFcap6uUT_is-1536x2048.jpg` |
| C4 sector | mi 58.7–64.4 | `2hX2RzHWb2HBzkd1bc68hqeTn0zJuV_pMnXDyFDKZOM-1536x2048.jpg` |
| Down Jeep sector | mi 83.55–84.1 | `68686675_2890293017652424_6952024628709556224_n.jpg` |
| Billie Helmer KOM | mi 21.9–22.6 | `photo-1675213442182-24e1c1671387.avif` |
| Leaving Chatham KOM | mi 37.6–38.0 | `leaving-chatham-rock-river-rd.png` |
| Silver Creek KOM | mi 78.55–80.1 | `aI8-qjgYasaaJ3Xu6RcqyaSk5EzCVwPbNGH1xn2PwFQ-1536x2048.jpg` |

---

## Open Questions

1. **Mile markers for 19 new photos**
   - What we know: None have EXIF GPS. Pipeline requires explicit `mi` values.
   - What's unclear: What mile markers should each of the 19 photos get?
   - Recommendation: The plan must include a step asking the route owner to assign mile markers before the manifest can be edited. This is a **human-required input** — cannot be automated.

2. **ROADMAP success criteria: `thumb`/`src` fields**
   - What we know: The actual pipeline does NOT produce these fields. Components derive paths from `filename` at render time. Phase 43 (downstream consumer) only states it needs "74 photos with correct dimensions."
   - What's unclear: Were `thumb`/`src` fields ever intended to be added to `photos.json`, or are these informal descriptions of capabilities already present?
   - Recommendation: Treat success criteria 1 as satisfied when `photos.json` has 74 entries with `width` and `height` fields. Do not add `thumb`/`src` fields — this would require changes to pipeline scripts with no corresponding component changes.

3. **Which cover photo assignments will change after expansion?**
   - What we know: algorithm picks photo closest to sector/KOM midpoint. New photos in a sector's range may displace the current cover.
   - What's unclear: Won't be known until mile markers are assigned and pipeline runs.
   - Recommendation: Run pipeline, then compare `annotations.json` to table above and review each changed assignment visually (PHOTO-05).

---

## Sources

### Primary (HIGH confidence)
- Direct inspection of `scripts/photo-manifest.js` — 55 entries, structure, exclusion policy
- Direct inspection of `scripts/match-photos.js` — output schema, validation logic
- Direct inspection of `scripts/generate-thumbnails.js` — thumbnail output path, width/height injection
- Direct inspection of `scripts/assign-card-photos.js` — cover photo algorithm, idempotency
- Direct inspection of `scripts/generate-data.js` — pipeline sequence, image copy filter
- Direct inspection of `public/data/photos.json` — current 55 entries, actual field schema
- Direct inspection of `public/data/annotations.json` — 6 sectors + 3 KOMs with current coverPhotos
- `src/components/PhotoGallery.astro` — how thumbnail paths are derived from filename
- `src/components/GravelSectors.astro` — how card crops are accessed
- `src/components/RouteMap.astro` — how photo markers use thumbnail paths
- Git status + `git ls-files images/` — identified 3 untracked images
- EXIF check via exifr on sample new photos — confirmed no GPS data

### Secondary (MEDIUM confidence)
- `.planning/phases/18-photo-position-verification/18-VERIFICATION.md` — confirmed standalone match-photos.js strips width/height
- `.planning/phases/23-new-photos/23-01-PLAN.md` — confirmed precedent: two photos added in same pattern
- `.planning/ROADMAP.md` — confirmed discrepancy between stated and actual paths/fields

---

## Metadata

**Confidence breakdown:**
- Pipeline mechanics: HIGH — direct code inspection
- 19 missing photos identification: HIGH — computed from manifest vs images/ directory
- Mile markers for new photos: N/A — requires route owner input
- ROADMAP discrepancy: HIGH — both ROADMAP and code directly read
- (1)-suffix file handling: HIGH — verified with Node.js path.parse and .replace behavior

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable pipeline — no external dependencies to expire)
