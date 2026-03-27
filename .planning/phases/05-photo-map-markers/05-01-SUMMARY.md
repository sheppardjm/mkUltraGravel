---
phase: 05-photo-map-markers
plan: 01
subsystem: ui
tags: [leaflet, leaflet.markercluster, map, photos, clustering, divIcon, popups]

# Dependency graph
requires:
  - phase: 01-data-pipeline
    provides: photos.json with lat/lon for all 33 route photos
  - phase: 03-map-core
    provides: RouteMap.astro with Leaflet map, divIcon pattern, :global() CSS pattern, dark-popup pattern

provides:
  - 33 photo markers on the map clustered with markerClusterGroup
  - Custom dark oklch() cluster count badges
  - Thumbnail popup on click linking to full-size image
  - public/images/ populated with 49 route photos for browser serving
  - Photo copy step in generate-data.js (images/ -> public/images/ on every pipeline run)

affects:
  - 06-photo-gallery (photos already served at /images/, popup UX established)
  - Any future map work referencing the markerCluster pattern

# Tech tracking
tech-stack:
  added:
    - leaflet.markercluster@1.5.3
    - "@types/leaflet.markercluster"
  patterns:
    - "markercluster side-effect import: await import('leaflet.markercluster') after L is set on window"
    - "addLayers() bulk add — preferred over addLayer() in loop for performance"
    - "markerClusterGroup accessed via (L as any).markerClusterGroup — types don't extend L namespace"
    - "Cluster icons use raw oklch() in inline styles — same as popup theming (decision 03-03)"

key-files:
  created:
    - public/images/ (49 JPGs copied from images/)
  modified:
    - package.json (leaflet.markercluster dependency added)
    - package-lock.json
    - src/styles/global.css (MarkerCluster.css + MarkerCluster.Default.css imports in @layer leaflet)
    - scripts/generate-data.js (photo copy step before pipeline loop)
    - src/components/RouteMap.astro (markercluster import, photos fetch, photo markers, cluster group, CSS rules)

key-decisions:
  - "markercluster accessed as (L as any).markerClusterGroup — side-effect import attaches to window.L, TypeScript types not merged onto L namespace"
  - "maxClusterRadius: 60 (tighter than default 80) — 33 markers over 100 miles, fewer false clusters"
  - "img width='180' fixed in popup HTML — prevents autopan/image-load race condition (Pitfall 3 from research)"
  - "addLayers() bulk add not addLayer() in loop — markercluster best practice for performance"
  - "photos.json added to existing Promise.all — maintains established parallel fetch pattern (03-02)"
  - "Photo copy step in generate-data.js — images/ is not public/, prebuild/dev script ensures public/images/ is always fresh"

patterns-established:
  - "markerClusterGroup pattern: side-effect import -> (L as any).markerClusterGroup() -> iconCreateFunction with L.divIcon inline oklch() styles"
  - ":global(.photo-marker) and :global(.photo-cluster) follow same pattern as .restock-marker"

# Metrics
duration: 4min
completed: 2026-03-26
---

# Phase 5 Plan 1: Photo Map Markers Summary

**leaflet.markercluster wired into RouteMap.astro with 33 photo markers, dark oklch() cluster badges, and 180px thumbnail popups linking to full-size images served from public/images/**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-27T01:45:43Z
- **Completed:** 2026-03-27T01:49:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Installed leaflet.markercluster@1.5.3 and wired both CSS files into the @layer leaflet cascade
- Added photo copy step to generate-data.js; 49 JPGs copied from images/ to public/images/ on every build
- Wired all 33 photo markers into a markerClusterGroup with custom dark cluster icons and thumbnail popups
- Build passes clean with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Install markercluster, add CSS imports, add photo copy step** - `5687ad1` (feat)
2. **Task 2: Wire photo markers with clustering and thumbnail popups into RouteMap.astro** - `982d13a` (feat)

## Files Created/Modified
- `public/images/` - 49 JPGs copied from images/ for browser serving at /images/*
- `package.json` - leaflet.markercluster@1.5.3 and @types/leaflet.markercluster added
- `src/styles/global.css` - MarkerCluster.css and MarkerCluster.Default.css imports in @layer leaflet
- `scripts/generate-data.js` - Photo copy step using fs.copyFileSync before pipeline loop
- `src/components/RouteMap.astro` - markercluster import, photos.json in Promise.all, photoIcon divIcon, photoCluster group, :global() CSS rules

## Decisions Made
- Used `(L as any).markerClusterGroup()` because the TypeScript side-effect import doesn't merge types onto the L namespace — accessing via any is the correct workaround
- `maxClusterRadius: 60` chosen over default 80 — tighter clustering appropriate for 33 markers spread over 100 miles of route
- `img width="180"` fixed in popup HTML string — prevents the autopan/image-load race where a loading image can trigger leaflet to recalculate map bounds mid-animation
- `addLayers()` bulk method used instead of `addLayer()` in a loop — markercluster best practice for performance
- Photo copy step placed before the pipeline scripts loop — ensures images are available regardless of which script runs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- The images/ directory contains a `tone` subdirectory in addition to 49 image files (50 total items, 49 images). The filter `/\.(jpg|jpeg|png|webp)$/i` correctly excludes the directory. 49 images copied as expected.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 33 photo markers are live on the map with clustering and thumbnail popups
- public/images/ is populated and served correctly
- The markercluster pattern is established for future map work
- Phase 5 verification checkpoint pending: dev server visual check of clustered markers and popup behavior

---
*Phase: 05-photo-map-markers*
*Completed: 2026-03-26*
