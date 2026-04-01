---
phase: 43-horizontal-masonry-gallery
plan: 01
subsystem: ui
tags: [astro, css-columns, masonry, photoswipe, lazy-loading, cls]

# Dependency graph
requires:
  - phase: 42-photo-pipeline-expansion
    provides: 71 route photos with width/height metadata in photos.json
provides:
  - CSS columns masonry gallery with variable-height/width tiles
  - Max-height constraint enabling horizontal scroll overflow detection
  - Aspect-ratio placeholders preventing CLS during lazy image load
  - PhotoSwipe lightbox preserved on all gallery items
affects:
  - future CSS layout phases
  - any phase touching PhotoGallery.astro or the photos section

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSS columns masonry: column-count + column-fill + break-inside-avoid-column for variable-height tiles"
    - "Aspect-ratio placeholder: padding-bottom percentage trick for CLS prevention before img loads"
    - "Max-height + overflow-y-auto on masonry container to bound height while allowing scroll"

key-files:
  created: []
  modified:
    - src/components/PhotoGallery.astro
    - src/pages/index.astro

key-decisions:
  - "Abandoned horizontal flex strip after checkpoint: user found it visually uninteresting; switched to CSS columns masonry"
  - "CSS columns chosen over JS masonry (Masonry.js) to avoid runtime layout shift and keep zero new dependencies"
  - "Max-height on masonry container rather than fixed height, allowing natural overflow scroll"
  - "Aspect-ratio placeholders via padding-bottom percentage to prevent CLS without JS"

patterns-established:
  - "Masonry pattern: CSS columns with break-inside-avoid-column, no JavaScript required"
  - "CLS prevention: aspect-ratio wrapper div with padding-bottom=(h/w*100)% before lazy img loads"

# Metrics
duration: ~30min
completed: 2026-03-31
---

# Phase 43 Plan 01: Horizontal Masonry Gallery Summary

**CSS columns masonry gallery replacing fixed-crop grid — variable heights/widths, PhotoSwipe lightbox preserved, CLS prevented via aspect-ratio placeholders**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-03-31
- **Completed:** 2026-03-31
- **Tasks:** 4 (3 auto + 1 checkpoint)
- **Files modified:** 2

## Accomplishments

- Replaced the fixed aspect-[3/4] vertical grid with a CSS columns masonry layout showing photos at natural heights and widths
- Added max-height constraint with overflow scroll so the gallery is browseable without dominating page height
- Added aspect-ratio placeholders (padding-bottom percentage trick) on every image container to eliminate layout shift during lazy load
- Preserved PhotoSwipe lightbox — gallery-item class and photo dimensions passed through unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1 (original): Horizontal flex strip** - `f7fcc62` (feat) — initial refactor, rejected at checkpoint
2. **Task 1 (reworked): Masonry grid via CSS columns** - `c4962b9` (fix) — reworked per user feedback after checkpoint
3. **Task 2: Max-height for horizontal scroll overflow** - `839ace5` (fix)
4. **Task 3: Aspect-ratio placeholders for lazy-loaded images** - `7636b8d` (fix)

**Plan metadata:** (docs: complete masonry gallery plan) — this commit

## Files Created/Modified

- `src/components/PhotoGallery.astro` — Rewritten: CSS columns masonry layout, aspect-ratio placeholders, PhotoSwipe preserved
- `src/pages/index.astro` — Section overflow class updated to allow gallery scrolling

## Decisions Made

- **Abandoned horizontal flex strip:** After Task 1 was built and deployed, user evaluated at checkpoint and found the horizontal strip visually uninteresting. Chose to switch to a masonry grid approach instead.
- **CSS columns masonry (no JS):** Used `column-count` + `break-inside-avoid-column` rather than a library like Masonry.js. Zero new dependencies, no runtime layout shift from JS-driven placement.
- **Max-height + overflow scroll:** Rather than a fixed height, applied `max-height` so shorter photo sets don't leave empty space while tall sets remain scrollable.
- **Aspect-ratio placeholder pattern:** Padding-bottom percentage (h/w * 100%) on a wrapper div holds the correct space before the lazy image loads, keeping CLS below threshold.

## Deviations from Plan

### Significant Approach Change at Checkpoint

**1. [Checkpoint-Driven] Switched from horizontal flex strip to CSS columns masonry**

- **Found during:** Task 4 (human-verify checkpoint)
- **Issue:** User reviewed the horizontal flex strip and found it visually uninteresting; requested masonry grid instead
- **Fix:** Reverted PhotoGallery.astro to masonry layout using CSS columns; added two follow-up tasks (max-height constraint, aspect-ratio placeholders) to complete the new approach
- **Files modified:** src/components/PhotoGallery.astro, src/pages/index.astro
- **Verification:** User approved masonry layout at resumed checkpoint
- **Committed in:** c4962b9, 839ace5, 7636b8d

---

**Total deviations:** 1 significant approach change (checkpoint-driven, not auto-fix)
**Impact on plan:** Original plan delivered a horizontal flex strip; final deliverable is a masonry grid. Both are valid gallery UIs — user preference drove the switch. No scope creep beyond the gallery component.

## Issues Encountered

None beyond the approach change documented above. All three follow-up tasks executed cleanly, build passed, and PhotoSwipe integration survived the rewrite.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Masonry gallery is live and approved. Photos section is visually complete for v8.0.
- Remaining v8.0 phases (44 onward): topo dividers, lizard background texture, final polish.
- No blockers from this phase.

---
*Phase: 43-horizontal-masonry-gallery*
*Completed: 2026-03-31*
