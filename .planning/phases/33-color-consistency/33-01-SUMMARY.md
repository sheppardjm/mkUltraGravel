---
phase: 33-color-consistency
plan: 01
subsystem: ui
tags: [typescript, astro, chart.js, leaflet, color-palette, refactor]

# Dependency graph
requires:
  - phase: 17-sector-colors-glrc-links
    provides: original starColors palette definitions in component files
  - phase: 13-map-elevation-interactivity
    provides: cross-component event system (map/elevation/cards interactivity)
provides:
  - src/lib/starColors.ts — single source of truth for star-rating color palette
  - Eliminated color drift risk between map, elevation chart, and sector card components
affects: [34-sector-labels, 35-dev-tools, any future component consuming star-rating colors]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared color constants as typed ES module (Record<number, string>) usable in both SSR and browser"
    - "starColors imported in Astro frontmatter (SSR) and in <script> tags (browser) from same module"

key-files:
  created:
    - src/lib/starColors.ts
  modified:
    - src/components/GravelSectors.astro
    - src/components/RouteMap.astro
    - src/components/ElevationProfile.astro

key-decisions:
  - "Placed starColors.ts in src/lib/ following existing scoring.js precedent — same pattern for shared ES modules"
  - "Module-scoped import in ElevationProfile replaces function-scoped const inside initElevation() — valid since starColors is a pure constant"

patterns-established:
  - "src/lib/ is the canonical location for shared constants/utilities used across both SSR and browser contexts"
  - "Color palettes defined as Record<number, string> typed ES modules, not inline object literals in components"

# Metrics
duration: 2min
completed: 2026-03-30
---

# Phase 33 Plan 01: Color Consistency Summary

**Extracted Paris-Roubaix star-rating palette into `src/lib/starColors.ts`, replacing three independent inline definitions in GravelSectors, RouteMap, and ElevationProfile with a single shared import**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-30T19:08:17Z
- **Completed:** 2026-03-30T19:09:31Z
- **Tasks:** 2
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- Created `src/lib/starColors.ts` — single authoritative definition of the 5-color Paris-Roubaix palette
- Removed 3 duplicate inline `starColors` object literals (25 lines of duplication eliminated)
- All three consumers now import from shared module — color drift between map polylines, elevation bands, and sector cards is structurally impossible
- Astro build passes cleanly — module works in SSR (GravelSectors frontmatter) and browser (RouteMap/ElevationProfile script tags)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create starColors shared module** - `37e3ef8` (feat)
2. **Task 2: Replace inline starColors in all three consumers** - `b59ddae` (refactor)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/starColors.ts` - Single source of truth: 5-color Record<number, string> palette with comments
- `src/components/GravelSectors.astro` - Removed inline starColors const, added frontmatter import
- `src/components/RouteMap.astro` - Removed inline starColors const, added script-level import
- `src/components/ElevationProfile.astro` - Removed inline starColors const inside initElevation(), added module-level import

## Decisions Made
- Followed `src/lib/scoring.js` precedent — placed shared module in `src/lib/` as a plain named-export ES module
- ElevationProfile: moved starColors from function-scope (inside `initElevation()`) to module-scope (top of `<script>`) — correct since it's a pure constant with no side effects

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 33 color consistency complete — `starColors` is now a single import away for any future component
- Phase 34 (sector labels on elevation chart) can import `starColors` directly from `../lib/starColors` without duplicating the palette
- No blockers

---
*Phase: 33-color-consistency*
*Completed: 2026-03-30*
