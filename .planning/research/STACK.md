# Technology Stack — Strava Go-Live Deployment

**Project:** MK Ultra Gravel
**Milestone:** Strava OAuth go-live — getting existing integration code working end-to-end in production
**Researched:** 2026-03-31
**Scope:** Deployment configuration only. The code is built (v5.0). This research covers what must change in Netlify and Strava settings to make it work against the real API.
**Confidence:** HIGH — primary findings from official Strava developer documentation, Netlify official docs, and confirmed bug reports.

---

## Executive Summary

Three independent configuration domains must be resolved before the Strava integration is live:

1. **Strava app review** — The app starts locked to 1 athlete (the developer). Every additional athlete gets a 403 until the app is approved. Review takes 7-10 business days. Submit immediately.

2. **Netlify environment variables** — 7 env vars must be set via the Netlify UI (not netlify.toml). All must have scope set to "Functions". `STRAVA_REDIRECT_URI` must point to the production domain. The v2 env var bug that motivated v1 syntax choice was fixed 2026-03-30 but v1 remains the right choice for stability.

3. **Strava callback domain** — The "Authorization Callback Domain" in the Strava API app settings must be changed from `localhost` to the production domain (no protocol, no path).

Node.js version is already correct: the project has `.node-version: 22` and `"node": "22.22.2"` in volta config. Netlify's default since February 2025 is Node 22. No Node version config needed.

---

## Critical Finding: Athlete Limit Blocks Go-Live

**This is the most important finding in this document.**

All new Strava API apps start in "Single Player Mode" with a hard limit of **1 connected athlete** — the developer. Any additional athlete who attempts OAuth authorization receives:

```
HTTP 403 Forbidden
{"message": "Limit of connected athletes exceeded"}
```

This limit is enforced at Strava's authorization server, not in the app code. There is no workaround. The app **cannot accept any athlete submissions until the app is approved**.

After approval, Strava increases the limit to 999 connected athletes.

**Action required now:** Submit the app for review immediately. Do not wait until the rest of go-live is complete. Review takes 7-10 business days and is the longest-lead-time item on the critical path.

---

## Domain 1: Strava API App Review

### Submission

Submit at: `https://share.hsforms.com/1VXSwPUYqSH6IxK0y51FjHwcnkd8`

Required in the form:
- App description: what the app does and the problem it solves for athletes
- Expected number of connected users (be honest — this is a ~100-person cycling event)
- Confirmation of compliance with API Agreement and Brand Guidelines

Strava documentation notes: "Thorough, detailed submissions move through the process most efficiently." Include:
- Screenshot showing where Strava data appears in the app (the submit/results pages)
- Clear use-case: "Athletes submit their MK Ultra Gravel event activity for automatic scoring"
- No AI usage to disclose

Timeline: 7-10 business days. If no response after 10 business days, follow up at developers@strava.com with submission date and Client ID.

### Branding Requirements (must be in place before or at launch)

The Strava API Agreement requires these be implemented in the live site:

| Requirement | Where | Specifics |
|-------------|-------|-----------|
| "Connect with Strava" button | Submit page OAuth entry point | Must use official button asset from developers.strava.com/guidelines. Links to `https://www.strava.com/oauth/authorize`. Available in orange and white, PNG/SVG. |
| "Powered by Strava" or "Compatible with Strava" logo | Any page displaying Strava data (results, submit-confirm) | Official asset, not modified. Must be separate from and less prominent than the site's own branding. |
| "View on Strava" link | Anywhere the activity is displayed | Links back to the original Strava activity. Must be legible, identifiable as a link via bold, underline, or orange (#FC5200). |

**Not allowed:**
- Using "Strava" in the app name (MK Ultra Gravel passes this test)
- Suggesting official Strava endorsement
- Modifying Strava logos

Assets available at: `https://developers.strava.com/guidelines/`

### Dev Mode vs Approved App

There is no separate sandbox environment. Strava has one API. The only difference between a new (unapproved) app and an approved app is the athlete capacity limit:

| State | Athlete Limit | Behavior |
|-------|--------------|----------|
| New app (unapproved) | 1 (developer only) | All other OAuth attempts return 403 |
| Approved app | 999 | Full OAuth flow works for all athletes |
| High-scale (>999) | Negotiated | Requires partner program contact |

During review: if athletes try to connect, they will see a 403. This is expected and resolves upon approval.

After approval: the limit increase is automatic. No code changes needed. The same client ID and secret continue working.

### Rate Limits (production, applies to all apps)

Rate limits apply per-application regardless of approval status:

| Limit type | 15-minute window | Daily |
|------------|-----------------|-------|
| Overall requests | 200 | 2,000 |
| Non-upload read requests | 100 | 1,000 |

Windows reset at 0, 15, 30, 45 minutes past the hour. Daily resets at midnight UTC.

**Impact on submission flow:** Each athlete submission uses approximately 2-3 API calls:
1. Token exchange (POST `/oauth/token`) — counts against overall limit
2. Activity fetch (GET `/activities/{id}?include_all_efforts=true`) — counts against both overall and read limit

At the 100-person event scale, all submissions in a single day = ~200-300 calls. Well within the 1,000/day read limit and 2,000/day overall limit. Rate limits are not a concern at this scale.

**Monitoring:** Every API response includes rate limit headers:
```
X-RateLimit-Limit: 100,1000
X-RateLimit-Usage: 3,47
X-ReadRateLimit-Limit: 100,1000
X-ReadRateLimit-Usage: 3,47
```

The existing code should log or return these if a 429 occurs. A 429 from rate limiting at event scale would indicate a bug (e.g., retry loop), not a capacity problem.

---

## Domain 2: Netlify Deployment Configuration

### Environment Variables

All 7 env vars must be set in the Netlify UI (Site configuration → Environment variables). **Do not put them in `netlify.toml`** — env vars in netlify.toml are NOT available to Functions at runtime.

When setting each variable, verify the scope includes **"Functions"**. The Netlify UI allows per-scope assignment; if a variable is scoped only to "Builds" it will be undefined in function code at runtime.

| Variable | Value | Notes |
|----------|-------|-------|
| `STRAVA_CLIENT_ID` | From Strava API settings | Numeric string, e.g. "12345" |
| `STRAVA_CLIENT_SECRET` | From Strava API settings | Secret — never in code or git |
| `STRAVA_REDIRECT_URI` | `https://mkultragravel.netlify.app/api/strava-callback` | Full URL including path. Must match what strava-auth.js constructs. |
| `GITHUB_TOKEN` | Personal access token or fine-grained token | Needs repo contents write permission for `sheppardjm/mkUltraGravel` |
| `GITHUB_OWNER` | `sheppardjm` | GitHub username |
| `GITHUB_REPO` | `mkUltraGravel` | Repository name |
| `NETLIFY_BUILD_HOOK` | Build hook URL from Netlify | Format: `https://api.netlify.com/build_hooks/{id}` |

**STRAVA_REDIRECT_URI construction:** The existing `strava-auth.js` constructs the redirect URI from this env var. It must exactly match a URI that falls under the "Authorization Callback Domain" registered in the Strava API app settings. The callback domain in Strava's settings is just the domain (no protocol, no path) — but the redirect_uri parameter in the OAuth request must be the full URL.

### Authorization Callback Domain

In Strava API app settings (strava.com/settings/api):

- **During development:** Set to `localhost`
- **For production:** Change to `mkultragravel.netlify.app`

The field accepts only the domain name — no `https://`, no `/api/strava-callback` path. Strava validates that the `redirect_uri` parameter in each authorization request has a host that matches this registered domain.

**If using a custom domain (e.g., mkultragravel.com):** Update this field to the custom domain and update `STRAVA_REDIRECT_URI` env var to match. The two must stay in sync.

**Note on localhost + production:** The Strava app settings appear to accept only one callback domain at a time. Switching to production means local OAuth testing will fail (localhost would get "invalid redirect_uri"). Recommended approach: create a second Strava API app for development use, keeping the main app set to the production domain.

### Node.js Version

**No action required.** The project already has the correct Node version configured.

Evidence:
- `.node-version` file: `22` (in repo root)
- `package.json` volta config: `"node": "22.22.2"`
- Netlify's default build Node version has been v22 since February 24, 2025

Netlify Functions runtime automatically matches the build Node version. Since build uses Node 22 (from `.node-version`), functions run on `nodejs22.x` — AWS Lambda's Node 22 runtime. No `AWS_LAMBDA_JS_RUNTIME` environment variable needed.

**Note on AWS Lambda Node 20 EOL:** AWS Lambda's `nodejs20.x` runtime reaches end-of-security-patches and will block new function creation after August 2026. This project is already on Node 22 — no action needed.

### netlify.toml — Current Configuration is Correct

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

This configuration is correct and complete for the go-live milestone:

- `functions = "netlify/functions"` — points to the correct directory
- `node_bundler = "esbuild"` — correct; esbuild bundles faster and produces smaller artifacts. CommonJS `exports.handler` syntax is compatible with esbuild bundling.
- The `/api/*` redirect is what makes `STRAVA_REDIRECT_URI` use `/api/strava-callback` instead of `/.netlify/functions/strava-callback`.

**No changes to netlify.toml needed.**

### Netlify Functions v1 vs v2 — Decision Stands

The project uses v1 (`exports.handler`) syntax. This was chosen due to an active v2 env var bug where user-defined `process.env` vars returned `undefined` intermittently.

**Current status of the bug:** Netlify confirmed a fix was rolled out on 2026-03-30. The original reporter confirmed resolution on 2026-03-31.

**Recommendation: Keep v1 syntax.** The fix is 24 hours old as of this research. There is no benefit to migrating to v2 before go-live — it introduces risk with zero functional gain. The v1 syntax is fully supported, not deprecated, and works correctly with Node 22 and esbuild bundling.

If/when migration to v2 is desired post-launch, the migration is mechanical: `exports.handler = async (event) =>` becomes `export default async (request, context) =>` with Request/Response API changes.

---

## Domain 3: OAuth Scope

**No changes needed.** The `activity:read_all` scope is correct.

Verification of why `activity:read_all` is required (not `activity:read`):

- `activity:read` — access to activities the athlete has set as public or followers-only, excluding privacy zones
- `activity:read_all` — same as above, **plus** activities set to "Only You" visibility, **plus** privacy zone data

MK Ultra Gravel participants may have their activity set to private ("Only You"). The event requires reading the activity regardless. `activity:read_all` is the correct scope.

Additionally, `include_all_efforts=true` on the activity fetch — which retrieves all segment efforts including those on hidden segments — requires the athlete to be the owner of the activity (which they always are in this OAuth flow). The scope does not affect this; ownership does. This is confirmed as working correctly for the activity owner regardless of scope.

---

## Deployment Checklist

In dependency order:

### Immediate (do now, 7-10 business day lead time)
- [ ] Submit app for Strava review at the HubSpot form URL above
- [ ] Add branding assets to the live site (Connect with Strava button, Powered by Strava logo, View on Strava links)

### Configuration (can do in parallel with waiting for review)
- [ ] Update Strava API app settings: change "Authorization Callback Domain" from `localhost` to `mkultragravel.netlify.app`
- [ ] Set all 7 env vars in Netlify UI with scope "Functions":
  - [ ] `STRAVA_CLIENT_ID`
  - [ ] `STRAVA_CLIENT_SECRET`
  - [ ] `STRAVA_REDIRECT_URI` = `https://mkultragravel.netlify.app/api/strava-callback`
  - [ ] `GITHUB_TOKEN`
  - [ ] `GITHUB_OWNER`
  - [ ] `GITHUB_REPO`
  - [ ] `NETLIFY_BUILD_HOOK`
- [ ] Verify Netlify build hook URL is created (Site configuration → Build & deploy → Build hooks)

### Testing (requires approved app)
- [ ] Trigger a test OAuth flow with a real Strava account (after approval)
- [ ] Verify the callback function receives the token and fetches the activity
- [ ] Verify the per-athlete JSON file is written to GitHub
- [ ] Verify the Netlify build hook triggers a rebuild
- [ ] Verify the rebuilt site shows the new athlete's result

---

## What Doesn't Need to Change

| Item | Status | Reason |
|------|--------|--------|
| `netlify.toml` | No change | Correct as-is |
| Node.js version | No change | `.node-version: 22` already pins Node 22 |
| Functions v1 syntax | Keep | v2 fix is too recent; no benefit to migrating before go-live |
| `activity:read_all` scope | Keep | Required for private activity access |
| OAuth state pattern | Keep | base64url JSON {nonce, activityUrl} is correct |
| CSRF cookie double-submit | Keep | Correct security pattern |
| Segment IDs | Keep | Verified in v5.0 implementation |
| npm dependencies | No change | No new libraries needed for deployment |

---

## Sources

### Strava API (HIGH confidence — official documentation and community hub)
- Rate limits: [developers.strava.com/docs/rate-limits](https://developers.strava.com/docs/rate-limits/)
- Authentication/scopes: [developers.strava.com/docs/authentication](https://developers.strava.com/docs/authentication/)
- Getting started / callback domain: [developers.strava.com/docs/getting-started](https://developers.strava.com/docs/getting-started/)
- Branding guidelines: [developers.strava.com/guidelines](https://developers.strava.com/guidelines/)
- Developer program (athlete limits, review process): [Strava Community Hub — Our Developer Program](https://communityhub.strava.com/developers-knowledge-base-14/our-developer-program-3203)
- Athlete limit = 1 for new apps: [Strava Community Hub — Number of athletes allowed to connect](https://communityhub.strava.com/developers-api-7/number-of-athletes-allowed-to-connect-1-11078)
- App review FAQ: [Strava API FAQ](https://communityhub.strava.com/developers-knowledge-base-14/strava-api-faq-12906)

### Netlify (HIGH confidence — official documentation)
- Environment variables in functions (scope requirement): [docs.netlify.com/build/functions/environment-variables](https://docs.netlify.com/build/functions/environment-variables/)
- Node.js version management: [docs.netlify.com/build/configure-builds/manage-dependencies](https://docs.netlify.com/build/configure-builds/manage-dependencies/)
- Functions optional configuration (AWS_LAMBDA_JS_RUNTIME format): [docs.netlify.com/build/functions/optional-configuration](https://docs.netlify.com/build/functions/optional-configuration/)
- Default Node.js upgrade to v22 (Feb 24, 2025): [Netlify Support Forums](https://answers.netlify.com/t/builds-functions-plugins-default-node-js-version-upgrade-to-22/135981)
- v2 env var bug resolution (2026-03-30): [Netlify Support Forums — Functions v2 env vars undefined](https://answers.netlify.com/t/functions-v2-scheduled-functions-user-defined-environment-variables-are-undefined-at-runtime/160961)

### Project codebase (HIGH confidence — direct inspection)
- `netlify.toml` — confirmed correct configuration
- `netlify/functions/strava-auth.js` — confirmed v1 exports.handler syntax
- `netlify/functions/strava-callback.js` — confirmed v1 exports.handler syntax
- `.node-version` — confirmed value `22`
- `package.json` volta config — confirmed `"node": "22.22.2"`
