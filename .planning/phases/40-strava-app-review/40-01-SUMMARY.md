---
phase: 40-strava-app-review
plan: 01
subsystem: ui
tags: [strava, branding, accessibility, sr-only, color, astro]

# Dependency graph
requires:
  - phase: 39-webhook-registration
    provides: webhook infrastructure and deauth flow
provides:
  - Strava branding compliance (#FC5200 everywhere, no oklch approximations)
  - Accessible sr-only "View on Strava" text on all 8 icon-only results links
  - Ready-to-deploy code for Strava developer program review screenshots
affects: [strava-app-review, form-submission]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "sr-only span after aria-hidden SVG for accessible icon-only links per Strava brand guidelines"
    - "Exact hex #FC5200 for all Strava-branded UI elements — no oklch() approximations"

key-files:
  created: []
  modified:
    - src/pages/submit.astro
    - src/pages/submit-confirm.astro
    - src/pages/results.astro

key-decisions:
  - "Use replace_all to convert oklch(0.72 0.19 55) to #FC5200 across all three files"
  - "sr-only span inserted inside <a> after </svg> — visually hidden but DOM-present for screen readers and brand compliance"
  - "Node.js 25 used for local build verification (project path requires >=22, default shell has v20)"

patterns-established:
  - "Strava brand color #FC5200 is the canonical orange — never use oklch() approximation"
  - "All icon-only Strava links must include sr-only 'View on Strava' text for both accessibility and brand compliance"

# Metrics
duration: 8min
completed: 2026-03-31
---

# Phase 40 Plan 01: Strava App Review — Branding Fix Summary

**Blanket replace of oklch(0.72 0.19 55) with exact #FC5200 across submit.astro, submit-confirm.astro, and results.astro; added sr-only "View on Strava" spans to all 8 icon-only activity links in results.astro**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-31T19:15:07Z
- **Completed:** 2026-03-31T19:23:00Z
- **Tasks:** 1 of 2 complete (Task 2 is checkpoint:human-action — awaiting user)
- **Files modified:** 3

## Accomplishments
- Replaced 18 total oklch color instances with exact #FC5200 Strava brand color (4 in submit.astro, 5 in submit-confirm.astro, 9 in results.astro)
- Added sr-only "View on Strava" span to all 8 Strava activity icon links in results.astro — satisfies Strava brand guideline requiring visible "View on Strava" text format
- Build verified passing with Node.js 25

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix Strava branding colors and add accessible link text** - `70f494b` (feat)

**Plan metadata:** TBD (docs: complete plan — added after Task 2 checkpoint resolves)

## Files Created/Modified
- `src/pages/submit.astro` - 4 oklch → #FC5200 replacements (button bg, link color, JS focus/valid states)
- `src/pages/submit-confirm.astro` - 5 oklch → #FC5200 replacements (link color, activity link, checkbox accent, submit button bg, JS focus state)
- `src/pages/results.astro` - 9 oklch → #FC5200 replacements + 8 sr-only "View on Strava" spans added to all activity links

## Decisions Made
- Node.js 25 used for local build verification (the default shell had Node 20, which is below Astro's >=22 requirement). The live Netlify build environment uses a compatible version and was already working.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Local Node.js version (v20.19.5) is below Astro's minimum requirement (>=22.12.0). Used `/usr/local/Cellar/node/25.8.2/bin/node` for build verification. This is a pre-existing local environment constraint, not introduced by this plan. Netlify deploys work correctly.

## User Setup Required

**Task 2 is a checkpoint:human-action** — the user must:
1. Push the Task 1 commit to trigger Netlify deploy
2. Re-submit athlete 2262684 via /submit OAuth flow
3. Take screenshots of all Strava-data pages
4. Submit the Strava developer program review form at https://share.hsforms.com/1VXSwPUYqSH6IxK0y51FjHwcnkd8

See checkpoint message in execution log for full step-by-step instructions.

## Next Phase Readiness
- Code is committed and ready to deploy (push to trigger Netlify)
- Awaiting: Strava review form submission (Task 2)
- REVIEW-03 (app approved) is externally gated — 7-10 business days minimum after submission
- If not approved by ~May 28, 2026: escalate to developers@strava.com and prepare manual result-collection contingency

---
*Phase: 40-strava-app-review*
*Completed: 2026-03-31 (Task 1); Task 2 pending user action*
