# Domain Pitfalls

**Domain:** SEO & social sharing additions to an existing Astro 6 static site on Netlify
**Project:** MK Ultra Gravel — SEO & Social Sharing milestone
**Researched:** 2026-04-09
**Confidence:** HIGH (primary sources: Astro official docs, Google Search Central, ogp.me, Facebook
developer docs, Netlify Support forums — all verified via Context7 or direct WebFetch)

---

## Context

This file covers pitfalls specific to ADDING SEO and social sharing to an existing Astro 6 static
site. The site is currently deployed at `mkultragravel.netlify.app` and transitioning to
`mkultragravel.com`. It has two pages: `/` and `/results`. It uses pure static output (`output:
"static"` is the Astro default — no SSR).

The current `astro.config.mjs` has **no `site` field**. This is the single most important fact in
this research: every pitfall in this file either directly stems from this missing field or requires
it to be set before it can be resolved.

**The existing BaseLayout.astro has:**
- `<title>` tag (hardcoded default)
- `<meta name="description">` tag (hardcoded default)
- A `<slot name="head">` for page-level overrides
- No OG tags
- No canonical link
- No structured data

---

## Critical Pitfalls

Mistakes that silently break SEO or social sharing without any build error.

---

### Pitfall 1: Missing `site` in astro.config.mjs Breaks Everything Downstream

**What goes wrong:**
Astro's `site` configuration option is currently not set in `astro.config.mjs`. This single
omission cascades into failures across every SEO feature being added:

1. `@astrojs/sitemap` cannot generate `sitemap.xml` at all — the integration throws a build
   error without `site` set
2. Canonical URLs constructed via `new URL(Astro.url.pathname, Astro.site)` silently produce
   `undefined` — the resulting `<link rel="canonical">` tag renders as `href="undefined"` in
   the HTML, which is worse than no canonical tag at all
3. `og:url` assembled the same way produces `undefined` in the meta tag
4. The `robots.txt` Sitemap directive pointing to the sitemap's absolute URL cannot be constructed

**Why it happens:**
`site` is optional for a basic Astro build — the site still compiles and deploys without it.
Developers add `@astrojs/sitemap` and SEO tags, run `npm run build`, see no errors, deploy,
and discover on inspection that canonical and og:url tags contain `undefined` or blank values.

**Warning signs:**
- `sitemap-index.xml` does not appear in the `dist/` output after adding `@astrojs/sitemap`
- View-source on the deployed page shows `<link rel="canonical" href="undefined">` or `href=""`
- Build output contains: `Warning: The @astrojs/sitemap integration requires the site property to be set`

**Prevention:**
Set `site` in `astro.config.mjs` as the very first step before any SEO work. The value must be
the final production URL including protocol, no trailing slash:

```javascript
export default defineConfig({
  site: 'https://mkultragravel.com',
  // ... rest of config
});
```

This must be set to the **custom domain** (`mkultragravel.com`), not the Netlify subdomain
(`mkultragravel.netlify.app`). Setting it to the `.netlify.app` URL and updating it later causes
all generated canonical URLs and sitemaps to be wrong in the interim and requires rebuilding the
URL claim in Google Search Console.

**Phase:** SEO foundations phase — must be the first change in any SEO implementation plan.
**Confidence:** HIGH — confirmed by direct inspection of `astro.config.mjs` (field absent) and
Astro official configuration reference documentation.

---

### Pitfall 2: `og:image` with a Relative Path Fails on Every Social Platform

**What goes wrong:**
The Open Graph specification requires `og:image` to be an **absolute URL**. If the value is
a relative path like `/images/og-cover.jpg`, every social platform (Facebook, LinkedIn, Twitter/X,
iMessage, Slack) will fail to load the image and show the link preview with no image. The link
preview appears as plain text with title and description only — no visual thumbnail.

This failure is silent: the tag renders in HTML without error, browsers display the page normally,
and Lighthouse does not catch it. The failure is only visible when sharing the URL on a social
platform.

**Why it happens:**
Astro's image handling produces paths like `/_astro/og-cover.abc123.jpg` (hashed) for processed
images, or `/images/og-cover.jpg` for public folder images. These are correct for `<img src>`
tags, which are resolved relative to the page. `og:image` is read by remote crawlers that do not
have a base URL context — they need the full URL.

The pattern `<meta property="og:image" content={ogImagePath} />` where `ogImagePath` is an
Astro image import result will produce a relative path.

**Warning signs:**
- Paste the URL into [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) — image shows as blank or missing
- `og:image` value in view-source starts with `/` instead of `https://`
- Link preview on iMessage or Slack shows title but no image

**Prevention:**
Always construct `og:image` as an absolute URL using `Astro.site`:

```astro
---
const ogImageUrl = new URL('/images/og-cover.jpg', Astro.site).href;
---
<meta property="og:image" content={ogImageUrl} />
```

This requires `site` to be set in `astro.config.mjs` (see Pitfall 1).

For the OG image file itself, use `/public/images/og-cover.jpg` so it is served at a predictable,
non-hashed path. Do not use `astro:assets` image optimization for the OG image — processed images
get hashed filenames (`/_astro/og.abc123.jpg`) which change on every rebuild, breaking social
platform caches for previously shared URLs.

**Phase:** OG image implementation phase.
**Confidence:** HIGH — confirmed by ogp.me protocol specification and Facebook developer documentation.

---

### Pitfall 3: OG Image Cache Is Effectively Permanent on Several Platforms

**What goes wrong:**
After the first time a URL is shared on a social platform, the platform crawls the `og:image` URL
and caches it. If the OG image is later updated at the **same URL path**, the platform continues
to show the old image — sometimes for months, sometimes permanently.

Platform-specific behavior:
- **Facebook/Meta**: Caches OG data indefinitely. Requires manual "Scrape Again" in the Sharing
  Debugger tool to force a refresh.
- **Telegram**: Cache is effectively permanent for URLs that have been shared. It does not
  self-expire.
- **WhatsApp**: Caches both locally and in cloud storage. Cannot be force-expired without changing
  the URL.
- **Slack**: Caches unfurls for 7 days. Does not follow redirects for `og:image` URLs.
- **LinkedIn**: Provides a Post Inspector tool for manual cache clearing.

**Why it happens:**
Social platforms aggressively cache OG data to reduce server load and provide fast link preview
rendering. This is by design — it is not a bug.

**Warning signs:**
- Updated OG image is visible when viewing the image URL directly, but social shares still show
  the old image
- Facebook Sharing Debugger shows the old cached data

**Prevention:**
1. Get the OG image right before the first public share. This is the most effective prevention.
2. Store the OG image at a stable, intentionally versioned path: `/images/og-cover.jpg` (not
   `/images/og-cover-v2.jpg` or a hashed path). This makes future deliberate updates possible.
3. If the image must change post-launch, change the `og:image` URL (not just the file content)
   — add a version query param or rename the file. This forces platforms to re-crawl a new URL.
4. For Facebook, use the [Sharing Debugger](https://developers.facebook.com/tools/debug/) to
   trigger a re-scrape after any intentional update.
5. Add explicit dimensions `og:image:width` and `og:image:height` — Facebook pre-caches the image
   before first share when dimensions are declared, preventing blank-image first-share failures.

**Phase:** OG image implementation phase.
**Confidence:** HIGH — confirmed by Facebook developer documentation and ogp.me spec.

---

### Pitfall 4: `mkultragravel.netlify.app` Stays Live After Custom Domain — Duplicate Content

**What goes wrong:**
When a custom domain is connected to a Netlify site, the original `.netlify.app` subdomain does
NOT get redirected automatically. It remains fully accessible and serves the same content.

This creates two live URLs serving identical content:
- `https://mkultragravel.netlify.app/`
- `https://mkultragravel.com/`

Search engines (Google in particular) may index both. If Google selects the `.netlify.app` URL
as the canonical, all link equity from backlinks to `mkultragravel.com` is split. A site with
canonical tags pointing to `mkultragravel.com` may not be enough — Google has been documented
choosing its own canonical over a declared one if the `.netlify.app` URL is linked to or indexed.

**Why it happens:**
Netlify's DNS configuration connects custom domains without disabling the original subdomain.
This is by design (the subdomain is used internally for DNS resolution). Many developers assume
connecting a custom domain implies the old URL redirects.

**Warning signs:**
- `https://mkultragravel.netlify.app/` loads the full site (not a 404 or redirect)
- Google Search Console shows both URLs indexed
- `site:mkultragravel.netlify.app` in Google returns results

**Prevention:**
Add a wildcard 301 redirect from the Netlify subdomain to the custom domain in `/public/_redirects`:

```
https://mkultragravel.netlify.app/* https://mkultragravel.com/:splat 301!
```

The `!` suffix makes the redirect "force" — it overrides any other redirect rules. The `:splat`
preserves the path (e.g., `/results` redirects to `mkultragravel.com/results`).

This redirect rule must be in the `_redirects` file inside the Astro `public/` folder so it is
copied to `dist/` and deployed by Netlify. Do not put it only in `netlify.toml` — the `_redirects`
file takes effect on the source URL (`.netlify.app`), which is what you want.

This redirect must be deployed BEFORE submitting the sitemap to Google Search Console.

**Phase:** Domain consolidation phase — prerequisite to any Google Search Console configuration.
**Confidence:** HIGH — confirmed by Netlify Support forum (direct thread on this exact issue) and
Netlify DNS documentation confirming `.netlify.app` stays live after custom domain connection.

---

### Pitfall 5: Trailing Slash Inconsistency Between Astro Config and Canonical Tags

**What goes wrong:**
Astro's `trailingSlash` option defaults to `'ignore'`, which means Astro will serve both
`mkultragravel.com/results` and `mkultragravel.com/results/` as valid, live URLs.

If canonical tags are written as `https://mkultragravel.com/results` (no trailing slash) but some
links in the site or in external backlinks use `https://mkultragravel.com/results/` (with slash),
Google sees two distinct URLs with identical content, even with canonical tags — because canonicals
are signals, not directives.

The `@astrojs/sitemap` integration generates sitemap entries based on the URLs Astro actually
produces during build. With `build.format: 'directory'` (the default), Astro generates
`results/index.html`. The sitemap will emit `https://mkultragravel.com/results/` (with trailing
slash) because the directory structure implies it. If canonical tags manually emit
`https://mkultragravel.com/results` (without slash), the canonical and sitemap disagree — a
contradiction Google will resolve by ignoring one of them.

**Why it happens:**
Developers write canonical URLs by hand as string templates without checking what `@astrojs/sitemap`
actually generates, or without configuring `trailingSlash` consistently.

**Warning signs:**
- Sitemap entries end with `/` but canonical tags in page source do not (or vice versa)
- Astro generates `results/index.html` (directory mode) but canonicals say `/results`
- `Astro.url.pathname` returns `/results/` (with slash) during build but canonical says `/results`

**Prevention:**
Pick one convention and enforce it everywhere:

1. Set `trailingSlash: 'never'` in `astro.config.mjs` to redirect away from slash URLs and
   produce canonical paths without slashes. **Or** leave `trailingSlash` at default `'ignore'`
   and always use `Astro.url.pathname` to construct canonicals (which will include the trailing
   slash that Astro's directory build format produces).

2. Construct canonical URL from `Astro.url` instead of hardcoding strings:
   ```astro
   const canonicalURL = new URL(Astro.url.pathname, Astro.site).href;
   ```
   This way the canonical always matches what Astro actually serves, including whatever
   trailing-slash convention is in effect.

3. After adding the sitemap, view the generated `dist/sitemap-0.xml` and confirm its URLs match
   the canonical tags in the generated HTML exactly (character for character).

**Phase:** SEO foundations phase — set `trailingSlash` before any canonical URLs are hardcoded.
**Confidence:** HIGH — confirmed by Astro configuration reference documentation and Astro GitHub
issue #11575 (sitemap URL and Astro.url mismatch with `build.format: file`).

---

## Moderate Pitfalls

Mistakes that cause validation failures, incomplete rich results, or degraded social sharing.

---

### Pitfall 6: JSON-LD Event Schema Missing Required Fields Silently Fails Rich Results

**What goes wrong:**
Google's Rich Results Test validates Event structured data against required fields. If any
required field is missing or malformed, the event does not qualify for rich results (the enhanced
Google Search card with date, location, and ticket link). The page is not penalized — it simply
renders as a plain search result. There is no console error and no build warning.

Google's required fields for Event structured data:
- `name` — full event title
- `startDate` — ISO-8601 datetime (`2026-06-07T08:00:00-05:00` format; time zone offset required
  if the event has a known start time)
- `location.@type` — must be `"Place"`
- `location.name` — venue name (not the event name — a common mistake is putting the event name here)
- `location.address.@type` — must be `"PostalAddress"`
- `location.address.addressLocality` — city
- `location.address.addressRegion` — state/region
- `location.address.addressCountry` — two-letter country code

**Common mistakes for this specific site:**
1. Using `SportsEvent` as `@type` without verifying Google's rich results support — Google's
   event structured data documentation covers the generic `Event` type; `SportsEvent` inherits
   from it and is schema.org-valid, but Google's Rich Results Test documentation does not
   explicitly list `SportsEvent` as a supported type for the Events experience. Use
   `"@type": "Event"` unless testing confirms `SportsEvent` works.
2. Setting `startDate` as `2026-06-07` (date-only) without time — Google flags this as a warning
   if a more specific time is available. For an 8am mass-start event, use the full datetime with
   UTC offset.
3. Setting midnight (`T00:00:00`) as the start time because no time is known — Google's
   documentation explicitly flags this as a common mistake.
4. Putting the event name (`MK Ultra Gravel`) in `location.name` instead of the actual venue
   name (`Escanaba, MI` or the specific start location).

**Warning signs:**
- Google Rich Results Test shows "Errors" tab with entries (not just "Warnings")
- Search Console "Events" report shows "Invalid items" count increasing
- Rich result preview in Rich Results Test does not render a date/location card

**Prevention:**
1. Run Google's [Rich Results Test](https://search.google.com/test/rich-results) on the
   production URL after deployment — not just on the local development URL
2. Validate JSON-LD syntax with a linter before deploying — unescaped quotes and missing commas
   cause silent JSON parse failures (the entire `<script type="application/ld+json">` block is
   ignored without any browser console error in some parsers)
3. Use `new URL(Astro.url.pathname, Astro.site).href` as the `url` property value in JSON-LD —
   do not hardcode the URL
4. Include `endDate` and `eventStatus` (`"EventScheduled"`) as recommended fields even though
   they are not strictly required — they enable richer display in search results

**Phase:** Structured data implementation phase.
**Confidence:** HIGH — confirmed by Google Search Central event structured data documentation.

---

### Pitfall 7: Duplicate `<meta>` Tags from Layout + Page-Level OG Tags

**What goes wrong:**
The existing `BaseLayout.astro` renders `<meta name="description">` unconditionally. If a page
adds its own `<meta name="description">` via the `<slot name="head">`, HTML will contain two
`<meta name="description">` tags. Most parsers take the first occurrence; some take the last.
The behavior is undefined.

For OG tags, if `BaseLayout.astro` adds a default `og:title` and `og:description`, and a page
also adds its own `og:title` via the head slot, both tags appear in the HTML. Facebook's crawler
takes the first occurrence; Twitter's crawler behavior varies.

This is especially risky for `/results` — a page that needs entirely different OG tags than the
homepage, both of which are rendered by the same `BaseLayout`.

**Why it happens:**
The layout provides defaults as a safety net. Pages that add specific overrides via the head slot
do not remove the layout's default — they stack on top of it.

**Prevention:**
In `BaseLayout.astro`, control all meta/OG tags exclusively from props. Do not render any default
`<meta>` tags unconditionally if the page can also supply them through a slot. Instead:

```astro
---
interface Props {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
}
const {
  title,
  description,
  ogTitle = title,
  ogDescription = description,
  ogImage,
  ogType = 'website',
} = Astro.props;
---
```

All OG tags are emitted once, controlled by props, with fallbacks baked into the destructuring.
The head slot is reserved for non-OG additions (e.g., JSON-LD structured data, page-specific
preloads) that do not conflict with what the layout renders.

**Phase:** SEO foundations phase — refactor BaseLayout before adding any OG tags.
**Confidence:** HIGH — confirmed by direct inspection of `BaseLayout.astro` (current meta tag
rendering pattern) and HTML specification (duplicate meta tag behavior is undefined).

---

### Pitfall 8: `robots.txt` Not in `public/` Is Not Deployed to Netlify

**What goes wrong:**
Netlify serves the contents of the `dist/` directory (Astro's build output). Astro copies files
from the `public/` directory into `dist/` verbatim. A `robots.txt` file placed anywhere other
than `public/robots.txt` will not appear at `mkultragravel.com/robots.txt`.

Specifically, if `robots.txt` is generated by a build script and written to the project root
or to `src/`, it will not be deployed. The URL `mkultragravel.com/robots.txt` returns 404, and
Googlebot falls back to allowing all crawling (404 is treated as allow-all, not block-all).

The more impactful issue: a `robots.txt` that does not include a `Sitemap:` directive means
Google must wait for Search Console sitemap submission to find the sitemap, rather than discovering
it automatically during crawl.

**Warning signs:**
- `curl https://mkultragravel.com/robots.txt` returns 404 after deploy
- Google Search Console shows "Couldn't fetch" in the robots.txt tester
- Sitemap is not discovered until manually submitted

**Prevention:**
1. Create `public/robots.txt` manually as a static file — not via a build script — since its
   content does not depend on build-time data:

```
User-agent: *
Allow: /

Sitemap: https://mkultragravel.com/sitemap-index.xml
```

2. Verify `dist/robots.txt` exists after running `npm run build` locally before the first deploy
3. The `Sitemap:` directive URL must use the custom domain, not `.netlify.app` — another reason
   `site` in `astro.config.mjs` must be set to the production domain first

**Phase:** Crawl infrastructure phase.
**Confidence:** HIGH — confirmed by Astro documentation (public folder behavior), Netlify
deployment documentation (dist/ is the publish directory), and Netlify Support forum thread on
robots.txt 404 issues.

---

### Pitfall 9: Netlify Deploy Previews Are Indexable Without Explicit Block

**What goes wrong:**
Netlify automatically generates a Deploy Preview URL for every pull request (e.g.,
`https://deploy-preview-42--mkultragravel.netlify.app/`). These preview URLs are publicly
accessible and, if discovered, are crawlable and indexable by search engines.

Deploy previews can "make it out into the wild web" through:
- GitHub PR links visible in public repos
- Slack or email notifications that surface the preview URL
- External contributors sharing preview links

If a deploy preview URL gets indexed and then disappears (Netlify deletes old deploy previews),
Googlebot encounters 404s and may temporarily penalize the domain's crawl budget.

**Why it happens:**
Netlify does not inject `noindex` headers or a restrictive `robots.txt` on deploy previews by
default. This is a manual configuration.

**Warning signs:**
- `site:deploy-preview--mkultragravel.netlify.app` in Google returns results
- Google Search Console shows indexed pages with deploy-preview URLs in the URL prefix

**Prevention:**
Add a context-specific build command in `netlify.toml` that overwrites `robots.txt` on preview
builds:

```toml
[context.deploy-preview]
  command = "npm run build && echo 'User-agent: *\nDisallow: /' > dist/robots.txt"
```

This uses the production build but then replaces `robots.txt` with a full block. Production
builds use the normal `public/robots.txt` unchanged.

**Phase:** Crawl infrastructure phase — add before the first PR is opened on the repo.
**Confidence:** HIGH — confirmed by Netlify support forum and community documentation on
deploy preview indexing prevention.

---

### Pitfall 10: `twitter:card` Tag Missing Causes Large OG Image to Show as Small Summary

**What goes wrong:**
Twitter/X falls back to OG tags if no `twitter:` tags are present. Specifically, Twitter will
inherit `og:title`, `og:description`, and `og:image` from the OG meta tags. However, without
a `twitter:card` tag, Twitter defaults to showing the `summary` card format — a small thumbnail
in the corner of a text preview — regardless of the `og:image` size.

For a 1200x630px OG image (which is the recommended size), the lack of `twitter:card:
summary_large_image` means the image is rendered small and cropped into a square, losing
almost all visual impact.

**Why it happens:**
Developers add full OG tag sets and assume Twitter will use them at full size. The OG spec has
no equivalent for Twitter's `summary_large_image` card type — it is Twitter-only.

**Warning signs:**
- [Twitter Card Validator](https://cards-dev.twitter.com/validator) shows the "Summary" card
  type instead of "Summary Large Image"
- Link preview in Twitter shows a small square thumbnail instead of a banner-style image

**Prevention:**
Add exactly two Twitter-specific tags alongside the OG tags (the rest is inherited from OG):

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@mkultragravel" />
```

`twitter:card` is the critical one — without it, the large image format does not activate.
`twitter:site` is recommended for attribution but optional.

**Phase:** OG/social meta tag implementation phase.
**Confidence:** HIGH — confirmed by Twitter/X developer documentation on Cards markup.

---

## Minor Pitfalls

Mistakes that cause incomplete results or require cleanup after launch.

---

### Pitfall 11: Sitemap Includes `/results` as a Primary Destination (It Is a Redirect Page)

**What goes wrong:**
The `/results` page is a redirect-out page — it tells users that results are hosted on
ironpineomnium.com and links there. Including `/results` as a standard sitemap entry signals
to Google that it is a meaningful destination page, which it is not.

Google may visit `/results`, see thin content (a few sentences and a link), and apply a thin-
content signal to the domain. This is low risk for a two-page site but is architecturally wrong
— sitemaps should list pages Google should index and rank for search queries.

**Prevention:**
Either:
1. Exclude `/results` from the sitemap by adding it to `@astrojs/sitemap`'s `filter` option:
   ```javascript
   sitemap({
     filter: (page) => !page.includes('/results')
   })
   ```
2. Or add `<meta name="robots" content="noindex, follow">` to `results.astro` and let it be
   excluded from Google's index automatically (and consequently ignored in sitemap scoring)

Option 2 is more correct — if `/results` should not appear in Google search results (since its
only content is "go to ironpineomnium.com"), `noindex` is the right signal.

**Phase:** Crawl infrastructure phase.
**Confidence:** MEDIUM — based on Google's thin-content guidance and sitemap best practices.
No single official source explicitly covers this exact scenario.

---

### Pitfall 12: JSON-LD Block in `<head>` with Invalid JSON Silently Fails

**What goes wrong:**
`<script type="application/ld+json">` blocks are parsed independently by each platform
(Google, Bing, social crawlers). If the JSON is malformed — unescaped quotes in string values,
missing commas, trailing commas, multi-line template literals with special characters — the
entire block is silently ignored. There is no browser console error, no build error, and no
404 — the page renders normally and the structured data simply does not exist.

This is particularly risky when the JSON-LD block is constructed dynamically in Astro using
template literals with data from `route-data.json` (elevation gain, mileage, etc.) or with
the event description (which may contain apostrophes or special characters).

**Warning signs:**
- Google Rich Results Test shows "No structured data detected" despite the `<script>` tag
  being present in view-source
- JSON validator (e.g., `jsonlint.com`) reports errors when the block is extracted and pasted

**Prevention:**
1. Use `JSON.stringify()` to serialize the structured data object — never construct JSON-LD via
   string concatenation or template literals:
   ```astro
   ---
   const structuredData = {
     "@context": "https://schema.org",
     "@type": "Event",
     "name": "MK Ultra Gravel",
     // ...
   };
   ---
   <script type="application/ld+json" set:html={JSON.stringify(structuredData)} />
   ```
   `JSON.stringify()` handles all escaping automatically. `set:html` in Astro renders the
   string without additional HTML encoding.
2. Validate the output JSON-LD using Google's Rich Results Test on the production URL, not
   just a local dev server
3. Do not include raw user-generated content or data from external sources in JSON-LD without
   sanitization

**Phase:** Structured data implementation phase.
**Confidence:** HIGH — confirmed by Astro documentation (`set:html` usage) and structured data
community documentation.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| SEO foundations | `site` not set in astro.config — all downstream SEO breaks silently | Set `site: 'https://mkultragravel.com'` as first change |
| SEO foundations | `trailingSlash` not set — canonical and sitemap URLs may disagree | Set `trailingSlash: 'never'` or use `Astro.url.pathname` consistently |
| SEO foundations | Duplicate meta tags from layout + page slot | Refactor BaseLayout to emit OG tags from props only |
| OG image | Relative path in `og:image` — fails silently on all platforms | Use `new URL('/images/og.jpg', Astro.site).href` |
| OG image | Hashed filename (`_astro/og.abc123.jpg`) breaks social cache on rebuild | Store OG image in `public/` at a stable non-hashed path |
| OG image | Cache effectively permanent on Telegram/WhatsApp | Get image right before first public share; never change path |
| OG image | `og:image:width/height` missing — Facebook may blank on first share | Always declare dimensions alongside `og:image` |
| Social meta | `twitter:card` missing — large image appears as small thumbnail | Always add `twitter:card: summary_large_image` |
| JSON-LD | String-concatenated JSON breaks silently — no build error | Use `JSON.stringify()` + `set:html` |
| JSON-LD | `location.name` = event name instead of venue name | Venue name is required; event name goes in `name` |
| JSON-LD | `startDate` without time zone offset — Google flags as warning | Use `2026-06-07T08:00:00-05:00` format |
| Sitemap | `@astrojs/sitemap` requires `site` to be set — fails silently | Set `site` first |
| Sitemap | `/results` as thin-content page in sitemap | Filter it out or add `noindex` to the page |
| robots.txt | File not in `public/` — not deployed | Always place at `public/robots.txt` |
| robots.txt | Missing `Sitemap:` directive — sitemap undiscoverable until manually submitted | Always include `Sitemap: https://mkultragravel.com/sitemap-index.xml` |
| Deploy previews | Preview URLs indexable by default | Add `netlify.toml` context override to block preview crawling |
| Domain transition | `.netlify.app` stays live — duplicate content | Add `_redirects` 301 before Google Search Console submission |

---

## Validation Checklist (Post-Implementation)

Run these checks after the SEO milestone is deployed:

- [ ] `https://mkultragravel.com/robots.txt` returns 200 with correct content (not 404)
- [ ] `https://mkultragravel.com/sitemap-index.xml` returns 200
- [ ] `https://mkultragravel.netlify.app/` redirects 301 to `https://mkultragravel.com/`
- [ ] View-source on `/` shows `<link rel="canonical" href="https://mkultragravel.com/">` (not `undefined`)
- [ ] View-source shows `og:image` value starts with `https://mkultragravel.com/`
- [ ] `og:image:width` and `og:image:height` are present alongside `og:image`
- [ ] `twitter:card` is `summary_large_image`
- [ ] Facebook Sharing Debugger loads the OG image correctly
- [ ] Google Rich Results Test shows no errors (warnings are acceptable)
- [ ] JSON-LD block passes a JSON linter with no syntax errors

---

## Sources

- [Astro Configuration Reference — `site` option](https://docs.astro.build/en/reference/configuration-reference/) — HIGH confidence, official docs, verified via WebFetch
- [@astrojs/sitemap integration guide](https://docs.astro.build/en/guides/integrations-guide/sitemap/) — HIGH confidence, official docs, verified via WebFetch
- [The Open Graph protocol (ogp.me)](https://ogp.me/) — HIGH confidence, official spec, verified via WebFetch
- [Facebook developer docs: OG image requirements](https://developers.facebook.com/docs/sharing/webmasters/images/) — HIGH confidence, verified via WebFetch
- [Google Search Central: Event structured data](https://developers.google.com/search/docs/appearance/structured-data/event) — HIGH confidence, verified via WebFetch
- [Schema.org: SportsEvent](https://schema.org/SportsEvent) — HIGH confidence, official spec, verified via WebFetch
- [Netlify Support: Netlify.app duplicate content SEO issue](https://answers.netlify.com/t/netlify-com-netlify-app-potential-duplicate-content-seo-issue/22726) — HIGH confidence, Netlify official support, verified via WebFetch
- [Netlify: External DNS configuration docs](https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns/) — HIGH confidence, official docs, verified via WebFetch
- [Netlify Support: Canonical URL overriding](https://answers.netlify.com/t/in-production-netlify-keeps-overriding-my-canonical-url-that-i-have-set-up-in-astro-config/139110) — HIGH confidence, confirmed via WebFetch (SSR-specific; does not affect this static site)
- [tempertemper.net: Preventing deploy preview indexing](https://www.tempertemper.net/blog/stop-search-indexing-for-netlify-deploy-previews-and-branch-deploys) — MEDIUM confidence, community source, verified via WebFetch
- [Twitter/X developer docs: Cards markup](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/markup) — HIGH confidence, official docs
- [Astro GitHub issue #11575: Sitemap URL and Astro.url mismatch](https://github.com/withastro/astro/issues/11575) — HIGH confidence, official repo
- Direct codebase inspection: `astro.config.mjs` (no `site` field confirmed), `BaseLayout.astro` (meta tag pattern confirmed), `public/` directory (no robots.txt confirmed), `package.json` (Astro 6.1.1, static output) — HIGH confidence
