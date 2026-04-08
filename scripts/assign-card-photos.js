#!/usr/bin/env node
/**
 * Card photo assignment for sector and KOM annotation cards.
 * Reads public/data/photos.json (mile-marked photo manifest) and
 * public/data/annotations.json, selects a representative coverPhoto
 * for each sector and KOM segment, generates 1200x675 WebP card crops,
 * and writes coverPhoto back into annotations.json.
 *
 * Algorithm (two-pass):
 *   Pass 1: Photos within [startMi, startMi+lengthMi] — pick midpoint-closest.
 *   Pass 2: If no photos in range, pick nearest photo in entire manifest (fallback).
 *           Logs a warning for each fallback used.
 *
 * Card crops written to: public/images/cards/{basename}.webp (1200x675, q80)
 * Idempotent: skips card crops that already exist.
 *
 * Usage: node scripts/assign-card-photos.js
 * Called by: scripts/generate-data.js (after generate-thumbnails.js)
 */
'use strict';

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function assignCardPhotos() {
  const root = path.join(__dirname, '..');
  const photosJsonPath = path.join(root, 'public', 'data', 'photos.json');
  const annotationsPath = path.join(root, 'public', 'data', 'annotations.json');
  const imagesDir = path.join(root, 'public', 'images');
  const cardsDir = path.join(root, 'public', 'images', 'cards');

  // Ensure cards output directory exists
  fs.mkdirSync(cardsDir, { recursive: true });

  // Load inputs
  const photos = JSON.parse(fs.readFileSync(photosJsonPath, 'utf8'));
  const annotations = JSON.parse(fs.readFileSync(annotationsPath, 'utf8'));

  /**
   * Select the best coverPhoto filename for a segment.
   * IMPORTANT: never mutates the original `photos` array — uses copies for sort.
   *
   * @param {number} startMi - Segment start mile marker
   * @param {number} lengthMi - Segment length in miles
   * @param {string} name - Segment name (for warning messages)
   * @returns {string} photo filename
   */
  function selectCoverPhoto(startMi, lengthMi, name) {
    const endMi = startMi + lengthMi;
    const midMi = startMi + lengthMi / 2;

    // Pass 1: photos within the segment mile range
    const within = photos.filter(p => p.mi >= startMi && p.mi <= endMi);

    if (within.length > 0) {
      // Copy before sorting to avoid mutating the filtered array (not strictly needed
      // since within is already a new array, but explicit for clarity)
      const sorted = within.slice().sort((a, b) => Math.abs(a.mi - midMi) - Math.abs(b.mi - midMi));
      return sorted[0].filename;
    }

    // Pass 2: fallback — nearest photo in entire manifest
    // CRITICAL: copy the array before sorting to preserve original order for subsequent iterations
    const nearest = photos.slice().sort((a, b) => Math.abs(a.mi - midMi) - Math.abs(b.mi - midMi));
    console.warn(`  WARNING: no photos within range ${startMi}-${endMi.toFixed(2)} (${name}), using nearest fallback at mi ${nearest[0].mi}`);
    return nearest[0].filename;
  }

  // Assign coverPhoto to each sector
  for (const sector of annotations.sectors) {
    sector.coverPhoto = selectCoverPhoto(sector.startMi, sector.lengthMi, sector.name);
  }

  // Assign coverPhoto to each KOM
  for (const kom of annotations.kom) {
    kom.coverPhoto = selectCoverPhoto(kom.startMi, kom.lengthMi, kom.name);
  }

  // Collect unique coverPhoto filenames (deduplication — same photo could cover multiple annotations)
  const uniqueCoverFilenames = new Set([
    ...annotations.sectors.map(s => s.coverPhoto),
    ...annotations.kom.map(k => k.coverPhoto),
  ]);

  console.log(`\nSelected ${uniqueCoverFilenames.size} unique cover photos for ${annotations.sectors.length} sectors + ${annotations.kom.length} KOMs`);

  // Generate 1200x675 WebP card crops for selected photos only
  let generated = 0;
  let skipped = 0;

  for (const filename of uniqueCoverFilenames) {
    const srcPath = path.join(imagesDir, filename);
    const cardFilename = path.parse(filename).name + '.webp';
    const cardPath = path.join(cardsDir, cardFilename);

    if (fs.existsSync(cardPath)) {
      skipped++;
      continue;
    }

    await sharp(srcPath)
      .resize(1200, 675, { fit: 'cover', position: 'attention' })
      .webp({ quality: 80, effort: 4 })
      .toFile(cardPath);

    generated++;
    console.log(`  Generated card: ${cardFilename}`);
  }

  // Write enriched annotations.json back
  // Mutates only coverPhoto fields — all other fields (track, lat, lon, etc.) preserved
  fs.writeFileSync(annotationsPath, JSON.stringify(annotations, null, 2) + '\n');

  console.log(`\nCard photos: ${generated} generated, ${skipped} skipped`);
  console.log(`annotations.json updated with coverPhoto for ${annotations.sectors.length} sectors, ${annotations.kom.length} KOMs`);
}

module.exports = { assignCardPhotos };

if (require.main === module) {
  assignCardPhotos().catch(err => {
    console.error('assign-card-photos.js failed:', err);
    process.exit(1);
  });
}
