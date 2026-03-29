# MK Ultra Gravel

## What This Is

A website for MK Ultra Gravel — a 100-mile gravel cycling event through Marquette County, Michigan on June 7, 2026. Named after the CIA's infamous LSD experiments, the ride features rowdy, technical gravel sectors rated Paris-Roubaix style (1-5 stars) with timed Grinduro-style sectors and KOM/QOM segments. The site showcases the route with an interactive map synced to an elevation profile, photo-rich sector and KOM cards, a full gallery, brutalist animations, and event details — driving registration through BikeReg.

Live at: https://mkultragravel.netlify.app/

## Core Value

Get gravel cyclists excited enough about this ride to show up on June 7, 2026.

## Requirements

### Validated

- MAP-01: Interactive map with full 80-mile route — v1.0
- MAP-02: GPX track rendered as polyline — v1.0
- MAP-03: Gravel sectors highlighted with star ratings — v1.0
- MAP-04: KOM segments highlighted with gradient/elevation info — v1.0
- MAP-05: Restock points displayed as markers — v1.0
- MAP-06: 53 geo-located photos as clickable clustered markers — v1.0 (20 added in v2.0)
- MAP-07: Elevation profile alongside map with sector bands — v1.0
- MAP-08: GPX file download — v1.0
- ROUTE-01: Paris-Roubaix style sector cards with photos — v1.0 (photos added v2.0)
- ROUTE-02: KOM segment listings with photos — v1.0 (photos added v2.0)
- ROUTE-03: Restock point listings — v1.0
- EVENT-01: Event date/location/details prominently displayed — v1.0
- EVENT-02: GLRC donation info with $10 suggested amount — v1.0 (URL activated v2.0)
- EVENT-03: BikeReg CTA above fold + below map — v1.0 (URL activated v2.0)
- EVENT-04: Live countdown timer — v1.0
- VIS-01: 53-photo gallery grid — v1.0 (upgraded v2.0)
- VIS-02: PhotoSwipe full-screen lightbox — v1.0
- VIS-03: Dark brutalist psychedelic design — v1.0
- VIS-04: Special Elite headers + Space Mono body — v1.0
- VIS-05: CIA/Escher/surrealist visual motifs — v1.0
- PERF-01: Responsive mobile layout (375px+) — v1.0
- PERF-02: Map gesture handling without scroll-trapping — v1.0
- DATA-01: Segment mile markers corrected — v2.0
- DATA-02: Photo mile-marker positions corrected — v2.0
- DATA-03: Laughing Whitefish River removed from restock — v2.0
- DATA-04: 20 new photos processed through pipeline — v2.0
- DATA-05: Route distance + elevation gain in route-data.json — v2.0
- SYNC-01: Elevation chart hover shows crosshair on map — v2.0
- SYNC-02: Map route hover highlights elevation position — v2.0
- SYNC-03: Elevation sector click zooms map to segment — v2.0
- SYNC-04: Map sector click highlights elevation band — v2.0
- VIS-06: Sector card photos — v2.0
- VIS-07: KOM card photos — v2.0
- VIS-08: Gallery thumbnails 400px/q80 WebP — v2.0
- VIS-09: Brutalist hover animations — v2.0
- VIS-10: Scroll-reveal entrance animations — v2.0
- VIS-11: Click feedback animations — v2.0
- CONT-01: MK Ultra name explainer with redacted-reveal — v2.0
- CONT-02: BikeReg URL activated — v2.0
- CONT-03: GLRC donation URL activated — v2.0
- CONT-04: Route stats displayed on map + description — v2.0
- VIS-12: Sector color spectrum yellow-to-red for all star ratings — v3.0
- DATA-06: Photo map positions verified and corrected (33/53 mile markers) — v3.0
- UX-01: Elevation hover crosshair replaced with bike SVG icon — v3.0
- VIS-13: KOM segments displayed on elevation profile as dashed chartreuse bands — v3.0
- CONT-05: All GLRC/Great Lakes Recovery Centers mentions clickable donation links — v3.0
- VIS-14: Escher tessellation background with drift animation and reduced-motion gate — v3.0
- VIS-15: Penrose triangle SVG favicon — v3.0

### Active

**Current Milestone: v4.0 — Route Update + UX Overhaul**

**Goal:** Update to the 100mi route, add new photos, improve map/gallery UX, refine card layout and content, and add header Penrose triangle.

**Target features:**
- 100mi GPX route replacement + data pipeline re-run + reference updates
- Two new photos (Down Jeep + Billie Helmer B&W) processed through pipeline
- Map reset button below map (resets map + elevation to default view)
- Photo map thumbnails larger + lightbox on click (replace new-tab behavior)
- Gravel sector cards resized to match KOM cards
- Grinduro-style event format explainer in sector section
- Larger map zoom controls
- Penrose triangle above page title with subtle animation

### Out of Scope

- Registration system — handled by BikeReg, site just links to it
- User accounts / login — no need
- Results / timing — not a race
- Mobile app — web only
- Blog / news updates — single-page event site
- Email list signup — single event, high obligation, low return
- Merchandise / shop — not the site's purpose
- Strava live leaderboard — TOS prohibits displaying user data to third parties; API endpoint blocked since June 2020
- Strava segment embeds — unreliable due to Chrome third-party cookie deprecation
- Weather widget — irrelevant before event day
- Backend / serverless functions — site stays fully static

## Context

**Shipped v3.0** with ~2,703 LOC across Astro/CSS/JS source files and build scripts.

**Tech stack:** Astro 6, Tailwind v4, Leaflet 1.9.4, Chart.js, PhotoSwipe, sharp (thumbnails)

**Deployment:** Netlify with git-triggered CI/CD from GitHub. Prebuild pipeline generates route-data.json, annotations.json, photos.json, thumbnails, card crops, and hero WebP on every deploy.

**Performance:** Lighthouse mobile Performance 96, LCP 2.48s, CLS 0.054, TBT 0ms. All Core Web Vitals green. All animations compositor-safe (transform/opacity only). v3.0 Escher drift animation gated behind prefers-reduced-motion.

**Event Details:**
- Date: June 7, 2026
- Distance: 100 miles
- Start: Marquette Fire Bell, Marquette, MI
- Cost: Free. $10 suggested donation to Great Lakes Recovery Centers
- Format: Mass start with Grinduro-style timed gravel sectors and KOM/QOM segments
- Registration: BikeReg (https://www.bikereg.com/mk-ultra-gravel)

## Constraints

- **Tech stack**: Static site — no backend needed, content is fixed
- **External dependency**: BikeReg handles registration, site links out
- **Assets**: GPX file (100mi route) and 55 route photos in repo; photos use manual mile-marker positioning (no EXIF GPS)
- **Timeline**: Site needs to be live well before June 7, 2026

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Paris-Roubaix sector rating system | Familiar to cycling audience, communicates difficulty clearly | Good |
| BikeReg for registration | No need to build registration; established cycling platform | Good |
| Free event with suggested donation | Lower barrier to entry, supports Great Lakes Recovery Centers | Good |
| Leaflet 1.9.4 (not 2.0 alpha) | 2.0 is ESM-only with broken API | Good |
| oklch color space for tokens | Perceptually uniform, precise dark palette control | Good |
| prebuild npm lifecycle hook | Data pipeline runs automatically before build | Good |
| Netlify over Cloudflare Pages | User preference | Good |
| Tailwind v4 CSS-first config | No tailwind.config.js, @theme in global.css | Good |
| Manual photo positioning | All 53 photos lack EXIF GPS | Acceptable |
| Scripts self-contained | findPointAtMile duplicated, not shared | Acceptable |
| CustomEvent bus for map-elevation sync | Decouples components without import coupling across Astro script tags | Good |
| Haversine proximity for card photo assignment | No new npm dependency; pure Node.js arithmetic | Good |
| CSS-only animations | Protects TBT 0ms; no GSAP or motion library | Good |
| Two-div pattern for card-hover + overflow-hidden | CSS Overflow Module Level 3 clips box-shadow; structural fix | Good |
| Strava leaderboard permanently dropped | TOS prohibits displaying user data; endpoint blocked since June 2020 | Good — avoided wasted effort |

| Four `<rect>` in SVG tile, no `<use>` | Data URI can't resolve fragment identifiers | Good |
| KOM annotations omit _baseColor | Isolates KOM from sector hover/click handlers | Good |
| Hex fills in favicon SVG | oklch in SVG fill attribute has inconsistent browser support | Good |

---
*Last updated: 2026-03-29 after v4.0 milestone started*
