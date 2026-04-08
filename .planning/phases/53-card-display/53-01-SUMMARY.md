---
phase: 53-card-display
plan: 01
subsystem: ui
tags: [astro, sharp, webp, tailwind, card, overflow-hidden, classified-badge]

# Dependency graph
requires:
  - phase: 52-prev
    provides: existing GravelSectors and KomSegments card components
provides:
  - Restructured card DOM with overflow-hidden scoped to media container only
  - Card crops generated at 1200x675 (2x resolution for 1440px+ viewports)
  - Sectors section content constrained to max-w-6xl on ultrawide viewports
affects: [54-overlay-contrast, 55-gallery-fill]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Card DOM pattern: overflow-hidden wraps media container only (img + tone overlay), content div is sibling outside"
    - "Card photos: 1200x675 WebP crops via sharp resize with attention focal point"
    - "Section max-width: max-w-6xl mx-auto on relative z-10 wrapper, not on parent section"

key-files:
  created: []
  modified:
    - src/components/GravelSectors.astro
    - src/components/KomSegments.astro
    - scripts/assign-card-photos.js
    - src/pages/index.astro

key-decisions:
  - "overflow-hidden stays on media wrapper only — content div must be sibling to avoid clipping CLASSIFIED pseudo-element badge"
  - "Card crop resolution doubled to 1200x675 to serve sharp images at 1440px viewport width"
  - "max-w-6xl (1152px) applied at the z-10 content wrapper level inside #sectors, not on the section itself"

patterns-established:
  - "Card pattern: media container (overflow-hidden) + content div (sibling) inside classified-border wrapper"

# Metrics
duration: 3min
completed: 2026-04-08
---

# Phase 53 Plan 01: Card Display Summary

**Card DOM restructured so CLASSIFIED badge never clips — overflow-hidden scoped to image+tone wrapper, 1200x675 WebP crops generated, sectors section capped at max-w-6xl for ultrawide**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-08T14:31:23Z
- **Completed:** 2026-04-08T14:33:38Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Fixed CLASSIFIED badge clipping: content div moved outside overflow-hidden container in both GravelSectors.astro and KomSegments.astro
- Doubled card photo resolution from 600x338 to 1200x675 — sharp rendering at 1440px+ viewports; all 10 card crops regenerated
- Sectors section capped at 1152px (max-w-6xl) on ultrawide viewports via content wrapper constraint

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix classified badge clipping and update card photo dimensions** - `bc4ef64` (feat)
2. **Task 2: Regenerate card crops at 1200x675** - `2422331` (feat)
3. **Task 3: Add max-width constraint to sectors section** - `6d5a054` (feat)

**Plan metadata:** (see docs commit below)

## Files Created/Modified
- `src/components/GravelSectors.astro` - overflow-hidden scoped to media container; content div is sibling; img 1200x675
- `src/components/KomSegments.astro` - same restructure as GravelSectors
- `scripts/assign-card-photos.js` - resize pipeline updated to 1200x675; comments updated
- `src/pages/index.astro` - max-w-6xl mx-auto added to #sectors z-10 wrapper

## Decisions Made
- `overflow-hidden` must wrap only the media container (img + tone overlay) — the CLASSIFIED badge is a pseudo-element on the outer `.classified-border` div and cannot be clipped by any ancestor overflow-hidden
- 1200x675 is the correct crop size: matches 2:1 aspect ratio of `aspect-video`, provides 2x pixels for 600px-wide cards on 1440px displays
- `relative z-10` removed from content divs — they were only needed to escape the stacking context created by the tone overlay inside overflow-hidden; now that content is a sibling outside overflow-hidden, no z-index fighting needed
- max-w-6xl applied to the content wrapper (not the section) to preserve full-bleed background while constraining card grid

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `public/images/` is gitignored, so regenerated card WebP files are tracked locally but not committed. The script (assign-card-photos.js) and annotations.json are committed. Card files will be regenerated on deploy via build pipeline.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Card DOM is clean and CLASSIFIED badge will render above all cards correctly
- 1200x675 card crops available for all 10 segments (7 sectors + 3 KOMs)
- Sectors section has proper ultrawide constraint
- Ready for Phase 54 (overlay contrast) and Phase 55 (gallery fill)

---
*Phase: 53-card-display*
*Completed: 2026-04-08*
