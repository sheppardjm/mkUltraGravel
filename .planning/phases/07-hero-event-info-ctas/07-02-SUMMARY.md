---
phase: 07-hero-event-info-ctas
plan: 02
subsystem: ui
tags: [astro, tailwind, gpx, static-html, event-info, brutalist]

# Dependency graph
requires:
  - phase: 02-scaffold-design-system
    provides: Tailwind v4 CSS-first tokens (text-accent-green, text-text-body, text-text-muted, text-bg-base, text-accent-white)
provides:
  - EventInfoBlock.astro static component with event format, GLRC donation info, and GPX download link
affects:
  - 07-03 (EventInfoBlock imported into index.astro #info section)
  - Future CTA wiring (BIKEREG_URL placeholder ready for event director confirmation)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Static Astro component with frontmatter placeholder constant (BIKEREG_URL marked PENDING)
    - HTML anchor download attribute for same-origin GPX file delivery

key-files:
  created:
    - src/components/EventInfoBlock.astro
  modified: []

key-decisions:
  - "BIKEREG_URL defined as PENDING constant in frontmatter — not used in this component, reserved for Plan 03 CTA wiring"
  - "download attribute saves file as mk-ultra-gravel-2026.gpx while serving from /mk-ultra.gpx — works same-origin"
  - "No script tag added — component is 100% static HTML, all styling via Tailwind utility classes"

patterns-established:
  - "Frontmatter placeholder pattern: define URL constants as PENDING strings to document future wiring points"

# Metrics
duration: 1min
completed: 2026-03-27
---

# Phase 07 Plan 02: EventInfoBlock Component Summary

**Static Astro component delivering event format description, GLRC $10 donation context, and a styled GPX download button with correct `download="mk-ultra-gravel-2026.gpx"` attribute**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-27T03:09:27Z
- **Completed:** 2026-03-27T03:10:10Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created EventInfoBlock.astro with three distinct content blocks (Format, Cause, Route File)
- GLRC mission context clearly stated: substance abuse + mental health services across UP
- GPX download button styled with brutalist border/hover pattern; href and download attributes both correct
- BIKEREG_URL placeholder marked PENDING for event director confirmation before CTA wiring in Plan 03

## Task Commits

Each task was committed atomically:

1. **Task 1: Create EventInfoBlock.astro component** - `b4d63e8` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified

- `src/components/EventInfoBlock.astro` - Three-block static component: event format, GLRC donation info, GPX download link

## Decisions Made

- BIKEREG_URL is defined in frontmatter but intentionally unused — Plan 03 will wire CTAs in index.astro
- GPX file served from `/mk-ultra.gpx`; download attribute renames to `mk-ultra-gravel-2026.gpx` on save — same-origin, works without CORS
- No `<script>` tag added — this component requires no interactivity, aligns with static-first principle

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. Build succeeded on first run. All 7 verification checks passed immediately.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- EventInfoBlock.astro is ready to be imported in index.astro (Plan 03)
- BikeReg URL still PENDING — event director must confirm before CTA wiring in Plan 03
- GPX file must exist at `public/mk-ultra.gpx` before launch for the download link to deliver a real file

---
*Phase: 07-hero-event-info-ctas*
*Completed: 2026-03-27*
