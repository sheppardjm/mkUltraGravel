# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-29)

**Core value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.
**Current focus:** v4.0 Phase 26 — Photo Lightbox from Map — In progress

## Current Position

Milestone: v4.0 — Route Update + UX Overhaul
Phase: 26 of 26 (Photo Lightbox from Map) — In progress
Plan: 01 of 1 — paused at checkpoint:human-verify (Task 1 complete, awaiting visual verification)
Status: Awaiting checkpoint approval
Last activity: 2026-03-30 — Completed 26-01 Task 1 (thumbnail photo markers + PhotoSwipe lightbox)

Progress: v1.0: 30 plans | v2.0: 15 plans | v3.0: 6 plans | v4.0: [████████░░] 80%

## Performance Metrics

**Velocity:**
- Total plans completed: 53 (through 23-01)
- v1.0: 30 plans across 10 phases (2 days)
- v2.0: 15 plans across 6 phases (3 days)
- v3.0: 6 plans across 5 phases (2 days)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

**26-01 decisions:**
- showHideAnimationType: 'fade' (not zoom) — no DOM anchor to zoom from, lightbox is programmatic
- No photoswipe/style.css in RouteMap.astro — already in global.css @layer components (cascade conflict)
- AVIF-safe regex /\.(jpg|jpeg|png|avif)$/i — one photo is .avif (Billie Helmer)
- No bindPopup on photo markers — click directly invokes lightbox.loadAndOpen(index)

**25-01 decisions:**
- map.fitBounds (not flyTo) for reset — pixel-identical framing to initial page load
- initialBounds captured immediately after initial fitBounds (before user interaction)
- All map:reset listeners use AbortController signal for cleanup consistency
- KOM annotations skipped by _baseColor guard — no state to reset (by design)

**24-02 decisions:**
- 20s rotation speed for penrose-spin (subtle but noticeable; escher-drift uses 50s)
- transform-box: fill-box required for correct SVG rotation center (shape-relative, not viewport)
- GrinduroExplainer placed as sibling of grid (not child) for full-width span above sector cards

**24-01 decisions:**
- min-h-[280px] chosen as card equalization value — accommodates KOM 4-item grid plus aspect-video image at column widths
- Both .leaflet-bar a and .leaflet-touch .leaflet-bar a selectors needed (covers 26px desktop default and 30px touch default)

**23-01 decisions:**
- Down Jeep photo at mi 83.8 (midpoint of sector) guarantees Pass 1 card assignment, not fallback
- Billie Helmer AVIF photo at mi 22.1 (within KOM range) guarantees Pass 1 over existing mi 21.1 photo
- AVIF support requires updates to 5 sites: copy filter + 3 component .replace() regexes + thumbnail script handled automatically

**22-01 decisions:**
- Math.floor for displayed distance (100.71 -> 100 matches marketed "100 mile" event)
- Math.ceil for chart x-axis max (prevents elevation line clipping at right edge)
- No annotation mile markers modified (all 6 sectors/3 KOMs below mi 84.15, shared geometry)
- Old "MK Ultra.gpx" removed from git with git rm (preserved in history)

### Pending Todos

None.

### Blockers/Concerns

- **[Resolved]** New 100mi GPX file from Strava not yet received -- MK_Ultra.gpx was present, pipeline complete
- **[Resolved]** Down Jeep KOM (mi 83-84) uses nearest fallback photo -- fixed in 23-01, Down Jeep sector now uses 68686675_*.jpg as cover photo
- **[Active]** onHover performance on mid-range Android unverified (deferred to future milestone)
- **[Active]** Build environment: default PATH uses node@20, Astro requires node>=22. Use node@25 at /usr/local/opt/node@25/bin/
- **[Note]** Phase 24 (CSS + Layout + Content) is parallel-safe

## Session Continuity

Last session: 2026-03-30
Stopped at: 26-01 Task 1 complete (cb89066) — paused at checkpoint:human-verify
Resume file: None
