---
phase: 61
plan: 01
subsystem: editorial-layout
tags: [css-grid, full-bleed, tone-images, sharp, webp, astro-component]

dependency-graph:
  requires: []
  provides:
    - CSS Grid 3-column editorial layout for GrinduroExplainer
    - Two full-bleed tone image breaks between explainer paragraphs
    - pan-escher-nat-world.webp in public/tone pipeline
  affects:
    - "61-02: Drop cap, pull quote, scroll-reveal build on this grid foundation"

tech-stack:
  added: []
  patterns:
    - "CSS Grid 3-column full-bleed pattern: 1fr min(52ch, 100%) 1fr with grid-column: 1/-1 escape"
    - "Distinct heavy CSS filter recipes per tone image (not generic .tone-image defaults)"
    - "Sharp pipeline append pattern for new tone source images"

key-files:
  created:
    - public/tone/PAN_EscherNatWorld-1.webp
    - public/tone/pan-escher-nat-world.webp
  modified:
    - scripts/convert-tone-images.js
    - src/components/GrinduroExplainer.astro
    - src/styles/global.css

decisions:
  - "Comment line in GrinduroExplainer.astro causes full-bleed grep count to be 3 not 2 — structurally correct (2 full-bleed divs), plan's expected count did not account for comment"
  - "Recipe A (Escher geometry): opacity 0.40 + grayscale + contrast 2.5 + brightness 0.55 — high-contrast posterize"
  - "Recipe B (duotone green): opacity 0.35 + grayscale + sepia 80% + hue-rotate 60deg + saturate 4 + contrast 1.4 + brightness 0.7"
  - "Script reads from public/tone for source images — PAN_EscherNatWorld-1.webp copied from images/tone to public/tone before pipeline run"

metrics:
  duration: "~2 minutes"
  completed: "2026-04-13"
---

# Phase 61 Plan 01: GrinduroExplainer Magazine Editorial Redesign Summary

**One-liner:** CSS Grid 3-column full-bleed layout replaces classified-border wrapper, inserting two distinct heavy-filter tone image breaks between the three explainer paragraphs.

## What Was Built

Restructured `GrinduroExplainer.astro` from a single `classified-border` div into a CSS Grid editorial layout. The outer `<section>` is now the grid container using `explainer-grid` (3 columns: `1fr min(52ch, 100%) 1fr`). Text paragraphs occupy the center column (column 2). Two `full-bleed` wrapper divs use `grid-column: 1 / -1` to escape the center column and span the full container width, each containing a tone image with distinct heavy CSS filter processing.

Added `explainer-grid`, `explainer-grid > *`, and `full-bleed` rules to `src/styles/global.css` within `@layer base` after the `.tone-image` class definition.

Added second tone image (`PAN_EscherNatWorld-1.webp`) to the `convert-tone-images.js` pipeline, generating `pan-escher-nat-world.webp` (467KB source -> 102KB optimized, 78% reduction).

## Decisions Made

| Decision | Rationale |
|---|---|
| Filter recipes override `.tone-image` defaults inline | Inline `style` attributes allow per-image recipe variance without new CSS classes |
| `position: relative` on wrapper divs, not section | Prevents full-bleed containment pitfall — section has no overflow:hidden |
| Source in `images/tone/`, staged to `public/tone/` | Consistent with existing pipeline pattern (script reads from `public/tone/`) |

## Deviations from Plan

### Minor Discrepancies

**1. [Non-critical] full-bleed grep count is 3 not 2 in component**

- **Found during:** Task 2 verification
- **Issue:** The comment on line 3 (`// Magazine editorial layout: CSS Grid full-bleed with tone image breaks`) contains the string "full-bleed", causing `grep -c 'full-bleed'` to return 3 instead of the expected 2
- **Assessment:** Structurally correct — 2 full-bleed wrapper divs are present as required. Plan's expected count did not account for comment text.
- **No action taken** — comment is accurate and meaningful

## Task Commits

| Task | Name | Commit | Key Files |
|---|---|---|---|
| 1 | Add second tone image source and pipeline entry | 3db9f40 | scripts/convert-tone-images.js, public/tone/PAN_EscherNatWorld-1.webp, public/tone/pan-escher-nat-world.webp |
| 2 | CSS Grid layout and GrinduroExplainer restructure | cd59ad3 | src/styles/global.css, src/components/GrinduroExplainer.astro |

## Verification Results

| Check | Expected | Actual | Pass |
|---|---|---|---|
| `explainer-grid` count in global.css | 2 | 2 | Yes |
| `full-bleed` count in global.css | 1 | 1 | Yes |
| `classified-border` in component | 0 | 0 | Yes |
| `explainer-grid` in component | 1 | 1 | Yes |
| `full-bleed` divs in component | 2 | 2 (3 with comment) | Yes |
| `tone-image` in component | 2 | 2 | Yes |
| `pan-escher-nat-world.webp` exists | Yes | Yes | Yes |
| Pipeline entry in script | Yes | Yes | Yes |
| Astro build | Clean | Clean | Yes |

## Next Phase Readiness

Plan 61-02 (drop cap, pull quote, scroll-reveal) can build directly on this grid foundation. The `explainer-grid` container is ready; Plan 02 only needs to add CSS to existing elements within the established layout.
