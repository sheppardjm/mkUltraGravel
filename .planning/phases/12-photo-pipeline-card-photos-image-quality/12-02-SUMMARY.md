---
phase: 12-photo-pipeline-card-photos-image-quality
plan: 02
subsystem: ui
tags: [astro, webp, cards, images, tailwind]

# Dependency graph
requires:
  - phase: 12-photo-pipeline-card-photos-image-quality plan 01
    provides: coverPhoto field in annotations.json + /images/cards/*.webp card crops

provides:
  - GravelSectors.astro renders terrain photo above each sector card name
  - KomSegments.astro renders terrain photo above each KOM card name
  - 9 total card photos wired: 6 sectors + 3 KOM segments
  - Defensive conditional rendering (no broken image if coverPhoto undefined)

affects:
  - Phase 13 (map-elevation-interactivity): sectors section visuals established
  - Phase 14 (content-registration): no impact on card layout
  - Phase 15 (animations): card photo elements available for entrance animations

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Card photo pattern: overflow-hidden outer div / img full-bleed / padded inner content div"
    - "Filename transform: .replace(/.(jpg|jpeg|png)$/i, '.webp') converts source extension to served webp"
    - "CLS prevention: width=600 height=338 reserves space before image loads"

key-files:
  created: []
  modified:
    - src/components/GravelSectors.astro
    - src/components/KomSegments.astro

key-decisions:
  - "Card restructure from p-4 outer to overflow-hidden outer + padded inner div — cleaner full-bleed image without negative margin hacks"
  - "Same card photo pattern applied to both components for visual consistency"

patterns-established:
  - "Full-bleed card image: classified-border bg-bg-surface overflow-hidden > img.w-full.aspect-video.object-cover + div.p-4"

# Metrics
duration: 4min
completed: 2026-03-27
---

# Phase 12 Plan 02: Wire Card Photos Summary

**GravelSectors and KomSegments now render full-bleed 600x338 terrain photos above each card name, wired from annotations.json coverPhoto via /images/cards/*.webp**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-27T18:21:05Z
- **Completed:** 2026-03-27T18:24:40Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- All 6 sector cards display a landscape photo of their terrain above the sector name and star rating
- All 3 KOM cards display a landscape photo above the segment name and stats
- Cards degrade gracefully: conditional `{sector.coverPhoto && ...}` renders nothing if field is absent (no broken image icon)
- Full-bleed image treatment consistent across both components via overflow-hidden card restructure

## Task Commits

Each task was committed atomically:

1. **Task 1: Add coverPhoto img to GravelSectors.astro** - `fc4b9cd` (feat)
2. **Task 2: Add coverPhoto img to KomSegments.astro** - `a705f01` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/components/GravelSectors.astro` - Added coverPhoto?: string to type cast; restructured card to overflow-hidden outer + img + padded inner div
- `src/components/KomSegments.astro` - Same treatment as GravelSectors for consistent card photo pattern

## Decisions Made

- **Card restructure approach:** Changed from `p-4` outer div + negative margin img hack to `overflow-hidden` outer + `p-4` inner content div. This produces a cleaner full-bleed image without Tailwind v4 negative margin complications. The plan noted this as the "simpler approach if negative margins are complex."
- **Pattern consistency:** Applied identical structure to both GravelSectors and KomSegments for visual consistency per plan instruction.

## Deviations from Plan

None - plan executed exactly as written. The "simpler approach" for image layout was explicitly permitted by the plan ("just keep the image inside the padding... `w-full aspect-video object-cover mb-3` classes are sufficient for a clean look") — the overflow-hidden restructure was the plan's own alternative suggestion.

## Issues Encountered

- Node 20 was on PATH by default but Astro requires Node 22. Resolved by using volta's Node 22 (`export PATH="$HOME/.volta/bin:$PATH"`). This is a pre-existing environment issue, not introduced by this plan.
- First build with Node 20 showed stale HTML without card imgs; re-ran with Node 22 and confirmed all 9 imgs present with correct attributes.

## Next Phase Readiness

- Phase 12 Plan 03 (thumbnail quality upgrade) can proceed — card photo rendering is complete
- All verification criteria met: 6 sector imgs + 3 KOM imgs with lazy/async/width/height attributes confirmed in built HTML

---
*Phase: 12-photo-pipeline-card-photos-image-quality*
*Completed: 2026-03-27*
