# Technology Stack

**Project:** MK Ultra Gravel — 80-mile gravel cycling event website
**Researched:** 2026-03-26
**Confidence:** HIGH (all core choices verified with official sources or Context7)

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Astro | 6.1.0 (current stable) | Static site framework | Zero-JS-by-default output; islands architecture means the map component gets hydrated while all other content ships as static HTML; built-in Fonts API is ideal for the custom typography this project needs; Cloudflare (new owner) acquisition has zero impact on MIT license. |

**Why Astro over alternatives:**
- **Not Next.js / Remix** — both ship a full React runtime to the client. This site has one interactive component (the map). Paying the React bundle cost for a registration CTA and a gravel sector table is indefensible.
- **Not Hugo** — Hugo is faster at build time and simpler to operate, but Leaflet integration requires raw `<script>` tags and no island model. Managing client-side JS without a component boundary is messy for this map feature.
- **Not plain HTML/JS** — Acceptable for a one-page site but Astro adds essentially no overhead while giving you component scoping, Tailwind integration, and the Fonts API for free.

**Astro 6 breaking change to note:** Requires Node 22.12.0+. Verify local and CI environments are on Node 22 before starting.

---

### Mapping

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Leaflet | 1.9.4 (stable) | Interactive map base | Most-downloaded map library (1.4M+ npm downloads/month as of early 2025); zero npm dependencies; proven static-site integration; lighter than MapLibre GL for a single GPX track use case. |
| leaflet-gpx | 2.2.0 (current) | Parse and render GPX track | Purpose-built for Leaflet GPX rendering; calculates elevation stats, distance, moving time from GPX data natively; supports custom start/end/waypoint markers; parses the project's existing `MK Ultra.gpx` file directly. |

**Why Leaflet over MapLibre GL:**
MapLibre GL uses WebGL for hardware-accelerated vector tile rendering. That capability is overkill for one static GPX polyline and a handful of photo markers. MapLibre GL adds ~250KB+ compressed vs Leaflet's ~42KB. For a single cycling route displayed at city/county zoom levels, Leaflet's raster tile rendering is indistinguishable in UX while being meaningfully simpler to integrate in an Astro island component.

**Leaflet 2.0 alpha status:** Leaflet 2.0.0-alpha.1 was released August 2025. It is ESM-only and breaks the factory method API (`L.marker()` becomes `new Marker()`). Do NOT use 2.0 alpha — leaflet-gpx 2.2.0 targets the stable 1.9.x API and has not been updated for 2.0.

---

### Map Tiles (Basemap)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Stadia Maps | Hosted service | OpenStreetMap tile provider | Free tier requires no credit card; 2,500 credits/month free; provides the Stamen Toner and Stamen Terrain styles (acquired Stamen Maps). Stamen Toner — high-contrast black-and-white — pairs perfectly with the dark brutalist aesthetic without the map competing visually with the route overlay. |

**Tile style recommendation:** `stamen_toner` or `stamen_terrain_background`. Toner is stark black-and-white, reinforcing the CIA document aesthetic. Terrain provides topographic context (gravel elevation is a feature of this event). Consider Toner as default with a JS toggle to Terrain.

**Why not CyclOSM:** CyclOSM tiles are hosted under a "fair use" policy with no SLA and no API key required, which means no rate-limit protection and no uptime guarantees. Stadia Maps' free tier has a formal SLA.

**Why not Google Maps:** Requires a billing account even for free-tier usage. License prohibits displaying non-Google content (custom track markers). Cost unpredictability on a viral spike.

---

### Styling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | 4.2.2 (current) | Utility-first CSS | v4's CSS-first configuration (no `tailwind.config.js`) and CSS custom properties align well with a design-system-heavy brutalist project where you'll define color tokens once and use them everywhere. Dark mode via `prefers-color-scheme` requires zero JavaScript. |

**Why Tailwind v4 over v3:**
- CSS-first config (`@theme` in CSS instead of a JS config file) is cleaner for a project that lives in `.astro` files
- The cascade layers feature prevents specificity conflicts with Leaflet's own CSS (a common pain point with earlier Tailwind + Leaflet setups)
- No functional reason to use v3 on a greenfield project

**Why Tailwind over plain CSS or a brutalist CSS framework:**
The "Brutalist Framework" (brutalistframework.com) is unmaintained and targets a very different aesthetic (1990s web) than this project's dark/psychedelic direction. Tailwind gives you full design control while eliminating boilerplate. The brutalist look comes from your design tokens and font choices, not from a framework opinionated about it.

---

### Typography

| Technology | Purpose | Why |
|------------|---------|-----|
| Space Mono (Google Fonts, via Astro Fonts API) | Monospace body text | Purpose-designed fixed-width typeface from Colophon Foundry for Google Design; designed for editorial use (not code), which makes it readable at body sizes while maintaining the typewriter/document aesthetic. Works at small sizes. |
| Suggest: "Special Elite" or "UnifrakturMaguntia" (Google Fonts) | Creepy/psychedelic display headings | Special Elite mimics a damaged typewriter with CIA-document energy; UnifrakturMaguntia is a gothic blackletter (psychedelic/occult register). Both are free on Google Fonts. Alternatively: source a custom font from DaFont or similar and self-host via Astro's Fonts API. |

**Astro 6 Fonts API advantage:** Astro 6 automatically downloads, caches, generates optimized fallbacks, and inserts `<link rel="preload">` for fonts configured via the new built-in Fonts API. No manual font loading optimization needed.

---

### Hosting

| Technology | Purpose | Why |
|------------|---------|-----|
| Cloudflare Pages | Static hosting | Unlimited bandwidth on free tier (no soft caps); 500 builds/month free; under 50ms globally from 300+ edge PoPs; direct Git integration; deploys Astro static output with zero configuration. |

**Why Cloudflare Pages over alternatives:**
- **Not Netlify:** Netlify reduced free build minutes to 100/month in 2025. Their CDN is measurably slower than Cloudflare's globally. Cloudflare Pages is the straightforward winner for a static site with no server-side functions needed.
- **Not GitHub Pages:** No build pipeline customization; no redirect rules; forces a `/repo-name/` URL path prefix unless you use a custom domain. Serviceable but limited.
- **Not Vercel:** Vercel's free tier is designed for Next.js/serverless. Overkill for a static site; their bandwidth limits are less generous than Cloudflare.

**Note:** Cloudflare acquired Astro's company in January 2026. Astro 6 specifically optimizes for Cloudflare Workers runtime parity in dev. This stack is now a first-party Cloudflare endorsement.

---

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@types/leaflet` | Latest | TypeScript types for Leaflet | If using TypeScript in `.astro` files (recommended) |
| `exifr` | Latest stable | Parse EXIF GPS data from photos | Use this to extract lat/lng from geotagged JPEGs and generate the photo markers JSON at build time |
| Sharp | Bundled with Astro | Image optimization | Astro uses Sharp automatically; configure in `astro.config.mjs` for WebP conversion of route photos |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | Astro 6 | Next.js 15 | Ships full React runtime for one interactive component. Bundle overhead unjustified. |
| Framework | Astro 6 | Hugo | No island model; Leaflet integration requires raw script management; no Fonts API |
| Mapping | Leaflet 1.9.4 | MapLibre GL JS | 6x larger bundle; WebGL complexity not justified for one static GPX polyline |
| Mapping | Leaflet 1.9.4 | Google Maps JS API | Requires billing account; license restricts overlays; cost unpredictable |
| Tiles | Stadia Maps | CyclOSM (self-serve) | No SLA; fair-use policy unreliable for production |
| Tiles | Stadia Maps | Thunderforest OpenCycleMap | Free tier requires API key but more restrictive; Stadia's Toner style better matches aesthetic |
| CSS | Tailwind v4 | Brutalist Framework | Unmaintained; wrong aesthetic register; limited customization |
| CSS | Tailwind v4 | Vanilla CSS | No objection technically; Tailwind v4's cascade layers make Leaflet CSS interop cleaner |
| Hosting | Cloudflare Pages | Netlify | Slower CDN; reduced free tier build minutes |
| Hosting | Cloudflare Pages | Vercel | Designed for serverless; less generous static hosting tier |

---

## Installation

```bash
# Scaffold new Astro 6 project
npm create astro@latest

# Core dependencies
npm install leaflet leaflet-gpx

# TypeScript types
npm install -D @types/leaflet

# Photo EXIF parsing (for build-time geo-coordinate extraction from images)
npm install exifr

# Tailwind CSS v4 with Astro integration
npx astro add tailwind
```

**Node requirement:** Node 22.12.0+ required by Astro 6. Verify with `node --version` before starting.

---

## Architecture Notes for Roadmap

The map component must be an Astro island (`client:load` or `client:visible` directive) because Leaflet requires `window` and the DOM. Everything else — gravel sector table, KOM segments, restock points, registration CTA — can be pure static HTML.

The photo-on-map feature has a build-time component: `exifr` reads GPS coordinates from geotagged JPEGs in `images/` during the Astro build, producing a JSON data file that the Leaflet island consumes as static props. No runtime EXIF parsing needed.

The GPX file (`MK Ultra.gpx`) lives in `public/` and is fetched by `leaflet-gpx` at runtime in the browser. This is the correct approach — GPX files can be large and benefit from the browser's native fetch/caching.

---

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| Astro 6.1.0 as current stable | HIGH | GitHub releases page (verified 2026-03-26) |
| Astro 6 Node 22 requirement | HIGH | Official Astro upgrade guide |
| Leaflet 1.9.4 as current stable | HIGH | NPM registry / official site confirmed |
| leaflet-gpx 2.2.0 as current | HIGH | NPM registry confirmed |
| Leaflet 2.0 alpha status | HIGH | Official Leaflet blog (2025-05-18 post) |
| Tailwind CSS 4.2.2 as current | HIGH | NPM registry (published 6 days before research date) |
| Cloudflare Pages free tier details | MEDIUM | Multiple sources; free tier terms can change |
| Stadia Maps free tier details | MEDIUM | Official pricing page (2025); verify at signup |
| BikeReg embed capability | MEDIUM | BikeReg feature page confirms embed exists; full embed code requires event director access |
| Font recommendations | MEDIUM | Google Fonts confirmed free; aesthetic fit is subjective |

---

## Sources

- Astro 6.0 release announcement: https://astro.build/blog/astro-6/
- Astro GitHub releases (v6.1.0 verified): https://github.com/withastro/astro/releases
- Astro upgrade guide (Node 22 requirement): https://docs.astro.build/en/guides/upgrade-to/v6/
- Leaflet.js official download page: https://leafletjs.com/download.html
- Leaflet 2.0 alpha announcement: https://leafletjs.com/2025/05/18/leaflet-2.0.0-alpha.html
- leaflet-gpx GitHub repository: https://github.com/mpetazzoni/leaflet-gpx
- Leaflet.Photo plugin (geo-photo markers): https://github.com/turban/Leaflet.Photo
- Tailwind CSS v4 release: https://tailwindcss.com/blog/tailwindcss-v4
- Tailwind CSS v4.1 release: https://tailwindcss.com/blog/tailwindcss-v4-1
- MapLibre vs Leaflet comparison: https://blog.jawg.io/maplibre-gl-vs-leaflet-choosing-the-right-tool-for-your-interactive-map/
- Mapbox vs Leaflet vs MapLibre 2026: https://www.pkgpulse.com/blog/mapbox-vs-leaflet-vs-maplibre-interactive-maps-2026
- CyclOSM: https://www.cyclosm.org/
- Stadia Maps pricing: https://stadiamaps.com/pricing
- Cloudflare Pages vs Netlify 2025: https://www.digitalapplied.com/blog/vercel-vs-netlify-vs-cloudflare-pages-comparison
- Space Mono on Google Fonts: https://fonts.google.com/specimen/Space_Mono
- BikeReg embed feature: https://www.bikereg.com/Users/Public/Director/Feature.aspx?fid=93
