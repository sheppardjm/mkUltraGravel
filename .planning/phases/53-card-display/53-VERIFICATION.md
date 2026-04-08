---
phase: 53-card-display
verified: 2026-04-08T20:25:05Z
status: human_needed
score: 3/3 must-haves verified
re_verification:
  previous_status: passed
  previous_score: 3/3
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 53: Card Display Verification Report

**Phase Goal:** Segment cards render correctly on large screens — classified badge visible, photos sharp, gravel cards reasonably sized
**Verified:** 2026-04-08T20:25:05Z
**Status:** human_needed
**Re-verification:** Yes — covering Plan 02 (z-index badge fix) in addition to Plan 01

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | CLASSIFIED badge renders fully visible above all card content on every segment card — no clipping, no occlusion | VERIFIED | `z-index: 1` on `.classified-border::before` (global.css line 152). `overflow-hidden` div closes at GravelSectors.astro line 43, KomSegments.astro line 42 — content `p-4` div is a sibling, not a child of overflow-hidden. For cards with `position: relative` on inner div (GravelSectors i<2, KomSegments i===0), z-index: 1 ensures badge paints above image container within `isolation: isolate` stacking context. For remaining cards, inner div has no `relative`, so badge is naturally above non-positioned image container. |
| 2 | Card photos appear sharp on 1440px+ viewports — 1200x675 source files, no upscaling artifacts | VERIFIED | All 10 WebP files in `public/images/cards/` confirmed at 1200x675 via `file` command output. `scripts/assign-card-photos.js` line 103: `.resize(1200, 675, { fit: 'cover', position: 'attention' })`. Both `GravelSectors.astro` and `KomSegments.astro` declare `width="1200" height="675"` on their `<img>` tags. |
| 3 | Sectors section content stops growing at max-w-6xl on ultrawide viewports (2560px+) | VERIFIED | `index.astro` line 290: `<div class="relative z-10 max-w-6xl mx-auto">` wraps the entire sectors layout grid (both GravelSectors and KomSegments columns). |

**Score:** 3/3 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/styles/global.css` | `.classified-border::before` has `z-index: 1` | VERIFIED | Line 149-161: rule block contains `position: absolute; z-index: 1;` — z-index is the second property after position, logical grouping confirmed |
| `src/components/GravelSectors.astro` | `overflow-hidden` scoped to media div only, `width="1200"` on img | VERIFIED | `overflow-hidden` div closes at line 43; content `p-4` div is sibling at line 44; `width="1200" height="675"` on img tag at lines 27-28 |
| `src/components/KomSegments.astro` | `overflow-hidden` scoped to media div only, `width="1200"` on img | VERIFIED | `overflow-hidden` div closes at line 42; content `p-4` div is sibling at line 43; `width="1200" height="675"` on img tag at lines 26-27 |
| `scripts/assign-card-photos.js` | Card crops generated at 1200x675 | VERIFIED | Line 103: `.resize(1200, 675, { fit: 'cover', position: 'attention' })` — confirmed in file header comments too (line 6, 14) |
| `src/pages/index.astro` | Max-width constraint on sectors content | VERIFIED | Line 290: `<div class="relative z-10 max-w-6xl mx-auto">` — directly wraps the sectors grid |
| `public/images/cards/*.webp` (10 files) | All at 1200x675 on disk | VERIFIED | `file` command confirms all 10 WebP files report `1200x675` dimensions |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `scripts/assign-card-photos.js` | `public/images/cards/*.webp` | sharp resize pipeline | WIRED | resize(1200, 675) at line 103; 10 on-disk files all confirmed 1200x675 |
| `GravelSectors.astro` / `KomSegments.astro` | card WebP files | img width/height attributes | WIRED | Both declare `width="1200" height="675"` on card img tags |
| `.classified-border::before` | paints above `.overflow-hidden` image container | `z-index: 1` within stacking context | WIRED | z-index: 1 in CSS; image container has no explicit z-index (auto/0); badge wins for all 10 cards |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| CARD-02 (CLASSIFIED badge visible) | SATISFIED | Badge z-index confirmed in CSS; DOM restructure from 53-01 ensures no overflow-hidden parent clips the badge |
| CARD-03 (photos sharp on 1440px+) | SATISFIED | All card images confirmed 1200x675 on disk; img tags declare correct dimensions |
| CARD-04 (cards bounded on ultrawide) | SATISFIED | max-w-6xl on sectors content wrapper in index.astro |

### Anti-Patterns Found

None. No TODO/FIXME/placeholder comments in relevant files. No stub return patterns. No `width="600"` remnants. No `overflow-hidden` wrapping the badge. No `relative z-10` on content divs that would compete with badge.

One structural note (not a blocker): `isolation: isolate` is only applied conditionally to the first two gravel sector cards and first KOM card (inline style). This was intentional — only those cards have `position: relative` on the inner div, which creates the z-index competition that needed isolation. Remaining cards lack `relative` on the inner div and are therefore safe without isolation.

### Human Verification Required

All automated checks passed. The following require a rendered browser to confirm visual correctness:

**1. CLASSIFIED badge visibility on all 10 cards at 1440px viewport**

Test: Open the site at 1440px width, scroll to Gravel Sectors. Inspect each of the 7 gravel sector cards and 3 KOM cards.
Expected: "CLASSIFIED" badge text visible at top-left of every card — red text, dark background, not hidden behind any image.
Why human: CSS z-index correctness in a stacking context with animation (data-reveal uses transform/opacity which temporarily creates a stacking context) requires visual confirmation.

**2. Photo sharpness on 1440px+ viewport**

Test: Open at 1440px+ width and compare card photo clarity to the 600x338 era.
Expected: Card photos appear sharp with no upscaling artifacts. Images should fill the card container crisply.
Why human: Perceived sharpness requires visual inspection.

**3. Sectors section max-width constraint at 2560px**

Test: Open at 2560px wide (or simulate via DevTools) and confirm card columns do not stretch to full viewport width.
Expected: Grid bounded at approximately 1152px (max-w-6xl = 72rem at 16px base), centered with margin auto.
Why human: Layout containment at ultrawide breakpoints requires a rendered browser.

## Gaps Summary

No gaps. All three truths verified, all six artifacts substantive and correctly wired, all key links confirmed. Plan 01 (DOM restructure + image pipeline) and Plan 02 (badge z-index) are both confirmed in the codebase.

The phase is structurally complete. Human verification is recommended to confirm visual correctness before closing.

---

_Verified: 2026-04-08T20:25:05Z_
_Verifier: Claude (gsd-verifier)_
