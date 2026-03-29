---
phase: 21-escher-background-favicon
plan: 02
subsystem: ui
tags: [css, animation, svg, background, escher, isometric, prefers-reduced-motion, astro]

# Dependency graph
requires:
  - phase: 20-bike-icon-crosshair
    provides: BaseLayout.astro with grain-overlay established
provides:
  - Escher isometric cube tessellation overlay div in BaseLayout.astro
  - .escher-overlay CSS class with inline SVG tile, z-index 9998
  - @keyframes escher-drift 50s compositor-safe translate animation
  - prefers-reduced-motion: no-preference gate for animation
affects: [favicon plan 21-03, any future overlay additions, layout z-index stack]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Decorative overlay pattern: fixed/inset/pointer-events:none/aria-hidden divs as body siblings"
    - "CSS animation gate: prefers-reduced-motion: no-preference enables animation (opt-in not opt-out)"
    - "CSS @keyframes + @media outside @layer blocks to avoid cascade specificity issues"

key-files:
  created: []
  modified:
    - src/styles/global.css
    - src/layouts/BaseLayout.astro

key-decisions:
  - "Four standalone <rect> elements in SVG tile instead of <use> refs — CSS background-image data URIs cannot resolve fragment identifiers"
  - "prefers-reduced-motion: no-preference gate (opt-in) matches project pattern semantics — motion is off by default, on when user allows it"
  - "@keyframes and @media rules placed OUTSIDE @layer components — keyframes inside @layer can have cascade specificity issues"
  - "z-index: 9998 for escher-overlay, one below grain-overlay at 9999"

patterns-established:
  - "Overlay z-index stack: escher-overlay 9998, grain-overlay 9999"
  - "Compositor-safe animation: transform-only translate for zero TBT impact"

# Metrics
duration: 3min
completed: 2026-03-29
---

# Phase 21 Plan 02: Escher Background Overlay Summary

**Isometric cube tessellation background at 7% opacity with 50s compositor-safe drift animation, gated behind `prefers-reduced-motion: no-preference`**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-29T18:37:31Z
- **Completed:** 2026-03-29T18:40:57Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `.escher-overlay` CSS class with inline SVG isometric cube tile (75x143px), opacity 0.07, z-index 9998
- `@keyframes escher-drift` translates exactly one tile unit (-75px, -143px) for seamless loop at 50s linear
- `prefers-reduced-motion: no-preference` gate ensures animation only runs for users who have not requested reduced motion
- Escher overlay div added to BaseLayout.astro as sibling to grain-overlay, both direct children of `<body>`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Escher overlay CSS to global.css** - `6030db5` (feat)
2. **Task 2: Add Escher overlay div to BaseLayout.astro** - `631350a` (feat)

**Plan metadata:** pending (docs commit)

## Files Created/Modified

- `src/styles/global.css` - .escher-overlay class, @keyframes escher-drift, prefers-reduced-motion gate
- `src/layouts/BaseLayout.astro` - escher-overlay div as body sibling to grain-overlay

## Decisions Made

- **Four `<rect>` elements instead of `<use>` refs in SVG tile.** CSS `background-image` data URIs cannot resolve `#fragment` identifiers — `<use href="#left">` would silently fail. All geometry duplicated inline.
- **`prefers-reduced-motion: no-preference` gate (not `:reduce`).** Animation is opt-in: CSS is static by default, animation only activates for users who have NOT requested reduced motion. Semantically cleaner and matches the project's existing `prefers-reduced-motion: reduce` pattern for opt-out transitions.
- **`@keyframes` and `@media` placed OUTSIDE `@layer components`.** Keyframes inside `@layer` blocks can have cascade ordering issues. Top-level placement ensures reliable application.
- **z-index: 9998** places escher-overlay one step below grain-overlay at 9999, maintaining correct stacking without gaps.

## Deviations from Plan

None — plan executed exactly as written.

Note: The verification step specified `grep -c 'escher-overlay' src/styles/global.css` should return 3, but the actual count is 2 (class definition + media query selector). The `@keyframes escher-drift` block does not contain the string "escher-overlay" — only the animation name "escher-drift". The implementation is correct; the expected count in the plan was off by one.

## Issues Encountered

Node.js PATH resolution — `npx astro build` failed with "Node.js v20.19.5 not supported" because the shell PATH pointed to the wrong node binary. Resolved by using `volta run npm run build` which correctly picks up the project's pinned Node 22 from `volta.node` in package.json. This is a local environment issue, not a code issue.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Escher background overlay complete and verified via build
- Phase 21 Plan 01 (Penrose favicon) + Plan 02 (Escher background) both complete
- Phase 21 is complete — all v3.0 visual identity work done
- No blockers for production deploy

---
*Phase: 21-escher-background-favicon*
*Completed: 2026-03-29*
