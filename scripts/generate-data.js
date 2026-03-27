#!/usr/bin/env node
/**
 * Data pipeline coordinator.
 * Runs all data generation scripts in sequence:
 * 1. parse-gpx.js -> public/data/route-data.json + public/mk-ultra.gpx
 * 2. resolve-annotations.js -> public/data/annotations.json
 * 3. match-photos.js -> public/data/photos.json
 * 4. generate-thumbnails.js -> public/images/thumbs/ (400px WebP)
 * 5. assign-card-photos.js -> annotations.json (coverPhoto) + public/images/cards/
 * 6. convert-hero.js -> public/images/hero.webp
 * 7. convert-tone-images.js -> public/tone/*.webp
 *
 * Usage: node scripts/generate-data.js
 * Wired as: npm run prebuild (runs before astro build)
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Copy route photos to public/images/ for browser serving
const srcImagesDir = path.join(__dirname, '..', 'images');
const destImagesDir = path.join(__dirname, '..', 'public', 'images');
if (!fs.existsSync(destImagesDir)) {
  fs.mkdirSync(destImagesDir, { recursive: true });
}
const jpgs = fs.readdirSync(srcImagesDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
jpgs.forEach(filename => {
  fs.copyFileSync(path.join(srcImagesDir, filename), path.join(destImagesDir, filename));
});
console.log(`Copied ${jpgs.length} images to public/images/`);

const scripts = [
  'parse-gpx.js',
  'resolve-annotations.js',
  'match-photos.js',
];

console.log('=== MK Ultra Data Pipeline ===\n');

for (const script of scripts) {
  const scriptPath = path.join(__dirname, script);
  console.log(`--- Running ${script} ---`);
  try {
    execSync(`node "${scriptPath}"`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log(`--- ${script} complete ---\n`);
  } catch (err) {
    console.error(`\nERROR: ${script} failed with exit code ${err.status}`);
    process.exit(1);
  }
}

// Generate WebP thumbnails and enrich photos.json with width/height.
// Runs after match-photos.js (produces photos.json) and image copy step (produces public/images/).
console.log('--- Running generate-thumbnails.js ---');
try {
  execSync(`node "${path.join(__dirname, 'generate-thumbnails.js')}"`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('--- generate-thumbnails.js complete ---\n');
} catch (err) {
  console.error('\nERROR: generate-thumbnails.js failed with exit code ' + err.status);
  process.exit(1);
}

// Assign cover photos to sector/KOM cards and generate card crops.
// Runs after match-photos.js (photos.json) and image copy (public/images/).
// Writes coverPhoto field into annotations.json and generates 600x338 WebP card crops.
console.log('--- Running assign-card-photos.js ---');
try {
  execSync(`node "${path.join(__dirname, 'assign-card-photos.js')}"`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('--- assign-card-photos.js complete ---\n');
} catch (err) {
  console.error('\nERROR: assign-card-photos.js failed with exit code ' + err.status);
  process.exit(1);
}

// Convert hero image to WebP for LCP optimization.
// Runs after thumbnail generation. Idempotent — skips if WebP already exists.
console.log('--- Running convert-hero.js ---');
try {
  execSync(`node "${path.join(__dirname, 'convert-hero.js')}"`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('--- convert-hero.js complete ---\n');
} catch (err) {
  console.error('\nERROR: convert-hero.js failed with exit code ' + err.status);
  process.exit(1);
}

// Convert below-fold tone images (lsd-mind-control.jpg, Mkultra-lsd-doc.jpg) to WebP.
// These are 12%-opacity background decorations — aggressive compression is invisible.
// Reduces 611KB JPEG to ~60KB WebP, significantly improving LCP on the photos section.
console.log('--- Running convert-tone-images.js ---');
try {
  execSync(`node "${path.join(__dirname, 'convert-tone-images.js')}"`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('--- convert-tone-images.js complete ---\n');
} catch (err) {
  console.error('\nERROR: convert-tone-images.js failed with exit code ' + err.status);
  process.exit(1);
}

console.log('=== Data pipeline complete ===');
