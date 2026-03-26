# Feature Landscape

**Domain:** Gravel cycling event website (single event, static, hype-driven)
**Researched:** 2026-03-26
**Project:** MK Ultra Gravel — 80-mile ride, Marquette County MI, June 7 2026

---

## Context: What Kind of Site Is This?

MK Ultra Gravel is not a race organization. It is a single event, free entry, one-time registration
through a third-party platform (BikeReg). The site has one job: get gravel cyclists excited enough
to show up on June 7, 2026.

This changes the feature calculus significantly. Most gravel event sites handle registration,
results, multiple events per year, and community management. This site handles none of that.
What it does handle — interactive route maps, sector ratings, GPX download, and a striking
design identity — it should handle exceptionally well.

Reference events surveyed: Unbound Gravel (unboundgravel.com), SBT GRVL (sbtgrvl.com),
Belgian Waffle Ride (belgianwaffleride.bike), Grinduro (grinduro.com), The Crusher
(906adventureteam.com), Ore to Shore (oretoshore.com), Lost and Found Gravel Grinder,
Grassroots Gravel, and Paris-Roubaix (paris-roubaix.fr) for sector rating conventions.

---

## Table Stakes

Features users expect. Missing = site feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Event date, location, distance | First question every visitor asks | Low | Must be above the fold |
| Start location with map link | Riders need to plan travel and parking | Low | Google Maps link to Marquette Fire Bell is sufficient |
| BikeReg registration CTA | Without this, there is no event | Low | External link; needs to be impossible to miss |
| GPX file download | Gravel cyclists load routes before the event — this is non-negotiable in the community | Low-Med | File is already in repo; needs download button and format note |
| Route overview / course description | What is the terrain like? What am I signing up for? | Low | Prose + key stats (distance, elevation, surface type) |
| Photo gallery of the route | Riders want to see the roads before committing | Low-Med | 33 photos already in repo |
| Mobile-responsive layout | >50% of cycling site traffic is mobile; unusable on mobile = lost registrations | Med | Must test on iOS Safari specifically |
| Donation / cause information | Free events still need to explain the suggested donation and where it goes | Low | Great Lakes Recovery Centers; one clear paragraph |
| Cost/format clarity | Is this a race? Do I need to qualify? What does free mean? | Low | Must preempt these questions immediately |

---

## Differentiators

Features that elevate this site above a typical event page. Given the project's stated goals
(dark, brutalist, psychedelic design; Paris-Roubaix style sector ratings; geolocated photos
on an interactive map), these are the features that make the site memorable and drive
word-of-mouth sharing.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Interactive GPX map with sector overlays | The route visualization IS the product — sectors displayed as colored overlays on the live track make the route feel real and intimidating | High | Requires Mapbox or Leaflet + GPX parsing + sector coordinate matching; this is the centerpiece feature |
| Geolocated route photos on the map | Clicking a photo marker on the map shows the road at that exact mile — creates visceral "I have to ride this" response | High | Photos need coordinate estimates matched to GPX track; Leaflet/Mapbox popup pattern handles display |
| Paris-Roubaix style sector cards | Numbered sectors with star ratings, surface description, mile marker, and length — mirrors an established cycling convention that the target audience recognizes instantly | Med | Six sectors already defined; star rating display (1-5 filled stars) is a recognizable pattern |
| KOM segment listings | Adds competitive dimension for faster riders without turning it into a race; Strava culture makes this compelling | Low-Med | Three segments defined; gradient and elevation gain already documented |
| Restock point listings with mile markers | Practical necessity at 80 miles; well-presented restock info signals the organizers have thought this through | Low | Four points already defined |
| Dark, brutalist, psychedelic design identity | No other gravel event site looks like this. Every other site is clean/sporty/friendly. The CIA/LSD theme is genuinely distinctive and will drive social sharing | High | Typography, color, layout, and tone all need to cohere; this is what makes someone screenshot and share the site |
| Elevation profile visualization | Shows the character of the ride at a glance; riders want to know how much climbing before committing | Med | Can be rendered from GPX data using a charting library; should be stylized to match design language |
| Sector difficulty summary / teaser | "Two 5-star sectors" in the hero creates immediate intrigue and qualifies riders | Low | Simple copy, no build required; extremely effective |

---

## Anti-Features

Features to explicitly NOT build. These appear frequently in gravel event sites and represent
scope creep, maintenance burden, or dilution of the core experience.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Results / timing / leaderboard | This is not a race. Building results infrastructure signals the wrong event culture | Explicitly state "not a race" in the copy |
| User accounts / login | Zero value for a static single-event site; adds auth complexity, privacy obligations, and maintenance burden | None needed; BikeReg handles participant accounts |
| Blog / news feed | Tempting to add "upcoming announcements" or "route updates" — but maintaining it burns time and abandoned blogs look worse than having none | Use social media for real-time updates; link Instagram/Facebook from footer |
| Comments or community forum | Other gravel sites try to build community on their own platform; this always fails for single-event sites | Link to relevant Facebook groups or Strava club |
| Email list signup with newsletter | High effort, low return for a single June 2026 event; collecting emails creates GDPR/CAN-SPAM obligations | Direct CTA to BikeReg registration is more effective |
| Multiple distance options selector / route chooser | The event is one distance. Adding a chooser UI implies flexibility that doesn't exist | State "80 miles" clearly, no filter UI |
| Merchandise / shop | Adds payment infrastructure complexity; not the site's purpose | Ignore entirely |
| Sponsor logos section | Legitimate for larger events, but for a grassroots free event it looks corporate and out of place unless sponsors actually exist | Only include if real sponsors with assets are confirmed |
| Strava segment integration (live) | Strava's API terms and rate limits make live segment embeds brittle; segments already exist on Strava, riders find them naturally | Link to Strava segments rather than embedding |
| Weather widget or live conditions | Static info and maintenance overhead with no clear rider benefit at planning stage | Irrelevant before event day; remove |

---

## Feature Dependencies

The interactive map is the hub feature. Other features connect to it or depend on it being
built well first.

```
BikeReg CTA (independent — just a link)
  └── No dependencies

Event details block (independent)
  └── No dependencies

Donation / cause block (independent)
  └── No dependencies

Photo gallery (standalone)
  └── Can be built before map; no dependency on map
  └── FEEDS INTO: map photo markers (same photos, same assets)

GPX file download (low complexity)
  └── Depends on: GPX file being available in repo (already is)

Elevation profile visualization
  └── Depends on: GPX data parsing
  └── Can be standalone chart, does not require map

Interactive GPX map (core — build first)
  └── Depends on: GPX file parsed into renderable polyline
  └── Depends on: Sector coordinate data (mile markers mapped to GPX lat/lng)
  └── Depends on: Restock point coordinates
  └── Depends on: KOM segment coordinates

Geolocated photos on map (builds on map)
  └── Depends on: Interactive GPX map being functional
  └── Depends on: Photo geo-location estimates matched to GPX track

Sector cards (standalone UI)
  └── Can be built independently of map
  └── Star rating display is pure CSS/HTML
  └── Ideally links to/highlights that sector on the map

KOM segment cards (standalone UI)
  └── Can be built independently of map

Restock point cards (standalone UI)
  └── Can be built independently of map
```

---

## MVP Recommendation

For the tightest MVP that is still shareable and compelling:

**Must ship in MVP:**
1. Event details block (date, location, distance, cost, start)
2. Donation / cause information (Great Lakes Recovery Centers)
3. BikeReg registration CTA — prominent, above the fold or floating
4. GPX file download
5. Interactive GPX map with route track displayed (even without photo markers)
6. Sector cards with star ratings — the Paris-Roubaix framing is core identity
7. Photo gallery (standalone, pre-map integration)
8. Dark brutalist design applied throughout

**Defer to post-MVP (V2 polish):**
- Geolocated photos on map: Requires photo coordinate estimation work; high effort, high payoff — but the site functions without it
- Elevation profile visualization: Nice to have; lower urgency than map + sectors
- KOM segment cards: Defined in PROJECT.md but lower rider utility than sector cards
- Restock point cards: Practical but low excitement factor; can be a simple text list in V1

**Rationale for deferral:**
The photo-on-map feature is the single most impressive differentiator but requires significant
coordinate-matching work for 33 photos against the GPX track. It should ship when the map
is stable, not as a gating dependency. The elevation profile can be added as a visual
enhancement once the core route information is live.

---

## Confidence Assessment

| Finding | Confidence | Source |
|---------|------------|--------|
| Table stakes features (event info, GPX, registration CTA) | HIGH | Verified across 6+ event sites: Unbound, SBT GRVL, Grinduro, Lost & Found, Ore to Shore, The Crusher |
| Paris-Roubaix star rating convention (1-5 stars) | HIGH | paris-roubaix.fr official sector listing; pattern is widely understood in cycling community |
| Interactive map + GPX as expected gravel feature | HIGH | Verified: SBT GRVL offers GPX per course, Grassroots Gravel uses RideWithGPS embeds, Grinduro Italy offers ZIP of all routes |
| Geolocated photo markers as differentiator | MEDIUM | Pattern exists (Bikemap, Plotaroute, RideWithGPS POI) but rarely implemented well on event sites; strong hypothesis that it differentiates |
| Anti-feature list (user accounts, results, shop) | HIGH | Absence of these is explicit in PROJECT.md scope decisions; confirmed by reviewing that small community events don't benefit from them |
| BikeReg external link pattern (no embedded registration) | HIGH | Multiple small events use this exact pattern; BikeReg is standard for cycling events |

---

## Sources

- [Unbound Gravel — unboundgravel.com](https://www.unboundgravel.com)
- [SBT GRVL 2026 Courses](https://www.sbtgrvl.com/2026courses)
- [Grinduro California 2026](https://grinduro.com/california/)
- [Grinduro Italy GPX Routes](https://grinduro.com/italy/gpx/)
- [Lost and Found Gravel Grinder](https://lostandfoundbikeride.com/lost-and-found/ride.php)
- [Paris-Roubaix Sector Ratings](https://www.paris-roubaix.fr/en/news/2025/55-3-km-of-cobblestones-the-ratings-game/4451)
- [Ore to Shore — oretoshore.com](https://www.oretoshore.com/)
- [The Crusher — 906adventureteam.com](https://906adventureteam.com/mountain-bike-events/the-crusher/)
- [RideWithGPS Embeds](https://support.ridewithgps.com/hc/en-us/articles/4419017147163-Activity-and-Route-Embeds)
- [Leaflet.js](https://leafletjs.com/)
- [Mapbox Docs](https://docs.mapbox.com/)
- [Belgian Waffle Ride](https://www.belgianwaffleride.bike/)
