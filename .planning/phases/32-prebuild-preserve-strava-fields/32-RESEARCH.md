# Phase 32: Prebuild Pipeline — Preserve Strava Fields - Research

**Researched:** 2026-03-30
**Domain:** Node.js prebuild scripting / data pipeline (no external libraries needed)
**Confidence:** HIGH

## Summary

Phase 32 is a pure scripting fix — no new dependencies, no UI changes, no Astro component work. The components (`GravelSectors.astro`, `KomSegments.astro`) are already wired correctly from Phase 27. The bug is entirely in the data pipeline: `resolve-annotations.js` regenerates `public/data/annotations.json` from scratch without preserving `stravaSegmentId`, `komTime`, and `qomTime` fields that were manually added in Phase 27. Because `npm run prebuild` (and thus `npm run build`) always runs `resolve-annotations.js` first, every build strips the Strava fields before Astro renders the cards.

The fix is to embed the Strava field values directly into the hardcoded `sectors`/`koms` arrays inside `resolve-annotations.js` so the generated output always includes them. This is the authoritative approach: `data.md` explicitly states that `resolve-annotations.js` is the source of truth, not `annotations.json`. The Strava segment IDs are stable constants (not derived from GPX data), so they belong alongside the other static fields (`name`, `startMi`, `lengthMi`, `stars`, etc.) in the script's hardcoded data.

`assign-card-photos.js` reads annotations.json, mutates only `coverPhoto`, and writes it back via `JSON.stringify`. As long as `resolve-annotations.js` emits the Strava fields, `assign-card-photos.js` will preserve them automatically (it spreads the full object rather than reconstructing it).

**Primary recommendation:** Add `stravaSegmentId` to each object in the `sectors` and `koms` arrays in `resolve-annotations.js`. Add `komTime` and `qomTime` (null) to the `koms` array objects. No other files need to change.

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Node.js built-ins (`fs`, `path`) | Node 22 | File I/O in scripts | Already in use; no new dependencies needed |

### Supporting
No new packages needed. This is a data-layer fix only.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Add Strava fields to hardcoded arrays in resolve-annotations.js | Merge strategy: read existing annotations.json before overwriting | Merge is more complex and fragile; hardcoded approach matches the "resolve-annotations.js is source of truth" design. A merge would silently preserve stale/wrong values if the JSON gets corrupted. |
| Add Strava fields to resolve-annotations.js | Separate sidecar JSON file (e.g., `strava-ids.json`) that scripts merge in | Over-engineering; adds a new file, a new read, and coordination risk. Not worth it for 9 stable IDs. |

**Installation:** None required.

## Architecture Patterns

### Recommended Project Structure
No structural changes. All changes are within `scripts/resolve-annotations.js`.

### Pattern 1: Embed Stable Constants in Source Data Arrays
**What:** Add `stravaSegmentId` (number) to each sector object and KOM object in the hardcoded `sectors`/`koms` arrays. Add `komTime: null` and `qomTime: null` to each KOM object.
**When to use:** Any time a field is static, human-authored, and not derived from GPX/route-data.json.
**Example:**
```javascript
// In resolve-annotations.js, modify hardcoded arrays:
const sectors = [
  { name: "Sandstrom",       startMi: 23.4,  lengthMi: 5.89, stars: 3, stravaSegmentId: 24479292 },
  { name: "Akkala Rd",       startMi: 39.5,  lengthMi: 1.42, stars: 3, stravaSegmentId: 24479426 },
  { name: "Haavisto",        startMi: 43.0,  lengthMi: 1.38, stars: 4, stravaSegmentId: 24479467 },
  { name: "Forest Service Rd", startMi: 50.7, lengthMi: 6.45, stars: 2, stravaSegmentId: 24479496 },
  { name: "C4",              startMi: 58.7,  lengthMi: 5.65, stars: 5, stravaSegmentId: 34573011 },
  { name: "Down Jeep",       startMi: 83.55, lengthMi: 0.6,  stars: 5, stravaSegmentId: 6809754  },
];

const koms = [
  { name: "Billie Helmer",   startMi: 21.9,  lengthMi: 0.69, grade: 6.4, elevFt: 236, stravaSegmentId: 24479270, komTime: null, qomTime: null },
  { name: "Leaving Chatham", startMi: 37.6,  lengthMi: 0.38, grade: 4.1, elevFt: 72,  stravaSegmentId: 41126651, komTime: null, qomTime: null },
  { name: "Silver Creek",    startMi: 78.55, lengthMi: 1.6,  grade: 4.4, elevFt: 373, stravaSegmentId: 16438243, komTime: null, qomTime: null },
];
```
The `{ ...sector, ...coords }` spread at lines 164-168 will carry all fields through to the output. The Strava fields flow automatically.

### Pattern 2: assign-card-photos.js Is Already Safe
`assign-card-photos.js` reads the full annotations.json, mutates only `coverPhoto` on each entry, and writes back via `JSON.stringify(annotations, null, 2)`. Since it never reconstructs the objects from scratch, any field present in the input (including `stravaSegmentId`) passes through to the output untouched. **No changes needed in `assign-card-photos.js`.**

### Anti-Patterns to Avoid
- **Merge strategy in resolve-annotations.js:** Reading the existing `annotations.json` before overwriting it couples two pipeline steps and makes the script non-idempotent from a clean state. The source-of-truth design forbids this.
- **Modifying the output object at write time:** Building the Strava fields at the `const output = { sectors, kom, restock }` level rather than in the source arrays would work but separates related data and is harder to maintain.
- **Updating `data.md` as the fix:** `data.md` is explicitly a "human-readable reference" and is NOT read by any script. Updating it alone does nothing to the pipeline.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Preserving extra JSON fields across writes | Custom merge/diff logic | Embed in source arrays | Merge logic is fragile; source embedding is idempotent and obvious |

**Key insight:** This codebase already has the right pattern (static fields in hardcoded arrays). The fix is simply applying that pattern to the Strava fields that were missed in Phase 27.

## Common Pitfalls

### Pitfall 1: Spread Order in resolvedSectors/resolvedKoms
**What goes wrong:** `{ ...sector, ...coords }` — if `coords` contained a key that shadows a Strava field (it doesn't currently, but worth noting), the coords value would win.
**Why it happens:** JavaScript spread order: later keys win.
**How to avoid:** Confirm `findPointsForSegment` return shape (`lat`, `lon`, `endLat`, `endLon`, `endMi`, `track`) has no name collision with `stravaSegmentId`, `komTime`, `qomTime`. It doesn't.
**Warning signs:** Strava field missing or undefined after build even after adding to source array.

### Pitfall 2: Strava Segment IDs as Number vs String
**What goes wrong:** `resolve-annotations.js` will encode them as JSON numbers; `scoring.js` stores them as strings (e.g., `"24479292"`). If any consumer uses strict equality (`===`) to compare, type mismatch could cause failures.
**Why it happens:** JSON parses numbers without quotes as numbers.
**How to avoid:** `annotations.json` currently uses numbers for `stravaSegmentId` (confirmed by Phase 27 work). The components only use them for URL construction (template literal coerces type). `scoring.js` uses its own string constants separately. No mismatch risk for this phase. Keep as number (matching Phase 27's existing pattern).
**Warning signs:** Strava link URL looks wrong (it won't — template literal handles both).

### Pitfall 3: komTime/qomTime JSON Null vs JS undefined
**What goes wrong:** Writing `null` (JSON null) vs omitting the field entirely vs `undefined`.
**Why it happens:** `JSON.stringify` drops `undefined` values; `null` is preserved.
**How to avoid:** Use `komTime: null, qomTime: null` in the source arrays, not `komTime: undefined`. This matches Phase 27's decision and the component's conditional check (`segment.komTime || segment.qomTime` — both null and undefined are falsy, but null serializes correctly for future updates).
**Warning signs:** `komTime` key absent from output JSON when it should be `null`.

### Pitfall 4: Stale Card Crops Not Regenerating
**What goes wrong:** After fixing the pipeline, card crops already exist in `public/images/cards/` from a prior run. `assign-card-photos.js` skips existing card crops (line 97: `if (fs.existsSync(cardPath)) { skipped++; continue; }`).
**Why it happens:** `assign-card-photos.js` is intentionally idempotent for card crop generation.
**How to avoid:** This is fine for Phase 32 — card crops are correct, only annotations.json was broken. No action needed.

## Code Examples

### Complete Fix — resolve-annotations.js sectors array
```javascript
// Source: scripts/resolve-annotations.js (lines 118-125, current)
// Replace:
const sectors = [
  { name: "Sandstrom", startMi: 23.4, lengthMi: 5.89, stars: 3 },
  ...
];

// With:
const sectors = [
  { name: "Sandstrom",         startMi: 23.4,  lengthMi: 5.89, stars: 3, stravaSegmentId: 24479292 },
  { name: "Akkala Rd",         startMi: 39.5,  lengthMi: 1.42, stars: 3, stravaSegmentId: 24479426 },
  { name: "Haavisto",          startMi: 43.0,  lengthMi: 1.38, stars: 4, stravaSegmentId: 24479467 },
  { name: "Forest Service Rd", startMi: 50.7,  lengthMi: 6.45, stars: 2, stravaSegmentId: 24479496 },
  { name: "C4",                startMi: 58.7,  lengthMi: 5.65, stars: 5, stravaSegmentId: 34573011  },
  { name: "Down Jeep",         startMi: 83.55, lengthMi: 0.6,  stars: 5, stravaSegmentId: 6809754   },
];
```

### Complete Fix — resolve-annotations.js koms array
```javascript
// Source: scripts/resolve-annotations.js (lines 127-149, current)
// Replace:
const koms = [
  { name: "Billie Helmer",   startMi: 21.9,  lengthMi: 0.69, grade: 6.4, elevFt: 236 },
  { name: "Leaving Chatham", startMi: 37.6,  lengthMi: 0.38, grade: 4.1, elevFt: 72  },
  { name: "Silver Creek",    startMi: 78.55, lengthMi: 1.6,  grade: 4.4, elevFt: 373 },
];

// With:
const koms = [
  { name: "Billie Helmer",   startMi: 21.9,  lengthMi: 0.69, grade: 6.4, elevFt: 236, stravaSegmentId: 24479270, komTime: null, qomTime: null },
  { name: "Leaving Chatham", startMi: 37.6,  lengthMi: 0.38, grade: 4.1, elevFt: 72,  stravaSegmentId: 41126651, komTime: null, qomTime: null },
  { name: "Silver Creek",    startMi: 78.55, lengthMi: 1.6,  grade: 4.4, elevFt: 373, stravaSegmentId: 16438243, komTime: null, qomTime: null },
];
```

### Verification Command
```bash
node -e "
  const a = JSON.parse(require('fs').readFileSync('public/data/annotations.json','utf8'));
  console.log('Sectors:', a.sectors.map(s => s.name + ':' + s.stravaSegmentId));
  console.log('KOM:', a.kom.map(k => k.name + ':' + k.stravaSegmentId + ' komTime:' + k.komTime + ' qomTime:' + k.qomTime));
  const missing = [...a.sectors, ...a.kom].filter(e => !e.stravaSegmentId);
  if (missing.length) { console.error('FAIL: missing stravaSegmentId on', missing.map(e=>e.name)); process.exit(1); }
  console.log('PASS: all 9 entries have stravaSegmentId');
"
```

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Strava fields manually added directly to annotations.json | Strava fields embedded in resolve-annotations.js source arrays | Phase 27 did the right thing for annotations.json but skipped the script update. Phase 32 completes this. |

## Open Questions

None. The root cause, fix location, exact values, and verification strategy are all fully determined from codebase inspection.

1. **Are komTime/qomTime still null?**
   - What we know: Phase 27 set them to null; Phase 27 SUMMARY says "organizer provides real values" in the future; audit confirms no values set yet.
   - What's unclear: Whether the organizer has provided times since Phase 27 completed.
   - Recommendation: Use null in the script. If the organizer provides times, they can be updated in resolve-annotations.js (or the script can be extended to accept an override file). This is out of scope for Phase 32.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of `scripts/resolve-annotations.js` — confirmed lines 118-149 contain hardcoded arrays without Strava fields
- Direct codebase inspection of `scripts/assign-card-photos.js` — confirmed it reads/mutates/rewrites full annotations object safely
- Direct codebase inspection of `scripts/generate-data.js` — confirmed pipeline order: resolve-annotations → match-photos → generate-thumbnails → assign-card-photos
- `.planning/v5-MILESTONE-AUDIT.md` — confirms root cause, both fix approaches, exact broken fields
- `.planning/phases/27-segment-links-scoring-explainer/27-01-PLAN.md` — confirms all 9 segment IDs with name-to-ID mapping
- `src/lib/scoring.js` — cross-confirms all 9 segment IDs as string constants
- `public/data/annotations.json` (live) — confirms no `stravaSegmentId` in current output (only `coverPhoto`)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, pure Node.js built-ins already in use
- Architecture: HIGH — direct codebase inspection, fix approach confirmed by audit, matches "source of truth" design
- Pitfalls: HIGH — all identified from code inspection, not speculation

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable codebase; only invalidated if pipeline is restructured)
