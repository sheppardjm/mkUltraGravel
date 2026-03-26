---
phase: 01-data-pipeline
plan: 02
subsystem: data
tags: [photos, manifest, mile-markers, visual-inspection, curation]

# Dependency graph
requires:
  - phase: 01-data-pipeline/01-01
    provides: route-data.json with mile markers 0-79.6 for validating photo placement
provides:
  - 33-photo curated route manifest with estimated mile markers (scripts/photo-manifest.js)
  - Allowlist of route-only photos, excluding non-route content and duplicates
affects: [01-data-pipeline/01-03, 01-data-pipeline/01-04, map-phase, photo-display-phase]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hardcoded manifest pattern: photo pipeline uses explicit allowlist rather than directory scan to ensure curation control"
    - "Visual landmark anchoring: mile markers estimated from terrain cues and named route landmarks"

key-files:
  created:
    - scripts/photo-manifest.js
  modified: []

key-decisions:
  - "33 photos selected from ~47 candidates via visual inspection; 2 non-route images excluded (art print, off-route broken bike)"
  - "Near-duplicate shots resolved by keeping best of each cluster rather than all variants"
  - "Mile markers estimated from terrain character (open farmland vs dense forest) anchored to known landmarks: Chatham Co-Op (~mi 38), Forest Service Rd (~mi 50), C4 sector (~mi 58), Dollar General (~mi 76)"
  - "User approved manifest without changes at checkpoint"

patterns-established:
  - "Photo pipeline: manifest-first approach — explicit allowlist in photo-manifest.js controls inclusion before any EXIF/GPS processing"

# Metrics
duration: ~5min
completed: 2026-03-26
---

# Phase 1 Plan 02: Photo Manifest Curation Summary

**33-photo route manifest with estimated mile markers (mi 4-76) from visual inspection of ~47 candidates, anchored to named route landmarks**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-26T17:52:00Z
- **Completed:** 2026-03-26T17:57:00Z
- **Tasks:** 2 (1 auto + 1 checkpoint:human-verify)
- **Files modified:** 1

## Accomplishments

- Visually inspected all ~47 candidate JPGs in images/ (excluding images/tone/ and duplicate files)
- Selected exactly 33 route photos; excluded 2 non-route images (art print, off-route broken bike) and near-duplicates
- Assigned estimated mile markers mi 4.0 through mi 76.0, anchored to terrain cues and named route landmarks (Chatham Co-Op, Forest Service Rd, C4 sector, Dollar General)
- User approved manifest at checkpoint with no changes needed

## Task Commits

Each task was committed atomically:

1. **Task 1: Inspect candidate images and build photo manifest** - `1a7222f` (feat)

**Plan metadata:** (docs: complete photo manifest curation plan)

## Files Created/Modified

- `scripts/photo-manifest.js` - Hardcoded array of 33 `{filename, mi}` objects; exported as `photoManifest`; used by match-photos.js (Plan 01-04)

## Decisions Made

- Selected 33 photos from ~47 candidates; non-route images (art print, broken bike off-route) excluded
- Near-duplicate shots resolved by keeping the sharpest/best-lit frame from each cluster
- Mile markers estimated using terrain character (open farmland at start, progressive forest density toward north, boreal at C4 sector) anchored to named landmarks from the research notes
- User reviewed and approved at checkpoint without requesting changes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `scripts/photo-manifest.js` is ready for Plan 01-03 (EXIF extractor) and Plan 01-04 (photo matcher/photos.json generator)
- All 33 filenames verified to resolve to actual files in images/; no broken references
- Mile markers are in ascending order, 0 duplicates, all within route range 0-79.6
- No blockers for the next plan

---
*Phase: 01-data-pipeline*
*Completed: 2026-03-26*
