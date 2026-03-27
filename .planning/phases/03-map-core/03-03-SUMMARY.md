---
phase: 03-map-core
plan: 03
subsystem: ui
tags: [leaflet, css, dark-theme, popups, mobile, gesture-handling]

# Dependency graph
requires:
  - phase: 03-map-core/03-02
    provides: interactive map with sector, KOM, and restock overlays using bindPopup
  - phase: 03-map-core/03-01
    provides: Leaflet CSS layer order in global.css, dynamic import pattern

provides:
  - Dark-themed Leaflet popup CSS (dark-popup class) in @layer components
  - Dark-styled zoom controls and attribution
  - Gesture-handling overlay text styled with mono font
  - All bindPopup() calls wired with className: 'dark-popup'
  - Mobile scroll-trap prevention verified on real device (confirmed)

affects: [04-route-profile, any future map work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Leaflet popup theming via className option + scoped CSS class in @layer components"
    - "Raw oklch values in Leaflet overrides (not CSS vars) due to popup DOM being outside component scope"
    - "!important on control overrides because Leaflet inlines some styles"

key-files:
  created: []
  modified:
    - src/styles/global.css
    - src/components/RouteMap.astro

key-decisions:
  - "Use raw oklch() values in dark-popup CSS rather than var() references — Leaflet injects popups outside Astro component scope where @theme custom properties may not resolve"
  - "!important on .leaflet-control-* rules — Leaflet inlines some control styles, requiring !important for reliable override"

patterns-established:
  - "Leaflet popup theming: pass { className: 'dark-popup' } as second arg to bindPopup(), scope CSS as .leaflet-popup.dark-popup .leaflet-popup-content-wrapper in @layer components"

# Metrics
duration: ~2min automation + real-device checkpoint
completed: 2026-03-26
---

# Phase 03 Plan 03: Dark Popup Styling and Mobile Verification Summary

**Dark-themed Leaflet popups via .dark-popup CSS class in @layer components, zoom/attribution controls styled to match brutalist dark palette, mobile scroll-trap prevention verified on real device.**

## Performance

- **Duration:** ~2 min automation + real-device checkpoint approval
- **Started:** 2026-03-26T20:28:03Z
- **Completed:** 2026-03-26T20:29:37Z (checkpoint approved 2026-03-26)
- **Tasks:** 2/2 complete
- **Files modified:** 2

## Accomplishments
- Added dark-popup CSS class with near-black background, light monospace text, thin border — matches design tokens exactly
- Styled zoom controls and attribution to dark palette with !important overrides for Leaflet inline styles
- Styled gesture-handling overlay text with mono font
- Wired `{ className: 'dark-popup' }` into all three bindPopup() call sites (6 sector overlays, 3 KOM overlays, 4 restock markers)
- Production build verified clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Add dark-theme popup and control CSS to global.css and wire into RouteMap** - `c8bc3e3` (feat)
2. **Task 2: Verify map on mobile device** - checkpoint:human-verify (approved — scroll-trap, dark popups, two-finger pan all confirmed)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/styles/global.css` - Added Leaflet dark theme overrides in @layer components (popups, zoom, attribution, gesture overlay)
- `src/components/RouteMap.astro` - Added `{ className: 'dark-popup' }` to all three bindPopup() call sets

## Decisions Made
- Use raw `oklch()` values in Leaflet popup CSS rather than `var(--color-*)` references. Leaflet injects popup DOM at the document root, outside the Astro component where @theme custom properties are defined; raw values are safe.
- Use `!important` on `.leaflet-control-attribution` and `.leaflet-control-zoom` rules. Leaflet inlines some control styles, making layer-cascade ordering insufficient.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — build passed clean on first attempt. Mobile checkpoint approved without issues: scroll-trap prevention works, dark popups render correctly on real device, two-finger map interaction works as expected.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 3 (map-core) is fully complete — all 3 plans done
- Phase 4 (route profile / elevation) can proceed — interactive map with all overlays, dark styling, and gesture handling verified
- No blockers identified

---
*Phase: 03-map-core*
*Completed: 2026-03-26*
