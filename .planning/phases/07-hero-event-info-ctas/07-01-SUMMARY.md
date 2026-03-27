---
phase: 07-hero-event-info-ctas
plan: 01
subsystem: ui
tags: [astro, countdown, vanilla-js, tailwind, component]

# Dependency graph
requires:
  - phase: 02-scaffold-design-system
    provides: BaseLayout.astro universal wrapper and Tailwind v4 design tokens
provides:
  - Named head slot in BaseLayout.astro enabling per-page preload injection
  - CountdownTimer.astro — live countdown to June 7, 2026 with data-* bridge pattern
affects:
  - 07-02 (EventInfo section — may use CountdownTimer)
  - 07-03 (Hero assembly — wires CountdownTimer into hero section, uses head slot for preload)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "data-* attribute bridge: pass server-side values to processed scripts via data attributes, not define:vars"
    - "Immediate tick() call before setInterval to eliminate flash of placeholder '--' values"
    - "Post-event graceful degradation: diff <= 0 hides countdown, shows completion message"

key-files:
  created:
    - src/components/CountdownTimer.astro
  modified:
    - src/layouts/BaseLayout.astro

key-decisions:
  - "data-* attribute bridge chosen over define:vars — define:vars forces is:inline which kills Astro bundling"
  - "EDT offset (-04:00) used for June 7 target — Marquette MI is Eastern time, summer is UTC-4"
  - "Named slot placed immediately before </head> — additive only, existing pages unaffected"

patterns-established:
  - "data-target bridge: pass ISO date strings from Astro frontmatter to client script via data-* attributes"
  - "Processed <script> tags (no is:inline) for all countdown/timer logic — enables tree-shaking and bundling"

# Metrics
duration: 1min
completed: 2026-03-27
---

# Phase 07 Plan 01: BaseLayout Head Slot + CountdownTimer Summary

**Named head slot added to BaseLayout.astro and CountdownTimer.astro created with data-* bridge pattern, immediate tick() call, and post-event graceful degradation**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-27T03:08:59Z
- **Completed:** 2026-03-27T03:10:21Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- BaseLayout.astro now has `<slot name="head" />` enabling Plan 03 to inject hero background preload without polluting the global layout
- CountdownTimer.astro is a fully self-contained component counting down to June 7, 2026 09:00 EDT
- Data-* attribute bridge pattern established — avoids define:vars pitfall that forces is:inline and kills bundling
- tick() called immediately before setInterval — eliminates '--' placeholder flash visible on page load
- Post-event state handled: when diff <= 0, countdown hides and "The day is here. Get out there." message appears

## Task Commits

Each task was committed atomically:

1. **Task 1: Add named head slot to BaseLayout.astro** - `cfbe436` (feat)
2. **Task 2: Create CountdownTimer.astro component** - `7be49f1` (feat)

**Plan metadata:** (pending final docs commit)

## Files Created/Modified
- `src/layouts/BaseLayout.astro` - Added `<slot name="head" />` before `</head>` for per-page head injection
- `src/components/CountdownTimer.astro` - Vanilla JS countdown timer with processed script, data-* bridge, and post-event handling

## Decisions Made
- **data-* bridge over define:vars:** define:vars forces is:inline which disables Astro's bundler and tree-shaking. The data-target attribute on the container div reads cleanly in the processed script.
- **EDT (-04:00) offset:** Marquette MI is in Eastern time; June is EDT (UTC-4). Offset is correct for summer. Only EVENT_DATE_ISO needs updating if event director confirms a different time.
- **Named slot position:** Placed immediately before `</head>` so any injected preload links come after all layout-level resources — standard preload ordering.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Build requires `volta run --node 22 npx astro build` — Node 20 (system default) not supported by Astro 6. Already established pattern from prior phases.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- CountdownTimer.astro is ready for import into any page/section
- Head slot is available for Plan 03 to inject `<link rel="preload">` for hero background image
- No blockers — Plan 02 (EventInfo section) and Plan 03 (Hero assembly) can proceed

---
*Phase: 07-hero-event-info-ctas*
*Completed: 2026-03-27*
