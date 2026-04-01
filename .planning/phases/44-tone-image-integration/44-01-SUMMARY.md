---
phase: 44-tone-image-integration
plan: 01
subsystem: ui
tags: [tone-image, svg, escher, tessellation, mix-blend-mode, isolation, astro]

# Dependency graph
requires:
  - phase: 43-horizontal-masonry-gallery
    provides: PhotoSwipe lightbox, photo gallery, card components
  - phase: 26-tone-image-system
    provides: .tone-image CSS class, established tone image pipeline pattern
provides:
  - SVG lizard tessellation background on #sectors section (resolution-independent)
  - EscherLizards.astro component with SVG pattern tiling
  - Tone accent on first 2 sector cards (Sandstrom Rd, Akkala Rd) with isolation containment
  - Tone accent on first KOM card (Billie Helmer) with isolation containment
affects:
  - 46-lizard-background-animation

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SVG pattern tessellation: use <pattern> with <rect fill> for resolution-independent repeating backgrounds"
    - "Card accent tone image: isolation: isolate on outer container, relative on inner overflow-hidden, tone img after cover photo, relative z-10 on text div"

key-files:
  created:
    - src/components/EscherLizards.astro
  modified:
    - src/pages/index.astro
    - src/components/GravelSectors.astro
    - src/components/KomSegments.astro
    - scripts/convert-tone-images.js

key-decisions:
  - "Replaced raster Escher WebP with SVG lizard tessellation for resolution-independent quality on large screens"
  - "Used SVG <pattern> element for infinite tiling — no DOM bloat, crisp at any viewport"
  - "Two lizard types at different opacities (1.0 vs 0.4) create tessellation contrast"
  - "lsd-mind-control.webp reused for card accents (already 13KB, thematically consistent)"

patterns-established:
  - "Pattern: SVG pattern tessellation for resolution-independent backgrounds"
  - "Pattern: Card accent isolation — isolation: isolate on outer, relative on inner overflow-hidden, aria-hidden on accent img, relative z-10 on text"

# Metrics
duration: ~25min
completed: 2026-03-31
---

# Phase 44 Plan 01: Tone Image Integration Summary

**SVG Escher lizard tessellation on #sectors section + tone accents on 3 cards (2 sector + 1 KOM)**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files modified:** 5

## Accomplishments
- #sectors section background uses resolution-independent SVG lizard tessellation (EscherLizards.astro) — crisp at any screen size
- 2 sector cards (Sandstrom Rd, Akkala Rd) and 1 KOM card (Billie Helmer) display tone image accents at opacity 0.12 with lighten blend
- Card containers use `isolation: isolate` to prevent blend mode bleed
- All tone images static — prefers-reduced-motion satisfied by default

## Task Commits

Each task was committed atomically:

1. **Task 1: Pipeline tone image + section background** - `1817bd5` (feat)
2. **Task 2: Card accents on 2 sector + 1 KOM** - `60ae40b` (feat)
3. **Task 3: Checkpoint + SVG replacement** - `7675de0` (fix: replaced raster with SVG per user feedback)

## Files Created/Modified
- `src/components/EscherLizards.astro` - SVG pattern tessellation using lizard body paths from codepen/lizards
- `src/pages/index.astro` - Import EscherLizards, replaced raster img in #sectors
- `src/components/GravelSectors.astro` - Accent on first 2 cards (i < 2) with isolation pattern
- `src/components/KomSegments.astro` - Accent on first KOM card (i === 0) with isolation pattern
- `scripts/convert-tone-images.js` - Pipeline entry for square-limit-mc-escher image

## Decisions Made
- Raster Escher image rejected at checkpoint (quality too low on large screens) — replaced with SVG lizard tessellation from codepen/lizards
- SVG `<pattern>` element for infinite tiling — no DOM bloat, single element
- Two lizard types at different opacities (1.0 / 0.4) create tessellation contrast
- lsd-mind-control.webp reused for card accents (13KB, thematically consistent)

## Deviations from Plan

### Checkpoint Feedback

**1. Raster→SVG replacement for sectors section background**
- **Found during:** Task 3 (checkpoint verification)
- **Issue:** Raster WebP looked pixelated on user's large screen
- **Fix:** Created EscherLizards.astro with SVG `<pattern>` using lizard body silhouette paths from codepen/lizards. Resolution-independent, tiles infinitely via SVG pattern repeat.
- **Files:** src/components/EscherLizards.astro (new), src/pages/index.astro (updated)
- **Verification:** Build passes, user approved visual result
- **Committed in:** `7675de0`

---

**Total deviations:** 1 (checkpoint feedback — raster→SVG)
**Impact on plan:** Better quality outcome. SVG eliminates resolution concern entirely.

## Issues Encountered
None

## User Setup Required
None

## Next Phase Readiness
- EscherLizards.astro component available for phase 46 (Lizard Background Animation) to extend site-wide
- Card aspect ratio issue noted for non-accent card cover photos (separate concern, not blocking)

---
*Phase: 44-tone-image-integration*
*Completed: 2026-03-31*
