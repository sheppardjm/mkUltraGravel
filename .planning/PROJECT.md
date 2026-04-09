# MK Ultra Gravel

## What This Is

A website for MK Ultra Gravel — a 100-mile gravel cycling event through Marquette County, Michigan on June 7, 2026. Named after the CIA's infamous LSD experiments, the ride features rowdy, technical gravel sectors rated Paris-Roubaix style (1-5 stars) with timed Grinduro-style sectors and KOM/QOM segments. The site showcases the route with an interactive map synced to an elevation profile, 71 geo-located photos with thumbnail markers and lightbox, photo-rich sector and KOM cards, a Grinduro format explainer, a full gallery, brutalist animations with Penrose triangle hero and Escher tessellation background, and event details — driving registration through BikeReg. Pure static Astro site with zero backend dependencies. Strava submission and leaderboards moved to Iron & Pine Omnium (ironpineomnium.com) in v10.0.

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

- ENV-01 through ENV-04: Netlify environment configuration — v7.0
- PIPE-01 through PIPE-04: Data pipeline verification — v7.0
- OAUTH-01 through OAUTH-07: OAuth flow testing — v7.0
- HOOK-01 through HOOK-03: Webhook & deauthorization — v7.0
- REVIEW-01: Strava branding compliance (#FC5200, "View on Strava", "Powered by Strava") — v7.0
- REVIEW-02: Strava developer program review submitted (2026-03-31) — v7.0

- ROUTE-07: Updated GPX route (MKULTRA.gpx) with full pipeline re-run — v8.0
- PHOTO-03: 16 new route photos processed through pipeline (3 excluded by owner, 55→71 total) — v8.0
- GAL-01: CSS columns masonry gallery with natural aspect ratios — v8.0
- TONE-01: SVG lizard tessellation on #sectors + tone accents on 3 cards — v8.0
- TOPO-01: Canvas metaball topographic dividers between sections — v8.0
- LIZD-01: Animated lizard background layer at z-index 9997 — v8.0
- PERF-03: Lighthouse mobile 96, TBT 0ms, CLS 0.073 with full v8.0 stack — v8.0
- SECT-01: BAA sector defined in annotation pipeline with start/end coordinates, 2-star rating, mile 12.9 — v9.0
- SECT-02: BAA Strava segment 41159670 linked with distance and avg grade metadata — v9.0
- SECT-03: BAA sector displayed as colored polyline on map with 2-star color coding — v9.0
- SECT-04: BAA sector band on elevation profile with matching star color and label — v9.0
- SECT-05: BAA sector card with pipeline-assigned cover photo, 2-star rating, Strava link — v9.0
- SECT-06: BAA included in Gravel Champion scoring engine (6 -> 7 required sectors) — v9.0
- REM-01 through REM-06: All Strava infrastructure deleted (Functions, pages, scoring, data) — v10.0
- REP-01: /results replaced with CTA to ironpineomnium.com — v10.0
- REP-02: SiteNav simplified to Home + Results (Submit removed) — v10.0
- PRE-01 through PRE-03: Strava segment links + static build preserved — v10.0
- CLN-01: KOM/QOM time display removed from KomSegments.astro — v10.0
- SCROLL-01: Main page vertical scrollbar uses dark theme matching site background and accent colors — v10.1
- SCROLL-02: Gallery horizontal scrollbar uses dark theme consistent with SCROLL-01 — v10.1
- SCROLL-03: All scrollable containers use consistent dark scrollbar theme — v10.1
- CARD-01: Gravel sector card images maintain good aspect ratio on wide screens via aspect-video — v10.1
- FOOT-01: Site footer displays "Powered by Neucadia" with Neucadia logo — v10.2
- FOOT-02: Footer links to neucadia.com (opens in new tab) — v10.2
- FOOT-03: Footer styling consistent with site's dark brutalist design — v10.2
- ELEV-05: Elevation profile sector name labels hidden below 640px viewport width — v10.3
- ELEV-06: Elevation profile star-rating labels hidden below 640px viewport width — v10.3
- ELEV-07: Elevation profile KOM segment labels hidden below 640px viewport width — v10.3
- ELEV-08: Colored sector and KOM bands remain visible on all viewport sizes — v10.3

### Active

**Current Milestone: v10.5 SEO & Social Sharing**

**Goal:** Make the site discoverable and shareable — proper previews when links are shared, structured data for search engines, and crawl infrastructure.

**Target features:**
- Open Graph + Twitter Card meta tags with route photo share image
- JSON-LD Event structured data (date, location, free event)
- robots.txt + sitemap.xml for search engine crawling
- Canonical URLs using mkultragravel.com

### Out of Scope

- Registration system — handled by BikeReg, site just links to it
- User accounts / login — no need
- Mobile app — web only
- Blog / news updates — single-page event site
- Email list signup — single event, high obligation, low return
- Merchandise / shop — not the site's purpose
- Strava segment embeds — unreliable due to Chrome third-party cookie deprecation
- Auto-scraping KOM/QOM from Strava — TOS violation
- Strava OAuth submission — removed in v10.0, moved to Iron & Pine Omnium
- On-site results/leaderboards — removed in v10.0, moved to Iron & Pine Omnium for Strava ToS compliance
- Scoring engine — removed in v10.0, moved to Iron & Pine Omnium
- Weather widget — irrelevant before event day
- Database — JSON file storage sufficient for single-event results
- Real-time leaderboard updates — rebuild-on-commit is acceptable latency

## Context

**Shipped v10.4** with ~2,369 LOC across Astro/CSS/JS/TS source files and build scripts. 94 plans shipped across 55 phases and 13 milestones. Pure static Astro site with zero backend dependencies. /results redirects to ironpineomnium.com for leaderboards. Visual texture stack complete — three animated overlays (grain, escher, lizard) with reduced-motion gates. Photo library at 71 images in masonry gallery. Dark-themed scrollbars, proportional card images, "Powered by Neucadia" attribution footer, responsive elevation profile labels, card display polish, and balanced gallery fill complete the visual layer. No social meta tags, structured data, or crawl infrastructure exist yet.

**Tech stack:** Astro 6, Tailwind v4, Leaflet 1.9.4, Chart.js (+ annotation plugin), PhotoSwipe, sharp (thumbnails)

**Deployment:** Netlify with git-triggered CI/CD from GitHub. Prebuild pipeline generates route-data.json, annotations.json, photos.json, thumbnails, card crops, and hero WebP on every deploy. Fully static — no Netlify Functions, no SSR adapter.

**Performance:** Lighthouse mobile Performance 96, LCP 2.48s, CLS 0.054, TBT 0ms. All Core Web Vitals green. All animations compositor-safe (transform/opacity only). Escher drift and Penrose spin animations gated behind prefers-reduced-motion.

**v10.3 shipped:** Mobile Elevation Labels — responsive annotation labels hidden on mobile (< 640px), visible on desktop (640px+), with colored bands preserved at all sizes. Down Jeep narrow-sector gap closed. Previous: v10.2 Neucadia Footer; v10.1 dark-themed scrollbars + proportional card images; v10.0 removed all Strava infrastructure.

**Event Details:**
- Date: June 7, 2026
- Distance: 100 miles
- Start: Marquette Fire Bell, Marquette, MI
- Cost: Free. $10 suggested donation to Great Lakes Recovery Centers
- Format: Mass start with Grinduro-style timed gravel sectors and KOM/QOM segments
- Registration: BikeReg (https://www.bikereg.com/mk-ultra-gravel)

## Constraints

- **Tech stack**: Astro static site (pure static, no Netlify Functions)
- **External dependency**: BikeReg handles registration, site links out
- **Assets**: GPX file (100mi route) and 71 route photos in repo (1 AVIF, rest JPG); photos use manual mile-marker positioning (no EXIF GPS)
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

| STRAVA_REDIRECT_URI = full URL, not relative | Strava OAuth validates exact URI string | Good |
| SECRETS_SCAN_OMIT_PATHS for .planning/ | Unblocked Netlify builds failing on env var values in planning docs | Good |
| Client-side query param parsing in static Astro | Static builds cannot read request-time query params in frontmatter | Good |
| Exact #FC5200 for Strava branding (not oklch) | Strava brand guidelines require exact hex color | Good |
| sr-only "View on Strava" spans | Satisfies brand guideline + accessibility without visual change | Good |
| Delete pages before backend dependencies | results.astro imports scoring.js — delete pages first to prevent build failures | Good |
| Retain Strava segment links on cards | Static URLs to strava.com, not OAuth-dependent — useful to riders | Good |
| Remove "test" script with scoring.js | vitest exits non-zero with no test files; breaks CI | Good |
| Retain [[redirects]] in netlify.toml | /api/* redirect is harmless dead-end; removing risks redirect regression | Good |
| /results CTA to ironpineomnium.com | Strava features decoupled to separate app for TOS compliance | Good |
| isActive() simplified to exact match | Only "/" and "/results" exist; no prefix matching needed | Good |

| CSS columns masonry over JS library | Preserves TBT 0ms; no new runtime dependency | Good |
| SVG pattern tessellation over raster WebP | Resolution-independent on all screen sizes | Good |
| Canvas metaball + SVG filter over stroke-dashoffset | Matches codepen reference; more organic visual | Good |
| Lizard opacity 0.04 (below grain 0.06, escher 0.05) | Subliminal layer — shouldn't be immediately obvious | Good |
| mask-image gate hiding lizard from hero section | Prevents visual competition with Penrose + Escher in first viewport | Good |
| Three-layer z-index stack: 9997 < 9998 < 9999 < 10000 | Consistent ordering: lizard < escher < grain < nav | Good |

| scrollbar-color on html in @layer base | Consistent with existing element selector pattern; CSS inheritance covers all containers | Good |
| WebKit scrollbar fallback outside @layer | Pseudo-element selectors not layer-scoped; @supports guard prevents conflicts | Good |
| aspect-video replacing h-[180px] on gravel cards | Matches KomSegments.astro pattern; proportional on all screen widths | Good |

| In-flow footer (not fixed/sticky) | No z-index conflicts, no layout shift on either page | Good |
| grayscale(100%) brightness(2) filter on logo | Renders PNG as white on dark background without separate asset | Good |
| Footer after `<slot />` in BaseLayout | Ensures footer renders below all page content on every page | Good |

| Scriptable label.display for viewport-conditional rendering | Preserves colored bands (annotation root display untouched) while hiding text on mobile | Good |
| labelContent unconditional for narrow sectors | isNarrow only controls rotation (-90deg), not content — fixes Down Jeep label gap | Good |

---
*Last updated: 2026-04-09 after v10.5 milestone started*
