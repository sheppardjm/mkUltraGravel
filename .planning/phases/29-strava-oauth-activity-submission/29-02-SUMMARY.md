---
phase: 29-strava-oauth-activity-submission
plan: 02
subsystem: auth
tags: [strava, oauth, netlify-functions, github-api, astro, csrf, serverless]

# Dependency graph
requires:
  - phase: 29-01
    provides: netlify.toml, strava-auth.js (OAuth initiation with CSRF nonce), submit.astro

provides:
  - strava-callback.js — OAuth code exchange, segment effort extraction, CSRF verification, redirect to confirm page
  - submit-confirm.astro — Gender/consent confirmation form with extracted segment data
  - submit-result.js — Schema-conforming athlete JSON commit via GitHub Contents API + Netlify rebuild trigger

affects:
  - Phase 30+ (results display): athletes/ directory will contain per-athlete JSON files conforming to schema.json
  - Any rebuild/scoring pipeline: NETLIFY_BUILD_HOOK triggers full site rebuild on each submission

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GitHub Contents API GET-then-PUT pattern — GET retrieves SHA for updates, 404 means new file, 409 means race condition"
    - "Base64url for OAuth round-trip data (browser URLs); standard base64 for GitHub API content field"
    - "Fire-and-forget rebuild trigger — Netlify build hook POST not awaited, submission succeeds even if hook fails"
    - "Astro server-side decode in frontmatter — Buffer.from(rawData, 'base64url') in .astro frontmatter"

key-files:
  created:
    - netlify/functions/strava-callback.js
    - netlify/functions/submit-result.js
    - src/pages/submit-confirm.astro
  modified: []

key-decisions:
  - "ALL_SEGMENT_IDS defined as Set of string literals — Strava returns segment.id as number, String() cast required before Set.has()"
  - "Gender captured from form (M/F/NB), NOT from Strava profile — aligns with Phase 28 schema intent and self-identification principle"
  - "submit-result.js returns HTML success page directly (not redirect) — avoids second round-trip and flash of unstyled content"
  - "CSRF cookie cleared in strava-callback.js 302 redirect response — consumed once, Max-Age=0 prevents replay"
  - "Athlete name sourced from tokenData.athlete (inline in token exchange response) — no separate /api/athlete call needed"

patterns-established:
  - "All error states return styled HTML with link back to /submit (not raw text/JSON)"
  - "build environment: PATH must include /usr/local/opt/node@25/bin/ — default node@20 rejects Astro >=22 requirement"

# Metrics
duration: 4min
completed: 2026-03-30
---

# Phase 29 Plan 02: OAuth Callback + Confirmation + Result Submission Summary

**One-liner:** Strava OAuth callback with CSRF verification and segment filtering, gender/consent confirmation form, GitHub Contents API commit with GET-then-PUT pattern, and Netlify rebuild trigger.

## What Was Built

The core of the MK Ultra Gravel submission pipeline — three files that complete the journey from Strava OAuth authorization to a committed athlete result file:

1. **`netlify/functions/strava-callback.js`** — Handles Strava's OAuth redirect. Verifies the CSRF state nonce (base64url-decoded state param vs. HttpOnly cookie), exchanges the authorization code for an access token, fetches the activity with `include_all_efforts=true`, filters to the 9 official event segment IDs (cast to strings), rejects activities with zero matches with a user-friendly HTML error page, and redirects to `/submit-confirm` with the result payload as a base64url query parameter.

2. **`src/pages/submit-confirm.astro`** — Confirmation page decoding the payload server-side in frontmatter. Displays athlete name, matched segment count (e.g. "7 of 9"), and activity URL. Renders a gender category dropdown (M/F/NB) and a public consent checkbox. POSTs to `/api/submit-result`. Includes client-side validation mirroring the server-side checks. Handles decode failures gracefully with a link back to `/submit`.

3. **`netlify/functions/submit-result.js`** — Validates consent (`yes`) and gender (`M`, `F`, or `NB`). Decodes and validates the result payload. Builds a schema-conforming athlete result object (athleteId, name, gender, activityUrl, submittedAt, segments). Commits via GitHub Contents API using GET-then-PUT (GET retrieves SHA for updates; 404 means first submission; 409 returns a conflict page). Triggers a Netlify rebuild via `NETLIFY_BUILD_HOOK` (fire-and-forget). Returns an HTML success confirmation page.

## Decisions Made

| Decision | Rationale |
|---|---|
| `String()` cast for segment IDs | Strava API returns `segment.id` as integer; Set contains string literals |
| Gender from form, not Strava | Schema intent + self-identification principle; Strava profile gender is unreliable |
| Direct HTML success response | Avoids extra round-trip redirect; submission result visible immediately |
| CSRF cookie cleared at redirect | HttpOnly cookie consumed once; Max-Age=0 prevents replay attacks |
| Fire-and-forget rebuild trigger | Submission must not fail if Netlify build hook is slow or unavailable |

## Full Submission Flow

```
/submit (submit.astro)
  └─ GET /api/strava-auth (strava-auth.js)
       └─ 302 → strava.com/oauth/authorize (sets strava_oauth_state cookie)
            └─ 302 → /api/strava-callback (strava-callback.js)
                 ├─ Verify CSRF nonce
                 ├─ POST strava.com/api/v3/oauth/token
                 ├─ GET strava.com/api/v3/activities/{id}?include_all_efforts=true
                 ├─ Filter to 9 event segments
                 └─ 302 → /submit-confirm?data={base64url} (submit-confirm.astro)
                      └─ POST /api/submit-result (submit-result.js)
                           ├─ Validate consent + gender
                           ├─ GET api.github.com/repos/.../contents/athletes/{id}.json
                           ├─ PUT api.github.com/repos/.../contents/athletes/{id}.json
                           ├─ POST NETLIFY_BUILD_HOOK (fire-and-forget)
                           └─ 200 HTML success page
```

## Required Environment Variables

Set in Netlify dashboard (Site → Environment variables), scope: Functions:

| Variable | Source |
|---|---|
| `STRAVA_CLIENT_ID` | Strava API app dashboard |
| `STRAVA_CLIENT_SECRET` | Strava API app dashboard |
| `STRAVA_REDIRECT_URI` | `https://{site}/.netlify/functions/strava-callback` |
| `GITHUB_TOKEN` | GitHub Fine-grained PAT, Contents: Read+Write on mkUltraGravel |
| `GITHUB_OWNER` | GitHub username (e.g. Sheppardjm) |
| `GITHUB_REPO` | Repository name (e.g. mkUltraGravel) |
| `NETLIFY_BUILD_HOOK` | Netlify dashboard → Build & deploy → Build hooks |

## Deviations from Plan

None — plan executed exactly as written.

## Next Phase Readiness

Phase 29 complete. The submission pipeline is fully implemented end-to-end.

Blockers before going live:
- Strava API app must complete Strava's review process (2-4 week SLA) — initiated separately
- All 7 environment variables must be configured in Netlify dashboard before functions can run
- The `public/data/results/athletes/` directory does not need to exist in advance — GitHub API will create it on first commit

Phase 30+ (results display page) can be built against the schema at `public/data/results/schema.json`. Athlete files will appear at `public/data/results/athletes/{athleteId}.json` after first submissions.
