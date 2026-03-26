# Phase 2: Scaffold + Design System - Research

**Researched:** 2026-03-26
**Domain:** Astro 6 project setup, Tailwind v4 CSS-first configuration, web fonts, CSS cascade layers, brutalist/psychedelic design
**Confidence:** HIGH (core stack verified via official docs), MEDIUM (display font selection), LOW (SVG visual motifs implementation details)

---

## Summary

Phase 2 scaffolds the Astro 6 project and establishes the dark brutalist psychedelic identity as a reusable design system. Research confirms Astro 6 is the current stable release (March 2026), requiring Node 22.12.0+. Tailwind v4 uses a fundamentally different CSS-first configuration model — no `tailwind.config.js`, only `@theme` directives in CSS. The Astro 6 Fonts API (built-in, not a plugin) handles Google Fonts with automatic preload and FOUT prevention. Cascade layers are the correct solution for the Leaflet CSS conflict — wrap Leaflet's import with `@import "leaflet/dist/leaflet.css" layer(leaflet)` so it sits below Tailwind's utilities layer.

The visual identity requires: near-black background, acid-green/blood-red/off-white accents, Space Mono for body text, a creepy display font (Special Elite or a similar Google Font with a typewriter/distressed aesthetic), and SVG-based visual motifs (grainy texture via `feTurbulence`, geometric distortion). All tone reference images are in `images/tone/` and include Escher stairs, CIA MK-Ultra documents, and psychedelic/surveillance imagery — these should be used as `<img>` elements or CSS `background-image` on the base page.

**Primary recommendation:** Run `npm create astro@latest`, immediately configure `@tailwindcss/vite`, set up the Astro Fonts API for both fonts, define all design tokens in a single `src/styles/global.css` with `@theme`, and establish the cascade layer order at the top of that file before any `@import`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| astro | 6.x (latest) | Static site framework | Roadmap decision; v6 stable as of March 2026 |
| tailwindcss | 4.x | Utility CSS + design token system | Roadmap decision; v4 is CSS-first with `@theme` |
| @tailwindcss/vite | 4.x | Vite plugin (replaces PostCSS for Tailwind v4) | Official recommended integration for Astro |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Space Mono | Google Fonts | Monospaced body font | Body text per VIS-04 |
| Special Elite | Google Fonts | Typewriter/distressed display font | Headers per VIS-04; CIA document aesthetic |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Special Elite | VT323 | VT323 is more pixelated/retro terminal; less document-distressed |
| Special Elite | Creepster | Creepster is cartoonish horror; less fitting for CIA document tone |
| Astro Fonts API | `<link rel="stylesheet">` Google CDN | CDN version transmits user data to Google, no FOUT optimization, no preloading |
| @tailwindcss/vite | @tailwindcss/postcss | Vite plugin is faster and official recommendation for Astro |

**Installation:**
```bash
# Step 1: Create Astro project
npm create astro@latest

# Step 2: Add Tailwind v4
npm install tailwindcss @tailwindcss/vite
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── layouts/
│   └── BaseLayout.astro    # Single layout wrapping all pages; <html>/<head>/<body>
├── components/
│   └── (future components)
├── pages/
│   └── index.astro         # Single-page scroll; imports BaseLayout
└── styles/
    └── global.css          # @import "tailwindcss"; @theme {...}; cascade layers

public/
├── data/                   # Generated from Phase 1 (route-data.json etc.)
└── (static assets)

images/
├── tone/                   # CIA/Escher/psychedelic reference images
└── (route photos)

astro.config.mjs            # Vite plugin + Fonts API config
```

### Pattern 1: Astro 6 + Tailwind v4 Configuration

**What:** Add the `@tailwindcss/vite` plugin to `astro.config.mjs` and import Tailwind in a single global CSS file.
**When to use:** Project initialization — do this before writing any components.

```javascript
// astro.config.mjs
// Source: https://tailwindcss.com/docs/installation/framework-guides/astro
import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
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

### Pattern 2: CSS-First Design Token Configuration with Cascade Layers

**What:** All design tokens live in `global.css` under `@theme`. Cascade layer order is declared at the top, before any `@import`, ensuring Leaflet CSS cannot override Tailwind utilities.
**When to use:** Single source of truth for all design tokens; set up once, never change layer order.

```css
/* src/styles/global.css */
/* Source: https://tailwindcss.com/blog/tailwindcss-v4 */

/* 1. Declare layer order FIRST — sets precedence for entire stylesheet */
@layer leaflet, base, components, utilities;

/* 2. Import Tailwind (which populates base, components, utilities layers) */
@import "tailwindcss";

/* 3. Wrap Leaflet CSS in the lowest-priority layer */
/* (Leaflet is loaded in Phase 3 — add this line then) */
/* @import "leaflet/dist/leaflet.css" layer(leaflet); */

/* 4. Define design tokens */
@theme {
  /* Color palette — dark brutalist psychedelic */
  --color-bg-base: oklch(0.10 0.01 250);        /* Near-black */
  --color-bg-surface: oklch(0.14 0.01 250);     /* Slightly lighter black */
  --color-accent-green: oklch(0.85 0.24 145);   /* Acid green */
  --color-accent-red: oklch(0.45 0.22 25);      /* Blood red */
  --color-accent-white: oklch(0.92 0.01 90);    /* Off-white */
  --color-text-body: oklch(0.85 0.01 90);       /* Off-white body */
  --color-text-muted: oklch(0.55 0.01 90);      /* Muted gray */
  --color-border: oklch(0.25 0.01 250);         /* Subtle border */

  /* Typography */
  --font-sans: var(--font-mono);                /* Override default sans with mono */
  --font-mono: "Space Mono", ui-monospace, monospace;
  --font-display: "Special Elite", serif;

  /* Spacing and sizing (keep Tailwind defaults) */
}

/* 5. Base element resets applying the palette */
@layer base {
  html, body {
    background-color: var(--color-bg-base);
    color: var(--color-text-body);
    font-family: var(--font-mono);
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-display);
    color: var(--color-accent-white);
  }
}
```

### Pattern 3: Astro Base Layout with Font Component

**What:** BaseLayout.astro contains the `<html>` shell, imports global CSS, and includes the Astro Font component in `<head>`.
**When to use:** Every page uses this layout — it's the single carrier of fonts and global styles.

```astro
---
// src/layouts/BaseLayout.astro
// Source: https://docs.astro.build/en/basics/layouts/
import { Font } from "astro:assets";
import "../styles/global.css";

interface Props {
  title?: string;
  description?: string;
}
const { title = "MK Ultra Gravel", description = "" } = Astro.props;
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <!-- Astro Font API: downloads fonts, emits preload links, prevents FOUT -->
    <Font cssVariable="--font-mono" />
    <Font cssVariable="--font-display" />
  </head>
  <body>
    <slot />
  </body>
</html>
```

### Pattern 4: Single-Page Scroll Structure with Named Anchors

**What:** `index.astro` uses semantic `<section>` elements with `id` attributes for scroll-to-anchor navigation. No JavaScript required for basic scroll behavior.
**When to use:** The site is a single-page scroll — this is the page's structural skeleton.

```astro
---
// src/pages/index.astro
import BaseLayout from "../layouts/BaseLayout.astro";
---

<BaseLayout title="MK Ultra Gravel 100mi">
  <!-- Visual hero/header with tone imagery and Escher motifs -->
  <section id="hero" class="...">
    ...
  </section>

  <!-- Route overview section -->
  <section id="route" class="...">
    ...
  </section>

  <!-- Map section (Leaflet loads here in Phase 3) -->
  <section id="map" class="...">
    ...
  </section>

  <!-- Photos section -->
  <section id="photos" class="...">
    ...
  </section>
</BaseLayout>
```

### Pattern 5: SVG Grain Texture Overlay (Surrealist Visual Motif)

**What:** An inline SVG with `feTurbulence` filter creates a grainy paper/noise texture layered over the background. This is the "redacted document texture" motif.
**When to use:** Apply to `body::before` or a dedicated overlay element on the base layout.

```css
/* In global.css — @layer components */
@layer components {
  .grain-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    opacity: 0.06;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    background-repeat: repeat;
    background-size: 200px 200px;
    z-index: 9999;
  }
}
```

### Anti-Patterns to Avoid

- **Using `tailwind.config.js`:** Does not exist in Tailwind v4. All configuration belongs in CSS via `@theme`.
- **Using `@astrojs/tailwind`:** This package is deprecated for Tailwind v4. Use `@tailwindcss/vite` in `vite.plugins`.
- **Importing Leaflet CSS without a layer:** Without `layer(leaflet)`, Leaflet's styles sit in the unlayered cascade and override any layered Tailwind utilities with the same properties.
- **Using `<link>` tags for Google Fonts CDN:** Bypasses Astro's preload optimization, risks FOUT, and transmits user data to Google.
- **Defining fonts in `:root` instead of `@theme`:** Only `@theme` tokens generate Tailwind utility classes (`font-mono`, `font-display`, etc.). `:root` variables won't.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Font preloading | Manual `<link rel="preload">` tags | Astro 6 Fonts API | Handles preloads, fallback generation, FOUT, caching, and privacy automatically |
| Font-face declarations | `@font-face` CSS blocks | Astro 6 Fonts API | Automatic fallback metrics generation prevents FOUT |
| Tailwind CSS variable theming | Manual CSS variable injection | `@theme` directive | Built-in to Tailwind v4; tokens auto-generate utility classes |
| CSS specificity hacks for Leaflet | `!important` overrides | CSS cascade layers | Layer order is mathematically stronger than specificity; maintainable |
| SVG grain texture | Complex canvas/canvas API | Inline SVG with `feTurbulence` | Pure CSS/SVG, no JavaScript, works in all modern browsers |

**Key insight:** Astro 6 Fonts API and Tailwind v4's `@theme` system solve the two hardest problems here (FOUT and design token consistency) out of the box. Don't replicate their work.

---

## Common Pitfalls

### Pitfall 1: Using the Deprecated @astrojs/tailwind Integration

**What goes wrong:** Developer installs `@astrojs/tailwind` (the old Astro Tailwind integration), which wraps PostCSS and does not support Tailwind v4 CSS-first config or `@theme`.
**Why it happens:** Google searches return many tutorials using the old integration.
**How to avoid:** Install `tailwindcss @tailwindcss/vite` and add the Vite plugin to `astro.config.mjs`. Never `npx astro add tailwind` with Tailwind v4 installed — verify the CLI behavior.
**Warning signs:** Presence of `tailwind.config.js` or `require('@astrojs/tailwind')` in config.

### Pitfall 2: Wrong Cascade Layer Declaration Order

**What goes wrong:** `@layer` declarations inside `@import "tailwindcss"` implicitly set Tailwind's own layer order. If you declare `@layer leaflet` AFTER importing Tailwind, Leaflet ends up with higher precedence than Tailwind utilities.
**Why it happens:** The layer order statement must precede all imports except `@charset`.
**How to avoid:** Put `@layer leaflet, base, components, utilities;` as the FIRST line of `global.css`, before `@import "tailwindcss"`.
**Warning signs:** Leaflet tile controls or popup styles randomly breaking Tailwind-styled elements.

### Pitfall 3: Font Not Applied Due to Missing Font Component

**What goes wrong:** Fonts are configured in `astro.config.mjs` but the `<Font />` component is never added to the page `<head>`. Fonts load without preload links.
**Why it happens:** The Astro Fonts API requires both sides: config registers the font, `<Font cssVariable="..." />` emits the `<link rel="preload">` and `@font-face` into the DOM.
**How to avoid:** Add `<Font cssVariable="--font-mono" />` and `<Font cssVariable="--font-display" />` inside `<head>` in `BaseLayout.astro`.
**Warning signs:** FOUT visible on first load; fonts load but without preload.

### Pitfall 4: @theme Outside Top-Level Scope

**What goes wrong:** Placing `@theme` inside a `@layer` block or nested inside a selector causes it to be ignored or error.
**Why it happens:** `@theme` must be a top-level at-rule, not nested.
**How to avoid:** Keep `@theme { ... }` at the root level of `global.css`, alongside (not inside) `@layer` declarations.
**Warning signs:** Tailwind utility classes for custom colors (e.g., `bg-accent-green`) not generating.

### Pitfall 5: Node Version Below 22.12.0

**What goes wrong:** `npm create astro@latest` or `astro dev` fails with Node version errors.
**Why it happens:** Astro 6 requires Node v22.12.0+, dropping Node 18 and 20.
**How to avoid:** Verify `node --version` before installing. Switch with nvm if needed: `nvm use 22`.
**Warning signs:** Installation errors referencing Node compatibility during `npm create astro`.

---

## Code Examples

Verified patterns from official sources:

### Full Tailwind v4 + Astro Vite Config

```javascript
// astro.config.mjs
// Source: https://tailwindcss.com/docs/installation/framework-guides/astro
import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: [
    {
      name: "Space Mono",
      cssVariable: "--font-mono",
      provider: fontProviders.google(),
      weights: [400, 700],
      styles: ["normal"],
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

### Tailwind v4 @theme Color Token Definition

```css
/* Source: https://tailwindcss.com/docs/theme */
@theme {
  /* Namespace --color-* generates bg-*, text-*, border-*, etc. */
  --color-bg-base: oklch(0.10 0.01 250);
  --color-accent-green: oklch(0.85 0.24 145);
  --color-accent-red: oklch(0.45 0.22 25);

  /* Namespace --font-* generates font-* utility classes */
  --font-mono: "Space Mono", ui-monospace, monospace;
  --font-display: "Special Elite", serif;
}
```

### Wrapping Leaflet CSS in a Cascade Layer

```css
/* Source: MDN @layer documentation + Smashing Magazine cascade layers guide */
/* Declare order first — leaflet is lowest priority */
@layer leaflet, base, components, utilities;

@import "tailwindcss";

/* Add when Leaflet is installed in Phase 3 */
@import "leaflet/dist/leaflet.css" layer(leaflet);
```

### Tone Reference Image Integration (Inline on Base Page)

```astro
<!-- Place tone images in sections as design elements -->
<!-- Images are in /images/tone/ — copy needed ones to /public/tone/ during build -->
<div class="tone-image-block" aria-hidden="true">
  <img src="/tone/CIA-MKULTRA-IG_Page_01.jpg" alt=""
       class="opacity-20 mix-blend-multiply w-full object-cover" />
</div>
```

**Note:** Route/tone images in `images/` are NOT in `public/` currently. They need to be either moved to `public/` or copied via a prebuild script to be served as static assets. Alternatively, import them from `src/` and let Astro's asset pipeline handle them.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` | `@theme` in CSS | Tailwind v4 (Jan 2025) | No JS config file; tokens are CSS variables |
| `@tailwind base/components/utilities` | `@import "tailwindcss"` | Tailwind v4 | One line replaces three |
| `@astrojs/tailwind` integration | `@tailwindcss/vite` plugin | Astro 5.2+ / Tailwind v4 | Old integration deprecated for v4 |
| Manual `<link rel="preload">` for fonts | Astro Fonts API | Astro 6.0 (Mar 2026) | Automatic preloads, FOUT fix, privacy |
| `postcss-import` for CSS @imports | Native Tailwind v4 bundling | Tailwind v4 | No extra PostCSS plugin needed |

**Deprecated/outdated:**
- `@astrojs/tailwind`: Deprecated for Tailwind v4 usage. Still works with Tailwind v3 but don't use for this project.
- `tailwind.config.js`: Replaced by `@theme` in CSS for Tailwind v4. Can still exist for v3 compat but creates confusion.
- Google Fonts `<link>` CDN tag: Still works but bypasses Astro 6 Fonts API optimizations.

---

## Open Questions

1. **Display font final selection**
   - What we know: Special Elite (typewriter/distressed, Google Fonts, free) fits the CIA document aesthetic. VT323 is more retro terminal. Creepster is cartoonish.
   - What's unclear: The project owner's preference between "distressed typewriter" (Special Elite) vs "degraded handwriting" vs "surrealist" display styles. All are available on Google Fonts.
   - Recommendation: Default to Special Elite for CIA document authenticity; it can be swapped with one line in `astro.config.mjs`.

2. **Images/tone location for static serving**
   - What we know: Tone images are in `images/tone/` (project root), not `public/`. Astro only serves `public/` as static assets.
   - What's unclear: Whether a prebuild copy step is preferred or whether images should be imported via Astro's asset pipeline (`src/assets/`).
   - Recommendation: During Phase 2, copy or symlink key tone images to `public/tone/` for reference via URL. Full asset pipeline integration can be Phase 3+ work.

3. **oklch color values for exact palette**
   - What we know: The palette direction is "near-black backgrounds, acid-green/blood-red/off-white accents."
   - What's unclear: Exact oklch values are not specified in requirements. The values in Code Examples above are reasonable starting points.
   - Recommendation: Define them in `@theme`, apply to base layout, and adjust visually — the mechanism is correct; exact values are a design decision.

---

## Sources

### Primary (HIGH confidence)
- https://tailwindcss.com/docs/installation/framework-guides/astro — Exact Tailwind v4 + Astro installation steps
- https://tailwindcss.com/docs/theme — Full `@theme` directive documentation with namespaces and syntax
- https://tailwindcss.com/blog/tailwindcss-v4 — Tailwind v4 cascade layers structure (`theme, base, components, utilities`)
- https://docs.astro.build/en/guides/fonts/ — Astro 6 Fonts API: Font component, cssVariable, providers, FOUT prevention
- https://docs.astro.build/en/install-and-setup/ — Node 22.12.0+ requirement confirmed
- https://astro.build/blog/astro-6/ — Astro 6 stable release features: Fonts API, Vite 7, breaking changes
- https://docs.astro.build/en/basics/layouts/ — BaseLayout pattern with slot and head management
- https://docs.astro.build/en/basics/project-structure/ — Official directory structure

### Secondary (MEDIUM confidence)
- WebSearch (verified via Tailwind docs): `@layer leaflet, base, components, utilities` order prevents Leaflet conflicts
- WebSearch + MDN: `@import "leaflet/dist/leaflet.css" layer(leaflet)` is the correct CSS syntax for wrapping third-party CSS in a named layer
- WebSearch + freecodecamp.org: `feTurbulence` SVG filter for grainy texture overlay is a well-documented CSS pattern with no JavaScript required

### Tertiary (LOW confidence)
- WebSearch: Special Elite as the display font recommendation — only WebSearch sources; final selection is a design decision, not a technical one
- WebSearch: oklch color values for acid-green/blood-red — approximate; exact values need visual iteration

---

## Metadata

**Confidence breakdown:**
- Standard stack (Astro 6, Tailwind v4, @tailwindcss/vite): HIGH — verified against official docs
- Architecture (BaseLayout, @theme, global.css structure): HIGH — verified against official docs
- Astro Fonts API (Font component, cssVariable, FOUT prevention): HIGH — verified against official Astro 6 docs
- Cascade layers for Leaflet conflict: HIGH (mechanism) / MEDIUM (exact CSS syntax) — CSS spec confirmed, Leaflet-specific pattern from multiple credible sources
- SVG grain texture: MEDIUM — well-documented technique, multiple tutorial sources
- Display font recommendation: LOW — design judgment, not technical verification
- Exact color values: LOW — directionally correct, values need visual tuning

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable stack; Astro 6 and Tailwind v4 are recent stable releases)
