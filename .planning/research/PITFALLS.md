# Domain Pitfalls

**Domain:** Gravel cycling event website — static site with interactive map, GPX overlay, geo-located photos, dark brutalist design
**Project:** MK Ultra Gravel
**Researched:** 2026-03-27
**Scope:** v2.0 additions — Strava leaderboard, map-elevation interactivity, animations, image pipeline changes

---

> This file extends the v1.0 pitfalls with v2.0-specific risks. The v1.0 pitfalls (scroll hijacking,
> token exposure, GPX density, photo marker DOM cost, contrast failures, animation reflow, etc.)
> remain valid and are summarized in the Phase-Specific Warnings table at the bottom. The new
> pitfalls below address what can go wrong when adding Strava integration, map-chart sync, and
> visual polish to an already-optimized static site.

---

## Critical Pitfalls

Mistakes that cause rewrites, security incidents, or make a feature permanently broken.

---

### Pitfall 16: Strava Client Secret Embedded in Static Site Build

**What goes wrong:** The Strava OAuth flow requires a Client ID and Client Secret. A developer places both in an Astro `.env` file intending them to be server-side only, but any `PUBLIC_` prefix or inline script usage causes them to be injected into the static build output. The Client Secret is then visible in the page source to anyone who opens DevTools.

**Why it happens:** Astro (like Vite) distinguishes public vs private env vars by prefix convention. `PUBLIC_STRAVA_CLIENT_SECRET` is public by name. Even without the prefix, if a developer embeds it in a `<script is:inline>` tag to call Strava's token endpoint from the browser, the secret ships in the HTML.

**Consequences:** An exposed Client Secret lets anyone obtain Strava access tokens on behalf of your application, exhaust your rate limits, and impersonate your app. Strava may revoke your application. The attacker can access any scope your app was granted.

**Prevention:**
- Keep Client Secret in a Netlify Function (server-side runtime) only — never in static build output
- Use `STRAVA_CLIENT_SECRET` (no `PUBLIC_` prefix) and access it only from `netlify/functions/*.js` files
- Netlify environment variables scoped to "Functions" are not available to the static build process
- Use Netlify Secrets Controller to proactively scan for accidental exposure
- For the leaderboard use case, prefer a build-time fetch (the function runs during `netlify build`, writes a JSON file, and the secret never ships to the browser) over a runtime Netlify Function

**Warning signs:**
- `PUBLIC_STRAVA_CLIENT_SECRET` in any `.env` file
- `fetch('https://www.strava.com/oauth/token', ...)` in any client-side JavaScript
- Client Secret appearing in rendered page source

**Phase:** Address in the Strava integration phase, before writing any OAuth code.

**Confidence:** HIGH — verified from Netlify environment variable scoping docs, Astro public/private env convention, and Strava API security requirements.

---

### Pitfall 17: Strava Leaderboard Endpoint Requires Subscriber Status — Not Just Authentication

**What goes wrong:** The developer authenticates successfully with the Strava API and writes code to call `GET /segments/{id}/leaderboard`. The endpoint returns a 403 or an empty leaderboard. The developer assumes a bug in their OAuth flow. The actual problem: as of June 18, 2020, Strava restricted the full segment leaderboard endpoint to Strava subscribers (paid accounts) only. Free-tier Strava users cannot access leaderboard data via the API regardless of their app's authentication status.

**Why it happens:** The restriction is a billing change, not a technical limitation. The API endpoint exists and authenticates correctly; it just returns nothing for free-tier athletes. The relevant documentation is in `Changes to the Segments API` — a page separate from the main API reference — and is easy to miss.

**Consequences:** If the MK Ultra Gravel KOM leaderboard is populated by fetching segment efforts from individual athletes' accounts, those athletes must be Strava subscribers for their entries to appear. Free-tier riders are silently excluded. The leaderboard appears empty or incomplete with no useful error message.

**What is still available to non-subscribers:**
- Individual segment efforts (effort count, personal times) for subscribers
- Top 10 leaderboard entries remain accessible to all apps
- Segment metadata (name, distance, grade) for public segments

**Prevention:**
- Design around the top-10 endpoint, not the full leaderboard — it works for all apps
- Alternatively, fetch athlete efforts at build time using accounts the organizer controls (their own Strava account must be a subscriber)
- If displaying real-time KOM standings is the goal, use the segment's own Strava URL as a link-out, not an API fetch
- Document this constraint in the phase plan so future devs don't debug auth when the real issue is subscription status

**Warning signs:**
- `GET /segments/{id}/leaderboard` returning an empty `entries` array with a 200 status
- Leaderboard data visible on strava.com but absent in API response
- "athlete is not a subscriber" in error messages

**Phase:** Address at Strava integration design time, before any leaderboard API code is written.

**Confidence:** HIGH — verified from Strava official `Changes to the Segments API` documentation (June 2020, still enforced).

---

### Pitfall 18: Strava Access Token Expires Every 6 Hours — Build Will Silently Fail

**What goes wrong:** A developer stores a manually-obtained Strava access token as a Netlify environment variable. It works on the first deploy. Six hours later (or on the next deploy), the token has expired. The build script calls the Strava API, gets a 401, and either crashes with an unhandled error or — worse — silently writes an empty leaderboard JSON file. The site deploys successfully with blank leaderboard data and no one notices.

**Why it happens:** Strava access tokens expire after exactly 6 hours (21,600 seconds). The `expires_at` timestamp is in the initial OAuth response. Developers who manually exchange a code for a token once and copy it to Netlify env vars do not implement the refresh flow, so the first successful deploy creates false confidence that the system works.

**Consequences:** After 6 hours, every subsequent deploy fetches stale or empty leaderboard data. Silent data loss is harder to detect than a loud crash. If the build exits 0 even on a 401, Netlify reports a successful deployment.

**Prevention:**
- Store both the access token AND the refresh token as Netlify environment variables
- Implement token refresh in the build script: check `expires_at` before every API call; if expired, POST to `https://www.strava.com/oauth/token` with `grant_type=refresh_token` using the stored refresh token; write the new access token and refresh token back to Netlify env vars via the Netlify API
- Alternatively: design the data fetch to be triggered by a Netlify webhook on a schedule, refreshing tokens as part of that flow
- Make the build script exit non-zero if the Strava fetch fails — do not silently write empty JSON

**Important refresh token detail:** Strava rotates refresh tokens on every use. After refreshing, the old refresh token is immediately invalid. Store the new refresh token returned from the refresh response before using the new access token.

**Warning signs:**
- Only `STRAVA_ACCESS_TOKEN` stored as env var, no `STRAVA_REFRESH_TOKEN`
- Build script catches 401 errors and continues without aborting
- Leaderboard data last updated timestamp does not match deploy time

**Phase:** Address when building the Strava data fetch pipeline. Implement token refresh on day one; do not defer it as "cleanup later."

**Confidence:** HIGH — token expiry (6 hours, 21,600 seconds) and refresh token rotation verified directly from Strava official OAuth documentation.

---

## Moderate Pitfalls

Mistakes that create technical debt, degrade performance, or produce subtle bugs.

---

### Pitfall 19: Map-Elevation Sync via mousemove Fires Too Frequently — Blocks Main Thread

**What goes wrong:** The developer listens to `mousemove` on the Chart.js elevation profile canvas and updates a Leaflet map marker on every event. `mousemove` fires at 60Hz+ on desktop and at a similar rate on desktop-emulated mobile. Each handler calls `marker.setLatLng()`, which triggers a Leaflet DOM update. On mid-range Android, this creates visible map lag during hover.

**Why it happens:** `mousemove` is one of the most frequently firing browser events. Direct wiring of two heavy DOM operations (Chart.js internal pointer tracking + Leaflet marker repositioning) without rate limiting causes a throughput problem on constrained hardware.

**Consequences:** Map lag on mobile, elevated TBT (Total Blocking Time) if the handler runs long, battery drain, and hot device during use. This risks degrading the current 96 Lighthouse score — TBT is 30% of the Performance score.

**Prevention:**
- Throttle the `mousemove` handler: allow it to run at most once per animation frame using `requestAnimationFrame` or a 16ms `setTimeout` gate
- Alternatively, use Chart.js's built-in `afterEvent` plugin hook instead of raw `canvas.addEventListener('mousemove')` — Chart.js already throttles its own internal handling
- The map marker update is the expensive operation; debounce it separately from the crosshair render
- On mobile (touch devices), this sync is mostly irrelevant since touch does not produce continuous `mousemove` events — consider disabling the sync for touch contexts entirely

**Warning signs:**
- Chrome DevTools Performance panel shows repeated long tasks during elevation profile hover
- Lighthouse TBT rises above 0ms after adding sync
- Map visually lags 100–200ms behind cursor position on desktop

**Phase:** Address when implementing map-elevation sync. Throttle must be in place before any performance testing.

**Confidence:** HIGH — Leaflet canvas mousemove throttle behavior and 32ms internal throttle confirmed from Leaflet GitHub issue #9514; TBT impact of long tasks documented on web.dev.

---

### Pitfall 20: Chart.js Custom Event Listeners Not Removed on Cleanup — Memory Leak

**What goes wrong:** To wire map-elevation sync, the developer adds `mousemove`, `mouseleave`, and `click` event listeners directly to the Chart.js canvas element. When the page is navigated away from or the chart is re-initialized (e.g., on resize or route data reload), the canvas is removed from the DOM but the listeners remain in memory, keeping references to the old Chart.js instance and the Leaflet map instance alive.

**Why it happens:** Chart.js's `.destroy()` method removes Chart.js's own internal event listeners but does not remove listeners the developer added manually to `chart.canvas`. If the canvas element reference is kept in a closure (as is common with the sync setup), the garbage collector cannot free those objects.

**Consequences:** Over multiple re-initializations (e.g., user resizes window, chart is rebuilt), memory accumulates. On a single-page session, this may cause gradual slowdown. On a long session with Lighthouse open, the memory leak may surface as degraded scores over time.

**Prevention:**
- Store all manually added event listener functions as named references (not inline arrows) so they can be passed to `removeEventListener`
- Remove all manually added listeners before calling `chart.destroy()` and before any chart re-initialization
- Use an `AbortController` and pass its signal to all `addEventListener` calls — call `controller.abort()` to clean up all listeners at once
- Example pattern:
  ```javascript
  const ac = new AbortController();
  canvas.addEventListener('mousemove', handler, { signal: ac.signal });
  // On cleanup:
  ac.abort(); // removes all listeners registered with this controller
  chart.destroy();
  ```

**Warning signs:**
- Event listeners added as inline arrow functions: `canvas.addEventListener('mousemove', (e) => { ... })`
- No cleanup code runs when the chart component is unmounted or resized
- Chrome DevTools Memory tab shows Chart.js instances accumulating after window resize

**Phase:** Address when implementing map-elevation sync. Build cleanup into the same code that registers listeners.

**Confidence:** HIGH — Chart.js `.destroy()` behavior documented in official Chart.js docs; AbortController pattern for listener cleanup is MDN-documented.

---

### Pitfall 21: Strava Build-Time Fetch Counts Against Rate Limits — Daily Limit Hit by CI

**What goes wrong:** Every Netlify deploy triggers the build-time Strava fetch. If a developer pushes many commits in a day during active development (iterating on the leaderboard display, fixing data pipeline bugs), each push triggers a deploy, each deploy calls the Strava segment leaderboard endpoint. At 2,000 requests/day (non-upload endpoints: 1,000/day), a busy development day can exhaust the daily limit mid-afternoon, causing all subsequent builds to fail.

**Why it happens:** The rate limit is per-application, not per-deploy. Development activity is concentrated: 20 deploys * 5 API calls each = 100 requests consumed. In isolation that looks fine, but if the application also makes other Strava API calls (athlete data, multiple segment lookups), the budget disappears faster than expected.

**Consequences:** Build failures for the rest of the day (or until midnight UTC reset). Stale leaderboard data in production if the build fails silently. Development velocity blocked until limits reset.

**Prevention:**
- Cache the Strava API response in a JSON file committed to the repo (or stored in Netlify blob storage) with a timestamp; only re-fetch if the data is older than a configurable threshold (e.g., 24 hours)
- Guard the fetch with an env variable: `STRAVA_FETCH_ENABLED=false` skips the API call during development builds and uses cached data
- Count your expected API calls per deploy: segments * 1 leaderboard call + 1 token refresh = budget consumed per deploy
- Set up rate limit monitoring by parsing `X-RateLimit-Usage` response headers and writing them to a build log

**Warning signs:**
- API call happens unconditionally in the prebuild script
- No local cache file checked before making API call
- Multiple segments * multiple API calls per segment per deploy

**Phase:** Address when building the Strava data fetch pipeline. Cache-first logic must be implemented before any CI/CD is wired.

**Confidence:** HIGH — rate limits (100 non-upload requests/15 min, 1,000/day for non-upload) verified from official Strava rate limits documentation.

---

### Pitfall 22: Increasing Image Quality Without Checking Cumulative Bundle Impact

**What goes wrong:** The current thumbnails are 200px wide at q75. Increasing to 300px at q85 sounds modest — maybe 40–60% larger per image. But with 33 photos in the gallery grid, a 50% size increase per thumbnail multiplies to significant total page weight. The hero WebP and tone images also have their own quality budgets. The developer bumps quality numbers, runs a build, and doesn't notice the cumulative payload increase until Lighthouse flags it.

**Why it happens:** Developers evaluate image quality changes per-image, not as a budget. A single thumbnail going from 18KB to 27KB feels trivial. Thirty-three thumbnails going from 594KB to 891KB in aggregate is a Lighthouse performance issue — especially on mobile, where image transfer weight heavily influences LCP and Total Byte Weight scores.

**Consequences:** Lighthouse Performance score degrades if total page weight crosses thresholds. TBT unaffected, but LCP and Speed Index can slip if image decode time increases. On slow mobile connections (which many cyclists use in rural Michigan), the visible load experience worsens.

**Prevention:**
- Establish a total image budget before changing quality settings: measure the current total size of all thumbnails and the hero image
- Use Lighthouse or WebPageTest to get a baseline Total Byte Weight before any quality changes
- When increasing quality, use Astro's `<Image>` component with explicit `width`, `quality`, and `format="webp"` — do not set quality globally; set it per image type
- For thumbnails: favor width increase (more detail at same quality) over quality increase (diminishing returns above q75 for WebP)
- For WebP specifically: q75 is already high quality; going above q80 produces visually indistinguishable results for photo thumbnails at the cost of meaningfully larger files
- Measure after each change: `du -sh public/photos/thumbs/` before and after

**Warning signs:**
- Quality increased without measuring total byte weight before and after
- All 33 thumbnails regenerated without a size comparison
- Lighthouse Total Byte Weight audit flags new weight warnings after deploy

**Phase:** Address in the image quality improvement phase. Always measure before and after; never change quality settings speculatively.

**Confidence:** MEDIUM — WebP quality tradeoffs and Astro image pipeline behavior verified from Astro official docs and web.dev image best practices; specific byte thresholds are approximations based on WebP compression characteristics.

---

### Pitfall 23: Entrance Animations Delay LCP or Block Interaction — TBT Goes Nonzero

**What goes wrong:** Adding "subtle" load animations (fade-in on scroll, entrance for hero text, stagger for sector cards) sounds safe. But if implemented as JavaScript-driven animations that start on `DOMContentLoaded` or as CSS animations on elements that contain the LCP candidate, they can delay when Lighthouse measures the Largest Contentful Paint. Worse, if the animation JavaScript blocks the main thread at startup (a long task), TBT goes from 0ms to measurable. The current site has TBT 0ms — this is extremely fragile.

**Why it happens:** CSS `animation` properties on the LCP image or hero element can delay when the element becomes "painted" from Lighthouse's perspective, especially if the animation starts the element at `opacity: 0` — Lighthouse may not measure LCP until the element reaches visible opacity. JavaScript animation libraries that load a large bundle (GSAP free is ~70KB, Framer Motion is ~140KB) add script parse/execution time.

**Consequences:** Lighthouse TBT rises above 0ms, scoring degrades. LCP may increase if the hero element starts invisible. The current score of 96 is in "good" territory; a TBT of 200ms would drop the score to approximately 85.

**Prevention:**
- Implement entrance animations as pure CSS `transition` / `@keyframes` using only `transform` and `opacity` — these do not delay LCP measurement because they do not affect layout
- Do NOT start the LCP hero image at `opacity: 0` with a CSS animation; the browser may not register the LCP paint until the element becomes visible
- If JavaScript animation is needed, use the Web Animations API (`element.animate()`) which runs on the compositor thread — it does not add to TBT
- Avoid adding third-party animation libraries (GSAP, Framer Motion, Anime.js) for "subtle" effects — the bundle cost is not justified; CSS handles all cases needed for this site
- Run Lighthouse after adding each animation to confirm TBT stays at 0ms

**Warning signs:**
- Hero image or any LCP-candidate element starts with `opacity: 0` via CSS animation
- JavaScript animation runs in a `DOMContentLoaded` or `load` handler on many elements simultaneously
- Any new JS dependency over 5KB added for animation purposes

**Phase:** Address when adding animations. Run Lighthouse after every animation addition, not only at the end of the phase.

**Confidence:** HIGH — LCP opacity-0 interaction documented in web.dev LCP guide; TBT threshold and Lighthouse scoring weights verified from Chrome Developers documentation.

---

### Pitfall 24: Chart.js Crosshair Sync Plugin Version Incompatibility with Chart.js 4.x

**What goes wrong:** The most commonly cited crosshair plugin (`chartjs-plugin-crosshair`) was written for Chart.js 3.x. If the project uses Chart.js 4.x (which changed the plugin API), the crosshair plugin may silently fail to register, throw errors, or produce broken behavior. Issues in the plugin's GitHub confirm cross-version sync breakage exists.

**Why it happens:** Chart.js 4.0 changed internal event handling. Plugins that accessed internal `_chart` properties or used the `Chart.plugins.register()` global registration API from v2/v3 break silently in v4.

**Consequences:** No crosshair draws on the elevation chart, meaning the entire map-elevation sync feature does not work. The bug may only surface after a dependency update — the plugin appears to work in initial testing but breaks after `npm update`.

**Prevention:**
- Before choosing `chartjs-plugin-crosshair`, verify the currently installed Chart.js version in `package.json` and confirm that the plugin's README specifies compatible Chart.js versions
- Alternatively, implement the crosshair as a custom Chart.js plugin (20–30 lines of code) using the `afterDraw` hook — this avoids any third-party version dependency entirely
- If using the npm package, pin both Chart.js and the crosshair plugin versions and test together; do not allow independent updates
- A custom plugin registered inline (not globally) is the safest approach for a site with a single chart

**Warning signs:**
- `chartjs-plugin-crosshair` installed but crosshair not visible in browser
- Console errors referencing `_chart` or `Chart.controllers`
- Plugin README last updated more than 1 year ago

**Phase:** Address at the start of the map-elevation sync implementation phase, before any sync logic is written.

**Confidence:** MEDIUM — Chart.js v3/v4 plugin API changes are documented; specific `chartjs-plugin-crosshair` v4 compatibility is confirmed from GitHub issue discussions but the plugin may have been updated since research.

---

## Minor Pitfalls

Mistakes that are annoying but fixable without significant rework.

---

### Pitfall 25: Strava Segment Privacy — Public Route on Private Segment

**What goes wrong:** The KOM segments on the MK Ultra Gravel route may be marked as private segments in Strava. Private segments are invisible to other users and invisible via the API, even with `read_all` scope on another user's behalf. The developer finds the segment on the organizer's Strava account but cannot retrieve it via API when using a different authenticated user.

**Prevention:**
- Verify each KOM segment's privacy setting in Strava before designing the leaderboard integration
- If segments are private, the organizer must make them public in their Strava settings before API access works
- Alternatively, use segment effort data from the segment creator's account specifically, rather than fetching via a generic app OAuth flow

**Phase:** Address at the start of Strava integration planning.

**Confidence:** MEDIUM — private segment API behavior implied from Strava API reference and community discussions; specific privacy flag behavior is training data.

---

### Pitfall 26: Netlify Build Minutes Consumed by Heavy Prebuild Pipeline

**What goes wrong:** The existing prebuild pipeline (GPX parsing, thumbnail generation via sharp, JSON generation) already runs on every deploy. Adding a Strava API fetch, a token refresh step, and potentially image processing for new photos increases build time. Netlify free tier allows 300 build minutes/month. A 3-minute build * 100 deploys/month = entire monthly allowance consumed.

**Prevention:**
- Profile the build time before and after adding new pipeline steps: `time npm run build` locally
- Cache unchanged assets: sharp re-processes all images on every build unless an output cache is implemented; if the 33 photos are not changing, do not regenerate thumbnails on every deploy
- Netlify's build cache can persist the `public/photos/thumbs/` directory across builds using `cache:` configuration in `netlify.toml`
- Gate the Strava fetch behind a time check or manual trigger, not automatic on every deploy

**Phase:** Address when adding new pipeline steps. Measure build time before and after each addition.

**Confidence:** MEDIUM — Netlify free tier build minutes (300/month) verified from Netlify pricing page; sharp re-processing behavior is training data.

---

### Pitfall 27: Map-Elevation Sync Broken on Mobile Touch — Hover Does Not Exist

**What goes wrong:** The entire map-elevation sync feature is designed around `mousemove` and `mouseenter` events on the Chart.js canvas. These events do not fire on mobile touch devices. A user on a phone sees the elevation chart, taps on a point, and nothing happens on the map. The feature silently does not exist for the majority of the site's visitors.

**Prevention:**
- After implementing `mousemove` sync, implement a parallel touch handler using `touchmove` on the chart canvas
- Calculate the touch X position relative to the canvas and derive the corresponding elevation data point using the same logic as the mouse handler
- Alternatively, implement the sync as a tap-to-highlight (not hover) — the user taps a point on the elevation chart and the map marker jumps to that location, then stays until another tap
- Test on a real mobile device, not Chrome DevTools touch emulation, before shipping

**Phase:** Address when implementing map-elevation sync. Do not ship without touch support.

**Confidence:** HIGH — mobile touch events vs mouse events distinction is documented browser behavior.

---

## Phase-Specific Warnings

### v2.0 Phase Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Strava integration design | Client Secret in static build output | Use Netlify Functions scope; prefer build-time fetch with no secrets in browser |
| Strava leaderboard endpoint | Free-tier subscriber restriction | Design around top-10 endpoint or link out; do not assume full leaderboard access |
| Strava OAuth implementation | 6-hour token expiry causing silent build failures | Store refresh token; implement rotation; fail build loudly on 401 |
| Strava API calls in CI | Rate limit exhaustion on busy dev days | Cache-first fetch; skip API call if cached data is fresh |
| Strava segment visibility | Private segments invisible via API | Verify each segment's privacy setting before writing any API code |
| Map-elevation sync | mousemove fires at 60Hz, blocks main thread | Throttle via rAF; use Chart.js `afterEvent` hook |
| Map-elevation sync | Manual event listeners not cleaned up | Use AbortController; remove before chart.destroy() |
| Map-elevation sync | Crosshair plugin version incompatibility | Verify Chart.js version compatibility; consider custom plugin |
| Map-elevation sync | Touch events not wired | Implement touchmove handler in same phase as mousemove |
| Entrance animations | LCP element starts at opacity:0 | Never animate LCP candidate from invisible; use transform/opacity only |
| Entrance animations | TBT goes nonzero from JS animation | Prefer CSS animations; Web Animations API if JS needed; run Lighthouse after each |
| Image quality increase | Cumulative byte weight not measured | Establish budget baseline; measure before and after every quality change |
| Build pipeline additions | Netlify build minutes exceeded | Profile build time; cache thumbnails; gate Strava fetch on freshness check |

### Retained v1.0 Phase Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Mobile scroll behavior | Leaflet scroll trap | gestureHandling: true from first map commit |
| GPX rendering | Trackpoint density freezing mobile | Simplify to 500–1000 points for display |
| Photo markers | 33 DOM image nodes causing pan jank | Leaflet.markercluster from day one |
| Map attribution | Removed for design cleanliness | Style to match dark theme; do not hide |
| Dark design execution | Contrast failures on outdoor screens | WCAG checks on every text combination |
| Animations / visual effects | Layout reflow on mobile | Animate only transform and opacity |
| Font loading | FOUT causing layout shift | Preload fonts, use size-adjust on fallback |
| Hero / above-fold | Slow LCP on mobile | Preload hero image; no lazy-load above fold |

---

## Sources

### HIGH confidence (verified from official documentation)

- Strava rate limits: [Rate Limits — Strava Developers](https://developers.strava.com/docs/rate-limits/)
- Strava segment restrictions: [Changes to the Segments API — Strava Developers](https://developers.strava.com/docs/segment-changes/)
- Strava OAuth scopes and token expiry: [Getting Started — Strava Developers](https://developers.strava.com/docs/getting-started/), [OAuth Updates — Strava Developers](https://developers.strava.com/docs/oauth-updates/)
- Netlify environment variable security and function scoping: [Environment Variables — Netlify Docs](https://docs.netlify.com/build/environment-variables/overview/), [Secrets Controller — Netlify Docs](https://docs.netlify.com/build/environment-variables/secrets-controller/)
- Non-composited animations and Lighthouse: [Avoid non-composited animations — Chrome for Developers](https://developer.chrome.com/docs/lighthouse/performance/non-composited-animations)
- TBT and Lighthouse scoring: [Total Blocking Time — web.dev](https://web.dev/articles/tbt)
- Compositor-only properties (transform, opacity): [CSS GPU Animation — Smashing Magazine](https://www.smashingmagazine.com/2016/12/gpu-animation-doing-it-right/)
- Chart.js event listener cleanup and `.destroy()`: [Chart.js Plugins documentation](https://www.chartjs.org/docs/latest/developers/plugins.html)
- Leaflet canvas mousemove throttle: [Leaflet GitHub Issue #9514](https://github.com/Leaflet/Leaflet/issues/9514)

### MEDIUM confidence (verified from official source + corroborating sources)

- Astro image quality and WebP tradeoffs: [Astro Image and Assets API Reference](https://docs.astro.build/en/reference/modules/astro-assets/)
- Chart.js crosshair plugin version compatibility: [chartjs-plugin-crosshair GitHub](https://github.com/AbelHeinsbroek/chartjs-plugin-crosshair), [sync issue #95](https://github.com/AbelHeinsbroek/chartjs-plugin-crosshair/issues/95)
- Strava private segment API behavior: Strava API reference + community discussions
- Netlify build minutes and thumbnail caching: [Netlify caching overview](https://docs.netlify.com/build/caching/caching-overview/)

---

*Research completed: 2026-03-27*
*Scope: v2.0 pitfalls only (Pitfalls 16–27). v1.0 pitfalls (1–15) remain in file above the --- marker.*

---
---

# v3.0 Pitfall Extension

**Added:** 2026-03-28
**Scope:** Escher Identity + Data Fixes + UX Polish — animated SVG backgrounds, custom Leaflet markers, Chart.js KOM annotation layering, color scheme coordination, SVG favicon, and build data regeneration.

> These pitfalls address what can go wrong when adding Escher/Penrose visual identity, KOM elevation
> overlays, and UX refinements to an already-optimized system with TBT 0ms, Lighthouse 96, and a
> z-index 9999 grain overlay that all new layers must respect.

---

## Critical Pitfalls (v3.0)

---

### Pitfall 28: Animated SVG Background Breaks Compositor Safety — TBT 0ms at Risk

**What goes wrong:** The developer adds a Penrose/Escher tessellation SVG as a background element and animates it with CSS. The animation works visually, but animates properties other than `transform` and `opacity` — for example, `stroke-dashoffset`, `fill`, `d` path data, or `filter`. Each frame triggers a repaint on the CPU rather than a GPU composite, creating main-thread long tasks. TBT rises from 0ms to measurable values. On mobile, the animation also drains battery visibly.

**Why it happens:** SVG elements have a larger set of animatable properties than regular DOM elements. `stroke-dashoffset` is a popular choice for "drawing" effects — it is visually appealing and feels relevant for a Penrose triangle. But `stroke-dashoffset` is not a compositor-safe property: it triggers paint (not just composite) on every frame. Similarly, animating `fill` color, `filter: blur()`, or path `d` data forces CPU repaint at 60fps.

**The existing constraint:** The codebase already enforces compositor-safe animations (`transform`/`opacity` only) for scroll-reveal and glitch effects. The grain overlay at `z-index: 9999` is fixed and `position: fixed` — which itself creates a stacking context. Any new animated element added as `position: fixed` or with `will-change: transform` will also create stacking contexts that can interfere with the existing z-index order.

**Consequences:** TBT goes nonzero, Lighthouse score drops. On mobile, the animation causes device warming and visible battery drain — directly harmful to the user profile (gravel cyclists checking the site on phones in the field). If the animated element is large (full-screen background), the GPU memory cost of promoting it to its own layer can exceed 10–20MB on mobile devices with limited VRAM.

**Prevention:**
- Animate ONLY `transform` (scale, rotate, translate) and `opacity` on SVG elements — these are compositor-safe even for SVGs
- For Penrose triangle rotation: `animation: spin 8s linear infinite; @keyframes spin { to { transform: rotate(360deg); } }` — this is safe
- Do NOT animate: `stroke-dashoffset`, `fill`, `stroke`, `d`, `filter`, `cx`, `cy`, `r`, or any SVG geometry attribute
- For subtle "breathing" effects: animate `opacity` between 0.03 and 0.08 — compositor-safe and imperceptible to most users
- Apply `will-change: transform` only to the element that actually animates — not to the wrapper or parent — and only while the animation is running
- Avoid applying `will-change` globally or to many elements simultaneously; each promoted layer consumes additional GPU memory
- Run Chrome DevTools Performance trace with CPU throttling at 4x before shipping any animated background

**Warning signs:**
- DevTools Performance panel shows "Paint" events during animation (not just "Composite Layers")
- `stroke-dashoffset` or `fill` appearing in the `@keyframes` block
- Multiple elements with `will-change: transform` in the same viewport section
- The animated element has `position: fixed` AND the grain overlay has `position: fixed` — both create stacking contexts that must be coordinated

**Phase:** VIS-14 (Escher/Penrose tessellation backgrounds). Verify compositor safety before any visual review.

**Confidence:** HIGH — compositor-safe property list (transform, opacity) confirmed from [Chrome for Developers: Avoid non-composited animations](https://developer.chrome.com/docs/lighthouse/performance/non-composited-animations); SVG repaint behavior from [MDN Animation performance and frame rate](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Animation_performance_and_frame_rate); will-change memory cost from [Smashing Magazine: GPU Animation Doing It Right](https://www.smashingmagazine.com/2016/12/gpu-animation-doing-it-right/).

---

### Pitfall 29: Animated Background Placed at Wrong Z-Index — Obscures Content or Sits Behind Film Grain in Wrong Order

**What goes wrong:** The developer adds the Escher background element with `position: fixed` or `position: absolute` and assigns a z-index without accounting for the existing z-index: 9999 grain overlay. Two outcomes: (a) the background is placed above the grain overlay (z-index >= 9999) and the grain no longer overlays the background, breaking the psychedelic aesthetic; or (b) the background is placed below all page content at a very low z-index but uses `transform` or `opacity` which creates a new stacking context, causing other positioned elements to appear behind it unexpectedly.

**The specific code constraint:** `global.css` defines `.grain-overlay` at `z-index: 9999` with `position: fixed`. The hero section uses `position: relative` with `overflow: hidden`. Any element with `transform`, `will-change`, `opacity < 1`, or `filter` creates a new stacking context — this stacking context is local, meaning z-index values inside it cannot compete with z-index values outside it.

**Why it happens:** The stacking context model is counterintuitive. A developer assigns the background SVG `z-index: 0` thinking it will be "behind everything." But if the background's parent has `transform: translateZ(0)` for GPU promotion, the parent creates a stacking context, and the background's `z-index: 0` is relative to that context, not the root. The grain overlay at `z-index: 9999` on the root stacking context will not be affected — it will still layer on top — but the background may now appear above section content that has its own z-index values.

**Prevention:**
- Assign the animated background `z-index: -1` relative to its nearest positioned ancestor — this places it behind all content in that stacking context while remaining above the `<body>` background color
- If the background is a direct child of `<body>` (no positioned ancestor), use `z-index: 0` and ensure `position: fixed` — the grain overlay at `z-index: 9999` will still layer above it correctly
- Never assign z-index >= 9999 to the background element — the grain overlay must remain the topmost visual layer
- Test the layer order with Chrome DevTools Layers panel: confirm grain overlay is always the topmost painted layer
- If the animated element needs `will-change: transform`, wrap it in a dedicated container and apply `isolation: isolate` to prevent its stacking context from leaking into sibling components

**Warning signs:**
- Background element has `z-index: 10000` or higher
- Film grain texture no longer visible over the new background
- Existing section content (hero text, cards) appears behind the background
- DevTools Layers panel shows the grain overlay is not the topmost layer

**Phase:** VIS-14. Verify z-index ordering in DevTools Layers view before any visual polish review.

**Confidence:** HIGH — stacking context rules confirmed from [MDN: Stacking context](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Understanding_z-index/Stacking_context/); grain overlay z-index constraint verified directly from `/src/styles/global.css` (z-index: 9999).

---

### Pitfall 30: prefers-reduced-motion Not Applied to Animated Background — Accessibility Regression

**What goes wrong:** The existing codebase correctly applies `prefers-reduced-motion` to scroll-reveal animations (in `global.css` utilities layer) and card hover transitions. A new animated SVG background is added without a corresponding `prefers-reduced-motion` override. The animation runs continuously for users who have set their OS accessibility preference to reduce motion — including users with vestibular disorders, migraines, or epilepsy for whom parallax and looping animations can cause physical symptoms.

**Why it happens:** The `prefers-reduced-motion` pattern is already in the codebase for discrete animations. Developers assume the existing global query covers all animations. It does not: the existing queries target `[data-reveal]` and `.redacted-reveal` and `.card-hover` specifically. A new `@keyframes` added elsewhere is not covered by those selectors.

**Consequences:** Accessibility regression. The site cannot claim WCAG 2.3.3 (Animation from Interactions) compliance if looping background animations are not suppressed for users who request reduced motion. More concretely: a cyclist with vestibular sensitivity opens the site on their phone before the event; the looping Escher pattern triggers symptoms.

**Prevention:**
- For every new `@keyframes` animation, add an explicit `@media (prefers-reduced-motion: reduce)` block that sets `animation: none` or replaces it with a static state
- The background element should have a reduced-motion fallback that shows it as a static, non-animated SVG (or hides it entirely if it adds no value without motion)
- Pattern:
  ```css
  .escher-bg {
    animation: escher-rotate 12s linear infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .escher-bg {
      animation: none;
      /* optionally: opacity: 0.04; to keep subtle static texture */
    }
  }
  ```
- If the animation is driven by JavaScript (e.g., `element.animate()`), check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` before starting the animation
- Do not rely on the existing global `[data-reveal-ready] [data-reveal]` reduced-motion rule — it only covers scroll-reveal elements

**Warning signs:**
- New `@keyframes` added to a component `<style>` block without a corresponding `prefers-reduced-motion` override
- JavaScript animation started without checking `matchMedia('(prefers-reduced-motion: reduce)')`
- Chrome DevTools: Rendering tab → "Emulate CSS media feature prefers-reduced-motion: reduce" shows animation still running

**Phase:** VIS-14. The reduced-motion override must ship in the same commit as the animation — not as a follow-up.

**Confidence:** HIGH — WCAG 2.3.3 requirements confirmed from [W3C: Understanding SC 2.3.3](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html); `prefers-reduced-motion` API confirmed from [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion); existing codebase pattern confirmed from `/src/styles/global.css`.

---

### Pitfall 31: Star Color Scheme Updated in One Place — Three Other Locations Remain Stale

**What goes wrong:** VIS-12 requires changing the sector star color spectrum (currently gray/gray/amber/orange/red) to a new yellow-to-red scheme. The developer updates `starColors` in `ElevationProfile.astro` and the change looks correct on the elevation chart. The map polylines, sector badge divIcons, and sector card star spans still use the old gray/amber colors. The map and chart are now visually inconsistent — the same sector shows different colors in different views.

**Why it happens:** The `starColors` map is duplicated across three files without a shared constant:
1. `src/components/ElevationProfile.astro` — `const starColors: Record<number, string>` (annotation box colors)
2. `src/components/RouteMap.astro` — `const starColors: Record<number, string>` (polyline colors + badge span colors)
3. `src/components/GravelSectors.astro` — `const starColors: Record<number, string>` (inline style on star span)

The `PROJECT.md` key decisions section explicitly notes "Scripts self-contained" as an accepted tradeoff. This means the duplication is intentional — but it creates a coordination burden when values change.

**Consequences:** Map-chart-card visual inconsistency. On mobile, a user who scrolls from the sector cards to the map sees different colors for the same sectors. This undermines the Paris-Roubaix-style rating system's visual language. The fix requires touching three separate files — missing even one causes the regression to ship.

**Prevention:**
- When implementing VIS-12, update ALL THREE locations in a single commit:
  - `ElevationProfile.astro`: annotation box `backgroundColor` and `borderColor` hex strings
  - `RouteMap.astro`: polyline `color` and badge span `style="color:..."` hex strings
  - `GravelSectors.astro`: star span `style` attribute hex strings
- Write a checklist in the phase plan that lists each file explicitly — do not rely on memory
- After the change, visually verify: load the page and compare the sector card star color for a 3-star sector against the map polyline color for the same sector and the elevation band color for that sector — they must match
- Consider creating a shared `/public/data/sector-colors.json` or a shared Astro utility module as a future improvement, but do not block VIS-12 on this refactor

**Warning signs:**
- Only `ElevationProfile.astro` or only `RouteMap.astro` has been modified in the VIS-12 commit
- A 1-star sector polyline appears gray on the map but yellow on the elevation chart
- Git diff for the VIS-12 commit touches fewer than three component files

**Phase:** VIS-12. This is a coordination pitfall, not a technical complexity — the fix is straightforward once all three files are identified. The danger is missing a file.

**Confidence:** HIGH — confirmed by direct code inspection of `ElevationProfile.astro`, `RouteMap.astro`, and `GravelSectors.astro` — all three contain independent `starColors` Record definitions with the same keys (1–5) and the same hex values.

---

## Moderate Pitfalls (v3.0)

---

### Pitfall 32: Custom Bike Icon Marker — divIcon Anchor Point Causes Zoom Drift

**What goes wrong:** UX-01 replaces the elevation-hover crosshair `circleMarker` with a bike SVG icon using Leaflet's `L.divIcon`. The developer sets `iconSize: [24, 24]` and does not set `iconAnchor`, or sets it to `[0, 0]` (which is the top-left corner of the icon). When the map is panned or zoomed, the bike icon appears to drift — it sits offset from the actual track point it should represent. On high-DPI (retina) displays, the issue compounds: the icon renders blurry if the SVG is not sized correctly, and the anchor point calculation is off.

**Why it happens:** Leaflet's `iconAnchor` specifies the pixel offset from the icon's top-left corner to the point that should be pinned to the map coordinate. For a circular crosshair, the anchor should be the center (`[width/2, height/2]`). For a bike icon pointing in a direction, the anchor should be at the bike's contact point with the ground. The existing crosshair uses `L.circleMarker` which handles its own centering — switching to `divIcon` requires explicit anchor configuration.

**Existing code context:** The current crosshair is a `circleMarker` with `radius: 6` — it has no `iconAnchor` concern because Leaflet handles circle centering internally. Restock point markers use `iconAnchor: [8, 8]` (center of a 16×16 icon). The sector badge markers use `iconAnchor: [0, 0]` intentionally (they are text badges, not point markers). The bike icon replacing the crosshair must behave like the restock marker — center-anchored.

**Prevention:**
- For a 24×24 bike icon: `iconAnchor: [12, 12]` centers it on the track coordinate
- If the icon has a visual "tip" (e.g., a bike wheel touching the ground), set the anchor to the wheel's pixel position within the icon bounds, not the center
- Always test anchor accuracy by: (1) setting the marker at a known waypoint, (2) zooming in to maximum zoom, (3) verifying the icon stays on the track point without drift
- For retina display support, provide both `iconUrl` (1x) and `iconRetinaUrl` (2x) if using raster icons; if using inline SVG in `html:` (the current pattern for all other divIcons), set `iconSize` to the actual rendered CSS size and the SVG viewBox will scale correctly — no separate retina URL needed
- The existing pattern (inline SVG in `html:` field, explicit `iconSize` and `iconAnchor`) used for restock and photo markers is the correct approach — follow it exactly

**Warning signs:**
- Bike icon visually offset from the crosshair circle it replaced at the same map coordinate
- Icon position shifts when zooming in from zoom level 8 to 14
- Icon appears blurry on a MacBook Pro Retina display (sign that raster PNG was used instead of inline SVG)
- `iconAnchor` not set, or set to `[0, 0]` for a center-placed indicator

**Phase:** UX-01 (Replace elevation hover crosshair with bike icon). Verify anchor accuracy at zoom levels 8, 12, and 16 before marking done.

**Confidence:** HIGH — Leaflet `iconAnchor` behavior confirmed from [Leaflet official custom icons tutorial](https://leafletjs.com/examples/custom-icons/) and [Leaflet reference docs](https://leafletjs.com/reference.html); existing anchor patterns confirmed from `/src/components/RouteMap.astro`.

---

### Pitfall 33: KOM Annotation Bands on Elevation Profile — Z-Order Conflict With Existing Sector Bands

**What goes wrong:** VIS-13 adds KOM segment annotations to the elevation chart. These are visually distinct from sector bands (different color — chartreuse `#7fff00`, dashed pattern in the map) but they share the same Chart.js annotation layer. If both sector boxes and KOM annotations use the same `drawTime`, KOM bands are drawn on top of sector bands (or vice versa) in an unpredictable order determined by object key iteration. Where KOM segments overlap sector boundaries, the opacity stacking produces muddy colors that are neither the sector color nor the KOM color.

**The specific scenario:** The existing sector bands use `backgroundColor: starColors[sector.stars] + '22'` (~13% opacity fill) with `drawTime` unset (inherits global, defaults to `afterDatasetsDraw`). If KOM bands are added at the same drawTime and overlap a sector, the visual result is the sector's color mixed with the KOM color at 13% + 13% opacity — a brownish artifact that matches neither intended color.

**Why it happens:** Chart.js annotation boxes do not have a built-in "bring to front" mechanism. The order annotations draw is the order of object keys in the `annotations` object — a detail that is not obvious from the documentation. Additionally, if KOM annotations use `fill` patterns (dashes) which are not supported by the annotation plugin's `box` type, developers try to simulate them with repeated thin boxes or line annotations, multiplying the overlap problem.

**Prevention:**
- Use different `drawTime` values to separate layers: set sector bands to `drawTime: 'beforeDatasetsDraw'` (behind the elevation line) and KOM bands to `drawTime: 'afterDatasetsDraw'` (in front of the elevation line but below the dataset tooltip layer)
- This separation eliminates overlap opacity stacking entirely — the two annotation types never share the same rendering pass
- For KOM visual distinction: use `type: 'line'` annotations at the KOM start and end x-values rather than a filled box — a pair of vertical lines avoids opacity stacking with sector boxes entirely
- If a KOM box fill is required: use a very low opacity (max `'11'` hex, ~7%) so that overlapping with a sector band produces a visually predictable result
- Keep the KOM annotation keys clearly namespaced: `kom_0`, `kom_1`, etc. (separate from `sector_0`, `sector_1`) to avoid accidental key collisions when iterating

**Warning signs:**
- Brownish or unexpected hue where a KOM segment overlaps a gravel sector on the elevation chart
- KOM band appears behind the elevation area fill (chart dataset) rather than in front of it
- KOM annotations use the same `drawTime` value as sector annotations (both `afterDatasetsDraw`)
- `Object.keys(annots)` iterates sector keys before KOM keys and a KOM is visually obscured

**Phase:** VIS-13 (KOM segments on elevation profile). Test visual layering at a location where a KOM and a sector overlap before any cross-component review.

**Confidence:** MEDIUM — `drawTime` layering control confirmed from [chartjs-plugin-annotation options docs](https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/options.html); opacity stacking behavior inferred from SVG compositing model and Chart.js annotation rendering order — opacity stacking specifics are training-data reasoning, not officially documented.

---

### Pitfall 34: SVG Favicon Dark Mode — Hardcoded Fill Colors Override prefers-color-scheme Media Query

**What goes wrong:** VIS-15 replaces the current favicon SVG (a simple `<rect>` with hardcoded `fill="#1a1a2e"` and a `<text fill="#b0f0b0">`) with a Penrose triangle SVG. The developer wants it to adapt to dark/light mode. They add a `<style>` block with `@media (prefers-color-scheme: dark)` inside the SVG. But they leave `fill` attributes on the path elements themselves. Because SVG attribute `fill` has higher specificity than CSS `fill` in a `<style>` block, the media query is silently ignored — the icon stays the same color in both light and dark mode.

**The current favicon:** `/public/favicon.svg` uses hardcoded `fill` attributes on both elements. This is exactly the CSS specificity trap — adding a `<style>` block to this file without removing the inline `fill` attributes will not work.

**Why it happens:** SVG element attribute `fill="color"` is equivalent to an inline style and has the specificity of `style=""`. A `<style>` block in SVG applies at the author stylesheet level — lower specificity than element attributes. The media query in the `<style>` block is parsed and applied, but loses to the inline `fill` attribute every time.

**Additional browser support caveat:** Safari supports SVG favicons but does NOT apply embedded `<style>` blocks when rendering SVG favicons — the media query will not work in Safari regardless of specificity. For Safari dark mode favicon adaptation, a separate PNG favicon with a macOS `prefers-color-scheme` fallback is the only reliable path. Chrome and Firefox correctly apply embedded styles including media queries.

**Prevention:**
- Remove all `fill` attributes from SVG path elements — use CSS classes or tag selectors in the `<style>` block instead
- Pattern: `<style>.icon-bg { fill: #1a1a2e; } @media (prefers-color-scheme: light) { .icon-bg { fill: #ffffff; } }</style>` then `<rect class="icon-bg" .../>` (no fill attribute)
- For Safari: provide a PNG ICO fallback in `<link rel="icon" href="/favicon.ico" sizes="32x32">` placed before the SVG link — browsers use the most specific match
- The current BaseLayout already has `<link rel="icon" href="/favicon.svg" type="image/svg+xml">` — this is correct; just add the ICO fallback after it
- After implementing, verify in Chrome (SVG + media query), Firefox (SVG + media query), and Safari (ICO fallback) — do not test only in one browser

**Warning signs:**
- `fill="..."` attributes present on SVG path/rect elements alongside a `<style>` block
- Favicon does not change color when toggling OS dark/light mode in Chrome DevTools
- No ICO or PNG fallback link in `<head>` for Safari

**Phase:** VIS-15 (Penrose triangle favicon). This is a one-time implementation detail — get it right once and it requires no future maintenance.

**Confidence:** HIGH — SVG CSS specificity (attribute vs stylesheet) confirmed from MDN CSS specificity; Safari SVG favicon style limitation confirmed from [Mozilla Bug 1772632](https://bugzilla.mozilla.org/show_bug.cgi?id=1772632) and [favicon dark mode guide (2025)](https://owenconti.com/posts/supporting-dark-mode-with-svg-favicons); existing favicon confirmed from `/public/favicon.svg`.

---

### Pitfall 35: Photo Map Position Regeneration — Stale photos.json Served From Cache After Pipeline Update

**What goes wrong:** DATA-06 requires regenerating `photos.json` from corrected mile-marker positions. The developer runs the prebuild pipeline (`npm run prebuild`), the new `photos.json` is written to `public/data/photos.json`, and the site builds correctly. However, the browser — and Netlify's CDN edge cache — has cached the old `photos.json`. After deploy, users continue seeing the old photo positions on the map for hours or until cache expiry. The developer checks their own browser and sees the new positions (because DevTools Network → Disable Cache was on), declares the fix shipped, and moves on. Users on mobile report the photos are still in the wrong place.

**Why it happens:** Static JSON files served by Netlify default to long cache headers (`Cache-Control: max-age=31536000` for assets with content-hash in the filename, shorter for files without). `photos.json` has no content-hash in its name — it is served from a predictable URL. Netlify's CDN may cache it for the duration configured in `netlify.toml` or up to the browser's heuristic cache duration.

**The specific concern:** The route-data, annotations, and photos JSON files are all served from `/data/*.json` — predictable URLs without cache-busting query strings. The existing prebuild pipeline regenerates them on every deploy, but CDN edge cache and browser cache may serve old versions.

**Prevention:**
- After the fix deploy, trigger a Netlify cache purge from the Netlify dashboard (Deploys → "Clear cache and deploy")
- Alternatively, verify that `netlify.toml` sets `Cache-Control: no-cache` or short `max-age` for the `/data/` directory specifically — data files should be cache-busted on each deploy, not cached for a year
- Test cache behavior by: opening the deployed URL in a private/incognito window (no local cache) and checking that the photo positions are updated
- Do not use DevTools "Disable Cache" as the verification method for data that real users will fetch — it bypasses the browser cache but not CDN edge cache

**Warning signs:**
- Photo positions still incorrect in a fresh incognito window 30+ minutes after deploy
- `curl -I https://mkultragravel.netlify.app/data/photos.json` shows a long `max-age` in the cache headers
- Developer verified fix in a tab that had the site open during development (warm cache)

**Phase:** DATA-06 (Fix photo map positions). Include a cache purge step in the verification checklist, not just visual inspection in the developer's own browser.

**Confidence:** MEDIUM — Netlify default cache header behavior for non-hashed assets is a known pattern; specific `netlify.toml` cache configuration for this project not verified (no `netlify.toml` found in codebase inspection); JSON cache duration behavior is medium confidence.

---

### Pitfall 36: OKLCH Wide-Gamut Colors in New Color Scheme — WCAG Contrast Computed Against Wrong Color Space

**What goes wrong:** VIS-12 changes the sector color spectrum. The new palette uses oklch values for design token consistency. The developer picks visually appealing colors in oklch (e.g., `oklch(0.85 0.3 90)` for 1-star) and verifies contrast using a browser DevTools color picker. The contrast appears acceptable visually and in DevTools. But WCAG 2.2 contrast ratio is defined using the sRGB relative luminance formula — oklch colors that fall outside the sRGB gamut are auto-corrected by the browser to sRGB before rendering, and that correction changes the actual lightness value. The WCAG contrast ratio computed against the pre-correction oklch value is wrong.

**Why it happens:** Wide-gamut P3 or Rec2020 colors defined in oklch (high chroma, `C > 0.2`) may fall outside sRGB. When rendered on an sRGB display (most Android phones, older iPhones), the browser clips the color to the nearest sRGB value. The clipped color may have a different luminance than intended, meaning the WCAG contrast against the dark background is different from what the developer computed.

**The specific risk:** The sector star colors are displayed on top of the dark background (`--color-bg-surface: oklch(0.14 0.01 250)`) and as badges on the dark map. The 1-star and 2-star colors (currently gray — low saturation, safe) are being changed to yellows. If the new yellow has a chroma outside sRGB, the perceived brightness on low-gamut phones may differ from the developer's Retina display.

**Prevention:**
- When choosing sector colors, compute WCAG contrast using the hexadecimal sRGB fallback values — not the oklch values directly
- Use [OddContrast](https://www.oddcontrast.com/) or similar tools that compute contrast with gamut-mapping awareness
- As a conservative rule: keep chroma `C` below 0.2 for colors that must meet WCAG contrast — above 0.2, gamut clipping risk increases significantly
- Target 4.5:1 contrast ratio against `oklch(0.14 0.01 250)` (the surface background) for all star rating colors that appear as text or small indicators
- Test on an actual Android device (not only a Retina Mac) — the sRGB clipping is device-dependent

**Warning signs:**
- Sector badge colors with `C > 0.25` in oklch notation
- Contrast ratio passes on a P3-capable display but fails on a standard sRGB screen
- New color values not cross-referenced against their sRGB hex equivalents before shipping

**Phase:** VIS-12 (Recolor sector spectrum). Check every new color value against WCAG 4.5:1 before implementation.

**Confidence:** MEDIUM — oklch wide-gamut WCAG interaction confirmed from [W3C WCAG discussions](https://github.com/w3c/wcag/discussions/4559) and [LogRocket OKLCH guide](https://blog.logrocket.com/oklch-css-consistent-accessible-color-palettes); sRGB gamut mapping in browsers confirmed from CSS Color Level 4 spec; specific threshold (`C > 0.2`) is an approximation based on P3 gamut boundaries.

---

## Minor Pitfalls (v3.0)

---

### Pitfall 37: Animated Background GPU Layer Over-Promotion — Mobile Memory Pressure

**What goes wrong:** The developer applies `will-change: transform` to the Escher background SVG to ensure smooth animation. The background covers the full viewport. On mobile, promoting a full-viewport element to a GPU layer consumes significant additional memory — a 390×844 viewport (iPhone 14) at 2x DPR promoted to a GPU layer requires approximately 390×844×4 bytes×4 (DPR²) = ~5MB just for that one element. If other elements also have `will-change` set (from development experimentation), total GPU memory pressure increases. On devices with 2–3GB RAM, this can cause the browser to evict other pages or trigger GC pauses.

**Prevention:**
- Apply `will-change: transform` only to the specific element doing the transform, not its parent or wrapper
- Remove `will-change` from any element that is not actively animating — it is a hint to the browser to allocate resources NOW, not lazily
- If the Escher background is the only animated element on the page, the memory cost is acceptable — verify with Chrome DevTools Memory tab that total GPU memory does not exceed ~30MB across all promoted layers
- A safer alternative to `will-change: transform`: use `transform: translateZ(0)` only in the animation itself (inside `@keyframes`) — this promotes the layer during animation and releases it after

**Warning signs:**
- Chrome DevTools Layers panel shows 5+ promoted composite layers
- Multiple elements with `will-change: transform` in the DOM simultaneously
- Memory tab shows GPU memory growing during the animation

**Phase:** VIS-14. Check DevTools Layers panel before shipping.

**Confidence:** MEDIUM — GPU layer memory cost calculation is training-data arithmetic; `will-change` over-promotion consequences documented in [Smashing Magazine: GPU Animation Doing It Right](https://www.smashingmagazine.com/2016/12/gpu-animation-doing-it-right/); specific memory numbers are approximations.

---

### Pitfall 38: Glitch Animation Uses Deprecated `clip` Property — May Break in Future Browsers

**What goes wrong:** The existing `noise-anim` and `noise-anim-2` keyframe animations in `index.astro` use the CSS `clip` property (e.g., `clip: rect(96px, 9999px, 57px, 0)`). CSS `clip` has been deprecated in favor of `clip-path`. While it currently works in all major browsers, it is on a deprecation path. Adding new animations during v3.0 that depend on or extend this pattern risks building on a deprecated foundation. Additionally, if v3.0 introduces `clip-path` for the Penrose background, the inconsistency between `clip` and `clip-path` in the same animation system is a maintenance hazard.

**Prevention:**
- Do not introduce new animations using the deprecated `clip` property
- For v3.0 animated backgrounds, use `clip-path` if clipping is needed — it is the current standard
- The existing `noise-anim` glitch animations need not be refactored as part of v3.0 (they work and are tested), but do not extend the pattern

**Phase:** VIS-14. Note that the glitch animation has this technical debt if it is ever modified.

**Confidence:** MEDIUM — `clip` property deprecation confirmed from MDN; `clip-path` as replacement confirmed from CSS Masking Level 1 spec.

---

### Pitfall 39: CONT-05 Link Additions — Inline Style Overrides From `redacted-reveal` Pattern Do Not Apply to `<a>` Tags

**What goes wrong:** CONT-05 makes GLRC/Great Lakes Recovery Centers mentions clickable links. The developer wraps the text in `<a>` tags. The existing `global.css` `a` rule sets `color: var(--color-accent-green)` — this may visually conflict with sections where the GLRC text appears in a `--color-accent-white` heading or a `--color-text-muted` paragraph. The link color is correct by the design system but may look out of place if the surrounding text has a very different color weight.

**Additionally:** If any GLRC mention is currently inside a `.redacted-reveal` span, wrapping it in `<a>` creates a nested interactive element (`<a>` inside a `<button>` or a `<button>` inside `<a>`), which is invalid HTML and causes unpredictable keyboard navigation behavior.

**Prevention:**
- Audit each GLRC mention in `index.astro` before adding the link: check whether it is inside a `.redacted-reveal` span or other interactive element
- If inside a `.redacted-reveal`, use a different pattern (e.g., make the redacted-reveal itself navigate, or expose the link only after the reveal)
- After adding links, check link color contrast against all background colors where GLRC appears: `--color-accent-green` on `--color-bg-base` and `--color-bg-surface`
- Run an HTML validator on the built output to catch any nested interactive element violations

**Phase:** CONT-05. Simple audit before implementation prevents HTML validity issues.

**Confidence:** HIGH — nested interactive element invalidity is defined in the HTML specification; link color behavior confirmed from `/src/styles/global.css`.

---

## v3.0 Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| VIS-12 sector color recolor | Color updated in only 1 of 3 files | Update ElevationProfile, RouteMap, AND GravelSectors in one commit; verify visually |
| VIS-12 new oklch colors | Wide-gamut WCAG contrast failure on sRGB screens | Compute contrast against hex sRGB fallback; use OddContrast tool |
| VIS-13 KOM elevation bands | Opacity stacking with existing sector bands | Use different drawTime for KOM vs sector; prefer line annotations over boxes |
| VIS-14 Escher background | Non-compositor animation (stroke-dashoffset, fill) causes repaints | Animate transform/opacity only; DevTools Performance trace before review |
| VIS-14 Escher background | Wrong z-index disrupts grain overlay at z-index:9999 | Set background z-index to -1 or 0; verify Layers panel; never >= 9999 |
| VIS-14 Escher background | Missing prefers-reduced-motion override | Add @media (prefers-reduced-motion: reduce) in same commit as animation |
| VIS-14 Escher background | will-change on large element causes mobile memory pressure | Apply will-change only to animating element; check DevTools Layers |
| VIS-15 Penrose favicon | Hardcoded fill attributes override CSS media query | Remove fill attributes from elements; use CSS class selectors in style block |
| VIS-15 Penrose favicon | No Safari fallback | Add ICO fallback link before SVG link in BaseLayout |
| UX-01 bike icon marker | iconAnchor not set or wrong — marker drifts on zoom | Set iconAnchor: [width/2, height/2] for centered indicator; test at zoom 8/12/16 |
| DATA-06 photo position fix | CDN cache serves old photos.json after deploy | Trigger Netlify cache purge; verify in incognito window, not DevTools-disabled cache |
| CONT-05 GLRC links | Nested interactive element if inside redacted-reveal | Audit each mention for existing interactive wrappers before adding `<a>` |

---

## v3.0 Sources

### HIGH confidence (verified from official documentation)

- Compositor-safe animation properties (transform, opacity): [Avoid non-composited animations — Chrome for Developers](https://developer.chrome.com/docs/lighthouse/performance/non-composited-animations)
- Animation performance and frame rate (SVG repaint behavior): [Animation performance and frame rate — MDN](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Animation_performance_and_frame_rate)
- will-change memory cost and layer promotion: [CSS GPU Animation: Doing It Right — Smashing Magazine](https://www.smashingmagazine.com/2016/12/gpu-animation-doing-it-right/)
- prefers-reduced-motion CSS API: [prefers-reduced-motion — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)
- WCAG 2.3.3 Animation from Interactions: [W3C Understanding SC 2.3.3](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)
- Stacking context — transform/opacity create new stacking contexts: [Stacking context — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Understanding_z-index/Stacking_context/)
- Leaflet custom icon anchor: [Custom Icons tutorial — Leaflet.js](https://leafletjs.com/examples/custom-icons/); [Leaflet Reference](https://leafletjs.com/reference.html)
- SVG favicon Safari embedded style limitation: [Mozilla Bug 1772632](https://bugzilla.mozilla.org/show_bug.cgi?id=1772632)
- SVG CSS specificity (attribute vs stylesheet): MDN CSS Specificity
- Hardware-accelerated animations in Chromium: [Chrome for Developers: hardware-accelerated animations](https://developer.chrome.com/blog/hardware-accelerated-animations)

### MEDIUM confidence (verified from official source + corroborating sources)

- Chart.js annotation drawTime layering: [chartjs-plugin-annotation options — official docs](https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/options.html)
- OKLCH wide-gamut WCAG contrast: [W3C WCAG discussion #4559](https://github.com/w3c/wcag/discussions/4559); [OKLCH in CSS — LogRocket](https://blog.logrocket.com/oklch-css-consistent-accessible-color-palettes)
- SVG favicon dark mode implementation: [Supporting Dark Mode with SVG Favicons — Owen Conti](https://owenconti.com/posts/supporting-dark-mode-with-svg-favicons); [Light & Dark Mode Favicons — Space Jelly](https://spacejelly.dev/posts/light-dark-mode-favicons)
- Netlify CDN cache headers for non-hashed static assets: Netlify documentation + community behavior reports
- CSS `clip` property deprecation: MDN deprecation notices

### LOW confidence (WebSearch only — flag for validation)

- Opacity stacking behavior when two Chart.js annotation boxes overlap at the same drawTime: inferred from SVG compositing model; not explicitly documented by chartjs-plugin-annotation

---

*v3.0 pitfalls added: 2026-03-28*
*Pitfalls 28–39 address v3.0 scope: Escher identity, animated backgrounds, custom markers, KOM annotations, color scheme coordination, SVG favicon, and build data regeneration.*
