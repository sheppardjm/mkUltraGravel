# Phase 52: Mobile Elevation Labels — Research

**Researched:** 2026-04-08
**Domain:** Chart.js annotation plugin — responsive/scriptable label visibility
**Confidence:** HIGH

---

## Summary

Phase 52 hides sector name labels, star-rating labels, and KOM segment labels on the elevation profile chart at viewport widths below 640px, while preserving colored annotation bands at all sizes. This is a single-file change to `src/components/ElevationProfile.astro`.

The chart uses `chartjs-plugin-annotation` v3.1.0 to render annotation boxes with embedded labels. Both the annotation-level `display` property and the label-level `label.display` property are **scriptable** — they accept a function instead of a static boolean. That function is re-evaluated during `afterUpdate`, which Chart.js triggers automatically on window resize (responsive mode is already enabled). This means a `window.innerWidth >= 640` guard in the scriptable function is sufficient; no `ResizeObserver`, no `window.addEventListener('resize', ...)`, no manual `chart.update()` call is needed.

The annotation bands themselves (background color, border) are not on the `label.display` path — they remain visible regardless. Setting `label.display: (ctx) => window.innerWidth >= 640` hides only text, leaving colored bands untouched, which satisfies ELEV-08.

**Primary recommendation:** Replace the two static `label: { display: true }` assignments with a scriptable function `label: { display: () => window.innerWidth >= 640 }` inside the `annotationBoxes` construction loop. No other changes required.

---

## Standard Stack

### Core (already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `chartjs-plugin-annotation` | ^3.1.0 | Draws box + label overlays on Chart.js canvas | Already in use; v3 supports scriptable `display` |
| `chart.js` | ^4.5.1 | Canvas charting engine | Already in use |

### Supporting

No new libraries needed. The entire change is a configuration update within the existing annotation options object.

**Installation:** None required.

---

## Architecture Patterns

### Relevant Project Structure

```
src/components/ElevationProfile.astro   ← only file to modify
public/data/annotations.json           ← data source (unchanged)
```

### Pattern 1: Scriptable Annotation Label Display

**What:** `label.display` accepts a function `(context, opts) => boolean`. The function is re-evaluated on every `afterUpdate` lifecycle hook, which fires on window resize when `responsive: true` (already set).

**When to use:** Whenever annotation label visibility needs to change based on runtime conditions (viewport width, chart size, data values).

**Example (from official chartjs-plugin-annotation docs):**
```javascript
// Source: https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/options.html
display: (context, opts) => {
  const body = document.querySelector('body');
  const rect = body.getBoundingClientRect();
  return rect.width >= 1000;
}
```

**For this phase (640px breakpoint with `window.innerWidth`):**
```javascript
label: {
  display: () => window.innerWidth >= 640,
  content: labelContent,
  // ... rest unchanged
}
```

### Pattern 2: Annotation-level vs. Label-level Display

There are two separate `display` properties — they control different things:

| Property | What it hides | Default |
|----------|--------------|---------|
| `annotationBoxes[key].display` | The entire box (band + label) | `true` |
| `annotationBoxes[key].label.display` | Only the text label inside the box | `true` (v3.x confirmed) |

For ELEV-08 (bands must remain visible), use `label.display` only — **not** the top-level `display`. Never set the top-level `display` to false for mobile, as that would hide the colored bands too.

### Anti-Patterns to Avoid

- **Setting top-level `display: () => window.innerWidth >= 640`**: This hides the entire annotation including the colored band. ELEV-08 requires bands to remain visible. Use `label.display` only.
- **Adding `window.addEventListener('resize', () => chart.update())`**: Unnecessary. Chart.js responsive mode + scriptable re-evaluation handles this automatically. Adding a manual listener creates a duplicate update path and potential flicker.
- **Using CSS `@media` to hide canvas text**: Labels are drawn on a `<canvas>` element. CSS `display:none` on a canvas overlay will not work — canvas content is pixel-painted, not DOM elements.
- **Using `matchMedia()` with `addListener`**: Overcomplicated. The scriptable function receives live evaluation on every chart update; no event listener needed.
- **Storing a `mobile` flag outside the Chart options then updating annotations on resize**: More code, same result. The scriptable function is the idiomatic approach in chartjs-plugin-annotation v3.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Resize-aware annotation visibility | ResizeObserver + manual chart.update() loop | Scriptable `label.display` function | Plugin evaluates on every afterUpdate; resize already triggers update |
| Viewport breakpoint check | Custom breakpoint manager | `window.innerWidth >= 640` inline | Single condition, no abstraction needed |
| Hiding canvas-drawn text | CSS overlays | `label.display` scriptable | Canvas text is pixel-painted; CSS cannot target it |

**Key insight:** chartjs-plugin-annotation v3's scriptable options are the correct and idiomatic mechanism. The official docs explicitly show `getBoundingClientRect().width >= 1000` as the viewport-responsive display pattern.

---

## Common Pitfalls

### Pitfall 1: Confusing annotation `display` vs. `label.display`

**What goes wrong:** Developer sets the top-level `display: () => window.innerWidth >= 640` thinking this only hides the label. Instead, it hides the entire box annotation including the colored background band.

**Why it happens:** Both the annotation and its label have a `display` property. They look identical in the config.

**How to avoid:** Set `label.display` (nested under `label: { display: ... }`), not the annotation root `display`. The annotation root `display` controls band + label together.

**Warning signs:** On mobile, the colored bands disappear along with text — this confirms the wrong `display` was set.

### Pitfall 2: Label display defaults differ between annotation types

**What goes wrong:** Assuming `label.display` defaults to `false` everywhere (as it does for standalone `label`-type annotations). For `box`-type annotations, `label.display` appears to default to `true` in v3.

**Why it happens:** The existing code already has `label: { display: true }` explicitly set on both sector and KOM annotations, which confirms the intent — and means the current value is `true` in both places. Replacing `true` with the function `() => window.innerWidth >= 640` is the complete change.

**How to avoid:** The existing codebase already explicitly sets `label: { display: true }` — just replace both with the function.

### Pitfall 3: Scriptable function not re-evaluated on resize

**What goes wrong:** Developer assumes scriptable functions only run once at chart creation, adds a manual resize listener to call `chart.update()`.

**Why it happens:** Misunderstanding of Chart.js lifecycle hooks.

**How to avoid:** Trust the official docs. Scriptable options are evaluated during `afterUpdate`. `responsive: true` (already set in ElevationProfile.astro) causes Chart.js to automatically update on container resize. The scriptable function runs on every update — resize-triggered updates included.

**Warning signs if this were a real issue:** Labels would not reappear when resizing from mobile back to desktop — but they would work at page-load width. This would indicate the function runs at init only.

### Pitfall 4: 639px vs. 640px boundary precision

**What goes wrong:** Using `window.innerWidth > 639` vs. `window.innerWidth >= 640`. Both are correct but use the form that matches success criteria language.

**How to avoid:** Use `window.innerWidth >= 640` — this matches the success criterion wording ("at exactly 640px, labels are visible").

---

## Code Examples

Verified patterns from official sources:

### Current state (both sector and KOM annotation label blocks)

```javascript
// Sector annotations (ElevationProfile.astro lines 78–86)
label: {
  display: true,
  content: labelContent,
  position: { x: 'center', y: 'end' },
  color: starColors[sector.stars] + 'cc',
  font: { size: 9, family: 'Space Mono, monospace' },
  yAdjust: i % 2 === 0 ? 0 : -16,
  rotation: isNarrow ? -90 : 0,
},

// KOM annotations (ElevationProfile.astro lines 106–112)
label: {
  display: true,
  content: kom.name,
  color: '#7fff00cc',
  font: { size: 9, family: 'Space Mono, monospace' },
  position: 'start',
},
```

### Target state (both label blocks — the only change)

```javascript
// Sector annotations — change display: true → display: () => window.innerWidth >= 640
label: {
  display: () => window.innerWidth >= 640,
  content: labelContent,
  position: { x: 'center', y: 'end' },
  color: starColors[sector.stars] + 'cc',
  font: { size: 9, family: 'Space Mono, monospace' },
  yAdjust: i % 2 === 0 ? 0 : -16,
  rotation: isNarrow ? -90 : 0,
},

// KOM annotations — change display: true → display: () => window.innerWidth >= 640
label: {
  display: () => window.innerWidth >= 640,
  content: kom.name,
  color: '#7fff00cc',
  font: { size: 9, family: 'Space Mono, monospace' },
  position: 'start',
},
```

That is the complete implementation: **two lines changed** (`display: true` → `display: () => window.innerWidth >= 640`), both inside the `<script>` block of `ElevationProfile.astro`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static `display: true/false` at build time | Scriptable `display: (ctx) => fn()` at runtime | chartjs-plugin-annotation v2+ | Enables responsive visibility without chart re-creation |

**Deprecated/outdated:**
- Manual resize listeners that destroy and recreate the Chart instance: No longer needed. Responsive mode + scriptable options handle this in v3.

---

## Open Questions

None blocking. The implementation path is fully resolved.

1. **Will scriptable re-evaluation fire on orientation change (mobile)?**
   - What we know: `window.innerWidth` updates correctly on orientation change in modern mobile browsers. Chart.js `responsive: true` detects the resize.
   - What's unclear: Timing — orientation change may fire before `window.innerWidth` updates in some edge cases.
   - Recommendation: The success criteria test at 375px and 640px viewports, not orientation change. This edge case is out of scope.

2. **TypeScript type for scriptable `display`?**
   - What we know: chartjs-plugin-annotation v3 TypeScript types declare `display` as `Scriptable<boolean, AnnotationContext>` — meaning both `boolean` and `() => boolean` are valid.
   - What's unclear: Whether the Astro `<script>` compilation will infer the function type correctly without explicit typing.
   - Recommendation: No explicit TypeScript annotation needed. The existing file uses untyped annotation object literals and TypeScript will infer correctly.

---

## Sources

### Primary (HIGH confidence)
- `https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/options.html` — Scriptable options API, display function signature, `window.getBoundingClientRect()` responsive example
- `https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/types/box.html` — Box annotation `display` and `label.display` properties, both confirmed scriptable
- `https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/types/label.html` — Confirmed `label.display` defaults to `true` in v3
- `https://www.chartjs.org/docs/latest/configuration/responsive.html` — `responsive: true` triggers updates on container resize; `onResize` callback documented
- `https://github.com/chartjs/chartjs-plugin-annotation/blob/master/docs/guide/options.md` — Scriptable re-evaluation during `afterUpdate` confirmed

### Secondary (MEDIUM confidence)
- Codebase inspection of `src/components/ElevationProfile.astro` — confirms `responsive: true`, `maintainAspectRatio: false`, and current `label: { display: true }` in both sector and KOM annotation loops

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; existing chartjs-plugin-annotation v3.1.0 confirmed scriptable
- Architecture: HIGH — scriptable `label.display` function pattern confirmed from official docs with matching example
- Pitfalls: HIGH — annotation vs label `display` distinction confirmed by reading both doc pages; canvas CSS pitfall is architectural fact

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (chartjs-plugin-annotation is stable; 30-day window appropriate)
