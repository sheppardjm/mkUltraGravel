# Project Research Summary

**Project:** MK Ultra Gravel — v10.5 SEO & Social Sharing
**Domain:** Static event website — SEO and social sharing layer on existing Astro 6 static site
**Researched:** 2026-04-09
**Confidence:** HIGH

## Executive Summary

MK Ultra Gravel is a two-page Astro 6 static site that currently has `<title>` and `<meta name="description">` but no Open Graph tags, no canonical URL, no structured data, no sitemap, and no robots.txt. The v10.5 milestone adds all standard SEO and social sharing infrastructure. This is a low-complexity, low-risk implementation. Five of six features require zero new npm dependencies. The only new package is `@astrojs/sitemap@3.7.2`, the official first-party Astro integration.

The single most important prerequisite is setting `site: 'https://mkultragravel.com'` in `astro.config.mjs` before any other work begins. This one field enables `Astro.site` throughout the codebase, unlocks the sitemap integration, and is the source of truth for all absolute URL construction. Without it, canonical tags silently render `href="undefined"`, the sitemap integration throws a build warning, and OG URLs are wrong. Everything downstream of this milestone depends on it being set to the production domain — not the Netlify subdomain.

The primary risk is quiet failures: `og:image` with a relative path breaks all social previews without a build error; JSON-LD with invalid JSON is silently ignored by Google's rich results parser; the `.netlify.app` subdomain stays live after a custom domain is connected, creating duplicate content. All these failures are invisible until tested with social debugger tools and the Google Rich Results Test. The implementation plan must include explicit validation steps using those tools before the milestone is considered complete.

---

## Key Findings

### Recommended Stack

The existing stack (Astro 6.1.1, Tailwind v4, sharp 0.34.5) covers all SEO needs without new dependencies except one. Sharp is already installed and handles the OG image. The OG meta tags, canonical link, Twitter Card tags, JSON-LD structured data, and robots.txt are all pure HTML/config — no packages needed. The sitemap is the only feature that needs a package because Astro does not auto-generate `sitemap.xml`.

**Core technologies:**

| Technology | Purpose | Rationale |
|------------|---------|-----------|
| `@astrojs/sitemap@3.7.2` | Generates `sitemap-index.xml` + `sitemap-0.xml` at build time | Official first-party Astro integration; only new dependency |
| `Astro.site` (built-in) | Absolute URL construction for canonical, OG, Twitter, JSON-LD | Requires `site:` in astro.config.mjs; replaces all hardcoded URL strings |
| `sharp` (existing devDep) | One-time OG image generation (1200×630 JPEG) | Already installed; Satori rejected as overkill for a 2-page site |
| `BaseLayout.astro` (existing) | Head tag injection point for OG/Twitter/canonical | Already has `<slot name="head" />` and title/description props |

**Rejected packages:** `satori`, `astro-seo`, `astro-seo-meta`, `@astrolib/seo`, `astro-seo-schema`, `astro-robots-txt`. Each adds a dependency for functionality that is 20 lines of inline code or a static file.

**astro.config.mjs final state — two additions only:**
```js
export default defineConfig({
  site: "https://mkultragravel.com",   // NEW
  integrations: [sitemap()],           // NEW
  vite: { plugins: [tailwindcss()] },
  fonts: [ /* unchanged */ ],
});
```

### Expected Features

**Must have (table stakes) — social previews break without these:**
- Open Graph tags (`og:type`, `og:title`, `og:description`, `og:url`, `og:image`, `og:image:width`, `og:image:height`, `og:site_name`) — required by Facebook, LinkedIn, Discord, Slack, iMessage
- Twitter/X Card tags (`twitter:card: summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`) — `twitter:card` must be explicit or large image degrades to small thumbnail
- OG share image at `public/og-image.jpg` (1200×630, JPEG quality 85, under 300KB) — used by all platforms
- Canonical URL tag (`<link rel="canonical">`) — prevents `.netlify.app` duplicate content indexing
- `public/robots.txt` with `Sitemap:` directive — crawl infrastructure
- `sitemap.xml` via `@astrojs/sitemap` — enables Google to discover and index pages

**Should have (differentiators):**
- JSON-LD `SportsEvent` structured data on homepage — unlocks Google rich result card (date, location, event details) in search results
- Domain 301 redirect (`.netlify.app` to `mkultragravel.com`) via `public/_redirects` — prevents duplicate indexing after custom domain connects
- Deploy preview `noindex` block via `netlify.toml` context override — prevents crawling of ephemeral preview URLs
- Per-page OG prop overrides in `BaseLayout.astro` — allows `/results` to carry its own title/description when that page evolves

**Defer:**
- Google Tag Manager / analytics
- Separate Twitter-specific 1200×675 image (marginal gain over 1200×630)
- Dynamic OG image generation with Satori (relevant only for sites with unique per-page share images)
- Social sharing buttons

**Note on Schema.org type:** FEATURES.md recommends `@type: "Event"` while ARCHITECTURE.md and STACK.md recommend `@type: "SportsEvent"`. PITFALLS.md flags that Google's Rich Results Test documentation does not explicitly list `SportsEvent` as a supported type. **Recommendation: implement `"SportsEvent"` — it is the correct Schema.org subtype for a cycling race, and the fallback to `"Event"` is a one-field change if validation fails.** See Gaps section.

### Architecture Approach

All SEO additions integrate into the existing two-file surface area: `astro.config.mjs` (add `site` and `sitemap()`) and `src/layouts/BaseLayout.astro` (add OG, Twitter, canonical tags inline, expanding existing prop interface). A thin `StructuredData.astro` component handles JSON-LD rendering because Astro's `set:html` directive is needed to emit unescaped JSON inside a `<script>` tag — this is a one-function shell. Static files `public/robots.txt`, `public/og-image.jpg`, and `public/_redirects` are committed assets. No new pages, no dynamic routes, no SSR.

**Components and files:**

| Item | Type | Change |
|------|------|--------|
| `astro.config.mjs` | Modified | Add `site:` and `sitemap()` integration |
| `src/layouts/BaseLayout.astro` | Modified | Add OG, Twitter Card, canonical tags; expand Props interface |
| `src/components/StructuredData.astro` | New | Thin shell: renders `<script type="application/ld+json" set:html={JSON.stringify(schema)} />` |
| `public/robots.txt` | New | Static file; `Allow: /`; `Sitemap:` directive |
| `public/og-image.jpg` | New | 1200×630 route photo; manually generated once via sharp |
| `public/_redirects` | New | 301 redirect from `.netlify.app/*` to `mkultragravel.com/:splat` |

**Data flow:**
```
astro.config.mjs (site: 'https://mkultragravel.com')
  └── Astro.site
        ├── BaseLayout.astro: canonical = new URL(pathname, Astro.site).href
        ├── BaseLayout.astro: og:image = new URL('/og-image.jpg', Astro.site).href
        └── @astrojs/sitemap: generates sitemap-index.xml + sitemap-0.xml

index.astro: eventSchema object (static)
  └── <StructuredData schema={eventSchema} slot="head" />
        └── <script type="application/ld+json"> in <head>

public/og-image.jpg  → https://mkultragravel.com/og-image.jpg
public/robots.txt    → https://mkultragravel.com/robots.txt
public/_redirects    → processed by Netlify for subdomain 301
```

### Critical Pitfalls

1. **`site` not set in astro.config.mjs** — set `site: 'https://mkultragravel.com'` as the absolute first change. Without it: sitemap throws a build warning, canonical tags render `href="undefined"`, `og:url` is wrong. Root cause of multiple silent failures.

2. **`og:image` with a relative path** — always construct with `new URL('/og-image.jpg', Astro.site).href`. Relative paths fail silently on all social platforms — no build error, no browser error, no image in link previews.

3. **OG image cache is effectively permanent on WhatsApp and Telegram** — get the image right before the first public share. If the image must change after initial shares, change the filename/URL (not just the file content) to bust platform caches.

4. **`.netlify.app` stays live as duplicate content** — add `public/_redirects` with a 301 before submitting the sitemap to Google Search Console. If Google indexes both URLs first, fixing it requires weeks of waiting for re-crawl.

5. **`twitter:card` missing = large image renders as small thumbnail** — Twitter inherits OG tags but defaults to the `summary` (small) card without an explicit `twitter:card: summary_large_image` tag.

6. **Trailing slash inconsistency between canonical tags and sitemap** — use `new URL(Astro.url.pathname, Astro.site).href` for all canonical construction, never hardcoded strings.

7. **JSON-LD with invalid JSON is silently ignored** — always use `JSON.stringify(schemaObject)` with `set:html`, never string concatenation. Validate with Google Rich Results Test on the production URL, not localhost.

---

## Implications for Roadmap

All four research files converge on the same build order. The dependency graph is strict at the top (everything needs `site` set first) and parallel at the bottom (OG image, meta tags, and structured data are independent once foundation is in place).

### Phase 1: SEO Foundation

**Rationale:** Hard prerequisite for every other phase. `Astro.site` is not available until `site:` is set. Sitemap integration cannot function without it. Canonical URL construction requires it. This is the one change that unlocks all downstream work.

**Delivers:** Working `Astro.site` global; `@astrojs/sitemap` installed and generating sitemap at build; `public/robots.txt` deployed with `Sitemap:` directive; `.netlify.app` 301 redirect in place; deploy previews blocked from indexing; `/results` filtered from sitemap.

**Implements:**
- `site: 'https://mkultragravel.com'` in `astro.config.mjs`
- `@astrojs/sitemap` integration installed and wired
- `public/robots.txt` (static file, `Sitemap: https://mkultragravel.com/sitemap-index.xml`)
- `public/_redirects` (301 from `.netlify.app/*` to `mkultragravel.com/:splat 301!`)
- `netlify.toml` context override blocking deploy preview indexing
- Sitemap filter excluding `/results`

**Avoids:** Pitfall 1 (missing `site`), Pitfall 4 (duplicate `.netlify.app`), Pitfall 5 (trailing slash mismatch), Pitfall 8 (robots.txt not in `public/`), Pitfall 9 (deploy previews indexed), Pitfall 11 (`/results` in sitemap)

### Phase 2: OG Image

**Rationale:** The OG image file must exist at a committed, stable URL before OG meta tags can be tested with social debugger tools. Testing meta tags without an actual image returns false negatives from all validator tools. Create the asset first.

**Delivers:** `public/og-image.jpg` — 1200×630 JPEG of a compelling route photo, quality 85, under 300KB. Stable filename (not hashed). Accessible at `https://mkultragravel.com/og-image.jpg` after deploy.

**Implements:**
- One-time `scripts/generate-og-image.js` using existing sharp (or manual creation)
- Select source photo from `images/` (wide, dramatic, high-contrast, landscape)
- Commit `public/og-image.jpg` as a static asset

**Avoids:** Pitfall 2 (relative OG image), Pitfall 3 (cache permanence — get it right here)

### Phase 3: Meta Tags (OG, Twitter Card, Canonical)

**Rationale:** Purely additive to `BaseLayout.astro`. Depends on Phase 1 (`Astro.site` available) and Phase 2 (image URL to reference). Can be validated with social debugger tools immediately after deploy.

**Delivers:** All pages have correct canonical URL, full Open Graph tag set, and Twitter Card tags with `summary_large_image`. Both `/` and `/results` carry correct per-page canonical URLs derived from `Astro.url.pathname`.

**Implements:**
- Expand `BaseLayout.astro` Props interface: `ogImage?: string`, `ogType?: string`
- `canonicalUrl = new URL(Astro.url.pathname, Astro.site).href`
- `ogImageUrl = new URL('/og-image.jpg', Astro.site).href` as default
- Canonical `<link>`, OG `<meta property>` tags, Twitter `<meta name="twitter:">` tags inline before `<slot name="head" />`
- Ensure no duplicate `<meta name="description">` (props only, no unconditional defaults)

**Avoids:** Pitfall 2 (relative OG URL), Pitfall 5 (trailing slash), Pitfall 7 (duplicate meta tags), Pitfall 10 (`twitter:card` missing)

**Validate with:** opengraph.xyz, cards-dev.x.com/validator, linkedin.com/post-inspector

### Phase 4: Structured Data (JSON-LD)

**Rationale:** Independent of Phases 2 and 3 once Phase 1 is complete. Separate phase because it has its own validation tool (Google Rich Results Test), its own failure modes (silent JSON parse errors), and specific event data to confirm (start time, venue name) before committing the schema.

**Delivers:** `SportsEvent` JSON-LD block in `index.astro` head, validated with Google Rich Results Test showing no errors. Homepage eligible for Google event rich result card.

**Implements:**
- `src/components/StructuredData.astro` (thin shell: `set:html={JSON.stringify(schema)}`)
- `eventSchema` static object in `index.astro` frontmatter with all required fields
- `<StructuredData schema={eventSchema} slot="head" />` in `index.astro`

**Avoids:** Pitfall 6 (missing required JSON-LD fields), Pitfall 12 (invalid JSON silently ignored)

**Validate with:** Google Rich Results Test on production URL (not localhost)

### Phase Ordering Rationale

- Phase 1 is a hard prerequisite — nothing works correctly without `site:` set
- Phase 2 before Phase 3 — social debugger tools return false negatives without an actual image URL
- Phases 3 and 4 are parallel-eligible after Phases 1-2 — they touch different files and use different validation tools
- Post-deploy operational step (no code): submit `https://mkultragravel.com/sitemap-index.xml` to Google Search Console after Phase 1 is live

### Research Flags

**No phases in this milestone need `/gsd:research-phase`.** All patterns are sourced from official documentation and direct codebase inspection. All are well-established with stable, documented implementations:

- Phase 1 (SEO Foundation): `@astrojs/sitemap` config from Astro official docs; robots.txt and `_redirects` are static files with known formats
- Phase 2 (OG Image): Sharp resize/crop well-documented; 1200×630 OG spec well-established
- Phase 3 (Meta Tags): OG and Twitter tag specs are official and stable; `Astro.site` pattern from Astro API reference
- Phase 4 (Structured Data): Schema.org `Event` fields documented; `JSON.stringify` + `set:html` from Astro docs

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | One new dependency (`@astrojs/sitemap@3.7.2`) confirmed from Astro monorepo CHANGELOG and npm registry; existing sharp confirmed from `package.json`; all other decisions are no-dependency by design |
| Features | HIGH | OG, Twitter Card, canonical, robots.txt, sitemap requirements from official platform specs (ogp.me, X developer docs, Google Search Central); 2-page scope leaves no scope ambiguity |
| Architecture | HIGH | All patterns from direct `BaseLayout.astro` inspection + Astro official docs; head slot confirmed to exist; `Astro.site` canonical pattern from Astro API reference |
| Pitfalls | HIGH | Critical pitfalls (missing `site`, relative OG URL, `.netlify.app` duplicate content, `twitter:card`) confirmed via official sources; OG cache behavior confirmed by Facebook developer docs |

**Overall confidence: HIGH**

### Gaps to Address

- **`SportsEvent` vs `Event` in JSON-LD:** FEATURES.md recommends `Event`; ARCHITECTURE.md and STACK.md recommend `SportsEvent`. Google's Rich Results Test explicitly documents `Event`; `SportsEvent` rich result support is less documented. Resolution: implement `SportsEvent`, validate with Rich Results Test on production, fall back to `Event` if errors appear. One-field change if needed.

- **Exact event start time:** JSON-LD `startDate` requires a time with UTC offset for optimal rich result display. Research uses placeholders. The actual MK Ultra Gravel mass start time should be confirmed before the structured data phase ships.

- **OG image photo selection:** Research recommends a wide, dramatic, high-contrast route photo from `images/` but does not select a specific file. The CIA document hero (`CIA-MKULTRA-IG_Page_01.jpg`) is on-brand and available as a fallback.

- **AI bot blocking in robots.txt:** FEATURES.md notes the option to add `GPTBot`, `CCBot`, `anthropic-ai` Disallow blocks. Policy decision for the site owner — confirm before shipping robots.txt.

---

## Sources

### Primary (HIGH confidence)

- [Astro configuration reference — `site` option](https://docs.astro.build/en/reference/configuration-reference/#site) — `Astro.site` behavior, canonical URL pattern
- [Astro API reference — `Astro.site`](https://docs.astro.build/en/reference/api-reference/) — `new URL(pathname, Astro.site)` pattern
- [@astrojs/sitemap integration guide](https://docs.astro.build/en/guides/integrations-guide/sitemap/) — installation, config, output files
- [withastro/astro sitemap CHANGELOG.md](https://github.com/withastro/astro/blob/main/packages/integrations/sitemap/CHANGELOG.md) — confirmed v3.7.2 current
- [The Open Graph protocol — ogp.me](https://ogp.me/) — authoritative OG tag spec, absolute URL requirement
- [Facebook developer docs: OG image requirements](https://developers.facebook.com/docs/sharing/webmasters/images/) — image dimensions, cache behavior
- [Google Search Central — Event Structured Data](https://developers.google.com/search/docs/appearance/structured-data/event) — required fields, rich result eligibility
- [X/Twitter developer docs — Summary Card with Large Image](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/summary-card-with-large-image) — `twitter:card` requirement
- [Netlify Support — `.netlify.app` duplicate content](https://answers.netlify.com/t/netlify-com-netlify-app-potential-duplicate-content-seo-issue/22726) — confirmed subdomain stays live after custom domain
- [Astro GitHub issue #11575](https://github.com/withastro/astro/issues/11575) — sitemap URL and `Astro.url` trailing slash mismatch
- Direct codebase inspection: `src/layouts/BaseLayout.astro`, `astro.config.mjs`, `package.json`, `netlify.toml`, `public/` directory — confirmed baseline state

### Secondary (MEDIUM confidence)

- [arne.me — Static OG Images in Astro](https://arne.me/blog/static-og-images-in-astro) — static vs Satori tradeoff; build-time approach viability
- [Schema.org/SportsEvent](https://schema.org/SportsEvent) — type definition and inheritance from Event
- [Ahrefs — Canonical Tag Guide](https://ahrefs.com/blog/canonical-tags/) — canonical behavior in multi-URL scenarios
- OG image size guides (myogimage.com, krumzi.com, ogpreview.app) — platform dimension requirements
- [tempertemper.net — Preventing deploy preview indexing](https://www.tempertemper.net/blog/stop-search-indexing-for-netlify-deploy-previews-and-branch-deploys) — `netlify.toml` context override pattern

---

*Research completed: 2026-04-09*
*Ready for roadmap: yes*
