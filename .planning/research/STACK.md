# Technology Stack — Strava Integration + Results Milestone

**Project:** MK Ultra Gravel — Strava API + Results
**Researched:** 2026-03-30
**Scope:** Stack additions for Strava segment data (build-time), Strava OAuth submission flow (serverless), JSON-based results storage, and results leaderboard pages
**Confidence:** HIGH for Strava API surface and Netlify Functions patterns; MEDIUM for `xoms`/`local_legend` response fields (undocumented in OpenAPI spec, confirmed by community)

---

## Executive Summary

This milestone transitions MK Ultra Gravel from a fully static site to a **static site with serverless functions**. The core Astro build remains static (no SSR adapter needed), but three new capabilities require server-side code: (1) Strava OAuth token exchange (client_secret must never reach the browser), (2) Strava API proxying for activity submission, and (3) build hook triggering after results are stored.

The stack additions are minimal but architecturally significant:

| Addition | Purpose | Why |
|----------|---------|-----|
| `@netlify/functions` | TypeScript types for Netlify Functions v2 | Required for serverless OAuth + API proxy |
| `netlify-cli` (dev dep) | Local development with functions | `netlify dev` wraps `astro dev` + serves functions locally |
| `netlify.toml` | Configure functions directory, env var scoping, build hooks | Required for Netlify to discover functions |
| New prebuild script | Fetch Strava segment data at build time | Extends existing pipeline pattern |

**No Strava client library.** The Strava API v3 is a simple REST API. Direct `fetch()` calls with Bearer token auth are cleaner, lighter, and more maintainable than any wrapper library. The two candidate npm packages (`strava-v3@3.1.0` and `strava`) both add unnecessary abstraction over straightforward HTTP calls.

**No Astro adapter.** The site remains fully static. Netlify Functions live in the `netlify/functions/` directory alongside (not inside) the Astro project. Astro builds to `dist/`, functions deploy from `netlify/functions/`. No `@astrojs/netlify` adapter needed.

---

## Recommended Stack Additions

### Serverless Runtime

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@netlify/functions` | ^5.1.5 | TypeScript types + utilities for Netlify Functions v2 | Provides `Config` export type for path routing, `Context` type for request handling. The v2 function format uses Web Standard `Request`/`Response` objects — modern, portable, no vendor lock-in beyond deployment target. |
| `netlify-cli` | latest (dev) | Local development server | `netlify dev` proxies both `astro dev` (port 4321) and functions (port 8888) under a single local URL. Required to test OAuth flow locally. |

### Configuration Files

| File | Purpose |
|------|---------|
| `netlify.toml` | Functions directory, build command, environment variable scoping, redirect rules for OAuth callback |
| `.env` (git-ignored) | Local development secrets: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN` |

### Build-Time Dependencies (Already Available)

| Technology | Status | Purpose in This Milestone |
|------------|--------|---------------------------|
| Node.js 22 (via Volta) | Already pinned | Runs prebuild Strava data fetch script using native `fetch()` (stable since Node 18) |
| `scripts/generate-data.js` | Existing pipeline | Will be extended with a new `fetch-strava-segments.js` step |

---

## Strava API v3 — Critical Reference

### Authentication Model

Strava does NOT support client credentials or public API keys. **Every API request requires a Bearer token**, even for public segment data. This means:

1. **Build-time segment fetching** needs an access token from the app owner's Strava account
2. **User submission flow** needs each user to OAuth-authorize, producing their own access token
3. **Access tokens expire every 6 hours** and must be refreshed via `refresh_token`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `https://www.strava.com/oauth/authorize` | GET (browser redirect) | Start OAuth flow — user grants permission |
| `https://www.strava.com/api/v3/oauth/token` | POST | Exchange auth code for access+refresh tokens; also refresh expired tokens |
| `https://www.strava.com/api/v3/segments/{id}` | GET | Get segment detail (name, distance, elevation, xoms, local_legend) |
| `https://www.strava.com/api/v3/athlete/activities` | GET | List authenticated athlete's activities |
| `https://www.strava.com/api/v3/activities/{id}` | GET | Get detailed activity with segment_efforts |
| `https://www.strava.com/oauth/deauthorize` | POST | Revoke app access (good citizenship) |

### Required OAuth Scopes

| Scope | Why Needed |
|-------|-----------|
| `read` | Access public segment data (build-time segment fetch uses app owner's token with this scope) |
| `activity:read` | Read user's activities for submission flow (find their MK Ultra ride) |
| `activity:read_all` | Read activities regardless of privacy setting (needed because some athletes set rides to "Followers Only") |

**Recommended scope string for user OAuth:** `read,activity:read_all`

Do NOT request `activity:write` or `profile:write` — the app never modifies user data.

### Rate Limits

| Limit | Value | Implication |
|-------|-------|-------------|
| 15-minute window | 100 read requests | Build-time: 9 segment fetches is well within budget |
| Daily limit | 1,000 read requests | Event day with 50 participants submitting: ~150 API calls (3 per user). Safe. |
| Upload endpoints | 200/15min, 2,000/day | Not applicable — we don't upload |

**Headers to monitor:** `X-RateLimit-Limit`, `X-RateLimit-Usage`, `X-ReadRateLimit-Limit`, `X-ReadRateLimit-Usage`

### Segment Detail Response — Key Fields

The `GET /segments/{id}` endpoint returns a `DetailedSegment` with these fields relevant to our use case:

| Field | Type | Use |
|-------|------|-----|
| `name` | string | Display name on segment cards |
| `distance` | float (meters) | Segment length |
| `average_grade` | float | Grade percentage |
| `maximum_grade` | float | Max grade percentage |
| `elevation_high` | float (meters) | Highest point |
| `elevation_low` | float (meters) | Lowest point |
| `total_elevation_gain` | float (meters) | Total climbing |
| `effort_count` | int | How many times ridden |
| `athlete_count` | int | How many athletes have ridden it |
| `star_count` | int | Starred count |
| `xoms` | object | **KOM/QOM times** — `xoms.kom`, `xoms.qom` as formatted time strings (e.g., `"50:03"`) |
| `local_legend` | object | Current local legend — `local_legend.title` (athlete name), `local_legend.effort_count` |
| `map` | PolylineMap | Encoded polyline of segment route |
| `start_latlng` | [lat, lng] | Segment start coordinates |
| `end_latlng` | [lat, lng] | Segment end coordinates |

**IMPORTANT CAVEAT:** The `xoms` and `local_legend` fields are NOT in the official OpenAPI/Swagger spec but ARE returned by the live API. This was confirmed via the [Strava Community Hub discussion](https://communityhub.strava.com/developers-api-7/accessing-kom-qom-data-for-segment-1999). Confidence: MEDIUM — works today, but undocumented fields could theoretically be removed without notice.

### Activity Detail Response — Key Fields for Results

The `GET /activities/{id}` endpoint (with `include_all_efforts=true`) returns:

| Field | Type | Use |
|-------|------|-----|
| `name` | string | Activity title |
| `distance` | float (meters) | Total ride distance |
| `moving_time` | int (seconds) | Moving time |
| `elapsed_time` | int (seconds) | Total elapsed time |
| `start_date` | datetime | When the ride started |
| `segment_efforts` | array | **Critical** — each effort has `segment.id`, `elapsed_time`, `moving_time`, `start_date` |
| `athlete` | object | `athlete.id`, `athlete.firstname`, `athlete.lastname` |

The `segment_efforts` array is how we extract each rider's times on the 9 MK Ultra segments.

---

## Architecture: Two Token Strategies

### Strategy 1: Build-Time (App Owner's Token)

For fetching segment details (names, distances, KOM/QOM times) at build time:

```
prebuild script
  → read STRAVA_REFRESH_TOKEN from env
  → POST /oauth/token (refresh) → get fresh access_token
  → GET /segments/{id} x 9 → extract fields
  → write public/data/strava-segments.json
  → Astro reads JSON at build time (same pattern as route-data.json)
```

**Environment variables needed (Netlify UI, "Build" scope):**
- `STRAVA_CLIENT_ID` — from Strava API settings
- `STRAVA_CLIENT_SECRET` — from Strava API settings (secret)
- `STRAVA_REFRESH_TOKEN` — app owner's refresh token (obtained once via manual OAuth)

**Why refresh token, not access token:** Access tokens expire every 6 hours. Refresh tokens are long-lived. The prebuild script refreshes the access token on every build, guaranteeing a fresh token regardless of when the last build ran.

### Strategy 2: Runtime (User OAuth via Netlify Functions)

For the post-event activity submission flow:

```
Browser                          Netlify Function              Strava
  │                                    │                          │
  │  Click "Submit Results"            │                          │
  │──redirect to Strava──────────────────────────────────────────>│
  │                                    │     User approves        │
  │<───────redirect with ?code=xxx─────│──────────────────────────│
  │                                    │                          │
  │  POST /api/strava/callback         │                          │
  │  { code: xxx }                     │                          │
  │───────────────────────────────────>│                          │
  │                                    │  POST /oauth/token       │
  │                                    │  (code + client_secret)  │
  │                                    │─────────────────────────>│
  │                                    │  { access_token, ... }   │
  │                                    │<─────────────────────────│
  │                                    │                          │
  │                                    │  GET /athlete/activities │
  │                                    │─────────────────────────>│
  │                                    │  [activities...]         │
  │                                    │<─────────────────────────│
  │                                    │                          │
  │  { activities for selection }      │                          │
  │<───────────────────────────────────│                          │
  │                                    │                          │
  │  POST /api/strava/submit           │                          │
  │  { activityId, gender }            │                          │
  │───────────────────────────────────>│                          │
  │                                    │  GET /activities/{id}    │
  │                                    │  ?include_all_efforts    │
  │                                    │─────────────────────────>│
  │                                    │  { segment_efforts... }  │
  │                                    │<─────────────────────────│
  │                                    │                          │
  │                                    │  Write results JSON      │
  │                                    │  Trigger build hook      │
  │  "Submitted! Results updating..."  │                          │
  │<───────────────────────────────────│                          │
```

**Environment variables needed (Netlify UI, "Functions" scope):**
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_REDIRECT_URI` — `https://mkultragravel.com/.netlify/functions/strava-callback` (or custom path)
- `NETLIFY_BUILD_HOOK_URL` — build hook URL from Netlify project settings

**IMPORTANT NOTE on env vars:** As of March 2026, there is a [known intermittent issue](https://answers.netlify.com/t/functions-v2-export-default-intermittently-missing-all-user-defined-env-vars-at-runtime/160958) with user-defined environment variables being absent from `process.env` at runtime in Functions v2. Use `Netlify.env.get()` as a fallback pattern, or access via `process.env` with explicit null checks. Monitor this issue.

---

## Netlify Functions — Implementation Pattern

### Directory Structure

```
mkUltraGravel/
  netlify/
    functions/
      strava-auth.mts        # Initiate OAuth redirect
      strava-callback.mts    # Exchange code for token, fetch activities
      strava-submit.mts      # Fetch activity detail, extract segment times, store results
  netlify.toml                # Config
  src/                        # Existing Astro source
  scripts/
    fetch-strava-segments.js  # NEW: build-time segment data fetcher
    generate-data.js          # Existing pipeline (add fetch-strava-segments.js step)
  public/
    data/
      strava-segments.json    # NEW: build-time output
      results.json            # NEW: results data (committed to repo OR stored in Netlify Blobs)
```

### Function Format (v2, ESM, TypeScript)

Use `.mts` extension for ES modules with TypeScript. The v2 format uses Web Standard APIs:

```typescript
// netlify/functions/strava-auth.mts
import type { Config, Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.STRAVA_REDIRECT_URI;
  const scope = "read,activity:read_all";

  const authUrl = new URL("https://www.strava.com/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId!);
  authUrl.searchParams.set("redirect_uri", redirectUri!);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("approval_prompt", "auto");

  return Response.redirect(authUrl.toString(), 302);
};

export const config: Config = {
  path: "/api/strava/auth"
};
```

### netlify.toml Configuration

```toml
[build]
  command = "npm run build"
  publish = "dist"

[functions]
  directory = "netlify/functions"

# Redirect OAuth callback to function
[[redirects]]
  from = "/api/strava/*"
  to = "/.netlify/functions/strava-:splat"
  status = 200
```

### Local Development

```bash
# Install CLI globally (or use npx)
npm install -g netlify-cli

# Link to Netlify site (one-time)
netlify link

# Pull env vars to local .env
netlify env:pull

# Run local dev (wraps astro dev + serves functions)
netlify dev
```

`netlify dev` automatically detects the Astro framework, runs `astro dev`, and serves functions at `http://localhost:8888/.netlify/functions/` (or custom paths via `config.path`).

---

## Results Storage Strategy

### Recommended: JSON File in Git Repository

Store results as `public/data/results.json` committed to the repo. When a user submits, the Netlify Function:

1. Fetches current `results.json` from the repo via GitHub API (or Netlify Blobs)
2. Appends the new result
3. Commits the updated file (via GitHub API)
4. Triggers a Netlify build hook to rebuild the site

**Why git-committed JSON over a database:**
- Matches existing architecture (route-data.json, annotations.json, photos.json are all git-committed JSON)
- Zero infrastructure cost — no database to manage
- Full version history via git
- Build-time rendering (Astro reads JSON, generates static HTML)
- Survives Netlify function cold starts (no connection to warm up)

**Why NOT Netlify Blobs:** Netlify Blobs is a key-value store accessible from functions and build. It could work, but adds a runtime dependency for what is fundamentally static data. The results change infrequently (one batch on event day), and the data must be available at build time for static page generation anyway. Git-committed JSON is simpler and more aligned with the existing architecture.

**Why NOT a database (PlanetScale, Supabase, Turso):** Massive overkill for ~50-100 result entries that change once per year. Adds a service dependency, connection management, and monthly cost for something a 10KB JSON file handles.

### Build Hook for Re-rendering

After writing results, trigger a Netlify build hook:

```typescript
await fetch(process.env.NETLIFY_BUILD_HOOK_URL!, {
  method: "POST",
  body: JSON.stringify({ trigger_title: "Results update" })
});
```

Build hooks are created in Netlify UI under **Project configuration > Build & deploy > Continuous deployment > Build hooks**. The hook URL is a simple POST endpoint that queues a build.

---

## What NOT to Add (And Why)

| Temptation | Why Not |
|------------|---------|
| **`strava-v3` npm package** | Adds 58KB for a wrapper around `fetch()`. The Strava API has ~5 endpoints we need, all simple GET/POST with Bearer auth. Direct `fetch()` is cleaner, has zero dependencies, and we control error handling. The package's last meaningful update was months ago and it wraps an API that rarely changes. |
| **`strava` npm package** | Same reasoning. Another wrapper we don't need. |
| **`@astrojs/netlify` adapter** | Only needed for Astro SSR/on-demand rendering. Our site is fully static. Functions live in `netlify/functions/` independent of Astro. Adding the adapter would change the entire build output structure unnecessarily. |
| **`passport` / `passport-strava`** | Express middleware pattern. Our functions use the Web Standard Request/Response API, not Express. Passport adds session management complexity we don't need — the OAuth flow is a simple 3-step redirect dance. |
| **A database (Supabase, PlanetScale, Turso)** | ~50-100 results per year. JSON file in git is the correct level of complexity. The existing site serves all data from JSON files. |
| **Netlify Identity** | We don't need user accounts. Strava OAuth gives us athlete identity for result submission. Netlify Identity would add an unnecessary authentication layer. |
| **`jsonwebtoken` / JWT sessions** | The submission flow is short-lived (user submits, done). We pass the Strava access token through the flow and discard it. No session persistence needed. |
| **Redis / session store** | Same reasoning. No sessions to store. |
| **Netlify Blobs for results** | Adds runtime complexity. Results must be available at build time anyway. Git-committed JSON matches the existing pattern. |

---

## Environment Variables — Complete List

### Build Scope (available during `npm run build`)

| Variable | Value | Purpose |
|----------|-------|---------|
| `STRAVA_CLIENT_ID` | From Strava API settings | Authenticate build-time API calls |
| `STRAVA_CLIENT_SECRET` | From Strava API settings | Refresh access token during prebuild |
| `STRAVA_REFRESH_TOKEN` | App owner's refresh token | Long-lived token for build-time segment fetching |

### Functions Scope (available at runtime in Netlify Functions)

| Variable | Value | Purpose |
|----------|-------|---------|
| `STRAVA_CLIENT_ID` | Same as build | Construct OAuth authorize URL |
| `STRAVA_CLIENT_SECRET` | Same as build | Exchange auth code for tokens |
| `STRAVA_REDIRECT_URI` | `https://{site}/.netlify/functions/strava-callback` | OAuth callback URL |
| `NETLIFY_BUILD_HOOK_URL` | From Netlify project settings | Trigger rebuild after results update |
| `GITHUB_TOKEN` | GitHub personal access token | Commit results.json to repo (if using git-commit strategy) |

### Local Development (.env, git-ignored)

```bash
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
STRAVA_REFRESH_TOKEN=your_refresh_token
STRAVA_REDIRECT_URI=http://localhost:8888/.netlify/functions/strava-callback
NETLIFY_BUILD_HOOK_URL=not_needed_locally
GITHUB_TOKEN=your_github_pat
```

Use `netlify env:pull` to sync production env vars to local `.env` for development.

---

## Strava API Application Setup

Before any code is written, the app owner must:

1. **Create a Strava API application** at `https://www.strava.com/settings/api`
2. **Set the Authorization Callback Domain** to the production domain (e.g., `mkultragravel.com`)
3. **Note the Client ID and Client Secret** — these go in Netlify env vars
4. **Obtain a personal refresh token** by completing the OAuth flow once manually:
   - Visit `https://www.strava.com/oauth/authorize?client_id={ID}&redirect_uri=http://localhost&response_type=code&scope=read`
   - Approve the app
   - Copy the `code` parameter from the redirect URL
   - Exchange it: `curl -X POST https://www.strava.com/api/v3/oauth/token -d client_id={ID} -d client_secret={SECRET} -d code={CODE} -d grant_type=authorization_code`
   - Save the `refresh_token` from the response — this is `STRAVA_REFRESH_TOKEN`

**Note on app review:** For public-facing applications with many users, Strava requires app review. For a small cycling event with <100 participants, this is unlikely to be enforced, but check Strava's current policy before event day.

---

## Installation

```bash
# New runtime dependency (types only, no bundle impact on static site)
npm install @netlify/functions

# Dev dependency for local development
npm install -D netlify-cli

# Create functions directory
mkdir -p netlify/functions

# Create netlify.toml (see configuration above)

# Add .env to .gitignore (if not already)
echo ".env" >> .gitignore
```

**Net new dependencies: 2** (`@netlify/functions` for types, `netlify-cli` for local dev)
**Bundle size impact on static site: 0 bytes** (functions run server-side, not in browser)
**Existing dependency changes: 0** (Astro, Tailwind, Leaflet, Chart.js, PhotoSwipe unchanged)

---

## Stack Summary Table

| Layer | Technology | Version | Status |
|-------|-----------|---------|--------|
| Framework | Astro | ^6.1.1 | No change (remains static, no adapter) |
| CSS | Tailwind v4 | ^4.2.2 | No change |
| Map | Leaflet | ^1.9.4 | No change |
| Charts | Chart.js | ^4.5.1 | No change |
| Lightbox | PhotoSwipe | ^5.4.4 | No change |
| Image processing | sharp | ^0.34.5 | No change |
| **Serverless** | **@netlify/functions** | **^5.1.5** | **NEW — TypeScript types for Netlify Functions v2** |
| **Local dev** | **netlify-cli** | **latest** | **NEW (dev dep) — Local function serving + env var management** |
| **Strava API** | **Direct fetch()** | **v3** | **NEW — No wrapper library, native fetch with Bearer auth** |
| **Results storage** | **JSON in git** | **N/A** | **NEW — Committed JSON file, same pattern as existing data files** |
| **Build triggers** | **Netlify Build Hooks** | **N/A** | **NEW — POST to webhook URL triggers site rebuild** |
| Deployment | Netlify | N/A | No change (add functions directory + netlify.toml) |
| Runtime | Node.js 22 | 22.22.2 (Volta) | No change |

---

## Sources

### Strava API (HIGH confidence — official documentation)
- [Strava Authentication](https://developers.strava.com/docs/authentication/) — OAuth 2.0 flow, token exchange, refresh mechanism
- [Strava Rate Limits](https://developers.strava.com/docs/rate-limits/) — 100 reads/15min, 1,000 reads/day
- [Strava API Reference](https://developers.strava.com/docs/reference/) — Endpoint specifications
- [Strava Getting Started](https://developers.strava.com/docs/getting-started/) — Application registration, initial token setup
- [Changes to the Segments API](https://developers.strava.com/docs/segment-changes/) — Leaderboard endpoint removed May 2020, `xoms` available via segment detail

### Strava API (MEDIUM confidence — community-confirmed, not in official spec)
- [Accessing KOM/QOM data for segment](https://communityhub.strava.com/developers-api-7/accessing-kom-qom-data-for-segment-1999) — Confirms `xoms` and `local_legend` fields in segment detail response

### Netlify Functions (HIGH confidence — official documentation)
- [Functions Overview](https://docs.netlify.com/build/functions/overview/) — Types, limits (60s timeout, 1024MB memory)
- [Get Started with Functions](https://docs.netlify.com/build/functions/get-started/) — v2 format, .mts extension, Web Standard API
- [Environment Variables in Functions](https://docs.netlify.com/build/functions/environment-variables/) — `process.env` for serverless, `Netlify.env.get()` for edge, scope requirements
- [Scheduled Functions](https://docs.netlify.com/build/functions/scheduled-functions/) — Cron syntax, 30s limit, only on published deploys
- [Build Hooks](https://docs.netlify.com/build/configure-builds/build-hooks/) — POST to trigger rebuilds

### Astro + Netlify (HIGH confidence — official documentation)
- [Deploy Astro to Netlify](https://docs.astro.build/en/guides/deploy/netlify/) — Static sites don't need adapter
- [Astro Netlify Adapter](https://docs.astro.build/en/guides/integrations-guide/netlify/) — Only for SSR/on-demand rendering
- [Astro 6 on Netlify](https://www.netlify.com/changelog/2026-03-10-astro-6/) — Astro 6 works on day one; `import.meta.env` inlined at build time (use `process.env` for runtime)

### Known Issues (MEDIUM confidence — community reports)
- [Functions v2 env vars intermittently missing](https://answers.netlify.com/t/functions-v2-export-default-intermittently-missing-all-user-defined-env-vars-at-runtime/160958) — March 2026 report of user-defined env vars absent at runtime
