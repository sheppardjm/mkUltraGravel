# Project Research Summary

**Project:** MK Ultra Gravel
**Domain:** Cycling event website — UI polish, navigation, and admin tooling
**Milestone:** v6.0 — Sector labels on elevation profile, site navigation, color consistency, KOM/QOM input tool
**Researched:** 2026-03-30
**Confidence:** HIGH

---

## Executive Summary

This milestone is a targeted polish pass on an already-complete Astro 6 static site. All four features are buildable with zero new npm dependencies: `chartjs-plugin-annotation` v3.1.0 (already installed) supports box annotation labels natively; site navigation uses Astro's built-in `Astro.url.pathname`; color consistency is solved by extracting a shared `src/lib/colors.js` ES module; and the KOM/QOM input tool is a plain Node.js script writing to a new `scripts/kom-times.json` data file. The recommended approach for each feature is the simplest option that avoids future divergence — no new libraries, no web admin surfaces, no CSS custom properties where JS hex strings are required.

The two highest-impact features are sector labels on the elevation profile and the site navigation header. The site currently has five named sections and a `/results` page with no navigation between them — a significant UX gap. The elevation profile has colored sector bands that are anonymous: no names, no star ratings visible on the chart. Both features have well-established implementation patterns (`aria-current` nav active state, chartjs-plugin-annotation box labels) with high-confidence research backing. The main technical nuance for sector labels is that the research diverges on implementation approach: STACK.md demonstrates a chartjs-plugin-annotation `label` sub-object approach with staggered `yAdjust`, while FEATURES.md and ARCHITECTURE.md recommend a CSS overlay strip below the canvas (the Paris-Roubaix roadbook pattern). Both are fully researched; the planning phase must choose between them before writing implementation steps.

The critical risk for this milestone is data durability. The prebuild pipeline (triggered by both `npm run dev` and `npm run build`) overwrites `annotations.json` on every run from a hardcoded source. KOM/QOM times entered directly into that file are silently lost at the next pipeline run. The correct architecture is a separate `scripts/kom-times.json` data file that `resolve-annotations.js` reads and merges into its output — ensuring times survive repeated pipeline runs. A secondary structural risk is z-index: the existing layout has texture overlays at z-index 9998–9999; a fixed navigation bar must be set to z-index 10000 or it will be invisible beneath the grain texture.

---

## Key Findings

### Recommended Stack

This milestone adds no new npm packages. All features extend the existing stack: Astro 6, Tailwind v4, Chart.js with chartjs-plugin-annotation v3.1.0, Leaflet 1.9, and plain Node.js scripts in `scripts/`. The only new files are `src/lib/colors.js` (shared color tokens) and `scripts/kom-times.json` (KOM time data). Net new npm dependencies: 0.

See [STACK.md](STACK.md) for verified API details, configuration examples, and the full "What NOT to Add" rationale.

**Core technologies:**
- `chartjs-plugin-annotation` v3.1.0: sector labels via `label` sub-object on box annotations — already installed, API verified from installed source at `node_modules/chartjs-plugin-annotation/dist/chartjs-plugin-annotation.esm.js`
- `Astro.url.pathname` (built-in): active nav state determined at build time per page — no JavaScript required, no flash of unstyled content; confirmed via official Astro API reference
- `src/lib/colors.js` (new shared module): replaces 3 identical inline `starColors` definitions; importable in both Astro frontmatter and `<script>` tags via Vite bundling — matches existing `src/lib/scoring.js` pattern
- `scripts/kom-times.json` (new data file): KOM/QOM time source that survives pipeline runs; read and merged by `resolve-annotations.js` into `annotations.json`

### Expected Features

See [FEATURES.md](FEATURES.md) for full analysis including implementation notes and feature dependencies.

**Must have (table stakes):**
- Sector labels on elevation profile — colored bands without names are anonymous; professional cycling altimetry convention labels each zone
- Navigation header with section + page links — the site has no wayfinding to its own sections or `/results` page; the most visible UX gap
- Active nav state on current page — standard expectation; must be done at build time (not client-side JS) to avoid flash of unstyled content
- KOM/QOM times populated on KOM cards — display is already implemented in `KomSegments.astro`; times just need to be entered and survive the pipeline

**Should have (differentiators):**
- Sector label strip styled to echo Paris-Roubaix roadbook aesthetic — proportional-width label band below chart, star glyph + name, star color palette
- Nav visual styling consistent with dark brutalist design system — `bg-bg-surface`, `border-border`, `text-accent-green` for active state; Space Mono font
- `/results` page discovery via nav header — currently undiscoverable without a direct URL; post-race it becomes the primary content

**Defer (v2+):**
- Navigation scroll-triggered animations (shrink on scroll, section highlighting via IntersectionObserver) — adds complexity; not needed before race day
- Results page enhancements — page is empty pre-race; polish is only visible post-June 7
- Interactive CLI with prompts/readline — KOM times updated once per year; a JSON file is lower friction than a CLI

**Anti-features (explicitly excluded):**
- Web-based admin UI for KOM/QOM times — enormous scope for 6 time strings per year; local CLI script is the correct tool
- Chartjs-plugin-annotation labels embedded within sector bands at `position: 'start'` — visual collision with KOM labels already at the top of the chart; overlaps elevation fill at 140px chart height
- CSS custom properties for star colors — Chart.js and Leaflet consume hex strings; CSS variables cannot be passed to canvas APIs

### Architecture Approach

All four features are additive changes that follow established patterns in the codebase. The architecture is: static Astro pages with shared `BaseLayout.astro`, Chart.js and Leaflet components lazy-initialized via IntersectionObserver, a prebuild pipeline (`scripts/generate-data.js`) producing `public/data/*.json` artifacts, and a `src/lib/` directory for shared utilities. Navigation slots into `BaseLayout.astro` before `<slot />`; the color module slots into the `src/lib/` pattern already established by `scoring.js`; sector labels slot into the existing `annotationBoxes` forEach loop in `ElevationProfile.astro`; the KOM tool slots into the `scripts/` pattern.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full component inventory, data pipeline diagram, CustomEvent bus documentation, and build order rationale.

**Components touched or created:**
1. `src/layouts/BaseLayout.astro` — add `<SiteNav />` render; existing `<slot />` and `<slot name="head" />` unchanged
2. `src/components/SiteNav.astro` (new) — nav markup with build-time `aria-current` active state via `Astro.url.pathname`
3. `src/components/ElevationProfile.astro` — add `label` sub-object to each `sector_N` annotation; optionally add CSS overlay strip below `<canvas>`
4. `src/components/RouteMap.astro`, `ElevationProfile.astro`, `GravelSectors.astro` — replace inline `starColors` with import from `src/lib/colors.js`
5. `src/lib/colors.js` (new) — shared `STAR_COLORS` export
6. `scripts/resolve-annotations.js` — read `scripts/kom-times.json` and merge `komTime`/`qomTime` into koms array
7. `scripts/kom-times.json` (new) — KOM/QOM time data source
8. `scripts/set-kom-times.js` (new, optional) — CLI tool to update `kom-times.json` with validation

### Critical Pitfalls

See [PITFALLS.md](PITFALLS.md) for all 13 pitfalls with verification sources, warning signs, and phase-specific warnings table.

1. **Pipeline overwrites KOM/QOM times** (CRITICAL) — `annotations.json` is regenerated on every `npm run dev` and `npm run build`, silently erasing any times written directly to it. Input tool MUST write to `scripts/kom-times.json` (source), never to `annotations.json` (artifact). Verified by reading `package.json` dev script and `resolve-annotations.js` overwrite logic.

2. **Annotation plugin register order** (CRITICAL, regression risk) — `Chart.register(AnnotationPlugin)` must precede `new Chart(...)`. Reordering imports or awaits during label edits silently removes all annotations with no runtime error. The existing codebase is correct — do not move the register call. Verified via official chartjs-plugin-annotation docs and the existing codebase comment.

3. **Nav z-index below texture overlays** (HIGH) — `grain-overlay` sits at z-index 9999, `escher-overlay` at 9998 in `global.css`. A fixed nav bar without z-index 10000 is completely covered by the grain texture. Verified by direct inspection of `BaseLayout.astro` and `global.css`.

4. **Label `drawTime` obscured by dataset line** (HIGH) — Box annotations using `drawTime: 'beforeDatasetsDraw'` draw their labels at the same lifecycle point, placing label text under the elevation line. Add `label.drawTime: 'afterDatasetsDraw'` explicitly on all sector and KOM box annotations. Verified via chartjs-plugin-annotation GitHub issue #243 and PR #275.

5. **oklch colors in Chart.js/Leaflet** (MODERATE) — Chart.js animation interpolation and Leaflet polyline options cannot parse oklch color strings or CSS `var()` references. Keep all annotation `backgroundColor`, `borderColor`, and Leaflet `color` values as hex strings. The existing codebase is safe; risk is regression during future edits. Verified via Chart.js GitHub issue #12101.

---

## Implications for Roadmap

Based on combined research, the suggested phase structure for v6.0 is four focused single-concern phases in dependency order:

### Phase 1: Color Consistency — Extract Shared Token Module
**Rationale:** Prerequisite audit before adding sector labels. Establishes `src/lib/colors.js` which the label phase imports. Zero behavior change; lowest risk phase; high confidence in approach. Completing this first ensures label colors are authoritative before they are displayed on the chart.
**Delivers:** `src/lib/colors.js` with `STAR_COLORS` export; three components updated to import from it; verified visual parity (no color change, only source consolidation)
**Addresses:** Color consistency table-stakes feature; eliminates future divergence risk across map, chart, and sector cards
**Avoids:** Pitfall 9 (color drift between canvas and CSS), Pitfall 5 (oklch in Leaflet)
**Research flag:** None needed — standard ES module refactor; Vite bundling of `<script>` imports is a documented Astro pattern

### Phase 2: Elevation Profile Sector Labels
**Rationale:** Depends on Phase 1 for the imported color module. Highest visible impact feature of the milestone. Self-contained change to `ElevationProfile.astro` with no new data dependencies — `sector.name` and `sector.stars` are already available in the existing `annotationBoxes` forEach loop.
**Delivers:** Sector name + star rating labels associated with each sector band on the elevation chart; stagger strategy to prevent overlap on adjacent narrow sectors; `layout.padding.bottom` increased to prevent label clipping
**Addresses:** Sector labels table-stakes feature; sector label strip differentiator
**Avoids:** Pitfall 1 (register order), Pitfall 2 (label drawTime — add `label.drawTime: 'afterDatasetsDraw'`), Pitfall 6 (narrow band overflow — use short names or conditional display)
**Key decision for planning phase:** Choose between two fully-researched approaches before writing implementation steps:
- **Option A (annotation labels):** Add `label` sub-object to each `sector_N` box annotation with `position: {x: 'center', y: 'end'}` and staggered `yAdjust` values. Simpler code; no y-axis alignment required. Recommended by STACK.md.
- **Option B (CSS overlay strip):** Absolutely-positioned flex row below the `<canvas>` with child divs proportional to `(sector.endMi - sector.startMi) / totalMi * 100%`. Matches Paris-Roubaix roadbook aesthetic. Recommended by FEATURES.md and ARCHITECTURE.md. Requires hardcoding a y-axis offset (approx. 40–50px).

**Research flag:** No further research needed — both options are fully specified. Planning phase makes the Option A vs Option B call.

### Phase 3: Site Navigation Header
**Rationale:** Independent of Phases 1 and 2. Could run in parallel architecturally, but sequencing it here keeps one active change surface at a time. Addresses the most significant user-facing gap: no way to navigate between the site's sections or reach the `/results` page.
**Delivers:** `SiteNav.astro` component in `BaseLayout.astro`; links to Home, Results, Submit; build-time `aria-current` active state (no JS); redundant "Back to MK Ultra Gravel" back links removed from `results.astro` and `submit.astro`; z-index at 10000+ to render above texture overlays
**Addresses:** Navigation header table-stakes feature; active nav state table-stakes; `/results` discovery differentiator; brutalist styling differentiator
**Avoids:** Pitfall 7 (active state flash — use `Astro.url.pathname` in frontmatter, not `window.location` in script), Pitfall 8 (z-index collision — nav at 10000), Pitfall 13 (trailing slash mismatch — normalize pathname before comparison)
**Research flag:** None needed — standard Astro `Astro.url.pathname` pattern with official docs backing; z-index values verified from live code

### Phase 4: KOM/QOM Time Input Tool
**Rationale:** Pure developer tooling with no impact on the deployed site. Independent of all other phases. Deferred to last because KOM times won't be entered until post-event; implementation can occur anytime before race day.
**Delivers:** `scripts/kom-times.json` (authoritative time data source, initially all null); `scripts/resolve-annotations.js` updated to read and merge times from JSON file; optional `scripts/set-kom-times.js` CLI with time format validation; `npm run times` convenience script in `package.json`
**Addresses:** KOM/QOM times table-stakes feature; local KOM/QOM input CLI differentiator
**Avoids:** Pitfall 4 (pipeline overwrites — write to source file, not artifact), Pitfall 10 (invalid time format — regex validation with M:SS / H:MM:SS pattern before writing), Pitfall 11 (slow full pipeline — standalone script invokes only `resolve-annotations.js`, not full `generate-data.js`)
**Research flag:** None needed — architecture decision (Option C: external JSON config file) is the clear winner across all three research files; confirmed by direct inspection of pipeline and data flow

### Phase Ordering Rationale

- Phase 1 before Phase 2: sector labels import from the shared color module; doing labels first would require a two-file change with unverified colors
- Phase 3 independent: no dependency on Phases 1 or 2; ordered third to keep one change surface active at a time
- Phase 4 independent: pure dev tooling; ordered last because times aren't needed until post-event, and it's the lowest user-facing priority
- All four phases are deliberately single-concern to minimize review surface and regression risk

### Research Flags

Phases with standard patterns (no research phase needed):
- **Phase 1 (color tokens):** Standard ES module extract with a clear precedent (`src/lib/scoring.js`)
- **Phase 3 (navigation):** Standard Astro nav pattern with official API docs; z-index values confirmed from live code
- **Phase 4 (KOM tool):** Standard Node.js script + JSON config; all three research files agree on the architecture

Phases needing a planning decision (not additional research — the options are fully spec'd):
- **Phase 2 (sector labels):** Option A (annotation labels) vs Option B (CSS overlay). Recommendation: choose Option B for aesthetic fidelity to Paris-Roubaix roadbook conventions, with Option A as fallback if y-axis offset alignment proves unreliable in testing.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All findings verified against installed package source (`node_modules/chartjs-plugin-annotation`) and official Astro docs; zero new dependencies confirmed by exhaustive "What NOT to Add" analysis |
| Features | HIGH | Based on direct codebase inspection + official chartjs-plugin-annotation docs; Paris-Roubaix roadbook pattern from official source; all table stakes and anti-features have clear rationale |
| Architecture | HIGH | All findings from direct codebase inspection at commit `e24cd44`; component inventory, data pipeline, CustomEvent bus, and z-index values verified against live files; no assumptions |
| Pitfalls | HIGH | 9 of 13 pitfalls verified via official docs, GitHub issues, or direct source inspection; 4 rated MEDIUM due to configuration-dependent behavior (Astro trailingSlash, Chart.js gamut display variance) |

**Overall confidence:** HIGH

All research areas are grounded in direct codebase inspection or official documentation. No novel technology choices, no undocumented APIs, no external service dependencies. This milestone is an extension of well-established patterns already present in the codebase.

### Gaps to Address

- **Option A vs Option B for sector labels:** The divergence between STACK.md (annotation labels) and FEATURES.md/ARCHITECTURE.md (CSS overlay) must be resolved in the Phase 2 planning step. Both are fully specified — this is a design judgment, not a research gap. Recommendation: Option B (CSS overlay) for visual fidelity; fall back to Option A if y-axis offset alignment is unreliable.

- **Y-axis offset alignment for CSS label strip (if Option B chosen):** Chart.js renders a y-axis that takes approximately 40–50px on the left, but this is not a fixed value — it depends on tick label widths. The planning phase should decide whether to hardcode an estimated value or measure dynamically. Recommendation: hardcode a constant (verify visually), document it as a magic number, and note that it may need adjustment if y-axis tick labels change.

- **Scroll-based active section highlighting in nav:** The navigation research covers page-level active state but not scroll-based section detection (IntersectionObserver) for the home page's `#route`, `#sectors`, `#photos`, `#info` anchors. The planning phase should explicitly scope Phase 3 to page-level active state only, deferring scroll-based section highlighting to v6.1 to keep Phase 3 focused.

---

## Sources

### Primary (HIGH confidence — official docs and installed package source)
- `node_modules/chartjs-plugin-annotation/dist/chartjs-plugin-annotation.esm.js` — `getRelativePosition`, `calculateY`, `BoxLabelOptions` verified from installed source
- `https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/types/box.html` — box label positioning constraints
- `https://docs.astro.build/en/reference/api-reference/#astrourl` — `Astro.url.pathname` API
- `https://docs.astro.build/en/guides/client-side-scripts/` — `<script>` import bundling via Vite
- `https://github.com/chartjs/chartjs-plugin-annotation/issues/243` — `label.drawTime` vs parent `drawTime` issue and resolution
- `https://github.com/chartjs/Chart.js/issues/12101` — oklch color string failure in Chart.js animation paths
- `https://leafletjs.com/reference.html#polyline` — color option: hex/rgb/named only
- Direct codebase inspection at commit `e24cd44`: `ElevationProfile.astro`, `RouteMap.astro`, `GravelSectors.astro`, `KomSegments.astro`, `BaseLayout.astro`, `resolve-annotations.js`, `generate-data.js`, `global.css`, `package.json`

### Secondary (MEDIUM confidence — community and UX research)
- `https://www.paris-roubaix.fr/en/news/2023/paris-roubaix-sector-ratings/3925` — roadbook design pattern for sector label strip below elevation curve
- `https://www.nngroup.com/articles/sticky-headers/` — sticky nav best practices, scroll-padding-top requirement
- `https://css-tricks.com/sticky-smooth-active-nav/` — IntersectionObserver active state implementation pattern
- `https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl` — oklch gamut mapping behavior and sRGB approximation

### Tertiary (LOW confidence — configuration-dependent)
- Astro `trailingSlash` behavior affecting `Astro.url.pathname` exact string — depends on `astro.config.mjs`; use pathname normalization as precaution regardless

---

*Research completed: 2026-03-30*
*Ready for roadmap: yes*
