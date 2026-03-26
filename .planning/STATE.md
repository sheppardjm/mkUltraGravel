# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-26)

**Core value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.
**Current focus:** Phase 1 — Data Pipeline

## Current Position

Phase: 1 of 10 (Data Pipeline)
Plan: 2 of 5 in current phase
Status: In progress
Last activity: 2026-03-26 — Completed 01-02-PLAN.md (photo manifest curation)

Progress: [█░░░░░░░░░] 4% (2/50 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: ~4 min
- Total execution time: 0.12 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-data-pipeline | 2 | ~7 min | ~4 min |

**Recent Trend:**
- Last 5 plans: 01-01 (~2 min), 01-02 (~5 min)
- Trend: Establishing baseline

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

### Pending Todos

None yet.

### Blockers/Concerns

- **[Pre-Phase 1]** Photo EXIF GPS status unknown — 33 photos may have no GPS data; manual mile-marker assignment may be required for all of them. Inspect files in Plan 01-01 before proceeding.
- **[Pre-Phase 3]** BikeReg registration URL not confirmed — needed before Phase 7 CTAs can be wired. Confirm with event director before Phase 7.
- **[Pre-Phase 3]** Stadia Maps free-tier signup not completed — if blocked, fall back to Carto Dark Matter tiles (no API key required).

## Session Continuity

Last session: 2026-03-26T18:00:00Z
Stopped at: Completed 01-02-PLAN.md — Photo manifest curated (33 photos, mi 4-76); user approved at checkpoint; ready for Plan 01-03
Resume file: None
