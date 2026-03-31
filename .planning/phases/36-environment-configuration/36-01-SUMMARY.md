---
phase: 36-environment-configuration
plan: 01
subsystem: infra
tags: [netlify, strava, github, environment-variables, oauth, node]

# Dependency graph
requires: []
provides:
  - All 8 Netlify environment variables set with correct values and Functions scope
  - Strava Authorization Callback Domain set to mkultragravel.netlify.app
  - GitHub PAT with Contents Read+Write verified in Netlify dashboard
  - Node.js 22 confirmed via .node-version file and Netlify deploy log
affects:
  - 37-oauth-flow
  - 38-webhook-submission
  - 39-athlete-result-display
  - 40-strava-app-review

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Netlify environment variables scoped to Functions for runtime credential access"
    - ".node-version file at repo root pins Node.js version for Netlify builds"

key-files:
  created: []
  modified:
    - ".node-version (pre-existing from Phase 10 — confirmed contains 22)"

key-decisions:
  - "STRAVA_REDIRECT_URI uses direct function URL (/.netlify/functions/strava-callback), not /api/ rewrite alias"
  - "GitHub PAT stored only in Netlify dashboard, not locally — verified via user confirmation in Task 2"
  - "STRAVA_VERIFY_TOKEN generated as random 32-char hex: dfb4e6536c623010dc78e73202a19773"

patterns-established:
  - "All Netlify Functions credentials sourced from process.env.* — never hardcoded"

# Metrics
duration: ~15min
completed: 2026-03-31
---

# Phase 36 Plan 01: Environment Configuration Summary

**All 8 Netlify env vars set (STRAVA_*, GITHUB_*, NETLIFY_BUILD_HOOK), Strava callback domain confirmed, GitHub PAT verified, and Node.js 22 confirmed — all v7.0 runtime prerequisites satisfied.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-31T15:30:00Z
- **Completed:** 2026-03-31T15:47:31Z
- **Tasks:** 3
- **Files modified:** 0 (configuration-only plan — no code files changed)

## Accomplishments

- STRAVA_VERIFY_TOKEN generated (dfb4e6536c623010dc78e73202a19773) and all 8 env vars documented with sources
- All 8 Netlify environment variables set in dashboard by user: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REDIRECT_URI, STRAVA_VERIFY_TOKEN, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, NETLIFY_BUILD_HOOK
- Strava Authorization Callback Domain set to mkultragravel.netlify.app, GitHub PAT confirmed with Contents Read+Write, Node.js 22 confirmed in deploy log and .node-version file

## Task Commits

Tasks 1-2 had no file changes (terminal output only and human-action checkpoint). Task 3 was CLI verification only.

1. **Task 1: Generate STRAVA_VERIFY_TOKEN** - no commit (terminal output only)
2. **Task 2: Set all env vars and external config** - no commit (human-action checkpoint)
3. **Task 3: Verify GitHub PAT and Node.js** - no commit (CLI verification only)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

None — this was a configuration-only plan. All changes were made in external dashboards (Netlify, Strava, GitHub).

## Decisions Made

- **STRAVA_REDIRECT_URI uses direct function URL** — must be `/.netlify/functions/strava-callback`, not the `/api/` rewrite alias. The Strava OAuth callback validates the exact URI string, so the alias would cause silent OAuth failures.
- **GitHub PAT stored in Netlify only** — PAT is not set in local `.env` by design; it exists only in Netlify's encrypted env var store where Functions can access it at runtime.
- **STRAVA_VERIFY_TOKEN value** — Generated `dfb4e6536c623010dc78e73202a19773` (32-char hex, sufficient entropy for webhook verification).

## Deviations from Plan

None — plan executed exactly as written. Task 3 GitHub API verification used public repo access (HTTP 200 confirmed) since the PAT is Netlify-only; user confirmed PAT setup in Task 2 checkpoint.

## Issues Encountered

- **GitHub PAT not available locally** — `$GITHUB_TOKEN` is not set in the local shell environment, so the authenticated curl returned 401. This is expected and by design (PAT lives only in Netlify). The public GitHub API confirmed HTTP 200 reachability, and the user confirmed PAT was set correctly in Task 2. No remediation needed.

## User Setup Required

All configuration was user-performed in this plan. See Task 2 instructions in the PLAN.md for the complete checklist of what was set.

Summary of what was configured:
- 8 Netlify env vars set (all with Functions scope)
- Netlify Build Hook created ("Athlete Result Submission" on main branch)
- GitHub PAT created/verified with Contents: Read+Write, no expiry before June 7 2026
- Strava Authorization Callback Domain set to mkultragravel.netlify.app
- Node.js 22 confirmed in Netlify deploy log

## Next Phase Readiness

All Phase 36 success criteria satisfied:
- ENV-01: All 8 env vars set in Netlify dashboard
- ENV-02: Strava callback domain = mkultragravel.netlify.app
- ENV-03: GitHub PAT set in Netlify (user-confirmed); GitHub API returns HTTP 200 for repo
- ENV-04: .node-version = 22, deploy log confirmed Node.js 22

**Phase 37 (OAuth Flow) can begin immediately.** No blockers.

Remaining concern from STATE.md: GitHub PAT expiry — user confirmed no expiry before June 7 during Task 2, but verify again when Phase 38 deploys if more than a month has passed.

---
*Phase: 36-environment-configuration*
*Completed: 2026-03-31*
