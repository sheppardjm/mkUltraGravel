---
phase: 50-css-polish
plan: 01
subsystem: ui
tags: [css, scrollbar, tailwind, astro, dark-theme, aspect-ratio]

# Dependency graph
requires:
  - phase: 24-css-layout-content
    provides: global.css @layer structure and CSS custom properties (design tokens)
  - phase: 44-gravel-sectors-cards
    provides: GravelSectors.astro component with card image layout
provides:
  - Dark-themed scrollbars via CSS Scrollbars Level 1 + WebKit fallback in global.css
  - Proportional 16:9 gravel card images via aspect-video in GravelSectors.astro
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "scrollbar-color/scrollbar-width on html element for CSS-native inheritance across all scrollable containers"
    - "@supports selector(::-webkit-scrollbar) guard prevents conflicts between standard and WebKit scrollbar APIs"
    - "aspect-video Tailwind class for proportional 16:9 card images (matches KomSegments.astro pattern)"

key-files:
  created: []
  modified:
    - src/styles/global.css
    - src/components/GravelSectors.astro

key-decisions:
  - "Placed scrollbar-color/scrollbar-width on existing html selector in @layer base rather than adding :root block — consistent with file pattern"
  - "WebKit fallback placed outside @layer so pseudo-element selectors are not layer-scoped"
  - "Used @supports selector(::-webkit-scrollbar) guard (MDN-recommended) to prevent conflicts with standard scrollbar properties"
  - "Replaced h-[180px] with aspect-video to match established KomSegments.astro pattern — no max-height constraint per requirements"

patterns-established:
  - "Card images: use aspect-video w-full object-cover for proportional 16:9 sizing on all card components"
  - "Scrollbar theme: global.css html element owns scrollbar styling; all containers inherit via CSS"

# Metrics
duration: 2min
completed: 2026-04-06
---

# Phase 50 Plan 01: CSS Polish Summary

**Dark accent-green scrollbars via CSS Scrollbars Level 1 + WebKit fallback, and proportional 16:9 gravel sector card images replacing fixed 180px height**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-06T16:12:46Z
- **Completed:** 2026-04-06T16:13:58Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Global scrollbar theme: accent-green thumb on dark surface track, inherited by all scrollable containers (main scroll, gallery, any future scrollable areas)
- WebKit fallback with `@supports selector(::-webkit-scrollbar)` guard covering Chrome <121 and macOS Safari <18
- Gravel sector card images now render proportionally at 16:9 on wide screens instead of being clipped at 180px
- Build passes with zero errors and zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add global scrollbar theme to global.css** - `80f7b50` (feat)
2. **Task 2: Fix gravel card image aspect ratio** - `012c7d3` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `src/styles/global.css` - Added `scrollbar-color`/`scrollbar-width` to `html` element in `@layer base`, plus WebKit fallback block outside layers
- `src/components/GravelSectors.astro` - Replaced `h-[180px]` with `aspect-video` on card image `class` attribute

## Decisions Made

- Used the existing `html` selector in `@layer base` rather than a new `:root` block — consistent with the file's established pattern where base element styles live on element selectors
- WebKit fallback is placed outside `@layer` (between `@layer components` close and `@keyframes escher-drift`) so pseudo-element selectors are not layer-scoped and apply globally
- `@supports selector(::-webkit-scrollbar)` is the MDN-recommended guard to prevent conflicts between standard and legacy WebKit scrollbar APIs
- No `max-height` constraint added to card images per plan requirements — proportional sizing is the goal

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Node.js v20 (default PATH) is below Astro's minimum requirement of v22. Used `/usr/local/opt/node@25/bin/node` (v25.8.2) to run `npx astro build`. Build succeeded cleanly on both task verifications.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- v10.1 Polish milestone complete — all two polish items shipped
- Site is production-ready for the June 7, 2026 MK Ultra Gravel event
- No blockers or concerns

---
*Phase: 50-css-polish*
*Completed: 2026-04-06*
