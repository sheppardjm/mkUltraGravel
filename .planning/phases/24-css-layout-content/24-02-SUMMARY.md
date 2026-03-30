---
phase: 24-css-layout-content
plan: 02
subsystem: ui
tags: [svg, animation, css, astro, penrose, grinduro, prefers-reduced-motion]

# Dependency graph
requires:
  - phase: 24-01
    provides: Card height equalization and Leaflet touch target fixes — establishes GravelSectors/KomSegments as stable components this phase adds context above
provides:
  - Inline Penrose triangle SVG above hero h1 with 20s CSS rotation animation
  - penrose-spin keyframes in global.css gated on prefers-reduced-motion: no-preference
  - GrinduroExplainer.astro component with timed-sector format description
  - GrinduroExplainer placed between Gravel Sectors h2 and the 3-column grid
affects: [25, 26, any future hero section edits, any future sector section edits]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Penrose SVG animation: transform-box: fill-box + transform-origin: center ensures rotation around shape's visual center not viewport bounding box"
    - "prefers-reduced-motion gate: @media (prefers-reduced-motion: no-preference) pattern matches escher-drift — animation ONLY plays when motion is allowed"
    - "GrinduroExplainer full-width placement: component is sibling of grid div, not child, to span full section width"

key-files:
  created:
    - src/components/GrinduroExplainer.astro
  modified:
    - src/pages/index.astro
    - src/styles/global.css

key-decisions:
  - "20s rotation speed — subtle enough to not distract, fast enough to be noticeable (escher-drift uses 50s)"
  - "transform-box: fill-box required for correct SVG rotation center; without it transform-origin: center uses viewport origin"
  - "GrinduroExplainer placed as sibling of grid (not inside grid) to achieve full section width span"

patterns-established:
  - "SVG inline animation: always pair transform-box: fill-box with transform-origin: center for shape-relative rotation"
  - "Grinduro format explainer: classified-border wrapper, mb-8 bottom margin before grid, !mt-0 on first label paragraph"

# Metrics
duration: 2min
completed: 2026-03-30
---

# Phase 24 Plan 02: Penrose Hero Animation + Grinduro Format Explainer Summary

**Inline Penrose triangle SVG with 20s CSS spin animation in hero, and GrinduroExplainer component above the sector cards describing timed sectors, KOM/QOM climbs, and untimed connecting route**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-30T00:34:43Z
- **Completed:** 2026-03-30T00:36:17Z
- **Tasks:** 2
- **Files modified:** 3 (2 modified, 1 created)

## Accomplishments
- Penrose triangle SVG (same 3-path geometry and green palette as favicon.svg) added above h1 in hero section
- penrose-spin animation (20s linear infinite) added to global.css, gated on prefers-reduced-motion: no-preference
- GrinduroExplainer.astro created with field-manual tone describing timed sectors, KOM/QOM climbs, and untimed connectors
- Explainer placed above the 3-column sector/KOM grid at full section width using classified-border styling

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Penrose triangle SVG with rotation animation to hero** - `0ffedfb` (feat)
2. **Task 2: Create Grinduro format explainer component and place above sector cards** - `c13fc9e` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/pages/index.astro` - Penrose SVG inserted after stamp/before h1; GrinduroExplainer import and placement in #sectors
- `src/styles/global.css` - penrose-spin keyframes and animation rule with prefers-reduced-motion gate
- `src/components/GrinduroExplainer.astro` - New component with Grinduro format description (classified-border wrapper)

## Decisions Made
- 20s rotation speed chosen as balance between subtle and noticeable (escher-drift reference at 50s)
- `transform-box: fill-box` added alongside `transform-origin: center` to ensure shape-relative rotation pivot
- `<GrinduroExplainer />` placed as sibling of grid div (not inside grid) for full-width span

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 24 is now complete (both plans executed)
- Hero visual identity strengthened with Penrose triangle tying favicon, escher-overlay, and hero branding together
- Sector section now leads with format explainer, reducing confusion for first-time visitors
- Ready for Phase 25

---
*Phase: 24-css-layout-content*
*Completed: 2026-03-30*
