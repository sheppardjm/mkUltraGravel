---
status: complete
phase: 16-v2-fixes
source: 16-01-SUMMARY.md, 16-02-SUMMARY.md, 16-03-SUMMARY.md
started: 2026-03-28T12:00:00Z
updated: 2026-03-28T18:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. PhotoSwipe Lightbox Opens
expected: Clicking any photo in the gallery grid opens a full-screen lightbox overlay. The image renders at full resolution — no broken/missing image, no blank overlay. You can swipe between photos and close the lightbox.
result: pass

### 2. Card Hover Shadow (re-verify)
expected: Hovering over a sector card or KOM card shows a green shadow effect around the card. The shadow appears immediately (not gradually fading in).
result: pass

### 3. Scroll-Reveal Animations
expected: As you scroll down the page, sections animate into view (fade/slide in). Elements are not visible before scrolling to them — they reveal on scroll.
result: pass
note: "Initially reported no effect — caused by macOS Reduce Motion setting, not a bug. Working as intended."

### 4. Route Stats Subtitle Size + Color (re-verify)
expected: Below "The Route" heading, the subtitle showing distance and elevation is clearly readable — larger text with accent green color that stands out against the dark background.
result: pass

### 5. Elevation-to-Map Crosshair Sync
expected: Hovering over the elevation profile chart shows a crosshair/marker on the map at the corresponding geographic position. Moving along the chart moves the marker on the map in real time.
result: pass

### 6. Leaving Chatham KOM Card Photo
expected: The "Leaving Chatham" KOM card displays a cover photo (Rock River Rd scene) — not a placeholder or fallback from a distant mile marker.
result: pass

### 7. MK Ultra Explainer Dual Meaning
expected: The MK Ultra explainer section mentions both the CIA's MKULTRA program AND that "MK" stands for route creator Mark Kransz's initials. "Mark Kransz" appears with a redacted-reveal hover effect (hidden text that reveals on hover/click).
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0

## Gaps

- truth: "Hovering over a sector card or KOM card shows a green shadow effect around the card"
  status: failed
  reason: "User reported: no effect"
  severity: major
  test: 2
  root_cause: "overflow-hidden on the same element as card-hover clips box-shadow to padding box, making shadow invisible. CSS Overflow Module Level 3 specifies overflow:hidden clips ink overflow including box-shadow."
  artifacts:
    - path: "src/components/GravelSectors.astro"
      issue: "line 26: card div has both overflow-hidden and card-hover"
    - path: "src/components/KomSegments.astro"
      issue: "line 19: same pattern — overflow-hidden + card-hover on same div"
    - path: "src/styles/global.css"
      issue: "lines 224-238: .card-hover box-shadow rules correct but clipped"
  missing:
    - "Separate overflow-hidden from box-shadow element — either wrapper div approach or move overflow-hidden to inner content wrapper"
  debug_session: ".planning/debug/card-hover-shadow-no-effect.md"

- truth: "Route stats subtitle is clearly readable — noticeably larger than small caption text"
  status: failed
  reason: "User reported: make even larger and color to stand out"
  severity: cosmetic
  test: 4
  root_cause: "Subtitle at text-lg (18px) with text-text-muted color is too small and muted relative to the text-3xl/text-5xl heading above it. User wants more visual weight."
  artifacts:
    - path: "src/pages/index.astro"
      issue: "line 246: p class='text-text-muted text-lg mb-8' — too small and muted"
  missing:
    - "Bump size to text-xl or text-2xl and change color from text-text-muted to text-accent-green or text-text-base"
  debug_session: ""
