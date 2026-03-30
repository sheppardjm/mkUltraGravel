# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-30)

**Core value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.
**Current focus:** v5.0 Phase 29 — Strava OAuth + Activity Submission

## Current Position

Milestone: v5.0 — Strava Integration + Results
Phase: 29 of 31 (Strava OAuth + Activity Submission)
Plan: 01 of 02 complete
Status: In progress
Last activity: 2026-03-30 — Completed 29-01 (netlify.toml + strava-auth.js + submit.astro)

Progress: v1.0: 30 plans | v2.0: 15 plans | v3.0: 6 plans | v4.0: 7 plans | v5.0: █████░░░░░ 50% (phases 27-29 plan 01 complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 62
- v1.0: 30 plans across 10 phases (2 days)
- v2.0: 15 plans across 6 phases (3 days)
- v3.0: 6 plans across 5 phases (2 days)
- v4.0: 7 plans across 5 phases (4 days)
- v5.0: 5 plans across 2.5 phases (1 day, in progress)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

**29-01 key decisions:**
- Netlify Functions v1 (`exports.handler`) used for all Phase 29 functions — active v2 env var bug as of 2026-03-28
- OAuth state = base64url JSON `{nonce, activityUrl}` — activity URL survives round-trip without server storage
- `activity:read_all` scope required (not `activity:read`) for `include_all_efforts=true` to work
- STRAVA_CLIENT_SECRET only in strava-callback.js (Plan 02), not strava-auth.js

### Pending Todos

None.

### Blockers/Concerns

- **[Active]** Build environment: default PATH uses node@20, Astro requires node>=22. Use node@25 at /usr/local/opt/node@25/bin/
- **[Active]** Strava API app must be registered and submitted for review NOW -- 2-4 week review blocks Phase 29 OAuth flow
- **[Resolved]** Strava TOS concern: v5.0 uses consent-based hybrid model (VeloViewer precedent), not scraping

## Session Continuity

Last session: 2026-03-30T19:23:06Z
Stopped at: Phase 29 Plan 01 complete — ready for Plan 02 (strava-callback.js)
Resume file: None
