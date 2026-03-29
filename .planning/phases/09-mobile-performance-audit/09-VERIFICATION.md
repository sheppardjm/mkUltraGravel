---
phase: 09-mobile-performance-audit
verified: 2026-03-27T06:01:11Z
status: human_needed
score: 4/5 must-haves verified automatically
re_verification: false
human_verification:
  - test: "Run Lighthouse mobile audit in Chrome DevTools (throttle: Slow 4G, mobile device preset) against the production build. Record LCP."
    expected: "LCP < 2.5 seconds"
    why_human: "LCP is a runtime measurement on a simulated network. The structural conditions that enable a fast LCP are verified in code (81KB WebP hero, fetchpriority=high, scroll-event deferred Leaflet/Chart.js, lazy thumbnails), but the actual measurement requires running Lighthouse."
---

# Phase 9: Mobile Performance Audit — Verification Report

**Phase Goal:** The site is confirmed usable on a real mobile device in outdoor conditions — no scroll traps, readable contrast, no animation jank, acceptable load times.
**Verified:** 2026-03-27T06:01:11Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Single-finger scroll past map without trap | VERIFIED | `gestureHandling: true` set in `RouteMap.astro:51`; `leaflet-gesture-handling` imported and CSS loaded via `global.css:10`; touch warning styles present at `global.css:167-172` |
| 2 | All body/large text passes WCAG AA contrast | VERIFIED | `--color-text-muted: oklch(0.62 0.01 90)` (raised from 0.55); `--color-accent-red: oklch(0.50 0.22 25)` (raised from 0.45); all 4 hardcoded Leaflet/PhotoSwipe values use `0.62`; no stale `0.55` literal remains in `global.css` |
| 3 | All CSS animations use only transform/opacity | VERIFIED | `transition-opacity` (2x CTA buttons); `transition-transform hover:scale-105` (gallery thumbnails); `transition-colors` (GPX link — background-color/color, paint-only); `animation: false` on Chart.js; `.stamp` uses static `transform: rotate(-3deg)` (not animated); no `transition-[top\|left\|width\|height\|margin\|padding]` found in any source file |
| 4 | LCP < 2.5s on simulated 4G mobile | ? HUMAN NEEDED | Structural conditions verified: `CIA-MKULTRA-IG_Page_01.webp` exists at 81KB; `fetchpriority="high"` on both preload link and img in `index.astro:17-32`; scroll-event lazy init for Leaflet and Chart.js confirmed in `RouteMap.astro:220-236` and `ElevationProfile.astro:162-175`; all gallery thumbnails `loading="lazy"`; tone images as WebP. Runtime measurement required. |
| 5 | Site layout functional/readable at 375px | VERIFIED | `width=device-width, initial-scale=1` viewport meta confirmed; all 5 sections use `overflow-hidden` + `px-4` horizontal padding; content uses `max-w-3xl`/`max-w-2xl` (not min-width constraints); gallery uses `grid-cols-2` at narrow (2-column); map uses `width: 100%`; no fixed px widths found that would overflow 375px |

**Score:** 4/5 truths verified automatically; 1 requires human Lighthouse run

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/styles/global.css` | WCAG token fixes + hardcoded value sync | VERIFIED | `--color-text-muted: oklch(0.62 ...)`, `--color-accent-red: oklch(0.50 ...)`, all 4 hardcoded uses updated to 0.62 |
| `src/components/RouteMap.astro` | scroll+IntersectionObserver lazy init | VERIFIED | scroll event (once, passive) + IntersectionObserver(rootMargin:0px) pattern at lines 220-236 |
| `src/components/ElevationProfile.astro` | scroll+IntersectionObserver lazy init | VERIFIED | Same two-stage pattern at lines 162-175; `animation: false` on Chart |
| `src/components/PhotoGallery.astro` | All thumbnails loading="lazy" | VERIFIED | All thumbnails use `loading="lazy" decoding="async"` (line 27); no eager thumbnails |
| `src/layouts/BaseLayout.astro` | favicon + Carto preconnect hints | VERIFIED | `<link rel="icon" href="/favicon.svg">` at line 23; 4x Carto `preconnect` at lines 27-30 |
| `src/pages/index.astro` | WebP preload + fetchpriority + tone WebP refs | VERIFIED | Preload link at lines 17-24 with `fetchpriority="high"`; hero img `fetchpriority="high"` at line 31; all 3 below-fold tone images reference `.webp` |
| `scripts/convert-hero.js` | Hero WebP conversion at 600px/q45 | VERIFIED | `resize(600, null)` + `.webp({ quality: 45 })` at lines 34-37; idempotent skip logic |
| `scripts/convert-tone-images.js` | Tone images to WebP (lsd, mkultra-lsd, escharian) | VERIFIED | 3 entries in TONE_IMAGES array with correct settings; atomic tmp-rename pattern |
| `scripts/generate-thumbnails.js` | 200px thumbnails | VERIFIED | `.resize(200, null)` at line 54 (docstring says 600px — stale comment, implementation is correct) |
| `scripts/generate-data.js` | Pipeline includes both conversion steps | VERIFIED | `convert-hero.js` called at line 63; `convert-tone-images.js` called at line 75 |
| `public/tone/CIA-MKULTRA-IG_Page_01.webp` | 81KB WebP hero | VERIFIED | 82,624 bytes (80KB) — within expected range |
| `public/tone/lsd-mind-control.webp` | 13KB WebP | VERIFIED | 13,004 bytes |
| `public/tone/Mkultra-lsd-doc.webp` | 56KB WebP | VERIFIED | 57,180 bytes |
| `public/tone/escharian_stairs_fb.webp` | 9KB WebP | VERIFIED | 9,372 bytes |
| `public/favicon.svg` | Non-empty SVG | VERIFIED | 223 bytes, valid SVG with rect + text |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `index.astro` preload link | `/tone/CIA-MKULTRA-IG_Page_01.webp` | `href` + `fetchpriority="high"` | VERIFIED | Lines 17-24; `as="image"`, `type="image/webp"` |
| `index.astro` hero img | `/tone/CIA-MKULTRA-IG_Page_01.webp` | `src` + `fetchpriority="high"` | VERIFIED | Lines 27-33 |
| `RouteMap.astro` init | Leaflet (deferred) | scroll event + IntersectionObserver | VERIFIED | `window.addEventListener('scroll', tryInitMap, { once: true, passive: true })` at line 222 |
| `ElevationProfile.astro` init | Chart.js (deferred) | scroll event + IntersectionObserver | VERIFIED | `window.addEventListener('scroll', tryInitElevation, ...)` at line 163 |
| `BaseLayout.astro` | Carto CDN | `<link rel="preconnect">` | VERIFIED | 4 subdomains preconnected (a/b/c/d) |
| `generate-data.js` | convert-hero.js | `execSync` | VERIFIED | Line 63 |
| `generate-data.js` | convert-tone-images.js | `execSync` | VERIFIED | Line 75 |
| `--color-text-muted` token | Leaflet/PhotoSwipe hardcoded uses | Synced value `0.62 0.01 90` | VERIFIED | `global.css:143,151,155,178` all use `0.62` — no stale `0.55` |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| PERF-01 (acceptable load times) | STRUCTURALLY MET / runtime confirmation needed | 81KB WebP hero, deferred 129KB Leaflet+Chart.js, 246KB total transfer — all optimization code in place. Lighthouse score 96/LCP 2.48s claimed in summary but requires human confirmation run. |
| PERF-02 (mobile usability) | VERIFIED | Scroll trap fix (GestureHandling), WCAG contrast, responsive layout at 375px, compositor-safe animations all confirmed in code |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `scripts/generate-thumbnails.js` | 4 | Stale docstring: says "600px-wide" but code uses 200px | Info | No functional impact — implementation is correct at 200px |
| `scripts/convert-hero.js` | 9 | Docstring says "quality 80" but code uses quality 45 | Info | No functional impact — implementation uses optimized 45; docstring predates the Plan 02 auto-fix deviation |

Both are documentation-only issues. No blocker anti-patterns found.

### Human Verification Required

#### 1. Lighthouse LCP Measurement

**Test:** Run `npm run build` then serve the `dist/` directory (e.g., `npx serve dist`). Open Chrome DevTools → Lighthouse → Mobile → Performance. Run audit with "Slow 4G" throttling.
**Expected:** LCP < 2.5 seconds; Performance score >= 90
**Why human:** LCP is a runtime metric under simulated network conditions. Static analysis can confirm all the structural prerequisites (WebP exists, fetchpriority set, Leaflet deferred via scroll event) but cannot simulate a browser rendering pipeline and network throttle.

### Gaps Summary

No gaps. All five success criteria have code-level support:

1. Scroll trap prevention — GestureHandling fully wired
2. WCAG contrast — both failing tokens corrected, hardcoded values synced, no stale values remain
3. CSS animation safety — all four custom transitions use only compositor-safe properties; Chart.js animation disabled; no layout-triggering properties animated anywhere in source
4. LCP performance — all structural prerequisites in place (WebP, fetchpriority, scroll-deferred Leaflet/Chart.js, lazy thumbnails, tone image WebP). Runtime measurement is the only remaining step.
5. 375px layout — viewport meta correct, all sections use overflow-hidden + responsive Tailwind classes, no fixed widths that would overflow

The single human_needed item (Lighthouse LCP run) is a confirmation step, not a remediation step. The structural work is complete.

---

_Verified: 2026-03-27T06:01:11Z_
_Verifier: Claude (gsd-verifier)_
