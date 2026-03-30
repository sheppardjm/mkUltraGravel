/**
 * scoring.js — mkUltraGravel Scoring Engine
 *
 * Pure functions for computing Gravel Champion and KOM/QOM Champion rankings.
 * No side effects, no file I/O. ES module syntax for use in:
 *   - Node.js (Netlify Functions) — Phase 29
 *   - Astro build-time rendering — Phase 30
 */

// ─── Segment ID Constants ─────────────────────────────────────────────────────

/** The 6 gravel sector segment IDs used for Gravel Champion ranking. */
export const SECTOR_SEGMENT_IDS = [
  "24479292", // Sandstrom
  "24479426", // Akkala Rd
  "24479467", // Haavisto
  "24479496", // Forest Service Rd
  "34573011", // C4
  "6809754",  // Down Jeep
];

/** The 3 KOM climb segment IDs used for KOM/QOM Champion ranking. */
export const KOM_SEGMENT_IDS = [
  "24479270", // Billie Helmer
  "41126651", // Leaving Chatham
  "16438243", // Silver Creek
];

/** Valid gender category keys. */
export const GENDERS = ["M", "F", "NB"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Group an array of athletes by gender.
 * Returns { M: [...], F: [...], NB: [...] }
 */
function groupByGender(athletes) {
  const groups = { M: [], F: [], NB: [] };
  for (const athlete of athletes) {
    const g = athlete.gender;
    if (groups[g]) {
      groups[g].push(athlete);
    }
  }
  return groups;
}

/**
 * Compute the elapsed_time for a single athlete on a given segment.
 * Returns undefined if the athlete has no recorded time for that segment.
 */
function getSegmentTime(athlete, segmentId) {
  return athlete.segments?.[segmentId]?.elapsed_time;
}

// ─── Gravel Champion ──────────────────────────────────────────────────────────

/**
 * Compute Gravel Champion rankings for a list of athletes.
 *
 * @param {Array} athletes — Array of athlete result objects
 * @returns {{ M: Array, F: Array, NB: Array }} — Ranked arrays per gender
 *
 * Ranking rules:
 *   1. completedSectors (descending) — athletes who finished all 6 sectors rank first
 *   2. totalTime (ascending) — fastest cumulative time ranks first
 *
 * Output entry shape:
 *   { athleteId, name, gender, activityUrl, totalTime, completedSectors, sectorTimes }
 */
export function computeGravelChampion(athletes) {
  const genderGroups = groupByGender(athletes);
  const result = {};

  for (const gender of GENDERS) {
    const group = genderGroups[gender];

    const entries = group.map((athlete) => {
      const sectorTimes = {};
      let totalTime = 0;
      let completedSectors = 0;

      for (const segId of SECTOR_SEGMENT_IDS) {
        const t = getSegmentTime(athlete, segId);
        if (t !== undefined) {
          sectorTimes[segId] = t;
          totalTime += t;
          completedSectors++;
        }
      }

      return {
        athleteId: athlete.athleteId,
        name: athlete.name,
        gender: athlete.gender,
        activityUrl: athlete.activityUrl,
        totalTime,
        completedSectors,
        sectorTimes,
      };
    });

    // Sort: most sectors first, then fastest total time
    entries.sort((a, b) => {
      if (b.completedSectors !== a.completedSectors) {
        return b.completedSectors - a.completedSectors;
      }
      return a.totalTime - b.totalTime;
    });

    result[gender] = entries;
  }

  return result;
}

// ─── KOM/QOM Champion ────────────────────────────────────────────────────────

/**
 * Compute KOM/QOM Champion rankings for a list of athletes.
 *
 * @param {Array} athletes — Array of athlete result objects
 * @returns {{ M: Array, F: Array, NB: Array }} — Ranked arrays per gender
 *
 * Scoring per climb (within gender group):
 *   - Rank athletes by elapsed_time ascending (fastest = 1st)
 *   - Top 10 get points: 1st=10, 2nd=9, ..., 10th=1
 *   - Athletes with no time for a climb get 0 points for that climb
 *
 * Ranking rules (after totalling points across all climbs):
 *   1. totalPoints (descending)
 *   2. segmentWins (descending) — most 1st-place finishes
 *   3. name (ascending) — alphabetical tiebreaker
 *
 * Output entry shape:
 *   { athleteId, name, gender, activityUrl, totalPoints, segmentWins, climbPoints }
 *   where climbPoints maps segmentId → { rank, points, elapsed_time }
 */
export function computeKomChampion(athletes) {
  const genderGroups = groupByGender(athletes);
  const result = {};

  for (const gender of GENDERS) {
    const group = genderGroups[gender];

    // Initialize per-athlete accumulator maps
    const pointsMap = new Map();   // athleteId → totalPoints
    const winsMap   = new Map();   // athleteId → segmentWins
    const climbMap  = new Map();   // athleteId → { [segId]: { rank, points, elapsed_time } }

    for (const athlete of group) {
      pointsMap.set(athlete.athleteId, 0);
      winsMap.set(athlete.athleteId, 0);
      climbMap.set(athlete.athleteId, {});
    }

    // Score each KOM segment independently within this gender group
    for (const segId of KOM_SEGMENT_IDS) {
      // Collect athletes who have a time for this segment
      const withTime = group
        .map((a) => ({ athleteId: a.athleteId, time: getSegmentTime(a, segId) }))
        .filter((e) => e.time !== undefined)
        .sort((a, b) => a.time - b.time); // ascending — fastest first

      // Assign ranks with tie handling: athletes with identical times share the same rank
      withTime.forEach((entry, index) => {
        // Determine rank: if same time as previous, use same rank (dense-style skipped rank)
        let rank;
        if (index === 0) {
          rank = 1;
        } else {
          const prevRank = withTime[index - 1]._rank;
          rank = entry.time === withTime[index - 1].time ? prevRank : index + 1;
        }
        entry._rank = rank;

        const points = rank <= 10 ? 11 - rank : 0;

        pointsMap.set(entry.athleteId, pointsMap.get(entry.athleteId) + points);

        if (rank === 1) {
          winsMap.set(entry.athleteId, winsMap.get(entry.athleteId) + 1);
        }

        climbMap.get(entry.athleteId)[segId] = {
          rank,
          points,
          elapsed_time: entry.time,
        };
      });
    }

    // Build output entries
    const entries = group.map((athlete) => ({
      athleteId:   athlete.athleteId,
      name:        athlete.name,
      gender:      athlete.gender,
      activityUrl: athlete.activityUrl,
      totalPoints: pointsMap.get(athlete.athleteId),
      segmentWins: winsMap.get(athlete.athleteId),
      climbPoints: climbMap.get(athlete.athleteId),
    }));

    // Sort: most points → most wins → alphabetical
    entries.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.segmentWins !== a.segmentWins) return b.segmentWins - a.segmentWins;
      return a.name.localeCompare(b.name);
    });

    result[gender] = entries;
  }

  return result;
}
