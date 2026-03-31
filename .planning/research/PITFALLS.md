# Domain Pitfalls

**Domain:** Strava OAuth + Netlify Functions + GitHub API — go-live deployment
**Project:** MK Ultra Gravel — Strava OAuth submission milestone
**Researched:** 2026-03-31
**Confidence:** HIGH (primary sources: Strava official docs, Netlify official docs, GitHub community discussions, direct code inspection)

---

## Context

This file covers pitfalls specific to taking the existing Strava OAuth submission flow from
development to production. The codebase already exists: four Netlify Functions v1 (`strava-auth.js`,
`strava-callback.js`, `submit-result.js`, `strava-webhook.js`) using the CSRF double-submit cookie
pattern, a GitHub Contents API commit flow, and a fire-and-forget Netlify build hook trigger.

The risk area is configuration — specifically the gap between local dev (where env vars come from
`.env`, functions run via `netlify dev`, and OAuth redirects to localhost) and production (where env
vars must be set in Netlify dashboard, the callback domain must match Strava's registration, and
CSRF cookies must survive the Strava round-trip in all browsers).

---

## Critical Pitfalls

Mistakes that silently break the OAuth flow or prevent submission from working at all.

---

### Pitfall 1: STRAVA_REDIRECT_URI Not Set in Netlify Dashboard — Breaks Every OAuth Attempt

**What goes wrong:**
`strava-auth.js` reads `process.env.STRAVA_REDIRECT_URI` to build the Strava authorization URL.
The local `.env` file (confirmed by inspection) does NOT contain `STRAVA_REDIRECT_URI` — only
`STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` are present. If `STRAVA_REDIRECT_URI` is also missing
from the Netlify dashboard environment variables, `process.env.STRAVA_REDIRECT_URI` is `undefined`,
and the Strava authorization URL is built with `redirect_uri=undefined`. Strava rejects this with a
`redirect_uri invalid` error before the user even sees the consent screen.

**Why it happens:**
Developers correctly know to set `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` because those are
the obvious Strava credentials. `STRAVA_REDIRECT_URI` is easy to overlook because it feels like a
URL you choose yourself rather than a secret — but it must be a Netlify environment variable because
it changes between local (`http://localhost:8888/.netlify/functions/strava-callback`) and production
(`https://mkultragravel.netlify.app/.netlify/functions/strava-callback`).

**Warning signs:**
- Strava shows "redirect_uri invalid" or "Bad Request" immediately after being redirected to the
  consent page — before the user can click anything
- The Strava authorization URL in the browser address bar contains `redirect_uri=undefined`
- No error visible in Netlify Function logs (the function executes and redirects fine — the
  rejection happens on Strava's side)

**Prevention:**
Set all five required environment variables in Netlify dashboard under Site > Environment variables
with scope "Functions" (not Build-only):
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_REDIRECT_URI` = `https://mkultragravel.netlify.app/.netlify/functions/strava-callback`
- `GITHUB_TOKEN`
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `NETLIFY_BUILD_HOOK`
- `STRAVA_VERIFY_TOKEN` (webhook only)

Verify by adding a minimal validation log at function startup:
```javascript
const required = ['STRAVA_CLIENT_ID', 'STRAVA_CLIENT_SECRET', 'STRAVA_REDIRECT_URI'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) console.error('Missing env vars:', missing);
```

**Phase:** Environment setup — must be done before any live testing.

**Confidence:** HIGH — confirmed by direct inspection of `.env` (only 4 vars present, STRAVA_REDIRECT_URI absent) and `strava-auth.js` line 37 (`redirect_uri: process.env.STRAVA_REDIRECT_URI`).

---

### Pitfall 2: Strava Authorization Callback Domain Mismatch — OAuth Rejects Redirect URI

**What goes wrong:**
Strava's app settings have an "Authorization Callback Domain" field that acts as a domain allowlist.
The `redirect_uri` you pass in the OAuth request must be within this registered domain. If the
Callback Domain is set to `localhost` (for development) and not updated to `mkultragravel.netlify.app`
for production, every OAuth attempt from the live site returns `redirect_uri invalid`.

The Strava community has documented two additional sub-pitfalls:
1. **Subdomain requirement**: The domain field must contain exactly one subdomain. You cannot use a
   wildcard. `mkultragravel.netlify.app` must be entered exactly — `netlify.app` alone does not cover it.
2. **Propagation delay**: After updating the Authorization Callback Domain in the Strava developer
   console, changes can take time to propagate. Some developers report intermittent failures for
   minutes to hours after updating.

**Why it happens:**
Developers set Callback Domain to `localhost` during development, ship to production, and forget to
update it. Or they update it but test immediately before propagation completes.

**Warning signs:**
- Strava shows `redirect_uri invalid` on the live site but not locally
- Error appears after updating the domain, then disappears later (propagation)
- URL in Strava auth page address bar shows the correct redirect_uri but Strava still rejects

**Prevention:**
1. Before any live end-to-end test, verify `strava.com/settings/api` → "Authorization Callback
   Domain" = `mkultragravel.netlify.app` (no `https://`, no path, no trailing slash)
2. After updating, wait 5 minutes before testing
3. Test from a private/incognito window to avoid any cached OAuth state

**Phase:** Environment setup, before first live end-to-end test.

**Confidence:** HIGH — Strava official docs confirm domain field requirement; community discussions
confirm subdomain specificity requirement and propagation delays (Source: Strava Community Hub
threads on Authorization Callback Domain).

---

### Pitfall 3: Netlify Functions v1 Env Vars Scoped to "Build" Instead of "Functions" — Process.env Returns Undefined

**What goes wrong:**
Netlify has two relevant scopes for environment variables: "Build" (available during `npm run build`
on the build image) and "Functions" (available at runtime in deployed functions). An env var set with
Build scope only is NOT available in functions at request time — `process.env.GITHUB_TOKEN` returns
`undefined` even though the variable is set in the dashboard.

This is separate from the confirmed Netlify Functions v2 env var bug (where variables intermittently
return undefined). Functions v1 (`exports.handler`) is stable for env var access, but only if the
scope is set correctly.

**Why it happens:**
The Netlify dashboard defaults may prompt you to select scope, and "Build" is the first option.
Developers not familiar with the scope distinction set all variables to Build scope.

**Warning signs:**
- Function logs show `Missing required GitHub environment variables` despite having set them
- The submission succeeds locally (`.env` file) but fails in production with 500 errors
- `console.log(process.env.GITHUB_TOKEN)` in function logs prints `undefined`

**Prevention:**
- Set all function-runtime env vars with scope "Functions" (or "All" if unsure)
- Netlify official docs: env vars for functions must not be restricted to Build scope only
- After setting, trigger a new deploy — env var changes to functions require a fresh deployment
  to take effect

**Phase:** Environment setup.

**Confidence:** HIGH — Netlify official docs explicitly state functions env vars are separate from
build env vars; confirmed by Netlify community (Source: Netlify Docs "Environment variables and
functions").

---

### Pitfall 4: CSRF Cookie Not Sent on Strava Callback in Safari — CSRF Check Fails for Some Users

**What goes wrong:**
The CSRF pattern works as follows: `strava-auth.js` sets `strava_oauth_state` cookie with
`SameSite=Lax`, the user is redirected to Strava (cross-site), and when Strava redirects back,
`strava-callback.js` expects the cookie to be present to verify the nonce.

`SameSite=Lax` is supposed to allow cookies on top-level GET navigations (exactly what OAuth
redirects are). However, WebKit/Safari has a confirmed bug where `SameSite=Lax` cookies are NOT
sent on cross-site redirects in certain circumstances. This causes the CSRF nonce check to fail
(`cookieNonce !== nonce`) and the user gets the "Invalid or missing state parameter" error page —
even when the OAuth flow succeeded on Strava's side.

The bug was reported in WebKit and marked "CONFIGURATION CHANGED" (June 2021) but continued to
be reproduced in Safari 15.1 and later versions according to community reports.

**Why it happens:**
The OAuth redirect chain is: `mkultragravel.netlify.app` → `strava.com` → (redirect back) →
`mkultragravel.netlify.app/.netlify/functions/strava-callback`. The final redirect is technically
a cross-site navigation from strava.com, and Safari's Lax handling differs from Chrome/Firefox.

**Warning signs:**
- "Invalid or missing state parameter" error page reported by users on iPhone/Mac Safari
- The error is reproducible on Safari but not on Chrome or Firefox
- Your own testing passes (if you tested on Chrome) but a real user on Safari fails

**Prevention:**
The existing implementation uses `SameSite=Lax`, which is correct for OAuth and is the recommended
setting. The Safari issue is a browser bug, not a code bug. Mitigation options:

Option A (Lowest risk): Accept the Safari edge case and provide clear user messaging: "If you see
this error on Safari, try again — the second attempt usually succeeds." The OAuth state cookie is
re-created fresh each time the user starts a new OAuth flow from /submit.

Option B (Eliminates bug): Replace cookie-based CSRF with state-only verification. Since the
state parameter already encodes the nonce in a signed/opaque base64url payload, and Strava sends
the state back verbatim, you can verify CSRF by comparing the state payload's nonce against a
short-term in-memory or KV store. However, this requires server-side state storage and adds
complexity.

Option C (Partial mitigation): Add an HTML meta refresh or JavaScript intermediate page at the
callback that re-triggers the cookie request from a first-party context. Adds latency.

For a low-traffic event with self-service submissions, Option A is likely acceptable. Document
the behavior so support queries can be answered.

**Phase:** Testing phase — test explicitly in Safari before launch.

**Confidence:** MEDIUM — WebKit bug #219650 confirmed and still unresolved through Safari 15.1;
SameSite=Lax cookie behavior in OAuth redirects is a known cross-browser issue.

---

### Pitfall 5: GitHub Contents API 409 Conflict on Simultaneous Submissions — Athlete Update Lost

**What goes wrong:**
`submit-result.js` uses a GET-then-PUT pattern to update an athlete's JSON file. If the same
athlete submits twice in rapid succession (double-click, browser refresh, tab duplicate), two
function invocations run concurrently. Both GET the file (or both see 404), both attempt PUT with
the same SHA (or both attempt create). The second PUT returns 409 Conflict. The code handles this
case (returns a 409 page to the user), but the user's second submission is silently dropped.

More critically: if two DIFFERENT athletes submit at the same time and each triggers a GitHub
commit, the commits can conflict if GitHub's internal state sees a branch divergence. The Contents
API is designed for serial use — GitHub documentation explicitly states that parallel calls to the
contents create/update endpoint will conflict and must be serialized.

**Why it happens:**
Each Netlify Function invocation is independent. There is no shared mutex or queue. Ten athletes
submitting at 9:00 AM on event day triggers ten simultaneous GitHub API calls.

**Warning signs:**
- Some athletes report their submission page showed success but they don't appear in results
- 409 errors visible in Netlify Function logs
- Git history shows fewer commits than submission attempts

**Prevention:**
- The existing 409 handler (line 226 of `submit-result.js`) correctly shows a "try again" page —
  this is the right behavior for the user-facing case
- For the broader race condition: per-athlete files (`athletes/{athleteId}.json`) means two
  DIFFERENT athletes writing DIFFERENT files do NOT conflict at the GitHub API level — each PUT
  targets a different path. The 409 only occurs if the same athlete submits twice concurrently.
- This means the actual production risk is low unless a single athlete double-submits
- For the event scenario (50-200 submissions, spread over weeks), serial conflicts are unlikely
- Explicitly test the retry path: submit, get the 409 conflict page, click "Try Again", verify
  the second attempt succeeds

**Phase:** Testing — verify the 409 retry path works before launch.

**Confidence:** HIGH — GitHub documentation explicitly confirms parallel Contents API calls conflict;
direct code inspection confirms per-athlete file paths (which eliminates cross-athlete conflicts).

---

## Moderate Pitfalls

Mistakes that cause delays, failed submissions, or user confusion — but are recoverable.

---

### Pitfall 6: Strava Webhook Subscription Registration Fails Silently — Deauthorization Data Not Deleted

**What goes wrong:**
The `strava-webhook.js` function handles deauthorization events and deletes athlete data. But the
webhook subscription itself must be registered via a one-time curl command AFTER the function is
deployed. If this step is skipped, the function exists but Strava never sends events to it. Athletes
who deauthorize the app will NOT have their data deleted within the required 48-hour TOS window.

Additionally, Strava enforces "one subscription per application" — if a subscription was registered
previously (e.g., during development with a different callback URL), attempting to re-register
returns a 422 error. The old subscription points to the wrong URL and must be deleted first.

**Why it happens:**
The webhook subscription registration is a manual operational step documented only in the function's
source code comment. It is easy to miss when following a deployment checklist. There is no
automated verification that the subscription exists.

**Warning signs:**
- Running `curl https://www.strava.com/api/v3/push_subscriptions -H "Authorization: Bearer ACCESS_TOKEN"`
  returns an empty array (no subscription)
- Or returns a subscription with a callback_url pointing to a development URL
- Athlete data persists in GitHub after they deauthorize the app

**Prevention:**
Include webhook subscription verification as an explicit step in the go-live deployment checklist:

```bash
# Verify current subscription (should show mkultragravel.netlify.app callback URL)
curl https://www.strava.com/api/v3/push_subscriptions \
  -H "Authorization: Bearer STRAVA_ACCESS_TOKEN"

# If no subscription or wrong URL, delete old (if exists) and re-register:
# DELETE: curl -X DELETE "https://www.strava.com/api/v3/push_subscriptions/ID" ...
# CREATE: curl -X POST https://www.strava.com/api/v3/push_subscriptions \
#   -F client_id=CLIENT_ID -F client_secret=CLIENT_SECRET \
#   -F callback_url=https://mkultragravel.netlify.app/.netlify/functions/strava-webhook \
#   -F verify_token=STRAVA_VERIFY_TOKEN
```

Test the handshake by triggering a validation GET manually and checking function logs for the
`hub.challenge` echo response.

**Phase:** Post-deploy checklist.

**Confidence:** HIGH — Strava official webhook docs confirm one subscription limit and 422 behavior;
the function code comment documents the registration curl command.

---

### Pitfall 7: Strava Webhook Handshake Fails Due to STRAVA_VERIFY_TOKEN Mismatch — Subscription Can't Be Registered

**What goes wrong:**
During webhook subscription registration, Strava immediately sends a GET request to the callback URL
with the `hub.verify_token` value you provided in the registration curl. The function must respond
200 with `{"hub.challenge": "..."}` within 2 seconds. If `STRAVA_VERIFY_TOKEN` in the Netlify
dashboard does not match the value used in the registration curl command, the function returns 403
and the subscription registration fails entirely.

Because Netlify Functions can have a cold start (the container is not warm), the first invocation
of the function may take 1-3 seconds just to initialize — eating into the 2-second window.

**Why it happens:**
The verify token is chosen by the developer. If the Netlify env var is set to one value but the
registration curl uses a different string (typo, copy-paste error, mismatch between what was set
in the dashboard vs what was used in the terminal), the handshake fails.

**Warning signs:**
- Webhook registration curl returns an error like "Invalid verify_token"
- Netlify Function logs show the GET was received but returned 403 (wrong verify token)
- No logs at all (function cold started after the 2-second window expired)

**Prevention:**
1. Set `STRAVA_VERIFY_TOKEN` in Netlify dashboard BEFORE running the registration curl
2. Copy the exact value from the Netlify dashboard into the curl command — do not type it
3. If the registration fails, the function is already deployed (warm), so retry immediately
4. Verify the function is returning 200 for a known-good verify token before running the
   registration curl: `curl "https://mkultragravel.netlify.app/.netlify/functions/strava-webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=testchallenge123"` — should return `{"hub.challenge":"testchallenge123"}`

**Phase:** Post-deploy checklist.

**Confidence:** HIGH — Strava webhook docs confirm 2-second window; function code inspection confirms
exact string match is required for the verify token check.

---

### Pitfall 8: Strava Rate Limits Reached During High-Traffic Event Day — Submissions Return 429

**What goes wrong:**
Strava rate limits are per-application (not per-user): 100 read requests per 15 minutes, 1,000 per
day. Each athlete submission triggers two API calls: one token exchange POST (`/oauth/token`) and one
activity GET (`/activities/{id}?include_all_efforts=true`).

At 200 submissions/day, that is 200 activity GETs plus 200 token POSTs = 400 total API calls, well
within the 1,000/day daily limit. However, if many athletes submit within the same 15-minute window
(e.g., after the race finish line), 50+ concurrent submissions would each make 1 GET = 50+ requests
in 15 minutes, approaching the 100 GET/15-minute window.

The current code does not read or log the `X-RateLimit-Usage` response headers from Strava, making
it impossible to diagnose rate limit issues in production without instrumenting them.

**Why it happens:**
Event-driven submission patterns create burst traffic. Race finishers tend to check their times and
submit immediately, clustering submissions in short windows.

**Warning signs:**
- Activity fetch returns 429 or a JSON error body with `message: "Rate Limit Exceeded"`
- The callback function shows "Failed to fetch activity from Strava" errors in logs without
  a clear cause
- Errors cluster in 15-minute windows, then stop

**Prevention:**
- Add `X-RateLimit-Usage` header logging in `strava-callback.js` when the activity fetch responds:
  ```javascript
  console.log('Strava rate limit:', activityRes.headers.get('X-RateLimit-Usage'));
  ```
- For the event scale (50-200 total submissions), rate limits are unlikely to be a problem
- If rate limits become an issue post-event (bulk re-submissions, debugging runs), space out
  manual test submissions across 15-minute windows
- The 1,000/day limit resets at midnight UTC — large batch testing should span multiple days

**Phase:** Testing — add rate limit header logging before production testing.

**Confidence:** HIGH — Strava official docs confirm rate limits (100 GETs/15min, 1000/day per-app);
the specific numbers are low enough that normal event traffic is fine but burst traffic can be a concern.

---

### Pitfall 9: Athlete Activity Not Visible to Their Own OAuth Token — 403 on Activity Fetch

**What goes wrong:**
`strava-callback.js` fetches the activity using the athlete's own access token. This works for
activities the athlete owns. However, there are edge cases where the fetch returns 403:

1. **Activity set to "Only You" visibility**: The activity exists but the `activity:read_all` scope
   is required (which is already requested) — however, if the athlete's Strava account has a
   restriction (e.g., under-18 account), API access may be limited.
2. **Activity does not belong to the authenticated athlete**: The athlete submits someone else's
   activity URL. The token is for Athlete A but the activity ID belongs to Athlete B — Strava
   returns 403.
3. **Segment matching disabled at account level**: Athletes can disable segment matching entirely
   in their Strava settings. In this case, `segment_efforts` in the API response is present but
   may be empty even for an activity recorded on the exact course.

The third case is the most likely to confuse athletes submitting legitimate rides.

**Why it happens:**
The submission form only validates the activity URL format, not whether the URL matches the
authenticated athlete's account. Athletes may copy the wrong URL (a friend's activity, a Strava
route page rather than an activity).

**Warning signs:**
- User sees "Failed to fetch activity" error after successful OAuth consent
- User sees "No Matching Event Segments Found" for what looks like a valid course activity
- Netlify function logs show 403 from the activity fetch endpoint

**Prevention:**
- The current 403 handling is correct: returns an error page with instructions to verify the
  activity URL belongs to their account
- Add a check: after a successful token exchange, compare `tokenData.athlete.id` against the
  activity's owner (the activity response includes an `athlete.id` field) — if they don't match,
  return a specific "This activity does not belong to your Strava account" error
- For the segment matching disabled case: the error message "No Matching Event Segments Found"
  already lists "GPS data and segment matching enabled on Strava" as a thing to check. This is
  adequate.

**Phase:** Testing — add the athlete ID cross-check if time permits; otherwise the existing error
messages are serviceable.

**Confidence:** MEDIUM — 403 behavior for own-account private activities is verified in Strava docs;
segment matching disabled case is inferred from Strava support documentation (segment matching can
be toggled per-user).

---

### Pitfall 10: GitHub PAT Expires Before Event Day — All Submissions Fail With 401

**What goes wrong:**
The `GITHUB_TOKEN` environment variable holds a fine-grained Personal Access Token (PAT). GitHub
fine-grained PATs can be created with or without an expiry. If created with a 30, 60, or 90-day
expiry and not rotated before event day (June 7, 2026), every `submit-result.js` call to the GitHub
Contents API returns 401 Unauthorized. Submissions fail silently from the user's perspective (they
see "Failed to save results").

GitHub does send email notifications when PATs are about to expire, but those emails can be missed.

**Why it happens:**
PATs are created during initial setup, then forgotten. If the token was created in, say, March 2026
with a 90-day expiry, it expires before event day.

**Warning signs:**
- GitHub Contents API returns 401 in function logs
- "Failed to save results" error shown to submitting athletes
- No entries appearing in the GitHub repo despite successful OAuth

**Prevention:**
- Create the GitHub PAT with NO expiry (fine-grained PATs on personal accounts support no-expiry
  as of late 2024 GA)
- Or create with a 1-year expiry and calendar a rotation reminder for May 2027 (after event day)
- Required permissions: Repository "Contents" = Read and Write on the mkUltraGravel repo only
- Verify the token works before launch by making a test GET to the GitHub API:
  ```bash
  curl -H "Authorization: Bearer GITHUB_TOKEN" \
    https://api.github.com/repos/Sheppardjm/mkUltraGravel/contents/public/data/results/athletes/
  ```
  Should return 200 (empty array if no files yet).

**Phase:** Environment setup.

**Confidence:** HIGH — GitHub changelog confirms no-expiry option for personal fine-grained PATs
(GA October 2024); token expiry is a documented production failure mode.

---

### Pitfall 11: /api/* Rewrite Sends Strava's Callback to Wrong URL — redirect_uri Mismatch

**What goes wrong:**
The `netlify.toml` rewrite rule maps `/api/*` to `/.netlify/functions/:splat` with status 200. This
is an internal server-side rewrite — the browser address bar shows `/api/strava-callback` but the
function is `/.netlify/functions/strava-callback`.

`STRAVA_REDIRECT_URI` is set to `https://mkultragravel.netlify.app/.netlify/functions/strava-callback`
(direct function URL). Strava redirects to this exact URL, bypassing the `/api/*` rewrite. This is
correct. The pitfall occurs if someone sets `STRAVA_REDIRECT_URI` to
`https://mkultragravel.netlify.app/api/strava-callback` (the rewritten path).

With `STRAVA_REDIRECT_URI=/api/strava-callback`, here is what happens: Strava redirects to
`/api/strava-callback`, the Netlify rewrite transparently serves `/.netlify/functions/strava-callback`,
the function receives the code and state parameters, and the flow works. BUT: the cookie set by
`strava-auth.js` uses `Path=/`, which covers all paths. The CSRF cookie IS sent. This particular
combination may actually work.

However, if the domain the user is on when starting the OAuth differs from the redirect domain
(e.g., using a Netlify preview deploy URL for the start but the production URL for the callback),
the redirect_uri would not match what Strava has registered.

**Why it happens:**
The two equivalent paths (`/api/strava-callback` vs `/.netlify/functions/strava-callback`) can
cause confusion when setting env vars. The rewrite is transparent to the function but the redirect_uri
must match exactly what Strava expects.

**Warning signs:**
- redirect_uri invalid from Strava on production but not locally
- The URL in the Strava consent page address bar differs from what is registered

**Prevention:**
- Use the direct function URL `https://mkultragravel.netlify.app/.netlify/functions/strava-callback`
  as the value of `STRAVA_REDIRECT_URI` — not the `/api/` alias
- This matches the function's actual URL and avoids any ambiguity about rewrite behavior
- Register this exact same URL in `strava.com/settings/api` Authorization Callback Domain

**Phase:** Environment setup.

**Confidence:** HIGH — verified by reading `netlify.toml` (status 200 rewrite, not 302 redirect)
and `strava-auth.js` (uses `process.env.STRAVA_REDIRECT_URI` directly).

---

### Pitfall 12: Netlify Functions v2 Env Var Bug — Do Not Migrate to v2 During This Milestone

**What goes wrong:**
As of March 27-28, 2026, a confirmed Netlify bug causes user-defined environment variables to be
intermittently absent from `process.env` in Functions v2 (ES module `export default` style). This
means `GITHUB_TOKEN`, `STRAVA_CLIENT_SECRET`, and all other credentials return `undefined` on some
invocations, causing unpredictable failures.

The existing codebase already uses Functions v1 (`exports.handler`) throughout, with comments
documenting this decision. The pitfall is inadvertently converting a function to v2 syntax during
refactoring (e.g., changing `exports.handler = async (event) =>` to `export default async (event) =>`
or adding an `export` keyword).

**Why it happens:**
Refactoring for style consistency, auto-complete suggestions, or following newer Netlify documentation
examples can introduce v2 syntax without realizing it.

**Warning signs:**
- A function that worked starts failing intermittently with "Server configuration error"
- `process.env` values are undefined on some invocations but not others
- No deterministic failure pattern — it passes testing but fails in production randomly

**Prevention:**
- All functions must use `exports.handler = async (event) => {` — not `export default`
- Add a lint rule or CI check: `grep -r "export default" netlify/functions/` should return nothing
- The netlify.toml `node_bundler = "esbuild"` handles CommonJS fine — no reason to migrate to ESM

**Phase:** Any refactoring phase.

**Confidence:** HIGH — directly confirmed via Netlify support forum thread from 2026-03-28 about
the v2 env var bug; codebase already uses v1 throughout with documented rationale.

---

## Minor Pitfalls

Mistakes that cause friction or edge-case failures but do not break the core flow.

---

### Pitfall 13: Netlify Build Hook Triggers Rebuild Before GitHub Commit Fully Propagates

**What goes wrong:**
`submit-result.js` fires the Netlify build hook immediately after the GitHub PUT succeeds. However,
GitHub's CDN for raw file serving (`raw.githubusercontent.com`) may not reflect the new commit for
several seconds after the API returns success. The Astro prebuild script reads athlete JSON files
from the repository — if the build starts before GitHub propagates the new file, the new athlete
may be absent from the built site.

The build hook is intentionally fire-and-forget. If a build is already in progress when the hook
fires, Netlify queues the request and runs one additional build after the current one completes.
This natural queuing means the propagation issue is actually mitigated by the build queue delay.

**Why it happens:**
The GitHub Contents API returns 201 Created/200 OK as soon as the commit is recorded, but file
serving through Netlify's `raw.githubusercontent.com` fetch path (used by the prebuild script) has
a propagation delay.

**Warning signs:**
- Newly submitted athletes are absent from the deployed site immediately after submission
- The next rebuild (triggered by a subsequent submission) correctly includes them
- This is a transient issue that self-heals on the next build

**Prevention:**
- The fire-and-forget pattern is correct — do not add a delay or polling loop before triggering
  the hook (doing so would block the user's success page)
- If the prebuild script uses the GitHub API directly (rather than raw file serving), propagation
  is not an issue — the API reflects commits immediately
- Accept that there may be a 1-2 build lag for newly submitted athletes on days with very low
  submission volume (where the next build is far in the future)

**Phase:** Post-launch monitoring.

**Confidence:** MEDIUM — GitHub API propagation behavior is consistent with general CDN propagation
patterns; direct confirmation of the specific timing is LOW confidence.

---

### Pitfall 14: Node Version Mismatch Between Build and Functions Runtime

**What goes wrong:**
The project uses Volta (`"node": "22.22.2"` in `package.json`) and `.nvmrc` (pinned to `22`).
Netlify's default build image now uses Node 22 (upgraded February 2026). The functions runtime
also defaults to Node 22 for builds using Node 22.

However, if Netlify uses a different Node version for the build than for the function runtime —
for example, if `AWS_LAMBDA_JS_RUNTIME` is explicitly set to `nodejs20.x` in the dashboard — the
esbuild bundle compiled under Node 22 may have incompatible native module expectations. For this
project, all functions use only built-in Node modules (no native addons), so version mismatch is
lower risk.

The more practical risk: if the `AWS_LAMBDA_JS_RUNTIME` environment variable was explicitly set to
an older value during a previous configuration and not cleaned up, functions may run on Node 18 or
20 rather than 22.

**Warning signs:**
- Function startup logs show Node version in stack traces that differs from expected
- Syntax errors in function runtime for features used that require newer Node (e.g., if any
  code path uses Node 22+ features)

**Prevention:**
- Do not set `AWS_LAMBDA_JS_RUNTIME` manually unless needed
- Verify the Node version in function logs on first successful invocation
- The existing codebase only uses `Buffer`, `crypto`, `fetch` (all available in Node 18+), so
  version mismatch would not cause functional failures for this specific implementation

**Phase:** Environment setup verification.

**Confidence:** MEDIUM — Netlify announced Node 22 default upgrade for February 2026; the functions
use no Node version-specific features, so this is low-severity even if it occurs.

---

### Pitfall 15: approval_prompt=auto — Returning Athletes Skip Consent Screen, Previous Scope Accepted

**What goes wrong:**
`approval_prompt=auto` (the current value in `strava-auth.js` line 39) means: if the athlete
previously authorized this app with `activity:read_all`, Strava skips the consent screen and
immediately redirects back with an authorization code. This is desirable for re-submissions.

The potential issue: if an athlete originally authorized the app with a different (narrower) scope
(e.g., during a previous version of the app that used `activity:read`), `approval_prompt=auto`
will NOT show the consent screen again even though the requested scope has changed. The returned
access token will have the OLD narrower scope. The activity fetch will succeed (if the activity is
public) but `include_all_efforts` may return limited data.

In practice: the current app has always requested `activity:read_all`. This pitfall only applies
if scope was previously different.

**Why it happens:**
Strava caches the athlete's consent for a given app. `auto` means "use cached consent if available."
Scope upgrades require `approval_prompt=force` to force the consent screen to reappear.

**Warning signs:**
- Athlete reports successful OAuth but the activity has fewer matching segments than expected
- The token exchange response includes a `scope` field — log it and verify it includes
  `activity:read_all`
- This would manifest as "No Matching Event Segments Found" for valid course activities

**Prevention:**
- Log the `scope` field from the token exchange response to verify `activity:read_all` is included:
  ```javascript
  console.log('Token scope:', tokenData.scope);
  ```
- If scope issues appear, use `approval_prompt=force` to require re-consent
- For a new app registration (no existing authorized users), this pitfall cannot occur

**Phase:** Testing.

**Confidence:** MEDIUM — Strava official docs confirm `approval_prompt` behavior; scope inheritance
behavior on re-authorization is consistent with standard OAuth 2.0 semantics.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Environment setup | Pitfall 1: STRAVA_REDIRECT_URI not set | Set all 8 env vars in Netlify dashboard, Functions scope |
| Environment setup | Pitfall 2: Strava Callback Domain not updated | Update `strava.com/settings/api` to `mkultragravel.netlify.app` |
| Environment setup | Pitfall 3: env var scoped to Build only | Set scope to Functions or All |
| Environment setup | Pitfall 10: GitHub PAT expires | Create with no expiry on personal account |
| Environment setup | Pitfall 12: v2 syntax introduced | Verify all functions use `exports.handler` |
| Pre-deploy testing | Pitfall 4: Safari CSRF cookie bug | Test in Safari; document known edge case |
| Pre-deploy testing | Pitfall 9: 403 on activity fetch | Test with activity URL from wrong account |
| Pre-deploy testing | Pitfall 15: approval_prompt=auto scope | Log token scope field on exchange |
| Post-deploy ops | Pitfall 6: webhook subscription not registered | Run verification curl after first deploy |
| Post-deploy ops | Pitfall 7: verify token mismatch at registration | Pre-warm function, copy token exactly |
| Production monitoring | Pitfall 5: 409 conflict on simultaneous submit | Confirm 409 retry path works end-to-end |
| Production monitoring | Pitfall 8: Strava rate limits | Log X-RateLimit-Usage on activity fetch |
| Production monitoring | Pitfall 13: build hook before commit propagates | Accept 1-build lag; fire-and-forget is correct |
| Any refactoring | Pitfall 11: redirect_uri uses /api/ alias | Use direct /.netlify/functions/ URL only |
| Any refactoring | Pitfall 14: Node version mismatch | Don't set AWS_LAMBDA_JS_RUNTIME manually |

---

## Sources

**Strava Official Documentation (HIGH confidence):**
- [Strava Authentication Docs](https://developers.strava.com/docs/authentication/) — redirect URI, approval_prompt, scope, token expiry
- [Strava Rate Limits](https://developers.strava.com/docs/rate-limits/) — 100 GETs/15min, 1000/day, headers, 429 behavior
- [Strava Webhook Events API](https://developers.strava.com/docs/webhooks/) — 2-second validation window, 3 retry attempts, one subscription per app
- [Strava Segment Changes](https://developers.strava.com/docs/segment-changes/) — leaderboard access restrictions

**Strava Community (MEDIUM confidence — multiple reports corroborating):**
- [Strava Community: Authorization Callback Domain — subdomain only](https://communityhub.strava.com/developers-api-7/strava-authorization-callback-domain-only-allowing-top-level-domain-issue-1778)
- [Strava Community: Changing Authorization Callback Domain](https://communityhub.strava.com/developers-api-7/changing-authorization-callback-domain-11523)
- [Strava Community: approval_prompt behavior](https://communityhub.strava.com/developers-api-7/strava-oauth-approval-prompt-1604)
- [Strava Community: Token Exchange Error](https://communityhub.strava.com/developers-api-7/token-exchange-error-9439)

**Netlify Official Documentation (HIGH confidence):**
- [Netlify: Environment Variables and Functions](https://docs.netlify.com/build/functions/environment-variables/) — scope distinction, build vs functions
- [Netlify: Build Environment Variables](https://docs.netlify.com/build/configure-builds/environment-variables/) — scope options
- [Netlify: Functions Overview](https://docs.netlify.com/build/functions/overview/) — 60-second execution limit
- [Netlify: Build Hooks](https://docs.netlify.com/build/configure-builds/build-hooks/) — build hook triggering
- [Netlify: Node.js Default Upgrade to v22](https://answers.netlify.com/t/builds-functions-plugins-default-node-js-version-upgrade-to-22/135981) — February 2026 upgrade

**Netlify Community (MEDIUM confidence — confirmed multiple reports):**
- [Netlify: Functions v2 env var bug (March 2026)](https://answers.netlify.com/t/process-env-user-defined-variables-missing-in-scheduled-background-functions-and-async-workloads/160922)
- [Netlify: Functions v2 env var missing intermittently](https://answers.netlify.com/t/functions-v2-export-default-intermittently-missing-all-user-defined-env-vars-at-runtime/160958)
- [Netlify: Build deduplification behavior](https://answers.netlify.com/t/how-do-concurrent-builds-work/20086)

**GitHub Official Documentation (HIGH confidence):**
- [GitHub: Fine-grained PAT no-expiry option](https://github.blog/changelog/2024-10-18-new-pat-rotation-policies-preview-and-optional-expiration-for-fine-grained-pats/)
- [GitHub: Contents API conflict behavior](https://github.com/orgs/community/discussions/62198)

**WebKit Bug Tracker (MEDIUM confidence):**
- [WebKit Bug #219650: SameSite=Lax cookies not sent in Safari OAuth redirects](https://bugs.webkit.org/show_bug.cgi?id=219650)

**Auth0 Cross-Reference (MEDIUM confidence):**
- [Auth0: SameSite cookie attribute changes in OAuth flows](https://auth0.com/docs/manage-users/cookies/samesite-cookie-attribute-changes)

**Project Source Code (HIGH confidence — direct inspection):**
- `netlify/functions/strava-auth.js` — env var usage, cookie settings, STRAVA_REDIRECT_URI dependency
- `netlify/functions/strava-callback.js` — CSRF cookie check, activity fetch, 403/409 handling
- `netlify/functions/submit-result.js` — GitHub GET-then-PUT pattern, fire-and-forget build hook
- `netlify/functions/strava-webhook.js` — verify_token check, deauth deletion, one-subscription constraint
- `netlify.toml` — `/api/*` rewrite with status 200
- `.env` — confirmed STRAVA_REDIRECT_URI is NOT in local env file (only 4 Strava vars present)
- `package.json` — volta node 22.22.2

---

*Pitfalls research for: Strava OAuth go-live deployment on Netlify*
*Researched: 2026-03-31*
