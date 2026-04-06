# Phase 49: Results CTA and Nav Update - Research

**Researched:** 2026-04-06
**Domain:** Astro static page authoring, navigation component editing, design system extension
**Confidence:** HIGH

## Summary

Phase 49 is a small, well-scoped UI phase with three distinct tasks: (1) create a new `/results` page as a styled CTA pointing to ironpineomnium.com, (2) update SiteNav to remove the Submit link, and (3) verify that existing Strava segment links on sector and KOM cards still work. All three tasks are pure frontend work against the existing Astro/Tailwind v4 static stack — no new libraries, no infrastructure changes.

The research confirms the `/results` route does not exist (deleted in Phase 48). Creating `src/pages/results.astro` is the canonical Astro way to restore it. SiteNav already contains the Submit link to remove — it's a trivial two-line edit. Strava segment links are driven by `stravaSegmentId` fields in `public/data/annotations.json`; all 7 sector IDs and 3 KOM IDs are confirmed present and correct. The site is already pure static (verified by Phase 48 verification).

The only design judgment required is styling the CTA page to match the existing dark brutalist aesthetic. The site has a well-established design system (tokens, component classes, layout patterns) that the new page should follow.

**Primary recommendation:** Model the `/results` CTA page closely on the hero section of `index.astro` — same layout primitives, same component classes (`.stamp`, `.tone-image`, `.classified-border`), same font treatments — but with content focused on redirecting to ironpineomnium.com. No new design language needed.

## Standard Stack

### Core

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Astro | ^6.1.1 | Page routing, SSG | Existing framework — file-based routing at `src/pages/` |
| Tailwind v4 | ^4.2.2 | Utility classes | Existing CSS framework with `@theme` tokens |
| BaseLayout.astro | — | Wraps every page with `<html>`, SiteNav, fonts, overlays | Already used by `index.astro` |

### Supporting

No additional packages needed. All design system primitives are in `src/styles/global.css`.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `src/pages/results.astro` (static page) | Netlify redirect to ironpineomnium.com directly | A redirect would skip the CTA page — phase explicitly requires a styled CTA, not a raw redirect |
| Editing SiteNav.astro | Adding CSS to hide Submit link | Editing is correct — removing dead nav links from source is cleaner than hiding them |

**Installation:** None required.

## Architecture Patterns

### Recommended Project Structure (changes only)

```
src/
├── pages/
│   ├── index.astro          # unchanged
│   └── results.astro        # NEW — styled CTA page (was deleted in Phase 48)
└── components/
    └── SiteNav.astro         # EDIT — remove Submit link from navLinks array
```

### Pattern 1: Astro File-Based Routing

**What:** Creating `src/pages/results.astro` automatically creates the `/results` route in the static build. No configuration needed.
**When to use:** Any time a new static page is needed.
**Example:**

```astro
---
// src/pages/results.astro
import BaseLayout from "../layouts/BaseLayout.astro";
---

<BaseLayout title="Results — MK Ultra Gravel">
  <main>
    <!-- page content -->
  </main>
</BaseLayout>
```

**Key detail:** `BaseLayout.astro` already includes `SiteNav` and the visual overlays (grain, escher, LizardBackground). The results page gets all of these for free just by wrapping with BaseLayout.

### Pattern 2: Design System Usage

The codebase has well-established component classes in `src/styles/global.css`. The results CTA page should use these to stay on-brand:

| Class | Purpose | When to use |
|-------|---------|-------------|
| `.stamp` | Red stamp-style label (rotated, bordered) | "Classification: Ultra" style labels |
| `.classified-border` | Bordered box with "CLASSIFIED" corner label | Content cards |
| `.tone-image` | Greyscale blended background texture | Atmospheric tone images |
| `.redacted` | Black-bar text redaction effect | Thematic text treatment |

Design tokens available via Tailwind classes (configured in `@theme`):
- `text-accent-green` / `text-accent-red` / `text-accent-white` / `text-text-muted`
- `bg-bg-base` / `bg-bg-surface` / `bg-bg-elevated`
- `border-border`
- `font-mono` (Space Mono) / `font-display` (Special Elite)

### Pattern 3: SiteNav navLinks Array Edit

**What:** SiteNav has a hardcoded `navLinks` array with 3 items. Remove the Submit item.
**Current state:**

```typescript
// src/components/SiteNav.astro (lines 5-9)
const navLinks = [
  { href: "/", label: "Home" },
  { href: "/results", label: "Results" },
  { href: "/submit", label: "Submit" },
];
```

**Target state after edit:**

```typescript
const navLinks = [
  { href: "/", label: "Home" },
  { href: "/results", label: "Results" },
];
```

Also remove the dead `isActive()` logic for `/submit`:

```typescript
// Remove these 3 lines from isActive():
if (href === "/submit") {
  return pathname === "/submit" || pathname.startsWith("/submit-confirm");
}
```

The remaining `isActive()` logic (`return pathname === href`) handles both `"/"` and `"/results"` correctly without special-casing.

### Pattern 4: CTA Link Pattern

The existing CTA buttons on `index.astro` use this pattern:

```astro
<a
  href="https://www.bikereg.com/mk-ultra-gravel"
  class="inline-block bg-accent-green text-bg-base font-bold uppercase tracking-widest
         px-8 py-4 text-lg hover:opacity-90 transition-opacity mb-6
         active:translate-y-px active:scale-[0.98] motion-reduce:active:transform-none"
>
  Register Now
</a>
```

Use the same pattern for the ironpineomnium.com CTA link. The `target="_blank" rel="noopener noreferrer"` attributes are needed since it's an external link.

### Anti-Patterns to Avoid

- **Using a Netlify redirect rule:** The phase requires a styled CTA page, not a transparent redirect. A redirect would bypass the page entirely.
- **Adding a new layout:** BaseLayout handles all shared concerns. Don't create a separate layout for results.
- **Leaving Submit isActive() logic:** Dead code referencing the deleted `/submit` route. Remove it cleanly alongside the navLinks entry.
- **Adding animations beyond existing patterns:** The site uses scroll-reveal (`data-reveal` + IntersectionObserver) from `index.astro`'s script block. This observer only runs on the current page. The results page should have its own `<script>` block if scroll-reveal is desired, or omit it for simplicity since the CTA page is short.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Page shell (html, head, nav, overlays) | Custom HTML structure | `BaseLayout.astro` | Already handles fonts, SiteNav, grain/escher/lizard overlays, body padding |
| Design tokens | Custom CSS vars | Tailwind `@theme` tokens via utility classes | Already defined, consistent with rest of site |
| External link icon | Custom SVG | None needed (plain text CTA is fine; site uses plain "View on Strava" text elsewhere) | Consistency |

**Key insight:** This phase is additive within the existing design system. There's nothing to build from scratch.

## Common Pitfalls

### Pitfall 1: Scroll-Reveal Observer Not Initializing on Results Page

**What goes wrong:** If `data-reveal` attributes are used on the results page, the IntersectionObserver that drives reveal animations won't exist — it's only wired up in `index.astro`'s inline `<script>` block.
**Why it happens:** The reveal observer script is not in BaseLayout; it was intentionally placed in index.astro since that was the only page.
**How to avoid:** Either (a) omit `data-reveal` on the results page (safe — the page is a simple CTA, not a long scroll), or (b) add the same `<script>` block to `results.astro`. Option (a) is simpler for a short page.
**Warning signs:** Elements with `data-reveal` stay invisible (opacity: 0) because `.is-visible` is never added.

### Pitfall 2: netlify.toml /api/* Redirect Rule Still Present

**What goes wrong:** `netlify.toml` still has `[[redirects]] from = "/api/*" to = "/.netlify/functions/:splat"` — a vestigial rule from before Phase 48 deleted all Netlify Functions. This is a no-op (no functions to match) and causes no errors. However, it's misleading.
**Why it happens:** Phase 48 explicitly left this rule in scope as "harmless." Phase 49 does not address it per requirements.
**How to avoid:** Do not clean up `netlify.toml` in Phase 49 unless the planner chooses to add it as a bonus cleanup. It's not required for any success criterion.
**Warning signs:** None — it's genuinely harmless.

### Pitfall 3: Results Nav Link Active State on /results

**What goes wrong:** After removing the Submit special-case in `isActive()`, verify that `"/results"` correctly activates. The remaining logic `return pathname === href` correctly handles it (`pathname === "/results"` when on the results page).
**Why it happens:** N/A if the simplified logic is used — just confirming there's no hidden dependency.
**How to avoid:** The simplified `isActive()` is correct. Test by visiting `/results` and confirming the Results nav link gets `aria-current="page"` styling (green underline).

### Pitfall 4: CTA Page Title/Description Missing

**What goes wrong:** If `BaseLayout` is used without passing `title` and `description` props, the page gets the default title "MK Ultra Gravel — June 7, 2026" which is fine but not specific.
**Why it happens:** BaseLayout has defaults for both props.
**How to avoid:** Pass a specific title like `"Results — MK Ultra Gravel"` and a relevant description. This is minor but good practice.

## Code Examples

### Strava Segment Link Pattern (already in place — preservation check)

```astro
// Source: src/components/GravelSectors.astro (lines 57-71)
{sector.stravaSegmentId && (
  <a
    href={`https://www.strava.com/segments/${sector.stravaSegmentId}`}
    target="_blank"
    rel="noopener noreferrer"
    class="inline-flex items-center gap-1 text-xs text-[#FC5200] hover:opacity-80 transition-opacity mt-2"
    aria-label={`View ${sector.name} on Strava`}
  >
    <svg ...>...</svg>
    View on Strava
  </a>
)}
```

All 7 sector `stravaSegmentId` values confirmed in `annotations.json`:
- BAA: 41159670
- Sandstrom: 24479292
- Akkala Rd: 24479426
- Haavisto: 24479467
- Forest Service Rd: 24479496
- C4: 34573011
- Down Jeep: 6809754

All 3 KOM `stravaSegmentId` values confirmed:
- Billie Helmer: 24479270
- Leaving Chatham: 41126651
- Silver Creek: 16438243

These are in `public/data/annotations.json`, which is read at build time by both components. No changes needed to either component.

### Results Page Skeleton

```astro
---
// src/pages/results.astro
import BaseLayout from "../layouts/BaseLayout.astro";
---

<BaseLayout
  title="Results — MK Ultra Gravel"
  description="MK Ultra Gravel results and leaderboards are hosted on ironpineomnium.com."
>
  <main class="min-h-screen flex items-center justify-center px-4">
    <div class="text-center max-w-2xl">
      <p class="stamp mb-6">Results</p>
      <h1 class="text-4xl md:text-6xl mb-4">Leaderboards</h1>
      <p class="text-text-muted text-lg mb-8">
        MK Ultra Gravel results are hosted on Iron & Pine Omnium.
      </p>
      <a
        href="https://ironpineomnium.com"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-block bg-accent-green text-bg-base font-bold uppercase tracking-widest
               px-8 py-4 text-lg hover:opacity-90 transition-opacity
               active:translate-y-px active:scale-[0.98] motion-reduce:active:transform-none"
      >
        View Results at ironpineomnium.com
      </a>
    </div>
  </main>
</BaseLayout>
```

Note: The exact copy, spy/CIA-themed framing, and visual elements (tone image, stamp text, etc.) are design choices the planner can specify. The skeleton above is minimal; it can be enriched with on-brand content.

### SiteNav After Edit

```typescript
// src/components/SiteNav.astro — final state
const navLinks = [
  { href: "/", label: "Home" },
  { href: "/results", label: "Results" },
];

function isActive(href: string): boolean {
  return pathname === href;
}
```

## Current Codebase State (Phase 48 confirmed)

| File | Status | Notes |
|------|--------|-------|
| `src/pages/results.astro` | ABSENT (deleted Phase 48) | Must be created in Phase 49 |
| `src/pages/submit.astro` | ABSENT (deleted Phase 48) | Dead link in SiteNav |
| `src/components/SiteNav.astro` | PRESENT | Has Submit link pointing to deleted page |
| `src/components/GravelSectors.astro` | PRESENT | 7 sector Strava links intact |
| `src/components/KomSegments.astro` | PRESENT | 3 KOM Strava links intact (Phase 48 only removed time data) |
| `public/data/annotations.json` | PRESENT | All 10 stravaSegmentId values confirmed |
| `netlify/` directory | ABSENT | No Netlify Functions |
| `netlify.toml` | PRESENT | Clean except harmless /api/* redirect rule |

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| /results loaded athlete JSON + scoring engine at build time | /results is a static CTA (no data dependency) | Build is simpler, no data reading needed |
| Nav: Home + Results + Submit | Nav: Home + Results | Submit removed (page deleted in Phase 48) |

## Open Questions

1. **CTA page visual richness**
   - What we know: The phase says "styled page with clear CTA" — minimum bar is a readable page with a link. The site's design system supports richer treatment.
   - What's unclear: How much thematic content (CIA/psychedelic flavor, tone image, stamp label) should the page have?
   - Recommendation: Include thematic elements matching index.astro's hero section to feel cohesive. At minimum: `.stamp` label, hero-style heading, muted descriptive text, green CTA button.

2. **ironpineomnium.com URL handling**
   - What we know: The CTA links to `https://ironpineomnium.com`.
   - What's unclear: Whether the site is live yet and whether to link to a specific page (e.g., `/events/mk-ultra-gravel`).
   - Recommendation: Use `https://ironpineomnium.com` root for now (most resilient). The phase spec doesn't reference a sub-path.

3. **Scroll-reveal on results page**
   - What we know: The reveal observer is in index.astro, not BaseLayout.
   - What's unclear: Whether the results page needs entrance animations.
   - Recommendation: Omit `data-reveal` on the results page (it's a short CTA, animations would feel heavy). Do not copy the observer script unless reveal is explicitly desired.

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection — all file contents verified via Read and Bash tools
- `src/components/SiteNav.astro` — read in full (83 lines)
- `src/components/GravelSectors.astro` — read in full (76 lines)
- `src/components/KomSegments.astro` — read in full (70 lines)
- `public/data/annotations.json` — all 10 stravaSegmentId values confirmed via Python parse
- `src/layouts/BaseLayout.astro` — read in full (43 lines)
- `src/styles/global.css` — read first 180 lines; all design tokens and component classes confirmed
- `.planning/phases/48-strava-infrastructure-removal/48-VERIFICATION.md` — Phase 48 completion state confirmed
- `astro.config.mjs` — static-only build confirmed (no adapter = static output)
- `netlify.toml` — no functions configuration remains
- `package.json` — no test/validate scripts; build scripts only

### Secondary (MEDIUM confidence)

None — everything needed was verifiable from the local codebase.

## Metadata

**Confidence breakdown:**
- Codebase state: HIGH — all relevant files read directly
- Standard stack: HIGH — no new libraries needed; existing stack fully sufficient
- Architecture patterns: HIGH — patterns derived from existing working code
- Pitfalls: HIGH — derived from actual code analysis, not hypothetical
- Design guidance: MEDIUM — design choices (thematic richness of CTA page) are judgment calls not verifiable from code

**Research date:** 2026-04-06
**Valid until:** Phase execution (static codebase, won't change between now and execution)
