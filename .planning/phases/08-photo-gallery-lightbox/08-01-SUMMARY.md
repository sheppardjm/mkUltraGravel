---
phase: 08-photo-gallery-lightbox
plan: 01
subsystem: data pipeline
tags: [sharp, webp, thumbnails, photos, image-optimization, data-pipeline]

# Dependency graph
requires:
  - phase: 05-photo-map-markers
    provides: photo manifest (33 curated images), match-photos.js producing photos.json
  - phase: 01-data-pipeline
    provides: generate-data.js coordinator, prebuild pipeline pattern
provides:
  - scripts/generate-thumbnails.js — WebP thumbnail generator using sharp
  - public/images/thumbs/ — 33 600px-wide WebP thumbnails (70-175KB each)
  - public/data/photos.json enriched with width and height per entry
  - sharp as explicit devDependency in package.json
affects: [08-02-photo-gallery-component, 09-mobile-polish]

# Tech tracking
tech-stack:
  added: [sharp ^0.34.5]
  patterns:
    - Post-step thumbnail generation in data pipeline coordinator (after match-photos.js)
    - Idempotent thumbnail generation via fs.existsSync check before sharp processing
    - CommonJS module with if (require.main === module) pattern for standalone + imported use

key-files:
  created:
    - scripts/generate-thumbnails.js
    - public/images/thumbs/ (directory with 33 .webp files)
  modified:
    - package.json (added sharp devDependency)
    - package-lock.json
    - scripts/generate-data.js (added thumbnail post-step)
    - public/data/photos.json (added width/height per entry)

key-decisions:
  - "sharp installed via volta run npm to ensure darwin-arm64 native binary (plain node resolves to darwin-x64 on this machine)"
  - "Thumbnail step runs as separate post-step after scripts[] loop, not added to scripts array — different dependency chain (needs photos.json + public/images/)"
  - "Original dimensions stored in photos.json (not thumbnail dims) — PhotoSwipe needs full-size width/height for correct lightbox layout"
  - "Idempotent: thumbnails skipped on re-run, but width/height always refreshed from sharp metadata (match-photos re-writes photos.json on each run)"

patterns-established:
  - "Thumbnail filename: path.parse(filename).name + '.webp' — same basename, .webp extension"
  - "sharp metadata() call reads original dims before deciding to skip thumb generation"
  - "generate-thumbnails.js exports generateThumbnails() for programmatic use and supports standalone invocation via require.main check"

# Metrics
duration: 1min
completed: 2026-03-27
---

# Phase 8 Plan 01: WebP Thumbnail Pipeline Summary

**sharp-powered thumbnail pipeline generating 600px WebP files (81% smaller than 380KB JPEGs) with dimensions written to photos.json for PhotoSwipe lightbox**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-27T04:03:55Z
- **Completed:** 2026-03-27T04:05:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Installed sharp ^0.34.5 as explicit devDependency with darwin-arm64 native binary
- Created generate-thumbnails.js: processes all 33 route photos, writes 600px WebP thumbnails, enriches photos.json with original width/height
- Wired thumbnail generation into generate-data.js as a post-step after match-photos.js
- Pipeline idempotent: second run skips all 33 existing thumbs in ~0.1s

## Task Commits

Each task was committed atomically:

1. **Task 1: Install sharp and create generate-thumbnails.js** - `a214a93` (feat)
2. **Task 2: Wire thumbnail generation into generate-data.js coordinator** - `189b8e9` (feat)

## Files Created/Modified
- `scripts/generate-thumbnails.js` - WebP thumbnail generator using sharp; reads photos.json, writes 600px WebP to public/images/thumbs/, enriches photos.json with width/height
- `scripts/generate-data.js` - Added thumbnail post-step after match-photos.js completes
- `package.json` - Added sharp ^0.34.5 as devDependency
- `public/data/photos.json` - Enriched: all 33 entries now have width and height fields
- `public/images/thumbs/` - New directory; 33 WebP files ranging from ~70KB to ~175KB

## Decisions Made
- **sharp native binary via Volta:** Plain `node` on this machine resolves to Node 20 (darwin-x64), but `volta run node` correctly uses Node 22 (darwin-arm64). sharp binaries installed are for arm64. All npm scripts correctly use Volta-managed node so there is no issue in practice.
- **Thumbnail step separate from scripts[] array:** The thumbnail generator depends on both photos.json (from match-photos.js) AND public/images/ (from image copy step). Adding it to the loop would allow it to run before its dependencies exist. A dedicated post-step makes this ordering explicit.
- **Original dimensions in photos.json:** PhotoSwipe requires the full-size image dimensions, not thumbnail dimensions. Storing originals (e.g., 1200x1600) rather than thumbnail (e.g., 600x800) prevents incorrect lightbox layout.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- sharp binary not loadable via raw `node` (Node 20, darwin-x64 runtime) but works correctly via `volta run node` (Node 22, darwin-arm64). The project's npm scripts all invoke node through Volta, so this is not a runtime issue — only observed when calling `node` directly outside Volta context.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 02 (photo gallery component) can consume:
  - `public/images/thumbs/*.webp` for grid thumbnail rendering
  - `public/data/photos.json` (filename, lat, lon, mi, width, height per entry)
- PhotoSwipe lightbox layout will work correctly with the stored original dimensions
- No blockers for Plan 02

---
*Phase: 08-photo-gallery-lightbox*
*Completed: 2026-03-27*
