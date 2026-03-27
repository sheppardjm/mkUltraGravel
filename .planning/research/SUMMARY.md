# Project Research Summary

**Project:** MK Ultra Gravel — v2.0 Interactivity + Polish Milestone
**Domain:** Static gravel cycling event website (Astro 6 + Leaflet + Chart.js)
**Researched:** 2026-03-27
**Confidence:** HIGH

---

## Executive Summary

MK Ultra Gravel v2.0 is a visual polish and interactivity layer on top of a fully-shipped static site. The v1.0 foundation is strong — Lighthouse Performance 96, TBT 0ms, a working GPX pipeline, photo gallery, interactive map, and elevation profile. v2.0 should be executed as targeted surgical additions to existing components, with zero mandatory new npm dependencies. The architecture is an Astro 6 static site that uses vanilla JS `<script>` blocks for runtime behavior; all v2.0 interactivity follows this same pattern using native browser `CustomEvent` dispatch for cross-component communication.

The single most consequential finding across all four research dimensions is the **Strava API constraint**: the segment leaderboard endpoint has been blocked since June 2020, and Strava's November 2024 TOS update explicitly prohibits displaying other athletes' data to public anonymous visitors. A live-fetched KOM leaderboard is permanently off the table. The correct design is manual curation via JSON in the repo, with Strava segment deep-links for live data. This is simpler, more reliable, and eliminates the most complex and risky v2.0 feature. It should free up significant development scope that can be redirected to the photo card and interactivity work.

The four remaining feature clusters — map-elevation interactivity, photos on cards, animations, and the MK Ultra explainer section — are all achievable with zero or one optional new dependency. Map-elevation sync uses `CustomEvent` + `window.dispatchEvent()` between `ElevationProfile.astro` and `RouteMap.astro`; Chart.js 4's `onHover` and Leaflet's `setLatLng` provide all the primitives needed. Animations should be entirely vanilla CSS (`transition`, `@keyframes`, `transform`/`opacity`) to protect the current TBT 0ms score. The explainer is a static Astro component — it is a copywriting task with minimal engineering. The key implementation risk across this milestone is the mousemove/onHover sync firing at 60Hz and degrading map performance; throttle via `requestAnimationFrame` must be built in from the first commit.

---

## Key Findings

### Recommended Stack

The v1.0 stack (Astro 6, Leaflet 1.9.4, Chart.js 4, chartjs-plugin-annotation 3.1.0, Sharp 0.34.5, Tailwind v4) is sufficient for all v2.0 features. **Net new mandatory dependencies: zero.** The optional `motion` library (12.x, formerly Framer Motion, rebranded 2025 for vanilla JS) may be added if scroll-triggered card entrance animations require coordinated sequencing that CSS cannot express, but vanilla CSS with `IntersectionObserver` should be the first attempt.

Do not add `chartjs-plugin-crosshair` — it was last published August 2023, has 59 open issues, and addresses intra-chart crosshair visualization rather than the cross-component (chart → map) sync the site needs. Chart.js 4's native `onHover` callback is cleaner and has zero maintenance risk. Do not add any Strava API client — the TOS bars the use case. Do not use `framer-motion` (old package name, superseded by `motion` on npm in early 2025).

**Core technologies (unchanged from v1.0):**
- **Astro 6** — static site framework; `<script>` blocks compile to module scripts; inter-component communication via `window.dispatchEvent(CustomEvent)`
- **Leaflet 1.9.4** — map; `L.circleMarker` + `setLatLng()` for elevation crosshair marker; `mouseover` events for segment hover
- **Chart.js 4 + chartjs-plugin-annotation 3.1.0** — elevation profile; `onHover` callback for position broadcast; runtime annotation updates (`chart.update('none')`) for segment range highlight
- **Sharp 0.34.5** — image pipeline; width 200→400px, quality 75→80 for retina gallery thumbnails; new 600×338 card photo target with `fit: 'cover'`
- **Tailwind v4** — CSS; `transition-*` utilities for all hover animations; `@keyframes` for load and scroll animations

See `/Users/Sheppardjm/Repos/mkUltraGravel/.planning/research/STACK.md` for full rationale.

### Expected Features

**Must have (table stakes):**
- Visual hover feedback on all interactive cards (sector, KOM, photo) — no hover = broken feel
- Strava segment deep-link on KOM cards — cycling audience expects this
- Some "about the name" explanation — without it, "MK Ultra" is opaque to non-cycling-history audience
- Data corrections (segment locations, photo positions, restock cleanup, URLs) — correctness is baseline, not polish

**Should have (competitive differentiators):**
- Chart-to-map elevation sync (hover elevation chart → crosshair marker on map) — matches what RideWithGPS and Komoot deliver; none of the comparable small event sites do this
- Photos on sector/KOM cards — standard on pro cycling event sites (Paris-Roubaix, Belgian Waffle Ride); implicitly expected by the MK Ultra audience
- Manual KOM/QOM leaderboard (JSON-curated, dated, Strava deep-link) — most small event sites don't curate this at all; top-3 with a "last updated" stamp is a meaningful differentiator
- CIA document treatment for the explainer with real FOIA references — the specificity and humor are what make this shareable
- Scroll-reveal stagger on card lists — creates cinematic quality consistent with the dark aesthetic

**Defer to v2.1+:**
- Map-to-chart direction sync (hover map polyline → elevation highlight) — low-value direction; chart-to-map is the primary user flow
- Sector card click → map zoom (cross-component navigation) — high complexity relative to impact
- Chart.js draw-on animation — re-enabling `animation: { duration: 800 }` is fine but low priority
- Any live Strava API integration — permanently blocked by TOS and endpoint restrictions

**Anti-features — do not build:**
- Live Strava OAuth leaderboard — TOS violation as of November 2024
- Strava embed iframe — broken in Chrome due to third-party cookie deprecation
- Smooth ease-in-out hover curves, bounce physics — wrong aesthetic for brutalist dark design
- Animated page transitions — incompatible with Astro's static rendering model
- Any animation library (GSAP, Framer Motion) for "subtle" effects — bundle cost is not justified; CSS handles all cases needed for this site

See `/Users/Sheppardjm/Repos/mkUltraGravel/.planning/research/FEATURES.md` for the full feature analysis and dependency map.

### Architecture Approach

v2.0 adds two inter-component communication channels to components that currently have zero shared state. The canonical Astro pattern for this is `window.dispatchEvent()` with named `CustomEvent`s — not `window.chartInstance` global variables, not a shared module. Both `ElevationProfile.astro` and `RouteMap.astro` remain fully isolated; they share only event names and payload shapes. Both components already fetch `route-data.json` independently; the second fetch resolves from browser cache. No change to the data pipeline is required for the sync feature.

The build-time data pipeline gains two new scripts: `assign-card-photos.js` (photo-to-sector matching by mileage proximity, Haversine formula, pure Node.js arithmetic, no new dependency) and optionally `fetch-strava.js` (build-time Strava segment metadata fetch via `GET /segments/{id}` for `xoms` KOM/QOM times; graceful skip if env vars absent).

**Modified components:**
1. **`ElevationProfile.astro`** — emits `elevation:hover` (with `mi` value) on Chart.js `onHover`; listens to `map:segmentHover` and updates annotation `borderWidth`/color; emits `elevation:leave` on canvas `mouseleave`
2. **`RouteMap.astro`** — listens to `elevation:hover` and moves a `L.circleMarker` crosshair via binary search of `routeData`; emits `map:segmentHover` on sector polyline `mouseover`
3. **`KomSegments.astro`** — add `coverPhoto` image; add KOM/QOM time display from `leaderboard.json`; add Strava segment deep-link
4. **`GravelSectors.astro`** — add `coverPhoto` image; add hover CSS

**New build scripts:**
5. **`assign-card-photos.js`** — matches photos to sectors/KOMs by mileage range proximity; enriches `annotations.json` with `coverPhoto` field
6. **`fetch-strava.js`** (optional) — build-time fetch of `xoms` data; writes `public/data/leaderboard.json`; graceful skip if `STRAVA_CLIENT_ID` not set

See `/Users/Sheppardjm/Repos/mkUltraGravel/.planning/research/ARCHITECTURE.md` for the complete event flow diagrams and build order.

### Critical Pitfalls

1. **Strava TOS violation (Pitfalls 16 + 17)** — The November 2024 Strava API Agreement explicitly prohibits displaying other athletes' data to anonymous public visitors. The segment leaderboard endpoint has been blocked since June 2020 regardless of subscription status. Prevention: manual JSON curation only; never call `/segments/{id}/leaderboard`; never reference the client secret in static build output.

2. **TBT regression from mousemove or animation (Pitfalls 19 + 23)** — The current TBT 0ms is fragile. `mousemove`/`onHover` at 60Hz can block the main thread; animation libraries add script parse time; LCP candidates starting at `opacity: 0` delay LCP measurement. Prevention: throttle sync via `requestAnimationFrame`; use CSS `transition`/`@keyframes` with `transform`/`opacity` only; never start the hero or LCP image at opacity 0; run Lighthouse after every animation addition.

3. **Strava token expiry causing silent build failures (Pitfall 18)** — Access tokens expire after 6 hours; if the build script doesn't handle the 401, it writes empty JSON and Netlify reports a successful deploy with blank leaderboard data. Prevention: implement token refresh on day one; fail the build loudly (exit non-zero) on any 401; store the refresh token, not just the access token; Strava rotates refresh tokens on every use — update the stored token after each refresh.

4. **Event listener memory leak (Pitfall 20)** — Manually added `mousemove`/`mouseleave` listeners on the Chart.js canvas are not removed by `chart.destroy()`. Multiple re-initializations on resize accumulate leaked Chart.js and Leaflet references. Prevention: use `AbortController` with `{ signal: ac.signal }` on all manually registered listeners; call `ac.abort()` before `chart.destroy()`.

5. **Image quality increase without measuring cumulative payload (Pitfall 22)** — Thirty-three thumbnails at 50% larger each is not a minor change. Prevention: establish a total thumbnail byte budget baseline (`du -sh public/images/thumbs/`) before quality changes; measure after; never change quality settings without a before/after comparison.

See `/Users/Sheppardjm/Repos/mkUltraGravel/.planning/research/PITFALLS.md` for the full 12-pitfall v2.0 list plus retained v1.0 warnings.

---

## Implications for Roadmap

The research strongly supports a data-first, interactivity-second, polish-last ordering. Data corrections must precede all card/photo/map work. Map-elevation interactivity is the highest-complexity item and should be built in isolation. Card photos and animations are additive and independent. Strava leaderboard ships last because it has the most external operational dependencies.

### Phase 1: Data Foundations + Corrections

**Rationale:** All subsequent card, map, and photo work depends on correct underlying data. Fixing segment locations, photo positions, restock markers, and URL data now prevents rework later. This is zero-risk cleanup with no new architecture.

**Delivers:** Correct `annotations.json`, `photos.json`, and segment mile markers; valid registration and donation URLs; route stats added to map/description copy.

**Addresses:** Data fixes milestone item; unblocks all card, photo, and map phases.

**Avoids:** Building UI on bad data and having to revisit card positions after photo assignment completes.

**Research flag:** Standard patterns — skip research-phase. Pure data corrections in existing pipeline scripts.

---

### Phase 2: Photo Pipeline + Card Photos

**Rationale:** Photo assignment (`assign-card-photos.js`) is a prerequisite for card photo display. This phase establishes the `coverPhoto` schema extension to `annotations.json`, then wires the photos into `GravelSectors.astro` and `KomSegments.astro`. Low risk — additive change to existing static components.

**Delivers:** Photos on all sector and KOM cards. Improved thumbnail quality (400px, q80) for retina gallery. New card photo crop target (600×338, `fit: 'cover'`).

**Addresses:** Photos on sector/KOM cards; image quality improvements; new photos processing.

**Avoids:** Pitfall 22 (cumulative payload) — establish byte budget baseline before and after thumbnail quality change; delete existing thumbs directory to force regeneration at new size.

**Research flag:** Standard patterns — skip research-phase. Haversine photo matching is well-documented; Sharp API is stable.

---

### Phase 3: Map-Elevation Interactivity

**Rationale:** Highest complexity feature; build in isolation before any other runtime changes. Both components exist and initialize correctly. The custom event bus is the core new runtime architecture for v2.0 — establish it here, test both directions, measure Lighthouse before and after.

**Delivers:** Hover elevation chart → crosshair `L.circleMarker` appears on map at correct GPS coordinate, moves continuously with cursor. Hover sector polyline on map → corresponding mileage range highlights on elevation chart annotation. Both directions via `window.CustomEvent`. Touch support (`touchmove`) wired in same pass as `mousemove`.

**Addresses:** Map-elevation profile interactivity (crosshair sync + segment highlighting).

**Avoids:**
- Pitfall 19 (mousemove at 60Hz blocking main thread) — `requestAnimationFrame` throttle gate from first commit
- Pitfall 20 (listener leak on chart re-init) — `AbortController` from first commit
- Pitfall 24 (chartjs-plugin-crosshair version incompatibility) — do not use the plugin; use native `onHover` callback
- Pitfall 27 (touch events not wired) — implement `touchmove` handler in same phase as `mousemove`

**Research flag:** Patterns fully documented — skip research-phase. ARCHITECTURE.md provides the complete implementation blueprint including code examples for the event bus, `getValueForPixel` lookup, and `chart.update('none')` annotation update. Run Lighthouse after this phase to confirm TBT stays at 0ms before proceeding.

---

### Phase 4: Animations

**Rationale:** Pure CSS/JS additions with no dependencies on other v2.0 phases. Placing animations after interactivity keeps the sync feature testing clean and ensures Lighthouse baseline from Phase 3 is measured before adding new visual complexity.

**Delivers:** Hard box-shadow hover states on sector and KOM cards (brutalist aesthetic). Scroll-reveal `opacity`/`translateY` fade-in on card lists via `IntersectionObserver`. Hero text load animation via `@keyframes` with staggered `animation-delay`. Photo grayscale-to-color reveal on hover. Full `prefers-reduced-motion` compliance.

**Addresses:** Subtle animations milestone item; CIA document aesthetic polish.

**Avoids:**
- Pitfall 23 (TBT regression) — never start LCP-candidate elements at `opacity: 0`; run Lighthouse after every animation addition, not just at the end
- Anti-features: smooth ease-in-out curves, bounce physics, GSAP or Framer Motion bundle weight

**Research flag:** Standard patterns — skip research-phase. All approaches are CSS-only with IntersectionObserver; no library decisions required.

---

### Phase 5: MK Ultra Name Explainer

**Rationale:** Fully independent static component — no data dependencies, no runtime JS required. Can ship at any point; placed after interactivity to keep the highest-complexity phases uncluttered. The complexity here is copywriting, not engineering.

**Delivers:** New static Astro component explaining the MKULTRA connection (CIA covert program, 1953–1973, LSD, FOIA documents). CIA document aesthetic: monospace type, redaction-reveal CSS effect (click-to-uncover via CSS `width` transition on pseudo-element), real FOIA document links. Positioned between event info and map sections.

**Addresses:** MK Ultra name explainer milestone item.

**Avoids:** Video backgrounds (wrong medium, high bandwidth); animated page transitions (Astro static model incompatibility); over-engineering what is fundamentally a copywriting task.

**Research flag:** Standard patterns — skip research-phase. Static Astro component, CSS-only interaction. Historical facts researched and documented in FEATURES.md.

---

### Phase 6: Strava KOM Leaderboard

**Rationale:** Comes last because it has the most external operational prerequisites. Can ship with fallback empty JSON if Strava setup is not ready — `KomSegments.astro` renders gracefully without leaderboard data. The manual curation approach means the phase is not blocked by Strava API access at all; the JSON can be hand-authored first and the build-time fetch layer added afterward.

**Delivers:** KOM/QOM time display on KOM cards (manual JSON, dated, with Strava deep-link). Optionally: `fetch-strava.js` build-time script that fetches `xoms` from `GET /segments/{id}` and writes `public/data/leaderboard.json`. Strava segment URLs on all KOM cards.

**Addresses:** Strava KOM/QOM leaderboard milestone item (manual curation approach per TOS constraint).

**Avoids:**
- Pitfall 16 (client secret in static build) — Strava credentials in Netlify env vars only, accessed from build script only, never in browser JS
- Pitfall 17 (leaderboard endpoint blocked) — never call `/segments/{id}/leaderboard`; use `/segments/{id}` `xoms` field only
- Pitfall 18 (token expiry / silent failure) — implement refresh token rotation on day one; exit non-zero on 401
- Pitfall 21 (rate limit exhaustion in CI) — cache-first fetch logic with `STRAVA_FETCH_ENABLED` guard for development builds
- Pitfall 25 (private segments) — verify each segment's privacy setting in Strava before writing any API code

**Research flag:** Has operational prerequisites that must be resolved before coding begins:
- [ ] Strava segment IDs confirmed for Billie Helmer, Leaving Chatham, Silver Creek segments
- [ ] Each segment verified as public (not private) in Strava settings
- [ ] Strava developer application registered at developers.strava.com
- [ ] Initial OAuth flow completed and refresh token stored in Netlify env vars

---

### Phase Ordering Rationale

- **Data first** because all card, photo, and map work has a correctness dependency on `annotations.json` and `photos.json`. Building UI on wrong data guarantees rework.
- **Photos second** because `assign-card-photos.js` establishes the `coverPhoto` schema extension that the Strava leaderboard phase also builds on top of.
- **Interactivity isolated** in its own phase because it is the highest complexity item and the most likely to introduce regressions. Isolating it makes Lighthouse delta measurements unambiguous.
- **Animations after interactivity** so the TBT baseline from Phase 3 is measured cleanly before adding new visual complexity.
- **Explainer and leaderboard last** because the explainer is fully independent and the leaderboard has external operational prerequisites. Neither blocks anything else.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technology choices verified against official docs; zero mandatory new dependencies confirmed; `chartjs-plugin-crosshair` staleness confirmed via GitHub (last release August 2023, 59 open issues) |
| Features | HIGH | Strava API constraints verified from official Strava changelog and TOS text; cycling event design patterns verified from reference sites (Paris-Roubaix, Belgian Waffle Ride); anti-feature list grounded in TOS and aesthetic constraints |
| Architecture | HIGH | CustomEvent bus pattern is idiomatic Astro pattern confirmed in official docs; Chart.js `onHover` + `getValueForPixel` API verified; Leaflet `setLatLng`/`circleMarker` verified; one MEDIUM item: token refresh rotation is documented but real-world maintenance friction is training data |
| Pitfalls | HIGH | Core pitfalls (TOS prohibition, token expiry, mousemove throttle, listener cleanup) verified from official documentation; image payload and crosshair plugin pitfalls verified from official + community sources |

**Overall confidence:** HIGH

### Gaps to Address

- **Strava segment IDs** — The KOM segments (Billie Helmer, Leaving Chatham, Silver Creek) need their Strava segment IDs confirmed. These may or may not exist as official public Strava segments. This must be resolved before Phase 6 can begin. If segments are not on Strava, the leaderboard is manual-only JSON with no live data component at all.

- **Photo coverage per sector** — `assign-card-photos.js` assumes photos exist within each sector's mileage range. C4 (mile 58.7–64.35) and Down Jeep (mile 83.0–83.6) may have no photos assigned. Verify against the photo manifest; if gaps exist, either expand the search radius or assign the nearest route photo manually.

- **Strava token rotation maintenance burden** — The recommended approach (manual token rotation after each deploy) is appropriate for low-frequency deploys. If deploy frequency increases, this becomes a maintenance burden. The automated alternative (Netlify API to self-update the env var) is complex. Monitor and reassess during Phase 6.

- **`onHover` performance on mid-range Android** — The throttle pattern (`requestAnimationFrame`) is research-confirmed correct, but actual performance on mid-range Android should be verified with Chrome DevTools Performance tab after implementation, not assumed.

---

## Sources

### Primary (HIGH confidence)

- [Strava API Agreement November 2024](https://www.strava.com/legal/api) — Community Application definition; TOS prohibition on displaying other athletes' data to anonymous visitors
- [Strava Changes to Segments API](https://developers.strava.com/docs/segment-changes/) — Leaderboard endpoint removal June 2020; confirmed unavailable
- [Strava Authentication docs](https://developers.strava.com/docs/authentication/) — OAuth2 flow; 6-hour token expiry; refresh token rotation
- [Strava Rate Limits](https://developers.strava.com/docs/rate-limits/) — 100 req/15 min non-upload, 1,000/day
- [Strava November 2024 announcement](https://press.strava.com/articles/updates-to-stravas-api-agreement) — Context for TOS changes
- [Astro client-side scripts docs](https://docs.astro.build/en/guides/client-side-scripts/) — CustomEvent pattern for cross-component communication
- [Chart.js Interactions docs](https://www.chartjs.org/docs/latest/configuration/interactions.html) — `onHover` callback; `getValueForPixel` API
- [Leaflet API reference](https://leafletjs.com/reference.html) — `setLatLng()`; `circleMarker`; polyline `mouseover` events
- [Netlify environment variables](https://docs.netlify.com/build/configure-builds/environment-variables/) — env var scoping; build vs function scope
- [Sharp WebP output + resize API](https://sharp.pixelplumbing.com/api-output/) — quality parameters; `fit: 'cover'` resize mode
- [Avoid non-composited animations — Chrome Developers](https://developer.chrome.com/docs/lighthouse/performance/non-composited-animations) — `transform`/`opacity` compositor-only rule
- [Total Blocking Time — web.dev](https://web.dev/articles/tbt) — TBT threshold; Lighthouse scoring weights
- [prefers-reduced-motion — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) — Accessibility requirement
- [W3C WCAG C39](https://www.w3.org/WAI/WCAG21/Techniques/css/C39) — Reduced motion technique
- [Chart.js plugins docs](https://www.chartjs.org/docs/latest/developers/plugins.html) — `.destroy()` behavior; listener cleanup
- [Leaflet GitHub Issue #9514](https://github.com/Leaflet/Leaflet/issues/9514) — Canvas mousemove throttle behavior confirmation

### Secondary (MEDIUM confidence)

- [chartjs-plugin-crosshair GitHub](https://github.com/AbelHeinsbroek/chartjs-plugin-crosshair) — Last published August 2023; 59 open issues; staleness confirmed; Chart.js v4 compatibility issue #95
- [Strava Community Hub: KOM/QOM data](https://communityhub.strava.com/developers-api-7/accessing-kom-qom-data-for-segment-1999) — `xoms` field on `/segments/{id}` endpoint confirmed
- [Strava Community Hub: leaderboard discussion](https://communityhub.strava.com/developers-api-7/api-segment-leaderboards-and-efforts-3031) — Community corroboration of endpoint restriction
- [Motion (animation library) official docs](https://motion.dev/docs) — Package rename from `framer-motion` to `motion`; vanilla JS API
- [CSS scroll animations techniques 2025](https://mroy.club/articles/scroll-animations-techniques-and-considerations-for-2025) — IntersectionObserver vs native CSS scroll-driven; browser support comparison
- [MKUltra — Wikipedia](https://en.wikipedia.org/wiki/MKUltra) — Historical facts for explainer component
- [CIA FOIA MK-ULTRA documents](https://www.cia.gov/readingroom/document/06760269) — Primary source documents referenced in explainer
- [MK-Ultra Princeton Special Collections](https://specialcollections.princeton.edu/2025/10/the-cias-quest-for-mind-control-piecing-together-project-mk-ultra-and-its-princeton-connections-part-i-allen-w-dulles-class-of-1914/) — Additional historical sourcing
- [Netlify Secrets Controller](https://docs.netlify.com/build/environment-variables/secrets-controller/) — Proactive secret scanning
- [Paris-Roubaix official site](https://www.paris-roubaix.fr) — Per-sector photo reference pattern
- [MapTiler elevation profile marker sync example](https://docs.maptiler.com/sdk-js/examples/elevation-profile-control-marker/) — Cross-component sync reference implementation

---

*Research completed: 2026-03-27*
*Ready for roadmap: yes*
