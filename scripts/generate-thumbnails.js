#!/usr/bin/env node
/**
 * Thumbnail generator for photo gallery.
 * Reads public/data/photos.json, generates 600px-wide WebP thumbnails
 * from each full-size image, and writes width/height back to photos.json.
 *
 * Thumbnails written to: public/images/thumbs/{basename}.webp
 * Idempotent: skips thumbnails that already exist.
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

  // Read photos.json
  const photos = JSON.parse(fs.readFileSync(photosJsonPath, 'utf8'));

  let generated = 0;
  let skipped = 0;

  for (const photo of photos) {
    const srcPath = path.join(imagesDir, photo.filename);
    const thumbFilename = path.parse(photo.filename).name + '.webp';
    const thumbPath = path.join(thumbsDir, thumbFilename);

    // Always read original dimensions (needed for photos.json even if thumb exists)
    const metadata = await sharp(srcPath).metadata();
    photo.width = metadata.width;
    photo.height = metadata.height;

    if (fs.existsSync(thumbPath)) {
      skipped++;
      continue;
    }

    // Generate WebP thumbnail at 200px wide
    // Gallery displays at ~186px on mobile and ~250px on desktop (2-col/3-col grid).
    // 200px at q75 produces ~7-15KB per thumbnail vs ~22-28KB at 300px.
    // Thumbnails are gallery previews — users click for full-size. Quality budget is generous.
    await sharp(srcPath)
      .resize(200, null, { withoutEnlargement: true })
      .webp({ quality: 75, effort: 4 })
      .toFile(thumbPath);

    generated++;
  }

  // Write enriched photos.json back
  fs.writeFileSync(photosJsonPath, JSON.stringify(photos, null, 2) + '\n');

  console.log(`Thumbnails: ${generated} generated, ${skipped} skipped`);
  console.log(`photos.json updated with width/height for ${photos.length} entries`);
}

if (require.main === module) {
  generateThumbnails().catch(err => {
    console.error('generate-thumbnails.js failed:', err);
    process.exit(1);
  });
}

module.exports = { generateThumbnails };
