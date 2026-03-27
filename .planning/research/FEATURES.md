# Feature Landscape — v2.0

**Domain:** Gravel cycling event website — interactivity + visual polish milestone
**Researched:** 2026-03-27
**Project:** MK Ultra Gravel — v2.0 features layered onto a shipped v1.0

---

## Context: What This Research Covers

v1.0 shipped all table-stakes event site features. This research covers the five feature
categories targeted for v2.0:

1. Strava KOM/QOM leaderboard display
2. Map ↔ elevation profile interactivity (crosshair sync + segment highlighting)
3. Photos on sector and KOM cards
4. Hover/click/load animations (brutalist/dark aesthetic)
5. MK Ultra name explainer section

The question for each feature: what does expected behavior look like, what approaches
exist, and what complexity does it carry?

---

## Feature 1: Strava KOM/QOM Leaderboard

### Expected Behavior (Industry Standard)

Users expect: a named KOM/QOM segment linked to Strava, current record holder name/time,
and ideally a top-3 to top-10 list with athlete names and effort times. Reference pattern
is RideWithGPS segment leaderboards and the Strava web UI.

The cycling community understands "KOM" to mean "fastest Strava effort on this segment."
If you show a leaderboard, it should be the actual Strava data — fake or static data would
feel wrong to the target audience.

### What Strava Actually Allows

**The core constraint (HIGH confidence, verified via API docs and developer community):**

Strava removed the segment leaderboard endpoint (`/api/v3/segments/:id/leaderboard`) from
public API access in June 2020. A Forbidden error is returned regardless of OAuth scope.
The official change notice from developers.strava.com/docs/segment-changes/ confirms:
"Segment Leaderboard endpoint is not available."

What remains available via the API without Strava subscription:
- Segment metadata (name, distance, grade, location)
- Individual segment efforts within authenticated user's own activities
- Personal achievements (PRs) for the authenticated user
- Top 10 leaderboard rankings (this was listed as still available, but developer reports
  indicate Forbidden errors in practice — treat as LOW confidence)

**Web scraping is explicitly prohibited** by Strava's Terms of Service and developer
policy. Apps caught scraping are deplatformed.

**Strava segment embed iframe:** There is an embed format
(`strava.com/segments/[id]/embed`) that historically showed a top-10 men's leaderboard.
In 2024, multiple users reported the embed rendering as blank, citing browser cookie
blocking (Chrome third-party cookie deprecation). The embed is unreliable as a
production approach.

**The gap:** Full KOM/QOM leaderboard data is not reliably accessible via any public
mechanism — API, embed, or scrape — as of 2026.

### Viable Implementation Approaches

**Option A: Manual/curator-maintained leaderboard (RECOMMENDED)**
- Organizer or a volunteer checks Strava weekly/monthly, copies top 3-5 results
- Stored as JSON in the repo (`public/data/leaderboard.json`), updated by manual commit
- Website renders from this static JSON
- Complexity: LOW (data structure + rendering component)
- Freshness: weekly/monthly — acceptable for a pre-event site
- Honesty: label it "Updated [date]" so users know it's not live
- Dependencies: Strava segment IDs already defined in annotations.json

**Option B: Deep link to Strava segment page**
- Show segment metadata (name, distance, grade) from existing annotations.json
- Add a "View leaderboard on Strava" link to the actual segment URL
- No leaderboard data displayed on the site at all
- Complexity: VERY LOW (text link)
- Accuracy: Always current (user goes to Strava for live data)
- Best for: KOM cards where the existing component already has the segment data

**Option C: Authenticated OAuth flow with periodic caching**
- Build a serverless function (Netlify Function) that authenticates as a Strava user
  and caches the authenticated user's top-10 view
- This is technically possible but requires: OAuth app registration, a service Strava
  account, Netlify Functions (breaks the pure static model), and ongoing maintenance
- Complexity: HIGH. Breaks the static site model. Requires an OAuth user token that
  must be refreshed. Not recommended for a volunteer-run single event site.

**Recommendation:** Option A (manual JSON) + Option B (Strava link) together. Show the
last-known top 3 efforts with a date stamp and a link to the live Strava segment. This
is honest, low-maintenance, and consistent with how similar small events handle it.

### Table Stakes vs Differentiator Classification

- Showing a live auto-updating leaderboard: NOT table stakes (technically blocked)
- Showing segment metadata + Strava link: Table stakes for KOM-aware cycling audience
- Showing a periodically-updated top-3 with the organizer's curated data: DIFFERENTIATOR
  (most small event sites don't do even this much)

---

## Feature 2: Map ↔ Elevation Profile Interactivity

### Expected Behavior (Industry Standard)

Reference: RideWithGPS, Komoot, Strava route pages — these are the gold standard that
the MK Ultra Gravel target audience uses daily.

**Hover over elevation chart:**
- A vertical crosshair line appears at the cursor position on the chart
- A corresponding marker dot appears at the matching lat/lng on the map
- The marker moves continuously as cursor moves left/right along the chart
- Tooltip shows current mile/km and elevation at cursor position
- The map does NOT pan or zoom during hover — marker just appears at the location

**Hover over map / polyline:**
- Cursor proximity to the route polyline shows the nearest point's elevation/mile on chart
- A vertical highlight or point indicator appears on the elevation chart
- This direction (map → chart) is less common in event sites; chart → map is the primary

**Click on elevation chart sector band:**
- If sector bands are rendered as chart annotations (which they are in current code),
  clicking a band could highlight that sector on the map and scroll/zoom to it
- This is a "nice to have" that few sites implement — most only do hover sync

**Click on map sector polyline:**
- Already works in v1.0 (Leaflet popup opens)
- Enhancement: clicking sector polyline could highlight its band on the elevation chart

### Current Implementation Gap

The existing ElevationProfile.astro uses Chart.js with `animation: false` and no
interactive crosshair. The existing RouteMap.astro uses Leaflet with no position
broadcast. The two components share no communication channel.

Implementing bidirectional sync requires:
1. A shared data model: route-data.json already maps `{mi, lat, lon, ele}` for each point
2. A communication channel: custom DOM events or a shared module-scope variable
3. Chart side: `chartjs-plugin-crosshair` for vertical crosshair + a callback that
   dispatches a custom event with the interpolated lat/lng
4. Map side: a Leaflet `L.circleMarker` or `L.marker` that listens for that event and
   moves to the dispatched position

`chartjs-plugin-crosshair` (npm: `chartjs-plugin-crosshair`, v2.0.0, MIT license) draws
a vertical crosshair line and fires events on mousemove. It supports snapping to data
points when `hover.intersect` is false. The plugin is compatible with Chart.js v4.
The maintainer's last publish was 2+ years ago, but a fork (`@bennetgallein/chartjs-plugin-crosshair`)
exists for active maintenance. Confidence: MEDIUM (verified via npm + GitHub but plugin
is not heavily maintained).

The custom event communication pattern (elevation chart dispatches `CustomEvent` with
lat/lng data; map listens via `document.addEventListener`) is vanilla JS and has no
library dependency. Confidence: HIGH (standard web platform pattern).

### What Segment Clicking Should Do

When a user clicks a sector card (outside the map/chart), expected behavior:
- Map pans/zooms to that sector's bounds
- That sector polyline on the map pulses or highlights briefly
- The elevation chart's sector band gets a stronger visual highlight
This "cross-component navigation" is the single most complex piece of the sync feature.

### Complexity Breakdown

| Interaction | Complexity | Dependencies |
|-------------|------------|--------------|
| Elevation crosshair (chart only) | LOW | chartjs-plugin-crosshair |
| Chart hover → map marker | MEDIUM | Custom events, shared route-data |
| Map hover → chart highlight | MEDIUM | Leaflet mousemove, Chart.js annotation update |
| Sector card click → map zoom | MEDIUM | Leaflet `fitBounds`, custom event |
| Sector card click → chart highlight | LOW | Chart.js annotation opacity update |
| Full bidirectional live sync | HIGH | All of the above wired together |

**Recommendation:** Implement chart-to-map direction first (hover elevation chart → marker
on map). This is the expected primary flow, delivers the most "wow" moment, and is
independently shippable. Map-to-chart and card-click flows are additive polish.

### Table Stakes vs Differentiator Classification

- Crosshair on elevation chart (tooltip showing mile + elevation): Table stakes
  (users expect this from Chart.js charts; it works via default tooltip already)
- Moving marker on map when hovering chart: DIFFERENTIATOR (none of the comparable
  small event sites do this; it matches what pro cycling route sites do)
- Segment card click → map zoom: DIFFERENTIATOR (cross-component navigation is
  uncommon in this category)

---

## Feature 3: Photos on Sector and KOM Cards

### Expected Behavior (Industry Standard)

Paris-Roubaix sector cards on the official site show a single representative photo per
sector above or alongside the sector metadata. Belgian Waffle Ride and SBT GRVL use
hero-style photos for each course section.

Users expect: a photo that shows what the road surface actually looks like at that
sector. Not a stock photo, not a map thumbnail — an actual road/terrain photo.

### What's Currently Built

The existing GravelSectors.astro and KomSegments.astro components are text-only cards:
name, star rating, mile marker, length. The 33-photo gallery is a separate component
with no reference to sectors.

### Implementation Approach

**Photo assignment:**
- Manually select 1 photo per sector (6 sectors × 1 = 6 photos) and 1 per KOM (3 × 1 = 3)
- Add `photo` field to each sector/KOM entry in annotations.json
- Reference existing filenames from photos.json

**Display pattern:**
- Full-width image above the card metadata (art-direction: landscape crop preferred)
- Or: right-column thumbnail inside the card (more compact)
- Use existing WebP thumbnails from the v1.0 pipeline for card display
- Full-res photo available on click via PhotoSwipe (already wired up)

**Complexity:** LOW. This is a data + template change. The asset pipeline already
generates WebP thumbnails. annotations.json already has the sector/KOM structure.
The only work is: select photos, add fields to JSON, update card template.

**Gotcha:** Photo selection requires judgment — the chosen photo should be at or near
that sector, not just any route photo. This is editorial work, not engineering.

### Table Stakes vs Differentiator Classification

- Photos on sector cards: DIFFERENTIATOR for small event sites (most have text-only
  cards); TABLE STAKES relative to pro events like Paris-Roubaix or Belgian Waffle Ride
- Since the target audience is familiar with Paris-Roubaix, photo-per-sector is
  implicitly expected by anyone who uses that as a reference

---

## Feature 4: Hover/Click/Load Animations

### Brutalist Design Constraints

Standard design advice on brutalist aesthetics (verified via CSS/design articles):
movement is rarely a core feature of brutalist design. When it does appear, it is
stark, abrupt, or "glitchy" — not smooth easing curves. The MK Ultra Gravel design
uses CIA document aesthetics and psychedelic themes, which gives permission for:
- Flicker/glitch effects on text or images
- Hard offset box-shadows that shift on hover (neo-brutalist "lift" effect)
- Desaturation-to-color reveals on card hover
- Fade-in on scroll for card stacks

What to avoid: rounded ease-in-out curves, bouncy spring physics, floating action
buttons, skeleton loading screens. These read "friendly SaaS," not "classified document."

### Specific Animation Patterns That Fit

**Card hover state (sector/KOM cards):**
- Hard shadow shift: `box-shadow: 4px 4px 0 var(--accent-color)` → `box-shadow: 6px 6px 0`
  on hover. Creates a tactile "press" or "lift" feel. Low complexity.
- Border color flash: classified-border color transitions on hover. Low complexity.
- Star color intensify on hover: opacity or brightness increase on the star rating. Low.

**Scroll-reveal entrance (sector cards, KOM cards, gallery):**
- Staggered fade-in as cards scroll into view using IntersectionObserver
- `opacity: 0 → 1` with `transform: translateY(8px) → 0` — subtle, not dramatic
- No GSAP needed; native CSS transitions triggered by a JS-added class are sufficient
- GSAP ScrollTrigger is free post-Webflow acquisition (2024) and available as a zero-
  dependency option if more control is needed
- Complexity: LOW (CSS + IntersectionObserver) to MEDIUM (GSAP for staggered sequences)

**Map/chart load animation:**
- Map: tile fade-in is handled by Leaflet's tile renderer naturally
- Chart: Chart.js supports `animation: { duration: 800 }` for line draw-on animation
  (currently disabled for performance; can be enabled for visual polish if LCP is not
  impacted — chart is lazy-loaded so it won't affect LCP)

**Countdown timer:**
- Digit flip or flicker on each second tick — fits the CIA/classified aesthetic
- Pure CSS counter animation or JS-driven class toggle. Low complexity.

**Photo gallery items:**
- Hover: grayscale → color reveal on route photos. Medium complexity.
  `filter: grayscale(60%)` → `grayscale(0%)` transition. Fits the "declassified" theme.
- PhotoSwipe lightbox open/close already has built-in animation.

**Hero text:**
- Redacted text uncover effect on page load: spans styled as CIA redaction bars that
  "un-redact" (width collapses) after a short delay. High brand fit, low complexity.

### Accessibility Requirement

`prefers-reduced-motion` must be respected. The pattern (HIGH confidence, W3C C39):

```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

Or use the no-motion-first approach: declare no animation by default, only add animation
inside `@media (prefers-reduced-motion: no-preference)`.

For JavaScript-driven animations (IntersectionObserver triggers, countdown flicker):
```js
const motionOK = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
if (motionOK) { /* apply animation */ }
```

### Table Stakes vs Differentiator Classification

- Hover states on cards (some visual feedback): Table stakes (no hover = broken feel)
- Hard shadow shift on hover: DIFFERENTIATOR (fits brutalist aesthetic uniquely)
- Scroll-reveal stagger on card lists: DIFFERENTIATOR (creates cinematic quality)
- Grayscale → color photo reveal: DIFFERENTIATOR (reinforces "declassified" theme)
- Anti-feature: smooth easing, bounce physics, skeleton screens — wrong aesthetic

---

## Feature 5: MK Ultra Name Explainer Section

### Expected Behavior

"About the name" or "What is this?" sections are a standard content pattern for events
with unusual or provocative names. The function is:
1. Acknowledge the visitor's likely question ("what is MK Ultra?")
2. Give the real-world answer (CIA covert mind control program, 1953-1973, LSD experiments)
3. Bridge the connection to the ride theme
4. Do this with tone that matches the brand voice (dark, irreverent, self-aware)

This is a content/copywriting feature, not an engineering feature. The complexity
is editorial, not technical.

### Content Structure (Research-Derived)

**What MK Ultra actually was (HIGH confidence, Wikipedia/CIA.gov):**
- MKULTRA was a CIA covert program of human experimentation, running 1953-1973
- Used psychoactive drugs (primarily LSD) without subjects' consent
- Aimed at developing mind control and interrogation techniques
- Officially halted 1973; Church Committee investigations 1975 exposed it
- Documents were ordered destroyed by CIA Director Richard Helms in 1973; 20,000 files
  survived a misfiling and were released under FOIA in 1977
- The program's secrecy, bureaucratic cover, and use of LSD connect directly to the
  site's design themes (redacted documents, psychedelic visuals, CIA aesthetics)

**The ride connection:**
- The gravel sectors are described as "punishing" and "psychedelic" in their difficulty
- The free/grassroots nature of the event is deliberately anti-establishment
- The name signals: this is not a sponsored corporate event; this is something weird
  and memorable

**Placement options:**
- After the event info block, before or after the map section
- As a collapsible "CLASSIFIED" section with a redaction-reveal interaction (fits theme)
- As footer copy (less impactful but lower visual weight)

**Design treatment matching the aesthetic:**
- CIA document styling: monospace type, redaction bars, "DECLASSIFIED" stamp
- The section could be formatted as a partially-redacted briefing document
- Text could reference actual FOIA documents (links add credibility and humor)

### Complexity

LOW engineering complexity. This is a new Astro component with static HTML/CSS.
The only interactive element could be the redaction reveal (click to uncover), which
is a CSS width-transition on a pseudo-element — pure CSS, no JS needed.

### Table Stakes vs Differentiator Classification

- Some "about the name" explanation: TABLE STAKES (without it, the name is opaque to
  non-cycling-history audience members; "why is it called MK Ultra?" is the first thing
  anyone unfamiliar asks)
- CIA document design treatment with real historical references: DIFFERENTIATOR
  (the humor and specificity of the connection is what makes it shareable)

---

## Feature Dependency Map (v2.0)

```
Strava leaderboard (manual JSON approach)
  └── Depends on: KOM segment Strava IDs (need to be found/confirmed per segment)
  └── Depends on: JSON schema addition to annotations.json or new leaderboard.json
  └── INDEPENDENT of: map, elevation chart, photo changes

Map ↔ elevation sync (chart → map direction)
  └── Depends on: route-data.json already has {mi, lat, lon, ele} — EXISTS
  └── Depends on: chartjs-plugin-crosshair npm install
  └── Depends on: Custom event bus between ElevationProfile.astro and RouteMap.astro
  └── INDEPENDENT of: Strava leaderboard, photos, animations

Map ↔ elevation sync (sector card → map zoom)
  └── Depends on: Map ↔ elevation sync custom event bus (shared infrastructure)
  └── Depends on: GravelSectors.astro getting sector-id data attributes

Photos on sector/KOM cards
  └── Depends on: Photo selection/assignment work (editorial)
  └── Depends on: annotations.json schema update (add photo field)
  └── INDEPENDENT of: sync, leaderboard, animations

Animations
  └── Depends on: Existing components (adds behavior, doesn't change structure)
  └── Mostly INDEPENDENT — each component gets its own animation additions
  └── Scroll-reveal needs IntersectionObserver (already used in map/chart init)

MK Ultra name explainer
  └── FULLY INDEPENDENT — new static Astro component, no dependencies
```

---

## Anti-Features for v2.0

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Live Strava OAuth leaderboard | Requires serverless function, OAuth token refresh, breaks static model, high maintenance for volunteer-run event | Manual JSON leaderboard with Strava link |
| Auto-refreshing leaderboard | Overkill for monthly-updated data; adds complexity and edge cases | Static JSON with "Last updated" timestamp |
| Strava embed iframe for leaderboard | Breaks in modern browsers (third-party cookies blocked); shows blank in Chrome | Direct link to Strava segment + curated JSON |
| Full bidirectional map/chart sync on first pass | Map → chart direction is low-value; chart → map is the primary user flow | Implement chart → map only; defer map → chart |
| Animated page transitions | Fundamentally incompatible with Astro's static rendering model; breaks scroll position | Per-component entrance animations instead |
| Video background for explainer | Wrong medium for CIA document aesthetic; high bandwidth cost | Styled text component with redaction effects |
| Smooth ease-in-out hover curves | Wrong aesthetic for brutalist dark design | Hard box-shadow shifts, abrupt color changes |
| Confetti or celebratory animations | Wrong tone entirely | Dark glitch effects if any motion at all |

---

## MVP Recommendation for v2.0

Ordered by impact-to-effort ratio:

**Tier 1 — High impact, low effort (ship first):**
1. Photos on sector cards (editorial work + template change)
2. MK Ultra name explainer (new static component, copywriting)
3. Card hover animations (CSS-only changes to existing components)
4. Strava deep-link on KOM cards (1-line change per card)

**Tier 2 — High impact, medium effort:**
5. Elevation chart crosshair (install chartjs-plugin-crosshair, configure)
6. Chart hover → map marker (custom event bus, ~50-80 lines of new JS)
7. Manual leaderboard JSON + display component

**Tier 3 — Polish, defer if time-constrained:**
8. Sector card click → map zoom (cross-component navigation)
9. Scroll-reveal stagger on card lists (IntersectionObserver + CSS classes)
10. Chart.js draw-on animation on scroll-in (re-enable with duration)

---

## Confidence Assessment

| Finding | Confidence | Source |
|---------|------------|--------|
| Strava leaderboard API blocked | HIGH | developers.strava.com/docs/segment-changes/ + community hub reports |
| Strava embed iframe unreliable in 2024+ | MEDIUM | Community reports of blank embeds; Chrome cookie deprecation; not verified via official Strava statement |
| chartjs-plugin-crosshair compatibility with Chart.js v4 | MEDIUM | npm page + GitHub; plugin is lightly maintained, fork exists |
| Custom DOM event pattern for map/chart sync | HIGH | Standard web platform pattern; no library dependency |
| Brutalist hover patterns (hard shadow shift) | MEDIUM | CSS design articles + freefrontend.com examples; fits established brutalist conventions |
| prefers-reduced-motion requirement | HIGH | W3C WCAG C39, MDN, multiple authoritative sources |
| MK Ultra historical facts | HIGH | Wikipedia + CIA FOIA reading room + Princeton Special Collections |
| Photos-on-cards pattern in pro cycling events | HIGH | Paris-Roubaix official site, Belgian Waffle Ride, SBT GRVL — all use per-sector photos |

---

## Sources

- [Strava Segment API Changes — developers.strava.com](https://developers.strava.com/docs/segment-changes/)
- [Strava API Reference — developers.strava.com](https://developers.strava.com/docs/reference/)
- [API Segment Leaderboards Community Discussion — Strava Community Hub](https://communityhub.strava.com/developers-api-7/api-segment-leaderboards-and-efforts-3031)
- [Strava Segment Leaderboard Guidelines — support.strava.com](https://support.strava.com/hc/en-us/articles/216919507-Segment-Leaderboard-Guidelines)
- [chartjs-plugin-crosshair — npm](https://www.npmjs.com/package/chartjs-plugin-crosshair)
- [chartjs-plugin-crosshair — GitHub](https://github.com/AbelHeinsbroek/chartjs-plugin-crosshair)
- [Chart.js Interactions — chartjs.org](https://www.chartjs.org/docs/latest/configuration/interactions.html)
- [Leaflet Elevation Plugin — Raruto/leaflet-elevation](https://github.com/Raruto/leaflet-elevation)
- [RideWithGPS Elevation Profile Sync — support.ridewithgps.com](https://support.ridewithgps.com/hc/en-us/articles/4419005868315-The-Elevation-Profile-on-Web)
- [MapTiler Elevation Profile Marker Sync — docs.maptiler.com](https://docs.maptiler.com/sdk-js/examples/elevation-profile-control-marker/)
- [prefers-reduced-motion — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)
- [W3C WCAG C39 — prefers-reduced-motion technique](https://www.w3.org/WAI/WCAG21/Techniques/css/C39)
- [Brutalist Web Design — magnatechnology.com](https://www.magnatechnology.com/blog/brutalist-web-design-a-raw-unconventional-approach-to-the-modern-web/)
- [CSS Hover Effects — prismic.io](https://prismic.io/blog/css-hover-effects)
- [GSAP ScrollTrigger — gsap.com](https://gsap.com/scroll/)
- [MKUltra — Wikipedia](https://en.wikipedia.org/wiki/MKUltra)
- [CIA FOIA MK-ULTRA — cia.gov](https://www.cia.gov/readingroom/document/06760269)
- [MK-Ultra Princeton Special Collections — specialcollections.princeton.edu](https://specialcollections.princeton.edu/2025/10/the-cias-quest-for-mind-control-piecing-together-project-mk-ultra-and-its-princeton-connections-part-i-allen-w-dulles-class-of-1914/)
