# Phase 56: SEO Foundation - Research

**Researched:** 2026-04-09
**Domain:** Astro sitemap integration, Netlify redirects, robots.txt, HTTP headers
**Confidence:** HIGH

## Summary

Phase 56 establishes the crawl infrastructure needed for search engines to properly index the site. It covers four distinct but tightly related concerns: (1) the Astro `site` config property required for sitemap generation, (2) the `@astrojs/sitemap` integration for generating `sitemap-index.xml`, (3) a static `robots.txt` in `public/`, and (4) Netlify configuration for subdomain redirect and deploy-preview noindex.

The standard approach is well-documented and battle-tested. Astro v6.1.1 (already installed) fully supports `@astrojs/sitemap` v3.x with no breaking changes. The `site` property in `astro.config.mjs` is the keystone — without it, sitemap generation silently produces no URLs. The Netlify subdomain redirect requires `force = true` in `netlify.toml` and the critical prerequisite that `mkultragravel.com` is already configured as the primary domain on the Netlify site. The deploy-preview noindex requirement (SEO-05) is automatically satisfied by Netlify at the platform level — no configuration needed.

**Primary recommendation:** Add `site` + sitemap integration in one `astro.config.mjs` edit, write `public/robots.txt` manually (no tool needed), add the subdomain redirect to `netlify.toml`, and document that SEO-05 is satisfied by default Netlify behavior.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@astrojs/sitemap` | 3.x (latest) | Generates sitemap-index.xml + sitemap-0.xml | Official Astro integration, zero config for basic use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | — | robots.txt is static text | Static file in public/ needs no tooling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@astrojs/sitemap` | Hand-written sitemap | Never hand-roll — integration handles multi-page splits, protocol normalization, build lifecycle hook |
| Static `robots.txt` | Astro-generated robots.txt | Static is correct here; no dynamic content needed |

**Installation:**
```bash
npm install @astrojs/sitemap
```

Or using the automated setup (modifies astro.config.mjs automatically):
```bash
npx astro add sitemap
```

## Architecture Patterns

### Recommended Project Structure
```
public/
└── robots.txt           # Static — no build step needed, copied as-is to dist/

astro.config.mjs         # Add site property + sitemap integration

netlify.toml             # Add [[redirects]] for subdomain + (no header config needed for SEO-05)
```

### Pattern 1: Astro Config with Site + Sitemap
**What:** Two changes to `astro.config.mjs`: add `site` property and add `sitemap()` to integrations array
**When to use:** Always for this phase
**Example:**
```javascript
// Source: https://docs.astro.build/en/guides/integrations-guide/sitemap/
import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://mkultragravel.com",
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  // ... existing fonts config
});
```

### Pattern 2: robots.txt in public/
**What:** Plain text file placed in `public/` — Astro copies it verbatim to `dist/`
**When to use:** Always; no Astro-specific syntax needed
**Example:**
```
User-agent: *
Allow: /
Sitemap: https://mkultragravel.com/sitemap-index.xml
```

### Pattern 3: Netlify Subdomain Redirect
**What:** 301 redirect from `mkultragravel.netlify.app` to `mkultragravel.com`
**When to use:** To prevent the Netlify subdomain from being indexed as a separate/duplicate site
**Example:**
```toml
# Source: https://docs.netlify.com/manage/routing/redirects/redirect-options/
[[redirects]]
  from = "https://mkultragravel.netlify.app/*"
  to = "https://mkultragravel.com/:splat"
  status = 301
  force = true
```

### Pattern 4: Deploy Preview noindex (SEO-05)
**What:** Netlify automatically adds `X-Robots-Tag: noindex` to all deploy preview responses
**When to use:** No configuration required — this is Netlify's default platform behavior
**Evidence:** Netlify support (Luke, official staff) confirmed: "There isn't a way to override the inclusion of the `x-robots-tag: noindex` header for deploy previews." The header is injected at the platform level, not via deploy config.

### Anti-Patterns to Avoid
- **Missing `site` property:** If `site` is omitted from `astro.config.mjs`, the sitemap integration installs without error but generates a sitemap with no `<loc>` URLs. Always set `site` first.
- **Adding `X-Robots-Tag: noindex` manually to netlify.toml for deploy previews:** Context-specific headers in `netlify.toml` are global by default. Adding a noindex header without proper context scoping would apply it to production. Since Netlify handles this automatically, there is nothing to configure.
- **Redirecting without `force = true`:** Without `force = true`, the redirect may not fire if matching static files exist at the source path.
- **Skipping the wildcard `/*` pattern:** `from = "https://mkultragravel.netlify.app"` (no wildcard) only matches the root. Use `/*` with `:splat` to redirect all paths.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sitemap generation | Custom XML template | `@astrojs/sitemap` | Handles multi-file splitting (>45k entries), build lifecycle hooks, SSR awareness, proper XML namespaces |
| robots.txt | Astro component | Static file in `public/` | Static files in `public/` are copied verbatim — simpler, cacheable, no build dependency |

**Key insight:** The sitemap integration hooks into Astro's build pipeline to enumerate all static routes post-build. A hand-rolled approach would require duplicating this route enumeration logic.

## Common Pitfalls

### Pitfall 1: `site` Property is Required for Sitemap URLs
**What goes wrong:** Sitemap integration is installed and builds succeed, but `sitemap-index.xml` and `sitemap-0.xml` contain empty or relative URLs.
**Why it happens:** The `@astrojs/sitemap` integration uses `site` from `astro.config.mjs` to construct absolute URLs in the sitemap. Without it, the integration may skip URL generation or produce invalid output.
**How to avoid:** Always add `site: "https://mkultragravel.com"` to `astro.config.mjs` before or alongside installing the integration. Both changes belong in the same commit/task.
**Warning signs:** Running `astro build` completes without error but `dist/sitemap-index.xml` is missing or `dist/sitemap-0.xml` has no `<loc>` entries.

### Pitfall 2: Netlify Subdomain Redirect Prerequisite
**What goes wrong:** The `[[redirects]]` rule in `netlify.toml` is deployed but `https://mkultragravel.netlify.app` does not redirect — it still serves the site directly.
**Why it happens:** Netlify only processes cross-domain redirects FROM domains that are explicitly assigned to the site (as primary domain, domain alias, or branch subdomain). The `.netlify.app` subdomain is always assigned automatically, so this is less likely to be an issue, but the redirect will only work correctly once `mkultragravel.com` is configured as the primary/production domain in the Netlify dashboard.
**How to avoid:** Verify in Netlify dashboard > Site settings > Domain management that `mkultragravel.com` appears as the primary domain. The redirect in `netlify.toml` will not work in isolation without the custom domain being configured.
**Warning signs:** Curl to `https://mkultragravel.netlify.app/` returns 200 instead of 301.

### Pitfall 3: Protocol Handling in Redirects
**What goes wrong:** HTTP requests to `http://mkultragravel.netlify.app` are not redirected.
**Why it happens:** Netlify treats HTTP and HTTPS as separate routes. If SSL is not forced site-wide, separate redirect rules are needed for each protocol.
**How to avoid:** Either force SSL in Netlify settings (recommended) or add separate HTTP and HTTPS redirect rules. Since the site already uses HTTPS (Netlify's default), forcing SSL is sufficient.
**Warning signs:** HTTP requests return 200 instead of 301.

### Pitfall 4: Deploy Preview Header Configuration Conflict
**What goes wrong:** Attempting to manually add `X-Robots-Tag: noindex` headers in `netlify.toml` for deploy previews causes the header to appear twice in responses (`x-robots-tag: all` AND `x-robots-tag: noindex`) or accidentally affects production.
**Why it happens:** Netlify prepends its own noindex header rather than replacing a custom one; also, `netlify.toml` headers are global by default.
**How to avoid:** Do not add any X-Robots-Tag configuration. Netlify's platform-level injection handles SEO-05 automatically.

## Code Examples

Verified patterns from official sources:

### Complete astro.config.mjs for This Project
```javascript
// Source: https://docs.astro.build/en/guides/integrations-guide/sitemap/
import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://mkultragravel.com",
  integrations: [sitemap()],
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

### public/robots.txt
```
User-agent: *
Allow: /
Sitemap: https://mkultragravel.com/sitemap-index.xml
```

### netlify.toml additions (append to existing file)
```toml
# Source: https://docs.netlify.com/manage/routing/redirects/redirect-options/
[[redirects]]
  from = "https://mkultragravel.netlify.app/*"
  to = "https://mkultragravel.com/:splat"
  status = 301
  force = true
```

### Verifying SEO-05 (no config needed)
```bash
# Verify deploy preview automatically has noindex (replace with real preview URL)
curl -sI https://deploy-preview-123--mkultragravel.netlify.app/ | grep -i x-robots-tag
# Expected: x-robots-tag: noindex
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-written sitemap.xml | `@astrojs/sitemap` integration | Astro v1 era | Integration handles build-time route enumeration automatically |
| `robots.txt` as Astro component | Static file in `public/` | Always been static | No change needed; static is the correct approach |
| Manual X-Robots-Tag config for previews | Netlify platform-level injection | Netlify platform default | Nothing to configure; automatic |

**Deprecated/outdated:**
- Context-scoped headers in `netlify.toml` for deploy previews: Netlify docs state global headers only; workarounds using separate `_headers` files per context exist but are unnecessary here since SEO-05 is handled automatically.

## Open Questions

1. **Is `mkultragravel.com` already the primary domain on the Netlify site?**
   - What we know: The `netlify.toml` has no custom domain configuration; the project is deployed to Netlify
   - What's unclear: Whether `mkultragravel.com` DNS is already pointed to Netlify and configured as the primary domain
   - Recommendation: Verify in Netlify dashboard before testing the subdomain redirect. If not configured, the SEO-04 redirect cannot be tested until the custom domain is set up (which is outside this phase's scope if DNS isn't done).

2. **Does the single-page Astro site generate multiple routes for the sitemap?**
   - What we know: The site is an Astro project; sitemap integration enumerates static routes
   - What's unclear: How many distinct routes/pages the site has (it may be primarily a single-page app)
   - Recommendation: Run `astro build` after integration is added and inspect `dist/sitemap-0.xml` to confirm expected pages appear.

## Sources

### Primary (HIGH confidence)
- `https://docs.astro.build/en/guides/integrations-guide/sitemap/` — Full installation guide, generated file structure, configuration options, version 3.7.2
- `https://docs.astro.build/en/reference/configuration-reference/` — `site` property definition and purpose
- `https://docs.netlify.com/manage/routing/redirects/redirect-options/` — Domain-level redirect syntax, `force` flag requirement
- `https://docs.netlify.com/manage/domains/manage-domains/manage-multiple-domains/` — Auto-redirect behavior for apex/www only; other subdomains require manual config

### Secondary (MEDIUM confidence)
- `https://answers.netlify.com/t/override-x-robots-tag-noindex-header-in-deploy-preview/38980` — Netlify staff (Luke) confirmed platform-level noindex injection for deploy previews is automatic and cannot be overridden
- `https://docs.netlify.com/configure-builds/file-based-configuration/` — Confirmed headers in netlify.toml are global by default, not context-scoped

### Tertiary (LOW confidence)
- `https://www.tempertemper.net/blog/stop-search-indexing-for-netlify-deploy-previews-and-branch-deploys` — Blog post showing robots.txt overwrite approach as alternative (not needed given Netlify's automatic behavior)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Official Astro docs, current version confirmed (3.7.2), compatible with Astro 6.1.1 already installed
- Architecture: HIGH — Simple static file + config change patterns, well-documented
- Pitfalls: HIGH — `site` property requirement verified in official docs; Netlify noindex behavior confirmed by Netlify staff; subdomain redirect prerequisite confirmed in official docs
- SEO-05 automatic behavior: HIGH — Multiple Netlify forum posts with Netlify staff confirmation; the behavior is intentional and documented

**Research date:** 2026-04-09
**Valid until:** 2026-07-09 (90 days — Netlify deploy behavior and Astro sitemap integration are stable)
