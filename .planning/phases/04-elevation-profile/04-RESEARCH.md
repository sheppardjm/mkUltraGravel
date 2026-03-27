# Phase 4: Elevation Profile - Research

**Researched:** 2026-03-26
**Domain:** Data visualization / Chart.js canvas rendering in Astro static site
**Confidence:** HIGH

## Summary

This phase renders an elevation profile chart below the existing Leaflet map, reading directly from `route-data.json` (2498 points, 0–98.2 miles, 605–1111 ft elevation range) and overlaying colored sector bands from `annotations.json` (6 sectors with mile-marker ranges). The data is already fully prepared — no GPX parsing or data transformation is needed.

The standard stack is **Chart.js v4.5.1** (line chart, canvas-based) with **chartjs-plugin-annotation** for sector bands. This combination: integrates cleanly with Astro's `await import()` pattern already established in `RouteMap.astro`, requires no additional framework (React, Vue, etc.), handles 2498 points performantly via the built-in decimation plugin, and supports full dark-theme customization for the brutalist aesthetic.

The Leaflet elevation plugin (`@raruto/leaflet-elevation`) was evaluated but rejected: it requires D3.js as a heavy dependency, is designed around file-based GPX loading, and embeds the chart inside the map container rather than below it — all misaligned with this project's constraints.

**Primary recommendation:** Use Chart.js v4.5.1 (`chart.js/auto` import) with `chartjs-plugin-annotation` for sector bands. Implement as a new `ElevationProfile.astro` component placed immediately below `<RouteMap />` in `index.astro`.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| chart.js | 4.5.1 | Line chart renderer (canvas) | ESM-native, SSR-safe via `await import()`, built-in decimation for 2498 points, responsive canvas with wrapper div |
| chartjs-plugin-annotation | latest (3.x) | Sector band overlays (box annotations) | Official Chart.js ecosystem plugin, `xMin`/`xMax` by mileage aligns exactly with sector data structure |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| chart.js decimation plugin | bundled | Downsample 2498 points to pixel density | Auto-included with `chart.js/auto`; enable via `plugins.decimation.enabled: true` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Chart.js | Hand-rolled SVG `<polyline>` | SVG is simpler but no built-in decimation, no tooltip, no annotation plugin, more CSS for responsiveness |
| Chart.js | `@raruto/leaflet-elevation` | Requires D3.js (~75KB extra), GPX-file-centric API, embeds inside map control not below it |
| Chart.js | Recharts / Victory | Require React — adds framework overhead to this plain Astro site |
| chartjs-plugin-annotation | Custom `beforeDraw` canvas plugin | More code, no label support, harder to maintain |

**Installation:**
```bash
npm install chart.js chartjs-plugin-annotation
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   ├── RouteMap.astro           # existing — unchanged
│   └── ElevationProfile.astro   # new — Chart.js canvas component
└── pages/
    └── index.astro              # add <ElevationProfile /> after <RouteMap />
```

### Pattern 1: Astro Script Dynamic Import (matches RouteMap.astro pattern)

**What:** Chart.js requires browser globals (`window`, `document`, `canvas`). Use `await import()` inside Astro `<script>` to prevent SSR build errors. This is identical to the `await import('leaflet')` pattern already in `RouteMap.astro`.

**When to use:** Any browser-only library in an Astro component.

**Example:**
```typescript
// Source: Astro tips (astro-tips.dev/tips/script-tag-dynamic-imports/) + Chart.js docs
<script>
  // chart.js/auto registers all controllers, elements, scales, and plugins
  const { Chart } = await import('chart.js/auto');
  const AnnotationPlugin = (await import('chartjs-plugin-annotation')).default;
  Chart.register(AnnotationPlugin);

  const [routeData, annotations] = await Promise.all([
    fetch('/data/route-data.json').then(r => r.json()),
    fetch('/data/annotations.json').then(r => r.json())
  ]);
  // ... build chart
</script>
```

### Pattern 2: Responsive Canvas with Wrapper Div

**What:** Chart.js cannot size itself responsively via canvas attributes or style. A relatively-positioned wrapper div controls height; the canvas fills it. `maintainAspectRatio: false` is required.

**When to use:** Always for responsive Chart.js in fixed-height contexts.

**Example:**
```html
<!-- Wrapper controls height; Chart.js sizes canvas to fill it -->
<div class="elevation-container">
  <canvas id="elevation-chart"></canvas>
</div>

<style>
  .elevation-container {
    position: relative;  /* REQUIRED by Chart.js responsive */
    width: 100%;
    height: 160px;       /* fixed px height works reliably; avoid % or vh in wrapper */
  }
  @media (min-width: 768px) {
    .elevation-container { height: 200px; }
  }
</style>
```

```javascript
// Source: Chart.js responsive docs
new Chart(canvas, {
  options: {
    responsive: true,
    maintainAspectRatio: false,  // REQUIRED when wrapper sets height
    // ...
  }
});
```

### Pattern 3: Sector Bands via chartjs-plugin-annotation Box Annotations

**What:** Map each sector's `startMi`/`endMi` to a box annotation with `xMin`/`xMax` along the x-axis. No `yMin`/`yMax` needed — omitting them expands the box to chart edges (full-height bands).

**When to use:** Overlaying range indicators on a line chart x-axis.

**Example:**
```javascript
// Source: chartjs-plugin-annotation docs + verified sector data
const starColors = {
  1: '#888888', 2: '#aaaaaa', 3: '#f5a623', 4: '#e86d1f', 5: '#c0392b'
};

const annotationBoxes = {};
annotations.sectors.forEach((sector, i) => {
  annotationBoxes[`sector_${i}`] = {
    type: 'box',
    xMin: sector.startMi,
    xMax: sector.endMi,
    // yMin / yMax omitted → full-height band
    backgroundColor: starColors[sector.stars] + '33',  // 20% opacity
    borderColor: starColors[sector.stars] + '88',       // 53% opacity
    borderWidth: 1,
    label: {
      display: true,
      content: sector.name,
      position: { x: 'center', y: 'start' },
      color: starColors[sector.stars],
      font: { size: 9 }
    }
  };
});
```

**Actual sector xMin/xMax values from annotations.json:**
- Sandstrom: 23.3 – 29.18 mi (3 stars, amber)
- Akkala Rd: 39.4 – 40.83 mi (3 stars, amber)
- Haavisto: 43.3 – 44.74 mi (4 stars, orange)
- Forest Service Rd: 50.7 – 57.14 mi (2 stars, light gray)
- C4: 58.7 – 64.36 mi (5 stars, red)
- Down Jeep: 83.0 – 83.60 mi (5 stars, red)

### Pattern 4: Dark Theme Axis Styling

**What:** Chart.js defaults to white background with dark text. Override scales and canvas background to match the site's `oklch` brutalist palette.

**Example:**
```javascript
// Source: Chart.js axes/styling docs + canvas-background docs
const canvasBackgroundPlugin = {
  id: 'customCanvasBackground',
  beforeDraw: (chart) => {
    const { ctx } = chart;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = 'oklch(0.14 0.01 250)';  // --color-bg-surface
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();
  }
};

options: {
  scales: {
    x: {
      grid: { color: 'oklch(0.25 0.01 250)' },       // --color-border
      ticks: { color: 'oklch(0.55 0.01 90)' }        // --color-text-muted
    },
    y: {
      grid: { color: 'oklch(0.25 0.01 250)' },
      ticks: {
        color: 'oklch(0.55 0.01 90)',
        callback: (val) => `${Math.round(val * 3.281)}ft`  // meters → feet
      }
    }
  }
}
```

### Pattern 5: Data Decimation for 2498 Points

**What:** Chart.js built-in LTTB decimation reduces render workload by keeping only shape-preserving points at the pixel level.

**When to use:** Datasets with more points than chart pixel width (2498 points >> ~800 canvas pixels).

**Example:**
```javascript
// Source: Chart.js performance docs
options: {
  parsing: false,          // data is pre-parsed (array of {x, y})
  animation: false,        // disable for static chart
  plugins: {
    decimation: {
      enabled: true,
      algorithm: 'lttb',   // Largest Triangle Three Bucket — best for elevation
      samples: 500         // reduce to 500 points max
    }
  },
  elements: {
    point: { radius: 0 }   // hide individual points
  }
}
```

**Data shape required for `parsing: false`:**
```javascript
// route-data.json points → {x: mi, y: ele}
const chartData = routeData.map(pt => ({ x: pt.mi, y: pt.ele }));
```

### Anti-Patterns to Avoid

- **`chart.js` auto import with manual tree-shaking at first:** Use `chart.js/auto` for this project — the bundle size difference is negligible for a static route page, and manual registration is error-prone
- **Setting canvas height via CSS `style` attribute:** Causes blurry rendering — use wrapper div instead
- **Using `%` units for wrapper div height:** Can cause infinite resize loop in Chart.js — use `px` heights
- **Omitting `maintainAspectRatio: false`:** Chart ignores wrapper height and uses its own aspect ratio
- **SSR import (`import Chart from 'chart.js'` at top level):** Astro builds server-side; Canvas is not available. Always use `await import()` inside `<script>` tag

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sector shaded bands | Custom `beforeDraw` canvas rectangle code | `chartjs-plugin-annotation` box type | Annotation handles z-order, labels, hover, future interactivity |
| Data downsampling | Manual every-Nth-point filter | Chart.js `decimation` plugin with `lttb` | LTTB preserves peaks/valleys; every-Nth would miss the 1111ft summit |
| Tooltip formatting | Custom canvas hit-test | Chart.js built-in `tooltip` with `callbacks.label` | Handles touch events, position clamping, multi-dataset already |
| Responsive resize | ResizeObserver + manual canvas redraw | Chart.js `responsive: true` + wrapper div | Built-in handles devicePixelRatio, orientation change |

**Key insight:** Chart.js is built for exactly this use case. Its performance (decimation), responsiveness (wrapper div pattern), and annotation ecosystem (chartjs-plugin-annotation) solve every requirement without custom code.

## Common Pitfalls

### Pitfall 1: Canvas Not Found at Script Execution Time

**What goes wrong:** `document.getElementById('elevation-chart')` returns `null` because the Astro script runs before the DOM is fully rendered.

**Why it happens:** Astro `<script>` tags are hoisted and may execute before the `<canvas>` is in the DOM.

**How to avoid:** The `await import()` pattern in Astro `<script>` tags is deferred (module scripts), so the DOM is ready. But verify with `document.querySelector('#elevation-chart')` and guard with a null check. Alternatively, use a `DOMContentLoaded` listener.

**Warning signs:** `Chart.js` error "canvas element not found" or silent failure.

### Pitfall 2: Chart.js Responsive Infinite Resize Loop

**What goes wrong:** Canvas grows indefinitely, consuming memory, and the profile stretches beyond viewport.

**Why it happens:** If the wrapper div height is set in `%` or `vh`, Chart.js resizes the canvas, which resizes the container, which triggers Chart.js again.

**How to avoid:** Use fixed `px` heights on the wrapper div. Use media queries to step-change heights at breakpoints rather than `vh`.

**Warning signs:** Profile visible at desktop but overflows on mobile; layout jitter on resize.

### Pitfall 3: Elevation Displayed in Wrong Units

**What goes wrong:** Y-axis shows values like "190" to "338" with no units — those are meters, but most riders think in feet.

**Why it happens:** `route-data.json` stores elevation in meters (raw GPX parser output). The chart will render meters by default.

**How to avoid:** Convert in the tick callback: `callback: (val) => `${Math.round(val * 3.281)}ft``. OR pre-convert data to feet when building `chartData`. The tick callback approach is cleaner — data stays in meters (consistent with GPX source).

**Warning signs:** Summit appears as "338" — looks wrong. Correct summit is ~1111ft.

### Pitfall 4: chartjs-plugin-annotation Import/Registration Order

**What goes wrong:** Box annotations don't appear; no error in console.

**Why it happens:** `chartjs-plugin-annotation` must be registered BEFORE the chart is instantiated. If `Chart.register(AnnotationPlugin)` is called after `new Chart(...)`, annotations silently fail.

**How to avoid:** Always register the plugin immediately after importing it, before creating any Chart instance.

**Warning signs:** No annotation boxes visible; `chart.options.plugins.annotation` exists in config but has no effect.

### Pitfall 5: `parsing: false` Requires Exact Data Shape

**What goes wrong:** Decimation doesn't work; Chart.js logs a warning about parsing mode.

**Why it happens:** `parsing: false` tells Chart.js the data is already in `{x, y}` format. If you pass `[190.07, 190.67, ...]` (value-only array) or `[{lat, lon, ele, mi}]` (full route objects), parsing fails.

**How to avoid:** Always map route data before passing: `routeData.map(pt => ({ x: pt.mi, y: pt.ele }))`.

**Warning signs:** Decimation warning in console; or all 2498 points rendered slowly.

## Code Examples

### Complete ElevationProfile.astro Script Block

```typescript
// Source: Chart.js docs (integration, responsive, performance, canvas-background)
// + chartjs-plugin-annotation docs (box type)
<script>
  const { Chart } = await import('chart.js/auto');
  const { default: AnnotationPlugin } = await import('chartjs-plugin-annotation');
  Chart.register(AnnotationPlugin);

  const [routeData, annotations] = await Promise.all([
    fetch('/data/route-data.json').then(r => r.json()),
    fetch('/data/annotations.json').then(r => r.json())
  ]);

  // Map to {x, y} for parsing: false mode
  const chartData = routeData.map((pt: { mi: number; ele: number }) => ({
    x: pt.mi,
    y: pt.ele
  }));

  // Sector band annotations
  const starColors: Record<number, string> = {
    1: '#888888', 2: '#aaaaaa', 3: '#f5a623', 4: '#e86d1f', 5: '#c0392b'
  };
  const annotationBoxes: Record<string, object> = {};
  annotations.sectors.forEach((sector: { name: string; startMi: number; endMi: number; stars: number }, i: number) => {
    annotationBoxes[`sector_${i}`] = {
      type: 'box',
      xMin: sector.startMi,
      xMax: sector.endMi,
      backgroundColor: starColors[sector.stars] + '22',
      borderColor: starColors[sector.stars] + '66',
      borderWidth: 1,
    };
  });

  // Canvas background plugin (dark theme)
  const darkBgPlugin = {
    id: 'darkBackground',
    beforeDraw: (chart: any) => {
      const { ctx } = chart;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = 'oklch(0.14 0.01 250)';
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    }
  };

  const canvas = document.getElementById('elevation-chart') as HTMLCanvasElement;
  new Chart(canvas, {
    type: 'line',
    data: {
      datasets: [{
        data: chartData,
        borderColor: 'oklch(0.55 0.01 90)',
        borderWidth: 1.5,
        backgroundColor: 'oklch(0.25 0.01 250 / 0.4)',
        fill: true,
        tension: 0,
        pointRadius: 0,
      }]
    },
    options: {
      parsing: false,
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        decimation: {
          enabled: true,
          algorithm: 'lttb',
          samples: 500
        },
        annotation: { annotations: annotationBoxes },
        tooltip: {
          callbacks: {
            label: (ctx) => `${Math.round((ctx.parsed.y as number) * 3.281)} ft`,
            title: (items) => `${(items[0].parsed.x as number).toFixed(1)} mi`
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: 100,
          grid: { color: 'oklch(0.25 0.01 250)' },
          ticks: {
            color: 'oklch(0.55 0.01 90)',
            callback: (val) => `${val}mi`
          }
        },
        y: {
          grid: { color: 'oklch(0.25 0.01 250)' },
          ticks: {
            color: 'oklch(0.55 0.01 90)',
            callback: (val) => `${Math.round((val as number) * 3.281)}ft`
          }
        }
      }
    },
    plugins: [darkBgPlugin]
  });
</script>
```

### Component HTML + CSS Structure

```html
<!-- ElevationProfile.astro -->
<div class="elevation-wrapper">
  <div class="elevation-container">
    <canvas id="elevation-chart"></canvas>
  </div>
</div>

<style>
  .elevation-wrapper {
    width: 100%;
    margin-top: 0.5rem;
  }

  /* Wrapper controls height — Chart.js sizes canvas to fill */
  .elevation-container {
    position: relative;  /* REQUIRED */
    width: 100%;
    height: 140px;
  }

  @media (min-width: 768px) {
    .elevation-container {
      height: 180px;
    }
  }
</style>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `require('chart.js')` CJS | `await import('chart.js/auto')` ESM | Chart.js v3+ | SSR-safe in Astro without config changes |
| `import Chart from 'chart.js'; Chart.defaults.global.*` | `import Chart from 'chart.js/auto'; Chart.defaults.*` | Chart.js v3 | `global` namespace removed |
| Manual canvas background via CSS | `beforeDraw` canvas plugin | Chart.js v3 | CSS background doesn't cover the canvas properly |
| leaflet-elevation (D3-based) | chart.js + annotation plugin | N/A | Decoupled from map, no D3 dependency, below-map layout |

**Deprecated/outdated:**
- `chart.js` version 2.x: completely different API (`Chart.defaults.global`, `legend.labels.fontColor`) — all examples from 2019-2021 era tutorials use v2 patterns that don't work in v4
- Leaflet elevation plugin: designed for in-map display and GPX file ingestion, not standalone profile below map

## Open Questions

1. **Elevation unit preference: meters vs. feet in chart**
   - What we know: GPX/route-data.json uses meters; UI copy says "100 miles" (imperial)
   - What's unclear: Should tooltip show "1111ft" or "339m" or both?
   - Recommendation: Display feet in ticks and tooltip (US cycling audience), keep data in meters internally

2. **Sector label visibility on mobile**
   - What we know: Sector bands can have annotation labels via chartjs-plugin-annotation `label` config; at 140px chart height and narrow mobile viewports, labels may overlap
   - What's unclear: Whether to show sector names inline on the chart or rely only on band color
   - Recommendation: Start with labels disabled on the chart (color band alone is sufficient); sector names are on the map via popup. Can add labels as Phase 4 enhancement if viewport allows.

3. **X-axis max value: 98.22mi vs 100mi**
   - What we know: route-data.json ends at 98.2255 mi (current GPX); project memory notes route extended to 100mi with updated GPX pending
   - What's unclear: Whether to set `x.max: 100` (forward-compatible) or auto-scale to actual data
   - Recommendation: Set `x.max: 100` to match hero text "100 miles" and auto-accommodate when updated GPX arrives

## Sources

### Primary (HIGH confidence)

- Chart.js official docs (chartjs.org/docs/latest) — line charts, responsive configuration, performance/decimation, canvas background plugin, axes styling, tooltip callbacks
- chartjs-plugin-annotation docs (chartjs.org/chartjs-plugin-annotation/latest) — box annotation configuration, xMin/xMax usage
- Astro Tips (astro-tips.dev/tips/script-tag-dynamic-imports/) — dynamic import pattern in Astro script tags
- Project codebase: `RouteMap.astro` — confirmed `await import()` pattern works for Leaflet; same pattern applies to Chart.js

### Secondary (MEDIUM confidence)

- Chart.js GitHub releases page — confirmed latest stable version is v4.5.1 (Oct 13, 2024)
- WebSearch: Geoapify tutorial on Chart.js elevation profiles confirms x=distance, y=elevation as standard axis mapping
- WebSearch: Astro docs recommendation of Chart.js for data-intensive visualizations confirmed

### Tertiary (LOW confidence)

- leaflet-elevation GitHub README — d3.js dependency and detached mode details; not verified via Context7 (library not in Context7 index)
- chartjs-plugin-annotation version number (3.x) — npm page returned 403; confirmed "latest" from docs but exact current version unverified

## Metadata

**Confidence breakdown:**
- Standard stack (Chart.js + annotation plugin): HIGH — official docs verified, `await import()` pattern confirmed in existing codebase
- Architecture (responsive wrapper, decimation, dark theme): HIGH — all patterns from official Chart.js docs
- Pitfalls: HIGH for SSR/canvas and responsive issues (official docs explicit); MEDIUM for annotation registration order (community pattern, consistent with docs)
- Sector band coordinates: HIGH — extracted directly from actual `annotations.json` data

**Research date:** 2026-03-26
**Valid until:** 2026-09-26 (Chart.js 4.x is stable; annotation plugin API is stable)
