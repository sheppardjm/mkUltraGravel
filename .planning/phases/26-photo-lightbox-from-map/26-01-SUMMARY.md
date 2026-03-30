---
phase: 26-photo-lightbox-from-map
plan: 01
subsystem: ui
tags: [leaflet, photoswipe, lightbox, map, photo-markers, divIcon, clustering]

# Dependency graph
requires:
  - phase: 23-photo-gps-metadata
    provides: photos.json with filename, lat, lon, width, height, mi fields for all 55 photos
  - phase: 21-photoswipe-lightbox
    provides: photoswipe npm package already installed and photoswipe/style.css imported in global.css
  - phase: 25-map-reset
    provides: map:reset event handler in RouteMap.astro (needed to wire lightbox close)
provides:
  - Thumbnail 48x48px divIcon photo markers on map (MAP-11)
  - Per-marker click handler calling lightbox.loadAndOpen(index) (MAP-12)
  - Programmatic PhotoSwipe lightbox with dataSource from all 55 route photos
  - lightbox.pswp?.close() wired to map:reset event
affects:
  - Any future phase touching RouteMap.astro photo marker section
  - v4.0 UAT verification of MAP-11 and MAP-12

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Programmatic PhotoSwipe lightbox (no gallery HTML, no data-pswp-* attributes)
    - dataSource array built from photos.json at runtime inside initMap()
    - Per-marker dynamic import closure captures lightbox reference via closure
    - AVIF-safe thumbnail regex: /\.(jpg|jpeg|png|avif)$/i (one photo is .avif)

key-files:
  created: []
  modified:
    - src/components/RouteMap.astro

key-decisions:
  - "showHideAnimationType: 'fade' (not 'zoom') — no DOM anchor element to zoom from"
  - "dataSource built inside initMap() after photos fetch — lightbox initialized before marker creation"
  - "No photoswipe/style.css import in RouteMap.astro — already in global.css @layer components (avoids cascade conflict)"
  - "AVIF regex includes avif extension — Billie Helmer photo is .avif format"
  - "No .bindPopup() on photo markers — click goes directly to lightbox.loadAndOpen(index)"

patterns-established:
  - "Programmatic PhotoSwipe: dataSource array + pswpModule: () => import('photoswipe') + lightbox.loadAndOpen(index)"

# Metrics
duration: 2min
completed: 2026-03-30
---

# Phase 26 Plan 01: Photo Lightbox from Map Summary

**48x48px thumbnail divIcon photo markers replacing cyan dots, wired to programmatic PhotoSwipe lightbox via loadAndOpen(index) for all 55 route photos**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-30T01:07:33Z
- **Completed:** 2026-03-30T01:09:04Z
- **Tasks:** 1 of 2 (paused at checkpoint:human-verify)
- **Files modified:** 1

## Accomplishments
- Removed single shared photoIcon (10px cyan square) and bindPopup calls from photo markers
- Added PhotoSwipeLightbox dynamic import alongside Leaflet imports in initMap()
- Built dataSource array mapping all 55 route photos to PhotoSwipe item format (src, width, height, msrc, alt)
- Initialized programmatic PhotoSwipe lightbox with fade animation, 0.95 bg opacity
- Replaced photoMarkers creation with per-photo thumbnail divIcons (48x48px, cyan border)
- Wired each photo marker click to `lightbox.loadAndOpen(index)`
- Added `lightbox.pswp?.close()` as first action in map:reset handler

## Task Commits

1. **Task 1: Replace photo dot markers with thumbnail divIcons** - `cb89066` (feat)

**Plan metadata:** pending (plan paused at checkpoint)

## Files Created/Modified
- `src/components/RouteMap.astro` - Thumbnail photo markers + programmatic PhotoSwipe lightbox integration

## Decisions Made
- `showHideAnimationType: 'fade'` (not zoom) — no DOM anchor to zoom from (lightbox opens programmatically)
- No `photoswipe/style.css` import in RouteMap.astro — already imported in global.css line 13, double-import causes cascade conflicts
- AVIF-safe regex `/\.(jpg|jpeg|png|avif)$/i` used in both dataSource msrc and marker img src (one photo is .avif)
- dataSource array built immediately after photos fetch, before marker creation — ensures lightbox is ready before any click can occur
- No `.bindPopup()` on photo markers — click goes directly to lightbox, no intermediate popup

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Task 1 committed (cb89066) — awaiting human verification (Task 2 checkpoint)
- After approval: plan is complete, Phase 26 complete, v4.0 MAP-11 and MAP-12 requirements satisfied
- No blockers for verification other than needing dev server running

---
*Phase: 26-photo-lightbox-from-map*
*Completed: 2026-03-30 (pending checkpoint approval)*
