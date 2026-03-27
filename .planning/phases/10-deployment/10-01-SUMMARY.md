---
phase: 10-deployment
plan: 01
subsystem: infra
tags: [gitignore, cloudflare-pages, node-version, git, deployment]

# Dependency graph
requires:
  - phase: 09-mobile-performance-audit
    provides: Fully optimized site with green Core Web Vitals ready for production deploy
provides:
  - .gitignore excluding build artifacts (node_modules/, dist/, .astro/, public/images/)
  - .node-version pinning Node 22 for Cloudflare Pages
  - Source images committed to git (images/ directory, 80 files)
  - MK Ultra.gpx committed to git
  - All commits pushed to GitHub origin/main
  - Clean git state with build succeeding locally
affects: [10-02-cloudflare-setup, 10-03-domain-config]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "public/images/ (generated) excluded from git; images/ (source) tracked — prebuild copies on each build"
    - ".node-version for Cloudflare Pages Node version pinning (bare major version, not semver)"

key-files:
  created:
    - .gitignore
    - .node-version
  modified: []

key-decisions:
  - ".node-version uses bare '22' (not '22.x.x') — Cloudflare Pages may not have exact Volta-pinned semver"
  - "public/images/ is in .gitignore because prebuild regenerates it from images/ source dir on every build"
  - "images/ directory (~33MB, 80 files including tone/) is tracked in git as source assets for the build pipeline"

patterns-established:
  - "Source assets in images/ are tracked; generated output in public/images/ is excluded — this is the Cloudflare-compatible pattern"

# Metrics
duration: 2min
completed: 2026-03-27
---

# Phase 10 Plan 01: Deployment Repository Preparation Summary

**.gitignore + .node-version added, source images and GPX committed, pushed to GitHub with clean build passing locally (npm run build exits 0)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-27T13:52:17Z
- **Completed:** 2026-03-27T13:53:59Z
- **Tasks:** 2
- **Files modified:** 2 created (.gitignore, .node-version), 80+ committed (images/, MK Ultra.gpx)

## Accomplishments
- .gitignore prevents node_modules/, dist/, .astro/, public/images/, .DS_Store from polluting the repo
- .node-version pins Node 22 for Cloudflare Pages build environment
- All 80 source image files (images/ root + images/tone/) committed to git
- MK Ultra.gpx source file committed to git
- npm run build succeeds locally — prebuild reads from committed images/ and GPX, generates public/
- Pushed to GitHub origin/main — repo is ready for Cloudflare Pages to clone and build

## Task Commits

Each task was committed atomically:

1. **Task 1: Create .gitignore and .node-version** - `80cbcae` (chore)
2. **Task 2: Commit source images** - `252c8ab` (chore)
3. **Task 2: Commit GPX file** - `771cad8` (chore)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `.gitignore` - Excludes node_modules/, dist/, .astro/, public/images/, .DS_Store, .env, .playwright-mcp/
- `.node-version` - Contains "22" for Cloudflare Pages Node version pin
- `images/` (80 files) - Source photos and tone images committed as build pipeline inputs
- `MK Ultra.gpx` - Source GPX file committed as build pipeline input

## Decisions Made
- Used bare `22` in .node-version (not `22.22.2`) — Cloudflare Pages may not have the exact Volta-pinned patch version available
- `public/images/` is gitignored because the prebuild step (generate-data.js) regenerates it from `images/` source on every Cloudflare build
- `public/data/` and `public/tone/` are NOT gitignored — they contain committed data files and committed tone WebP images used by the site

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — build pipeline succeeded on first run with committed source assets. prebuild correctly picked up images/ and MK Ultra.gpx.

## User Setup Required
None - no external service configuration required for this plan.

## Next Phase Readiness
- GitHub repo is ready for Cloudflare Pages connection (Plan 10-02)
- Build succeeds locally with all source assets in git
- .node-version ensures Cloudflare uses Node 22 (arm64-compatible for sharp thumbnails)
- Active concern: BikeReg registration URL still uses BIKEREG_URL placeholder — must confirm before launch

---
*Phase: 10-deployment*
*Completed: 2026-03-27*
