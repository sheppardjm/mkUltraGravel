'use strict';

/**
 * match-photos.js
 *
 * Combines the photo manifest (photo-manifest.js) with route-data.json to
 * produce public/data/photos.json with lat/lon positions for all route photos.
 *
 * For each photo, EXIF GPS extraction is attempted first (forward-compatible
 * pattern). If no EXIF GPS is found, position is resolved via mile-marker
 * lookup against route-data.json.
 *
 * Output consumed by:
 *   - Phase 5: Map photo markers
 *   - Phase 8: Photo gallery
 *
 * Usage: node scripts/match-photos.js
 */

const fs   = require('fs');
const path = require('path');

const exifr = require('exifr');

const { photoManifest } = require('./photo-manifest.js');

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
// Core helper: find trackpoint closest to targetMile
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

  let bestPt   = routeData[0];
  let bestDist = Math.abs(routeData[0].mi - targetMile);

  for (let i = 1; i < routeData.length; i++) {
    const pt = routeData[i];

    // Early exit: we've moved far enough past the target
    if (pt.mi > targetMile + 0.5) break;

    const dist = Math.abs(pt.mi - targetMile);
    if (dist < bestDist) {
      bestDist = dist;
      bestPt   = pt;
    }
  }

  return { lat: bestPt.lat, lon: bestPt.lon, actualMi: bestPt.mi };
}

// ---------------------------------------------------------------------------
// Photo position resolver: EXIF first, manual fallback
// ---------------------------------------------------------------------------

/**
 * Attempt EXIF GPS extraction; fall back to mile-marker lookup.
 *
 * Forward-compatible pattern: if photos are ever re-exported with GPS tags,
 * this will automatically use the more precise EXIF coordinates without
 * requiring script changes.
 *
 * @param {string} filename     Photo filename (basename only)
 * @param {number} mileFallback Mile marker from manifest
 * @param {Array}  routeData    Route trackpoints
 * @returns {Promise<{ lat: number, lon: number, source: 'exif'|'manual' }>}
 */
async function getPhotoPosition(filename, mileFallback, routeData) {
  const imagePath = path.join('images', filename);

  // Attempt EXIF GPS (will return undefined for all current photos)
  const gps = await exifr.gps(imagePath).catch(() => undefined);
  if (gps && gps.latitude && gps.longitude) {
    return { lat: gps.latitude, lon: gps.longitude, source: 'exif' };
  }

  // Manual fallback via mile marker
  const pt = findPointAtMile(routeData, mileFallback);
  return { lat: pt.lat, lon: pt.lon, source: 'manual' };
}

// ---------------------------------------------------------------------------
// Main: process all manifest entries
// ---------------------------------------------------------------------------

async function main() {
  console.log('match-photos.js: Processing photo manifest...\n');
  console.log(`Route: ${routeData.length} trackpoints, mi 0 to ${routeData[routeData.length - 1].mi.toFixed(4)}`);
  console.log(`Manifest: ${photoManifest.length} photos\n`);

  const photos = [];

  for (const entry of photoManifest) {
    const pos = await getPhotoPosition(entry.filename, entry.mi, routeData);
    photos.push({
      filename: entry.filename,
      lat:      pos.lat,
      lon:      pos.lon,
      mi:       entry.mi,
      source:   pos.source,
    });
  }

  // Sort by mi ascending (manifest should already be sorted, but enforce it)
  photos.sort((a, b) => a.mi - b.mi);

  // ---------------------------------------------------------------------------
  // Validate before writing
  // ---------------------------------------------------------------------------

  let hasWarnings = false;

  // Check count
  if (photos.length !== photoManifest.length) {
    console.warn(`WARNING: photos.length (${photos.length}) !== manifest length (${photoManifest.length})`);
    hasWarnings = true;
  }

  // Check all filenames exist in images/
  const missing = photos.filter(p => !fs.existsSync(path.join('images', p.filename)));
  if (missing.length > 0) {
    console.warn(`WARNING: ${missing.length} photo(s) not found in images/:`);
    missing.forEach(p => console.warn(`  - ${p.filename}`));
    hasWarnings = true;
  }

  // Check for duplicate filenames
  const seen = new Set();
  const duplicates = [];
  for (const p of photos) {
    if (seen.has(p.filename)) {
      duplicates.push(p.filename);
    }
    seen.add(p.filename);
  }
  if (duplicates.length > 0) {
    console.warn(`WARNING: Duplicate filenames detected:`);
    duplicates.forEach(f => console.warn(`  - ${f}`));
    hasWarnings = true;
  }

  // Verify coordinates within Marquette County bounds
  // ~46.2-46.8 lat, ~-87.5 to -86.5 lon
  const outOfBounds = photos.filter(p =>
    p.lat < 46.2 || p.lat > 46.8 || p.lon < -87.5 || p.lon > -86.5
  );
  if (outOfBounds.length > 0) {
    console.warn(`WARNING: ${outOfBounds.length} photo(s) have coordinates outside Marquette County bounds:`);
    outOfBounds.forEach(p => console.warn(`  - ${p.filename}: lat=${p.lat}, lon=${p.lon}`));
    hasWarnings = true;
  }

  if (!hasWarnings) {
    console.log('Validation: all checks passed.\n');
  }

  // ---------------------------------------------------------------------------
  // Write output
  // ---------------------------------------------------------------------------

  const outputPath = path.join(__dirname, '..', 'public', 'data', 'photos.json');
  fs.writeFileSync(outputPath, JSON.stringify(photos, null, 2), 'utf8');

  // ---------------------------------------------------------------------------
  // Summary log
  // ---------------------------------------------------------------------------

  const exifCount   = photos.filter(p => p.source === 'exif').length;
  const manualCount = photos.filter(p => p.source === 'manual').length;
  const firstMi     = photos[0].mi;
  const lastMi      = photos[photos.length - 1].mi;

  console.log(`Total photos processed: ${photos.length}`);
  console.log(`  EXIF GPS:  ${exifCount}`);
  console.log(`  Manual:    ${manualCount}`);
  console.log(`Mile range:  ${firstMi} to ${lastMi}`);
  console.log(`\nWrote ${outputPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
