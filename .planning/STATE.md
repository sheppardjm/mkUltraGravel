# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-30)

**Core value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.
**Current focus:** v5.0 — Strava Integration + Results

## Current Position

Milestone: v5.0 — Strava Integration + Results
Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-30 — Milestone v5.0 started

Progress: v1.0: 30 plans | v2.0: 15 plans | v3.0: 6 plans | v4.0: 7 plans | v5.0: ░░░░░░░░░░ 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 58
- v1.0: 30 plans across 10 phases (2 days)
- v2.0: 15 plans across 6 phases (3 days)
- v3.0: 6 plans across 5 phases (2 days)
- v4.0: 7 plans across 5 phases (4 days)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

### Pending Todos

None.

### Blockers/Concerns

- **[Active]** onHover performance on mid-range Android unverified (deferred to future milestone)
- **[Active]** Build environment: default PATH uses node@20, Astro requires node>=22. Use node@25 at /usr/local/opt/node@25/bin/
- **[New]** Strava API TOS: previous decision to drop Strava integration was for scraping leaderboards. v5.0 uses OAuth-authorized access — needs research to confirm TOS compliance
- **[New]** Strava API rate limits: 100 req/15min, 1000/day — need to understand impact on build-time segment data fetching

## Session Continuity

Last session: 2026-03-30
Stopped at: v5.0 milestone questioning complete, ready for research/requirements
Resume file: None
