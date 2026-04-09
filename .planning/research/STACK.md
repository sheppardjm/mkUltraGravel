# Technology Stack — SEO & Social Sharing Milestone

**Project:** MK Ultra Gravel
**Milestone:** SEO & Social Sharing
**Researched:** 2026-04-09
**Scope:** NEW stack decisions only. Existing Astro 6.1.1 + Tailwind v4 + Leaflet + Chart.js + PhotoSwipe + sharp 0.34.5 stack is validated and unchanged.
**Confidence:** HIGH — primary findings from Astro official docs, @astrojs/sitemap GitHub changelog, npm registry, and direct codebase inspection.

---

## Executive Summary

This milestone adds four SEO capabilities to a 2-page static site. Three of the four require no new npm dependencies at all — they are pure Astro configuration or inline HTML. The fourth (OG image generation) has a choice between zero-dependency (static pre-made file) and a sharp-based build pipeline. The right choice for this project is the static pre-made file approach, since there are only two pages and sharp is already installed.

**Bottom line for each feature:**

| Feature | Approach | New dependency? |
|---------|----------|-----------------|
| Open Graph + Twitter Card meta tags | Props on `BaseLayout.astro` + inline `<meta>` tags | None |
| OG share image | Pre-process one route photo with existing sharp, serve from `public/` | None (sharp already installed) |
| JSON-LD Event structured data | `<script type="application/ld+json">` in `BaseLayout.astro` head slot | None |
| robots.txt | Static file in `public/robots.txt` | None |
| sitemap.xml | `@astrojs/sitemap` integration + `site` in astro.config.mjs | `@astrojs/sitemap@3.7.2` |
| Canonical URLs | `Astro.site` + `Astro.url.pathname` in `BaseLayout.astro` | None (needs `site` in config) |

**One new dependency total: `@astrojs/sitemap@3.7.2`.**

---

## The One New Dependency: @astrojs/sitemap

### Why it's needed

Astro does not auto-generate `sitemap.xml`. The `@astrojs/sitemap` integration is the official first-party solution maintained in the Astro monorepo. It crawls all statically-generated routes at build time and emits `sitemap-index.xml` + `sitemap-0.xml` into the output directory. This is the canonical approach documented in Astro's official integration guide.

### Version

**Current: 3.7.2** — confirmed via the package's GitHub CHANGELOG.md in the withastro/astro monorepo and corroborated by npm registry data (last published April 2026).

### Installation

```bash
npx astro add sitemap
```

This command installs the package and auto-patches `astro.config.mjs` to add the integration. Alternatively:

```bash
npm install @astrojs/sitemap
```

Then manually update `astro.config.mjs`.

### Configuration required in astro.config.mjs

The integration requires the `site` option — without it, it cannot construct absolute URLs:

```js
import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://mkultragravel.com",
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
  fonts: [ /* unchanged */ ],
});
```

The `site` value of `"https://mkultragravel.com"` is the canonical production domain (not the Netlify subdomain). Setting this also enables `Astro.site` throughout the codebase, which is used to build canonical URLs.

**Output:** Two files emitted to `dist/` at build time — `sitemap-index.xml` and `sitemap-0.xml`. For a 2-page site, both pages (`/` and `/results`) are automatically included.

### What NOT to configure

- Do not set `changefreq` or `priority` — Google ignores both fields as of 2023. Including them adds noise.
- Do not install `astro-robots-txt` (a community package) — a static `public/robots.txt` file is simpler and has no build-time dependency. (See below.)

---

## Canonical URLs — No New Dependency

### How it works

Once `site: "https://mkultragravel.com"` is set in `astro.config.mjs`, the Astro global `Astro.site` exposes a `URL` object anywhere in `.astro` files. Canonical URLs are constructed at build time:

```astro
---
const canonicalURL = new URL(Astro.url.pathname, Astro.site);
---
<link rel="canonical" href={canonicalURL} />
```

This pattern is documented in Astro's official API reference. The `href` attribute on a `URL` object serializes correctly — no string manipulation needed.

### Where to add it

`BaseLayout.astro` already has `title` and `description` props and a `<head>` section. The canonical tag goes there unconditionally — every page needs one. No per-page configuration is required because `Astro.url.pathname` resolves to the correct value (`/` vs `/results`) at build time for each route.

### The Netlify subdomain concern

The current live URL is `mkultragravel.netlify.app`. Once `mkultragravel.com` is configured as the primary domain in Netlify, Netlify automatically 301-redirects `mkultragravel.netlify.app` to `mkultragravel.com` for all pages. No additional `netlify.toml` redirect rules are needed for the domain consolidation. The canonical tag pointing to `mkultragravel.com` is correct regardless of how the visitor arrived.

---

## Open Graph + Twitter Card Meta Tags — No New Dependency

### Why no library

Community SEO wrapper packages (`astro-seo`, `astro-seo-meta`, `@astrolib/seo`) exist but add an abstraction layer over what is ultimately 6-8 `<meta>` tags. For a 2-page static site with a stable tag set, inline meta tags in `BaseLayout.astro` are preferable: they are readable, maintainable, and have zero bundle cost. The wrapper packages vary in Astro 6 compatibility and maintenance activity — introducing a dependency for a thin convenience layer is not justified here.

### Required tags

Open Graph minimum for a link preview (Facebook, LinkedIn, iMessage):

```astro
<meta property="og:type" content="website" />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonicalURL} />
<meta property="og:image" content={ogImageURL} />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="MK Ultra Gravel route photo" />
<meta property="og:site_name" content="MK Ultra Gravel" />
```

Twitter/X Card minimum (falls back to OG tags if absent, but explicit tags get better results):

```astro
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={ogImageURL} />
```

All these tags live in `BaseLayout.astro`. The `ogImageURL` value is a prop defaulting to the pre-generated OG image path (see OG Image section below).

### BaseLayout.astro prop additions

New props needed:

```ts
interface Props {
  title?: string;
  description?: string;
  ogImage?: string;   // path or URL — defaults to the static OG image
}
```

---

## OG Share Image — No New Dependency (sharp already installed)

### Decision: static pre-generated file, not an Astro endpoint

Two approaches exist for OG images in Astro:

**Option A — Astro endpoint with Satori + sharp:** Create `src/pages/og-image.png.ts`, use `satori` (0.18.3) to render an HTML tree to SVG, convert with sharp to PNG, return as a `Response`. This is appropriate for sites with many pages and dynamic content per page — the image is generated at build time via `getStaticPaths()`.

**Option B — Static file in `public/`:** Pre-process one route photo with sharp (already a devDependency), save as `public/og-image.jpg`, commit to repo. The `<meta property="og:image">` tag points to `https://mkultragravel.com/og-image.jpg`.

**Use Option B.** Rationale:
- This site has 2 pages, not 200. Both pages share the same OG image (a compelling route photo). There is no per-page dynamic content requiring unique OG images.
- Adding `satori` (which uses the `yoga-layout-wasm` + `opentype.js` dependency chain and requires a font file) for a 2-page site is engineering overhead with no return.
- sharp is already installed as a devDependency. A one-time script invocation (or even the macOS Preview export) produces the correctly-sized file. This is not a build-step dependency — it's a one-time authoring task.

### OG image spec

- **Dimensions:** 1200×630px (standard OG aspect ratio, optimal for all platforms)
- **Format:** JPG at quality 85 (smaller than PNG, acceptable quality loss for a photo)
- **Source:** Any of the 71 route photos in `images/`. Pick a wide, dramatic, high-contrast shot.
- **Output path:** `public/og-image.jpg`
- **Served at:** `https://mkultragravel.com/og-image.jpg`

### One-time sharp script (runs manually, not in prebuild)

```js
// scripts/generate-og-image.js
import sharp from "sharp";
await sharp("images/[chosen-photo].jpg")
  .resize(1200, 630, { fit: "cover", position: "centre" })
  .jpeg({ quality: 85 })
  .toFile("public/og-image.jpg");
```

Run once: `node scripts/generate-og-image.js`. Commit `public/og-image.jpg`. Done. No build-time dependency, no Satori, no font files.

---

## JSON-LD Event Structured Data — No New Dependency

### Why inline script, not a library

`astro-seo-schema` (version 6.0.0) is a community package that wraps JSON-LD in an Astro component. For a single `Event` type on a single page, the wrapper adds a package dependency and import overhead for what is one `<script>` tag. The correct approach for a static site with known, stable schema is inline JSON in the template.

### Placement

MK Ultra Gravel is a sporting event. The JSON-LD goes in `index.astro` (the homepage), injected into `BaseLayout.astro`'s `<slot name="head" />`:

```astro
<!-- In index.astro frontmatter section -->
---
const eventSchema = {
  "@context": "https://schema.org",
  "@type": "SportsEvent",
  "name": "MK Ultra Gravel",
  "startDate": "2026-06-07T08:00:00-05:00",
  "endDate": "2026-06-07T20:00:00-05:00",
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "location": {
    "@type": "Place",
    "name": "Michigan's Upper Peninsula",
    "address": {
      "@type": "PostalAddress",
      "addressRegion": "MI",
      "addressCountry": "US"
    }
  },
  "description": "100 miles of rowdy, technical gravel through Michigan's Upper Peninsula. Free ride. Mass start. No mercy.",
  "url": "https://mkultragravel.com",
  "image": "https://mkultragravel.com/og-image.jpg",
  "organizer": {
    "@type": "Organization",
    "name": "MK Ultra Gravel",
    "url": "https://mkultragravel.com"
  },
  "isAccessibleForFree": true
};
---
```

```astro
<!-- Injected via head slot -->
<script type="application/ld+json" slot="head" set:html={JSON.stringify(eventSchema)} />
```

Using `set:html` prevents Astro from escaping the JSON string. The `slot="head"` targets `BaseLayout.astro`'s `<slot name="head" />` which already exists.

### Schema type choice

Use `SportsEvent` (a subtype of `Event`) rather than generic `Event` — it's the correct Schema.org type for a cycling event and may unlock sport-specific rich results in Google Search.

---

## robots.txt — No New Dependency, Static File

### Approach: static file in `public/`

`public/robots.txt` is copied to `dist/robots.txt` at build time with no processing — this is standard Astro behavior. There is no reason to create a dynamic endpoint for `robots.txt` on a site that has no pages to disallow.

### Content

```
User-agent: *
Allow: /

Sitemap: https://mkultragravel.com/sitemap-index.xml
```

The `Sitemap:` directive points to `sitemap-index.xml`, which is the index file generated by `@astrojs/sitemap`. Google uses this directive as a hint — the sitemap is also submitted directly via Google Search Console, so the `robots.txt` reference is belt-and-suspenders.

---

## What NOT to Add and Why

| Library | Rejected because |
|---------|-----------------|
| `satori` (0.18.3) | OG image generation overkill for 2-page site; static pre-generated file is simpler and uses sharp already installed |
| `astro-seo` / `astro-seo-meta` / `@astrolib/seo` | Thin wrappers over `<meta>` tags; adds a dependency for no capability gain; Astro 6 compatibility varies |
| `astro-seo-schema` | Single JSON-LD `<script>` tag; wrapping it in a component adds a package for zero DX benefit |
| `astro-robots-txt` | Community package for dynamic robots.txt; static `public/robots.txt` is simpler, no build-time dependency, no maintenance surface |
| Netlify Edge Functions for OG image | SSR not in the project; pure static deployment; no serverless needed |

---

## Dependency Summary

| Package | Version | Type | Purpose |
|---------|---------|------|---------|
| `@astrojs/sitemap` | 3.7.2 | dependency | Generates `sitemap-index.xml` + `sitemap-0.xml` at build time |

All other SEO features are implemented through:
- Astro configuration (`site` option — enables `Astro.site`)
- `BaseLayout.astro` template additions (canonical, OG meta, Twitter meta)
- `index.astro` head slot (JSON-LD)
- Static file (`public/robots.txt`)
- One-time sharp script (`scripts/generate-og-image.js`) producing `public/og-image.jpg`

---

## astro.config.mjs Final State

```js
import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://mkultragravel.com",           // NEW — enables Astro.site + sitemap URLs
  integrations: [sitemap()],                    // NEW — generates sitemap at build
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: [
    {
      name: "Space Mono",
      cssVariable: "--font-mono",
      provider: fontProviders.google(),
      weights: [400, 700],
      styles: ["normal", "italic"],
      subsets: ["latin"],
    },
    {
      name: "Special Elite",
      cssVariable: "--font-display",
      provider: fontProviders.google(),
      weights: [400],
      styles: ["normal"],
      subsets: ["latin"],
    },
  ],
});
```

---

## Sources

| Source | Confidence | What it informed |
|--------|------------|-----------------|
| [Astro config reference — site option](https://docs.astro.build/en/reference/configuration-reference/#site) | HIGH | `Astro.site` behavior, canonical URL construction pattern, requirement for sitemap |
| [Astro API reference — Astro.site](https://docs.astro.build/en/reference/api-reference/) | HIGH | `new URL(Astro.url.pathname, Astro.site)` canonical pattern |
| [@astrojs/sitemap integration guide](https://docs.astro.build/en/guides/integrations-guide/sitemap/) | HIGH | Installation, config, output files, robots.txt relationship |
| [withastro/astro sitemap CHANGELOG.md](https://github.com/withastro/astro/blob/main/packages/integrations/sitemap/CHANGELOG.md) | HIGH | Confirmed 3.7.2 is current version |
| [npm — satori](https://www.npmjs.com/package/satori) | MEDIUM | Confirmed 0.18.3 is current version; informed decision to reject for this use case |
| [arne.me — Static OG Images in Astro](https://arne.me/blog/static-og-images-in-astro) | MEDIUM | Confirmed Satori + sharp is the standard dynamic approach; confirmed build-time approach is viable |
| Direct codebase inspection | HIGH | Confirmed `BaseLayout.astro` has `<slot name="head" />`, title/description props, sharp already in devDependencies; confirmed `public/` exists; confirmed no existing sitemap or robots.txt |
