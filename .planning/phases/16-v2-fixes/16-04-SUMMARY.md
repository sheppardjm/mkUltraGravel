---
phase: 16-v2-fixes
plan: "04"
subsystem: ui
tags: [astro, tailwind, css, card-hover, box-shadow, overflow-hidden]

# Dependency graph
requires:
  - phase: 16-v2-fixes/16-01
    provides: card-hover CSS rules using direct box-shadow on .card-hover class
provides:
  - Sector cards with card-hover on outer div, overflow-hidden on inner div — box-shadow visible on hover
  - KOM cards with identical two-div pattern — box-shadow visible on hover
  - Route stats subtitle at text-xl/text-2xl in accent green for clear visual hierarchy
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-div card pattern: outer div carries card-hover (no overflow-hidden), inner div carries overflow-hidden to clip images"

key-files:
  created: []
  modified:
    - src/components/GravelSectors.astro
    - src/components/KomSegments.astro
    - src/pages/index.astro

key-decisions:
  - "overflow-hidden on same element as card-hover clips box-shadow (CSS Overflow Module Level 3 ink overflow clipping) — fix is structural not CSS"
  - "text-accent-green for route stats subtitle: accent green stands out against dark background vs text-text-muted gray"

patterns-established:
  - "Two-div card pattern: outer div carries shadow/hover, inner div carries overflow clipping — prevents box-shadow from being clipped"

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 16 Plan 04: Card Hover Shadow + Route Stats Subtitle Summary

**Two-div card restructure unblocks green box-shadow on hover; route stats subtitle upgraded to accent-green text-xl/2xl for visual prominence**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-28T20:15:57Z
- **Completed:** 2026-03-28T20:17:28Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Separated `overflow-hidden` from `card-hover` across all 9 sector/KOM cards — box-shadow is no longer clipped by overflow containment
- Applied two-div pattern: outer div holds `classified-border bg-bg-surface card-hover`, inner div holds `overflow-hidden` to keep cover photo image clipping intact
- Route stats subtitle changed from `text-text-muted text-lg` to `text-accent-green text-xl md:text-2xl` — more prominent and on-brand

## Task Commits

Each task was committed atomically:

1. **Task 1: Separate overflow-hidden from card-hover on sector and KOM cards** - `65271a1` (fix)
2. **Task 2: Increase route stats subtitle size and color prominence** - `10a72ff` (fix)

## Files Created/Modified

- `src/components/GravelSectors.astro` - Outer div: `card-hover` only; inner div: `overflow-hidden` wrapping image + content
- `src/components/KomSegments.astro` - Same two-div pattern applied
- `src/pages/index.astro` - Route stats `<p>` classes changed from `text-text-muted text-lg` to `text-accent-green text-xl md:text-2xl`

## Decisions Made

- **Two-div pattern vs CSS-only fix:** The overflow clipping is a structural issue — `overflow:hidden` on the same element as the shadow-bearing element clips ink overflow per CSS Overflow Module Level 3. The fix must be structural (separate elements), not CSS property manipulation.
- **`text-accent-green` for subtitle:** Site primary accent (oklch(85% .24 145)) stands out clearly against dark bg-base; matches the green-on-dark aesthetic of the rest of the page.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Card hover green shadow now fully functional — box-shadow not clipped
- Route stats subtitle visually prominent and on-brand
- All Phase 16 UAT gaps closed (plans 01-04)
- v2.0 fixes complete

---
*Phase: 16-v2-fixes*
*Completed: 2026-03-28*
