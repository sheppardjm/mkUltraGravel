---
phase: 16-v2-fixes
verified: 2026-03-28T20:19:50Z
status: passed
score: 9/9 must-haves verified
re_verification:
  previous_status: passed
  previous_score: 7/7
  gaps_closed:
    - "Card hover shadow now visible — overflow-hidden separated from card-hover on GravelSectors + KomSegments outer divs"
    - "Route stats subtitle upgraded to text-accent-green text-xl md:text-2xl for visual prominence"
  gaps_remaining: []
  regressions: []
---

# Phase 16: v2 Fixes Verification Report

**Phase Goal:** Fix issues found during v2.0 UAT — restore broken lightbox, card hover shadows, scroll-reveal animations, elevation crosshair sync, update content/photos, and close remaining card hover + subtitle gaps.
**Verified:** 2026-03-28T20:19:50Z
**Status:** passed
**Re-verification:** Yes — after gap closure (plans 01-04 complete; previous verification covered plans 01-03 only)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | PhotoSwipe lightbox opens when gallery thumbnails are clicked | VERIFIED | `@layer leaflet, base, components, utilities` (line 4); `@import "photoswipe/style.css" layer(components)` (line 13); no dedicated photoswipe layer to conflict |
| 2 | Hovering a sector or KOM card produces an instant green box-shadow | VERIFIED | `.card-hover` outer div has no `overflow-hidden` (confirmed in GravelSectors.astro line 26, KomSegments.astro line 19); `global.css` lines 224-229 define direct box-shadow with `step-start` |
| 3 | Section headings and card lists fade and slide into view on scroll | VERIFIED | `@keyframes reveal` at line 37 (top-level, outside `@theme` which closes at line 35); `--animate-reveal` token in `@theme` |
| 4 | Route stats subtitle is visually prominent — accent green, larger than body text | VERIFIED | `src/pages/index.astro` line 246: `class="text-accent-green text-xl md:text-2xl mb-8"` |
| 5 | Elevation chart crosshair syncs to map on hover | VERIFIED | `ElevationProfile.astro` line 42: named import `const { getRelativePosition } = await import('chart.js/helpers')`; used at line 145 |
| 6 | Leaving Chatham KOM card displays a photo of Rock River Rd terrain | VERIFIED | `public/images/leaving-chatham-rock-river-rd.png` exists; `scripts/photo-manifest.js` line 50 has entry at `mi: 37.8` |
| 7 | MK Ultra explainer explains dual meaning — CIA program AND Mark Kransz's initials | VERIFIED | `MkUltraExplainer.astro` line 31: names `Mark Kransz` with `redacted-reveal` span and explains initials |
| 8 | Sector cards have card-hover on outer div, overflow-hidden on inner div | VERIFIED | `GravelSectors.astro` line 26 outer div: `classified-border bg-bg-surface card-hover`; line 27 inner div: `overflow-hidden` only |
| 9 | KOM cards have card-hover on outer div, overflow-hidden on inner div | VERIFIED | `KomSegments.astro` line 19 outer div: `classified-border bg-bg-surface card-hover`; line 20 inner div: `overflow-hidden` only |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/styles/global.css` | Fixed CSS layer ordering, card hover, scroll reveal keyframes | VERIFIED | Layer order line 4 (no photoswipe layer); `@keyframes reveal` at line 37 top-level; `.card-hover` direct box-shadow at lines 224-229 |
| `src/pages/index.astro` | Route stats subtitle text-accent-green text-xl/2xl | VERIFIED | Line 246: `class="text-accent-green text-xl md:text-2xl mb-8"` |
| `src/components/ElevationProfile.astro` | `getRelativePosition` named import from chart.js/helpers | VERIFIED | Line 42: `const { getRelativePosition } = await import('chart.js/helpers')` |
| `src/components/GravelSectors.astro` | Outer div: card-hover without overflow-hidden; inner div: overflow-hidden | VERIFIED | Two-div pattern confirmed; no element has both classes |
| `src/components/KomSegments.astro` | Outer div: card-hover without overflow-hidden; inner div: overflow-hidden | VERIFIED | Two-div pattern confirmed; no element has both classes |
| `src/components/MkUltraExplainer.astro` | Mentions Mark Kransz and his initials | VERIFIED | Line 31 names Mark Kransz with explanation |
| `public/images/leaving-chatham-rock-river-rd.png` | Photo of Rock River Rd terrain | VERIFIED | File exists |
| `scripts/photo-manifest.js` | Entry at mi 37.8 for leaving-chatham image | VERIFIED | Line 50: `{ filename: 'leaving-chatham-rock-river-rd.png', mi: 37.8 }` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `global.css @layer` declaration | PhotoSwipe CSS import | `layer(components)` — no dedicated photoswipe layer to conflict | WIRED | Line 4 declares only leaflet/base/components/utilities; line 13 imports photoswipe into components |
| `global.css @keyframes reveal` | Scroll-reveal animation | Top-level outside `@theme` block | WIRED | `@keyframes reveal` at line 37; `@theme` closes at line 35 |
| `.card-hover` in global.css | GravelSectors.astro outer div | `card-hover` class only on outer div; no `overflow-hidden` on same element | WIRED | Outer div line 26 has `card-hover`; inner div line 27 has `overflow-hidden` |
| `.card-hover` in global.css | KomSegments.astro outer div | `card-hover` class only on outer div; no `overflow-hidden` on same element | WIRED | Outer div line 19 has `card-hover`; inner div line 20 has `overflow-hidden` |
| `ElevationProfile.astro` | chart.js helpers | Named import `getRelativePosition` from `chart.js/helpers` | WIRED | Import at line 42; invoked at line 145 |
| `photo-manifest.js` | `leaving-chatham-rock-river-rd.png` | `mi: 37.8` manifest entry | WIRED | File present in public/images; manifest links it to mile 37.8 |

### Requirements Coverage

All UAT issues from `16-UAT.md` are covered:

| Issue | Status | Fixed By |
|-------|--------|----------|
| Lightbox z-index conflict (PhotoSwipe behind Leaflet) | SATISFIED | 16-01: CSS layer ordering |
| Card hover shadow invisible | SATISFIED | 16-01: direct box-shadow; 16-04: separated overflow-hidden |
| Scroll-reveal keyframes outside @theme | SATISFIED | 16-01: moved @keyframes reveal to top-level |
| Route stats subtitle too small/muted | SATISFIED | 16-04: text-accent-green text-xl md:text-2xl |
| Elevation crosshair getRelativePosition import error | SATISFIED | 16-02: named import from chart.js/helpers |
| Leaving Chatham KOM photo missing | SATISFIED | 16-03: photo added + manifest entry |
| MK Ultra explainer no dual meaning | SATISFIED | 16-03: Mark Kransz + initials explanation added |

### Anti-Patterns Found

None. No TODO/FIXME, placeholder text, empty handlers, or console-only implementations found in any modified files.

### Human Verification Required

The following behaviors are structurally sound but require a browser to confirm visually:

#### 1. PhotoSwipe lightbox opens on click

**Test:** Click any photo thumbnail in the gallery section
**Expected:** Full-screen PhotoSwipe lightbox opens with dark theme and navigation arrows
**Why human:** CSS layer correctness verified statically; rendering and z-index stacking require a browser

#### 2. Card hover shadow appears instantly

**Test:** Hover over a sector card or KOM card
**Expected:** 4px offset green box-shadow appears with no animation delay; shadow is not clipped by the card boundary
**Why human:** The two-div separation and `step-start` transition timing require browser rendering to confirm shadow visibility

#### 3. Scroll-reveal animations play

**Test:** Scroll down the page from the top on a fresh load
**Expected:** Section headings and card grids fade and slide up into view as they enter the viewport
**Why human:** `IntersectionObserver` behavior and `is-visible` class toggling require browser execution

#### 4. Elevation chart crosshair syncs to map

**Test:** Hover over the elevation profile chart; move cursor across it
**Expected:** A crosshair marker appears on the route map at the corresponding GPS point and moves as cursor moves
**Why human:** Chart.js mouse event integration requires browser execution

#### 5. Route stats subtitle is visually prominent

**Test:** View the "The Route" section heading and the miles/elevation line below it
**Expected:** The miles/elevation subtitle renders in accent green at a noticeably larger size than body text, creating clear hierarchy below the section heading
**Why human:** `text-accent-green text-xl md:text-2xl` is confirmed in source but visual prominence requires browser rendering

### Gaps Summary

No gaps. All 9 must-haves are verified at all three levels (exists, substantive, wired). The phase goal is fully achieved:

- Lightbox layer ordering is correct (no photoswipe layer in `@layer` declaration)
- Card hover shadow is structurally unblocked (`card-hover` on outer div, `overflow-hidden` on inner div, direct box-shadow in CSS)
- Scroll-reveal keyframes exist at top-level scope outside `@theme`
- Elevation crosshair uses named import from `chart.js/helpers`
- Leaving Chatham photo exists and is in the manifest
- MK Ultra explainer names Mark Kransz
- Route stats subtitle is `text-accent-green text-xl md:text-2xl`

The 5 human verification items above are the remaining step to confirm behavior in browser.

---

_Verified: 2026-03-28T20:19:50Z_
_Verifier: Claude (gsd-verifier)_
