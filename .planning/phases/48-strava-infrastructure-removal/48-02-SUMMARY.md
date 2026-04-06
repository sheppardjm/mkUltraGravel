---
phase: 48-strava-infrastructure-removal
plan: 02
subsystem: infra
tags: [netlify, strava, cleanup, scoring, vitest, toml]

# Dependency graph
requires:
  - phase: 48-01
    provides: Deleted Strava-gated pages (results.astro, submit.astro, submit-confirm.astro) — safe to remove scoring.js and Netlify Functions without breaking build
provides:
  - Deleted scoring engine (src/lib/scoring.js)
  - Deleted test suite (src/lib/scoring.test.js)
  - Deleted validation script (scripts/validate-results.mjs)
  - Deleted all 4 Netlify Functions (strava-auth, strava-callback, strava-webhook, submit-result)
  - Deleted netlify/ directory tree
  - Deleted public/data/results/ (25 athlete JSON files + schema.json)
  - Cleaned package.json: removed "validate" and "test" scripts
  - Cleaned netlify.toml: removed functions build directive and [functions] block
  - Site is now a fully static Astro build with zero Netlify Functions dependency
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure static Astro build: single publish = dist, no serverless functions"

key-files:
  created: []
  modified:
    - package.json
    - netlify.toml
  deleted:
    - src/lib/scoring.js
    - src/lib/scoring.test.js
    - scripts/validate-results.mjs
    - netlify/functions/strava-auth.js
    - netlify/functions/strava-callback.js
    - netlify/functions/strava-webhook.js
    - netlify/functions/submit-result.js
    - netlify/ (directory)
    - public/data/results/ (25 athlete JSON + schema.json)

key-decisions:
  - "Remove 'test' script from package.json alongside 'validate' — vitest exits non-zero with no test files, which would break CI"
  - "Retain [[redirects]] block in netlify.toml — /api/* redirect is a harmless no-op, not worth risking redirect regression"
  - "Retain [build.environment] block — SECRETS_SCAN_OMIT_PATHS still applies to .planning/ directory"

patterns-established:
  - "Static-only netlify.toml pattern: [build] with command + publish only, no functions directive"

# Metrics
duration: 2min
completed: 2026-04-06
---

# Phase 48 Plan 02: Strava Infrastructure Removal Summary

**Deleted scoring engine, test suite, validation script, all 4 Netlify Functions, and 25 athlete JSON results files — MK Ultra is now a zero-backend pure static site**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-06T14:06:28Z
- **Completed:** 2026-04-06T14:08:48Z
- **Tasks:** 2
- **Files modified:** 2 edited, 32 deleted

## Accomplishments
- Deleted scoring engine (scoring.js) and its Vitest test suite (scoring.test.js)
- Deleted validation script (validate-results.mjs)
- Deleted all 4 Netlify Functions: strava-auth, strava-callback, strava-webhook, submit-result
- Removed netlify/ directory tree entirely
- Removed public/data/results/ including 25 athlete JSON files and schema.json
- Stripped package.json "validate" and "test" scripts (no test files remain)
- Removed `functions = "netlify/functions"` directive and `[functions]` block from netlify.toml
- Site builds successfully as fully static (1 page, dist/)

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete scoring engine, test suite, validation script, Netlify Functions, and results data** - `01ee5cc` (feat)
2. **Task 2: Clean up package.json and netlify.toml** - `c64c413` (chore)

**Plan metadata:** (see docs commit below)

## Files Created/Modified
- `package.json` - Removed "validate" and "test" scripts; "data" is now the last script entry
- `netlify.toml` - Removed `functions = "netlify/functions"` line and `[functions]` block; [build] now has only command + publish
- `src/lib/scoring.js` - DELETED (scoring engine)
- `src/lib/scoring.test.js` - DELETED (Vitest test suite)
- `scripts/validate-results.mjs` - DELETED (results validation script)
- `netlify/functions/strava-auth.js` - DELETED
- `netlify/functions/strava-callback.js` - DELETED
- `netlify/functions/strava-webhook.js` - DELETED
- `netlify/functions/submit-result.js` - DELETED
- `netlify/` - DELETED (entire directory)
- `public/data/results/` - DELETED (25 athlete JSON + schema.json)

## Decisions Made
- Removed "test" script alongside "validate": vitest exits with a non-zero code when no test files exist, which would break CI if anyone runs `npm test`. Since scoring.test.js was the only test file, removing the script is the right call.
- Retained `[[redirects]]` in netlify.toml: the /api/* → /.netlify/functions/:splat redirect is now a dead-end (no functions exist), but it's harmless and removing it risks unintended redirect changes. Plan explicitly specified keeping it.
- Retained `[build.environment]` block: SECRETS_SCAN_OMIT_PATHS still protects the .planning/ directory from Netlify's secrets scanner.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed .DS_Store to fully delete netlify/ directory**
- **Found during:** Task 1 verification
- **Issue:** `rmdir netlify` silently failed — macOS `.DS_Store` file existed inside the directory, preventing rmdir
- **Fix:** Used `rm -rf netlify/` to remove directory including the gitignored .DS_Store
- **Files modified:** None (netlify/ was not tracked in git)
- **Verification:** `test -d netlify` returns "DOES NOT EXIST"
- **Committed in:** Already included in 01ee5cc (git never tracked .DS_Store)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor infrastructure cleanup. No scope creep. Plan intent fully achieved.

## Issues Encountered
- Node.js v20.19.5 (active shell PATH version) is below Astro's `>=22.12.0` requirement. This is pre-existing — identical issue noted in 48-01-SUMMARY. Build was verified using `volta run npm run build` (Node v22.22.2) which confirmed clean static build outputting 1 page.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 48 (Strava Infrastructure Removal) is complete — both plans executed
- Zero Netlify Functions remain in the repository
- MK Ultra is a pure static Astro site building to dist/
- Ready for Phase 49 (final v10.0 milestone close-out)

---
*Phase: 48-strava-infrastructure-removal*
*Completed: 2026-04-06*
