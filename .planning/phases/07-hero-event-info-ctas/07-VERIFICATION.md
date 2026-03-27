---
phase: 07-hero-event-info-ctas
verified: 2026-03-26T00:00:00Z
status: gaps_found
score: 4/5 must-haves verified
gaps:
  - truth: "A BikeReg registration CTA button appears above the fold AND again below the map section — neither instance requires scrolling past non-CTA content to find it"
    status: partial
    reason: "Both CTA buttons exist in correct positions (above fold in hero, after map section) but both use href='PENDING — confirm with event director' which is not a valid URL. The buttons render and are clickable but navigate to a broken destination."
    artifacts:
      - path: "src/pages/index.astro"
        issue: "BIKEREG_URL constant is set to literal string 'PENDING — confirm with event director' — used as href on both Register Now anchors"
      - path: "src/components/EventInfoBlock.astro"
        issue: "Also defines BIKEREG_URL = 'PENDING — confirm with event director' (unused in rendered output, but the constant exists)"
    missing:
      - "Actual BikeReg registration URL in BIKEREG_URL constant (or '#' as a safe interim placeholder)"
      - "Note: this is a known intentional hold — event director must confirm before launch"
human_verification:
  - test: "Above-fold visibility on mobile (375px viewport)"
    expected: "Event date, location, distance, cost, countdown, and Register Now CTA all visible without scrolling on a 375px-wide viewport"
    why_human: "Cannot programmatically verify CSS layout renders all elements within viewport height on small screens — hero uses min-h-screen which guarantees section height but not that all text fits above the fold on short mobile screens"
  - test: "Countdown timer ticks on page load"
    expected: "Days/hours/minutes values are numeric (not '--') within one second of page load, and update each second"
    why_human: "Script is type=module (deferred) and runs client-side — cannot verify runtime behavior from static HTML"
  - test: "Second Register Now CTA is visible without scrolling past non-CTA content after the map"
    expected: "After viewing the map/elevation section, the 'Like what you see? Register Now' block is the next visible element before Gravel Sectors"
    why_human: "Section ordering is correct in HTML, but visual stacking on mobile needs human confirmation"
---

# Phase 7: Hero + Event Info + CTAs Verification Report

**Phase Goal:** A visitor who lands on the page immediately knows when and where the event is, how to register, and what the ride costs — and is compelled to click Register before scrolling.
**Verified:** 2026-03-26
**Status:** gaps_found (1 blocking gap — BikeReg URL is a non-functional placeholder)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Event date (June 7, 2026), start location (Marquette Fire Bell), distance (80 miles), and cost (free) are visible above the fold | VERIFIED | All four present in `#hero` section in built HTML (chars 3653-6020), hero has `min-h-screen` |
| 2 | BikeReg CTA appears above the fold AND again below the map section | PARTIAL | Both buttons exist in correct positions; first CTA is in hero (char 5766, inside hero bounds), second CTA is after RouteMap (char 7166, after map at 6317); href on both is `'PENDING — confirm with event director'` — not a valid URL |
| 3 | Live countdown timer showing days/hours/minutes to June 7, 2026 is visible on page load | VERIFIED | `#countdown` div with `data-target="2026-06-07T09:00:00-04:00"` is inside `#hero`; inline `type="module"` script calls `tick()` immediately then `setInterval(tick, 1000)` |
| 4 | Great Lakes Recovery Centers donation info ($10 suggested) is displayed with context explaining the cause | VERIFIED | EventInfoBlock renders in `#info` section; contains "$10 donation", "Great Lakes Recovery Centers", description of GLRC services across Michigan's UP |
| 5 | GPX file download link uses `download="mk-ultra-gravel-2026.gpx"` and is accessible | VERIFIED | Built HTML contains `href="/mk-ultra.gpx" download="mk-ultra-gravel-2026.gpx"`; `/public/mk-ultra.gpx` exists (231,323 bytes, valid GPX with `<trkpt>` elements from StravaGPX) |

**Score:** 4/5 truths verified (Truth 2 is PARTIAL — CTA placement correct, URL non-functional)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/CountdownTimer.astro` | Live countdown to June 7, 2026 | VERIFIED | 48 lines; reads `data-target` ISO date; calculates days/hours/minutes; calls `tick()` immediately + `setInterval`; handles post-event state |
| `src/components/EventInfoBlock.astro` | Donation info + GPX download | VERIFIED | 51 lines; "The Format", "The Cause" (GLRC), "The Route File" sections; GPX anchor with correct `download` attribute |
| `src/pages/index.astro` | Hero + dual CTAs wired to components | VERIFIED | 133 lines; imports CountdownTimer + EventInfoBlock; both components used in template; dual CTA placement confirmed in built output |
| `public/mk-ultra.gpx` | Actual route GPX file served at `/mk-ultra.gpx` | VERIFIED | 231,323 bytes; valid GPX XML from StravaGPX creator; contains track points |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `index.astro` hero | CountdownTimer | `<CountdownTimer />` in hero div | WIRED | Component renders inside hero section in built HTML |
| `index.astro` hero | BikeReg register | `href={BIKEREG_URL}` on `<a>` | PARTIAL | Renders correctly, but `BIKEREG_URL = 'PENDING — confirm with event director'` is not a valid URL |
| `index.astro` post-map | Second BikeReg CTA | `href={BIKEREG_URL}` between `#route` and `#sectors` | PARTIAL | Positioned correctly after RouteMap; same non-functional URL issue |
| `index.astro` #info | EventInfoBlock | `<EventInfoBlock />` in info section | WIRED | Renders full content in built HTML |
| `EventInfoBlock.astro` | GPX file | `href="/mk-ultra.gpx" download="mk-ultra-gravel-2026.gpx"` | WIRED | File exists at `/public/mk-ultra.gpx`; correct `download` filename attribute |
| `CountdownTimer.astro` | June 7, 2026 date | `data-target="2026-06-07T09:00:00-04:00"` | WIRED | ISO date in data attribute; JS reads it via `container.dataset.target` |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| EVENT-01: Event date visible above fold | SATISFIED | "June 7, 2026" in hero section |
| EVENT-02: Registration CTA above fold | PARTIAL | CTA present and above fold; href is non-functional placeholder |
| EVENT-03: Countdown timer | SATISFIED | CountdownTimer component wired with correct target date, ticking JS confirmed |
| EVENT-04: Donation/cause info | SATISFIED | EventInfoBlock with GLRC details rendered in #info |
| MAP-08: GPX download | SATISFIED | Correct `download` attribute; file exists and is valid GPX |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/pages/index.astro` | 12 | `BIKEREG_URL = 'PENDING — confirm with event director'` | BLOCKER | Both Register Now buttons use this as href — clicking navigates to broken URL |
| `src/components/EventInfoBlock.astro` | 3 | Same BIKEREG_URL placeholder constant (unused in rendered template) | WARNING | Unused but confusing — EventInfoBlock does not render a CTA button |
| `src/components/CountdownTimer.astro` | 3 | Comment: "event time is placeholder" | INFO | Comment notes timezone uncertainty; functional behavior is correct |
| `dist/index.html` meta description | line 1 | "100 miles" in meta vs "80 miles" in hero | WARNING | Distance inconsistency between SEO meta description and visible content |

**Blocker explanation:** The `BIKEREG_URL` placeholder is intentional and documented — the event director must confirm the URL before launch. The buttons render correctly, are visually correct, and have correct placement. This is a known pre-launch hold, not a code defect. However it does prevent the goal statement ("compelled to click Register") from being fully achievable — clicking Register goes nowhere.

### Human Verification Required

#### 1. Above-fold layout on mobile (375px)

**Test:** Open the page on a 375px-wide viewport (or Chrome DevTools iPhone SE simulation). Without scrolling, check that all of the following are visible: event date, location, distance, cost text, countdown numbers, and Register Now button.
**Expected:** All elements visible without scrolling on 375px viewport
**Why human:** `min-h-screen` guarantees the hero section fills the viewport but does not guarantee all text content fits before the CTA when viewport height is short (e.g., landscape mobile). CSS layout must be visually confirmed.

#### 2. Countdown timer ticks on page load

**Test:** Open the page in a browser, observe the countdown numbers immediately on load.
**Expected:** Numbers show actual day/hour/minute counts (not `--`) within one second of page load; numbers update each second.
**Why human:** Script is `type="module"` (deferred execution). While `tick()` is called immediately in the module, the `--` placeholder values in HTML will show briefly until the module executes. Human must confirm the flash duration is acceptable.

#### 3. Second CTA visible without excessive scrolling

**Test:** Scroll past the route map section on both desktop and mobile. Verify the "Like what you see? Register Now" block appears as the next section before Gravel Sectors.
**Expected:** Second CTA is immediately visible after the elevation profile ends — no unrelated content between map and second CTA.
**Why human:** HTML ordering is confirmed correct, but section heights on different viewports may require verifying the CTA is not buried.

### Gaps Summary

One gap blocks full goal achievement:

**BikeReg URL is a non-functional placeholder.** Both "Register Now" CTAs render in the correct positions (above fold in hero, between route and sectors sections), but both use `href="PENDING — confirm with event director"` which is not a navigable URL. A visitor who clicks Register will get a browser error. The SUMMARY acknowledges this is intentional — "BIKEREG_URL is a visible placeholder string — intentionally non-functional until event director confirms."

This is a pre-launch hold, not an implementation defect. All other infrastructure is complete. The gap will be closed when the event director provides the BikeReg URL.

**Secondary finding (non-blocking):** The meta description says "100 miles" while the hero displays "80 miles". This reflects the route extension documented in MEMORY.md (route extended to 100mi, GPX pending from Strava). The hero intentionally shows 80 miles per roadmap must-have criteria. The meta description was not updated to match. This does not block goal achievement but creates an inconsistency visible to search engines.

---

_Verified: 2026-03-26_
_Verifier: Claude (gsd-verifier)_
