# Requirements: MK Ultra Gravel v10.5

**Defined:** 2026-04-09
**Core Value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.

## v10.5 Requirements

### SEO Foundation

- [x] **SEO-01**: `site` property set to `https://mkultragravel.com` in astro.config.mjs
- [x] **SEO-02**: `@astrojs/sitemap` integration installed and configured, generating sitemap-index.xml
- [x] **SEO-03**: Static `robots.txt` in public/ with Allow directive and Sitemap URL
- [x] **SEO-04**: Netlify 301 redirect from `mkultragravel.netlify.app` to `mkultragravel.com`
- [x] **SEO-05**: Deploy preview responses include `X-Robots-Tag: noindex` header

### Social Sharing

- [x] **SOC-01**: Open Graph meta tags (og:title, og:description, og:image, og:url, og:type, og:site_name) on all pages
- [x] **SOC-02**: Twitter Card meta tags (twitter:card as summary_large_image, twitter:title, twitter:description, twitter:image) on all pages
- [x] **SOC-03**: OG share image as 1200×630 JPEG using a route photo, served from public/

### Structured Data

- [ ] **DATA-07**: JSON-LD SportsEvent schema on homepage with name, startDate (2026-06-07T09:00:00-04:00), location (Marquette Fire Bell, Marquette, MI), offers (price: "0"), eventAttendanceMode, organizer

### Crawl

- [x] **CRAWL-01**: Canonical `<link rel="canonical">` on every page using mkultragravel.com domain

## Out of Scope

| Feature | Reason |
|---------|--------|
| Dynamic OG image generation (Satori) | Overkill for 2-page static site; static JPEG sufficient |
| SEO wrapper libraries (astro-seo) | Thin abstraction over 6 meta tags; inline is clearer |
| Per-page OG image overrides | Both pages share one image; unnecessary complexity |
| AI bot blocking in robots.txt | Policy decision deferred; not needed for event site |
| Google Search Console submission | Operational task, not a code requirement |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEO-01 | Phase 56 | Complete |
| SEO-02 | Phase 56 | Complete |
| SEO-03 | Phase 56 | Complete |
| SEO-04 | Phase 56 | Complete |
| SEO-05 | Phase 56 | Complete |
| SOC-03 | Phase 57 | Complete |
| SOC-01 | Phase 58 | Complete |
| SOC-02 | Phase 58 | Complete |
| CRAWL-01 | Phase 58 | Complete |
| DATA-07 | Phase 59 | Pending |

**Coverage:**
- v10.5 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-09 — traceability mapped after roadmap creation*
