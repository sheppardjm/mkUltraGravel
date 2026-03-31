---
phase: 35-site-navigation
plan: 01
subsystem: ui
tags: [astro, navigation, sitenav, layout, z-index, aria-current]

# Dependency graph
requires:
  - phase: 24-css-layout-content
    provides: global CSS variables (--color-accent-green, --color-border, --font-mono, --color-text-muted) consumed by SiteNav styles
provides:
  - Fixed site navigation header component (SiteNav.astro) rendered on all pages via BaseLayout.astro
  - Build-time active link detection via Astro.url.pathname and aria-current="page"
  - Consistent wayfinding across Home, Results, Submit, and Submit-Confirm pages
  - Removal of ad-hoc back links from results, submit, and submit-confirm pages
affects: [all future phases touching page layout, BaseLayout.astro modifications, new page additions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SiteNav.astro uses Astro.url.pathname in frontmatter for SSR/SSG active link detection — no client-side JS needed, no flash of unstyled content"
    - "z-index: 10000 on nav clears grain overlay (9999) and Escher overlay (9998) stacking layers"
    - "submit-confirm treated as part of /submit flow — isActive('/submit') matches both /submit and /submit-confirm/* prefixes"
    - "pt-12 on body (via BaseLayout.astro class) provides universal padding-top to prevent content hidden behind fixed nav"

key-files:
  created:
    - src/components/SiteNav.astro
  modified:
    - src/layouts/BaseLayout.astro
    - src/pages/results.astro
    - src/pages/submit.astro
    - src/pages/submit-confirm.astro

key-decisions:
  - "Used Astro.url.pathname (build-time) for active link detection — eliminates client-side JS and prevents FOUC; aria-current='page' is the semantic signal for CSS styling"
  - "z-index: 10000 ensures nav sits above both grain overlay (9999) and Escher background (9998)"
  - "/submit-confirm treated as part of the Submit flow — isActive('/submit') returns true for both /submit and /submit-confirm paths"
  - "Scoped <style> in SiteNav.astro — no global CSS pollution; vars from global.css still work via CSS custom properties"

patterns-established:
  - "Active page detection pattern: read Astro.url.pathname in frontmatter, pass to isActive(), set aria-current='page' — use this for any future nav components"
  - "Nav z-index baseline: 10000 for nav > 9999 grain > 9998 Escher — any new overlay should slot below 9998 or document its stacking context"

# Metrics
duration: ~20min
completed: 2026-03-30
---

# Phase 35 Plan 01: Build SiteNav.astro Component and Integrate into BaseLayout Summary

**Fixed nav bar with SSR active link detection via Astro.url.pathname, rendered above grain/Escher overlays (z-index 10000), with ad-hoc back links removed from all secondary pages**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-30
- **Completed:** 2026-03-30
- **Tasks:** 2 auto + 1 checkpoint (3 total)
- **Files modified:** 5

## Accomplishments
- Created `SiteNav.astro` with fixed positioning, brand text, and 3 nav links (Home, Results, Submit)
- Active link state detected at build time using `Astro.url.pathname` — no client JS, no FOUC
- Nav sits at z-index 10000, above grain (9999) and Escher (9998) overlays — links are clickable on all pages
- Removed ad-hoc "Back to" links from results.astro, submit.astro, and submit-confirm.astro
- BaseLayout.astro updated with `pt-12` on body so page content is never obscured by the fixed nav

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SiteNav.astro and integrate into BaseLayout** - `be2b1ad` (feat)
2. **Task 2: Remove ad-hoc back links from results, submit, and submit-confirm pages** - `a52e0c6` (feat)
3. **Task 3: Human verification checkpoint** - approved by user (no commit)

**Plan metadata:** (docs: complete plan — this commit)

## Files Created/Modified
- `src/components/SiteNav.astro` - Fixed nav bar component with active link detection, z-index 10000, scoped styles
- `src/layouts/BaseLayout.astro` - Added SiteNav import, renders SiteNav before overlays, pt-12 on body
- `src/pages/results.astro` - Removed "Back to MK Ultra Gravel" link
- `src/pages/submit.astro` - Removed "Back to MK Ultra Gravel" link
- `src/pages/submit-confirm.astro` - Removed "Back to Submit" link; "Start the submission process again" contextual link preserved

## Decisions Made
- Used `Astro.url.pathname` (SSR/SSG build-time) for active detection rather than client-side `window.location` — no JavaScript needed, no flash of unstyled content, fully static-safe
- `aria-current="page"` as the CSS hook for active styling — semantic and accessible
- `/submit-confirm` grouped with `/submit` in `isActive()` — both are part of the submission flow, so "Submit" nav link stays active through the confirmation page
- Scoped `<style>` block inside `SiteNav.astro` — prevents leaking into global CSS; CSS custom properties from `global.css` still resolve

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Site navigation complete and verified across all 4 pages
- Ready for any future phase that adds new pages — just add a link to `navLinks` array in `SiteNav.astro`
- No blockers. v6.0 milestone (UI Polish + Dev Tools) is now complete with Phase 35 shipped.

---
*Phase: 35-site-navigation*
*Completed: 2026-03-30*
