# MK Ultra Gravel

## What This Is

A website for MK Ultra Gravel — a 100-mile gravel cycling event through Marquette County, Michigan on June 7, 2026. Named after the CIA's infamous LSD experiments, the ride features rowdy, technical gravel sectors rated Paris-Roubaix style (1-5 stars) with timed Grinduro-style sectors and KOM/QOM segments. The site showcases the route with an interactive map synced to an elevation profile, 55 geo-located photos with thumbnail markers and lightbox, photo-rich sector and KOM cards, a Grinduro format explainer, a full gallery, brutalist animations with Penrose triangle hero and Escher tessellation background, and event details — driving registration through BikeReg.

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
- ROUTE-04: 100mi GPX replaces 80mi + pipeline regeneration — v4.0
- ROUTE-05: All "80 mile" references updated to "100 miles" — v4.0
- ROUTE-06: Sector and KOM mile markers verified against 100mi track — v4.0
- PHOTO-01: Down Jeep photo integrated at mi 83.8 — v4.0
- PHOTO-02: Billie Helmer B&W AVIF photo integrated at mi 22.1 — v4.0
- MAP-09: Map reset button as custom Leaflet control — v4.0
- MAP-10: Map zoom controls enlarged to 52px touch targets — v4.0
- MAP-11: Photo markers display 48px thumbnail divIcons — v4.0
- MAP-12: Photo marker click opens PhotoSwipe lightbox with swipe navigation — v4.0
- LAYOUT-01: Gravel sector cards match KOM cards via h-[180px] — v4.0
- LAYOUT-02: Penrose triangle SVG hero with 20s rotation animation — v4.0
- CONT-06: Grinduro format explainer above sector cards — v4.0
- STRAVA-01: Strava icon + link on all 9 sector/KOM cards — v5.0
- STRAVA-02: Segment metadata (distance, avg grade) on cards — v5.0
- STRAVA-03: Manual KOM/QOM times on 3 KOM cards — v5.0
- SCORE-01: Gravel Champion scoring engine (cumulative time, gender-separated) — v5.0
- SCORE-02: KOM/QOM Champion scoring engine (10-1 points, gender-separated) — v5.0
- SCORE-03: Scoring system explainer component — v5.0
- SUBMIT-01: Strava OAuth flow via Netlify Functions — v5.0
- SUBMIT-02: Segment_efforts extraction from activity — v5.0
- SUBMIT-03: Self-reported gender/category dropdown — v5.0
- SUBMIT-04: Explicit consent checkbox for public results — v5.0
- SUBMIT-05: Per-athlete JSON via GitHub API + rebuild trigger — v5.0
- SUBMIT-06: Activity validation (matching segment_efforts) — v5.0
- SUBMIT-07: Deauthorization webhook with 48hr data deletion — v5.0
- RESULT-01: Gravel Champion leaderboard with gender tabs — v5.0
- RESULT-02: KOM/QOM Champion leaderboard with gender tabs — v5.0
- RESULT-03: Individual segment leaderboards — v5.0
- RESULT-04: Per-segment time breakdowns in gravel rows — v5.0
- RESULT-05: Strava activity links on result rows — v5.0
- CLR-01: Shared starColors module extracted — v6.0
- CLR-02: Map polylines match sector card colors — v6.0
- CLR-03: Elevation bands match sector card colors — v6.0
- ELEV-01: Sector names on elevation profile — v6.0
- ELEV-02: Star ratings on elevation profile — v6.0
- ELEV-03: Labels at bottom of chart — v6.0
- ELEV-04: Labels staggered to avoid overlap — v6.0
- NAV-01: Fixed header nav on all pages — v6.0
- NAV-02: Links to Home, Results, Submit — v6.0
- NAV-03: Active page visually indicated (build-time) — v6.0
- NAV-04: Nav z-index clears grain/Escher overlays — v6.0

### Active

(None — planning next milestone)

### Out of Scope

- Registration system — handled by BikeReg, site just links to it
- User accounts / login — no need
- Mobile app — web only
- Blog / news updates — single-page event site
- Email list signup — single event, high obligation, low return
- Merchandise / shop — not the site's purpose
- Strava segment embeds — unreliable due to Chrome third-party cookie deprecation
- Auto-scraping KOM/QOM from Strava — TOS violation; using manual entry
- Weather widget — irrelevant before event day
- Database — JSON file storage sufficient for single-event results
- Real-time leaderboard updates — rebuild-on-commit is acceptable latency

## Context

**Shipped v6.0** with ~11,700 LOC across Astro/CSS/JS/TS source files, Netlify Functions, and build scripts. 71 plans shipped across 35 phases and 6 milestones.

**Tech stack:** Astro 6, Tailwind v4, Leaflet 1.9.4, Chart.js (+ annotation plugin), PhotoSwipe, sharp (thumbnails), vitest (testing), Netlify Functions v1 (Strava OAuth/API)

**Deployment:** Netlify with git-triggered CI/CD from GitHub. Prebuild pipeline generates route-data.json, annotations.json, photos.json, thumbnails, card crops, and hero WebP on every deploy. Strava OAuth submission triggers GitHub API commit + Netlify build hook for rebuild.

**Performance:** Lighthouse mobile Performance 96, LCP 2.48s, CLS 0.054, TBT 0ms. All Core Web Vitals green. All animations compositor-safe (transform/opacity only). Escher drift and Penrose spin animations gated behind prefers-reduced-motion.

**v6.0 shipped:** Shared starColors module for color consistency, sector name/star-rating labels on elevation profile, fixed site navigation header with build-time active link detection.

**Event Details:**
- Date: June 7, 2026
- Distance: 100 miles
- Start: Marquette Fire Bell, Marquette, MI
- Cost: Free. $10 suggested donation to Great Lakes Recovery Centers
- Format: Mass start with Grinduro-style timed gravel sectors and KOM/QOM segments
- Registration: BikeReg (https://www.bikereg.com/mk-ultra-gravel)

## Constraints

- **Tech stack**: Astro static site + Netlify Functions for Strava OAuth/API
- **External dependency**: BikeReg handles registration, site links out
- **Assets**: GPX file (100mi route) and 55 route photos in repo (1 AVIF, rest JPG); photos use manual mile-marker positioning (no EXIF GPS)
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
| Strava leaderboard permanently dropped | TOS prohibits displaying user data; endpoint blocked since June 2020 | ✓ Revisited — v5.0 uses consent-based OAuth, not scraping |

| starColors extracted to src/lib/starColors.ts | Single source of truth; follows src/lib/ pattern for shared constants | Good |
| Annotation label sub-object (not CSS overlay) | y-axis alignment reliable; logic co-located with annotation data | Good |
| Astro.url.pathname for active link detection | No client JS, no FOUC, fully static-safe; aria-current="page" as CSS hook | Good |
| z-index 10000 for nav | Must clear grain (9999) and Escher (9998) overlays | Good |
| /submit-confirm grouped with /submit in isActive() | Both are part of submission flow | Good |
| Four `<rect>` in SVG tile, no `<use>` | Data URI can't resolve fragment identifiers | Good |
| KOM annotations omit _baseColor | Isolates KOM from sector hover/click handlers | Good |
| Hex fills in favicon SVG | oklch in SVG fill attribute has inconsistent browser support | Good |
| Math.floor for distance display | 100.71 rounds to 101 with Math.round, wrong for "100 mile" event | Good |
| Photo positioning at annotation midpoints | Guarantees Pass 1 card assignment in assign-card-photos.js | Good |
| L.Control.extend for reset button | User feedback: reset belongs with map controls, not standalone | Good |
| Programmatic PhotoSwipe (no gallery DOM) | Map markers have no DOM gallery; dataSource + loadAndOpen pattern | Good |
| h-[180px] fixed image height | Decouples card image from container width; gravel col-span-2 was 2x taller | Good |
| showHideAnimationType: 'fade' | No DOM anchor element to zoom from (lightbox opens programmatically) | Good |
| .leaflet-bar a broadened selector | All map controls (zoom + reset) share unified dark theme | Good |
| Netlify Functions v1 (exports.handler) | Active v2 env var bug as of 2026-03-28 | Good |
| OAuth state = base64url JSON {nonce, activityUrl} | Activity URL survives round-trip without server storage | Good |
| activity:read_all scope (not activity:read) | include_all_efforts=true requires read_all | Good |
| Gender from form, not Strava profile | Schema intent + self-identification | Good |
| String segment IDs in scoring engine | Strava returns integer, String() cast avoids coercion | Good |
| Tie-safe dense ranking | Athletes with identical times share rank and points | Good |
| Combined genders per segment leaderboard | Avoids 27 mini-boards; cross-category performance | Good |
| Root-cause fix in resolve-annotations.js | Ensures idempotency vs manual JSON edit | Good |
| Fire-and-forget Netlify build hook | Submission must not fail if hook is slow/unavailable | Good |
| CSRF cookie double-submit pattern | Prevents OAuth state replay attacks | Good |

---
*Last updated: 2026-03-30 after v6.0 milestone*
