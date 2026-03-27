# Phase 11: Data Corrections - Research

**Researched:** 2026-03-27
**Domain:** Node.js data pipeline scripts (pure JS/JSON manipulation, no external APIs)
**Confidence:** HIGH

## Summary

Phase 11 involves correcting hardcoded data values in two build-time scripts (`resolve-annotations.js`, `photo-manifest.js`) and extending `parse-gpx.js` to expose route totals in `route-data.json`. No framework, library, or network dependency is involved — all work is direct file editing and arithmetic on existing data structures.

Two of five requirements are already partially addressed by recent commits. `d492406` (Update segment locations) already updated Down Jeep to `83.55mi` and Silver Creek to `78.55mi` in `resolve-annotations.js`. `219b815` (Remove laughing whitefish) already removed Laughing Whitefish River from the restocks array. Both changes are confirmed present in the current `annotations.json` output. However, `data.md` (which served as the source of truth document) has NOT been updated to match — it still shows old values and still lists Laughing Whitefish. This is a documentation debt, not a bloat issue, but the planner must note it.

The primary remaining work is: (1) adding 20 new images (currently untracked in git status) to `photo-manifest.js` with correct mile markers, (2) updating the hardcoded photo count validator in `match-photos.js` from `33` to the new total, and (3) modifying `parse-gpx.js` to write route totals into `route-data.json`. Changing `route-data.json` from a bare array to a structured object BREAKS two existing consumers (`ElevationProfile.astro`, `RouteMap.astro`) — this must be handled carefully.

**Primary recommendation:** Prefer adding a `meta` wrapper to `route-data.json` (`{ meta: {...}, track: [...] }`) and updating the two consumers to destructure it, rather than creating a separate `route-stats.json` file. This keeps all route data co-located and avoids a third fetch.

## Standard Stack

This phase uses no additional libraries. All tools are already installed.

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Node.js | 22.22.2 (volta-pinned) | Script runtime | Already pinned in package.json |
| sharp | ^0.34.5 (devDep) | WebP thumbnail generation | Already in use by generate-thumbnails.js |
| exifr | ^7.1.3 | EXIF GPS extraction (fallback path) | Already in use by match-photos.js |
| gpxparser | ^3.0.8 | GPX parsing in parse-gpx.js | Already in use |

### No New Dependencies

This phase requires zero `npm install` calls. All scripts use Node.js built-ins (`fs`, `path`) plus the libraries already listed above.

## Architecture Patterns

### Data Pipeline Flow

```
MK Ultra.gpx
    │
    ▼
parse-gpx.js  ──────────────────────►  public/data/route-data.json
                                               │
                    ┌──────────────────────────┤
                    ▼                          ▼
         resolve-annotations.js          match-photos.js
         (reads route-data.json)         (reads route-data.json)
                    │                          │
                    ▼                          ▼
         public/data/annotations.json    public/data/photos.json
                                               │
                                               ▼
                                    generate-thumbnails.js
                                    (enriches photos.json w/ width/height)
```

All scripts run via `npm run prebuild` → `node scripts/generate-data.js`, which calls them in sequence. Changes to any script are applied at next build.

### Pattern 1: Structured route-data.json (DATA-05)

**What:** Change `route-data.json` from a bare trackpoint array to a wrapper object exposing `meta` totals alongside the existing `track` array.

**Why this approach vs. a separate file:** ElevationProfile.astro and RouteMap.astro already fetch `route-data.json`; a wrapper avoids adding a third parallel fetch and keeps all route data in one place. Phase 14 (CONT-04) needs these stats to display them in the UI — a `meta` field is the natural place.

**Breaking change:** Both `ElevationProfile.astro` and `RouteMap.astro` currently do:
```javascript
// Current (will break)
const routeData = await fetch('/data/route-data.json').then(r => r.json());
routeData.map(pt => ...) // treats array directly
```

After the change, consumers must destructure:
```javascript
// Required after change
const { meta, track } = await fetch('/data/route-data.json').then(r => r.json());
track.map(pt => ...)
```

Also breaks `resolve-annotations.js` and `match-photos.js` — both do:
```javascript
const routeData = JSON.parse(fs.readFileSync(routeDataPath, 'utf8'));
routeData[routeData.length - 1].mi  // array indexing
```

These must be updated to `routeData.track[routeData.track.length - 1].mi`.

**Elevation gain computation (verified by test run):**
```javascript
// Source: direct computation on route-data.json
// Result: 971.9m = 3,189ft elevation gain; 98.2255mi total distance
let gainM = 0;
for (let i = 1; i < points.length; i++) {
  const diff = points[i].ele - points[i-1].ele;
  if (diff > 0) gainM += diff;
}
const gainFt = Math.round(gainM * 3.28084);
const totalMi = Math.round(points[points.length - 1].mi * 100) / 100;
```

**Output shape for route-data.json after DATA-05:**
```json
{
  "meta": {
    "totalMi": 98.23,
    "elevationGainFt": 3189,
    "trackpoints": 2498
  },
  "track": [
    { "lat": 46.54305, "lon": -87.39133, "ele": 190.07, "mi": 0 },
    ...
  ]
}
```

### Pattern 2: photo-manifest.js entry format

**What:** Each entry is a plain object `{ filename, mi }`. The `mi` value is manually assigned by visual inspection of the terrain; no EXIF GPS is available in current photos.

**Adding new photos:**
```javascript
// Source: scripts/photo-manifest.js existing pattern
{ filename: 'NEW_FILENAME-1536x2048.jpg', mi: 85.0 },
```

Mile markers for new photos must be estimated by terrain context. The 20 new images in git status need individual `mi` assignments — the planner must treat this as a manual estimation task.

**Validation update required:** `match-photos.js` line 149 has `if (photos.length !== 33)`. This must be updated to the new count after photos are added. If 20 new photos are added, the new expected count is 53 (or whatever the actual curated total is).

### Pattern 3: Segment mile marker corrections (DATA-01)

**Already done:** Down Jeep changed from 83.0 to 83.55 and Silver Creek changed from 78.1 to 78.55 (commit d492406). The annotations.json reflects these values. The data.md document is now stale but that is documentation, not a code bug.

**Remaining discrepancies between data.md and resolve-annotations.js:**

| Annotation | data.md | resolve-annotations.js | Status |
|------------|---------|------------------------|--------|
| Sandstrom startMi | 23.3 | 23.4 | Script is authoritative; data.md stale |
| Akkala Rd startMi | 39.4 | 39.5 | Script is authoritative; data.md stale |
| Haavisto startMi | 43.3 | 43.0 | Script is authoritative; data.md stale |
| Haavisto lengthMi | 1.42 | 1.38 | Script is authoritative; data.md stale |
| Down Jeep startMi | 83 | 83.55 | Script updated; data.md stale |
| Leaving Chatham KOM startMi | 37.5 | 37.6 | Script is authoritative; data.md stale |
| Silver Creek KOM startMi | 78.1 | 78.55 | Script updated; data.md stale |

The script values were updated in d492406 and are the intended correct values. No further changes to `resolve-annotations.js` are needed for DATA-01 unless new corrections are provided. DATA-01 is effectively complete — verification just needs to confirm the values on the rendered map are correct.

### Pattern 4: Laughing Whitefish removal (DATA-03)

**Already done:** commit 219b815 removed `{ name: "Laughing Whitefish River", mi: 21.8 }` from the `restocks` array in `resolve-annotations.js`. Current `annotations.json` confirms the restock array contains only 3 entries (Chatham Convenience Store, Rumely Gas Station, Dollar General). DATA-03 is complete — verification confirms it.

### Anti-Patterns to Avoid

- **Changing only route-data.json without updating consumers:** Both Astro components and both pipeline scripts treat `routeData` as a bare array. Updating the JSON structure without touching all 4 consumers will cause silent runtime errors (no `.map is not a function` in the pipeline scripts, but wrong coordinates output).
- **Hardcoding the new photo count:** After adding photos, update the `33` literal in `match-photos.js` line 149 dynamically, or change it to `photoManifest.length` so it never needs to be maintained manually again.
- **Adding images with ` (1)` suffix:** Two files in `images/` have duplicate-filename suffixes: `HPBlbKhBz0-...-1536x2048 (1).jpg` and `y0WSG2McPuL78...-1536x2048 (1).jpg`. These are exact duplicates and must NOT be added to the manifest — `match-photos.js` checks for duplicate filenames and will warn.
- **Adding non-route images:** `1_56uC20E7dVYlQ4TgQMbgow.jpg` appears to be a non-standard filename (no dimension suffix). It should not be added to the manifest unless confirmed as a route photo.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Route total distance | Re-implement GPX distance math | Read `last.mi` from existing route-data.json track | parse-gpx.js already computes cumulative miles for every trackpoint; the last point's `.mi` value IS the total distance |
| Elevation gain | New GPX elevation parser | Simple loop over track array in parse-gpx.js | The elevation data is already in route-data.json; one pass computes gain |
| Photo coordinate lookup | New Haversine implementation | Existing `findPointAtMile()` in match-photos.js | Already tested and in production |

**Key insight:** All data the phase needs already exists inside the pipeline. This phase is configuration and arithmetic, not new logic.

## Common Pitfalls

### Pitfall 1: Breaking route-data.json consumers without updating all of them

**What goes wrong:** Developer changes `parse-gpx.js` output structure, updates one Astro component, forgets the other or forgets the two pipeline scripts. Build succeeds (no SSR type check on dynamic fetch content), but the map or elevation profile silently renders no data.

**Why it happens:** `route-data.json` is consumed in 4 places: `ElevationProfile.astro`, `RouteMap.astro`, `resolve-annotations.js`, `match-photos.js`. Only the Astro components are obvious; the scripts are easy to miss.

**How to avoid:** Any DATA-05 task MUST explicitly list all 4 files as touch points. Verification must run `npm run data` (full pipeline) after the change and confirm `annotations.json` and `photos.json` are still valid.

**Warning signs:** `annotations.json` contains empty track arrays, or `photos.json` has all photos at mile 0.

### Pitfall 2: Hardcoded count in match-photos.js becomes stale

**What goes wrong:** New photos are added to the manifest; the count check at line 149 warns "Expected 33 photos, got N" on every run. If the developer suppresses warnings, real data issues get hidden.

**Why it happens:** The `33` literal was written when the manifest had exactly 33 photos and was intended as a data integrity guard.

**How to avoid:** Change line 149 to `if (photos.length !== photoManifest.length)` — this makes the check self-updating. Alternatively, update the literal to match the new count.

**Warning signs:** Pipeline output shows "WARNING: Expected 33 photos, got N" during `npm run data`.

### Pitfall 3: data.md and resolve-annotations.js permanently out of sync

**What goes wrong:** Future developers read `data.md` thinking it's the authoritative source, then "correct" resolve-annotations.js back to the old values.

**Why it happens:** data.md was the original source document used to populate the script. After script edits, data.md was not updated.

**How to avoid:** Either update data.md to match current script values during this phase, or add a comment to data.md: "NOTE: For current values, resolve-annotations.js is authoritative; this file is historical reference only."

**Warning signs:** data.md values don't match resolve-annotations.js values.

### Pitfall 4: New photos placed at incorrect mile markers degrade Phase 12

**What goes wrong:** Phase 12 uses `assign-card-photos.js` (Haversine proximity matching) to assign photos to sector and KOM cards. Photos with wrong mile markers land far from the sectors they should illustrate, causing wrong photos to appear on cards.

**Why it happens:** Without GPS EXIF in photos, mile markers are manually estimated. A 5-mile error at mile 83 (Down Jeep) could assign a Forest Service Road photo to the Down Jeep sector card.

**How to avoid:** Use terrain context carefully. Current manifest comments describe landmarks: Chatham Co-Op (~mi 37-38), Dollar General (~mi 76), Silver Creek KOM (~mi 78-80), Down Jeep (~mi 83-84). The new photos should be placed relative to these known anchors.

**Warning signs:** After running `npm run data`, photos.json entries for new photos have coordinates far outside the expected section of the route.

## Code Examples

### DATA-05: Modified parse-gpx.js output (structured route-data.json)

```javascript
// In parse-gpx.js, replace the final write block:
// Source: parse-gpx.js lines 103-105 (current), modified for DATA-05

// Compute totals from already-built routeData array
const track = points.map((pt, i) => ({
  lat: pt.lat,
  lon: pt.lon,
  ele: pt.ele,
  mi: Math.round(cumulMiles[i] * 10000) / 10000
}));

let gainM = 0;
for (let i = 1; i < track.length; i++) {
  const diff = track[i].ele - track[i - 1].ele;
  if (diff > 0) gainM += diff;
}

const output = {
  meta: {
    totalMi: Math.round(track[track.length - 1].mi * 100) / 100,
    elevationGainFt: Math.round(gainM * 3.28084),
    trackpoints: track.length
  },
  track
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
```

### DATA-05: Consumer update pattern (ElevationProfile.astro, RouteMap.astro)

```javascript
// Before (both components):
const routeData = await fetch('/data/route-data.json').then(r => r.json());
// ... routeData.map(pt => ...)

// After:
const routeDataJson = await fetch('/data/route-data.json').then(r => r.json());
const routeData = routeDataJson.track;
// meta available as routeDataJson.meta if needed
// ... routeData.map(pt => ...) — unchanged
```

### DATA-05: Pipeline script consumer update (resolve-annotations.js, match-photos.js)

```javascript
// Before (both scripts):
const routeData = JSON.parse(fs.readFileSync(routeDataPath, 'utf8'));

// After:
const parsed = JSON.parse(fs.readFileSync(routeDataPath, 'utf8'));
const routeData = parsed.track ?? parsed; // backward-compat fallback during transition
```

### DATA-02/04: Hardcoded count fix in match-photos.js

```javascript
// Line 149 — before:
if (photos.length !== 33) {
  console.warn(`WARNING: Expected 33 photos, got ${photos.length}`);
  hasWarnings = true;
}

// After (self-maintaining):
if (photos.length !== photoManifest.length) {
  console.warn(`WARNING: photos.length (${photos.length}) !== manifest length (${photoManifest.length})`);
  hasWarnings = true;
}
```

## State of the Art

This phase involves no technology choices — the pipeline uses stable, already-installed tools. No library upgrades are needed or appropriate.

| Area | Current State | Target State After Phase 11 |
|------|---------------|----------------------------|
| DATA-01 (segments) | Complete (d492406, 219b815) | Verify renders correctly on map |
| DATA-03 (Laughing Whitefish) | Complete (219b815) | Verify absent from map markers and UI |
| DATA-02 (photo positions) | 33 photos, max mi=76, no coverage beyond mi 76 | Corrected positions + new photos added |
| DATA-04 (new photos) | 20 new images in git status, 0 in manifest | All eligible new photos in manifest |
| DATA-05 (route stats) | route-data.json is a bare array | route-data.json has `{ meta, track }` wrapper |
| data.md documentation | Stale (old mile markers, includes Laughing Whitefish) | Updated to match script values |

## Open Questions

1. **Which of the 20 new images in git status are route photos vs. non-route?**
   - What we know: All 20 follow the standard filename pattern (`HASH-WIDTHxHEIGHT.jpg`). The manifest selection criteria specify "Route photos only: gravel roads, trail sections, on-route landmarks, riders on route."
   - What's unclear: The actual content of the 20 new images — they must be visually inspected to confirm route vs. non-route before adding to the manifest.
   - Recommendation: The planner should include a manual inspection step. Add only confirmed route photos with appropriate mile markers; skip non-route content.

2. **Are there additional pre-existing images in images/ (beyond the 20 new ones) that should be added?**
   - What we know: There are 33 non-manifest, non-gitStatus images in `images/` (items that were always there but never curated). Some may be duplicates, off-route, or already excluded intentionally.
   - What's unclear: Whether these were intentionally excluded in the original manifest or simply not yet curated.
   - Recommendation: The 20 gitStatus images are the confirmed new additions. Treat the other 33 untracked files as out of scope for this phase unless the user explicitly asks to include them.

3. **Should data.md be updated to match current script values?**
   - What we know: data.md is now stale relative to resolve-annotations.js. It could mislead future developers.
   - What's unclear: Whether data.md should be the source of truth (and the script should be updated from it) or whether it's now just documentation.
   - Recommendation: Update data.md to match the current (correct) script values and add a note that the script is authoritative. This is a one-line-per-discrepancy task.

## Sources

### Primary (HIGH confidence)
- Direct file inspection of `/scripts/resolve-annotations.js` — confirmed current sector/KOM/restock values
- Direct file inspection of `/scripts/photo-manifest.js` — confirmed 33-photo manifest, max mi=76
- Direct file inspection of `/scripts/match-photos.js` — confirmed hardcoded count=33 at line 149
- Direct file inspection of `/scripts/parse-gpx.js` — confirmed bare array output, no meta totals
- Direct file inspection of `/scripts/generate-data.js` — confirmed pipeline execution order
- `git show d492406` — confirmed Down Jeep 83→83.55, Silver Creek 78.1→78.55 already updated
- `git show 219b815` — confirmed Laughing Whitefish already removed
- Python3 computation on route-data.json — confirmed totalMi=98.2255, elevationGainFt=3189
- `comm` comparison of images/ vs manifest — confirmed 33 non-manifest images in directory
- Git status — confirmed 20 new image files are untracked

### Tertiary (LOW confidence — not needed, but noted)
- No external sources consulted; this phase involves no external APIs, new libraries, or community patterns. All findings come directly from the codebase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all tools verified by package.json
- Architecture: HIGH — verified by direct file inspection of all 4 route-data.json consumers
- Pitfalls: HIGH — all derived from direct code inspection (hardcoded count, consumer list, stale data.md)
- New photo mile markers: LOW — mile marker values for 20 new images require visual inspection of image content; not resolvable without seeing the photos

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable domain — data pipeline doesn't change unless route changes)
