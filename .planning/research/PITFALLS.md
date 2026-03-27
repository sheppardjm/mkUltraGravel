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
