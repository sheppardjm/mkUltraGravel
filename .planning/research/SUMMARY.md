# Project Research Summary

**Project:** MK Ultra Gravel — v7.0 Strava Go-Live
**Domain:** Strava OAuth integration — production deployment and end-to-end testing
**Researched:** 2026-03-31
**Confidence:** HIGH

## Executive Summary

This milestone is a deployment and validation effort, not a build effort. The Strava OAuth submission pipeline — four Netlify Functions v1 covering auth initiation, callback/token exchange, result submission via GitHub API, and deauthorization webhook — is fully implemented from v5.0 and considered correct. The task is getting it working against the real Strava API in production and verifying the full chain: OAuth round-trip, segment matching, GitHub commit, build hook trigger, and leaderboard rebuild.

The single most important finding is that Strava enforces a 1-athlete limit on all new apps ("Single Player Mode"). Any non-developer Strava account that attempts OAuth will receive HTTP 403 until Strava's developer review process approves the app. Review takes 7-10 business days officially, with real-world timelines of 1-4 weeks. With the event on June 7, 2026 (~68 days away), this review must be submitted immediately — it is the longest-lead-time item in the entire milestone and cannot be parallelized. All other phases can be completed while waiting for approval.

The recommended approach is to work in strict dependency order: configure environment variables first (nothing works without them), then verify the GitHub data pipeline independently via crafted POST requests (no OAuth needed), then run the full OAuth round-trip using the developer's own account (unaffected by the 1-athlete limit), then register the deauthorization webhook subscription. Submit the Strava app review last, using screenshots from a working pipeline to support the application. The critical risks are: missing or misconfigured Netlify environment variables (especially `STRAVA_REDIRECT_URI`, which is confirmed absent from the local `.env` file and not yet in the Netlify dashboard), the Safari SameSite cookie bug that can cause CSRF failures for iPhone users, and a GitHub PAT that may have been created with an expiry date before June 7.

---

## Key Findings

### Recommended Stack

The technology stack requires no changes for this milestone. The project is correctly configured: Netlify Functions v1 (`exports.handler` syntax), Node 22 (pinned via `.node-version` and Volta config, matching Netlify's default since February 2025), esbuild bundler, and `netlify.toml` with a `/api/*` → `/.netlify/functions/:splat` rewrite. The Netlify Functions v2 env var bug (confirmed active on 2026-03-28, fix rolled out 2026-03-30) is the specific reason v1 syntax was chosen; the fix is only 24 hours old as of this research — there is no reason to migrate to v2 before go-live.

See [STACK.md](STACK.md) for the complete deployment checklist and configuration details.

**Core technologies:**
- **Netlify Functions v1 (`exports.handler`)**: Serverless compute — keep as-is; v2 syntax migration introduces risk with zero functional gain before go-live
- **Strava OAuth 2.0 / `activity:read_all` scope**: Authentication and activity data — scope is correct for private activities and `include_all_efforts=true`; no scope changes needed
- **GitHub Contents API (fine-grained PAT)**: Athlete data persistence — GET-SHA then PUT pattern; per-athlete JSON files eliminate cross-athlete conflicts at the API level
- **Netlify Build Hook**: Leaderboard rebuild trigger — fire-and-forget POST after successful GitHub commit; no retry logic needed at event scale

**No new npm dependencies are required.** All packages are installed. No version changes are needed.

### Expected Features

The scope of this milestone is narrow: configure, test, verify, and fix bugs found during real-data testing. All features are already built. The distinction below reflects go-live requirements versus optional improvements discovered during testing.

See [FEATURES.md](FEATURES.md) for the full OAuth flow state matrix and manual test matrix.

**Must have (table stakes for go-live):**
- All 8 Netlify environment variables set with "Functions" scope in Netlify dashboard — nothing works without these (`STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI`, `STRAVA_VERIFY_TOKEN`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `NETLIFY_BUILD_HOOK`)
- Strava app "Authorization Callback Domain" updated from `localhost` to `mkultragravel.netlify.app`
- Strava app review submitted — required to lift the 1-athlete limit before any real athlete can submit
- Webhook subscription registered via curl after deploy — required for GDPR-compliant athlete data deletion within 48 hours
- GitHub PAT verified active with correct permissions (Contents: Read and Write) and not expiring before June 7
- Strava branding assets in place: "Connect with Strava" button, "Powered by Strava" logo, "View on Strava" links — required by Strava API Agreement for review approval

**Should have (fix if discovered during testing):**
- Rate limit header logging (`X-RateLimit-Usage`) in `strava-callback.js` — essential diagnostic for event-day monitoring
- Token scope validation (`tokenData.scope` includes `activity:read_all`) — better error message if user unchecks scope on Strava consent screen
- Submission button loading state (disabled during GitHub API call) — prevents double-submit, improves perceived performance

**Defer to post-launch (anti-features for this milestone):**
- Admin moderation UI — manual JSON editing in the repo is sufficient for a 50-athlete event
- Token refresh / persistent storage — this is a one-shot OAuth flow; 6-hour token expiry is irrelevant
- Activity create/update webhook processing — requires storing athlete tokens, which the architecture explicitly avoids

### Architecture Approach

The submission pipeline is a linear, stateless chain across four service boundaries: Strava OAuth (auth + activity data), Netlify Functions (stateless compute), GitHub Contents API (persistent storage via JSON files in the repo), and Netlify Build Hook (static site rebuild trigger). There is no database, no session storage, and no long-lived tokens. The CSRF double-submit cookie pattern (`HttpOnly; Secure; SameSite=Lax; Max-Age=600`) handles the OAuth state round-trip. Per-athlete JSON files (`public/data/results/athletes/{athleteId}.json`) mean concurrent submissions for different athletes never conflict at the GitHub API level.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full function inventory, system map, three-tier testing strategy, and exact curl commands for each verification step.

**Major components:**
1. **`strava-auth.js`** — OAuth initiation: validates activity URL, generates CSRF nonce, sets Secure cookie, redirects to Strava consent
2. **`strava-callback.js`** — Token exchange + data extraction: verifies CSRF cookie, exchanges code for token, fetches activity with `include_all_efforts=true`, filters to 9 event segment IDs, encodes result payload
3. **`submit-result.js`** — Data persistence: decodes payload, validates gender/consent, commits athlete JSON to GitHub via GET-SHA then PUT, fires build hook
4. **`strava-webhook.js`** — Deauth handling: subscription handshake (GET challenge echo) and GDPR-compliant athlete data deletion on deauth events (POST)

**Critical testing constraint:** The OAuth round-trip (`strava-auth.js` + `strava-callback.js`) requires a production HTTPS URL. The `Secure` cookie attribute causes `strava-auth.js` to set a cookie that browsers reject over HTTP — meaning `netlify dev` on localhost cannot complete the OAuth round-trip. The data pipeline (`submit-result.js` + `strava-webhook.js`) is testable with crafted curl requests against either localhost or the deployed URL with no OAuth involvement.

### Critical Pitfalls

See [PITFALLS.md](PITFALLS.md) for all 15 pitfalls with warning signs, prevention steps, and phase-specific warnings table.

1. **`STRAVA_REDIRECT_URI` not set in Netlify dashboard** — Confirmed absent from local `.env` (only `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_ACCESS_TOKEN`, `STRAVA_REFRESH_TOKEN` are present). Without it, `strava-auth.js` constructs a Strava authorization URL with `redirect_uri=undefined`, which Strava rejects before the user sees the consent screen. The error is invisible in Netlify logs because it happens on Strava's side. Set all 8 env vars in Netlify dashboard with scope "Functions" before any live testing.

2. **Strava 1-athlete limit blocks all non-developer OAuth attempts** — The app defaults to "Single Player Mode" (1 connected athlete = the developer only). Every other athlete gets HTTP 403 "Limit of connected athletes exceeded." Review takes 7-10 business days. Submit immediately. This is the only item in the milestone with an external hard dependency that cannot be shortened.

3. **Netlify env vars scoped to "Build" instead of "Functions"** — Variables set in the Netlify dashboard with Build scope only return `undefined` at function runtime even though they appear correctly set in the dashboard. The Netlify UI may default to Build scope. Explicitly set scope to "Functions" or "All" for each of the 8 variables.

4. **Safari SameSite=Lax CSRF cookie bug (WebKit Bug #219650)** — Safari does not send `SameSite=Lax` cookies on cross-site redirects in certain OAuth flows, causing the `strava-callback.js` CSRF nonce check to fail with "Invalid or missing state parameter." Affects iPhone users. Test explicitly in Safari before launch. The simplest mitigation is documenting the known behavior and noting that a second attempt usually succeeds (the cookie is re-created fresh each time).

5. **GitHub PAT expiry before June 7, 2026** — Fine-grained PATs created with 30, 60, or 90-day expiry will silently break all submissions if they expire before event day. GitHub sends expiry email notifications that can be missed. Create or recreate the PAT with no expiry (supported for personal accounts since October 2024 GA). Verify with a test API call during Phase 1.

**Additional noteworthy pitfalls:**
- Webhook `STRAVA_VERIFY_TOKEN` mismatch during registration causes the Strava handshake to fail silently — pre-warm the function with a test GET before running the subscription registration curl, and copy the token value exactly from the Netlify dashboard
- Do not use the `/api/strava-callback` alias for `STRAVA_REDIRECT_URI` — use the direct `/.netlify/functions/strava-callback` URL to avoid redirect_uri matching ambiguity
- Do not migrate any function to v2 syntax (`export default`) — the env var bug fix is 24 hours old; the migration introduces risk with zero functional gain before go-live

---

## Implications for Roadmap

All four research files converge on the same phase structure, driven by a hard dependency chain: environment must precede testing, data pipeline verification must precede OAuth testing, and webhook registration requires a live verified endpoint. The Strava app review has a 7-10 business day external lead time and should be submitted at the earliest opportunity.

### Phase 1: Environment Configuration

**Rationale:** Nothing in the pipeline works until env vars are set, the Strava callback domain is updated, and the GitHub PAT is verified. This phase eliminates the three most common silent failure modes before any testing begins. It is zero-risk: no code changes, no user-facing changes.
**Delivers:** All 8 env vars confirmed in Netlify dashboard with "Functions" scope; Strava callback domain changed to `mkultragravel.netlify.app`; GitHub PAT verified (correct permissions, no expiry before June 7); `NETLIFY_BUILD_HOOK` URL created and set; baseline unit tests passing (`npm run test`)
**Addresses:** All 8 environment variable table stakes (FEATURES.md), GitHub PAT health, Strava callback domain change, Netlify build hook URL
**Avoids:** Pitfall 1 (`STRAVA_REDIRECT_URI` absent), Pitfall 2 (callback domain mismatch), Pitfall 3 (Build scope only), Pitfall 10 (PAT expiry)

### Phase 2: Data Pipeline Verification

**Rationale:** `submit-result.js` and `strava-webhook.js` are testable with crafted curl requests against the deployed URL, with zero involvement from Strava OAuth. Isolating this layer first means any failures in Phase 3 are definitively in the OAuth layer, not the GitHub/rebuild chain. This phase exercises the entire right side of the architecture diagram.
**Delivers:** Confirmed GitHub write (athlete JSON committed to repo), build hook trigger (Netlify deploy starts), leaderboard rebuild (athlete appears in `/results`), deauth deletion (file removed, rebuild triggered), 409 conflict retry path verified
**Addresses:** GitHub API access, fire-and-forget build hook pattern, deauth data deletion pipeline
**Avoids:** Pitfall 5 (409 conflict — verify retry path works end-to-end), Pitfall 13 (build hook fires before GitHub propagates — accept 1-build lag; fire-and-forget is correct)
**Research flag:** Standard patterns — crafted curl test approach is fully documented in ARCHITECTURE.md with exact commands; no deeper research needed

### Phase 3: Full OAuth Round-Trip

**Rationale:** With environment configured (Phase 1) and data pipeline verified (Phase 2), the only remaining variable is the OAuth layer. Must be run on the deployed production URL (not localhost) due to the `Secure` cookie constraint. All testing uses the developer's own Strava account, which bypasses the 1-athlete limit regardless of app review status.
**Delivers:** Confirmed end-to-end OAuth flow from `/submit` through Strava consent to `/submit-confirm` to leaderboard; all error paths exercised (cancel, wrong account, zero segments, CSRF expiry); Safari tested explicitly; token scope logged
**Addresses:** CSRF cookie round-trip on production HTTPS, activity fetch and segment matching, `approval_prompt=auto` behavior for returning users
**Avoids:** Pitfall 4 (Safari SameSite bug — test in Safari, document known behavior), Pitfall 9 (403 on activity fetch — test with wrong-account URL), Pitfall 15 (`approval_prompt=auto` scope — log `tokenData.scope` on token exchange)
**Research flag:** No deeper research needed — testing protocol is fully documented in ARCHITECTURE.md with step-by-step verification sequence

### Phase 4: Webhook Registration

**Rationale:** Webhook subscription registration requires a deployed, publicly accessible endpoint and cannot be tested on localhost (Strava cannot reach it). Must happen after Phase 2 confirms the function is live and responding correctly. This is a single curl command plus verification.
**Delivers:** Active Strava webhook subscription pointed at `mkultragravel.netlify.app/.netlify/functions/strava-webhook`; deauth events delivered and athlete data deleted within 48 hours (TOS compliance); subscription ID recorded
**Addresses:** One-time subscription registration (FEATURES.md), existing subscription conflict check (Pitfall 6)
**Avoids:** Pitfall 6 (subscription not registered or pointing to wrong URL), Pitfall 7 (verify token mismatch — pre-warm function, copy token exactly from dashboard)
**Research flag:** No deeper research needed — exact curl commands documented in FEATURES.md and ARCHITECTURE.md with expected responses

### Phase 5: Strava App Review Submission

**Rationale:** Listed last because screenshots from a working pipeline (Phases 1-4) support the review application. However, this phase should be submitted as early as possible — ideally as soon as Phase 3 completes and screenshots are available. The 7-10 business day clock starts only when the form is submitted.
**Delivers:** Submitted Strava developer program review application with screenshots; review clock started; branding assets (Connect with Strava button, Powered by Strava logo, View on Strava links) confirmed in live site
**Addresses:** 1-athlete limit blocker, Strava branding compliance (required by API Agreement for approval)
**Note:** Approval is not required to complete Phases 1-4. Development testing uses the developer's own account, which is always allowed in "Single Player Mode."
**Research flag:** No deeper research needed — HubSpot form URL, branding asset URLs, and required submission content documented in STACK.md

### Phase Ordering Rationale

- **Phase 1 must be first** because all functions depend on env vars being set; all subsequent testing is blocked without Phase 1 complete.
- **Phase 2 before Phase 3** because the data pipeline can be tested with crafted curls (no OAuth), and completing it first isolates the failure domain when OAuth testing begins.
- **Phase 3 before Phase 4** because the webhook function must be confirmed deployed and responding correctly before registering the subscription.
- **Phase 5 as early as Phases 1-3 are complete** because the review clock is the longest-lead-time item. Do not wait for Phase 4 to start Phase 5.
- **Phases 1-4 can all proceed while waiting for Phase 5 review approval.** The developer's own Strava account bypasses the 1-athlete limit for all testing purposes.

### Research Flags

Phases needing deeper research during planning:
- **None.** All patterns are well-documented in official sources. The codebase already exists and is considered correct. This is a configuration and verification effort, not a build effort.

Phases with standard patterns (no research-phase needed):
- **All phases:** OAuth configuration, Netlify function env vars, GitHub Contents API, and Strava webhook registration are all documented with primary sources. The implementation is complete. Every phase in this milestone is operational, not architectural.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official Netlify and Strava docs; direct codebase inspection confirms current config choices are correct. The v2 env var bug fix timing (24 hours old at research time) is the only uncertainty — covered by the "keep v1" recommendation. |
| Features | HIGH | Direct code inspection of all 4 functions plus official Strava OAuth, webhook, and rate limit docs. The partial scope acceptance risk (user unchecks `activity:read_all` on consent screen) is MEDIUM confidence but is a minor edge case with a clear mitigation. |
| Architecture | HIGH | Codebase inspection plus official API docs. The Safari SameSite bug is MEDIUM confidence but is a documented WebKit issue with community corroboration. The single Strava callback domain constraint is MEDIUM (community forum, one official confirmation). |
| Pitfalls | HIGH | 12 of 15 pitfalls sourced from official documentation or direct code inspection. 3 pitfalls (Safari bug, callback domain propagation delay, `approval_prompt` scope inheritance) are MEDIUM confidence based on community reports. |

**Overall confidence: HIGH**

### Gaps to Address

- **Strava review approval timeline:** Official docs say 7-10 business days but community reports 1-4 weeks. If approval is not received by approximately May 28, the race director needs a contingency plan (manual result collection as backup). There is no way to accelerate this; follow up at `developers@strava.com` after 10 business days if no response.

- **Segment matching with real event activities:** The event has not happened yet. No real MK Ultra Gravel activities exist to test against. The 9 segment IDs are confirmed correct from v5.0 implementation, but GPS matching accuracy on real course activities cannot be verified until post-event. For pre-event testing, use either a developer activity that includes one of the 9 segment IDs (requires riding the course) or a crafted `submit-result.js` POST that bypasses segment matching entirely.

- **Safari SameSite behavior on current Safari version:** WebKit Bug #219650 was confirmed reproducible through Safari 15.1. Current Safari version behavior is unverified. Test explicitly in Safari during Phase 3 before declaring the OAuth flow production-ready.

- **`STRAVA_VERIFY_TOKEN` value:** This env var does not appear in the local `.env` file and may not be set in the Netlify dashboard. A value must be chosen, set in the Netlify dashboard, and used consistently in the webhook registration curl command. Confirm this during Phase 1 and record the chosen value in a secure location.

- **`STRAVA_REDIRECT_URI` exact value:** Research identifies two valid-but-different URL forms: `https://mkultragravel.netlify.app/.netlify/functions/strava-callback` (direct function URL) and `https://mkultragravel.netlify.app/api/strava-callback` (rewrite alias). Use the direct function URL to avoid ambiguity. Confirm `strava-auth.js` reads this value before building the authorization URL.

---

## Sources

### Primary (HIGH confidence)
- [Strava Authentication Docs](https://developers.strava.com/docs/authentication/) — OAuth flow, scopes, approval_prompt, redirect URI validation
- [Strava Rate Limits](https://developers.strava.com/docs/rate-limits/) — 100 read req/15min, 1000/day, X-RateLimit headers, 429 behavior
- [Strava Webhook Events API](https://developers.strava.com/docs/webhooks/) — subscription setup, handshake protocol, deauth event format, 2-second validation window
- [Strava Developer Program](https://communityhub.strava.com/developers-knowledge-base-14/our-developer-program-3203) — athlete limits, review process, HubSpot form URL
- [Strava Brand Guidelines](https://developers.strava.com/guidelines/) — Connect with Strava, Powered by Strava, View on Strava asset requirements
- [Netlify Functions Environment Variables](https://docs.netlify.com/build/functions/environment-variables/) — scope distinction (Build vs. Functions), variable injection
- [Netlify Node.js Default v22](https://answers.netlify.com/t/builds-functions-plugins-default-node-js-version-upgrade-to-22/135981) — February 2025 default upgrade
- [Netlify Functions v2 env var bug](https://answers.netlify.com/t/functions-v2-scheduled-functions-user-defined-environment-variables-are-undefined-at-runtime/160961) — confirmed fix 2026-03-30
- [GitHub Fine-grained PAT no-expiry](https://github.blog/changelog/2024-10-18-new-pat-rotation-policies-preview-and-optional-expiration-for-fine-grained-pats/) — GA October 2024
- Project codebase (direct inspection): `netlify/functions/strava-auth.js`, `strava-callback.js`, `submit-result.js`, `strava-webhook.js`, `netlify.toml`, `.node-version`, `package.json`, `.env`, `public/data/results/schema.json`

### Secondary (MEDIUM confidence)
- [Strava Community: 1-athlete limit (403)](https://communityhub.strava.com/developers-api-7/number-of-athletes-allowed-to-connect-1-11078) — default = 1, review required for expansion
- [Strava Community: Authorization Callback Domain](https://communityhub.strava.com/developers-api-7/strava-authorization-callback-domain-only-allowing-top-level-domain-issue-1778) — subdomain specificity requirement, propagation delay after update
- [Strava Community: App review timeline](https://communityhub.strava.com/developers-api-7/api-review-form-response-time-2887) — 1-4 weeks actual vs. 7-10 days official
- [WebKit Bug #219650](https://bugs.webkit.org/show_bug.cgi?id=219650) — SameSite=Lax cookies not sent in Safari OAuth redirect flows
- [GitHub Contents API conflict behavior](https://github.com/orgs/community/discussions/62198) — parallel calls to the same path conflict; per-path isolation confirmed

---

*Research completed: 2026-03-31*
*Ready for roadmap: yes*
