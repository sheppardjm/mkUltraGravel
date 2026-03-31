# Phase 41: GPX Route Update + Pipeline Validation — Research

**Researched:** 2026-03-31
**Domain:** Data pipeline / GPX file replacement / downstream JSON regeneration
**Confidence:** HIGH

## Summary

Phase 41 replaces the current route source (`MK_Ultra.gpx`, 2779 trackpoints, 100.71 mi, RideWithGPS export) with the new `MKULTRA.gpx` (2581 trackpoints, 100.62 mi, Strava export). Both files are already present in the repo root. The new file is untracked in git (`?? MKULTRA.gpx`). The current `parse-gpx.js` line 29 still reads `MK_Ultra.gpx`; this is the only code change required.

All pre-flight validation was run against MKULTRA.gpx before writing this research. The new file parses cleanly, produces `totalMi: 100.62` (within the 99–101 mile success criterion), has elevation data on all 2581 trackpoints, and zero annotation clamping warnings — all 9 annotation mile markers (6 sectors + 3 KOMs) plus the maximum photo mile marker (83.8 mi) fall well below the route end. Annotation coordinates will shift by 84–282 meters from their current positions (both files represent the same physical route but have slightly different start points 196 meters apart, causing systematic shift across all resolved coordinates).

The display fix from Phase 22 (`Math.floor`) is already in place. The elevation profile x-axis is already dynamic (`Math.ceil(totalMi)` from meta). No new npm dependencies are needed. The only required code change is `parse-gpx.js` line 29. The pipeline is one command: `npm run prebuild` (or `npm run data`).

**Primary recommendation:** Update `parse-gpx.js` line 29 from `MK_Ultra.gpx` to `MKULTRA.gpx`, run `npm run data`, verify outputs, then `git add MKULTRA.gpx public/data/ public/mk-ultra.gpx`.

## Standard Stack

No new libraries required. This phase uses the existing pipeline stack exactly as-is.

### Core
| Tool/Library | Version | Purpose | Why Standard |
|---|---|---|---|
| `gpxparser` | ^3.0.8 | Parse GPX XML into track arrays with cumulative distance | Already installed; handles both Strava and RideWithGPS cumul formats |
| `@xmldom/xmldom` | ^0.8.11 | DOMParser shim for Node.js (required by gpxparser) | Already installed |
| `node scripts/generate-data.js` | — | Full pipeline coordinator | Established `npm run data` / `npm run prebuild` entrypoint |

### Pipeline Scripts (execution order, all affected by GPX source change)
| Script | Output | Change Needed |
|---|---|---|
| `parse-gpx.js` | `route-data.json`, `public/mk-ultra.gpx` | YES — line 29 must point to `MKULTRA.gpx` |
| `resolve-annotations.js` | `annotations.json` | NO code change — auto-re-resolves from new route-data.json |
| `match-photos.js` | `photos.json` | NO code change — auto-re-resolves from new route-data.json |
| `generate-thumbnails.js` | `public/images/thumbs/` | Unaffected |
| `assign-card-photos.js` | `annotations.json` (coverPhoto) | Unaffected |
| `convert-hero.js` | `public/images/hero.webp` | Unaffected (skips if exists) |
| `convert-tone-images.js` | `public/tone/*.webp` | Unaffected (skips if exists) |

**Installation:** No new packages required.

## Architecture Patterns

### Existing Project Structure (relevant files)
```
repo-root/
├── MKULTRA.gpx         # NEW source file (2581 pts, 100.62 mi, Strava) — UNTRACKED
├── MK_Ultra.gpx        # CURRENT source file (2779 pts, 100.71 mi, RideWithGPS) — tracked
├── scripts/
│   ├── parse-gpx.js    # Line 29: GPX_SOURCE — change MK_Ultra.gpx -> MKULTRA.gpx
│   └── resolve-annotations.js  # Hardcoded mile markers resolved against route-data.json
├── public/
│   ├── mk-ultra.gpx    # Copy of source GPX for browser download — auto-updated by pipeline
│   └── data/
│       ├── route-data.json   # { meta: {totalMi, elevationGainFt, trackpoints}, track: [...] }
│       ├── annotations.json  # { sectors: [...], kom: [...], restock: [...] }
│       └── photos.json       # [ { filename, lat, lon, mi, source }, ... ]
```

### Pattern 1: GPX Source Switch (1 line change)
**What:** `parse-gpx.js` hardcodes the source filename on line 29.
**When to use:** Whenever the route source GPX file changes.
**Example:**
```javascript
// scripts/parse-gpx.js line 29
// BEFORE:
const GPX_SOURCE = path.join(ROOT, 'MK_Ultra.gpx');
// AFTER:
const GPX_SOURCE = path.join(ROOT, 'MKULTRA.gpx');
```

### Pattern 2: Pipeline Re-run (single command)
**What:** `npm run data` is an alias for `node scripts/generate-data.js`, which runs all 7 pipeline scripts in sequence. Idempotent and safe to re-run.
**When to use:** After any GPX source change. Must be run before `npm run build`.

### Pattern 3: gpxparser `cumul` Array — N Branch (verified)
**What:** `gpxparser` v3.0.8 `calculDistance` always produces `cumul.length === points.length` (not N-1). Line 241 of gpxparser's source explicitly sets `cumulDistance[points.length - 1] = totalDistance`.
**Implication:** `parse-gpx.js` always hits the `else if (cumul.length === points.length)` branch (lines 67-69). This is correct and produces `cumulMiles[0] = 0`.
**Verified empirically:** Both `MKULTRA.gpx` and `MK_Ultra.gpx` parse with `cumul.length === points.length`.

### Pattern 4: Annotation Coordinate Drift (expected behavior)
**What:** After pipeline re-run, sector and KOM coordinates will shift by 84–282 meters from their current values. This is EXPECTED — not a regression.
**Why:** `MKULTRA.gpx` (Strava export) starts 196 meters from where `MK_Ultra.gpx` (RideWithGPS export) starts. Both represent the same physical route but from different GPS captures. The mile markers are correct for the new route; coordinates are derived from the new geometry.
**Verification approach:** Confirm no clamping warnings in pipeline output. Visual spot-check on map that markers are on-route.

### Anti-Patterns to Avoid
- **Running individual pipeline scripts:** Use `npm run data` or `npm run prebuild` — scripts have dependencies.
- **Treating coordinate shift as an error:** 84–282 meter shifts are expected when switching between Strava and RideWithGPS GPX exports of the same route.
- **Forgetting to `git add MKULTRA.gpx`:** The file is currently untracked. Without `git add`, the pipeline works locally but production deployments from clean git checkouts will fail.
- **Forgetting to commit `public/data/` JSON files:** `route-data.json`, `annotations.json`, and `photos.json` are tracked in git. Netlify builds use committed versions.
- **Recalibrating annotation mile markers pre-emptively:** All annotations are within route bounds (max annotated mile is 84.15 vs route end 100.62). No calibration needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| GPX parsing + distance | Custom XML parser + haversine | `gpxparser` + `@xmldom/xmldom` (already installed) | Handles malformed XML, distance accumulation quirks |
| Pipeline orchestration | Shell script | `generate-data.js` (already exists) | Has error handling, correct ordering, exit codes |
| Coordinate lookup | Custom binary search | `findPointAtMile()` in `resolve-annotations.js` | Already handles clamping, boundary conditions |

**Key insight:** This phase is a data swap. The only required code change is one line in `parse-gpx.js`. Everything else is pipeline re-run + git operations.

## Common Pitfalls

### Pitfall 1: MKULTRA.gpx not git-tracked — pipeline fails on Netlify
**What goes wrong:** Pipeline works locally but Netlify build fails with "ERROR: GPX source file not found".
**Why it happens:** `MKULTRA.gpx` is currently `?? MKULTRA.gpx` (untracked). Local checkout has it; clean Netlify checkout does not.
**How to avoid:** `git add MKULTRA.gpx` before committing `parse-gpx.js` change.
**Warning signs:** `git status` still shows `?? MKULTRA.gpx` after changes are staged.

### Pitfall 2: public/data/ JSON files not committed — stale data in production
**What goes wrong:** The new route-data.json (100.62 mi, 2581 pts) was regenerated locally but not committed. Netlify builds still serve 100.71 mi / 2779 pts data.
**Why it happens:** Unlike `public/images/` (gitignored), `public/data/` is tracked in git.
**How to avoid:** After `npm run data`, verify JSON outputs, then `git add public/data/ public/mk-ultra.gpx`.
**Warning signs:** `git diff public/data/route-data.json` shows no changes after running pipeline.

### Pitfall 3: Clamping warnings misread as failures
**What goes wrong:** Operator sees a `WARNING` line in pipeline output and assumes something broke.
**Why it happens:** `findPointAtMile` in both `resolve-annotations.js` and `match-photos.js` emits a `WARNING:` if a mile marker exceeds route end. With MKULTRA.gpx (100.62 mi), all markers are well within bounds — zero warnings expected.
**How to avoid:** Pre-flight confirmed: all annotation markers (max 84.15 mi) and photo markers (max 83.8 mi) are below 100.62 mi.
**Warning signs:** Any `WARNING: Mile marker X exceeds route end` in pipeline output signals an unexpected problem.

### Pitfall 4: Elevation gain display changes (3595 → 3365 ft)
**What goes wrong:** The page will display "3,365 ft elevation gain" after the pipeline re-run, changed from the current "3,595 ft". This is NOT a bug — it's the correct data from the new Strava-sourced GPX file (smoother track reduces calculated gain). But it may surprise.
**Why it happens:** Strava smooths trackpoints differently than RideWithGPS. Fewer trackpoints (2581 vs 2779) and different GPS noise means different raw gain summation.
**How to avoid:** Accept the new value as correct. Both `Math.floor(routeMeta.totalMi)` and `routeMeta.elevationGainFt.toLocaleString()` are dynamic — they update automatically.
**Warning signs:** None — this is expected and correct behavior.

### Pitfall 5: gpxparser cumul length — always N, not N-1
**What goes wrong:** Phase 22 research claimed "Strava format = N-1". This is incorrect per gpxparser source code (line 241 sets `cumulDistance[points.length - 1] = totalDistance`, making length always N).
**Why it happens:** The N-1 claim was a hypothesis; empirical verification shows both GPX sources produce `cumul.length === points.length`.
**How to avoid:** `parse-gpx.js` correctly handles this via the `else if` branch (lines 67-69). No action needed — it already works correctly.
**Warning signs:** "ERROR: Unexpected cumul length" — would mean a third edge case was hit (should not occur with valid GPX).

## Code Examples

Verified by direct codebase inspection and live gpxparser execution:

### The 1-Line Code Change
```javascript
// scripts/parse-gpx.js line 29
// BEFORE (current):
const GPX_SOURCE = path.join(ROOT, 'MK_Ultra.gpx');
// AFTER:
const GPX_SOURCE = path.join(ROOT, 'MKULTRA.gpx');
// GPX_DEST unchanged: path.join(ROOT, 'public', 'mk-ultra.gpx')
```

### Expected route-data.json meta after pipeline re-run
```json
{
  "meta": {
    "totalMi": 100.62,
    "elevationGainFt": 3365,
    "trackpoints": 2581
  }
}
```

### Expected pipeline output (clean run, no warnings)
```
--- parse-gpx.js ---
Parsed 2581 trackpoints
cumul array length: 2581
...
Total distance    : 100.62 miles
Elevation gain    : 3365 ft

--- resolve-annotations.js ---
Resolving annotation coordinates from route-data.json...
Resolved 6 sectors:     [6 lines, no WARNING lines]
Resolved 3 KOM segments:[3 lines, no WARNING lines]
Resolved 3 restock points: [3 lines]

--- match-photos.js ---
Route: 2581 trackpoints, mi 0 to 100.6200
Manifest: 55 photos
Validation: all checks passed.
Total photos processed: 55
```

### Git operations sequence
```bash
# Stage the new GPX file and code change
git add MKULTRA.gpx scripts/parse-gpx.js

# Run pipeline
npm run data

# Stage generated artifacts
git add public/data/route-data.json public/data/annotations.json public/data/photos.json public/mk-ultra.gpx

# Commit
git commit -m "feat(41): replace GPX source with MKULTRA.gpx and regenerate pipeline"
```

## State of the Art

| Old State | New State After Phase 41 | Notes |
|---|---|---|
| `MK_Ultra.gpx` (2779 pts, 100.71 mi, RideWithGPS) | `MKULTRA.gpx` (2581 pts, 100.62 mi, Strava) | Same physical route, Strava export |
| `totalMi: 100.71` | `totalMi: 100.62` | Both display as "100 miles" via `Math.floor` |
| `elevationGainFt: 3595` | `elevationGainFt: 3365` | Dynamic — auto-updates |
| `trackpoints: 2779` | `trackpoints: 2581` | Strava has fewer, smoother points |
| Annotations derived from RideWithGPS geometry | Annotations derived from Strava geometry | 84–282m coordinate shift per marker (expected) |
| `public/mk-ultra.gpx` = RideWithGPS copy | `public/mk-ultra.gpx` = Strava copy | Download link unchanged (`/mk-ultra.gpx`) |

**Already in place from Phase 22 (no action needed):**
- `Math.floor(routeMeta.totalMi)` display in `index.astro` — handles 100.62 → "100 miles" correctly
- Dynamic elevation profile x-axis (`Math.ceil(totalMi)`) — handles 100.62 → `max: 101` correctly

## Open Questions

1. **Should `MK_Ultra.gpx` be removed from the repo?**
   - What we know: It will be superseded as source. Git history preserves it.
   - What's unclear: User preference for retention vs cleanup.
   - Recommendation: Remove it (`git rm MK_Ultra.gpx`) in the same commit to eliminate source-of-truth confusion. Git history preserves it. This was also recommended (but not required) in Phase 22.

2. **Will annotation coordinate shifts (84–282m) require visual re-verification?**
   - What we know: Shifts are 84–282 meters. All markers remain on-route (no clamping). Both files represent the same physical road network.
   - What's unclear: Whether the map will render markers in "obviously wrong" positions visible to end users.
   - Recommendation: After pipeline re-run, do a quick visual check on the Leaflet map at zoom 14 to confirm sector/KOM markers are on or near the correct road segments. Given both files are GPS tracks of the same route, this is a formality — but Success Criterion 3 requires it.

3. **Is the elevation gain change (3595 → 3365 ft) acceptable?**
   - What we know: It is the correct calculated gain from the new GPX. It is dynamic (auto-displays).
   - What's unclear: Whether the event director considers 3365 or 3595 ft the "authoritative" figure.
   - Recommendation: Accept 3365 ft as correct; it derives from the authoritative Strava GPS record of the actual ride. No code change needed.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `scripts/parse-gpx.js` — full read, GPX_SOURCE on line 29
- Direct codebase inspection: `scripts/resolve-annotations.js` — annotation mile markers verified
- Direct codebase inspection: `scripts/match-photos.js` — photo mile markers verified
- Direct codebase inspection: `scripts/generate-data.js` — pipeline sequence verified
- Direct codebase inspection: `src/pages/index.astro` line 264 — `Math.floor(routeMeta.totalMi)` confirmed
- Direct codebase inspection: `src/components/ElevationProfile.astro` lines 52, 207 — dynamic x-axis confirmed
- Live execution: `gpxparser` run against both GPX files — cumul length, totalMi, trackpoints confirmed empirically
- gpxparser source: `node_modules/gpxparser/src/GpxParser.js` lines 233-247 — `calculDistance` always produces cumul.length === N
- Python haversine analysis: All 9 annotation mile markers + photo max verified within MKULTRA.gpx bounds (max 100.62 mi)
- Python coordinate comparison: 84–282m position deltas calculated between old and new GPX annotation coordinates

### Secondary (MEDIUM confidence)
- Phase 22 RESEARCH.md — prior GPX replacement research (note: cumul N-1 claim superseded by empirical verification)
- Memory: `project_route_extended.md` — confirms route is 100 miles, Strava update pending

### Tertiary (LOW confidence)
- None required — all findings from direct code and file inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — existing installed dependencies, no new packages
- Architecture: HIGH — single line code change; pipeline structure verified by running gpxparser live
- Pitfalls: HIGH — discovered by actual gpxparser execution, git status inspection, and coordinate calculation

**Research date:** 2026-03-31
**Valid until:** N/A — one-time migration. Research reflects exact current codebase state.
