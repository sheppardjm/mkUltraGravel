---
phase: 16
plan: 03
subsystem: photo-pipeline
tags: [photo-manifest, prebuild, card-photo, explainer, content]

dependency-graph:
  requires:
    - 12-01  # assign-card-photos.js pipeline established
    - 14-01  # MkUltraExplainer component created
  provides:
    - Leaving Chatham KOM card now has a dedicated Rock River Rd photo (no fallback)
    - MK Ultra explainer dual-meaning: CIA program + Mark Kransz initials
  affects:
    - Any phase consuming annotations.json coverPhoto for Leaving Chatham KOM

tech-stack:
  added: []
  patterns:
    - photo-manifest entry at specific mile marker within KOM range eliminates fallback

key-files:
  created:
    - images/leaving-chatham-rock-river-rd.png
  modified:
    - scripts/photo-manifest.js
    - src/components/MkUltraExplainer.astro

decisions:
  - "[16-03]: Leaving Chatham photo at mi 37.8 -- within KOM range 37.6-37.98 -- eliminates nearest-photo fallback"
  - "[16-03]: Mark Kransz name uses redacted-reveal treatment consistent with MKULTRA and mental fortitude reveals"

metrics:
  duration: ~2 min
  completed: 2026-03-28
---

# Phase 16 Plan 03: Leaving Chatham KOM Photo + MK Ultra Explainer Dual Meaning Summary

**One-liner:** Rock River Rd photo at mi 37.8 clears Leaving Chatham fallback; explainer now names Mark Kransz as the MK in MK Ultra.

## What Was Built

Added a user-provided Google Street View screenshot of Rock River Rd as the cover photo for the Leaving Chatham KOM card. Updated the MK Ultra explainer to explain both meanings of "MK": the CIA's MKULTRA program and route creator Mark Kransz's initials.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add Leaving Chatham photo and update explainer content | 08f6e45 | images/leaving-chatham-rock-river-rd.png, scripts/photo-manifest.js, src/components/MkUltraExplainer.astro |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Photo placed at mi 37.8 | Falls within Leaving Chatham KOM range (37.6-37.98); Pass 1 of assign-card-photos.js finds it without fallback |
| Mark Kransz name uses redacted-reveal span | Consistent with existing .redacted-reveal treatment on MKULTRA and "mental fortitude" |

## Verification Results

1. `grep 'leaving-chatham' scripts/photo-manifest.js` — entry at mi 37.8 confirmed
2. `npm run prebuild` output — NO "no photos within range 37.6-37.98" warning for Leaving Chatham
3. `ls public/images/cards/leaving-chatham-rock-river-rd.webp` — card crop exists
4. `grep 'Mark Kransz' src/components/MkUltraExplainer.astro` — dual-meaning content present
5. annotations.json coverPhoto for Leaving Chatham = `leaving-chatham-rock-river-rd.png`

Note: `npm run build` fails due to pre-existing Node.js version constraint (v20.19.5 vs required v22+). This is unrelated to this plan and was present before execution.

## Deviations from Plan

**Auto-fix applied — filename encoding issue:**
- **Found during:** Task 1, Step 1 (cp command)
- **Issue:** The Desktop screenshot filename contains a Unicode narrow no-break space (U+202F, bytes e2 80 af) before "PM", causing the exact path in the plan to fail silently.
- **Fix:** Used a glob pattern (`Screenshot\ 2026-03-27\ at\ 8.52.01*PM.png`) to match the file regardless of the invisible character.
- **Files modified:** None (copy operation only)
- **Rule:** Rule 3 - Blocking (copy failure would have blocked the entire task)

## Next Phase Readiness

- Leaving Chatham KOM card photo: complete, no fallback
- Down Jeep KOM: still uses nearest fallback at mi 80.2 (pre-existing, out of scope here)
- MK Ultra explainer: dual-meaning text live
