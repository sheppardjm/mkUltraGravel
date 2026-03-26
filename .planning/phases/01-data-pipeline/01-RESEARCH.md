# Phase 01: Data Pipeline - Research

**Researched:** 2026-03-26
**Domain:** GPX parsing, EXIF extraction, static data generation, Astro build integration
**Confidence:** HIGH (asset inspection direct; libraries verified via official GitHub/npm)

---

## Summary

This phase builds three JSON data files consumed by all downstream components. Research directly
inspected the source assets (GPX, images) and verified library APIs against official sources.

The GPX file (`MK Ultra.gpx`) is a Strava-exported route with 1,827 trackpoints covering 79.6
miles. No downsampling is needed (well under the 2,000-point target). The trackpoints carry
lat/lon/elevation only — no timestamps. All annotations in `data.md` resolve cleanly to
trackpoints except the final one (Down Jeep at 83mi), which exceeds the GPX route length by
3.4 miles. That discrepancy requires a clamping strategy.

Photo EXIF GPS is confirmed absent. All 51 files in `images/` were inspected: 49 are JFIF-only
(no EXIF block at all), 1 has EXIF with no GPS, 1 has a GPS string but not a valid GPS IFD.
Effective result: **0 of 51 photos have GPS coordinates**. All 33 route photos require manual
mile-marker assignment. The photo count puzzle: 51 JPGs - 2 duplicates (`(1)` suffix files) -
12 tone/design images (in `images/tone/`) = ~37 candidate route photos; the 33 target count
requires inspection to identify and exclude the ~4 non-route JPGs.

The project has no `package.json` yet. All scripts will be new. The standard pattern for this
kind of Astro static site is: npm `prebuild` script (or chained `&&` in build command) that
runs Node scripts to write JSON into `public/data/`, which Astro then copies verbatim to the
output directory.

**Primary recommendation:** Use `gpxparser@3.0.8` for GPX parsing (returns meters in `cumul`
array, convert to miles). Use `exifr@7.1.3` for EXIF GPS extraction (returns `undefined` when
absent — use as a fast check, fall back to manual mile-marker lookup for all 33 photos). Wire
build scripts via `"prebuild": "node scripts/generate-data.js"` in `package.json`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `gpxparser` | 3.0.8 | Parse GPX XML into JS object with trackpoints, cumulative distances, elevation | Lightweight, CommonJS-compatible, correct haversine formula, cumul array matches our needs |
| `exifr` | 7.1.3 | Extract GPS EXIF from JPEG | Fastest pure-JS EXIF reader; `gps()` method returns `undefined` when absent — clean fallback |
| Node.js built-ins | (bundled) | `fs`, `path`, `xml` parsing via `gpxparser` | No extra dependency needed for file I/O |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@xmldom/xmldom` | latest | DOM parser required by `gpxparser` in Node.js | If `gpxparser` fails to parse without a DOM environment |
| `haversine-distance` | latest | Standalone haversine if hand-rolling cumulative distances | Only needed if ditching `gpxparser` entirely |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `gpxparser` | `parse-gpx` | `parse-gpx` has similar API but less maintained; gpxparser has cumul array built-in |
| `gpxparser` | `@we-gold/gpxjs` | More modern but requires `xmldom-qsa` polyfill in Node; unnecessary complexity |
| `exifr` | `ExifReader` | ExifReader is fine but exifr's `gps()` API is cleaner for this use case |
| `exifr` | `exiftool-vendored` | exiftool-vendored is overkill — it bundles a native binary; exifr is pure JS |
| Astro integration hook | npm `prebuild` | Both work; `prebuild` is simpler and requires no integration boilerplate |

**Installation:**
```bash
npm install gpxparser exifr
```

> Note: `gpxparser` may need `@xmldom/xmldom` in Node.js environments. Test without it first —
> Strava GPX is valid XML and the library may self-resolve via its bundled parser.

---

## Architecture Patterns

### Recommended Project Structure

```
/
├── MK Ultra.gpx              # Source GPX (project root, stays here)
├── images/                   # 51 JPGs (route photos + duplicates)
│   └── tone/                 # 31 design/tone reference images (NOT route photos)
├── data.md                   # Annotation source of truth (read-only)
├── scripts/
│   ├── parse-gpx.js          # Reads MK Ultra.gpx -> public/data/route-data.json
│   ├── resolve-annotations.js # Reads data.md + route-data.json -> annotations.json
│   └── match-photos.js       # Reads images/ + route-data.json -> photos.json
├── public/
│   ├── data/
│   │   ├── route-data.json   # Generated: trackpoints with cumulative miles
│   │   ├── annotations.json  # Generated: sectors/KOM/restock with lat/lon
│   │   └── photos.json       # Generated: 33 photos with positions
│   └── MK Ultra.gpx          # Copied here so it's available at a public URL
└── package.json              # prebuild script chains Node scripts before astro build
```

### Pattern 1: Cumulative Mile Marker from gpxparser cumul Array

**What:** `gpxparser` returns `tracks[0].distance.cumul` as an array of cumulative distances
in **meters**. Divide by 1609.344 to get miles. Each index corresponds to a trackpoint in
`tracks[0].points`.

**When to use:** All three scripts need this. Build it once in `parse-gpx.js` and output it
per trackpoint.

**Example:**
```javascript
// Source: https://github.com/Luuka/GPXParser.js (src distance calc uses R=6371000m)
const fs = require('fs');
const gpxParser = require('gpxparser');

const gpxText = fs.readFileSync('MK Ultra.gpx', 'utf8');
const gpx = new gpxParser();
gpx.parse(gpxText);

const track = gpx.tracks[0];
const points = track.points;
const cumulMeters = track.distance.cumul; // array parallel to points[]

const routeData = points.map((pt, i) => ({
  lat: pt.lat,
  lon: pt.lon,
  ele: pt.ele,           // meters (elevation)
  mi: cumulMeters[i] / 1609.344  // convert meters to miles
}));

fs.writeFileSync('public/data/route-data.json', JSON.stringify(routeData, null, 2));
```

### Pattern 2: Nearest Trackpoint Lookup for Annotation Resolution

**What:** Given a mile marker from `data.md`, find the closest trackpoint by binary-searching
or linear-scanning the `mi` array in `route-data.json`. Return that trackpoint's lat/lon.

**When to use:** `resolve-annotations.js` — for every sector start/end, KOM start, and restock.

**Example:**
```javascript
// Source: derived from gpxparser distance array structure
function findPointAtMile(routeData, targetMile) {
  // routeData is sorted by mi ascending
  let best = routeData[0];
  let bestDiff = Math.abs(routeData[0].mi - targetMile);
  for (const pt of routeData) {
    const diff = Math.abs(pt.mi - targetMile);
    if (diff < bestDiff) { bestDiff = diff; best = pt; }
    if (pt.mi > targetMile + 0.5) break; // early exit once past window
  }
  return { lat: best.lat, lon: best.lon, actualMi: best.mi };
}
```

### Pattern 3: EXIF GPS with Manual Fallback

**What:** Since 0 of 51 photos have GPS EXIF, `exifr.gps()` will return `undefined` for all.
The `match-photos.js` script should still attempt EXIF extraction as a forward-compatible
pattern, then fall back to mile-marker lookup for every photo.

**When to use:** `match-photos.js` — for every JPG in `images/` (excluding `images/tone/`).

**Example:**
```javascript
// Source: https://github.com/MikeKovarik/exifr (gps() returns undefined if absent)
const exifr = require('exifr');
const path = require('path');

async function getPhotoPosition(imagePath, mileFallback, routeData) {
  const gps = await exifr.gps(imagePath).catch(() => undefined);
  if (gps) {
    return { lat: gps.latitude, lon: gps.longitude, source: 'exif' };
  }
  // Manual fallback: look up mile marker in route
  const pt = findPointAtMile(routeData, mileFallback);
  return { lat: pt.lat, lon: pt.lon, source: 'manual', mi: mileFallback };
}
```

### Pattern 4: Build Script Wiring via package.json prebuild

**What:** npm's `prebuild` lifecycle script runs automatically before `npm run build`.

**When to use:** This is the standard approach — no Astro integration boilerplate needed for
a simple data generation step. Use `astro:config:setup` only if you need Astro-specific context.

**Example:**
```json
// package.json scripts section
{
  "scripts": {
    "prebuild": "node scripts/generate-data.js",
    "build": "astro build",
    "dev": "node scripts/generate-data.js && astro dev"
  }
}
```

Or use a coordinator:
```javascript
// scripts/generate-data.js — runs all three scripts in sequence
const { execSync } = require('child_process');
execSync('node scripts/parse-gpx.js', { stdio: 'inherit' });
execSync('node scripts/resolve-annotations.js', { stdio: 'inherit' });
execSync('node scripts/match-photos.js', { stdio: 'inherit' });
```

### Anti-Patterns to Avoid

- **Parsing GPX with regex or hand-rolled XML:** GPX namespace handling is tricky. Use `gpxparser`.
- **Computing cumulative distance without haversine:** Simple Euclidean distance on lat/lon
  coordinates will be wrong by 10-20% at these latitudes. Always use haversine.
- **Assuming `exifr.gps()` throws on missing GPS:** It returns `undefined`, not an error.
  Wrap in `.catch(() => undefined)` as a safety net but don't expect it to throw.
- **Writing generated JSON to `src/` instead of `public/`:** Astro serves `public/` verbatim.
  JSON in `src/data/` would need to be imported as a module, breaking the "public URL" requirement.
- **Running scripts during `astro:build:done`:** By then the build output directory exists,
  but the JSON files were needed during the build (if any Astro pages reference them).
  Run scripts BEFORE `astro build` via `prebuild`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GPX XML parsing | Custom XML parser / DOMParser | `gpxparser` | Namespace handling, attribute parsing, segment structure |
| Cumulative distance | Manual haversine loop with custom accumulator | `gpxparser` `cumul` array | Already computed per-point; tested against real tracks |
| EXIF extraction | Binary JPEG header parsing | `exifr` | EXIF spec has 20+ edge cases; exifr handles APP1/APP2, TIFF byte order, IFD chaining |
| GPX serving | Copy to custom endpoint | Place in `public/` | Astro serves `public/` verbatim at root URL; `public/MK Ultra.gpx` → `/MK Ultra.gpx` |

**Key insight:** The file naming issue is real — `MK Ultra.gpx` has a space. The public URL will
be `/MK%20Ultra.gpx`. Consider copying it as `public/mk-ultra.gpx` during the prebuild script
so the download URL is clean.

---

## Common Pitfalls

### Pitfall 1: Mile Markers Exceed GPX Route Length

**What goes wrong:** The Down Jeep annotation at 83.0mi cannot be resolved — the GPX route is
only 79.6 miles. `findPointAtMile(83.0)` returns the last trackpoint (79.6mi).

**Why it happens:** The GPX is a Strava route (road-snapped preview). The `data.md` mile markers
were recorded on an actual Garmin ride, which accumulated ~3.4mi more through GPS drift, brief
off-route detours, or pre/post-ride movement.

**How to avoid:** Clamp any mile marker beyond `max(routeData.mi)` to the last trackpoint.
Emit a console warning in `resolve-annotations.js` so it's visible. This is a known data
limitation, not a script bug.

**Warning signs:** `actualMi` in output equals the route endpoint for the last annotation.

### Pitfall 2: gpxparser Requires DOM Environment in Node.js

**What goes wrong:** `gpxparser` uses the browser's `DOMParser`. In Node.js it may throw
"DOMParser is not defined" or silently parse nothing.

**Why it happens:** gpxparser 3.0.8 was released 2021 and targets browsers primarily.

**How to avoid:** Test in Node.js first. If it fails, install `@xmldom/xmldom` and shim:
```javascript
const { DOMParser } = require('@xmldom/xmldom');
global.DOMParser = DOMParser;
```
Or switch to `parse-gpx` which is Node-native.

**Warning signs:** `gpx.tracks` is empty array after parsing a valid GPX.

### Pitfall 3: Photo Count Ambiguity (48 unique JPGs vs 33 target)

**What goes wrong:** The plan says 33 photos, but there are 48 unique non-duplicate JPGs in
`images/` (excluding `images/tone/`). 15 photos need to be identified as "non-route" and
excluded from `photos.json`.

**Why it happens:** The images directory has never been curated. There are likely extra photos
from gear shots, pre/post-ride, etc.

**How to avoid:** Plan 01-01 (inspect assets) must produce a definitive list of which 33 files
are the route photos. `match-photos.js` should take an explicit allowlist config, not glob all
files blindly. Create a `scripts/photo-manifest.js` with the 33 filenames hardcoded after
inspection.

**Warning signs:** `photos.json` has more than 33 entries.

### Pitfall 4: Duplicate Files Cause Double Entries

**What goes wrong:** `HPBlbKhBz0...1536x2048 (1).jpg` and `y0WSG2Mc...1536x2048 (1).jpg` are
exact filename-duplicates of their counterparts without `(1)`. A glob-based approach includes
both.

**How to avoid:** Filter out files matching ` (1).jpg` pattern before processing. Or use the
explicit photo manifest.

**Warning signs:** Duplicate lat/lon entries in `photos.json`.

### Pitfall 5: gpxparser `cumul` Array is Off-by-One

**What goes wrong:** The cumulative distance array has length equal to `points.length`, but
the last element equals the total distance. Index 0 is the distance from point 0 to point 1,
not 0. This means `cumul[0]` > 0.

**Why it happens:** The gpxparser source builds cumul as:
```javascript
cumulDistance[i] = totalDistance;  // after adding points[i] to points[i+1]
```
So `cumul[0]` is the distance from point 0 to point 1 (not 0 from start).

**How to avoid:** Prepend a 0 to the cumul array when building `route-data.json`, or handle
the index offset explicitly. Verify: `routeData[0].mi` should be 0.0.

**Warning signs:** First trackpoint in `route-data.json` has `mi > 0`.

---

## Code Examples

### Inspect GPX trackpoint count and total distance

```javascript
// Quick verification script
const fs = require('fs');
const gpxParser = require('gpxparser');

const gpx = new gpxParser();
gpx.parse(fs.readFileSync('MK Ultra.gpx', 'utf8'));

const track = gpx.tracks[0];
console.log('Trackpoints:', track.points.length);        // expect: 1827
console.log('Total km:', track.distance.total / 1000);  // expect: 128.1km
console.log('Total mi:', track.distance.total / 1609.344); // expect: 79.6mi
console.log('cumul[0] meters:', track.distance.cumul[0]); // first gap ~70m
```

### Resolve a single annotation mile marker to lat/lon

```javascript
// Source: gpxparser distance model verified via GitHub source (R=6371000)
function resolveAnnotation(routeData, name, startMi, endMi = null) {
  const startPt = findPointAtMile(routeData, startMi);
  const result = { name, startMi, lat: startPt.lat, lon: startPt.lon };
  if (endMi !== null) {
    const endPt = findPointAtMile(routeData, startMi + endMi);
    result.endLat = endPt.lat;
    result.endLon = endPt.lon;
    result.endMi = startMi + endMi;
  }
  return result;
}
```

### annotations.json expected shape

```json
{
  "sectors": [
    {
      "name": "Sandstrom",
      "startMi": 23.3,
      "lengthMi": 5.89,
      "stars": 3,
      "lat": 46.45472,
      "lon": -86.98578,
      "endLat": 46.38500,
      "endLon": -86.99200,
      "endMi": 29.19
    }
  ],
  "kom": [
    {
      "name": "Billie Helmer",
      "startMi": 21.9,
      "lengthMi": 0.69,
      "grade": 6.4,
      "elevFt": 236,
      "lat": 46.47066,
      "lon": -86.99709
    }
  ],
  "restock": [
    {
      "name": "Laughing Whitefish River",
      "mi": 21.8,
      "lat": 46.47061,
      "lon": -86.99868
    }
  ]
}
```

### photos.json expected shape

```json
[
  {
    "filename": "0O-2vb6d64dIb8BoPPOv70_h0KpKTEkMYjNkfOJJ6xQ-1536x2048.jpg",
    "lat": 46.45472,
    "lon": -86.98578,
    "mi": 23.3,
    "source": "manual"
  }
]
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom XML parsing of GPX | `gpxparser` library | Ecosystem standard | Correct haversine, cumul array, no namespace bugs |
| exiftool CLI subprocess | `exifr` pure JS | ~2020 | No native binary dep, works in any Node env |
| Astro integration hook for prebuild data | npm `prebuild` lifecycle | Always available | Simpler than writing a full Astro integration |

**Deprecated/outdated:**
- `gpx-parse`: Last updated 2017, Node-native but unmaintained
- `node-exif`: Older EXIF library, superseded by exifr for GPS use cases

---

## Open Questions

1. **Down Jeep annotation at 83mi vs 79.6mi route end**
   - What we know: GPX ends at 79.6mi; Down Jeep sector starts at 83mi in data.md; the
     sector is 0.6mi long so it would also end at 83.6mi
   - What's unclear: Whether the data.md mile marker is correct but the GPX is truncated,
     or whether this is inherent drift from route-vs-ride discrepancy
   - Recommendation: Clamp to last trackpoint (79.6mi) and log a warning. The lat/lon of
     the last point is correct (it's the route end/start at Marquette); just note in the
     output that the mile marker is approximate. All other 12 annotations resolve cleanly.

2. **Which 33 of 48 unique JPGs are route photos?**
   - What we know: 51 total JPGs, 2 duplicates, 12 are in `images/tone/` (excluded), leaving
     48 candidates for 33 slots
   - What's unclear: Identity of the 15 non-route images (gear shots, other?); no filenames
     are self-documenting
   - Recommendation: Plan 01-01 (inspect assets) must visually examine all 48 candidate images
     and produce an explicit `photo-manifest.js` with the 33 route photo filenames

3. **gpxparser Node.js DOM dependency**
   - What we know: gpxparser 3.0.8 may require `DOMParser` shim in Node.js
   - What's unclear: Whether current Node.js (18+) has enough built-in to satisfy it
   - Recommendation: Try without shim first; if `gpx.tracks` is empty, add `@xmldom/xmldom`
     shim as a fallback

4. **Manual mile-marker assignment for 33 photos**
   - What we know: No photo has GPS EXIF; all 33 need manual positions
   - What's unclear: Whether the person who took the photos has a mapping of photo-to-location
     in their head / notes, or if this requires visual identification against the route map
   - Recommendation: Plan 01-04 should include a `photo-manifest.js` that stores
     `{ filename, mi }` pairs as a static lookup — the mile markers can be estimated from
     route context (e.g., which sector the photo appears to be in)

---

## Sources

### Primary (HIGH confidence)
- Direct asset inspection: `MK Ultra.gpx` parsed with Python xml.etree — 1,827 trackpoints,
  79.6mi total, haversine-verified
- Direct asset inspection: all 51 JPGs in `images/` — byte-level JFIF/EXIF check,
  confirmed 0 GPS EXIF
- https://github.com/Luuka/GPXParser.js — source code confirms `R=6371000` (meters),
  cumul array structure, v3.0.8
- https://github.com/MikeKovarik/exifr — README confirms `gps()` API, returns undefined
  on absent GPS, v7.1.3
- https://docs.astro.build/en/reference/integrations-reference/ — hook lifecycle confirmed

### Secondary (MEDIUM confidence)
- npm gpxparser 3.0.8 confirmed current via multiple search results (last release 2021)
- npm exifr 7.1.3 confirmed via libraries.io
- npm `prebuild` lifecycle pattern confirmed via npm docs and multiple articles

### Tertiary (LOW confidence)
- gpxparser may need `@xmldom/xmldom` shim in Node.js — found in community discussions,
  not formally documented; needs validation during implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — gpxparser and exifr verified via official GitHub; Astro build hooks
  confirmed via official docs
- Architecture: HIGH — project structure derived from Astro's `public/` semantics (official
  docs) and direct asset inspection
- Pitfalls: HIGH for items derived from direct asset inspection (GPS absent, mile marker
  overflow, duplicate files); MEDIUM for gpxparser Node.js DOM shim (community reports only)

**Research date:** 2026-03-26
**Valid until:** 2026-04-25 (stable libraries; gpxparser hasn't been updated since 2021)
