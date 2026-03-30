# Feature Research: Strava Integration + Results

**Domain:** Gravel cycling event website -- Strava segment integration, Grinduro-style scoring, activity submission, results leaderboards
**Researched:** 2026-03-30
**Confidence:** MEDIUM (Strava API TOS constraints create significant design uncertainty)

---

## Critical Finding: Strava API Agreement Restricts Leaderboard Display

**This finding shapes every feature in this milestone.**

Strava's November 2024 API Agreement update (Section 2.10) prohibits displaying one user's Strava data to other users:

> "You may not display or disclose Strava Data related to other users, even if such data is publicly viewable on Strava's Platform."

**What this means for MK Ultra Gravel:**
- A public leaderboard showing segment times pulled from Strava API for multiple riders **violates Section 2.10** on its face
- No carve-out exists for event organizers or race results
- The segment leaderboard endpoint (`/segments/:id/leaderboard`) was removed entirely in 2020

**Confidence:** HIGH -- verified directly from [Strava API Agreement](https://www.strava.com/legal/api) and [DCRainmaker analysis](https://www.dcrainmaker.com/2024/11/stravas-changes-to-kill-off-apps.html)

### The Consent-Based Workaround

The viable approach for a grassroots event: **each rider explicitly opts in to having their results displayed publicly.**

The flow:
1. Rider connects via Strava OAuth (grants `activity:read` scope)
2. Rider's segment efforts are extracted from their activity
3. **Rider explicitly consents** to having their name and times displayed on the results page
4. Only consenting riders appear on the leaderboard

This is distinct from the pattern Strava targeted (apps silently displaying user data to others). Here, each user takes an affirmative action to submit their results. VeloViewer reportedly received approval from Strava using a similar frequent-consent approach, though the written terms remain ambiguous.

**Risk level:** MEDIUM. A ~50-person grassroots event is unlikely to attract Strava enforcement attention, but the design should respect the spirit of the policy. The consent-based submission model is both the legally cautious and the UX-appropriate approach.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist when they see "Strava integration" and "results" on a cycling event site.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Strava segment links on sector/KOM cards** | Riders want to preview segments before the event; "View on Strava" links are the standard pattern | LOW | Existing GravelSectors.astro, KomSegments.astro, annotations.json | URL format: `https://www.strava.com/segments/{ID}`. All 9 segment IDs known. Must include Strava attribution per brand guidelines. |
| **Scoring system explainer** | Riders must understand how winners are determined; Grinduro format is niche | LOW | Existing GrinduroExplainer.astro | Expand existing explainer to cover: gravel champion = cumulative time, KOM/QOM champion = points (10-1 for top 10). Three gender categories. |
| **Strava OAuth submission flow** | The mechanism by which riders submit their ride; OAuth is the standard Strava integration pattern | HIGH | Netlify Functions (new), Strava API app registration | Two serverless functions: `/api/auth` (redirect to Strava) and `/api/callback` (exchange code for token, fetch activity). 6-hour access token expiry; refresh tokens for re-submissions. |
| **Activity submission page/form** | Riders need a place to submit their Strava activity link and consent to results display | MEDIUM | OAuth flow, Netlify Functions | Post-event page. Rider pastes activity URL or selects from recent activities. System extracts segment_efforts for matching segment IDs. Rider reviews times, confirms consent, submits. |
| **Results data extraction from Strava** | The system must pull segment_efforts from the rider's activity and match to the 9 event segments | HIGH | OAuth token, Strava API | `GET /activities/{id}?include_all_efforts=true` returns `segment_efforts[]` with `elapsed_time`, `moving_time`, `segment.id`. Match against 9 known segment IDs. |
| **Results page with leaderboards** | The whole point -- riders and spectators want to see who won | MEDIUM | Results JSON data, new Astro page | Static page rebuilt from committed JSON. Gravel Champion table: cumulative time across 6 sectors. KOM/QOM Champion table: points from top-10 per climb. Per-segment tables. |
| **Gender categories** | Standard in competitive cycling; project specifies men/women/non-binary | MEDIUM | Strava athlete `sex` field | **Critical gap:** Strava API only returns "M", "F", or null for `sex`. No non-binary option. Null maps to "Rather not say" and historically defaulted to men's leaderboard. Solution: add self-reported gender selection in submission form, do NOT rely on Strava's field. |
| **"Powered by Strava" attribution** | Required by Strava API Agreement and brand guidelines | LOW | None | Must display official logo on any page using Strava data. "View on Strava" links must be bold, underlined, or orange (#FC5200). Never imply Strava endorsement. |
| **Results stored as committed JSON** | Project constraint from PROJECT.md -- no database, rebuild-on-commit | LOW | Git workflow | JSON file(s) in `/public/data/results/`. Site rebuilds on commit. Netlify Functions write to a staging location; organizer reviews and commits. |

### Differentiators (Competitive Advantage)

Features that set MK Ultra Gravel apart from typical grassroots event sites.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Per-segment leaderboards** | Most grassroots events show only overall results; showing each segment lets riders see where they gained/lost time | LOW (once data exists) | Results JSON, results page | Grinduro's Synergy Race Timing shows per-segment rank + time. Columns: Place, Name, Segment Time. One table per segment. |
| **KOM/QOM points breakdown** | Transparent scoring -- riders see exactly which climbs earned them points | LOW (once data exists) | Results JSON | Table showing: Climb name, Rank (1-10), Points earned. Sum = total. Unique to the point-based KOM system. |
| **Build-time KOM/QOM holder display** | Show current Strava KOM/QOM times on segment cards pre-event; creates competitive motivation | MEDIUM | Strava API at build time, `getSegmentById` endpoint | `xoms` field returns `kom` and `qom` times. Display on KOM cards as "Current KOM: X:XX". **Caveat:** may require Strava subscription for full data; needs testing. |
| **Individual rider result card** | After submission, rider sees their own segment-by-segment breakdown | LOW | Submission flow | Immediate feedback after OAuth + extraction. Shows: segment name, time, rank (if results exist). Personal and shareable. |
| **Brutalist results page design** | Most event results pages are generic timing platform exports; MK Ultra's dark brutalist aesthetic applied to results is distinctive | MEDIUM | Design system tokens, existing CSS patterns | Classified-border tables, accent-green headers, redacted motifs. Match the existing site identity. |
| **Submission confirmation with Strava deep link** | After submitting, link back to the rider's activity on Strava | LOW | Activity ID from submission | "View your activity on Strava" -- required by brand guidelines and good UX. |

### Anti-Features (Deliberately NOT Building)

Features that seem good but create problems in this context.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| **Strava segment embeds (iframes)** | Quick way to show segment details inline | Already in PROJECT.md "Out of Scope." Chrome third-party cookie changes made embeds unreliable. Strava embeds require login for full data. Heavy iframe weight on a performant page. | Direct "View on Strava" links to `strava.com/segments/{ID}` |
| **Real-time leaderboard updates** | Excitement of seeing results come in live | Requires persistent backend, WebSocket or polling, server-side rendering. Massively overengineered for a ~50-person grassroots event. Already declared out of scope in PROJECT.md. | Rebuild-on-commit. Organizer reviews submissions, commits JSON, Netlify rebuilds. Latency is minutes, not seconds -- acceptable. |
| **Automatic activity detection** | System detects rider's event activity without them submitting | Requires polling all authorized athletes' recent activities. Rate limit of 200 req/15min makes this impractical for batch processing. Privacy-invasive (reading all activities, not just the event one). | Rider explicitly submits their activity link/ID. Clear, consensual, simple. |
| **Full segment leaderboard scraping** | Show top 10 all-time for each segment from Strava | Segment Leaderboard endpoint removed in 2020. Would violate API TOS even if available. | Show only event participants' times, sourced from their own authorized submissions. |
| **User accounts / persistent login** | Remember returning users, let them edit submissions | Requires auth system, session management, database. Single-event site with ~50 riders doesn't justify this complexity. | One-time OAuth per submission. Rider can re-submit (new OAuth) to update. Organizer handles disputes manually. |
| **Automated gender categorization from Strava** | Pull gender from Strava profile to auto-assign category | Strava API `sex` field only supports "M"/"F"/null. No non-binary option. Relying on it would exclude non-binary riders from their correct category. | Self-reported gender selection in submission form. Dropdown: Men / Women / Non-Binary. |
| **Database for results storage** | "Proper" data persistence | Already declared out of scope. JSON file storage is sufficient for a single event with ~50-100 riders. Database adds hosting cost, complexity, and a moving part that can fail. | Committed JSON files. Git is the database. Netlify rebuilds on push. |
| **Email notifications** | Notify riders when results are posted | Requires email service integration, collecting email addresses, managing unsubscribes. Overkill for a single event. | Social media announcement linking to results page. Riders who submitted will naturally check back. |
| **Strava webhook for activity updates** | Get notified when a rider updates/deletes their activity | Webhook setup requires persistent endpoint, verification, ongoing maintenance. Event results are a snapshot in time. | Results are final after organizer review. If a rider's activity is later flagged/deleted on Strava, organizer can manually update JSON. |
| **Weather widget** | Show race day conditions | Already out of scope. Irrelevant before event; after event, conditions are known. | Mention conditions in a post-event summary if desired. |

---

## Feature Dependencies

```
Strava App Registration (prerequisite)
    |
    +-- client_id + client_secret needed for ALL Strava features
    |
    v
Strava OAuth Flow (Netlify Functions)
    |
    +-- /api/auth --> redirects to Strava authorization
    +-- /api/callback --> exchanges code for token
    |
    v
Activity Data Extraction
    |
    +-- GET /activities/{id}?include_all_efforts=true
    +-- Match segment_efforts against 9 known segment IDs
    +-- Extract elapsed_time for each matching effort
    |
    v
Submission Form + Consent
    |
    +-- Rider reviews extracted times
    +-- Rider selects gender category (Men/Women/Non-Binary)
    +-- Rider explicitly consents to public display
    |
    v
Results JSON Committed to Repo
    |
    +-- Organizer reviews submissions
    +-- Commits to /public/data/results/*.json
    +-- Netlify rebuild triggered
    |
    v
Results Page (static, built from JSON)
    +-- Gravel Champion leaderboard (cumulative time)
    +-- KOM/QOM Champion leaderboard (points)
    +-- Per-segment leaderboards
    +-- Individual rider breakdowns

--- INDEPENDENT features (no dependency chain) ---

Strava Segment Links on Cards
    +-- depends on: annotations.json (has segment IDs)
    +-- depends on: GravelSectors.astro, KomSegments.astro (existing)

Scoring Explainer Update
    +-- depends on: GrinduroExplainer.astro (existing)

Build-time KOM/QOM Display
    +-- depends on: Strava API at build time (getSegmentById)
    +-- depends on: KomSegments.astro (existing)
    +-- NOTE: requires Strava app token, separate from user OAuth
```

### Dependency Notes

- **OAuth Flow requires Strava App Registration first:** Must register at developers.strava.com to get client_id and client_secret. Set authorized redirect domain to the Netlify site URL.
- **Activity extraction requires OAuth token:** Cannot pull segment efforts without the rider's authorization. Scope needed: `activity:read` (or `activity:read_all` for private activities).
- **Results page requires committed JSON:** The static site has no runtime data access. Results must exist as JSON files at build time.
- **Segment links are fully independent:** Can ship immediately with just the 9 known segment IDs. No API calls needed.
- **Build-time KOM/QOM requires a separate app-level token:** Uses the Strava app's own access token (not a user's), refreshed via client credentials. This is a build-time prebuild script, not a runtime operation.

---

## Scoring System Design

### Gravel Champion (Cumulative Time)

Based on Grinduro's model (verified via [Grinduro About](https://grinduro.com/about/) and [Synergy Race Timing results](https://www.synergyracetiming.com/grinduro/)):

- **Method:** Sum of elapsed_time across 6 gravel sectors
- **Ranking:** Lowest cumulative time wins
- **Categories:** Men, Women, Non-Binary (separate leaderboards)
- **Display columns:** Place, Name, Sector 1 Time, Sector 2 Time, ..., Sector 6 Time, Total Time
- **Missing sectors:** If a rider's activity doesn't include all 6 sectors (e.g., they cut the course), they are listed as DNF or ranked below complete riders

**Grinduro reference:** Synergy Race Timing displays: Place, Name, Bib, Total Time, then per-segment Rank + Time. MK Ultra can adapt this without bib numbers (no physical timing).

### KOM/QOM Champion (Points)

Project-specific system (not standard Grinduro):

- **Method:** Top 10 finishers per KOM segment earn points: 10, 9, 8, 7, 6, 5, 4, 3, 2, 1
- **Ranking:** Highest total points across 3 KOM segments wins
- **Categories:** Men, Women, Non-Binary (separate leaderboards)
- **Tiebreaker:** If points are tied, fastest cumulative KOM time wins
- **Display columns:** Place, Name, C4 (rank/pts), Silver Creek (rank/pts), Down Jeep (rank/pts), Total Points

### Segment Effort Data from Strava API

When fetching an activity with `include_all_efforts=true`, each `segment_effort` contains:
- `segment.id` -- match against the 9 known IDs
- `elapsed_time` -- total seconds including stops (use this for ranking)
- `moving_time` -- seconds excluding stops
- `start_date_local` -- when the effort started
- `distance` -- meters covered
- `kom_rank` -- 1-10 if in top 10 (subscribers only)
- `pr_rank` -- 1-3 if personal record

**Which time to use:** `elapsed_time` is the standard for race results. It includes any time the rider stopped within the segment. Using `moving_time` would reward riders who stop (auto-pause removes stopped time), creating a perverse incentive.

**Confidence:** HIGH -- segment effort fields verified via [Strava API Reference](https://developers.strava.com/docs/reference/) and [Strava Segment Efforts V3 docs](https://strava.github.io/api/v3/efforts/)

---

## Strava OAuth Flow Design

### Flow Steps

1. **Rider clicks "Submit Results"** on post-event results submission page
2. **Redirect to Strava:** `GET https://www.strava.com/oauth/authorize` with:
   - `client_id`: MK Ultra Gravel app ID
   - `redirect_uri`: `https://mkultragravel.netlify.app/.netlify/functions/callback`
   - `response_type`: `code`
   - `scope`: `activity:read`
   - `approval_prompt`: `auto` (shows consent screen first time only)
3. **Rider authorizes on Strava** (grants read access to their activities)
4. **Strava redirects to callback** with `code` parameter
5. **Netlify Function exchanges code for token:** `POST https://www.strava.com/api/v3/oauth/token` with client_id, client_secret, code
6. **Token response includes:** access_token (6hr), refresh_token, athlete summary (id, firstname, lastname, sex)
7. **Function fetches activity:** Rider provides activity ID/URL. Function calls `GET /activities/{id}?include_all_efforts=true`
8. **Extract matching segment efforts:** Filter `segment_efforts` where `segment.id` matches one of 9 known IDs
9. **Return results to submission form:** Rider sees their extracted times, selects gender category, confirms consent
10. **Submission stored:** Results written to a staging area (could be a Netlify Function that creates a GitHub commit via API, or a simpler approach like emailing the organizer)

### Rate Limits

- 200 requests per 15 minutes (overall)
- 100 requests per 15 minutes (read endpoints)
- 2,000 requests per day (overall)
- 1,000 requests per day (read endpoints)

For a ~50-person event where each submission requires ~2 API calls (token exchange + activity fetch), this is well within limits even if everyone submits simultaneously.

**Confidence:** HIGH -- rate limits verified via [Strava Rate Limits docs](https://developers.strava.com/docs/rate-limits/)

### Netlify Functions Architecture

Two functions needed:

1. **`/api/auth`** -- Generates Strava authorization URL with proper parameters, redirects rider
2. **`/api/callback`** -- Handles OAuth callback, exchanges code for token, fetches activity data, returns extracted results

Environment variables (Netlify dashboard):
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_REDIRECT_URI`

**Confidence:** MEDIUM -- Netlify Functions + OAuth pattern verified via [Netlify blog](https://www.netlify.com/blog/2018/07/30/how-to-setup-serverless-oauth-flows-with-netlify-functions-and-intercom/), but Strava-specific implementation needs testing.

---

## Gender Category Handling

**The problem:** MK Ultra Gravel specifies three categories: Men, Women, Non-Binary. Strava's API `sex` field only supports "M", "F", or null.

**The solution:** Self-reported gender in the submission form.

| Approach | Pros | Cons |
|----------|------|------|
| Use Strava `sex` field | Zero UI friction | No non-binary option; null defaults to unknown; violates inclusivity goal |
| Self-reported dropdown | Inclusive; rider controls categorization | One extra form field |
| Pre-fill from Strava, allow override | Best of both worlds | More complex UI; Strava's "M"/"F" framing may feel exclusionary |

**Recommendation:** Self-reported dropdown with NO pre-fill from Strava. Options: Men / Women / Non-Binary. Simple, inclusive, respects rider identity.

**Grinduro precedent:** Grinduro uses "Open Gender" as their non-binary category name. MK Ultra can use "Non-Binary" directly -- clearer language.

**Confidence:** HIGH for the gender gap in Strava API (verified via [Strava developer discussions](https://groups.google.com/g/strava-api/c/_Ox4pgfiuas) and [Strava gender settings](https://support.strava.com/hc/en-us/articles/4424254689805-Gender-Settings-and-Leaderboard-Filters))

---

## Results Page Design

### Reference: Grinduro/Synergy Race Timing

Grinduro results (via Synergy Race Timing) show:
- **Category headers:** Pro Men, Pro Women, Men 34 & Under, etc.
- **Columns:** Place, Name, Bib, Total Time, then per-segment (Rank + Time)
- **No points system** -- pure cumulative time

MK Ultra adapts this with two scoring systems:
1. **Gravel Champion** -- cumulative time (like Grinduro)
2. **KOM/QOM Champion** -- points (unique to MK Ultra)

### Page Structure

```
/results (new Astro page)

  Hero: "RESULTS // CLASSIFIED" (match site brutalist aesthetic)
  Event date, conditions, participant count

  Section 1: Gravel Champions
    Tab/toggle: Men | Women | Non-Binary
    Table: Place, Name, S1, S2, S3, S4, S5, S6, Total Time
    Highlight: Top 3 (podium styling)

  Section 2: KOM/QOM Champions
    Tab/toggle: Men | Women | Non-Binary
    Table: Place, Name, C4 (rank/pts), Silver Creek (rank/pts), Down Jeep (rank/pts), Total Points
    Highlight: Top 3

  Section 3: Individual Segment Results
    Expandable per-segment tables
    6 gravel sectors + 3 KOM segments = 9 tables
    Each: Place, Name, Time

  Footer: "Powered by Strava" attribution
```

### Data Model (Results JSON)

```json
{
  "event": {
    "date": "2026-06-07",
    "participants": 47
  },
  "submissions": [
    {
      "athlete": {
        "id": 12345,
        "firstName": "Jane",
        "lastName": "Doe",
        "gender": "women"
      },
      "activityId": 67890,
      "submittedAt": "2026-06-07T18:30:00Z",
      "consentedToDisplay": true,
      "sectors": {
        "24479270": { "elapsed_time": 1234, "moving_time": 1200 },
        "24479292": { "elapsed_time": 987, "moving_time": 970 }
      },
      "koms": {
        "34573011": { "elapsed_time": 456, "moving_time": 450 },
        "16438243": { "elapsed_time": 789, "moving_time": 780 },
        "6809754": { "elapsed_time": 321, "moving_time": 315 }
      }
    }
  ]
}
```

---

## Pre-Event vs Post-Event Features

### Pre-Event (Ship Before June 7)

| Feature | Effort | Priority |
|---------|--------|----------|
| Strava segment links on all 9 cards | 1-2 hours | P1 -- immediate value, zero API dependency |
| Scoring explainer update | 1-2 hours | P1 -- riders need to understand scoring before the event |
| Strava app registration | 30 min | P1 -- prerequisite for all API features |
| Build-time KOM/QOM holder display | 4-8 hours | P2 -- motivational, but needs API testing |

### Post-Event (Ship After June 7)

| Feature | Effort | Priority |
|---------|--------|----------|
| Strava OAuth submission flow | 8-16 hours | P1 -- core submission mechanism |
| Activity data extraction | 4-8 hours | P1 -- extracts segment times |
| Submission form with consent + gender | 4-8 hours | P1 -- rider-facing submission UI |
| Results JSON generation | 2-4 hours | P1 -- data pipeline from submissions to JSON |
| Results page with leaderboards | 8-16 hours | P1 -- the deliverable |
| Per-segment leaderboards | 2-4 hours | P2 -- enhances results page |
| Individual rider result card | 2-4 hours | P2 -- immediate feedback after submission |

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Phase |
|---------|------------|---------------------|----------|-------|
| Strava segment links on cards | HIGH | LOW | P1 | Pre-event |
| Scoring explainer | HIGH | LOW | P1 | Pre-event |
| "Powered by Strava" attribution | REQUIRED | LOW | P1 | Pre-event |
| OAuth submission flow | HIGH | HIGH | P1 | Post-event |
| Activity data extraction | HIGH | HIGH | P1 | Post-event |
| Submission form + consent | HIGH | MEDIUM | P1 | Post-event |
| Results page (gravel + KOM leaderboards) | HIGH | MEDIUM | P1 | Post-event |
| Gender self-selection | HIGH | LOW | P1 | Post-event |
| Results JSON committed to repo | MEDIUM | LOW | P1 | Post-event |
| Per-segment leaderboards | MEDIUM | LOW | P2 | Post-event |
| Individual rider result card | MEDIUM | LOW | P2 | Post-event |
| Build-time KOM/QOM holder display | MEDIUM | MEDIUM | P2 | Pre-event |
| Brutalist results page styling | MEDIUM | MEDIUM | P2 | Post-event |

---

## Phase Ordering Recommendation

**Phase 1: Pre-Event Card Enhancements** (independent, ship immediately)
- Strava segment links on all 9 sector/KOM cards
- Scoring explainer update (expand GrinduroExplainer)
- "Powered by Strava" attribution
- Rationale: Zero API dependency, immediate value for riders exploring the site

**Phase 2: Strava API Foundation** (prerequisite for all API features)
- Register Strava API application
- Implement OAuth flow (2 Netlify Functions)
- Activity data extraction + segment matching
- Rationale: Backend foundation; must work before submission UI can be built

**Phase 3: Submission Flow** (rider-facing, post-event)
- Submission page with OAuth trigger
- Activity selection / URL input
- Segment time review display
- Gender category selection
- Consent checkbox + submission
- Rationale: The user-facing submission experience

**Phase 4: Results Page** (the deliverable)
- Results JSON schema + sample data
- Gravel Champion leaderboard
- KOM/QOM Champion leaderboard
- Per-segment leaderboards
- Brutalist results page design
- Rationale: Display layer depends on data layer being complete

**Optional Phase: Build-time KOM/QOM Display**
- Prebuild script fetching segment data via Strava API
- KOM/QOM time display on cards
- Rationale: Nice pre-event enhancement but requires API testing; lower priority than core results flow

---

## Competitor/Reference Feature Analysis

| Feature | Grinduro (Synergy Timing) | Grassroots Gravel (Athlinks) | GRVL Events | MK Ultra Approach |
|---------|---------------------------|------------------------------|-------------|-------------------|
| Results hosting | External timing platform | Athlinks third-party | No results on site | Built into site (JSON + static) |
| Scoring | Cumulative time, 4 segments | Overall time | N/A | Dual: cumulative time + KOM points |
| Gender categories | M/F/Open Gender/Para | M/F | N/A | Men/Women/Non-Binary |
| Timing method | Physical timing chips | Physical timing | N/A | Strava segment efforts (self-reported) |
| Strava integration | None (external timing) | None | Clubs + route embeds only | OAuth submission + segment extraction |
| Per-segment display | Yes (rank + time per segment) | No | No | Yes (matching Grinduro pattern) |
| Results page design | Generic timing platform | Generic Athlinks | N/A | Brutalist, matching site identity |

---

## Confidence Assessment

| Finding | Confidence | Source |
|---------|------------|--------|
| Strava API Agreement prohibits displaying user data to others | HIGH | [Strava API Agreement](https://www.strava.com/legal/api), [DCRainmaker](https://www.dcrainmaker.com/2024/11/stravas-changes-to-kill-off-apps.html) |
| Consent-based submission is the viable workaround | MEDIUM | [VeloViewer precedent](https://blog.veloviewer.com/opting-in-to-leaderboards-and-other-things-gdpr/), logical reading of TOS |
| OAuth flow: authorize -> code -> token exchange | HIGH | [Strava Authentication docs](https://developers.strava.com/docs/authentication/) |
| `activity:read` scope returns segment_efforts | HIGH | [Strava API Reference](https://developers.strava.com/docs/reference/) |
| segment_effort contains elapsed_time, segment.id | HIGH | [Strava Segment Efforts V3](https://strava.github.io/api/v3/efforts/) |
| Strava `sex` field: only M/F/null, no non-binary | HIGH | [Strava developer discussion](https://groups.google.com/g/strava-api/c/_Ox4pgfiuas) |
| Rate limits: 200/15min, 2000/day | HIGH | [Strava Rate Limits](https://developers.strava.com/docs/rate-limits/) |
| Segment leaderboard endpoint removed (2020) | HIGH | [Strava Segment Changes](https://developers.strava.com/docs/segment-changes/) |
| `getSegmentById` returns `xoms` with KOM/QOM times | MEDIUM | [Strava Community Hub](https://communityhub.strava.com/developers-api-7/accessing-kom-qom-data-for-segment-1999) -- needs testing |
| Grinduro scoring = cumulative time across timed segments | HIGH | [Grinduro About](https://grinduro.com/about/), [Synergy Race Timing](https://www.synergyracetiming.com/grinduro/) |
| Grinduro results format: Place, Name, per-segment Rank+Time, Total | HIGH | [Synergy Race Timing 2017](https://www.synergyracetiming.com/2017-grinduro/) |
| Grinduro gender categories include "Open Gender" | HIGH | [Grinduro Race Categories](https://grinduro.com/about/race-categories/) |
| Netlify Functions can handle OAuth flows | HIGH | [Netlify serverless OAuth blog](https://www.netlify.com/blog/2018/07/30/how-to-setup-serverless-oauth-flows-with-netlify-functions-and-intercom/) |
| Strava brand guidelines: "Powered by Strava" + "View on Strava" | HIGH | [Strava Brand Guidelines](https://developers.strava.com/guidelines/) |

---

## Sources

### Strava API & Legal
- [Strava API v3 Reference](https://developers.strava.com/docs/reference/)
- [Strava Authentication Documentation](https://developers.strava.com/docs/authentication/)
- [Strava API Agreement (Legal)](https://www.strava.com/legal/api)
- [Strava API Agreement Update Announcement](https://press.strava.com/articles/updates-to-stravas-api-agreement)
- [Strava Rate Limits](https://developers.strava.com/docs/rate-limits/)
- [Strava Segment Changes (2020)](https://developers.strava.com/docs/segment-changes/)
- [Strava Brand Guidelines](https://developers.strava.com/guidelines/)
- [Strava Segment Efforts V3 (legacy docs)](https://strava.github.io/api/v3/efforts/)
- [Strava Gender Settings](https://support.strava.com/hc/en-us/articles/4424254689805-Gender-Settings-and-Leaderboard-Filters)
- [Strava Community: Accessing KOM/QOM Data](https://communityhub.strava.com/developers-api-7/accessing-kom-qom-data-for-segment-1999)

### Grinduro & Race Timing
- [Grinduro About Page](https://grinduro.com/about/)
- [Grinduro Race Categories](https://grinduro.com/about/race-categories/)
- [Grinduro Race Results](https://grinduro.com/get-stoked/race-results/)
- [Synergy Race Timing - Grinduro](https://www.synergyracetiming.com/grinduro/)
- [Synergy Race Timing - 2017 Grinduro Results](https://www.synergyracetiming.com/2017-grinduro/)

### Industry Analysis
- [DCRainmaker: Strava's API Changes](https://www.dcrainmaker.com/2024/11/stravas-changes-to-kill-off-apps.html)
- [VeloViewer: Opting-in to Leaderboards (GDPR)](https://blog.veloviewer.com/opting-in-to-leaderboards-and-other-things-gdpr/)
- [GRVL Events Strava Case Study](https://partners.strava.com/case-studies/grvl-events-building-community-through-gravel-biking-events)
- [RaceNation: Submit Results Through Strava](https://support.race-nation.com/article/186-how-to-submit-results-through-strava)
- [Netlify: Serverless OAuth Flows](https://www.netlify.com/blog/2018/07/30/how-to-setup-serverless-oauth-flows-with-netlify-functions-and-intercom/)

---
*Feature research for: MK Ultra Gravel v5.0 -- Strava Integration + Results*
*Researched: 2026-03-30*
