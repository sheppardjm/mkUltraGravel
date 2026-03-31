# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-31)

**Core value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.
**Current focus:** v7.0 Strava Go-Live — Phase 38 complete, ready for Phase 39

## Current Position

Milestone: v7.0 Strava Go-Live
Phase: 38 of 40 (OAuth Flow Testing) — COMPLETE
Plan: —
Status: Phase 38 verified and complete
Last activity: 2026-03-31 — Phase 38 verified (7/7 OAUTH must-haves passed)

Progress: [████████████░░░░░░░░] ~55% (74/~85 estimated plans shipped)

## Performance Metrics

**Velocity:**
- Total plans completed: 74
- v1.0: 30 plans across 10 phases (2 days)
- v2.0: 15 plans across 6 phases (3 days)
- v3.0: 6 plans across 5 phases (2 days)
- v4.0: 7 plans across 5 phases (4 days)
- v5.0: 10 plans across 6 phases (4 days)
- v6.0: 3 plans across 3 phases (1 day)
- v7.0: 3 plans across 3 phases (1 day, in progress)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

Recent decisions affecting v7.0:
- Netlify Functions v1 (`exports.handler`) kept as-is — v2 env var bug fix only 24 hours old at research time; migration introduces risk with zero functional gain before go-live
- `STRAVA_REDIRECT_URI` must be full URL (`https://mkultragravel.netlify.app/.netlify/functions/strava-callback`), not relative path or `/api/` rewrite alias
- `STRAVA_VERIFY_TOKEN` = dfb4e6536c623010dc78e73202a19773 (generated Phase 36, set in Netlify)
- GitHub PAT stored in Netlify env vars only (not local) — all 8 v7.0 env vars confirmed set (Phase 36)
- Added SECRETS_SCAN_OMIT_PATHS=".planning/" and SECRETS_SCAN_OMIT_KEYS="GITHUB_REPO,GITHUB_OWNER" to netlify.toml — Netlify secrets scanning was blocking builds due to env var values in .planning/ docs (Phase 37)
- Static Astro pages receiving server redirect data must parse query params client-side, not in frontmatter (Phase 38)

### Pending Todos

None.

### Blockers/Concerns

- **[Active]** REVIEW-03 (app approved) is externally gated — 7-10 business days minimum, community reports 1-4 weeks. Submit review (Phase 40) immediately after Phase 38 completes. If not approved by ~May 28, escalate to `developers@strava.com` and prepare manual result-collection contingency.
- **[Resolved]** `STRAVA_REDIRECT_URI` set in Netlify dashboard — updated to full URL during Phase 38 testing.
- **[Resolved]** GitHub PAT confirmed with Contents Read+Write, no expiry before June 7 2026 (Phase 36 complete).
- **[Resolved]** Safari SameSite=Lax CSRF cookie — works correctly on iPhone 13 / iOS 26.3.1, no WebKit #219650 workaround needed (Phase 38 verified).
- **[Resolved]** `STRAVA_VERIFY_TOKEN` generated and set in Netlify dashboard (Phase 36 complete).
- **[Resolved]** Netlify secrets scanning blocking builds — fixed with SECRETS_SCAN_OMIT_PATHS/KEYS in netlify.toml (Phase 37 complete).
- **[Resolved]** GitHub PAT expiry — user confirmed no expiry before June 7 2026, re-verified during Phase 38 deploy.

## Session Continuity

Last session: 2026-03-31
Stopped at: Phase 38 verified and complete — ready for Phase 39 (Webhook Registration)
Resume file: None
