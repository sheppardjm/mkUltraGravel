# Phase 51: Neucadia Footer - Research

**Researched:** 2026-04-07
**Domain:** Astro component authoring, CSS design tokens, static attribution footer
**Confidence:** HIGH

## Summary

Phase 51 adds a "Powered by Neucadia" attribution footer to every page of the site. The implementation is straightforward: a new `NeucadiaFooter.astro` component placed in `BaseLayout.astro` so it appears on all pages automatically.

The Neucadia logo (`/assets/neucadia_logo.png` on neucadia.com) is a horizontal wordmark with a bold blue "N" block followed by "EUCADIA" in light gray letters — clean, sans-serif, on a transparent background. The site has no existing local copy of this logo. The footer needs to inline or reference this asset.

The primary design constraint is FOOT-03: matching the site's dark brutalist aesthetic. The site uses `var(--font-mono)` for body text, `var(--color-text-muted)` for secondary content, `var(--color-border)` for dividers, and `var(--color-bg-base)` / `var(--color-bg-surface)` for backgrounds. The SiteNav component establishes the visual language for attribution-style text and is the pattern to follow for layout/spacing.

**Primary recommendation:** Create a single `NeucadiaFooter.astro` component, add it to `BaseLayout.astro` above `<slot />`, download and commit the Neucadia logo PNG to `public/` (or inline as SVG), style it with existing design tokens.

## Standard Stack

No new libraries needed. This phase is pure Astro component + CSS using the existing design system.

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Astro component (.astro) | 6.1.1 (project) | Footer markup + scoped styles | Matches every other component in this project |
| CSS custom properties | — | Design token access | Already established in global.css @theme |
| Tailwind v4 utilities | 4.2.2 (project) | Spacing/layout classes | Consistent with existing component patterns |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate .astro component | Inline in BaseLayout | Component is cleaner, independently verifiable, follows all other patterns |
| Fetching logo from neucadia.com at runtime | Local asset in public/ | Local is faster, no external dependency, no CORS issue |
| Logo as `<img>` | Inline SVG | PNG is available; SVG would need to be recreated from scratch |

**Installation:** No new packages required.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── NeucadiaFooter.astro   ← NEW (follows SiteNav.astro pattern)
├── layouts/
│   └── BaseLayout.astro       ← MODIFIED: add <NeucadiaFooter /> above <slot />
public/
└── neucadia-logo.png          ← NEW: downloaded from neucadia.com/assets/neucadia_logo.png
```

### Pattern 1: Footer as Standalone Astro Component
**What:** Self-contained `.astro` file with markup + `<style>` block using scoped CSS.
**When to use:** Any time a UI element appears on every page — identical to how `SiteNav.astro` works.
**Example (SiteNav pattern adapted for footer):**
```astro
---
// NeucadiaFooter.astro — no props, no frontmatter logic needed
---

<footer class="neucadia-footer">
  <a
    href="https://neucadia.com"
    target="_blank"
    rel="noopener noreferrer"
    class="neucadia-link"
    aria-label="Built by Neucadia — opens in new tab"
  >
    <span class="neucadia-label">Powered by</span>
    <img
      src="/neucadia-logo.png"
      alt="Neucadia"
      class="neucadia-logo"
      width="120"
      height="28"
      loading="lazy"
    />
  </a>
</footer>

<style>
  .neucadia-footer {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1.5rem;
    border-top: 1px solid var(--color-border);
    background-color: var(--color-bg-base);
    font-family: var(--font-mono);
  }

  .neucadia-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    color: var(--color-text-muted);
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition: color 0.15s ease;
  }

  .neucadia-link:hover {
    color: var(--color-accent-white);
  }

  .neucadia-logo {
    opacity: 0.6;
    filter: grayscale(100%) brightness(2);
    height: 1rem;
    width: auto;
    transition: opacity 0.15s ease;
  }

  .neucadia-link:hover .neucadia-logo {
    opacity: 0.85;
  }

  @media (prefers-reduced-motion: reduce) {
    .neucadia-link,
    .neucadia-logo {
      transition: none;
    }
  }
</style>
```

### Pattern 2: BaseLayout Integration
**What:** Import component in `BaseLayout.astro`, add it inside `<body>` after `<slot />`.
**When to use:** Any persistent page element (SiteNav uses the same placement logic, but before `<slot />`).
**Example:**
```astro
<!-- BaseLayout.astro body, current structure: -->
<body class="pt-12">
  <SiteNav />
  <div class="grain-overlay" aria-hidden="true"></div>
  <div class="escher-overlay" aria-hidden="true"></div>
  <LizardBackground />
  <slot />
  <NeucadiaFooter />   ← ADD HERE
</body>
```

Placing after `<slot />` ensures the footer appears below all page content on every page.

### Anti-Patterns to Avoid
- **Hardcoding the footer on each page individually:** `index.astro` and `results.astro` would each need updates and could diverge. Put it in `BaseLayout.astro` once.
- **Using `z-index` above 9998:** The grain-overlay sits at `z-index: 9999` and escher-overlay at `z-index: 9998`. The footer should have default stacking — it's static in flow, so no z-index issue unless `position: fixed` is used (don't use fixed for this footer).
- **White or light background on the logo:** The Neucadia logo has a light gray wordmark on transparent background. On the site's dark background, the gray letters will be subtle. Use `filter: grayscale(100%) brightness(2)` + opacity to tune visibility without inverting colors.
- **`rel="noopener"` omission:** Always include `rel="noopener noreferrer"` on `target="_blank"` links — this is a security best practice.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Logo inversion for dark bg | Custom image processing | CSS `filter: grayscale(100%) brightness(N)` | One-line CSS handles dark-theme logo adaptation |
| Footer visibility on all pages | Duplicating footer in each page file | Single placement in `BaseLayout.astro` | DRY, guaranteed coverage |

**Key insight:** The logo's color adaptation is a pure CSS filter problem — no image editing or new assets required beyond downloading the PNG.

## Common Pitfalls

### Pitfall 1: Logo Color on Dark Background
**What goes wrong:** The Neucadia logo PNG has a light gray "EUCADIA" wordmark and blue "N" — both will appear as expected on dark backgrounds, but the gray text may be too faint.
**Why it happens:** Logo designed for white/light backgrounds; the gray text has low contrast on near-black `var(--color-bg-base)` (`oklch(0.10 0.01 250)`).
**How to avoid:** Apply `filter: grayscale(100%) brightness(2)` to convert logo to pure white/light tones. Tune `opacity` for subtlety. On hover, increase opacity slightly.
**Warning signs:** Logo appears very faint or partially invisible against the dark background.

### Pitfall 2: Footer Sits Behind Grain/Escher Overlays
**What goes wrong:** The `grain-overlay` (z-index: 9999) and `escher-overlay` (z-index: 9998) are `position: fixed` and cover the entire viewport including the footer area.
**Why it happens:** Both overlays use `position: fixed; inset: 0` so they layer over everything.
**How to avoid:** Both overlays already have `pointer-events: none` — they don't block clicks. The footer will render visually beneath them, but the grain/escher effects are very low opacity (0.06 and 0.05) so this is intentional and consistent with the rest of the page. No fix needed — this is by design.
**Warning signs:** Footer links unresponsive — but this won't happen since overlays have `pointer-events: none`.

### Pitfall 3: Footer Pushed Off-Screen on Short Pages
**What goes wrong:** On the `/results` page, content may not fill the full viewport height. The footer might appear mid-screen rather than at the bottom.
**Why it happens:** The `body` has `min-height: 100vh` but `<main>` may not fill the remaining space.
**How to avoid:** If needed, change the body layout: `display: flex; flex-direction: column;` on body, and `flex: 1` on `<main>`. But verify first — the results page uses `min-h-screen` on its section, so this may not be an issue.
**Warning signs:** Footer floats in the middle of the page on the results view.

### Pitfall 4: Body `pt-12` Spacing Conflict
**What goes wrong:** The `<body>` has `class="pt-12"` (3rem top padding) to clear the fixed SiteNav. The footer doesn't need any corresponding padding adjustment — it sits in normal document flow.
**Why it happens:** The fixed nav needs body padding compensation; the footer doesn't because it's in-flow.
**How to avoid:** No action needed — just don't add bottom padding to body for the footer. The footer's own internal padding is sufficient.

## Code Examples

### Logo Asset Download
```bash
# Download logo to public directory
curl -o public/neucadia-logo.png https://neucadia.com/assets/neucadia_logo.png
```

### Full BaseLayout.astro Integration
```astro
---
import SiteNav from "../components/SiteNav.astro";
import NeucadiaFooter from "../components/NeucadiaFooter.astro";  // ADD
import LizardBackground from "../components/LizardBackground.astro";
// ... other imports
---
<body class="pt-12">
  <SiteNav />
  <div class="grain-overlay" aria-hidden="true"></div>
  <div class="escher-overlay" aria-hidden="true"></div>
  <LizardBackground />
  <slot />
  <NeucadiaFooter />   <!-- ADD -->
</body>
```

### CSS Filter for Dark-Background Logo Legibility
```css
/* Convert light-on-transparent logo to white-toned for dark bg */
.neucadia-logo {
  filter: grayscale(100%) brightness(2);
  opacity: 0.55;
}
.neucadia-link:hover .neucadia-logo {
  opacity: 0.85;
}
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| Footer in each page file | Footer in BaseLayout.astro | Single source of truth, guaranteed on all pages |

**No deprecated patterns apply** — this is a new addition with no prior implementation.

## Open Questions

1. **Logo file format: PNG vs SVG**
   - What we know: `neucadia.com/assets/neucadia_logo.png` is a 5.1KB PNG with a white/gray wordmark on transparent background. No SVG URL found.
   - What's unclear: Whether an SVG version is available (would be crisper at retina scales).
   - Recommendation: Use the PNG from neucadia.com. It's small (5.1KB), transparent background, and works fine. If SVG becomes available later, swap in.

2. **Exact logo opacity/filter values for best visual match**
   - What we know: Design tokens are dark brutalist. `var(--color-text-muted)` is `oklch(0.70 0.01 90)` — a fairly muted off-white.
   - What's unclear: Whether the Neucadia logo's blue "N" block should remain colored or be desaturated.
   - Recommendation: Keep `grayscale(100%)` to desaturate the blue "N" — preserves the brutalist dark monochrome aesthetic. If the client prefers the colored logo, remove `grayscale`.

3. **Sticky footer vs. in-flow footer**
   - What we know: The results page uses `min-h-screen` on its single section, so the footer will appear below it.
   - What's unclear: Whether there is a design preference for the footer to stick to the bottom on very short pages.
   - Recommendation: In-flow footer (not sticky/fixed). Consistent with how static attribution footers work on most sites.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `src/layouts/BaseLayout.astro` — layout structure verified
- Direct codebase inspection: `src/components/SiteNav.astro` — component pattern, CSS token usage verified
- Direct codebase inspection: `src/styles/global.css` — all design tokens, z-index values verified
- Direct codebase inspection: `src/pages/index.astro`, `src/pages/results.astro` — both pages use BaseLayout.astro

### Secondary (MEDIUM confidence)
- WebFetch `https://neucadia.com` — confirmed logo path `/assets/neucadia_logo.png`, tagline "Digital consultancy and innovative development solutions"
- WebFetch `https://neucadia.com/assets/neucadia_logo.png` — logo visually confirmed: bold blue "N" block + "EUCADIA" in light gray, sans-serif, horizontal wordmark, transparent background, ~283×38px

### Tertiary (LOW confidence)
- None needed — all findings verified from authoritative sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pure Astro + CSS, no new libraries
- Architecture: HIGH — BaseLayout + component pattern is established project convention
- Pitfalls: HIGH — z-index values and overlay behavior verified from source

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable domain — logo/branding unlikely to change)
