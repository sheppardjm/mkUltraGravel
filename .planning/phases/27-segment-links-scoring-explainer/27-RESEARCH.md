# Phase 27: Segment Links + Scoring Explainer - Research

**Researched:** 2026-03-30
**Domain:** Astro component modification, Strava brand compliance, static data enrichment
**Confidence:** HIGH

## Summary

Phase 27 is a pure Astro component modification phase — no new dependencies, no API calls, no build pipeline changes. The work is adding `stravaSegmentId`, `komTime`, and `qomTime` fields to `annotations.json`, updating `GravelSectors.astro` and `KomSegments.astro` to render Strava links and metadata, and creating a new `ScoringExplainer.astro` component.

All 9 Strava segment IDs are already recorded in `.planning/PROJECT.md`. The segment URL format is `https://www.strava.com/segments/{ID}`. Strava brand guidelines permit using inline SVG icons and require "View on Strava" link text styled in bold, underline, or orange `#FC5200`. The "Powered by Strava" attribution is discretionary (not mandatory for segment-link-only use), but the phase success criteria explicitly requires it.

**Primary recommendation:** Add `stravaSegmentId`, `komTime`, `qomTime` fields to `annotations.json`; update the two card components to render links + metadata; create one new `ScoringExplainer.astro` component; place "Powered by Strava" attribution in the sectors section or site footer.

## Standard Stack

No new dependencies required. Phase uses existing project stack exclusively.

### Core
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Astro | 6.1.1 | Component rendering | Existing stack |
| Tailwind v4 | 4.2.2 | Styling | Existing stack |
| `annotations.json` | — | Data source for sector/KOM cards | Existing data pattern |

### No New Dependencies
This phase requires zero `npm install` calls. The Strava icon is rendered as inline SVG (two paths, 24×24 viewBox). No icon library needed.

## Architecture Patterns

### Existing Data Pattern
All sector and KOM card data comes from `public/data/annotations.json`, read at build time via `readFileSync` in component frontmatter. Both `GravelSectors.astro` and `KomSegments.astro` already follow this pattern. New fields are added to the same JSON and the TypeScript interface in each component's frontmatter is extended.

### Recommended Project Structure (no new folders needed)
```
public/data/
└── annotations.json        ← add stravaSegmentId, komTime, qomTime fields

src/components/
├── GravelSectors.astro     ← add Strava link + icon per sector card
├── KomSegments.astro       ← add Strava link + icon + KOM/QOM times per KOM card
└── ScoringExplainer.astro  ← NEW — scoring system explainer component

src/pages/
└── index.astro             ← import ScoringExplainer, place in #sectors section
```

### Pattern 1: Extending annotations.json with Strava data

The 9 segment IDs are already known from PROJECT.md:

**Sectors (6):**
- Sandstrom: `24479292`
- Akkala Rd: `24479426`
- Haavisto: `24479467`
- Forest Service Rd: `24479496`
- C4: `34573011`
- Down Jeep: `6809754`

**KOM climbs (3):**
- Billie Helmer: `24479270`
- Leaving Chatham: `41126651`
- Silver Creek: `16438243`

Add to each sector object:
```json
"stravaSegmentId": 24479292
```

Add to each KOM object:
```json
"stravaSegmentId": 24479270,
"komTime": "3:42",
"qomTime": "4:18"
```

`komTime` and `qomTime` are manually entered strings (e.g., `"3:42"`) — no special format, just display text. The values for these are not yet known and must be sourced from the event organizer. The planner should note this as a data dependency (the component can be built to render when present and omit gracefully when absent).

### Pattern 2: Strava link rendering in card components

The Strava segment URL format is:
```
https://www.strava.com/segments/{stravaSegmentId}
```

Link must open in a new tab (`target="_blank" rel="noopener noreferrer"`).

Per Strava brand guidelines, link text must be **"View on Strava"** styled with bold, underline, or orange `#FC5200`. The site's existing `text-accent-green` is not compliant — use explicit `color: #FC5200` via a Tailwind arbitrary value `text-[#FC5200]` or inline style.

The Strava icon SVG (Tabler Icons outline style, matches `currentColor` for stroke-based rendering):
```html
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round"
     aria-hidden="true">
  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
  <path d="M15 13l-5 -10l-5 10m6 0l4 8l4 -8" />
</svg>
```

Alternatively, the Bootstrap Icons filled version (single path, `fill="currentColor"`):
```html
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
     viewBox="0 0 16 16" aria-hidden="true">
  <path d="M6.731 0 2 9.125h2.788L6.73 5.497l1.93 3.628h2.766zm4.694 9.125-1.372 2.756L8.66 9.125H6.547L10.053 16l3.484-6.875z"/>
</svg>
```

**Recommendation:** Use the Bootstrap Icons filled version — simpler single path, `fill="currentColor"` works with the existing `text-[#FC5200]` color class on the parent link, cleaner at 16px.

### Pattern 3: "Powered by Strava" attribution placement

Strava brand guidelines require "Powered by Strava" or "Compatible with Strava" when referencing Strava interoperability. The phase success criteria explicitly calls this out.

Placement options (all valid per guidelines, which don't specify location):
1. **In the `#sectors` section** — near the card grid, small muted label like other section labels
2. **Site footer** — if a footer exists or is added
3. **Within each card** — redundant given 9 cards

**Recommendation:** Add a single "Powered by Strava" line at the bottom of the `#sectors` section in `index.astro`, styled like the existing `text-text-muted text-xs uppercase tracking-widest` labels. This mirrors how BikeReg and GLRC attributions are handled elsewhere on the page. No new component needed — add directly to `index.astro`.

The official "Powered by Strava" logos (EPS/SVG/PNG) are downloadable from `https://developers.strava.com/guidelines/`. For a text-only implementation, "Powered by Strava" as plain text satisfies the requirement. For a logo implementation, download the official SVG from the guidelines page and commit to `public/` — do not use third-party SVG sources.

### Pattern 4: ScoringExplainer component

SCORE-03 requires the site to explain how scoring works. The existing `GrinduroExplainer.astro` already explains the Grinduro format (sectors vs KOM segments, mass start, untimed sections). The `ScoringExplainer` must specifically explain **how results/winners are determined**:

- **Gravel Champion**: cumulative elapsed time across all 6 timed gravel sectors (lowest total time wins), separated by gender
- **KOM/QOM Champion**: top-10 points system (10 points for 1st, 9 for 2nd, ..., 1 for 10th) per climb, across 3 climbs (30 points max), separated by gender

Component structure follows existing patterns: `classified-border`, `text-text-muted`, `text-sm leading-relaxed space-y-3`. Fits within the existing `#sectors` section alongside `GrinduroExplainer`.

In `index.astro`, the scoring explainer slots naturally after `<GrinduroExplainer />` since it extends the format explanation with scoring specifics.

### Anti-Patterns to Avoid

- **Fetching from Strava API at build time in Phase 27**: Out of scope; Phase 27 is zero-API. Segment metadata (distance, avg grade) displayed on cards comes from the existing `annotations.json` fields (`lengthMi`, `grade`) — the KOM cards already have these, sectors don't show grade but do show distance.
- **Using third-party SVG sources for the official Strava logo**: Violates brand guidelines. Only use assets downloaded from `developers.strava.com/guidelines/`.
- **Displaying KOM/QOM times when data is absent**: If `komTime`/`qomTime` are not yet provided by the organizer, render the field conditionally. Don't block the phase on this data — build the component to be data-driven and note the dependency.
- **Using `text-accent-green` for Strava links**: Color must be `#FC5200` (Strava orange) or the link must use bold/underline. The site's green is not compliant with Strava brand guidelines for "View on Strava" links.
- **Wrapping the entire card in an anchor**: The existing card pattern uses `div.classified-border`. The Strava link should be an additional element inside the card's `<div class="p-4">`, not a replacement of the card's outer element.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Strava icon SVG | Custom SVG drawing | Bootstrap Icons `bi bi-strava` path (inline) | Correct Strava chevron shape, MIT licensed |
| Time formatting | Custom duration parser | Plain string in JSON (`"3:42"`) | No calculation needed — manual entry only |
| Segment URL builder | URL construction function | Direct template literal in component | Simple enough: `` `https://www.strava.com/segments/${s.stravaSegmentId}` `` |

**Key insight:** Every piece of work in this phase is a data addition + template change. No utilities, no shared modules, no build scripts.

## Common Pitfalls

### Pitfall 1: Assuming segment metadata needs to come from Strava API
**What goes wrong:** Building a data-fetch script to pull distance/grade from Strava API
**Why it happens:** The requirement says "display segment metadata (distance, avg grade)" — looks like API data
**How to avoid:** The KOM cards already have `lengthMi` and `grade` in `annotations.json`. Sectors have `lengthMi`. Sectors lack `grade` — but STRAVA-02 says "distance, avg grade" on cards, so sectors may need a `grade` field added to annotations.json manually (or the requirement is KOM-only). **The planner must check whether STRAVA-02 applies to sector cards, KOM cards, or both.**
**Warning signs:** Any build script that hits the Strava API

### Pitfall 2: KOM/QOM time data not yet sourced
**What goes wrong:** Phase blocks waiting for organizer to provide actual KOM/QOM times
**Why it happens:** STRAVA-03 requires "manual KOM/QOM times" but the data doesn't exist in the repo
**How to avoid:** Build the component to render times when present, omit gracefully when absent. Use placeholder values during development (`"TBD"` or `null`). Note in the plan that real values must be sourced before the phase can be fully verified.
**Warning signs:** Empty `komTime`/`qomTime` fields in annotations.json at verification time

### Pitfall 3: TypeScript interface mismatch in component frontmatter
**What goes wrong:** Adding fields to JSON but forgetting to update the TypeScript `as Array<{...}>` cast
**Why it happens:** Both `GravelSectors.astro` and `KomSegments.astro` use explicit TypeScript type casts in frontmatter
**How to avoid:** When adding `stravaSegmentId` (and `komTime`, `qomTime` for KOM), update both the JSON and the TypeScript interface in the relevant component frontmatter
**Warning signs:** TypeScript errors during `npm run build`

### Pitfall 4: `rel="noopener noreferrer"` missing on external links
**What goes wrong:** Security/performance issue with `target="_blank"` without `rel`
**Why it happens:** Common oversight when adding external links
**How to avoid:** Always pair `target="_blank"` with `rel="noopener noreferrer"` on external links. All Strava segment links are external.

### Pitfall 5: Sectors missing `grade` field
**What goes wrong:** STRAVA-02 says to show avg grade on cards. Sectors don't have a `grade` field in annotations.json (only KOM entries have `grade`).
**Why it happens:** The event organizer may not have graded the sectors, or STRAVA-02 may intend KOM cards only.
**How to avoid:** The planner should treat sector grade as "add manually if available, omit row if not". Check whether the sectors section needs avg grade at all — the existing sector cards show `stars` (difficulty) instead of grade. The KOM cards already show `grade`.

## Code Examples

### Example: Extended KOM TypeScript interface
```typescript
// In KomSegments.astro frontmatter
const kom = annotations.kom as Array<{
  name: string;
  startMi: number;
  lengthMi: number;
  grade: number;
  elevFt: number;
  coverPhoto?: string;
  stravaSegmentId?: number;
  komTime?: string;
  qomTime?: string;
}>;
```

### Example: Strava link in card template
```astro
{segment.stravaSegmentId && (
  <a
    href={`https://www.strava.com/segments/${segment.stravaSegmentId}`}
    target="_blank"
    rel="noopener noreferrer"
    class="inline-flex items-center gap-1 text-xs text-[#FC5200] hover:opacity-80 transition-opacity mt-2"
    aria-label={`View ${segment.name} on Strava`}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor"
         viewBox="0 0 16 16" aria-hidden="true">
      <path d="M6.731 0 2 9.125h2.788L6.73 5.497l1.93 3.628h2.766zm4.694 9.125-1.372 2.756L8.66 9.125H6.547L10.053 16l3.484-6.875z"/>
    </svg>
    View on Strava
  </a>
)}
```

### Example: KOM/QOM times display
```astro
{(segment.komTime || segment.qomTime) && (
  <div class="mt-2 pt-2 border-t border-border text-xs text-text-muted space-y-0.5">
    {segment.komTime && <div>KOM <span class="text-accent-white">{segment.komTime}</span></div>}
    {segment.qomTime && <div>QOM <span class="text-accent-white">{segment.qomTime}</span></div>}
  </div>
)}
```

### Example: "Powered by Strava" attribution in index.astro
```astro
<!-- In #sectors section, after card grid -->
<p class="text-text-muted text-xs mt-8 text-right">
  Powered by <span class="text-[#FC5200]">Strava</span>
</p>
```

### Example: ScoringExplainer component structure
```astro
---
// ScoringExplainer.astro — Grinduro scoring system explainer (SCORE-03)
---
<div class="classified-border p-6 md:p-8 mb-8 text-text-body text-sm leading-relaxed space-y-3">
  <p class="text-text-muted text-xs uppercase tracking-widest mb-4 !mt-0">Scoring System</p>
  <p>
    <strong class="text-accent-white">Gravel Champion</strong> &mdash;
    lowest cumulative elapsed time across all 6 timed sectors wins.
    Gender categories: men, women, non-binary.
  </p>
  <p>
    <strong class="text-accent-green">KOM/QOM Champion</strong> &mdash;
    top-10 points per climb (10&ndash;1). Three climbs. 30 points max.
    Most total points wins. Gender categories: men, women, non-binary.
  </p>
  <p>
    Results submitted via Strava activity link after the event.
    Full leaderboards published here once submissions close.
  </p>
</div>
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Strava segment embeds | Direct href links | Chrome third-party cookie deprecation killed embeds; plain links are more reliable |
| Strava leaderboard API | Manual entry + OAuth submission | Public leaderboard endpoint removed June 2020; TOS prohibits scraping |

## Open Questions

1. **Are KOM/QOM times available?**
   - What we know: STRAVA-03 requires "manual KOM/QOM times displayed on 3 KOM cards"
   - What's unclear: The actual time values for Billie Helmer, Leaving Chatham, Silver Creek are not in the repo. The event has not happened yet (June 7, 2026) — so there may be no KOM/QOM times to show pre-event.
   - Recommendation: Build the component to conditionally render times when present. Use `"TBD"` or omit the row entirely when `komTime`/`qomTime` are absent. The planner should decide whether to use placeholder text or skip the field entirely pre-event.

2. **Does STRAVA-02 (segment metadata) apply to sector cards, KOM cards, or both?**
   - What we know: KOM cards already have `lengthMi` and `grade` in annotations.json and render them in the card grid. Sector cards have `lengthMi` but no `grade` field.
   - What's unclear: Whether sectors need avg grade added to annotations.json, or whether the existing distance display satisfies STRAVA-02 for sectors.
   - Recommendation: Treat as KOM-only for `grade` (since sectors use `stars` as the difficulty proxy). Sectors show distance; that satisfies the "distance" part of STRAVA-02. This avoids adding data that doesn't exist.

3. **Should "Powered by Strava" use the official logo SVG or plain text?**
   - What we know: Guidelines require the phrase. Logo downloads are available at `developers.strava.com/guidelines/` but require manual download.
   - What's unclear: Whether Phase 27 warrants using the official badge vs. plain text.
   - Recommendation: Use plain text with Strava orange color for now. The official badge can be added in a later phase when full Strava OAuth is live (Phase 29) and the attribution matters more for TOS compliance.

## Sources

### Primary (HIGH confidence)
- `public/data/annotations.json` — full schema of sectors (6) and KOM (3) objects; confirmed field names
- `.planning/PROJECT.md` — all 9 segment IDs recorded, tech stack, decisions
- `src/components/GravelSectors.astro` — existing sector card template
- `src/components/KomSegments.astro` — existing KOM card template
- `src/pages/index.astro` — existing page structure and import pattern
- `src/styles/global.css` — design token definitions (colors, fonts, card classes)
- `https://developers.strava.com/guidelines/` — official brand guidelines; "View on Strava" text requirement, #FC5200 color, logo options
- Bootstrap Icons `bi-strava` SVG path — `https://icons.getbootstrap.com/icons/strava/`
- Tabler Icons `brand-strava` SVG — `https://tabler.io/icons/icon/brand-strava`

### Secondary (MEDIUM confidence)
- Strava segment URL format `https://www.strava.com/segments/{ID}` — confirmed via Strava support articles and Google Groups Strava API discussion

### Tertiary (LOW confidence)
- Specific KOM/QOM time values — not found in repo; organizer must supply

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies; existing Astro/Tailwind/JSON pattern
- Architecture: HIGH — direct extension of existing component pattern; well-precedented in Phase 17
- Strava brand compliance: HIGH — official guidelines fetched directly
- Segment IDs: HIGH — documented in PROJECT.md
- KOM/QOM time values: LOW — organizer must supply; not in repo
- Pitfalls: HIGH — TypeScript interface update requirement confirmed by reading component source

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (Strava brand guidelines are stable; segment IDs don't change; component patterns don't change)
