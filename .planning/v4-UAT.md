---
status: diagnosed
phase: v4.0 (phases 22-26)
source: 22-01-SUMMARY.md, 23-01-SUMMARY.md, 24-01-SUMMARY.md, 24-02-SUMMARY.md, 25-01-SUMMARY.md, 26-01-SUMMARY.md
started: 2026-03-29T22:00:00Z
updated: 2026-03-29T22:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Route Distance Display
expected: The site shows "100 miles" (not "80 miles" or "101 miles") as the route distance.
result: pass

### 2. Elevation Profile X-Axis
expected: The elevation profile chart's x-axis extends to cover the full ~100mi route. The elevation line does not clip at the right edge.
result: pass

### 3. GPX Download
expected: The GPX download link serves a 100mi file (not the old 80mi). If you download it, it should be ~237KB named mk-ultra.gpx.
result: pass

### 4. Down Jeep Photo on Map
expected: A photo marker for the Down Jeep photo appears on the map near mile 83-84. It is visible as a thumbnail image, not a small dot.
result: pass

### 5. Billie Helmer Photo on Map
expected: A photo marker for the Billie Helmer B&W photo appears on the map near mile 22. It is visible as a thumbnail image, not a small dot.
result: pass

### 6. Gallery Photo Count
expected: The photo gallery shows 55 photos total (previously 53).
result: pass

### 7. Down Jeep Sector Card Cover Photo
expected: The Down Jeep sector card displays a cover photo (not a fallback/placeholder). The photo should be a real image of the Down Jeep area.
result: pass

### 8. Map Zoom Touch Targets
expected: The map zoom +/- buttons are large and easily tappable — noticeably bigger than default Leaflet controls (44x44px).
result: pass

### 9. Card Height Equalization
expected: Gravel sector cards and KOM segment cards have matching minimum heights. They should appear visually consistent in the grid — no cards significantly shorter than others.
result: issue
reported: "gravel sector cards are still much larger than kom cards"
severity: major

### 10. Penrose Triangle Hero
expected: A Penrose triangle SVG is visible above the page title in the hero section. It has a subtle rotation animation (spins slowly). If you have Reduce Motion enabled in macOS, the animation should NOT play.
result: pass

### 11. Grinduro Format Explainer
expected: Above the sector cards grid, there is a text block explaining the Grinduro-style format — describing timed sectors, KOM/QOM climbs, and untimed connecting route. It spans full width above the card grid.
result: pass

### 12. Reset View Button Visible
expected: A "Reset View" button is visible below the elevation profile chart, styled with the site's brutalist border design.
result: issue
reported: "no reset button"
severity: blocker

### 13. Reset Restores Map State
expected: After zooming/panning the map or clicking a sector, clicking "Reset View" returns the map to its initial zoom and position (same as page load). Any open popups close, sector highlights clear, and the crosshair disappears.
result: skipped
reason: Reset button not visible (blocked by test 12)

### 14. Reset Restores Elevation Chart
expected: After interacting with sectors (which highlights bands on the elevation chart), clicking "Reset View" restores all elevation annotation bands to their default subtle appearance.
result: skipped
reason: Reset button not visible (blocked by test 12)

### 15. Photo Marker Thumbnails
expected: Photo markers on the map display as small thumbnail images (48x48px with cyan border), not as small colored dots or generic icons.
result: pass

### 16. Photo Lightbox Opens
expected: Clicking any photo thumbnail marker on the map opens a full-screen PhotoSwipe lightbox showing that photo at full resolution. No intermediate popup appears — the lightbox opens directly.
result: pass

### 17. Lightbox Navigation
expected: While the lightbox is open, you can swipe (mobile) or use arrow keys/buttons to navigate through all route photos.
result: pass

### 18. Lightbox Close
expected: Closing the PhotoSwipe lightbox (X button, Escape key, or swipe down) returns to the map without any navigation or state loss. The map stays where it was.
result: pass

## Summary

total: 18
passed: 14
issues: 2
pending: 0
skipped: 2

## Gaps

- truth: "Gravel sector cards and KOM segment cards have matching minimum heights, appearing visually consistent in the grid"
  status: failed
  reason: "User reported: gravel sector cards are still much larger than kom cards"
  severity: major
  test: 9
  root_cause: "Grid layout puts sectors in md:col-span-2 (2/3 width) vs KOM in 1/3. Both use aspect-video images, so gravel card images are ~2x taller. min-h-[280px] is a floor not a ceiling — has zero effect on the taller gravel cards."
  artifacts:
    - path: "src/pages/index.astro"
      issue: "Grid layout: sectors in col-span-2, KOM in remaining 1/3"
    - path: "src/components/GravelSectors.astro"
      issue: "aspect-video image scales height with wider container"
    - path: "src/components/KomSegments.astro"
      issue: "aspect-video image in narrower container produces shorter cards"
  missing:
    - "Decouple image height from card width (fixed image height or sub-grid) or accept layout hierarchy difference"
  debug_session: ".planning/debug/gravel-sector-cards-too-large.md"

- truth: "A Reset View button is visible below the elevation profile chart"
  status: failed
  reason: "User reported: no reset button"
  severity: blocker
  test: 12
  root_cause: "Button IS in the DOM but effectively invisible: transparent background, border-border (oklch 0.25) against bg-base (oklch 0.10) yields ~2.3:1 contrast, and text-xs text-text-muted compounds the problem."
  artifacts:
    - path: "src/pages/index.astro"
      issue: "Button classes lack visible background and sufficient border contrast (lines 267-277)"
    - path: "src/styles/global.css"
      issue: "--color-border oklch(0.25) too close to --color-bg-base oklch(0.10)"
  missing:
    - "Add visible background (bg-bg-surface or bg-bg-elevated) and/or higher-contrast border (border-accent-green or border-text-muted)"
  debug_session: ".planning/debug/reset-button-not-visible.md"
