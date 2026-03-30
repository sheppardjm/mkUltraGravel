# Project Research Summary

**Project:** MK Ultra Gravel v5.0 -- Strava Integration + Results
**Domain:** Gravel cycling event site -- Strava segment integration, Grinduro-style scoring, OAuth activity submission, results leaderboards
**Researched:** 2026-03-30
**Confidence:** MEDIUM (strong technical foundation, but Strava TOS and undocumented API fields introduce legal/integration uncertainty)

---

## Executive Summary

MK Ultra Gravel v5.0 adds Strava-powered results to an existing static Astro site on Netlify. The approach is well-scoped: the site remains fully static (no SSR adapter), with Netlify Functions handling the only server-side needs (OAuth token exchange and activity processing). Build-time scripts fetch segment metadata from Strava, and results are stored as committed JSON in git -- extending the exact pattern the site already uses for route data, annotations, and photos. The stack additions are minimal: `@netlify/functions` for TypeScript types and `netlify-cli` for local development. No database, no Strava wrapper library, no session management.

The recommended approach uses a consent-based hybrid model to navigate Strava's restrictive November 2024 API Agreement. Riders authenticate via Strava OAuth, the system extracts their segment effort times, and the rider explicitly consents to having their name and times published as event results. This transforms Strava API data into event-owned data, avoiding the TOS prohibition on displaying one user's Strava data to another. The dual scoring system (Gravel Champion via cumulative time across 6 sectors, KOM/QOM Champion via top-10 points across 3 climbs) is implemented as a pure-function scoring engine in the Netlify Function, with pre-computed leaderboards written to results JSON.

The key risks are: (1) Strava's API Agreement could be interpreted to prohibit even consent-based cross-user display -- the legal reading is ambiguous but enforcement against a 50-person grassroots event is unlikely; (2) the Strava app review process takes 2-4 weeks and could delay or block the OAuth flow entirely -- register the app immediately; (3) concurrent submissions writing to a single results file will cause data loss -- use per-athlete files merged at build time; (4) the `xoms` field (KOM/QOM times on segments) is undocumented and could disappear without notice. The event date of June 7 creates a hard deadline: pre-event features must ship before then, and the submission/results flow must be tested and ready for post-event use.

---

## Key Findings

### Recommended Stack

The site remains static Astro 6 on Netlify with zero framework changes. Two new dependencies are added, both lightweight. All Strava API interaction uses native `fetch()` -- no wrapper libraries. Results storage uses committed JSON in git, matching the existing data pattern. See [STACK.md](STACK.md) for full details.

**Core technologies:**
- **Netlify Functions v2 (.mts):** OAuth token exchange + activity processing -- the only server-side code, uses Web Standard Request/Response API
- **Direct fetch() to Strava API v3:** 5 endpoints needed (authorize, token exchange, segment detail, athlete activities, activity detail) -- no wrapper library justified
- **JSON in git (per-athlete result files):** Results committed via GitHub API from Netlify Function, site rebuilds on commit -- same pattern as route-data.json and annotations.json
- **Netlify Build Hooks:** POST to webhook URL triggers site rebuild after results are committed
- **netlify-cli (dev dep):** Local development wrapping `astro dev` + functions, env var management

**Critical version/config requirements:**
- Node.js 22 (already pinned via Volta)
- All secrets must be set in Netlify UI, NOT in netlify.toml (netlify.toml vars are not available to functions at runtime)
- `import.meta.env` is inlined at build time in Astro 6 -- use `process.env` for secrets in build scripts and functions

### Expected Features

See [FEATURES.md](FEATURES.md) for full analysis including competitor comparison and dependency chains.

**Must have (table stakes):**
- Strava segment links on all 9 sector/KOM cards ("View on Strava")
- "Powered by Strava" attribution (required by brand guidelines)
- Scoring system explainer (Grinduro-style cumulative time + KOM points)
- Strava OAuth submission flow (Netlify Functions)
- Activity data extraction (segment_efforts matched against 9 known segment IDs)
- Submission form with gender self-selection (Men/Women/Non-Binary) and explicit consent
- Results page with Gravel Champion + KOM/QOM Champion leaderboards
- Per-segment leaderboards (9 tables)

**Should have (differentiators):**
- Build-time KOM/QOM holder display on segment cards (xoms field -- MEDIUM confidence)
- Individual rider result card (immediate feedback after submission)
- Brutalist results page design (matching site identity, not a generic timing platform export)
- KOM/QOM points breakdown table (transparent scoring)

**Defer (v2+):**
- Real-time leaderboard updates (massively overengineered for 50 riders)
- Automatic activity detection (rate-limit impractical, privacy-invasive)
- User accounts / persistent login (single-event site)
- Strava webhook for activity updates (snapshot results are sufficient)
- Email notifications

**Critical feature finding: gender categories.** Strava API only returns "M", "F", or null for the `sex` field. Non-binary is not an option. Self-reported gender selection in the submission form is mandatory -- do NOT rely on Strava's field.

### Architecture Approach

The architecture adds two layers to the existing static site without changing the core: a build-time Strava data fetch (extending the existing prebuild pipeline) and runtime Netlify Functions (new). The bridge between runtime and static is committed JSON + site rebuild. A single `strava-auth.mts` function handles the entire OAuth-to-results-commit flow in one invocation, avoiding the need to store tokens between function calls. The scoring engine lives as a pure-function library (`lib/scoring.ts`) imported by the function. See [ARCHITECTURE.md](ARCHITECTURE.md) for full component inventory and data flow diagrams.

**Major components:**
1. **fetch-segments.js (prebuild)** -- fetches segment metadata from Strava API at build time, writes segments.json (slot 4 in existing generate-data.js pipeline)
2. **strava-auth.mts (Netlify Function)** -- handles complete OAuth callback: token exchange, activity fetch, segment matching, scoring, GitHub commit, build hook trigger
3. **lib/scoring.ts (shared library)** -- pure-function scoring engine for Gravel Champion (cumulative time) and KOM/QOM Champion (points)
4. **lib/github.ts (shared library)** -- commits results JSON to repo via GitHub API, triggers Netlify rebuild
5. **results.astro (new page)** -- the site's first multi-page addition, reads results data at build time, renders static leaderboard HTML
6. **SubmitActivity.astro (new component)** -- client-side activity URL input, extracts activity ID, constructs OAuth redirect

### Critical Pitfalls

See [PITFALLS.md](PITFALLS.md) for all 10 pitfalls with full prevention strategies, recovery plans, and phase mapping.

1. **Strava API Agreement prohibits cross-user data display** -- Use the consent-based hybrid model: Strava data is the input, event-owned results are the output. Each rider explicitly consents to public display. Never store raw Strava API responses in published results.
2. **Strava app athlete limit blocks auth** -- Register the Strava API app NOW (March 2026), submit for review immediately, request 200+ athlete limit. Review takes 2-4 weeks. Have a manual CSV fallback ready by event day.
3. **Concurrent submissions cause data loss (race condition)** -- Use per-athlete result files (one JSON per Strava ID) instead of a single shared file. Merge at build time. No file is ever overwritten by another athlete's submission.
4. **Strava segment leaderboard endpoint is gone** -- Cannot fetch global KOM/QOM holders. Build KOM/QOM champions from event submissions only. The `xoms` field on segment detail MAY provide KOM/QOM times (MEDIUM confidence, undocumented).
5. **7-day Strava data cache limit + deauthorization handling** -- Store only derived event data (name, category, times), not raw Strava API fields. Implement deauthorization webhook to delete athlete data within 48 hours. Include privacy notice on submission page.

---

## Implications for Roadmap

Based on research, the suggested phase structure follows a strict dependency chain. Pre-event features (segment links, scoring explainer) are independent and should ship first. The OAuth/submission backend is the critical path -- it blocks the results page, and the Strava app review process creates an external dependency with a multi-week lead time.

### Phase 1: Strava App Registration + Segment Links
**Rationale:** Two independent actions that should happen first. App registration has a multi-week review process (Pitfall 4) and is an external blocker. Segment links are zero-API-dependency, immediate user value.
**Delivers:** Strava segment links on all 9 cards, "Powered by Strava" attribution, scoring explainer update, Strava API app registered and submitted for review.
**Addresses:** Table stakes features (segment links, attribution, explainer), Pitfall 4 prevention (athlete limit)
**Avoids:** Building API-dependent features before the app is approved

### Phase 2: Build-Time Segment Data Pipeline
**Rationale:** Extends the existing prebuild pipeline with a new `fetch-segments.js` step. Establishes the Strava data integration pattern, segment ID mapping, and netlify.toml configuration that all downstream phases depend on.
**Delivers:** `fetch-segments.js` prebuild script, `segments.json` data file, `netlify.toml` configuration, shared segment ID config module, KOM/QOM times on cards (if xoms field works).
**Uses:** Strava API v3 segment detail endpoint, app-owner refresh token
**Implements:** Build-time API integration layer from ARCHITECTURE.md
**Avoids:** Pitfall 6 (rate limits) via aggressive caching with 7-day TTL

### Phase 3: Scoring Engine + Results Schema
**Rationale:** Pure logic, testable independently with zero external dependencies. Must exist before the submission flow (Phase 4) can process results or the results page (Phase 5) can render them.
**Delivers:** `lib/scoring.ts` with Gravel Champion and KOM/QOM Champion computation, results JSON schema definition, seed data for development, unit tests.
**Addresses:** Grinduro-style cumulative time scoring, KOM points system (10-1 for top 10), gender-separated leaderboards, tiebreaker logic.
**Avoids:** Pitfall 1 (TOS) by designing the schema to store only event-owned derived data, not raw Strava fields

### Phase 4: Strava OAuth + Activity Submission
**Rationale:** The core serverless integration and the hardest phase. Depends on scoring engine (Phase 3) and segment config (Phase 2). This is the critical path for the entire milestone.
**Delivers:** `strava-auth.mts` Netlify Function (OAuth callback + activity processing + GitHub commit + rebuild trigger), `lib/strava.ts` (API client), `lib/github.ts` (commit helper), `SubmitActivity.astro` component, submission form with gender selection + consent checkbox, per-athlete result file storage pattern, activity validation (date, type, segment matching).
**Addresses:** OAuth flow, activity data extraction, consent-based submission, gender self-selection
**Avoids:** Pitfall 3 (token storage -- use tokens immediately, discard), Pitfall 5 (race condition -- per-athlete files), Pitfall 7 (invalid submissions -- validation), Pitfall 8 (gender -- self-reported dropdown), Pitfall 9 (cache limit -- store only derived data)

### Phase 5: Results Page + Leaderboard Components
**Rationale:** Display layer that renders the results data. Depends on schema (Phase 3) and ideally on working submissions (Phase 4) for real data testing. Can begin in parallel with Phase 4 using seed data.
**Delivers:** `results.astro` page (site's first multi-page addition), `GravelLeaderboard.astro`, `KomLeaderboard.astro`, `SegmentLeaderboard.astro`, `ScoringExplainer.astro`, navigation updates to BaseLayout and index page, brutalist design matching site identity.
**Addresses:** Gravel Champion leaderboard, KOM/QOM Champion leaderboard, per-segment leaderboards, gender category tabs

### Phase 6: Deauthorization + Privacy Compliance
**Rationale:** Required by Strava TOS (Section 5.4) and GDPR. Must be in place before real users submit data but can be built after the core submission flow is working.
**Delivers:** Deauthorization webhook handler, athlete-to-file mapping for deletion, privacy notice on submission page, data deletion mechanism within 48 hours.
**Addresses:** Pitfall 10 (deauthorization), Pitfall 9 (data retention), TOS compliance
**Avoids:** API access revocation due to non-compliance

### Phase Ordering Rationale

- **Phase 1 must start immediately** because the Strava app review process is a 2-4 week external dependency. Segment links are low-risk, high-value, and can ship independently.
- **Phase 2 before Phase 3** because the segment ID configuration and netlify.toml established in Phase 2 are needed by the scoring engine and functions infrastructure.
- **Phase 3 before Phase 4** because the scoring engine is a hard dependency of the submission function. Pure logic is faster to build and test than OAuth flows.
- **Phase 4 is the critical path.** It combines OAuth, Strava API, GitHub API, and Netlify build hooks. Budget the most time and test extensively before event day.
- **Phase 5 can begin in parallel with Phase 4** using seed data from Phase 3. The results page reads JSON at build time and has no runtime dependencies.
- **Phase 6 can trail** but must be complete before real riders submit. Target completion 1 week before the June 7 event.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Build-Time Segment Data):** The `xoms` field availability depends on whether the authenticated token holder has a Strava subscription. Needs runtime verification during implementation. If unavailable, drop KOM/QOM time display on cards without affecting the rest of the milestone.
- **Phase 4 (OAuth + Submission):** Complex integration combining multiple external APIs. The `state` parameter for passing activity ID through OAuth needs security review (CSRF protection). The per-athlete file storage pattern via GitHub API needs concurrency testing. Netlify Functions v2 env var availability has a known intermittent bug (March 2026).

Phases with standard patterns (skip research-phase):
- **Phase 1 (Segment Links):** Simple href additions to existing Astro components. No unknowns.
- **Phase 3 (Scoring Engine):** Pure computation logic, well-defined rules, no external dependencies. Standard unit testing patterns.
- **Phase 5 (Results Page):** Astro SSG page reading JSON at build time. Same pattern as the existing index page with route-data.json.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Minimal additions (2 deps), all verified against official Netlify and Strava docs. No novel technology choices. |
| Features | MEDIUM | Feature set is well-defined, but Strava TOS creates legal ambiguity around the consent-based leaderboard model. The consent approach is the best available option but has not been explicitly blessed by Strava. |
| Architecture | HIGH | Extends existing patterns (prebuild JSON pipeline, Astro SSG). Netlify Functions v2 and Strava OAuth are well-documented. The single-function OAuth-to-commit flow is the simplest viable architecture. |
| Pitfalls | HIGH | All critical pitfalls verified against official Strava API Agreement, docs, and Netlify documentation. Prevention strategies are concrete and actionable. |

**Overall confidence:** MEDIUM

The technical implementation path is clear and well-supported, but the Strava API Agreement's restrictions on cross-user data display create a legal gray area that cannot be resolved through research alone. The consent-based hybrid model is the standard industry approach (VeloViewer precedent), but Strava's enforcement is at their "sole discretion."

### Gaps to Address

- **Strava app review timeline:** Cannot be resolved by research. Register the app immediately and track review status weekly. Have a manual CSV entry fallback ready by May 15.
- **`xoms` field availability:** Undocumented in Strava's OpenAPI spec. Needs runtime verification with the actual app token. If unavailable, KOM/QOM time display on cards is dropped (differentiator, not table stakes).
- **Netlify Functions v2 env var bug:** Known intermittent issue (March 2026) where user-defined env vars are absent from `process.env`. Use `Netlify.env.get()` as fallback. Monitor during Phase 4 development.
- **Per-athlete file concurrency via GitHub API:** The GitHub Contents API `PUT` endpoint requires the file SHA for updates, providing optimistic concurrency for individual files. The merge-at-build-time strategy needs testing under load (10+ concurrent submissions).
- **Strava API Agreement enforcement posture:** No way to get advance approval for a consent-based results display model. The approach is defensible but not guaranteed.

---

## Sources

### Primary (HIGH confidence)
- [Strava API v3 Reference](https://developers.strava.com/docs/reference/) -- endpoint specs, response models, scopes
- [Strava Authentication Docs](https://developers.strava.com/docs/authentication/) -- OAuth flow, token rotation, refresh mechanism
- [Strava API Agreement](https://www.strava.com/legal/api) -- Sections 2.10 (cross-user display), 5.4 (deauthorization), 7.1 (cache TTL)
- [Strava Rate Limits](https://developers.strava.com/docs/rate-limits/) -- 100 reads/15min, 1000 reads/day
- [Strava Segment Changes](https://developers.strava.com/docs/segment-changes/) -- leaderboard endpoint removed May 2020
- [Strava Brand Guidelines](https://developers.strava.com/guidelines/) -- attribution requirements
- [Netlify Functions Get Started](https://docs.netlify.com/build/functions/get-started/) -- v2 format, .mts, Web Standard API
- [Netlify Functions Env Vars](https://docs.netlify.com/build/functions/environment-variables/) -- scoping rules
- [Netlify Build Hooks](https://docs.netlify.com/build/configure-builds/build-hooks/) -- POST trigger format
- [Netlify: Astro 6 on Netlify](https://www.netlify.com/changelog/2026-03-10-astro-6/) -- import.meta.env inlining caveat

### Secondary (MEDIUM confidence)
- [DCRainmaker: Strava API Changes](https://www.dcrainmaker.com/2024/11/stravas-changes-to-kill-off-apps.html) -- analysis of November 2024 TOS changes
- [Strava Community Hub: KOM/QOM Data](https://communityhub.strava.com/developers-api-7/accessing-kom-qom-data-for-segment-1999) -- xoms field confirmation (undocumented)
- [VeloViewer: Opting-in to Leaderboards](https://blog.veloviewer.com/opting-in-to-leaderboards-and-other-things-gdpr/) -- consent-gated display precedent
- [Grinduro About + Synergy Race Timing](https://grinduro.com/about/) -- scoring model reference
- [Netlify Functions v2 env var bug](https://answers.netlify.com/t/functions-v2-export-default-intermittently-missing-all-user-defined-env-vars-at-runtime/160958) -- March 2026 intermittent issue

### Tertiary (LOW confidence)
- Strava `xoms` field behavior with free vs. subscriber tokens -- needs runtime verification, no authoritative documentation exists

---
*Research completed: 2026-03-30*
*Ready for roadmap: yes*
