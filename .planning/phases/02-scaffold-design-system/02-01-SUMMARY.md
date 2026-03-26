---
phase: 02-scaffold-design-system
plan: 01
subsystem: ui
tags: [astro, tailwindcss, vite, volta, node22, cascade-layers]

# Dependency graph
requires:
  - phase: 01-data-pipeline
    provides: generate-data.js pipeline and public/data/ output consumed by dev/build scripts
provides:
  - Astro 6 installed and configured with @tailwindcss/vite plugin
  - Tailwind v4 CSS-first processing via Vite plugin (no tailwind.config.js)
  - Global CSS with cascade layer order (leaflet < base < components < utilities)
  - Node 22 pinned via Volta for all project commands
  - Minimal scaffold: src/pages/index.astro, src/styles/global.css, astro.config.mjs, tsconfig.json
affects: [02-02-design-tokens, 03-map, 04-elevation, all-ui-phases]

# Tech tracking
tech-stack:
  added: [astro@6.1.1, tailwindcss@4.2.2, @tailwindcss/vite@4.2.2]
  patterns:
    - CSS-first Tailwind v4 config via @import directive (no tailwind.config.js)
    - Cascade layer declaration before @import to control specificity
    - @tailwindcss/vite as Vite plugin in astro.config.mjs (not as Astro integration)

key-files:
  created:
    - astro.config.mjs
    - tsconfig.json
    - src/styles/global.css
    - src/pages/index.astro
  modified:
    - package.json

key-decisions:
  - "Vite 7 override required: @tailwindcss/vite pulled in Vite 8, but Astro 6 requires Vite 7 - added overrides.vite=^7 to package.json"
  - "CSS-first Tailwind v4: no tailwind.config.js; all config lives in global.css @theme block"
  - "Cascade layer order: leaflet lowest priority, utilities highest - ensures Tailwind wins over Leaflet CSS in Phase 3"
  - "index.astro is throwaway scaffold - Plan 02-02 replaces with BaseLayout and proper index"

patterns-established:
  - "Pattern: @layer leaflet, base, components, utilities declared FIRST in global.css before @import tailwindcss"
  - "Pattern: astro dev run via volta run to ensure Node 22.12.0+ requirement is met"

# Metrics
duration: 4min
completed: 2026-03-26
---

# Phase 2 Plan 1: Astro + Tailwind v4 Scaffold Summary

**Astro 6 dev server running with Tailwind v4 via Vite plugin, cascade layers declared for Leaflet conflict prevention, Node 22 pinned via Volta**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-26T23:35:05Z
- **Completed:** 2026-03-26T23:39:02Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Astro 6.1.1 installed with Tailwind v4 (@tailwindcss/vite) — dev server starts clean, zero build errors
- Cascade layer order `@layer leaflet, base, components, utilities` declared in global.css — Tailwind utilities will always win over Leaflet in Phase 3
- Node 22.22.2 pinned via Volta — all project commands will use Node 22+ as required by Astro 6
- Phase 1 data pipeline verified intact — `npm run data` still generates all 33 photos and route data

## Task Commits

Each task was committed atomically:

1. **Task 1: Pin Node 22 via Volta and install Astro 6 + Tailwind v4** - `0c9fbb6` (feat)
2. **Task 2: Create astro.config.mjs and global CSS with cascade layers** - `c80a6ec` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `astro.config.mjs` - Astro 6 config with @tailwindcss/vite Vite plugin
- `tsconfig.json` - Extends astro/tsconfigs/strict for .astro type checking
- `src/styles/global.css` - Cascade layer declaration + @import tailwindcss + @theme placeholder
- `src/pages/index.astro` - Throwaway scaffold page (replaced in Plan 02-02)
- `package.json` - Added astro, tailwindcss, @tailwindcss/vite deps; Volta Node 22 pin; overrides.vite=^7

## Decisions Made
- **Vite 7 override:** `@tailwindcss/vite@4.2.2` resolves `vite@8.0.3` as a peer dep, but Astro 6 requires Vite 7. Added `"overrides": { "vite": "^7" }` to package.json to pin Vite 7.3.1.
- **CSS-first config:** Tailwind v4 uses `@import "tailwindcss"` in CSS rather than a JS config file. Design tokens go in `@theme {}` block in global.css (populated in Plan 02-02).
- **Layer ordering:** `@layer leaflet, base, components, utilities` declared before the Tailwind import so the declaration order establishes specificity hierarchy globally.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Vite 8/7 conflict causing Astro dev server warning**
- **Found during:** Task 2 (astro dev startup)
- **Issue:** `@tailwindcss/vite@4.2.2` pulled in `vite@8.0.3` as a peer dep, but Astro 6 requires Vite 7. The warning stated: "Vite 8.0.3 detected in your project. Astro requires Vite 7."
- **Fix:** Added `"overrides": { "vite": "^7" }` to package.json, then reinstalled to get `vite@7.3.1`
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** Dev server starts with no Vite version warning
- **Committed in:** `c80a6ec` (Task 2 commit)

**2. [Rule 3 - Blocking] Rollup darwin-arm64 native binary missing**
- **Found during:** Task 2 (first astro dev attempt)
- **Issue:** Initial `npm install` ran under Node 20 (system node), not Node 22 (volta). Rollup's optional platform-specific binary `@rollup/rollup-darwin-arm64` was not installed for the correct platform/architecture.
- **Fix:** Removed node_modules and package-lock.json, then ran `volta run npm install` to install under Node 22 so all platform-specific optionals resolved correctly
- **Files modified:** `package-lock.json` (regenerated)
- **Verification:** `volta run npx astro dev` starts without rollup module error
- **Committed in:** `c80a6ec` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes required for clean dev server startup. No scope creep.

## Issues Encountered
None beyond the two blocking issues documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Astro 6 dev server operational, Tailwind v4 processing confirmed via generated CSS
- Cascade layers declared and verified in build output (`@layer leaflet` present in dist CSS)
- Plan 02-02 can proceed immediately: replace index.astro with BaseLayout, populate @theme design tokens, add fonts
- No blockers for design system work

---
*Phase: 02-scaffold-design-system*
*Completed: 2026-03-26*
