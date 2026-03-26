'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Load route data
// ---------------------------------------------------------------------------

const routeDataPath = path.join(__dirname, '..', 'public', 'data', 'route-data.json');

if (!fs.existsSync(routeDataPath)) {
  console.error('Error: route-data.json not found. Run parse-gpx.js first.');
  process.exit(1);
}

const routeData = JSON.parse(fs.readFileSync(routeDataPath, 'utf8'));

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Find the trackpoint closest to targetMile.
 *
 * Linear scan with early-exit optimisation: once we've passed targetMile + 0.5
 * we can't get any closer, so break.
 *
 * If targetMile exceeds the last trackpoint's mi value, clamp to the last
 * point and emit a console warning.
 *
 * @param {Array}  routeData   Array of {lat, lon, ele, mi} objects sorted by mi asc
 * @param {number} targetMile
 * @returns {{ lat: number, lon: number, actualMi: number }}
 */
function findPointAtMile(routeData, targetMile) {
  const maxMi = routeData[routeData.length - 1].mi;

  if (targetMile > maxMi) {
    console.warn(
      `WARNING: Mile marker ${targetMile} exceeds route end (${maxMi.toFixed(4)}mi). Clamped to last trackpoint.`
    );
    const last = routeData[routeData.length - 1];
    return { lat: last.lat, lon: last.lon, actualMi: last.mi };
  }

  let bestPt = routeData[0];
  let bestDist = Math.abs(routeData[0].mi - targetMile);

  for (let i = 1; i < routeData.length; i++) {
    const pt = routeData[i];

    // Early exit: we've moved far enough past the target
    if (pt.mi > targetMile + 0.5) break;

    const dist = Math.abs(pt.mi - targetMile);
    if (dist < bestDist) {
      bestDist = dist;
      bestPt = pt;
    }
  }

  return { lat: bestPt.lat, lon: bestPt.lon, actualMi: bestPt.mi };
}

/**
 * Resolve start AND end coordinates for a segment, plus an intermediate track
 * array (for polyline rendering on the map).
 *
 * @param {Array}  routeData
 * @param {number} startMi
 * @param {number} lengthMi
 * @returns {{ lat, lon, endLat, endLon, endMi, track: Array<{lat,lon}> }}
 */
function findPointsForSegment(routeData, startMi, lengthMi) {
  const endMiTarget = startMi + lengthMi;

  const startResult = findPointAtMile(routeData, startMi);
  const endResult   = findPointAtMile(routeData, endMiTarget);

  // Collect all trackpoints between startMi and endMiTarget (inclusive ± tolerance).
  // If the segment is beyond the route end (clamped), use the clamped start/end
  // coordinates to produce a minimal single-point track so callers always get a
  // non-empty array.
  let track = routeData
    .filter(pt => pt.mi >= startMi - 0.01 && pt.mi <= endMiTarget + 0.01)
    .map(pt => ({ lat: pt.lat, lon: pt.lon }));

  if (track.length === 0) {
    // Both start and end were clamped — provide the resolved endpoints at minimum
    track = [
      { lat: startResult.lat, lon: startResult.lon },
      { lat: endResult.lat,   lon: endResult.lon   },
    ];
  }

  return {
    lat:    startResult.lat,
    lon:    startResult.lon,
    endLat: endResult.lat,
    endLon: endResult.lon,
    endMi:  endResult.actualMi,
    track,
  };
}

// ---------------------------------------------------------------------------
// Annotation data (hardcoded from data.md)
// ---------------------------------------------------------------------------

const sectors = [
  { name: 'Sandstrom',          startMi: 23.3, lengthMi: 5.89, stars: 3 },
  { name: 'Akkala Rd',          startMi: 39.4, lengthMi: 1.42, stars: 3 },
  { name: 'Haavisto',           startMi: 43.3, lengthMi: 1.42, stars: 4 },
  { name: 'Forest Service Rd',  startMi: 50.7, lengthMi: 6.45, stars: 2 },
  { name: 'C4',                 startMi: 58.7, lengthMi: 5.65, stars: 5 },
  { name: 'Down Jeep',          startMi: 83.0, lengthMi: 0.6,  stars: 5 },
];

const koms = [
  { name: 'Billie Helmer',    startMi: 21.9, lengthMi: 0.69, grade: 6.4, elevFt: 236 },
  { name: 'Leaving Chatham',  startMi: 37.5, lengthMi: 0.33, grade: 4.1, elevFt: 72  },
  { name: 'Silver Creek',     startMi: 78.1, lengthMi: 1.61, grade: 4.4, elevFt: 373 },
];

const restocks = [
  { name: 'Laughing Whitefish River',   mi: 21.8 },
  { name: 'Chatham Convenience Store',  mi: 37.3 },
  { name: 'Rumely Gas Station',         mi: 46.3 },
  { name: 'Dollar General',             mi: 76.1 },
];

// ---------------------------------------------------------------------------
// Resolve all annotations
// ---------------------------------------------------------------------------

console.log('Resolving annotation coordinates from route-data.json...\n');

const resolvedSectors = sectors.map(sector => {
  const coords = findPointsForSegment(routeData, sector.startMi, sector.lengthMi);
  return { ...sector, ...coords };
});

const resolvedKoms = koms.map(kom => {
  const coords = findPointsForSegment(routeData, kom.startMi, kom.lengthMi);
  return { ...kom, ...coords };
});

const resolvedRestocks = restocks.map(restock => {
  const { lat, lon, actualMi } = findPointAtMile(routeData, restock.mi);
  return { ...restock, lat, lon, actualMi };
});

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------

const output = {
  sectors:  resolvedSectors,
  kom:      resolvedKoms,
  restock:  resolvedRestocks,
};

const outputPath = path.join(__dirname, '..', 'public', 'data', 'annotations.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');

// ---------------------------------------------------------------------------
// Summary log
// ---------------------------------------------------------------------------

console.log(`Resolved ${resolvedSectors.length} sectors:`);
resolvedSectors.forEach(s =>
  console.log(`  ${s.name.padEnd(20)} start=(${s.lat.toFixed(5)}, ${s.lon.toFixed(5)})  track pts: ${s.track.length}`)
);

console.log(`\nResolved ${resolvedKoms.length} KOM segments:`);
resolvedKoms.forEach(k =>
  console.log(`  ${k.name.padEnd(20)} start=(${k.lat.toFixed(5)}, ${k.lon.toFixed(5)})  track pts: ${k.track.length}`)
);

console.log(`\nResolved ${resolvedRestocks.length} restock points:`);
resolvedRestocks.forEach(r =>
  console.log(`  ${r.name.padEnd(32)} (${r.lat.toFixed(5)}, ${r.lon.toFixed(5)})`)
);

console.log(`\nWrote ${outputPath}`);
