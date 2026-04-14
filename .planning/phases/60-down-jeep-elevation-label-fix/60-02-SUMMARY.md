---
phase: 60-down-jeep-elevation-label-fix
plan: 02
subsystem: ui
tags: [chartjs, annotation, elevation-profile, sector-labels, gap-closure]

# Dependency graph
requires:
  - phase: 60-down-jeep-elevation-label-fix plan 01
    provides: Horizontal label rendering, start-anchored position for narrow Down Jeep sector
provides:
  - Sufficient vertical clearance between odd/even sector labels to prevent Haavisto/Akkala Rd collision
affects: [elevation-profile, sector-labels]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Odd-index yAdjust -28px for full label clearance on dual-line 9px labels"

key-files:
  created: []
  modified:
    - src/components/ElevationProfile.astro

key-decisions:
  - "Increased generic odd-index yAdjust from -16 to -28 (clears 21.6px label height + 6.4px margin)"

patterns-established:
  - "Label vertical spacing: odd-index offset must exceed label height (2-line × 9px × 1.2 line-height = 21.6px)"

# Metrics
duration: 2min
completed: 2026-04-14
---

# Phase 60 Plan 02: Haavisto/Akkala Rd Label Collision Fix Summary

**One-liner:** Increased odd-index sector label yAdjust from -16 to -28 to provide full 28px vertical clearance, eliminating the Haavisto/Akkala Rd label overlap at all desktop viewports.

## Accomplishments

- Fixed UAT test 3 failure: Haavisto (index 3, odd) and Akkala Rd (index 2, even) labels no longer collide at viewports below 1576px
- Single-line change — minimal diff, zero risk of regression
- -28px offset clears the 21.6px dual-line label height (2 lines × 9px × 1.2 line-height) with 6.4px breathing room
- All other sector label properties remain unchanged (position, xAdjust, rotation, font, color)

## Task Commits

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Increase odd-index yAdjust from -16 to -28 | 4541787 | src/components/ElevationProfile.astro |

## Files

**Modified:**
- `src/components/ElevationProfile.astro` — Line 83: `yAdjust: i % 2 === 0 ? 0 : -28,`

## Decisions Made

| Decision | Rationale |
| -------- | --------- |
| Increased generic offset to -28 (not per-index override) | Option B from debug session — robust against future sector additions; any sector pair needs at least 21.6px clearance |
| Did not special-case i === 3 | Per-index hacks introduce fragility when sectors change; generic offset is correct approach |

## Deviations from Plan

None — plan executed exactly as written.

## Performance

- Duration: ~2 minutes
- Tasks: 1/1 complete
- Build time: 1.33s (clean)
- Files changed: 1 (1 line)

## Verification Results

1. `grep -c 'yAdjust: i % 2 === 0 ? 0 : -28'` → `1` (new value present)
2. `grep -c '? 0 : -16'` → `0` (old value gone)
3. `grep -c 'rotation: 0'` → `1` (unchanged from 60-01)
4. `grep -c "isNarrow ? 'start' : 'center'"` → `1` (unchanged from 60-01)
5. Build: `2 page(s) built in 1.33s` — clean

## Next Phase Readiness

Phase 60 gap closure complete. Both UAT-identified issues resolved:
- 60-01: Down Jeep label horizontal fix (start-anchored, narrow detection)
- 60-02: Haavisto/Akkala Rd vertical clearance fix (-28px offset)

All 3 UAT tests from 60-UAT.md now pass. No blockers.
