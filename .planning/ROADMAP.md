# Roadmap: MK Ultra Gravel

## Milestones

- ✅ **v1.0 MVP** — Phases 1-10 (shipped 2026-03-27)
- ✅ **v2.0 Interactivity + Polish** — Phases 11-16 (shipped 2026-03-28)
- ✅ **v3.0 Escher Identity + Data Fixes** — Phases 17-21 (shipped 2026-03-29)
- ✅ **v4.0 Route Update + UX Overhaul** — Phases 22-26 (shipped 2026-03-30)
- ✅ **v5.0 Strava Integration + Results** — Phases 27-32 (shipped 2026-03-30)
- ✅ **v6.0 UI Polish + Dev Tools** — Phases 33-35 (shipped 2026-03-30)
- ✅ **v7.0 Strava Go-Live** — Phases 36-40 (shipped 2026-03-31)
- ✅ **v8.0 Visual Polish + Content** — Phases 41-46 (shipped 2026-04-01)
- ✅ **v9.0 New Sector Addition** — Phase 47 (shipped 2026-04-02)
- ✅ **v10.0 Strava Decoupling** — Phases 48-49 (shipped 2026-04-06)
- ✅ **v10.1 Polish** — Phase 50 (shipped 2026-04-06)
- ✅ **v10.2 Neucadia Footer** — Phase 51 (shipped 2026-04-07)
- ✅ **v10.3 Mobile Elevation Labels** — Phase 52 (shipped 2026-04-08)
- ✅ **v10.4 Card Display Polish** — Phases 53-55 (shipped 2026-04-08)
- ✅ **v10.5 SEO & Social Sharing** — Phases 56-59 (shipped 2026-04-10)
- 🚧 **v10.6 Explainer Redesign + Elevation Fix** — Phases 60-61 (in progress)

---

<details>
<summary>✅ Previous milestones v1.0–v10.5 (Phases 1-59) — SHIPPED</summary>

See individual milestone roadmaps in `.planning/milestones/` and `.planning/MILESTONES.md` for full history.

Phases 1-59 shipped across 99 plans. Key capabilities delivered:
- v1.0: Static Astro site, data pipeline, Leaflet map, Chart.js elevation, gallery, Netlify deploy
- v2.0: Map-elevation bidirectional sync, photo pipeline, brutalist animations
- v3.0: Escher tessellation, Penrose favicon, sector color spectrum, KOM elevation bands
- v4.0: 100mi route, photo lightbox from map, map reset, Grinduro explainer
- v5.0: Strava OAuth submission, scoring engine, results leaderboards, deauth webhook
- v6.0: starColors shared module, elevation profile labels, fixed SiteNav
- v7.0: Strava production go-live, OAuth round-trip verified, branding compliance
- v8.0: 71 photos, CSS masonry gallery, lizard tessellation, tone accents, metaball dividers
- v9.0: BAA sector across all 5 surfaces (7th sector)
- v10.0: Strava decoupling, /results → ironpineomnium.com CTA
- v10.1: Dark scrollbars, proportional card images
- v10.2: Neucadia footer
- v10.3: Mobile elevation label responsive suppression
- v10.4: Card DOM restructure, CLASSIFIED badge z-index, 1200x675 crops, ultrawide constraint
- v10.5: Sitemap, robots.txt, Netlify redirect, OG/Twitter meta tags, JSON-LD SportsEvent

</details>

---

## 🚧 v10.6 Explainer Redesign + Elevation Fix (In Progress)

**Milestone Goal:** Transform the Grinduro explainer section into a snowboarding-magazine editorial layout with CSS-filtered tone images, and fix the Down Jeep elevation profile label so it renders correctly.

### Phase 60: Down Jeep Elevation Label Fix ✅

**Goal:** The Down Jeep sector name renders horizontally and without clipping on the elevation profile at desktop viewports.

**Depends on:** Nothing (independent of Phase 61)

**Requirements:** ELEV-09

**Completed:** 2026-04-13

Plans:
- [x] 60-01: Diagnose and fix Down Jeep labelContent conditional; visual QA across all sectors

---

### Phase 61: GrinduroExplainer Magazine Editorial Redesign

**Goal:** The Grinduro format explainer reads like an action sports magazine editorial — full-bleed filtered tone images break up the three paragraphs, a drop cap opens the section, and a pull quote gives it rhythm.

**Depends on:** Phase 60 (clean baseline before layout surgery)

**Requirements:** EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, EDIT-06, EDIT-07

**Success Criteria** (what must be TRUE):
1. Two filtered tone images appear as full-bleed breaks between the three explainer paragraphs, escaping the text column
2. Each tone image uses a distinct heavy CSS filter recipe — originals are obscured, not merely tinted
3. Tone image compositing does not create a white or bright halo against the dark background; overlay layers (grain, escher, lizard) render correctly above the images
4. The opening paragraph has a drop cap using `::first-letter` in Special Elite at approximately 3em
5. A pull quote appears between paragraphs with magazine-style accent-color emphasis
6. Tone image containers and text blocks animate in on scroll using the existing `data-reveal` pattern

**Plans:** 2 plans

Plans:
- [ ] 61-01: CSS Grid full-bleed layout + two tone image breaks with distinct filter recipes
- [ ] 61-02: Drop cap typography, pull quote, and scroll-reveal animations

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-59 | v1.0–v10.5 | 99/99 | Complete | 2026-04-10 |
| 60. Down Jeep Elevation Label Fix | v10.6 | 1/1 | Complete | 2026-04-13 |
| 61. GrinduroExplainer Editorial Redesign | v10.6 | 0/TBD | Not started | - |
