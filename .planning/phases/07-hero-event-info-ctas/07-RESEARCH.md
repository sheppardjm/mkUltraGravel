# Phase 7: Hero + Event Info + CTAs — Research

**Researched:** 2026-03-26
**Domain:** Astro component scripting, hero section UX, vanilla JS timers, HTML download attribute
**Confidence:** HIGH (all key findings verified against official Astro docs or MDN)

---

## Summary

Phase 7 fills in the most conversion-critical content on the page: the above-fold hero, a live
countdown timer, the event info block (donation, format, cause), a GPX download link, and a
second CTA below the map section. All five sub-plans are purely additive — they modify
`index.astro` and add new `.astro` components; nothing from Phases 1–6 needs to change.

The primary technical domain is **Astro's client-side script model** — specifically how to run
vanilla JS timers in Astro without fighting the framework. The two other technical topics
(preloading the hero background and wiring the `download` attribute) are straightforward but have
specific mechanics worth knowing before planning.

**Primary recommendation:** Keep all Phase 7 JavaScript as processed Astro scripts (not
`is:inline`). Use `data-*` attributes to pass the target date to the countdown script. Add the
hero background preload via a named slot into BaseLayout's `<head>`, NOT by editing
BaseLayout itself.

---

## Standard Stack

### Core

| Library / API | Version | Purpose | Why Standard |
|---|---|---|---|
| Astro `<script>` (processed) | Astro 6.1.1 (already installed) | Countdown timer JS | Auto-bundled, TypeScript, deduped — no extra deps |
| `customElements` / `HTMLElement` | Browser native | Per-component timer logic | Astro docs recommend this pattern for component-specific JS |
| `setInterval` | Browser native | 1-second tick for countdown | No deps needed; clears on post-event check |
| `data-*` attributes | HTML spec | Pass server-rendered date to client script | Bridges Astro frontmatter → client JS without `define:vars` bundling penalty |
| `download` attribute on `<a>` | HTML spec / MDN | Force-download GPX with correct filename | Native, universal browser support, zero JS needed |

### Supporting

| Tool | Purpose | When to Use |
|---|---|---|
| Named slot `<slot name="head" />` in BaseLayout | Inject `<link rel="preload">` from page into `<head>` | Plan 07-01 only (hero image preload) |
| Astro `define:vars` | Pass frontmatter values into inline script | Avoid — implies `is:inline`, kills bundling. Use `data-*` instead. |

### Alternatives Considered

| Standard | Alternative | Tradeoff |
|---|---|---|
| Processed `<script>` + `data-*` | `define:vars` on `<script>` | `define:vars` forces `is:inline` — script runs duplicated per render, loses bundling. Only worth it for truly trivial one-liners. |
| Named slot → BaseLayout `<head>` | Editing BaseLayout directly | Editing BaseLayout is global mutation — risk of breaking future phases. Named slot is per-page and additive. |
| Tone image already in `public/tone/` (`CIA-MKULTRA-IG_Page_01.jpg`) | New hero image asset | The hero already uses this image (it's in index.astro). No new asset needed. |

**Installation:** No new packages needed. Everything is vanilla browser APIs + existing Astro.

---

## Architecture Patterns

### Recommended Project Structure

No new directories needed. New files land in existing locations:

```
src/
├── components/
│   ├── HeroSection.astro        # Event title, date, location, cost, above-fold CTA
│   ├── CountdownTimer.astro     # Countdown timer (custom element + processed script)
│   └── EventInfoBlock.astro     # Donation info, Great Lakes Recovery Centers, GPX download
├── pages/
│   └── index.astro              # Adds second CTA below map; passes preload slot to BaseLayout
```

### Pattern 1: Countdown Timer via Custom Element

**What:** A custom element class (`CountdownTimer extends HTMLElement`) reads `data-target` from
the element, starts a `setInterval`, and updates inner spans every second.

**When to use:** Any time Astro's deduplication behavior would cause a single script to miss
multiple instances. Here there's only one timer, but this pattern also cleanly handles teardown
if the component is ever conditionally rendered.

**Example:**
```astro
---
// CountdownTimer.astro
const target = new Date('2026-06-07T09:00:00-05:00').toISOString();
---

<div class="countdown" data-target={target}>
  <span id="cd-days">--</span>d
  <span id="cd-hours">--</span>h
  <span id="cd-minutes">--</span>m
</div>

<script>
  // Processed script — bundled, runs once per page
  const el = document.querySelector('[data-target]') as HTMLElement;
  if (el) {
    const target = new Date(el.dataset.target!).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        el.textContent = 'THE DAY IS HERE';
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      el.querySelector('#cd-days')!.textContent = String(d);
      el.querySelector('#cd-hours')!.textContent = String(h);
      el.querySelector('#cd-minutes')!.textContent = String(m);
    };
    tick(); // Run immediately so there's no "–– d –– h –– m" flash
    setInterval(tick, 1000);
  }
</script>
```

**Source:** Astro docs — https://docs.astro.build/en/guides/client-side-scripts/ (data-* bridge pattern)

**Notes on post-event state:** When `diff <= 0`, clear the timer and show a completion message.
The event is June 7, 2026. This site will be live before then, but the code must handle after.
Showing seconds is optional — days/hours/minutes is sufficient for event hype and avoids
"ticking every second" visual distraction. If seconds are added, use `setInterval(tick, 1000)`.

### Pattern 2: Hero Background Preload via Named Slot

**What:** BaseLayout needs a `<slot name="head" />` inside `<head>`. Then `index.astro` passes
`<link rel="preload" ... slot="head">` from the page level. This puts the preload hint in the
HTML `<head>` without modifying BaseLayout's permanent structure.

**Current BaseLayout.astro `<head>`** (from codebase inspection):
```html
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <meta name="description" content={description} />
  <Font cssVariable="--font-mono" />
  <Font cssVariable="--font-display" />
  <!-- Add here: <slot name="head" /> -->
</head>
```

**Plan 07-01 action:** Add `<slot name="head" />` to BaseLayout's head (one-line change), then
in `index.astro` add:
```astro
<link
  rel="preload"
  href="/tone/CIA-MKULTRA-IG_Page_01.jpg"
  as="image"
  slot="head"
/>
```

The hero tone image is already in `public/tone/CIA-MKULTRA-IG_Page_01.jpg` and already rendered
as an `<img>` in the existing hero section. The preload simply tells the browser to fetch it
earlier. No `getImage()` or Astro image pipeline needed since this is a `public/` asset (not
`src/assets/`) — just a direct path string.

**Source:** Astro named slots — https://docs.astro.build/en/basics/astro-components/

### Pattern 3: GPX Download Link

**What:** A plain `<a>` tag with `href` pointing to the GPX file in `public/` and a `download`
attribute specifying the desired filename.

**Current state:** `public/mk-ultra.gpx` exists (confirmed). The requirement wants the
downloaded filename to be `mk-ultra-gravel-2026.gpx` (different from the stored filename).
The `download` attribute controls this — the `href` is the URL path, the `download` value is
the filename the browser saves as.

**Example:**
```html
<a href="/mk-ultra.gpx" download="mk-ultra-gravel-2026.gpx">
  Download GPX
</a>
```

**IMPORTANT CAVEAT:** The `download` attribute only works for same-origin URLs (confirmed by
MDN). Since this is a static site served from the same domain, it will work. Cross-origin
downloads ignore the `download` attribute.

**Note on the GPX file situation:** The memory file `project_route_extended.md` records that
the route was extended to 100 miles and an updated GPX is pending from Strava. As of this
research, `public/mk-ultra.gpx` contains the original ~80-mile GPX. The download link can be
wired now — the `href` will just update when the new GPX arrives. This is not a blocker for
Plan 07-04.

**Source:** MDN `<a>` element — https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a

### Pattern 4: Second CTA Placement (Below Map Section)

**What:** A second BikeReg CTA button is placed immediately after the `<section id="route">`
in `index.astro`. Per the success criteria, it must not require scrolling past non-CTA content
to find it. The simplest implementation: a narrow CTA banner `<div>` between `#route` and
`#sectors`, with a prominent button.

**When to use:** The route section ends with the elevation profile. The CTA sits directly
below it as its own row, then the sectors section follows. This is additive — no existing
component needs to change.

### Anti-Patterns to Avoid

- **`define:vars` on countdown script:** Forces `is:inline`, which means the script inlines
  into HTML on every render and does not bundle. For a timer that runs once per page, use
  `data-*` attribute bridge instead.
- **Editing BaseLayout.astro for the preload:** BaseLayout is the universal wrapper (prior
  decision [02-02]). Adding page-specific preload hints directly into BaseLayout would apply
  them to every page. Use the named slot pattern.
- **Using `getImage()` for a `public/` asset:** `getImage()` is for assets in `src/assets/`.
  The tone images live in `public/tone/` — they are referenced by direct URL string, not
  imported. No image pipeline processing is needed or applicable.
- **Hardcoding the BikeReg URL as a placeholder:** STATE.md documents a blocker — the BikeReg
  URL is not confirmed. Plans 07-01 and 07-05 must use a clearly-marked placeholder constant
  (e.g., `const BIKEREG_URL = 'PENDING_BIKEREG_URL'`) that is easy to find and replace. Do
  not ship with `href="#"` silently.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Countdown timer library | A complex timer class with pause/resume, lap times | 10-line vanilla `setInterval` | This is a static display — days/hours/minutes. No interactivity beyond counting down. A library is overkill. |
| Image optimization for hero | Running images through Astro's image pipeline | Direct `public/` URL string | Tone images are already in `public/tone/` — they're not in `src/assets/`. `getImage()` doesn't apply. |
| Custom download endpoint | Server route to serve GPX with Content-Disposition header | `download` attribute on `<a>` | Static site, same-origin. HTML download attribute is the correct tool. |

**Key insight:** Every feature in Phase 7 has a native HTML or browser-API solution. Reaching
for libraries or build-time abstractions adds complexity without benefit.

---

## Common Pitfalls

### Pitfall 1: define:vars Kills Bundling

**What goes wrong:** Developer uses `<script define:vars={{ targetDate }}>` to pass the event
date to the countdown timer. The script works but is inlined into HTML (not bundled), runs on
every component render, and cannot import modules.

**Why it happens:** Astro's `define:vars` on `<script>` implies `is:inline`. This is documented
but easy to miss.

**How to avoid:** Set the target date as a `data-*` attribute on the countdown container element
in the Astro frontmatter. Read it in a normal processed `<script>` tag via `dataset`.

**Warning signs:** Script appears inline in page source (no `src` attribute). Multiple copies
if the component renders more than once.

### Pitfall 2: Preload Link Not in `<head>`

**What goes wrong:** A `<link rel="preload">` is placed in the component template (in `<body>`),
not in `<head>`. Browsers technically support preload in body but it fires much later — defeating
the point of preloading.

**Why it happens:** The hero section is a component. Components don't have `<head>` access
unless they use named slots or `<head>` injection patterns.

**How to avoid:** Add `<slot name="head" />` to BaseLayout's `<head>`, then pass the preload
link from `index.astro` via `slot="head"`. The head preload fires before any body content
is parsed.

### Pitfall 3: BikeReg URL Placeholder Silently Ships

**What goes wrong:** CTA buttons with `href="#"` or an empty `href` ship to production because
the placeholder wasn't visible during verification.

**Why it happens:** The BikeReg URL is confirmed unresolved (STATE.md blocker).

**How to avoid:** Define `const BIKEREG_URL = 'PENDING — confirm with event director'` as a
visible constant at the top of any component using it. The planner should add a verification
step that checks the URL is not `PENDING`.

### Pitfall 4: Countdown Timer Flashes "--" on Load

**What goes wrong:** The timer elements show `--` or `0` for one tick before the script runs
and populates them, causing a visible flash.

**Why it happens:** HTML renders first, script runs after. If the script only fires inside
`setInterval`, there's a 1-second gap.

**How to avoid:** Call `tick()` once immediately before passing it to `setInterval`. The DOM
updates synchronously on first call.

### Pitfall 5: Post-Event State Not Handled

**What goes wrong:** After June 7, 2026, the page shows negative or zero values in the
countdown, or the `setInterval` keeps running and consuming resources.

**Why it happens:** Developers test with the target date in the future and forget to add the
`diff <= 0` branch.

**How to avoid:** Add an explicit guard: `if (diff <= 0) { clearInterval(x); el.textContent =
'[post-event message]'; return; }`. Test it by temporarily setting target to a past date.

### Pitfall 6: download Attribute on Cross-Origin Href

**What goes wrong:** If the GPX file is ever served from a CDN or different origin than the
HTML page, the `download` attribute is ignored by browsers (security restriction), and the
browser navigates to the file instead of downloading it.

**Why it happens:** MDN specifies: "download only works for same-origin URLs."

**How to avoid:** Keep the GPX file in `public/` (served from same origin). Don't move it to
an external CDN without also adding `Content-Disposition: attachment` headers server-side.
This site stays same-origin via Cloudflare Pages (Phase 10), so this is not a current risk —
but worth noting for Phase 10 awareness.

---

## Code Examples

### Countdown Timer (Astro Component Pattern)

```astro
---
// Frontmatter: set target date once here; script reads it via data attribute
const EVENT_DATE_ISO = '2026-06-07T09:00:00-05:00'; // CDT start time — confirm with director
---

<div id="countdown" data-target={EVENT_DATE_ISO}>
  <span id="cd-days">--</span><span class="cd-label">d</span>
  <span id="cd-hours">--</span><span class="cd-label">h</span>
  <span id="cd-minutes">--</span><span class="cd-label">m</span>
</div>

<p id="cd-done" hidden>The day is here. Get out there.</p>

<script>
  // Processed script — TypeScript, bundled, runs once per page load
  const container = document.getElementById('countdown') as HTMLElement | null;
  if (container) {
    const target = new Date(container.dataset.target!).getTime();
    const days = document.getElementById('cd-days')!;
    const hours = document.getElementById('cd-hours')!;
    const minutes = document.getElementById('cd-minutes')!;
    const done = document.getElementById('cd-done') as HTMLElement;

    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        container.hidden = true;
        done.hidden = false;
        return;
      }
      days.textContent = String(Math.floor(diff / 86400000));
      hours.textContent = String(Math.floor((diff % 86400000) / 3600000));
      minutes.textContent = String(Math.floor((diff % 3600000) / 60000));
    };

    tick(); // Immediate render before first interval tick
    setInterval(tick, 1000);
  }
</script>
```

Source: Pattern derived from https://docs.astro.build/en/guides/client-side-scripts/ + https://daily-dev-tips.com/posts/vanilla-javascript-countdown-clock/

### GPX Download Link

```html
<a
  href="/mk-ultra.gpx"
  download="mk-ultra-gravel-2026.gpx"
  class="..."
>
  Download GPX
</a>
```

Source: MDN — https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a

### Named Slot Preload Pattern

**In BaseLayout.astro** (add `<slot name="head" />` before closing `</head>`):
```astro
<head>
  ...existing head content...
  <slot name="head" />
</head>
```

**In index.astro** (add alongside other slot content):
```astro
<BaseLayout>
  <link
    rel="preload"
    href="/tone/CIA-MKULTRA-IG_Page_01.jpg"
    as="image"
    slot="head"
  />
  ...rest of page...
</BaseLayout>
```

Source: Astro named slots — https://docs.astro.build/en/basics/astro-components/

### CTA Button Styling (using existing design tokens)

```html
<!-- Primary CTA — accent-green on dark bg -->
<a
  href="PENDING_BIKEREG_URL"
  class="inline-block bg-accent-green text-bg-base font-bold uppercase tracking-widest
         px-8 py-4 text-lg hover:opacity-90 transition-opacity"
>
  Register Now
</a>
```

This uses the established `--color-accent-green` token (oklch(0.85 0.24 145)) as a button
background — inverted from its usual use as text color on dark. This creates high contrast
on the dark hero. Consistent with the brutalist aesthetic (no border radius, uppercase, monospace).

---

## State of the Art

| Old Approach | Current Approach | Notes |
|---|---|---|
| Countdown library (countdown.js, moment.js) | Vanilla `setInterval` + `Date.now()` | Libraries are overkill for a simple days/hours/minutes display; Moment.js deprecated |
| `<script>` with frontmatter variables directly | `data-*` attribute bridge | Astro's official recommendation for passing server data to client scripts |
| Editing layout head directly for page-specific preloads | Named slot into `<slot name="head" />` | Allows page-level head injection without layout pollution |

**Deprecated/outdated:**
- `define:vars` on `<script>`: Technically works but implies `is:inline`, forfeits bundling. Avoid for anything beyond trivial one-liners.
- `moment.js` for countdown: Unmaintained, large bundle. Native `Date` API is sufficient.

---

## Open Questions

1. **BikeReg registration URL**
   - What we know: The URL is unconfirmed (STATE.md blocker, noted pre-Phase 7)
   - What's unclear: Whether the URL exists yet on BikeReg, and whether there's a secondary
     "interest" or "waitlist" CTA if registration isn't open yet
   - Recommendation: Plans 07-01 and 07-05 use a `BIKEREG_URL` placeholder constant. Add a
     verification step that explicitly fails if the constant is still `PENDING`. This is a
     blocker for those two plans, not the other three.

2. **Event start time**
   - What we know: PROJECT.md says "June 7, 2026" but doesn't confirm a start time
   - What's unclear: Is there a specific hour for the mass start? The countdown timer needs a
     precise timestamp to be correct (not just midnight).
   - Recommendation: REQUIREMENT EVENT-01 says "start time" must be displayed. Confirm with
     event director before Plan 07-01. Placeholder: 9:00 AM CDT.

3. **Updated GPX file**
   - What we know: Route extended to 100 miles (memory file). `public/mk-ultra.gpx` is the
     original ~80-mile version. Updated GPX is pending from Strava.
   - What's unclear: Whether the new GPX will arrive before Phase 7 executes.
   - Recommendation: Wire the download link to `/mk-ultra.gpx` now. When the updated GPX
     arrives, it replaces that file and re-runs data generation (Plan 01-MEMORY) — the download
     link does not need to change.

4. **Great Lakes Recovery Centers: URL or just text?**
   - What we know: PROJECT.md says "$10 suggested donation to Great Lakes Recovery Centers"
   - What's unclear: Should the event info block link to their website? Is there a specific
     donation page or just their homepage?
   - Recommendation: Plan 07-03 should include a link to Great Lakes Recovery Centers' website.
     Confirm the URL before execution. If unknown, use a placeholder.

5. **Distance displayed in hero: 80mi or 100mi?**
   - What we know: PROJECT.md says "80 miles." The memory file says the route was extended to
     100 miles. The roadmap success criterion says "distance (80 miles)."
   - What's unclear: Has the PROJECT.md been updated to reflect the new distance?
   - Recommendation: Confirm with user before Plan 07-01. The hero content must be accurate.
     The success criterion that says "80 miles" may need updating.

---

## Sources

### Primary (HIGH confidence)
- https://docs.astro.build/en/guides/client-side-scripts/ — Astro script processing, is:inline, data-* bridge pattern, setInterval usage
- https://docs.astro.build/en/basics/astro-components/ — Named slots, slot="head" pattern
- https://docs.astro.build/en/reference/directives-reference/ — define:vars behavior, is:inline implication
- https://docs.astro.build/en/reference/modules/astro-assets/ — getImage() API, server-only limitation
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a — download attribute behavior, same-origin restriction

### Secondary (MEDIUM confidence)
- https://alexnguyen.co.nz/blog/preloading-images-with-astro/ — Named slot preload technique (verified against official Astro docs)
- https://daily-dev-tips.com/posts/vanilla-javascript-countdown-clock/ — Countdown timer implementation pattern (verified core logic is standard browser API)

### Tertiary (LOW confidence)
- CTA conversion best practices (WebSearch general results) — Used to confirm "single primary CTA above fold" direction; not authoritative for this specific design.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All tools are either existing project deps or browser-native APIs
- Architecture: HIGH — Verified against official Astro docs; named slot and data-* patterns both confirmed
- Pitfalls: HIGH — Derived from documented Astro behaviors (define:vars bundling, preload placement) + browser spec (download attribute same-origin)
- Open questions: These are content/coordination gaps, not technical unknowns. Technical answers are clear.

**Research date:** 2026-03-26
**Valid until:** 2026-06-01 (Astro 6.x is stable; patterns are framework fundamentals unlikely to change)
