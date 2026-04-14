---
status: diagnosed
phase: 60-down-jeep-elevation-label-fix
source: [60-01-SUMMARY.md]
started: 2026-04-13T22:00:00Z
updated: 2026-04-13T22:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Down Jeep Label Renders Horizontally
expected: On the elevation profile at desktop width (>=640px), the "Down Jeep" sector label displays as horizontal text — matching every other sector label. No rotation or vertical text.
result: pass

### 2. Down Jeep Label Not Clipped
expected: The "Down Jeep" label text is fully visible and readable despite the narrow 0.594mi band. Text anchors at the left (start) edge of the band and extends rightward — no truncation or overlap with adjacent sector labels.
result: pass

### 3. Other Sector Labels Unchanged
expected: All other sector labels on the elevation profile (and any KOM labels) render exactly as before — horizontal, centered in their bands, no visual regressions.
result: issue
reported: "Under 1576px, the sector names on the ele profile begin to collide, specifically, Haavisto with Akkala Rd. Haavisto needs to be higher to avoid collision."
severity: minor

## Summary

total: 3
passed: 2
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "All other sector labels on the elevation profile render exactly as before — horizontal, centered in their bands, no visual regressions."
  status: failed
  reason: "User reported: Under 1576px, the sector names on the ele profile begin to collide, specifically, Haavisto with Akkala Rd. Haavisto needs to be higher to avoid collision."
  severity: minor
  test: 3
  root_cause: "Generic even/odd yAdjust alternation (-16px) on line 83 of ElevationProfile.astro doesn't clear the ~21.6px label height. Akkala Rd and Haavisto are the tightest adjacent pair (3.49mi apart), so they collide horizontally below ~1576px with insufficient vertical offset."
  artifacts:
    - path: "src/components/ElevationProfile.astro"
      issue: "yAdjust: i % 2 === 0 ? 0 : -16 — only 16px offset for ~21.6px tall labels"
  missing:
    - "Increase odd-index yAdjust from -16 to -28 for full vertical clearance"
  debug_session: ".planning/debug/haavisto-akkala-label-collision.md"
