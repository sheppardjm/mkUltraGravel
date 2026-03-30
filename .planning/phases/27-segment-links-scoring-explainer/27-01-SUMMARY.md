---
phase: 27-segment-links-scoring-explainer
plan: 01
subsystem: ui
tags: [astro, strava, json, segments, kom, sectors, links]

# Dependency graph
requires:
  - phase: prior phases establishing GravelSectors.astro and KomSegments.astro
    provides: card components that render sector and KOM data from annotations.json
provides:
  - stravaSegmentId on all 9 sector/KOM entries in annotations.json
  - komTime/qomTime null placeholder fields on 3 KOM entries
  - Strava icon links (#FC5200, noopener noreferrer) on all 6 sector cards
  - Strava icon links on all 3 KOM cards
  - Conditional KOM/QOM time display on KOM cards (hidden when null)
affects: [28-scoring-explainer, 29-strava-oauth, phase 30-31 results display]

# Tech tracking
tech-stack:
  added: []
  patterns: [Bootstrap Icons inline SVG for external brand icons, conditional Astro rendering with null checks]

key-files:
  created: []
  modified:
    - public/data/annotations.json
    - src/components/GravelSectors.astro
    - src/components/KomSegments.astro

key-decisions:
  - "Inserted stravaSegmentId after existing coverPhoto field in each JSON object to minimize diff surface"
  - "Used Bootstrap Icons filled Strava SVG (single path) at 12x12 for text-xs scale, not Tabler outline"
  - "komTime/qomTime set to null initially; conditional render means zero UI change until organizer provides data"

patterns-established:
  - "Strava links: inline-flex items-center gap-1, text-[#FC5200], target=_blank rel=noopener noreferrer, Bootstrap Icons SVG 12x12"
  - "Optional data fields use TypeScript ? optional + null-check conditional in Astro template"

# Metrics
duration: 3min
completed: 2026-03-30
---

# Phase 27 Plan 01: Segment Links and KOM/QOM Data Summary

**Strava segment links added to all 9 sector/KOM cards using Bootstrap Icons SVG at #FC5200, with null-placeholder komTime/qomTime fields on KOM cards ready for organizer input**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-30T17:13:13Z
- **Completed:** 2026-03-30T17:16:24Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added stravaSegmentId to all 6 sector and 3 KOM objects in annotations.json via targeted edits (no full rewrite)
- Added komTime/qomTime null placeholders to 3 KOM objects; conditional rendering means zero visible change until organizer provides real values
- Updated GravelSectors.astro and KomSegments.astro interfaces and templates with Strava links rendering at #FC5200 orange, opening in new tab with rel=noopener noreferrer
- Astro build passes clean with 9 Strava segment URLs confirmed in dist/index.html

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Strava segment IDs and KOM/QOM times to annotations.json** - `b42c1ec` (feat)
2. **Task 2: Add Strava links to GravelSectors.astro and KomSegments.astro** - `30ecdfc` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `public/data/annotations.json` - Added stravaSegmentId to all 9 entries; komTime/qomTime (null) to 3 KOM entries
- `src/components/GravelSectors.astro` - Added stravaSegmentId to TS interface; Strava link with icon on each sector card
- `src/components/KomSegments.astro` - Added stravaSegmentId/komTime/qomTime to TS interface; Strava link + conditional KOM/QOM time display

## Decisions Made
- Inserted stravaSegmentId after the existing `coverPhoto` field rather than after `stars` (as plan suggested) because `coverPhoto` is the actual last field in all objects, making targeted edits unambiguous with no risk of collision
- Bootstrap Icons filled Strava SVG used (single path `d="M6.731 0..."`) per plan spec, not Tabler outline version
- komTime/qomTime use `null` (JSON null) so conditional `{segment.komTime || segment.qomTime}` renders nothing until set

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- STRAVA-01, STRAVA-02, STRAVA-03 requirements fulfilled for segment links and KOM/QOM time structure
- When organizer provides KOM/QOM times, simply update komTime/qomTime fields in annotations.json from null to time strings (e.g., "22:14") — display renders automatically
- Phase 27 Plan 02 (scoring explainer) is next

---
*Phase: 27-segment-links-scoring-explainer*
*Completed: 2026-03-30*
