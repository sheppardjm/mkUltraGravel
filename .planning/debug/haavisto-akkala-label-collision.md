---
status: diagnosed
trigger: "Sector labels Haavisto and Akkala Rd collide/overlap at viewport widths under 1576px"
created: 2026-04-13T00:00:00Z
updated: 2026-04-13T00:00:00Z
---

## Current Focus

hypothesis: yAdjust of -16px for Haavisto (index 3, odd) is insufficient vertical separation from Akkala Rd (index 2, even) because the two sectors are only 3.49mi apart on a 110mi chart, causing horizontal overlap at narrower viewports while the 16px vertical offset doesn't clear the ~21.6px label height.
test: Geometric calculation of label positions and sizes at various viewports
expecting: Collision threshold near 1576px viewport width
next_action: DIAGNOSED - document root cause and suggested fix

## Symptoms

expected: Haavisto and Akkala Rd labels should not overlap at any desktop viewport width (640px+)
actual: Labels collide/overlap at viewport widths below ~1576px
errors: No runtime errors - purely visual overlap
reproduction: Resize browser window to any width under 1576px with elevation profile visible
started: Pre-existing issue since sector labels were added (commit db2cdc9). NOT a regression from Phase 60 Down Jeep fix - that commit (a316d7d) did not modify yAdjust values.

## Eliminated

- hypothesis: Phase 60 Down Jeep fix introduced this regression
  evidence: git diff of commit a316d7d shows only rotation and position/xAdjust changes for isNarrow sectors. yAdjust line was unchanged. The same yAdjust alternation (i % 2 === 0 ? 0 : -16) has been in place since commit db2cdc9 (feat 34-01, when sector labels were first added).
  timestamp: 2026-04-13

## Evidence

- timestamp: 2026-04-13
  checked: annotations.json sector positions
  found: |
    Akkala Rd: index 2 (even), startMi=39.5, endMi=40.92, center=40.21mi
    Haavisto: index 3 (odd), startMi=43.0, endMi=44.401, center=43.70mi
    Gap between centers: 3.49mi (3.2% of ~110mi total route)
  implication: These are by far the closest adjacent sectors on the route

- timestamp: 2026-04-13
  checked: yAdjust alternation logic in ElevationProfile.astro line 83
  found: |
    yAdjust: i % 2 === 0 ? 0 : -16
    Akkala Rd (index 2, even): yAdjust = 0
    Haavisto (index 3, odd): yAdjust = -16
  implication: Only 16px vertical separation between these two labels

- timestamp: 2026-04-13
  checked: Label dimensions at 9px Space Mono font
  found: |
    "Akkala Rd" = 9 chars at ~5.4px/char = ~48.6px wide
    "Haavisto" = 8 chars at ~5.4px/char = ~43.2px wide
    Each label is 2 lines (name + stars), ~21.6px tall (9px font x 1.2 line-height x 2 lines)
    Minimum horizontal clearance for no overlap: ~45.9px between centers
  implication: Labels need ~46px horizontal clearance to avoid collision

- timestamp: 2026-04-13
  checked: Horizontal pixel gap at various viewport widths
  found: |
    Viewport 1576px -> chart ~1450px -> label center gap ~46.0px (threshold)
    Viewport 1400px -> chart ~1288px -> label center gap ~40.9px (colliding)
    Viewport 1200px -> chart ~1104px -> label center gap ~35.0px (colliding)
    Viewport 1024px -> chart ~942px  -> label center gap ~29.9px (colliding)
    Viewport  768px -> chart ~707px  -> label center gap ~22.4px (colliding)
    Viewport  640px -> chart ~589px  -> label center gap ~18.7px (colliding)
  implication: At ~1576px, horizontal gap equals minimum clearance; below that, labels overlap horizontally

- timestamp: 2026-04-13
  checked: Vertical overlap between the two labels
  found: |
    Akkala Rd (yAdjust=0): label occupies y=bottom to y=bottom-21.6px
    Haavisto (yAdjust=-16): label occupies y=bottom-16 to y=bottom-37.6px
    Overlap zone: y=bottom-16 to y=bottom-21.6 = 5.6px of vertical overlap
  implication: The 16px yAdjust is insufficient to clear Akkala Rd's 21.6px label height, so when labels encroach horizontally they also overlap vertically

- timestamp: 2026-04-13
  checked: All adjacent sector pair gaps
  found: |
    BAA -> Sandstrom: 12.2mi gap, ~161px at 1576vw
    Sandstrom -> Akkala Rd: 13.9mi gap, ~183px at 1576vw
    Akkala Rd -> Haavisto: 3.5mi gap, ~46px at 1576vw  <-- COLLISION
    Haavisto -> Forest Service Rd: 10.2mi gap, ~135px at 1576vw
    Forest Service Rd -> C4: 7.6mi gap, ~100px at 1576vw
    C4 -> Down Jeep: 22.3mi gap, ~294px at 1576vw
  implication: Akkala Rd -> Haavisto is the ONLY pair with tight spacing. All others have 100+ px clearance.

## Resolution

root_cause: |
  The generic even/odd yAdjust alternation (`i % 2 === 0 ? 0 : -16`) provides only 16px of vertical separation, but each label is ~21.6px tall (two lines at 9px font). This creates a 5.6px vertical overlap zone.

  For most adjacent sectors this doesn't matter because they are far apart horizontally (100-294px). But Akkala Rd (index 2) and Haavisto (index 3) are only 3.49mi apart on a 110mi chart. Below ~1576px viewport width, the horizontal pixel gap shrinks below ~46px (the minimum clearance for their label widths), causing the labels to collide both horizontally and vertically.

  This is a pre-existing issue since commit db2cdc9 (the original sector label implementation), not a regression from Phase 60.

fix: |
  NOT APPLIED (diagnose-only mode). Suggested fix:

  Increase Haavisto's yAdjust to provide full vertical clearance. The label height is ~21.6px, so yAdjust needs to be at least -22px (ideally -24 to -28px for comfortable spacing).

  Option A (targeted): Override yAdjust specifically for the Haavisto label (index 3):
    Replace line 83:
      yAdjust: i % 2 === 0 ? 0 : -16,
    With:
      yAdjust: i === 3 ? -28 : (i % 2 === 0 ? 0 : -16),

  Option B (general improvement): Increase the odd-index offset for all labels:
    Replace line 83:
      yAdjust: i % 2 === 0 ? 0 : -16,
    With:
      yAdjust: i % 2 === 0 ? 0 : -28,
    This gives more vertical clearance globally. No other adjacent pairs would be harmed
    since they already have 100+ px horizontal clearance.

  Option B is preferred because it is more robust against future sector additions.

verification: Not yet verified (diagnose-only)
files_changed: []
