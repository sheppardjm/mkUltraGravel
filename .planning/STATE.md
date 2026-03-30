# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-30)

**Core value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.
**Current focus:** v5.0 Phase 31 — Final phase

## Current Position

Milestone: v5.0 — Strava Integration + Results
Phase: 31 of 31 (Deauthorization Webhook + Privacy)
Plan: 1 of 1
Status: Phase complete — v5.0 COMPLETE
Last activity: 2026-03-30 — Completed 31-01-PLAN.md (deauth webhook + privacy notice)

Progress: v1.0: 30 plans | v2.0: 15 plans | v3.0: 6 plans | v4.0: 7 plans | v5.0: ██████████ 100% (phases 27-31 complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 66
- v1.0: 30 plans across 10 phases (2 days)
- v2.0: 15 plans across 6 phases (3 days)
- v3.0: 6 plans across 5 phases (2 days)
- v4.0: 7 plans across 5 phases (4 days)
- v5.0: 8 plans across 4 phases (1 day, in progress)

**Phase 30 verified:** 5/5 must-haves passed. Results page with leaderboards, gender tabs, segment rankings.

**Phase 31 complete:** Strava deauth webhook + privacy notice. v5.0 milestone complete.

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

**30-01 key decisions:**
- data-section attribute scopes tab groups independently — gravel and KOM tabs don't interfere
- details/summary HTML for sector/climb breakdowns — native expand/collapse, no JS required
- existsSync guard before readdirSync — graceful empty state if athletes directory missing
- /30 suffix on KOM points = 10pts × 3 climbs max per scoring engine design

**30-02 key decisions:**
- Combined genders per segment leaderboard (no tabs) — segment boards show cross-category performance; avoids 27 mini-boards
- Max 10 entries per segment with "and X more" overflow — keeps page compact for large post-event fields
- buildSegmentLeaderboard typed with any[] input — consistent with rest of results.astro frontmatter

**31-01 key decisions:**
- v1 exports.handler pattern — active Netlify v2 env var bug; consistent with all Phase 29 functions
- String === 'false' for updates.authorized deauth detection — Strava sends string not boolean
- athleteId = String(payload.owner_id || payload.object_id) — defensive fallback to object_id
- All POST events return 200 immediately — Strava retries on non-2xx; deauth delete is async
- Fire-and-forget build hook after deletion — rebuild must not block webhook response

### Pending Todos

None.

### Blockers/Concerns

- **[Active]** Strava API app must be registered and submitted for review NOW -- 2-4 week review blocks Phase 29 OAuth flow going live
- **[Active]** 7 environment variables must be configured in Netlify dashboard before Phase 29 functions can run (STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REDIRECT_URI, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, NETLIFY_BUILD_HOOK)
- **[Active]** Build environment: default PATH uses node@20, Astro requires node>=22. Use node@25 at /usr/local/opt/node@25/bin/
- **[Resolved]** Strava TOS concern: v5.0 uses consent-based hybrid model (VeloViewer precedent), not scraping

## Session Continuity

Last session: 2026-03-30 20:52 UTC
Stopped at: Phase 31 Plan 01 complete — v5.0 milestone complete
Resume file: None
