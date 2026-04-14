# Phase 60: Down Jeep Elevation Label Fix - Research

**Researched:** 2026-04-13
**Domain:** chartjs-plugin-annotation label configuration (Chart.js 4.5.1 / chartjs-plugin-annotation 3.1.0)
**Confidence:** HIGH

## Summary

The bug is fully diagnosed. Down Jeep is the only sector with width < 1.0mi (0.594mi), which triggers an `isNarrow` guard in `ElevationProfile.astro`. That guard applies two changes: (1) it strips `sector.name` from `labelContent`, leaving only stars, and (2) it rotates the label -90 degrees. The requirement says the label must render **horizontally** (rotation: 0) with the name visible and no clipping.

The fix has two distinct parts: (a) always include `sector.name` in `labelContent` regardless of width, and (b) remove the -90 rotation for Down Jeep so it renders horizontally. However, because Down Jeep's band is only ~3-6px wide on the chart canvas, a horizontal label will overflow the band's box boundary — which is fine, because chartjs-plugin-annotation does NOT clip labels to their parent box; it only clips to the chart area (`clip: true` globally). Since Down Jeep sits at 76% across the chart (mile 83.55 out of 110), the horizontal label has roughly 23.5% of chart width to the right before hitting the clip boundary, which is ample room for "Down Jeep ★★★★★" at 9px font.

No library upgrades or new dependencies are required. The fix is entirely within the `annotationBoxes` construction loop in `ElevationProfile.astro`.

**Primary recommendation:** Remove the `isNarrow` branch for `labelContent` (always include name + stars), set `rotation: 0` for all sectors, and use `position: { x: 'start', y: 'end' }` with a small `xAdjust` to visually anchor the horizontal label outside the narrow band.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| chart.js | 4.5.1 (installed) | Canvas charting engine | Already in use |
| chartjs-plugin-annotation | 3.1.0 (installed) | Box/label overlays on chart | Already in use |

### Supporting
No new libraries needed. This is a configuration-only fix within existing dependencies.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| xAdjust offset | SVG overlay | SVG adds complexity; xAdjust is native to the plugin |
| rotation: 0 + offset | rotation: -90 + include name | -90 satisfies "visible" but violates "horizontally" requirement |

**Installation:** No new packages required.

---

## Architecture Patterns

### File to Modify
```
src/
└── components/
    └── ElevationProfile.astro   # Lines 62-91 (annotationBoxes loop)
```

### Pattern 1: isNarrow Label Construction (Current — Buggy)

**What:** Two separate branches for `labelContent` and `rotation` based on `widthMi < 1.0`.

**Current code (lines 62-91 of ElevationProfile.astro):**
```javascript
const widthMi = sector.endMi - sector.startMi;
const isNarrow = widthMi < 1.0;
const starsStr = '\u2605'.repeat(sector.stars);
const labelContent: string[] = isNarrow
  ? [starsStr]                      // BUG: strips name
  : [sector.name, starsStr];

// ...
label: {
  display: () => window.innerWidth >= 640,
  content: labelContent,
  position: { x: 'center', y: 'end' },
  color: starColors[sector.stars] + 'cc',
  font: { size: 9, family: 'Space Mono, monospace' },
  yAdjust: i % 2 === 0 ? 0 : -16,
  rotation: isNarrow ? -90 : 0,    // BUG: requirement says horizontal
},
```

### Pattern 2: Unified Label Construction (Fix)

**What:** Always include name + stars; always horizontal (rotation: 0). For narrow sectors, shift the label to start of box so it reads as a flag/callout outside the narrow band.

```javascript
const widthMi = sector.endMi - sector.startMi;
const isNarrow = widthMi < 1.0;
const starsStr = '\u2605'.repeat(sector.stars);
const labelContent: string[] = [sector.name, starsStr];  // always both

// ...
label: {
  display: () => window.innerWidth >= 640,
  content: labelContent,
  position: { x: isNarrow ? 'start' : 'center', y: 'end' },
  xAdjust: isNarrow ? 4 : 0,      // slight offset right so text clears the band
  color: starColors[sector.stars] + 'cc',
  font: { size: 9, family: 'Space Mono, monospace' },
  yAdjust: i % 2 === 0 ? 0 : -16,
  rotation: 0,                     // always horizontal (requirement)
},
```

**Alternative minimal fix (if position offset not needed):**
```javascript
const labelContent: string[] = [sector.name, starsStr];  // remove isNarrow branch
// rotation: 0 always (remove isNarrow ternary)
```

### Anti-Patterns to Avoid
- **Switching to rotation: -90 for narrow sectors:** Violates the "horizontally" requirement in ELEV-09 and the phase goal.
- **Changing isNarrow threshold only:** Does not fix the problem; Down Jeep will always be 0.594mi wide.
- **Global `clip: false`:** Allows annotations to overflow the chart area entirely. Not needed here — Down Jeep is at 76% of chart width with room to the right; and `clip: false` affects all annotations and disables interaction events outside chartArea.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Label overflow detection | Custom canvas measurement + conditional hide | `clip: true` (default) + position/xAdjust | Plugin handles chart-area clipping natively |
| Text fitting in narrow band | Truncation logic | `position: 'start' + xAdjust` | Plugin renders text outside the band naturally |

**Key insight:** chartjs-plugin-annotation does NOT clip labels to their parent box boundary — only to the chart area. A horizontal label on a 3px-wide band will naturally extend beyond the band, which is the desired visual outcome.

---

## Common Pitfalls

### Pitfall 1: Confusing Box Clipping with Chart Area Clipping
**What goes wrong:** Developer adds `clip: false` globally to prevent label clipping, which allows annotations to overflow the chart area and breaks interaction events.
**Why it happens:** Misunderstanding the two-level clipping (box boundary = no clipping by plugin design; chart area = `clip` option).
**How to avoid:** Do NOT set `clip: false`. Down Jeep is positioned at mile 83.55 in a 110mi chart — 23.5% from the right edge — so a horizontal 9px label fits within the chart area without any clip changes.
**Warning signs:** Labels appearing outside chart bounds at narrow viewports.

### Pitfall 2: Removing isNarrow Without Checking Other Narrow Scenarios
**What goes wrong:** Removing `isNarrow` fully might cause issues if future sectors are added that are extremely narrow (< 0.3mi) and the label overlaps adjacent sector labels.
**Why it happens:** Down Jeep is the only sector currently < 1.0mi, but the threshold guard was defensive.
**How to avoid:** Keep `isNarrow` for the `position` and `xAdjust` adjustment, just not for `labelContent` or `rotation`. This preserves the offset behavior for narrow sectors while fixing the display bug.

### Pitfall 3: Assuming yAdjust Stagger Applies to Down Jeep
**What goes wrong:** Down Jeep is sector index 6 (even), so `yAdjust: i % 2 === 0 ? 0 : -16` gives it `yAdjust: 0`. No stagger needed — confirm the label doesn't overlap with KOM annotations in the same region.
**Why it happens:** KOM annotations also draw in the same chart area. Check `annotations.json` for KOM segments near mile 83.55.
**How to avoid:** Visual QA at the Down Jeep mile range.

### Pitfall 4: Mobile Label Suppression Must Be Preserved
**What goes wrong:** The `display: () => window.innerWidth >= 640` function gate for labels is correct and must not be changed. Mobile (< 640px) should continue to suppress all sector labels (not just Down Jeep).
**Why it happens:** The fix touches the label config and someone might be tempted to add Down Jeep-specific display logic.
**How to avoid:** Leave `display` unchanged: `display: () => window.innerWidth >= 640`.

---

## Code Examples

### Current Buggy Code (Lines 62-91, ElevationProfile.astro)
```javascript
// Source: /src/components/ElevationProfile.astro lines 62-91
const widthMi = sector.endMi - sector.startMi;
const isNarrow = widthMi < 1.0;
const starsStr = '\u2605'.repeat(sector.stars);
const labelContent: string[] = [sector.name, starsStr];  // BUG: was isNarrow ? [starsStr] : [sector.name, starsStr]

annotationBoxes[`sector_${i}`] = {
  type: 'box',
  // ...
  label: {
    display: () => window.innerWidth >= 640,
    content: labelContent,
    position: { x: 'center', y: 'end' },
    color: starColors[sector.stars] + 'cc',
    font: { size: 9, family: 'Space Mono, monospace' },
    yAdjust: i % 2 === 0 ? 0 : -16,
    rotation: isNarrow ? -90 : 0,  // BUG: requirement says rotation: 0
  },
```

### Fixed Code
```javascript
// Source: /src/components/ElevationProfile.astro — fixed version
const widthMi = sector.endMi - sector.startMi;
const isNarrow = widthMi < 1.0;
const starsStr = '\u2605'.repeat(sector.stars);
const labelContent: string[] = [sector.name, starsStr];  // always include name

annotationBoxes[`sector_${i}`] = {
  type: 'box',
  // ...
  label: {
    display: () => window.innerWidth >= 640,
    content: labelContent,
    position: { x: isNarrow ? 'start' : 'center', y: 'end' },
    xAdjust: isNarrow ? 4 : 0,
    color: starColors[sector.stars] + 'cc',
    font: { size: 9, family: 'Space Mono, monospace' },
    yAdjust: i % 2 === 0 ? 0 : -16,
    rotation: 0,                   // always horizontal
  },
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Label clipped to box (v1.x) | Label not clipped to box, only to chart area (v2+) | chartjs-plugin-annotation v2 migration | Labels can safely overflow narrow bands |

**Relevant migration note:** v2 removed label-to-box clipping. The `isNarrow` guard stripping the name was likely defensive code written when label-to-box clipping was in effect. It is no longer needed.

---

## Open Questions

1. **KOM annotations near Down Jeep**
   - What we know: KOM annotations also render in the same chart region. Down Jeep is at mile 83.55-84.14.
   - What's unclear: Whether any KOM segment overlaps this range and whether horizontal labels would stack/collide.
   - Recommendation: Check `annotations.json` for KOM entries near mile 83-85 during implementation. If overlap exists, `yAdjust` stagger may need adjustment.

2. **Exact pixel width of Down Jeep band at common viewport widths**
   - What we know: Down Jeep is 0.594mi wide in a 110mi chart. At 1280px viewport with chart padding, the band is approximately 5-8px wide.
   - What's unclear: Exact pixel width depends on chart margins/padding.
   - Recommendation: Visual QA at 640px, 768px, 1024px, and 1280px viewports. The `position: 'start' + xAdjust: 4` approach should handle this regardless of exact pixel width.

---

## Sources

### Primary (HIGH confidence)
- chartjs-plugin-annotation 3.1.0 official docs (https://www.chartjs.org/chartjs-plugin-annotation/3.1.0/) — configuration options, clip behavior, box label options
- `/src/components/ElevationProfile.astro` — direct source read, exact line numbers verified
- `/public/data/annotations.json` — Down Jeep sector data verified (startMi: 83.55, endMi: 84.1439, width: 0.594mi)
- `/Users/Sheppardjm/Repos/mkUltraGravel/.planning/debug/down-jeep-label.md` — prior root cause analysis (status: resolved)

### Secondary (MEDIUM confidence)
- chartjs-plugin-annotation 2.x Migration Guide — confirms v2 removed label-to-box clipping

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — existing libraries, no new dependencies
- Architecture: HIGH — bug root cause fully diagnosed, fix is a 2-line change
- Pitfalls: HIGH — clipping behavior verified from official docs; Down Jeep position confirmed not near chart boundary

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable library, 30-day window)

---

## Key Facts Summary (for planner)

| Fact | Value | Source |
|------|-------|--------|
| Down Jeep sector index | 6 | annotations.json computed |
| Down Jeep width | 0.594mi | annotations.json (startMi: 83.55, endMi: 84.1439) |
| isNarrow threshold | < 1.0mi | ElevationProfile.astro line 64 |
| Current label content for narrow | `[starsStr]` only | ElevationProfile.astro line 65-67 |
| Current rotation for narrow | -90 | ElevationProfile.astro line 85 |
| Down Jeep position in chart | 76.0%-76.5% across | calculated (110mi total) |
| Space to right edge | 23.5% of chart width | calculated |
| chart.js version | 4.5.1 | package-lock.json |
| chartjs-plugin-annotation version | 3.1.0 | package-lock.json |
| Global clip default | true (clips to chart area) | official docs |
| Label-to-box clipping | None (removed in v2) | migration guide |
| File to modify | src/components/ElevationProfile.astro | direct inspection |
| Lines affected | ~64-91 (annotationBoxes loop) | direct inspection |
