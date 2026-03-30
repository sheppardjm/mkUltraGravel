#!/usr/bin/env node

// validate-results.mjs — Validate athlete result files and run scoring engine
// Usage: node scripts/validate-results.mjs

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { computeGravelChampion, computeKomChampion, SECTOR_SEGMENT_IDS, KOM_SEGMENT_IDS } from '../src/lib/scoring.js';

const RESULTS_DIR = 'public/data/results/athletes';
const VALID_GENDERS = ['M', 'F', 'NB'];

let errors = 0;

// Load all athlete files
const files = readdirSync(RESULTS_DIR).filter(f => f.endsWith('.json'));
console.log(`Found ${files.length} athlete files\n`);

const athletes = files.map(file => {
  const filepath = join(RESULTS_DIR, file);
  const data = JSON.parse(readFileSync(filepath, 'utf8'));

  // Validate required fields
  for (const field of ['athleteId', 'name', 'gender', 'activityUrl', 'submittedAt', 'segments']) {
    if (!(field in data)) {
      console.error(`  ERROR: ${file} missing required field: ${field}`);
      errors++;
    }
  }

  // Validate gender enum
  if (!VALID_GENDERS.includes(data.gender)) {
    console.error(`  ERROR: ${file} invalid gender: ${data.gender}`);
    errors++;
  }

  // Validate segment keys are numeric strings with positive integer elapsed_time
  for (const [segId, effort] of Object.entries(data.segments || {})) {
    if (!/^\d+$/.test(segId)) {
      console.error(`  ERROR: ${file} non-numeric segment key: ${segId}`);
      errors++;
    }
    if (!Number.isInteger(effort.elapsed_time) || effort.elapsed_time < 1) {
      console.error(`  ERROR: ${file} invalid elapsed_time for segment ${segId}: ${effort.elapsed_time}`);
      errors++;
    }
  }

  return data;
});

// Run scoring engine
console.log('--- Gravel Champion Leaderboards ---\n');
const gravel = computeGravelChampion(athletes);
for (const gender of VALID_GENDERS) {
  const board = gravel[gender];
  console.log(`${gender} (${board.length} athletes):`);
  board.forEach((entry, i) => {
    const mins = Math.floor(entry.totalTime / 60);
    const secs = entry.totalTime % 60;
    const status = entry.completedSectors < SECTOR_SEGMENT_IDS.length ? ` [${entry.completedSectors}/${SECTOR_SEGMENT_IDS.length} sectors]` : '';
    console.log(`  ${i + 1}. ${entry.name} — ${mins}:${String(secs).padStart(2, '0')}${status}`);
  });
  console.log();
}

console.log('--- KOM/QOM Champion Leaderboards ---\n');
const kom = computeKomChampion(athletes);
for (const gender of VALID_GENDERS) {
  const board = kom[gender];
  console.log(`${gender} (${board.length} athletes):`);
  board.forEach((entry, i) => {
    console.log(`  ${i + 1}. ${entry.name} — ${entry.totalPoints} pts (${entry.segmentWins} wins)`);
  });
  console.log();
}

// Summary
if (errors > 0) {
  console.error(`\nVALIDATION FAILED: ${errors} errors found`);
  process.exit(1);
} else {
  console.log(`\nVALIDATION PASSED: ${files.length} files valid, scoring engine produced results for all categories`);

  // Verify all gender categories have results
  for (const gender of VALID_GENDERS) {
    if (gravel[gender].length === 0) {
      console.error(`  WARNING: No Gravel Champion results for gender ${gender}`);
      errors++;
    }
    if (kom[gender].length === 0) {
      console.error(`  WARNING: No KOM/QOM Champion results for gender ${gender}`);
      errors++;
    }
  }

  if (errors > 0) {
    process.exit(1);
  }
}
