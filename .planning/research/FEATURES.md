# Feature Landscape: Strava OAuth Go-Live

**Domain:** Strava OAuth integration — production readiness and end-to-end testing
**Project:** MK Ultra Gravel
**Milestone:** v7.0 Strava Go-Live
**Researched:** 2026-03-31

---

## Context: What Is Already Built

The following is fully implemented and deployed to Netlify but untested against real Strava API:

- `strava-auth.js` — validates activity URL, generates CSRF nonce, sets HttpOnly cookie, redirects to Strava OAuth
- `strava-callback.js` — verifies CSRF state, exchanges code for token, fetches activity with `include_all_efforts=true`, filters to 9 event segment IDs, redirects to `/submit-confirm`
- `strava-webhook.js` — handles subscription handshake (GET) and deauth events (POST), deletes athlete JSON via GitHub API
- `submit-result.js` — validates gender/consent, builds athlete result object per schema, commits JSON to GitHub via Contents API (GET-SHA → PUT), triggers Netlify build hook
- `/submit` page — activity URL input form with client-side validation, denial alert for `?submit=denied`
- `/submit-confirm` page — shows athlete name, matched segment count, activity link; gender dropdown + consent checkbox; POSTs to `/api/submit-result`
- Schema: `public/data/results/schema.json` and seed data in `public/data/results/athletes/`
- Scope: `activity:read_all` (required for `include_all_efforts=true`)
- Pattern: `approval_prompt: 'auto'` (returning users skip re-consent)
- CSRF: double-submit cookie pattern with 10-minute nonce TTL

**The code is considered correct and complete. This milestone's scope is: configure, test, verify, and fix bugs found during real-data testing.**

---

## Table Stakes

Features/behaviors that must work correctly before any real athlete can submit. Missing = pipeline is broken.

| Feature | Why It's Table Stakes | Complexity | Notes |
|---------|----------------------|------------|-------|
| Netlify environment variables set correctly | Functions won't work without `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `NETLIFY_BUILD_HOOK`, `STRAVA_VERIFY_TOKEN` | Low | Must be set in Netlify dashboard UI (not netlify.toml — env vars in toml are NOT accessible to functions). Confirm each var is set in the correct deploy context (production). |
| Strava app "Authorization Callback Domain" set to production domain | OAuth redirect will fail if callback domain doesn't match the registered app domain | Low | In Strava developer dashboard: set to `mkultragravel.netlify.app`. During dev/test with `netlify dev`, `localhost` is whitelisted automatically. |
| Strava app athlete limit increased beyond 1 | New apps default to 1 connected athlete ("Single Player Mode"). Any second athlete attempting OAuth gets 403 "Limit of connected athletes exceeded" | HIGH | Must submit app for review (Strava developer program form). Timeline: 7-10 business days officially; real-world 1-4 weeks. Approval increases limit to 999. This is the most time-sensitive blocker. |
| GitHub fine-grained PAT with correct permissions | `submit-result.js` and `strava-webhook.js` call GitHub Contents API for read + write. Incorrect permissions = 403 or 401 on file commit/delete | Low | PAT needs: Contents: Read and Write on `mkUltraGravel` repo. No other permissions needed. Verify token scope in GitHub Settings. |
| Netlify build hook URL configured | Submission triggers rebuild. Missing or wrong URL = submission "succeeds" but leaderboard never updates | Low | Create/verify build hook in Netlify dashboard → Site Settings → Build & Deploy → Build hooks. Copy URL to `NETLIFY_BUILD_HOOK` env var. |
| Webhook subscription registered with Strava | Deauth events won't arrive until the one-time subscription POST is made to `https://www.strava.com/api/v3/push_subscriptions` | Medium | The `strava-webhook.js` GET handler (challenge response) must be live and deployed BEFORE running the curl command. One subscription per app — idempotent once registered. The curl command is documented in `strava-webhook.js` header comments. |
| CSRF cookie survives OAuth round-trip | Cookie is set by `strava-auth.js`, read by `strava-callback.js`. If it's dropped (browser blocks third-party cookies, SameSite mismatch, etc.) = "Invalid or missing state parameter" error on callback | Medium | Verify with real browser on production URL. The `SameSite=Lax` setting allows cookies on top-level GET redirects (correct for OAuth). Must be HTTPS for `Secure` flag. |
| Activity fetch returns `segment_efforts` | `strava-callback.js` requires `activity.segment_efforts` to be non-empty and contain at least one of the 9 event segment IDs | Medium | Depends on: (1) correct scope (`activity:read_all`), (2) activity has GPS data, (3) athlete rode the actual MK Ultra Gravel course segments, (4) Strava segment matching succeeded for that GPS track |

---

## OAuth Flow States: All Paths That Must Be Tested

### Happy Path

1. Rider enters valid Strava activity URL (`https://www.strava.com/activities/\d+`) → clicks "Connect with Strava"
2. Client-side JS validates URL format → redirects to `/api/strava-auth?activityUrl=...`
3. `strava-auth.js` sets CSRF cookie, redirects to Strava authorization page
4. Rider sees Strava consent screen (first time) or is auto-approved (`approval_prompt: 'auto'`, returning user)
5. Strava redirects to `/api/strava-callback?code=...&state=...`
6. `strava-callback.js` verifies CSRF nonce, exchanges code for token, fetches activity, filters segments
7. Rider lands on `/submit-confirm?data=...` — sees their name, segment count, activity link
8. Rider selects gender category and checks consent → clicks "Submit My Results"
9. `submit-result.js` validates, commits JSON to GitHub, triggers build hook
10. Rider sees success page: "Results Submitted! The site will rebuild shortly."
11. GitHub commit triggers Netlify build → athlete appears on `/results` leaderboard

**Expected duration:** OAuth round-trip ~5-10 seconds; GitHub commit + rebuild ~2-3 minutes until leaderboard updates.

### Error Paths That Must Be Tested

| Scenario | Expected Behavior | How to Trigger |
|----------|------------------|----------------|
| User clicks "Cancel" on Strava consent screen | Redirected to `/submit?submit=denied`; denial alert shown with dismiss button | Click Cancel on Strava OAuth page |
| Strava activity URL belongs to a different athlete | `strava-callback.js` fetches activity with the OAuth token; Strava returns 403 — `activityRes.ok` is false → "Failed to fetch activity from Strava. Make sure the activity URL is correct and belongs to your account." | Use valid Strava URL that belongs to a different Strava account than the one that OAuth'd |
| Activity has zero matching event segments | "No Matching Event Segments Found" error page with checklist | Submit a Strava activity that did not include the MK Ultra Gravel course segments |
| CSRF cookie expired (>10 minutes in OAuth flow) | "Invalid or missing state parameter" error page | Let OAuth flow sit for 10+ minutes before completing |
| Direct navigation to `/submit-confirm` without valid `data` param | "Something went wrong — no valid submission data found" error with link back to `/submit` | Navigate to `/submit-confirm` directly with no query param |
| Invalid/tampered `data` param on `/submit-confirm` | Same error as above | Navigate to `/submit-confirm?data=garbage` |
| Submit without selecting gender | Client-side validation prevents submit; "Please select a category." error shown | Click Submit without selecting gender |
| Submit without checking consent | Client-side validation prevents submit; "You must consent to public display..." error shown | Click Submit without checking consent |
| Duplicate submission (same athlete submits again) | `submit-result.js` GETs existing file SHA, PUTs updated content → overwrites previous result | Submit same athlete twice; second submission should update the JSON file |
| GitHub API returns 409 conflict | "There was a conflict saving your results. Please try submitting again." with link back to `/submit` | Race condition (two simultaneous submissions for same athlete) — difficult to trigger manually, but code handles it |
| Partial scope accepted (user unchecks `activity:read_all` on consent screen) | Strava allows users to uncheck individual scopes. The token exchange succeeds, but the activity fetch with `include_all_efforts=true` will return 403 or empty `segment_efforts` because `activity:read_all` is required | On Strava consent screen, uncheck the activity access scope |
| Strava API rate limit hit (429) | Current code: `activityRes.ok` is false → "Failed to fetch activity from Strava. Please try again." | Unlikely at event scale (200 req/15min limit; event has ~50 finishers expected) |

---

## Environment Configuration: Full Variable Checklist

Every environment variable required for the pipeline to work end-to-end:

| Variable | Function(s) Using It | Purpose | Where to Get It |
|----------|----------------------|---------|----------------|
| `STRAVA_CLIENT_ID` | strava-auth.js, strava-callback.js | OAuth app identification | Strava developer dashboard → "My API Application" |
| `STRAVA_CLIENT_SECRET` | strava-callback.js | OAuth token exchange | Strava developer dashboard → "My API Application" |
| `STRAVA_REDIRECT_URI` | strava-auth.js | OAuth callback URL | `https://mkultragravel.netlify.app/api/strava-callback` |
| `STRAVA_VERIFY_TOKEN` | strava-webhook.js | Webhook subscription handshake verification | Self-generated secret string; must match what you pass in the subscription curl |
| `GITHUB_TOKEN` | submit-result.js, strava-webhook.js | GitHub Contents API auth | GitHub → Settings → Developer settings → Fine-grained PAT (Contents: R+W on mkUltraGravel) |
| `GITHUB_OWNER` | submit-result.js, strava-webhook.js | GitHub repo owner | `Sheppardjm` |
| `GITHUB_REPO` | submit-result.js, strava-webhook.js | GitHub repo name | `mkUltraGravel` |
| `NETLIFY_BUILD_HOOK` | submit-result.js, strava-webhook.js | Rebuild trigger after data change | Netlify dashboard → Site Settings → Build & Deploy → Build hooks |

**Important:** All variables must be set in Netlify UI, NOT netlify.toml. Variables in netlify.toml are NOT accessible to Netlify Functions at runtime. (Confirmed as root cause of v2 env var issues; v1 syntax was the fix, but variable placement still matters.)

---

## Strava App Review: The Time-Sensitive Blocker

This is the highest-urgency item because it has an external approval dependency.

**Problem:** New Strava apps default to 1 connected athlete. Any second athlete who attempts OAuth gets HTTP 403 "Limit of connected athletes exceeded". The event expects ~50+ finishers who will all need to submit.

**Solution:** Submit the Strava developer program review form.

**What Strava reviews:**
- App purpose and use case
- Where Strava data appears in the app (screenshots needed)
- Expected user scale
- Compliance with Strava Brand Guidelines (Strava logo/attribution displayed correctly)
- No TOS violations (no scraping, no unauthorized data display)

**What to include in submission:**
- Clear description: gravel cycling event results submission tool
- Screenshots of `/submit` page, `/submit-confirm` page, `/results` page showing Strava attribution
- Expected user scale: ~50-100 athletes (single-event, annual)
- Confirm that consent is explicit and revocation/deletion is implemented (within 48 hours via webhook)

**Timeline:** Official: 7-10 business days. Actual: 1-4 weeks reported in community. **Submit immediately.**

**After approval:** Athlete limit raised to 999. Rate limits remain at 200 req/15min, 2000/day — adequate for this event scale.

---

## Webhook Registration: One-Time Setup

The `strava-webhook.js` function exists and handles the challenge handshake correctly, but the webhook subscription must be manually registered with Strava via curl.

**Sequence:**
1. Deploy `strava-webhook.js` (confirm it's live at `https://mkultragravel.netlify.app/.netlify/functions/strava-webhook`)
2. Verify the GET handler works: `curl "https://mkultragravel.netlify.app/.netlify/functions/strava-webhook?hub.mode=subscribe&hub.challenge=test&hub.verify_token=YOUR_VERIFY_TOKEN"` should return `{"hub.challenge":"test"}`
3. Register subscription:
```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=YOUR_CLIENT_ID \
  -F client_secret=YOUR_CLIENT_SECRET \
  -F callback_url=https://mkultragravel.netlify.app/.netlify/functions/strava-webhook \
  -F verify_token=YOUR_STRAVA_VERIFY_TOKEN
```
4. Strava immediately sends a GET to the callback URL with `hub.challenge`. Your function must respond with `{"hub.challenge":"..."}` within 2 seconds.
5. If successful, Strava returns a subscription ID. Store it.

**Important:** Only one webhook subscription per Strava app is allowed. If one already exists, delete it before creating a new one (or use `GET /push_subscriptions` to check).

**Retry behavior:** Strava retries webhook events up to 3 times if the callback returns non-200. The function correctly returns 200 for all POST events, including deauth.

---

## Testing Scenarios: Manual Test Matrix

### Pre-Testing Setup Verification

| Test | Pass Condition |
|------|---------------|
| GET `/.netlify/functions/strava-auth?activityUrl=https://www.strava.com/activities/12345` | Returns 302 redirect to `strava.com/oauth/authorize` with `client_id`, `redirect_uri`, `scope=activity:read_all`, `state` in URL |
| GET `/.netlify/functions/strava-auth` (no param) | Returns 400 with plain text error |
| GET `/.netlify/functions/strava-auth?activityUrl=notstrava` | Returns 400 with plain text error |
| GET `/.netlify/functions/strava-webhook?hub.mode=subscribe&hub.challenge=ABC&hub.verify_token=CORRECT` | Returns 200 with `{"hub.challenge":"ABC"}` |
| GET `/.netlify/functions/strava-webhook?hub.mode=subscribe&hub.challenge=ABC&hub.verify_token=WRONG` | Returns 403 |
| POST `/.netlify/functions/submit-result` with missing consent | Returns 400 error HTML page |
| POST `/.netlify/functions/submit-result` with invalid gender | Returns 400 error HTML page |

### Full Happy Path Test (requires real Strava account + real activity on MK Ultra Gravel course)

Because the event hasn't happened yet (June 7, 2026), no real MK Ultra Gravel activities exist. Testing options:

1. **Developer self-test (recommended):** The app developer's own Strava account is always allowed regardless of athlete limit. Record a test ride on any of the 9 event segment IDs (or fabricate a test using Strava's segment tools). Submit via the full OAuth flow.
2. **Synthetic test:** Create a Strava activity with GPS points that cross the 9 segment boundaries. Segment matching requires GPS accuracy — this is difficult to fake reliably.
3. **Modified segment test:** Test the pipeline end-to-end by temporarily modifying `ALL_SEGMENT_IDS` in `strava-callback.js` to include a segment from a real activity you own. **Revert before go-live.**

### GitHub API Write Test

| Test | Pass Condition |
|------|---------------|
| POST `/.netlify/functions/submit-result` with valid data payload, gender, consent | New file `public/data/results/athletes/{athleteId}.json` appears in GitHub repo |
| Second submission for same athlete | File is overwritten (not duplicated), SHA lookup succeeds |
| Netlify build triggered | A new build appears in Netlify dashboard immediately after submission |

### Deauthorization Test

| Test | Pass Condition |
|------|---------------|
| POST `/.netlify/functions/strava-webhook` with deauth payload: `{"object_type":"athlete","aspect_type":"delete","owner_id":ATHLETE_ID,"updates":{"authorized":"false"}}` | File `public/data/results/athletes/{ATHLETE_ID}.json` is deleted from GitHub repo |
| POST with unrecognized event type | Returns 200 `EVENT_RECEIVED`, no side effects |
| POST with missing body | Returns 200 `EVENT_RECEIVED` (malformed body acknowledged, not retried) |

### User Experience Verification

| State | Expected UX |
|-------|------------|
| Fresh visit to `/submit` | Clean form, no error alert |
| Visit `/submit?submit=denied` | Denial alert shown in red; dismissable with × button |
| `/submit-confirm?data=VALID` | Shows athlete name, segment count "X of 9 event segments matched", clickable activity URL |
| `/submit-confirm` (no data param) | Error state with "Start the submission process again" link back to `/submit` |
| Successful submission | Success page shows name + category label (Men/Women/Non-binary); links to Home + "Submit another activity" |
| `approval_prompt: 'auto'` returning user | Second submission from same Strava account skips the OAuth consent screen (Strava shows "You've already authorized..." and auto-redirects) |

---

## Differentiators (Nice-to-Have If Issues Found During Testing)

Features not required for go-live but worth addressing if discovered during testing:

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Scope validation in strava-callback.js | Strava allows users to uncheck scopes on the consent screen. If `activity:read_all` is unchecked, `include_all_efforts=true` will fail silently or return 403. Currently the code checks `activityRes.ok` but doesn't inspect the actual granted scope. A check of `tokenData.scope` against `activity:read_all` would give a better error message. | Low | `tokenData.scope` in the token exchange response contains the comma-separated list of accepted scopes. Check if it includes `activity:read_all` before proceeding. |
| Partial segment match feedback | Currently shows "X of 9 event segments matched" at confirm step, which is good. But the user has no indication of WHICH segments were matched. If only 3 of 9 matched, they may not have actually ridden the course. | Medium | Would require passing segment names (from route-data or a lookup table) into the payload. Adds complexity. Useful post-event if disputes arise. |
| Submission loading state | When user clicks "Submit My Results", the page does nothing visible while the GitHub API call runs (can take 2-4 seconds). No spinner or disabled state on the button. | Low | Add `disabled` attribute and button text change on submit event. Prevents double-submit and improves perceived performance. |
| Resubmission handling | Users can submit multiple times (code overwrites by athlete ID). The success page says "Submit another activity" which implies one activity per athlete. No guard against submitting a different (non-event) activity later and overwriting their real times. | Low-Medium | Could add a warning on the success page that resubmission overwrites the previous result. Not a security concern — the overwrite is keyed by authenticated Strava athlete ID. |

---

## Anti-Features

Things to deliberately NOT build for this milestone:

| Anti-Feature | Why Avoid |
|--------------|-----------|
| Admin moderation UI for submitted results | A web form to review/approve submissions is weeks of work. The event is small (~50 finishers), results are public on the leaderboard, and any disputes are handled by the race director manually editing JSON files in the repo. |
| Token storage / refresh logic | This integration is a one-shot OAuth flow: get token, use it once to fetch activity, discard. No persistent storage of tokens is needed. The 6-hour token expiry is irrelevant because the activity fetch happens within seconds. Adding refresh logic creates a security surface with no benefit. |
| Strava webhook for activity creates/updates | The webhook is implemented to receive all event types, but only acts on deauth. Activity create/update events arrive but are acknowledged and ignored. This is correct — do NOT add logic to auto-process new activity events because it would require storing athlete tokens, which the current architecture explicitly avoids. |
| Strava API rate limit handling with retry | At event scale (50-100 athletes, each making 1 token exchange + 1 activity fetch = ~200 API calls total), the 2000/day limit will not be approached. Adding retry/backoff logic would complicate the functions with no practical benefit. |
| Offline mode / queue for Netlify build hook failures | The build hook is fire-and-forget. If it fails, a build can be manually triggered from the Netlify dashboard. For a 50-athlete event, this is not worth engineering. |
| GDPR-compliant deletion confirmation email | Deauth events automatically delete the athlete file within 48 hours. No email is required for this event's scale and scope. |

---

## Feature Dependencies for This Milestone

```
Strava app review approval
  blocks: any test with a second athlete account
  unblocks: full event-scale testing

Netlify env vars configured (all 8)
  blocks: all function testing
  prerequisite for everything else

GitHub PAT with correct permissions
  blocks: submit-result.js commit, strava-webhook.js delete
  testable independently: curl the GitHub API with the token

Webhook subscription registration
  blocks: deauth event delivery
  requires: strava-webhook.js deployed and responding to GET challenge

CSRF cookie behavior on production HTTPS
  testable: full OAuth flow test with a real browser on the production URL
  risk: cannot be tested with localhost redirect (different cookie domain)
```

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| OAuth flow states and error paths | HIGH | Direct code inspection of all 4 Netlify functions + official Strava auth docs |
| Athlete limit as go-live blocker | HIGH | Multiple Strava community forum threads confirming default=1, review required for expansion |
| Environment variable placement (Netlify UI vs toml) | HIGH | Official Netlify docs + existing decision log in PROJECT.md (v2 env var bug context) |
| Webhook setup and deauth event format | HIGH | Official Strava webhook docs, code inspection confirms correct `authorized: "false"` string check |
| Partial scope acceptance risk | MEDIUM | Official Strava docs confirm users can uncheck scopes; current code doesn't validate accepted scope list |
| Segment matching edge cases (GPS accuracy, privacy zones) | MEDIUM | Strava support docs on segment matching; exact behavior with `include_all_efforts=true` unverified against real data |
| Review approval timeline (1-4 weeks) | MEDIUM | Community forum reports; official says 7-10 business days but actual experience varies |

---

## Sources

- [Strava OAuth Documentation](https://developers.strava.com/docs/authentication/) — flow states, scopes, approval_prompt, access_denied (HIGH confidence)
- [Strava API Reference: getActivityById](https://developers.strava.com/docs/reference/#api-Activities-getActivityById) — include_all_efforts parameter (HIGH confidence)
- [Strava Webhook Events API](https://developers.strava.com/docs/webhooks/) — subscription setup, deauth event format, retry behavior (HIGH confidence)
- [Strava API FAQ](https://communityhub.strava.com/developers-knowledge-base-14/strava-api-faq-12906) — athlete limits, rate limits, token management (HIGH confidence)
- [Strava Rate Limits](https://developers.strava.com/docs/rate-limits/) — 200 req/15min, 2000/day, X-RateLimit headers (HIGH confidence)
- [Strava Community: Athlete Limit](https://communityhub.strava.com/developers-api-7/help-to-solve-error-403-limit-of-connected-athletes-exceeded-1699) — limit of connected athletes behavior and resolution (MEDIUM confidence)
- [Strava App Review Timeline](https://communityhub.strava.com/developers-api-7/api-review-form-response-time-2887) — 7-10 business days official, 1-4 weeks actual (MEDIUM confidence)
- [Netlify Functions Environment Variables](https://docs.netlify.com/build/functions/environment-variables/) — vars must be set in UI not netlify.toml (HIGH confidence)
- Project codebase: `netlify/functions/strava-auth.js`, `strava-callback.js`, `submit-result.js`, `strava-webhook.js`, `src/pages/submit.astro`, `src/pages/submit-confirm.astro`, `public/data/results/schema.json` (HIGH confidence — ground truth)
