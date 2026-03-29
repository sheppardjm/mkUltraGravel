# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.
**Current focus:** Phase 21 complete — v3.0 milestone complete

## Current Position

Milestone: v3.0 Escher Identity + Data Fixes + UX Polish — COMPLETE
Phase: 21 of 21 (Escher Background + Favicon) — COMPLETE
Plan: 2/2 in current phase
Status: Phase complete — v3.0 milestone complete
Last activity: 2026-03-29 — Completed 21-02-PLAN.md (Escher isometric cube background overlay)

Progress: v1.0: 30 plans | v2.0: 15 plans | v3.0: 6/6 plans

## Performance Metrics

**Velocity:**
- Total plans completed: 49
- v1.0: 30 plans across 10 phases (2 days)
- v2.0: 15 plans across 6 phases (3 days)
- v3.0: 6 plans (17-01, 18-01, 19-01, 20-01, 21-01, 21-02)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

**17-01:**
- starColors not extracted to shared module (plan scope: per-file duplication only)
- Yellow-to-red palette: #f0c040 → #e8962a → #d9641e → #c93a18 → #b71c1c

**18-01:**
- 33/53 photo mile markers corrected by route owner via photo-verify tool
- No photos exist for first ~19 miles of route (earliest at mi 19.6)
- Manifest count is 53, not 54 as originally estimated in roadmap

**19-01:**
- drawTime: beforeDatasetsDraw renders KOM bands beneath elevation line (sectors use default afterDatasetsDraw)
- No _baseColor on KOM annotations — isolates them from sector hover/click event handlers via _baseColor presence check
- borderDash: [6, 3] echoes map KOM polyline dashArray: 8,4 for visual language consistency

**20-01:**
- L.marker + L.divIcon replaces L.circleMarker for SVG-capable crosshair icon
- iconAnchor: [12, 12] on 24x24 icon centers bike on GPS coordinate at all zoom levels
- setOpacity(1/0) for show/hide — L.marker has no setStyle(); setStyle() is path/circleMarker-only
- interactive: false prevents bike icon from capturing mouse events intended for sector polylines

**21-01:**
- Hex fills (#a3f0a0, #6db86a, #3d7a3a) used in favicon.svg instead of oklch() — SVG fill attribute oklch support inconsistent
- scale(0.114, 0.132) on g-wrapper adapts Wikipedia 280x243 path data to 32x32 viewBox
- Background #14141e (not #1a1a2e from old placeholder) — exact hex equiv of --color-bg-base

**21-02:**
- Four standalone `<rect>` elements in SVG tile instead of `<use>` refs — CSS background-image data URIs cannot resolve fragment identifiers
- prefers-reduced-motion: no-preference gate (opt-in) — animation is off by default, activates only when user allows motion
- @keyframes and @media placed OUTSIDE @layer components — keyframes inside @layer have cascade specificity issues
- z-index: 9998 for escher-overlay, one below grain-overlay at 9999

### Pending Todos

None.

### Blockers/Concerns

- **[Active]** Down Jeep KOM (mi 83.55-84.15) still uses nearest fallback at mi 80.2 — no in-range photo available
- **[Active]** Billie Helmer KOM (mi 21.9-22.59) now uses nearest fallback at mi 21.1 — position shift from corrections
- **[Active]** onHover performance on mid-range Android unverified
- **[Resolved]** Phase 21 (Escher background) — animation uses transform-only translate, compositor-safe, zero TBT impact confirmed by build passing

## Session Continuity

Last session: 2026-03-29
Stopped at: Completed 21-02-PLAN.md — Phase 21 complete, v3.0 milestone complete
Resume file: None
