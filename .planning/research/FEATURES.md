# Feature Landscape

**Domain:** Cycling event website — UI polish, navigation, and admin tooling milestone
**Project:** MK Ultra Gravel
**Researched:** 2026-03-30
**Scope:** Elevation profile segment labeling, multi-page navigation, color consistency, local KOM/QOM data entry

---

## Existing Feature Baseline (Already Built)

Before categorizing new features, what exists matters. This milestone adds polish on top of:

- Single-page site (index.astro) with anchor sections: #route, #sectors, #photos, #info
- Separate pages: results.astro, submit.astro, submit-confirm.astro
- No navigation header exists today — the site has no way to jump between sections
- Elevation profile: Chart.js with sector bands (yellow-to-red box annotations) + KOM bands (dashed chartreuse box annotations)
- KOM bands already have inline labels via chartjs-plugin-annotation (`label.position: 'start'`, top of band, 9px Space Mono)
- Sector bands have NO labels — only colored rectangles, no names, no star ratings shown on chart
- Sector cards: name, stars (★ glyphs), mile marker, Strava link
- KOM cards: name, grade, elevation, komTime/qomTime fields (from annotations.json)
- Results page with Gravel Champion + KOM/QOM Champion leaderboards
- Strava OAuth submission flow
- Dark brutalist design: Space Mono + Special Elite fonts, oklch dark palette
- Established color system: sector stars (1=#f0c040 to 5=#b71c1c), KOM=#7fff00 chartreuse
- Data managed via node scripts in scripts/ — annotations.json is the source of truth

---

## Table Stakes

Features users expect for this type of site and context. Missing = the site feels incomplete or confusing.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Sector labels on elevation profile | Professional cycling reference sites (Paris-Roubaix roadbooks, race altimetry) label each zone directly on or immediately below the profile. Without labels, the colored sector bands are anonymous. A rider looking at the chart cannot tell which band is "Sandstrom" or know a sector is 3-star. | Medium | Must appear below the chart canvas — within-band labels compete with the elevation line, are already used for KOM names, and are too small to carry both name and star rating. The correct pattern is a horizontal label strip beneath the canvas. Chart.js annotation positioning (verified via chartjs-plugin-annotation docs) is constrained to within-box boundaries; no below-canvas support. |
| Navigation header with section + page links | The site has five named sections and a separate /results page with no navigation to any of them. Any multi-section single-page site needs wayfinding. Without nav, users on mobile must scroll the entire page to find content. | Low-Medium | Sticky/fixed header. Must account for scroll-padding-top offset so anchor jumps don't hide content under the nav bar (verified UX pattern from NN/G and CSS-Tricks). Must link to both in-page sections and the /results page. |
| Active nav state on scroll | Standard expectation for sticky single-page navigation. Users need to know which section they are currently in. Implemented with IntersectionObserver (same API already used for scroll-reveal animations in this codebase). | Low | IntersectionObserver pattern is well established in this codebase. Add section-aware callback that marks the current nav item. |
| Color consistency: map = chart = cards | The sector star colors and KOM chartreuse are already defined as a shared system. The v3.0 UAT explicitly verified this (Test #2: "pass"). Future work must not break this invariant. | Low | Already implemented. Any new surface that shows sector data must import from the same starColors record. |
| KOM/QOM times visible and correct on KOM cards | komTime and qomTime are already rendered in KomSegments.astro. Table stakes: they must be correct. Currently they are null/empty in annotations.json and render as nothing. | Low | Display is already implemented. The issue is data entry — times must be set in annotations.json. |

---

## Differentiators

Features that are not universally expected but create competitive advantage or reinforce the site's identity.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Sector label strip with star ratings below elevation profile | Professional cycling altimetry (Paris-Roubaix official materials, procyclingmaps.com) uses a horizontal band below the elevation curve that contains sector identifiers — not embedded in the elevation line. This treatment directly echoes the Paris-Roubaix roadbook aesthetic that the site's star rating system references. No generic cycling app does this. | Medium | Implementation: absolutely positioned HTML div below the Chart.js canvas. Each child div width = `(sector.endMi - sector.startMi) / totalMi * 100%`. Contains sector name + star rating with the starColors palette. Not a Chart.js feature — a CSS overlay aligned to the chart's x-axis range. A left-offset equal to the Chart.js y-axis width is needed to align properly. |
| Local KOM/QOM input CLI script | There is no Strava API or timing chip source for pre-race KOM/QOM benchmarks. The race director needs to enter known times (from prior ride data or local knowledge) as the initial records displayed on KOM cards. A dedicated node script avoids the risk of manually editing JSON and breaking the schema. | Low | `scripts/set-kom-times.js` that takes segment name + time string as arguments and patches annotations.json. Must run before `npm run build` to affect the live site. Follows the established pattern of data management scripts in this codebase (resolve-annotations.js, generate-data.js, etc.). |
| Navigation link to /results page | The results page exists but is entirely undiscoverable without a direct URL. Post-race, it becomes the primary content of the site. A nav item in the header pointing to /results transforms it from a hidden route into a featured destination. | Low | Static `<a href="/results">` in the header component. |
| Nav item visual styling consistent with brutalist design system | Most sticky navs are light-colored and utilitarian. Keeping the nav within the dark brutalist palette (dark background, accent-green highlights, Space Mono font) reinforces the site identity rather than breaking it. | Low | Apply existing design tokens: bg-bg-surface, border-border, text-accent-green for active state. |

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Web-based admin UI for KOM/QOM times | A web form with auth, form validation, API routes, and persistence is enormous scope for editing 6 time strings twice a year on a local grassroots event. | A node CLI script (`scripts/set-kom-times.js`) that patches annotations.json. Same result, zero surface area. Consistent with existing scripts/ pattern. |
| Chart.js annotation labels for sector names (within-band) | `label.position: 'end'` places labels inside the box at the bottom edge, verified by chartjs-plugin-annotation documentation. At 140px chart height, this overlaps the elevation fill. It also cannot display both name and star glyphs readably at the required 9px font size. KOM bands already occupy the top of the chart with inline labels — adding sector labels inside bands would create visual collision. | CSS overlay strip below the canvas: sector name + star rating in a flex row proportional to mile widths. |
| Hamburger-only mobile nav | Event sites with ~5 named sections benefit from a visible compact nav. Hidden hamburgers add interaction cost for no benefit — the user has to discover the menu exists before accessing it. | A compact horizontal nav that uses abbreviated section names on small screens (e.g., "Route" instead of "The Route"). |
| Separate admin page at /admin | A route accessible by anyone with the URL, requiring its own auth or security, for an operation that happens twice a year. | The CLI script runs locally and never touches the web surface. |
| Dynamic KOM/QOM times fetched from Strava API at build time for this milestone | Phase 32 (already complete) established a prebuild pipeline that preserves fields from annotations.json through the build. Adding Strava API fetching here creates new dependencies and rate-limit concerns outside this milestone's scope. | Set known times via the CLI script into annotations.json before build. The prebuild pipeline already ensures those values survive. |
| Full navigation redesign with hamburger + dropdown + mega-menu | The site has 5 sections and 1 results page. A complex nav is overkill and conflicts with the brutalist aesthetic (flat, direct, no decoration). | A single horizontal strip with 5-6 items. If it wraps on small screens, that's fine. |
| Animated elevation profile labels | CSS animations on the label strip add complexity and can create jank during Chart.js resize events. The site already has scroll-reveal and background animations — the elevation area should stay calm and informative. | Static CSS layout for the label strip. |

---

## Feature Dependencies

Dependencies between new features and the existing codebase:

```
Sector label strip below elevation chart
  depends on: ElevationProfile.astro (canvas structure — label strip aligns with canvas x-axis)
  depends on: annotations.json (sectors[].name, .stars, .startMi, .endMi, .endMi for width calc)
  depends on: global.css starColors scale (must match chart band colors exactly)
  depends on: route-data.json meta.totalMi (to calculate proportional widths)
  does NOT require: any new JS — pure CSS + Astro server-side rendering
  blocks nothing downstream

Navigation header
  depends on: BaseLayout.astro (nav must insert before <slot /> to appear on all pages)
  depends on: index.astro section IDs (#route, #sectors, #photos, #info — already exist)
  requires: scroll-padding-top CSS on html or body to offset sticky nav height
  enables: /results page discovery
  may affect: existing scroll-reveal IntersectionObserver (rootMargin may need adjustment)

KOM/QOM input script
  depends on: annotations.json schema (komTime/qomTime string fields already present, currently null)
  depends on: KomSegments.astro (already renders komTime/qomTime — no changes needed)
  depends on: Phase 32 prebuild pipeline (already preserves these fields — verified)
  blocks nothing; must run before `npm run build` to affect the live site
```

---

## Implementation Notes for Sector Label Strip

The sector label strip is the most technically nuanced feature in this milestone. Based on research into chartjs-plugin-annotation documentation and professional cycling altimetry patterns:

**The constraint (verified):** chartjs-plugin-annotation box annotation labels are positioned within box boundaries only. The `position` option accepts `'start'`, `'center'`, `'end'` or percentage strings — all relative to the annotation box interior. `yAdjust` shifts within the box. There is no mechanism to render outside the canvas. Source: chartjs-plugin-annotation Box Annotations documentation (official, current).

**The pattern (observed):** Paris-Roubaix official materials and procyclingmaps.com place sector identifiers as a horizontal band below the elevation curve — a separate visual register from the altitude line. This is the target.

**Recommended implementation:**

1. Wrap the `<canvas>` in a container div that also holds a label strip div.
2. The label strip is a flex row positioned below the canvas.
3. Each child div's flex-grow (or explicit width percentage) is calculated as `(sector.endMi - sector.startMi) / totalMi`.
4. Each child contains the sector name and star glyphs, colored with the sector's starColor.
5. Left offset: Chart.js renders a y-axis that takes ~40-50px on the left. The label strip needs a matching left margin/padding to align with mile 0 on the chart.
6. This is server-rendered by Astro using annotations.json data — no JavaScript required.

**Risk:** The Chart.js y-axis width is not a fixed pixel value; it depends on the rendered tick label widths. If the offset is hardcoded and tick label widths change, labels will drift. Mitigation: use a CSS variable or `padding-left` value that matches the chart's `scales.y.padding` + tick label estimate, then verify visually.

---

## MVP Recommendation

Minimum viable set that delivers the most visible impact for this milestone:

1. **Navigation header** — highest user-facing impact. The site has sections and a separate results page with no way to reach them. This is the most noticeable gap.
2. **Sector labels below elevation profile** — directly addresses the stated milestone goal. Colored bands with no names is a recognized incompleteness for anyone familiar with professional cycling altimetry.
3. **KOM/QOM input script** — low effort, enables correct time display on KOM cards. Currently null/empty is a visible gap.

Defer to post-MVP:
- Animation polish on the nav (scroll-triggered shrink, etc.) — adds complexity, minimal value before race day
- Results page enhancements — empty pre-race, polish is only visible post-June 7

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| chartjs-plugin-annotation label positioning constraints | HIGH | Direct documentation fetch from official chartjs.org |
| Sector label strip as CSS overlay pattern | HIGH | Derived from Paris-Roubaix roadbook design pattern + annotation constraint verification |
| Sticky nav with scroll-padding-top | HIGH | NN/G research, CSS-Tricks, multiple verified sources |
| IntersectionObserver active state pattern | HIGH | CSS-Tricks (multiple implementations), already used in this codebase |
| CLI script for annotations.json patching | HIGH | Direct codebase inspection — scripts/ pattern established, komTime/qomTime fields confirmed in schema |
| KomSegments.astro already renders komTime/qomTime | HIGH | Direct source code inspection |
| Phase 32 prebuild preserves komTime/qomTime | HIGH | Phase 32 SUMMARY and code inspection |

---

## Sources

- [chartjs-plugin-annotation Box Annotations](https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/types/box.html) — label positioning constraints verified (HIGH confidence)
- [Paris-Roubaix Sector Ratings (official)](https://www.paris-roubaix.fr/en/news/2023/paris-roubaix-sector-ratings/3925) — star rating methodology and roadbook presentation (HIGH confidence)
- [Sticky Headers UX — NN/G](https://www.nngroup.com/articles/sticky-headers/) — sticky nav best practices, active state (HIGH confidence)
- [Anchors and In-Page Links — NN/G](https://www.nngroup.com/articles/in-page-links/) — anchor navigation patterns (HIGH confidence)
- [CSS-Tricks Sticky Smooth Active Nav](https://css-tricks.com/sticky-smooth-active-nav/) — IntersectionObserver active state implementation (MEDIUM confidence)
- Project codebase: ElevationProfile.astro, GravelSectors.astro, KomSegments.astro, index.astro, BaseLayout.astro, global.css, annotations.json, scripts/ (HIGH confidence — ground truth)
- v3-UAT.md: Color consistency test #2 passing confirmed (HIGH confidence)
