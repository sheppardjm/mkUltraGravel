---
phase: 27-segment-links-scoring-explainer
plan: 02
subsystem: ui
tags: [astro, components, scoring, strava, grinduro]

# Dependency graph
requires:
  - phase: 27-segment-links-scoring-explainer
    provides: Segment link component (plan 01) providing context for scoring integration location
provides:
  - ScoringExplainer.astro component explaining Gravel Champion and KOM/QOM Champion scoring (SCORE-03)
  - Powered by Strava attribution with #FC5200 orange in sectors section
affects:
  - 28-results-submission (submits via Strava activity link — explainer sets user expectations)
  - 29-strava-oauth (users primed to expect Strava integration)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ScoringExplainer follows GrinduroExplainer structural pattern: classified-border, p-6 md:p-8, mb-8, text-sm, space-y-3"
    - "Strava attribution: text-[#FC5200] font-bold inline span, right-aligned below grid"

key-files:
  created:
    - src/components/ScoringExplainer.astro
  modified:
    - src/pages/index.astro

key-decisions:
  - "ScoringExplainer placed immediately after GrinduroExplainer — format explainer leads, scoring details follow"
  - "Powered by Strava attribution right-aligned at bottom of sectors section below card grid"
  - "Used inline text-[#FC5200] Tailwind arbitrary value for Strava orange — no new CSS variable needed"

patterns-established:
  - "Explainer pattern: classified-border div, muted uppercase label, then content paragraphs with accent-colored strong text"
  - "Strava attribution: Powered by <span class='text-[#FC5200] font-bold'>Strava</span>"

# Metrics
duration: 1min
completed: 2026-03-30
---

# Phase 27 Plan 02: Scoring Explainer Summary

**ScoringExplainer component (SCORE-03) with Gravel Champion and KOM/QOM Champion formats, gender categories, and Powered by Strava attribution integrated into #sectors section**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-30T17:13:26Z
- **Completed:** 2026-03-30T17:14:35Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created ScoringExplainer.astro explaining both scoring formats clearly for first-time visitors
- Both formats include gender categories (men, women, non-binary)
- ScoringExplainer renders after GrinduroExplainer and before the card grid in #sectors
- Powered by Strava attribution with #FC5200 orange appears right-aligned below the card grid

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ScoringExplainer.astro component** - `fa1ee62` (feat)
2. **Task 2: Integrate ScoringExplainer and Powered by Strava into index.astro** - `4b8bea5` (feat)

## Files Created/Modified

- `src/components/ScoringExplainer.astro` - Scoring system explainer (SCORE-03); classified-border component with Gravel Champion + KOM/QOM Champion descriptions
- `src/pages/index.astro` - Added ScoringExplainer import, rendered after GrinduroExplainer, added Strava attribution below grid

## Decisions Made

- ScoringExplainer placed immediately after GrinduroExplainer so format + scoring are co-located before the sector cards
- Powered by Strava attribution right-aligned at the bottom of the sectors content area
- Strava orange (#FC5200) applied via Tailwind arbitrary value `text-[#FC5200]` — consistent with existing patterns, no new CSS variable

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- SCORE-03 fulfilled — scoring system explained on site
- Strava attribution present — satisfies Strava branding requirement before API integration
- Ready for Phase 27 plan 01 (segment links) or Phase 28 (results submission flow)
- Users visiting the site now understand both scoring formats and know results come via Strava

---
*Phase: 27-segment-links-scoring-explainer*
*Completed: 2026-03-30*
