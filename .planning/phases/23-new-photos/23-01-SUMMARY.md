---
phase: 23-new-photos
plan: 01
subsystem: ui
tags: [photos, pipeline, avif, webp, thumbnails, annotations, cover-photo]

# Dependency graph
requires:
  - phase: 22-gpx-route-replacement
    provides: Updated route GPX with 100mi geometry; all annotations resolved against new route
provides:
  - 55-photo photos.json with lat/lng positions for Down Jeep and Billie Helmer photos
  - AVIF pipeline support (copy + thumbnail + card crop generation)
  - Down Jeep sector cover photo fixed (68686675_*.jpg, no longer fallback)
  - Billie Helmer KOM cover photo added (photo-1675213442182-*.avif)
affects: [24-css-layout-content, photo-gallery, gravel-sectors, kom-segments]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AVIF extension included in all image pipeline regex filters (copy, thumbnail, card)"
    - "Photo manifest entry mi value must fall within annotation range for Pass 1 card assignment"

key-files:
  created:
    - images/68686675_2890293017652424_6952024628709556224_n.jpg
    - images/photo-1675213442182-24e1c1671387.avif
  modified:
    - scripts/photo-manifest.js
    - scripts/generate-data.js
    - src/components/PhotoGallery.astro
    - src/components/GravelSectors.astro
    - src/components/KomSegments.astro
    - public/data/photos.json
    - public/data/annotations.json

key-decisions:
  - "Down Jeep photo placed at mi 83.8 (midpoint of 83.55-84.15 sector) to guarantee Pass 1 selection"
  - "Billie Helmer photo placed at mi 22.1 (within 21.9-22.59 KOM range) to guarantee Pass 1 selection over fallback at mi 21.1"
  - "public/images/ is gitignored (generated); source images tracked in images/ directory"

patterns-established:
  - "AVIF pattern: add avif to all three regex sites — copy filter in generate-data.js, and .replace() in PhotoGallery, GravelSectors, KomSegments"

# Metrics
duration: 2min
completed: 2026-03-29
---

# Phase 23 Plan 01: New Photos Summary

**AVIF pipeline support added with Down Jeep (mi 83.8) and Billie Helmer (mi 22.1) photos integrated as card cover photos, resolving the active Down Jeep fallback blocker**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-29T21:03:40Z
- **Completed:** 2026-03-29T21:04:28Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Added AVIF extension support across the entire image pipeline (copy, thumbnail generation, card crop, component rendering)
- Down Jeep sector (mi 83.55-84.15) now uses 68686675_*.jpg as cover photo — active blocker resolved
- Billie Helmer KOM (mi 21.9-22.59) now uses photo-1675213442182-*.avif as cover photo instead of fallback
- Gallery expands from 53 to 55 photos with correct lat/lng positions for both new entries
- Site builds cleanly with all 55 thumbnails and 9 cover photos generated

## Task Commits

Each task was committed atomically:

1. **Task 1: Add AVIF support and new manifest entries** - `7b5284e` (feat)
2. **Task 2: Fix AVIF extension handling in component templates and run pipeline** - `b529d10` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `scripts/photo-manifest.js` - Updated from 53 to 55 entries; added Down Jeep at mi 83.8 and Billie Helmer at mi 22.1
- `scripts/generate-data.js` - Extended image copy filter to include .avif extension
- `src/components/PhotoGallery.astro` - Extended .replace() regex to convert .avif -> .webp for thumbnails
- `src/components/GravelSectors.astro` - Extended .replace() regex to convert .avif -> .webp for card images
- `src/components/KomSegments.astro` - Extended .replace() regex to convert .avif -> .webp for card images
- `public/data/photos.json` - 55 photo entries with lat/lng, width, height
- `public/data/annotations.json` - 9 coverPhoto assignments (sectors + KOMs), both new photos included
- `images/68686675_2890293017652424_6952024628709556224_n.jpg` - Down Jeep source photo (tracked)
- `images/photo-1675213442182-24e1c1671387.avif` - Billie Helmer B&W source photo (tracked)

## Decisions Made
- Down Jeep placed at mi 83.8: midpoint of the 83.55-84.15 sector, guarantees assign-card-photos.js Pass 1 selects it (not fallback)
- Billie Helmer placed at mi 22.1: within the 21.9-22.59 KOM range, guarantees Pass 1 over the existing mi 21.1 photo
- Source images tracked in `images/` (not `public/images/`, which is gitignored as a generated directory)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 23 complete; all photo pipeline outputs ready
- Phase 24 (CSS + Layout + Content) is parallel-safe per STATE.md note
- Blocker "[Active] Down Jeep KOM uses nearest fallback photo" is now resolved

---
*Phase: 23-new-photos*
*Completed: 2026-03-29*
