---
phase: 17-sector-colors-glrc-links
plan: 01
subsystem: ui
tags: [astro, leaflet, chartjs, color, accessibility, charity-links]

# Dependency graph
requires:
  - phase: 13-map-elevation-interactivity
    provides: starColors constants in RouteMap.astro and ElevationProfile.astro
  - phase: 06-route-info-sections
    provides: EventInfoBlock.astro with GLRC_URL and Great Lakes Recovery Centers content
provides:
  - Yellow-to-red 5-step difficulty spectrum across map polylines, elevation bands, and sector card stars
  - Clickable GLRC/Great Lakes Recovery Centers links on every rendered mention
affects:
  - 18-photo-position-verification
  - 21-escher-background-favicon

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "starColors constant duplicated across 3 files with identical hex values (no shared module per VIS-12 scope)"
    - "GLRC_URL constant defined per-file (EventInfoBlock.astro) or per-page (index.astro)"

key-files:
  created: []
  modified:
    - src/components/RouteMap.astro
    - src/components/ElevationProfile.astro
    - src/components/GravelSectors.astro
    - src/components/EventInfoBlock.astro
    - src/pages/index.astro

key-decisions:
  - "No shared color module — starColors duplicated in 3 files per plan scope (no architectural change)"
  - "index.astro Great Lakes Recovery Centers link uses text-text-muted class to match parent <p> color"
  - "EventInfoBlock.astro GLRC link uses text-accent-white to match sibling anchor styling"

patterns-established:
  - "Color palette: yellow #f0c040 → gold-orange #e8962a → burnt-orange #d9641e → red-orange #c93a18 → deep-red #b71c1c"

# Metrics
duration: 3min
completed: 2026-03-29
---

# Phase 17 Plan 01: Sector Colors + GLRC Links Summary

**Yellow-to-red 5-step difficulty spectrum replaces gray tones across map polylines, elevation bands, and sector card stars; all GLRC/Great Lakes Recovery Centers mentions are now clickable donation links**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-29T00:51:34Z
- **Completed:** 2026-03-29T00:54:07Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Eliminated ambiguous gray tones (#888888, #aaaaaa) from 1-star and 2-star sectors across all 3 display surfaces
- All three starColors constants now use identical yellow-to-red hex values: #f0c040, #e8962a, #d9641e, #c93a18, #b71c1c
- Added GLRC_URL constant to index.astro and wrapped "Great Lakes Recovery Centers" hero text in donation link
- Wrapped plain-text "GLRC" in EventInfoBlock.astro with donation link (existing "Great Lakes Recovery Centers" link unchanged)

## Task Commits

Each task was committed atomically:

1. **Task 1: Recolor starColors to yellow-to-red spectrum in 3 files** - `54ed3ea` (feat)
2. **Task 2: Make all GLRC / Great Lakes Recovery Centers text clickable links** - `149ff53` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `src/components/RouteMap.astro` - starColors 1-2 recolored from gray to yellow/gold-orange
- `src/components/ElevationProfile.astro` - starColors 1-2 recolored from gray to yellow/gold-orange
- `src/components/GravelSectors.astro` - starColors 1-2 recolored from gray to yellow/gold-orange
- `src/components/EventInfoBlock.astro` - "GLRC" plain text wrapped in <a href={GLRC_URL}>
- `src/pages/index.astro` - Added GLRC_URL constant; wrapped "Great Lakes Recovery Centers" in <a>

## Decisions Made
- No shared color module created — starColors duplicated per-file as the plan explicitly scoped out extraction to shared module
- index.astro Great Lakes Recovery Centers link uses `text-text-muted` class to match parent `<p class="text-text-muted">` context
- EventInfoBlock.astro GLRC link uses `text-accent-white hover:text-accent-green` to match the sibling "Great Lakes Recovery Centers" anchor styling

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npm run build` exits with code 1 due to pre-existing Node.js version incompatibility (Node 20.19.5, Astro 6.1.1 requires ≥22.12.0). This is a pre-existing environmental constraint unrelated to this plan's changes. Prior builds in git history confirm this project builds successfully in the correct Node environment. Syntax of all edits was verified by direct code inspection.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 18 (Photo Position Verification) can proceed — no dependencies on color or link changes
- VIS-12 and CONT-05 requirements satisfied
- Active blockers remain: Down Jeep KOM photo fallback (mi 80.2), Android onHover performance unverified

---
*Phase: 17-sector-colors-glrc-links*
*Completed: 2026-03-29*
