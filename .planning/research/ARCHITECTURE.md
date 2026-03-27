# Architecture Patterns — v2.0 Integration

**Domain:** Static gravel cycling event website (Astro 6 + Leaflet + Chart.js)
**Project:** MK Ultra Gravel
**Researched:** 2026-03-27
**Focus:** How v2.0 features integrate with the existing single-page architecture
**Overall confidence:** HIGH (event bus pattern), HIGH (Strava data strategy), HIGH (animation approach)

---

## Existing Architecture Snapshot

The v1.0 site is a single-page Astro 6 static site. Key constraints that v2.0 must work within:

- RouteMap.astro and ElevationProfile.astro each have their own `<script>` block with independent lazy-init logic
- Both scripts fetch `route-data.json` independently at runtime (each makes its own fetch)
- No shared state exists between them — they are fully isolated
- Astro component scripts compile to module scripts; inter-component communication must go through the DOM or `window`
- Data pipeline runs as Node.js prebuild scripts; JSON files land in `public/data/` before Astro builds

The critical architectural gap for v2.0: RouteMap exposes a `map` instance scoped inside `initMap()`. ElevationProfile exposes a `Chart` instance scoped inside `initElevation()`. Neither is accessible outside its own closure.

---

## Feature 1: Map ↔ Elevation Chart Communication

### The Problem

The two components initialize asynchronously and independently. Chart.js `onHover` needs to move a marker on the Leaflet map. Leaflet `click`/`mousemove` events need to highlight a position on the Chart.js canvas. Neither component has a reference to the other.

### Recommended Pattern: Window Custom Events

Use `window.dispatchEvent()` with `CustomEvent` as a lightweight event bus. This is the idiomatic Astro cross-component communication pattern for static sites — no framework, no shared module, no global variable required.

**Confidence:** HIGH — verified via Astro official docs (scripts-and-event-handling), confirmed via Chart.js interactions docs, and consistent with Leaflet's event model.

#### How it works

**ElevationProfile.astro emits when hovered:**

```javascript
// Inside initElevation(), in the Chart constructor options:
options: {
  onHover: (event, activeElements, chart) => {
    if (!activeElements.length) return;
    const helpers = await import('chart.js');
    const canvasPos = helpers.Chart.helpers.getRelativePosition(event, chart);
    const miValue = chart.scales.x.getValueForPixel(canvasPos.x);
    window.dispatchEvent(new CustomEvent('elevation:hover', {
      detail: { mi: miValue }
    }));
  }
}
```

**RouteMap.astro listens and moves a marker:**

```javascript
// Inside initMap(), after routeData is loaded:
// Create a hidden crosshair marker (no icon, or small circle)
const crosshair = L.circleMarker([0, 0], {
  radius: 6,
  color: '#22d3ee',
  fillColor: '#22d3ee',
  fillOpacity: 0.8,
  weight: 2
});
// Don't add to map until first hover

window.addEventListener('elevation:hover', (e) => {
  const targetMi = e.detail.mi;
  // Binary search or linear scan routeData for nearest point
  const pt = findNearestPoint(routeData, targetMi);
  if (!map.hasLayer(crosshair)) map.addLayer(crosshair);
  crosshair.setLatLng([pt.lat, pt.lon]);
});

window.addEventListener('elevation:leave', () => {
  if (map.hasLayer(crosshair)) map.removeLayer(crosshair);
});
```

**Key detail:** `setLatLng()` updates a `circleMarker` or `marker` position in-place without removing and re-adding it. This is the correct Leaflet API for this pattern (confirmed via Leaflet docs).

#### Initialization race condition

Both components lazy-initialize on scroll. The `elevation:hover` event listener must be registered inside `initMap()` (after `routeData` is loaded), not in the outer scroll handler. The `window.addEventListener` call is cheap — registering it before the map loads is safe because no events will fire until the user actually hovers the chart.

For the reverse direction (map → chart highlight), add a `map:hover` custom event inside the Leaflet `mousemove` handler.

### Route Data Sharing

Both components currently fetch `route-data.json` independently. For v2.0, the crosshair lookup in RouteMap requires `routeData` to be available when `elevation:hover` fires. This is already the case — `initMap()` loads `routeData` before registering the listener.

**No change to the data pipeline is needed.** Both components continue to fetch independently. This is acceptable: `route-data.json` is ~44KB, the browser caches it after the first fetch, and the second component's fetch resolves from cache.

### Segment Highlight on Elevation Chart

When user hovers a sector or KOM on the map (clicking a popup or hovering a polyline), dispatch a `map:segmentHover` event with `{ startMi, endMi }`. The elevation chart can respond by programmatically updating its annotation plugin boxes to emphasize that segment.

```javascript
// In RouteMap.astro, on sector polyline mouseover:
sectorPolyline.on('mouseover', (e) => {
  window.dispatchEvent(new CustomEvent('map:segmentHover', {
    detail: { startMi: sector.startMi, endMi: sector.startMi + sector.lengthMi }
  }));
});
```

The elevation chart registers a listener that calls `chart.update('none')` after modifying the annotation's `borderWidth` or `backgroundColor` — Chart.js `update('none')` skips animation for instant feedback.

---

## Feature 2: Strava Leaderboard Data

### The Constraint

The `/segments/{id}/leaderboard` endpoint was restricted in June 2020. The endpoint is no longer available to third-party applications. Per official Strava docs: "The Segment Leaderboard endpoint is not available."

However, the **`/segments/{id}` endpoint** still returns an `xoms` object containing KOM and QOM times. The `/segments/{id}/all_efforts` endpoint returns individual segment efforts when authenticated.

For a public leaderboard display (top N athletes, their times), the only viable path through the official API requires an authenticated request from an account that has completed those efforts — you cannot enumerate other athletes' names and times via the public API post-2020.

**Confidence:** HIGH — confirmed via Strava official changelog (developers.strava.com/docs/segment-changes/) which explicitly states the leaderboard endpoint is unavailable.

### Recommended Strategy: Static Leaderboard JSON

Maintain a manually-curated `public/data/leaderboard.json` file in the repository. Update it by querying the Strava API during build using an authenticated access token stored as a Netlify environment variable.

#### Data Flow

```
Build time:
  STRAVA_CLIENT_ID       (Netlify env var)
  STRAVA_CLIENT_SECRET   (Netlify env var)
  STRAVA_REFRESH_TOKEN   (Netlify env var, updated manually when it changes)
       ↓
  scripts/fetch-strava.js
    1. POST to https://www.strava.com/oauth/token with grant_type=refresh_token
    2. Receive new access_token (valid 6 hours)
    3. GET /api/v3/segments/{id} for each KOM segment → extract xoms.kom, xoms.qom
    4. GET /api/v3/segments/{id}/all_efforts?per_page=10 for top efforts
    5. Write public/data/leaderboard.json
       ↓
  Astro build reads leaderboard.json
  KomSegments.astro renders leaderboard data as static HTML
```

#### Netlify Environment Variable Pattern

```javascript
// scripts/fetch-strava.js
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const STRAVA_REFRESH_TOKEN = process.env.STRAVA_REFRESH_TOKEN;

// If env vars missing (local dev without credentials), skip and use cached JSON
if (!STRAVA_CLIENT_ID) {
  console.log('STRAVA_ env vars not set — skipping leaderboard fetch');
  process.exit(0);
}
```

This graceful degradation means local dev always works, and Netlify builds fetch live data.

#### Token Refresh Requirement

Strava access tokens expire after 6 hours. The refresh token itself is long-lived but changes with every use (Strava issues a new refresh token on each refresh). This means `STRAVA_REFRESH_TOKEN` in Netlify env vars will go stale after the first deploy.

**Two options:**

1. **Manual rotation (LOW friction for low-frequency deploys):** After each deploy, update `STRAVA_REFRESH_TOKEN` in Netlify UI with the new value logged during build. Viable if deploys are infrequent (monthly).

2. **Self-updating via Netlify API (HIGH automation, HIGH setup cost):** The build script calls the Netlify API after refreshing the token to update the env var value. Requires a Netlify personal access token stored as another env var. This is complex and fragile.

**Recommendation:** Use option 1 (manual rotation) for v2.0. The leaderboard data for a pre-event site doesn't need live freshness — a human deploy triggered when standings change is appropriate. Mark this as a known maintenance task in the build script comments.

#### What `/segments/{id}` returns (HIGH confidence)

The `xoms` field includes:
- `kom`: current KOM holder's time
- `qom`: current QOM holder's time
- `overall`: overall leader
- `destination`: link to Strava leaderboard page

The `local_legend` field includes the current segment's local legend athlete. Neither returns a list of names — just times and a Strava link. For v2.0, display the KOM/QOM times and link to Strava for the full leaderboard.

#### New File: `public/data/leaderboard.json`

```json
{
  "fetched_at": "2026-03-27T12:00:00Z",
  "segments": {
    "billie-helmer": {
      "strava_id": 12345678,
      "kom_time_display": "2:14",
      "qom_time_display": "2:51",
      "strava_url": "https://www.strava.com/segments/12345678"
    }
  }
}
```

---

## Feature 3: Photos on Sector/KOM Cards

### Existing Data

`photos.json` already contains `{ filename, lat, lon, mi }` for all 33 route photos. `annotations.json` contains `{ startMi, lengthMi }` for each sector and KOM. Both are produced by the prebuild pipeline and are available to Astro components at build time via `readFileSync`.

### Recommended Pattern: Build-Time Assignment

Add a new script `scripts/assign-card-photos.js` (or extend `resolve-annotations.js`) that assigns a representative photo to each sector and KOM card.

**Algorithm:**

```
For each sector/KOM:
  filter photos.json where photo.mi >= startMi AND photo.mi <= startMi + lengthMi
  if photos in range:
    pick the one closest to midpoint (startMi + lengthMi/2)
    assign as cover photo
  else:
    assign null (card renders without photo)
```

**Output:** Enrich `annotations.json` with an optional `coverPhoto` field:

```json
{
  "name": "C4",
  "startMi": 58.7,
  "lengthMi": 5.65,
  "stars": 5,
  "coverPhoto": "bFuy7XibzBZGM0Xxx92_JYluGnZROmghJg7o_MgqHCU-1536x2048.jpg"
}
```

**Astro component change:** `GravelSectors.astro` and `KomSegments.astro` already read `annotations.json` at build time via `readFileSync`. No runtime change required — the photo reference is baked into static HTML at build time.

```astro
{sector.coverPhoto && (
  <img
    src={`/thumbnails/${sector.coverPhoto.replace(/\.(jpg|jpeg)$/, '.webp')}`}
    alt=""
    loading="lazy"
    class="sector-card-photo"
  />
)}
```

This approach requires zero new runtime fetches and adds no JavaScript complexity.

---

## Feature 4: Animation System

### Guiding Constraint

v1.0 achieved Lighthouse Performance 96 and TBT 0ms. Animation work must not regress these scores.

**Rules:**
- No blocking JS for animations
- Use CSS `transition` and `transform`/`opacity` only (GPU-accelerated)
- No animation libraries (GSAP, Framer Motion, etc.) — overkill, adds bundle weight
- Scroll-triggered entry animations use `IntersectionObserver`, not `scroll` event

### Animation Categories

#### A. Scroll Entry Animations (section fade-in)

The existing pattern already uses `IntersectionObserver` for lazy-loading components. The same observer can add a CSS class to trigger entry animations.

**Pattern:**

```css
/* global.css */
.animate-on-scroll {
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.animate-on-scroll.is-visible {
  opacity: 1;
  transform: translateY(0);
}
```

```javascript
// One shared IntersectionObserver in a <script> in BaseLayout.astro or index.astro
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target); // fire once
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
```

Apply `.animate-on-scroll` to section headings and card lists in `index.astro` or directly in component templates.

**Note on CSS scroll-driven animations:** Native CSS `animation-timeline: scroll()` and `view()` have good Chrome/Edge support (115+) but incomplete Firefox/Safari support as of early 2026. For a cycling audience on mixed devices, use IntersectionObserver + CSS transition for broader compatibility.

#### B. Hover Animations (card interactions)

Pure CSS — no JavaScript needed. Add to existing Tailwind classes:

```css
/* classified-border cards already exist — augment: */
.classified-border {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.classified-border:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px oklch(0 0 0 / 0.4);
}
```

#### C. Map/Elevation Crosshair Animation

The `crosshair.setLatLng()` call moves the marker instantly. Leaflet does not interpolate marker positions natively. For smooth tracking:
- Keep animation off — the marker should snap immediately to the hovered position. Smooth interpolation at 60fps would require `requestAnimationFrame` polling and is not worth the complexity.
- Set `circleMarker` radius/opacity to create a subtle "pulse" on appearance using CSS on the SVG element (LOW priority).

#### D. Load-in Animations (hero section)

Apply a CSS keyframe animation to the hero headline and subtext that runs once on page load, triggered by CSS `animation-delay` staggering:

```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.hero-title    { animation: fadeUp 0.6s ease forwards; }
.hero-subtitle { animation: fadeUp 0.6s ease 0.1s forwards; opacity: 0; }
.hero-cta      { animation: fadeUp 0.6s ease 0.2s forwards; opacity: 0; }
```

No JavaScript. No library. Works everywhere.

---

## New Components Required

| Component / Script | Type | Status | Notes |
|-------------------|------|--------|-------|
| `scripts/fetch-strava.js` | Build script | New | OAuth token refresh + segment data fetch |
| `scripts/assign-card-photos.js` | Build script | New (or extend resolve-annotations.js) | Photo-to-sector/KOM assignment |
| `public/data/leaderboard.json` | Data file | New | Output of fetch-strava.js; committed fallback for local dev |
| `KomSegments.astro` | Modified | Existing | Add leaderboard data rendering + cover photo |
| `GravelSectors.astro` | Modified | Existing | Add cover photo rendering |
| `ElevationProfile.astro` | Modified | Existing | Add `onHover` dispatch + `map:segmentHover` listener |
| `RouteMap.astro` | Modified | Existing | Add `elevation:hover` listener + circleMarker crosshair |
| `generate-data.js` | Modified | Existing | Wire fetch-strava.js + assign-card-photos.js into pipeline |

---

## Data Flow Changes

### Build-Time Pipeline (updated)

```
Existing:
  parse-gpx.js          → route-data.json
  resolve-annotations.js → annotations.json
  match-photos.js        → photos.json
  generate-thumbnails.js → public/thumbnails/

New additions:
  assign-card-photos.js  → annotations.json (enriched with coverPhoto fields)
                           Note: runs AFTER match-photos.js and resolve-annotations.js
  fetch-strava.js        → public/data/leaderboard.json
                           Note: graceful skip if STRAVA_ env vars not set
```

### Runtime Event Flow (new in v2.0)

```
User hovers elevation chart:
  ElevationProfile: onHover callback
    → chart.scales.x.getValueForPixel(canvasPos.x) → miValue
    → window.dispatchEvent(CustomEvent('elevation:hover', { detail: { mi: miValue } }))
      ↓
  RouteMap: addEventListener('elevation:hover')
    → find nearest routeData point to miValue
    → crosshair.setLatLng([pt.lat, pt.lon])
    → map shows crosshair dot at route position

User mouse leaves elevation chart:
  ElevationProfile: onMouseLeave on canvas element
    → window.dispatchEvent(CustomEvent('elevation:leave'))
      ↓
  RouteMap: addEventListener('elevation:leave')
    → map.removeLayer(crosshair)

User hovers sector polyline on map:
  RouteMap: sector polyline mouseover
    → window.dispatchEvent(CustomEvent('map:segmentHover', { detail: { startMi, endMi } }))
      ↓
  ElevationProfile: addEventListener('map:segmentHover')
    → update annotation box borderWidth/color for that sector
    → chart.update('none')  // instant, no animation
```

---

## Modified Component Boundaries (v2.0)

| Component | v1.0 | v2.0 Change |
|-----------|------|-------------|
| `RouteMap.astro` | Independent map | Listens to `elevation:hover`, emits `map:segmentHover`; adds circleMarker crosshair |
| `ElevationProfile.astro` | Independent chart | Emits `elevation:hover` on mousemove; listens to `map:segmentHover`; adds `onHover` callback |
| `KomSegments.astro` | Build-time HTML only | Add cover photo + leaderboard time display from `leaderboard.json` |
| `GravelSectors.astro` | Build-time HTML only | Add cover photo from enriched `annotations.json` |
| `generate-data.js` | Orchestrates 5 scripts | Add fetch-strava.js + assign-card-photos.js |

---

## Suggested Build Order for v2.0 Phases

Dependencies determine order. Data enrichment before component work.

```
1. Data fixes (annotations, photo positions)
   No new architecture — fix values in resolve-annotations.js and photo-manifest.js
   Must come first: all card and map work depends on correct data

2. Photo assignment (assign-card-photos.js)
   Depends on: corrected photos.json + annotations.json
   Unblocks: sector card and KOM card photo display

3. Map ↔ elevation interactivity
   Depends on: both components exist and load correctly (v1.0 baseline)
   No data changes required
   This is the highest complexity item — build in isolation, test both directions

4. Sector/KOM cards with photos
   Depends on: assign-card-photos.js output + GravelSectors/KomSegments modifications
   Low risk — additive change to existing static components

5. Strava leaderboard
   Depends on: Strava app registration, segment IDs confirmed, env vars configured
   Build fetch-strava.js; add to generate-data.js pipeline
   Modify KomSegments.astro to render leaderboard data
   Can ship with fallback empty JSON if Strava setup not ready

6. Animation system
   No dependencies — pure CSS/JS additions
   Final pass, lowest risk of breaking anything else

7. URL/data corrections (BikeReg URL, donation URL, description text)
   One-line edits, can happen at any point
```

---

## Anti-Patterns to Avoid for v2.0

### Anti-Pattern 7: Global Variable for Cross-Component State

**What:** Assigning `window.chartInstance` or `window.mapInstance` so components can reach each other.
**Why bad:** Order-dependent initialization (whoever sets the global first), pollutes window namespace, tight coupling that makes components non-reusable.
**Instead:** `window.dispatchEvent()` with `CustomEvent`. Components remain independent; they just share events. Order doesn't matter — listeners register when ready, events fire when ready.

### Anti-Pattern 8: Runtime Strava API Calls

**What:** Fetching Strava data from the browser at page load.
**Why bad:** Requires exposing API tokens in client-side JS (security), subject to Strava rate limits (15 min/100 req, daily 1000), adds latency on every page load, breaks if Strava is down.
**Instead:** Build-time fetch in the prebuild Node script. Result is static JSON. Zero runtime dependency on Strava.

### Anti-Pattern 9: Fetching Strava Leaderboard Endpoint

**What:** Using `GET /api/v3/segments/{id}/leaderboard` expecting a list of athletes.
**Why bad:** This endpoint was removed in June 2020. It returns 404 or 403 for all third-party apps regardless of subscription status.
**Instead:** Use `GET /api/v3/segments/{id}` (returns `xoms` with KOM/QOM times) and link to Strava for the full leaderboard.

### Anti-Pattern 10: Blocking Scroll on Animations

**What:** Using `scroll` event listener to drive animation frame-by-frame.
**Why bad:** Runs on main thread at high frequency, blocks paint, destroys TBT score.
**Instead:** `IntersectionObserver` for entry animations (fires once), pure CSS `transition` for hover effects.

### Anti-Pattern 11: Re-fetching route-data.json for Crosshair Lookup

**What:** Dispatching elevation:hover event with miValue, then having the listener fetch route-data.json to do the coordinate lookup.
**Why bad:** Async fetch inside a mousemove-equivalent callback causes lag and repeated network requests.
**Instead:** The RouteMap component loads `routeData` once during `initMap()`. The `elevation:hover` listener closes over `routeData` — the lookup is synchronous and instant.

---

## Confidence Assessment

| Area | Confidence | Source | Notes |
|------|------------|--------|-------|
| Window CustomEvent bus pattern | HIGH | Astro docs (scripts-and-event-handling), verified working pattern | Idiomatic for Astro cross-component comms |
| Chart.js `onHover` + `getValueForPixel` | HIGH | Chart.js interactions docs (chartjs.org) | Exact API verified |
| Leaflet `setLatLng()` / circleMarker | HIGH | Leaflet docs (leafletjs.com/reference.html) | Core stable API |
| Strava leaderboard endpoint removed | HIGH | Strava official changelog (2020) | Explicitly documented as unavailable |
| Strava `/segments/{id}` xoms data | HIGH | Strava community hub, developer docs | Returns KOM/QOM times |
| Netlify env vars in prebuild scripts | HIGH | Netlify docs (process.env.VARIABLE_NAME) | Standard pattern |
| Token refresh management | MEDIUM | Strava auth docs | Refresh token rotation requires manual maintenance |
| Animation browser support | HIGH | MDN, CSS-Tricks 2025 research | IntersectionObserver + CSS transition has universal support |

---

## Open Questions

1. **Strava segment IDs:** The KOM segments (Billie Helmer, Leaving Chatham, Silver Creek) need their Strava segment IDs confirmed before `fetch-strava.js` can be built. These may or may not exist as official Strava segments.

2. **Photo coverage per sector:** The assign-card-photos algorithm assumes photos exist within each sector's mile range. C4 (mile 58.7-64.35) and Down Jeep (mile 83.0-83.6) may have no photos assigned — verify against the photo manifest before finalizing the algorithm.

3. **Initialization timing edge case:** If a user loads the page and immediately hovers the elevation chart before the map has initialized, `elevation:hover` events will fire with no listener. This is benign — events are fire-and-forget; no error, no crash. The crosshair just won't appear until the map initializes. Acceptable UX.

---

## Sources

- [Astro: Scripts and event handling](https://docs.astro.build/en/guides/client-side-scripts/) — HIGH confidence — CustomEvent pattern for cross-component communication
- [Chart.js Interactions documentation](https://www.chartjs.org/docs/latest/configuration/interactions.html) — HIGH confidence — `onHover` callback, `getValueForPixel` API
- [Leaflet documentation: setLatLng, circleMarker](https://leafletjs.com/reference.html) — HIGH confidence — Core API
- [Strava segment API changes (June 2020)](https://developers.strava.com/docs/segment-changes/) — HIGH confidence — Leaderboard endpoint removal confirmation
- [Strava community hub: accessing KOM/QOM data](https://communityhub.strava.com/developers-api-7/accessing-kom-qom-data-for-segment-1999) — HIGH confidence — `xoms` field on `/segments/{id}` endpoint
- [Strava authentication documentation](https://developers.strava.com/docs/authentication/) — HIGH confidence — Token refresh flow
- [Netlify build environment variables](https://docs.netlify.com/build/configure-builds/environment-variables/) — HIGH confidence — `process.env` in prebuild scripts
- [Netlify scheduled functions for rebuilds](https://www.marclittlemore.com/automate-site-rebuilds-with-netlify-scheduled-functions/) — MEDIUM confidence — Build hook + cron pattern for automated rebuilds
- [CSS scroll animations techniques 2025](https://mroy.club/articles/scroll-animations-techniques-and-considerations-for-2025) — MEDIUM confidence — IntersectionObserver vs native CSS scroll-driven animations comparison
