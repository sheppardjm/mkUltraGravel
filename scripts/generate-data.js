#!/usr/bin/env node
/**
 * Data pipeline coordinator.
 * Runs all three data generation scripts in sequence:
 * 1. parse-gpx.js -> public/data/route-data.json + public/mk-ultra.gpx
 * 2. resolve-annotations.js -> public/data/annotations.json
 * 3. match-photos.js -> public/data/photos.json
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

console.log('=== Data pipeline complete ===');
