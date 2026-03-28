# Project Milestones: MK Ultra Gravel

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
