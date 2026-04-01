---
phase: 44-tone-image-integration
plan: 01
subsystem: ui
tags: [tone-image, css, mix-blend-mode, isolation, astro, webp, sharp]

# Dependency graph
requires:
  - phase: 43-horizontal-masonry-gallery
    provides: PhotoSwipe lightbox, photo gallery, card components
  - phase: 26-tone-image-system
    provides: .tone-image CSS class, established tone image pipeline pattern
provides:
  - Tone image background on #sectors section (Escher geometric grid WebP)
  - Tone accent on first 2 sector cards (Sandstrom Rd, Akkala Rd) with isolation containment
  - Tone accent on first KOM card (Billie Helmer) with isolation containment
  - Pipeline entry for square-limit-mc-escher-1964.jpg -> square-limit-mc-escher.webp
affects:
  - 45-topo-dividers
  - 46-lizard-background

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Card accent tone image: isolation: isolate on outer container, relative on inner overflow-hidden, tone img after cover photo, relative z-10 on text div"
    - "Selective accent: i < 2 (sectors) / i === 0 (KOM) conditional rendering — accent only first N cards"

key-files:
  created:
    - public/tone/square-limit-mc-escher-1964.jpg
    - public/tone/square-limit-mc-escher.webp
  modified:
    - scripts/convert-tone-images.js
    - src/pages/index.astro
    - src/components/GravelSectors.astro
    - src/components/KomSegments.astro

key-decisions:
  - "Escher 'Square Limit' woodcut selected for sectors background — Escher motif already present in project (escharian_stairs_fb.webp), geometric grid reinforces surveillance/complexity aesthetic"
  - "600px/q35 WebP output (99KB) instead of plan's 1000px/q55 — geometric Escher image resists compression, 600px is sufficient for 12%-opacity background texture"
  - "lsd-mind-control.webp reused for card accents (already 13KB, optimized, thematically consistent) — no need to pipeline a separate card accent image"
  - "Accent limited to first 2 sector cards and 1 KOM card — demonstrates pattern across both components without visual fatigue"

patterns-established:
  - "Pattern: Card accent isolation — isolation: isolate on outer, relative on inner overflow-hidden, aria-hidden on accent img, relative z-10 on text"

# Metrics
duration: ~4min (tasks 1-2; checkpoint pending)
completed: 2026-04-01
---

# Phase 44 Plan 01: Tone Image Integration Summary

**Escher geometric grid tone background added to #sectors section; lsd-mind-control.webp accent applied to first 2 sector cards and 1 KOM card with isolation: isolate stacking context containment**

## Performance

- **Duration:** ~4 min (tasks 1-2 complete; checkpoint:human-verify pending)
- **Started:** 2026-04-01T02:23:39Z
- **Completed:** 2026-04-01T02:27:15Z (tasks 1-2)
- **Tasks:** 2/3 (Task 3 is checkpoint:human-verify)
- **Files modified:** 6

## Accomplishments
- Processed `square-limit-mc-escher-1964.jpg` (588KB) to `square-limit-mc-escher.webp` (99KB, 600px/q35) via sharp pipeline
- Added tone section background to `#sectors` — only major section missing tone coverage
- Applied card-level tone accents with proper `isolation: isolate` containment on 3 cards across 2 components
- All tone images are static (no animation) — `prefers-reduced-motion` satisfied by default

## Task Commits

Each task was committed atomically:

1. **Task 1: Pipeline new tone image and add section background to #sectors** - `1817bd5` (feat)
2. **Task 2: Add tone image accents to 2 sector cards and 1 KOM card** - `60ae40b` (feat)

## Files Created/Modified
- `public/tone/square-limit-mc-escher-1964.jpg` - Source image copied to public/tone/ for pipeline access
- `public/tone/square-limit-mc-escher.webp` - Generated WebP: 99KB at 600px/q35
- `scripts/convert-tone-images.js` - Added entry: 600px/q35 for escher sectors background
- `src/pages/index.astro` - Added tone `<img>` as first child of `#sectors` section
- `src/components/GravelSectors.astro` - Accent on first 2 cards (i < 2) with isolation pattern
- `src/components/KomSegments.astro` - Accent on first KOM card (i === 0) with isolation pattern

## Decisions Made
- **600px/q35 instead of 1000px/q55:** The Escher geometric woodcut has very high-frequency detail that resists WebP compression. At 1000px/q55 it produced 247KB (above the 100KB target). At 600px/q35 it produces 99KB — visually indistinguishable at 12% opacity.
- **lsd-mind-control.webp for card accents:** Already optimized at 13KB, reusing it keeps the build lightweight and maintains thematic consistency. No new pipeline entry needed for card accents.
- **Accent on cards 0-1 (sectors) and card 0 (KOM):** Demonstrates the pattern across both components (Sandstrom Rd, Akkala Rd, Billie Helmer) without overwhelming the UI.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] WebP output size exceeded 100KB at planned 1000px/q55**
- **Found during:** Task 1 (pipeline generation)
- **Issue:** Plan specified 1000px/q55 but Escher geometric image produced 247KB — 2.5x over the 100KB target
- **Fix:** Reduced to 600px/q35 via iterative size testing. 600px/q35 = 99KB satisfies target. At 12% opacity, quality difference is imperceptible.
- **Files modified:** scripts/convert-tone-images.js
- **Verification:** `ls -la public/tone/square-limit-mc-escher.webp` shows 101290 bytes (98.9KB)
- **Committed in:** 1817bd5 (Task 1 commit)

**2. [Rule 3 - Blocking] Node.js version mismatch: Node 20 vs required Node 22**
- **Found during:** Task 1 (build verification)
- **Issue:** Shell used Node 20.19.5 but project's volta config specifies Node 22.22.2. `astro build` fails on Node 20.
- **Fix:** Used `PATH="/Users/Sheppardjm/.volta/bin:$PATH"` prefix for all Astro build commands. Re-ran `npm install` with Node 22 to rebuild native binaries (sharp needed reinstall for Node 22 compatibility).
- **Files modified:** package-lock.json (rebuild)
- **Verification:** Build succeeded with Node 22 — `4 page(s) built in 1.64s`
- **Committed in:** 1817bd5 (included in task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug — size overage, 1 blocking — node version)
**Impact on plan:** Auto-fixes necessary for correctness. No scope creep. Final output matches plan intent.

## Issues Encountered
- Escher geometric woodcut is unusually resistant to WebP compression at standard settings — iterative testing needed to find working width/quality combination under 100KB.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Tone image system now complete across all page sections and 3 cards
- Phase 45 (topo dividers) can proceed — no blocking concerns from this phase
- Note: `isolation: isolate` on card containers should not interfere with topo dividers (they are section-level, not inside card containers)

---
*Phase: 44-tone-image-integration*
*Completed: 2026-04-01*
