# Technology Stack — v6.0 UI Polish + Dev Tools

**Project:** MK Ultra Gravel
**Milestone:** v6.0 — Sector labels on elevation profile, site navigation, color consistency, KOM/QOM input tool
**Researched:** 2026-03-30
**Scope:** Stack additions/changes for 4 specific features only. All existing dependencies (Astro 6, Tailwind v4, Leaflet, Chart.js, PhotoSwipe, sharp, vitest, Netlify Functions) are unchanged and out of scope for this research.
**Confidence:** HIGH — all findings verified against installed package source or official Astro documentation

---

## Executive Summary

This milestone requires **zero new npm dependencies**. All 4 features are buildable with what's already installed. The work is configuration and code changes, not dependency additions.

The key finding: `chartjs-plugin-annotation` v3.1.0 (already installed) supports labels on box annotations with `position: {x: 'center', y: 'end'}` plus `yAdjust` to push labels below the box boundary into the chart's bottom margin. No label plugin additions needed.

The color duplication problem (starColors defined identically in 3 files) is solvable by extracting to a shared JS module in `src/lib/`. This is preferable to CSS custom properties because the colors are used at runtime in Chart.js annotation config and Leaflet polyline options — neither of which reads CSS variables. A `src/lib/colors.js` file is the right abstraction.

The navigation component uses `Astro.url.pathname` (built-in, no library) to set `aria-current="page"` on the active link. This is the standard Astro pattern confirmed by official docs.

The KOM/QOM input tool is a plain Node.js CLI script that updates `resolve-annotations.js` directly (or a separate `kom-times.json` data file). No new tooling — it fits the existing `scripts/` directory pattern.

---

## Feature 1: Sector Labels on Elevation Profile

### What's needed

The elevation profile needs sector name + star rating labels rendered at the **bottom** of each sector's box annotation, staggered vertically to prevent overlap on narrow sectors.

### Stack verdict: No new dependencies

`chartjs-plugin-annotation` v3.1.0 already supports this via the box annotation's `label` sub-object.

### Verified API (from installed source at `node_modules/chartjs-plugin-annotation/dist/chartjs-plugin-annotation.esm.js`)

Box annotation label positioning uses `calculateY` which calls `getRelativePosition(availableSize, position.y)`:

| `position.y` value | Result |
|--------------------|--------|
| `'start'` | Top of box (0 offset into available space) |
| `'center'` | Middle of box (default) |
| `'end'` | Bottom of box (full available space offset) |

The `yAdjust` property is **added on top** of the position calculation. Setting `position: { x: 'center', y: 'end' }` with a positive `yAdjust` (e.g., `yAdjust: 12`) pushes the label **below the box** into the chart's bottom padding area.

### Recommended label configuration per sector annotation

```js
label: {
  display: true,
  content: ['★★★', 'Sandstrom'],     // array = two-line label
  color: starColors[sector.stars] + 'cc',
  font: [
    { size: 8, family: 'Space Mono, monospace' },   // star line
    { size: 7, family: 'Space Mono, monospace' },   // name line
  ],
  position: { x: 'center', y: 'end' },
  yAdjust: 10,   // pixels below box bottom edge
  padding: 2,
}
```

### Staggering to avoid overlap

Narrow sectors (e.g., Down Jeep at 0.6 mi, Haavisto at 1.38 mi) will have labels that crowd or overlap adjacent sector labels at full chart width. Two approaches:

**Option A: Alternate yAdjust** — odd-indexed sectors get `yAdjust: 10`, even-indexed get `yAdjust: 24`. Simple, no dynamic sizing needed.

**Option B: Conditional display** — measure sector width in pixels at chart render time and only show labels for sectors wider than a threshold. More precise, but requires a post-render step or the `afterDraw` plugin hook.

**Recommendation:** Option A (alternate yAdjust) for phase implementation. The chart is fixed height (140px mobile, 180px desktop) and the bottom padding needs to accommodate the tallest label offset. Add `layout.padding.bottom: 32` to the chart options to prevent labels from being clipped.

### Integration point

Modify `src/components/ElevationProfile.astro`, specifically the `annotationBoxes` construction in the `initElevation()` function. Sector annotations already have `name` and `stars` available in the loop — the label config is purely additive.

---

## Feature 2: Site Navigation Component

### What's needed

A header `<nav>` with links to Home (`/`), Results (`/results`), and Submit (`/submit`). Active state based on current page. Consistent across all pages via `BaseLayout.astro`.

### Stack verdict: No new dependencies

Astro's built-in `Astro.url.pathname` (confirmed in official API reference at `docs.astro.build/en/reference/api-reference/#astrourl`) provides current page path at build time for static generation.

### Verified API

`Astro.url` is a standard `URL` object. `Astro.url.pathname` returns the path segment (e.g., `/`, `/results`, `/submit`).

```astro
---
const currentPath = Astro.url.pathname;
const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Results', href: '/results' },
  { label: 'Submit', href: '/submit' },
];
---
<nav>
  {navLinks.map(link => (
    <a
      href={link.href}
      aria-current={currentPath === link.href ? 'page' : undefined}
    >
      {link.label}
    </a>
  ))}
</nav>
```

`aria-current="page"` is the semantic HTML standard for indicating the current page in navigation (WCAG 2.1 requirement). CSS targets `[aria-current="page"]` for active styling.

### Integration point

Create `src/components/SiteNav.astro`. Add `<SiteNav />` to `src/layouts/BaseLayout.astro` inside `<body>`, before `<slot />`. The component receives no props — it reads `Astro.url.pathname` internally.

### Note on static generation

Because this is a static site (Astro fully static, no adapter), `Astro.url.pathname` is evaluated at **build time** for each page. Each page's HTML gets its own pre-rendered nav with the correct active state — no JavaScript required.

---

## Feature 3: Color Consistency Fix

### What's needed

`starColors` is currently defined identically in three separate files:
- `src/components/RouteMap.astro` (client-side `<script>` tag)
- `src/components/ElevationProfile.astro` (client-side `<script>` tag)
- `src/components/GravelSectors.astro` (Astro frontmatter, build-time)

The three definitions are byte-for-byte identical today, so there is no actual color inconsistency in the rendered output. The "inconsistency" risk is future divergence: any future star rating color change requires updating 3 files.

### Stack verdict: No new dependencies

Extract to `src/lib/colors.js` — a shared ES module. This file already exists as a directory containing `scoring.js` and `scoring.test.js`, confirming the pattern for shared utilities.

### Recommended approach

**Option A: Shared JS module (recommended)**

```js
// src/lib/colors.js
export const STAR_COLORS = {
  1: '#f0c040',
  2: '#e8962a',
  3: '#d9641e',
  4: '#c93a18',
  5: '#b71c1c',
};
```

Import in Astro frontmatter (build-time):
```astro
---
import { STAR_COLORS } from '../lib/colors.js';
---
```

Import in `<script>` tags (client-side, Vite bundles):
```js
import { STAR_COLORS } from '../lib/colors.js';
```

Astro's Vite bundler handles both import contexts. The `<script>` imports are bundled by Vite at build time — this is a documented Astro pattern from `docs.astro.build/en/guides/client-side-scripts/`.

**Option B: CSS custom properties**

Define `--color-star-1` through `--color-star-5` in `global.css` `@theme` block. CSS-only components could read them, but Chart.js annotation config and Leaflet polyline options take hex strings — they cannot read CSS custom properties. This option requires the JS fallback anyway, making it a partial solution.

**Recommendation:** Option A only. CSS custom properties for star colors add complexity without benefit given the JS-centric consumers.

### Integration point

1. Create `src/lib/colors.js` with `STAR_COLORS` export
2. Update `GravelSectors.astro` frontmatter to import and use it
3. Update `RouteMap.astro` `<script>` to import and use it
4. Update `ElevationProfile.astro` `<script>` to import and use it

This is a refactor with no behavior change — a good candidate for a single focused phase.

---

## Feature 4: Local KOM/QOM Time Input Tool

### What's needed

A dev-only tool for entering KOM and QOM times for the 3 KOM segments. Currently `komTime: null` and `qomTime: null` in `scripts/resolve-annotations.js`. The times need to be stored and reflected in the built `public/data/annotations.json` so they appear on the KOM cards in `KomSegments.astro`.

### Stack verdict: No new dependencies

The existing `scripts/` directory pattern (plain Node.js CJS scripts, no framework) is the right model.

### Architecture of KOM time data

The data flow is:
```
scripts/resolve-annotations.js  (source of truth, hardcoded koms array)
  → runs via npm run data / prebuild
  → writes public/data/annotations.json
    → read by KomSegments.astro at build time
    → read by ElevationProfile.astro at runtime (fetch)
    → read by RouteMap.astro at runtime (fetch)
```

The `komTime` and `qomTime` fields are `null` in the `koms` array in `resolve-annotations.js`. The KomSegments component already handles rendering them when non-null:

```astro
{(segment.komTime || segment.qomTime) && (
  <div class="mt-2 pt-2 border-t border-border text-xs text-text-muted space-y-0.5">
    {segment.komTime && <div>KOM <span class="text-accent-white">{segment.komTime}</span></div>}
    {segment.qomTime && <div>QOM <span class="text-accent-white">{segment.qomTime}</span></div>}
  </div>
)}
```

### Recommended approach: Separate data file + merge script

**Do NOT edit komTime/qomTime directly in `resolve-annotations.js`.**

The `resolve-annotations.js` comment says `data.md` is the human-readable reference and `resolve-annotations.js` is the source of truth. KOM times are event data (updated post-event), not route geometry data. Separating them from route geometry concerns is cleaner.

**Option A: `scripts/kom-times.json` (recommended)**

```json
{
  "24479270": { "komTime": "3:42", "qomTime": "4:18" },
  "41126651": { "komTime": "1:09", "qomTime": "1:22" },
  "16438243": { "komTime": "7:15", "qomTime": "8:03" }
}
```

`resolve-annotations.js` reads this file and merges times into the koms array by `stravaSegmentId`. When `kom-times.json` entries are absent, times remain `null`.

**Option B: CLI update script**

A `scripts/set-kom-times.js` script that accepts segment name + times as arguments:

```bash
node scripts/set-kom-times.js "Billie Helmer" 3:42 4:18
```

This script reads `kom-times.json`, updates the entry, writes it back, then runs `resolve-annotations.js` to regenerate `annotations.json`.

**Recommendation:** Option A alone is sufficient for the first pass. The KOM times will be updated once (post-event day). An interactive CLI is nice-to-have. The JSON data file approach is simpler, auditable (git-trackable), and matches the existing pattern (`data.md` as human-readable reference).

### Integration point

1. Create `scripts/kom-times.json` with null-initialized entries (or empty object)
2. Modify `scripts/resolve-annotations.js` to read and merge `kom-times.json`
3. `npm run data` regenerates `annotations.json` with merged times

The `generate-data.js` prebuild script already calls `resolve-annotations.js` in sequence with other pipeline steps — no changes to `package.json` scripts needed.

---

## What NOT to Add

| Temptation | Why Not |
|------------|---------|
| `chartjs-plugin-datalabels` | chartjs-plugin-annotation v3.1.0 (already installed) handles box labels natively. A second annotation/label plugin creates ordering conflicts and adds 15KB. |
| `astro-navbar` or similar nav library | A 3-link static nav with aria-current is ~20 lines of Astro. Any nav library adds bundle weight and prop API to learn for zero functionality gain. |
| Nano Stores (`nanostores`) | Sharing starColors between components does NOT require reactive state. A static ES module export is the correct pattern — no reactivity needed. |
| CSS custom properties for star colors | Chart.js and Leaflet consume hex strings, not CSS variables. A CSS-only solution doesn't solve the actual problem for these consumers. |
| An interactive CLI with `inquirer` or `prompts` | KOM times are updated once per year. A simple JSON file is lower friction than a CLI for a one-time data entry task. |
| `commander` or `minimist` for CLI arg parsing | If a set-kom-times script is desired, `process.argv` parsing is 5 lines for 3 segments × 2 values. No argument parser needed. |

---

## Stack Summary (v6.0 additions)

| Area | Technology | Version | Change |
|------|-----------|---------|--------|
| Elevation labels | chartjs-plugin-annotation | 3.1.0 | No change — use existing `label` sub-object on box annotations |
| Site navigation | Astro.url.pathname | Built-in | No change — new component, no dep |
| Color tokens | src/lib/colors.js | N/A | New file — extract existing hex values |
| KOM times | scripts/kom-times.json | N/A | New data file — read by resolve-annotations.js |

**Net new npm dependencies: 0**
**Files added: 2** (`src/lib/colors.js`, `scripts/kom-times.json`)
**Files modified: 4** (`BaseLayout.astro`, `ElevationProfile.astro`, `RouteMap.astro`, `GravelSectors.astro`, `resolve-annotations.js`)

---

## Sources

### chartjs-plugin-annotation (HIGH confidence — installed package source)
- Installed at `node_modules/chartjs-plugin-annotation/dist/chartjs-plugin-annotation.esm.js`
- `getRelativePosition` function (line 281): `'start'` returns 0, `'end'` returns `size`, confirms bottom-of-box positioning
- `calculateY` function (line 1164): `yAdjust` is added to position, enabling below-box overflow
- `BoxLabelOptions` interface: confirmed via `https://www.chartjs.org/chartjs-plugin-annotation/latest/api/interfaces/BoxLabelOptions.html`
- Current version 3.1.0 is the latest release (GitHub releases verified: last release October 16, 2024)

### Astro API (HIGH confidence — official documentation)
- `Astro.url.pathname`: `https://docs.astro.build/en/reference/api-reference/#astrourl`
- Client-side script imports: `https://docs.astro.build/en/guides/client-side-scripts/`

### Existing codebase (HIGH confidence — direct inspection)
- `src/lib/` directory pattern: `scoring.js` already establishes shared ES module pattern
- `GravelSectors.astro`, `RouteMap.astro`, `ElevationProfile.astro`: verified identical starColors hex values
- `scripts/resolve-annotations.js`: komTime/qomTime are null in koms array source; `KomSegments.astro` already has conditional render for non-null times
