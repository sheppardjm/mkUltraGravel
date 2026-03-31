# Architecture: Strava Integration End-to-End Testing

**Domain:** OAuth integration testing — serverless functions with real third-party APIs
**Project:** MK Ultra Gravel — v7.0 Strava Go-Live
**Researched:** 2026-03-31
**Focus:** How to test the existing Strava OAuth/submission pipeline end-to-end
**Overall confidence:** HIGH — findings from codebase inspection + Strava official docs + Netlify CLI docs

---

## System Map (Existing Architecture)

The submission pipeline spans 4 Netlify Functions v1 across 4 external service boundaries:

```
Browser
  │
  │ GET /?activityUrl=...
  ▼
[strava-auth.js]
  │  validates activityUrl format
  │  generates CSRF nonce (crypto.randomBytes)
  │  encodes state = base64url({nonce, activityUrl})
  │  sets HttpOnly cookie strava_oauth_state=nonce
  └─► 302 → https://www.strava.com/oauth/authorize?...
               │
               │ user grants scope: activity:read_all
               ▼
[strava-callback.js]
  │  verifies CSRF: state nonce == cookie nonce
  │  POSTs to Strava /api/v3/oauth/token (code exchange)
  │  GETs Strava /api/v3/activities/{id}?include_all_efforts=true
  │  filters to 9 event segment IDs
  │  rejects if 0 matching efforts
  │  encodes payload = base64url({athleteId, name, activityUrl, segments})
  │  clears CSRF cookie
  └─► 302 → /submit-confirm?data=<payload>
               │
               │ user fills gender + consent form, submits POST
               ▼
[submit-result.js]
  │  validates consent + gender
  │  decodes payload
  │  builds athlete JSON (Phase 28 schema)
  │  GET GitHub /repos/.../contents/{athleteId}.json (retrieve SHA)
  │  PUT GitHub /repos/.../contents/{athleteId}.json (create/update)
  │  fire-and-forget POST to NETLIFY_BUILD_HOOK
  └─► 200 success HTML page

Strava
  │
  │ POST (deauth event: aspect_type=delete, updates.authorized='false')
  ▼
[strava-webhook.js]
  │  GET handler: subscription handshake (echoes hub.challenge)
  │  POST handler: responds 200 immediately
  │  if deauth event: deleteAthleteData(athleteId)
  │    GET GitHub SHA → DELETE file → trigger rebuild
```

### Function Inventory

| File | Handler | Purpose | External calls |
|------|---------|---------|----------------|
| `strava-auth.js` | GET | OAuth initiation | None (all local) |
| `strava-callback.js` | GET (redirect from Strava) | Token exchange + activity fetch | Strava oauth/token, Strava activities API |
| `submit-result.js` | POST | GitHub commit + rebuild | GitHub Contents API, Netlify Build Hook |
| `strava-webhook.js` | GET + POST | Strava subscription + deauth | GitHub Contents API, Netlify Build Hook |

All functions use v1 syntax (`exports.handler`) due to active Netlify Functions v2 env var bug (confirmed 2026-03-28).

### Environment Variables

| Variable | Required by | Set in |
|----------|-------------|--------|
| `STRAVA_CLIENT_ID` | strava-auth, strava-callback | Netlify dashboard (NOT netlify.toml) |
| `STRAVA_CLIENT_SECRET` | strava-callback | Netlify dashboard |
| `STRAVA_REDIRECT_URI` | strava-auth | Netlify dashboard |
| `STRAVA_VERIFY_TOKEN` | strava-webhook | Netlify dashboard |
| `GITHUB_TOKEN` | submit-result, strava-webhook | Netlify dashboard |
| `GITHUB_OWNER` | submit-result, strava-webhook | Netlify dashboard |
| `GITHUB_REPO` | submit-result, strava-webhook | Netlify dashboard |
| `NETLIFY_BUILD_HOOK` | submit-result, strava-webhook | Netlify dashboard |

Local `.env` file currently has `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_ACCESS_TOKEN`, and `STRAVA_REFRESH_TOKEN`. The remaining 5 vars are not yet present locally.

---

## Strava API Constraints for Testing

### The 1-Athlete Limit (Critical)

Before Strava app review, the app is in "Single Player Mode":

- **Only the developer's Strava account can authenticate.** If any other athlete attempts OAuth, Strava returns 403 "Limit of connected athletes exceeded."
- App review is required to lift this limit and allow additional athletes.
- Review timeline is 7-10 business days per Strava documentation.

**Implication:** End-to-end testing before app review is limited to the developer's own Strava account. This is sufficient to verify the full pipeline — token exchange, activity fetch, segment filtering, GitHub commit, rebuild, and leaderboard display — using a real activity.

### No Sandbox Environment

Strava provides no separate sandbox or staging API. All OAuth testing uses the real production Strava API with the developer's own account data.

### Localhost Redirect URIs Are Allowed

Strava explicitly whitelists `localhost` and `127.0.0.1` as callback domains. HTTP (not HTTPS) localhost is accepted. This enables local testing via `netlify dev`.

**Critical constraint:** The Strava app has a single "Authorization Callback Domain" field. It cannot hold two simultaneous values (e.g., `localhost` and `mkultragravel.netlify.app`). Switching between local and production testing requires editing the Strava app settings at `https://www.strava.com/settings/api`.

### Rate Limits

- 200 requests per 15 minutes, 2,000 per day (per application, not per athlete)
- Integration testing generates 2-4 requests per submission attempt (token exchange + activity fetch)
- Rate limits are not a concern for manual testing

### Webhook Registration

- One active webhook subscription per Strava app
- Webhook URL must be publicly accessible (not localhost)
- Subscription registration requires a one-time curl command to Strava's push_subscriptions API
- After subscription, Strava sends a GET handshake to the callback URL — the endpoint must respond with `{"hub.challenge": "..."}` within 2 seconds

---

## Local Testing Architecture (netlify dev)

### How netlify dev Works

`netlify dev` provides a local proxy at `http://localhost:8888` that:
- Serves all 4 functions at `/.netlify/functions/<name>` (and via `/api/*` redirect from netlify.toml)
- Injects environment variables from the linked Netlify site OR from a local `.env` file
- Handles the `[[redirects]]` rules defined in netlify.toml

Functions run locally as Node.js processes — no Lambda cold starts, no deployment cycle.

### HTTPS Constraint for Cookies

The `strava-auth.js` function sets the CSRF cookie with `Secure` and `SameSite=Lax` attributes:

```
Set-Cookie: strava_oauth_state=<nonce>; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/
```

**Problem:** `netlify dev` runs HTTP by default. Browsers reject `Secure` cookies over HTTP connections. When Strava redirects back to `strava-callback.js`, the cookie will be absent, causing CSRF verification to fail.

**Resolution options:**
1. Configure local HTTPS in netlify.toml with `mkcert`-generated certificates (cleanest, no code changes)
2. Strip `Secure` from cookie in development (code change in strava-auth.js, requires env-based condition)
3. Test only on deployed production URL (no local OAuth testing — simplest to set up, slowest iteration)
4. Use the `/api/` redirect path which goes through netlify dev's proxy, which may handle the Secure issue

The Strava OAuth callback returns to whatever `redirect_uri` was specified in the authorization URL. If testing locally, `STRAVA_REDIRECT_URI` must point to `http://localhost:8888/.netlify/functions/strava-callback`, and the Strava app's Authorization Callback Domain must be set to `localhost`.

**Recommendation:** Start with production testing (deployed site) to avoid the HTTPS/cookie complication. Use local testing only for functions that don't involve the OAuth cookie round-trip (webhook, submit-result POST).

### netlify dev Environment Variable Injection

Two sources, in priority order:
1. Linked Netlify site: run `netlify link` and `netlify dev` pulls dashboard env vars automatically
2. Local `.env` file: read by netlify dev without additional configuration

For v7.0, `netlify link` is the preferred approach — it ensures local functions use the same variables as production, including secrets that should not be in `.env`.

---

## Testing Strategy: Three Tiers

### Tier 1: Unit Tests (Already Exist)

The scoring engine (`src/lib/scoring.js`) has vitest tests at `src/lib/scoring.test.js`. These tests are pure function tests — no external calls, no OAuth, no filesystem.

**Run:** `npm run test`

These tests verify the scoring logic is correct before any real-data testing. They should pass green as a baseline before any other testing begins.

### Tier 2: Function-Level Manual Tests

Functions that do not require the full OAuth round-trip can be tested directly with curl against `netlify dev` or the deployed URL.

**strava-webhook.js — GET handshake:**
```bash
curl "http://localhost:8888/.netlify/functions/strava-webhook?\
hub.mode=subscribe&hub.challenge=testchallenge123&hub.verify_token=YOUR_VERIFY_TOKEN"
# Expected: {"hub.challenge":"testchallenge123"}
```

**strava-webhook.js — POST deauth simulation:**
```bash
curl -X POST https://mkultragravel.netlify.app/.netlify/functions/strava-webhook \
  -H 'Content-Type: application/json' \
  -d '{"object_type":"athlete","aspect_type":"delete","object_id":99999,"owner_id":99999,"updates":{"authorized":"false"},"event_time":1749000000,"subscription_id":1}'
# Expected: "EVENT_RECEIVED" with status 200
# Side effect: attempts GitHub file GET for athlete 99999 (will 404 gracefully)
```

**submit-result.js — POST with crafted payload:**
The function accepts a `data` field (base64url-encoded JSON) plus `gender` and `consent`. A test payload can be constructed without going through OAuth:
```bash
DATA=$(node -e "console.log(Buffer.from(JSON.stringify({athleteId:'TEST001',name:'Test Athlete',activityUrl:'https://www.strava.com/activities/12345',segments:{'24479292':{elapsed_time:1200}}})).toString('base64url'))")
curl -X POST https://mkultragravel.netlify.app/.netlify/functions/submit-result \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "data=$DATA&gender=M&consent=yes"
# Expected: success HTML page + creates/updates athletes/TEST001.json in GitHub
```

**strava-auth.js — parameter validation:**
```bash
# Missing activityUrl → 400
curl "http://localhost:8888/.netlify/functions/strava-auth"
# Invalid activityUrl → 400
curl "http://localhost:8888/.netlify/functions/strava-auth?activityUrl=https://example.com"
# Valid → 302 to Strava (response header Location should be strava.com URL)
curl -v "http://localhost:8888/.netlify/functions/strava-auth?activityUrl=https://www.strava.com/activities/12345"
```

### Tier 3: Full End-to-End (Requires Real Strava Account)

This is the critical path for v7.0. It requires:
- Strava app's Authorization Callback Domain set to `mkultragravel.netlify.app`
- All 8 env vars configured in Netlify dashboard
- A real Strava activity from the developer's account that includes at least one of the 9 event segment IDs

**Full pipeline test sequence:**
1. Navigate to `https://mkultragravel.netlify.app/submit`
2. Enter activity URL and click "Connect with Strava"
3. Confirm redirect to `https://www.strava.com/oauth/authorize`
4. Authorize the app — confirm scope shows `activity:read_all`
5. Confirm redirect to `/submit-confirm` with decoded activity data
6. Select gender, check consent, submit
7. Confirm success page
8. Check GitHub repo — `public/data/results/athletes/{athleteId}.json` should be committed
9. Wait for Netlify rebuild (1-3 minutes) — triggered by build hook
10. Navigate to `/results` — athlete should appear in the leaderboard

---

## Verification Sequence: What to Check First

Testing dependencies create a required ordering. Each step gates the next.

### Step 1: Env Vars Present (Prerequisite)

Before any function will work, all env vars must be set. Verify in Netlify dashboard that all 8 variables exist for the production context.

**How to verify:** Check Netlify dashboard → Site configuration → Environment variables. Confirm `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI`, `STRAVA_VERIFY_TOKEN`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `NETLIFY_BUILD_HOOK` are all present.

### Step 2: GitHub API Access

The GitHub token must have `Contents: Read and Write` permission on the repo. Verify independently before running the submission pipeline.

**How to verify:**
```bash
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/Sheppardjm/mkUltraGravel/contents/public/data/results/athletes/
# Expected: 200 with JSON array of files
```

### Step 3: Netlify Build Hook

Confirm the build hook URL is reachable and triggers a build.

**How to verify:**
```bash
curl -X POST "$NETLIFY_BUILD_HOOK"
# Expected: Netlify dashboard shows a new deploy triggered
```

### Step 4: strava-auth Redirect

Verify strava-auth generates a valid Strava authorization URL with the correct client_id and redirect_uri.

**How to verify:** Visit `https://mkultragravel.netlify.app/.netlify/functions/strava-auth?activityUrl=https://www.strava.com/activities/12345`. Confirm the 302 Location header points to `https://www.strava.com/oauth/authorize` with correct params. Check CSRF cookie is set.

### Step 5: Strava Token Exchange

The most likely failure point. Token exchange fails if `STRAVA_CLIENT_SECRET` is wrong, if the app is not yet approved, or if the authorization code expired (codes are single-use with short TTL).

**How to verify:** Complete the full OAuth flow. If `strava-callback.js` returns the error page "Token exchange failed," check function logs in Netlify dashboard for the raw Strava error response.

### Step 6: Activity Fetch + Segment Matching

Activity fetch succeeds but segment matching may return 0 results if the activity has no data for the 9 event segment IDs. This is expected for a non-event test activity — the developer should use an activity that actually rode the MK Ultra course, or use a synthetic test via Tier 2 (crafted submit-result POST).

### Step 7: GitHub Commit

After successful segment matching, `submit-result.js` commits to GitHub. Verify by checking the repo for a new commit.

### Step 8: Rebuild and Leaderboard

Netlify deploy logs show the build triggered by the hook. After deploy, the athlete appears in `/results`.

---

## Deauthorization Webhook Testing

The webhook requires a one-time subscription registration. This is separate from the OAuth flow and must be done after deploy.

### Registering the Subscription

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=11267 \
  -F client_secret=$STRAVA_CLIENT_SECRET \
  -F callback_url=https://mkultragravel.netlify.app/.netlify/functions/strava-webhook \
  -F verify_token=$STRAVA_VERIFY_TOKEN
```

Strava immediately sends a GET to the callback_url with `hub.challenge`. The function must be deployed and responding before registration is attempted. If it responds correctly, Strava returns the subscription ID.

**Verify subscription exists:**
```bash
curl "https://www.strava.com/api/v3/push_subscriptions?client_id=11267&client_secret=$STRAVA_CLIENT_SECRET"
```

### Testing Deauth Without Real Revocation

To test the deauth handler without revoking an actual athlete's access, send a simulated deauth POST directly to the webhook:

```bash
curl -X POST https://mkultragravel.netlify.app/.netlify/functions/strava-webhook \
  -H 'Content-Type: application/json' \
  -d '{"object_type":"athlete","aspect_type":"delete","object_id":32711065,"owner_id":32711065,"updates":{"authorized":"false"},"event_time":1749000000,"subscription_id":1}'
```

Use the `athleteId` of a test file that was committed during Tier 3 testing. Verify the file is deleted from GitHub and a rebuild is triggered.

---

## Data Pipeline Verification

After a successful submission, verify the full chain:

### GitHub Commit

File `public/data/results/athletes/{athleteId}.json` should:
- Conform to `public/data/results/schema.json`
- Have all required fields: `athleteId`, `name`, `gender`, `activityUrl`, `submittedAt`, `segments`
- Have `segments` keyed by string segment IDs (not integers)
- Have `elapsed_time` as integer (seconds)

### Build Output

After Netlify rebuild, the results page reads athlete JSON files at build time. The scoring engine (`src/lib/scoring.js`) computes rankings from all athlete files in the `athletes/` directory. The athlete should appear in the appropriate gender tab in both the Gravel Champion and KOM/QOM Champion leaderboards (if they have segment times for the relevant segments).

**Verify scoring correctness:** The existing vitest test suite covers the scoring engine. Seed data in `public/data/results/athletes/` (20+ files) is already processed by the build and appears in the leaderboard. A real submission adds to these.

---

## Architecture: Production vs Local Testing Comparison

| Aspect | Local (netlify dev) | Production (deployed) |
|--------|---------------------|----------------------|
| OAuth CSRF cookie | **Broken** — Secure cookie fails over HTTP | Works — HTTPS throughout |
| Environment variables | Via `netlify link` or `.env` file | Netlify dashboard |
| Strava callback domain | Must change Strava app settings to `localhost` | `mkultragravel.netlify.app` |
| Webhook testing | Not feasible — localhost not reachable by Strava | Feasible after subscription registered |
| Iteration speed | Fast — no deploy cycle | Slow — 1-3 min deploy per change |
| Function logs | Terminal output | Netlify dashboard → Functions tab |
| Suitable for | Auth param validation, webhook curl tests, submit-result POST tests | Full OAuth round-trip, webhook subscription |

**Recommendation:** Use production (deployed) for the full OAuth integration test. Use `netlify dev` only for the Tier 2 function-level tests that don't involve the CSRF cookie round-trip.

---

## Anti-Patterns to Avoid

### Testing webhook subscription with localhost

Strava's subscription handshake is a real HTTP GET from Strava's servers. They cannot reach `localhost:8888`. Register the subscription only after the function is deployed to production.

### Switching Strava app callback domain repeatedly

The Strava app settings at `https://www.strava.com/settings/api` have a single "Authorization Callback Domain" field. Every time you switch between `localhost` and `mkultragravel.netlify.app`, you must manually edit this field. Plan testing to minimize switches: do all local validation first, then set it to `mkultragravel.netlify.app` for the real end-to-end test and leave it there.

### Using a non-event Strava activity for segment matching

`strava-callback.js` filters to the 9 event segment IDs (`ALL_SEGMENT_IDS`). Any Strava activity that was not ridden on the MK Ultra Gravel course will return 0 matching efforts and show the error page. For Tier 3 testing, you need either:
- An activity recorded on the actual MK Ultra Gravel course with GPS segment matching enabled, OR
- A direct POST to `submit-result.js` with a crafted payload (bypasses segment matching entirely)

The crafted POST approach (Tier 2) is the pragmatic path for verifying the GitHub commit + rebuild pipeline when a real course activity is not available.

### Expecting instant leaderboard update

The rebuild is fire-and-forget from `submit-result.js`. Netlify builds take 1-3 minutes. The leaderboard is a static site — it does not update in real time. This is by design. Do not treat a missing athlete on the leaderboard as a bug until the build has completed.

### Committing athlete data for fake/test athletes that shouldn't appear

Test submissions using crafted payloads will commit real files to the GitHub repo (`athletes/TEST001.json`). These files will appear in the leaderboard after rebuild. Have a cleanup plan: delete the test files via GitHub UI or curl before the real event, or use an obviously-fake athleteId prefix that can be filtered during build.

---

## Suggested Phase Structure for v7.0

Based on testing dependencies:

**Phase A: Environment Configuration**
- Confirm all 8 env vars in Netlify dashboard
- Add missing vars: `STRAVA_REDIRECT_URI`, `STRAVA_VERIFY_TOKEN`, `NETLIFY_BUILD_HOOK`
- Confirm GitHub token permissions
- Run Tier 1 unit tests: `npm run test` (scoring engine baseline)

**Phase B: GitHub API + Submit Pipeline**
- Execute Tier 2 submit-result test: crafted POST → GitHub commit → verify file created
- Trigger build hook manually → verify rebuild → athlete appears in leaderboard
- Delete test file, verify rebuild removes athlete from leaderboard
- Covers the data pipeline without needing OAuth at all

**Phase C: Full OAuth Round-Trip**
- Set Strava app callback domain to `mkultragravel.netlify.app`
- Run Tier 3 full end-to-end test with developer's own Strava account
- Verify each step: redirect, consent, callback, segment matching (or crafted activity test)
- Submit confirmation page → GitHub commit → rebuild → leaderboard

**Phase D: Webhook Registration + Deauth**
- Register Strava webhook subscription via curl
- Verify subscription registered (GET push_subscriptions)
- Test deauth with crafted POST using test athlete ID
- Verify file deleted + rebuild triggered

**Phase E: App Review Submission**
- Prepare screenshots of working pipeline for Strava review
- Submit app for review (required to allow non-developer athletes)
- 7-10 business day wait

**Rationale for this order:**
- Phases A-D can be completed with only the developer's Strava account (1-athlete limit is not a constraint)
- Phase B comes before Phase C because it verifies GitHub + rebuild independently, so failures in Phase C can be isolated to the OAuth layer
- Phase D comes last because webhook requires a deployed, verified endpoint
- Phase E is last because screenshots showing a working pipeline support the review application

---

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| Strava 1-athlete limit | HIGH | Strava official FAQ + developers.strava.com docs |
| Localhost redirect URI allowed | HIGH | Strava authentication docs ("localhost and 127.0.0.1 are white-listed") |
| Single callback domain per app | MEDIUM | Community forum discussion; one official confirmation |
| netlify dev HTTP-only default | HIGH | Netlify CLI docs — HTTPS requires cert configuration |
| Secure cookie failure over HTTP | HIGH | MDN spec + community reports |
| GitHub API rate limits (5000/hr) | HIGH | GitHub REST API docs |
| Webhook subscription process | HIGH | Strava webhook docs + community confirmation |
| App review timeline (7-10 days) | MEDIUM | Strava docs; actual timing may vary |

---

## Sources

- [Strava Authentication Docs](https://developers.strava.com/docs/authentication/) — OAuth flow, localhost whitelist, scope requirements
- [Strava Getting Started](https://developers.strava.com/docs/getting-started/) — Rate limits, default constraints
- [Strava Webhook Events API](https://developers.strava.com/docs/webhooks/) — Subscription registration, handshake protocol
- [Strava API FAQ](https://communityhub.strava.com/developers-knowledge-base-14/strava-api-faq-12906) — 1-athlete limit, single player mode
- [Strava Callback Domain Discussion](https://communityhub.strava.com/developers-api-7/callback-domain-localhost-vs-staging-12001) — Single domain constraint
- [Netlify CLI Local Development](https://docs.netlify.com/cli/local-development/) — netlify dev behavior, port, HTTPS config
- [Netlify Functions Environment Variables](https://docs.netlify.com/build/functions/environment-variables/) — Variable injection in functions
- Direct codebase inspection: `netlify/functions/strava-auth.js`, `strava-callback.js`, `submit-result.js`, `strava-webhook.js`
- Direct codebase inspection: `src/lib/scoring.js`, `public/data/results/schema.json`, `netlify.toml`
