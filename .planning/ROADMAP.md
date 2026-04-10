# Roadmap: MK Ultra Gravel

## Milestones

- ✅ **v10.4 Polish** - Phases 53-55 (shipped 2026-04-08)
- 🚧 **v10.5 SEO & Social Sharing** - Phases 56-59 (in progress)

## Phases

<details>
<summary>✅ v10.4 Polish (Phases 53-55) - SHIPPED 2026-04-08</summary>

### Phase 53: Card Display
**Goal**: Segment cards render correctly on large screens — classified badge visible, photos sharp, gravel cards reasonably sized
**Depends on**: Nothing (first phase)
**Requirements**: CARD-02, CARD-03, CARD-04
**Success Criteria** (what must be TRUE):
  1. Classified badge renders fully visible above all card content on every segment card — no clipping, no occlusion by overflow-hidden parents or stacking context
  2. Gravel sector card photos appear sharp (no visible softness or upscaling artifacts) on viewports 1440px and wider
  3. Gravel sector cards stop growing at a reasonable max-width on ultrawide viewports (2560px+) — card content does not stretch across the full viewport
**Plans**: 2 plans

Plans:
- [x] 53-01-PLAN.md — Badge clipping fix, card photo resolution bump, max-width constraint
- [x] 53-02-PLAN.md — Gap closure: z-index fix for CLASSIFIED badge paint order

### Phase 54: Overlay Contrast
**Goal**: Light text over Escher tessellation background maintains readable contrast at all scroll positions
**Depends on**: Nothing (independent)
**Requirements**: VIS-16
**Success Criteria** (what must be TRUE):
  1. Light-colored text (white, muted, accent) remains legible over the Escher tessellation at every scroll position on the homepage
  2. The Escher visual texture is still perceptible as a background element (not reduced to invisibility)
**Plans**: 1 plan

Plans:
- [x] 54-01-PLAN.md — Reduce EscherLizards opacity for text contrast

### Phase 55: Gallery Fill
**Goal**: Photo gallery columns fill evenly with minimal wasted vertical space
**Depends on**: Nothing (independent)
**Requirements**: GAL-02
**Success Criteria** (what must be TRUE):
  1. Gallery columns are visually balanced — no column ends significantly shorter than its neighbors across the full photo set
  2. All photos render at their natural aspect ratio (no cropping or distortion introduced by the fill fix)
  3. Gallery remains horizontally scrollable with the existing UX pattern preserved
**Plans**: 1 plan

Plans:
- [x] 55-01-PLAN.md — Balanced column fill CSS change + visual verification

</details>

### v10.5 SEO & Social Sharing (In Progress)

**Milestone Goal:** Make the site discoverable and shareable — proper previews when links are shared, structured data for search engines, and crawl infrastructure.

#### Phase 56: SEO Foundation
**Goal**: Crawl infrastructure is in place — search engines can index the canonical domain, the sitemap is generated, and deploy previews are blocked from indexing
**Depends on**: Nothing (first phase of milestone)
**Requirements**: SEO-01, SEO-02, SEO-03, SEO-04, SEO-05
**Success Criteria** (what must be TRUE):
  1. Visiting `mkultragravel.netlify.app` in a browser redirects (301) to `mkultragravel.com` — the netlify subdomain never shows the site
  2. `https://mkultragravel.com/sitemap-index.xml` resolves and lists the site pages
  3. `https://mkultragravel.com/robots.txt` resolves and contains an Allow directive and the Sitemap URL
  4. Deploy preview URLs (e.g. `deploy-preview-123--mkultragravel.netlify.app`) return an `X-Robots-Tag: noindex` response header
**Plans**: 1 plan

Plans:
- [x] 56-01-PLAN.md — Astro site config, sitemap integration, robots.txt, Netlify subdomain redirect

#### Phase 57: OG Share Image
**Goal**: A 1200x630 JPEG share image exists in public/ and is ready for use in meta tags
**Depends on**: Nothing (independent asset creation)
**Requirements**: SOC-03
**Success Criteria** (what must be TRUE):
  1. A file exists at `public/og-image.jpg` (or equivalent path) with dimensions 1200x630 pixels
  2. The image uses a route photo and is visually compelling when viewed as a link preview thumbnail
  3. File size is suitable for web delivery (under 300 KB)
**Plans**: 1 plan

Plans:
- [x] 57-01-PLAN.md — Generate OG share image from Down Jeep route photo

#### Phase 58: Meta Tags
**Goal**: Every page produces correct Open Graph, Twitter Card, and canonical link metadata — links shared to social platforms show rich previews
**Depends on**: Phase 56 (for canonical domain URL), Phase 57 (for OG image path)
**Requirements**: SOC-01, SOC-02, CRAWL-01
**Success Criteria** (what must be TRUE):
  1. Pasting `https://mkultragravel.com` into a social share debugger (e.g. Facebook Sharing Debugger, Twitter Card Validator) returns a rich preview with the route photo, title, and description
  2. Every page's `<head>` contains all six required og: tags (og:title, og:description, og:image, og:url, og:type, og:site_name)
  3. Every page's `<head>` contains all four required twitter: tags (twitter:card as summary_large_image, twitter:title, twitter:description, twitter:image)
  4. Every page's `<head>` contains a `<link rel="canonical">` pointing to the mkultragravel.com domain URL for that page
**Plans**: 1 plan

Plans:
- [x] 58-01-PLAN.md — Add OG, Twitter Card, and canonical meta tags to BaseLayout.astro

#### Phase 59: Structured Data
**Goal**: The homepage emits a valid JSON-LD SportsEvent schema so search engines understand this is a sporting event with a date, location, and free entry
**Depends on**: Phase 56 (for canonical domain URL used in schema)
**Requirements**: DATA-07
**Success Criteria** (what must be TRUE):
  1. Google's Rich Results Test returns a valid SportsEvent result for `https://mkultragravel.com`
  2. The schema includes startDate of 2026-06-07T09:00:00-04:00, location as Marquette Fire Bell (Marquette, MI), and offers with price "0"
  3. No validation errors appear in a JSON-LD schema validator for the homepage source
**Plans**: TBD

Plans:
- [ ] 59-01-PLAN.md — TBD

## Progress

**Execution Order:**
Phase 56 first (all others depend on site config). Phase 57 independent (asset creation). Phase 58 after 56 and 57. Phase 59 after 56.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 53. Card Display | v10.4 | 2/2 | Complete | 2026-04-08 |
| 54. Overlay Contrast | v10.4 | 1/1 | Complete | 2026-04-08 |
| 55. Gallery Fill | v10.4 | 1/1 | Complete | 2026-04-08 |
| 56. SEO Foundation | v10.5 | 1/1 | Complete | 2026-04-09 |
| 57. OG Share Image | v10.5 | 1/1 | Complete | 2026-04-09 |
| 58. Meta Tags | v10.5 | 1/1 | Complete | 2026-04-09 |
| 59. Structured Data | v10.5 | 0/TBD | Not started | - |
