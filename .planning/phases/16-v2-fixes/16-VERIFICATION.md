---
phase: 16-v2-fixes
verified: 2026-03-28T05:09:26Z
status: passed
score: 7/7 must-haves verified
---

# Phase 16: v2 Fixes Verification Report

**Phase Goal:** Fix 7 issues found during v2.0 UAT — restore broken lightbox, card hover shadows, scroll-reveal animations, elevation crosshair sync, and update content/photos.
**Verified:** 2026-03-28T05:09:26Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | PhotoSwipe lightbox opens when gallery thumbnails are clicked | VERIFIED | `@layer leaflet, base, components, utilities` (no 'photoswipe' layer); `@import "photoswipe/style.css" layer(components)` at line 13; `layer(photoswipe)` pattern returns 0 results |
| 2 | Hovering a sector or KOM card produces an instant green box-shadow | VERIFIED | `.card-hover` uses direct `box-shadow: 4px 4px 0 0 transparent` with `:hover` state at line 228; no `::after` pseudo-element card rules exist |
| 3 | Section headings and card lists fade and slide into view on scroll | VERIFIED | `@keyframes reveal` is a top-level rule at line 37, outside the `@theme {}` block which closes at line 35; token `--animate-reveal` remains inside `@theme` |
| 4 | Route stats subtitle has clear visual hierarchy relative to section heading | VERIFIED | Line 246 of `src/pages/index.astro`: `<p class="text-text-muted text-lg mb-8">` contains the route miles/elevation expression |
| 5 | Hovering over the elevation chart shows a crosshair marker on the map at the corresponding GPS location | VERIFIED | `ElevationProfile.astro` line 42: `const { getRelativePosition } = await import('chart.js/helpers');` — named import from `chart.js/helpers`, not `Chart.helpers.getRelativePosition` |
| 6 | Leaving Chatham KOM card displays a photo of Rock River Rd terrain | VERIFIED | File exists at `public/images/leaving-chatham-rock-river-rd.png`; `scripts/photo-manifest.js` line 50 has entry `{ filename: 'leaving-chatham-rock-river-rd.png', mi: 37.8 }` |
| 7 | MK Ultra explainer explains dual meaning — CIA program AND route creator Mark Kransz's initials | VERIFIED | `MkUltraExplainer.astro` line 31: `route creator <span class="redacted-reveal">Mark Kransz</span>, whose initials gave the ride its name` |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/styles/global.css` | Fixed CSS layer ordering, card hover, scroll reveal keyframes | VERIFIED | 255 lines; no stub patterns; layer order correct; `@keyframes reveal` at top level line 37; `.card-hover` direct box-shadow at line 224 |
| `src/pages/index.astro` | Larger route stats subtitle text | VERIFIED | Route stats paragraph at line 246 has `text-lg` class |
| `src/components/ElevationProfile.astro` | `getRelativePosition` from chart.js/helpers | VERIFIED | Named import at line 42 from `chart.js/helpers` |
| `public/images/leaving-chatham-rock-river-rd.png` | Photo of Rock River Rd terrain | VERIFIED | File exists in public/images/ |
| `scripts/photo-manifest.js` | Entry at mi 37.8 for leaving-chatham image | VERIFIED | Line 50: `{ filename: 'leaving-chatham-rock-river-rd.png', mi: 37.8 }` |
| `src/components/MkUltraExplainer.astro` | Mentions Mark Kransz | VERIFIED | Line 31 names Mark Kransz and explains his initials |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `global.css @layer declaration` | PhotoSwipe CSS import | `layer(components)` | WIRED | `@layer` line 4 has no 'photoswipe'; import line 13 uses `layer(components)` |
| `global.css @keyframes reveal` | scroll-reveal animation | top-level outside `@theme` | WIRED | `@keyframes reveal` at line 37; `@theme` closes at line 35 |
| `ElevationProfile.astro` | chart.js helpers | `import('chart.js/helpers')` | WIRED | Named import at line 42; used at line 145 via `getRelativePosition(event.native, chart)` |
| `photo-manifest.js` | `leaving-chatham-rock-river-rd.png` | `mi: 37.8` entry | WIRED | Manifest entry links the image file to mile marker 37.8 |

### Anti-Patterns Found

None. No TODO/FIXME comments, placeholder text, empty handlers, or console-only implementations found in modified files.

### Human Verification Required

The following behaviors are structurally sound but require a browser to confirm visually:

1. **PhotoSwipe lightbox opens on click**
   - Test: Click any photo thumbnail in the gallery section
   - Expected: Full-screen PhotoSwipe lightbox opens with dark theme and navigation arrows
   - Why human: CSS layer correctness can be verified statically, but rendering requires a browser

2. **Card hover shadow appears instantly**
   - Test: Hover over a sector card or KOM card
   - Expected: 4px offset green box-shadow appears with no animation delay
   - Why human: The `step-start` transition timing and visual appearance require browser rendering

3. **Scroll-reveal animations play**
   - Test: Scroll down the page from the top on a fresh load
   - Expected: Section headings and card grids fade and slide up into view as they enter the viewport
   - Why human: `IntersectionObserver` behavior and `is-visible` class toggling requires browser execution

4. **Elevation chart crosshair syncs to map**
   - Test: Hover over the elevation profile chart; move cursor across it
   - Expected: A crosshair marker appears on the route map at the corresponding GPS point and moves as cursor moves
   - Why human: `getRelativePosition` integration with Chart.js mouse events requires browser execution

### Gaps Summary

No gaps. All 7 must-haves are verified at all three levels (exists, substantive, wired). The phase goal is structurally achieved. The 4 human verification items above are the remaining step to confirm behavior in browser.

---

_Verified: 2026-03-28T05:09:26Z_
_Verifier: Claude (gsd-verifier)_
