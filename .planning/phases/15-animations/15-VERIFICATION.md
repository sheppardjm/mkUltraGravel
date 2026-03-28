---
phase: 15-animations
verified: 2026-03-28T00:27:37Z
status: human_needed
score: 4/5 must-haves verified
human_verification:
  - test: "Run Lighthouse mobile audit and confirm TBT remains at 0ms"
    expected: "Total Blocking Time = 0ms in Lighthouse mobile report"
    why_human: "TBT is a runtime metric requiring a live Lighthouse run; cannot be determined by static code analysis"
---

# Phase 15: Animations Verification Report

**Phase Goal:** Interactive elements and sections respond to user actions with subtle, brutalist-appropriate motion that enhances the dark aesthetic without degrading performance.
**Verified:** 2026-03-28T00:27:37Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Hovering a sector card or KOM card produces an immediate hard visual shift (green shadow snaps on, no smooth ease-in-out curves) | VERIFIED | `global.css` line 231-238: `.card-hover::after` has `box-shadow: 4px 4px 0 0 var(--color-accent-green)`, `opacity: 0`, `transition: opacity 0ms step-start`; hover sets `opacity: 1` — binary instant snap, no easing |
| 2  | Card lists and section content fade and slide into view as the user scrolls down the page | VERIFIED | `@keyframes reveal` (lines 36-45 global.css): `opacity 0→1 + translateY(12px)→0` at 0.35s ease-out; `[data-reveal]` on all 4 section headings (index.astro lines 245, 270, 294, 307) and all sector/KOM cards; IntersectionObserver (index.astro lines 326-343) adds `.is-visible` on scroll; `@layer utilities` triggers `animation: var(--animate-reveal)` on `.is-visible` |
| 3  | Clicking an interactive element (button, card, map marker) produces visible click feedback | VERIFIED | `active:translate-y-px active:scale-[0.98] motion-reduce:active:transform-none` present on both Register Now CTAs (index.astro lines 220, 262) and Download GPX button (EventInfoBlock.astro line 46) |
| 4  | All animations are disabled when the user has prefers-reduced-motion enabled | VERIFIED | Three layers of compliance: (1) `global.css` line 243-250: card-hover shadow never shows (`opacity: 0` on hover); (2) `global.css` line 263-268: scroll-reveal elements forced to `opacity: 1 !important; animation: none !important`; (3) index.astro line 322-324: JS observer skips creation entirely under `prefers-reduced-motion: reduce`; (4) `motion-reduce:active:transform-none` on all button `active:` states |
| 5  | Lighthouse mobile TBT remains at 0ms after all animations are added | UNCERTAIN | All animations use compositor-safe opacity + transform only; IntersectionObserver (not scroll event listener) used for reveals; no layout-triggering transitions detected; no `transition-shadow` or compositor-unsafe patterns found — but TBT is a live runtime metric that requires a Lighthouse run to confirm |

**Score:** 4/5 truths verified (1 needs human)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/styles/global.css` | `.card-hover` class with `::after` shadow trick | VERIFIED | Lines 228-250: complete implementation with step-start transition, `opacity: 0` default, `opacity: 1` on hover, prefers-reduced-motion block |
| `src/styles/global.css` | `@keyframes reveal` and `--animate-reveal` in `@theme` | VERIFIED | Lines 33-45: `--animate-reveal: reveal 0.35s ease-out both` and `@keyframes reveal` with opacity + translateY |
| `src/styles/global.css` | `@layer utilities` with `[data-reveal-ready]` no-JS gate | VERIFIED | Lines 253-269: `[data-reveal-ready] [data-reveal]` hides elements; `.is-visible` triggers animation; prefers-reduced-motion override |
| `src/components/GravelSectors.astro` | `card-hover` and `data-reveal` with stagger on card divs | VERIFIED | Line 26: `class="classified-border bg-bg-surface overflow-hidden card-hover" data-reveal style={\`animation-delay: ${i * 60}ms\`}`; map callback uses `(sector, i)` |
| `src/components/KomSegments.astro` | `card-hover` and `data-reveal` with stagger on card divs | VERIFIED | Line 19: same pattern as GravelSectors; map callback uses `(segment, i)` |
| `src/pages/index.astro` | `active:translate-y-px` on both Register Now CTAs | VERIFIED | Lines 220, 262: both CTAs have `active:translate-y-px active:scale-[0.98] motion-reduce:active:transform-none` |
| `src/components/EventInfoBlock.astro` | `active:translate-y-px` on Download GPX button | VERIFIED | Line 46: `active:translate-y-px active:scale-[0.98] motion-reduce:active:transform-none` present |
| `src/pages/index.astro` | Centralized IntersectionObserver script | VERIFIED | Lines 314-352: `initReveal()` sets `data-reveal-ready`, checks `prefers-reduced-motion`, creates observer with `rootMargin: "0px 0px -40px 0px"`, `threshold: 0.05`, calls `unobserve()` after first intersection |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/styles/global.css` | `GravelSectors.astro`, `KomSegments.astro` | `.card-hover` class on card containers | WIRED | Both component card divs carry `card-hover` class; CSS rule in `@layer components` applies `::after` shadow |
| `src/pages/index.astro` (IntersectionObserver script) | All `[data-reveal]` elements across components | `querySelectorAll("[data-reveal]")` | WIRED | Script at line 341 selects all `[data-reveal]` globally; sector/KOM cards and section headings all carry `data-reveal` attribute |
| `src/styles/global.css` (`@layer utilities`) | IntersectionObserver `.is-visible` toggle | `[data-reveal-ready] [data-reveal].is-visible { animation: var(--animate-reveal) }` | WIRED | CSS rule at line 260 triggers animation when script adds `.is-visible`; `data-reveal-ready` gate (line 257) ensures no-JS safety |
| `src/pages/index.astro` (script) | `<html>` element | `document.documentElement.setAttribute("data-reveal-ready", "")` | WIRED | Line 319 sets the attribute that activates CSS opacity: 0 hidden state; without this call, elements remain visible |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| VIS-09: Subtle hover animations on buttons and cards (brutalist-appropriate: hard shifts, not smooth easing) | SATISFIED | `card-hover` class uses `step-start` at `0ms` — instantaneous binary snap, no ease curves; no `transition-transform` or `ease-in-out` found on card hover states |
| VIS-10: Subtle load/entrance animations on sections as they scroll into view | SATISFIED | `@keyframes reveal` with IntersectionObserver scroll trigger on section headings and card lists; 60ms stagger cascade on cards |
| VIS-11: Click feedback animations on interactive elements | SATISFIED | `active:translate-y-px active:scale-[0.98]` on all 3 CTA/button targets (2x Register Now + 1x Download GPX) |

Note: VIS-09, VIS-10, VIS-11 remain marked `[ ]` in `REQUIREMENTS.md` — the checkboxes were not updated as part of this phase. This is a documentation gap, not a code gap.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | None found |

No TODO/FIXME, placeholder text, stub implementations, or compositor-unsafe transitions detected in any of the five modified files.

### Human Verification Required

#### 1. Lighthouse Mobile TBT Confirmation

**Test:** Run `npx lighthouse [prod-url] --preset=mobile --output=html` (or use Chrome DevTools Lighthouse panel against `localhost:4321` after `npm run dev`)
**Expected:** Total Blocking Time = 0ms
**Why human:** TBT is a runtime metric. While the code structure is TBT-safe by design (IntersectionObserver instead of scroll listeners; opacity + transform only; no layout-triggering transitions), only a Lighthouse run confirms the actual measurement. The previous TBT baseline from Phase 9 was also flagged as human_needed — this has never been confirmed programmatically.

### Gaps Summary

No gaps found. All five artifact categories are present, substantive, and wired. The single human_needed item is a performance measurement that cannot be verified by static analysis.

---

_Verified: 2026-03-28T00:27:37Z_
_Verifier: Claude (gsd-verifier)_
