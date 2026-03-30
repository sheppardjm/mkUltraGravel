# Phase 34: Elevation Profile Sector Labels - Research

**Researched:** 2026-03-30
**Domain:** chartjs-plugin-annotation 3.1.0 — BoxAnnotation label API
**Confidence:** HIGH

## Summary

Phase 34 adds sector name and star-rating labels to the elevation profile's existing gravel sector band overlays. The entire implementation is a single loop modification inside `ElevationProfile.astro` — no new files, no new dependencies, no new libraries.

The chartjs-plugin-annotation `BoxAnnotationOptions.label` property (type `BoxLabelOptions`) is the correct tool. It already exists in the codebase: KOM segment annotations use it at lines 90–96. Sector annotations were built in the same loop but never received a `label` property. Adding it now is low-risk and follows established patterns exactly.

The only genuine challenge is **narrow sectors**: "Down Jeep" is 0.6 miles wide (2–5px on screen), far too narrow for readable horizontal text. Using `rotation: -90` combined with stars-only content solves this. The other adjacent/narrow pair (Akkala Rd 1.4mi / Haavisto 1.4mi, separated by 2.1mi) is handled by staggered `yAdjust` values (0 vs -16px) per ELEV-04.

**Primary recommendation:** Add a `label` property to each `sector_i` annotation object inside the existing `annotationBoxes` forEach loop in `ElevationProfile.astro`. Use `position: { x: 'center', y: 'end' }`, multi-line `content` array (`[sector.name, '★'.repeat(sector.stars)]`), matched sector color at `cc` opacity, and alternating `yAdjust` for stagger. Rotate vertically for sectors narrower than 1.0 miles.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| chartjs-plugin-annotation | 3.1.0 (installed) | Box annotation labels | Already registered and in use; `BoxLabelOptions` has full label API |
| chart.js | ^4.5.1 (installed) | Chart rendering | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/lib/starColors.ts` | project module | Star rating colors | Import already at top of ElevationProfile.astro `<script>` — use same reference |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `BoxLabelOptions.label` (built-in) | Separate `type:'label'` annotation per sector | Extra annotation objects for each sector, no benefit — box label is simpler |
| Built-in label | Custom `afterDraw` canvas plugin | Requires manual coordinate math, no stagger helper — far more complex |
| Unicode stars `★` | Text `"3-star"` | Unicode is compact; `★`.repeat(n) is idiomatic; font rendering verified in KOM labels |

**Installation:**
```bash
# No new packages needed — chartjs-plugin-annotation 3.1.0 already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   └── starColors.ts       # Phase 33: already imported in ElevationProfile.astro
└── components/
    └── ElevationProfile.astro   # ONLY FILE THAT CHANGES
```

### Pattern 1: Box Annotation Label (Established by KOM Implementation)
**What:** Add a `label` sub-object to an existing `type: 'box'` annotation object. No separate annotation needed.
**When to use:** When you need text overlaid on a colored band — exactly this use case.
**Example:**
```typescript
// Source: chartjs-plugin-annotation 3.1.0 types (BoxLabelOptions) + existing KOM pattern
annotationBoxes[`sector_${i}`] = {
  type: 'box',
  xMin: sector.startMi,
  xMax: sector.endMi,
  backgroundColor: starColors[sector.stars] + '22',
  borderColor: starColors[sector.stars] + '66',
  borderWidth: 1,
  _baseColor: starColors[sector.stars],
  label: {
    display: true,                                    // REQUIRED — default is false
    content: ['Sector Name', '★★★'],                 // string[] for multi-line
    position: { x: 'center', y: 'end' },             // bottom-center
    color: starColors[sector.stars] + 'cc',           // ~80% opacity, matches sector hue
    font: { size: 9, family: 'Space Mono, monospace' }, // matches KOM label font
    yAdjust: 0,                                       // or -16 for stagger
  },
  click: () => { /* existing */ },
};
```

### Pattern 2: Stagger via yAdjust
**What:** Alternate `yAdjust` values between adjacent sectors to prevent label collision when sectors are close together.
**When to use:** ELEV-04 requires stagger — use it unconditionally for all sectors (index-based alternation is simpler than gap-based logic).
**Example:**
```typescript
// Even-indexed sectors: label at bottom
// Odd-indexed sectors: label 16px above bottom
const yAdjust = i % 2 === 0 ? 0 : -16;
```

### Pattern 3: Narrow Sector Rotation
**What:** For sectors narrower than 1.0 mile, rotate the label 90 degrees counterclockwise and show stars only (name is unreadable in such a narrow column).
**When to use:** Sectors < 1.0mi wide. Currently only "Down Jeep" (0.6mi) qualifies.
**Example:**
```typescript
const isNarrow = (sector.endMi - sector.startMi) < 1.0;
const labelContent = isNarrow
  ? ['★'.repeat(sector.stars)]
  : [sector.name, '★'.repeat(sector.stars)];
const rotation = isNarrow ? -90 : 0;
```

### Anti-Patterns to Avoid
- **Omitting `display: true`:** The `label.display` property defaults to `false` — labels will be invisible without this. The KOM implementation sets it explicitly (line 92); sector labels must too.
- **Using `position: 'start'` for sector labels:** KOM labels use `position: 'start'` (top-left). Sector labels should use `{ x: 'center', y: 'end' }` (bottom-center) per ELEV-03. Using `start` would stack sector and KOM labels in the same corner.
- **Modifying event listeners for label color changes:** The requirements (ELEV-01–04) say nothing about label highlighting on hover/click. The three event listeners (`map:sectorHover`, `map:sectorClick`, `map:reset`) should NOT be modified — they only manage `backgroundColor` and `borderColor`.
- **Using `yMin`/`yMax` to constrain sector boxes:** The existing sector boxes span the full chart height. Adding `yMin`/`yMax` to shrink the box for label positioning would break the visual band overlay. The `label.position.y = 'end'` approach works without touching box geometry.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Text inside chart band | Custom `afterDraw` canvas plugin with manual ctx.fillText() | `BoxAnnotationOptions.label` | Manual approach requires pixel coordinate math, clip regions, font measurement; built-in handles all this |
| Star display | Custom SVG or image | `'★'.repeat(n)` string | Unicode star (U+2605) renders correctly in Space Mono canvas context; KOM labels already prove canvas text works |
| Overlap detection | Measuring pixel widths, checking bounding boxes | Alternating `yAdjust` | No runtime measurement needed — the 6 sectors have fixed gaps; index-based stagger is deterministic and sufficient |

**Key insight:** The label API is already in-project (KOM segments use it). This phase is purely additive — copy the KOM pattern, adjust `position` and `content`, add stagger logic.

## Common Pitfalls

### Pitfall 1: Missing `display: true`
**What goes wrong:** Labels are invisible at runtime.
**Why it happens:** `BoxLabelOptions.display` defaults to `false`. Without explicit `display: true`, the label property is silently ignored.
**How to avoid:** Always include `display: true` in the label object. Check the KOM label at line 92 as reference.
**Warning signs:** No label text visible on the chart despite the label object being present.

### Pitfall 2: `position: 'end'` (string) vs `position: { y: 'end' }` (object)
**What goes wrong:** Using `position: 'end'` as a string positions BOTH x and y at `end` — label appears at bottom-right corner, not bottom-center.
**Why it happens:** The `BoxLabelOptions.position` type accepts both string and `{x, y}` object. String form applies to both axes.
**How to avoid:** Use the object form: `position: { x: 'center', y: 'end' }` to control axes independently.
**Warning signs:** Labels appear at the right edge of sector bands instead of centered.

### Pitfall 3: Star Unicode Rendering Assumption
**What goes wrong:** Assuming `★` renders the same in all environments — it does on all modern browsers but the font must support it.
**Why it happens:** Not all monospace fonts include U+2605.
**How to avoid:** Space Mono supports basic Unicode block characters. The KOM labels already use `font: { family: 'Space Mono, monospace' }` — use the same font family for sector labels to ensure consistent rendering.
**Warning signs:** Empty boxes or question marks where stars should appear. (Mitigated by the `monospace` fallback in the font stack.)

### Pitfall 4: Label Text Overflow on Narrow Sectors
**What goes wrong:** Label text renders beyond the sector box bounds, overlapping adjacent annotations or chart decorations.
**Why it happens:** chartjs-plugin-annotation does not clip label text to the box boundary. Text is centered at the label position but extends to full width.
**How to avoid:** For sectors narrower than 1.0mi (`endMi - startMi < 1.0`), use `rotation: -90` and omit the sector name. Currently only "Down Jeep" (0.6mi) triggers this path.
**Warning signs:** Label text visually bleeding into adjacent sectors or KOM labels.

### Pitfall 5: Touching `_baseColor` in Event Listeners
**What goes wrong:** If label color is changed in event listeners, it must also be restored in `map:reset` — forgetting this creates a state bug where labels stay highlighted after reset.
**Why it happens:** The event listeners only reset `backgroundColor` and `borderColor`; any additional properties must be explicitly added to reset logic.
**How to avoid:** Do NOT set label color dynamically in event listeners (not required by ELEV-01–04). Keep label color static (set once at annotation construction time).
**Warning signs:** Label text remains brighter/dimmer after hover interaction ends.

## Code Examples

### Complete Sector Label Addition
```typescript
// Source: chartjs-plugin-annotation 3.1.0 types + existing KOM label pattern (line 90-96)
// Modified section of ElevationProfile.astro annotationBoxes forEach loop

annotations.sectors.forEach((sector: { name: string; startMi: number; endMi: number; stars: number }, i: number) => {
  const isNarrow = (sector.endMi - sector.startMi) < 1.0;
  const starsStr = '★'.repeat(sector.stars);
  const labelContent: string[] = isNarrow
    ? [starsStr]
    : [sector.name, starsStr];

  annotationBoxes[`sector_${i}`] = {
    type: 'box',
    xMin: sector.startMi,
    xMax: sector.endMi,
    backgroundColor: starColors[sector.stars] + '22',
    borderColor: starColors[sector.stars] + '66',
    borderWidth: 1,
    _baseColor: starColors[sector.stars],
    label: {
      display: true,
      content: labelContent,
      position: { x: 'center', y: 'end' },
      color: starColors[sector.stars] + 'cc',
      font: { size: 9, family: 'Space Mono, monospace' },
      yAdjust: i % 2 === 0 ? 0 : -16,
      rotation: isNarrow ? -90 : 0,
    },
    click: () => {
      window.dispatchEvent(new CustomEvent('elevation:sectorClick', {
        detail: { sectorIndex: i }
      }));
    },
  };
});
```

### KOM Label Reference (Existing Code at Lines 90-96)
```typescript
// Source: ElevationProfile.astro lines 90-96 — existing proven pattern
label: {
  display: true,
  content: kom.name,
  color: '#7fff00cc',
  font: { size: 9, family: 'Space Mono, monospace' },
  position: 'start',
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| chartjs-plugin-annotation 2.x had no `BoxLabelOptions` | 3.x added `label` to box annotations | v3.0 release | Labels can be inline on box annotations without separate label annotation objects |

**No deprecated patterns here** — the `BoxLabelOptions.label` API is current in 3.1.0 and the approach is additive.

## Open Questions

1. **yAdjust value: -16px sufficient for two-level stagger?**
   - What we know: Chart height is 140px mobile / 180px desktop. A two-line label at font-size 9 is approximately 24px tall (2 lines × ~12px line height). A 16px offset should separate stagger levels adequately.
   - What's unclear: Exact rendered line height at font-size 9 in Space Mono on canvas — varies slightly by OS/font hinting.
   - Recommendation: Use -16 as the initial value. Planner should mark this as a value to visually verify and tune during implementation.

2. **Should label colors update during hover/click interactions?**
   - What we know: Requirements ELEV-01–04 do not mention interactive label behavior. Existing event listeners only manage `backgroundColor` and `borderColor`.
   - What's unclear: Whether the product intent is for labels to also highlight on hover.
   - Recommendation: Static label color for Phase 34. If label highlighting is wanted, it can be added in a future phase (would require updating all three event listeners).

3. **"Stars" display format: unicode ★ vs text "3-star"**
   - What we know: Requirements say `"★★★" or "3-star"` — both are explicitly acceptable. Unicode is more compact for narrow sectors.
   - What's unclear: Nothing — both are valid per the requirements.
   - Recommendation: Use unicode `'★'.repeat(sector.stars)`. Compact, idiomatic, and consistent with a Paris-Roubaix theme. Space Mono supports the character.

## Sources

### Primary (HIGH confidence)
- Direct inspection of `/Users/Sheppardjm/Repos/mkUltraGravel/src/components/ElevationProfile.astro` — existing annotation structure, KOM label pattern at lines 79–98, sector loop at lines 62–77
- `/Users/Sheppardjm/Repos/mkUltraGravel/node_modules/chartjs-plugin-annotation/types/options.d.ts` — `BoxAnnotationOptions` with `label?: BoxLabelOptions`
- `/Users/Sheppardjm/Repos/mkUltraGravel/node_modules/chartjs-plugin-annotation/types/label.d.ts` — `BoxLabelOptions` full type definition: `display`, `content`, `position`, `color`, `font`, `yAdjust`, `rotation`
- `/Users/Sheppardjm/Repos/mkUltraGravel/public/data/annotations.json` — 6 sector records with `startMi`, `endMi`, `name`, `stars`; narrowest sector: Down Jeep at 0.6mi
- chartjs-plugin-annotation 3.1.0 official docs (WebFetch) — verified `BoxLabelOptions` label API including `position: { x, y }` object form and `yAdjust`

### Secondary (MEDIUM confidence)
- None required — all findings from direct code inspection and official types

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified by installed node_modules types and existing working implementation
- Architecture: HIGH — change is purely additive to existing forEach loop; KOM label provides exact precedent
- Pitfalls: HIGH — identified from direct code inspection and type definitions, not speculation

**Research date:** 2026-03-30
**Valid until:** Stable (chartjs-plugin-annotation 3.1.0 is pinned; API won't change until upgrade)
