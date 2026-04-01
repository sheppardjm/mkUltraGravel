#!/usr/bin/env node
/**
 * Tone image WebP converter and optimizer for performance optimization.
 * Converts/resizes below-fold tone images to WebP at 500px wide, quality 50.
 *
 * Target images:
 *   public/tone/lsd-mind-control.jpg (596KB)       -> lsd-mind-control.webp (~24KB)
 *   public/tone/Mkultra-lsd-doc.jpg (102KB)        -> Mkultra-lsd-doc.webp (~56KB)
 *   public/tone/escharian_stairs_fb.webp (44KB)    -> escharian_stairs_fb.webp (re-encoded ~10KB)
 *
 * These are 12%-opacity background decorations — aggressive compression is invisible.
 * For escharian (already WebP), re-encodes at smaller size for bandwidth savings.
 *
 * Files are regenerated every time (no skip logic) because source files may change
 * and we want optimal sizes on every build.
 *
 * Usage: node scripts/convert-tone-images.js
 * Called by: scripts/generate-data.js
 */
'use strict';

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Each entry: { src, dest, width, quality }
// Re-encoding escharian (already WebP) at 500px/q50 reduces it from 44KB to ~10KB
const TONE_IMAGES = [
  { src: 'lsd-mind-control.jpg',     dest: 'lsd-mind-control.webp',     width: 350, quality: 45 },
  { src: 'Mkultra-lsd-doc.jpg',      dest: 'Mkultra-lsd-doc.webp',      width: 1000, quality: 60 },
  { src: 'escharian_stairs_fb.webp', dest: 'escharian_stairs_fb.webp',  width: 500, quality: 50 },
  { src: 'square-limit-mc-escher-1964.jpg', dest: 'square-limit-mc-escher.webp', width: 600, quality: 35 },
];

async function convertToneImages() {
  const root = path.join(__dirname, '..');
  const toneDir = path.join(root, 'public', 'tone');

  for (const { src, dest, width, quality } of TONE_IMAGES) {
    const srcPath = path.join(toneDir, src);
    const destPath = path.join(toneDir, dest);

    // For same-file re-encode (escharian), always regenerate to get optimal size
    const isSameFile = src === dest;

    if (!fs.existsSync(srcPath)) {
      console.log(`Tone image source not found, skipping: ${src}`);
      continue;
    }

    if (!isSameFile && fs.existsSync(destPath)) {
      const stat = fs.statSync(destPath);
      console.log(`${dest} already exists (${Math.round(stat.size / 1024)}KB), skipping`);
      continue;
    }

    const srcStat = fs.statSync(srcPath);

    // Write to temp path first for same-file case, then rename
    const tmpPath = destPath + '.tmp';
    await sharp(srcPath)
      .resize(width, null, { withoutEnlargement: true })
      .webp({ quality })
      .toFile(tmpPath);

    if (fs.existsSync(tmpPath)) {
      fs.renameSync(tmpPath, destPath);
    }

    const destStat = fs.statSync(destPath);
    const srcKB = Math.round(srcStat.size / 1024);
    const destKB = Math.round(destStat.size / 1024);
    const reduction = Math.round((1 - destStat.size / srcStat.size) * 100);
    console.log(`${src} -> ${dest}: ${srcKB}KB -> ${destKB}KB (${reduction > 0 ? reduction + '% reduction' : 'optimized'})`);
  }
}

if (require.main === module) {
  convertToneImages().catch(err => {
    console.error('convert-tone-images.js failed:', err);
    process.exit(1);
  });
}

module.exports = { convertToneImages };
