# Domain Pitfalls

**Domain:** UI polish + dev tools additions to existing Astro 6 static cycling event site
**Project:** MK Ultra Gravel — next milestone
**Researched:** 2026-03-30
**Confidence:** HIGH (annotation plugin verified via GitHub issues + official docs; color pitfall verified via Chart.js issue tracker; Astro patterns verified via official docs)

---

## Context

This file covers pitfalls specific to ADDING these four features to the existing system:

1. Chart.js annotation labels (KOM elevation profile labels, responsive behavior)
2. Multi-page navigation in Astro (shared nav component, active state)
3. Color consistency across Leaflet, Chart.js canvas, and Tailwind CSS (oklch mismatch)
4. Local dev tools that write to JSON data files (KOM/QOM time input, data integrity)

The existing system uses `chartjs-plugin-annotation` v3.1, Astro 6, Leaflet 1.9, Tailwind v4 with oklch design tokens, and a prebuild pipeline (`scripts/generate-data.js`) that overwrites `public/data/annotations.json` on every run.

---

## Critical Pitfalls

These mistakes cause silent failures, data loss, or irreversible damage.

---

### Pitfall 1: Chart.js Annotation Plugin Fails Silently If Registered After Chart Instantiation

**What goes wrong:**
`AnnotationPlugin` must be registered with `Chart.register(AnnotationPlugin)` BEFORE `new Chart(...)` is called. If the import and register happen after the Chart constructor — or if the dynamic import resolves asynchronously and the Chart was already created — annotations are silently absent. There is no runtime error, no warning, no visual indicator. The chart renders normally; the annotation boxes simply do not appear.

**Why it happens:**
Adding a new annotation type (e.g., labels) often means revisiting the plugin registration code. Developers move imports around, accidentally reorder awaits, or add the new annotation config without realizing the register call is positioned correctly relative to the Chart constructor.

**Warning signs:**
- Chart renders without any annotation boxes despite config being present
- `console.log(Chart.registry.plugins)` does not include `annotation`
- No JavaScript errors in the console

**Prevention:**
Keep the register call immediately adjacent to the import, in a fixed block:
```typescript
const { default: AnnotationPlugin } = await import('chartjs-plugin-annotation');
Chart.register(AnnotationPlugin);
// ... fetch data, build annotationBoxes ...
const chartInstance = new Chart(canvas, { ... });
```
Never move the `Chart.register()` call below `new Chart(...)`. Add a comment explaining the ordering requirement (as already exists in ElevationProfile.astro at the `AnnotationPlugin must be registered BEFORE new Chart()` comment).

**Phase:** Chart annotation label phase. The existing codebase already handles this correctly — the risk is introducing a regression during edits.

**Confidence:** HIGH — documented in chartjs-plugin-annotation official docs and in the existing codebase comment.

---

### Pitfall 2: KOM Annotation Labels with `drawTime: 'beforeDatasetsDraw'` Are Covered by the Dataset Line

**What goes wrong:**
The KOM band annotations use `drawTime: 'beforeDatasetsDraw'` so the elevation line renders on top of them (correct for the band fill/border). However, **labels drawn at the same time as their parent annotation are also drawn before the dataset**, meaning the elevation line renders on top of the label text. At 9px font size, a chartreuse label obscured by a white/cream line stroke (1.5px) is invisible at the overlap point.

This was a known issue resolved in chartjs-plugin-annotation via PR #275, which added an independent `label.drawTime` property. The fix is to set `label.drawTime: 'afterDatasetsDraw'` separately from the box's `drawTime`, so the band renders beneath the line but the label renders above it.

**Why it happens:**
The intuitive assumption is that if the box is configured with `drawTime: 'beforeDatasetsDraw'`, its label will be drawn after the dataset (to ensure visibility). The opposite is true — labels inherit their parent's drawTime by default in older versions, and without explicit override, both render at the same lifecycle point.

**Warning signs:**
- KOM band labels are invisible or partially obscured at positions where the elevation line crosses through them
- Labels at the left edge of a band (`position: 'start'`) are visible on narrow bands but disappear on bands where the line immediately crosses the start

**Prevention:**
Add `label.drawTime: 'afterDatasetsDraw'` to all KOM box annotations that use `drawTime: 'beforeDatasetsDraw'`:

```typescript
annotationBoxes[`kom_${i}`] = {
  type: 'box',
  drawTime: 'beforeDatasetsDraw',   // band renders beneath elevation line
  // ...
  label: {
    display: true,
    drawTime: 'afterDatasetsDraw',  // label renders above elevation line
    content: kom.name,
    // ...
  },
};
```

**Phase:** KOM elevation profile labels phase.

**Confidence:** HIGH — verified via chartjs-plugin-annotation GitHub issue #243 and PR #275 resolution.

---

### Pitfall 3: oklch Color Strings Fail in Chart.js Animation and Color Interpolation

**What goes wrong:**
Chart.js's internal color system (used for hover state transitions, animation interpolation, and some tooltip rendering) cannot parse CSS Level 4 color syntax including `oklch(...)`. While solid oklch colors passed as strings to `borderColor` or `backgroundColor` render correctly as-is in Canvas, any code path that tries to *parse and interpolate* the color (e.g., during a transition from one color to another) throws or silently produces `rgba(0,0,0,0)`.

This is documented in Chart.js GitHub issue #12101 (opened July 2025, unresolved as of research date). The specific failure scenario for this project: if `chart.update('none')` is replaced with `chart.update()` (with animation), any annotation whose color is an oklch string will fail to animate and may render black or transparent.

**Why it happens:**
The existing codebase correctly uses `chart.update('none')` for annotation highlight/restore operations — this bypasses the animation system entirely, so oklch strings work safely. The pitfall is introduced if someone changes `update('none')` to `update()` for smoother animations, not realizing it breaks oklch color parsing.

Additionally, the `darkBgPlugin` in ElevationProfile.astro uses `ctx.fillStyle = 'oklch(0.14 0.01 250)'` directly on the Canvas 2D context. This is fine — browsers support oklch in Canvas API `fillStyle`. The issue is *Chart.js's own color parsing*, not the Canvas API itself.

**Warning signs:**
- Sector annotation bands flash black or disappear during hover/click transitions
- `chart.update()` calls produce visual artifacts on annotations with oklch colors
- Console error mentioning unsupported color format

**Prevention:**
- Keep all `chart.update()` calls as `chart.update('none')` for annotation-only updates (no data changes, no animation needed)
- Use hex colors (`#RRGGBB` or `#RRGGBBAA`) for all annotation `backgroundColor` and `borderColor` values — not oklch strings. The existing codebase already does this correctly (`'#7fff0018'`, `starColors[sector.stars] + '22'`, etc.)
- Do not use oklch for annotation colors even if Tailwind CSS variables are oklch. Convert to hex at the point of annotation configuration
- Reserve oklch for CSS-only contexts (Tailwind utilities, `global.css`) where the browser resolves them natively

**Phase:** Any phase touching annotation colors or adding animation. The existing codebase is safe — risk is introducing a regression.

**Confidence:** HIGH — verified via Chart.js GitHub issue #12101 and direct inspection of existing ElevationProfile.astro which uses hex for all annotation colors.

---

### Pitfall 4: `resolve-annotations.js` Overwrites `annotations.json` on Every Pipeline Run, Erasing Manually-Entered KOM/QOM Times

**What goes wrong:**
`scripts/resolve-annotations.js` reads hardcoded `koms` array (with `komTime: null, qomTime: null`), resolves GPS coordinates, and writes the complete `public/data/annotations.json` file. If a KOM/QOM input tool saves times directly into `annotations.json` (the common naive approach), those times are erased the next time `npm run dev`, `npm run build`, or `node scripts/generate-data.js` runs.

The pipeline runs automatically on `npm run dev` (line 8 of package.json: `"dev": "node scripts/generate-data.js && astro dev"`). A developer who starts the dev server after entering KOM times will silently lose all entered data.

**Why it happens:**
`annotations.json` is treated as a build artifact (generated file), not a data source. The pipeline overwrites it completely every run. A KOM/QOM input tool that targets the generated output file is writing to the wrong layer — it needs to write to the source (the `koms` array in `resolve-annotations.js`) or to a separate input file that the pipeline reads.

**Warning signs:**
- KOM/QOM times appear in the UI, then disappear after the next dev server restart
- `public/data/annotations.json` shows all `null` komTime/qomTime values despite having entered data
- Git diff shows `annotations.json` being updated to remove times

**Prevention:**
The KOM/QOM input tool must write to the authoritative source, not the generated output:

Option A (RECOMMENDED): Keep a separate `data/kom-times.json` file in source control:
```json
{
  "Billie Helmer": { "komTime": "4:12", "qomTime": "5:33" },
  "Leaving Chatham": { "komTime": null, "qomTime": null },
  "Silver Creek": { "komTime": null, "qomTime": null }
}
```
`resolve-annotations.js` reads this file and merges times into the output. The input tool writes to `data/kom-times.json`. The pipeline can run as many times as needed without losing times.

Option B: `resolve-annotations.js` reads from a separate env-var-configured source or from a fixed path that is not overwritten by the pipeline.

Option C (Least safe): Modify `resolve-annotations.js` to read existing `annotations.json` before overwriting, extract current komTime/qomTime values, and re-apply them. Fragile — if the pipeline ever fails halfway through, times are lost.

**The key constraint:** `annotations.json` must be treated as a generated artifact. The input tool must write to source, and the pipeline merges source into output.

**Phase:** KOM/QOM time input tool phase. Must be designed before writing any tool code.

**Confidence:** HIGH — verified by reading `scripts/resolve-annotations.js` (directly writes output from hardcoded `koms` array) and `package.json` (pipeline runs on every `npm run dev`).

---

### Pitfall 5: Leaflet Polyline Colors Do Not Accept CSS Variables or oklch Strings

**What goes wrong:**
Leaflet's polyline `color` option is passed directly to the Canvas 2D context as a stroke style. Leaflet does not resolve CSS custom properties (e.g., `var(--color-accent-green)`) or modern color functions like `oklch(...)`. Passing these as `color` produces either a transparent stroke or no stroke at all, with no error.

If color consistency work involves updating sector polylines or KOM polylines to reference Tailwind design tokens, using CSS variable syntax will silently fail.

**Why it happens:**
CSS custom property resolution (`var(--x)`) is a browser CSS engine feature. The Canvas API on which Leaflet is built does not run through the CSS resolver — it accepts only resolved color values (hex, rgb, rgba, hsl, hsla, or named colors).

**Warning signs:**
- Leaflet polylines are invisible (transparent) despite `color` being set
- No JavaScript error in console
- Works fine when the color is set to a hex value, fails with `var(--...)` or `oklch(...)`

**Prevention:**
- Keep all Leaflet `color` values as hex strings (`'#7fff00'`, `'#f0c040'`, etc.)
- Do not attempt to reference Tailwind CSS variables inside Leaflet option objects
- If you need to sync Leaflet colors with Tailwind tokens, use `getComputedStyle(document.documentElement).getPropertyValue('--color-accent-green')` to resolve at runtime, then pass the resolved hex/rgb value to Leaflet

**Phase:** Any phase touching Leaflet polyline or marker colors. The existing codebase is safe — starColors and KOM colors are all hardcoded hex.

**Confidence:** HIGH — verified by Leaflet documentation (color options accept HTML color strings: hex, rgb/rgba, named) and confirmed via inspection of existing RouteMap.astro which uses hex throughout.

---

## Moderate Pitfalls

Mistakes that cause delays or rework but are recoverable.

---

### Pitfall 6: Chart.js Annotation Label Text Overflows Narrow Segment Bands

**What goes wrong:**
KOM segment widths on the elevation chart vary significantly: "Leaving Chatham" spans only 0.38 miles, which at a 100-mile x-axis is about 0.38% of the chart width. At a 600px-wide chart, that is roughly 2.3px. The label text "Leaving Chatham" at 9px monospace font requires approximately 130px. The label is positioned `'start'` within the box, but the text renders outside the box boundary with no clipping or wrapping — it simply draws over adjacent chart content.

**Why it happens:**
`chartjs-plugin-annotation` has no built-in overflow detection, text truncation, or automatic repositioning for labels that are wider than their parent annotation box. The label is drawn at the anchor point regardless of whether it fits. Setting `clip: false` (the global Chart.js option) makes the situation worse on narrow bands near the chart edge.

**Warning signs:**
- Label text for narrow segments visually overlaps with tick labels, grid lines, or other annotation labels
- Two adjacent KOM segment labels collide (e.g., if future segments are added close together)
- Label is not visible at all at small chart widths (e.g., mobile, 320px) because it renders outside the canvas

**Prevention:**
For the three current KOM segments, check the rendered pixel width of each band at the minimum expected chart width (320px mobile). Calculate the pixel width: `(endMi - startMi) / totalMi * chartWidth`. If less than ~80px, the label will overflow.

Mitigations (in order of preference):
1. Use short names or abbreviations where labels will be narrow: `"Chatham"` instead of `"Leaving Chatham"` for narrow bands
2. Rotate the label 90 degrees for narrow bands: `rotation: 90` — vertical text fits within a narrow vertical band
3. Use `position: { x: 'start', y: 'start' }` with a negative `yAdjust` to float the label above the band
4. Conditionally hide labels below a pixel-width threshold using a scriptable `display` option:
```typescript
label: {
  display: (ctx) => {
    const chart = ctx.chart;
    const pixelWidth = chart.scales.x.getPixelForValue(kom.endMi)
      - chart.scales.x.getPixelForValue(kom.startMi);
    return pixelWidth > 50;
  },
  content: kom.name,
}
```

**Phase:** KOM elevation profile labels phase.

**Confidence:** HIGH — verified via chartjs-plugin-annotation documentation (no overflow handling documented) and direct geometry calculation for the three KOM segments.

---

### Pitfall 7: Astro `Astro.url.pathname` Requires Explicit Passing to Navigation Component

**What goes wrong:**
In Astro 6, `Astro.url` (and its `.pathname`) is only available in the frontmatter code fence (the `---` block) of `.astro` files. It is NOT available as a global in `<script>` tags, and it does NOT automatically propagate into child components.

When building a shared `Nav.astro` component placed inside `BaseLayout.astro`, the component does NOT automatically know which page it is currently rendering on. If the Nav component tries to use `Astro.url` directly in its own frontmatter, it does get the current URL — but only if the component is evaluated in a per-page context (which components in layouts are). This works correctly at build time. The pitfall is assuming the Nav component needs to receive the current URL as a prop and threading it unnecessarily.

The REAL pitfall is the inverse: forgetting that `Astro.url.pathname` is available in a child component's frontmatter and instead trying to determine active state in a `<script>` tag using `window.location.pathname`. This works at runtime but produces a flash of unstyled navigation (FUN) — the active state is not applied on initial server-rendered HTML, then snaps on after JS runs.

**Why it happens:**
Developers coming from React or Vue assume that "current route" is a client-side concept requiring JavaScript. In Astro's static build model, every page's HTML is rendered at build time with full knowledge of `Astro.url.pathname`, so active state should be determined at build time, not runtime.

**Warning signs:**
- Navigation active state appears with a brief flash/jump when page loads
- Navigation looks inactive on first paint, then highlights the correct link
- DevTools shows the active class being added after DOMContentLoaded

**Prevention:**
Determine active state at build time in the component's frontmatter, not in a `<script>` tag:

```astro
---
const currentPath = Astro.url.pathname;
const navLinks = [
  { href: '/', label: 'Event' },
  { href: '/results', label: 'Results' },
];
---
<nav>
  {navLinks.map(link => (
    <a
      href={link.href}
      aria-current={currentPath === link.href ? 'page' : undefined}
      class={currentPath === link.href ? 'nav-active' : ''}
    >
      {link.label}
    </a>
  ))}
</nav>
```

Use `aria-current="page"` for accessibility. Style the active state with `a[aria-current="page"]` in CSS.

**Phase:** Navigation component phase.

**Confidence:** HIGH — verified via Astro official docs (routing, layouts) and the `Astro.url` API reference.

---

### Pitfall 8: Adding Navigation to BaseLayout Breaks Pages With Custom `<head>` Content

**What goes wrong:**
`BaseLayout.astro` uses a named slot `<slot name="head" />` for pages to inject page-specific head content. When adding navigation to the layout, a common mistake is restructuring the `<body>` in a way that removes or wraps the default `<slot />` (unnamed slot). Pages that pass content to the unnamed slot then render only the layout shell with no page content.

The subtler version: adding a sticky navigation bar that uses `position: fixed` or `position: sticky` changes the layout's stacking context. The map (which uses Leaflet with `z-index: 0`) and the grain/escher overlays (which use `z-index: 9998` and `z-index: 9999`) may render on top of a fixed navigation bar unless the nav has a higher z-index.

**Why it happens:**
`BaseLayout.astro` is a simple shell with no visual chrome. Adding navigation as a structural element changes the document flow. The fixed overlays (`grain-overlay` at z-index 9999, `escher-overlay` at z-index 9998) were designed for a chromeless layout and will cover a fixed nav unless accounted for.

**Warning signs:**
- Pages render blank or show only the navigation bar after layout refactoring
- Navigation bar is partially or fully covered by the grain or escher overlay texture
- Leaflet popup appears behind the navigation bar on scroll

**Prevention:**
- When adding navigation to BaseLayout, keep the `<slot />` and `<slot name="head" />` unchanged
- Give the nav bar `z-index: 10000` (one above `grain-overlay` at 9999) to ensure it renders above all overlays
- After adding the nav, verify each page (index.astro, results.astro, submit.astro, submit-confirm.astro) still renders its content correctly
- Check that Leaflet popups appear above the page content but below the nav bar at typical z-index values

**Phase:** Navigation component phase.

**Confidence:** MEDIUM — based on inspection of existing BaseLayout.astro z-index values and Astro layout slot behavior (official docs).

---

### Pitfall 9: Color Drift Between oklch Token (Tailwind) and Hex Approximation (Chart.js / Leaflet)

**What goes wrong:**
The design uses `--color-accent-green: oklch(0.85 0.24 145)`. When this color needs to appear in Chart.js annotations or Leaflet markers (which require hex), a developer eyeballs the hex equivalent as `#7fff00` (chartreuse) or uses an online converter. The converted hex may visually match on the developer's display but differ on wide-gamut displays (P3, Rec2020) where oklch values outside the sRGB gamut are clipped differently by different browsers.

More concretely: `oklch(0.85 0.24 145)` is a vivid yellow-green that sits outside the sRGB gamut on P3 displays. Its sRGB approximation (used by most converters) is approximately `#6eff4a`. The project currently uses chartreuse (`#7fff00`) for KOM markers, which is a different hue. These are intentionally different colors (green for accent, chartreuse for KOM), but if someone tries to "match" the Tailwind accent green in Chart.js using hex, they will get a color that diverges visually between standard and wide-gamut displays.

**Why it happens:**
CSS resolves oklch natively at display time with gamut mapping. The Canvas API receives a fixed color string that cannot gamut-map. The two rendering systems produce different results for colors at the edge of sRGB.

**Warning signs:**
- Annotation colors look different on MacBook Retina (P3) vs standard display
- "The chart color doesn't match the card border color" — both using the same design token concept but different rendering paths
- Hex color in Chart.js annotation looks slightly more saturated or different hue than the Tailwind utility class on the same page

**Prevention:**
- Accept that Chart.js/Leaflet canvas colors will be sRGB approximations of oklch tokens. Document this explicitly.
- For the existing project, the colors are intentionally different across surfaces (yellow-to-red for sectors, chartreuse for KOM, accent-green for general UI). Do not attempt to use oklch tokens directly in Chart.js or Leaflet — use the hardcoded hex values that are already correct for their purpose.
- When adding new colors that need to match between CSS and Canvas, define both values explicitly:
  ```
  // In global.css @theme
  --color-kom: oklch(0.85 0.24 120);         // CSS contexts
  --color-kom-hex: #7fff00;                   // Canvas contexts (approximation)
  ```
- Never compute the hex from the oklch at runtime via `getComputedStyle` and pass it to Leaflet — `getComputedStyle` returns the resolved oklch string, not a hex, and Leaflet cannot use it.

**Phase:** Any phase touching new colors across both CSS and canvas surfaces.

**Confidence:** MEDIUM — verified via Chart.js issue #12101 (confirms no oklch support in Chart.js), Leaflet docs (hex/rgb required), and oklch gamut behavior (Evil Martians oklch reference).

---

### Pitfall 10: KOM/QOM Input Tool Has No Validation — Invalid Times Corrupt Build

**What goes wrong:**
A dev tool that writes KOM/QOM times to a source JSON file can write invalid values (e.g., `"4:62"`, `"abc"`, `""`, or `null` formatted as a string). These propagate through the pipeline into `annotations.json`, which is then used at build time by `KomSegments.astro` (reads the JSON in its frontmatter at SSG time) and at runtime by `ElevationProfile.astro` (fetches via `/data/annotations.json`). An invalid time string like `"4:62"` does not crash the build but renders incorrectly in the UI. A value like `null` stored as the string `"null"` would display as literal text.

**Why it happens:**
Dev tools are often written quickly without full validation. The format for time strings (`"M:SS"` or `"H:MM:SS"`) is not enforced anywhere in the current system.

**Warning signs:**
- KOM time displays as `null` or `"null"` in the UI
- KOM time shows as a number (seconds) instead of formatted time
- Build succeeds but site shows garbled time values
- `npm run validate` (which validates athlete result files) does not validate annotation JSON

**Prevention:**
The KOM/QOM input tool must validate before writing:
```javascript
// Valid time formats: "M:SS", "MM:SS", "H:MM:SS"
const TIME_REGEX = /^\d{1,2}:\d{2}(:\d{2})?$/;

function validateTime(value) {
  if (value === null) return true;  // null is allowed (no time set)
  if (typeof value !== 'string') return false;
  if (!TIME_REGEX.test(value)) return false;
  // Validate seconds are 0-59
  const parts = value.split(':');
  const seconds = parseInt(parts[parts.length - 1]);
  return seconds >= 0 && seconds <= 59;
}
```

Also run `npm run validate` (or extend it) after writing to catch downstream issues before committing. Consider adding annotation JSON validation to `scripts/validate-results.mjs` or as a separate `npm run validate-data` script.

**Phase:** KOM/QOM time input tool phase.

**Confidence:** HIGH — verified by reading `KomSegments.astro` (uses komTime/qomTime directly as display strings), `resolve-annotations.js` (no validation of time strings), and `validate-results.mjs` (validates athlete JSONs only, not annotations.json).

---

### Pitfall 11: `npm run dev` Runs the Full Pipeline Including Image Processing — Dev Loop Is Slow

**What goes wrong:**
`generate-data.js` runs ALL pipeline steps sequentially, including `generate-thumbnails.js` (uses Sharp to generate WebP thumbnails for all photos) and `assign-card-photos.js` (generates card crops). These steps are expensive and depend on the `images/` directory. If a developer is only iterating on annotation data (e.g., refining KOM/QOM times), they wait for the full photo processing pipeline on every `npm run dev` restart.

More critically for dev tools: if the KOM/QOM tool is a standalone script (`node scripts/set-kom-times.js`), it should NOT trigger the full pipeline. But if it is wired as `npm run dev` (like the existing dev script), every KOM time update reruns image processing unnecessarily.

**Why it happens:**
`generate-data.js` has no incremental/skip logic for steps whose inputs have not changed. Sharp thumbnail generation is idempotent (it skips existing files) but still runs the file system checks.

**Warning signs:**
- Dev server takes 10-30 seconds to start because it processes photos every time
- Running a quick data edit requires waiting for the full image pipeline

**Prevention:**
- The KOM/QOM input tool should be a standalone script (`node scripts/set-kom-times.js`) that ONLY modifies the source time file and optionally calls `node scripts/resolve-annotations.js` to update `annotations.json`. It should NOT invoke the full `generate-data.js`.
- Wire it to a dedicated npm script: `"times": "node scripts/set-kom-times.js"` — separate from `npm run dev`
- For the dev loop on annotation data, use `npm run data` (which already runs `node scripts/generate-data.js` directly) and know that photo steps are idempotent

**Phase:** KOM/QOM time input tool phase.

**Confidence:** HIGH — verified by reading `package.json` (dev script runs full pipeline) and `generate-data.js` (all steps run unconditionally).

---

## Minor Pitfalls

Mistakes that cause annoyance or visual imperfection but are fixable without data loss.

---

### Pitfall 12: Astro Component `<style>` Scoping Does Not Apply to Dynamically-Injected Leaflet DOM

**What goes wrong:**
Leaflet creates DOM elements outside the Astro component's render scope (popup content, `divIcon` elements, cluster bubbles). Astro's scoped CSS (styles in a component's `<style>` block) adds a unique data attribute like `data-astro-cid-xxx` to elements rendered in the component template, then scopes CSS selectors to that attribute. DOM injected by Leaflet at runtime has no such attribute and receives no component-scoped styles.

This is already handled in `RouteMap.astro` via `:global()` wrappers (`.bike-crosshair`, `.sector-badge`, etc.). The pitfall is forgetting this pattern when adding NEW marker or popup types and then wondering why the styles don't apply.

**Why it happens:**
Component-scoped CSS is a build-time transformation. Runtime DOM injection bypasses it. The pattern is non-obvious to developers unfamiliar with Astro's scoping model.

**Warning signs:**
- New Leaflet marker or popup element has no styling despite style rules existing in the component
- Styles work in browser DevTools when added via the inspector but not from source
- Style is only applied to the first render (Astro template) but not to Leaflet-injected copies

**Prevention:**
All Leaflet-injected styles (markers, popups, badges) must use `:global()` in the component's `<style>` block, or be defined in `global.css`. The existing codebase uses `:global()` for all five divIcon classes — follow this pattern for any new marker types.

**Phase:** Any phase adding new Leaflet marker or popup types.

**Confidence:** HIGH — verified by reading RouteMap.astro style block (all Leaflet elements use `:global()`) and Astro scoped CSS documentation.

---

### Pitfall 13: Navigation `aria-current` Must Be Exact Path Match — Trailing Slash Gotcha

**What goes wrong:**
`Astro.url.pathname` for the index page may return `/` or may return an empty string depending on the Astro version and base configuration. A comparison like `currentPath === '/'` works for the index page root, but `currentPath === '/results'` fails if Astro normalizes the path to `/results/` (with trailing slash) depending on the `trailingSlash` configuration.

Astro 6 defaults to `'ignore'` for `trailingSlash`, meaning `/results` and `/results/` are treated the same. But `Astro.url.pathname` for a page at `src/pages/results.astro` returns `/results` (no trailing slash) in the default configuration. This is usually fine, but if base path or output configuration changes, the exact string match breaks silently.

**Why it happens:**
Path comparison against string literals is fragile. Configuration changes alter what `Astro.url.pathname` returns without triggering errors.

**Warning signs:**
- Active nav state stopped working after changing `astro.config.mjs`
- Active state applies to EVERY page (over-matching) because of a logic error in the comparison
- Active state applies to NO pages (under-matching) because of trailing slash mismatch

**Prevention:**
Use a normalizing comparison: strip trailing slashes before comparing, and handle the root path explicitly:
```astro
---
const rawPath = Astro.url.pathname;
const currentPath = rawPath.endsWith('/') && rawPath.length > 1
  ? rawPath.slice(0, -1)
  : rawPath;
---
```
Or use `startsWith` for section-based matching where sub-routes should also highlight the nav item (though this site has flat routing, so exact match is fine).

**Phase:** Navigation component phase.

**Confidence:** MEDIUM — based on Astro documentation for `trailingSlash` and `Astro.url` behavior.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| KOM elevation profile labels | Pitfall 2: label obscured by dataset line | Add `label.drawTime: 'afterDatasetsDraw'` |
| KOM elevation profile labels | Pitfall 6: label overflows narrow band | Test at 320px width; use short names or `rotation: 90` |
| KOM elevation profile labels | Pitfall 1: annotation plugin register order | Do not reorder imports/awaits during edits |
| Navigation component | Pitfall 7: flash of unstyled active state | Use build-time `Astro.url.pathname` comparison, not client JS |
| Navigation component | Pitfall 8: z-index conflict with overlays | Nav z-index must exceed grain-overlay at 9999 |
| Navigation component | Pitfall 13: trailing slash mismatch | Normalize pathname before comparison |
| Color consistency work | Pitfall 3: oklch in Chart.js | Keep annotation colors as hex; keep `update('none')` |
| Color consistency work | Pitfall 5: oklch in Leaflet | Keep polyline colors as hex strings |
| Color consistency work | Pitfall 9: canvas vs CSS color drift | Accept approximation; document hex equivalents |
| KOM/QOM time input tool | Pitfall 4: pipeline overwrites input | Write to source file, not `annotations.json` |
| KOM/QOM time input tool | Pitfall 10: invalid time format | Validate with regex before writing |
| KOM/QOM time input tool | Pitfall 11: slow full pipeline | Standalone script, not wired to `npm run dev` |
| New Leaflet markers/popups | Pitfall 12: scoped CSS misses Leaflet DOM | Use `:global()` for all Leaflet-injected elements |

---

## Sources

**Chart.js / chartjs-plugin-annotation (HIGH confidence):**
- [chartjs-plugin-annotation Box Annotations](https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/types/box.html) — label options, drawTime behavior
- [chartjs-plugin-annotation Options](https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/options.html) — drawTime lifecycle positions
- [GitHub Issue #243: Labels with drawTime: beforeDatasetsDraw](https://github.com/chartjs/chartjs-plugin-annotation/issues/243) — dataset covers labels; resolved via independent label.drawTime
- [GitHub Issue #151: Annotation label cuts off when positioned right](https://github.com/chartjs/chartjs-plugin-annotation/issues/151) — clip and xAdjust workarounds
- [GitHub Issue #12101: CSS Level 4 Color Syntax support](https://github.com/chartjs/Chart.js/issues/12101) — oklch fails in Chart.js animation/interpolation paths
- [chartjs-plugin-annotation Label Annotations](https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/types/label.html) — display, font, position options

**Astro (HIGH confidence):**
- [Astro Docs: Layouts](https://docs.astro.build/en/basics/layouts/) — slot behavior, BaseLayout patterns
- [Astro Docs: Routing](https://docs.astro.build/en/guides/routing/) — pathname behavior, trailingSlash config
- [Astro Tutorial: Navigation Component](https://docs.astro.build/en/tutorial/3-components/1/) — active state pattern
- [Highlight Nav Link for Current Page in Astro](https://www.cyishere.dev/blog/astro-active-nav-item) — Astro.url.pathname pattern, aria-current

**Leaflet (HIGH confidence):**
- [Leaflet Docs: Polyline](https://leafletjs.com/reference.html#polyline) — color option accepts hex/rgb/named, not CSS variables
- Existing `RouteMap.astro` inspection — all colors hardcoded as hex

**Tailwind / CSS Color (MEDIUM confidence):**
- [Tailwind v4.0 blog post](https://tailwindcss.com/blog/tailwindcss-v4) — oklch in @theme, CSS-first config
- [OKLCH in CSS: why we moved from RGB and HSL](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl) — gamut behavior, sRGB approximation

**Project source code (HIGH confidence — direct inspection):**
- `scripts/resolve-annotations.js` — overwrites annotations.json from hardcoded source
- `package.json` — dev script runs full pipeline
- `src/components/ElevationProfile.astro` — existing annotation pattern, hex colors, `update('none')`
- `src/components/KomSegments.astro` — renders komTime/qomTime as display strings
- `src/layouts/BaseLayout.astro` — slot structure, overlay z-index values
- `src/styles/global.css` — z-index values for grain-overlay (9999) and escher-overlay (9998)

---

*Pitfalls research for: UI polish + navigation + dev tools additions to MK Ultra Gravel*
*Researched: 2026-03-30*
