# Architecture Patterns -- v5.0 Strava Integration + Results

**Domain:** Strava API integration with static gravel cycling event site (Astro 6 SSG + Netlify Functions)
**Project:** MK Ultra Gravel
**Researched:** 2026-03-30
**Focus:** How Strava OAuth, segment data, activity submission, scoring, and results pages integrate with the existing Astro + Netlify static architecture
**Overall confidence:** HIGH for data flow and Netlify Functions patterns (verified against official docs); MEDIUM for Strava API field availability (leaderboard endpoint deprecated, xoms field availability needs runtime verification)

---

## Existing Architecture Snapshot (v4.0 Baseline)

### Component Inventory

| Component | File | Init Pattern | Data Source |
|-----------|------|--------------|-------------|
| RouteMap | `src/components/RouteMap.astro` | Lazy scroll/IntersectionObserver -> `initMap()` async | `/data/route-data.json`, `/data/annotations.json`, `/data/photos.json` fetched at runtime |
| ElevationProfile | `src/components/ElevationProfile.astro` | Lazy scroll/IntersectionObserver -> `initElevation()` async | `/data/route-data.json`, `/data/annotations.json` fetched at runtime |
| GravelSectors | `src/components/GravelSectors.astro` | SSR/build-time | `annotations.json` via `readFileSync` |
| KomSegments | `src/components/KomSegments.astro` | SSR/build-time | `annotations.json` via `readFileSync` |
| PhotoGallery | `src/components/PhotoGallery.astro` | SSR template + runtime PhotoSwipe init | `photos.json` via `readFileSync` |
| GrinduroExplainer | `src/components/GrinduroExplainer.astro` | Static HTML | None |
| RestockPoints | `src/components/RestockPoints.astro` | SSR/build-time | `annotations.json` via `readFileSync` |
| CountdownTimer | `src/components/CountdownTimer.astro` | Runtime JS | None (hardcoded date) |
| EventInfoBlock | `src/components/EventInfoBlock.astro` | Static HTML | None |
| MkUltraExplainer | `src/components/MkUltraExplainer.astro` | Static HTML | None |

### Build Pipeline (Current)

```
scripts/generate-data.js (coordinator):
  1. Copy images/ -> public/images/
  2. parse-gpx.js         -> public/data/route-data.json + public/mk-ultra.gpx
  3. resolve-annotations.js -> public/data/annotations.json
  4. match-photos.js      -> public/data/photos.json
  5. generate-thumbnails.js -> public/images/thumbs/*.webp + enriches photos.json
  6. assign-card-photos.js -> annotations.json (coverPhoto) + public/images/cards/*.webp
  7. convert-hero.js      -> public/images/hero.webp
  8. convert-tone-images.js -> public/tone/*.webp
```

### Key Existing Patterns

- **Data flow:** Build scripts write JSON to `public/data/`, Astro components read via `readFileSync` at build time (SSR) or `fetch()` at runtime
- **No backend:** Purely static site, no serverless functions, no database
- **No authentication:** No user sessions, no OAuth, no tokens
- **CustomEvent bus:** Window-level event dispatch for map-elevation sync (6 events)
- **Single page:** `src/pages/index.astro` is the only page

---

## Recommended Architecture for v5.0

### Architecture Overview

v5.0 introduces two fundamentally new capabilities to what has been a purely static site:

1. **Build-time API integration:** Prebuild scripts fetch data from Strava API and write it to JSON files that Astro consumes at build time (extends existing pattern)
2. **Runtime serverless functions:** Netlify Functions handle OAuth flow and activity processing (new pattern)

The key architectural principle: **keep the site static, use functions only for operations that require secrets or user interaction, and bridge the two via committed JSON + site rebuild.**

```
ARCHITECTURE LAYERS:

[Browser]  -->  [Static Site (Astro SSG on Netlify CDN)]
                    |
                    +-- reads public/data/results.json at build time
                    +-- reads public/data/segments.json at build time
                    +-- links to /.netlify/functions/* for submission
                    |
[Netlify Functions]  -->  [Strava API]
                    |
                    +-- strava-auth (OAuth flow)
                    +-- submit-activity (process + score + commit)
                    |
[Build Pipeline]  -->  [Strava API]
                    |
                    +-- fetch-segments.js (prebuild step)
                    |
[GitHub API]  <--  [submit-activity function commits results.json]
                    |
[Netlify Build Hook]  <--  [submit-activity triggers rebuild]
```

---

## Integration Points with Existing Pipeline

### New Prebuild Step: fetch-segments.js

**Where it fits in the pipeline:**

```
scripts/generate-data.js (coordinator) -- UPDATED:
  1. Copy images/ -> public/images/
  2. parse-gpx.js         -> public/data/route-data.json + public/mk-ultra.gpx
  3. resolve-annotations.js -> public/data/annotations.json
  4. fetch-segments.js     -> public/data/segments.json          <<< NEW
  5. match-photos.js      -> public/data/photos.json
  6. generate-thumbnails.js -> public/images/thumbs/*.webp
  7. assign-card-photos.js -> annotations.json (coverPhoto) + cards/
  8. convert-hero.js      -> public/images/hero.webp
  9. convert-tone-images.js -> public/tone/*.webp
```

**Rationale for position:** After `resolve-annotations.js` (which establishes the segment names and positions) but before downstream consumers. The `fetch-segments.js` script needs the Strava segment IDs (hardcoded, same as annotations) but does NOT depend on annotations.json output -- it queries Strava API directly. Placing it after step 3 is logical ordering, not a hard dependency.

**What it does:**
- Reads 9 Strava segment IDs (hardcoded in the script, matching the segment IDs from PROJECT.md)
- Calls `GET /api/v3/segments/{id}` for each segment with an app-level access token
- Extracts: `xoms.kom`, `xoms.qom`, `name`, `distance`, `average_grade`, `effort_count`, `athlete_count`
- Writes `public/data/segments.json`
- Gracefully degrades: if Strava API is down or rate-limited, uses cached segments.json if it exists, or skips with warning

**Environment variable:** `STRAVA_ACCESS_TOKEN` -- set in Netlify UI with "Build" scope for prebuild, "Functions" scope for runtime functions.

**Important caveat (MEDIUM confidence):** The `xoms` field on segment detail is returned by the Strava API `getSegmentById` endpoint, but availability may depend on whether the authenticated user has a Strava subscription. The segment leaderboard endpoint (`/segments/{id}/leaderboard`) was deprecated in May 2020 and is no longer available. KOM/QOM times from `xoms` need runtime verification during implementation.

### Existing Pipeline: No Changes Required

Steps 1-3 and 5-9 remain unchanged. The `resolve-annotations.js` hardcoded data (sector names, mile markers, star ratings) is the source of truth for route content. Strava segment data supplements this with performance data (KOM/QOM times, effort counts) but does not replace it.

### New Data File: results.json

`public/data/results.json` is NOT generated by the prebuild pipeline. It is committed to the repo by the `submit-activity` Netlify Function via the GitHub API. When Netlify detects the commit, it triggers a rebuild, and Astro reads the updated file at build time.

---

## Netlify Functions Architecture

### Directory Structure

```
netlify/
  functions/
    strava-auth.mts          OAuth callback handler
    submit-activity.mts       Activity processing + scoring
    lib/
      strava.ts               Strava API client (shared)
      scoring.ts              Scoring engine (shared)
      github.ts               GitHub API commit helper (shared)
```

**File extension:** `.mts` for modern ES modules with TypeScript. Netlify Functions v2 natively supports TypeScript with `.mts` -- no build step or tsconfig required (Netlify provides a base tsconfig). The modern handler pattern uses `export default async (req: Request, context: Context)`.

**Shared code in `lib/`:** Netlify Functions allow subdirectories. The entry files (`strava-auth.mts`, `submit-activity.mts`) import from `./lib/` using relative paths with file extensions (ESM requirement).

### Function 1: strava-auth.mts

**Purpose:** Handle Strava OAuth authorization code callback, exchange for tokens, fetch athlete profile + activity segment efforts, pass to scoring.

**Trigger:** User clicks "Submit Activity" on the site, which redirects to Strava OAuth authorize URL. After user approves, Strava redirects to `/.netlify/functions/strava-auth?code=XXX&scope=XXX`.

**Flow:**

```
1. User clicks "Submit Activity" link on results page
   |
   v
2. Browser redirects to:
   https://www.strava.com/oauth/authorize?
     client_id={STRAVA_CLIENT_ID}&
     redirect_uri={SITE_URL}/.netlify/functions/strava-auth&
     response_type=code&
     scope=read,activity:read&
     state={activity_id}                 <<< activity ID passed via state param
   |
   v
3. User approves on Strava, redirected to:
   /.netlify/functions/strava-auth?code=XXX&scope=XXX&state={activity_id}
   |
   v
4. Function exchanges code for access_token:
   POST https://www.strava.com/oauth/token
     { client_id, client_secret, code, grant_type: "authorization_code" }
   Response: { access_token, refresh_token, expires_at, athlete: { id, sex, firstname, lastname } }
   |
   v
5. Function fetches activity with segment efforts:
   GET /api/v3/activities/{activity_id}?include_all_efforts=true
   Headers: Authorization: Bearer {access_token}
   |
   v
6. Function extracts matching segment_efforts for our 9 segment IDs
   |
   v
7. Function scores the efforts and updates results.json
   |
   v
8. Function commits results.json to GitHub repo via GitHub API
   |
   v
9. Function triggers Netlify build hook to rebuild site
   |
   v
10. Function redirects user to results page with success message
```

**Handler signature:**

```typescript
import type { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // activity ID
  const scope = url.searchParams.get("scope");

  // ... exchange code, fetch activity, score, commit, rebuild
  // Return redirect to results page
  return new Response(null, {
    status: 302,
    headers: { Location: "/results/?submitted=true" }
  });
};
```

**Environment variables required (Functions scope):**
- `STRAVA_CLIENT_ID` -- from Strava API application settings
- `STRAVA_CLIENT_SECRET` -- from Strava API application settings
- `GITHUB_TOKEN` -- Personal access token with `repo` scope for committing results.json
- `GITHUB_REPO` -- `owner/repo` format (e.g., `Sheppardjm/mkUltraGravel`)
- `NETLIFY_BUILD_HOOK_URL` -- Build hook URL for triggering rebuild
- `SITE_URL` -- Available as read-only Netlify variable

### Function 2: submit-activity.mts

**Purpose:** An alternative architecture consideration -- this function could be used if the OAuth callback and activity processing are separated. However, the **recommended approach is to combine everything in `strava-auth.mts`** because:

1. We already have the user's access token from the OAuth exchange
2. We know the activity ID from the `state` parameter
3. Processing is fast (one API call + scoring math)
4. Splitting into two functions would require storing the access token between calls (no database)

**Recommendation:** Use a single `strava-auth.mts` function that handles the complete flow. If processing becomes complex in the future, split then.

**If a separate submission endpoint is still desired** (for admin re-processing or manual submission), it could accept an activity URL and use an app-level token, but this introduces complexity without clear benefit for a single-event site.

### Shared Library: lib/strava.ts

```typescript
// Strava API client
const STRAVA_API = "https://www.strava.com/api/v3";

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  return res.json();
}

export async function getActivity(accessToken: string, activityId: string) {
  const res = await fetch(
    `${STRAVA_API}/activities/${activityId}?include_all_efforts=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return res.json();
}

// For build-time segment fetching
export async function getSegment(accessToken: string, segmentId: number) {
  const res = await fetch(
    `${STRAVA_API}/segments/${segmentId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return res.json();
}
```

### Shared Library: lib/scoring.ts

Contains the scoring engine -- pure functions, no side effects, testable independently. Details in "Scoring Engine Architecture" section below.

### Shared Library: lib/github.ts

```typescript
export async function commitFile(
  path: string,
  content: string,
  message: string
): Promise<void> {
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;

  // Get current file SHA (needed for updates)
  const getRes = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}`,
    { headers: { Authorization: `token ${token}` } }
  );
  const existing = getRes.ok ? await getRes.json() : null;

  // Create or update file
  await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        content: Buffer.from(content).toString("base64"),
        sha: existing?.sha,  // required for updates, omit for creation
        committer: {
          name: "MK Ultra Bot",
          email: "noreply@mkultragravel.com",
        },
      }),
    }
  );
}

export async function triggerRebuild(): Promise<void> {
  await fetch(process.env.NETLIFY_BUILD_HOOK_URL!, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
```

---

## Data Flow: Activity Submission to Display

### Complete Flow Diagram

```
USER ACTION                    SERVERLESS                         GIT/BUILD
-----------                    ----------                         ---------
1. User rides event
   on June 7, 2026
        |
2. Strava auto-creates
   activity with
   segment_efforts
        |
3. User visits results
   page, clicks
   "Submit Activity"
        |
4. User pastes Strava            5. strava-auth.mts
   activity URL, JS              receives OAuth callback
   extracts activity ID,         with code + activity_id
   redirects to Strava     -->
   OAuth with state=
   {activity_id}
        |                             |
        |                        6. Exchange code for
        |                           access_token
        |                             |
        |                        7. GET /athlete
        |                           (sex field for gender)
        |                             |
        |                        8. GET /activities/{id}
        |                           ?include_all_efforts=true
        |                             |
        |                        9. Filter segment_efforts
        |                           for our 9 segment IDs
        |                             |
        |                       10. Score efforts via
        |                           scoring engine
        |                             |
        |                       11. Read current results.json
        |                           from GitHub API
        |                             |
        |                       12. Merge new results,
        |                           re-score leaderboards
        |                             |
        |                       13. Commit updated          --> 14. GitHub receives
        |                           results.json                    commit
        |                           via GitHub API                      |
        |                             |                            15. Netlify detects
        |                       16. POST to Netlify                    commit OR
        |                           build hook             --> 17. Build hook triggers
        |                             |                            rebuild
        |                       18. Redirect user to               |
        |                           /results/?submitted=true  18. Astro reads updated
        |                                                          results.json at
        |                                                          build time
19. User sees results                                              |
    page (after rebuild)                                      19. New static HTML
    showing their times                                           deployed to CDN
```

### Latency Expectations

| Step | Duration | Notes |
|------|----------|-------|
| OAuth redirect + user approval | 5-15 seconds | User interaction |
| Token exchange | 200-500ms | Strava API |
| Fetch activity | 500-1000ms | Strava API (large payload with all efforts) |
| Score + merge | <50ms | Pure computation |
| GitHub commit | 500-1000ms | GitHub API |
| Build hook trigger | 100-200ms | Netlify API |
| Netlify rebuild | 30-60 seconds | Full Astro build |

**Total time from submission to updated site: ~1-2 minutes.** The user is redirected to the results page immediately with a "submission received" message. The rebuild happens in the background. This latency is explicitly acceptable per PROJECT.md: "rebuild-on-commit is acceptable latency."

---

## results.json Schema

### Recommended Structure

```json
{
  "lastUpdated": "2026-06-07T18:30:00Z",
  "segments": {
    "24479270": { "name": "Billie Helmer", "type": "kom", "stravaUrl": "https://www.strava.com/segments/24479270" },
    "24479292": { "name": "Sandstrom Rd", "type": "gravel", "stravaUrl": "https://www.strava.com/segments/24479292" },
    "41126651": { "name": "Leaving Chatham", "type": "kom", "stravaUrl": "https://www.strava.com/segments/41126651" },
    "24479426": { "name": "Akkala Rd", "type": "gravel", "stravaUrl": "https://www.strava.com/segments/24479426" },
    "24479467": { "name": "Haavisto", "type": "gravel", "stravaUrl": "https://www.strava.com/segments/24479467" },
    "24479496": { "name": "Forest Service Rd", "type": "gravel", "stravaUrl": "https://www.strava.com/segments/24479496" },
    "34573011": { "name": "C4", "type": "gravel", "stravaUrl": "https://www.strava.com/segments/34573011" },
    "16438243": { "name": "Silver Creek", "type": "kom", "stravaUrl": "https://www.strava.com/segments/16438243" },
    "6809754":  { "name": "Down Jeep", "type": "gravel", "stravaUrl": "https://www.strava.com/segments/6809754" }
  },
  "athletes": {
    "12345678": {
      "name": "Jane Smith",
      "gender": "F",
      "stravaId": 12345678,
      "activityId": 987654321,
      "activityUrl": "https://www.strava.com/activities/987654321",
      "submittedAt": "2026-06-07T16:00:00Z",
      "efforts": {
        "24479292": { "elapsedTime": 1423, "movingTime": 1410 },
        "24479426": { "elapsedTime": 389, "movingTime": 385 },
        "24479467": { "elapsedTime": 412, "movingTime": 410 },
        "24479496": { "elapsedTime": 1890, "movingTime": 1878 },
        "34573011": { "elapsedTime": 1654, "movingTime": 1640 },
        "6809754":  { "elapsedTime": 198, "movingTime": 195 },
        "24479270": { "elapsedTime": 245, "movingTime": 240 },
        "41126651": { "elapsedTime": 102, "movingTime": 100 },
        "16438243": { "elapsedTime": 567, "movingTime": 560 }
      }
    }
  },
  "leaderboards": {
    "gravel": {
      "M": [
        { "athleteId": "12345678", "totalTime": 5966, "rank": 1 }
      ],
      "F": [],
      "NB": []
    },
    "kom": {
      "M": [
        { "athleteId": "12345678", "points": 30, "rank": 1, "breakdown": { "24479270": 10, "41126651": 10, "16438243": 10 } }
      ],
      "F": [],
      "NB": []
    }
  }
}
```

### Schema Design Rationale

**Athletes keyed by Strava ID:** Prevents duplicate submissions. If an athlete re-submits, their existing entry is updated (latest activity wins). The Strava athlete ID is stable and unique.

**Efforts keyed by segment ID:** Direct lookup -- no array scanning. The segment IDs are the same 9 IDs used throughout the system.

**Pre-computed leaderboards:** The `leaderboards` object is computed at submission time and stored. This means the results page reads pre-sorted arrays -- no scoring computation at build time. The scoring engine runs in the Netlify Function, not in Astro.

**Gender categories:** `M` (male), `F` (female), `NB` (non-binary). Strava's API `sex` field returns `"M"`, `"F"`, or `null`. The `null` case (Strava's "Rather not say" option) maps to `NB`. This is a design decision -- athletes who don't specify gender on Strava compete in the non-binary category. The site should explain this clearly.

**elapsed_time vs moving_time:** Store both. Use `elapsed_time` for scoring (standard in cycling -- stops count against you). This matches Strava's segment leaderboard behavior.

### Schema Size Estimation

For a 100-person event: ~50KB JSON (9 efforts per athlete, 3 leaderboards with 3 gender categories). Negligible for a static site build or GitHub API commit.

---

## segments.json Schema (Build-Time Strava Data)

### Recommended Structure

```json
{
  "fetchedAt": "2026-06-01T12:00:00Z",
  "segments": {
    "24479270": {
      "name": "Billie Helmer",
      "distance": 1110,
      "averageGrade": 6.4,
      "maximumGrade": 12.1,
      "elevationHigh": 340,
      "elevationLow": 268,
      "effortCount": 142,
      "athleteCount": 89,
      "xoms": {
        "kom": "2:45",
        "qom": "3:12",
        "overall": "2:45"
      },
      "stravaUrl": "https://www.strava.com/segments/24479270"
    }
  }
}
```

### How Components Consume This Data

**GravelSectors.astro and KomSegments.astro** currently read from `annotations.json` only. To display Strava data (KOM/QOM times, Strava links), they also read `segments.json`:

```astro
---
const annotations = JSON.parse(readFileSync(..., "annotations.json"));
const segmentData = JSON.parse(readFileSync(..., "segments.json"));
// Match annotation names to segment data by segment ID mapping
---
```

The mapping between annotation names and Strava segment IDs is defined in the segment configuration (hardcoded in both `resolve-annotations.js` and `fetch-segments.js`). A shared `segment-config.js` module could eliminate this duplication.

---

## Scoring Engine Architecture

### Gravel Champion Scoring

**Rule:** Cumulative elapsed_time across all 6 gravel sectors. Lowest total time wins.

```
Gravel segments: Sandstrom, Akkala Rd, Haavisto, Forest Service Rd, C4, Down Jeep
Segment IDs:     24479292,  24479426,  24479467,  24479496,       34573011, 6809754

Score = SUM(elapsed_time for each gravel segment)
Rank by: ascending total time (lowest = 1st)
Requirement: Must have efforts for ALL 6 gravel segments to qualify
```

### KOM/QOM Champion Scoring

**Rule:** Top 10 points system across 3 KOM segments. Points: 1st=10, 2nd=9, ..., 10th=1.

```
KOM segments: Billie Helmer, Leaving Chatham, Silver Creek
Segment IDs:  24479270,      41126651,        16438243

For each KOM segment, rank all athletes by elapsed_time (ascending).
Assign points: rank 1 = 10 pts, rank 2 = 9 pts, ..., rank 10 = 1 pt, rank 11+ = 0 pts.
KOM Champion Score = SUM(points across 3 KOM segments)
Max possible: 30 points (1st on all 3)
Rank by: descending points (highest = 1st)
Tiebreaker: lowest combined elapsed_time on KOM segments
```

### Gender Separation

All leaderboards are computed per gender category (`M`, `F`, `NB`). An athlete only competes against others in their gender category.

### Scoring Engine as Pure Function

```typescript
// lib/scoring.ts
interface Athlete {
  id: string;
  gender: "M" | "F" | "NB";
  efforts: Record<string, { elapsedTime: number; movingTime: number }>;
}

interface LeaderboardEntry {
  athleteId: string;
  totalTime?: number;    // gravel
  points?: number;       // KOM
  rank: number;
  breakdown?: Record<string, number>;  // KOM points per segment
}

const GRAVEL_SEGMENT_IDS = ["24479292", "24479426", "24479467", "24479496", "34573011", "6809754"];
const KOM_SEGMENT_IDS = ["24479270", "41126651", "16438243"];

export function computeLeaderboards(athletes: Record<string, Athlete>) {
  // Returns { gravel: { M: [...], F: [...], NB: [...] }, kom: { M: [...], F: [...], NB: [...] } }
}
```

The scoring engine is imported by the Netlify Function. It receives all athletes, computes all leaderboards, and returns the complete leaderboard structure. This is recomputed on every submission (merging new athlete into existing data and re-ranking).

---

## New Pages and Components

### New Page: src/pages/results.astro

A second page (the site's first multi-page addition). Reads `results.json` and `segments.json` at build time, renders static leaderboard HTML.

**Page sections:**
1. Scoring explainer (how gravel champion + KOM/QOM champion work)
2. Gravel champion leaderboard (3 gender tabs/sections)
3. KOM/QOM champion leaderboard (3 gender tabs/sections)
4. Individual segment leaderboards (9 segments, expandable)
5. "Submit Your Activity" CTA

### New Components

| Component | File | Pattern | Data Source |
|-----------|------|---------|-------------|
| SubmitActivity | `src/components/SubmitActivity.astro` | Client-side JS for URL input + redirect | None (constructs OAuth URL) |
| GravelLeaderboard | `src/components/GravelLeaderboard.astro` | SSR/build-time | `results.json` via `readFileSync` |
| KomLeaderboard | `src/components/KomLeaderboard.astro` | SSR/build-time | `results.json` via `readFileSync` |
| SegmentLeaderboard | `src/components/SegmentLeaderboard.astro` | SSR/build-time | `results.json` via `readFileSync` |
| ScoringExplainer | `src/components/ScoringExplainer.astro` | Static HTML | None |

### Modified Components

| Component | Change | Reason |
|-----------|--------|--------|
| GravelSectors.astro | Add Strava segment link + icon per card | Display segment URL from segment config |
| KomSegments.astro | Add Strava link + KOM/QOM times from segments.json | Display xoms data |
| BaseLayout.astro | Add nav link to /results/ | Site navigation |
| index.astro | Add results CTA or link | Cross-page navigation |

---

## Environment Variables Summary

| Variable | Scope | Purpose | Set In |
|----------|-------|---------|--------|
| `STRAVA_CLIENT_ID` | Build + Functions | Strava API app ID | Netlify UI |
| `STRAVA_CLIENT_SECRET` | Functions | OAuth token exchange | Netlify UI |
| `STRAVA_ACCESS_TOKEN` | Build | App-level token for prebuild segment fetch | Netlify UI |
| `GITHUB_TOKEN` | Functions | Commit results.json to repo | Netlify UI |
| `GITHUB_REPO` | Functions | Target repo for commits | Netlify UI |
| `NETLIFY_BUILD_HOOK_URL` | Functions | Trigger site rebuild | Netlify UI |

**Critical Netlify caveat:** Environment variables in `netlify.toml` are NOT available to functions at runtime. All function env vars must be set in the Netlify UI with "Functions" scope.

**Critical Astro 6 caveat:** `import.meta.env` values are inlined at build time in Astro 6. Do NOT use `import.meta.env` for secrets in server-side code -- they will be baked into build output. Prebuild scripts use `process.env` directly, which is safe.

---

## Strava API Constraints

### Rate Limits

| Limit | Value | Implication |
|-------|-------|-------------|
| Read requests per 15 min | 100 | Build-time: 9 segment fetches = 9 requests. Safe. |
| Read requests per day | 1,000 | Even with 100 submissions/day, each submission is 2 reads (token exchange + activity fetch) = 200 reads. Safe. |
| 15-min reset | 0, 15, 30, 45 min past hour | If rate-limited, build fails gracefully with cached data |

### Token Management

- **Build-time:** A single app-level access token (from the Strava app owner's account). Refresh manually if it expires (6 hours). For the prebuild to be reliable, generate a long-lived token via the refresh flow before each deploy session, or add a refresh step to the prebuild script.
- **Runtime:** Per-user tokens from OAuth flow. Used once immediately, then discarded. No need to store or refresh.

**Recommendation for build-time token:** Add a `refresh-strava-token.js` script that reads `STRAVA_REFRESH_TOKEN` from env, calls the refresh endpoint, and writes the new access token to a temp location or env. OR, simpler: use a refresh token in the `fetch-segments.js` script itself -- call the refresh endpoint at the start of each build, then use the fresh access token for segment fetches.

### Scope Requirements

| Scope | Needed For | When |
|-------|-----------|------|
| `read` | Segment detail (getSegmentById) | Build-time app token |
| `activity:read` | Activity with segment_efforts | Runtime per-user OAuth |
| `profile:read_all` | Athlete sex field | Runtime per-user OAuth |

### Segment Leaderboard Endpoint: UNAVAILABLE

**The `/segments/{id}/leaderboard` endpoint was deprecated on May 18, 2020 and is no longer available.** This means we cannot fetch full segment leaderboards from Strava. Our leaderboards are built entirely from submitted activities -- only athletes who submit their activity through our OAuth flow appear in results. This is actually the correct design for an event-specific leaderboard.

### Athlete Sex Field Values

The Strava API `sex` field returns:
- `"M"` -- male
- `"F"` -- female
- `null` -- "Rather not say" / not specified

There is no native non-binary option in the Strava API. Our mapping: `"M"` -> Men, `"F"` -> Women, `null` -> Non-binary. Document this mapping clearly on the results page so athletes understand which category they will be placed in.

---

## Activity ID Extraction Pattern

The user submits a Strava activity URL. The client-side JS extracts the activity ID.

```
Input: https://www.strava.com/activities/12345678901
Extract: 12345678901

Regex: /strava\.com\/activities\/(\d+)/
```

This activity ID is passed to the Strava OAuth flow via the `state` parameter:

```
https://www.strava.com/oauth/authorize?
  client_id={STRAVA_CLIENT_ID}&
  redirect_uri={SITE_URL}/.netlify/functions/strava-auth&
  response_type=code&
  scope=read,activity:read,profile:read_all&
  state={activity_id}
```

The `state` parameter is returned unchanged in the OAuth callback, allowing the function to know which activity to fetch without storing any state.

---

## Anti-Patterns to Avoid

### Anti-Pattern A: Database for Results

**What:** Using a database (Supabase, PlanetScale, etc.) for results storage.
**Why bad for this project:** Adds infrastructure complexity, costs, and operational burden for a single-event site with ~100 athletes. JSON-in-repo is sufficient, version-controlled, and free.
**Instead:** Commit `results.json` to the repo via GitHub API. The file is the database.

### Anti-Pattern B: Client-Side Scoring

**What:** Shipping the scoring engine to the browser, fetching results.json at runtime, computing leaderboards client-side.
**Why bad:** Increases bundle size, duplicates logic, allows tampering. The static site pattern (pre-computed leaderboards baked into HTML) is faster, simpler, and more secure.
**Instead:** Score in the Netlify Function, store pre-computed leaderboards in results.json, render at build time.

### Anti-Pattern C: Storing Strava Tokens

**What:** Storing user access tokens or refresh tokens for later use.
**Why bad:** Violates Strava TOS spirit, creates security liability, unnecessary. Each submission is a one-shot flow: OAuth -> fetch activity -> score -> done.
**Instead:** Use the token immediately in the OAuth callback function, then discard it.

### Anti-Pattern D: Polling Strava for Activities

**What:** Periodically checking Strava for new activities that match the event.
**Why bad:** Rate limit waste, no way to identify which activities are event rides vs. regular rides, requires storing app-level tokens with activity:read scope for all athletes.
**Instead:** Athlete-initiated submission. The athlete explicitly submits their activity URL, authorizes via OAuth, and the function processes it once.

### Anti-Pattern E: Astro SSR/Server Mode

**What:** Switching from SSG to SSR to handle server-side routes for OAuth.
**Why bad:** Transforms the entire deployment model. The site is performant as static HTML on CDN. SSR adds latency, complexity, and cost. Netlify Functions handle the server-side needs independently.
**Instead:** Keep Astro in SSG mode. Use Netlify Functions (separate from Astro) for all server-side logic.

### Anti-Pattern F: Netlify.toml for Secrets

**What:** Putting `STRAVA_CLIENT_SECRET` or `GITHUB_TOKEN` in `netlify.toml`.
**Why bad:** `netlify.toml` is committed to the repo (public). Also, `netlify.toml` env vars are NOT available to functions at runtime (verified in official docs).
**Instead:** All secrets set in Netlify UI with appropriate scope (Build and/or Functions).

---

## Suggested Build Order (Dependency-Driven)

```
Phase 1: Segment Configuration + Strava Data (FOUNDATION)
  New: scripts/fetch-segments.js, public/data/segments.json
  Modified: scripts/generate-data.js (add fetch-segments step)
  New: shared segment ID config (used by fetch-segments + scoring)
  Rationale: Establishes the Strava data pipeline integration and
  segment ID mapping that all downstream work depends on.

Phase 2: Strava Links on Sector/KOM Cards
  Modified: GravelSectors.astro, KomSegments.astro
  Reads: segment config for Strava URLs
  Rationale: Simplest visible change -- adds Strava segment links to
  existing cards. No serverless functions needed. Validates that
  segment data is accessible and the mapping is correct.

Phase 3: Scoring Engine + Results Schema
  New: netlify/functions/lib/scoring.ts, public/data/results.json (seed)
  Rationale: Pure logic, testable independently. Must be built before
  the submission flow or results page can work.

Phase 4: Strava OAuth + Submission Function
  New: netlify/functions/strava-auth.mts, netlify/functions/lib/strava.ts,
       netlify/functions/lib/github.ts
  New: SubmitActivity.astro component
  Env: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, GITHUB_TOKEN,
       GITHUB_REPO, NETLIFY_BUILD_HOOK_URL
  Rationale: The core serverless integration. Depends on scoring engine
  (Phase 3) for processing submissions. Depends on segment config
  (Phase 1) for matching segment_efforts.

Phase 5: Results Page + Leaderboard Components
  New: src/pages/results.astro, GravelLeaderboard.astro,
       KomLeaderboard.astro, SegmentLeaderboard.astro,
       ScoringExplainer.astro
  Modified: BaseLayout.astro (nav), index.astro (results link)
  Rationale: Renders the results.json data. Depends on the schema
  being defined (Phase 3) and ideally on submission working (Phase 4)
  so real data can be tested.

Phase 6: KOM/QOM Data on Cards (BUILD-TIME STRAVA FETCH)
  Modified: KomSegments.astro (display xoms.kom, xoms.qom)
  Depends: fetch-segments.js producing segments.json with xoms data
  Rationale: Deferred because xoms field availability is MEDIUM
  confidence -- needs runtime verification. If xoms is not available,
  this phase can be dropped without affecting the core results system.
```

### Dependency Graph

```
Phase 1 (Segment Config + Data)
  |
  +---> Phase 2 (Strava Links on Cards)
  |
  +---> Phase 3 (Scoring Engine)
  |       |
  |       +---> Phase 4 (OAuth + Submission)
  |       |       |
  |       |       +---> Phase 5 (Results Page)
  |       |
  |       +---> Phase 5 (Results Page)
  |
  +---> Phase 6 (KOM/QOM Data) -- can be parallel with 3-5

Phase 6 is independent of 3-5 and can be done anytime after Phase 1.
Phases 2 is independent of 3-6.
```

---

## Confidence Assessment

| Area | Confidence | Source | Notes |
|------|------------|--------|-------|
| Netlify Functions v2 pattern | HIGH | Official Netlify docs (verified via WebFetch) | .mts, Request/Context handler, process.env |
| Strava OAuth flow | HIGH | Official Strava developer docs (verified via WebFetch) | Standard authorization code flow |
| Strava activity segment_efforts | HIGH | Official API docs + community examples | include_all_efforts=true returns all efforts |
| Strava athlete sex field | HIGH | Official API docs + community discussion | Returns "M", "F", or null |
| Strava xoms (KOM/QOM times) | MEDIUM | Community discussion (2024) | Reported working on getSegmentById, but may depend on subscription status. Needs runtime verification. |
| Strava leaderboard endpoint | HIGH | Official deprecation docs (verified) | Deprecated May 2020, unavailable |
| GitHub API file commit | HIGH | Official GitHub REST API docs | PUT /repos/{owner}/{repo}/contents/{path} |
| Netlify build hooks | HIGH | Official Netlify docs (verified via WebFetch) | POST to unique URL triggers rebuild |
| results.json schema | HIGH | Design decision, no external dependency | Follows established JSON data pattern |
| Scoring engine | HIGH | Pure logic, no external dependency | Matches PROJECT.md requirements |
| Build pipeline integration | HIGH | Direct codebase inspection | fetch-segments.js fits existing coordinator pattern |
| Env var scoping | HIGH | Official Netlify docs (verified) | netlify.toml vars NOT available in functions |
| Astro 6 import.meta.env inlining | HIGH | Netlify changelog (2026-03-10) | Secrets must not use import.meta.env |

---

## Sources

### Official Documentation (HIGH confidence)
- [Strava OAuth2 Authentication](https://developers.strava.com/docs/authentication/) -- complete OAuth flow, scopes, token management
- [Strava API v3 Reference](https://developers.strava.com/docs/reference/) -- activity, segment, athlete endpoints
- [Strava Rate Limits](https://developers.strava.com/docs/rate-limits/) -- 100 read/15min, 1000 read/day
- [Strava Segment API Changes (May 2020)](https://developers.strava.com/docs/segment-changes/) -- leaderboard endpoint deprecated
- [Strava Segment Efforts V3 API](https://strava.github.io/api/v3/efforts/) -- complete effort response structure
- [Strava Segments V3 API](https://strava.github.io/api/v3/segments/) -- segment detail, xoms, leaderboard (deprecated)
- [Netlify Functions Get Started](https://docs.netlify.com/build/functions/get-started/) -- v2 handler pattern, .mts, directory structure
- [Netlify Functions Environment Variables](https://docs.netlify.com/build/functions/environment-variables/) -- scoping rules, process.env access
- [Netlify Build Hooks](https://docs.netlify.com/build/configure-builds/build-hooks/) -- POST trigger, URL format, payload
- [Netlify: Astro 6 just works](https://www.netlify.com/changelog/2026-03-10-astro-6/) -- import.meta.env inlining caveat

### Community Sources (MEDIUM confidence)
- [Accessing KOM/QOM data for segment](https://communityhub.strava.com/developers-api-7/accessing-kom-qom-data-for-segment-1999) -- xoms field confirmation
- [Strava Gender Settings](https://support.strava.com/hc/en-us/articles/4424254689805-Gender-Settings-and-Leaderboard-Filters) -- gender options (page returned 403, info from search results)
- [GitHub API: Create or update file contents](https://developer.github.com/v3/repos/contents/) -- commit via REST API

### Direct Codebase Inspection (HIGH confidence)
- All existing component files, build scripts, data files, and configuration inspected directly
- Pipeline integration points verified against actual `generate-data.js` coordinator
- Data flow traced through `readFileSync` patterns in Astro components
