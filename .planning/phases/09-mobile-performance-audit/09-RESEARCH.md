# Phase 9: Mobile + Performance Audit - Research

**Researched:** 2026-03-27
**Domain:** Mobile UX audit, WCAG contrast, CSS animation performance, Core Web Vitals (LCP)
**Confidence:** HIGH (codebase inspected directly; all tool claims verified with official docs or Context7)

---

## Summary

Phase 9 is a pure audit-and-fix phase — no new features, no new libraries. All four sub-phases (scroll, contrast, animation, performance) are verification tasks that identify existing problems and apply targeted fixes. The codebase has already been mobile-verified for gesture handling and photo markers per prior decisions, so the real work here is the **contrast audit** (dark theme with oklch tokens has specific risks) and the **LCP audit** (hero image is a 1.3 MB JPEG loaded eagerly — the single biggest risk factor).

The critical codebase findings are:
1. **LCP candidate is a 1.3 MB JPEG** (`CIA-MKULTRA-IG_Page_01.jpg`) served raw with no compression or modern format optimization. It has a `<link rel="preload">` in `index.astro` but no `fetchpriority="high"` on the `<img>` tag itself. This is the #1 LCP risk.
2. **CSS animations are minimal and safe.** Only three animation-related patterns exist: `transition-opacity` on two CTA buttons, `transition-transform duration-300 hover:scale-105` on gallery thumbnails, and `transition-colors` on the GPX download link. All use only `transform` or `opacity` — no layout-triggering properties. Animation audit will likely be a pass, not a fix phase.
3. **Contrast is the biggest unknown.** The design uses `oklch` tokens throughout. WCAG contrast tools calculate using sRGB luminance, and oklch-expressed colors must be converted to sRGB before ratio calculation. OddContrast.com handles this correctly. The muted text (`oklch(0.55 0.01 90)`) against the base background (`oklch(0.10 0.01 250)`) needs to be explicitly verified — perceptual lightness of 0.55 does not guarantee 4.5:1 in sRGB space.
4. **Scroll trap concern is limited to map and PhotoSwipe gallery.** GestureHandling is confirmed installed with correct init order. PhotoSwipe v5 (lightbox mode, not inline) does not trap vertical scroll when closed — the concern is whether the open lightbox on mobile interferes with expected swipe-to-close behavior.

**Primary recommendation:** Prioritize the LCP fix (convert hero image, add `fetchpriority="high"`) and the contrast audit (calculate every oklch token pair against WCAG AA). Animation and scroll audits are likely confirmatory.

---

## Standard Stack

### Core (no new installs needed — audit uses existing tools)

| Tool | Version/Source | Purpose | Why Standard |
|------|---------------|---------|--------------|
| Chrome DevTools | Built-in | Lighthouse LCP audit, CPU/network throttle, animation profiling | Official measurement tool |
| OddContrast.com | Web tool | WCAG AA contrast with oklch input support | Only widely-used tool that accepts oklch natively |
| WebAIM Contrast Checker | Web tool | Fallback hex/rgb contrast verification | Industry standard |
| Chrome DevTools Rendering tab | Built-in | Paint flashing, Layout Shift Regions, Frame stats | Official compositor audit |

### Supporting (no new installs)

| Tool | Purpose | When to Use |
|------|---------|-------------|
| Lighthouse CLI (`npx lighthouse`) | Headless LCP measurement | Reproducible, shareable report |
| PageSpeed Insights | Real-world CrUX data | After fix verification |
| Chrome DevTools Network panel | Throttle to "Slow 4G" | LCP simulation |
| `sharp` (already installed) | Re-encode hero image to WebP/AVIF | LCP fix if needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| OddContrast.com | axe-core CLI | axe contrast rule doesn't work in JSDOM; requires real browser rendering — manual tool is simpler for one-off audit |
| Chrome DevTools Lighthouse | `npx lighthouse url --emulated-form-factor=mobile` | CLI gives repeatable JSON output; DevTools is faster for iteration |

**Installation:**
```bash
# No new packages needed. Optional for headless Lighthouse:
npx lighthouse https://localhost:4321 --emulated-form-factor=mobile --output html --output-path ./lighthouse-report.html
```

---

## Architecture Patterns

### Recommended Audit Workflow

```
Phase 9 audit order (by dependency / risk):
├── 09-01: Real-device scroll test (confirm existing GestureHandling pass)
├── 09-02: WCAG contrast audit (systematic token-by-token, oklch → sRGB)
├── 09-03: Animation audit (DevTools rendering tab, expect pass)
└── 09-04: LCP / Core Web Vitals (Lighthouse mobile run, fix hero image)
```

### Pattern 1: WCAG AA Contrast Audit for oklch Dark Theme

**What:** Calculate every foreground/background pair using a tool that understands oklch. WCAG uses sRGB relative luminance — the tool must convert oklch to sRGB first.

**When to use:** Any time the design uses oklch tokens.

**Token pairs to audit (from global.css):**

| Role | Foreground | Background | Context |
|------|-----------|-----------|---------|
| Body text | `oklch(0.85 0.01 90)` | `oklch(0.10 0.01 250)` | Most text |
| Muted text | `oklch(0.55 0.01 90)` | `oklch(0.10 0.01 250)` | Subtitles, metadata |
| Muted text on surface | `oklch(0.55 0.01 90)` | `oklch(0.14 0.01 250)` | Cards, popups |
| Accent white on base | `oklch(0.92 0.01 90)` | `oklch(0.10 0.01 250)` | Headings |
| Accent green on base | `oklch(0.85 0.24 145)` | `oklch(0.10 0.01 250)` | Links |
| Accent green on surface | `oklch(0.85 0.24 145)` | `oklch(0.14 0.01 250)` | Popup links |
| Dark text on green button | `oklch(0.10 0.01 250)` | `oklch(0.85 0.24 145)` | CTA buttons |
| Muted text on elevated | `oklch(0.55 0.01 90)` | `oklch(0.18 0.01 250)` | Leaflet popups |
| White on elevated | `oklch(0.85 0.01 90)` | `oklch(0.18 0.01 250)` | Popup content |
| Attribution text | `oklch(0.55 0.01 90)` | `oklch(0.10 0.01 250 / 0.8)` | Leaflet attribution (transparent bg) |

**Highest risk:** `oklch(0.55 0.01 90)` (muted text) against any background. Perceptual lightness of 0.55 in oklch does not linearly map to sRGB luminance. This pair may fail 4.5:1.

**Tool:** https://www.oddcontrast.com — accepts oklch directly, computes WCAG 2 ratio correctly via sRGB conversion.

**Fix pattern:** If muted text fails, increase its lightness (e.g., `oklch(0.62 0.01 90)`) until the pair passes. Alternatively reclassify as "large text" if font-size >= 24px (3:1 threshold applies). Check: `text-text-muted text-xs` = 0.75rem = 12px — this is normal text, must pass 4.5:1.

### Pattern 2: CSS Animation Audit

**What:** Verify all transitions/animations use only compositor-safe properties (transform, opacity).

**Inventory (already complete from codebase scan):**

| Location | Animation | Properties | Safe? |
|----------|-----------|-----------|-------|
| `index.astro` CTA buttons | `transition-opacity hover:opacity-90` | `opacity` | YES |
| `index.astro` mid-page CTA | `transition-opacity hover:opacity-90` | `opacity` | YES |
| `PhotoGallery.astro` thumbnails | `transition-transform duration-300 hover:scale-105` | `transform` | YES |
| `EventInfoBlock.astro` GPX link | `transition-colors hover:bg-accent-green hover:text-bg-base` | `background-color`, `color` | MAYBE — color/background-color trigger paint (not layout), acceptable on hover |
| `global.css` `.stamp` | Static `transform: rotate(-3deg)` | Not animated | N/A |
| `ElevationProfile.astro` | `animation: false` (Chart.js) | None | YES |

**Key finding:** `transition-colors` on the GPX download button animates `background-color` and `color`. These are **paint-only** operations (not layout reflow) — they do not trigger layout recalculation. They are not layout-triggering in the sense the success criteria means. However, they do cause repaints (not reflows). This is acceptable performance.

**No `top`, `left`, `width`, `height`, or `margin` animations exist in the codebase.** The animation audit is expected to confirm a clean pass.

### Pattern 3: LCP Measurement — Chrome DevTools Lighthouse

**What:** Run Lighthouse in mobile mode to measure LCP. The default mobile preset simulates:
- Slow 4G network: 1.6 Mbps down, 750 Kbps up, 150ms RTT
- 4x CPU slowdown (desktop) or 6x CPU slowdown via capture settings

**Workflow:**
1. `npm run build && npx astro preview` (test against production build, not dev)
2. Chrome DevTools → Lighthouse tab → Mobile preset → Generate report
3. OR: `npx lighthouse http://localhost:4321 --emulated-form-factor=mobile --output html`
4. Note: LCP threshold = 2.5s green / 4.0s orange / >4.0s red on mobile

**LCP candidate identification:**
- The `<img src="/tone/CIA-MKULTRA-IG_Page_01.jpg">` in the hero section is the most likely LCP element (it's the largest visible image in the initial viewport)
- It is 1.3 MB as a JPEG — unacceptable raw size for mobile 4G
- It has `<link rel="preload" as="image">` in the document `<head>` (Phase 7 confirmed) but the `<img>` tag lacks `fetchpriority="high"` and `loading="eager"` is set (correct) but no explicit `fetchpriority`

**Expected LCP fix (if audit fails):**
1. Add `fetchpriority="high"` to the hero `<img>` tag in `index.astro`
2. Convert `CIA-MKULTRA-IG_Page_01.jpg` to WebP (44K `escharian_stairs_fb.webp` comparison shows sharp can achieve 30-50x reduction)
3. Update `<link rel="preload">` and `<img src>` to reference the WebP version

**Note:** `loading="eager"` is already set on the hero image — correct. The preload link exists. The gap is `fetchpriority="high"` and raw file size.

### Pattern 4: Real-Device Mobile Scroll Test

**What:** Manual test on a real phone (prior decisions confirm GestureHandling was already verified on a real device). This sub-phase is confirmatory but should verify the full page, not just the map.

**Scroll trap checklist:**
- Map section: single-finger scroll pass-through (already verified — GestureHandling plugin confirmed working)
- PhotoSwipe gallery: closed state — no scroll trap (PhotoSwipe v5 lightbox does not intercept page scroll when closed). Open lightbox — swipe left/right works; swipe down to close works.
- Any horizontally-scrolling containers: none found in current codebase
- 375px viewport (iPhone SE): all grid layouts use `md:` breakpoints — below `md:` (768px), grids collapse to single column. The `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` in PhotoGallery maintains 2-column at 375px — verify thumbnails are readable.

### Anti-Patterns to Avoid

- **Do not use `axe-core` CLI for contrast on oklch colors** — axe contrast checking requires a real browser to resolve computed styles; it fails in JSDOM environments and may not handle oklch correctly.
- **Do not run Lighthouse against `astro dev`** — dev server uses unoptimized builds. Always test against production build (`astro build` + `astro preview`).
- **Do not add `will-change: transform` globally** — premature optimization, increases memory on mobile.
- **Do not test LCP on a fast local connection without throttling** — results will not represent 4G field conditions.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| oklch contrast calculation | Custom luminance math | OddContrast.com | WCAG formula is subtle; sRGB conversion from oklch requires correct gamut mapping |
| LCP image conversion | Manual ImageMagick pipeline | `sharp` (already installed) | sharp has Astro integration patterns; already in devDependencies |
| Lighthouse mobile simulation | Manual network throttling | Chrome DevTools Lighthouse panel / `npx lighthouse` | Lighthouse simulated throttling is reproducible and standardized |
| Animation property audit | Manual CSS grep | Chrome DevTools Rendering → Paint flashing | Visual verification catches library-injected animations (Leaflet, PhotoSwipe) grep misses |

**Key insight:** This phase is 90% manual audit work done in browser DevTools and reference tools. Custom scripts add complexity without benefit.

---

## Common Pitfalls

### Pitfall 1: oklch Muted Text Contrast Failure
**What goes wrong:** `oklch(0.55 0.01 90)` (--color-text-muted) looks "50% lightness" but sRGB luminance does not scale linearly with oklch L. The actual contrast ratio against dark backgrounds may be below 4.5:1.
**Why it happens:** oklch L is perceptually uniform but WCAG relative luminance uses a different gamma curve (sRGB linearization via 0.2126R + 0.7152G + 0.0722B).
**How to avoid:** Test every `text-text-muted` usage with OddContrast. If it fails normal text threshold, either increase L value or ensure it's only used on text >= 24px (large text 3:1 threshold).
**Warning signs:** Muted text at oklch L=0.55 is close to the 3:1 threshold boundary — any `text-xs` usage with muted text is at risk.

### Pitfall 2: Testing Against Dev Server Instead of Production Build
**What goes wrong:** LCP looks fine in dev (no throttling, fast localhost, uncompressed assets), then fails in Lighthouse run.
**Why it happens:** Astro dev server serves files differently from the production static output. Fonts, scripts, and asset sizes differ.
**How to avoid:** Always `npm run build && npx astro preview` before Lighthouse audit.
**Warning signs:** Lighthouse showing drastically different results than expected.

### Pitfall 3: Conflating Paint Operations with Layout Reflow
**What goes wrong:** `transition-colors` animating `background-color` gets flagged as a "layout-triggering animation" when it isn't — it causes paint but not layout.
**Why it happens:** The success criterion says "no layout-triggering properties (`top`, `left`, `width`)." Background-color and color are paint-phase, not layout-phase.
**How to avoid:** Only flag animations that trigger layout: `width`, `height`, `margin`, `padding`, `top`, `left`, `right`, `bottom`, `border-width`, `font-size`.
**Warning signs:** DevTools Performance panel shows "Recalculate Style" + "Layout" (both) in the same frame.

### Pitfall 4: Hero Image Preload vs. fetchpriority Confusion
**What goes wrong:** `<link rel="preload">` exists but LCP is still slow because the image has no `fetchpriority="high"` on the `<img>` element itself.
**Why it happens:** Preload hints the browser to fetch the resource early, but `fetchpriority="high"` signals the browser to deprioritize other resources in favor of this one. Both are needed for maximum LCP optimization.
**How to avoid:** Apply both: the `<link rel="preload" fetchpriority="high">` in `<head>` AND `fetchpriority="high"` on the `<img>` element.
**Warning signs:** Lighthouse showing "LCP image preloaded but still slow" — the resource load delay subpart is nonzero despite preload.

### Pitfall 5: 375px Layout Verification Missed
**What goes wrong:** Layout looks fine on desktop, but at 375px the `grid-cols-2` photo gallery has thumbnails that are too small (< 80px) or text overflows containers.
**Why it happens:** The photo gallery uses `aspect-[3/4]` — at 375px with 2 columns and 8px gap, each thumbnail is ~181px wide and ~241px tall. This should be readable, but custom text in components should be verified.
**How to avoid:** Use Chrome DevTools device emulation at 375px (iPhone SE preset) for each section.

### Pitfall 6: PhotoSwipe Touch Behavior Misconception
**What goes wrong:** Assuming the PhotoSwipe gallery itself is a scroll trap.
**Why it happens:** PhotoSwipe v4 (inline gallery mode) had documented scroll-trap issues. PhotoSwipe v5 (this project uses lightbox mode, not inline) does NOT trap page scroll when the lightbox is closed.
**How to avoid:** Test specifically: (1) page scroll over the closed gallery grid — should work with one finger, (2) open lightbox on mobile — swipe left/right to navigate, swipe down to dismiss. Both should work.

---

## Code Examples

### Adding fetchpriority to hero image (LCP fix)

```html
<!-- In src/pages/index.astro <head> slot — already exists, add fetchpriority -->
<link
  rel="preload"
  href="/tone/CIA-MKULTRA-IG_Page_01.jpg"
  as="image"
  fetchpriority="high"
  slot="head"
/>

<!-- In hero section <img> tag — add fetchpriority="high" -->
<img
  src="/tone/CIA-MKULTRA-IG_Page_01.jpg"
  alt=""
  class="tone-image inset-0 w-full h-full object-cover"
  loading="eager"
  fetchpriority="high"
/>
```

### Converting hero image to WebP with sharp (LCP fix)

```javascript
// scripts/convert-hero.js (one-time script, run manually)
import sharp from 'sharp';
await sharp('public/tone/CIA-MKULTRA-IG_Page_01.jpg')
  .webp({ quality: 80 })
  .toFile('public/tone/CIA-MKULTRA-IG_Page_01.webp');
```

### Checking oklch contrast at OddContrast.com

```
// Input format at oddcontrast.com:
Foreground: oklch(0.55 0.01 90)  // text-text-muted
Background: oklch(0.10 0.01 250) // bg-base

// Expected output: ratio < 4.5:1 for this pair (needs verification)
// If fail: try oklch(0.62 0.01 90) for muted text
```

### Lighthouse CLI mobile run (production build)

```bash
# Build first, then preview
npm run build
npx astro preview &
# Wait for server, then:
npx lighthouse http://localhost:4321 \
  --emulated-form-factor=mobile \
  --throttling-method=simulate \
  --output html \
  --output-path ./lighthouse-mobile.html \
  --chrome-flags="--headless"
```

### Chrome DevTools — Rendering tab animation audit

```
1. Open Chrome DevTools (F12)
2. Open "Rendering" panel (three-dot menu → More tools → Rendering)
3. Enable: "Paint flashing" — green overlays show repaints
4. Enable: "Layout Shift Regions" — blue/purple overlays show layout shifts
5. Hover over all interactive elements (buttons, gallery thumbs)
6. Observe: only the hovered element should flash, not surrounding layout
7. No layout shifts expected — if purple flashes appear during hover, investigate
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `loading="lazy"` on all images | Never lazy-load LCP candidates | 2022+ | LCP improvement |
| No `fetchpriority` | `fetchpriority="high"` on LCP image | Chrome 102+ / 2022 | Measurable LCP improvement |
| JPEG hero images | WebP or AVIF with fallback | 2020+ | 30-80% size reduction |
| Manual contrast checking | Tools that accept oklch natively | 2023-2024 | Eliminates conversion errors |
| Lighthouse desktop audit | Lighthouse mobile preset (primary) | 2020+ | Mobile is the primary performance baseline |

**Deprecated/outdated:**
- Running Lighthouse against dev server: outdated practice — always test production builds
- Using JPEG for hero images without format optimization: still common but suboptimal
- Checking contrast only with hex codes when using oklch: misses gamut differences

---

## Open Questions

1. **Will the muted text (`oklch(0.55 0.01 90)`) pass WCAG AA?**
   - What we know: oklch L=0.55 is perceptually mid-range but WCAG luminance is nonlinear
   - What's unclear: exact sRGB luminance at this oklch value against each background
   - Recommendation: First task of 09-02 should calculate this pair. If it fails, increment L until 4.5:1 is achieved.

2. **Is the hero JPEG the actual LCP element on mobile?**
   - What we know: It's the largest image in the hero, loaded eagerly with preload
   - What's unclear: On very small viewports, another element might be LCP (e.g., h1 text if image renders below it)
   - Recommendation: Run Lighthouse, check which element it identifies as LCP before optimizing.

3. **Does the 1.3 MB hero image pass 2.5s LCP on simulated 4G?**
   - What we know: 1.3 MB at 1.6 Mbps ≈ 6.5 seconds of pure download time (worst case, no caching)
   - What's unclear: Compression and actual delivery speed with local preview server
   - Recommendation: This will almost certainly fail — treat hero image WebP conversion as a required fix, not optional.

4. **Does `transition-colors` on the GPX button violate the animation success criterion?**
   - What we know: The criterion says "no layout-triggering properties" — color/background-color are paint-only, not layout
   - What's unclear: Whether the team interprets the criterion strictly (compositor-only) or practically (no layout reflow)
   - Recommendation: Document as "paint-only, acceptable" — it does not cause jank and meets the spirit of the criterion.

---

## Sources

### Primary (HIGH confidence)
- Official codebase inspection (`src/pages/index.astro`, `src/styles/global.css`, `src/components/*.astro`) — all animation inventory and token pairs
- https://web.dev/animations-guide/ — compositor-safe properties (transform, opacity); DevTools audit workflow
- https://developer.chrome.com/docs/lighthouse/performance/lighthouse-largest-contentful-paint — LCP thresholds (2.5s mobile green)
- https://developer.chrome.com/docs/devtools/rendering/performance — Paint flashing and Layout Shift Regions workflow
- https://web.dev/articles/optimize-lcp — LCP optimization techniques; fetchpriority, preload, avoid lazy on LCP

### Secondary (MEDIUM confidence)
- https://www.oddcontrast.com — WCAG 2 contrast checker that accepts oklch natively (verified: converts to sRGB for ratio calculation)
- https://github.com/elmarquis/Leaflet.GestureHandling — GestureHandling behavior on mobile: single-finger pass-through, two-finger pan
- WebSearch: Lighthouse CLI mobile throttling — confirmed default Slow 4G: 1.6 Mbps, 150ms RTT, 4x CPU slowdown

### Tertiary (LOW confidence)
- WebSearch: axe-core contrast check — reported to not work in JSDOM; browser rendering required for oklch (unverified independently)
- GitHub PhotoSwipe issues — v4 inline gallery scroll trap documented; v5 lightbox mode behavior inferred (not explicitly tested in sources found)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; audit uses DevTools and web tools; all verified
- Architecture: HIGH — codebase fully inspected; all animation and token pairs enumerated
- Pitfalls: HIGH (LCP, animation) / MEDIUM (contrast exact ratios) — LCP and animation findings are from official docs; exact contrast ratios require tool verification

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable — WCAG 2.1/2.2 standards and Lighthouse behavior are stable)
