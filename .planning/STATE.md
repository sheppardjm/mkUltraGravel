# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-26)

**Core value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.
**Current focus:** Phase 1 — Data Pipeline

## Current Position

Phase: 1 of 10 (Data Pipeline)
Plan: 3 of 5 in current phase
Status: In progress
Last activity: 2026-03-26 — Completed 01-03-PLAN.md (annotation resolver + annotations.json)

Progress: [█░░░░░░░░░] 6% (3/50 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: ~4 min
- Total execution time: 0.20 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-data-pipeline | 3 | ~12 min | ~4 min |

**Recent Trend:**
- Last 5 plans: 01-01 (~2 min), 01-02 (~5 min), 01-03 (~4 min)
- Trend: Consistent 4-min pace

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
- [01-03]: Down Jeep sector (83mi) exceeds route end (79.6mi) — clamped to last trackpoint; Phase 3 map should treat as near-end-of-route marker
- [01-03]: findPointAtMile helper established as standard pattern for all future mile-marker lookups

### Pending Todos

None yet.

### Blockers/Concerns

- **[Pre-Phase 1]** Photo EXIF GPS status unknown — 33 photos may have no GPS data; manual mile-marker assignment may be required for all of them. Inspect files in Plan 01-01 before proceeding.
- **[Pre-Phase 3]** BikeReg registration URL not confirmed — needed before Phase 7 CTAs can be wired. Confirm with event director before Phase 7.
- **[Pre-Phase 3]** Stadia Maps free-tier signup not completed — if blocked, fall back to Carto Dark Matter tiles (no API key required).

## Session Continuity

Last session: 2026-03-26T19:09:00Z
Stopped at: Completed 01-03-PLAN.md — Annotation resolver written; annotations.json generated (6 sectors, 3 KOMs, 4 restocks); ready for Plan 01-04
Resume file: None
