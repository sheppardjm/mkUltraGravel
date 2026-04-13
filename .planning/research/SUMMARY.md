# Project Research Summary

**Project:** MK Ultra Gravel — v10.6 Milestone
**Domain:** Static Astro 6 dark-themed site — editorial explainer redesign + Chart.js annotation label fix
**Researched:** 2026-04-13
**Confidence:** HIGH

## Executive Summary

This milestone has two independent workstreams that share the page but do not interact at the code level. The first is a magazine editorial redesign of `GrinduroExplainer.astro` — replacing a plain `classified-border` text block with a layout that interleaves CSS-filtered tone images between paragraphs, closer to the action sports editorial conventions already present elsewhere on the site. The second is a one-line bug fix to `ElevationProfile.astro` that restores the Down Jeep sector name in its annotation label. Both workstreams are fully resolvable with the existing stack and design system; no new packages, no build pipeline changes for the likely image choice, and no new JavaScript.

The recommended approach is to fix the elevation label first (one-line conditional removal, isolated, near-zero risk), then redesign the explainer (15–30 lines, moderate layout surgery). The architecture research confirms a canonical pattern already exists in `MkUltraExplainer.astro` — the redesign is an application of that pattern to a sub-section component, not an invention of something new. CSS Grid full-bleed with two tone image breaks, filter Recipe A and Recipe D, and `data-reveal` entrance animations represents a complete MVP.

The primary risks are containment-related: the `.tone-image` class uses `position: absolute` and will escape to the wrong containing block if its parent lacks `position: relative`. A secondary risk is stacking context collision with the three fixed overlay layers (z-9997 through z-9999). Both risks are well-understood, have established mitigation patterns, and produce visually obvious failures that are caught immediately in development. Overall confidence is HIGH — all findings are derived from direct codebase inspection and official documentation.

---

## Key Findings

### Recommended Stack

No new packages are required. The entire milestone resolves within the existing stack: Astro 6.1.1 for component authoring, Tailwind v4.2.2 for utility CSS (filter utilities, grid, blend mode classes), Chart.js 4.5.1 with chartjs-plugin-annotation 3.1.0 for the elevation annotation fix. The 10 already-optimized WebP images in `public/tone/` are available for immediate use; `square-limit-mc-escher.webp` is present but currently unused and is the recommended first choice for the Grinduro explainer.

**Core technologies:**
- **Astro 6.1.1:** Static site generation; `GrinduroExplainer.astro` is modified in place, no new component created
- **Tailwind v4.2.2:** Filter utilities (`grayscale`, `contrast-[val]`, `invert`, `mix-blend-*`), grid, opacity; arbitrary bracket syntax covers multi-value filter chains
- **Chart.js 4.5.1 + chartjs-plugin-annotation 3.1.0:** Label sub-object API has all required properties (`rotation`, `position`, `xAdjust`, `yAdjust`, `content`); fix is config-only, no upgrade needed
- **CSS filter (native):** Baseline Widely Available since September 2016; GPU-composited, zero JS cost; all recipes achievable without `sharp` or Canvas
- **`sharp` prebuild pipeline:** Already in place at step 7 of `generate-data.js`; extend only if a new source image from `images/tone/` needs optimization

### Expected Features

**Must have (table stakes for magazine editorial feel):**
- Full-bleed image breaks between paragraphs — the defining cadence of action sports editorial
- CSS Grid full-bleed layout wrapper — enables image breaks to escape the text column constraint
- CSS-filtered tone images — the design system language already established by the rest of the site
- `position: relative` wrapper on `GrinduroExplainer.astro` — required to scope absolute-positioned tone images
- Down Jeep annotation label showing sector name — the original `isNarrow` conditional stripped the name erroneously

**Should have (editorial differentiators):**
- Drop cap on first paragraph via `::first-letter` (Special Elite, float-left, 3em — cross-browser safe; `initial-letter` not Baseline, avoid)
- Pull quote between paragraphs 2 and 3 — "Race the sectors. Suffer together." in accent-green with slight negative rotation
- `data-reveal` on tone image containers for standard scroll-reveal entrance (free via existing IntersectionObserver)
- Figure captions (one-line source attribution in `text-text-muted text-xs uppercase`)
- Varied filter chains per image break — Recipe A (CIA document) and Recipe D (hard noir) are distinct enough to signal curation

**Defer:**
- Slight image rotation (`transform: rotate(-1deg)`) — nice texture, very low priority
- Parallax or scroll-triggered motion — anti-pattern per NN/g; existing fixed overlay layers handle ambient motion
- Additional tone image pipeline entries — `square-limit-mc-escher.webp` already exists, no pipeline change needed

### Architecture Approach

`GrinduroExplainer.astro` is modified in place (no new component). The structural change adds a `relative overflow-hidden` wrapper div (the component currently has none), moves the content div to `relative z-10`, and inserts a `.tone-image` `<img>` as the first child. The magazine editorial layout builds from there using CSS Grid full-bleed — a grid wrapper with `1fr [content-column] 1fr` columns, text paragraphs in the center column, `.full-bleed` image break containers spanning the full row. The elevation fix is a single-line change on `ElevationProfile.astro`: remove the ternary that was omitting `sector.name` from `labelContent` for narrow sectors.

**Major components and their changes:**

1. **`GrinduroExplainer.astro`** — Primary redesign target; add `relative overflow-hidden` wrapper, tone image, CSS Grid full-bleed structure, image breaks between paragraphs
2. **`ElevationProfile.astro`** — Bug fix; `labelContent` ternary becomes unconditional `[sector.name, starsStr]`; `isNarrow` variable stays for `rotation` logic
3. **`global.css`** — No changes needed; `.tone-image` baseline is correct as-is
4. **`MkUltraExplainer.astro`** — Unchanged; serves as the canonical reference pattern for the redesign

### Critical Pitfalls

1. **Missing `position: relative` on tone image parent** — `.tone-image` is `position: absolute`; without a `relative` ancestor the image escapes to the nearest positioned ancestor (potentially `<body>`). Add `relative overflow-hidden` as the outermost wrapper. Verify via DevTools "Containing Block" panel.

2. **Stacking context collision with fixed overlay layers** — Grain (z-9999), escher (z-9998), lizard (z-9997) use `will-change: transform`. New wrappers must NOT use `opacity < 1`, `transform`, or `isolation: isolate` without explicit `z-index`. Use `relative z-10` for content — established pattern on every existing section.

3. **Down Jeep fix may already be in place** — A prior session may have removed the `isNarrow` ternary. Read `ElevationProfile.astro` line 66 before writing a plan; if `[sector.name, starsStr]` is already unconditional, the phase is visual verification only.

4. **Down Jeep label invisible at mobile (< 640px)** — `display: () => window.innerWidth >= 640` suppresses ALL sector labels at mobile. The fix adds the name but it stays invisible at 375px. Decide and document mobile behavior before closing the phase.

5. **In-flow images without `width`/`height` cause CLS regression** — If any tone images enter normal document flow (vs. remaining `position: absolute`), omitting dimensions causes layout shift. Site currently has CLS < 0.1. Use wrapper with explicit `aspect-ratio`, image absolutely positioned inside.

---

## Implications for Roadmap

Two phases. Independent. Architecture research explicitly recommends the elevation fix first.

### Phase 1: Down Jeep Annotation Label Fix

**Rationale:** Independent of all explainer work. Root cause fully diagnosed. Shipping first gives a clean baseline before layout surgery. If the fix is already in place from a prior session, this phase collapses to visual QA.

**Delivers:** Down Jeep sector name visible in elevation profile annotation at desktop viewports (>= 640px). Mobile suppression behavior documented.

**Addresses:** FEATURES.md "Elevation Label Fix" scope; PITFALLS Pitfalls 5 and 6.

**Avoids:** Conflating a chart annotation bug with layout regressions from the explainer redesign — keeping these separate prevents ambiguous debugging.

**Implementation size:** 1 line changed + visual QA. Near-zero risk.

**Research flag:** No research needed during planning. Root cause fully diagnosed in `.planning/debug/down-jeep-label.md` and ARCHITECTURE.md. Standard implementation.

---

### Phase 2: GrinduroExplainer Magazine Editorial Redesign

**Rationale:** Depends on stable baseline (Phase 1 done). Layout surgery with clear canonical reference pattern in `MkUltraExplainer.astro`. All implementation details specified in research; this is assembly work.

**Delivers:** `GrinduroExplainer.astro` with CSS Grid full-bleed layout, two tone image breaks between paragraphs using filter Recipes A and D, drop cap, pull quote, and `data-reveal` scroll-reveal entrance.

**Addresses:** FEATURES.md P1 (full-bleed breaks, Grid layout, filter recipes) and P2 (drop cap, pull quote, captions).

**Avoids:** Pitfall 1 (containment — `relative overflow-hidden` wrapper required first), Pitfall 8 (stacking context — `relative z-10`, no `isolation: isolate`), Pitfall 10 (lighten blend on dark background only), Pitfall 7 (WebP images only from `public/tone/`).

**Implementation size:** 15–30 lines changed/added in `GrinduroExplainer.astro`. No other files change if `square-limit-mc-escher.webp` is the image choice.

**Internal order within Phase 2:** (1) Add `relative overflow-hidden` wrapper + tone image + `relative z-10` content — verify containment before proceeding. (2) Implement CSS Grid full-bleed and two image breaks. (3) Add drop cap + pull quote + captions.

**Research flag:** No research needed during planning. All patterns fully specified. Standard implementation — apply `MkUltraExplainer.astro` canonical pattern.

---

### Phase Ordering Rationale

- ARCHITECTURE.md explicitly recommends elevation fix first: "independent, debugged, root-caused, no interaction surface with the explainer work"
- Explainer layout surgery (relative wrappers, z-index management, blend mode behavior) could mask or interact with chart bugs if both workstreams are active simultaneously
- The editorial redesign has a clear dependency tree (containment first, grid second, flourishes third) that benefits from incremental visual verification at each step
- Both phases are fully contained within their respective component files — no cross-phase dependencies

### Research Flags

Phases with standard patterns (skip research-phase):
- **Phase 1 (elevation fix):** Root cause fully diagnosed; implementation is one conditional removal
- **Phase 2 (explainer redesign):** Canonical pattern exists in codebase; CSS properties fully documented; no novel integration

No phases require `/gsd:research-phase` during planning. All required knowledge is in the four research files.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official docs (MDN, Tailwind, chartjs-plugin-annotation) + direct codebase inspection. No ambiguity. |
| Features | HIGH (CSS), MEDIUM (editorial conventions) | CSS properties fully verified via spec. Editorial conventions (what reads as "magazine") are judgment calls from community sources — directionally correct. |
| Architecture | HIGH | 100% direct codebase inspection. File paths, line numbers, component structure, and data flow all verified from source. |
| Pitfalls | HIGH | Primary: direct codebase inspection + official plugin docs. Filter/sRGB color space behavior spec-confirmed via MDN. CLS behavior from web.dev. |

**Overall confidence:** HIGH

### Gaps to Address

- **Down Jeep fix state:** Read `ElevationProfile.astro` line 66 as the first planning action for Phase 1. If `[sector.name, starsStr]` is already unconditional, the phase is QA-only. Plan must not assume the fix is absent.

- **Down Jeep mobile behavior:** The `window.innerWidth >= 640` threshold suppressing all labels at mobile is an existing product decision. Whether the Down Jeep fix should extend label visibility to mobile is unspecified. This is a product decision, not a technical one — decide during Phase 1 planning.

- **Tone image selection for editorial breaks:** Research recommends `square-limit-mc-escher.webp` (available, unused) as the first image. The second image and final filter recipe assignments require a visual judgment call during implementation. No technical gap — design intent gap only.

- **`classified-border` removal vs. restructure:** The current outer `classified-border` wrapper on `GrinduroExplainer.astro` cannot coexist with full-bleed image breaks. Phase 2 plan must explicitly state whether the box is removed from the outer wrapper (recommended) or restructured to allow breaks. ARCHITECTURE.md recommends removal; FEATURES.md confirms the box conflicts with full-bleed.

---

## Sources

### Primary (HIGH confidence)
- MDN: CSS filter — all 10 filter functions, sRGB color space, Baseline Widely Available since 2016, filter order semantics
- MDN: mix-blend-mode — blend mode values, dark background behavior, stacking context
- chartjs-plugin-annotation 3.1.0 official docs (box annotation, label type, configuration) — complete label sub-object API, chart-area-only clip behavior
- Tailwind CSS docs (mix-blend-mode, filter utilities) — utility class names, arbitrary value bracket syntax
- web.dev: Optimize CLS — absolute positioned images do not contribute to CLS; in-flow images without dimensions do
- Direct codebase inspection: `GrinduroExplainer.astro`, `ElevationProfile.astro`, `MkUltraExplainer.astro`, `BaseLayout.astro`, `global.css`, `index.astro`, `convert-tone-images.js`, `generate-data.js`, `public/data/annotations.json`, `.planning/debug/down-jeep-label.md`, `public/tone/` file inventory

### Secondary (MEDIUM confidence)
- Josh W. Comeau: CSS full-bleed layout — CSS Grid full-bleed technique with named columns
- Smashing Magazine: Magazine Layout with CSS Grid Areas — editorial grid patterns
- DEV Community: CSS Image Filters Guide 2025 — filter combination recipes
- NN/g: Parallax Usability — parallax anti-pattern and scrolljacking UX problems

### Tertiary (LOW confidence, conventions only)
- Beamtic: Avoid Scrolljacking — consistent with NN/g finding
- caniuse.com: CSS initial-letter — Firefox missing; `::first-letter` confirmed as safe alternative (97%+ support)

---
*Research completed: 2026-04-13*
*Ready for roadmap: yes*
