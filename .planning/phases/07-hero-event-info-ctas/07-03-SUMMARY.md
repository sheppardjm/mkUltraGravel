---
phase: 07-hero-event-info-ctas
plan: 03
subsystem: ui
tags: [astro, tailwind, hero, cta, countdown, event-info, preload]

# Dependency graph
requires:
  - phase: 07-hero-event-info-ctas
    provides: CountdownTimer.astro (plan 01), EventInfoBlock.astro (plan 02), BaseLayout head slot (plan 01)
  - phase: 02-scaffold-design-system
    provides: BaseLayout.astro, design tokens, section anchors
provides:
  - Rebuilt hero section with event details, countdown timer, and above-fold CTA
  - Second BikeReg CTA between route and sectors sections
  - Event Info section filled with EventInfoBlock (donation info + GPX download)
  - Hero background preload via named head slot
affects:
  - 08-photo-gallery (photos section still placeholder)
  - 09-mobile-audit (hero + CTA layout needs mobile verification)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Named slot preload: <link rel='preload' slot='head' /> injects into <head> from page level"
    - "Dual CTA placement: above fold in hero + below map for post-scroll engagement"
    - "BIKEREG_URL placeholder constant: defined in frontmatter, used in template via {BIKEREG_URL}"

key-files:
  created: []
  modified:
    - src/pages/index.astro

key-decisions:
  - "Hero shows 80 miles per roadmap success criteria, not 100 from route extension"
  - "BIKEREG_URL is a visible placeholder string — intentionally non-functional until event director confirms"
  - "Removed classified-border wrapper from #info section — EventInfoBlock provides its own structure"
  - "Added Mkultra-lsd-doc.jpg tone image to #info for visual consistency with other sections"

patterns-established:
  - "Named slot preload pattern: page-level <link> with slot='head' for per-page resource hints"

# Metrics
duration: ~3 min
completed: 2026-03-26
---

# Phase 7 Plan 03: Wire Hero + CTAs + Countdown + Event Info Summary

**Rebuilt hero with full event details, dual Register CTAs, live countdown timer, and event info section with GLRC donation info and GPX download**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-27T03:25:00Z
- **Completed:** 2026-03-27T03:30:55Z
- **Tasks:** 1 auto + 1 checkpoint (human-verified)
- **Files modified:** 1

## Accomplishments
- Hero section rebuilt with event date, location, distance (80mi), cost (free), countdown timer, and above-fold Register CTA
- Second "Register Now" CTA placed between #route and #sectors with "Like what you see?" teaser
- #info section filled with EventInfoBlock replacing Phase 7 placeholder
- Hero background image preloaded via named head slot injection
- Human-verified: all content visible on desktop and mobile, countdown ticking, GPX download functional

## Task Commits

Each task was committed atomically:

1. **Task 1: Rebuild hero section and wire all Phase 7 components** - `42b933d` (feat)
2. **Task 2: Visual verification checkpoint** - human-approved, no commit

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/pages/index.astro` - Added imports (CountdownTimer, EventInfoBlock), BIKEREG_URL constant, preload link, rebuilt hero with countdown + CTA, added second CTA div, replaced #info placeholder with EventInfoBlock

## Decisions Made
- Hero displays "80 miles" per roadmap, not the extended route distance
- BIKEREG_URL left as visible placeholder string pending event director confirmation
- Removed classified-border from #info; EventInfoBlock has its own spacing
- Added tone image to #info section for visual consistency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 7 content complete — hero, CTAs, countdown, event info, GPX download all wired
- BikeReg URL still PENDING — needs event director confirmation before launch
- Ready for Phase 8 (Photo Gallery + Lightbox)

---
*Phase: 07-hero-event-info-ctas*
*Completed: 2026-03-26*
