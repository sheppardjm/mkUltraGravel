# Project Research Summary

**Project:** MK Ultra Gravel — 80-mile gravel cycling event website
**Domain:** Single-event static site with interactive GPX map, dark brutalist design
**Researched:** 2026-03-26
**Confidence:** HIGH

## Executive Summary

MK Ultra Gravel is a hype-driven event site with one job: convert gravel cyclists into registered participants for a June 7, 2026 free-entry 80-mile ride in Marquette County, MI. The domain is well-understood — the build pattern is a static site with a single interactive island (Leaflet map) surrounded by static HTML content. The recommended approach is Astro 6 + Leaflet 1.9.4 + Tailwind v4, deployed to Cloudflare Pages. This stack is now a first-party combination: Cloudflare acquired Astro's parent company in January 2026, and Cloudflare Pages is provably the best free-tier static host for a project that may receive a viral traffic spike.

The defining feature of this project is not the event information — it is the design identity and the interactive route map. No other gravel event site uses a dark, psychedelic, CIA-document aesthetic. The Paris-Roubaix-style sector cards and geolocated photo markers on the map are the features that will drive social sharing and word-of-mouth. These differentiators are achievable with the recommended stack, but they require a build-time data pipeline (GPX parsing, photo geo-matching, annotation resolution) that must be the first thing built. Everything else — hero, sector cards, gallery, CTAs — is pure static HTML once the data layer exists.

The critical risks are mobile-specific and must be mitigated from day one, not retrofitted. Leaflet's mobile scroll trap will make the site unusable on phones if `Leaflet.GestureHandling` is not wired in from the first map commit. GPX trackpoint density will freeze mid-range Android devices if not downsampled before rendering. The dark design palette will fail WCAG contrast on outdoor screens unless every text/background combination is checked during implementation. None of these are difficult to fix early; all become expensive to retrofit after the fact.

---

## Key Findings

### Recommended Stack

Astro 6 (islands architecture) is the correct framework: it ships zero JS for static content and hydrates only the map component. The full React runtime cost of Next.js or Remix is unjustified for a site with one interactive component. Leaflet 1.9.4 is the correct map library — MapLibre GL's WebGL overhead is 6x the bundle size and adds zero value over Leaflet's raster tiles for a single GPX polyline. Cloudflare Pages free tier has unlimited bandwidth and 300+ edge PoPs, making it the only reasonable hosting choice given potential viral traffic from cycling community sharing.

**Note:** Leaflet 2.0.0-alpha.1 was released in August 2025 and is ESM-only with a broken API. Do not use it. `leaflet-gpx` targets the stable 1.9.x API.

**Core technologies:**
- Astro 6.1.0: static site framework with islands — zero-JS output except map component
- Leaflet 1.9.4: interactive map — lightest viable option for one GPX polyline (42KB vs 250KB+ for MapLibre)
- leaflet-gpx 2.2.0: GPX rendering plugin — purpose-built, handles elevation stats and markers
- Stadia Maps: tile provider (Stamen Toner style) — free tier with SLA, black-and-white aesthetic matches CIA document theme
- Tailwind CSS 4.2.2: styling — CSS-first config, cascade layers prevent Leaflet CSS conflicts
- Cloudflare Pages: hosting — unlimited bandwidth free tier, fastest global CDN
- exifr: build-time EXIF extraction from photos — runs in Node.js during Astro build, not in browser
- Space Mono + display font (Special Elite or similar): typography — monospace editorial aesthetic

See `/Users/Sheppardjm/Repos/mkUltraGravel/.planning/research/STACK.md` for full rationale and alternatives considered.

### Expected Features

The site exists to drive BikeReg registrations. Every feature decision should be evaluated against that goal. The interactive map and design identity are the primary draw — without them this is just another event info page.

**Must have (table stakes):**
- Event date, location, distance, cost — above the fold, first question every visitor asks
- BikeReg registration CTA — impossible to miss; this is the conversion goal
- GPX file download — non-negotiable in gravel cycling culture
- Route overview with key stats — riders need to know terrain before committing
- Photo gallery of the route — 33 photos already in repo
- Donation / Great Lakes Recovery Centers info — free events require cause explanation
- Mobile-responsive layout — 50%+ of cycling site traffic is mobile
- Dark brutalist psychedelic design throughout — this IS the differentiator

**Should have (differentiators):**
- Interactive GPX map with sector overlays — the route visualization IS the product
- Paris-Roubaix style sector cards with star ratings — recognized convention in cycling community
- Geolocated route photos on the map — visceral "I have to ride this" response
- KOM segment listings — adds competitive dimension without making it a race
- Restock point listings with mile markers — signals organizers have thought it through
- Elevation profile visualization — shows ride character at a glance

**Defer to v2+:**
- Geolocated photos on map: highest effort, highest payoff — defer until map is stable, not a gating dependency
- Elevation profile: visual enhancement, not critical to MVP
- KOM segment cards: lower rider utility than sector cards in MVP
- Restock point cards: can be a simple text list in v1

**Explicit anti-features (do not build):**
- Results / timing / leaderboard — this is not a race
- User accounts / login — BikeReg handles participants
- Blog / news feed — abandoned blogs look worse than no blog; use social media
- Email list signup — single event, high obligation, low return
- Merchandise / shop, sponsor logos, Strava live embeds, weather widget

See `/Users/Sheppardjm/Repos/mkUltraGravel/.planning/research/FEATURES.md` for full feature analysis.

### Architecture Approach

The entire site is a single-page static site (`index.html`) with scroll sections. The architectural centerpiece is a build-time data pipeline: a Node.js build script parses `MK Ultra.gpx` into `route-data.json`, resolves sector/KOM/restock mile markers against the route to produce `annotations.json`, and attempts EXIF extraction on 33 photos to produce `photos.json`. All three JSON files live in `public/data/` and are fetched at runtime by the Leaflet island component. Static HTML components (sector cards, KOM listings, gallery) read from the same JSON files at build time via Astro frontmatter — eliminating runtime fetches for non-map content.

The Leaflet map must be initialized via `<script is:inline>` inside an Astro island, NOT inside a React component. Leaflet manages its own DOM and breaks inside virtual DOM environments.

**Major components:**
1. Build pipeline (parse-gpx.js, match-photos.js, resolve-annotations.js) — produces all data JSON; everything depends on this
2. Map component (Astro island, `client:load`) — Leaflet init, GPX polyline, photo markers, sector/KOM/restock markers
3. Route info panels (SectorList, KomList, RestockList) — static HTML, Astro reads JSON at build time
4. Photo gallery + lightbox — static grid with vanilla JS lightbox
5. Hero + static sections — event info, donation info, registration CTA, GPX download
6. Design system — CSS custom properties, dark palette, typography tokens

**Directory structure:** see `/Users/Sheppardjm/Repos/mkUltraGravel/.planning/research/ARCHITECTURE.md` for the full recommended layout.

### Critical Pitfalls

1. **Leaflet mobile scroll trap** — Leaflet captures all single-finger touch events, trapping users on the map. Wire in `Leaflet.GestureHandling` (`gestureHandling: true`) from the first map commit. Do not defer this to mobile testing.

2. **GPX trackpoint density freezing mobile** — 80-mile Garmin/Wahoo exports contain 10,000–30,000 points. Downsample to 500–1000 points for map rendering using `gpx-simplify` or `simplify-js`. Keep the original full-resolution file for download. Test on a real mid-range Android device, not just Chrome DevTools emulation.

3. **Photo markers as individual DOM nodes** — 33 image-thumbnail Leaflet markers cause pan jank and an unreadable marker pile at low zoom. Use `Leaflet.markercluster` from day one. Build clustering in at the start; retrofitting it is harder.

4. **Dark design failing WCAG contrast on outdoor screens** — Cyclists read sites on phones in direct sunlight. Every text/background combination must pass WCAG AA (4.5:1 body, 3:1 large text). Run contrast checks during every component build, not at the end.

5. **CSS animations triggering layout reflow** — Psychedelic effects animated via `top`, `left`, `width`, `background-position` run on the main thread and cause dropped frames on mobile. Animate only `transform` and `opacity`. Test with Chrome DevTools at 6x CPU throttle.

**Additional critical pitfalls:**
- **Tile API token without URL restrictions** — If using Mapbox (not recommended — use Stadia Maps), create a dedicated token with URL restrictions before writing any map code.
- **Map tile attribution removed** — Removing `.leaflet-control-attribution` violates OSM/Stadia ToS. Style it to match the dark theme; do not hide it.
- **BikeReg CTA buried below map** — Place CTA both above the fold and again below the map. The map is the attraction; registration is the goal.

See `/Users/Sheppardjm/Repos/mkUltraGravel/.planning/research/PITFALLS.md` for all 15 pitfalls with phase-specific warnings.

---

## Implications for Roadmap

The build-time data pipeline is the load-bearing foundation. The map component cannot be built without `route-data.json`. Sector/KOM/restock annotations cannot be built without the annotation resolver. Photo geo-matching is the highest-uncertainty piece and should be addressed early so there is time to manually assign positions if EXIF data is absent.

Everything after the data pipeline follows a natural complexity gradient: map rendering first (core feature, most complex), then the static content sections that read from the same data, then gallery and polish. The design system should be scaffolded before any component work so no rework is required.

### Phase 1: Data Foundation

**Rationale:** All map and annotation features depend on `route-data.json` existing first. The GPX parser converts mile markers to lat/lon, which every other data component requires. Build this before any UI work begins.

**Delivers:** `route-data.json` (GPX track with lat/lon/ele/mi per point), `annotations.json` (sectors, KOMs, restock points with resolved coordinates), `photos.json` (photo list with lat/lon — EXIF-first with manual fallback).

**Addresses:** GPX download (raw file available), route stats, photo marker positioning.

**Avoids:** Client-side GPX parsing (Pitfall from ARCHITECTURE.md), EXIF reading in browser, per-section JSON fetches causing multiple round trips.

**Research flag:** MEDIUM uncertainty on photo EXIF status — the 33 photos may lack GPS EXIF data. Plan for manual mile-marker assignment for some or all photos. Validate early.

### Phase 2: Project Scaffold and Design System

**Rationale:** All UI components depend on the design system. Setting typography, color tokens, and base layout before component work prevents rework. Astro project initialization and Node 22 verification belongs here.

**Delivers:** Astro 6 project, Tailwind v4 with `@theme` CSS config, dark palette custom properties, Space Mono body font, display heading font (Special Elite or equivalent), base layout component, font preloading.

**Avoids:** Font FOUT causing layout shift (Pitfall 11) — set up `font-display`, preload links, and fallback metric overrides during this phase, not later.

**Research flag:** Standard patterns — skip research-phase. Astro 6 + Tailwind v4 integration is well-documented.

### Phase 3: Map Component (Core Feature)

**Rationale:** The map is the centerpiece feature and the most complex component. It must be stable before photo markers and sector overlays are added. Depends on Phase 1 (route-data.json, annotations.json, photos.json) and Phase 2 (design system).

**Delivers:** Leaflet map island (`client:load`) with GPX polyline rendered, sector/KOM/restock annotation markers, photo markers with clustering, gesture handling for mobile.

**Uses:** Leaflet 1.9.4, Stadia Maps Stamen Toner tiles, `Leaflet.GestureHandling`, `Leaflet.markercluster`.

**Avoids:**
- Mobile scroll trap — wire `gestureHandling: true` from first map commit (Pitfall 1)
- GPX trackpoint density — downsample to 500–1000 points for display (Pitfall 3)
- Photo markers as individual DOM nodes — use markercluster from day one (Pitfall 4)
- Tile attribution removed — style attribution to match dark theme, do not hide (Pitfall 8)

**Research flag:** MEDIUM — confirm Stadia Maps free tier account creation and Stamen Toner tile URL at project start. Alternatively, Carto Dark Matter tiles (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`) require no API key and may be simpler for initial development.

### Phase 4: Route Info Sections (Static Content)

**Rationale:** Sector cards, KOM listings, and restock points are pure static HTML rendered at build time from `annotations.json`. They can be built quickly after the data pipeline is established and are independent of the live map.

**Delivers:** Paris-Roubaix style sector cards with star ratings (1–5), KOM segment listings with gradient and elevation gain, restock point listings with mile markers.

**Addresses:** Paris-Roubaix sector feature (core identity differentiator), KOM segment display, practical restock information.

**Avoids:** Elevation data inaccuracy — if displaying elevation gain stats for sectors, smooth or correct raw GPX elevation values; do not display unchecked GPS-derived numbers (Pitfall 9).

**Research flag:** Standard patterns — Astro frontmatter data reads from JSON, static HTML output. No research needed.

### Phase 5: Hero, Static Sections, and Registration CTA

**Rationale:** Static content sections (hero, event info, donation info, registration CTA, GPX download) have no dependencies on other phases and can be drafted anytime, but final implementation belongs after the design system exists so styling is consistent.

**Delivers:** Above-fold hero with event identity (title, date, location, distance), event format / donation cause block, BikeReg registration CTA (above fold AND below map), GPX download link with correct filename attribute.

**Avoids:**
- BikeReg CTA buried below map — place CTA above fold; repeat after map section (Pitfall 14)
- Slow LCP from unpreloaded hero image — add `<link rel="preload">` in `<head>`; no `loading="lazy"` on hero (Pitfall 6)
- GPX download named "track.gpx" — use `download="mk-ultra-gravel-2026.gpx"` attribute (Pitfall 12)

**Research flag:** Standard patterns — skip research-phase.

### Phase 6: Photo Gallery and Lightbox

**Rationale:** The gallery depends on `photos.json` from Phase 1. It can be built as a standalone feature before photo markers are added to the map (the map photo markers are a v2 differentiator).

**Delivers:** CSS grid photo gallery, vanilla JS lightbox (FSLightbox or equivalent), WebP-optimized thumbnails via Astro image pipeline, lazy-loaded full images.

**Avoids:** Photo popups containing full-resolution images causing 5–10 second load times on cellular (Pitfall 13) — serve thumbnails in gallery grid, optional full-size link only.

**Research flag:** Standard patterns — FSLightbox or similar is well-documented. Astro image optimization is built-in.

### Phase 7: Mobile Audit and Performance Polish

**Rationale:** Several pitfalls are device-specific and cannot be validated in DevTools alone. A dedicated mobile testing phase prevents shipping a broken experience to the majority of visitors.

**Delivers:** Validated mobile scroll behavior, contrast audit results, animation performance check, image optimization verification, Core Web Vitals baseline.

**Avoids:**
- Dark design contrast failures on outdoor screens — run WCAG checks on every text combination (Pitfall 7)
- CSS animations triggering layout reflow — audit every animation for `transform`/`opacity` only (Pitfall 10)
- Slow LCP on mobile — verify hero preload, check WebP serving, confirm no `loading="lazy"` on above-fold content (Pitfall 6)

**Research flag:** Standard patterns — WCAG contrast checkers, Chrome DevTools, real device testing.

### Phase 8: Deployment

**Rationale:** Cloudflare Pages deployment is a one-time setup that can be done early (for preview URLs) or last. No server-side config needed for a fully static output.

**Delivers:** Cloudflare Pages project connected to git, custom domain configured, preview deployment per branch.

**Uses:** Cloudflare Pages free tier, `astro build` static output.

**Research flag:** Standard patterns — Astro + Cloudflare Pages is well-documented and requires zero configuration for static output.

---

### Phase Ordering Rationale

- The data pipeline (Phase 1) must precede all component work because mile-marker-to-coordinate resolution is a shared dependency across map, sectors, restocks, and photo gallery.
- Design system (Phase 2) must precede component work to avoid rework — typography, color tokens, and base layout must exist before any component is styled.
- Map (Phase 3) is the most complex feature and the site's central differentiator — it gets the first component slot so there is maximum time for iteration.
- Static content sections (Phases 4–6) are independent of each other and can be parallelized once Phases 1–2 are complete.
- Mobile audit (Phase 7) is intentionally a dedicated phase, not an afterthought. Multiple pitfalls are only discoverable on real devices.

### Research Flags

**Needs research / validate early:**
- **Phase 1 (Photo geo-matching):** The 33 photos are likely Google Photos exports and likely lack EXIF GPS data. Inspect files before Phase 1 build to determine how many need manual mile-marker assignment. This is the highest-uncertainty item in the entire project.
- **Phase 3 (Tile provider):** Confirm Stadia Maps free tier signup and Stamen Toner tile URL before map implementation. If Stadia signup is blocked, fall back to Carto Dark Matter (no API key required, dark aesthetic, OSM-based).
- **Phase 3 (GPX file inspection):** Check actual trackpoint count in `MK Ultra.gpx` before building the GPX parser. If the file has fewer than 2,000 points already, downsampling may not be necessary.

**Standard patterns (skip research-phase):**
- **Phase 2:** Astro 6 + Tailwind v4 integration is documented in official Astro docs.
- **Phase 4–6:** Static HTML components and image pipelines are well-documented Astro patterns.
- **Phase 7:** WCAG contrast checking and Chrome DevTools usage are standard.
- **Phase 8:** Astro + Cloudflare Pages is a first-party-endorsed deployment target.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All core versions verified against npm registry and official sources on 2026-03-26. Node 22.12.0+ requirement confirmed. Leaflet 2.0 alpha risk documented. |
| Features | HIGH | Table stakes verified against 6+ live gravel event sites. Paris-Roubaix sector convention confirmed on official site. Anti-feature list grounded in project scope. |
| Architecture | HIGH (core) / MEDIUM (photo matching) | Build-time pipeline and single-page pattern verified via working reference implementation (Ben Strawbridge Astro + Leaflet + GPX, 2026). Photo EXIF status is unverified — the 33 photos need inspection. |
| Pitfalls | HIGH (mobile/performance/legal) / MEDIUM (photo/elevation specifics) | Leaflet mobile scroll trap, tile attribution, LCP, animation performance, and contrast pitfalls all have authoritative sources. GPX trackpoint counts and elevation accuracy percentages are training-data estimates. |

**Overall confidence:** HIGH

### Gaps to Address

- **Photo EXIF status:** Unknown whether any of the 33 photos carry GPS coordinates. Inspect files with `exifr` before building the photo matcher. Plan for full manual assignment as the fallback.
- **GPX trackpoint density:** The actual size and point count of `MK Ultra.gpx` has not been measured. Check file size and trackpoint count before deciding whether downsampling is necessary.
- **BikeReg event URL:** The actual BikeReg registration URL for this event is not in the research files. This is required before the registration CTA can be built. Confirm with the event director.
- **Stadia Maps signup:** Stadia Maps free tier pricing was verified as of 2025; confirm current terms at signup time. The fallback (Carto Dark Matter, no API key) is a viable alternative.
- **Elevation stats source:** Raw GPX elevation data is unreliable. Before displaying elevation gain prominently, either run the GPX through a DEM correction service (GPXZ, Open Topo Data) or cross-reference against the Strava/Komoot version of the route.

---

## Sources

### Primary (HIGH confidence)

- Astro 6.1.0 GitHub releases — version verification
- Astro official upgrade guide — Node 22.12.0+ requirement
- Leaflet.js official download page — 1.9.4 current stable confirmed
- Leaflet 2.0 alpha announcement — ESM-only, API break confirmed
- Tailwind CSS v4 release blog — CSS-first config, cascade layers
- Paris-Roubaix official sector listing — 1–5 star rating convention
- Leaflet GitHub issues #4051, #4677 — mobile scroll hijacking confirmation
- Leaflet.GestureHandling documentation — prevention pattern
- Google web.dev LCP documentation — hero image preload requirement
- WCAG 2.1 guidelines — contrast ratio thresholds
- Mapbox security documentation — token URL restriction requirement
- MDN compositing documentation — transform/opacity animation best practices
- Ben Strawbridge Astro + Leaflet + GPX reference implementation (2026)
- exifr.js GitHub — EXIF GPS extraction in Node.js
- Cloudflare Pages vs Netlify comparison — free tier bandwidth

### Secondary (MEDIUM confidence)

- Stadia Maps pricing page (2025) — free tier terms
- Cloudflare Pages free tier details — bandwidth, build minutes
- MapLibre vs Leaflet 2026 comparison — bundle size numbers
- Mapbox performance docs — GeoJSON large data patterns
- GPXZ blog — GPX elevation accuracy and DEM correction
- FSLightbox — vanilla JS lightbox option
- SBT GRVL, Grinduro, Ore to Shore, The Crusher, Belgian Waffle Ride, Lost & Found — feature benchmarking
- Gravel Worlds, GRVL Cycling Raid Rockingham — section structure reference

### Tertiary (LOW confidence)

- Pitfall 15 (sector/KOM data offset from GPS drift) — derived from general GPS development experience; no authoritative source

---

*Research completed: 2026-03-26*
*Ready for roadmap: yes*
