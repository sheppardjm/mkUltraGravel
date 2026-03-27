# MK Ultra Gravel

## What This Is

A website for MK Ultra Gravel — an 80-mile gravel cycling event through Marquette County, Michigan on June 7, 2026. Named after the CIA's infamous LSD experiments, the ride features rowdy, technical gravel sectors rated Paris-Roubaix style (1-5 stars). The site showcases the route with an interactive map, elevation profile, photo gallery, and event details — driving registration through BikeReg.

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
- MAP-06: 33 geo-located photos as clickable clustered markers — v1.0
- MAP-07: Elevation profile alongside map with sector bands — v1.0
- MAP-08: GPX file download — v1.0
- ROUTE-01: Paris-Roubaix style sector cards — v1.0
- ROUTE-02: KOM segment listings — v1.0
- ROUTE-03: Restock point listings — v1.0
- EVENT-01: Event date/location/details prominently displayed — v1.0
- EVENT-02: GLRC donation info with $10 suggested amount — v1.0
- EVENT-03: BikeReg CTA above fold + below map (URL pending confirmation) — v1.0
- EVENT-04: Live countdown timer — v1.0
- VIS-01: 33-photo gallery grid — v1.0
- VIS-02: PhotoSwipe full-screen lightbox — v1.0
- VIS-03: Dark brutalist psychedelic design — v1.0
- VIS-04: Special Elite headers + Space Mono body — v1.0
- VIS-05: CIA/Escher/surrealist visual motifs — v1.0
- PERF-01: Responsive mobile layout (375px+) — v1.0
- PERF-02: Map gesture handling without scroll-trapping — v1.0

### Active

#### Current Milestone: v2.0

**Goal:** Elevate the site from informational to interactive — map-elevation sync, Strava leaderboards, data corrections, visual polish.

**Target features:**
- Map-elevation profile interactivity (crosshair sync + segment highlighting)
- Live Strava KOM/QOM leaderboard
- Photos on sector and KOM cards
- MK Ultra name explainer section
- Data fixes (segment locations, photo positions, restock cleanup)
- Image quality improvements (thumbnails, WebP)
- Correct registration + donation URLs
- Subtle hover/click/load animations
- New photos processed into pipeline
- Route stats (length + elevation gain) on map/description

### Out of Scope

- Registration system — handled by BikeReg, site just links to it
- User accounts / login — no need
- Results / timing — not a race
- Mobile app — web only
- Blog / news updates — single-page event site
- Email list signup — single event, high obligation, low return
- Merchandise / shop — not the site's purpose
- Strava live segment embeds — API rate limits make live embeds brittle (note: v2.0 leaderboard uses periodic scraping, not live embeds)
- Weather widget — irrelevant before event day

## Context

**Shipped v1.0** with ~1,917 LOC across 12 Astro/CSS/JS source files and 8 build scripts.

**Tech stack:** Astro 6, Tailwind v4, Leaflet 1.9.4, Chart.js, PhotoSwipe, sharp (thumbnails)

**Deployment:** Netlify with git-triggered CI/CD from GitHub. Prebuild pipeline generates route-data.json, annotations.json, photos.json, thumbnails, and hero WebP on every deploy.

**Performance:** Lighthouse mobile Performance 96, LCP 2.48s, CLS 0.054, TBT 0ms. All Core Web Vitals green.

**Known pre-launch item:** BikeReg registration URL is a placeholder — one-line edit in `src/pages/index.astro` (BIKEREG_URL constant) + push to deploy.

**Event Details:**
- Date: June 7, 2026
- Distance: 80 miles
- Start: Marquette Fire Bell, Marquette, MI
- Cost: Free. $10 suggested donation to Great Lakes Recovery Centers
- Format: Mass start, not a race
- Registration: BikeReg (external)

## Constraints

- **Tech stack**: Static site — no backend needed, content is fixed
- **External dependency**: BikeReg handles registration, site links out
- **Assets**: GPX file and 33 route photos in repo; photos use manual mile-marker positioning (no EXIF GPS)
- **Timeline**: Site needs to be live well before June 7, 2026

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Paris-Roubaix sector rating system | Familiar to cycling audience, communicates difficulty clearly | Good — star-rated sector cards are a visual differentiator |
| BikeReg for registration | No need to build registration; established cycling platform | Good — URL pending event director confirmation |
| Free event with suggested donation | Lower barrier to entry, supports Great Lakes Recovery Centers | Good — donation context displayed clearly |
| Leaflet 1.9.4 (not 2.0 alpha) | 2.0 is ESM-only with broken API | Good — stable, Carto Dark Matter tiles need no API key |
| oklch color space for tokens | Perceptually uniform, precise dark palette control | Good — enabled WCAG contrast tuning with mathematical precision |
| prebuild npm lifecycle hook | Data pipeline runs automatically before build | Good — zero manual steps, works on Netlify CI |
| Netlify over Cloudflare Pages | User preference | Good — functionally equivalent, deployed in minutes |
| Tailwind v4 CSS-first config | No tailwind.config.js, @theme in global.css | Good — cascade layers resolved Leaflet CSS conflicts |
| Manual photo positioning | All 33 photos lack EXIF GPS | Acceptable — positions approximate but convincing on map |
| Scripts self-contained | findPointAtMile duplicated, not shared | Acceptable — each script runnable independently |

---
*Last updated: 2026-03-27 after v2.0 milestone start*
