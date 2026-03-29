# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-29)

**Core value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.
**Current focus:** v4.0 Phase 24 — CSS + Layout + Content

## Current Position

Milestone: v4.0 — Route Update + UX Overhaul
Phase: 24 of 26 (CSS + Layout + Content)
Plan: —
Status: Ready to plan
Last activity: 2026-03-29 — Phase 23 verified and complete

Progress: v1.0: 30 plans | v2.0: 15 plans | v3.0: 6 plans | v4.0: [████░░░░░░] 40%

## Performance Metrics

**Velocity:**
- Total plans completed: 53 (through 23-01)
- v1.0: 30 plans across 10 phases (2 days)
- v2.0: 15 plans across 6 phases (3 days)
- v3.0: 6 plans across 5 phases (2 days)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

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

Last session: 2026-03-29
Stopped at: Phase 23 verified and complete, ready for Phase 24
Resume file: None
