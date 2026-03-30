# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-30)

**Core value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.
**Current focus:** v5.0 Phase 30 — Results Page + Leaderboards

## Current Position

Milestone: v5.0 — Strava Integration + Results
Phase: 30 of 31 (Results Page + Leaderboards)
Plan: —
Status: Ready to plan
Last activity: 2026-03-30 — Phase 29 complete (2 plans, verified 5/5 must-haves)

Progress: v1.0: 30 plans | v2.0: 15 plans | v3.0: 6 plans | v4.0: 7 plans | v5.0: ██████░░░░ 60% (phases 27-29 complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 64
- v1.0: 30 plans across 10 phases (2 days)
- v2.0: 15 plans across 6 phases (3 days)
- v3.0: 6 plans across 5 phases (2 days)
- v4.0: 7 plans across 5 phases (4 days)
- v5.0: 6 plans across 3 phases (1 day, in progress)

**Phase 29 verified:** 5/5 must-haves passed. Full OAuth pipeline wired end-to-end.

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

**29-02 key decisions:**
- ALL_SEGMENT_IDS uses Set of string literals — Strava returns segment.id as integer, String() cast required
- Gender captured from form (M/F/NB), not Strava profile — schema intent + self-identification
- submit-result.js returns HTML success directly (not 302 redirect) — avoids extra round-trip
- CSRF cookie cleared in strava-callback 302 redirect response — Max-Age=0 prevents replay
- Fire-and-forget Netlify build hook — submission must not fail if hook is slow/unavailable

**29-01 key decisions:**
- Netlify Functions v1 (`exports.handler`) used for all Phase 29 functions — active v2 env var bug as of 2026-03-28
- OAuth state = base64url JSON `{nonce, activityUrl}` — activity URL survives round-trip without server storage
- `activity:read_all` scope required (not `activity:read`) for `include_all_efforts=true` to work
- STRAVA_CLIENT_SECRET only in strava-callback.js (Plan 02), not strava-auth.js

### Pending Todos

None.

### Blockers/Concerns

- **[Active]** Strava API app must be registered and submitted for review NOW -- 2-4 week review blocks Phase 29 OAuth flow going live
- **[Active]** 7 environment variables must be configured in Netlify dashboard before Phase 29 functions can run (STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REDIRECT_URI, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, NETLIFY_BUILD_HOOK)
- **[Active]** Build environment: default PATH uses node@20, Astro requires node>=22. Use node@25 at /usr/local/opt/node@25/bin/
- **[Resolved]** Strava TOS concern: v5.0 uses consent-based hybrid model (VeloViewer precedent), not scraping

## Session Continuity

Last session: 2026-03-30
Stopped at: Phase 29 verified and complete — ready for Phase 30 (Results Page + Leaderboards)
Resume file: None
