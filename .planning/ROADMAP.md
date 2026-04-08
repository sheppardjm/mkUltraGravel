# Roadmap: MK Ultra Gravel

## Milestones

- ✅ **v1.0 MVP** - Phases 1-10 (shipped 2026-03-27)
- ✅ **v2.0 Interactivity + Polish** - Phases 11-16 (shipped 2026-03-28)
- ✅ **v3.0 Escher Identity + Data Fixes** - Phases 17-21 (shipped 2026-03-29)
- ✅ **v4.0 Route Update + UX Overhaul** - Phases 22-26 (shipped 2026-03-30)
- ✅ **v5.0 Strava Integration + Results** - Phases 27-32 (shipped 2026-03-30)
- ✅ **v6.0 UI Polish + Dev Tools** - Phases 33-35 (shipped 2026-03-30)
- ✅ **v7.0 Strava Go-Live** - Phases 36-40 (shipped 2026-03-31)
- ✅ **v8.0 Visual Polish + Content** - Phases 41-46 (shipped 2026-04-01)
- ✅ **v9.0 New Sector Addition** - Phase 47 (shipped 2026-04-02)
- ✅ **v10.0 Strava Decoupling** - Phases 48-49 (shipped 2026-04-06)
- ✅ **v10.1 CSS Polish** - Phase 50 (shipped 2026-04-06)
- ✅ **v10.2 Neucadia Footer** - Phase 51 (shipped 2026-04-07)
- ✅ **v10.3 Mobile Elevation Labels** - Phase 52 (shipped 2026-04-08)

## Phases

<details>
<summary>✅ v1.0 through v10.2 (Phases 1-51) — SHIPPED</summary>

See MILESTONES.md for full archive of completed phases.

</details>

---

### Phase 52 — Mobile Elevation Labels

**Milestone:** v10.3 Mobile Elevation Labels

**Goal:** The elevation profile chart is readable on mobile devices without label clutter obscuring the visualization.

**Dependencies:** None (single-file change to ElevationProfile.astro)

**Requirements:** ELEV-05, ELEV-06, ELEV-07, ELEV-08

**Success Criteria:**

1. On a 375px viewport, the elevation profile displays no text labels (sector names, star ratings, or KOM segment names) — only the colored annotation bands and the elevation line remain visible.
2. On a 640px or wider viewport, all sector name labels, star-rating labels, and KOM segment labels render exactly as they do today.
3. At exactly 639px viewport width, labels are hidden; at exactly 640px, labels are visible — the breakpoint is precise and consistent.
4. Resizing the browser window from above 640px to below 640px (and back) does not break the chart — the annotation bands remain visible at all sizes.

**Plans:** 2 plans

Plans:
- [x] 52-01-PLAN.md — Make annotation labels responsive to viewport width
- [x] 52-02-PLAN.md — Fix missing sector name on narrow sectors (Down Jeep)

---

## Progress

**Execution Order:** Phases execute in numeric order. Last shipped: 51.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-51 (archived) | v1.0-v10.2 | 88/88 | Complete | 2026-04-07 |
| 52 | v10.3 | 2/2 | Complete | 2026-04-08 |
