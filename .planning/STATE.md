# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-26)

**Core value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.
**Current focus:** Phase 2 — Scaffold + Design System

## Current Position

Phase: 2 of 10 (Scaffold + Design System) — In progress
Plan: 2 of 5 in current phase (02-02 complete)
Status: Phase 2 in progress — design token system and page scaffold complete

Last activity: 2026-03-26 — Completed 02-02-PLAN.md (design tokens, Astro Fonts API, BaseLayout, 5-section index)

Progress: [██░░░░░░░░] 14% (7/50 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: ~2.8 min
- Total execution time: ~0.28 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-data-pipeline | 5 | ~14 min | ~2.8 min |
| 02-scaffold-design-system | 2 | ~5 min | ~2.5 min |

**Recent Trend:**
- Last 5 plans: 01-04 (~1 min), 01-05 (~1 min), 02-01 (~4 min), 02-02 (~1 min)
- Trend: Stable; font/token work faster than expected (Fonts API confirmed in Astro 6.1.1)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Paris-Roubaix sector cards and geolocated photo markers on the map are the primary differentiators — build data pipeline first
- [Roadmap]: Elevation profile integrated alongside the map (Phase 4), not a standalone section
- [Roadmap]: Photo EXIF status is unknown — Phase 1 must inspect all 33 photos before building the matcher; plan for full manual fallback
- [Roadmap]: Use Leaflet 1.9.4 (not 2.0 alpha — ESM-only, broken API); Stadia Maps Stamen Toner or Carto Dark Matter tiles
- [01-01]: gpxparser requires @xmldom/xmldom for DOMParser shim in Node.js; install alongside gpxparser
- [01-01]: gpxparser cumul array has length equal to points.length (not N-1); prepend 0, slice last to align indexes
- [01-01]: route-data.json is canonical data source for all downstream phases (map, elevation, photos, annotations)
- [01-02]: photo-manifest.js uses explicit allowlist (33 entries) — photo pipeline relies on curation, not directory scanning; match-photos.js must consume this manifest
- [01-02]: Mile markers estimated from terrain/landmark cues; not from EXIF GPS (GPS status still unknown — Plan 01-03 will inspect)
- [01-03]: annotations.json shape confirmed: { sectors[], kom[], restock[] } — downstream phases (map, route-info) must use this shape
- [01-03]: Segment track arrays include all intermediate trackpoints for polyline rendering on map
- [01-03]: Down Jeep sector (83mi) now resolves correctly after GPX extended to ~98mi; all 6 sectors have distinct coordinates
- [01-03]: findPointAtMile helper established as standard pattern for all future mile-marker lookups
- [01-04]: All 33 route photos lack EXIF GPS — confirmed manual-only (source: 'manual') in photos.json; EXIF attempt preserved as forward-compatible pattern
- [01-04]: Scripts intentionally self-contained (findPointAtMile duplicated, not shared) — each script runnable independently without import side effects
- [01-05]: prebuild npm lifecycle hook chosen for data generation — runs automatically before `npm run build`, no CI/CD config changes needed
- [01-05]: dev script runs data generation once then starts astro dev — data is static/pre-generated, not watch-mode
- [01-05]: build script references astro build even though Astro not yet installed — correct eventual command validated independently
- [02-01]: @tailwindcss/vite pulls in Vite 8 as peer dep, but Astro 6 requires Vite 7 — overrides.vite=^7 in package.json is required
- [02-01]: Tailwind v4 is CSS-first — config lives in global.css @theme block, no tailwind.config.js
- [02-01]: Cascade layer order @layer leaflet, base, components, utilities declared FIRST in global.css before @import tailwindcss
- [02-01]: npm install must run via volta run (not bare npm) to install platform-specific rollup/vite binaries for Node 22
- [02-02]: Astro Fonts API (fontProviders.google()) confirmed available in Astro 6.1.1 — imported from "astro/config"
- [02-02]: oklch color space used for all tokens — perceptually uniform, natural for precise dark palette control
- [02-02]: --font-sans aliased to var(--font-mono) — intentional monospace-everything brutalist aesthetic
- [02-02]: Section anchors (hero, route, sectors, photos, info) are permanent — downstream phases fill content, never rename IDs
- [02-02]: BaseLayout.astro is the universal wrapper — all pages use it, never write their own <html>/<head>

### Pending Todos

None yet.

### Blockers/Concerns

- **[Resolved - 01-04]** Photo EXIF GPS status confirmed: all 33 photos lack GPS data. photos.json uses manual mile-marker positions for all entries.
- **[Pre-Phase 3]** BikeReg registration URL not confirmed — needed before Phase 7 CTAs can be wired. Confirm with event director before Phase 7.
- **[Pre-Phase 3]** Stadia Maps free-tier signup not completed — if blocked, fall back to Carto Dark Matter tiles (no API key required).

## Session Continuity

Last session: 2026-03-26T23:43:40Z
Stopped at: Completed 02-02-PLAN.md — design token system, Astro Fonts API, BaseLayout, and 5-section index complete. Ready for 02-03.
Resume file: None
