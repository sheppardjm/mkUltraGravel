---
phase: 14-content
plan: 01
subsystem: ui
tags: [astro, css, content, design-system, accessibility]

# Dependency graph
requires:
  - phase: 02-scaffold-design-system
    provides: .redacted, .classified-border, .stamp, .tone-image CSS classes
provides:
  - MkUltraExplainer.astro component with CIA program history and interactive redaction-reveal
  - .redacted-reveal CSS variant in global.css with hover/focus-visible reveal and prefers-reduced-motion
  - explainer section inserted between hero and #route in index.astro
affects:
  - phase 15-animations (explainer section exists as animation target if needed)
  - future content edits (component is self-contained)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Redacted-reveal: .redacted-reveal CSS class for hover-reveal interactive text spans"
    - "Static Astro component: no frontmatter logic, purely static HTML with design system classes"

key-files:
  created:
    - src/components/MkUltraExplainer.astro
  modified:
    - src/styles/global.css
    - src/pages/index.astro

key-decisions:
  - ".redacted-reveal is additive variant — .redacted unchanged (user-select: none preserved for hero)"
  - "Section placement: explainer inserted between hero and #route (hero introduces event, route follows explanation)"
  - "MK-Ultra.webp tone image used — only tone image not already used by another section"

patterns-established:
  - "Pattern: .redacted-reveal — white-on-white hidden text, hover reveals via color-swap to accent-green; focus-visible for keyboard; prefers-reduced-motion disables transition"
  - "Pattern: Static Astro component — no frontmatter required for content-only sections; uses existing design system CSS classes directly"

# Metrics
duration: 2.5min
completed: 2026-03-27
---

# Phase 14 Plan 01: MK Ultra Explainer Section Summary

**Static MkUltraExplainer.astro component with CIA MKULTRA program history, two interactive .redacted-reveal hover-reveal spans, 1977 FOIA Senate Select Committee citation, and classified-border design system styling — inserted between hero and #route in index.astro**

## Performance

- **Duration:** ~2.5 min
- **Started:** 2026-03-27T23:41:10Z
- **Completed:** 2026-03-27T23:43:40Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added `.redacted-reveal` CSS variant to global.css `@layer components` with hover color-swap, focus-visible keyboard accessibility, and prefers-reduced-motion support
- Created `src/components/MkUltraExplainer.astro` with three paragraphs of CIA program history, two interactive redacted-reveal spans, and FOIA citation
- Imported and rendered MkUltraExplainer in index.astro between hero and #route sections; build passes with no errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add .redacted-reveal CSS variant to global.css** - `9d901d1` (feat)
2. **Task 2: Create MkUltraExplainer.astro and insert in index.astro** - `c9f8fe3` (feat)

## Files Created/Modified

- `src/components/MkUltraExplainer.astro` - CIA MKULTRA program history section with stamp, classified-border, tone image, three paragraphs, two redacted-reveal spans, and FOIA citation
- `src/styles/global.css` - Added `.redacted-reveal` variant after `.redacted` block in `@layer components`
- `src/pages/index.astro` - Added MkUltraExplainer import and `<MkUltraExplainer />` between hero and #route

## Decisions Made

- `.redacted-reveal` is an additive variant — existing `.redacted` class unchanged. The hero uses `.redacted` with `user-select: none`; the new variant does not inherit that restriction since revealed text must be accessible.
- Explainer placed between hero and #route (not after #info) — this gives the name context before the rider sees the route map, which is the natural reading flow.
- Used `/tone/MK-Ultra.webp` as the tone image — it was the only tone image in `public/tone/` not already used by another section.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Node.js version mismatch: system `node` resolved to v20 but project requires v22 (specified in `.nvmrc`). Volta manages the correct version at `~/.volta/bin/node`. Build command was run with `VOLTA_HOME` prepended to PATH to use Node 22. This is a pre-existing environment condition, not introduced by this plan.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- CONT-01 complete: MK Ultra explainer section live with CIA history, interactive redaction-reveal, and FOIA citation
- Ready for Plan 02: BIKEREG_URL and GLRC URL constants (CONT-02, CONT-03)
- The `.redacted-reveal` pattern is now available for any future content that needs interactive text reveals

---
*Phase: 14-content*
*Completed: 2026-03-27*
