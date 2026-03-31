# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-31)

**Core value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.
**Current focus:** v7.0 Strava Go-Live — Phase 36: Environment Configuration

## Current Position

Milestone: v7.0 Strava Go-Live
Phase: 36 of 40 (Environment Configuration)
Plan: — (not yet planned)
Status: Ready to plan
Last activity: 2026-03-31 — v7.0 roadmap created (5 phases, 21 requirements mapped)

Progress: [██████████░░░░░░░░░░] ~50% (71/~85 estimated plans shipped)

## Performance Metrics

**Velocity:**
- Total plans completed: 71
- v1.0: 30 plans across 10 phases (2 days)
- v2.0: 15 plans across 6 phases (3 days)
- v3.0: 6 plans across 5 phases (2 days)
- v4.0: 7 plans across 5 phases (4 days)
- v5.0: 10 plans across 6 phases (4 days)
- v6.0: 3 plans across 3 phases (1 day)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

Recent decisions affecting v7.0:
- Netlify Functions v1 (`exports.handler`) kept as-is — v2 env var bug fix only 24 hours old at research time; migration introduces risk with zero functional gain before go-live
- `STRAVA_REDIRECT_URI` must use direct function URL (`/.netlify/functions/strava-callback`), not the `/api/` rewrite alias

### Pending Todos

None.

### Blockers/Concerns

- **[Active]** REVIEW-03 (app approved) is externally gated — 7-10 business days minimum, community reports 1-4 weeks. Submit review (Phase 40) immediately after Phase 38 completes. If not approved by ~May 28, escalate to `developers@strava.com` and prepare manual result-collection contingency.
- **[Active]** `STRAVA_REDIRECT_URI` confirmed absent from local `.env` — must be set in Netlify dashboard during Phase 36 or OAuth will fail silently.
- **[Active]** GitHub PAT may have been created with expiry — verify no expiry before June 7 during Phase 36.
- **[Active]** Safari SameSite=Lax CSRF cookie bug (WebKit #219650) — test explicitly in Safari during Phase 38; document behavior if observed.
- **[Active]** `STRAVA_VERIFY_TOKEN` may not exist yet — choose a value, set in Netlify dashboard during Phase 36, record securely.

## Session Continuity

Last session: 2026-03-31
Stopped at: v7.0 roadmap created — ready to plan Phase 36
Resume file: None
