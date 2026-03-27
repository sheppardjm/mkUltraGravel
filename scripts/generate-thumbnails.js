#!/usr/bin/env node
/**
 * Thumbnail generator for photo gallery.
 * Reads public/data/photos.json, generates 400px-wide WebP thumbnails
 * from each full-size image, and writes width/height back to photos.json.
 *
 * Thumbnails written to: public/images/thumbs/{basename}.webp
 * Stale thumbnails are cleared before regeneration to avoid dimension mismatch.
 *
 * Usage: node scripts/generate-thumbnails.js
 * Called by: scripts/generate-data.js (post-step after match-photos.js)
 */
'use strict';

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateThumbnails() {
  const root = path.join(__dirname, '..');
  const photosJsonPath = path.join(root, 'public', 'data', 'photos.json');
  const imagesDir = path.join(root, 'public', 'images');
  const thumbsDir = path.join(root, 'public', 'images', 'thumbs');

  // Ensure thumbs directory exists
  fs.mkdirSync(thumbsDir, { recursive: true });

  // Clear stale thumbnails to force regeneration at new dimensions
  const existingThumbs = fs.readdirSync(thumbsDir).filter(f => f.endsWith('.webp'));
  if (existingThumbs.length > 0) {
    existingThumbs.forEach(f => fs.unlinkSync(path.join(thumbsDir, f)));
    console.log(`Cleared ${existingThumbs.length} stale thumbnails`);
  }

  // Read photos.json
  const photos = JSON.parse(fs.readFileSync(photosJsonPath, 'utf8'));

  let generated = 0;

  for (const photo of photos) {
    const srcPath = path.join(imagesDir, photo.filename);
    const thumbFilename = path.parse(photo.filename).name + '.webp';
    const thumbPath = path.join(thumbsDir, thumbFilename);

    // Always read original dimensions (needed for photos.json even if thumb exists)
    const metadata = await sharp(srcPath).metadata();
    photo.width = metadata.width;
    photo.height = metadata.height;

    // Generate WebP thumbnail at 400px wide
    // Gallery displays at ~186px on mobile and ~250px on desktop (2-col/3-col grid).
    // 400px provides crisp rendering on high-DPI screens (2x pixel ratio common on mobile).
    // 400px at q80 produces ~15-30KB per thumbnail — acceptable for a retina-quality gallery preview.
    await sharp(srcPath)
      .resize(400, null, { withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toFile(thumbPath);

    generated++;
  }

  // Write enriched photos.json back
  fs.writeFileSync(photosJsonPath, JSON.stringify(photos, null, 2) + '\n');

  console.log(`Thumbnails: ${generated} generated`);
  console.log(`photos.json updated with width/height for ${photos.length} entries`);
}

if (require.main === module) {
  generateThumbnails().catch(err => {
    console.error('generate-thumbnails.js failed:', err);
    process.exit(1);
  });
}

module.exports = { generateThumbnails };
