---
phase: 12-photo-pipeline-card-photos-image-quality
plan: 03
subsystem: ui
tags: [sharp, webp, thumbnails, image-pipeline, prebuild]

# Dependency graph
requires:
  - phase: 12-01
    provides: assign-card-photos.js script and card crop generation
provides:
  - 400px/q80 WebP gallery thumbnails replacing stale 200px/q75 set
  - Stale thumbnail clearing on every pipeline run
  - Fully automated 7-step photo pipeline wired into npm run prebuild
affects:
  - photo-gallery-lightbox (thumbnail quality)
  - future-phases (pipeline complete, no manual steps required)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Always-regenerate thumbnails pattern: clear stale before generating, avoids dimension mismatch across pipeline runs
    - Sequential pipeline orchestration: execSync steps in generate-data.js with early-exit on failure

key-files:
  created: []
  modified:
    - scripts/generate-thumbnails.js
    - scripts/generate-data.js

key-decisions:
  - "400px thumbnails always regenerated on each pipeline run (stale clearing) — 2s for 53 photos is acceptable overhead"
  - "assign-card-photos.js runs between generate-thumbnails and convert-hero to ensure photos.json and public/images/ both exist"

patterns-established:
  - "Thumbnail stale-clearing: clear all .webp from thumbs/ before regenerating, ensures dimension consistency"
  - "Pipeline step 5 ordering: match-photos -> thumbnails -> assign-card-photos -> hero conversion"

# Metrics
duration: 4min
completed: 2026-03-27
---

# Phase 12 Plan 03: Pipeline Upgrade Summary

**Gallery thumbnails upgraded to 400px/q80 WebP with stale-cache clearing, and assign-card-photos.js wired as automated step 5 in the full 7-step prebuild pipeline**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-27T22:21:49Z
- **Completed:** 2026-03-27T22:23:39Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Upgraded gallery thumbnails from 200px/q75 to 400px/q80 — retina-quality previews for high-DPI screens
- Added stale thumbnail clearing at pipeline start to prevent dimension mismatch on upgrades
- Wired assign-card-photos.js into generate-data.js as step 5, eliminating all manual build steps
- Full 7-step pipeline now runs automatically via `npm run prebuild`: parse-gpx -> resolve-annotations -> match-photos -> generate-thumbnails -> assign-card-photos -> convert-hero -> convert-tone-images

## Task Commits

Each task was committed atomically:

1. **Task 1: Upgrade generate-thumbnails.js to 400px/q80 with stale clearing** - `f886e61` (feat)
2. **Task 2: Wire assign-card-photos.js into generate-data.js pipeline** - `9e4cf32` (feat)

**Plan metadata:** (docs: complete plan — pending)

## Files Created/Modified

- `scripts/generate-thumbnails.js` — Resize 200->400px, quality 75->80, clear stale thumbs before loop, remove idempotency skip
- `scripts/generate-data.js` — Add step 5 (assign-card-photos.js), update header comment with all 7 steps

## Decisions Made

- Always-regenerate thumbnails (clear stale, then regenerate all) rather than idempotency skip — 53 photos take ~2s to regenerate, avoids any stale dimension issues on future pipeline parameter changes
- assign-card-photos.js placed after generate-thumbnails (not before) to ensure public/images/ source files are available for card crop generation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npm run build` fails locally due to Node.js v20 vs Astro requirement for v22+ — pre-existing environment constraint unrelated to this plan. The prebuild pipeline (generate-data.js) completes successfully with all 7 steps. Astro build works on the deployment target (Netlify).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 12 complete: assign-card-photos.js (12-01), CardPhotoSection component (12-02), pipeline automation (12-03)
- All 9 card crops generated at 600x338 WebP
- 53 gallery thumbnails at 400px/q80 WebP
- annotations.json enriched with coverPhoto for all 6 sectors and 3 KOMs
- Zero manual steps required for deployment — full photo pipeline runs on every `npm run prebuild`
- Ready for Phase 13 (map-elevation interactivity)

---
*Phase: 12-photo-pipeline-card-photos-image-quality*
*Completed: 2026-03-27*
