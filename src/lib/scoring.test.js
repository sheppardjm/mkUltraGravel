import { describe, it, expect } from 'vitest';
import {
  computeGravelChampion,
  computeKomChampion,
  SECTOR_SEGMENT_IDS,
  KOM_SEGMENT_IDS,
} from './scoring.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SECTOR_IDS = ["41159670", "24479292", "24479426", "24479467", "24479496", "34573011", "6809754"];
const KOM_IDS    = ["24479270", "41126651", "16438243"];

/** Build a complete athlete with all 7 sector times summing to `totalTime`.
 *  Times are spread evenly across sectors. */
function makeGravelAthlete(id, name, gender, totalTime, url = `https://strava.com/activities/${id}`) {
  const perSector = Math.floor(totalTime / 7);
  const remainder = totalTime - perSector * 6;
  const times = [perSector, perSector, perSector, perSector, perSector, perSector, remainder];
  const segments = {};
  SECTOR_IDS.forEach((sid, i) => { segments[sid] = { elapsed_time: times[i] }; });
  return { athleteId: id, name, gender, activityUrl: url, segments };
}

/** Build an athlete with explicit KOM segment times. */
function makeKomAthlete(id, name, gender, komTimes = {}) {
  const segments = {};
  Object.entries(komTimes).forEach(([sid, t]) => { segments[sid] = { elapsed_time: t }; });
  return { athleteId: id, name, gender, activityUrl: `https://strava.com/activities/${id}`, segments };
}

// ─── Gravel Champion Tests ────────────────────────────────────────────────────

describe('computeGravelChampion', () => {

  it('test 1: basic ranking — 3 men ranked by lowest total sector time', () => {
    const athletes = [
      makeGravelAthlete('a1', 'Charlie', 'M', 9000),
      makeGravelAthlete('a2', 'Alice',   'M', 7200),
      makeGravelAthlete('a3', 'Bob',     'M', 8100),
    ];
    const result = computeGravelChampion(athletes);

    expect(result.M).toHaveLength(3);
    expect(result.M[0].athleteId).toBe('a2'); // 7200 — fastest
    expect(result.M[1].athleteId).toBe('a3'); // 8100
    expect(result.M[2].athleteId).toBe('a1'); // 9000 — slowest

    // Verify output shape
    const first = result.M[0];
    expect(first).toHaveProperty('athleteId');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('gender');
    expect(first).toHaveProperty('activityUrl');
    expect(first).toHaveProperty('totalTime');
    expect(first).toHaveProperty('completedSectors');
    expect(first).toHaveProperty('sectorTimes');
    expect(first.completedSectors).toBe(7);
    expect(first.totalTime).toBe(7200);
  });

  it('test 2: gender separation — M/F/NB athletes each in correct bucket', () => {
    const athletes = [
      makeGravelAthlete('m1', 'Mike',   'M',  7000),
      makeGravelAthlete('m2', 'Matt',   'M',  8000),
      makeGravelAthlete('f1', 'Sarah',  'F',  7500),
      makeGravelAthlete('f2', 'Emily',  'F',  9000),
      makeGravelAthlete('nb1', 'Alex', 'NB', 8500),
    ];
    const result = computeGravelChampion(athletes);

    expect(result.M).toHaveLength(2);
    expect(result.F).toHaveLength(2);
    expect(result.NB).toHaveLength(1);

    // Each bucket only has athletes of matching gender
    result.M.forEach(a => expect(a.gender).toBe('M'));
    result.F.forEach(a => expect(a.gender).toBe('F'));
    result.NB.forEach(a => expect(a.gender).toBe('NB'));

    // Within M, fastest first
    expect(result.M[0].athleteId).toBe('m1');
    expect(result.M[1].athleteId).toBe('m2');
  });

  it('test 3: DNF — athlete missing one sector ranks after all complete athletes', () => {
    // complete1 = 7000, complete2 = 8000, dnf = missing "6809754", partial sum ~7500
    const complete1 = makeGravelAthlete('c1', 'Complete One',   'M', 7000);
    const complete2 = makeGravelAthlete('c2', 'Complete Two',   'M', 8000);

    // DNF athlete has only 6 of 7 sectors — partial sum is faster than complete2
    const dnf = makeGravelAthlete('d1', 'DNF Dan', 'M', 7500);
    delete dnf.segments["6809754"]; // remove one sector

    const athletes = [complete1, complete2, dnf];
    const result = computeGravelChampion(athletes);

    expect(result.M).toHaveLength(3);
    // DNF athlete must be last (6 sectors < 7 sectors)
    expect(result.M[2].athleteId).toBe('d1');
    expect(result.M[2].completedSectors).toBe(6);
    // Complete athletes ranked by time
    expect(result.M[0].athleteId).toBe('c1');
    expect(result.M[1].athleteId).toBe('c2');
  });

  it('test 8 (shared): empty input returns { M: [], F: [], NB: [] }', () => {
    const result = computeGravelChampion([]);
    expect(result).toEqual({ M: [], F: [], NB: [] });
  });

});

// ─── KOM/QOM Champion Tests ───────────────────────────────────────────────────

describe('computeKomChampion', () => {

  it('test 4: basic scoring — top 10 of 12 men get points, ranked by total', () => {
    // 12 athletes, all 3 KOM segments
    // Give athlete "winner" the best times on all 3 segments → 30 pts
    const athletes = [];
    for (let i = 1; i <= 12; i++) {
      athletes.push(makeKomAthlete(`m${i}`, `Man ${i}`, 'M', {
        "24479270": 600 + i * 10,   // m1 fastest (610)
        "41126651": 700 + i * 10,   // m1 fastest (710)
        "16438243": 800 + i * 10,   // m1 fastest (810)
      }));
    }

    const result = computeKomChampion(athletes);

    expect(result.M).toHaveLength(12);

    // m1 should be ranked first with 30 points (10+10+10)
    expect(result.M[0].athleteId).toBe('m1');
    expect(result.M[0].totalPoints).toBe(30);
    expect(result.M[0].segmentWins).toBe(3);

    // m11 and m12 get 0 points (outside top 10 for all segments when 12 athletes)
    const lastTwo = result.M.slice(-2).map(a => a.athleteId);
    expect(lastTwo).toContain('m11');
    expect(lastTwo).toContain('m12');
    expect(result.M[10].totalPoints).toBe(0);
    expect(result.M[11].totalPoints).toBe(0);

    // Verify output shape
    const first = result.M[0];
    expect(first).toHaveProperty('athleteId');
    expect(first).toHaveProperty('totalPoints');
    expect(first).toHaveProperty('segmentWins');
    expect(first).toHaveProperty('climbPoints');
  });

  it('test 5: gender separation — M and F score independently', () => {
    // 3 men, 2 women — each gets scored within own gender
    const athletes = [
      makeKomAthlete('m1', 'Mike',   'M', { "24479270": 600, "41126651": 700, "16438243": 800 }),
      makeKomAthlete('m2', 'Matt',   'M', { "24479270": 620, "41126651": 720, "16438243": 820 }),
      makeKomAthlete('m3', 'Mark',   'M', { "24479270": 640, "41126651": 740, "16438243": 840 }),
      makeKomAthlete('f1', 'Sarah',  'F', { "24479270": 550, "41126651": 650, "16438243": 750 }),
      makeKomAthlete('f2', 'Emily',  'F', { "24479270": 570, "41126651": 670, "16438243": 770 }),
    ];

    const result = computeKomChampion(athletes);

    expect(result.M).toHaveLength(3);
    expect(result.F).toHaveLength(2);
    expect(result.NB).toHaveLength(0);

    result.M.forEach(a => expect(a.gender).toBe('M'));
    result.F.forEach(a => expect(a.gender).toBe('F'));

    // In women's group: f1 wins all 3 → 30 pts, f2 gets 9+9+9 = 27
    expect(result.F[0].athleteId).toBe('f1');
    expect(result.F[0].totalPoints).toBe(30);
    expect(result.F[1].totalPoints).toBe(27);

    // In men's group: m1 wins all 3 → 30 pts
    expect(result.M[0].athleteId).toBe('m1');
    expect(result.M[0].totalPoints).toBe(30);
  });

  it('test 6: tiebreaker — same total points → most segment wins → alphabetical by name', () => {
    // alpha and beta have same total points (20 each)
    // alpha wins 2 segments, beta wins 1 segment → alpha ranks first
    // gamma and delta also tie on points and wins → sorted alphabetically
    const athletes = [
      // alpha: wins seg1 and seg2 (10+10=20), loses seg3 → total = 20, wins=2
      makeKomAthlete('alpha', 'Alpha', 'M', {
        "24479270": 100, // 1st → 10pts
        "41126651": 100, // 1st → 10pts
        "16438243": 200, // 2nd → 9pts
      }),
      // beta: wins seg3 (10), 2nd on seg1 and seg2 (9+9=18) → total = 10+9 = 19... need same total
      // Let's construct properly: alpha gets 10+10+0=20, beta gets 9+9+10=28... no.
      // Better: only 2 segments scored for simplicity to force a tie on total
      // alpha: 10+10 = 20, segWins=2; beta: 10+10 = 20, segWins=1
      // Use only 2 KOM segments for this test by giving no time on 3rd
      makeKomAthlete('beta', 'Beta', 'M', {
        "24479270": 200, // 2nd → 9pts
        "41126651": 200, // 2nd → 9pts
        "16438243": 100, // 1st → 10pts — wins seg3
      }),
    ];
    // alpha: seg1=10, seg2=10, seg3=9 → total=29, wins=2
    // beta:  seg1=9,  seg2=9,  seg3=10 → total=28, wins=1
    // Not a tie. Need to design fixtures carefully.

    // Approach: 4 athletes, 1 KOM segment only, two pairs tied on points
    const tieAthletes = [
      // Pair 1: same total 10 pts (both win a different segment in a 1-segment world)
      // Easier: let gamma and delta have same total with same wins → sort alphabetically
      makeKomAthlete('g1', 'Gamma', 'M', { "24479270": 500, "41126651": 600, "16438243": 700 }),
      makeKomAthlete('g2', 'Delta', 'M', { "24479270": 500, "41126651": 600, "16438243": 700 }),
    ];
    // gamma and delta have identical times → both rank 1st on each segment
    // tied at same points — sorted alphabetically: Delta before Gamma
    const tieResult = computeKomChampion(tieAthletes);
    expect(tieResult.M[0].name).toBe('Delta');
    expect(tieResult.M[1].name).toBe('Gamma');

    // Wins tiebreaker: 2-athlete scenario where one wins more segments
    const winsAthletes = [
      makeKomAthlete('w1', 'Winner', 'M', {
        "24479270": 100, // wins → 10pts
        "41126651": 200, // 2nd  → 9pts
        "16438243": 100, // wins → 10pts
      }),
      makeKomAthlete('w2', 'Chaser', 'M', {
        "24479270": 200, // 2nd  → 9pts
        "41126651": 100, // wins → 10pts
        "16438243": 200, // 2nd  → 9pts
      }),
    ];
    // winner: 10+9+10 = 29, wins=2; chaser: 9+10+9 = 28, wins=1
    // winner has more total points → ranked first regardless of tiebreaker
    const winsResult = computeKomChampion(winsAthletes);
    expect(winsResult.M[0].athleteId).toBe('w1');
    expect(winsResult.M[1].athleteId).toBe('w2');

    // True tiebreaker test: same points, different wins
    const trueTieAthletes = [
      // a: wins seg1 and seg2 (10+10), gets 0 on seg3 → 20pts, 2 wins
      makeKomAthlete('t1', 'TopWinner', 'M', {
        "24479270": 100, // 1st → 10
        "41126651": 100, // 1st → 10
        // no seg3 time → 0
      }),
      // b: wins seg3 (10), gets 9+9 on other two via being 2nd in a 2-person group...
      // Actually with only 2 athletes t1 and t2: t1 wins seg1 and seg2, t2 wins seg3
      // t1: 10+10+0=20, t2: 9+9+10=28 — not tied
      // Let's create a true tie: both athletes score exactly 20 pts, but one has 2 segment wins
      // 3-person group:
      // seg1: t1=100(1st,10), t2=200(2nd,9), t3=300(3rd,8)
      // seg2: t1=100(1st,10), t2=200(2nd,9), t3=300(3rd,8)
      // seg3: t1=300(3rd,8), t2=100(1st,10), t3=200(2nd,9)
      // t1: 10+10+8=28, t2: 9+9+10=28, tied at 28. t1 has 2 wins, t2 has 1 win → t1 ranked first
      makeKomAthlete('dummy', 'Dummy', 'M', {}), // placeholder, redefined below
    ];

    const trueTrioAthletes = [
      makeKomAthlete('t1', 'TopWins',   'M', { "24479270": 100, "41126651": 100, "16438243": 300 }),
      makeKomAthlete('t2', 'OneWin',    'M', { "24479270": 200, "41126651": 200, "16438243": 100 }),
      makeKomAthlete('t3', 'NoWins',    'M', { "24479270": 300, "41126651": 300, "16438243": 200 }),
    ];
    // t1: 10+10+8=28, wins=2; t2: 9+9+10=28, wins=1; t3: 8+8+9=25, wins=0
    const trioResult = computeKomChampion(trueTrioAthletes);
    expect(trioResult.M[0].athleteId).toBe('t1'); // 28 pts, 2 wins
    expect(trioResult.M[1].athleteId).toBe('t2'); // 28 pts, 1 win
    expect(trioResult.M[2].athleteId).toBe('t3'); // 25 pts
  });

  it('test 7: fewer than 10 per climb — all 5 athletes get points (10,9,8,7,6)', () => {
    const athletes = [
      makeKomAthlete('f1', 'First',  'F', { "24479270": 500, "41126651": 600, "16438243": 700 }),
      makeKomAthlete('f2', 'Second', 'F', { "24479270": 510, "41126651": 610, "16438243": 710 }),
      makeKomAthlete('f3', 'Third',  'F', { "24479270": 520, "41126651": 620, "16438243": 720 }),
      makeKomAthlete('f4', 'Fourth', 'F', { "24479270": 530, "41126651": 630, "16438243": 730 }),
      makeKomAthlete('f5', 'Fifth',  'F', { "24479270": 540, "41126651": 640, "16438243": 740 }),
    ];

    const result = computeKomChampion(athletes);

    expect(result.F).toHaveLength(5);
    // All athletes should have non-zero points
    result.F.forEach(a => expect(a.totalPoints).toBeGreaterThan(0));

    // f1 wins all → 10+10+10 = 30
    expect(result.F[0].athleteId).toBe('f1');
    expect(result.F[0].totalPoints).toBe(30);

    // f5 comes last → 6+6+6 = 18
    expect(result.F[4].athleteId).toBe('f5');
    expect(result.F[4].totalPoints).toBe(18);

    // f2 → 9+9+9 = 27
    expect(result.F[1].totalPoints).toBe(27);
  });

  it('test 8 (shared): empty input returns { M: [], F: [], NB: [] }', () => {
    const result = computeKomChampion([]);
    expect(result).toEqual({ M: [], F: [], NB: [] });
  });

});

// ─── Constants sanity check ───────────────────────────────────────────────────

describe('exported constants', () => {
  it('SECTOR_SEGMENT_IDS has 7 entries', () => {
    expect(SECTOR_SEGMENT_IDS).toHaveLength(7);
  });

  it('KOM_SEGMENT_IDS has 3 entries', () => {
    expect(KOM_SEGMENT_IDS).toHaveLength(3);
  });

  it('SECTOR_SEGMENT_IDS contains expected IDs', () => {
    expect(SECTOR_SEGMENT_IDS).toContain("41159670");
    expect(SECTOR_SEGMENT_IDS).toContain("24479292");
    expect(SECTOR_SEGMENT_IDS).toContain("24479426");
    expect(SECTOR_SEGMENT_IDS).toContain("24479467");
    expect(SECTOR_SEGMENT_IDS).toContain("24479496");
    expect(SECTOR_SEGMENT_IDS).toContain("34573011");
    expect(SECTOR_SEGMENT_IDS).toContain("6809754");
  });

  it('KOM_SEGMENT_IDS contains expected IDs', () => {
    expect(KOM_SEGMENT_IDS).toContain("24479270");
    expect(KOM_SEGMENT_IDS).toContain("41126651");
    expect(KOM_SEGMENT_IDS).toContain("16438243");
  });
});
