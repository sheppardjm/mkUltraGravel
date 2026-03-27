# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-26)

**Core value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.
**Current focus:** Phase 9 — Mobile Polish

## Current Position

Phase: 9 of 10 (Mobile Performance Audit) — In progress
Plan: 2 of 4 complete (09-02 done)
Status: In progress — LCP hero WebP + animation audit complete; 2 plans remaining in Phase 9

Last activity: 2026-03-27 — Completed 09-02: hero image 1374KB JPEG → 194KB WebP, fetchpriority=high, all CSS animations confirmed compositor-safe

Progress: [█████░░░░░] 49.0% (25/51 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 24
- Average duration: ~2.0 min
- Total execution time: ~0.60 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-data-pipeline | 5 | ~14 min | ~2.8 min |
| 02-scaffold-design-system | 3 | ~8 min | ~2.7 min |
| 03-map-core | 4 | ~6 min | ~1.5 min |
| 04-elevation-profile | 1 | ~2 min | ~2 min |
| 05-photo-map-markers | 2 | ~9 min | ~4.5 min |
| 06-route-info-sections | 2 | ~5 min | ~2.5 min |
| 07-hero-event-info-ctas | 3 | ~6 min | ~2 min |
| 08-photo-gallery-lightbox | 3/3 | ~5 min | ~1.7 min |
| 09-mobile-performance-audit | 2/4 | ~8 min | ~4 min |

**Recent Trend:**
- Last 5 plans: 08-02 (~2 min), 08-03 (~2 min), 09-01 (~2 min), 09-02 (~6 min)
- Trend: Fast pace; Phase 9 in progress; hero LCP optimization and animation audit complete

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Paris-Roubaix sector cards and geolocated photo markers on the map are the primary differentiators — build data pipeline first
- [Roadmap]: Elevation profile integrated alongside the map (Phase 4), not a standalone section
- [Roadmap]: Use Leaflet 1.9.4 (not 2.0 alpha — ESM-only, broken API); Stadia Maps Stamen Toner or Carto Dark Matter tiles
- [01-01]: gpxparser requires @xmldom/xmldom for DOMParser shim in Node.js; install alongside gpxparser
- [01-01]: gpxparser cumul array has length equal to points.length (not N-1); prepend 0, slice last to align indexes
- [01-01]: route-data.json is canonical data source for all downstream phases (map, elevation, photos, annotations)
- [01-02]: photo-manifest.js uses explicit allowlist (33 entries) — photo pipeline relies on curation, not directory scanning
- [01-03]: annotations.json shape confirmed: { sectors[], kom[], restock[] } — downstream phases (map, route-info) must use this shape
- [01-03]: Segment track arrays include all intermediate trackpoints for polyline rendering on map
- [01-03]: Down Jeep sector (83mi) now resolves correctly after GPX extended to ~98mi; all 6 sectors have distinct coordinates
- [01-03]: findPointAtMile helper established as standard pattern for all future mile-marker lookups
- [01-04]: All 33 route photos lack EXIF GPS — confirmed manual-only (source: 'manual') in photos.json
- [01-04]: Scripts intentionally self-contained (findPointAtMile duplicated, not shared) — each script runnable independently
- [01-05]: prebuild npm lifecycle hook chosen for data generation — runs automatically before `npm run build`
- [01-05]: dev script runs data generation once then starts astro dev — data is static/pre-generated, not watch-mode
- [02-01]: @tailwindcss/vite pulls in Vite 8 as peer dep, but Astro 6 requires Vite 7 — overrides.vite=^7 in package.json is required
- [02-01]: Tailwind v4 is CSS-first — config lives in global.css @theme block, no tailwind.config.js
- [02-01]: Cascade layer order @layer leaflet, base, components, utilities declared FIRST in global.css before @import tailwindcss
- [02-01]: npm install must run via volta run (not bare npm) to install platform-specific rollup/vite binaries for Node 22
- [02-02]: Astro Fonts API (fontProviders.google()) confirmed available in Astro 6.1.1 — imported from "astro/config"
- [02-02]: oklch color space used for all tokens — perceptually uniform, natural for precise dark palette control
- [02-02]: --font-sans aliased to var(--font-mono) — intentional monospace-everything brutalist aesthetic
- [02-02]: Section anchors (hero, route, sectors, photos, info) are permanent — downstream phases fill content, never rename IDs
- [02-02]: BaseLayout.astro is the universal wrapper — all pages use it, never write their own <html>/<head>
- [02-03]: Grain overlay uses inline SVG data URI — no external image file, zero network requests
- [02-03]: Tone images at 12% opacity with grayscale + lighten blend — atmospheric, never focal
- [02-03]: Human-verified: dark brutalist psychedelic aesthetic approved as design direction
- [03-01]: Leaflet components use dynamic import only — await import('leaflet') in script block prevents SSR window errors
- [03-01]: Leaflet CSS via global.css @layer leaflet only — never in component script or style block
- [03-01]: GestureHandling addInitHook must be called before L.map() — plugin registration order matters
- [03-01]: Carto Dark Matter tiles confirmed as tile provider (no API key) — Stadia Maps signup not completed
- [03-02]: Promise.all for parallel fetch of route-data.json and annotations.json — established pattern for all map overlay work
- [03-02]: L.divIcon with inline styles only — never default L.icon in Astro/Vite builds (broken PNG paths in production)
- [03-02]: :global() required for Leaflet-managed DOM elements (divIcon) in Astro component style blocks
- [03-03]: Raw oklch() values in Leaflet popup CSS — Leaflet injects popup DOM at document root, outside Astro component where @theme vars are defined; var() refs may not resolve
- [03-03]: !important on .leaflet-control-* rules — Leaflet inlines some control styles, requiring !important for reliable override beyond cascade layer ordering
- [03-03]: Popup theming pattern: pass { className: 'dark-popup' } as second arg to bindPopup(); scope CSS as .leaflet-popup.dark-popup .leaflet-popup-content-wrapper in @layer components
- [03-03]: Mobile-verified: GestureHandling single-finger scroll-pass-through works on real device; two-finger pan works; dark popups readable
- [03-04]: L.layerGroup() for zoom-gated overlays — create group, populate, toggle with zoomend + immediate initial updateBadgeVisibility() call
- [03-04]: interactive: false on badge L.marker() — click events pass through to polyline below, preserving popup behavior
- [03-04]: iconSize: [null, null] on divIcon — auto-sizes to content; avoids fixed box clipping variable-width star strings
- [04-01]: Chart.js uses await import('chart.js/auto') — same SSR-safe pattern as Leaflet; Chart.register(plugin) MUST be called before new Chart()
- [04-01]: Responsive canvas requires wrapper div with fixed px heights and maintainAspectRatio: false — never use % or vh for wrapper height
- [04-01]: ESM guard pattern: use `if (canvas) { ... }` not `if (!canvas) return` — top-level return is forbidden in ECMAScript modules (Astro script blocks compile to ESM)
- [05-01]: markercluster accessed as (L as any).markerClusterGroup() — side-effect import attaches to window.L but TypeScript types don't merge onto L namespace
- [05-01]: addLayers() bulk add to markerClusterGroup (not addLayer() in loop) — markercluster performance best practice
- [05-01]: img width="180" fixed in popup HTML — prevents autopan/image-load race condition (Pitfall 3 from Phase 5 research)
- [05-01]: Photo copy step in generate-data.js: images/ -> public/images/ via fs.copyFileSync — runs on every prebuild/dev invocation
- [05-02]: Mobile-verified: all 7 photo marker checks passed on real device — cluster render, tap-to-zoom, popup tap, thumbnail load, full-size link, pan/zoom smooth, scroll pass-through
- [05-02]: Popup thumbnail increased from 180px to 260px after mobile feedback — width="260" with maxWidth: 300 on popup container
- [06-01]: Astro components use fs.readFileSync + process.cwd() for build-time JSON loading — no __dirname (ESM), no Vite module import from public/
- [06-01]: Star rating colors rendered via inline style= attribute with hex values — matches RouteMap.astro starColors map exactly without CSS variable indirection
- [06-02]: Phase 6 verified complete — all 13 annotation items confirmed in static HTML, all 6 visual checks passed on first inspection, no fixes required
- [07-01]: data-* attribute bridge used for CountdownTimer — define:vars forces is:inline which kills Astro bundling; data-target on container div is the correct pattern
- [07-01]: EDT offset (-04:00) for June 7 event — Marquette MI is Eastern time, EDT is UTC-4 in summer; only EVENT_DATE_ISO constant needs updating if time changes
- [07-01]: Named head slot added to BaseLayout.astro before </head> — enables Plan 03 to inject hero preload link without global mutation
- [07-03]: Hero displays "80 miles" per roadmap, not 100 from route extension — meta description also corrected to match
- [07-03]: BIKEREG_URL placeholder string used in both CTAs — intentionally non-functional pending event director confirmation
- [07-03]: Named slot preload pattern: page-level <link rel="preload" slot="head" /> injects into <head> from index.astro
- [08-01]: sharp installed via volta run npm — darwin-arm64 native binary; plain `node` (Node 20, x64) can't load it, but Volta-managed scripts always use Node 22 (arm64) so no runtime issue
- [08-01]: Original image dimensions stored in photos.json (not thumbnail dims) — PhotoSwipe requires full-size width/height for correct lightbox layout
- [08-01]: Thumbnail step is a post-step after scripts[] loop in generate-data.js — depends on both photos.json (match-photos) and public/images/ (copy step), so must run last
- [08-01]: generate-thumbnails.js exports generateThumbnails() and supports standalone invocation via require.main pattern
- [08-02]: PhotoSwipe CSS via @layer in global.css (not frontmatter import) — matches established leaflet CSS pattern, avoids SSR/build issues
- [08-02]: PhotoSwipe core as dynamic import chunk (pswpModule: () => import('photoswipe')) — loads only when lightbox opens
- [08-02]: data-* bridge for gallery items (src/w/h on each button) — consistent with [07-01], enables bundled non-inline script
- [08-02→fix]: Standard PhotoSwipe gallery/children selector pattern with <a href> + data-pswp-width/height — dataSource+loadAndOpen didn't reliably open the clicked photo
- [08-02→fix]: .pswp__img { max-width: none } in @layer components — Tailwind preflight img { max-width: 100% } in base layer collapsed lightbox images to 0px width because PhotoSwipe zoom wrapper has no explicit width
- [08-03]: Human-verified: all 11 gallery+lightbox checks passed — grid count/layout/thumbnails/speed/theme + lightbox open/nav/3-close-methods/theme
- [09-01]: --color-text-muted raised L=0.55->0.62 — worst-case pair (muted on elevated bg) needed L>=0.586; 0.62 gives 5.16:1+ on all backgrounds
- [09-01]: --color-accent-red raised L=0.45->0.50 — minimum L for 3:1 large-text threshold was 0.4756; 0.50 chosen as next round increment
- [09-01]: Hardcoded raw oklch values in Leaflet/PhotoSwipe sections must stay in sync with @theme tokens — updated all 4 (close button, attribution, attribution links, pswp icon-color-secondary)
- [09-02]: Hero WebP at 1000px/q60 = 194KB — source is 2496x3150 scanned document; quality 80 (plan default) produced 830KB; resize to 1000px required to hit under 200KB target
- [09-02]: Tone images (12% opacity background decorations) can be aggressively resized without visible quality loss — 1000px sufficient even for full-screen display
- [09-02]: convert-hero.js follows generate-thumbnails.js pattern: async + require.main guard + module export; called via execSync in generate-data.js
- [09-02]: All CSS animations in codebase and imported libraries are compositor-safe (transform, opacity) or paint-only (colors); zero layout-triggering animated properties

### Pending Todos

None yet.

### Blockers/Concerns

- **[Resolved - 01-04]** Photo EXIF GPS status confirmed: all 33 photos lack GPS data. photos.json uses manual mile-marker positions for all entries.
- **[Active]** BikeReg registration URL not confirmed — CTAs wired with PENDING placeholder. Must confirm with event director before launch. Both hero CTA and below-map CTA use BIKEREG_URL constant in index.astro frontmatter.
- **[Resolved - 03-01]** Stadia Maps free-tier signup not completed — fell back to Carto Dark Matter tiles (no API key required). Map is live.
- **[Resolved - 03-02]** Plan research had incorrect KOM field names (gradient/elevGain) — actual fields are grade/elevFt. Verified against annotations.json before coding.

## Session Continuity

Last session: 2026-03-27
Stopped at: Completed 09-02 (Hero WebP LCP optimization + animation audit)
Resume file: None
