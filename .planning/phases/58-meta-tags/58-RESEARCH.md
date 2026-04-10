# Phase 58: Meta Tags - Research

**Researched:** 2026-04-09
**Domain:** HTML meta tags — Open Graph, Twitter Card, canonical link; Astro head management
**Confidence:** HIGH

## Summary

This phase adds social sharing metadata (Open Graph + Twitter Card) and canonical link tags to both pages of the site. The codebase already has everything needed: `BaseLayout.astro` accepts `title` and `description` props, has a `<slot name="head" />`, `astro.config.mjs` has `site: "https://mkultragravel.com"`, and `public/og-image.jpg` exists at exactly 1200x630 (created in Phase 57).

The implementation is a single-file change: add the 10 meta tags and 1 canonical link directly inside `BaseLayout.astro`'s `<head>` section using the props already available. No new files, no new props, no library installs. The constraint from Phase context is explicit: no external libraries, inline tags only.

Twitter/X falls back to `og:` tags for title, description, and image — so `twitter:card` is the only strictly required twitter-specific tag. The phase requirements list four twitter: tags (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`) for completeness and robustness across validators.

**Primary recommendation:** Add all 11 tags (6 og: + 4 twitter: + 1 canonical) directly to `BaseLayout.astro`'s existing `<head>` block using `Astro.props` and `new URL(Astro.url.pathname, Astro.site)`.

## Standard Stack

### Core

No libraries. This is pure HTML meta tags in an Astro component.

| Element | Format | Purpose |
|---------|--------|---------|
| `<meta property="og:*">` | HTML meta tag | Open Graph social preview |
| `<meta name="twitter:*">` | HTML meta tag | Twitter/X Card preview |
| `<link rel="canonical">` | HTML link tag | Canonical URL for crawlers |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline tags | astro-seo package | Package adds abstraction; for 6 tags it's overkill. Locked out-of-scope per prior decisions. |
| Static image path | Satori dynamic OG | Locked out-of-scope per prior decisions |
| Duplicate twitter: tags | Rely on X's OG fallback | X does fall back to og: tags, but phase requirements explicitly call for four twitter: tags — include all four for validator compliance |

## Architecture Patterns

### Where to Add Tags

All tags go in `BaseLayout.astro`'s existing `<head>` section — not via the `<slot name="head" />`. The slot exists for per-page overrides, but all 11 tags use props already flowing into the layout, so they belong in the layout itself.

### Canonical URL Construction

```astro
// Source: https://docs.astro.build/en/reference/api-reference/#astrosite
const canonicalURL = new URL(Astro.url.pathname, Astro.site);
```

- `Astro.site` returns a `URL` from `site` in `astro.config.mjs` → `https://mkultragravel.com`
- `Astro.url.pathname` gives the current page path at build time (e.g., `/`, `/results`)
- In static builds with `site` configured, `Astro.url` uses the production domain, not localhost
- Result: `https://mkultragravel.com/` and `https://mkultragravel.com/results`

### OG Image URL Construction

```astro
// The image is a static asset at /og-image.jpg
// Build absolute URL from Astro.site (not Astro.url, to avoid localhost in dev builds)
const ogImageURL = new URL('/og-image.jpg', Astro.site);
```

Using `Astro.site` (not `Astro.url`) for the image ensures the absolute URL always points to the production domain even during local dev. The image file exists at `public/og-image.jpg` → served at `/og-image.jpg`.

### Pattern: All Tags in BaseLayout

```astro
---
const {
  title = "MK Ultra Gravel — June 7, 2026",
  description = "100 miles of rowdy, technical gravel through Michigan's Upper Peninsula. Free ride. Mass start. No mercy."
} = Astro.props;

const canonicalURL = new URL(Astro.url.pathname, Astro.site);
const ogImageURL = new URL('/og-image.jpg', Astro.site);
---

<head>
  <!-- existing tags ... -->
  <link rel="canonical" href={canonicalURL} />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="MK Ultra Gravel" />
  <meta property="og:url" content={canonicalURL} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={ogImageURL} />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={ogImageURL} />
</head>
```

### Anti-Patterns to Avoid

- **Using `Astro.url` for the image URL in dev:** In local dev, `Astro.url` is a `localhost` URL. Always use `new URL('/og-image.jpg', Astro.site)` for the image so it always points to the production domain.
- **Relative image URL (`/og-image.jpg`):** Social crawlers require absolute URLs for `og:image`. A relative path will not work.
- **HTTP image URL when site is HTTPS:** All URLs must use the same scheme. `Astro.site` is `https://mkultragravel.com` so both `canonicalURL` and `ogImageURL` will be HTTPS automatically.
- **Putting canonical in the slot:** The `<slot name="head" />` is for per-page overrides. Tags that apply to every page belong in the layout body.

## Don't Hand-Roll

This phase is simple enough that no external solutions are needed. All logic reduces to two `new URL()` calls and 11 static HTML tags.

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Absolute URL from path | String concatenation | `new URL(path, base)` — handles trailing slashes, encoding |
| Per-page canonical | Manual string per page | `Astro.url.pathname` in layout — computed at build time |

## Common Pitfalls

### Pitfall 1: Relative og:image URL
**What goes wrong:** Social crawlers (Facebook, Slack, Discord) see `og:image` value of `/og-image.jpg` and cannot follow it — they need the full absolute URL.
**Why it happens:** Forgetting to wrap in `new URL()`.
**How to avoid:** Always construct `ogImageURL = new URL('/og-image.jpg', Astro.site)` and use the object in the `content` attribute.
**Warning signs:** Sharing debugger shows no image preview despite image file existing.

### Pitfall 2: og:image URL uses localhost in production
**What goes wrong:** During static builds, if `site` is not set in `astro.config.mjs`, `Astro.site` is `undefined` and `Astro.url` falls back to `localhost` — the built HTML contains `http://localhost:4321/og-image.jpg`.
**Why it happens:** `site` misconfiguration or using `Astro.url` instead of `Astro.site` for image URL.
**How to avoid:** `site: "https://mkultragravel.com"` is already set in `astro.config.mjs` (Phase 56). Use `Astro.site` for the image base. Verify output with `npm run build && grep og-image dist/index.html`.
**Warning signs:** `grep "localhost" dist/index.html` returns hits on og:image lines.

### Pitfall 3: Missing og:type
**What goes wrong:** Facebook's Open Graph validator marks the tags as incomplete. Without `og:type`, crawlers may misclassify the page.
**Why it happens:** Developers focus on title/description/image and overlook type.
**How to avoid:** Include `<meta property="og:type" content="website" />` — this is the correct value for a homepage/marketing site (not "article").

### Pitfall 4: og:site_name vs og:title confusion
**What goes wrong:** `og:site_name` is the overall brand name; `og:title` is the specific page title. Setting both to the same value ("MK Ultra Gravel") is correct for the homepage but `og:site_name` should always be the brand name, never a page-specific title.
**Why it happens:** Confusion about the distinction.
**How to avoid:** `og:site_name` = "MK Ultra Gravel" (hardcoded), `og:title` = `{title}` (from prop, varies per page).

### Pitfall 5: Twitter Card validator deprecation
**What goes wrong:** The old Twitter Card Validator at cards-dev.twitter.com no longer functions. Testing twitter: tags requires using the tweet composer preview or third-party tools.
**Why it happens:** X (formerly Twitter) deprecated the standalone validator in 2023.
**How to avoid:** Use Facebook Sharing Debugger (`https://developers.facebook.com/tools/debug/`) to validate OG tags (X falls back to OG), and use a third-party tool like `opengraph.xyz` or paste URL in a tweet draft to preview.

## Code Examples

### Complete BaseLayout.astro head section (verified pattern)

```astro
---
// Source: https://docs.astro.build/en/reference/api-reference/#astrosite
// Source: https://eastondev.com/blog/en/posts/dev/20251202-astro-seo-complete-guide/

interface Props {
  title?: string;
  description?: string;
}

const {
  title = "MK Ultra Gravel — June 7, 2026",
  description = "100 miles of rowdy, technical gravel through Michigan's Upper Peninsula. Free ride. Mass start. No mercy."
} = Astro.props;

const canonicalURL = new URL(Astro.url.pathname, Astro.site);
const ogImageURL = new URL('/og-image.jpg', Astro.site);
---

<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonicalURL} />

  <!-- Open Graph (6 required tags) -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="MK Ultra Gravel" />
  <meta property="og:url" content={canonicalURL} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={ogImageURL} />

  <!-- Twitter Card (4 tags per phase requirements) -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={ogImageURL} />

  <!-- existing font, favicon, preconnect tags... -->
  <slot name="head" />
</head>
```

### Verification commands

```bash
# 1. Build the site
npm run build

# 2. Check index.html contains all tags
grep -E 'og:|twitter:|canonical' dist/index.html

# 3. Confirm og:image is absolute HTTPS URL (not relative, not localhost)
grep 'og:image' dist/index.html

# 4. Check results page
grep -E 'og:|twitter:|canonical' dist/results/index.html

# 5. Confirm no localhost URLs leaked into build output
grep "localhost" dist/index.html || echo "Clean"
```

### Expected grep output for dist/index.html

```
<link rel="canonical" href="https://mkultragravel.com/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="MK Ultra Gravel">
<meta property="og:url" content="https://mkultragravel.com/">
<meta property="og:title" content="MK Ultra Gravel — June 7, 2026">
<meta property="og:description" content="100 miles of rowdy, technical gravel through Michigan's Upper Peninsula. Free ride. Mass start. No mercy.">
<meta property="og:image" content="https://mkultragravel.com/og-image.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="MK Ultra Gravel — June 7, 2026">
<meta name="twitter:description" content="100 miles of rowdy, technical gravel through Michigan's Upper Peninsula. Free ride. Mass start. No mercy.">
<meta name="twitter:image" content="https://mkultragravel.com/og-image.jpg">
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `twitter:site` with @handle | Optional — X uses OG fallback | Not needed unless you have an X account handle to attribute |
| Separate `twitter:image` domain | Same image as `og:image` | Both point to same `/og-image.jpg`; no duplication needed |
| `astro-seo` library | Inline tags in layout | Phase decision: inline is clearer for 2-page site |
| `Astro.canonicalURL` (old API) | `new URL(Astro.url.pathname, Astro.site)` | Old API removed in Astro v3; use URL constructor |

## Open Questions

1. **Trailing slash on canonical URL for homepage**
   - What we know: `new URL('/', 'https://mkultragravel.com')` produces `https://mkultragravel.com/`; `new URL('/results', ...)` produces `https://mkultragravel.com/results`
   - What's unclear: Whether Astro's default build format produces `/results/index.html` (with trailing slash) or `/results.html` (without). If the latter, canonical for results page may need to be `https://mkultragravel.com/results` not `/results/`.
   - Recommendation: Run `npm run build && ls dist/` to confirm actual output paths. With default Astro config and no `trailingSlash` override, the default is `"ignore"` — both work. The canonical should match `Astro.url.pathname` exactly.

2. **og:image:width / og:image:height optional tags**
   - What we know: Some sources recommend adding these to help platforms render faster. The image is confirmed 1200x630.
   - What's unclear: Whether these are needed for the validation debuggers or success criteria.
   - Recommendation: Phase success criteria do not require them and they are not in the required tag list. Skip — can always add if a debugger warns about missing dimensions.

## Sources

### Primary (HIGH confidence)
- https://docs.astro.build/en/reference/api-reference/ — `Astro.site`, `Astro.url`, static build URL behavior
- https://ogp.me/ — Official Open Graph protocol — required 4 properties (title, type, image, url)
- https://eastondev.com/blog/en/posts/dev/20251202-astro-seo-complete-guide/ — Astro SEO meta tags pattern with code example (Dec 2025)

### Secondary (MEDIUM confidence)
- https://coywolf.com/guides/open-graph-twitter-card-image-optimization/ — Twitter Card / OG relationship; `twitter:card` as only required twitter-specific tag
- https://blog.logto.io/open-graph-and-twitter-card-metadata — Twitter Card tag list
- https://myogimage.com/blog/og-image-size-meta-tags-complete-guide — OG image dimensions 1200x630 standard

### Tertiary (LOW confidence)
- WebSearch results confirming X's OG fallback behavior — multiple sources agree but X's own docs are paywalled (402 error when fetching developer.x.com)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — No libraries; pure HTML; confirmed by Astro official docs
- Architecture: HIGH — `new URL(pathname, site)` pattern confirmed in Astro docs and multiple guides
- Pitfalls: HIGH — Absolute URL requirement is well-documented; localhost pitfall confirmed in Astro docs
- Twitter Card requirements: MEDIUM — X docs returned 402; multiple secondary sources agree on fallback behavior

**Research date:** 2026-04-09
**Valid until:** 2026-07-09 (stable — HTML meta tag specs don't change; Astro API stable)
