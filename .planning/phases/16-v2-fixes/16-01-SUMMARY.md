---
phase: 16-v2-fixes
plan: 01
subsystem: ui
tags: [css, tailwind-v4, photoswipe, scroll-reveal, card-hover, css-layers, keyframes]

# Dependency graph
requires:
  - phase: 15-animations
    provides: scroll-reveal IntersectionObserver + CSS keyframes/utilities
  - phase: 08-photo-gallery-lightbox
    provides: PhotoSwipe integration + CSS layer(photoswipe) import
  - phase: 15-01
    provides: card-hover ::after opacity trick
provides:
  - Fixed CSS @layer ordering so PhotoSwipe CSS loads in components layer (not isolated layer)
  - card-hover direct box-shadow (not clipped by overflow-hidden)
  - @keyframes reveal emitted as top-level rule (Tailwind v4 @theme does not emit keyframes)
  - Route stats subtitle at text-lg for clear visual hierarchy
affects:
  - Any future CSS work touching @layer declarations or card-hover pattern
  - Any future PhotoSwipe or lightbox additions

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tailwind v4 @theme only accepts design tokens — @keyframes must be top-level, not nested inside @theme"
    - "PhotoSwipe CSS belongs in layer(components) alongside dark-theme overrides; a separate photoswipe layer is unnecessary and breaks Preflight ordering"
    - "Card hover shadow via direct box-shadow avoids overflow-hidden clipping that kills ::after pseudo-element trick"

key-files:
  created: []
  modified:
    - src/styles/global.css
    - src/pages/index.astro

key-decisions:
  - "Direct box-shadow on .card-hover (not ::after) — overflow-hidden on card containers clips ::after, and z-index:-1 hides shadow behind opaque card background"
  - "PhotoSwipe CSS moved to layer(components) — Tailwind Preflight in base layer was overriding the isolated photoswipe layer, breaking lightbox image rendering"
  - "@keyframes reveal extracted from @theme — Tailwind v4 only processes custom properties inside @theme; keyframe rules are silently dropped"
  - "Removed .pswp__img { max-width: none } override — it was compensating for broken layer ordering; no longer needed once PhotoSwipe is in components"

patterns-established:
  - "Never nest @keyframes inside @theme in Tailwind v4 — keeps animation token in @theme, puts @keyframes at top level"
  - "Card interaction shadows via direct box-shadow with step-start timing — overflow-safe, compositor-friendly"

# Metrics
duration: 4min
completed: 2026-03-28
---

# Phase 16 Plan 01: v2 CSS Fixes Summary

**Fixed four CSS regressions: PhotoSwipe layer ordering (lightbox broken), card-hover ::after clipped by overflow-hidden, @keyframes reveal silently dropped by Tailwind v4 @theme, and undersized route stats subtitle**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-28T01:23:30Z
- **Completed:** 2026-03-28T01:27:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- PhotoSwipe CSS now loads in `layer(components)` — Preflight no longer overrides lightbox image rendering; lightbox functional
- Card hover green shadow uses direct `box-shadow` instead of `::after` pseudo-element — no longer clipped by `overflow-hidden` on card containers
- `@keyframes reveal` moved out of `@theme` block — Tailwind v4 does not emit keyframe rules from inside `@theme`; scroll-reveal animations now play on scroll
- Route stats subtitle bumped from `text-sm` to `text-lg` — clear visual hierarchy below "The Route" heading

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix global.css — lightbox layer, card hover, scroll reveal keyframes** - `4b5e92d` (fix)
2. **Task 2: Increase route stats subtitle text size** - `2673f12` (feat)

**Plan metadata:** (docs commit follows this summary)

## Files Created/Modified

- `src/styles/global.css` — Fixed @layer declaration (removed photoswipe layer), moved PhotoSwipe import to layer(components), extracted @keyframes reveal to top-level, replaced ::after card-hover with direct box-shadow, removed redundant .pswp__img override
- `src/pages/index.astro` — Changed route stats subtitle from `text-sm` to `text-lg`

## Decisions Made

- **Direct box-shadow for card hover:** The ::after approach (Phase 15-01) failed because overflow-hidden on card containers clips position:absolute pseudo-elements, and z-index:-1 puts the shadow behind the opaque card background. Direct box-shadow is not subject to overflow clipping.
- **PhotoSwipe in layer(components):** A dedicated `layer(photoswipe)` placed after Tailwind's base layer caused Preflight rules to override PhotoSwipe's image sizing. Moving it to `layer(components)` puts it at the right cascade level alongside other dark-theme overrides.
- **@keyframes outside @theme:** Tailwind v4 treats `@theme {}` as a token-only block. Any `@keyframes` declared inside are silently ignored. The `--animate-reveal` custom property stays in @theme; the `@keyframes reveal` rule is now a top-level block between @theme and @layer base.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The shell's Node.js (v20.19.5) is older than Astro's requirement (>=22.12.0). Build was run via `volta run --node 22 npm run build` and completed successfully. This is a pre-existing environment issue unrelated to this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All four UAT gaps addressed in this plan are resolved
- PhotoSwipe lightbox, card hover, scroll-reveal, and route stats subtitle all functional
- Ready for Phase 16 Plan 02 (elevation profile fix) or UAT sign-off

---
*Phase: 16-v2-fixes*
*Completed: 2026-03-28*
