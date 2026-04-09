# Requirements: MK Ultra Gravel v10.5

**Defined:** 2026-04-09
**Core Value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.

## v10.5 Requirements

### SEO Foundation

- [ ] **SEO-01**: `site` property set to `https://mkultragravel.com` in astro.config.mjs
- [ ] **SEO-02**: `@astrojs/sitemap` integration installed and configured, generating sitemap-index.xml
- [ ] **SEO-03**: Static `robots.txt` in public/ with Allow directive and Sitemap URL
- [ ] **SEO-04**: Netlify 301 redirect from `mkultragravel.netlify.app` to `mkultragravel.com`
- [ ] **SEO-05**: Deploy preview responses include `X-Robots-Tag: noindex` header

### Social Sharing

- [ ] **SOC-01**: Open Graph meta tags (og:title, og:description, og:image, og:url, og:type, og:site_name) on all pages
- [ ] **SOC-02**: Twitter Card meta tags (twitter:card as summary_large_image, twitter:title, twitter:description, twitter:image) on all pages
- [ ] **SOC-03**: OG share image as 1200×630 JPEG using a route photo, served from public/

### Structured Data

- [ ] **DATA-07**: JSON-LD SportsEvent schema on homepage with name, startDate (2026-06-07T09:00:00-04:00), location (Marquette Fire Bell, Marquette, MI), offers (price: "0"), eventAttendanceMode, organizer

### Crawl

- [ ] **CRAWL-01**: Canonical `<link rel="canonical">` on every page using mkultragravel.com domain

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
| SEO-01 | — | Pending |
| SEO-02 | — | Pending |
| SEO-03 | — | Pending |
| SEO-04 | — | Pending |
| SEO-05 | — | Pending |
| SOC-01 | — | Pending |
| SOC-02 | — | Pending |
| SOC-03 | — | Pending |
| DATA-07 | — | Pending |
| CRAWL-01 | — | Pending |

**Coverage:**
- v10.5 requirements: 10 total
- Mapped to phases: 0
- Unmapped: 10

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-09 after initial definition*
