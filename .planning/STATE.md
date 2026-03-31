# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-30)

**Core value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.
**Current focus:** v6.0 UI Polish + Dev Tools — Phase 35 (Site Navigation) complete. v6.0 milestone COMPLETE.

## Current Position

Milestone: v6.0 UI Polish + Dev Tools — COMPLETE
Phase: 35 of 35 (Site Navigation)
Plan: 01 of 01 complete
Status: Phase complete — v6.0 milestone complete
Last activity: 2026-03-30 — Phase 35 Plan 01 (Site Navigation) completed and verified

Progress: v1.0: 30 plans | v2.0: 15 plans | v3.0: 6 plans | v4.0: 7 plans | v5.0: 10 plans | v6.0: 3 plans | Total: 71 plans shipped

## Performance Metrics

**Velocity:**
- Total plans completed: 71
- v1.0: 30 plans across 10 phases (2 days)
- v2.0: 15 plans across 6 phases (3 days)
- v3.0: 6 plans across 5 phases (2 days)
- v4.0: 7 plans across 5 phases (4 days)
- v5.0: 10 plans across 6 phases (4 days)
- v6.0: 3 plans across 3 phases (complete)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

Recent decisions affecting current work:
- **[Phase 33]**: starColors extracted to src/lib/starColors.ts — follow src/lib/ pattern for shared constants; import in both SSR frontmatter and browser script tags
- **[Phase 34-01]**: Used annotation label sub-object (Option A, not CSS overlay Option B) — y-axis offset alignment proved reliable; display:true required on each label (Chart.js annotation default is false); stagger via yAdjust i%2 alternation; narrow sector (<1.0mi) gets rotation:-90 with stars-only content
- **[Phase 35-01]**: Used Astro.url.pathname (build-time) for active link detection — no client JS, no FOUC; aria-current="page" is the CSS hook; /submit-confirm treated as part of /submit flow in isActive(); z-index 10000 for nav clears grain (9999) and Escher (9998) overlays

### Pending Todos

None.

### Blockers/Concerns

- **[Active]** Strava API app must be registered and submitted for review — 2-4 week review blocks OAuth flow going live
- **[Active]** 7 environment variables must be configured in Netlify dashboard before submission functions can run (STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REDIRECT_URI, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, NETLIFY_BUILD_HOOK)
- **[Active]** Build environment: default PATH uses node@20, Astro requires node>=22. Use node@25 at /usr/local/opt/node@25/bin/

## Session Continuity

Last session: 2026-03-30
Stopped at: Phase 35 Plan 01 complete and verified — v6.0 milestone complete
Resume file: None
