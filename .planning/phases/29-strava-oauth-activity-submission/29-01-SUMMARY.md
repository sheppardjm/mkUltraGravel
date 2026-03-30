---
phase: 29-strava-oauth-activity-submission
plan: 01
subsystem: auth
tags: [strava, oauth, netlify-functions, csrf, serverless, astro]

# Dependency graph
requires:
  - phase: 28-scoring-engine-results-schema
    provides: scoring engine and results schema that the callback function will use

provides:
  - netlify.toml with build config, functions directory, and /api/* redirect rule
  - strava-auth.js Netlify Function (v1 handler) for OAuth initiation with CSRF protection
  - submit.astro page at /submit for activity URL entry

affects:
  - 29-02 (strava-callback function must decode the base64url state set by strava-auth.js)
  - any future Netlify Function phases (v1 handler syntax pattern established)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Netlify Functions v1 syntax (exports.handler) — avoids active v2 env var intermittent bug"
    - "OAuth state = base64url-encoded JSON {nonce, activityUrl} for round-trip state survival"
    - "Double-submit cookie pattern: nonce in cookie + full state param for CSRF verification"
    - "/api/* → /.netlify/functions/:splat redirect in netlify.toml for clean URLs"

key-files:
  created:
    - netlify.toml
    - netlify/functions/strava-auth.js
    - src/pages/submit.astro
  modified: []

key-decisions:
  - "Use Netlify Functions v1 (exports.handler) not v2 (export default) due to active env var bug confirmed 2026-03-28"
  - "Encode activityUrl in OAuth state parameter as base64url JSON alongside CSRF nonce — survives OAuth round-trip without server-side storage"
  - "scope: activity:read_all (not activity:read) required for include_all_efforts=true to work reliably"
  - "STRAVA_CLIENT_SECRET not referenced in strava-auth.js — it belongs in strava-callback.js (Plan 02) for token exchange"

patterns-established:
  - "netlify/functions/*.js files follow exports.handler pattern"
  - "CSRF: nonce in HttpOnly Secure SameSite=Lax cookie, full state as base64url JSON in OAuth state param"
  - "Form pages in Astro use client-side validation script before redirecting to Netlify Function"

# Metrics
duration: 3min
completed: 2026-03-30
---

# Phase 29 Plan 01: Strava OAuth Entry Point Summary

**Netlify infra (netlify.toml + /api/* redirect) + strava-auth.js OAuth initiation with double-submit CSRF cookie + /submit form page with client-side Strava URL validation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-30T19:20:44Z
- **Completed:** 2026-03-30T19:23:06Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Netlify build configuration established: `npm run build` → `dist/`, functions in `netlify/functions/`, `/api/*` proxy redirect
- OAuth initiation function with CSRF protection: validates Strava URL, generates 16-byte hex nonce, encodes `{nonce, activityUrl}` as base64url JSON state, sets 10-minute HttpOnly cookie, redirects to Strava with `activity:read_all` scope
- Submit form page at `/submit` with dark-theme styling matching the MK Ultra brand, client-side URL validation, and OAuth-denial error alert

## Task Commits

Each task was committed atomically:

1. **Task 1: Create netlify.toml and strava-auth.js OAuth initiation function** - `f9b2e94` (feat)
2. **Task 2: Create submit.astro entry form page** - `85275a1` (feat)

**Plan metadata:** (see this file's commit)

## Files Created/Modified
- `netlify.toml` - Build config, functions dir, /api/* redirect to /.netlify/functions/:splat
- `netlify/functions/strava-auth.js` - OAuth initiation: URL validation, CSRF nonce, base64url state, Strava redirect
- `src/pages/submit.astro` - Activity URL entry form at /submit with client-side validation and denial alert

## Decisions Made
- **v1 handler syntax only:** Used `exports.handler` (not `export default`) for all Netlify Functions due to confirmed active env var intermittent bug in v2 as of 2026-03-28. This pattern is established for all Phase 29 functions.
- **Activity URL in OAuth state:** The activity URL is encoded in the OAuth state parameter as base64url JSON alongside the CSRF nonce, eliminating any need for server-side session storage. The callback function decodes it from the state.
- **`activity:read_all` scope:** Required (not just `activity:read`) to use `include_all_efforts=true` on the Strava Activities API and access segment efforts from private activities reliably.
- **STRAVA_CLIENT_SECRET placement:** Intentionally absent from strava-auth.js. The client secret is only needed for the token exchange in the callback function (Plan 02) to minimize its exposure surface.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Before this flow can be tested live, the following must be configured in external dashboards. The code is complete but OAuth will not work without these:

**Strava (strava.com/settings/api):**
- Register API application (or verify existing)
- Set Authorization Callback Domain to `mkultragravel.netlify.app`

**Netlify (Site → Environment Variables):**
Add with scope "Functions" (NOT in netlify.toml — build-time vars are not available at function runtime):
- `STRAVA_CLIENT_ID` — from strava.com/settings/api → Client ID
- `STRAVA_CLIENT_SECRET` — from strava.com/settings/api → Client Secret
- `STRAVA_REDIRECT_URI` — set to `https://mkultragravel.netlify.app/.netlify/functions/strava-callback`

## Next Phase Readiness
- Plan 02 (strava-callback.js) can be executed: it decodes the base64url state from this function, verifies nonce matches cookie, exchanges code for token, fetches activity
- The `/submit` page is live and functional for user testing immediately after deploy
- Strava Developer Program review (Single Player Mode → multi-athlete) is the only blocker for real athlete testing — submit form if not done

---
*Phase: 29-strava-oauth-activity-submission*
*Completed: 2026-03-30*
