# Technology Stack — v2.0 Additions

**Project:** MK Ultra Gravel — v2.0 feature additions
**Researched:** 2026-03-27
**Scope:** New capabilities only — Strava leaderboard, map-elevation interactivity, animations, image quality
**Confidence:** HIGH for library choices (verified); HIGH for Strava API constraints (verified with official docs)

---

## Executive Summary

v2.0 requires four distinct capability additions to the existing stack:

1. **Strava KOM leaderboard** — BLOCKED by Strava's November 2024 API TOS. Cannot be implemented as designed. Manual curation is the correct fallback.
2. **Map-elevation interactivity** — Achievable with zero new npm dependencies using Chart.js 4's `onHover` callback and `CustomEvent` dispatching.
3. **CSS/JS animations** — Achievable with vanilla CSS transitions for hover/click effects; Motion library for scroll-triggered inView animations if needed.
4. **Image quality improvements** — Sharp configuration change only. No new dependency.

**Net new dependencies: zero required, one optional** (`motion` for scroll animations if vanilla CSS is insufficient).

---

## Feature 1: Strava KOM/QOM Leaderboard

### Critical Finding: TOS Prohibition (HIGH confidence)

**The leaderboard feature as originally conceived cannot be built with the Strava API.**

Strava's November 2024 API Agreement update (effective November 11, 2024) introduced this restriction:

> "Unless a Developer Application is a 'Community Application,' you may only display or disclose to an end user the specific Strava Data related to that user, and may not display or disclose Strava Data related to other users, even if such data is publicly viewable on Strava's Platform."

A "Community Application" is defined as one "created with the primary purpose of permitting athletes to organize and collaborate in group activities and are no larger than 9,999 registered users."

MK Ultra Gravel is a public event website, not a group-activity app, and it displays leaderboard data to anonymous visitors — not to the authenticated athlete whose data it is. **This use case is explicitly prohibited.**

Source: Strava API Agreement at https://www.strava.com/legal/api

### Secondary Finding: Endpoint Restrictions Pre-date November 2024

The `/api/v3/segments/{id}/leaderboard` endpoint exists but has been progressively restricted since 2020. Fields including `kom_rank` require a Strava premium subscription on the authenticated athlete's account. Leaderboard filtering by age group and weight class are premium-only features.

### Strava API Technical Details (for reference if TOS path clears)

If the project ever obtains explicit Strava partnership status or the TOS interpretation changes:

**Authentication flow:**
- OAuth2 with `Authorization Code` grant (user must authorize the app)
- Access tokens expire every 6 hours
- Refresh tokens are single-use — each refresh returns a new refresh token
- Credentials needed: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN`

**Rate limits:**
- 100 requests per 15-minute window (non-upload category)
- 1,000 requests per day
- HTTP headers `X-RateLimit-Limit` / `X-RateLimit-Usage` track consumption

**Build-time fetch pattern (if TOS permitted):**
- Store credentials as Netlify environment variables (Builds scope)
- In `scripts/generate-data.js` prebuild script: POST to `https://www.strava.com/oauth/token` with `grant_type: refresh_token` to get current access token, then GET `/segments/{id}/leaderboard`
- Tokens expire after 6 hours — must refresh on every build
- This works within Netlify's build environment; no serverless function required

**Data returned per leaderboard entry:**
- `athlete_name`, `rank`, `elapsed_time`, `moving_time`, `start_date`, `start_date_local`

### Recommended Alternative: Manual Curation

Curate KOM/QOM data manually in `annotations.json`. Add fields to each KOM entry:

```json
{
  "name": "Billie Helmer",
  "kom": { "name": "J. Smith", "time": "4:12" },
  "qom": { "name": "A. Johnson", "time": "5:08" },
  "year": 2025
}
```

**Why this is better for the use case:**
- No TOS risk
- No API dependency (no 6-hour token expiry, no rate limits)
- Works on a fully static site
- Event director controls the data — can update after each event year
- No authentication complexity
- Results can be verified and curated (Strava segments occasionally have bogus KOM efforts from e-bikes, GPS drift, etc.)

The KOM cards just need a data update in `annotations.json` before each event season. This is simpler and more reliable than live API integration.

---

## Feature 2: Map-Elevation Profile Interactivity

### Goal

When a user hovers over the elevation chart, a crosshair marker appears on the map at the corresponding GPS coordinate. When a user hovers over a KOM/sector polyline on the map, the corresponding mileage range highlights on the elevation chart.

### Approach: Zero New Dependencies

Both Chart.js 4 and Leaflet 1.9 expose the primitives needed. No plugin required.

**Why not `chartjs-plugin-crosshair`:**
- Version 2.0.0 was last published August 2023 — 2+ years without updates
- The plugin addresses crosshair visualization within Chart.js, not the Chart.js → Leaflet sync
- Peer dependency is `chart.js ^4.0.1` (confirmed via package.json inspection), but the 59 open issues and staleness signal maintenance risk
- The sync we need is inter-component (chart → map), not intra-chart

**Implementation pattern — Chart.js → Map:**

Chart.js 4 provides `options.onHover` (called every frame) and `options.plugins.tooltip.external` for getting the current x-value (miles). From miles, look up the nearest point in `route-data.json` by `mi` field to get `{lat, lon}`, then move a `L.circleMarker` or `L.marker` to that position. Uses existing `route-data.json` (already fetched in both components).

```
Chart.js onHover → x value (miles) → binary search route-data → {lat, lon} → L.marker.setLatLng()
```

Cross-component communication: use a `CustomEvent` on `document` (`document.dispatchEvent(new CustomEvent('elevation-hover', { detail: { mi, lat, lon } }))`) so `ElevationProfile.astro` and `RouteMap.astro` remain decoupled. Each component subscribes to events emitted by the other.

**Implementation pattern — Map → Chart:**

Leaflet polylines expose `mouseover` / `mouseout` events. On `mouseover` of a KOM segment polyline, dispatch a custom event with `{ startMi, endMi }`. The elevation chart listens and highlights the corresponding x-range using `chartjs-plugin-annotation`'s `box` annotation (already installed — `chartjs-plugin-annotation@3.1.0` is in the existing stack).

```
L.polyline mouseover → CustomEvent('segment-hover', {startMi, endMi}) → annotation update
```

Updating an annotation at runtime: `chart.options.plugins.annotation.annotations.highlight = { ... }; chart.update('none');`

**Lazy-init coordination:** Both components currently use `IntersectionObserver` + `scroll` event for deferred init. The crosshair and segment-hover features should only activate after both components have initialized. Use a simple module-level `let mapReady = false; let chartReady = false` with a shared initialization gate, or check for the existence of the other component's root element before activating event listeners.

**No new npm packages needed.**

---

## Feature 3: CSS/JS Animations

### Scope

- Button hover/focus transitions (scale, glow, border color change)
- Photo card hover effects (scale, shadow, overlay)
- Photo load animations (fade-in on intersection)
- KOM/sector card hover feedback

### Approach: Vanilla CSS First

**All hover and click animations should be vanilla CSS.** No JavaScript, no library.

The existing Tailwind v4 setup with `@layer` already supports `transition-*` utilities. Compositor-only properties (`transform`, `opacity`) animate at 60fps without layout reflow.

```css
/* Button example — CSS only */
.btn {
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
}
.btn:hover {
  transform: scale(1.02);
  box-shadow: 0 0 0 2px oklch(0.65 0.2 90);
}
```

**Photo load fade-in:** CSS only via `@keyframes` + `animation-fill-mode: backwards`. Set `animation-play-state: paused` initially, then an `IntersectionObserver` adds an `is-visible` class that sets `animation-play-state: running`. No library.

### When Motion Library Is Needed

The `motion` npm package (formerly Framer Motion, rebranded 2025 when it became independent) provides the `inView` function for scroll-triggered entrance animations with more control than raw IntersectionObserver.

| Library | Version | Bundle impact | Use when |
|---------|---------|---------------|----------|
| `motion` | 12.x (latest) | ~4–34KB depending on imports; tree-shakeable | Staggered card entrance animations that need spring physics, or if vanilla CSS `@keyframes` + IntersectionObserver requires too much boilerplate |

**Verdict:** Start with vanilla CSS. Only add `motion` if the scroll-triggered card animations feel janky or require coordinated sequencing that CSS cannot express (e.g., staggered KOM card cascade on scroll).

If added, use the vanilla JS API (not React): `import { animate, inView, stagger } from 'motion'` in a `<script>` tag. Works identically to the existing `<script>` pattern in `RouteMap.astro` and `ElevationProfile.astro`.

**Do not use `framer-motion` (old package name).** The package moved to `motion` on npm in early 2025; the import path is `motion/react` for React, or just `motion` for vanilla JS.

---

## Feature 4: Image Quality Improvements

### Current State

`generate-thumbnails.js` produces 200px-wide WebP at quality 75. Comment in the file says "Gallery displays at ~186px on mobile and ~250px on desktop."

### Recommended Changes

**Thumbnail width:** Increase from 200px to 400px.

At 400px, a 2x retina display renders a thumbnail at exactly 200px CSS pixels — meaning the gallery grid will look sharp on all modern screens including mobile retina. At 200px, retina screens show upscaled thumbnails. The file size increase from 200px→400px at the same quality is approximately 2-4x (area scales as square of linear dimension), offset by the fact that 400px images will still compress very aggressively.

**Quality:** Increase from 75 to 80.

Sharp's default WebP quality is 80. Going from 75 to 80 is a modest quality bump. Sharp docs confirm `quality` accepts 1-100 (integer). No change to `effort` (keep at 4 — CPU/quality tradeoff is fine for build time).

**Fit mode for sector/KOM card photos:** If photos are added to sector or KOM cards at a fixed aspect ratio (e.g., 16:9 card header), use `fit: 'cover'` with `position: 'centre'` to crop to the card shape rather than letterboxing. The existing `generate-thumbnails.js` uses the default resize behavior (equivalent to `fit: 'inside'`), which is correct for gallery previews but wrong for fixed-aspect-ratio card images.

**Change needed in `generate-thumbnails.js`:**

```js
// Before
await sharp(srcPath)
  .resize(200, null, { withoutEnlargement: true })
  .webp({ quality: 75, effort: 4 })
  .toFile(thumbPath);

// After (larger thumbnails, better quality)
await sharp(srcPath)
  .resize(400, null, { withoutEnlargement: true })
  .webp({ quality: 80, effort: 4 })
  .toFile(thumbPath);
```

**Card photo generation (new, for sector/KOM cards):**

A separate output target for card header images at a fixed aspect ratio:

```js
await sharp(srcPath)
  .resize(600, 338, { fit: 'cover', position: 'centre', withoutEnlargement: true })
  .webp({ quality: 82, effort: 4 })
  .toFile(cardPath);
```

600×338 = 16:9 ratio. Renders at 300px CSS width on retina, suitable for a card header.

**Idempotency:** Current script checks `fs.existsSync(thumbPath)` before generating. After increasing size from 200px to 400px, existing thumbs will be the wrong size. Either: (a) delete `public/images/thumbs/` to force regeneration, or (b) add a version hash to the output filename. Option (a) is simpler.

**No new npm dependencies.** Sharp 0.34.5 is already in `devDependencies`.

---

## Feature 5: Photos on Sector/KOM Cards

### Approach

Source photos from the existing `photos.json` data. Each KOM segment has `lat`/`lon`/`endLat`/`endLon` in `annotations.json`. Each photo has `lat`/`lon` in `photos.json`. At build time, find the nearest photo within N meters of each KOM/sector midpoint and record it in the generated data.

This is a build-time enrichment in `generate-data.js` (or a new `match-segment-photos.js` similar to the existing `match-photos.js`). The distance calculation is a simple Haversine formula. No new npm dependency needed — pure Node.js arithmetic.

Output: add `photo` field to each KOM/sector entry in `annotations.json`:

```json
{
  "name": "Billie Helmer",
  "photo": "thumbs/aKU4CEExEgpuAWOcY-QHCbAkYtA7dLV4QjlgSUx966w.webp"
}
```

`GravelSectors.astro` and `KomSegments.astro` read `annotations.json` at build time (they already do this via `readFileSync`), so consuming the new `photo` field is a template change only.

---

## Full v2.0 Dependency Delta

| Package | Action | Version | Reason |
|---------|--------|---------|--------|
| `chartjs-plugin-crosshair` | DO NOT ADD | — | Stale (2023); not needed; custom event pattern is cleaner |
| `motion` | Optional add | ^12.x | Only if vanilla CSS scroll animations feel insufficient |
| `strava-api-v3` (any client) | DO NOT ADD | — | Strava TOS prohibits the use case |
| All other libraries | No change | — | Existing stack is sufficient |

**Net new mandatory dependencies: zero.**

---

## Integration Points with Existing Stack

| Existing Component | v2.0 Change | Integration Note |
|---------------------|-------------|-----------------|
| `ElevationProfile.astro` | Add `onHover` callback, dispatch/receive `CustomEvent` | Chart.js 4 `options.onHover` is already supported; annotation plugin already registered |
| `RouteMap.astro` | Add `L.circleMarker` for crosshair, add polyline `mouseover` handlers | Leaflet 1.9.4 native event API; no new plugins |
| `KomSegments.astro` | Add `photo` field rendering | Reads `annotations.json` at build time already |
| `GravelSectors.astro` | Add `photo` field rendering | Same pattern as KomSegments |
| `generate-thumbnails.js` | Increase width 200→400, quality 75→80; add card photo target | Sharp API: no breaking change |
| `generate-data.js` | Add segment photo matching | New post-step, same pattern as `match-photos.js` |
| `annotations.json` | Add `photo`, `kom`, `qom` fields | Schema extension; backward compatible |

---

## What NOT to Add

| Library | Reason to avoid |
|---------|----------------|
| `chartjs-plugin-crosshair` | Last published 2023; 59 open GitHub issues; the sync behavior we need is cross-component (chart→map), not intra-chart; the custom event pattern achieves the same result with zero dependencies |
| Any Strava API client | TOS prohibits displaying other athletes' data to non-authenticated public visitors. Manual curation in `annotations.json` is the correct approach. |
| React/Vue/Svelte | No new reactive component needed; all interactivity is event-driven DOM manipulation in vanilla JS `<script>` blocks, consistent with existing patterns in `RouteMap.astro` and `ElevationProfile.astro` |
| `framer-motion` | Renamed to `motion` — use correct package name if animation library is added |
| Any map tile provider change | CARTO Dark Matter tiles already in use without API key; switching providers provides no benefit and adds API key management |

---

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| Strava TOS prohibition | HIGH | `https://www.strava.com/legal/api` — verified exact text of "Community Application" definition and data display restriction |
| Strava API OAuth flow | HIGH | `https://developers.strava.com/docs/authentication/` — official docs |
| Strava rate limits | HIGH | `https://developers.strava.com/docs/rate-limits/` — official docs |
| Chart.js `onHover` API | HIGH | Existing codebase uses Chart.js 4 `options`; the API is documented in Chart.js 4 official docs |
| Leaflet polyline `mouseover` | HIGH | Leaflet 1.9.4 is in production; event API unchanged since 1.x |
| `chartjs-plugin-annotation` runtime update | MEDIUM | Verified annotation plugin is v3.1.0 in package.json; runtime update pattern is standard Chart.js plugin pattern |
| Sharp resize options | HIGH | `https://sharp.pixelplumbing.com/api-output/` and `https://sharp.pixelplumbing.com/api-resize/` — official docs |
| `motion` package rename | MEDIUM | Multiple sources including npm page; official docs at motion.dev confirm `framer-motion` → `motion` |
| `chartjs-plugin-crosshair` staleness | HIGH | GitHub repository: last release v2.0.0 August 2023, 59 open issues confirmed |

---

## Sources

- Strava API Agreement (November 2024): https://www.strava.com/legal/api
- Strava Segment Changes (2020 subscriber restriction): https://developers.strava.com/docs/segment-changes/
- Strava Authentication docs: https://developers.strava.com/docs/authentication/
- Strava Rate Limits: https://developers.strava.com/docs/rate-limits/
- Strava November 2024 API changes announcement: https://press.strava.com/articles/updates-to-stravas-api-agreement
- chartjs-plugin-crosshair GitHub: https://github.com/AbelHeinsbroek/chartjs-plugin-crosshair
- Motion (animation library) official docs: https://motion.dev/docs
- Motion with Astro guide: https://developers.netlify.com/guides/motion-animation-library-with-astro/
- Sharp WebP output options: https://sharp.pixelplumbing.com/api-output/
- Sharp resize API: https://sharp.pixelplumbing.com/api-resize/
- Netlify environment variables: https://docs.netlify.com/build/configure-builds/environment-variables/
