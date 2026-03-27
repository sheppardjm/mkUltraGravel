# Phase 13: Map-Elevation Interactivity - Research

**Researched:** 2026-03-27
**Domain:** Chart.js onHover / Leaflet event sync / CustomEvent bus / rAF throttle / TBT performance
**Confidence:** HIGH

---

## Summary

Phase 13 wires bidirectional interactivity between the Chart.js elevation profile and the Leaflet map. The two components live in separate Astro component scripts (ElevationProfile.astro, RouteMap.astro) and are initialized lazily behind IntersectionObserver gates. This creates a state-sharing problem: neither component can directly reference the other's Chart or L.map instance at the time it boots.

The standard approach for this architecture is a `window`-level CustomEvent bus. Component A dispatches a named CustomEvent on `window`; component B's listener handles it. This is zero-dependency, framework-agnostic, and fully supported in Astro's module-scoped scripts. The two directions (SYNC-01: elevation→map, SYNC-02/03/04: map→elevation) are implemented as separate named events.

For SYNC-01 (hover on elevation chart → crosshair on map), the pattern is: Chart.js `onHover` callback → `Chart.helpers.getRelativePosition` + `chart.scales.x.getValueForPixel` → binary-search route-data.json track array for nearest `mi` match → dispatch `elevation:hover` CustomEvent with `{lat, lon}` → map listener calls `crosshairMarker.setLatLng()`. rAF throttle on the `onHover` callback prevents 60+ fps thrash from blocking the main thread.

For SYNC-02/03/04 (map sector polyline hover/click → elevation annotation highlight + zoom), the pattern is: Leaflet `polyline.on('mouseover')` → dispatch `map:sectorHover` CustomEvent with sector index → elevation listener updates annotation `backgroundColor` + calls `chart.update('none')`. Click triggers `map:sectorClick` → elevation highlights band + map `flyToBounds` zooms to sector polyline bounds.

**Primary recommendation:** CustomEvent bus on `window`, lazy initialization guard (wait for both components to be ready before wiring), rAF throttle on onHover, `chart.update('none')` for annotation changes, `flyToBounds` with `maxZoom: 14` for sector zoom. No new npm dependencies needed.

---

## Standard Stack

### Core (already installed — no new packages needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| chart.js | ^4.5.1 | Elevation profile, onHover callback, setActiveElements | Already in package.json |
| chartjs-plugin-annotation | ^3.1.0 | Box annotation highlight/click on sectors | Already in package.json |
| leaflet | ^1.9.4 | Map, CircleMarker crosshair, polyline setStyle, flyToBounds | Already in package.json |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanostores | ~0.11 | Shared reactive state atoms | Only if CustomEvent timing proves brittle across lazy-init components; avoid unless needed — adds a dependency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CustomEvent bus | nanostores atom | nanostores is cleaner for framework components but adds a dep; CustomEvent is zero-dep and works in Astro module scripts |
| CustomEvent bus | leaflet-elevation plugin | leaflet-elevation uses D3.js (+50KB), completely replaces the existing Chart.js elevation component — far too heavy |
| rAF throttle | lodash throttle | lodash adds ~70KB; rAF is native and aligns updates to vsync |
| chart.update('none') | chart.update() | `update()` triggers animation; `update('none')` skips it — critical for onHover performance |

**Installation:** No new packages needed. All libraries already in `package.json`.

---

## Architecture Patterns

### Recommended Project Structure

No new files needed. Changes are in-place to:
```
src/components/
├── ElevationProfile.astro   # Add onHover, annotation click callbacks + CustomEvent dispatch/listen
└── RouteMap.astro           # Add polyline hover/click dispatch + crosshair marker + CustomEvent listen
```

A shared event name registry (inline constants, not a separate file) keeps naming consistent within each component's script.

### Pattern 1: CustomEvent Bus on window

**What:** One component dispatches a named CustomEvent on `window`; the other listens on `window`. The `detail` payload carries the sync data.

**When to use:** When two Astro component scripts need to communicate after separate lazy inits. Astro module scripts are deduplicated and can't import each other's local variables.

**Example:**
```typescript
// Source: MDN CustomEvent API — https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent
// Dispatcher (ElevationProfile.astro)
window.dispatchEvent(new CustomEvent('elevation:hover', {
  detail: { lat: 46.453, lon: -86.984 }
}));

// Listener (RouteMap.astro)
window.addEventListener('elevation:hover', (e: CustomEvent<{lat: number; lon: number}>) => {
  crosshairMarker.setLatLng([e.detail.lat, e.detail.lon]);
});
```

**Key requirement:** The listener must be registered before the dispatcher fires. Because both components are lazy-init behind IntersectionObserver, the listener is registered inside `initMap()` and `initElevation()` after both have run. The map is above the elevation chart in the page (RouteMap appears before ElevationProfile in index.astro), so `initMap` likely runs first. Register map-side listeners inside `initMap()` and elevation-side listeners inside `initElevation()`. No initialization ordering hacks needed.

### Pattern 2: Chart.js onHover → getValueForPixel → Track Lookup

**What:** `onHover` callback fires on every mouse move over the chart area. Convert pixel X to mile value, binary-search `routeData` for nearest `mi`, dispatch CustomEvent.

**When to use:** SYNC-01 — elevation hover drives map crosshair.

**Example:**
```typescript
// Source: Chart.js Interactions docs — https://www.chartjs.org/docs/latest/configuration/interactions.html
// Source: Chart.js API docs — https://www.chartjs.org/docs/latest/developers/api.html
let rafPending = false;

options: {
  onHover: (event, _activeElements, chart) => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      if (!event.native) return;
      const canvasPos = Chart.helpers.getRelativePosition(event.native as MouseEvent, chart);
      const mile = chart.scales.x.getValueForPixel(canvasPos.x) as number;
      // Binary search routeData (pre-loaded in initElevation) for nearest mi
      const pt = findNearestTrackPoint(routeData, mile);
      if (pt) {
        window.dispatchEvent(new CustomEvent('elevation:hover', {
          detail: { lat: pt.lat, lon: pt.lon }
        }));
      }
    });
  }
}
```

**Track lookup pattern (binary search for performance with 2498 points):**
```typescript
// routeData is sorted ascending by mi — binary search is O(log n)
function findNearestTrackPoint(
  track: {lat: number; lon: number; mi: number}[],
  mile: number
): {lat: number; lon: number; mi: number} | null {
  if (!track.length) return null;
  let lo = 0, hi = track.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (track[mid].mi < mile) lo = mid + 1;
    else hi = mid;
  }
  // lo is now the first index >= mile; check lo-1 for closer match
  if (lo > 0 && Math.abs(track[lo-1].mi - mile) < Math.abs(track[lo].mi - mile)) {
    return track[lo-1];
  }
  return track[lo];
}
```

**Data note:** route-data.json has 2498 track points with fields `{lat, lon, ele, mi}`. `routeData` is already fetched inside `initElevation` — reuse that array. Do NOT re-fetch.

### Pattern 3: Leaflet CircleMarker as Crosshair

**What:** A persistent `L.circleMarker` is created once after map init and repositioned with `setLatLng()` on every `elevation:hover` event. The marker starts hidden (opacity 0) and becomes visible on first hover.

**When to use:** SYNC-01 — map crosshair driven by elevation hover.

**Example:**
```typescript
// Source: Leaflet reference — https://leafletjs.com/reference.html#circlemarker
// Create once after map init
const crosshair = L.circleMarker([0, 0], {
  radius: 6,
  color: '#ffffff',
  fillColor: '#22d3ee',
  fillOpacity: 0.9,
  weight: 2,
  opacity: 0  // hidden initially
}).addTo(map);

// Listener registered inside initMap()
window.addEventListener('elevation:hover', (e) => {
  const { lat, lon } = (e as CustomEvent<{lat: number; lon: number}>).detail;
  crosshair.setLatLng([lat, lon]);
  if (crosshair.options.opacity === 0) {
    crosshair.setStyle({ opacity: 1, fillOpacity: 0.9 });
  }
});

// Hide on mouse leave (elevation:hoverEnd event)
window.addEventListener('elevation:hoverEnd', () => {
  crosshair.setStyle({ opacity: 0, fillOpacity: 0 });
});
```

**Color note:** Use `#22d3ee` (cyan) — matches existing restock/photo markers in RouteMap.astro.

### Pattern 4: Annotation Highlight via enter/leave + chart.update('none')

**What:** On `map:sectorHover` event, update the target sector's box annotation `backgroundColor` to a highlighted state and call `chart.update('none')` to re-render without animation.

**When to use:** SYNC-02 — map hover drives elevation band highlight.

**Example:**
```typescript
// Source: chartjs-plugin-annotation guide — https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/configuration.html
// Source: WebSearch verified pattern
// chartInstance must be stored outside initElevation closure and exposed via window or CustomEvent

// Inside initElevation, after chart creation:
(window as any).__elevationChart = chartInstance;

// Or simpler — handle directly inside initElevation's window event listener:
window.addEventListener('map:sectorHover', (e) => {
  const idx = (e as CustomEvent<{sectorIndex: number | null}>).detail.sectorIndex;
  const annotations = chartInstance.options.plugins!.annotation!.annotations as Record<string, any>;
  // Reset all sectors
  Object.keys(annotations).forEach(key => {
    const sector = annotations[key];
    // sector.backgroundColor is stored as original color + '22'
    sector.backgroundColor = sector._baseColor + '22';
  });
  if (idx !== null) {
    annotations[`sector_${idx}`].backgroundColor = annotations[`sector_${idx}`]._baseColor + '66';
  }
  chartInstance.update('none');
});
```

**Alternative using annotation enter/leave callbacks (for click only, not cross-component):**
```typescript
// Direct annotation click — no CustomEvent needed, fires within same chart
annotationBoxes[`sector_${i}`] = {
  type: 'box',
  // ...other options...
  click: (context, event) => {
    window.dispatchEvent(new CustomEvent('elevation:sectorClick', {
      detail: { sectorIndex: i }
    }));
    return true; // triggers automatic chart re-render
  }
};
```

### Pattern 5: Polyline Reference Array (SYNC-02/03/04)

**What:** Store created sector polylines in an indexed array so they can be referenced by index when a CustomEvent arrives from the elevation chart.

**When to use:** Map needs to respond to elevation click by highlighting and zooming to a specific sector.

**Example:**
```typescript
// Source: Leaflet reference — https://leafletjs.com/reference.html
// In RouteMap.astro initMap(), when rendering sectors:
const sectorPolylines: L.Polyline[] = [];

annotations.sectors.forEach((sector, i) => {
  const poly = L.polyline(sectorLatlngs, {
    color: starColors[sector.stars],
    weight: 5,
    opacity: 0.9
  }).addTo(map);

  // Store original style for reset
  const originalStyle = { color: starColors[sector.stars], weight: 5, opacity: 0.9 };

  // Hover events → dispatch to elevation
  poly.on('mouseover', () => {
    window.dispatchEvent(new CustomEvent('map:sectorHover', { detail: { sectorIndex: i } }));
    poly.setStyle({ weight: 7, opacity: 1.0 }); // local highlight feedback
  });
  poly.on('mouseout', () => {
    window.dispatchEvent(new CustomEvent('map:sectorHover', { detail: { sectorIndex: null } }));
    poly.setStyle(originalStyle);
  });
  poly.on('click', () => {
    window.dispatchEvent(new CustomEvent('map:sectorClick', { detail: { sectorIndex: i } }));
  });

  sectorPolylines.push(poly);
});

// Listen for elevation:sectorClick → zoom map to sector
window.addEventListener('elevation:sectorClick', (e) => {
  const { sectorIndex } = (e as CustomEvent<{sectorIndex: number}>).detail;
  const poly = sectorPolylines[sectorIndex];
  if (poly) {
    // Highlight
    sectorPolylines.forEach((p, i) => {
      p.setStyle(i === sectorIndex
        ? { weight: 7, opacity: 1.0 }
        : { weight: 5, opacity: 0.5 }
      );
    });
    // Zoom
    map.flyToBounds(poly.getBounds(), { maxZoom: 14, padding: [40, 40] });
  }
});
```

### Pattern 6: AbortController for Event Listener Cleanup

**What:** Pass the same `AbortController.signal` to all `window.addEventListener` calls in a component's init function. Call `controller.abort()` on page unload or component teardown to remove all listeners at once.

**When to use:** Prevent memory leaks if the page ever navigates away or component is unmounted. Especially important if Astro View Transitions are ever enabled.

**Example:**
```typescript
// Source: CSS-Tricks — https://css-tricks.com/using-abortcontroller-as-an-alternative-for-removing-event-listeners/
const controller = new AbortController();
const { signal } = controller;

window.addEventListener('elevation:hover', handler, { signal });
window.addEventListener('elevation:sectorClick', handler2, { signal });

// On cleanup
window.addEventListener('beforeunload', () => controller.abort(), { once: true });
```

### Anti-Patterns to Avoid
- **Re-fetching route-data.json inside event handlers:** Both `initMap` and `initElevation` already fetch route-data in parallel. Don't re-fetch on hover — use the in-memory array.
- **Calling chart.update() on every onHover:** Without rAF throttle, this runs 60+ times/second and creates long tasks. Always gate behind `requestAnimationFrame`.
- **chart.update() without 'none' mode:** Triggers animations on annotation changes. Use `chart.update('none')` for interactive annotation style changes.
- **Using leaflet-elevation plugin:** It requires D3.js, replaces the existing Chart.js component entirely, and is ~5x heavier than the current stack.
- **Storing chartInstance on window with any cast across multiple files:** Prefer closing over `chartInstance` inside the `initElevation` scope. Only expose via `window.__elevationChart` if the listener cannot be registered inside the same init closure.
- **Adding event listeners before lazy init completes:** If the elevation chart hasn't init'd yet when a `map:sectorHover` fires, the handler will be attached to a non-existent chart. Register handlers inside the init closure, not at module top-level.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Nearest track point by mile | Linear scan loop | Binary search (O(log n)) | 2498 points — linear is fine but binary search is the correct O(log n) pattern |
| Crosshair marker | Custom HTML div overlay | `L.circleMarker` | Built-in Leaflet vector layer, handles reprojection, z-index, and removal correctly |
| Event bus | Custom pub/sub class | `window.dispatchEvent / addEventListener` | Browser-native, no abstraction needed for 4 event types |
| rAF throttle | External throttle library | Inline `rafPending` boolean | No lodash/throttle needed — 3 lines of code |
| Annotation dynamic color | Custom canvas plugin | `chart.options.plugins.annotation.annotations[key].backgroundColor + chart.update('none')` | Plugin supports direct property mutation + update |

**Key insight:** The entire Phase 13 implementation needs zero new npm packages. All primitives (Chart.js, Leaflet, browser CustomEvent, requestAnimationFrame) are already present.

---

## Common Pitfalls

### Pitfall 1: Lazy Init Race Condition
**What goes wrong:** Map component's `window.addEventListener('elevation:sectorClick', ...)` is registered inside `initMap()`. If the user hovers the elevation chart BEFORE the map has initialized (e.g., page load with elevation chart in viewport), the event fires before the listener is attached.
**Why it happens:** Both components are lazy-init behind IntersectionObserver. The elevation chart is below the map on the page, so it init's second — but the user could scroll slowly or use an anchor link.
**How to avoid:** Register all `window` listeners INSIDE the init closure (inside `initMap` / `initElevation`). Never at module top-level. Accept that events fired before the listener is registered are silently dropped — this is acceptable UX (hover before map loads = no crosshair, not an error).
**Warning signs:** `TypeError: Cannot read properties of undefined` when event handler fires and references an uninitialized variable.

### Pitfall 2: onHover Performance — Long Tasks on Mobile
**What goes wrong:** Chart.js `onHover` fires on every mouse movement. Without rAF throttle, calling `chart.update('none')` or `dispatchEvent` inside it creates a new task per mouse event (often >16ms on mid-range mobile), contributing to TBT.
**Why it happens:** Mouse events can fire at 100-250Hz; display is 60Hz. Processing more than ~16ms of work per frame means tasks exceed 50ms → Lighthouse TBT penalty.
**How to avoid:** Use the `rafPending` boolean pattern (3 lines). Only the first mouse event per animation frame triggers processing; subsequent events within the same frame are dropped.
**Warning signs:** Chrome DevTools Performance tab shows Long Tasks (red) during cursor movement. The phase notes this as unverified on mid-range Android — this MUST be tested post-implementation.

### Pitfall 3: chart.update('none') vs chart.update() for Annotation Changes
**What goes wrong:** Calling `chart.update()` without mode `'none'` triggers Chart.js's animation system on every annotation color change. With animations disabled globally (`animation: false`), this is a no-op, but during interactive hover this can cause visible flicker or unnecessary render cycles.
**Why it happens:** The existing ElevationProfile.astro has `animation: false` set globally, so this is mitigated. Still, always use `chart.update('none')` explicitly for interactive updates to be safe.
**How to avoid:** Always pass `'none'` as the mode argument for programmatic hover updates.
**Warning signs:** Subtle visual stutter in the chart during rapid hover transitions.

### Pitfall 4: Annotation Access via chart.options.plugins.annotation.annotations
**What goes wrong:** The annotation plugin stores annotations as `Record<string, object>`. TypeScript strict mode does not know the shape of each annotation object, causing type errors when mutating `backgroundColor`.
**Why it happens:** chartjs-plugin-annotation's TypeScript types are loose on annotation content.
**How to avoid:** Cast the annotations object: `as Record<string, any>`. Store the original base color as a private property (e.g., `_baseColor`) on the annotation object during chart creation so it can be referenced during highlight resets.
**Warning signs:** TypeScript errors like `Property 'backgroundColor' does not exist on type 'object'`.

### Pitfall 5: Leaflet polyline.setStyle() — Original Style Not Automatically Restored
**What goes wrong:** Leaflet's `resetStyle()` only works on GeoJSON layers, not plain `L.polyline`. After highlight-on-hover, `resetStyle()` will not restore the original color.
**Why it happens:** `resetStyle()` is a method on `L.GeoJSON`, not on `L.Polyline`.
**How to avoid:** Store the original style object in a closure variable (`const originalStyle = {...}`) at creation time. Call `poly.setStyle(originalStyle)` on `mouseout`.
**Warning signs:** After hovering, polylines remain highlighted — mouseout handler fails to restore.

### Pitfall 6: TBT is Measured During Page Load, Not Interaction
**What goes wrong:** Misunderstanding that hover-based interactivity will directly impact Lighthouse TBT score during the standard Lighthouse audit.
**Why it happens:** TBT is measured from FCP to TTI during page load only. Interactive event handlers (mousemove, click) do NOT contribute to Lighthouse TBT unless they fire during that load window.
**How to avoid:** The Success Criterion 5 is achievable by simply not adding blocking scripts at load time. Phase 13 adds no synchronous scripts to the critical path — all wiring happens inside lazy-init closures. Measure Lighthouse TBT post-implementation to confirm 0ms is maintained.
**Warning signs:** Misinterpreting Chrome DevTools "Long Tasks during interaction" as Lighthouse TBT failures. They are different metrics.

---

## Code Examples

Verified patterns from official sources:

### onHover with rAF throttle and mile-to-latlon lookup
```typescript
// Source: Chart.js Interactions — https://www.chartjs.org/docs/latest/configuration/interactions.html
// Source: Chart.js API — https://www.chartjs.org/docs/latest/developers/api.html

let rafPending = false;

// Inside Chart options:
onHover: (event, _activeElements, chart) => {
  if (rafPending || !event.native) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    const canvasPos = Chart.helpers.getRelativePosition(
      event.native as MouseEvent, chart
    );
    const mile = chart.scales.x.getValueForPixel(canvasPos.x) as number;
    const pt = findNearestTrackPoint(routeData, mile);
    if (pt) {
      window.dispatchEvent(new CustomEvent('elevation:hover', {
        detail: { lat: pt.lat, lon: pt.lon }
      }));
    }
  });
},
// Dispatch hoverEnd on mouseout (use onLeave or the Chart.js 'mouseout' event):
// Add to options.events default array or handle via canvas mouseleave listener:
// canvas.addEventListener('mouseleave', () => {
//   window.dispatchEvent(new CustomEvent('elevation:hoverEnd'));
// });
```

### CircleMarker creation and setLatLng update
```typescript
// Source: Leaflet reference — https://leafletjs.com/reference.html#circlemarker
const crosshair = L.circleMarker([0, 0] as [number, number], {
  radius: 6,
  color: '#ffffff',
  fillColor: '#22d3ee',
  fillOpacity: 0,
  weight: 2,
  opacity: 0
}).addTo(map);

// On elevation:hover
const handleElevHover = (e: Event) => {
  const { lat, lon } = (e as CustomEvent<{lat: number; lon: number}>).detail;
  crosshair.setLatLng([lat, lon]);
  crosshair.setStyle({ opacity: 1, fillOpacity: 0.9 });
};

// On elevation:hoverEnd
const handleElevHoverEnd = () => {
  crosshair.setStyle({ opacity: 0, fillOpacity: 0 });
};
```

### Annotation dynamic background color update
```typescript
// Source: chartjs-plugin-annotation — https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/configuration.html
// Source: WebSearch verified: chart.options.plugins.annotation.annotations[key].backgroundColor = ...; chart.update();

// During chart creation, store base color:
annotationBoxes[`sector_${i}`] = {
  type: 'box',
  xMin: sector.startMi,
  xMax: sector.endMi,
  backgroundColor: starColors[sector.stars] + '22',
  borderColor: starColors[sector.stars] + '66',
  borderWidth: 1,
  // Store base color for runtime access:
  _baseColor: starColors[sector.stars],
} as any;

// On map:sectorHover event inside initElevation:
window.addEventListener('map:sectorHover', (e) => {
  const { sectorIndex } = (e as CustomEvent<{sectorIndex: number | null}>).detail;
  const anns = chartInstance.options.plugins!.annotation!.annotations as Record<string, any>;
  Object.keys(anns).forEach(key => {
    anns[key].backgroundColor = anns[key]._baseColor + '22'; // reset
  });
  if (sectorIndex !== null) {
    anns[`sector_${sectorIndex}`].backgroundColor =
      anns[`sector_${sectorIndex}`]._baseColor + '66'; // highlight
  }
  chartInstance.update('none');
}, { signal });
```

### flyToBounds to zoom map to sector
```typescript
// Source: Leaflet reference — https://leafletjs.com/reference.html#map-flytobounds
// smooth animated zoom to sector polyline bounds
map.flyToBounds(sectorPolylines[sectorIndex].getBounds(), {
  maxZoom: 14,      // cap zoom for small sectors (Down Jeep is only 0.6mi)
  padding: [40, 40] // breathing room
});
```

### Annotation click to dispatch sector selection
```typescript
// Source: chartjs-plugin-annotation docs — https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/configuration.html
annotationBoxes[`sector_${i}`] = {
  // ...
  click: (_context, _event) => {
    window.dispatchEvent(new CustomEvent('elevation:sectorClick', {
      detail: { sectorIndex: i }
    }));
    return true; // triggers automatic chart re-render
  }
} as any;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `removeEventListener(fn)` requiring stored function refs | `AbortController.signal` passed to `addEventListener` | ~2021, now universally supported | Cleaner multi-listener cleanup |
| `chart.update()` for all updates | `chart.update('none')` for interactive updates | Chart.js 3.x+ | Skips animation for real-time hover |
| Full leaflet-elevation D3 plugin for chart-map sync | Custom CustomEvent bus with Chart.js onHover | Always an option, now preferred | Zero additional dependencies |
| `polyline.resetStyle()` | Store original style object, call `setStyle(originalStyle)` | Leaflet 1.x (resetStyle only on GeoJSON) | Must manually restore styles on polylines |

**Deprecated/outdated:**
- `chart.getElementsAtEvent(e)` (deprecated in Chart.js 3): Use `getElementsAtEventForMode(e, 'nearest', {intersect: false}, true)`
- `L.map.setActiveArea()`: Not relevant here; use `flyToBounds`

---

## Open Questions

1. **onHover performance on mid-range Android**
   - What we know: rAF throttle limits updates to 60fps; Chart.js onHover has been reported as a potential performance issue on low-end devices
   - What's unclear: Whether `chart.update('none')` inside the rAF is fast enough on mid-range Android hardware (<50ms per frame budget)
   - Recommendation: Implement with rAF throttle as planned. After Phase 13 is complete, run Chrome DevTools Performance tab on an emulated mid-range Android device (Moto G Power profile) to verify no Long Tasks. If Long Tasks appear, consider making annotation sync opt-out-able (only on desktop via pointer media query) or removing `chart.update('none')` from the map→elevation direction.

2. **chart.options.plugins.annotation.annotations mutation TypeScript strictness**
   - What we know: tsconfig extends `astro/tsconfigs/strict`; annotation type is `Record<string, AnnotationOptions>` where AnnotationOptions doesn't include custom `_baseColor` property
   - What's unclear: Whether TypeScript strict mode will require explicit interface extension for `_baseColor`
   - Recommendation: Cast annotation objects to `any` when adding `_baseColor`. Alternatively, maintain a parallel `Map<string, string>` of `annotationKey → baseColor` outside the annotation objects. The parallel Map approach is cleaner TypeScript but adds a few lines of code.

3. **Canvas mouseleave for elevation:hoverEnd**
   - What we know: Chart.js `onHover` fires when mouse is over chartArea; it does NOT fire when the mouse exits the canvas
   - What's unclear: Whether a native `canvas.addEventListener('mouseleave', ...)` correctly fires when the mouse exits the elevation chart
   - Recommendation: Add a `mouseleave` listener directly on the canvas element (available after `new Chart(canvas, ...)`) to dispatch `elevation:hoverEnd`. This is a direct DOM event and will work correctly.

4. **Sector index stability across route corrections (dependency on Phase 11)**
   - What we know: Phase 13 depends on Phase 11 (data corrections) for accurate sector positions. Phase 11 is listed as complete (`11-data-corrections`).
   - What's unclear: Whether annotations.json sector indices are stable or could be reordered in future pipeline runs
   - Recommendation: Use sector index (0-5) for the CustomEvent detail since it's the position in the `annotations.sectors` array. If sector order changes, all sync breaks. This is acceptable — document it as a coupling assumption.

---

## Sources

### Primary (HIGH confidence)
- Leaflet 1.9.x reference — https://leafletjs.com/reference.html — CircleMarker API, polyline events, flyToBounds, setStyle
- Chart.js 4.x Interactions docs — https://www.chartjs.org/docs/latest/configuration/interactions.html — onHover signature, getRelativePosition, getValueForPixel
- Chart.js 4.x API docs — https://www.chartjs.org/docs/latest/developers/api.html — setActiveElements, update('none'), destroy
- Chart.js 4.x Performance docs — https://www.chartjs.org/docs/latest/general/performance.html — animation: false, decimation
- chartjs-plugin-annotation label visibility sample — https://www.chartjs.org/chartjs-plugin-annotation/latest/samples/line/labelVisibility.html — enter/leave callback patterns
- chartjs-plugin-annotation configuration — https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/configuration.html — click callback on annotations
- MDN CustomEvent API — https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent — constructor, detail, window bus pattern
- CSS-Tricks AbortController — https://css-tricks.com/using-abortcontroller-as-an-alternative-for-removing-event-listeners/ — multi-listener cleanup pattern

### Secondary (MEDIUM confidence)
- Astro client-side scripts docs — https://docs.astro.build/en/guides/client-side-scripts/ — script module scope, deduplication, data attributes
- Astro sharing state recipe — https://docs.astro.build/en/recipes/sharing-state/ — nanostores vs window globals (nanostores not needed for this phase)
- Chrome DevTools TBT docs — https://developer.chrome.com/docs/lighthouse/performance/lighthouse-total-blocking-time — TBT measured at page load only, 50ms long task threshold
- Chart.js programmatic events sample — https://www.chartjs.org/docs/latest/samples/advanced/programmatic-events.html — setActiveElements and tooltip.setActiveElements

### Tertiary (LOW confidence)
- WebSearch: chartjs-plugin-annotation dynamic update pattern — verified by official docs confirmation that `chart.options.plugins.annotation.annotations[key].backgroundColor = ...; chart.update()` works
- WebSearch: Leaflet polyline hover highlight/reset pattern — verified by Leaflet official reference for setStyle

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All libraries already installed, versions confirmed in package.json
- Architecture: HIGH — CustomEvent bus pattern verified via MDN official docs; Chart.js onHover + getValueForPixel verified via official docs; annotation mutation pattern verified via chartjs-plugin-annotation official sample
- Pitfalls: HIGH — Race condition, rAF throttle, annotation type casting, Leaflet resetStyle limitation all verified against official documentation
- Mobile TBT performance: LOW — Unverified on actual mid-range Android hardware; flagged as open question in phase context

**Research date:** 2026-03-27
**Valid until:** 2026-07-01 (stable libraries — Chart.js 4.x, Leaflet 1.9.x are stable; plugin-annotation 3.x is stable)
