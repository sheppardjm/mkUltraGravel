'use strict';

const fs = require('fs');
const path = require('path');

// gpxparser requires DOMParser in Node.js -- provide via @xmldom/xmldom
let GpxParser;
try {
  GpxParser = require('gpxparser');
  // Quick probe: gpxparser may silently fail without DOMParser
} catch (e) {
  console.error('Failed to load gpxparser:', e.message);
  process.exit(1);
}

// Test if DOMParser is available; if not, install shim
if (typeof global.DOMParser === 'undefined') {
  try {
    const { DOMParser } = require('@xmldom/xmldom');
    global.DOMParser = DOMParser;
  } catch (shimErr) {
    // @xmldom/xmldom not installed yet -- will install below
    // Re-throw so outer catch can install and retry
    throw shimErr;
  }
}

const ROOT = path.resolve(__dirname, '..');
const GPX_SOURCE = path.join(ROOT, 'MK_Ultra.gpx');
const GPX_DEST = path.join(ROOT, 'public', 'mk-ultra.gpx');
const OUTPUT_DIR = path.join(ROOT, 'public', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'route-data.json');

// --- Read GPX ---
if (!fs.existsSync(GPX_SOURCE)) {
  console.error(`ERROR: GPX source file not found at: ${GPX_SOURCE}`);
  process.exit(1);
}

const gpxContent = fs.readFileSync(GPX_SOURCE, 'utf8');

// --- Parse GPX ---
const gpx = new GpxParser();
gpx.parse(gpxContent);

if (!gpx.tracks || gpx.tracks.length === 0) {
  console.error('ERROR: No tracks found in GPX file. DOMParser may not be available.');
  process.exit(1);
}

const track = gpx.tracks[0];
const points = track.points;
const cumul = track.distance.cumul; // array of cumulative distances in meters

console.log(`Parsed ${points.length} trackpoints`);
console.log(`cumul array length: ${cumul.length}`);

// --- Handle cumul offset ---
// gpxparser cumul[i] = total distance from point 0 to point i+1
// So cumul has length N-1 where N = points.length
// We need cumulMiles[i] to correspond to points[i], with cumulMiles[0] = 0
let cumulMiles;

if (cumul.length === points.length - 1) {
  // Normal case: cumul is length N-1, prepend 0
  cumulMiles = [0, ...cumul.map(m => m / 1609.344)];
} else if (cumul.length === points.length) {
  // Rare: cumul already same length; shift right by prepending 0
  cumulMiles = [0, ...cumul.slice(0, -1).map(m => m / 1609.344)];
} else {
  console.error(`ERROR: Unexpected cumul length ${cumul.length} vs points length ${points.length}`);
  process.exit(1);
}

// Verify alignment
if (cumulMiles.length !== points.length) {
  console.error(`ERROR: cumulMiles length (${cumulMiles.length}) != points length (${points.length})`);
  process.exit(1);
}

if (cumulMiles[0] !== 0) {
  console.error(`ERROR: cumulMiles[0] is ${cumulMiles[0]}, expected 0`);
  process.exit(1);
}

// --- Build route data ---
const routeData = points.map((pt, i) => ({
  lat: pt.lat,
  lon: pt.lon,
  ele: pt.ele,
  mi: Math.round(cumulMiles[i] * 10000) / 10000
}));

// --- Validate ---
const nullCount = routeData.filter(
  p => p.lat == null || p.lon == null || p.ele == null || p.mi == null
).length;
if (nullCount > 0) {
  console.error(`ERROR: ${nullCount} trackpoints have null fields`);
  process.exit(1);
}

// --- Compute route totals ---
let gainM = 0;
for (let i = 1; i < routeData.length; i++) {
  const diff = routeData[i].ele - routeData[i - 1].ele;
  if (diff > 0) gainM += diff;
}

const output = {
  meta: {
    totalMi: Math.round(routeData[routeData.length - 1].mi * 100) / 100,
    elevationGainFt: Math.round(gainM * 3.28084),
    trackpoints: routeData.length
  },
  track: routeData
};

// --- Write output ---
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');

// --- Copy GPX to public ---
fs.mkdirSync(path.dirname(GPX_DEST), { recursive: true });
fs.copyFileSync(GPX_SOURCE, GPX_DEST);

// --- Summary ---
const first = routeData[0];
const last = routeData[routeData.length - 1];

console.log('\n--- Route Data Summary ---');
console.log(`Total trackpoints : ${routeData.length}`);
console.log(`First point       : lat=${first.lat}, lon=${first.lon}, mi=${first.mi}`);
console.log(`Last point        : lat=${last.lat}, lon=${last.lon}, mi=${last.mi}`);
console.log(`Total distance    : ${output.meta.totalMi} miles`);
console.log(`Elevation gain    : ${output.meta.elevationGainFt} ft`);
console.log(`Output            : ${OUTPUT_FILE}`);
console.log(`GPX copy          : ${GPX_DEST}`);
