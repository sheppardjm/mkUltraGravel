# Phase 22: GPX Route Replacement - Research

**Researched:** 2026-03-29
**Domain:** Data pipeline / GPX file replacement / downstream JSON regeneration
**Confidence:** HIGH

## Summary

Phase 22 replaces the source GPX file driving the entire route data pipeline. The new file (`MK_Ultra.gpx`, 2779 trackpoints, 100.71 mi, from RideWithGPS, dated 2026-03-29) is already in the repo root. The old file (`MK Ultra.gpx`, 2498 trackpoints, 98.23 mi, from Strava) is also in the repo root and is what `parse-gpx.js` currently reads (line 29). The two files share identical trackpoints up to index 2355 (~mi 94); the new file adds ~6 miles of new territory at the end before returning to the same finish.

The pipeline is one command: `npm run data` (alias for `node scripts/generate-data.js`). It runs seven scripts in sequence and regenerates all three downstream JSON files: `route-data.json`, `annotations.json`, and `photos.json`. All six sector and three KOM coordinates have been verified to be numerically identical on the new GPX — the annotations land on the same lat/lon positions because all annotation mile markers fall below mi 84.15, within the shared track geometry.

The only non-trivial code changes are: (1) update `parse-gpx.js` line 29 to read `MK_Ultra.gpx`; (2) fix `ElevationProfile.astro` x-axis max to be dynamic so it does not clip the last 0.71 miles; (3) fix `index.astro` `Math.round(routeMeta.totalMi)` to `Math.floor(...)` so it displays "100" instead of "101". No new npm dependencies. No annotation re-calibration needed.

**Primary recommendation:** Update `parse-gpx.js` line 29 to `MK_Ultra.gpx`, run `npm run data`, then patch the two display rounding issues, then verify the build.

## Standard Stack

No new libraries are needed. This phase uses the existing pipeline stack.

### Core
| Tool/Library | Version | Purpose | Why Standard |
|---|---|---|---|
| `gpxparser` | ^3.0.8 | Parse GPX XML into track arrays | Already installed; proven across v1-v3 |
| `@xmldom/xmldom` | ^0.8.11 | DOMParser shim for Node.js | Required by gpxparser in Node; already installed |
| `node scripts/generate-data.js` | — | Full pipeline coordinator (runs all 7 scripts) | Established `npm run data` entrypoint |

### Pipeline Scripts (in execution order)
| Script | Output | Relevant to This Phase |
|---|---|---|
| `parse-gpx.js` | `route-data.json`, `public/mk-ultra.gpx` | YES — reads GPX source, must point to new file |
| `resolve-annotations.js` | `annotations.json` | YES — re-resolves sector/KOM/restock coords |
| `match-photos.js` | `photos.json` | YES — re-resolves photo lat/lon positions |
| `generate-thumbnails.js` | `public/images/thumbs/` | No change |
| `assign-card-photos.js` | `annotations.json` (coverPhoto), `public/images/cards/` | No change |
| `convert-hero.js` | `public/images/hero.webp` | No change |
| `convert-tone-images.js` | `public/tone/*.webp` | No change |

**Installation:** No new packages required.

## Architecture Patterns

### Existing Project Structure (relevant to this phase)
```
repo-root/
├── MK_Ultra.gpx          # NEW source file (100.71 mi, RideWithGPS)
├── MK Ultra.gpx          # OLD source file (98.23 mi, Strava) — can be removed
├── scripts/
│   ├── parse-gpx.js      # Reads GPX_SOURCE, writes route-data.json + public/mk-ultra.gpx
│   ├── resolve-annotations.js  # Hardcoded mile markers -> lat/lon via route-data.json
│   └── match-photos.js   # photo-manifest.js mi values -> lat/lon via route-data.json
├── public/
│   ├── mk-ultra.gpx      # Copy of source GPX (served as download)
│   └── data/
│       ├── route-data.json   # { meta: {totalMi, elevationGainFt, trackpoints}, track: [...] }
│       ├── annotations.json  # { sectors: [...], kom: [...], restock: [...] }
│       └── photos.json       # [ { filename, lat, lon, mi, source }, ... ]
└── src/
    ├── pages/index.astro          # Reads route-data.json at build time (SSG)
    └── components/
        └── ElevationProfile.astro  # Fetches route-data.json at runtime (client-side JS)
```

### Pattern 1: GPX Source Switch (1 line change)
**What:** `parse-gpx.js` hardcodes the source filename. Change line 29 from `'MK Ultra.gpx'` to `'MK_Ultra.gpx'`.
**When to use:** Any time the source route file changes.
**Example:**
```javascript
// scripts/parse-gpx.js line 29
// Source: direct codebase inspection
// BEFORE:
const GPX_SOURCE = path.join(ROOT, 'MK Ultra.gpx');
// AFTER:
const GPX_SOURCE = path.join(ROOT, 'MK_Ultra.gpx');
```

### Pattern 2: Pipeline Re-run
**What:** `npm run data` runs all 7 pipeline scripts in sequence. It is idempotent and safe to re-run. If any script fails with a non-zero exit code, the coordinator aborts.
**When to use:** After any GPX or annotation source change.

### Pattern 3: Dynamic X-Axis Max in ElevationProfile
**What:** The x-axis `max` is currently `100` (hardcoded). The new route is 100.71 mi, so this clips the last 0.71 miles (~3749 feet of route). Fix by fetching the full `route-data.json` (including `meta`) and using `meta.totalMi` for the max.
**Current fetch pattern:**
```javascript
// ElevationProfile.astro — current (strips meta)
fetch('/data/route-data.json').then(r => r.json()).then(d => d.track ?? d)
```
**Fixed fetch pattern:**
```javascript
// ElevationProfile.astro — fixed (retains meta for totalMi)
// Source: direct codebase inspection
const routeJson = await fetch('/data/route-data.json').then(r => r.json());
const routeData = routeJson.track ?? routeJson;
const totalMi = routeJson.meta?.totalMi ?? routeData[routeData.length - 1]?.mi ?? 110;
// Then in Chart.js scales.x: max: Math.ceil(totalMi)
```

### Pattern 4: totalMi Display Rounding
**What:** `index.astro` line 249 uses `Math.round(routeMeta.totalMi)`. With `totalMi = 100.71`, this produces "101 miles" instead of the expected "100 miles" shown in the hero section. Use `Math.floor` instead.
**Example:**
```astro
{/* index.astro line 249 — BEFORE: */}
{Math.round(routeMeta.totalMi)} miles

{/* AFTER: */}
{Math.floor(routeMeta.totalMi)} miles
```

### Anti-Patterns to Avoid
- **Re-calibrating annotation mile markers before verifying they're wrong:** All 6 sector and 3 KOM mile markers resolve to identical lat/lon on the new GPX. Do not change `resolve-annotations.js` annotation data unless visual verification at zoom 14+ shows a position error.
- **Running individual pipeline scripts instead of `npm run data`:** Scripts have dependencies (e.g., `resolve-annotations.js` requires `route-data.json`). Always run the coordinator.
- **Using `Math.round` for totalMi display:** 100.71 rounds to 101. Use `Math.floor`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| GPX parsing | Custom XML parser | `gpxparser` + `@xmldom/xmldom` (already installed) | Handles malformed GPX, distance calculation quirks |
| Pipeline orchestration | Shell script | `generate-data.js` (already exists) | Has error handling, correct ordering |
| Annotation coordinate resolution | Custom haversine search | `resolve-annotations.js` `findPointAtMile()` (already exists) | Handles boundary conditions, clamping |

**Key insight:** The pipeline is already battle-tested across v1-v3. This phase is a data swap, not a rebuild. The only custom code is the two rounding fixes.

## Common Pitfalls

### Pitfall 1: `Math.round(100.71)` = 101, not 100
**What goes wrong:** After pipeline runs, the route section on the page displays "101 miles" while the hero hardcodes "100 miles" — a visible inconsistency.
**Why it happens:** `Math.round` rounds 0.71 up to the next integer.
**How to avoid:** Change `Math.round` to `Math.floor` in `index.astro` line 249 before running the build.
**Warning signs:** Build output shows "101 miles" in the route section heading.

### Pitfall 2: ElevationProfile x-axis clips last 0.71 miles
**What goes wrong:** The chart `max: 100` was marked "forward-compatible with 100mi route" in v3.0. But the new route is 100.71 mi, so Chart.js clips data past x=100. The last 3749 feet of route elevation are invisible.
**Why it happens:** Hardcoded max value predates the actual new GPX.
**How to avoid:** Change the fetch pattern to retain `meta.totalMi` and use `Math.ceil(totalMi)` as the x-axis max.
**Warning signs:** Elevation line ends abruptly before the chart's right edge.

### Pitfall 3: Forgetting to `git add MK_Ultra.gpx`
**What goes wrong:** The new GPX file is currently untracked (`?? MK_Ultra.gpx` in git status). If not added, it exists locally but is not committed. A clean checkout or deployment from git won't have the file.
**Why it happens:** File was added to repo root without `git add`.
**How to avoid:** `git add MK_Ultra.gpx` before committing.
**Warning signs:** `git status` still shows `?? MK_Ultra.gpx` after changes.

### Pitfall 4: `public/data/` files in git — commit them after pipeline run
**What goes wrong:** `route-data.json`, `annotations.json`, `photos.json` are all tracked in git. If you update `parse-gpx.js` but don't commit the regenerated JSON files, the build uses stale data.
**Why it happens:** Unlike `public/images/` (gitignored), `public/data/` is tracked.
**How to avoid:** After `npm run data`, verify JSON changes, then `git add public/data/ public/mk-ultra.gpx`.
**Warning signs:** `route-data.json` still shows `totalMi: 98.23` after the pipeline has run.

### Pitfall 5: `gpxparser` `cumul` array length varies by source
**What goes wrong:** The new GPX from RideWithGPS has `cumul.length === points.length` (not `N-1` as Strava produced). `parse-gpx.js` already handles both cases (lines 64-73) with the `else if` branch. This is not a regression, but worth noting if the pipeline produces unexpected mileage.
**Why it happens:** Different GPX producers package cumulative distances differently.
**How to avoid:** No action needed — the existing branching logic handles it correctly (verified by dry-run: correctly computed 100.71 mi).
**Warning signs:** `parse-gpx.js` exits with "Unexpected cumul length" error.

## Code Examples

Verified from direct codebase inspection:

### Current `parse-gpx.js` GPX_SOURCE (line 29)
```javascript
// Source: scripts/parse-gpx.js line 29
// CURRENT — reads old 98.23mi file:
const GPX_SOURCE = path.join(ROOT, 'MK Ultra.gpx');
const GPX_DEST = path.join(ROOT, 'public', 'mk-ultra.gpx');
```

### Fixed `parse-gpx.js` GPX_SOURCE
```javascript
// Source: scripts/parse-gpx.js line 29 — CHANGE THIS
const GPX_SOURCE = path.join(ROOT, 'MK_Ultra.gpx');
const GPX_DEST = path.join(ROOT, 'public', 'mk-ultra.gpx');  // unchanged
```

### Fixed ElevationProfile fetch (retains meta)
```javascript
// Source: ElevationProfile.astro — CURRENT fetch (loses meta.totalMi):
const [routeData, annotations] = await Promise.all([
  fetch('/data/route-data.json').then(r => r.json()).then(d => d.track ?? d),
  fetch('/data/annotations.json').then(r => r.json())
]);

// FIXED fetch (retains meta.totalMi for x-axis max):
const [routeJson, annotations] = await Promise.all([
  fetch('/data/route-data.json').then(r => r.json()),
  fetch('/data/annotations.json').then(r => r.json())
]);
const routeData = routeJson.track ?? routeJson;
const totalMi = routeJson.meta?.totalMi ?? routeData[routeData.length - 1]?.mi ?? 110;
// Then in Chart.js config:
// scales: { x: { ..., max: Math.ceil(totalMi) } }
```

### Fixed `index.astro` totalMi display (line 249)
```astro
{/* Source: src/pages/index.astro line 249 */}
{/* BEFORE: shows "101 miles" with 100.71mi route */}
{Math.round(routeMeta.totalMi)} miles &mdash; {routeMeta.elevationGainFt.toLocaleString()} ft elevation gain

{/* AFTER: shows "100 miles" */}
{Math.floor(routeMeta.totalMi)} miles &mdash; {routeMeta.elevationGainFt.toLocaleString()} ft elevation gain
```

### Expected `route-data.json` meta after pipeline run
```json
{
  "meta": {
    "totalMi": 100.71,
    "elevationGainFt": 3595,
    "trackpoints": 2779
  }
}
```

## State of the Art

| Old Approach | Current Approach | Notes |
|---|---|---|
| `MK Ultra.gpx` (98.23 mi, Strava, with spaces in filename) | `MK_Ultra.gpx` (100.71 mi, RideWithGPS, no spaces) | Same start/finish, shared track until mi 94, then extended |
| `max: 100` (hardcoded comment: "forward-compatible") | `Math.ceil(totalMi)` from fetched meta | The forward-compat is now activated |
| `Math.round(totalMi)` display | `Math.floor(totalMi)` display | Prevents "101 miles" display |

**What did NOT change:**
- All 6 sector start coordinates (identical to 6 decimal places on new GPX)
- All 3 KOM start coordinates (identical on new GPX)
- All 53 photo positions (all below mi 80.2, well within shared track geometry)
- `public/images/` gitignore behavior
- EventInfoBlock.astro download link (points to `/mk-ultra.gpx` — will be updated by pipeline automatically)

## Open Questions

1. **Should `MK Ultra.gpx` (space version) be removed from the repo?**
   - What we know: It is tracked in git, 98.23mi, Strava export. After pipeline switch, it is orphaned.
   - What's unclear: Is there value in keeping it as historical reference?
   - Recommendation: Remove it (`git rm "MK Ultra.gpx"`) to eliminate confusion about which file is canonical. Git history preserves it.

2. **Does elevation gain change (3189 ft old vs 3595 ft new) need a content update?**
   - What we know: `index.astro` line 249 dynamically displays `routeMeta.elevationGainFt` — auto-updates.
   - What's unclear: Is the gain value displayed anywhere else statically?
   - Recommendation: Search for "3189" or "elevation gain" in src/ at plan time. The dynamic display handles it.

3. **Does `Math.ceil(totalMi)` for x-axis max cause visual issues if totalMi is exactly 101.0?**
   - What we know: New route is 100.71 mi. `Math.ceil(100.71) = 101`.
   - What's unclear: Whether Chart.js pads x-axis past 101 automatically or clips at 101.
   - Recommendation: Use `Math.ceil(totalMi)` — it gives 101 for 100.71, which is fine since data only goes to 100.71.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `scripts/parse-gpx.js` — full read, GPX_SOURCE on line 29
- Direct codebase inspection: `scripts/resolve-annotations.js` — annotation mile markers, `findPointAtMile` implementation
- Direct codebase inspection: `src/components/ElevationProfile.astro` — fetch pattern, `max: 100` on line 196
- Direct codebase inspection: `src/pages/index.astro` — `Math.round(routeMeta.totalMi)` on line 249
- Direct GPX parsing: Both GPX files parsed via `gpxparser` + `@xmldom/xmldom` in Node.js, confirmed trackpoint counts and total miles
- Annotation position comparison: All 6 sectors and 3 KOMs verified numerically identical on new GPX

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` — prior research documented Option A (rename) vs Option B (update reference); this research selects Option B for cleaner filename hygiene
- `.planning/research/FEATURES.md` — Feature 7 analysis; confirms pipeline regeneration approach
- `.planning/research/PITFALLS.md` — Pitfall 11 documents "80 miles" content scatter; verified these references either already say "100 miles" or are resolved by the Math.floor fix

### Tertiary (LOW confidence)
- None — all findings are from direct code and file inspection, not external sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — existing installed dependencies, verified by package.json inspection
- Architecture: HIGH — direct code inspection of all affected files; dry-run of GPX parsing confirmed outputs
- Pitfalls: HIGH — discovered by running actual computations (Math.round(100.71) = 101; Chart.js max clipping verified)

**Research date:** 2026-03-29
**Valid until:** N/A — this phase is a one-time migration. Research reflects the exact current state of the codebase.
