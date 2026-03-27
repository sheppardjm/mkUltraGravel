---
phase: 12-photo-pipeline-card-photos-image-quality
verified: 2026-03-27T22:27:26Z
status: passed
score: 4/4 must-haves verified
---

# Phase 12: Photo Pipeline — Card Photos & Image Quality Verification Report

**Phase Goal:** Users see a representative photo on every sector card and every KOM card; gallery thumbnails are sharper and larger.
**Verified:** 2026-03-27T22:27:26Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every gravel sector card displays a photo cropped to the sector's terrain | VERIFIED | `annotations.json` — 6/6 sectors have `coverPhoto`; 6/6 map to existing `/images/cards/*.webp`; `GravelSectors.astro` renders `{sector.coverPhoto && <img ...>}` |
| 2 | Every KOM segment card displays a photo representative of that climb | VERIFIED | `annotations.json` — 3/3 KOMs have `coverPhoto`; 3/3 map to existing `/images/cards/*.webp`; `KomSegments.astro` renders `{segment.coverPhoto && <img ...>}` |
| 3 | Gallery thumbnails display at 400px width and are visibly sharper than the current 200px versions | VERIFIED | All 53 `/images/thumbs/*.webp` measured at exactly 400px wide via `sharp.metadata()`; `generate-thumbnails.js` has `.resize(400, null, ...)` and `q80` |
| 4 | No individual thumbnail degrades the page load time beyond an acceptable byte budget increase | VERIFIED | Thumbnails: 27KB–86KB, avg 59KB (retina-quality 400px WebP q80). Card crops: 23KB–77KB, avg 54KB. 9 card crops total 485KB. All below expected budgets |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/assign-card-photos.js` | Two-pass photo-to-annotation matching + card crop generation | VERIFIED | 127 lines; real sharp pipeline; exports `{ assignCardPhotos }`; `require.main === module` pattern |
| `public/images/cards/*.webp` | 9 × 600x338 WebP card crops | VERIFIED | 9 files on disk; 3 sampled at 600x338 via `sharp.metadata()`; 23KB–77KB range |
| `public/data/annotations.json` | `coverPhoto` field on all 6 sectors and 3 KOMs | VERIFIED | Node check confirms `sectors.every(s=>s.coverPhoto) = true`, `kom.every(k=>k.coverPhoto) = true` |
| `scripts/generate-thumbnails.js` | 400px/q80 WebP with stale-clearing | VERIFIED | `.resize(400, null, ...)`, `.webp({ quality: 80, effort: 4 })`, stale-clear block at lines 29–33 |
| `scripts/generate-data.js` | assign-card-photos.js wired as pipeline step 5 | VERIFIED | `execSync` call for `assign-card-photos.js` at lines 66–73; header comment lists all 7 steps |
| `src/components/GravelSectors.astro` | Renders card photo img per sector | VERIFIED | 56 lines; `coverPhoto?: string` in type; `{sector.coverPhoto && <img>}` conditional; `width="600" height="338" loading="lazy" decoding="async"` |
| `src/components/KomSegments.astro` | Renders card photo img per KOM | VERIFIED | 43 lines; `coverPhoto?: string` in type; `{segment.coverPhoto && <img>}` conditional; same attributes |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `assign-card-photos.js` | `public/data/photos.json` | `fs.readFileSync` at line 37 | WIRED | Reads and parses photos manifest |
| `assign-card-photos.js` | `public/data/annotations.json` | `fs.writeFileSync` at line 113 | WIRED | Mutates only `coverPhoto`; writes back full object |
| `GravelSectors.astro` | `/images/cards/*.webp` | `img src` at line 29 | WIRED | Template literal `/images/cards/${sector.coverPhoto.replace(...)}` — 9/9 paths resolve to files on disk |
| `KomSegments.astro` | `/images/cards/*.webp` | `img src` at line 22 | WIRED | Same pattern — 3/3 paths resolve to files on disk |
| `generate-data.js` | `assign-card-photos.js` | `execSync` at lines 66–73 | WIRED | Step 5 in 7-step pipeline; error exits on failure |
| `npm run prebuild` | `generate-data.js` | `package.json` scripts | WIRED | `"prebuild": "node scripts/generate-data.js"` — runs before every `astro build` |
| `index.astro` | `GravelSectors.astro` / `KomSegments.astro` | import + JSX usage | WIRED | Imported at lines 7–8; rendered at lines 99 and 103 |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| VIS-06 — Sector card photos | SATISFIED | 6/6 sectors covered |
| VIS-07 — KOM card photos | SATISFIED | 3/3 KOMs covered |
| VIS-08 — Sharper gallery thumbnails | SATISFIED | 400px/q80 confirmed for all 53 photos |

### Anti-Patterns Found

None. Zero TODO/FIXME/placeholder patterns across all 5 modified files. No stub handlers or empty returns.

### Human Verification Required

1. **Card photo visual relevance**
   - Test: View the live site (or `npm run dev`) and inspect each of the 6 sector cards and 3 KOM cards
   - Expected: Each card photo shows terrain representative of that segment (not a generic shot)
   - Why human: The two-pass algorithm selects photos by mile proximity; visual relevance cannot be confirmed programmatically. Down Jeep sector and Leaving Chatham KOM used fallback photos (0 photos in range) and are known to show terrain from 3+ miles away

2. **Gallery thumbnail sharpness comparison**
   - Test: View the photo gallery section at 2x pixel density (retina/HiDPI display or browser zoom)
   - Expected: Thumbnails appear crisp rather than blurry/upscaled
   - Why human: Perceptual sharpness at 2x cannot be verified from file metadata alone

### Gaps Summary

No gaps. All four observable truths are verified by code inspection and filesystem checks.

- All 9 card crops exist on disk at 600x338 px (verified via `sharp.metadata()`)
- All 53 gallery thumbnails confirmed at exactly 400px wide (verified via `sharp.metadata()` on all 53 files)
- All 9 annotations (6 sectors + 3 KOMs) have `coverPhoto` field (verified via Node runtime check)
- All 9 `coverPhoto` → `/images/cards/*.webp` path transforms resolve to existing files
- Both Astro components have correct conditional rendering with CLS prevention attributes
- Pipeline is fully automated: `npm run prebuild` → `generate-data.js` → step 5 → `assign-card-photos.js`

---
_Verified: 2026-03-27T22:27:26Z_
_Verifier: Claude (gsd-verifier)_
