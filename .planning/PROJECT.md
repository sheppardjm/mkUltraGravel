# MK Ultra Gravel

## What This Is

A website for MK Ultra Gravel — an 80-mile gravel cycling event through Marquette County, Michigan on June 7, 2026. Named after the CIA's infamous LSD experiments, the ride features rowdy, technical gravel sectors rated Paris-Roubaix style (1-5 stars). The site showcases the route, builds hype, and drives registration.

## Core Value

Get gravel cyclists excited enough about this ride to show up on June 7, 2026.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Interactive map displaying the GPX route track
- [ ] Geo-located route photos displayed on the map
- [ ] GPX file download
- [ ] Gravel sector listings with star ratings (Paris-Roubaix style)
- [ ] KOM segment listings with gradient/elevation data
- [ ] Restock point listings with mile markers
- [ ] BikeReg registration call-to-action
- [ ] Event details (date, start location, donation info)
- [ ] Photo gallery showcasing route imagery
- [ ] Dark, brutalist, psychedelic visual design

### Out of Scope

- Registration system — handled by BikeReg, site just links to it
- User accounts / login — no need
- Results / timing — not a race
- Mobile app — web only
- Blog / news updates — single-page event site

## Context

**Event Details:**
- Date: June 7, 2026
- Distance: 80 miles
- Start: Marquette Fire Bell, Marquette, MI
- Cost: Free. $10 suggested donation to Great Lakes Recovery Centers
- Format: Mass start, not a race
- Registration: BikeReg (external)

**Route Data:**
- GPX track from Strava (loop route, starts/ends at same point near Marquette)
- 33 route photos (need geo-location matching to GPX track)
- Route passes through forests, overgrown two-track, gravel corridors

**Gravel Sectors (Paris-Roubaix style ratings):**
1. Sandstrom — 23.3mi, 5.89mi long, 3-star
2. Akkala Rd — 39.4mi, 1.42mi long, 3-star
3. Haavisto — 43.3mi, 1.42mi long, 4-star
4. Forest Service Rd — 50.7mi, 6.45mi long, 2-star
5. C4 — 58.7mi, 5.65mi long, 5-star
6. Down Jeep — 83mi, 0.6mi long, 5-star

**KOM Segments:**
1. Billie Helmer — 21.9mi, 0.69mi, 6.4% grade, 236ft gain
2. Leaving Chatham — 37.5mi, 0.33mi, 4.1% grade, 72ft gain
3. Silver Creek — 78.1mi, 1.61mi, 4.4% grade, 373ft gain

**Restock Points:**
1. Laughing Whitefish River — 21.8mi
2. Chatham Convenience Store — 37.3mi
3. Rumely Gas Station — 46.3mi
4. Dollar General — 76.1mi

**Design Direction:**
- Tone: Psychedelic, strange, brutalist — not a friendly cycling website
- Inspired by: Escher impossible geometry, declassified CIA documents, surrealist art, mind-control imagery
- Typography: Monospaced font for body text, creepy/unsettling font for headers and display text
- Color: Dark palette
- Tone reference images provided in `images/tone/` directory
- Route photos in `images/` directory

## Constraints

- **Tech stack**: Static site — no backend needed, content is fixed
- **External dependency**: BikeReg handles registration, site links out
- **Assets**: GPX file and 33 route photos already in repo; photo geo-locations need to be estimated from GPX mile markers
- **Timeline**: Site needs to be live well before June 7, 2026

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Paris-Roubaix sector rating system | Familiar to cycling audience, communicates difficulty clearly | — Pending |
| BikeReg for registration | No need to build registration; established cycling platform | — Pending |
| Free event with suggested donation | Lower barrier to entry, supports Great Lakes Recovery Centers | — Pending |

---
*Last updated: 2026-03-26 after initialization*
