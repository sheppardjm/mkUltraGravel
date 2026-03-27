---
phase: 12-photo-pipeline-card-photos-image-quality
plan: "01"
subsystem: data-pipeline
tags: [sharp, node, image-processing, annotations, webp, card-photos]

# Dependency graph
requires:
  - phase: 11-data-corrections
    provides: photos.json with verified mile markers and annotations.json with correct sector/KOM data
provides:
  - scripts/assign-card-photos.js — two-pass photo-to-annotation matching with fallback
  - public/images/cards/*.webp — 9 unique 600x338 WebP card crops
  - public/data/annotations.json enriched with coverPhoto field on all 6 sectors and 3 KOMs
affects: [12-02, 12-03, GravelSectors.astro, KomSegments.astro]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-pass photo matching: exact range first, nearest fallback second — no new dependencies"
    - "Non-mutating sort for fallback pool (photos.slice().sort()) preserves iteration order"
    - "Card crops to public/images/cards/ (separate from thumbs/) — different dimensions, different consumers"
    - "require.main === module + module.exports pattern for pipeline scripts"

key-files:
  created:
    - scripts/assign-card-photos.js
    - public/images/cards/*.webp (9 files)
  modified:
    - public/data/annotations.json (added coverPhoto to each sector and KOM)

key-decisions:
  - "Store coverPhoto as filename only (not path) — components construct /images/cards/ prefix at render time"
  - "9 unique covers from 9 annotations — no deduplication occurred in this run"
  - "Down Jeep sector and Leaving Chatham KOM use nearest-photo fallback (0 photos in range); logged as build-time warnings"
  - "Card crops idempotent: skip if public/images/cards/{basename}.webp already exists"

patterns-established:
  - "Card crop dimensions: 600x338 (16:9) with sharp fit:cover position:attention at quality 80 effort 4"
  - "Fallback warning format: 'WARNING: no photos within range {startMi}-{endMi} ({name}), using nearest fallback at mi {X}'"

# Metrics
duration: 1min
completed: 2026-03-27
---

# Phase 12 Plan 01: Assign Card Photos Summary

**Build-time photo-to-annotation matching via Node.js + sharp: 9 x 600x338 WebP card crops generated, coverPhoto field written to all 6 sectors and 3 KOMs in annotations.json**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-27T22:17:32Z
- **Completed:** 2026-03-27T22:18:37Z
- **Tasks:** 1
- **Files modified:** 3 (script created, annotations.json enriched, 9 card crops generated)

## Accomplishments

- Created `scripts/assign-card-photos.js` with two-pass photo selection (exact range + nearest fallback)
- Generated 9 unique 600x338 WebP card crops in `public/images/cards/` (24KB-77KB range)
- Enriched `annotations.json` with `coverPhoto` on all 6 sectors and 3 KOMs; all existing fields (track, lat, lon, endLat, endLon) preserved
- Down Jeep (mi 83.55-84.15) and Leaving Chatham KOM (mi 37.6-37.98) correctly fell back to nearest photo with build-time warnings

## Task Commits

Each task was committed atomically:

1. **Task 1: Create assign-card-photos.js script** - `32310b7` (feat)

**Plan metadata:** (following this commit)

## Files Created/Modified

- `scripts/assign-card-photos.js` - Photo-to-sector/KOM matching and card crop generation pipeline script
- `public/data/annotations.json` - Added `coverPhoto` filename field to all sector and KOM entries
- `public/images/cards/*.webp` - 9 card crops at 600x338 px, WebP q80 effort 4 (generated, not tracked in git)

## Decisions Made

- Stored `coverPhoto` as filename only (e.g., `ocbHm30HWGIBDMhMARec4eQ86L5Bw_yNG1Sa1NtkfW0-2048x1536.jpg`) — Astro components will construct the full path (`/images/cards/{basename}.webp`) at render time, matching the pattern used for thumbs.
- Non-mutating sort for the fallback pool (`photos.slice().sort()`) — the plan's IMPORTANT note: original array order must be preserved across iterations.

## Deviations from Plan

None - plan executed exactly as written. Down Jeep and Leaving Chatham fallbacks were expected per the research doc.

## Issues Encountered

None. The two gap sectors (Down Jeep and Leaving Chatham) behaved exactly as the RESEARCH.md predicted — 0 photos in range, fallback triggered, warnings logged.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `coverPhoto` field is now present on all annotation entries — `GravelSectors.astro` and `KomSegments.astro` (Plan 12-02) can safely read `sector.coverPhoto` and `segment.coverPhoto`
- `public/images/cards/` directory exists with all 9 card crops — Plan 12-02 components can reference `/images/cards/{basename}.webp` paths
- `assign-card-photos.js` is idempotent — safe to call from `generate-data.js` pipeline (Plan 12-03 will wire it in)
- Concern still active: Down Jeep card photo is from mi 80.2, 3.6 miles before the sector. Visually acceptable for Phase 12; adding a specific photo requires a future data correction.

---
*Phase: 12-photo-pipeline-card-photos-image-quality*
*Completed: 2026-03-27*
