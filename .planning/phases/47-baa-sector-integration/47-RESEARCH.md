# Phase 47: BAA Sector Integration - Research

**Researched:** 2026-04-02
**Domain:** Data pipeline + scoring engine + static site components (no external libraries)
**Confidence:** HIGH

## Summary

Phase 47 is a pure data-and-configuration change. Adding BAA as the 7th gravel sector requires edits to 8 files — no new components, no new npm dependencies, no new architecture. Every integration point (map polylines, elevation bands, sector cards, scoring) is already driven dynamically from `annotations.json` and `src/lib/scoring.js`, so the pattern is well-established and low-risk.

The one critical pre-planning open question is **BAA's `lengthMi`** — the sector's distance in miles. This value is not documented anywhere in the codebase and must be known before the plan can be executed. All other data (name, startMi: 12.9, stars: 2, stravaSegmentId: 41159670) is specified in the requirements. The Strava segment page at `https://www.strava.com/segments/41159670` shows the distance; this should be checked before implementation begins.

The sector inserts at array position 0 in `resolve-annotations.js` (BAA starts at mile 12.9, before all existing sectors). This is cosmetically significant only for the LSD tone overlay in `GravelSectors.astro`, which applies to `i < 2` — meaning BAA and Sandstrom will get the overlay instead of Sandstrom and Akkala Rd. This is an acceptable side effect per the existing visual pattern.

**Primary recommendation:** Execute as a single atomic plan. All 8 files change in coordination; they are simple, well-isolated edits. Run `npm test` before and after, run `npm run data` to regenerate `annotations.json`, then build-verify.

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Node.js built-ins (`fs`, `path`) | Node 22 | resolve-annotations.js data pipeline | Already in use; no new dependencies |
| Vitest | 4.1.2 | Test runner for scoring.js | Already configured via `npm test` |

### Supporting
No new packages required. All changes are within existing files.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hardcoding BAA in resolve-annotations.js | Adding a separate sidecar JSON | Sidecar adds coordination risk; resolve-annotations.js is documented source of truth |
| Single atomic plan | Split into data-pipeline plan + UI plan | One plan is simpler; all changes are tightly coupled and safe to batch |

**Installation:** None required.

## Architecture Patterns

### How Sectors Flow Through the Pipeline

```
resolve-annotations.js (source of truth)
  → public/data/annotations.json (generated, gitignored-equivalent via prebuild)
    → assign-card-photos.js (mutates coverPhoto fields, preserves all others)
      → public/data/annotations.json (final, with coverPhoto)
        → GravelSectors.astro (SSR: reads annotations.json at build time)
        → RouteMap.astro (client: fetches /data/annotations.json at runtime)
        → ElevationProfile.astro (client: fetches /data/annotations.json at runtime)

src/lib/scoring.js (source of truth for SECTOR_SEGMENT_IDS)
  → src/pages/results.astro (imports SECTOR_SEGMENT_IDS, SECTOR_NAMES)
  → src/lib/scoring.test.js (tests SECTOR_SEGMENT_IDS count and contents)
```

### Pattern 1: Adding a Sector to the Pipeline
**What:** Add a new entry to the `sectors` array in `resolve-annotations.js`. The `findPointsForSegment` function resolves coordinates automatically from route-data.json. Sector order in the array determines render order everywhere.
**When to use:** Every time a new gravel sector is added.
**Example:**
```javascript
// In scripts/resolve-annotations.js, sectors array — insert at index 0 (chronological by startMi):
const sectors = [
  { name: "BAA",              startMi: 12.9,  lengthMi: X.XX, stars: 2, stravaSegmentId: 41159670 },
  { name: "Sandstrom",        startMi: 23.4,  lengthMi: 5.89, stars: 3, stravaSegmentId: 24479292 },
  // ... rest unchanged
];
```
`lengthMi` must be filled in with the actual Strava segment distance before this runs.

### Pattern 2: Adding a Sector ID to Scoring Engine
**What:** Add the Strava segment ID (as string) to `SECTOR_SEGMENT_IDS` in `src/lib/scoring.js`. The scoring engine iterates this array to compute `completedSectors` and `totalTime`.
**When to use:** Every time a new timed gravel sector is added.
**Example:**
```javascript
// src/lib/scoring.js
export const SECTOR_SEGMENT_IDS = [
  "41159670", // BAA  ← add at position 0 to match sector array order
  "24479292", // Sandstrom
  // ... rest unchanged
];
```
Order in `SECTOR_SEGMENT_IDS` does not affect scoring results — only membership matters.

### Pattern 3: Sector Name Lookup in results.astro
**What:** The `SECTOR_NAMES` map in `src/pages/results.astro` maps segment IDs to display names for the leaderboard's per-segment time breakdown.
**When to use:** Every time a new sector segment ID is added to scoring.
**Example:**
```typescript
// src/pages/results.astro
const SECTOR_NAMES: Record<string, string> = {
  "41159670": "BAA",           // ← add
  "24479292": "Sandstrom",
  // ... rest unchanged
};
```

### Anti-Patterns to Avoid
- **Don't manually edit `public/data/annotations.json`:** It is regenerated by `npm run data`. Changes survive only in `resolve-annotations.js` (source of truth).
- **Don't add BAA after existing sectors in the array:** It starts at mile 12.9, chronologically first. Inserting at the end would render it last in cards and on the elevation profile.
- **Don't guess `lengthMi`:** The pipeline computes the track polyline by slicing `route-data.json` between `startMi` and `startMi + lengthMi`. An incorrect `lengthMi` produces a wrong polyline and wrong elevation band.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Coordinate resolution | Custom lat/lon lookup | Existing `findPointsForSegment()` in resolve-annotations.js | Already handles edge cases, clamping, track slice |
| Cover photo assignment | Manual photo pick | Existing `assign-card-photos.js` pipeline | Midpoint-closest algorithm with fallback; runs automatically |
| Map polyline rendering | Custom Leaflet code | Existing `annotations.sectors.forEach()` loop in RouteMap.astro | BAA renders automatically once in annotations.json |
| Elevation band rendering | Custom Chart.js code | Existing `annotations.sectors.forEach()` loop in ElevationProfile.astro | BAA band renders automatically once in annotations.json |

**Key insight:** This is a pure data addition. Both the map and elevation profile iterate `annotations.sectors` dynamically — no component code changes are needed for SECT-03 or SECT-04.

## Complete File Change Inventory

Every file that requires modification, with the exact change needed:

### 1. `scripts/resolve-annotations.js` (SECT-01)
Insert BAA at position 0 in the `sectors` array:
```javascript
{ name: "BAA", startMi: 12.9, lengthMi: X.XX, stars: 2, stravaSegmentId: 41159670 },
```
`lengthMi` = Strava segment 41159670 distance in miles (OPEN QUESTION — see below).

### 2. `data.md` (SECT-01 — human-readable reference)
Add BAA entry to the "Gravel sectors" list, sorted by mile marker:
```
0. BAA, 12.9mi into route, X.XXmi, 2-star
```

### 3. `src/lib/scoring.js` (SECT-06)
Three changes:
- Add `"41159670", // BAA` to `SECTOR_SEGMENT_IDS`
- Update JSDoc comment: "The 6 gravel sector segment IDs" → "The 7 gravel sector segment IDs"
- Update `computeGravelChampion` comment: "finished all 6 sectors" → "finished all 7 sectors"

### 4. `src/lib/scoring.test.js` (SECT-06 — test coverage)
Four changes:
- Add `"41159670"` to the `SECTOR_IDS` fixture array (line 11)
- Update `makeGravelAthlete`: divide by 7, build 7 times (currently divides by 6, 5 equal + 1 remainder)
- Update `expect(first.completedSectors).toBe(6)` → `.toBe(7)` (test 1)
- Update `expect(SECTOR_SEGMENT_IDS).toHaveLength(6)` → `.toHaveLength(7)` (constants test)
- Add `expect(SECTOR_SEGMENT_IDS).toContain("41159670")` to the ID containment test
- Update DNF test comment (line 91): "5 of 6 sectors" → "6 of 7 sectors"; adjust `dnf.completedSectors` expectation to 6

### 5. `src/pages/results.astro` (SECT-06 — results display)
Two types of changes:
- Add `"41159670": "BAA"` to `SECTOR_NAMES` map
- Update three occurrences of `[DNF — {entry.completedSectors}/6 sectors]` → `/7 sectors`

### 6. `src/components/GrinduroExplainer.astro` (SECT-06 — content)
- "Six gravel sectors" → "Seven gravel sectors"

### 7. `src/components/ScoringExplainer.astro` (SECT-06 — content)
- "all 6 timed sectors wins" → "all 7 timed sectors wins"

### 8. Pipeline execution (SECT-01 through SECT-05)
After editing resolve-annotations.js:
```bash
npm run data    # regenerates annotations.json with BAA + assigns cover photo
npm test        # verify all tests pass with 7-sector scoring
npm run build   # verify full site builds successfully
```

## Common Pitfalls

### Pitfall 1: Missing or Wrong `lengthMi` for BAA
**What goes wrong:** If `lengthMi` is wrong, `findPointsForSegment` slices the route track to an incorrect range, producing a polyline that doesn't match the actual BAA sector on the road. The elevation band xMax will also be wrong.
**Why it happens:** `lengthMi` is not derivable from the GPX — it must come from the Strava segment distance.
**How to avoid:** Look up Strava segment 41159670 before coding. The segment detail page shows distance in km; convert to miles (divide by 1.60934).
**Warning signs:** The map polyline extends too far or stops too short relative to the road; the elevation band width looks wrong.

### Pitfall 2: Inserting BAA at Wrong Array Position
**What goes wrong:** If BAA is appended at the end of the `sectors` array (position 6), the sector card renders last in the list — visually inconsistent with the route order where BAA is the first sector encountered. The elevation profile band also appears at mile 12.9 but the card is at the bottom.
**Why it happens:** It's easier to append than insert at index 0.
**How to avoid:** Insert BAA at array index 0 in `resolve-annotations.js`. The elevation profile renders bands at their actual mile positions regardless of array order, but the sector cards and `GravelSectors.astro` render in array order.

### Pitfall 3: Forgetting to Update Test Fixtures
**What goes wrong:** `scoring.test.js` `makeGravelAthlete` divides by 6 and creates 6 times. After adding BAA to `SECTOR_SEGMENT_IDS`, athletes built with `makeGravelAthlete` only get 6 sector times but the engine iterates 7 — so `completedSectors` will be 6, not 7, and `expect(first.completedSectors).toBe(6)` passes incorrectly while the real behavior is wrong.
**Why it happens:** Test fixtures are separate from the constants they test.
**How to avoid:** Update `makeGravelAthlete` to divide by 7 and produce 7 times (add `"41159670"` to the fixture's SECTOR_IDS). Update all `completedSectors` expectations.

### Pitfall 4: Hardcoded "/6 sectors" in DNF Display
**What goes wrong:** The results page shows `[DNF — N/6 sectors]` for athletes missing sectors. With 7 required sectors, this reads incorrectly (e.g., `[DNF — 6/6 sectors]` for an athlete missing only BAA).
**Why it happens:** The 3 occurrences in `results.astro` use literal `/6` instead of `/${SECTOR_SEGMENT_IDS.length}`.
**How to avoid:** Search-replace all 3 occurrences. Ideally refactor to `/${SECTOR_SEGMENT_IDS.length} sectors` to prevent future recurrence, but a literal `/7` is acceptable for this phase.

### Pitfall 5: Tone Overlay Shift
**What goes wrong:** GravelSectors.astro applies the LSD tone overlay to `i < 2` (first two sector cards). Adding BAA at index 0 shifts the overlay from (Sandstrom, Akkala) to (BAA, Sandstrom). This is a visual change but not a bug.
**Why it happens:** The `i < 2` condition is position-based, not name-based.
**How to avoid:** Accept the shift — it's consistent with the existing visual pattern. The overlay on the first two cards is intentional and cosmetic. If desired, could change to `i < 1` to keep it on only the first card, but that's scope creep.

## Code Examples

### Sector Array Entry (resolve-annotations.js)
```javascript
// Source: existing pattern in scripts/resolve-annotations.js lines 119-125
{ name: "BAA", startMi: 12.9, lengthMi: X.XX, stars: 2, stravaSegmentId: 41159670 },
```

### Scoring Engine ID (scoring.js)
```javascript
// Source: existing pattern in src/lib/scoring.js lines 13-20
export const SECTOR_SEGMENT_IDS = [
  "41159670", // BAA
  "24479292", // Sandstrom
  "24479426", // Akkala Rd
  "24479467", // Haavisto
  "24479496", // Forest Service Rd
  "34573011", // C4
  "6809754",  // Down Jeep
];
```

### Updated makeGravelAthlete (scoring.test.js)
```javascript
// Source: existing pattern in src/lib/scoring.test.js line 16
const SECTOR_IDS = ["41159670", "24479292", "24479426", "24479467", "24479496", "34573011", "6809754"];

function makeGravelAthlete(id, name, gender, totalTime, url) {
  const perSector = Math.floor(totalTime / 7);
  const remainder = totalTime - perSector * 6;
  const times = [perSector, perSector, perSector, perSector, perSector, perSector, remainder];
  const segments = {};
  SECTOR_IDS.forEach((sid, i) => { segments[sid] = { elapsed_time: times[i] }; });
  return { athleteId: id, name, gender, activityUrl: url ?? `https://strava.com/activities/${id}`, segments };
}
```

### DNF Display Fix (results.astro)
```astro
// Change all 3 occurrences (lines 176, 240, 304):
// From:
[DNF — {entry.completedSectors}/6 sectors]
// To:
[DNF — {entry.completedSectors}/7 sectors]
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| N/A — this is a new sector addition | Same pipeline as existing 6 sectors | N/A | No architecture change needed |

**Deprecated/outdated:** None. All patterns are current.

## Open Questions

Things that couldn't be fully resolved:

1. **BAA `lengthMi` value**
   - What we know: Strava segment ID is 41159670; start is mile 12.9 on the route
   - What's unclear: The exact length in miles (must come from Strava segment distance field)
   - Recommendation: Check `https://www.strava.com/segments/41159670` for distance (shown in km; divide by 1.60934 for miles, round to 2 decimal places matching existing sector precision). This is a blocking pre-implementation step.

2. **BAA `avgGrade` — is it needed on the card?**
   - What we know: SECT-02 says "distance and avg grade metadata"; SECT-05 says "Strava link"; existing gravel sector cards do NOT show avgGrade (only KOM cards do); success criteria SC-3 says "clickable Strava link showing segment distance and average grade"
   - What's unclear: Whether "showing segment distance and average grade" means the CARD displays it, or the Strava page (which the link opens) shows it
   - Recommendation: Interpret as the Strava page showing those values (since the card already shows `lengthMi` as distance, and no existing gravel sector card shows `avgGrade`). If the intent is to display avgGrade on the BAA card, it requires: (a) adding `avgGrade` to the sector data model in `resolve-annotations.js`, (b) displaying it in `GravelSectors.astro` conditionally. Confirm with owner before coding.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `scripts/resolve-annotations.js`, `src/lib/scoring.js`, `src/lib/scoring.test.js`, `src/components/GravelSectors.astro`, `src/components/RouteMap.astro`, `src/components/ElevationProfile.astro`, `src/pages/results.astro` — verified current behavior
- `public/data/annotations.json` — verified current 6-sector structure
- `public/data/route-data.json` — confirmed 92 track points exist near mile 12.9–16.0 for polyline

### Secondary (MEDIUM confidence)
- `.planning/phases/32-prebuild-preserve-strava-fields/32-RESEARCH.md` — confirmed pipeline field-preservation pattern

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all existing patterns
- Architecture: HIGH — both map and elevation are data-driven; no component changes for SECT-03/SECT-04
- Pitfalls: HIGH — all identified from direct code inspection
- Open questions: lengthMi is blocking (must resolve before coding); avgGrade interpretation is clarifying (affects scope)

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable codebase, no fast-moving dependencies)
