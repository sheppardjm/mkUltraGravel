#!/usr/bin/env node
/**
 * Hero image WebP converter for LCP optimization.
 * Converts public/tone/CIA-MKULTRA-IG_Page_01.jpg to WebP at quality 80.
 *
 * The hero image is a grayscale CIA document — compresses extremely well.
 * Target: under 200KB (vs 1.3 MB source JPEG).
 *
 * Idempotent: skips conversion if WebP already exists.
 *
 * Usage: node scripts/convert-hero.js
 * Called by: scripts/generate-data.js (post-step after thumbnail generation)
 */
'use strict';

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convertHero() {
  const root = path.join(__dirname, '..');
  const heroSrc = path.join(root, 'public', 'tone', 'CIA-MKULTRA-IG_Page_01.jpg');
  const heroDest = path.join(root, 'public', 'tone', 'CIA-MKULTRA-IG_Page_01.webp');

  if (fs.existsSync(heroDest)) {
    const stat = fs.statSync(heroDest);
    console.log(`Hero WebP already exists (${Math.round(stat.size / 1024)}KB), skipping`);
    return;
  }

  // Resize to 1000px wide (source is 2496px — overkill for a 12%-opacity tone image)
  // quality 60 produces ~194KB, well under the 200KB LCP target
  await sharp(heroSrc)
    .resize(1000, null, { withoutEnlargement: true })
    .webp({ quality: 60 })
    .toFile(heroDest);

  const stat = fs.statSync(heroDest);
  console.log(`Hero image converted to WebP: ${Math.round(stat.size / 1024)}KB (was 1374KB)`);
}

if (require.main === module) {
  convertHero().catch(err => {
    console.error('convert-hero.js failed:', err);
    process.exit(1);
  });
}

module.exports = { convertHero };
