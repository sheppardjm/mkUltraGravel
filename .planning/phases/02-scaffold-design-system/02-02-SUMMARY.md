---
phase: 02-scaffold-design-system
plan: "02"
subsystem: ui
tags: [astro, tailwind, css, design-tokens, fonts, oklch, google-fonts]

# Dependency graph
requires:
  - phase: 02-01
    provides: Astro 6 + Tailwind v4 scaffold with global.css @layer declaration and empty @theme block

provides:
  - Complete design token system in @theme (9 colors, 3 font stacks) accessible as Tailwind utilities
  - Astro Fonts API config loading Space Mono and Special Elite from Google Fonts
  - BaseLayout.astro wrapping all pages with Font components, meta tags, and global CSS
  - Single-page scroll index.astro with 5 named section anchors (hero, route, sectors, photos, info)
  - Base styles for html/body/headings/links/selection via @layer base

affects: [03-map-elevation, 04-elevation-profile, 05-sectors, 06-photos, 07-event-info, 08-nav-footer]

# Tech tracking
tech-stack:
  added: [Astro Fonts API (built-in astro/config fontProviders), oklch color space]
  patterns:
    - CSS-first design tokens in @theme block consumed directly as Tailwind utilities
    - Astro Fonts API with fontProviders.google() for zero-flash font loading
    - BaseLayout.astro as universal page wrapper with Font cssVariable components

key-files:
  created:
    - src/layouts/BaseLayout.astro
  modified:
    - src/styles/global.css
    - astro.config.mjs
    - src/pages/index.astro

key-decisions:
  - "Astro Fonts API (fontProviders.google()) used for font loading — confirmed available in Astro 6.1.1 via astro/config import"
  - "oklch color space chosen for all color tokens — perceptually uniform, wide-gamut capable"
  - "Font tokens use CSS variable indirection: --font-mono references Astro-injected var, @theme token provides fallback chain"
  - "--font-sans aliased to var(--font-mono) — intentional design choice for monospace-everything aesthetic"

patterns-established:
  - "Design tokens pattern: all colors/fonts defined once in @theme, consumed everywhere as Tailwind utilities (text-accent-green, bg-bg-base, font-display)"
  - "BaseLayout pattern: every page wraps in BaseLayout.astro, never writes its own <html>/<head>"
  - "Section anchor pattern: id= attributes on <section> elements are permanent anchors — downstream phases fill content, never change IDs"

# Metrics
duration: ~1min
completed: 2026-03-26
---

# Phase 2 Plan 02: Design Token System Summary

**Dark brutalist design system with oklch color tokens, Space Mono + Special Elite via Astro Fonts API, and single-page scroll scaffold with 5 named section anchors**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-26T23:42:25Z
- **Completed:** 2026-03-26T23:43:40Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Complete @theme design token system: 9 oklch color tokens (bg-base, bg-surface, bg-elevated, accent-green, accent-red, accent-white, text-body, text-muted, border) + 3 font stacks
- Astro Fonts API configured for Space Mono (400/700, normal/italic) and Special Elite (400) — both from Google Fonts via fontProviders.google()
- BaseLayout.astro created as universal page wrapper with Font components, title/description props with event defaults, and global CSS import
- index.astro rewritten as permanent single-page scroll structure with 5 named sections (hero, route, sectors, photos, info) ready for downstream phase content

## Task Commits

Each task was committed atomically:

1. **Task 1: Populate design tokens and configure fonts** - `27b8bac` (feat)
2. **Task 2: Create BaseLayout and index page with section anchors** - `73aa18f` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `src/styles/global.css` - @theme color/font tokens + @layer base styles for html/body/headings/links/selection
- `astro.config.mjs` - Astro Fonts API config with fontProviders.google() for Space Mono and Special Elite
- `src/layouts/BaseLayout.astro` - Universal page wrapper with Font components, meta tags, slot
- `src/pages/index.astro` - 5-section single-page scroll: hero, route, sectors, photos, info

## Decisions Made
- Astro Fonts API confirmed available in Astro 6.1.1 — no fallback to manual `<link>` tags needed
- oklch chosen for color tokens — perceptually uniform space, natural for specifying dark palette with precise lightness and chroma control
- `--font-sans` aliased to `var(--font-mono)` — deliberate monospace-everything aesthetic for the brutalist design system
- Font token indirection pattern: @theme defines `--font-mono: "Space Mono", ...` which Astro's Font component overrides with the preloaded version

## Deviations from Plan

None — plan executed exactly as written. Astro Fonts API was available as expected; no fallback required.

## Issues Encountered
None. Dev server started cleanly on both verification passes. The `[content] Content config not loaded` warning is expected Astro behavior when no content collections are defined — unrelated to this plan.

## User Setup Required
None — no external service configuration required. Google Fonts are fetched automatically by Astro Fonts API at build time.

## Next Phase Readiness
- Design token system complete — all downstream phases can use `text-accent-green`, `font-display`, `bg-bg-base` without defining anything new
- BaseLayout wraps all pages — Phases 3-8 create components that slot into existing section anchors
- Section anchors are permanent: `#hero`, `#route`, `#sectors`, `#photos`, `#info` — ready for nav in Phase 8
- Phase 3 (Map + Elevation): can now add Leaflet CSS import at the marked location in global.css

---
*Phase: 02-scaffold-design-system*
*Completed: 2026-03-26*
