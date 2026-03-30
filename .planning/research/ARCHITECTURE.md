# Architecture Patterns -- v6.0 UI Polish + Dev Tools

**Domain:** UI polish + developer tooling on an existing Astro 6 static site
**Project:** MK Ultra Gravel
**Researched:** 2026-03-30
**Focus:** How 4 new features integrate with the existing Astro + Chart.js + Leaflet architecture
**Overall confidence:** HIGH — all findings derived from direct codebase inspection

---

## Existing Architecture Snapshot (v5.0 Baseline)

### Component Inventory

| Component | File | Init Pattern | Data Source |
|-----------|------|--------------|-------------|
| RouteMap | `src/components/RouteMap.astro` | Lazy scroll/IntersectionObserver → `initMap()` async | Runtime `fetch()` of route-data.json, annotations.json, photos.json |
| ElevationProfile | `src/components/ElevationProfile.astro` | Lazy scroll/IntersectionObserver → `initElevation()` async | Runtime `fetch()` of route-data.json, annotations.json |
| GravelSectors | `src/components/GravelSectors.astro` | Build-time SSR | `annotations.json` via `readFileSync` |
| KomSegments | `src/components/KomSegments.astro` | Build-time SSR | `annotations.json` via `readFileSync` |
| PhotoGallery | `src/components/PhotoGallery.astro` | SSR template + runtime PhotoSwipe | `photos.json` via `readFileSync` |
| BaseLayout | `src/layouts/BaseLayout.astro` | Static HTML shell | None |
| CountdownTimer | `src/components/CountdownTimer.astro` | Runtime JS | None (hardcoded date) |
| RestockPoints | `src/components/RestockPoints.astro` | Build-time SSR | `annotations.json` via `readFileSync` |

### Pages Inventory

| Page | File | Navigation | Back link |
|------|------|------------|-----------|
| Home | `src/pages/index.astro` | None — no nav | None |
| Results | `src/pages/results.astro` | None — `← Back to MK Ultra Gravel` hardcoded anchor | Manual |
| Submit | `src/pages/submit.astro` | None — `← Back to MK Ultra Gravel` hardcoded anchor | Manual |
| Submit Confirm | `src/pages/submit-confirm.astro` | None | Manual |

### Data Pipeline (Current)

```
scripts/generate-data.js (prebuild coordinator):
  1. copy images/ → public/images/
  2. parse-gpx.js         → public/data/route-data.json
  3. resolve-annotations.js → public/data/annotations.json
  4. match-photos.js      → public/data/photos.json
  5. generate-thumbnails.js → public/images/thumbs/*.webp
  6. assign-card-photos.js  → annotations.json (coverPhoto) + public/images/cards/*.webp
  7. convert-hero.js      → public/images/hero.webp
  8. convert-tone-images.js → public/tone/*.webp
```

KOM/QOM times are hardcoded in `scripts/resolve-annotations.js` as `komTime: null, qomTime: null`
for all 3 KOM segments (Billie Helmer, Leaving Chatham, Silver Creek). The script writes these
values to annotations.json, which is then consumed by KomSegments.astro at build time.

### Color Token System

Star-rating colors are defined **in three separate places** with identical hex values:

| Location | File | Usage |
|----------|------|-------|
| `starColors` const | `src/components/RouteMap.astro` (line 129) | Map sector polylines + badge icons |
| `starColors` const | `src/components/ElevationProfile.astro` (line 59) | Elevation band annotations |
| `starColors` const | `src/components/GravelSectors.astro` (line 16) | Card star rating display |

All three use the same hex values: `{1:'#f0c040', 2:'#e8962a', 3:'#d9641e', 4:'#c93a18', 5:'#b71c1c'}`.
No shared token file exists — the values are duplicated across components.

### CustomEvent Bus

Window-level events decouple RouteMap and ElevationProfile:

```
map:sectorHover  { sectorIndex: number|null }  → elevation highlights band
map:sectorClick  { sectorIndex: number }         → elevation dims others, highlights clicked
map:reset        {}                              → all components restore default state
elevation:hover  { lat, lon }                    → map moves bike crosshair
elevation:hoverEnd {}                            → map hides bike crosshair
elevation:sectorClick { sectorIndex: number }    → map flies to sector bounds
```

---

## Feature 1: Elevation Profile Sector Labels

### What It Is

Add text labels at the bottom of the Chart.js elevation chart showing sector names and star
ratings. One label per sector (6 sectors). Labels are staggered vertically to avoid overlap
since several sectors are adjacent on the mileage axis.

### Integration Point

`ElevationProfile.astro` — the `annotationBoxes` object that drives `chartjs-plugin-annotation`.

The existing sector forEach loop (lines 69–84) already builds `annotationBoxes` with `sector_N`
keys as box annotations. Labels are added by adding a `label` sub-object to each existing box
annotation — the same pattern already used by KOM annotations (lines 87–105).

### chartjs-plugin-annotation Label API

The current KOM annotations already use `label` objects within box annotations:
```js
label: {
  display: true,
  content: kom.name,
  color: '#7fff00cc',
  font: { size: 9, family: 'Space Mono, monospace' },
  position: 'start',
}
```

For sector labels, the same structure applies. `position` controls where within the box the
label anchors — `'start'`, `'center'`, `'end'`, or `{x: pct, y: pct}`. To pin labels to the
bottom of the chart area rather than to the annotation box top, the label needs to be placed
at the bottom of the box with `position: {x: 'center', y: 'end'}` or using the `yAdjust`
offset property.

**Stagger pattern for overlapping sectors:** Adjacent sectors (e.g., Sandstrom ends at mi ~29
and Akkala Rd starts at mi 39.5) may have labels that run close. Staggering by alternating
`yAdjust` values (e.g., 0 and -20) on even/odd sector indices prevents overlap without
layout logic.

### New vs Modified

**Modified:** `src/components/ElevationProfile.astro`
- Add `label` property to each existing `sector_N` annotation in the `forEach` loop
- No new components, no new data dependencies, no new script imports

### Data Flow

No change. `annotations.json` already provides `sector.name` and `sector.stars`. Both are
already consumed inside the `forEach` loop that builds `annotationBoxes`.

---

## Feature 2: Shared Site Navigation

### What It Is

A persistent navigation component shared across index.astro, results.astro, submit.astro, and
submit-confirm.astro. Provides links: Home (/), Results (/results), Submit (/submit).

### Integration Point

`BaseLayout.astro` is the single shared layout used by all 4 pages. It currently renders only
`<html>`, `<head>`, and `<body>` with two fixed overlay divs (`grain-overlay`, `escher-overlay`)
plus `<slot />`. Nav belongs in BaseLayout, rendering before `<slot />`.

### New vs Modified

**New component:** `src/components/Nav.astro` — nav markup with active-state logic
**Modified:** `src/layouts/BaseLayout.astro` — import and render `<Nav />`

Alternatively, the nav HTML can be inlined directly in BaseLayout rather than extracting to
a component. Given the nav is small (3 links) and BaseLayout has no other component imports,
inlining is simpler and avoids an unnecessary file. The tradeoff: if nav grows beyond 3 links,
a dedicated component is easier to maintain. Either approach works.

### Active Page Detection

Astro provides `Astro.url.pathname` in the frontmatter of any `.astro` file. When nav is in
BaseLayout, the pattern is:

```astro
---
const { pathname } = Astro.url;
---
<nav>
  <a href="/" class={pathname === '/' ? 'active' : ''}>Home</a>
  <a href="/results" class={pathname === '/results' ? 'active' : ''}>Results</a>
  <a href="/submit" class={pathname === '/submit' ? 'active' : ''}>Submit</a>
</nav>
```

This works because BaseLayout is an Astro component with access to Astro.url at build time.

### Layout Conflict with Existing Pages

The current results.astro and submit.astro each have a hardcoded `← Back to MK Ultra Gravel`
back link at the top of `<main>`. Adding a global nav means these back links become redundant —
both should be removed when nav is added, since Home is one click away.

Index.astro has no back link (it is the home page). No layout conflict there.

### Style Constraints

The existing design uses no visible nav — pages are full-bleed scroll experiences. A nav must
not interfere with the hero section's `min-h-screen` full-viewport layout on the home page.
Options:
- Fixed/sticky nav with `z-index` above content (requires `padding-top` on main to avoid
  content being obscured behind the nav bar)
- Inline nav at top of layout before `<slot />` (simplest — no z-index math, hero section
  naturally flows below it)

The home page hero uses `min-h-screen` with `flex items-center justify-center`. An inline nav
above `<slot />` will push content down, so the hero would no longer start at viewport top.
A fixed/sticky position nav avoids this — the hero still fills the viewport — but requires
`padding-top` on inner pages where the nav would otherwise cover content.

The cleanest approach for this codebase: fixed nav at top, 48-64px tall, with a matching
`padding-top` on `<main>` elements on the non-hero pages (results, submit). Index.astro's
hero already handles vertical centering so padding does not break it.

### Data Flow

No data dependencies. Nav is purely structural HTML with pathname-based active state.

---

## Feature 3: Color Consistency

### What It Is

Ensure sector colors are consistent across all three surfaces: map polylines, elevation chart
bands, and sector cards. Currently 2-star and 3-star colors may be visually inconsistent
because each surface defines colors independently in its own script.

### Root Cause Diagnosis

All three `starColors` objects use the same hex values as of the last code inspection:
```js
{ 1:'#f0c040', 2:'#e8962a', 3:'#d9641e', 4:'#c93a18', 5:'#b71c1c' }
```
If colors appear inconsistent, the issue is likely that one of the three files diverged during
a prior edit (e.g., a fix applied to RouteMap was not propagated to ElevationProfile or
GravelSectors).

### Integration Point

The three locations that hold `starColors` definitions:

1. `src/components/RouteMap.astro` — line 129, inside `initMap()` async function (runtime)
2. `src/components/ElevationProfile.astro` — line 59, inside `initElevation()` async function (runtime)
3. `src/components/GravelSectors.astro` — line 16, in frontmatter (build time)

### Refactor Options

**Option A: Single source of truth in a shared JS module**

Create `src/lib/star-colors.js`:
```js
export const starColors = {
  1: '#f0c040',
  2: '#e8962a',
  3: '#d9641e',
  4: '#c93a18',
  5: '#b71c1c',
};
```

RouteMap and ElevationProfile use `import` in their `<script>` tags. GravelSectors uses it in
the frontmatter `---` block.

**Constraint:** RouteMap and ElevationProfile use `async function initMap()` / `async function
initElevation()` inside `<script>` tags that use dynamic `import()` for Leaflet/Chart.js.
Static `import` at the top of a `<script>` tag in Astro works fine — Astro/Vite bundles it.
This is the cleaner option.

**Option B: CSS custom properties via @theme**

Define star colors as CSS tokens in `global.css` under `@theme`:
```css
--color-star-1: #f0c040;
--color-star-2: #e8962a;
```
GravelSectors can use these as Tailwind utility classes. But RouteMap and ElevationProfile
need hex values in JavaScript (passed to Chart.js and Leaflet APIs) — `getComputedStyle()`
could read CSS variables at runtime, but this is more complex than a JS module.

**Recommendation: Option A** — a shared `src/lib/star-colors.js` module. It eliminates
divergence risk, is the simplest refactor, and matches the existing pattern of `src/lib/scoring.js`.
GravelSectors already imports from `src/lib/scoring.js` (results.astro), establishing this
pattern as acceptable.

### New vs Modified

**New file:** `src/lib/star-colors.js`
**Modified:** `src/components/RouteMap.astro`, `src/components/ElevationProfile.astro`,
`src/components/GravelSectors.astro` — remove local `starColors` const, import from shared module

---

## Feature 4: KOM/QOM Time Input Tool

### What It Is

A local developer script (not deployed) that allows entering KOM and QOM times for the 3 KOM
segments. Reads the current state of `scripts/resolve-annotations.js`, prompts for time
strings (or accepts them via CLI flags), writes updated values back, and optionally re-runs
the pipeline.

### Current Data Flow for KOM Times

```
scripts/resolve-annotations.js (source of truth)
  koms array → komTime: null, qomTime: null
       ↓
  annotationBoxes + resolvedKoms.map()
       ↓
  public/data/annotations.json → { kom: [{ komTime, qomTime, ... }, ...] }
       ↓
  src/components/KomSegments.astro (build-time readFileSync)
       ↓
  Rendered HTML: conditional block shows times if truthy
```

The `resolve-annotations.js` script is the source of truth. The times live as hardcoded
values in the koms array. Updating them requires editing the source array, then re-running
`npm run data` to regenerate annotations.json.

### Tool Design Options

**Option A: Direct JSON editor (simplest)**

A script that reads `public/data/annotations.json` directly, prompts for updated
`komTime`/`qomTime` values per segment, writes back the JSON. Skips the pipeline entirely.

Advantage: Immediate — no pipeline re-run needed.
Risk: Next `npm run data` (or `npm run build`) overwrites the JSON with `null` values from
`resolve-annotations.js`. Changes are lost at next pipeline run. This is a footgun.

**Option B: Edit resolve-annotations.js source (correct approach)**

A script that reads the koms array from `scripts/resolve-annotations.js` using
`fs.readFileSync`, uses regex or AST manipulation to update `komTime` / `qomTime` values for
named segments, writes the file back, then optionally runs `node scripts/resolve-annotations.js`
to regenerate annotations.json.

Advantage: Durable — times survive subsequent pipeline runs.
Risk: Editing JS source with regex is fragile if the file format changes.

**Option C: External config file (cleanest)**

Extract the time values into a separate `scripts/kom-times.json`:
```json
{
  "Billie Helmer":    { "komTime": null, "qomTime": null },
  "Leaving Chatham":  { "komTime": null, "qomTime": null },
  "Silver Creek":     { "komTime": null, "qomTime": null }
}
```
`resolve-annotations.js` reads this file and merges the time values into the koms array.
The input tool simply edits `kom-times.json`.

Advantage: Cleanest separation — times are data, not code. Tool is trivial (JSON write).
Survives pipeline runs automatically.

**Recommendation: Option C** — the external config file pattern. It has the cleanest data
boundary: times are data (belong in a JSON file), not source code. The input tool becomes
a simple interactive prompt that writes JSON. The pipeline becomes idempotent with respect
to time data.

### Tool Implementation Pattern

Following existing scripts in `scripts/`:
- Node.js CommonJS (`require`/`module.exports`)
- `readline` for interactive prompts (stdlib, no dependency)
- Or accept `--segment "Billie Helmer" --kom "0:36:42" --qom "0:44:01"` CLI flags for
  non-interactive use (useful for scripting)
- Write to `scripts/kom-times.json`
- Optionally re-run `node scripts/resolve-annotations.js` via `child_process.execSync`

### New vs Modified

**New file:** `scripts/kom-times.json` (initial state: all null)
**New file:** `scripts/set-kom-times.js` (input tool)
**Modified:** `scripts/resolve-annotations.js` — read `kom-times.json` and merge into koms array

---

## Suggested Build Order

### Phase ordering rationale

1. **Color consistency first** — It is a prerequisite audit. Before adding sector labels to
   the elevation chart, confirm that the label colors (derived from `starColors`) match the
   band colors. If colors are inconsistent, fixing them after labels are added risks visual
   regression. This phase also introduces `src/lib/star-colors.js`, which the labels phase
   can then import.

2. **Elevation sector labels second** — Depends on correct colors (Phase 1). Self-contained
   change to ElevationProfile.astro with no new dependencies beyond chartjs-plugin-annotation
   (already installed). Highest visual impact of the 4 features.

3. **Site navigation third** — Self-contained change to BaseLayout.astro and optionally a
   new Nav.astro. Does not depend on Phases 1 or 2. Could run in parallel with Phase 2 but
   ordering it after reduces active change surface.

4. **KOM/QOM input tool last** — Pure developer tooling with no impact on the deployed site.
   Does not depend on any other phase. Safe to defer to end of milestone.

### Dependency graph

```
Phase 1 (star-colors.js) ──→ Phase 2 (sector labels use consistent colors)
Phase 3 (nav) ─────────────→ independent of 1 and 2
Phase 4 (KOM tool) ─────────→ independent of 1, 2, and 3
```

---

## Component Boundaries Summary

| Feature | New Components | Modified Components | New Data Files |
|---------|---------------|--------------------|----|
| Sector labels | None | `ElevationProfile.astro` | None |
| Navigation | `Nav.astro` (optional) | `BaseLayout.astro`, `results.astro`, `submit.astro` | None |
| Color consistency | None | `RouteMap.astro`, `ElevationProfile.astro`, `GravelSectors.astro` | `src/lib/star-colors.js` |
| KOM/QOM tool | `scripts/set-kom-times.js` | `scripts/resolve-annotations.js` | `scripts/kom-times.json` |

---

## Anti-Patterns to Avoid

### Editing annotations.json directly for KOM times

Annotations.json is a generated artifact. Manual edits are silently overwritten by the next
`npm run data` or `npm run build`. All durable data must live in the source files that
generate it — in this case, `scripts/resolve-annotations.js` or a sibling config file it reads.

### Using CSS variables for JavaScript-consumed colors

The `starColors` hex values are passed directly to Chart.js and Leaflet APIs as string
arguments. Reading them via `getComputedStyle(document.documentElement).getPropertyValue()`
at runtime is possible but adds indirection. A shared JS module is the right tool for values
consumed by JavaScript.

### Adding nav directly to index.astro's `<main>`

Navigation belongs in BaseLayout, not in individual pages. Duplicating nav markup in each
page creates a sync problem — three pages to update on every nav change instead of one.

### Putting sector label text at the annotation box top

chartjs-plugin-annotation label positions are relative to the annotation box, not the chart
area. A sector box spans from the x-axis up to the dataset line height. `position: 'start'`
places the label at the top-left of the box, which is at varying heights depending on
elevation at that point on the route. Use `yAdjust` with a positive offset to push labels
toward the bottom of the chart, keeping them in a consistent visual band regardless of
terrain height.

---

## Sources

All findings are from direct inspection of the codebase at commit `e24cd44`:
- `src/components/ElevationProfile.astro` — annotation structure, KOM label pattern
- `src/components/RouteMap.astro` — starColors definition, CustomEvent bus
- `src/components/GravelSectors.astro` — starColors definition, build-time data consumption
- `src/components/KomSegments.astro` — komTime/qomTime rendering logic
- `src/layouts/BaseLayout.astro` — shared layout structure
- `scripts/resolve-annotations.js` — komTime source values, koms array
- `src/styles/global.css` — design tokens (@theme), no star colors defined there
- `src/pages/index.astro`, `results.astro`, `submit.astro` — page structure, back link pattern

Confidence: HIGH — architecture findings are based on live code, not documentation or training data.
