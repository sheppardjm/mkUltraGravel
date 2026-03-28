---
phase: 15-animations
plan: 01
subsystem: ui
tags: [css, tailwind, animations, hover, brutalist, prefers-reduced-motion]

# Dependency graph
requires:
  - phase: 02-scaffold-design-system
    provides: global.css @layer components block, design tokens (--color-accent-green), classified-border class
  - phase: 06-route-info-sections
    provides: GravelSectors.astro and KomSegments.astro card components
  - phase: 07-hero-event-info-ctas
    provides: EventInfoBlock.astro Download GPX button, index.astro Register Now CTAs
provides:
  - ".card-hover CSS class with ::after pseudo-element shadow trick (instant green box-shadow on hover)"
  - "active: press feedback on all CTAs (translate-y-px + scale-[0.98])"
  - "Full prefers-reduced-motion compliance for all new interactive effects"
affects: [15-02, future-ui-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "::after opacity trick for compositor-safe box-shadow hover (avoid transition-shadow repaints)"
    - "step-start timing function for 0ms instant state changes (hard snap, no easing)"
    - "active: Tailwind pseudo-class for :active press feedback without JS"
    - "motion-reduce:active:transform-none for motion preference compliance on transforms"

key-files:
  created: []
  modified:
    - src/styles/global.css
    - src/components/GravelSectors.astro
    - src/components/KomSegments.astro
    - src/components/EventInfoBlock.astro
    - src/pages/index.astro

key-decisions:
  - "::after opacity toggle (0ms step-start) instead of direct box-shadow transition — compositor-safe, avoids paint on every frame"
  - "z-index:-1 on ::after ensures shadow renders behind card content, no stacking context issues"
  - "No transition-transform on active: buttons — active state changes are already instant because no transition-transform is declared; existing transition-opacity/colors do not affect transform"
  - "card-hover reinforces position:relative already set by classified-border — no conflict"

patterns-established:
  - "card-hover pattern: apply to any card container with classified-border for consistent hover shadow"
  - "active: press pattern: active:translate-y-px active:scale-[0.98] motion-reduce:active:transform-none on all button/CTA anchors"

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 15 Plan 01: Brutalist Hover Animations Summary

**Instant green box-shadow snap on sector/KOM card hover via ::after opacity trick, plus translate-y-px press feedback on all Register Now and Download GPX CTAs, with full prefers-reduced-motion compliance**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-28T00:18:09Z
- **Completed:** 2026-03-28T00:19:50Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added `.card-hover` CSS class to `global.css` using compositor-safe ::after opacity trick — shadow snaps on instantly at 0ms with `step-start`, no smooth easing
- Applied `card-hover` to all sector card containers (6 cards in GravelSectors.astro) and all KOM card containers (KomSegments.astro)
- Added `active:translate-y-px active:scale-[0.98]` press feedback to both Register Now CTAs (index.astro) and Download GPX button (EventInfoBlock.astro)
- All effects fully disabled under `prefers-reduced-motion: reduce` — card shadow never appears; button transforms set to `transform-none`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add card-hover CSS class to global.css** - `02c140a` (feat)
2. **Task 2: Apply card-hover to cards and active: feedback to buttons** - `55a456d` (feat)

## Files Created/Modified

- `src/styles/global.css` - Added `.card-hover` with ::after shadow trick, step-start transition, and prefers-reduced-motion disable rule inside `@layer components`
- `src/components/GravelSectors.astro` - Added `card-hover` class to sector card container div
- `src/components/KomSegments.astro` - Added `card-hover` class to KOM card container div
- `src/components/EventInfoBlock.astro` - Added `active:translate-y-px active:scale-[0.98] motion-reduce:active:transform-none` to Download GPX anchor
- `src/pages/index.astro` - Added same active: press classes to both Register Now CTA anchors (hero + mid-page)

## Decisions Made

- **::after opacity trick**: Direct `transition: box-shadow` triggers layout/paint on every interpolated frame — compositor-unsafe. Using `opacity` toggle on the `::after` pseudo-element is compositor-safe (GPU layer, no repaint).
- **`step-start` timing at 0ms**: `transition: opacity 0ms step-start` produces an instant hard snap with no intermediate opacity values — matches brutalist aesthetic exactly. A CSS `transition` with duration `0` still uses `ease` by default and technically interpolates; `step-start` forces binary on/off.
- **`z-index: -1` on ::after**: Positions the shadow pseudo-element behind card content so it never captures pointer events or obscures text.
- **No transition-transform on active: buttons**: The active: state in CSS is instantaneous by nature when no `transition-transform` is declared. The existing `transition-opacity` and `transition-colors` on these elements do not affect transforms, so the press is already instant.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Build environment: Node.js v20 (system default) is below Astro's minimum requirement of v22. Used `/usr/local/opt/node@25/bin` (Node 25, homebrew) for build verification. This is an existing environment configuration issue predating this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- VIS-09 (hover animations) and VIS-11 (click feedback) satisfied
- Phase 15 Plan 02 can proceed — scroll reveal animations or remaining animation work
- No blockers introduced

---
*Phase: 15-animations*
*Completed: 2026-03-28*
