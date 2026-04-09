# Architecture Patterns — SEO & Social Sharing Integration

**Project:** MK Ultra Gravel
**Research date:** 2026-04-09
**Scope:** How SEO meta tags, OG image generation, structured data, and crawl infrastructure integrate with the existing Astro 6 static site
**Overall confidence:** HIGH — all findings sourced from direct codebase inspection and Astro official documentation

---

## Existing Architecture Baseline

### BaseLayout.astro — Current Head Structure

```
<head>
  charset, viewport
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="icon" href="/favicon.svg" />
  <Font cssVariable="--font-mono" />
  <Font cssVariable="--font-display" />
  <!-- Carto CDN preconnects (4 links) -->
  <slot name="head" />        ← per-page injection point already exists
</head>
```

Props accepted: `title?: string`, `description?: string`
Defaults: `"MK Ultra Gravel — June 7, 2026"` / `"100 miles of rowdy..."` description

**The head slot already exists and is already used.** `index.astro` uses it today to inject a `<link rel="preload">` for the hero image. This is the correct injection point for per-page OG and structured data.

### Pages Inventory

| Page | File | Current Title | Description |
|------|------|--------------|-------------|
| Homepage | `src/pages/index.astro` | default (from BaseLayout) | default |
| Results CTA | `src/pages/results.astro` | `"Results — MK Ultra Gravel"` | custom |

Two static pages, no dynamic routes, no `getStaticPaths()`. Sitemap generation is trivial.

### Prebuild Pipeline — Current Steps

```
1. parse-gpx.js            → public/data/route-data.json
2. resolve-annotations.js  → public/data/annotations.json
3. match-photos.js         → public/data/photos.json
4. generate-thumbnails.js  → public/images/thumbs/*.webp
5. assign-card-photos.js   → public/images/cards/*.webp
6. convert-hero.js         → public/tone/CIA-MKULTRA-IG_Page_01.webp (600px wide, q45)
7. convert-tone-images.js  → public/tone/*.webp
```

Sharp is already a devDependency. The pipeline is Node.js scripts called via `npm run prebuild` / `npm run dev` preamble.

### Public Assets Already Available

- `public/tone/CIA-MKULTRA-IG_Page_01.webp` — grayscale CIA document, hero background, 600px wide
- `public/images/` — 75 route photos, originals and thumbs
- `public/favicon.svg`
- `public/neucadia-logo.png`

### astro.config.mjs — Current State

```js
export default defineConfig({
  vite: { plugins: [tailwindcss()] },
  fonts: [ /* Space Mono, Special Elite */ ],
  // NO site property configured — required for sitemap
});
```

### netlify.toml — Current State

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

No existing `robots.txt` in `public/`.

---

## Integration Points for New Features

### 1. OG / Twitter Meta Tags — Where They Go

**Location:** `src/layouts/BaseLayout.astro` head, directly inline.

The cleanest approach for a two-page static site is to expand `BaseLayout.astro` to accept additional props and render OG/Twitter tags directly — no new component needed. BaseLayout already has the prop interface; just add fields.

**Expanded Props Interface:**
```astro
interface Props {
  title?: string;
  description?: string;
  ogImage?: string;       // absolute URL, e.g. "https://mkultragravel.com/og.jpg"
  ogType?: string;        // "website" (default)
  canonicalUrl?: string;  // absolute URL — defaults to Astro.url.href
}
```

**New tags to add inside `<head>`, before `<slot name="head" />`:**
```html
<!-- Canonical -->
<link rel="canonical" href={canonicalUrl ?? Astro.url.href} />

<!-- Open Graph -->
<meta property="og:type" content={ogType ?? "website"} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonicalUrl ?? Astro.url.href} />
<meta property="og:image" content={ogImage} />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:site_name" content="MK Ultra Gravel" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={ogImage} />
```

**Why inline in BaseLayout rather than a new `SEOMeta.astro` component:**
- Two pages. A dedicated component adds a file and an import for minimal benefit.
- All existing SEO tags (`<title>`, `<meta name="description">`) are already inline in BaseLayout.
- Consistency wins. A new component would split SEO concerns across two files.

**If a new component is preferred:** Create `src/components/SEOMeta.astro` that accepts the same props and renders all head tags. Render it inside `<head>` in BaseLayout. Either approach is valid — the inline approach is simpler for this scale.

### 2. OG Image Generation — Static Asset via Prebuild

**Recommendation: Generate a single static OG image in the prebuild pipeline using sharp. Do not use Satori.**

**Rationale:**
- The site has one meaningful OG image needed: the homepage share card.
- `results.astro` could share the same image or have a trivially different one.
- Sharp is already a devDependency. No new dependencies required.
- Satori adds ~500KB of dependencies (satori, @resvg/resvg-js or sharp-based SVG renderer), requires font embedding, and is engineering overkill for one static image.
- The existing CIA document hero image (`public/tone/CIA-MKULTRA-IG_Page_01.jpg`) is visually on-brand and already high-quality at source.

**Approach:**

Add a new script `scripts/generate-og-image.js` to the prebuild pipeline (as step 8, after convert-tone-images.js):

```
8. generate-og-image.js   → public/og.jpg (1200×630)
```

The script uses sharp to:
1. Resize the CIA document source to 1200×630 (crop/fill, match OG dimensions)
2. Optionally composite text overlay (event name, date) — but simple image crop may be sufficient given the site's aesthetic
3. Output to `public/og.jpg` at quality ~80 (target ~80-120KB)

**OG Image dimensions:** 1200×630 — this is the Facebook/Twitter/LinkedIn recommended size. Aspect ratio 1.91:1.

**Source image for OG:** `public/tone/CIA-MKULTRA-IG_Page_01.jpg` (original, not the 600px WebP) or a source from `images/tone/`. The original is 1374KB at full resolution — more than enough source material.

**Output path:** `public/og.jpg` — served as `https://mkultragravel.com/og.jpg`

**Idempotency:** Same pattern as convert-hero.js — check if file exists and is recent, skip if so.

**Alternative (simpler):** Manually create `public/og.jpg` as a static committed asset. No pipeline change needed. Appropriate if the OG image is designed once and won't change. For a gravel event with fixed branding, this is acceptable. The tradeoff: updating the OG image requires a manual design step rather than a pipeline regeneration.

**Recommendation: Start with a manually created static asset committed to `public/og.jpg`.** Add pipeline generation only if the image needs to vary by page or regenerate automatically. For this milestone, manual is faster and has no moving parts.

### 3. JSON-LD Structured Data — Where It Goes

**Location:** Injected via `<slot name="head" />` in BaseLayout — the same slot already used for per-page head injection.

**Pattern:** Create `src/components/StructuredData.astro` that accepts event data and renders a `<script type="application/ld+json">` tag.

```astro
---
// StructuredData.astro
interface Props {
  schema: Record<string, unknown>;
}
const { schema } = Astro.props;
---
<script type="application/ld+json" set:html={JSON.stringify(schema)} />
```

**Usage in `index.astro`:**
```astro
<BaseLayout ...>
  <link rel="preload" ... slot="head" />
  <StructuredData schema={eventSchema} slot="head" />
  <main>...</main>
</BaseLayout>
```

**Schema type:** `SportsEvent` (subtype of `Event`) — appropriate for a competitive cycling race.

**Required SportsEvent fields:**
```json
{
  "@context": "https://schema.org",
  "@type": "SportsEvent",
  "name": "MK Ultra Gravel",
  "startDate": "2026-06-07T09:00:00-05:00",
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
  "description": "100 miles of rowdy, technical gravel through Michigan's Upper Peninsula. Free ride. Mass start. No mercy.",
  "url": "https://mkultragravel.com",
  "image": "https://mkultragravel.com/og.jpg",
  "organizer": {
    "@type": "Organization",
    "name": "MK Ultra Gravel",
    "url": "https://mkultragravel.com"
  },
  "isAccessibleForFree": true,
  "sport": "Cycling"
}
```

**Data source:** Event metadata is static (date, location, name are hardcoded throughout the site). JSON-LD object is hardcoded in `index.astro` frontmatter — no dynamic data required. The `StructuredData.astro` component is just a rendering shell.

**Why a component vs inline `<script>` tag:** An Astro component allows `set:html` to bypass Astro's automatic HTML escaping of `<script>` contents. A raw inline `<script type="application/ld+json">` works fine in Astro too — the component pattern is cleaner and reusable if `results.astro` ever needs its own schema.

### 4. Sitemap and robots.txt — Crawl Infrastructure

**Sitemap approach: `@astrojs/sitemap` integration (official, v3.7.2)**

**Required change to `astro.config.mjs`:**
```js
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://mkultragravel.com',  // ADD THIS
  vite: { plugins: [tailwindcss()] },
  fonts: [...],
  integrations: [sitemap()],          // ADD THIS
});
```

This generates `dist/sitemap-index.xml` and `dist/sitemap-0.xml` at build time. Both pages (`/` and `/results/`) are included automatically.

**robots.txt approach: Static file in `public/`**

Create `public/robots.txt`:
```
User-agent: *
Allow: /
Sitemap: https://mkultragravel.com/sitemap-index.xml
```

Static file is simpler than a dynamic endpoint for a hardcoded canonical domain. The only downside (site URL getting out of sync) is not a real risk here — `mkultragravel.com` is fixed.

**Canonical URL:** Must add `site: 'https://mkultragravel.com'` to `astro.config.mjs`. This is required for sitemap AND enables `Astro.site` in components, which can be used to generate absolute canonical/OG URLs programmatically.

### 5. Canonical URLs — Implementation

**Pattern:** Use `Astro.site` (set via `site:` in astro.config.mjs) to derive canonical URLs:

In `BaseLayout.astro`:
```astro
const canonicalUrl = new URL(Astro.url.pathname, Astro.site).href;
```

This produces `https://mkultragravel.com/` for the homepage and `https://mkultragravel.com/results/` for the results page. No prop required — derived automatically from the page's own URL.

---

## New vs Modified Components

### Modified

| File | Change | Why |
|------|--------|-----|
| `src/layouts/BaseLayout.astro` | Add OG/Twitter/canonical meta tags | Central location for all head meta |
| `astro.config.mjs` | Add `site:` property and `sitemap()` integration | Required for sitemap generation and `Astro.site` |

### New

| File | Purpose | Notes |
|------|---------|-------|
| `src/components/StructuredData.astro` | Renders `<script type="application/ld+json">` | Thin shell, schema passed as prop |
| `public/robots.txt` | Crawl directives + sitemap pointer | Static file |
| `public/og.jpg` | Shared OG image for social sharing | 1200×630, manually created or pipeline-generated |

### Not Needed

| Item | Reason |
|------|--------|
| `src/components/SEOMeta.astro` | Inline expansion of BaseLayout.astro head is sufficient at 2-page scale |
| Satori / resvg-js | Overkill for a single static OG image |
| Dynamic `robots.txt.ts` endpoint | Static file is sufficient for a hardcoded domain |
| `astro-seo` third-party package | Adds a dependency for functionality that's 20 lines of markup |

---

## Data Flow — SEO Features

```
astro.config.mjs
  site: 'https://mkultragravel.com'
       │
       ├── Astro.site (available in all .astro files)
       │         │
       │         ├── BaseLayout.astro
       │         │    canonical = new URL(pathname, Astro.site).href
       │         │    og:url = canonical
       │         │    og:image = "https://mkultragravel.com/og.jpg"  (static)
       │         │
       │         └── @astrojs/sitemap integration
       │              generates sitemap-index.xml + sitemap-0.xml at build
       │
public/og.jpg  ←── manually created 1200×630 (or scripts/generate-og-image.js)
       │
       └── og:image, twitter:image in BaseLayout head


index.astro (frontmatter)
  eventSchema = { "@type": "SportsEvent", ... }  ← static object
       │
       └── <StructuredData schema={eventSchema} slot="head" />
                 │
                 └── <script type="application/ld+json" set:html={...} />
                      in <head> via BaseLayout slot


public/robots.txt  ←── static committed file
  Sitemap: https://mkultragravel.com/sitemap-index.xml
```

---

## Build Order

The recommended build order for implementing SEO & social sharing:

**Step 1 — Foundation (astro.config.mjs + robots.txt)**
Add `site:` property to astro.config.mjs and `@astrojs/sitemap` integration. Create `public/robots.txt`. This is the prerequisite for `Astro.site` to work in subsequent steps. Install `@astrojs/sitemap` as a dependency.

**Step 2 — OG Image**
Create `public/og.jpg` (manually designed or via a quick sharp script). Commit the asset. This unblocks all OG tag testing — you need an actual image URL to verify with Facebook/Twitter debuggers.

**Step 3 — BaseLayout Meta Tags**
Expand `BaseLayout.astro` with OG/Twitter/canonical tags. Wire up `Astro.site` for canonical URL derivation. Test both pages with social debugger tools.

**Step 4 — Structured Data**
Create `src/components/StructuredData.astro`. Add `SportsEvent` JSON-LD to `index.astro`. Validate with Google Rich Results Test.

Steps 2, 3, and 4 are independent once Step 1 is complete. They can be separate phases or one combined phase depending on how the roadmap structures it.

---

## Integration with Existing Patterns

**head slot usage (existing):** `index.astro` already uses `slot="head"` for a `<link rel="preload">`. Adding `<StructuredData slot="head" />` follows the exact same pattern.

**No changes to prebuild pipeline** unless the OG image generation is automated. The static committed asset approach requires zero pipeline changes.

**No new pages.** `sitemap-0.xml` is generated at build from the two existing pages. No new `.astro` files in `src/pages/` except potentially `src/pages/robots.txt.ts` (but the static file approach avoids even this).

**Netlify deployment:** No changes to `netlify.toml` required. The `dist/` directory already receives the `astro build` output; sitemap XML files land there automatically.

---

## Architecture Decision Record

| Decision | Choice | Rationale |
|----------|--------|-----------|
| OG/Twitter tags location | Inline in BaseLayout.astro | Consistency with existing `<title>` and `<description>` tags; 2-page scale doesn't justify a component |
| OG image generation | Static `public/og.jpg` committed asset | Sharp already available but Satori is overkill; manual design gives full control of the 1200×630 composition |
| OG image source material | CIA document hero image (CIA-MKULTRA-IG_Page_01.jpg) | On-brand, high-resolution source, already used as visual identity |
| JSON-LD component | `StructuredData.astro` (thin shell) | `set:html` pattern needed for unescaped JSON; component is reusable if `results.astro` ever needs schema |
| Sitemap | `@astrojs/sitemap` official integration | Official, maintained, zero-config for a static 2-page site |
| robots.txt | Static `public/robots.txt` | Domain is fixed; dynamic endpoint adds no value |
| Canonical URL derivation | `new URL(Astro.url.pathname, Astro.site)` | Uses `site:` config — single source of truth, no hardcoded URLs in templates |
| Schema type | `SportsEvent` (Schema.org) | Subtype of Event, appropriate for a competitive cycling race |

---

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| BaseLayout head slot usage | HIGH | Direct codebase inspection |
| `@astrojs/sitemap` config requirements | HIGH | Astro official docs |
| `Astro.site` / canonical URL pattern | HIGH | Astro official docs |
| JSON-LD `set:html` pattern | HIGH | Verified in Astro structured data articles |
| OG image dimensions (1200×630) | HIGH | Facebook/Twitter platform standards, well-established |
| SportsEvent schema appropriateness | MEDIUM | Schema.org spec + community guidance; Google's support for SportsEvent in rich results is less documented than Event |
| Static vs pipeline OG image | MEDIUM | Tradeoff judgment call based on site scale; either approach is valid |

---

## Sources

- Direct codebase inspection: `src/layouts/BaseLayout.astro`, `src/pages/index.astro`, `src/pages/results.astro`, `astro.config.mjs`, `package.json`, `netlify.toml`, `scripts/generate-data.js`, `scripts/convert-hero.js`
- Astro official docs: https://docs.astro.build/en/guides/integrations-guide/sitemap/
- Schema.org SportsEvent: https://schema.org/SportsEvent
- Astro JSON-LD patterns: https://stephen-lunt.dev/blog/astro-structured-data/
- OG image approaches in Astro: https://arne.me/blog/static-og-images-in-astro
