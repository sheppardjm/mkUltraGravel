---
phase: 56-seo-foundation
plan: 01
subsystem: infra
tags: [astro, sitemap, seo, robots.txt, netlify, redirects]

# Dependency graph
requires: []
provides:
  - Astro site property set to https://mkultragravel.com
  - "@astrojs/sitemap integration generating sitemap-index.xml and sitemap-0.xml"
  - robots.txt with Allow directive and Sitemap URL deployed to dist/
  - Netlify 301 redirect from mkultragravel.netlify.app to mkultragravel.com
affects:
  - 58-meta-tags (site property required for canonical URLs)
  - 59-structured-data (site property required for schema.org URLs)

# Tech tracking
tech-stack:
  added: ["@astrojs/sitemap"]
  patterns:
    - "site property in defineConfig() anchors all URL generation (sitemaps, canonicals, OG)"

key-files:
  created:
    - public/robots.txt
  modified:
    - astro.config.mjs
    - package.json
    - package-lock.json
    - netlify.toml

key-decisions:
  - "Subdomain redirect placed before /api/* rule in netlify.toml — host-based rules must precede path-based rules"
  - "force = true on Netlify redirect prevents 200 pass-through when origin responds"
  - "Deploy preview noindex handled by Netlify platform default — no config needed"

patterns-established:
  - "site: https://mkultragravel.com is the canonical domain reference for all SEO phases"

# Metrics
duration: 2min
completed: 2026-04-09
---

# Phase 56 Plan 01: SEO Foundation Summary

**Astro sitemap integration + robots.txt + Netlify 301 subdomain redirect making mkultragravel.com crawlable and canonically indexed**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-09T15:36:52Z
- **Completed:** 2026-04-09T15:38:35Z
- **Tasks:** 2
- **Files modified:** 5 (astro.config.mjs, package.json, package-lock.json, netlify.toml, public/robots.txt)

## Accomplishments

- Added `@astrojs/sitemap` and configured `site: "https://mkultragravel.com"` — build now generates sitemap-index.xml and sitemap-0.xml with both page URLs
- Created robots.txt with `User-agent: *`, `Allow: /`, and Sitemap directive pointing to mkultragravel.com
- Added Netlify subdomain redirect (mkultragravel.netlify.app -> mkultragravel.com, 301 + force=true)

## Task Commits

1. **Task 1: Install sitemap integration and configure Astro** - `4b9cf18` (feat)
2. **Task 2: Create robots.txt and add Netlify subdomain redirect** - `0702b7d` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `astro.config.mjs` - Added sitemap import, site property, and integrations array
- `public/robots.txt` - New file: crawl directives and sitemap pointer
- `netlify.toml` - Added subdomain redirect block before existing /api/* rule
- `package.json` - Added @astrojs/sitemap dependency
- `package-lock.json` - Lock file updated for new dependency

## Decisions Made

- Subdomain redirect placed before `/api/*` in netlify.toml — Netlify processes redirects in order and host-based rules must precede path-based rules to avoid /api/* catching all requests first
- `force = true` on the 301 redirect — without this, if Netlify's origin returns a 200 the redirect may not fire
- Deploy preview noindex (SEO-05) is handled by Netlify platform by default, no configuration required — documented but not implemented

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `site: "https://mkultragravel.com"` is now set and available for Phase 58 (meta tags / canonical URLs) and Phase 59 (structured data)
- Sitemap is auto-generated on every build — new pages added to Astro will automatically appear in sitemap-0.xml
- No blockers for subsequent phases

---
*Phase: 56-seo-foundation*
*Completed: 2026-04-09*
