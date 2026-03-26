---
phase: 02-scaffold-design-system
plan: 03
subsystem: ui
tags: [css-grain, visual-motifs, tone-images, brutalist-design, escher, mkultra]

# Dependency graph
requires:
  - phase: 02-scaffold-design-system
    provides: Design tokens, BaseLayout, global.css with @layer base and @theme blocks
provides:
  - Film-grain noise overlay (SVG fractalNoise) covering entire viewport
  - CSS utility classes: .redacted, .stamp, .classified-border, .tone-image
  - 5 tone reference images in public/tone/ for atmospheric backgrounds
  - CIA/Escher/psychedelic visual identity integrated into all page sections
affects: [all-ui-phases, 07-hero, 08-gallery]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SVG fractalNoise inline data URI for grain overlay (no external image dependency)
    - .tone-image class with 12% opacity + grayscale + lighten blend for ghosted backgrounds
    - .stamp/.redacted/.classified-border as reusable motif utilities

key-files:
  created:
    - public/tone/CIA-MKULTRA-IG_Page_01.jpg
    - public/tone/escharian_stairs_fb.webp
    - public/tone/MK-Ultra.webp
    - public/tone/Mkultra-lsd-doc.jpg
    - public/tone/lsd-mind-control.jpg
  modified:
    - src/styles/global.css
    - src/layouts/BaseLayout.astro
    - src/pages/index.astro

key-decisions:
  - "Grain overlay uses inline SVG data URI — no external image file, zero network requests"
  - "Tone images at 12% opacity with grayscale + lighten blend — atmospheric, never focal"
  - "Human-verified: dark brutalist psychedelic aesthetic approved as design direction"

patterns-established:
  - "Pattern: .tone-image class for ghosted background images — use in all sections needing atmospheric imagery"
  - "Pattern: .stamp for CIA document classification stamps — reusable for section headers"
  - "Pattern: .redacted for censored text effect — use sparingly for thematic emphasis"

# Metrics
duration: 3min
completed: 2026-03-26
---

# Plan 03: Visual Motifs Summary

**Film-grain overlay, CIA/Escher/psychedelic tone images, and redacted-document CSS motifs for dark brutalist identity**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-26T23:48:00Z
- **Completed:** 2026-03-26T23:51:00Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 8

## Accomplishments
- Film-grain noise overlay covering entire viewport via SVG fractalNoise
- 5 tone reference images copied to public/tone/ and integrated as ghosted section backgrounds
- Hero section with CIA document background, "Classification: Ultra" stamp, redacted "mind control" text
- Route section with Escher impossible staircase, Photos section with LSD imagery, Info section with classified border
- Reusable CSS utilities: .redacted, .stamp, .classified-border, .tone-image

## Task Commits

Each task was committed atomically:

1. **Task 1: Add grain overlay and visual motif CSS utilities** - `aeb93da` (feat)
2. **Task 2: Integrate tone reference images and surrealist design elements** - `677aa60` (feat)
3. **Task 3: Human visual verification** - checkpoint approved

## Files Created/Modified
- `src/styles/global.css` - Added @layer components block with grain-overlay, redacted, stamp, classified-border, tone-image classes
- `src/layouts/BaseLayout.astro` - Added grain-overlay div as first body child
- `src/pages/index.astro` - Enhanced all 5 sections with tone images, stamps, redacted text, classified borders
- `public/tone/CIA-MKULTRA-IG_Page_01.jpg` - Declassified document (hero background)
- `public/tone/escharian_stairs_fb.webp` - Escher stairs (route background)
- `public/tone/MK-Ultra.webp` - MK-Ultra branding
- `public/tone/Mkultra-lsd-doc.jpg` - Document aesthetic
- `public/tone/lsd-mind-control.jpg` - Psychedelic imagery (photos background)

## Decisions Made
- SVG data URI chosen for grain (no file dependency, no network request)
- Tone images at 12% opacity — verified by human as atmospheric, not overwhelming
- Design direction approved: dark brutalist psychedelic CIA document aesthetic

## Deviations from Plan
None - plan executed exactly as written

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Design system complete — all visual identity elements in place
- CSS utility classes available for all downstream phases
- Section anchors ready for content phases (3-8)

---
*Phase: 02-scaffold-design-system*
*Completed: 2026-03-26*
