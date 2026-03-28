# Feature Landscape — v3.0

**Domain:** Gravel cycling event website — Escher identity, data fixes, UX polish
**Researched:** 2026-03-28
**Project:** MK Ultra Gravel — v3.0 features layered onto shipped v2.0

---

## Context: What This Research Covers

v2.0 shipped map/elevation sync, sector photos, brutalist animations, and the MK Ultra
explainer. This research covers the five v3.0 feature categories:

1. Escher/Penrose tessellation backgrounds with subtle animation
2. Bike icon replacing elevation hover crosshair on map
3. KOM segments on elevation profile (distinct color/pattern)
4. Gravel sector color spectrum: full yellow-to-red (replacing gray for stars 1-2)
5. Penrose triangle favicon and logo

---

## Feature 1: Gravel Sector Color Spectrum (Yellow-to-Red)

### Current State

Stars 1-2 use gray (#888888, #aaaaaa). Stars 3-5 already use warm colors.
The `starColors` map is **duplicated in three files**:
- `src/components/RouteMap.astro` (JS, used for map polylines and sector badges)
- `src/components/GravelSectors.astro` (JS frontmatter, used for card star color)
- `src/components/ElevationProfile.astro` (JS, used for annotation box colors)

No shared constant exists. Changing the spectrum requires the same edit in three places.

### Expected Behavior (Industry Standard)

**Cycling difficulty heat maps use yellow-to-red universally.** Evidence:

- BikeRoll uses yellow (6-12% gradient) → red (12-48%) progression
- cycle.travel uses orange (>3.5% avg grade) → red (>7%) → maroon (>10.5%)
- SAS/VWO heat map theory: "warmer colors (yellow, orange, red) represent higher
  intensity" — the YLORRD ramp is the standard sequential color scheme
- Komoot shows gradient color grading on elevation maps using green-to-red

For a Paris-Roubaix reference event, using gray for easy sectors diverges from what
cyclists see everywhere else. Yellow-to-red is the universal encoding.

**Recommendation for 5-star spectrum:**

| Stars | Current | Recommended | Reading |
|-------|---------|-------------|---------|
| 1 | #888888 (gray) | #ffd700 (gold/yellow) | Easy gravel — rideable |
| 2 | #aaaaaa (lighter gray) | #f5a623 (amber) | Moderate — attention needed |
| 3 | #f5a623 (amber) | #e8761f (deep amber) | Hard — rough surface |
| 4 | #e86d1f (orange) | #d4420f (red-orange) | Very hard — punishing |
| 5 | #c0392b (red) | #c0392b (keep) | Brutal — Paris-Roubaix level |

This shifts stars 1-2 from gray to warm yellow/amber, keeps the warm-to-hot
progression for 3-5, and retains the existing star-5 red. The perceptual gradient
reads more naturally on the dark CARTO map tiles.

**Alternative spectrum using oklch (consistent with project's color space):**

```
1: oklch(0.82 0.18 85)   — bright yellow
2: oklch(0.72 0.18 65)   — amber
3: oklch(0.65 0.19 55)   — deep amber
4: oklch(0.55 0.20 40)   — orange-red
5: oklch(0.45 0.20 25)   — red (close to current #c0392b)
```

oklch values are perceptually uniform: equal lightness steps produce equal visual
contrast at each star level. Confidence: MEDIUM (oklch is the project's color space;
specific values need visual QA against dark map tiles).

### Scope of Change

This is a data fix + constant extraction, not a feature build:

1. Extract `starColors` into a shared module (e.g., `src/lib/sectorColors.ts`)
   — eliminates the three-way duplication
2. Update the 5 color values
3. Verify map polylines, elevation chart bands, sector card stars, sector badges
   all pick up the new values
4. Export as both HEX (Leaflet, Chart.js consume HEX) and CSS custom properties
   (for use in Astro component styles if needed)

### Table Stakes vs Differentiator

- Warm color for hard sectors (stars 3-5): **TABLE STAKES** (already exists)
- Warm color for easy sectors (stars 1-2): **TABLE STAKES for the target audience**
  (cyclists expect yellow-to-red difficulty encoding; gray breaks that mental model)
- Full yellow-to-red 5-step spectrum: **DIFFERENTIATOR** (most small event sites
  don't achieve perceptually uniform color ramps)
- Anti-feature: gray for easy gravel — signals "unfinished" to experienced cyclists

### Complexity

**LOW.** Mostly constant extraction and value substitution. The main risk is visual
regression across three separate rendering contexts (map, elevation chart, sector
cards) that must all stay in sync. Extracting to a shared module eliminates future
divergence risk.

---

## Feature 2: Bike Icon on Elevation Hover (Map Cursor)

### Current State

When the user hovers the elevation chart, a `CustomEvent('elevation:hover')` fires
with `{lat, lon}`. RouteMap.astro listens and moves a `L.circleMarker` to that
position. The circleMarker is a small cyan dot — functional but generic.

### Expected Behavior (Industry Standard)

RideWithGPS: a circular blue dot tracks position on the map during elevation hover —
matches the existing implementation.

Komoot: a dot on the route tracks elevation hover — also matches existing.

Strava route pages: vertical crosshair on chart only, no map tracking.

**None of the major platforms use a bike icon** for the elevation hover tracker.
The bike icon is a creative/brand differentiation choice, not an industry standard.
It fits the MK Ultra brand identity and is technically straightforward with L.divIcon.

### Implementation Pattern

**L.divIcon with inline SVG is the correct approach** (HIGH confidence, verified via
Leaflet docs). The pattern:

```javascript
const bikeIcon = L.divIcon({
  html: `<svg viewBox="0 0 24 24" width="24" height="24" ...>
    [bike path data]
  </svg>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],   // centered — bike sits on the route point
  className: ''            // IMPORTANT: empty string removes Leaflet's white box default
});

const hoverMarker = L.marker([lat, lon], { icon: bikeIcon, interactive: false });
```

On `elevation:hover` event, call `hoverMarker.setLatLng([lat, lon])` and add/show
it. On `elevation:hoverEnd`, remove/hide it.

**SVG bike icon source options:**

1. **Inline SVG path from Lucide icons** (bicycle icon, MIT license) — no file
   dependency, renders crisply at any DPI. Lucide `bicycle` is 24x24 viewBox,
   single path. This is the recommended approach.

2. **Material Symbols / FontAwesome** — requires font load; unnecessary overhead
   for a single icon.

3. **Custom drawn SVG** — highest brand fit but requires design work.

**Rotation to match route bearing:** At each track point, bearing to the next point
can be computed (standard haversine bearing formula). Applying `transform: rotate(Xdeg)`
to the SVG preserves GPU-layer compositing and doesn't trigger layout. This makes the
bike "face the direction of travel." Complexity: MEDIUM (bearing calculation is ~10
lines; JS transform application is trivial). Optional enhancement, not required for
first pass.

### Performance Note

Moving a marker on every hover rAF is the same pattern already in use. Adding an SVG
divIcon vs a circleMarker is negligible overhead — SVG renders in the same Leaflet
pane. No new perf concern. Confidence: HIGH (same rAF pattern already proven at
Lighthouse 96).

### Accessibility

The hover marker is `interactive: false`. Screen readers don't encounter it. No
accessibility concern beyond existing implementation.

### Table Stakes vs Differentiator

- Moving dot tracker on elevation hover: **TABLE STAKES** (already exists via circleMarker)
- Bike icon instead of dot: **DIFFERENTIATOR** — brand-appropriate, memorable,
  consistent with Escher/psychedelic cycling identity
- Bearing-aligned rotation: **DIFFERENTIATOR** — reinforces "riding the route" mental model
- Anti-feature: complex 3D bike icon — heavy SVG would flicker during rAF updates;
  keep icon simple and flat

### Complexity

Replacing circleMarker with divIcon: **LOW**.
Adding bearing rotation: **MEDIUM** (bearing math + CSS transform on move).

---

## Feature 3: KOM Segments on Elevation Profile

### Current State

KOM segments are shown on the **map** as dashed chartreuse-green polylines. They are
**not represented on the elevation profile at all.** The elevation chart shows only
gravel sector band overlays (box annotations).

KOM data in annotations.json has `startMi` and `endMi` fields — exactly the same
structure as gravel sectors. The annotation plugin already renders box annotations
from those fields.

### Expected Behavior (Industry Standard)

**RideWithGPS** (verified via search): Clicking a segment result highlights it on
both the map track and elevation profile. Climb distance highlights that portion on
the trip on both map and elevation profile. Segment overlay appears as a colored band.

**Komoot**: Color-graded elevation shows climb gradients — different from segments,
but the principle of "differentiated zones on the elevation chart" is standard.

**Strava**: Starred segments appear as markers/flags on the elevation profile timeline
when viewing a route or activity.

The cycling audience expects segments (especially named KOM climbs) to be visually
demarcated on the elevation profile.

### Visual Treatment Options

**Option A: Box annotation with chartreuse-green fill (matches map color)**
- `backgroundColor: '#7fff00' + '22'` (13% opacity) — matches existing map polyline
- `borderColor: '#7fff00' + '66'` — matches map opacity style
- Visually consistent: same color, same transparency pattern as sectors
- Drawback: box annotation visually merges with sector band if they overlap
- Confidence: HIGH (same API as existing sector boxes)

**Option B: Hatched/striped pattern annotation**
- chartjs-plugin-annotation does not natively support hatched fills
- Canvas `CanvasPattern` can create hatches but requires a custom plugin hook
  drawing into the same canvas context
- The `beforeDatasetsDraw` lifecycle hook can draw arbitrary canvas operations
- Complexity: HIGH — requires a custom canvas pattern plugin, not standard annotation
- Not recommended unless sector-KOM overlap is a documented issue

**Option C: Line annotations at `startMi` and `endMi` (vertical flags)**
- Two vertical line annotations per KOM: start flag and end flag
- `type: 'line'`, `scaleID: 'x'`, `value: startMi`, with label showing KOM name
- Clear and readable; no fill — no overlap concern
- Matches the "flag on timeline" pattern Strava uses
- Complexity: LOW (same API, different annotation type)

**Option D: Box annotation with distinct color (non-chartreuse)**
- Use a separate color not in the sector palette
- Candidates: electric blue (#00bfff), magenta (#ff00ff), chartreuse (#7fff00)
- The existing map already uses chartreuse for KOM polylines — reusing it here
  maintains visual consistency between map and elevation chart
- Recommended: chartreuse green (#7fff00) at reduced opacity (Option A),
  combined with a KOM label text inside the box

**Recommendation: Option A (box) with a text label**

KOM segments are short (0.5–1.5 mi each, based on annotations.json data). They will
appear as narrow vertical slices on the elevation chart. A box with chartreuse fill
and a text label showing the KOM name achieves:
- Visual parity with the map treatment
- Clear segment demarcation
- No new color vocabulary to learn

Label configuration in chartjs-plugin-annotation:

```javascript
annotationBoxes[`kom_${i}`] = {
  type: 'box',
  xMin: kom.startMi,
  xMax: kom.endMi,
  backgroundColor: '#7fff00' + '22',
  borderColor: '#7fff00' + '88',
  borderWidth: 1.5,
  borderDash: [4, 2],   // dashed border — matches map's dashArray: '8, 4'
  label: {
    content: kom.name,
    display: true,
    color: '#7fff00',
    font: { size: 9, family: 'Space Mono' }
  }
};
```

The `borderDash` connects the elevation chart's visual language to the map's dashed
KOM polyline — a consistent cross-component visual signal.

### Chart Annotation Update Pattern

The existing code already demonstrates runtime annotation mutation at `chart.update('none')`
via the `map:sectorHover` handler. The KOM boxes use the exact same mechanism.
Confidence: HIGH (pattern verified in existing codebase).

### Table Stakes vs Differentiator

- KOM segments visible on map: **TABLE STAKES** (already exists)
- KOM segments visible on elevation chart: **DIFFERENTIATOR** — allows users to
  see exactly where climbs fall on the elevation profile, connecting geography to
  effort; this is what the cycling community expects from a pro-grade route site
- KOM-to-sector hover sync (hovering a KOM band highlights map KOM polyline):
  **DIFFERENTIATOR** — cross-component consistency; optional second-pass feature

### Complexity

Adding KOM box annotations to existing annotation initialization: **LOW**.
KOM label text inside box: **LOW** (annotation label config).
Dashed border on KOM boxes (to match map): **LOW** (annotation `borderDash` option).

---

## Feature 4: Escher/Penrose Tessellation Backgrounds

### Domain Research

**What Escher tessellations are:** M.C. Escher's tessellations tile interlocking shapes
(birds, fish, lizards) that fill a plane with zero gaps. The "Penrose" connection is
separate — Penrose tilings use two aperiodic tile shapes (kite + dart) that tile
infinitely without repeating. The "Escherian Stairs" (Penrose stairs) are a different
concept — the impossible staircase, not a tessellation.

The project already uses an `escharian_stairs_fb.webp` asset — this is a background
image, not a live-rendered pattern.

**What the user is asking for (VIS-14):** Tessellation patterns as backgrounds with
subtle animation — i.e., geometric repeating patterns inspired by Escher/Penrose
aesthetics, rendered via CSS/SVG (not actual procedural tessellation algorithms).

### Implementation Approaches

**Approach A: CSS `background-image` with SVG pattern (RECOMMENDED)**

An inline SVG `<pattern>` element, embedded in a CSS `background-image` data URI.
No animation — the texture appears as a subtle static pattern.

```css
.escher-bg {
  background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'
    width='60' height='60'><polygon points='...' fill='none' stroke='oklch(0.25 0.01 250)'
    stroke-width='0.5' opacity='0.3'/></svg>");
}
```

Complexity: LOW. Performance: zero runtime cost (CSS background, no animation).
The pattern scales perfectly and renders at device resolution.

**Approach B: Animated SVG pattern with CSS `@keyframes` on `transform`**

A `<svg>` element with a `<pattern>` tile, animated via `transform: translate()` to
create a slow drift or rotation effect.

```css
@keyframes tessellate-drift {
  from { transform: translate(0, 0); }
  to   { transform: translate(60px, 60px); }
}

.escher-bg svg {
  animation: tessellate-drift 12s linear infinite;
  will-change: transform;
}
```

**Performance verdict (HIGH confidence from SVG animation research):**
- Animating only `transform` keeps the animation on the compositor thread
- "CSS transform achieves 60fps on desktop and 55fps on mobile"
- Do NOT animate `fill`, `stroke`, path `d` attributes, or `opacity` from 0
- The `will-change: transform` hint promotes to GPU layer
- This is safe for LCP: a background tessellation is not the LCP element, and
  starting from non-zero opacity prevents LCP capture issues
- `prefers-reduced-motion: reduce` must disable the drift; static pattern remains

**Approach C: CSS `@keyframes` on `background-position` (pattern scroll)**

Animate `background-position` on a CSS background SVG pattern — creates the
appearance of the pattern sliding.

```css
@keyframes pattern-slide {
  to { background-position: 60px 60px; }
}
```

This animates `background-position`, which is NOT a compositor-safe property —
it triggers paint (not just composite). On mobile, this will consume CPU.
**Not recommended** for a site that currently achieves Lighthouse 96 mobile.

**Approach D: Canvas-rendered tessellation (AVOID)**

JavaScript procedurally generates Penrose tiling on a `<canvas>` element. High
complexity, introduces JS execution on the main thread, requires significant CPU
on mobile, and adds bundle weight. Not aligned with the project's zero-TBT goal.

**Recommendation: Start with Approach A (static SVG pattern), add Approach B
(transform drift) only inside `@media (prefers-reduced-motion: no-preference)`.**

This matches the project's existing animation philosophy: no GSAP, CSS-only, TBT 0ms.

### Pattern Geometry Options

**For an Escher/psychedelic aesthetic, these geometric patterns work on dark backgrounds:**

1. **Penrose kite-and-dart tiling** — aperiodic, visually complex, high brand fit.
   Hard to generate procedurally, but a single tile period can be hand-coded as SVG
   polygons. No widely available CSS-only implementation exists (MEDIUM confidence:
   no authoritative source found for pure-CSS Penrose kite-dart).

2. **Islamic geometric star pattern** — radially symmetric 8-pointed or 12-pointed
   stars tiled on a grid. These are `<polygon>` elements in SVG patterns. Low
   complexity. High visual impact against dark backgrounds.

3. **Triangular/impossible-object grid** — overlapping triangles suggesting Penrose
   triangles. Can be drawn with SVG `<path>` and `<polygon>` elements. Fits the
   "impossible geometry" theme.

4. **Hex grid with isometric perspective** — the Escher "cubes" pattern (referenced
   in the user's Escher box SVG link). This is three rhombuses arranged around a
   center point, repeating on a hex grid. Clean, geometric, dark-palette friendly.
   The referenced CDN SVG (`boxes.svg` from s3-us-west-2 cdpn.io) uses this pattern.

**Recommendation: The Escher cubes (hex/isometric box) pattern**

It's the most directly relevant to the VIS-05 "Escher motifs" requirement already
in the design. It tiles predictably (unlike Penrose kite-dart). It can be implemented
as a pure SVG `<pattern>` without procedural generation.

### Placement Strategy

Not all sections should use the tessellation. Recommended placement:

| Section | Treatment | Rationale |
|---------|-----------|-----------|
| Hero/above-fold | Subtle tessellation at 3-5% opacity | Background texture, not foreground |
| MK Ultra Explainer | More visible at 8-10% opacity | Section benefits most from Escher motif |
| Between-section dividers | Thin band with pattern | Visual rhythm |
| Map/chart sections | None | Complex data viz — pattern competes |

### Accessibility and Motion

```css
/* Static pattern: always visible */
.escher-bg {
  background-image: url("data:image/svg+xml,...");
  background-size: 60px 60px;
}

/* Drift animation: only for users who accept motion */
@media (prefers-reduced-motion: no-preference) {
  .escher-bg {
    animation: escher-drift 20s linear infinite;
  }
}
```

This is the no-animation-first pattern — cleaner than wrapping motion in `reduce`.
Confidence: HIGH (standard WCAG-aligned pattern, multiple authoritative sources).

### LCP Safety

The tessellation background will not be the LCP element (it's a decorative background).
The Approach B transform-only animation will not affect LCP mechanics. Starting
opacity should be non-zero (even 0.03) to avoid theoretical LCP capture edge cases
documented by DebugBear. Confidence: MEDIUM (background pattern shouldn't be LCP
candidate; opacity 0 risk applies to content elements).

### Table Stakes vs Differentiator

- Any geometric background pattern: **TABLE STAKES** for dark brutalist aesthetic
  (the existing film-grain and tone-image patterns already fill this role)
- Escher/Penrose tessellation specifically: **DIFFERENTIATOR** — directly references
  the CIA/psychedelic identity, reinforces brand coherence
- Subtle animated drift: **DIFFERENTIATOR** — adds life without distraction;
  rare in cycling event sites
- Anti-feature: Canvas-rendered procedural Penrose tiling — wrong complexity budget
  for the aesthetic gain; would break zero-TBT
- Anti-feature: High-opacity pattern behind map/chart — would reduce readability
  of primary navigation content

### Complexity

Static SVG pattern as CSS data URI: **LOW**.
Animated transform drift (CSS only): **LOW**.
Custom Escher cubes SVG geometry: **MEDIUM** (requires SVG path authoring for the tile).

---

## Feature 5: Penrose Triangle Favicon and Logo

### Expected Behavior

A favicon is 32x32 (or 48x48 on Windows); modern practice adds a 180x180 `apple-touch-icon`
and an SVG favicon for scalable display. The Penrose (impossible) triangle is a
well-recognized optical illusion — culturally adjacent to psychedelia and impossible
geometry, which fits the MK Ultra brand directly.

### Source Availability

Penrose triangle SVG assets are freely available from multiple sources (Noun Project,
SVG Repo, Vecteezy, freesvg.org, Pixabay). Some are CC0 (public domain), some require
attribution. For a non-commercial event site, many CC-licensed options exist.

The CodePen reference (codepen.io/guestn/pen/AXvKOd) was inaccessible (403), but
based on the project context it implements a Penrose triangle in CSS — this suggests
the triangle could be constructed purely in CSS without an SVG asset.

**CSS Penrose triangle construction** uses the three-nested-div or three-border-triangle
technique with careful border-color assignment to create the optical illusion of an
impossible 3D triangle. This is well-documented on CodePen and CSS-Tricks.

### Favicon Implementation

Modern favicon best practice (MEDIUM confidence, widely cited):

```html
<!-- SVG favicon — scales to any size, supports dark mode -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<!-- PNG fallback for older browsers -->
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<!-- Apple Touch Icon -->
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
```

The SVG favicon should use the Penrose triangle on a dark background matching
`--color-bg-base` (the site's background color). At 32px, fine detail is lost —
the triangle needs to be a bold, high-contrast shape with minimal detail.

### Logo vs Favicon Distinction

The "logo" referred to in VIS-15 most likely means: a header logo or hero element,
not a separate brand identity system. For a single-event site, a header Penrose
triangle (SVG inline or `<img>`) serves as both visual anchor and brand mark.

If the triangle is animated in the header (slow rotation or color-cycle on the
three sides), it reinforces the psychedelic theme. Animating only `transform: rotate`
is compositor-safe.

**Recommendation:**
- SVG favicon: Penrose triangle, dark background, bold stroke (no fill trick or CSS)
- Header logo: Inline SVG Penrose triangle with optional `transform: rotate` on
  `prefers-reduced-motion: no-preference`
- Both assets should be created as actual SVG files (not CSS-only tricks), since
  favicons cannot be CSS

### Table Stakes vs Differentiator

- Having a favicon at all: **TABLE STAKES** (missing favicon shows broken default)
- A Penrose triangle favicon: **DIFFERENTIATOR** — directly references the design
  identity; most event sites use basic geometric or letter marks
- An animated logo in the header: **DIFFERENTIATOR** — cinematic, psychedelic, on-brand
- Anti-feature: complex multi-step animated favicon — favicons animate inconsistently
  across OSes; keep favicon static, animate only the inline header SVG

### Complexity

Static SVG favicon creation: **LOW** (SVG path from public domain source or manual draw).
Header inline SVG with CSS rotation: **LOW**.
CSS-only Penrose triangle (no SVG file): **MEDIUM** — achieves the visual but requires
precise CSS border manipulation; fragile at non-standard sizes.

---

## Feature Dependency Map (v3.0)

```
VIS-12: Sector color spectrum (yellow-to-red)
  └── Requires: Extract starColors to shared module (eliminates 3-way duplication)
  └── Touches: RouteMap.astro, GravelSectors.astro, ElevationProfile.astro
  └── INDEPENDENT of: all other v3.0 features

UX-01: Bike icon on elevation hover
  └── Depends on: existing elevation:hover CustomEvent bus (BUILT in v2.0)
  └── Requires: L.divIcon with SVG bike path (replaces existing circleMarker)
  └── Optional enhancement: bearing calculation for rotation
  └── INDEPENDENT of: color changes, KOM elevation, tessellation

VIS-13: KOM segments on elevation profile
  └── Depends on: chartjs-plugin-annotation already registered (BUILT in v2.0)
  └── Depends on: KOM startMi/endMi fields in annotations.json (EXIST already)
  └── Requires: Add kom annotation boxes to ElevationProfile.astro init
  └── INDEPENDENT of: color changes, bike icon, tessellation

VIS-14: Escher/Penrose tessellation backgrounds
  └── Requires: SVG pattern tile authoring (design work)
  └── Requires: New CSS in global.css or per-component <style>
  └── INDEPENDENT of: all data/map/chart changes

VIS-15: Penrose triangle favicon + logo
  └── Requires: SVG asset creation (design work)
  └── Requires: <link rel="icon"> update in BaseLayout or head
  └── INDEPENDENT of: all data/map/chart changes

DATA-06: Fix photo map positions
  └── Requires: Corrected mile markers in source data
  └── Requires: Regenerate photos.json from prebuild pipeline
  └── INDEPENDENT of: all visual features
  └── Dependent on: Corrected photo mile markers (data entry work)

CONT-05: GLRC links
  └── Requires: Find all GLRC text occurrences, wrap in <a> tags
  └── INDEPENDENT of: all other v3.0 features
  └── Complexity: VERY LOW
```

---

## Anti-Features for v3.0

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Procedural Penrose kite-dart tiling in canvas | High JS complexity, breaks zero-TBT, no visual payoff vs SVG pattern | Static SVG pattern with isometric Escher cubes |
| `background-position` animation for pattern scroll | Non-compositor property, triggers paint, tanks mobile Lighthouse | CSS `transform: translate` animation on SVG element |
| Animated favicon | Inconsistent behavior across OSes; broken on Windows | Static SVG favicon; animate only header inline SVG |
| Full-opacity tessellation behind map/chart | Obscures primary data visualization content | 3-5% opacity; remove pattern from map/chart sections entirely |
| Separate starColors constant per-file going forward | Three-way duplication is the root of "I changed it in one place" bugs | Extract to shared module on first touch |
| CSS-only Penrose triangle for favicon | Favicons require actual image/SVG file, not CSS | SVG file from public domain source |
| Bike icon with detailed/heavy SVG path | Heavy SVG flickers at 60fps rAF update rate; causes Leaflet DOM thrash | Simple 24x24 flat icon (Lucide bicycle or equivalent) |

---

## MVP Recommendation for v3.0

Ordered by impact-to-effort ratio:

**Tier 1 — High impact, low effort (ship first):**
1. Sector color spectrum (VIS-12) — extract constant + update 5 hex values
2. KOM segments on elevation profile (VIS-13) — add annotation boxes, same API
3. GLRC links (CONT-05) — text-to-link conversion in a few components
4. Penrose triangle favicon (VIS-15 partial) — SVG from public domain source

**Tier 2 — High impact, medium effort:**
5. Bike icon replacing circleMarker (UX-01) — divIcon swap + optional bearing
6. Escher tessellation background (VIS-14) — SVG pattern authoring + CSS

**Tier 3 — Data work, separate from visual features:**
7. Fix photo positions (DATA-06) — data entry + pipeline regeneration
8. Header Penrose triangle logo (VIS-15 full) — design + inline SVG implementation

---

## Confidence Assessment

| Finding | Confidence | Source |
|---------|------------|--------|
| starColors is duplicated in 3 files | HIGH | Direct code inspection |
| KOM startMi/endMi available in annotations.json | HIGH | Direct data inspection |
| chartjs-plugin-annotation box annotation API | HIGH | Official docs + existing usage in codebase |
| Cycling difficulty yellow-to-red color convention | HIGH | BikeRoll, cycle.travel, SAS heat map theory |
| L.divIcon with inline SVG is valid Leaflet pattern | HIGH | Leaflet official docs + multiple 2024 sources |
| SVG transform animation is compositor-safe (60fps) | HIGH | SVG animation encyclopedia + MDN + DebugBear |
| background-position animation causes paint (avoid) | HIGH | MDN + performance guidance |
| Escher cubes pattern tileable as SVG `<pattern>` | MEDIUM | Referenced CDN SVG exists; CodePen AXvKOd returned 403 |
| oklch color values for specific star ratings | MEDIUM | oklch is the project's color space; specific perceptual values need visual QA |
| bearing rotation for bike icon alignment | MEDIUM | Haversine bearing formula is standard; CSS transform rotation is safe; combination not tested |
| Penrose CC0 SVG availability | MEDIUM | Multiple sources listed; license terms need verification per asset |
| prefers-reduced-motion no-animation-first pattern | HIGH | W3C WCAG, MDN, multiple authoritative sources |

---

## Sources

- [Leaflet Custom Icons — leafletjs.com](https://leafletjs.com/examples/custom-icons/)
- [L.divIcon reference — leafletjs.com](https://leafletjs.com/reference.html#divicon)
- [chartjs-plugin-annotation Box Annotations — chartjs.org](https://www.chartjs.org/chartjs-plugin-annotation/master/guide/types/box.html)
- [chartjs-plugin-annotation Getting Started — chartjs.org](https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/)
- [RideWithGPS Elevation Profile on Web — support.ridewithgps.com](https://support.ridewithgps.com/hc/en-us/articles/4419005868315-The-Elevation-Profile-on-Web)
- [SVG Animation Encyclopedia — svgai.org](https://www.svgai.org/blog/research/svg-animation-encyclopedia-complete-guide)
- [How Opacity Animations Can Delay LCP — debugbear.com](https://www.debugbear.com/blog/opacity-animation-poor-lcp)
- [Optimize SVG Animations for Performance — zigpoll.com](https://www.zigpoll.com/content/how-can-i-optimize-svg-animations-to-run-smoothly-on-both-desktop-and-mobile-browsers-without-significant-performance-loss)
- [prefers-reduced-motion — css-tricks.com](https://css-tricks.com/almanac/rules/m/media/prefers-reduced-motion/)
- [SVG Tessellations on CodePen — codepen.io/zapplebee](https://codepen.io/zapplebee/post/svg-tessellations)
- [VeloViewer Gradient Colour Mapping — blog.veloviewer.com](https://blog.veloviewer.com/mapped-gradient-colours-and-google-street-view-for-your-strava-activities-routes-segments/)
- [BikeRoll Route Planner (color grading) — cyclingabout.com](https://www.cyclingabout.com/bikeroll-bike-route-planner/)
- [cycle.travel Elevation Chart Key — cycle.travel](https://cycle.travel/post/5728)
- [How to Choose Colors for Heat Maps — sas.com](https://blogs.sas.com/content/iml/2014/10/01/colors-for-heat-maps.html)
- [Penrose Triangle Free SVG — freesvg.org](https://freesvg.org/penrose-triangle)
- [SVG Repo Impossible Triangle — svgrepo.com](https://www.svgrepo.com/svg/173286/impossible-triangle)
