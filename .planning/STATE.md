# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-26)

**Core value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.
**Current focus:** Phase 5 — Photo Map Markers

## Current Position

Phase: 5 of 10 (Photo Map Markers) — In progress
Plan: 1 of 1 complete (05-01 done)
Status: Phase 5 plan 1 complete; pending human visual verification of map markers

Last activity: 2026-03-26 — Completed 05-01 (leaflet.markercluster photo markers on map)

Progress: [████░░░░░░] 27.5% (14/51 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 13
- Average duration: ~2.3 min
- Total execution time: ~0.50 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-data-pipeline | 5 | ~14 min | ~2.8 min |
| 02-scaffold-design-system | 3 | ~8 min | ~2.7 min |
| 03-map-core | 4 | ~6 min | ~1.5 min |
| 04-elevation-profile | 1 | ~2 min | ~2 min |

**Recent Trend:**
- Last 5 plans: 03-03 (~2 min), 03-04 (~1 min), 04-01 (~2 min), 05-01 (~4 min)
- Trend: Stable pace; markercluster photo markers complete; photo copy step established in pipeline

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

### Pending Todos

None yet.

### Blockers/Concerns

- **[Resolved - 01-04]** Photo EXIF GPS status confirmed: all 33 photos lack GPS data. photos.json uses manual mile-marker positions for all entries.
- **[Pre-Phase 3]** BikeReg registration URL not confirmed — needed before Phase 7 CTAs can be wired. Confirm with event director before Phase 7.
- **[Resolved - 03-01]** Stadia Maps free-tier signup not completed — fell back to Carto Dark Matter tiles (no API key required). Map is live.
- **[Resolved - 03-02]** Plan research had incorrect KOM field names (gradient/elevGain) — actual fields are grade/elevFt. Verified against annotations.json before coding.

## Session Continuity

Last session: 2026-03-26
Stopped at: Completed 05-01 (photo map markers) — build clean, pending dev server visual verification
Resume file: None
