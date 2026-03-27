# Phase 14: Content - Research

**Researched:** 2026-03-27
**Domain:** Astro static component authoring, CSS interaction patterns, URL constants, server-side data fetch
**Confidence:** HIGH

## Summary

Phase 14 has four requirements across two planned sub-tasks. Three of the four (CONT-01, CONT-02, CONT-03) are purely content/authoring tasks: build a new Astro component and update two URL constants. The fourth (CONT-04) is a data-display task: fetch `route-data.json` at build time in index.astro and render `meta.totalMi` and `meta.elevationGainFt` in the page.

No new npm dependencies are needed. The design system already has all the CSS primitives required for the MK Ultra explainer component (`.redacted`, `.classified-border`, `.stamp`, `.tone-image`). The route stats data is already present in `route-data.json` as `meta.totalMi=98.23` and `meta.elevationGainFt=3189` — confirmed in Phase 11 (plan 02). BIKEREG_URL lives in two files and GLRC has no URL constant yet.

The main architectural question for CONT-01 is positioning: the roadmap says "between event info and the map," but in `index.astro` the current section order is hero → route (map+elevation) → CTA div → sectors → photos → info. The explainer section needs to be inserted AFTER the `#info` section (at the bottom of the page) or the roadmap description "between event info and the map" means a re-ordering. Research finding: **the roadmap success criterion says "between event info and the map" — the planner must decide whether to reorder sections or interpret this as "between info and a second map-adjacent CTA."** This is the one open question for the planner.

**Primary recommendation:** All four requirements are straightforward edits and new component work. No library research needed. The planner should resolve section ordering for CONT-01 before writing the plan; everything else is a direct edit.

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Astro component `.astro` | 6.1.1 (already installed) | MkUltraExplainer.astro | All components in this project use .astro — no exception needed |
| Tailwind v4 utilities | 4.2.2 (already installed) | Layout, typography, spacing | Used throughout; no new config needed |
| CSS `@layer components` in global.css | Already established | Custom CSS for redaction-reveal | Existing `.redacted` class is in this layer |
| Astro `Astro.glob` / `fetch` (server-side) | Built-in | Read route-data.json meta at build time | Pattern already used in pipeline scripts |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `fs.readFileSync` in Astro frontmatter | Read route-data.json synchronously at SSG build | CONT-04: display route stats in index.astro |
| CSS `:hover` pseudo-class | Redaction-reveal on hover | CONT-01: reveal text under redaction bars on hover |
| `transition` CSS property | Smooth redaction reveal | Optional — be careful with `prefers-reduced-motion` |

### No New Dependencies
Zero `npm install` calls needed. This phase uses only existing Astro, Tailwind, and browser APIs.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `fs.readFileSync` in Astro frontmatter | `fetch('/data/route-data.json')` in `<script>` | Static build-time is better — stats appear in SSR HTML, no client JS needed, no hydration flash |
| New CSS redaction class | Extend existing `.redacted` with `cursor-pointer:hover` | The existing `.redacted` is non-interactive (user-select: none). A new `.redacted-reveal` variant is cleaner and doesn't break hero usage |

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── MkUltraExplainer.astro   # NEW: CIA program explainer, redaction-reveal styling
├── pages/
│   └── index.astro               # MODIFIED: import MkUltraExplainer, add route stats display
└── styles/
    └── global.css                # MODIFIED: add .redacted-reveal variant (if needed)
```

### Pattern 1: Static Astro Component (MkUltraExplainer.astro)

**What:** A purely static Astro component with no frontmatter logic, no client JS. It renders CIA MK-Ultra history text, FOIA document references, and uses CSS `.redacted` and `.classified-border` classes from the existing design system.

**When to use:** When content is authoring-only and requires no data fetching or client interaction.

**Example (skeleton based on existing patterns in EventInfoBlock.astro):**
```astro
---
// No frontmatter needed — purely static HTML with existing CSS classes
---

<section class="relative px-4 py-16 overflow-hidden border-t border-border">
  <div class="relative z-10 max-w-2xl">
    <p class="stamp mb-6">Declassified</p>
    <h2 class="text-3xl md:text-5xl mb-8">Why MK Ultra?</h2>
    <div class="classified-border p-8 space-y-6 text-text-body text-sm leading-relaxed">
      <p>Operation <span class="redacted">MK-ULTRA</span> was a...</p>
      <!-- FOIA reference -->
      <p class="text-text-muted text-xs">Source: FOIA release, 1977</p>
    </div>
  </div>
</section>
```

### Pattern 2: Redaction-Reveal CSS Variant

**What:** The existing `.redacted` class (global.css:79-87) sets `color: var(--color-accent-white)` matching `background-color` — text is visually hidden behind a white block. `user-select: none` prevents selection. A hover variant reveals the text.

**Current `.redacted` implementation:**
```css
.redacted {
  background-color: var(--color-accent-white);
  color: var(--color-accent-white);
  padding: 0 0.25em;
  text-decoration: line-through;
  text-decoration-color: var(--color-bg-base);
  text-decoration-thickness: 0.15em;
  user-select: none;
}
```

**Recommended reveal pattern** — add `.redacted-reveal` variant to global.css `@layer components`:
```css
.redacted-reveal {
  background-color: var(--color-accent-white);
  color: var(--color-accent-white);
  padding: 0 0.25em;
  text-decoration: line-through;
  text-decoration-color: var(--color-bg-base);
  text-decoration-thickness: 0.15em;
  cursor: pointer;
  transition: color 0.2s ease, background-color 0.2s ease;
}
.redacted-reveal:hover,
.redacted-reveal:focus {
  color: var(--color-bg-base);
  background-color: var(--color-accent-green);
}
@media (prefers-reduced-motion: reduce) {
  .redacted-reveal {
    transition: none;
  }
}
```

**Note:** `.redacted` is already used in the hero (`index.astro:61`) with `user-select: none` — do NOT change `.redacted`. The new `.redacted-reveal` is an additive variant.

### Pattern 3: Route Stats Display via Astro SSG (CONT-04)

**What:** Read `route-data.json` in the Astro frontmatter of `index.astro` using `fs.readFileSync` (synchronous, runs at build time). Expose `meta.totalMi` and `meta.elevationGainFt` as template variables. Render in the `#route` section heading or subtitle.

**Why fs.readFileSync over fetch:** Astro pages run at build time (SSG). `fs.readFileSync` is synchronous and available in frontmatter. The file is local (`public/data/route-data.json`). This avoids a client-side fetch for data that doesn't change between deploys.

**Pattern (in index.astro frontmatter):**
```astro
---
import { readFileSync } from 'fs';
import { resolve } from 'path';

const routeDataPath = resolve('./public/data/route-data.json');
const routeDataJson = JSON.parse(readFileSync(routeDataPath, 'utf8'));
const routeMeta = routeDataJson.meta; // { totalMi: 98.23, elevationGainFt: 3189, trackpoints: 2498 }
---
```

**Then in the template:**
```astro
<h2 class="text-3xl md:text-5xl mb-8">The Route</h2>
<p class="text-text-muted text-sm mb-8">
  {Math.round(routeMeta.totalMi)} miles &mdash; {routeMeta.elevationGainFt.toLocaleString()} ft elevation gain
</p>
```

**Note on rounding:** `meta.totalMi = 98.23`. The hero currently says "100 miles" (updated per memory note: route extended to 100mi, awaiting updated GPX). The planner should note this: until updated GPX is in place, the JSON value is 98.23 but the hero text says 100. CONT-04 should display the live JSON value (`routeMeta.totalMi`) which will auto-update when the GPX is regenerated.

### Pattern 4: URL Constants Update (CONT-02, CONT-03)

**What:** BIKEREG_URL is a string constant defined in TWO places — `index.astro` frontmatter (line 13) and `EventInfoBlock.astro` frontmatter (line 3). Both must be updated atomically.

**Current state:**
```
src/pages/index.astro:13        const BIKEREG_URL = 'PENDING — confirm with event director';
src/components/EventInfoBlock.astro:3    const BIKEREG_URL = 'PENDING — confirm with event director';
```

**GLRC donation URL:** Currently there is NO URL constant or anchor for GLRC in EventInfoBlock.astro — the text says "We suggest a $10 donation to Great Lakes Recovery Centers" but there is no hyperlink. CONT-03 requires adding an `<a href="GLRC_URL">` wrapping "Great Lakes Recovery Centers" text in EventInfoBlock.astro. The URL value is TBD (provided by event director before launch).

**Recommended approach:**
- BIKEREG_URL: Update string value in both files (two-file edit)
- GLRC_URL: Add new constant in EventInfoBlock.astro frontmatter and wrap the existing text with `<a href={GLRC_URL}>Great Lakes Recovery Centers</a>`

### Anti-Patterns to Avoid

- **Modifying existing `.redacted` class:** It's used in the hero with `user-select: none`. Changing it breaks existing hero styling. Use `.redacted-reveal` as a new variant.
- **Fetching route-data.json client-side for CONT-04:** Adds a waterfall to the page for static data. Use `fs.readFileSync` in frontmatter for build-time embedding.
- **Only updating BIKEREG_URL in index.astro:** EventInfoBlock.astro has its own copy of the constant. Both must be updated.
- **Inserting MkUltraExplainer between existing sections without checking current page flow:** The current index.astro section order is: hero → #route (map+elevation) → CTA div → #sectors → #photos → #info. "Between event info and the map" in the roadmap means the explainer should be after `#info` or before `#route`. The planner must decide.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Redaction-reveal effect | Custom animation library | CSS `:hover` + `transition` on `.redacted-reveal` | CSS-only; zero JS; instant; prefers-reduced-motion compliant |
| Route stats data access | New API route or client fetch | `fs.readFileSync` in Astro frontmatter | Data is local, static, build-time; no client cost |
| Section layout | New grid system | Existing `.relative .px-4 .py-16 .border-t .border-border` pattern | All existing sections use this pattern — consistency is the point |

**Key insight:** Phase 14 is almost entirely content authoring, not engineering. The design system already has everything needed. The only new CSS is the `.redacted-reveal` variant.

## Common Pitfalls

### Pitfall 1: BIKEREG_URL split across two files

**What goes wrong:** Developer updates `index.astro` only. The hero CTA works but the EventInfoBlock's BikeReg link (if it exists) still points to placeholder. Or vice versa.

**Why it happens:** BIKEREG_URL was duplicated when EventInfoBlock was created in Phase 7. There was no shared constant module.

**How to avoid:** The plan must explicitly list BOTH files as required edits: `src/pages/index.astro` AND `src/components/EventInfoBlock.astro`. Verification must grep both files.

**Warning signs:** `grep PENDING src/pages/index.astro` returns 0 matches but `grep PENDING src/components/EventInfoBlock.astro` still returns 1.

### Pitfall 2: Missing GLRC hyperlink

**What goes wrong:** Developer updates the GLRC URL but doesn't add an `<a>` tag wrapping the text — the text still reads "Great Lakes Recovery Centers" but is not clickable.

**Why it happens:** EventInfoBlock.astro currently has NO `<a>` wrapping GLRC text — it's just `<strong>` text. CONT-03 requires adding an anchor element, not just defining a URL constant.

**How to avoid:** Plan must specify: (1) add `GLRC_URL` constant in frontmatter, (2) wrap existing `<strong class="text-accent-white">Great Lakes Recovery Centers</strong>` with `<a href={GLRC_URL}>`.

**Warning signs:** GLRC URL constant defined but text still not a hyperlink.

### Pitfall 3: Route stats showing wrong distance

**What goes wrong:** `routeMeta.totalMi` shows 98.23 in the UI. The hero already says "100 miles" (updated by hand). These two values conflict — users see "100 miles" in the hero and "98 miles" in the route section.

**Why it happens:** The GPX was extended to 100mi per memory note, but the updated GPX hasn't been processed yet — route-data.json still reflects the old 98.23mi track. Phase 14 reads `meta.totalMi` dynamically.

**How to avoid:** Display `Math.round(routeMeta.totalMi)` which gives "98" currently. This is fine — it will auto-update to 100 when the new GPX is processed. Do NOT hardcode "100" in the route section since the JSON is the source of truth. Note the discrepancy in the plan's human verification checkpoint.

**Warning signs:** Hard-coded "100" in the template rather than dynamic `routeMeta.totalMi`.

### Pitfall 4: MkUltraExplainer tone image missing

**What goes wrong:** Component references a tone image that doesn't exist in `public/tone/`.

**Why it happens:** All existing sections use one of these files: `CIA-MKULTRA-IG_Page_01.webp`, `escharian_stairs_fb.webp`, `lsd-mind-control.webp`, `Mkultra-lsd-doc.webp`, `MK-Ultra.webp`. Any new reference must use one of these.

**How to avoid:** Use `MK-Ultra.webp` (currently unused by any section) or reuse `Mkultra-lsd-doc.webp`. Do not reference images that don't exist.

### Pitfall 5: `user-select: none` on `.redacted-reveal` blocks hover reveal

**What goes wrong:** Developer copies `.redacted` styles (including `user-select: none`) to `.redacted-reveal`, preventing the reveal from working on touch or blocking text selection after reveal.

**How to avoid:** `.redacted-reveal` should NOT include `user-select: none`. The hover reveal only needs `cursor: pointer` and the color-swap rules.

## Code Examples

### CONT-04: Route stats in index.astro frontmatter

```astro
---
// Source: established pattern for build-time JSON access in Astro
import { readFileSync } from 'fs';
import { resolve } from 'path';

const routeDataPath = resolve('./public/data/route-data.json');
const routeDataJson = JSON.parse(readFileSync(routeDataPath, 'utf8'));
const routeMeta = routeDataJson.meta;
// routeMeta.totalMi = 98.23, routeMeta.elevationGainFt = 3189

// Existing imports below...
import BaseLayout from "../layouts/BaseLayout.astro";
// ...
---
```

### CONT-04: Route stats rendered in #route section

```astro
<!-- In index.astro, inside <section id="route"> -->
<h2 class="text-3xl md:text-5xl mb-4">The Route</h2>
<p class="text-text-muted text-sm mb-8">
  {Math.round(routeMeta.totalMi)} miles &mdash; {routeMeta.elevationGainFt.toLocaleString()} ft elevation gain
</p>
```

### CONT-01: MkUltraExplainer.astro structure skeleton

```astro
---
// No frontmatter required — purely static HTML
---

<section id="explainer" class="relative px-4 py-16 overflow-hidden border-t border-border">
  <img
    src="/tone/MK-Ultra.webp"
    alt=""
    class="tone-image inset-0 w-full h-full object-cover"
    loading="lazy"
  />
  <div class="relative z-10 max-w-2xl">
    <p class="stamp mb-6">Declassified</p>
    <h2 class="text-3xl md:text-5xl mb-8">Why MK Ultra?</h2>
    <div class="classified-border p-6 md:p-8 space-y-6 text-text-body text-sm leading-relaxed">
      <p>
        From 1953 to 1973, the CIA ran <span class="redacted-reveal">MKULTRA</span> —
        a covert program testing LSD, hypnosis, and psychological torture on
        unwitting subjects including mental patients, prisoners, and drug addicts.
      </p>
      <!-- Additional paragraphs with historical content -->
      <p class="text-text-muted text-xs border-t border-border pt-4">
        Source: Senate Select Committee on Intelligence, 1977 &mdash;
        FOIA-released documents (CIA MKULTRA Collection)
      </p>
    </div>
  </div>
</section>
```

### CONT-02/03: URL constant updates in EventInfoBlock.astro

```astro
---
const BIKEREG_URL = 'https://www.bikereg.com/[EVENT_ID]';  // confirmed URL
const GLRC_URL = 'https://glrcmichigan.org/donate';         // confirmed URL (verify before launch)
---
```

```html
<!-- Existing text, wrap with anchor -->
<a href={GLRC_URL} class="text-accent-white hover:text-accent-green transition-colors">
  <strong>Great Lakes Recovery Centers</strong>
</a>
```

### CONT-01: `.redacted-reveal` CSS addition to global.css

```css
/* In @layer components, after existing .redacted block */
.redacted-reveal {
  background-color: var(--color-accent-white);
  color: var(--color-accent-white);
  padding: 0 0.25em;
  cursor: pointer;
  transition: color 0.2s ease, background-color 0.2s ease;
}
.redacted-reveal:hover,
.redacted-reveal:focus-visible {
  color: var(--color-bg-base);
  background-color: var(--color-accent-green);
}
@media (prefers-reduced-motion: reduce) {
  .redacted-reveal { transition: none; }
}
```

## State of the Art

| Area | Current State | Target After Phase 14 |
|------|---------------|-----------------------|
| BIKEREG_URL | `'PENDING — confirm with event director'` in 2 files | Confirmed BikeReg URL in both files |
| GLRC link | Plain text, no hyperlink | `<a href={GLRC_URL}>` wrapping GLRC text |
| MK Ultra explainer | Does not exist | New section with CIA history + redaction-reveal |
| Route stats | hero says "100 miles" (hardcoded); no elevation gain shown | `#route` section shows live `meta.totalMi` mi and `meta.elevationGainFt` ft |
| `.redacted` CSS | Non-interactive (user-select: none, no hover) | Unchanged; new `.redacted-reveal` variant added for interactive use |

**Note:** The BIKEREG_URL and GLRC_URL values are unknown at time of research — they must be provided by the event director before the plan can be executed. The plan should treat them as "TBD — planner or executor inserts real URL when confirmed." If still unknown at execution time, the plan should use placeholder values that are clearly marked.

## Open Questions

1. **What is the confirmed BikeReg URL?**
   - What we know: Placeholder is `'PENDING — confirm with event director'`. Two files must be updated.
   - What's unclear: The actual URL. The plan cannot complete CONT-02 without it.
   - Recommendation: Plan should include a human verification checkpoint: "Confirm URL with event director before merging." If unconfirmed, leave placeholder but document clearly.

2. **What is the confirmed GLRC donation URL?**
   - What we know: GLRC = Great Lakes Recovery Centers, glrcmichigan.org appears to be the domain. The specific donate page URL needs confirmation.
   - What's unclear: Exact URL. Cannot complete CONT-03 without it.
   - Recommendation: Same as above — human checkpoint. The plan should include the URL or flag it as needing confirmation.

3. **Where exactly does MkUltraExplainer go in the page?**
   - What we know: Roadmap says "between event info and the map." Current section order in index.astro: hero → #route → CTA div → #sectors → #photos → #info. "Between event info and the map" would mean BEFORE `#route` (immediately after hero) or AFTER `#info` (at page bottom, then map would need to move).
   - What's unclear: Whether to reorder sections or interpret "between event info and the map" as meaning "between the #info section at the bottom and a future map reference."
   - Recommendation: The most natural reading is to insert MkUltraExplainer between `#info` (event info section) and the `#route` section — which requires MOVING `#info` above `#route`, or inserting the explainer after `#info` at the end. The simpler option is to ADD the explainer section immediately AFTER `#info` (currently the last section). The planner must decide and document this.

4. **What actual CIA/MK-Ultra facts and FOIA document references should be used?**
   - What we know: The requirement says "at least one real FOIA document reference." The CIA MK-Ultra collection was declassified in 1977 following Senate Select Committee hearings.
   - What's unclear: The specific facts and quotes to use — this is content authoring, not code.
   - Recommendation: The planner/executor should use the 1977 Senate Select Committee on Intelligence as the primary citation. Key facts: program ran 1953-1973, involved 44 colleges and universities, used LSD without consent. The plan should specify the exact text or leave it as "author writes content using these facts."

## Sources

### Primary (HIGH confidence)
- Direct file inspection of `src/pages/index.astro` — confirmed BIKEREG_URL location (line 13), section structure, hero text "100 miles"
- Direct file inspection of `src/components/EventInfoBlock.astro` — confirmed BIKEREG_URL duplicate (line 3), no GLRC hyperlink currently
- Direct file inspection of `src/styles/global.css` — confirmed `.redacted` implementation, `.classified-border`, `.stamp`, `.tone-image` all available
- Direct file inspection of `public/data/route-data.json` — confirmed `meta.totalMi=98.23`, `meta.elevationGainFt=3189`
- Direct file inspection of `.planning/phases/11-data-corrections/11-VERIFICATION.md` — confirmed Phase 11 passed, meta wrapper in route-data.json verified
- `ls public/tone/` — confirmed available tone images: CIA-MKULTRA-IG_Page_01.webp, escharian_stairs_fb.webp, lsd-mind-control.webp, Mkultra-lsd-doc.webp, MK-Ultra.webp

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — confirmed BikeReg URL blocker is active, Phase 14 is next, no GLRC URL has been confirmed

### Tertiary (LOW confidence)
- No external sources consulted. All findings from direct codebase inspection.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies confirmed by package.json inspection
- Architecture: HIGH — patterns derived from existing components (EventInfoBlock.astro, RouteMap.astro) verified by direct reading
- Pitfalls: HIGH — all derived from code inspection (duplicate BIKEREG_URL, missing GLRC anchor, `.redacted` user-select issue)
- URL values: LOW — BikeReg URL and GLRC URL are both TBD (flagged as open questions)
- MK Ultra content: LOW — historical facts are well-established but specific text for the component is author-discretion

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable — no fast-moving dependencies; URL values TBD but that's a human blocker not a technical one)
