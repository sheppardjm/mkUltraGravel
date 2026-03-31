# Phase 35: Site Navigation - Research

**Researched:** 2026-03-30
**Domain:** Astro static site navigation component, CSS z-index layering, active link detection
**Confidence:** HIGH

## Summary

This phase adds a fixed navigation header to every page of the MK Ultra Gravel Astro site. The site currently has no navigation -- users rely on ad-hoc "back" links and the browser back button to move between pages. The site has 4 pages: `/` (Home), `/results`, `/submit`, and `/submit-confirm`.

The implementation is straightforward Astro component authoring: create a `SiteNav.astro` component, use `Astro.url.pathname` (available at build time in frontmatter) to detect the active page, and integrate the component into `BaseLayout.astro` so it appears on every page. The primary challenge is z-index layering: the grain overlay sits at `z-index: 9999` and the Escher overlay at `z-index: 9998`, both with `pointer-events: none`. The nav must render visually above these but remain clickable.

No external libraries are needed. This is pure Astro component work with CSS. The existing Tailwind v4 utility classes and the project's design token system (dark brutalist palette in `global.css`) provide all styling primitives.

**Primary recommendation:** Create `SiteNav.astro` using `Astro.url.pathname` for build-time active link detection, set nav `z-index: 10000` with `position: fixed`, and inject it into `BaseLayout.astro` before the `<slot />`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Astro | ^6.1.1 | Framework, static site generation | Already in use; provides `Astro.url.pathname` for build-time active detection |
| Tailwind CSS | v4.2.2 | Utility-first CSS | Already in use; CSS-first config in `global.css` |

### Supporting
No additional libraries needed. This phase uses only built-in Astro features and existing project dependencies.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Astro.url.pathname` | `Astro.request.url` with `new URL()` | Equivalent; `Astro.url` already wraps this. Use `Astro.url.pathname` directly -- simpler. |
| CSS `class` for active state | `aria-current="page"` attribute | Both work; use BOTH -- `aria-current="page"` for accessibility + CSS attribute selector `[aria-current="page"]` for styling. No class string needed. |
| Fixed nav (position: fixed) | Sticky nav (position: sticky) | Fixed is correct -- nav must remain visible during scroll, independent of document flow. Sticky would require a parent container without overflow constraints. |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── SiteNav.astro    # NEW — fixed navigation header
├── layouts/
│   └── BaseLayout.astro  # MODIFIED — import and render SiteNav
├── pages/
│   ├── index.astro       # MODIFIED — remove ad-hoc back link (optional)
│   ├── results.astro     # MODIFIED — remove ad-hoc back link
│   ├── submit.astro      # MODIFIED — remove ad-hoc back link
│   └── submit-confirm.astro  # MODIFIED — remove ad-hoc back link
└── styles/
    └── global.css         # No changes needed (nav styles scoped to component)
```

### Pattern 1: Build-Time Active Link via `Astro.url.pathname`
**What:** Astro's `Astro.url` is a standard `URL` object constructed from `Astro.request.url`. The `.pathname` property gives the current page's path at build time. Since this is a static site, each page is built separately and `pathname` resolves to the correct value for each page.
**When to use:** Always, for static site navigation active states.
**Example:**
```astro
---
// Source: https://docs.astro.build/en/reference/api-reference/ (Astro.url section)
// Astro.url is equivalent to new URL(Astro.request.url)
const pathname = Astro.url.pathname;

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/results", label: "Results" },
  { href: "/submit", label: "Submit" },
];
---

<nav>
  {navLinks.map(link => (
    <a
      href={link.href}
      aria-current={pathname === link.href ? "page" : undefined}
    >
      {link.label}
    </a>
  ))}
</nav>
```

### Pattern 2: Z-Index Layering Above Overlays
**What:** The grain and Escher overlays use `z-index: 9999` and `z-index: 9998` respectively, both with `pointer-events: none` and `position: fixed`. The nav must stack above them.
**When to use:** For any interactive element that must appear above the decorative overlays.
**Example:**
```css
/* Nav must be above grain (9999) and Escher (9998) overlays */
nav.site-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10000;
}
```

### Pattern 3: Passing Current URL Through Layout to Component
**What:** `Astro.url` is available in any `.astro` file's frontmatter -- both pages and components. The `SiteNav.astro` component can access `Astro.url.pathname` directly in its own frontmatter. No need to pass it as a prop from `BaseLayout.astro`.
**When to use:** Always -- this is the simplest and most idiomatic pattern.
**Example:**
```astro
<!-- BaseLayout.astro — just import and use, no props needed -->
---
import SiteNav from "../components/SiteNav.astro";
---
<body>
  <SiteNav />
  <div class="grain-overlay" aria-hidden="true"></div>
  <div class="escher-overlay" aria-hidden="true"></div>
  <slot />
</body>
```

### Anti-Patterns to Avoid
- **Passing pathname as a prop from layout to nav:** Unnecessary complexity. `Astro.url` is available in all `.astro` component frontmatter directly. No prop drilling needed.
- **Using client-side JavaScript for active state:** This is a static site. Build-time detection is correct. Client-side JS would cause a flash of unstyled content (FOUC), violating NAV-03.
- **Using `startsWith()` for active matching:** With only 3 nav links and simple paths (`/`, `/results`, `/submit`), exact match (`===`) is correct. `startsWith("/")` would make Home active on every page.
- **Adding nav to each page individually:** Put it in `BaseLayout.astro` once. All pages use this layout already.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Active link detection | Custom JS that reads `window.location` | `Astro.url.pathname` in frontmatter | Build-time, no FOUC, zero JS |
| Accessibility for current page | Visual-only styling | `aria-current="page"` attribute | Screen readers need to know current page; also doubles as CSS selector |
| Responsive nav (if needed later) | Custom hamburger menu JS | Defer to future phase | Current scope is 3 links -- fits easily on mobile without a hamburger menu |

**Key insight:** This is a 3-link nav on a static site. Every temptation to add complexity (hamburger menus, client-side routing, animations) should be resisted. The entire feature is achievable with zero JavaScript.

## Common Pitfalls

### Pitfall 1: Trailing Slash Mismatch
**What goes wrong:** `Astro.url.pathname` may return `/results/` (with trailing slash) in production but `/results` (without) in dev, causing active link detection to fail silently.
**Why it happens:** Astro's default `trailingSlash` config is `"ignore"`, and different hosting environments normalize URLs differently. This project has no `trailingSlash` setting in `astro.config.mjs`.
**How to avoid:** Normalize the pathname before comparison. Strip trailing slashes (except for root `/`):
```astro
const rawPath = Astro.url.pathname;
const pathname = rawPath === "/" ? "/" : rawPath.replace(/\/$/, "");
```
**Warning signs:** Active state works in dev but not in production build preview.

### Pitfall 2: Fixed Nav Obscuring Page Content
**What goes wrong:** `position: fixed` removes the nav from document flow. Page content starts at the very top of the viewport, hidden behind the nav.
**Why it happens:** Fixed elements don't push content down.
**How to avoid:** Add `padding-top` to `<body>` or a wrapper equal to the nav height. Alternatively, add a spacer element after the nav. Since all pages use `<main>` as their content root, adding `pt-14` (or similar) to `<body>` in `BaseLayout.astro` is cleanest.
**Warning signs:** First content on every page is partially hidden behind the nav bar.

### Pitfall 3: Nav Clicks Blocked by Overlays
**What goes wrong:** Even though grain and Escher overlays have `pointer-events: none`, if the nav's z-index is lower than theirs, clicks may fail or the nav may be visually obscured.
**Why it happens:** z-index stacking context misconfiguration.
**How to avoid:** Nav z-index must be > 9999 (grain overlay). Use `z-index: 10000`.
**Warning signs:** Nav links are visible but don't respond to clicks, or nav appears translucent/dim behind overlay texture.

### Pitfall 4: Home Link Always Active
**What goes wrong:** Using `pathname.startsWith(link.href)` for matching makes Home (`/`) active on every page because every pathname starts with `/`.
**Why it happens:** Overly broad matching logic.
**How to avoid:** Use exact equality (`===`) for all links. The 3 nav targets (`/`, `/results`, `/submit`) are all top-level paths with no sub-paths that need prefix matching.
**Warning signs:** Home link appears active on Results and Submit pages.

### Pitfall 5: submit-confirm Page Breaks Nav Expectations
**What goes wrong:** The `/submit-confirm` page has no nav link pointing to it, so no nav item will be active. This looks weird if the user expects some indication.
**Why it happens:** submit-confirm is a transient confirmation page, not a primary destination.
**How to avoid:** Consider highlighting "Submit" as active on `/submit-confirm` since it's part of the submission flow. Use `pathname.startsWith("/submit")` only for the Submit link, or add submit-confirm to the Submit match:
```astro
const isActive = link.href === "/submit"
  ? pathname === "/submit" || pathname.startsWith("/submit-confirm")
  : pathname === link.href;
```
**Warning signs:** No active state on the submit-confirm page.

## Code Examples

### Complete SiteNav.astro Component
```astro
---
// Source: Astro docs — Astro.url is available in all .astro component frontmatter
// https://docs.astro.build/en/reference/api-reference/

const rawPath = Astro.url.pathname;
const pathname = rawPath === "/" ? "/" : rawPath.replace(/\/$/, "");

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/results", label: "Results" },
  { href: "/submit", label: "Submit" },
];

function isActive(href: string): boolean {
  if (href === "/submit") {
    return pathname === "/submit" || pathname.startsWith("/submit-confirm");
  }
  return pathname === href;
}
---

<nav class="site-nav">
  <a href="/" class="nav-brand">MK Ultra Gravel</a>
  <div class="nav-links">
    {navLinks.map(link => (
      <a
        href={link.href}
        aria-current={isActive(link.href) ? "page" : undefined}
        class="nav-link"
      >
        {link.label}
      </a>
    ))}
  </div>
</nav>

<style>
  .site-nav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1.5rem;
    background-color: oklch(0.10 0.01 250 / 0.92);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--color-border);
    font-family: var(--font-mono);
  }

  .nav-brand {
    font-family: var(--font-display);
    color: var(--color-accent-white);
    text-decoration: none;
    font-size: 1rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .nav-links {
    display: flex;
    gap: 1.5rem;
  }

  .nav-link {
    color: var(--color-text-muted);
    text-decoration: none;
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition: color 0.15s ease;
  }

  .nav-link:hover {
    color: var(--color-accent-white);
  }

  .nav-link[aria-current="page"] {
    color: var(--color-accent-green);
    border-bottom: 2px solid var(--color-accent-green);
    padding-bottom: 2px;
  }
</style>
```

### BaseLayout.astro Integration
```astro
---
import { Font } from "astro:assets";
import "../styles/global.css";
import SiteNav from "../components/SiteNav.astro";

interface Props {
  title?: string;
  description?: string;
}

const {
  title = "MK Ultra Gravel — June 7, 2026",
  description = "100 miles of rowdy, technical gravel through Michigan's Upper Peninsula. Free ride. Mass start. No mercy."
} = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <Font cssVariable="--font-mono" />
    <Font cssVariable="--font-display" />
    <link rel="preconnect" href="https://a.basemaps.cartocdn.com" />
    <link rel="preconnect" href="https://b.basemaps.cartocdn.com" />
    <link rel="preconnect" href="https://c.basemaps.cartocdn.com" />
    <link rel="preconnect" href="https://d.basemaps.cartocdn.com" />
    <slot name="head" />
  </head>
  <body class="pt-12">
    <SiteNav />
    <div class="grain-overlay" aria-hidden="true"></div>
    <div class="escher-overlay" aria-hidden="true"></div>
    <slot />
  </body>
</html>
```

### Removing Ad-Hoc Back Links
The existing pages have manual back links that become redundant with global navigation:

```astro
<!-- REMOVE these blocks from results.astro, submit.astro, submit-confirm.astro -->
<a
  href="/"
  class="inline-flex items-center gap-2 text-sm mb-10 opacity-60 hover:opacity-100 transition-opacity"
  style="font-family: var(--font-mono);"
>
  ← Back to MK Ultra Gravel
</a>
```

**Pages with back links to remove:**
- `results.astro` lines 78-85 (back to Home)
- `submit.astro` lines 13-19 (back to Home)
- `submit-confirm.astro` lines 37-44 (back to Submit)

**Note:** The submit-confirm error state also has an inline "start again" link (line 64-68) -- this is contextual, not navigational, and should be kept.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side JS active link detection | Build-time via `Astro.url.pathname` | Astro 1.0+ | Zero JS, no FOUC |
| Separate nav on each page | Component in layout | Always best practice | Single source of truth |
| Class-based active styling | `aria-current="page"` + CSS attribute selector | WCAG pattern | Accessible + clean selector |

**Deprecated/outdated:**
- None relevant -- Astro's `Astro.url` API has been stable since early versions.

## Open Questions

1. **Should the submit-confirm page show "Submit" as active?**
   - What we know: submit-confirm is a transient page in the submission flow. No nav link points to it directly.
   - What's unclear: Whether the user wants no active state or "Submit" highlighted on this page.
   - Recommendation: Treat submit-confirm as part of the Submit flow and highlight "Submit" as active. This is the more intuitive behavior. The code example above implements this.

2. **Nav height and body padding-top value**
   - What we know: The nav will be approximately 48px tall (py-3 = 0.75rem top + bottom = 1.5rem = 24px + content height ~24px). Tailwind's `pt-12` (3rem = 48px) should work.
   - What's unclear: Exact final height depends on font-size and padding choices.
   - Recommendation: Start with `pt-12` on body, visually verify, adjust if needed. The hero section on index.astro uses `min-h-screen` so the padding won't affect its full-bleed appearance significantly.

3. **Brand text vs. logo in nav**
   - What we know: The site has a Penrose triangle SVG used as a hero decoration and a favicon.svg.
   - What's unclear: Whether to use text "MK Ultra Gravel" or a small logo.
   - Recommendation: Use text for simplicity. The display font (Special Elite) provides sufficient brand identity. A logo can be added in a future phase.

## Sources

### Primary (HIGH confidence)
- Astro official docs: `Astro.url` API reference - confirmed `Astro.url.pathname` availability in all `.astro` files, confirmed it wraps `new URL(Astro.request.url)` ([https://docs.astro.build/en/reference/api-reference/](https://docs.astro.build/en/reference/api-reference/))
- Astro official tutorial: Navigation component pattern - component in layout, import and render ([https://docs.astro.build/en/tutorial/3-components/1/](https://docs.astro.build/en/tutorial/3-components/1/))
- Project codebase analysis: BaseLayout.astro structure, z-index values (9999 grain, 9998 escher), existing back-link patterns, page list, Tailwind v4 config

### Secondary (MEDIUM confidence)
- Community pattern for active links: `pathname === href` with `aria-current="page"` ([https://www.koladechris.com/blog/how-to-highlight-the-current-page-link-in-astro/](https://www.koladechris.com/blog/how-to-highlight-the-current-page-link-in-astro/))
- Trailing slash edge case: Multiple community sources confirm `trailingSlash: "ignore"` (default) can cause mismatches between dev and prod

### Tertiary (LOW confidence)
- None -- all findings verified with official docs or codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed; all Astro built-in features verified with official docs
- Architecture: HIGH - Direct codebase inspection confirms BaseLayout pattern, z-index values, page structure
- Pitfalls: HIGH - z-index values confirmed from `global.css`, trailing slash behavior confirmed from Astro docs and config inspection

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable domain -- Astro component patterns unlikely to change)
