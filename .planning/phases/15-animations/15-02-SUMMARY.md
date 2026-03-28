---
phase: 15-animations
plan: 02
subsystem: ui
tags: [scroll-reveal, intersection-observer, css-animation, keyframes, prefers-reduced-motion, no-js, tailwind, astro]

# Dependency graph
requires:
  - phase: 15-01
    provides: card-hover brutalist shadow and active: press feedback on cards/CTAs
  - phase: 02-scaffold-design-system
    provides: global.css @theme design tokens and @layer structure
provides:
  - Scroll-reveal entrance animations on section headings and card lists via IntersectionObserver + CSS keyframes
  - @keyframes reveal (opacity + translateY) in @theme block with --animate-reveal variable
  - @layer utilities with [data-reveal-ready] no-JS safety pattern
  - prefers-reduced-motion compliance for all reveal animations
  - Centralized IntersectionObserver in index.astro covering all [data-reveal] elements
  - 60ms stagger cascade on sector cards and KOM cards
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "[data-reveal-ready] prefix on CSS rules ensures opacity:0 only applies when JS is running — no-JS elements remain fully visible"
    - "Centralized IntersectionObserver in page-level component queries all [data-reveal] elements across all child components"
    - "unobserve() after first intersection — one-shot reveal, no re-triggering"
    - "astro:page-load event + fallback initReveal() call for View Transitions compatibility"
    - "animation-delay: ${i * 60}ms stagger pattern on .map() with index parameter for cascade effect"

key-files:
  created: []
  modified:
    - src/styles/global.css
    - src/pages/index.astro
    - src/components/GravelSectors.astro
    - src/components/KomSegments.astro

key-decisions:
  - "[data-reveal-ready] no-JS safety: data-reveal-ready attribute only exists when JS runs; CSS opacity:0 rule only activates under that selector so elements are visible without JS"
  - "0.35s ease-out for entrance animation — brutalist step-start timing is for hover/click states; ease-out is correct for scroll reveals"
  - "rootMargin 0px 0px -40px 0px triggers reveal 40px before element reaches bottom viewport edge — visible but not already scrolled past"
  - "60ms stagger per card — 6 sector cards = ~300ms total cascade, perceptible but not slow"
  - "Centralized observer in index.astro rather than per-component — single querySelectorAll covers all [data-reveal] on page"

patterns-established:
  - "Scroll-reveal pattern: data-reveal attribute + data-reveal-ready safety + .is-visible class toggle via IntersectionObserver"
  - "No-JS safety via attribute gate: CSS rules hidden behind [data-reveal-ready] selector that JS must explicitly set"

# Metrics
duration: ~2min
completed: 2026-03-28
---

# Phase 15 Plan 02: Scroll-Reveal Animations Summary

**IntersectionObserver scroll-reveal for section headings and card lists with 60ms stagger cascade, no-JS safety via data-reveal-ready attribute gate, and prefers-reduced-motion compliance**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-28T00:22:35Z
- **Completed:** 2026-03-28T00:24:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Section headings (The Route, Gravel Sectors, Route Photos, Event Info) fade+slide into view on first scroll intersection
- Sector cards and KOM cards reveal with 60ms stagger cascade using IntersectionObserver
- No-JS graceful degradation: elements fully visible without JavaScript (data-reveal-ready gate)
- prefers-reduced-motion compliance: CSS forces opacity:1 + animation:none; JS skips observer entirely
- All animations use only opacity + transform — GPU-compositor-safe, zero TBT impact

## Task Commits

Each task was committed atomically:

1. **Task 1: Add reveal keyframes and data-reveal CSS to global.css** - `3ce6c71` (feat)
2. **Task 2: Add data-reveal attributes and centralized IntersectionObserver** - `967c962` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `src/styles/global.css` - Added @keyframes reveal + --animate-reveal variable in @theme; @layer utilities with [data-reveal-ready] gate, .is-visible trigger, and prefers-reduced-motion override
- `src/pages/index.astro` - Added data-reveal to 4 section headings; added centralized IntersectionObserver script with no-JS safety, one-shot unobserve, and astro:page-load support
- `src/components/GravelSectors.astro` - Added data-reveal and 60ms stagger animation-delay to sector card divs
- `src/components/KomSegments.astro` - Added data-reveal and 60ms stagger animation-delay to KOM card divs

## Decisions Made
- **[data-reveal-ready] no-JS safety pattern:** The CSS opacity:0 rule is scoped to `[data-reveal-ready] [data-reveal]`. The script must explicitly call `document.documentElement.setAttribute("data-reveal-ready", "")` before any elements are hidden. If JS fails to load, no elements are ever hidden.
- **0.35s ease-out for entrance:** The brutalist step-start timing established in Plan 15-01 applies to hover/click binary states only. Entrance animations on scroll are conventional UX — ease-out is appropriate.
- **rootMargin 0px 0px -40px 0px:** Triggers 40px before element hits the viewport bottom edge — element is partially visible but not already past. Threshold 0.05 allows early trigger.
- **Centralized observer:** Single IntersectionObserver in index.astro via `querySelectorAll("[data-reveal]")` covers all components. No per-component scripts needed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Node.js v20 reported as unsupported by Astro (requires >=22.12). Build was run using `/usr/local/opt/node@25/bin` to resolve. Build completed successfully.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 15 (Animations) complete — all 2 plans done
- VIS-10 (scroll entrance animations) and VIS-04 (prefers-reduced-motion compliance) satisfied
- v2.0 milestone complete — all 15 phases done
- Site is ready for production review before June 7, 2026 event

---
*Phase: 15-animations*
*Completed: 2026-03-28*
