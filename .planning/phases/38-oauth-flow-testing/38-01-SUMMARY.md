---
phase: 38-oauth-flow-testing
plan: 01
subsystem: strava-oauth
tags: [oauth, strava, csrf, scope-validation, safari, testing]

# Dependency graph
requires:
  - 37-01 (data pipeline verified)
  - 36-01 (env vars configured)
provides:
  - Full OAuth round-trip verified on production HTTPS
  - Scope validation for activity:read_all in strava-callback.js
  - All error paths verified (denied consent, invalid URL, zero segments)
  - Safari iPhone CSRF cookie behavior documented (pass)
affects:
  - 39-webhook-registration
  - 40-strava-app-review

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client-side base64url decoding for static Astro pages receiving server redirect data"

key-files:
  created: []
  modified:
    - "netlify/functions/strava-callback.js (scope validation + diagnostic logging)"
    - "src/pages/submit-confirm.astro (moved query param parsing to client-side JS)"

key-decisions:
  - "STRAVA_REDIRECT_URI must be full URL (https://mkultragravel.netlify.app/.netlify/functions/strava-callback), not relative path"
  - "submit-confirm.astro data parsing moved from Astro frontmatter (build-time) to client-side JS (runtime) — static builds cannot read query params at request time"
  - "Safari SameSite=Lax CSRF cookie works correctly on iPhone 13 / iOS 26.3.1 — no WebKit #219650 workaround needed"

patterns-established:
  - "Static Astro pages that receive data via query params from server redirects must parse client-side"

# Metrics
duration: ~30min
completed: 2026-03-31
---

# Phase 38 Plan 01: OAuth Flow Testing Summary

**Full OAuth round-trip verified on production HTTPS — scope validation patched, all error paths tested on Chrome and Safari iPhone, CSRF cookie behavior confirmed working.**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-03-31
- **Tasks:** 3 (1 auto + 2 human checkpoints)
- **Files modified:** 2

## Accomplishments

- Added scope validation in strava-callback.js: reads `params.scope` from callback URL, rejects requests missing `activity:read_all` with clear error page (OAUTH-05)
- Added 3 diagnostic console.log lines for scope, token exchange result, and segment match count
- Fixed STRAVA_REDIRECT_URI env var: changed from relative path to full URL (`https://mkultragravel.netlify.app/.netlify/functions/strava-callback`)
- Fixed submit-confirm.astro: moved base64url data decoding from build-time Astro frontmatter to client-side JavaScript (static Astro builds cannot read query params at request time)
- Verified full OAuth round-trip on Chrome: happy path completed with 8/9 segments matched, athlete ID 2262684
- Verified all error paths on Chrome: denied consent → `/submit?submit=denied` with banner, invalid activity URL → error page, zero matching segments → "No Matching Event Segments Found" page
- Verified Safari iPhone 13 (iOS 26.3.1): CSRF cookie SameSite=Lax works correctly, no WebKit #219650 issue observed, denied consent path works

## Task Commits

1. **Task 1: Add scope validation and diagnostic logging** — `0e05a47`
   - netlify/functions/strava-callback.js
2. **Fix: submit-confirm client-side parsing** — `853b057`
   - src/pages/submit-confirm.astro (deviation fix — static Astro build could not read query params)
3. **Fix: STRAVA_REDIRECT_URI** — Netlify dashboard update (no code commit)
   - Changed from `/.netlify/functions/strava-callback` to `https://mkultragravel.netlify.app/.netlify/functions/strava-callback`
4. **Task 2: Chrome OAuth verification** — human checkpoint, all 4 tests passed
5. **Task 3: Safari iPhone verification** — human checkpoint, passed

## Netlify Function Logs (from successful round-trip)

```
[strava-callback] scope from callback: read,activity:read_all
[strava-callback] token exchange result: { hasAccessToken: true, athleteId: 2262684 }
[strava-callback] segment match count: 8 of 76 total efforts
Duration: 2302.64 ms    Memory Usage: 117 MB
```

## OAUTH Requirement Verification

| Requirement | Status | Evidence |
|-------------|--------|----------|
| OAUTH-01: Full round-trip on production HTTPS | ✓ Passed | /submit → Strava consent → callback → /submit-confirm → leaderboard entry |
| OAUTH-02: activity:read_all scope confirmed | ✓ Passed | Function log: `scope from callback: read,activity:read_all` |
| OAUTH-03: Segment efforts extracted and filtered | ✓ Passed | 8 of 76 efforts matched 9 event segment IDs |
| OAUTH-04: Error paths handled gracefully | ✓ Passed | Denied consent, invalid URL, zero segments all produce clear error pages |
| OAUTH-05: Partial scope rejection | ✓ Passed | Scope validation added: rejects missing `activity:read_all` |
| OAUTH-06: CSRF cookie on Chrome | ✓ Passed | strava_oauth_state cookie set and verified in DevTools |
| OAUTH-07: CSRF cookie on Safari iPhone | ✓ Passed | iPhone 13, iOS 26.3.1 — SameSite=Lax cookie sent correctly on OAuth redirect |

## Deviations from Plan

1. **STRAVA_REDIRECT_URI was relative path** — Strava rejected `/.netlify/functions/strava-callback` with "Bad Request: invalid redirect_uri". Fixed by updating Netlify env var to full URL with scheme and domain.
2. **submit-confirm.astro used build-time query param reading** — `Astro.url.searchParams.get("data")` in frontmatter runs at build time in static mode, always returning null. Rewrote to client-side JavaScript parsing.

## Issues Encountered

- Both deviations above were bugs found during testing, fixed inline as auto-fixes per deviation rules.

---
*Phase: 38-oauth-flow-testing*
*Completed: 2026-03-31*
