# Phase 30: Results Page + Leaderboards — Research

**Researched:** 2026-03-30
**Domain:** Astro SSG page, build-time JSON loading, tabbed UI, leaderboard tables
**Confidence:** HIGH

---

## Summary

Phase 30 builds a static `/results` page that reads committed athlete JSON files at build time, runs the scoring engine, and renders Gravel Champion and KOM/QOM Champion leaderboards with gender tabs. The pattern is identical to how `index.astro` reads `route-data.json` — Node.js `readFileSync` in the Astro frontmatter's top-level script block.

The scoring engine (`src/lib/scoring.js`) is already written and tested. The seed data (`public/data/results/athletes/`) is already in place. The per-athlete schema is fixed. Phase 30 is purely UI work: build a page that calls the scoring functions and renders the results with the existing design system (Tailwind v4 + Space Mono + Special Elite, `classified-border`, brutalist card styling).

Gender tabs are the only interactive element needed. The site has no JavaScript component library — all prior interactivity is vanilla JS in `<script>` tags. The tab pattern can be achieved with three hidden inputs / visible tab buttons and a short `<script>` block — no framework needed.

**Primary recommendation:** One Astro page (`src/pages/results.astro`) that imports the scoring engine, glob-reads all athlete files, calls `computeGravelChampion` + `computeKomChampion`, and renders results. Gender tabs via vanilla JS with `data-tab` attributes — same pattern as existing client-side validation scripts. No new dependencies.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Astro | 6.1.1 | Page rendering at build time | Already in project — this is the established page authoring pattern |
| `src/lib/scoring.js` | project | Compute leaderboards | Already implemented + tested in Phase 28 |
| Tailwind v4 | 4.2.2 | Styling | Established design system — all existing pages use it |
| Node.js `fs.readFileSync` | built-in | Load JSON at build time | Identical to how `index.astro` loads `route-data.json` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js `fs.readdirSync` | built-in | Enumerate athlete files | Reading all files from `public/data/results/athletes/` directory |
| Node.js `path.join` / `process.cwd()` | built-in | Resolve absolute paths | Same pattern as `GravelSectors.astro` line 5 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `readFileSync` in frontmatter | Astro content collections | Content collections add schema validation but are unnecessary overhead — the schema is already validated by `validate-results.mjs` and the file structure is simple |
| Vanilla JS tabs | `<details>`/`<summary>` accordion | Tabs are the correct UX pattern for gender categories; accordion would make comparing harder |
| Inline styles (existing pattern) | Tailwind utility classes | Both work. Existing components mix both; use Tailwind classes for structure, inline styles for design tokens (same pattern as `submit.astro`) |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/pages/
  results.astro            # New page — the entire phase
src/components/            # Optionally extract sub-components
  (no new components required — inline in results.astro is fine given complexity)
public/data/results/
  schema.json              # Existing
  athletes/                # Existing — read at build time
    seed-m-01.json ... seed-m-12.json
    seed-f-01.json ... seed-f-08.json
    seed-nb-01.json ... seed-nb-03.json
    {athleteId}.json       # Real submissions added by Phase 29
```

### Pattern 1: Build-Time JSON Loading (established in project)

**What:** Read JSON files synchronously in the Astro frontmatter during build. Astro frontmatter runs in Node.js, not the browser.

**When to use:** All data that should be baked into the static HTML — leaderboards are a perfect fit.

**Example (from `GravelSectors.astro`):**
```typescript
// Source: src/components/GravelSectors.astro (line 2-6)
import { readFileSync } from "fs";
import { join } from "path";

const raw = readFileSync(join(process.cwd(), "public", "data", "annotations.json"), "utf-8");
const annotations = JSON.parse(raw);
```

**For results page — reading all athlete files:**
```typescript
// Source: pattern established in scripts/validate-results.mjs
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { computeGravelChampion, computeKomChampion, SECTOR_SEGMENT_IDS, KOM_SEGMENT_IDS } from "../lib/scoring.js";

const athletesDir = join(process.cwd(), "public", "data", "results", "athletes");
const files = readdirSync(athletesDir).filter(f => f.endsWith(".json"));
const athletes = files.map(f => JSON.parse(readFileSync(join(athletesDir, f), "utf-8")));

const gravel = computeGravelChampion(athletes);
const kom = computeKomChampion(athletes);
```

**Segment name mapping** — the scoring engine uses segment IDs as keys. The page needs human-readable names. Define a local lookup map in the page frontmatter:
```typescript
const SECTOR_NAMES: Record<string, string> = {
  "24479292": "Sandstrom",
  "24479426": "Akkala Rd",
  "24479467": "Haavisto",
  "24479496": "Forest Service Rd",
  "34573011": "C4",
  "6809754":  "Down Jeep",
};

const KOM_NAMES: Record<string, string> = {
  "24479270": "Billie Helmer",
  "41126651": "Leaving Chatham",
  "16438243": "Silver Creek",
};
```

### Pattern 2: Vanilla JS Gender Tabs

**What:** Three tab buttons (Men / Women / Non-binary) that show/hide leaderboard panels. Vanilla JS using `data-gender` attributes — same approach as existing `<script>` blocks in `submit.astro` and `submit-confirm.astro`.

**When to use:** Any client-side tab switching on this site.

**Example:**
```html
<!-- Tab buttons -->
<div role="tablist">
  <button role="tab" data-gender="M" aria-selected="true">Men</button>
  <button role="tab" data-gender="F" aria-selected="false">Women</button>
  <button role="tab" data-gender="NB" aria-selected="false">Non-binary</button>
</div>

<!-- Tab panels — hidden/shown via JS -->
<div id="panel-M" role="tabpanel" data-gender="M">...</div>
<div id="panel-F" role="tabpanel" data-gender="F" hidden>...</div>
<div id="panel-NB" role="tabpanel" data-gender="NB" hidden>...</div>
```

```javascript
// In <script> at bottom of .astro file
const tabs = document.querySelectorAll('[role="tab"]');
const panels = document.querySelectorAll('[role="tabpanel"]');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const g = tab.dataset.gender;
    tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.gender === g)));
    panels.forEach(p => { p.hidden = p.dataset.gender !== g; });
  });
});
```

### Pattern 3: Time Formatting Helper

**What:** The scoring engine outputs `totalTime` in seconds. Display as `H:MM:SS` or `MM:SS`.

**When to use:** Every time row in the leaderboard.

**Example:**
```typescript
// Defined in frontmatter — pure function, runs at build time
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}
```

Gravel sector times are 17-50 min each; cumulative totals will be 2-5+ hours. Use `H:MM:SS` format for totals. KOM climb times are 6-20 min; `MM:SS` format is fine.

### Pattern 4: Empty State (pre-event)

**What:** If `athletes.length === 0` (no submissions yet), render a placeholder instead of empty tables.

**When to use:** The site may be deployed before any athlete submits results.

**Example:**
```typescript
const hasResults = athletes.length > 0;
```

```html
{hasResults ? (
  <!-- full leaderboard UI -->
) : (
  <div class="classified-border p-6 text-center">
    <p class="text-text-muted text-sm uppercase tracking-widest">
      Results will appear here after the event on June 7, 2026.
    </p>
  </div>
)}
```

### Pattern 5: Per-Segment Time Breakdown (RESULT-04)

**What:** Within each Gravel Champion row, show a collapsible or inline breakdown of per-sector times. The scoring engine `computeGravelChampion` returns `sectorTimes: { [segId]: elapsed_time }` on each entry.

**When to use:** Rendering the Gravel Champion leaderboard.

**Approach:** Render a nested `<dl>` or small table below the athlete's total time row. The `<details>`/`<summary>` HTML element provides a native expand/collapse with no JS required and good accessibility — a good fit for the per-segment breakdown since it's secondary information.

```html
<details class="mt-2">
  <summary class="text-xs text-text-muted cursor-pointer">Sector breakdown</summary>
  <dl class="grid grid-cols-2 gap-x-4 mt-2 text-xs">
    {SECTOR_SEGMENT_IDS.map(segId => entry.sectorTimes[segId] && (
      <div class="flex justify-between">
        <dt class="text-text-muted">{SECTOR_NAMES[segId]}</dt>
        <dd class="text-accent-white tabular-nums">{formatTime(entry.sectorTimes[segId])}</dd>
      </div>
    ))}
  </dl>
</details>
```

### Pattern 6: Individual Segment Leaderboards (RESULT-03)

**What:** Per-segment time rankings for all 9 segments. The data is already in the athlete files — this is a sort-by-segment-time operation. The scoring engine does not need to be modified; do the sort in the page frontmatter.

**When to use:** The "Individual Segment Leaderboards" section of the results page.

**Example:**
```typescript
// Build per-segment leaderboards (all genders combined or per gender — decide in planning)
// Simplest: all genders combined per segment, ranked by elapsed_time ascending
function buildSegmentLeaderboard(athletes: any[], segId: string) {
  return athletes
    .filter(a => a.segments?.[segId]?.elapsed_time)
    .map(a => ({
      name: a.name,
      gender: a.gender,
      activityUrl: a.activityUrl,
      elapsed_time: a.segments[segId].elapsed_time,
    }))
    .sort((a, b) => a.elapsed_time - b.elapsed_time);
}
```

The requirements say "Individual segment leaderboards show per-segment times and rankings for all 9 segments" — this suggests all genders shown together per segment (or tabbed by gender within each segment — the planner should decide complexity level).

### Anti-Patterns to Avoid

- **Importing scoring.js with `require()`:** The scoring module uses ES module `export` syntax. In Astro frontmatter, use `import` (ESM), not `require()`. Astro frontmatter fully supports ESM.
- **Calling `readdirSync` with a relative path:** Must use `join(process.cwd(), ...)` for absolute path — same as all existing components.
- **Rendering empty tabs:** If NB has 0 athletes, the tab still exists (good — shows the category) but may look odd with "0 athletes." Handle gracefully with the empty-state placeholder within the tab panel.
- **Hardcoding segment names:** Don't embed segment names as string literals scattered through the template. Define `SECTOR_NAMES` and `KOM_NAMES` maps once in the frontmatter.
- **Using `tabular-nums` for times:** Stagger-free number rendering matters for leaderboard columns. Use `font-variant-numeric: tabular-nums` or Tailwind's `tabular-nums` class on time cells. Space Mono is monospace so all characters are already equal width — this is automatic.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scoring logic | Custom sort/ranking in results.astro | `computeGravelChampion`, `computeKomChampion` from `src/lib/scoring.js` | Already built, tested (13 tests), handles DNF + ties correctly |
| Time formatting | `Date` API | Simple arithmetic helper function in frontmatter | `Date` is overkill for duration-as-seconds; arithmetic is cleaner |
| Tab component | A separate `.astro` component with props | Inline tab HTML + `<script>` in results.astro | No complex tab state to manage; page has one tabbed section |
| Animation | New keyframe CSS | `data-reveal` attribute + existing reveal animation from `global.css` | Already defined: `--animate-reveal: reveal 0.35s ease-out both` — just add `data-reveal` |

**Key insight:** The entire scoring data pipeline (parsing, ranking, schema) is already done. Phase 30 is rendering work only.

---

## Common Pitfalls

### Pitfall 1: Empty Athletes Directory at Build Time

**What goes wrong:** `readdirSync` on `public/data/results/athletes/` throws if the directory doesn't exist. Before any submissions happen, the directory might have only seed files (committed) or be empty if seed files were not committed.

**Why it happens:** GitHub repository state vs. local state. The seed files ARE committed per Phase 28 Plan 02. This pitfall is about deploys where the directory is missing (won't happen with committed seed data) or has zero `.json` files.

**How to avoid:** Wrap in a try/catch or check with `existsSync` before reading, then render the empty state gracefully:
```typescript
import { existsSync } from "node:fs";
const athletesDir = join(process.cwd(), "public", "data", "results", "athletes");
const athletes = existsSync(athletesDir)
  ? readdirSync(athletesDir)
      .filter(f => f.endsWith(".json"))
      .map(f => JSON.parse(readFileSync(join(athletesDir, f), "utf-8")))
  : [];
```

**Warning signs:** Build fails with `ENOENT: no such file or directory`.

### Pitfall 2: Scoring Module Import Path

**What goes wrong:** Relative import path from `src/pages/results.astro` to `src/lib/scoring.js` must be `../lib/scoring.js` (one level up then into lib).

**Why it happens:** Astro pages are in `src/pages/`, scoring is in `src/lib/`. Easy to mistype.

**How to avoid:** The exact import is:
```typescript
import { computeGravelChampion, computeKomChampion, SECTOR_SEGMENT_IDS, KOM_SEGMENT_IDS } from "../lib/scoring.js";
```

Note: Must include `.js` extension. Astro with Vite resolves it correctly even though the file is `.js` not `.ts`.

**Warning signs:** Build fails with module resolution error.

### Pitfall 3: Gender Tab Default State

**What goes wrong:** JavaScript tabs work but on initial page load, if JS is disabled or slow, all three panels are visible simultaneously.

**Why it happens:** SSR/SSG outputs the initial HTML; tabs must have a usable default state in the HTML, not just after JS runs.

**How to avoid:** Render Men panel visible by default; F and NB panels with `hidden` attribute. The JS activates tabs from there. This matches the `data-reveal` pattern — progressive enhancement.

### Pitfall 4: Strava Link Target

**What goes wrong:** Athlete activity links open in the same tab, breaking the results page experience.

**Why it happens:** Forgetting `target="_blank" rel="noopener noreferrer"` on the Strava link.

**How to avoid:** Follow the same pattern used in `GravelSectors.astro` and `KomSegments.astro` for the "View on Strava" links. Use the same Strava SVG icon too — it's already in the codebase.

### Pitfall 5: DNF Display in Gravel Leaderboard

**What goes wrong:** Athletes with `completedSectors < 6` appear in the leaderboard ranked below complete finishers. The UI doesn't make this clear, so it looks like a normal ranking.

**Why it happens:** The scoring engine correctly sorts DNF athletes last, but the page renders them without indication.

**How to avoid:** Check `entry.completedSectors < SECTOR_SEGMENT_IDS.length` and show a `[DNF]` or `[${entry.completedSectors}/6]` indicator next to their name.

---

## Code Examples

Verified patterns from the existing codebase:

### Strava Icon SVG (from GravelSectors.astro, line 62-66)

```html
<!-- Source: src/components/GravelSectors.astro -->
<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor"
     viewBox="0 0 16 16" aria-hidden="true">
  <path d="M6.731 0 2 9.125h2.788L6.73 5.497l1.93 3.628h2.766zm4.694 9.125-1.372 2.756L8.66 9.125H6.547L10.053 16l3.484-6.875z"/>
</svg>
```

### classified-border Card Pattern (from GravelSectors.astro and ScoringExplainer.astro)

```html
<!-- Source: src/components/ScoringExplainer.astro -->
<div class="classified-border p-6 md:p-8 mb-8 text-text-body text-sm leading-relaxed space-y-3">
  ...
</div>
```

### Page Layout Pattern (from submit.astro)

```html
<!-- Source: src/pages/submit.astro -->
<BaseLayout title="Submit Your Results — MK Ultra Gravel">
  <main class="min-h-screen flex flex-col items-center justify-center px-4 py-16">
    <div class="w-full max-w-2xl mx-auto">
      <!-- back link, header, content -->
    </div>
  </main>
</BaseLayout>
```

For the results page, use a wider max-width (e.g. `max-w-4xl`) since leaderboard tables need horizontal space.

### data-reveal Animation (from GravelSectors.astro, line 27)

```html
<!-- Source: src/components/GravelSectors.astro -->
<div class="classified-border bg-bg-surface" data-reveal style="animation-delay: 60ms">
```

The `data-reveal` attribute triggers the `reveal 0.35s ease-out both` animation defined in `global.css`. Use on leaderboard rows for entrance animation.

### Design Token Reference (from global.css)

Colors to use in inline styles where Tailwind class names don't exist:
- Background surface: `var(--color-bg-surface)` — cards, leaderboard rows
- Background elevated: `var(--color-bg-elevated)` — active tab button
- Accent green: `var(--color-accent-green)` — KOM/QOM Champion headings (matches existing ScoringExplainer.astro)
- Accent white: `var(--color-accent-white)` — Gravel Champion headings, ranking numbers
- Text muted: `var(--color-text-muted)` — labels, segment names
- Border: `var(--color-border)` — table row dividers
- Strava orange: `oklch(0.72 0.19 55)` — Strava activity links (used in submit-confirm.astro)

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Astro `Astro.glob()` for multiple files | `readdirSync` + `readFileSync` in frontmatter | Astro 5+ prefers content collections for structured data | `readdirSync` is fine here — content collections add complexity without benefit for this use case |
| CSS tabs with `:has()` or radio inputs | `hidden` attribute + vanilla JS | N/A | Both work. Vanilla JS matches existing codebase patterns exactly. |

**Deprecated/outdated:**
- `Astro.glob()`: Still works in Astro 6 but not the recommended pattern for filesystem data in this project. Existing components use `readFileSync` directly.

---

## Open Questions

1. **Individual segment leaderboards — gender separation or combined?**
   - What we know: RESULT-03 says "per-segment times and rankings for all 9 segments" but doesn't specify gender separation
   - What's unclear: Should each of the 9 segment boards also have Men/Women/NB tabs, or are they combined across genders?
   - Recommendation: Combined-across-genders for simplicity (9 segments × 3 genders = 27 mini-boards is a lot of UI). The planner should decide. Combined is the default assumption.

2. **Navigation link to /results from main page?**
   - What we know: The requirements don't mention this but users need to discover the page
   - What's unclear: Should the results page be linked from index.astro (e.g. next to the BikeReg CTA)?
   - Recommendation: Add a nav link or CTA on index.astro pointing to /results. This is out of scope for Phase 30 strictly, but should be flagged in planning so it's not forgotten.

3. **Page title metadata**
   - Recommendation: `"Results — MK Ultra Gravel"` — matches the pattern of `"Submit Your Results — MK Ultra Gravel"`.

---

## Sources

### Primary (HIGH confidence)

- `src/lib/scoring.js` — Direct code inspection. Confirms output shapes for `computeGravelChampion` and `computeKomChampion`.
- `src/components/GravelSectors.astro` — `readFileSync(join(process.cwd(), ...))` pattern confirmed.
- `src/pages/index.astro` — Build-time JSON loading with `readFileSync` pattern confirmed.
- `src/pages/submit.astro` + `src/pages/submit-confirm.astro` — Page layout pattern, inline style approach, vanilla JS pattern confirmed.
- `public/data/results/athletes/seed-m-01.json` — Per-athlete JSON schema confirmed in real file.
- `src/styles/global.css` — Design tokens, `data-reveal` animation, `classified-border` CSS component confirmed.
- `.planning/phases/28-scoring-engine-results-schema/28-01-SUMMARY.md` + `28-02-SUMMARY.md` — Scoring engine and seed data confirmed built and tested.
- `.planning/phases/29-strava-oauth-activity-submission/29-02-SUMMARY.md` — Submission flow confirmed. Athlete files at `public/data/results/athletes/{athleteId}.json`.

### Secondary (MEDIUM confidence)

- Astro 6.1.1 documentation — `import` in frontmatter works with ES modules. Confirmed by existing project usage.

### Tertiary (LOW confidence)

- None — all findings verified from codebase.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — entire stack already in use in project
- Architecture: HIGH — patterns are literally copy-pasted from existing components
- Pitfalls: HIGH — identified from code inspection of scoring engine output shapes and existing component patterns
- Open questions: MEDIUM — flagged as decisions for planning, not blocking

**Research date:** 2026-03-30
**Valid until:** Until Astro, scoring engine, or data schema changes (stable)
