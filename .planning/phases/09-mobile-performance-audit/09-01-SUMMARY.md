---
phase: 09-mobile-performance-audit
plan: 01
subsystem: ui
tags: [wcag, accessibility, contrast, oklch, css, design-tokens]

# Dependency graph
requires:
  - phase: 02-scaffold-design-system
    provides: global.css @theme tokens (oklch color palette, dark brutalist design system)
provides:
  - WCAG AA contrast compliance for all 11 foreground/background token pairs in the design system
  - Updated --color-text-muted (0.55 -> 0.62) and --color-accent-red (0.45 -> 0.50) tokens
  - Synchronized hardcoded oklch values in Leaflet and PhotoSwipe CSS sections
affects: [future theme changes, additional color token additions, accessibility audits]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "oklch-to-WCAG-luminance: polar oklch -> oklab rect -> linear sRGB (OKLab matrix) -> WCAG 2.1 luminance (not gamma-encode intermediate)"
    - "Token sync: raw oklch values in Leaflet/PhotoSwipe sections must always match the @theme token they shadow"

key-files:
  created: []
  modified:
    - src/styles/global.css

key-decisions:
  - "--color-text-muted raised to L=0.62 — worst-case pair (muted on elevated bg) required L>=0.586; 0.62 gives 5.16:1+ headroom on all three backgrounds"
  - "--color-accent-red raised to L=0.50 — minimum L to pass 3:1 large-text threshold was 0.4756; 0.50 chosen as next clean increment"
  - "WCAG luminance calculated from linear sRGB directly (no gamma re-encode) — oklab matrix path already yields linear values"

patterns-established:
  - "WCAG audit via Node.js script: oklch -> oklab -> linear sRGB -> WCAG luminance; no external web tools needed"

# Metrics
duration: 2min
completed: 2026-03-27
---

# Phase 9 Plan 01: WCAG Contrast Audit Summary

**Raised --color-text-muted L=0.55->0.62 and --color-accent-red L=0.45->0.50 to pass all 11 WCAG AA token-pair audits; synced hardcoded Leaflet/PhotoSwipe oklch values**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-27T05:13:17Z
- **Completed:** 2026-03-27T05:15:13Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Wrote and ran a Node.js oklch-to-WCAG-luminance audit script covering all 11 foreground/background token pairs
- Identified 5 WCAG AA failures: muted text (L=0.55) against base/surface/elevated backgrounds, and accent-red stamp on base
- Fixed both tokens in @theme block and synced all 4 hardcoded raw oklch values in Leaflet/PhotoSwipe CSS
- Re-ran audit: all 11 pairs now pass (worst-case muted-on-elevated: 5.16:1, stamp red: 3.23:1)

## Task Commits

1. **Task 1 + 2: Calculate contrast ratios and fix failing pairs** - `6692b3f` (fix)

**Plan metadata:** *(pending docs commit)*

## Files Created/Modified
- `src/styles/global.css` - Updated `--color-text-muted` oklch(0.55->0.62 0.01 90), `--color-accent-red` oklch(0.45->0.50 0.22 25), and 4 hardcoded raw oklch values in Leaflet/PhotoSwipe sections

## Decisions Made
- **L=0.62 for muted text:** Binary search showed minimum L to pass the strictest case (muted on `oklch(0.18 0.01 250)` elevated background) was 0.586. Chose 0.62 for headroom — gives 5.16:1 on the hardest bg and 5.66:1 on the darkest. Visual hierarchy preserved: body 0.85 > muted 0.62 > bg 0.10-0.18.
- **L=0.50 for accent-red:** Minimum to pass 3:1 large-text (decorative stamp) was 0.4756. Chose 0.50 as the next round number.
- **Hardcoded sync required:** Leaflet popup close button, attribution text/links, and PhotoSwipe `--pswp-icon-color-secondary` use raw oklch literals (not CSS vars) because they live outside the Astro component scope. All 4 updated from 0.55 to 0.62.

## Deviations from Plan

None — plan executed exactly as written. Both tokens identified as expected failures were confirmed failures, and both required fixes. The attribution text (pair 10) also failed due to the same muted token; all four uses covered by the single token change.

## Issues Encountered
None — OKLab matrix math produced correct luminance values on first run. Build clean.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- WCAG AA contrast compliance confirmed for all design tokens
- Ready for Phase 9, Plan 02 (mobile viewport and touch target audit)
- No blockers

---
*Phase: 09-mobile-performance-audit*
*Completed: 2026-03-27*
