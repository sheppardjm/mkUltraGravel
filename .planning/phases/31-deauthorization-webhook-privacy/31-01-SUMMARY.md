---
phase: 31-deauthorization-webhook-privacy
plan: 01
subsystem: api
tags: [strava, webhook, netlify-functions, github-api, privacy, tos-compliance]

# Dependency graph
requires:
  - phase: 29-strava-oauth-submission
    provides: submit-result.js GitHub Contents API pattern and v1 handler convention
  - phase: 28-scoring-engine-results-schema
    provides: public/data/results/athletes/{id}.json file path schema
provides:
  - Strava webhook endpoint handling GET subscription validation and POST deauth events
  - deleteAthleteData helper deleting athlete JSON via GitHub Contents API
  - Privacy notice on submit page explaining data storage and 48-hour deletion guarantee
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual-method Netlify function on single endpoint (GET for handshake, POST for events)"
    - "Strava webhook verify_token matched against STRAVA_VERIFY_TOKEN env var"
    - "String === 'false' check for updates.authorized deauth detection (not boolean)"
    - "Idempotent file deletion: 404 on GET SHA = log and return, no error"

key-files:
  created:
    - netlify/functions/strava-webhook.js
  modified:
    - src/pages/submit.astro

key-decisions:
  - "v1 exports.handler pattern — same as all Phase 29 functions due to active Netlify v2 env var bug"
  - "String equality === 'false' for updates.authorized — Strava sends string not boolean per docs"
  - "athleteId = String(payload.owner_id || payload.object_id) — defensive fallback to object_id"
  - "Acknowledge 200 immediately for all POST events including deauth — Strava retries on non-2xx"
  - "Fire-and-forget build hook after deletion — same pattern as submit-result.js"

patterns-established:
  - "Strava deauth TOS pattern: GET SHA -> DELETE file -> trigger rebuild"

# Metrics
duration: 2min
completed: 2026-03-30
---

# Phase 31 Plan 01: Deauthorization Webhook + Privacy Notice Summary

**Strava deauth webhook handler (TOS 5.4 compliance) with GitHub Contents API file deletion and submit page privacy notice linking to Strava settings**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-30T20:50:23Z
- **Completed:** 2026-03-30T20:52:08Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Netlify function `strava-webhook.js` handles GET subscription validation (echoes hub.challenge or 403) and POST deauth events (deletes athlete JSON from GitHub)
- `deleteAthleteData` helper uses GET-then-DELETE pattern against GitHub Contents API with idempotent 404 handling
- Privacy notice paragraph added to submit.astro with Strava settings link and 48-hour deletion guarantee

## Task Commits

Each task was committed atomically:

1. **Task 1: Create strava-webhook.js** - `caa8245` (feat)
2. **Task 2: Add privacy notice to submit.astro** - `80d1006` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `netlify/functions/strava-webhook.js` - Dual-method Strava webhook handler (GET validation + POST deauth)
- `src/pages/submit.astro` - Added privacy notice paragraph below form footer

## Decisions Made
- v1 `exports.handler` pattern maintained — active Netlify Functions v2 env var bug means v2 is unstable
- `updates.authorized === 'false'` uses strict string equality — Strava sends the string `'false'`, not a boolean false
- `athleteId = String(payload.owner_id || payload.object_id)` — defensive fallback covers edge cases in payload shape
- All POST events return 200 regardless of deauth status — Strava retries on non-2xx, so we acknowledge immediately
- Fire-and-forget build hook after successful deletion — same pattern as submit-result.js; rebuild must not block webhook response

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration:**

1. **Environment variable:** Add `STRAVA_VERIFY_TOKEN` to Netlify dashboard > Site settings > Environment variables. Choose any secret string.

2. **Register webhook subscription (one-time, after deploy):**
   ```
   curl -X POST https://www.strava.com/api/v3/push_subscriptions \
     -F client_id=YOUR_CLIENT_ID \
     -F client_secret=YOUR_CLIENT_SECRET \
     -F callback_url=https://mkultragravel.netlify.app/.netlify/functions/strava-webhook \
     -F verify_token=YOUR_VERIFY_TOKEN
   ```

## Next Phase Readiness

Phase 31 is the final phase. This plan completes v5.0:
- Strava TOS Section 5.4 satisfied: athlete data deleted within 48 hours of deauthorization
- Submit page now communicates data storage and deletion rights to users
- Webhook subscription registration is a one-time manual step (user setup above)
- All existing env vars (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, NETLIFY_BUILD_HOOK) are reused

---
*Phase: 31-deauthorization-webhook-privacy*
*Completed: 2026-03-30*
