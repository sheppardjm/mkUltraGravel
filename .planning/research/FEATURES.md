# Feature Landscape: SEO & Social Sharing

**Domain:** Event website — SEO and social sharing layer
**Project:** MK Ultra Gravel
**Milestone:** SEO & Social Sharing
**Researched:** 2026-04-09

---

## Context: What Already Exists

The site already has:
- `<title>` and `<meta name="description">` on all pages
- `favicon.svg` (Penrose triangle)
- Two pages: `/` (homepage) and `/results` (redirect to ironpineomnium.com)
- Canonical domain target: `mkultragravel.com`
- Current deploy: `mkultragravel.netlify.app`
- Built with Astro 6 as a static site

---

## Table Stakes

Features users and crawlers expect. Missing any of these = broken social previews or degraded search performance.

### 1. Open Graph Tags (og:*)

| Tag | Required? | Value for This Site |
|-----|-----------|---------------------|
| `og:title` | Required | "MK Ultra Gravel" |
| `og:type` | Required | "website" |
| `og:image` | Required | Absolute URL to 1200×630 OG image |
| `og:url` | Required | `https://mkultragravel.com/` |
| `og:description` | Strongly recommended | 2-3 sentence event description |
| `og:site_name` | Recommended | "MK Ultra Gravel" |
| `og:image:width` | Recommended | 1200 |
| `og:image:height` | Recommended | 630 |
| `og:image:alt` | Recommended (accessibility) | Description of what the image shows |
| `og:locale` | Optional | `en_US` (default; can omit) |

**Complexity:** Low. These are static `<meta>` tags in `BaseLayout.astro` head.

**Why it matters:** Facebook, LinkedIn, Discord, Slack, WhatsApp, and iMessage all read OG tags to generate link previews. Without `og:image`, platforms fall back to any image on the page or show no preview.

**Implementation note:** All URLs must be absolute (`https://...`), not relative. Netlify/production canonical domain should be used, not the netlify.app subdomain.

---

### 2. Twitter / X Card Tags

| Tag | Required? | Value for This Site |
|-----|-----------|---------------------|
| `twitter:card` | Required | `summary_large_image` |
| `twitter:title` | Recommended | Same as og:title |
| `twitter:description` | Recommended | Same as og:description |
| `twitter:image` | Recommended | Same absolute URL as og:image |
| `twitter:image:alt` | Recommended | Same as og:image:alt |
| `twitter:site` | Optional | @handle if the event has one |

**Complexity:** Low. Three to five `<meta name="twitter:...">` tags alongside the OG tags.

**Why it matters:** X falls back to OG tags for title and description, but `twitter:card` must be explicitly set to get `summary_large_image` layout (large image above the tweet). Without it, X uses `summary` (small thumbnail), which is visually weak.

**Image specs for X:** 300×157 minimum to trigger large image; 1200×675 recommended (16:9). The 1200×630 OG image passes the minimum requirement and will display acceptably. A separate 1200×675 is marginally better for X but not worth maintaining two images.

---

### 3. OG Share Image (1200×630)

A single static image placed at `/og-image.jpg` (or `.png`).

**Platform requirements:**

| Platform | Required Size | Notes |
|----------|--------------|-------|
| Facebook | 1200×630 minimum | 1.91:1 aspect ratio; 8MB file limit |
| Twitter/X | 300×157 minimum, 1200×675 ideal | 5MB limit; 1200×630 displays fine |
| LinkedIn | 1200×627 minimum | 1.91:1 aspect ratio |
| Discord | 1200×630 | Same OG tags |
| Slack | 1200×630 | Same OG tags |
| WhatsApp | 1200×630 | Same OG tags |

**Universal target:** 1200×630 px, JPEG or PNG, under 1MB file size (under 300KB preferred for fast crawling).

**Content recommendation for this site:**
- Use a strong route photo as the background (full bleed)
- Overlay text: event name, date, location, distance
- Keep text inside the central 80% of the image — platforms crop edges
- Dark semi-transparent bar behind text for readability
- Do NOT rely on text alone — the photo is the hook

**Complexity:** Medium. Requires graphic design or a compositing script. If done manually in Figma/Photoshop, it's a one-time artifact. If done programmatically (Astro + Satori), it adds build complexity.

**Recommendation:** Static image. The site has one canonical share image. Dynamic generation (Satori, puppeteer-based) is over-engineered for a single-page event site.

---

### 4. JSON-LD Event Structured Data

Placed in a `<script type="application/ld+json">` block in `index.astro` (homepage only).

**Required fields (Google will not show rich result without these):**
- `name`
- `startDate` (ISO-8601)
- `location` (Place with address)

**Recommended fields (needed for full rich result display):**

```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "MK Ultra Gravel",
  "description": "100-mile gravel cycling event. Free ride with $10 suggested donation to Great Lakes Recovery Centers. Grinduro-style timed sectors. Mass start.",
  "startDate": "2026-06-07T07:00:00",
  "endDate": "2026-06-07T18:00:00",
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "location": {
    "@type": "Place",
    "name": "Marquette Fire Bell",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Marquette",
      "addressRegion": "MI",
      "addressCountry": "US"
    }
  },
  "image": "https://mkultragravel.com/og-image.jpg",
  "offers": {
    "@type": "Offer",
    "url": "https://www.bikereg.com/mk-ultra-gravel",
    "price": "0",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  },
  "organizer": {
    "@type": "Organization",
    "name": "MK Ultra Gravel",
    "url": "https://mkultragravel.com"
  }
}
```

**Field notes for this event:**
- `startDate`: Exact start time unknown — use `T07:00:00` as a placeholder; update when confirmed
- `endDate`: Estimated — 100 miles at typical gravel pace; use `T18:00:00` or omit if unknown
- `offers.price`: `"0"` (string, not integer) signals a free event to Google
- `eventAttendanceMode`: `OfflineEventAttendanceMode` — this is an in-person ride
- `eventStatus`: `EventScheduled` — the event is planned and on track
- `streetAddress`: Omit or use the Fire Bell location if a street address is available; Google does not require it

**Complexity:** Low. Copy-paste JSON into a `<script>` block, update with real values. Validate with Google Rich Results Test before launch.

---

### 5. Canonical URL Tag

```html
<link rel="canonical" href="https://mkultragravel.com/" />
```

**Why it matters:** The site will be accessible at both `mkultragravel.netlify.app` and `mkultragravel.com`. Without canonical, Google may index both and split link equity. The canonical tag tells Google which URL is the definitive one.

**Complexity:** Low. One `<link>` tag in `BaseLayout.astro`. Must use the production domain (`mkultragravel.com`), not the Netlify subdomain. If the canonical domain is not live at build time, this tag should still be present — Google will honor it once the domain resolves.

---

### 6. robots.txt

Minimal file in `public/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://mkultragravel.com/sitemap-index.xml
```

**Why it matters:** Without a robots.txt, crawlers still index the site, but the Sitemap directive helps Google discover pages faster. The `Allow: /` is explicit (some crawlers interpret missing Disallow as ambiguous).

**Optional — block AI training bots (2025 consideration):**

```
User-agent: GPTBot
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /
```

This is optional and a values/policy decision, not a technical requirement. The site owner should decide.

**Complexity:** Low. Static file, no build step needed.

---

### 7. sitemap.xml

Astro's official `@astrojs/sitemap` integration generates this automatically.

**Setup:**
```bash
npm install @astrojs/sitemap
```

```js
// astro.config.mjs
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://mkultragravel.com',
  integrations: [sitemap()],
});
```

The integration generates `sitemap-index.xml` and `sitemap-0.xml` at build time. The `site` field is mandatory — the integration throws an error without it.

**What gets included:** All pages in `src/pages/` that return HTML. The `/results` page (if it redirects) should be filtered out since it's not indexable content.

**Filter example:**
```js
sitemap({
  filter: (page) => !page.includes('/results'),
})
```

**Complexity:** Low. Install package, add to config, set `site` field. Five minutes.

---

## Differentiators

Features that go beyond baseline and improve event discovery or sharing quality.

### 1. Per-Page OG Tags (Results Page)

If the `/results` page eventually shows real results instead of redirecting, it warrants its own `og:title` and `og:description`. Currently it redirects, so this is a non-issue — but the `BaseLayout.astro` should accept props for per-page OG overrides so this is easy to add later.

**Implementation:** `BaseLayout.astro` accepts optional `ogTitle`, `ogDescription`, `ogImage` props; falls back to site defaults.

**Complexity:** Low. A minor prop-passing pattern in the layout.

---

### 2. Google Search Console Verification

After launch, submit the sitemap to Google Search Console via the URL Inspection tool and request indexing. This is not a code change — it is a post-launch operational step. However, planning for it means ensuring the `site` field in `astro.config.mjs` matches the canonical domain exactly.

**Complexity:** None (code). Low (operational). Zero development work required.

---

### 3. Event Image with Branded Route Photo

Rather than a generic event banner, using one of the 71 actual route photos from the MK Ultra Gravel course with the event name, date, and "Marquette, MI" overlaid creates a preview image that communicates the actual character of the ride. This is differentiated relative to the vast majority of cycling event sites that use generic imagery.

**Recommendation:** Use a landscape-format photo from the Upper Peninsula terrain (a wooded trail or rocky section works best). Keep the text overlay minimal — event name, date, distance. The terrain communicates region implicitly.

**Complexity:** Low (manual in Figma). Medium (automated with Sharp/Satori).

---

### 4. `og:type` "Event" Consideration

The OG protocol defines `og:type: "website"` as the default. There is no `event` type in the base OG spec. Using `website` is correct for the homepage. The JSON-LD `@type: "Event"` is the proper way to signal event type to Google — OG and JSON-LD serve different consumers (social platforms vs. search engines).

Do not set `og:type` to anything other than `website` for this site. The Event schema is in JSON-LD, not OG.

---

## Anti-Features

Features to deliberately not build for this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Dynamic OG image generation (Satori, Puppeteer) | Over-engineered for a single-page event site with one canonical share image. Adds build complexity, Node canvas dependencies, potential Netlify timeout issues | One static JPEG/PNG placed in `public/` |
| Twitter-specific image (1200×675 vs 1200×630) | The 45px height difference is invisible in practice. Two OG images to maintain for one social platform | Use 1200×630 for all platforms |
| Multiple sitemaps manually managed | Redundant — `@astrojs/sitemap` handles this automatically at build time | Use the official integration |
| Schema.org `SportsEvent` subtype | `SportsEvent` exists in Schema.org but Google does not use it for rich results — it treats it as a plain `Event`. Using it adds no value and may confuse validators | Use `@type: "Event"` |
| `meta name="robots"` tag explicitly set | The site wants to be indexed everywhere. An explicit `index,follow` tag is redundant. It only adds value when you need to BLOCK indexing | Omit entirely; robots.txt + sitemap are sufficient |
| Structured data for every page | Only the homepage has event content relevant for a rich result. `/results` redirects externally. Over-marking signals spam | JSON-LD on homepage only |
| Social sharing buttons (tweet this, share on Facebook) | Adds JS weight and third-party tracking for marginal benefit. Event sites spread by link sharing, not social buttons | Clean sharable URL + good OG tags are sufficient |
| Google Tag Manager / analytics for this milestone | Out of scope. Separate concern from SEO meta tags | Defer to a separate analytics phase if desired |

---

## Feature Dependencies

```
OG image (static file)
  └── og:image tag requires absolute URL
  └── twitter:image tag requires same URL
  └── JSON-LD image field requires same URL

Canonical domain (mkultragravel.com)
  └── All absolute URLs depend on this being decided and set
  └── astro.config.mjs `site` field must match
  └── robots.txt Sitemap directive must match
  └── canonical <link> tag must match

@astrojs/sitemap
  └── Requires `site` field in astro.config.mjs
  └── Requires build to run to generate XML files
  └── robots.txt should reference generated sitemap-index.xml URL
```

---

## MVP Recommendation

For this milestone, in priority order:

1. **Canonical URL tag** — one line, prevents domain-splitting issues from day one
2. **Open Graph tags** — four required tags; five minutes to implement; unlocks all social previews
3. **Twitter Card tags** — three tags; builds directly on OG tag work
4. **OG share image** — the only creative work; 1200×630 JPEG using a route photo
5. **JSON-LD Event schema** — copy-paste template above; update with real values; validate with Rich Results Test
6. **robots.txt** — static file in `public/`; include Sitemap directive
7. **sitemap.xml via @astrojs/sitemap** — install integration, set `site` field, done

Total implementation time estimate: 2-4 hours (dominated by OG image creation).

Post-launch operational step (no code): Submit sitemap to Google Search Console.

---

## Validation Checklist

Before shipping this milestone:

- [ ] OG tags verified with [opengraph.xyz](https://www.opengraph.xyz/) (paste URL, see preview)
- [ ] Twitter Card verified with [cards-dev.x.com/validator](https://cards-dev.x.com/validator)
- [ ] JSON-LD validated with [Google Rich Results Test](https://search.google.com/test/rich-results)
- [ ] JSON-LD validated with [Schema.org validator](https://validator.schema.org/)
- [ ] All absolute URLs use `https://mkultragravel.com/` (not `netlify.app`)
- [ ] OG image is under 1MB, 1200×630
- [ ] sitemap.xml accessible at `https://mkultragravel.com/sitemap-index.xml`
- [ ] robots.txt accessible at `https://mkultragravel.com/robots.txt`
- [ ] Sitemap URL in robots.txt matches generated sitemap filename

---

## Sources

- [The Open Graph protocol — ogp.me](https://ogp.me/) (HIGH confidence — authoritative spec)
- [Google Search Central — Event Structured Data](https://developers.google.com/search/docs/appearance/structured-data/event) (HIGH confidence — official)
- [X Developer Platform — Summary Card with Large Image](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/summary-card-with-large-image) (HIGH confidence — official)
- [Astro Docs — @astrojs/sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/) (HIGH confidence — official)
- [jsonld.com — Event example](https://jsonld.com/event/) (MEDIUM confidence — community reference verified against Google docs)
- [OG Image Size Guide 2026](https://myogimage.com/blog/og-image-size-meta-tags-complete-guide) (MEDIUM confidence — verified against platform specs)
- [Open Graph Image Sizes for Social Media — krumzi.com](https://www.krumzi.com/blog/open-graph-image-sizes-for-social-media-the-complete-2026-guide) (MEDIUM confidence)
- [OG Image Size Guide — ogpreview.app](https://ogpreview.app/guides/og-image-sizes) (MEDIUM confidence)
- [Canonical Tag Guide — Ahrefs](https://ahrefs.com/blog/canonical-tags/) (MEDIUM confidence)
- [robots.txt and SEO — Search Engine Land](https://searchengineland.com/robots-txt-seo-453779) (MEDIUM confidence)
