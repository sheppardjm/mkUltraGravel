# Project Milestones: MK Ultra Gravel

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
