# Domain Pitfalls

**Domain:** Gravel cycling event website — static site with interactive map, GPX overlay, geo-located photos, dark brutalist design
**Project:** MK Ultra Gravel
**Researched:** 2026-03-26

---

## Critical Pitfalls

Mistakes that cause rewrites, event-day failures, or completely unusable experiences.

---

### Pitfall 1: Leaflet Map Scroll Hijacking on Mobile

**What goes wrong:** On mobile, any Leaflet map embedded in a scrollable page captures all single-finger touch events. Visitors trying to scroll past the map get trapped — they pan the map instead of scrolling the page. This is the single most reported complaint in Leaflet GitHub issues for embedded maps.

**Why it happens:** Leaflet's default behavior treats all touch-drag events on the map container as map-panning gestures, intercepting browser scroll before the page sees it.

**Consequences:** Cyclists checking the site on their phone before the event cannot scroll past the route section. The map becomes a scroll trap. On iOS, it also blocks "swipe from left edge to go back" navigation.

**Prevention:** Use the `Leaflet.GestureHandling` plugin (`gestureHandling: true` in map init options). This mirrors Google Maps behavior — single-finger drag scrolls the page, two-finger drag pans the map, with a visible hint overlay. Alternatively, use `Leaflet.Sleep` for simpler "wake on click" behavior. Do NOT rely on CSS `pointer-events: none` alone — it disables all interaction including intentional map use.

**Warning signs:**
- You can scroll over the map on desktop but not on mobile
- Users report being unable to scroll past a section
- Chrome DevTools "mobile" emulation shows map consuming all touch events

**Phase:** Address in the map implementation phase, before any testing. Wire in `gestureHandling` from the first commit.

**Confidence:** HIGH — verified through Leaflet GitHub issues #4051, #4677, and the Leaflet.GestureHandling documentation.

---

### Pitfall 2: Mapbox/Tile API Token Exposed Without URL Restrictions

**What goes wrong:** On a static site, any API token embedded in client-side JavaScript is publicly visible. Without URL restrictions, anyone can copy the token and use it on their own projects, accruing charges to your account.

**Why it happens:** Developers treat the token like a password (keep it secret) rather than like an OAuth public client ID (restrict its scope). Static sites have no server-side to proxy requests through, so the token must be in the JS.

**Consequences:** Unexpectedly high billing, token abuse, potential account suspension. For Mapbox specifically, billing abuse is documented — exposing a token without restrictions lets attackers use it to serve tiles for their own sites at your expense.

**Prevention:**
- Create a **dedicated token for this project** — never use the default token
- Enable **URL restrictions** on the token (only allow requests from your domain and localhost)
- Scope the token to minimum permissions: `styles:read`, `fonts:read`, `tiles:read` only
- Store the token in an environment variable (e.g., `.env`), inject at build time, never commit to git
- Monitor usage via the Mapbox Statistics dashboard

**Warning signs:**
- Token is copy-pasted directly into JS source
- No URL restrictions visible in your Mapbox account
- Token is committed to git history

**Phase:** Address at project setup, before any map code is written. This is a one-time configuration that prevents permanent damage.

**Confidence:** HIGH — verified directly from Mapbox security documentation and confirmed by security researcher documentation of Mapbox token abuse.

---

### Pitfall 3: GPX File Causes Map to Jank or Freeze on Mobile

**What goes wrong:** A raw GPX export from a Garmin/Wahoo/Strava for an 80-mile route can contain 10,000–30,000 trackpoints. Parsing and rendering all of them at once in Leaflet/Mapbox GL JS on a mid-range phone causes noticeable freeze (2–5 seconds) or permanent jank during pan/zoom.

**Why it happens:** GPX devices record a point every 1–5 seconds. Over 5+ hours of riding, this creates dense point arrays. The browser must parse the XML, build a GeoJSON polyline, then render it — all on the main thread if not carefully handled.

**Consequences:** The map freezes on load on mobile. Pan/zoom lags. On low-end Android (common among cyclists), it may crash the browser tab entirely.

**Prevention:**
- **Downsample the GPX before shipping it.** Use `gpx-simplify` or Mapbox's `simplify-js` to reduce trackpoints to ~500–1000 points for display. 1000 points is visually indistinguishable from 10,000 at typical map zoom levels.
- Keep the original full-resolution GPX as the downloadable file, but render a simplified version.
- Limit coordinate decimal precision to 5–6 places (saves file size with no perceptible accuracy loss).
- Test on a real mid-range Android (not just Chrome DevTools emulation, which uses desktop CPU).

**Warning signs:**
- Raw GPX file is larger than 500KB
- Map takes more than 1 second to render the route
- Noticeable lag when panning over the route line on mobile

**Phase:** Address when implementing GPX rendering. Do not defer simplification to "optimization later."

**Confidence:** MEDIUM — Mapbox official docs confirm the GeoJSON/large data performance pattern; specific GPX point counts derived from general GPS device knowledge (training data — validate with actual file measurement).

---

### Pitfall 4: 33 Photo Markers Rendered as Individual DOM Nodes

**What goes wrong:** Placing 33 photo thumbnails as individual Leaflet markers on the map creates 33 DOM nodes that pan with the map. On mobile, this renders slowly and causes lag. At low zoom levels, markers overlap into an unreadable pile.

**Why it happens:** Developers treat "33 markers" as a small number. It is small for clustering algorithms, but individual image-thumbnail markers (not just icons) are expensive because each is a positioned DOM element with an `<img>` tag.

**Consequences:** Pan jank on mobile, overlapping unclickable markers at zoomed-out view, poor visual experience at macro zoom.

**Prevention:**
- Use **Leaflet.markercluster** — groups nearby markers at low zoom, expands at high zoom. This is a known pattern for photo maps.
- Render clusters as simple circle icons (cheap), expand to photo thumbnails only when zoomed in.
- Lazy-load thumbnail images inside popups — do not preload all 33 thumbnails on map init.
- Consider showing photo markers only at zoom level 12+ to avoid the "pile of icons" problem at overview zoom.

**Warning signs:**
- All 33 markers visible simultaneously at zoom level 10 or lower
- Popups contain full-size images (not thumbnails)
- Map init time scales with number of markers

**Phase:** Address in photo marker implementation. Build clustering in from the start — retrofitting it is harder than starting with it.

**Confidence:** MEDIUM — Leaflet.markercluster is the well-documented solution; image-specific marker performance on mobile is training data, cross-referenced with general Leaflet performance guidance.

---

## Moderate Pitfalls

Mistakes that cause user experience degradation or technical debt requiring significant rework.

---

### Pitfall 5: Monospace Body Font Causing Reading Fatigue

**What goes wrong:** Monospace fonts for body text look great in screenshots and at small scale but become exhausting to read over longer passages. Visitors reading route descriptions, sector details, and KOM segment info will abandon reading before finishing.

**Why it happens:** Monospace fonts have uniform character width, which creates awkward spacing in natural language (narrow letters like "i" get excessive padding, wide letters like "m" look cramped). This reduces reading speed by 10–30% compared to proportional fonts.

**Consequences:** Users skim or skip route/sector/restock descriptions. The atmospheric text that makes the psychedelic theme work goes unread. Mobile users are hit hardest because smaller screens amplify spacing issues.

**Prevention:**
- Use monospace for **short, punchy copy only** — headings, labels, callouts, stats (e.g., "SECTOR 3 — ★★★★★ — 4.2 mi")
- Use a high-quality variable-weight font (or carefully chosen proportional font) for body paragraphs longer than 2–3 lines
- If monospace must be used everywhere for aesthetic reasons, set `font-size` at 16px minimum, `line-height` at 1.6–1.8, and constrain line length to 60–75 characters

**Warning signs:**
- Body text paragraphs longer than 3 lines set in monospace
- Line length exceeding 80 characters in monospace
- Mobile users on sub-375px screens see text wrapping awkwardly

**Phase:** Address in typography/design phase. This is a design decision that affects all content, not just a single component.

**Confidence:** MEDIUM — readability research on monospace for body text is well-established; specific numbers are from WCAG/typography guidelines confirmed via search.

---

### Pitfall 6: LCP Image Not Preloaded — Slow Initial Paint on Mobile

**What goes wrong:** The hero section almost certainly contains the largest contentful element (a large atmospheric image or the map itself). If this image is not explicitly preloaded, browsers will discover it late in the parsing waterfall, causing LCP of 4–6 seconds on mobile connections.

**Why it happens:** Developers assume modern browsers are smart about prioritization. They are, but the browser must discover the hero image in the HTML before it can prioritize it. CSS backgrounds and JS-injected images are discovered even later.

**Consequences:** Slow LCP fails Core Web Vitals on mobile (threshold: 2.5 seconds). For a gravel event, many visitors arrive from Strava/Instagram links on mobile with variable LTE connections.

**Prevention:**
- Add `<link rel="preload" as="image" href="/hero.webp">` in `<head>` for the above-fold hero image
- Never set `loading="lazy"` on the above-fold/hero image (this is the single most common LCP mistake per the 2025 Web Almanac — 16% of pages still do this)
- Serve hero images in WebP format with JPEG fallback
- Compress images aggressively: a gravel photo at 1200px wide should be under 200KB

**Warning signs:**
- Hero image not referenced in `<head>` — only in `<body>` or CSS
- `loading="lazy"` on any above-fold image
- Hero image larger than 400KB

**Phase:** Address in initial site scaffolding before adding content. A late retrofit requires auditing all image usage.

**Confidence:** HIGH — verified by Google web.dev LCP documentation and the 2025 Web Almanac statistic on lazy-loaded LCP images.

---

### Pitfall 7: Dark Background with Insufficient Text Contrast

**What goes wrong:** Dark brutalist/psychedelic themes invite using near-black backgrounds with off-white, muted, or colored text. Creative color combinations (green-on-dark, cyan-on-navy, rust-on-black) often look great in design tools under ideal lighting but fail in direct sunlight — which is when cyclists are most likely reading the site.

**Why it happens:** Design is done indoors on calibrated monitors. The audience reads it on phones in bright light or indirect glare.

**Consequences:** Route descriptions, sector star ratings, and restock point info become unreadable in the field — exactly when users need them most.

**Prevention:**
- Verify WCAG AA contrast (4.5:1 for body text, 3:1 for large text) for every text/background combination using a contrast checker
- Do not exempt "decorative" or "atmospheric" text from contrast checks if it contains route information
- Test specifically on OLED screens in "outdoor" brightness mode (many phones reduce contrast on OLED at full brightness)
- Pure white (#FFFFFF) on pure black (#000000) has excellent contrast (21:1) but can cause halation/blooming on OLED — use near-white (#F5F5F5 or #E8E8E8) instead, which still passes at 18:1+

**Warning signs:**
- Colored text on dark colored background (e.g., `#7CFC00` on `#1A1A1A` — check it)
- Font size below 14px for any informational text
- Color combinations added without running a contrast check

**Phase:** Address throughout design implementation. Run contrast checks as part of every component build.

**Confidence:** HIGH — WCAG 2.1 guidelines are authoritative; outdoor screen readability context is verified via multiple design sources.

---

### Pitfall 8: Map Tile Attribution Removed or Obscured

**What goes wrong:** Removing or styling away the Leaflet/OpenStreetMap/Mapbox attribution text to keep the design clean violates the terms of service for every major tile provider. OpenStreetMap requires attribution. Mapbox requires its logo and attribution text to be visible.

**Why it happens:** The attribution is small, intrudes on the design, and sits in the corner — designers move it or set `opacity: 0` without thinking through the legal implications.

**Consequences:** Terms of service violation. For Mapbox, this can result in account suspension. For OSM-based tiles, it violates the ODbL license.

**Prevention:**
- Style the attribution to fit the dark theme (change text color, background) but keep it legible and visible
- Do not set `opacity: 0`, `display: none`, or `visibility: hidden` on attribution elements
- If using Mapbox: their logo must remain visible

**Warning signs:**
- `attributionControl: false` in map initialization
- CSS targeting `.leaflet-control-attribution` with visibility or opacity properties

**Phase:** Address during map styling. Check every map theme/skin change against attribution visibility.

**Confidence:** HIGH — verified directly from Mapbox and Leaflet/OSM terms of service.

---

### Pitfall 9: GPX Elevation Data Inaccuracy Presented as Authoritative

**What goes wrong:** GPS devices (Garmin, Wahoo, Strava) record elevation via barometric altimeter or GPS altitude, both of which introduce error. Raw GPX elevation data for an 80-mile route can have cumulative elevation gain calculations that are 10–20% off from surveyed values. If you display "Total Gain: 8,420 ft" prominently, experienced cyclists will know it's wrong and distrust the site.

**Why it happens:** The GPX file contains `<ele>` values. It's tempting to parse them and display computed stats. The math is easy; the data is unreliable.

**Consequences:** Credibility damage with experienced riders who know what the actual elevation profile looks like. Worse, under-reporting elevation causes unprepared riders.

**Prevention:**
- Either use a DEM (Digital Elevation Model) service like GPXZ or Open Topo Data to correct GPX elevation against real terrain, or
- Display elevation data with appropriate caveats (e.g., "approximate") and cross-reference against Strava/Komoot route data for the displayed values
- Apply a smoothing filter before computing gain/loss — raw GPS elevation is noisy and cumulative sum of small errors vastly inflates or deflates totals

**Warning signs:**
- Elevation gain computed directly from raw `<ele>` values without smoothing
- Values that don't match the same route on Strava/RideWithGPS

**Phase:** Address when implementing route stats display. Do not ship unchecked elevation numbers.

**Confidence:** MEDIUM — GPXZ blog post on elevation accuracy confirms the issue; specific percentages are training data.

---

### Pitfall 10: CSS Animations Triggering Layout Reflow

**What goes wrong:** Dark psychedelic designs invite dramatic CSS effects — animated backgrounds, glitch effects, parallax, pulsing elements. Implementing these by animating `top`, `left`, `width`, `height`, `margin`, or `background-position` triggers layout recalculation on every frame, causing dropped frames on mobile.

**Why it happens:** The visual effect works fine on a desktop GPU. Mobile GPUs and CPUs handle compositing differently, and layout-affecting animations are processed on the main thread.

**Consequences:** Scroll jank, animation stuttering, battery drain, hot phone. Users on older phones will have a degraded experience of what's supposed to be an atmospheric design.

**Prevention:**
- Animate only `transform` and `opacity` — these run on the compositor thread and never trigger layout reflow
- For glitch effects: use `transform: translate()` and `clip-path` instead of positional properties
- For parallax: use `transform: translateY()` not `top`/`margin`
- Test animations with Chrome DevTools Performance panel on CPU throttling (6x slowdown simulates mid-range Android)
- Use `will-change: transform` sparingly and intentionally on animated elements

**Warning signs:**
- CSS animations on `background-position`, `top`, `left`, `width`, `height`, `margin`, `padding`
- Scroll-linked animations that don't use `IntersectionObserver` or CSS scroll-timeline
- Frame rate drops visible in DevTools during animation

**Phase:** Address during visual design implementation. Audit every animation property before shipping.

**Confidence:** HIGH — GPU compositing and layout reflow behavior is well-documented; verified via motion.dev animation tier list and MDN compositing documentation.

---

## Minor Pitfalls

Mistakes that degrade experience but are fixable without rewrites.

---

### Pitfall 11: Custom Font FOUT Causing Layout Shift

**What goes wrong:** The creepy display font loads after the page renders, causing the headline to flash from a fallback font (usually a system serif) to the custom font. This creates Cumulative Layout Shift (CLS) if the fonts have different metrics, pushing content down as the font swaps in.

**Prevention:**
- Use `font-display: swap` to show text immediately (FOUT is better than FOIT — invisible text)
- Preload the display font: `<link rel="preload" href="/fonts/creepy.woff2" as="font" crossorigin>`
- Define `size-adjust`, `ascent-override`, and `descent-override` in the `@font-face` fallback to match metrics of the fallback font to the custom font (reduces CLS to near-zero)
- Self-host fonts — Google Fonts adds an external DNS lookup and round-trip before the font loads

**Phase:** Address during font setup in initial scaffolding.

**Confidence:** HIGH — `font-display` and preloading are well-documented; `size-adjust` for fallback matching is a 2022+ CSS feature, confirmed by MDN.

---

### Pitfall 12: GPX Download Filename as Generic "track.gpx"

**What goes wrong:** When cyclists download the GPX, the browser names the file `track.gpx` or `export.gpx`. It lands in their downloads folder indistinguishable from 50 other GPX files. They can't find it when loading into their Garmin/Wahoo before the event.

**Prevention:** Name the downloadable file `mk-ultra-gravel-2026.gpx`. Set the filename via the download link: `<a href="/route.gpx" download="mk-ultra-gravel-2026.gpx">`.

**Phase:** Trivial fix — address when building the GPX download button.

**Confidence:** HIGH — `download` attribute behavior is documented HTML spec behavior.

---

### Pitfall 13: Photo Popups Containing Full-Resolution Images

**What goes wrong:** Map photo popups open and load a 4MB JPEG directly in the popup. On cellular, this takes 5–10 seconds. Users assume the popup is broken.

**Prevention:**
- Serve two versions of each photo: a thumbnail (400px wide, <50KB WebP) for the popup preview, and a full version for optional "view large" link
- Do not load any image until the popup is opened (lazy load within the popup)
- Consider whether "view large" is even necessary for route-context photos

**Phase:** Address when implementing photo markers and popups.

**Confidence:** MEDIUM — general image loading best practices; specifics are training data.

---

### Pitfall 14: BikeReg CTA Buried or Competing with Map

**What goes wrong:** The interactive map is visually dominant. Visitors spend time exploring the route and never see or act on the registration CTA. Event organizers then wonder why traffic didn't convert.

**Prevention:**
- Place the BikeReg CTA both above the fold (before the map) and as a sticky element or repeated call-out below the map
- Use high contrast for the CTA against the dark background — it must pop even in the psychedelic visual context
- Minimum tap target of 48x48px on mobile (Apple HIG: 44x44, Google: 48x48)
- Avoid "Register" as button copy — use something specific: "Sign Up for MK Ultra Gravel 2026"

**Phase:** Address in layout/content phase. The map is an attraction; registration is the goal.

**Confidence:** MEDIUM — event registration CTA patterns from web search; tap target sizes are documented Apple/Google guidelines.

---

### Pitfall 15: Broken Sector/KOM Data When GPX Track and Manual Data Disagree

**What goes wrong:** You define 6 sectors and 3 KOM segments manually (start/end coordinates). The GPX track was recorded on a slightly different line or is slightly offset due to GPS drift. Sector markers don't land exactly on the route line, making the map look incorrect or confusing.

**Prevention:**
- Derive sector and KOM start/end points programmatically from the GPX track (snap to nearest trackpoint) rather than entering raw coordinates by hand
- Or accept visual approximation and use map markers offset from the line with a connecting line/callout
- Test the overlay at zoom levels cyclists will actually use (zoom 13–15)

**Phase:** Address when implementing sector/KOM overlays on the map.

**Confidence:** LOW — derived from GPS and map development experience; no authoritative source.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Project scaffolding & map setup | Mapbox token without URL restrictions | Set URL restrictions before any other work |
| GPX processing | Raw trackpoints freezing mobile | Simplify to 500–1000 points for display; keep original for download |
| Photo markers | 33 DOM image nodes causing pan jank | Use Leaflet.markercluster from day one |
| Map embedding | Mobile scroll hijacking | Add Leaflet.GestureHandling before testing on phone |
| Route stats | Inaccurate elevation from raw GPS | Smooth or correct with DEM service before displaying numbers |
| Typography implementation | Monospace fatigue on long text | Limit monospace to labels/headings, not paragraphs |
| Dark design execution | Contrast failures on outdoor screens | Run WCAG contrast checks on every text combination |
| Animations / visual effects | Layout reflow on mobile | Animate only transform and opacity |
| Font loading | FOUT causing layout shift | Preload fonts, use size-adjust on fallback |
| Hero/above-fold | Slow LCP on mobile | Preload hero image, no lazy-load on above-fold |
| BikeReg integration | CTA buried under map | Place CTA before AND after map; make it persistent |
| GPX download | Generic filename | Use download attribute with descriptive filename |
| Map attribution | Removed for design cleanliness | Keep attribution; style it to match dark theme |

---

## Sources

- Leaflet scroll hijacking: [Leaflet GitHub Discussion #8129](https://github.com/Leaflet/Leaflet/discussions/8129), [Issue #4051](https://github.com/Leaflet/Leaflet/issues/4051), [Issue #4677](https://github.com/Leaflet/Leaflet/issues/4677), [Leaflet.GestureHandling](https://elmarquis.github.io/Leaflet.GestureHandling/)
- Mapbox security: [How to use Mapbox securely](https://docs.mapbox.com/help/troubleshooting/how-to-use-mapbox-securely/), [Mapbox token abuse research](https://blogs.jsmon.sh/mapbox-tokens/)
- Mapbox performance: [Improve Mapbox GL JS performance](https://docs.mapbox.com/help/troubleshooting/mapbox-gl-js-performance/), [Working with large GeoJSON](https://docs.mapbox.com/help/troubleshooting/working-with-large-geojson-data/)
- LCP and image loading: [Optimize LCP — web.dev](https://web.dev/articles/optimize-lcp), [Core Web Vitals 2025](https://systemsarchitect.net/core-web-vitals-2025/)
- Font loading: [font-display guide](https://font-converters.com/guides/font-loading-strategies), [Font performance — DebugBear](https://www.debugbear.com/blog/website-font-performance)
- Animation performance: [Web Animation Performance Tier List — motion.dev](https://motion.dev/magazine/web-animation-performance-tier-list), [CSS Animation GPU Techniques](https://www.usefulfunctions.co.uk/2025/11/08/css-animation-performance-gpu-acceleration-techniques/)
- Contrast and dark design: [Brutalist Web Design principles](https://brutalist-web.design), [Neobrutalism best practices — NN/g](https://www.nngroup.com/articles/neobrutalism/)
- GPX elevation accuracy: [GPXZ elevation accuracy](https://www.gpxz.io/blog/gpx-file-elevation-accuracy)
- Event CTA mistakes: [Event registration landing page tips — Guidebook](https://blog.guidebook.com/mobile-guides/event-registration-landing-page-tips/)
