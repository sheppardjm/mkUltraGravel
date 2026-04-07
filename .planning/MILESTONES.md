# Project Milestones: MK Ultra Gravel

## v10.2 Neucadia Footer (Shipped: 2026-04-07)

**Delivered:** "Powered by Neucadia" attribution footer with logo and external link rendered on every page via BaseLayout integration, using site design tokens for dark brutalist consistency.

**Phases completed:** 51 (1 plan total)

**Key accomplishments:**

- Neucadia logo downloaded and rendered white via CSS grayscale + brightness filter on dark background
- NeucadiaFooter.astro component with scoped styles using site design tokens (mono font, muted text, border, base bg)
- Footer integrated into BaseLayout after slot — renders on all pages with zero z-index conflicts
- Accessibility: aria-label, prefers-reduced-motion, loading=lazy, rel="noopener noreferrer"
- UAT: 5/5 tests passed, verification: 4/4 must-haves passed

**Stats:**

- 3 code files changed (+72 lines)
- ~3,512 lines of code total (Astro/CSS/JS/TS)
- 1 phase, 1 plan, 2 tasks
- 1 day (2026-04-07)

**Git range:** `79e2953` → `da6f3fe`

**What's next:** Site is production-ready for June 7, 2026 event. Future work TBD via `/gsd:new-milestone`.

---

## v10.1 Polish (Shipped: 2026-04-06)

**Delivered:** Final visual polish — dark accent-green themed scrollbars via CSS Scrollbars Level 1 + WebKit fallback, and proportional 16:9 gravel sector card images replacing clipped 180px fixed height.

**Phases completed:** 50 (1 plan total)

**Key accomplishments:**

- Dark-themed scrollbars (accent-green thumb on dark surface track) inherited by all scrollable containers via CSS Scrollbars Level 1
- WebKit fallback with @supports selector(::-webkit-scrollbar) guard covering Chrome <121 and Safari <18
- Gravel sector card images render proportionally at 16:9 on wide screens instead of being clipped at 180px
- Build passes with zero errors, zero regressions, Lighthouse mobile 96 maintained

**Stats:**

- 2 files modified (+23/-1 lines)
- 2,299 lines of code remaining (Astro/CSS/JS/TS)
- 1 phase, 1 plan, 2 tasks
- 1 day (2026-04-06)

**Git range:** `80f7b50` → `012c7d3`

**What's next:** Site is production-ready for June 7, 2026 event. Future work TBD via `/gsd:new-milestone`.

---

## v10.0 Strava Decoupling (Shipped: 2026-04-06)

**Delivered:** Removed all Strava OAuth, scoring engine, submission flow, and results leaderboards from MK Ultra. Replaced /results with CTA to Iron & Pine Omnium (ironpineomnium.com). Site is now a zero-backend pure static Astro site.

**Phases completed:** 48-49 (3 plans total)

**Key accomplishments:**

- Deleted all Strava infrastructure — 4 Netlify Functions, 3 OAuth pages, scoring engine + test suite, validation script, 25 athlete JSON files
- Converted MK Ultra from Netlify Functions + Astro to zero-backend pure static site (-3,574 source LOC)
- Created styled /results CTA page directing users to ironpineomnium.com for leaderboards
- Simplified SiteNav from 3 links (Home, Results, Submit) to 2 links (Home, Results)
- Preserved all 10 Strava segment links on sector and KOM cards as static links

**Stats:**

- 41 source files changed
- 2,277 lines of code remaining (Astro/CSS/JS/TS)
- 2 phases, 3 plans, 6 tasks
- 1 day (2026-04-06)

**Git range:** `5eba515` → `070173f`

**What's next:** Site is production-ready for June 7, 2026 event. Future work TBD via `/gsd:new-milestone`.

---

## v9.0 New Sector Addition (Shipped: 2026-04-02)

**Delivered:** Added BAA gravel sector (Strava segment 41159670, mile 12.9, 2-star) as 7th sector across all 5 surfaces — map polyline, elevation profile, sector card, scoring engine, and results page. All content updated from "six" to "seven" sectors. 13 vitest tests green.

**Phases completed:** 47 (1 plan total)

**Key accomplishments:**

- BAA sector resolves to 66 track points at mile 12.9 with pipeline-assigned cover photo and 2-star color coding
- Scoring engine counts 7 required sectors; SECTOR_SEGMENT_IDS includes "41159670" as first entry
- All 13 vitest tests pass with updated 7-sector fixtures (makeGravelAthlete, DNF, tie scenarios)
- Zero stale references — all "six"/"6 sector" strings updated across 4 source files

**Stats:**

- 15 files created/modified
- +1,109 / -33 lines of code
- 1 phase, 1 plan, 2 tasks
- 1 day (2026-04-02)

**Git range:** `e71ea34` → `b331a58`

**What's next:** Awaiting Strava app review approval (REVIEW-03). Site production-ready for June 7, 2026 event. Future work gated on external review or post-event needs.

---

## v8.0 Visual Polish + Content (Shipped: 2026-04-01)

**Delivered:** Elevated visual texture and photo presentation — updated GPX route, 16 new photos (55→71), CSS columns masonry gallery, SVG lizard tessellation on sectors, tone card accents, canvas metaball topographic dividers, and three-layer animated background stack — Lighthouse 96 mobile, TBT 0ms, CLS 0.073.

**Phases completed:** 41-46 (6 plans total)

**Key accomplishments:**

- Replaced GPX route source (MKULTRA.gpx) with clean pipeline re-run — 100.62mi, 2581 trackpoints, 3365ft gain
- Expanded photo library from 55 to 71 with owner-curated mile markers spanning mi 13.8–95.4
- Built CSS columns masonry gallery — natural aspect ratios, overflow scroll, CLS-safe placeholders
- Added SVG lizard tessellation on #sectors + tone accents on 3 cards (2 sector + 1 KOM)
- Created canvas metaball topographic dividers between sections with IntersectionObserver animation
- Completed three-layer texture stack (lizard 9997, escher 9998, grain 9999) — all reduced-motion gated

**Stats:**

- 24 files created/modified
- ~4,074 lines of code total (Astro/CSS/JS/TS)
- 6 phases, 6 plans, ~18 tasks
- 2 days (2026-03-31 → 2026-04-01)

**Git range:** `fd0d117` → `1226caf`

**What's next:** Awaiting Strava app review approval (REVIEW-03, submitted 2026-03-31). Site is production-ready for June 7, 2026 event. Future work gated on external review or post-event needs.

---

## v7.0 Strava Go-Live (Shipped: 2026-03-31)

**Delivered:** Full Strava pipeline operational — environment configured, data pipeline verified end-to-end, OAuth round-trip tested on production HTTPS with real Strava account, webhook subscription registered with deauth deletion verified, branding compliance fixed, and developer program review submitted to start the approval clock.

**Phases completed:** 36-40 (5 plans total)

**Key accomplishments:**

- All 8 Netlify env vars configured with Functions scope, Strava callback domain + GitHub PAT verified
- End-to-end data pipeline verified: submit-result → GitHub commit → Netlify rebuild → leaderboard
- Full OAuth round-trip on production HTTPS with scope validation, client-side data parsing fix, Safari CSRF cookie verified
- Strava webhook subscription #338141 registered, challenge handshake verified, deauthorization deletion tested
- Strava branding fixed to exact #FC5200 (18 oklch replacements), sr-only "View on Strava" text on all 8 links
- Developer program review form submitted 2026-03-31 — approval pending (7-10 business days)

**Stats:**

- ~35 files created/modified
- ~4,484 lines of code total (Astro/TS/JS/CSS)
- 5 phases, 5 plans
- 1 day (2026-03-31)

**Git range:** `bbf2c21` → `e3c3c3b`

**What's next:** Await Strava app review approval (REVIEW-03). If not approved by ~May 28, escalate to developers@strava.com. Project enters monitoring mode until June 7 event.

---

## v6.0 UI Polish + Dev Tools (Shipped: 2026-03-30)

**Delivered:** Color consistency via shared starColors module, sector name/star-rating labels on all 6 elevation profile bands, and fixed site navigation header with build-time active link detection across all pages.

**Phases completed:** 33-35 (3 plans total)

**Key accomplishments:**

- Extracted starColors shared module — single source of truth eliminates color drift between map, chart, and cards
- Added sector name + star-rating labels to all 6 elevation profile bands with stagger strategy
- Built fixed SiteNav header with build-time active link detection (no JS, no FOUC)
- Removed ad-hoc back links — unified navigation replaces per-page workarounds
- Milestone audit scored 100% on all four dimensions (requirements, phases, integration, E2E flows)

**Stats:**

- 24 files created/modified
- +2,121 / -116 lines of code (Astro/TS/CSS)
- 3 phases, 3 plans, 7 tasks
- 1 day (2026-03-30)

**Git range:** `46e52cb` → `2ac1d9b`

**What's next:** TBD — next milestone planning via `/gsd:new-milestone`

---

## v5.0 Strava Integration + Results (Shipped: 2026-03-30)

**Delivered:** Full Strava integration — segment links on all 9 cards, TDD scoring engine, OAuth activity submission via Netlify Functions, results page with dual leaderboards and gender tabs, deauthorization webhook for TOS compliance, and prebuild pipeline gap closure.

**Phases completed:** 27-32 (10 plans total)

**Key accomplishments:**

- Strava segment links on all 9 sector/KOM cards with scoring explainer component
- TDD scoring engine — Gravel Champion (cumulative time) + KOM/QOM Champion (10-1 points) with gender separation, DNF handling, tie-safe ranking (13 vitest tests)
- Strava OAuth activity submission flow — 4 Netlify Functions with CSRF protection, gender/consent form, GitHub API commit + rebuild trigger
- Results page at /results with dual leaderboards, gender tabs, per-segment breakdowns, individual segment rankings
- Deauthorization webhook + privacy notice for Strava TOS Section 5.4 compliance
- Prebuild pipeline gap closure — Strava fields preserved through resolve-annotations.js build

**Stats:**

- 69 files created/modified
- +8,681 lines of code (Astro/JS/JSON)
- 6 phases, 10 plans
- 4 days (2026-03-26 → 2026-03-30)

**Git range:** `b42c1ec` → `03668ac`

**What's next:** TBD — next milestone planning via `/gsd:new-milestone`

---

## v4.0 Route Update + UX Overhaul (Shipped: 2026-03-30)

**Delivered:** Updated route from 80mi to 100mi with full pipeline re-run, added 2 new photos with AVIF support, and shipped 5 UX improvements — photo lightbox from map, map reset, enlarged controls, card layout parity, Penrose hero animation, and Grinduro format explainer.

**Phases completed:** 22-26 (7 plans total)

**Key accomplishments:**

- Replaced 80mi GPX with 100mi route — full data pipeline re-run regenerating all JSON, annotations, and 55 photo positions
- Added Down Jeep and Billie Helmer B&W photos with AVIF pipeline support, expanding gallery from 53 to 55
- Photo map markers upgraded from cyan dots to 48px thumbnails with PhotoSwipe lightbox on click
- Single-click map reset restores all state (bounds, highlights, popups, crosshair, elevation bands)
- Penrose triangle hero SVG with 20s rotation animation; Grinduro format explainer above sector cards
- Map controls enlarged to 52px, card heights equalized between gravel sectors and KOM segments

**Stats:**

- 41 files modified
- ~2,859 lines of code (Astro/CSS/JS)
- 5 phases, 7 plans, ~15 tasks
- 4 days (2026-03-26 → 2026-03-30)

**Git range:** `f03aea5` → `f29fccb`

**What's next:** TBD — next milestone planning via `/gsd:new-milestone`

---

## v3.0 Escher Identity + Data Fixes + UX Polish (Shipped: 2026-03-29)

**Delivered:** Refined visual identity with Escher tessellation background, Penrose triangle favicon, yellow-to-red sector spectrum, corrected photo positions, bike icon crosshair, and KOM elevation bands — all 7 requirements shipped with zero new dependencies and TBT 0ms maintained.

**Phases completed:** 17-21 (6 plans total)

**Key accomplishments:**

- Yellow-to-red difficulty spectrum replaces gray tones across map polylines, elevation bands, and sector cards
- 33 of 53 photo mile markers corrected via custom verification tool built during execution
- KOM segment bands on elevation chart as dashed chartreuse box annotations with layer isolation
- Bike SVG divIcon crosshair replaces plain circleMarker dot on elevation hover
- Penrose impossible triangle favicon with tonal green hex fills
- Escher tessellation background overlay with 50s compositor-safe drift animation and reduced-motion gate

**Stats:**

- 11 source files modified (+338/-298 lines)
- 5 phases, 6 plans, ~9 tasks
- 2 days (2026-03-28 → 2026-03-29)

**Git range:** `c640868` → `666c5de`

**What's next:** Custom domain, Billie Helmer photo replacement when available, Android onHover performance verification

---

## v2.0 Interactivity + Polish (Shipped: 2026-03-28)

**Delivered:** Elevated MK Ultra Gravel from informational to interactive — bidirectional map-elevation sync, automated photo pipeline, brutalist animations, content additions, and UAT-verified polish.

**Phases completed:** 11-16 (15 plans total)

**Key accomplishments:**

- Complete photo pipeline — 53 photos with corrected mile markers, 9 WebP card crops, auto-generated on prebuild
- Interactive map-elevation sync — bidirectional CustomEvent crosshair + sector zoom/highlight
- Dynamic route content — MK Ultra explainer, BikeReg/GLRC URLs activated, live route stats from GPX
- Brutalist animations — instant card hover shadows, scroll-reveal with stagger, :active press feedback
- CSS architecture fixes — Tailwind v4 keyframes, PhotoSwipe layers, overflow-hidden structural pattern
- Zero performance regression — all animations compositor-safe, TBT 0ms maintained

**Stats:**

- 82 files modified
- ~2,663 lines of code (Astro/CSS/JS)
- 6 phases, 15 plans
- 3 days (2026-03-26 → 2026-03-28)

**Git range:** `dec65d6` → `9c437d1`

**What's next:** Custom domain, sponsor section when confirmed, potential v3 enhancements

---

## v1.0 MK Ultra Gravel (Shipped: 2026-03-27)

**Delivered:** Complete event website for MK Ultra Gravel — 80-mile gravel cycling event in Marquette, MI. Live at https://mkultragravel.netlify.app/

**Phases completed:** 1-10 (30 plans total)

**Key accomplishments:**

- Interactive Leaflet map with GPX polyline, 6 sector overlays with Paris-Roubaix star ratings, 3 KOM segments, 4 restock markers, and 33 clustered photo markers
- Dark brutalist psychedelic design system with oklch tokens, film-grain overlay, CIA document aesthetics, and redacted-text motifs
- Chart.js elevation profile with colored sector band overlays showing terrain difficulty at a glance
- 33-photo gallery with WebP thumbnails and PhotoSwipe full-screen lightbox
- Lighthouse mobile Performance 96 — LCP 2.48s, green Core Web Vitals, 69% page transfer reduction
- Live countdown timer, dual registration CTAs, GPX download, GLRC donation context

**Stats:**

- 202 files created/modified
- ~1,917 lines of code (1,028 src + 889 scripts)
- 10 phases, 30 plans, 106 commits
- 2 days from init to ship (2026-03-26 → 2026-03-27)

**Git range:** `13729ae` → `8802112`

**What's next:** Custom domain, BikeReg URL confirmation, potential v2 enhancements (map-sector interactivity, social meta tags)

---
