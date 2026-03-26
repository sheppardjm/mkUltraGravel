# Architecture Patterns

**Domain:** Static gravel cycling event website
**Project:** MK Ultra Gravel
**Researched:** 2026-03-26
**Confidence:** HIGH (core map/data patterns), MEDIUM (photo geo-matching approach)

---

## Recommended Architecture

A single-page static site built with Astro. All content is authored at build time — no runtime backend, no API calls to private services. The page renders as plain HTML/CSS/JS. Interactive components (map, gallery, lightbox) are vanilla JS islands loaded client-side after initial paint.

The data layer is the critical design decision: all structured data (route track, photo positions, sector/KOM/restock annotations) must be compiled into a single `route-data.json` at build time. The map and annotation components read from that file. Nothing is computed at runtime that could have been computed at build time.

```
Build Pipeline
──────────────
Source Assets                  Build-Time Processing           Deployed Output
─────────────                  ─────────────────────           ───────────────
MK Ultra.gpx           ──▶    GPX parser (Node script)  ──▶  route-data.json
images/*.jpg (33)      ──▶    Photo geo-matcher          ──▶  photos.json
data.md (sectors/KOM)  ──▶    Data author (manual JSON)  ──▶  annotations.json
                                                          ──▶  index.html
                                                          ──▶  /public/MK Ultra.gpx (raw download)

Runtime (Browser)
─────────────────
index.html  ──▶  Leaflet.js map initializes
            ──▶  Fetches route-data.json → renders GPX polyline
            ──▶  Fetches photos.json → places photo markers
            ──▶  Fetches annotations.json → renders sector/KOM/restock markers
            ──▶  Photo gallery reads photos.json → lightbox grid
```

---

## Component Boundaries

| Component | Responsibility | Input | Output | Communicates With |
|-----------|---------------|-------|--------|-------------------|
| **Build: GPX Parser** | Parses GPX XML into track points array, computes cumulative mileage per point | `MK Ultra.gpx` | `route-data.json` (track points with lat/lon/ele/mi) | — (build only) |
| **Build: Photo Geo-Matcher** | Assigns lat/lon to each photo by matching estimated mile markers against route-data.json track | `images/*.jpg`, `route-data.json` | `photos.json` (photo list with lat/lon/filename) | Reads route-data.json |
| **Build: Annotations** | Static JSON authored by hand from data.md | `data.md` | `annotations.json` (sectors, KOMs, restocks with mile markers → lat/lon resolved via route-data.json) | Reads route-data.json |
| **Map Component** | Interactive Leaflet map with GPX polyline, photo markers, sector/KOM/restock markers | `route-data.json`, `photos.json`, `annotations.json` | Visual map, click popups | Gallery (photo click opens lightbox), GPX Download |
| **Route Info Panels** | Static HTML sections: sector listings, KOM listings, restock listings | `annotations.json` (or inlined at build) | Rendered HTML sections | Map (optional: clicking panel item pans map) |
| **Photo Gallery** | Grid of route photos, opens lightbox on click | `photos.json` | Lightbox view | Lightbox Component |
| **Lightbox Component** | Fullscreen photo overlay with prev/next navigation | Triggered by gallery | Fullscreen photo display | Gallery |
| **GPX Download** | Anchor tag linking to raw GPX file | Static `href` | File download | — |
| **Registration CTA** | Styled button linking to BikeReg URL | Static `href` | External navigation to BikeReg | — |
| **Hero / Event Info** | Static content: date, start, distance, cost, charity | Authored HTML | Rendered section | Registration CTA |
| **Design System** | CSS custom properties, typography (monospace body + display font), dark palette | `.css` files | Applied globally | All components |

---

## Data Flow

### Build-Time Flow (runs once during `astro build`)

```
1. GPX Parse
   MK Ultra.gpx
     → XML parse (DOMParser or fast-xml-parser in Node)
     → Extract <trkpt> elements: lat, lon, ele, time
     → Compute cumulative distance (Haversine between consecutive points)
     → Output: Array of { lat, lon, ele, mi } objects
     → Write: public/data/route-data.json

2. Annotation Resolution
   data.md mile markers (sectors, KOMs, restocks)
     → For each annotation mile marker, find nearest track point in route-data.json
     → Assign lat/lon from that track point
     → Output: { sectors: [...], koms: [...], restocks: [...] }
     → Write: public/data/annotations.json

3. Photo Geo-Matching
   33 photos in images/
     → Check EXIF GPS data first (exifr.js in Node build script)
     → For photos WITHOUT EXIF: estimate position from mile marker
       (photos were taken during the route — if photographer notes exist, use them;
        otherwise distribute evenly or manually assign approximate mile positions)
     → Output: Array of { filename, lat, lon, mi, hasExif: bool }
     → Write: public/data/photos.json

4. Astro Build
   → Reads all .json data files
   → Renders Astro components to static HTML
   → Outputs dist/ with index.html, data/*.json, images/*, public/MK Ultra.gpx
```

### Runtime Flow (browser)

```
User loads index.html
  → CSS loads (dark brutalist design system)
  → HTML renders (hero, static sections, map container div, gallery placeholder)
  → Leaflet JS initializes map in #map div
  → fetch('/data/route-data.json') → draw GPX polyline on map
  → fetch('/data/photos.json') → place photo markers on map
  → fetch('/data/annotations.json') → place sector/KOM/restock markers with custom icons
  → Gallery grid populates from photos.json
  → Lightbox initialized (FSLightbox or equivalent, event-bound to gallery items)
  → Registration CTA: static link → bikereg.com/[event-url] (no embed needed)
  → GPX Download: static <a href="/MK Ultra.gpx" download> (no JS needed)
```

---

## Suggested Build Order

Dependencies determine order. Build from data outward.

### Phase 1: Data Foundation (everything depends on this)

Build the GPX parser and produce `route-data.json` first. Nothing else works without it.

```
Priority 1A — GPX Parser
  Input: MK Ultra.gpx
  Output: route-data.json with { lat, lon, ele, mi } per track point
  Why first: All other data components depend on matching mile markers to lat/lon

Priority 1B — Annotation Resolver
  Input: data.md + route-data.json
  Output: annotations.json
  Depends on: 1A (route-data.json)

Priority 1C — Photo Geo-Matcher
  Input: images/ + route-data.json
  Output: photos.json
  Depends on: 1A (route-data.json)
  Note: EXIF extraction attempted first; manual mile assignment for remainder
```

### Phase 2: Project Scaffold + Design System

Set up Astro project, global CSS, typography, color system. All UI components depend on this.

```
Priority 2A — Astro project init + directory structure
Priority 2B — Global CSS: dark palette, monospace body, display font, CSS custom properties
Priority 2C — Base layout component (wraps all pages)
```

### Phase 3: Map Component (core feature, most complex)

```
Priority 3A — Leaflet integration + GPX polyline
  Reads: route-data.json
  Renders: Interactive map with route drawn

Priority 3B — Photo markers on map
  Reads: photos.json
  Renders: Clickable photo thumbnails at geo positions

Priority 3C — Annotation markers (sectors, KOMs, restocks)
  Reads: annotations.json
  Renders: Custom-styled markers with popup info
```

### Phase 4: Route Info Sections

```
Priority 4A — Gravel Sector listings (Paris-Roubaix star ratings)
Priority 4B — KOM segment listings (grade, gain, mi marker)
Priority 4C — Restock point listings (name, mi marker)
```

These can be Astro components that read annotations.json at build time — rendered to static HTML.

### Phase 5: Gallery + Lightbox

```
Priority 5A — Photo gallery grid
  Reads: photos.json
  Renders: CSS grid of thumbnails

Priority 5B — Lightbox
  Triggered by: gallery item click
  Renders: Fullscreen overlay, prev/next navigation
```

### Phase 6: Static Sections + CTAs

```
Priority 6A — Hero section (event title, date, start location)
Priority 6B — Event info (cost, charity, format)
Priority 6C — Registration CTA (styled button → BikeReg link)
Priority 6D — GPX download link
```

### Phase 7: Polish + Deploy

```
Priority 7A — Responsive design (mobile map behavior)
Priority 7B — Image optimization (Astro's built-in image pipeline)
Priority 7C — Deployment config (Netlify/Vercel/GitHub Pages)
```

---

## Key Technical Decisions

### Map Library: Leaflet.js 1.9.x (not MapLibre)

**Verdict:** Leaflet. Confirmed by multiple sources including a 2026 Astro+GPX reference project.

Rationale:
- MapLibre requires WebGL — heavier, overkill for raster tile + GPX polyline use case
- Leaflet has a mature plugin ecosystem: `leaflet-gpx` for track parsing, `Leaflet.Photo` or custom `L.Marker` for photo markers
- Smaller payload, simpler initialization for static sites
- Raster tile providers work natively (OpenStreetMap tiles are free, Carto Dark Matter tiles match the dark brutalist aesthetic perfectly)

**Tile source:** Carto Dark Matter (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`) — free, dark, no API key required.

### GPX Handling: Build-Time Parse → JSON

Do NOT ship the raw GPX file to Leaflet and parse it client-side. Parse it at build time into a clean JSON array. This:
- Eliminates Leaflet-gpx plugin dependency (simpler)
- Allows annotation mile-marker matching at build time
- Reduces browser work
- Keeps the raw `.gpx` separately available as a download

The raw `MK Ultra.gpx` is served separately at `/MK Ultra.gpx` for the download CTA.

### Photo Geo-Location: EXIF-first, Mile-Marker Fallback

The 33 photos likely do NOT have EXIF GPS data (they appear to be Google Photos exports based on filename patterns). The build script should:

1. Attempt EXIF extraction with `exifr` (Node.js)
2. For any photo without EXIF GPS: assign approximate lat/lon by distributing photos along the route at estimated mile positions
3. Manual review step recommended: a JSON file that can override auto-assigned positions

This is a MEDIUM-confidence area — the photos need inspection to confirm EXIF status.

### Registration CTA: External Link Only

BikeReg does not expose a public embed widget or iframe for static sites. BikeReg is an authenticated platform (redirects to outside.com OAuth). The CTA is a styled anchor tag pointing to the event's BikeReg URL. No embed, no JS — just a link.

### Single Page Architecture

This is a single `index.html` with scroll sections, not a multi-page site. Rationale:
- Event sites work as single scroll experiences
- No routing complexity
- Sections: Hero → Map → Route Info → Sectors → KOMs → Restocks → Gallery → Registration
- Astro renders it as one page with component-based authoring

### Astro as Build Framework

Astro handles:
- Component-based HTML authoring with no runtime JS overhead
- Build-time data fetching (reading JSON files in frontmatter)
- Asset optimization (image resizing/WebP conversion for 50+ images)
- `is:inline` script handling for CDN-loaded Leaflet (avoids module hoisting timing issues)
- Clean output of static HTML + assets

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-Side GPX Parsing

**What:** Shipping the GPX XML to the browser and parsing it with leaflet-gpx at runtime.
**Why bad:** Adds 171KB of XML to initial payload, delays map render, requires more JS in browser, complicates photo geo-matching.
**Instead:** Parse GPX at build time. Ship JSON. Serve raw GPX separately for download.

### Anti-Pattern 2: EXIF Reading in the Browser

**What:** Using exifr.js in the browser to read photo coordinates at runtime.
**Why bad:** Requires loading all 33 full-resolution images just to read metadata, slow, unnecessary.
**Instead:** Run exifr in the build script (Node.js), write lat/lon to photos.json once.

### Anti-Pattern 3: Embedding BikeReg with an iframe

**What:** Attempting to embed the BikeReg registration form via iframe or widget.
**Why bad:** BikeReg redirects to OAuth immediately; iframes would show a login screen, not a registration form.
**Instead:** External link with styled CTA button. Prominent, above the fold.

### Anti-Pattern 4: Per-Section JSON Fetches

**What:** Map fetches one JSON, gallery fetches another, route info fetches another, all separately.
**Why bad:** Multiple round trips; if JSON files are small (which they are), combine or inline at build time.
**Instead:** Either combine into a single `site-data.json`, or better — Astro inlines the data directly into the HTML at build time via frontmatter, eliminating fetch calls entirely for non-map components.

### Anti-Pattern 5: Heavy Framework for a Static Page

**What:** Using React/Vue to render the page, bringing a runtime framework for a static event site.
**Why bad:** Adds 30-100KB of JS, complicates deployment, overkill for content that doesn't change.
**Instead:** Astro with zero-JS components for static sections. Leaflet is the only runtime JS needed.

### Anti-Pattern 6: Leaflet Inside a React Component

**What:** Initializing Leaflet inside a React component lifecycle.
**Why bad:** Leaflet manages its own DOM; React's virtual DOM interferes. Known source of map rendering bugs.
**Instead:** Plain `<script is:inline>` in Astro that initializes Leaflet directly on the map container div.

---

## Scalability Considerations

This is a fixed-content event site. Scalability is not a concern post-launch. The relevant consideration is build performance:

| Concern | Approach |
|---------|----------|
| 50+ high-res images | Astro image optimization pipeline converts to WebP, generates responsive sizes |
| 33 photo markers on map | Leaflet handles this trivially — not a performance concern |
| GPX track density | The 171KB GPX has ~thousands of track points — LTTB downsampling recommended for map display (50% reduction) while keeping full precision for mileage calculations |
| First load performance | Defer Leaflet initialization until map div is in viewport (IntersectionObserver) |

---

## Directory Structure (Recommended)

```
mkUltraGravel/
├── .planning/
├── images/                     (source images — not shipped directly)
│   └── tone/
├── MK Ultra.gpx                (source GPX — copied to public/)
├── scripts/
│   ├── parse-gpx.js            (build: GPX → route-data.json)
│   ├── match-photos.js         (build: photos + route → photos.json)
│   └── resolve-annotations.js (build: data.md + route → annotations.json)
├── src/
│   ├── layouts/
│   │   └── Base.astro
│   ├── components/
│   │   ├── Map.astro            (Leaflet map container + inline init script)
│   │   ├── SectorList.astro
│   │   ├── KomList.astro
│   │   ├── RestockList.astro
│   │   ├── Gallery.astro
│   │   ├── Hero.astro
│   │   └── RegistrationCTA.astro
│   ├── pages/
│   │   └── index.astro          (single page, assembles all components)
│   └── styles/
│       ├── global.css           (CSS custom properties, dark palette)
│       └── map.css
├── public/
│   ├── data/
│   │   ├── route-data.json     (built by parse-gpx.js)
│   │   ├── photos.json         (built by match-photos.js)
│   │   └── annotations.json    (built by resolve-annotations.js)
│   ├── images/                 (optimized images, output by Astro)
│   └── MK Ultra.gpx            (raw GPX for download)
└── astro.config.mjs
```

---

## Sources

- [Ben Strawbridge — Astro + Leaflet + GPX static site (2026)](https://www.benstrawbridge.com/projects/road-trip/) — HIGH confidence reference implementation
- [leaflet-gpx plugin (mpetazzoni)](https://github.com/mpetazzoni/leaflet-gpx) — MEDIUM confidence (requires Leaflet 2.0+ ESM; build-time parse preferred over using this plugin)
- [Leaflet.Photo plugin (turban)](https://github.com/turban/Leaflet.Photo/) — MEDIUM confidence (pattern for photo markers; custom L.Marker approach is simpler)
- [Leaflet.js documentation](https://leafletjs.com/reference.html) — HIGH confidence
- [MapLibre vs Leaflet vs Mapbox comparison 2026](https://www.pkgpulse.com/blog/mapbox-vs-leaflet-vs-maplibre-interactive-maps-2026) — MEDIUM confidence
- [exifr.js — EXIF GPS extraction](https://github.com/MikeKovarik/exifr) — HIGH confidence for build-time EXIF reading
- [Leaflet.Elevation plugin (Raruto)](https://github.com/Raruto/leaflet-elevation) — MEDIUM confidence (optional for elevation profile panel)
- [Astro project structure docs](https://docs.astro.build/en/basics/project-structure/) — HIGH confidence
- [Gravel Worlds routes page](https://www.gravelworlds.com/routes) — reference for sector/aid station presentation patterns
- [GRVL Cycling event site (Raid Rockingham)](https://www.grvl.net/raid-rockingham) — reference for gravel event site section structure
- [FSLightbox — vanilla JS lightbox](https://fslightbox.com/) — MEDIUM confidence for gallery lightbox
