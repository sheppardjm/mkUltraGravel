# Phase 29: Strava OAuth + Activity Submission - Research

**Researched:** 2026-03-30
**Domain:** Strava OAuth 2.0, Netlify Functions, GitHub Contents API, CSRF protection
**Confidence:** HIGH (all primary findings verified against official docs)

## Summary

Phase 29 wires together four external systems: Strava OAuth, Strava Activities API, GitHub Contents API, and Netlify build hooks. The core flow is: rider pastes activity URL → Netlify Function redirects to Strava OAuth → callback Function exchanges code for token → fetches activity segment_efforts → writes per-athlete JSON to GitHub → triggers Netlify rebuild.

The standard approach is to use Netlify Functions (v1 handler syntax, NOT v2 export default due to a confirmed env var bug active as of 2026-03-28) with no additional npm packages beyond what's already installed. All external API calls use native `fetch`. CSRF protection on the OAuth state parameter uses the double-submit cookie pattern: a random nonce is set as a cookie in the initiation Function, included in the Strava `state` parameter, and verified in the callback Function before proceeding.

The most critical external dependency is the Strava Developer Program approval: new apps start in "Single Player Mode" (athlete capacity of 1) and require a formal review to accept additional athletes. This review is not on a fixed timeline ("a few months" in community reports). **The Strava app registration and Developer Program form must be submitted before Phase 29 can be tested with real athlete accounts other than the developer's own account.**

**Primary recommendation:** Use v1 handler syntax (`exports.handler`) for all Netlify Functions to avoid the active env var instability in v2 (`export default`). Implement OAuth state as a random hex nonce stored in a short-lived `HttpOnly; Secure; SameSite=Lax` cookie with a 10-minute expiry.

---

## Standard Stack

No new npm packages required for this phase. All external communication uses native `fetch` (Node.js 18+ built-in).

### Core
| Tool/API | Version/Endpoint | Purpose | Why Standard |
|----------|-----------------|---------|--------------|
| Netlify Functions (v1) | `exports.handler` | OAuth initiation, callback, submission | Already on Netlify; v1 avoids active env var bug in v2 |
| Strava OAuth | `https://www.strava.com/oauth/authorize` | User authorization | Official Strava OAuth 2.0 |
| Strava Token Exchange | `POST https://www.strava.com/api/v3/oauth/token` | Exchange code for access token | Official endpoint |
| Strava Activities API | `GET https://www.strava.com/api/v3/activities/{id}?include_all_efforts=true` | Fetch segment_efforts | Only way to get all segment efforts |
| GitHub Contents API | `PUT https://api.github.com/repos/{owner}/{repo}/contents/{path}` | Commit per-athlete result file | Official GitHub API, no extra auth libraries |
| Netlify Build Hook | `POST https://api.netlify.com/build_hooks/{hook_id}` | Trigger site rebuild | Official Netlify mechanism |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/lib/scoring.js` | existing (Phase 28) | Validate/score extracted efforts | Import in submission handler to validate at least 1 matching segment exists |
| `crypto.randomBytes` / `crypto.getRandomValues` | Node.js built-in | Generate CSRF nonce | CSRF state parameter generation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| v1 handler (`exports.handler`) | v2 (`export default`) | v2 is the modern approach BUT has a confirmed active bug as of 2026-03-28 where user-defined env vars intermittently return undefined. Use v1 until resolved. |
| Native fetch | node-fetch, axios | No reason to add a dependency when Node.js 18+ has native fetch |
| GitHub Contents API (PUT) | Octokit/rest | Octokit adds a dependency; the raw fetch call is ~15 lines and fully sufficient |
| Cookie-based CSRF nonce | Session store / JWT | No session store available (serverless); signed JWT is overkill for a 10-minute nonce; plain cookie is fine given Netlify HTTPS enforces Secure attribute |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure
```
netlify/
└── functions/
    ├── strava-auth.js          # Step 1: redirect to Strava OAuth
    ├── strava-callback.js      # Step 2: exchange code, fetch activity, write result
    └── submit-result.js        # Step 3 (optional split): gender/consent form POST handler

src/
└── lib/
    └── scoring.js              # Existing (Phase 28) — imported by callback function

netlify.toml                    # [build] + [functions] configuration
```

**Note on function splitting:** The simplest architecture uses two functions:
- `strava-auth` — generates state nonce, sets cookie, redirects to Strava
- `strava-callback` — verifies state, exchanges code, fetches activity, shows gender/consent form

A third function (`submit-result`) handles the final form POST if gender/consent is a separate step. This is the recommended split because it separates OAuth concerns from data commitment.

### Recommended netlify.toml
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

### Pattern 1: Strava OAuth Initiation Function

**What:** Generates a cryptographically random state nonce, sets it as a cookie, and redirects the browser to Strava's authorization page.

**When to use:** User clicks "Submit Your Activity" on the site.

```javascript
// netlify/functions/strava-auth.js
// Source: https://developers.strava.com/docs/authentication/

exports.handler = async (event) => {
  // Generate CSRF nonce
  const nonce = require('crypto').randomBytes(16).toString('hex');

  // Build Strava authorization URL
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: process.env.STRAVA_REDIRECT_URI, // e.g. https://mkultragravel.netlify.app/.netlify/functions/strava-callback
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
    state: nonce,
  });

  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?${params}`;

  return {
    statusCode: 302,
    headers: {
      Location: stravaAuthUrl,
      // Cookie expires in 10 minutes — just enough for the OAuth round-trip
      'Set-Cookie': `strava_oauth_state=${nonce}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/`,
    },
    body: '',
  };
};
```

### Pattern 2: Strava OAuth Callback Function

**What:** Verifies state nonce, exchanges authorization code for access token, fetches activity, validates segment efforts, shows confirmation form.

**When to use:** Strava redirects back to `/.netlify/functions/strava-callback?code=...&state=...`

```javascript
// netlify/functions/strava-callback.js
// Source: https://developers.strava.com/docs/authentication/
//         https://developers.strava.com/docs/reference/#api-Activities-getActivityById

exports.handler = async (event) => {
  const { code, state, error } = event.queryStringParameters || {};

  // 1. Handle Strava access denied
  if (error === 'access_denied') {
    return { statusCode: 302, headers: { Location: '/?submit=denied' }, body: '' };
  }

  // 2. Verify CSRF state nonce from cookie
  const cookieHeader = event.headers['cookie'] || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => c.trim().split('=').map(s => s.trim()))
  );
  if (!state || cookies['strava_oauth_state'] !== state) {
    return { statusCode: 400, body: 'Invalid or missing state parameter.' };
  }

  // 3. Exchange code for access token
  const tokenRes = await fetch('https://www.strava.com/api/v3/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return { statusCode: 400, body: 'Token exchange failed.' };
  }

  // 4. Extract activity ID from the activity URL the user submitted
  //    (stored in state or passed separately — see architecture note below)
  //    NOTE: The activity URL must have been captured before OAuth; see Pattern 4.

  // 5. Fetch activity with all segment efforts
  const activityId = /* extracted from stored state or URL param */;
  const actRes = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}?include_all_efforts=true`,
    { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
  );
  const activity = await actRes.json();

  // 6. Extract matching segment efforts (filter to our 9 known segment IDs)
  const ALL_SEGMENT_IDS = new Set([
    '24479270','24479292','41126651','24479426',
    '24479467','24479496','34573011','16438243','6809754'
  ]);
  const efforts = (activity.segment_efforts || []).filter(
    e => ALL_SEGMENT_IDS.has(String(e.segment.id))
  );

  if (efforts.length === 0) {
    return { statusCode: 400, body: 'No matching event segment efforts found in this activity.' };
  }

  // 7. Return HTML form for gender/consent + store token/efforts in signed cookie or hidden fields
  // ...
};
```

### Pattern 3: Committing a Per-Athlete JSON File via GitHub API

**What:** Writes (or updates) `public/data/results/athletes/{athleteId}.json` in the repository using the GitHub Contents API, then fires a Netlify build hook.

**When to use:** After user submits gender category and consent checkbox.

```javascript
// Source: https://docs.github.com/en/rest/repos/contents
// Note: SHA is only required when UPDATING an existing file.
// For a new file (first submission), omit sha.

async function commitAthleteResult(athleteId, resultJson) {
  const path = `public/data/results/athletes/${athleteId}.json`;
  const content = Buffer.from(JSON.stringify(resultJson, null, 2) + '\n').toString('base64');

  // Check if file already exists (to get current SHA for update)
  let sha;
  const checkRes = await fetch(
    `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${path}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );
  if (checkRes.status === 200) {
    const existing = await checkRes.json();
    sha = existing.sha; // Required for update
  }

  const body = {
    message: `result: ${resultJson.name} (${resultJson.gender})`,
    content,
    committer: { name: 'MK Ultra Gravel Bot', email: 'bot@mkultragravel.netlify.app' },
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(
    `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!putRes.ok) {
    const err = await putRes.json();
    throw new Error(`GitHub API error: ${JSON.stringify(err)}`);
  }

  // Trigger Netlify rebuild
  await fetch(process.env.NETLIFY_BUILD_HOOK, { method: 'POST', body: '{}' });
}
```

### Pattern 4: Passing Activity URL Through OAuth Round-Trip

**The challenge:** The user enters their activity URL on the page before OAuth. OAuth bounces them through Strava and back, which wipes the form state. The activity URL must survive this round-trip.

**Recommended solution:** Encode the activity URL in the OAuth `state` parameter alongside the CSRF nonce.

```javascript
// In strava-auth.js: encode both nonce and activityUrl in state
const statePayload = JSON.stringify({ nonce, activityUrl: event.queryStringParameters.activityUrl });
const state = Buffer.from(statePayload).toString('base64url');

// Set cookie with nonce only (for CSRF verification)
// Pass full state to Strava as the state param

// In strava-callback.js: decode state, verify nonce matches cookie
const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
if (decoded.nonce !== cookies['strava_oauth_state']) { /* CSRF error */ }
const activityUrl = decoded.activityUrl;
const activityId = activityUrl.match(/strava\.com\/activities\/(\d+)/)?.[1];
```

**Note:** The state parameter is URL-safe but not encrypted. Activity URLs are not sensitive — this is acceptable. The CSRF nonce in the cookie is the security mechanism.

### Anti-Patterns to Avoid

- **Using v2 `export default` functions**: Has an active intermittent env var bug as of 2026-03-28 affecting user-defined vars in `process.env`. Use v1 `exports.handler` syntax.
- **Storing access tokens server-side**: These functions are stateless. Do not try to use a session store. The access token lives only for the duration of the single callback invocation.
- **Relying on `include_all_efforts=false`**: The default returns only "important" efforts based on Strava's algorithm. Must use `?include_all_efforts=true` to reliably get all 9 event segments.
- **Omitting SHA when updating an existing file**: If an athlete resubmits (updating their existing result file), the GitHub API returns 409 Conflict unless the current file's SHA is included. Always GET the file first to check for existing SHA.
- **Hardcoding segment IDs as numbers**: The Strava API returns `segment.id` as a JSON number (integer), but the Phase 28 schema uses string keys. Always cast: `String(effort.segment.id)`.
- **Triggering rebuild before committing**: Netlify may build before the commit is processed. Always fire the build hook after the GitHub API PUT returns 200/201.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth CSRF protection | Custom session store or encrypted JWT | Double-submit cookie pattern (nonce in cookie + state param) | Stateless, no infrastructure needed, cryptographically sound |
| GitHub file commits | Custom git operations, libgit2 | GitHub REST API `PUT /repos/{owner}/{repo}/contents/{path}` | Single HTTP call, no git tooling needed |
| Netlify rebuild trigger | Polling, webhooks, CI pipelines | Netlify Build Hook URL (POST) | One HTTP POST, no auth needed |
| Activity ID extraction | Strava webhook subscriptions | Parse from activity URL the user provides | Simpler, no persistent webhook subscription required |
| Token management | Storing/refreshing tokens | Use token only for current request duration | Tokens expire in 6 hours; no persistence needed for single-use read |

**Key insight:** This phase is a stateless pipeline. Each function invocation is self-contained. There is no state to manage between invocations — the token is used once, the file is committed, the build is triggered. Don't add any persistence layer.

---

## Common Pitfalls

### Pitfall 1: Strava "Single Player Mode" Blocks Real Testing
**What goes wrong:** After registering the Strava app, it starts with athlete capacity = 1 (the developer's own account). No other athletes can authorize the app until the Developer Program review is approved.
**Why it happens:** Strava requires all multi-athlete apps to go through a review process.
**How to avoid:** Register the app and submit the Developer Program form as soon as possible. Testing with the developer's own Strava account works immediately. Use seed data (Phase 28) for end-to-end testing without real athletes.
**Warning signs:** OAuth flow works for one account but returns an error or "not authorized" screen for any other Strava account.

### Pitfall 2: Netlify Functions v2 Env Var Intermittent Failure
**What goes wrong:** `process.env.STRAVA_CLIENT_SECRET` returns `undefined` intermittently, causing token exchange to fail with 401.
**Why it happens:** Active confirmed bug in Netlify Functions v2 (`export default` syntax) affecting user-defined env vars since ~2026-03-28.
**How to avoid:** Use v1 handler syntax (`exports.handler`) for all functions in this phase. The bug is specific to v2.
**Warning signs:** Function works on first deploy, then starts returning auth errors intermittently without code changes.

### Pitfall 3: Missing `include_all_efforts=true` Parameter
**What goes wrong:** Activity fetch returns segment_efforts but some of the 9 event segments are absent, causing false "no matching efforts" rejections.
**Why it happens:** By default, Strava only returns "important" efforts based on a proprietary algorithm. Segments not deemed important are silently omitted.
**How to avoid:** Always append `?include_all_efforts=true` to the GET /activities/{id} request. This requires `activity:read_all` scope (not just `activity:read`).
**Warning signs:** An athlete's activity shows event segments on Strava but the function reports no matching efforts.

### Pitfall 4: Per-Athlete GitHub API Concurrency Conflict
**What goes wrong:** Two athletes submit simultaneously. Both GET the same file (or no file), both try to PUT. The second PUT fails with 409 Conflict because the SHA from the first GET is now stale.
**Why it happens:** The GET-then-PUT sequence is not atomic. Race condition between concurrent function invocations.
**How to avoid:** For this event scale (small, volunteer race), accept that 409 is possible and return a user-friendly retry message. Do NOT implement distributed locking — it's engineering overkill for ~100 athletes. In practice, the likelihood is extremely low since submissions will be staggered.
**Warning signs:** Occasional 409 responses from GitHub API on the PUT call.

### Pitfall 5: SameSite=Lax Cookie Not Sent on OAuth Callback
**What goes wrong:** The CSRF cookie is set by `strava-auth`, but when Strava redirects back to `strava-callback`, the browser doesn't include the cookie, causing all state verifications to fail.
**Why it happens:** The redirect from Strava is a cross-site top-level navigation via GET. `SameSite=Lax` cookies ARE sent for top-level GET navigations (this is by design). This is only a problem if the callback somehow uses POST.
**How to avoid:** Keep the Strava callback as a GET endpoint (which it is by default in the OAuth code flow). Verify the callback function reads from `event.queryStringParameters`, not the request body.
**Warning signs:** Every callback returns "Invalid or missing state parameter" even though OAuth appeared to succeed.

### Pitfall 6: GitHub Token Missing "Contents" Write Permission
**What goes wrong:** GitHub API returns 403 or 404 when trying to commit the athlete result file.
**Why it happens:** The Personal Access Token was created without "Contents: Read and Write" permission on the specific repository.
**How to avoid:** Create a fine-grained PAT scoped to only the `mkUltraGravel` repository with `Contents: Read and Write`. Store as `GITHUB_TOKEN` environment variable in Netlify dashboard (not netlify.toml — env vars in netlify.toml are NOT available to functions).
**Warning signs:** GitHub API returns 403 with "Resource not accessible by personal access token."

### Pitfall 7: `netlify.toml` Env Vars Not Available to Functions
**What goes wrong:** Env vars like `STRAVA_CLIENT_ID` defined in `netlify.toml` under `[build.environment]` return `undefined` in functions.
**Why it happens:** `netlify.toml` environment variables are only available at **build time**, not at function **runtime**.
**How to avoid:** Set ALL function env vars in the Netlify dashboard UI under "Environment variables" with scope set to "Functions" (or "All"). Do not put secrets in netlify.toml.
**Warning signs:** `process.env.STRAVA_CLIENT_ID` is undefined in the function handler.

---

## Code Examples

### Parsing Activity ID from URL
```javascript
// Source: Strava URL format — strava.com/activities/{numeric_id}
function extractActivityId(activityUrl) {
  const match = String(activityUrl).match(/strava\.com\/activities\/(\d+)/);
  if (!match) throw new Error('Invalid Strava activity URL');
  return match[1]; // string form of the numeric ID
}
```

### Mapping Segment Efforts to Schema Format
```javascript
// Source: Phase 28 schema — segments keyed by string segment ID
// Strava API returns segment.id as a number; schema uses string keys

function mapEffortsToSchema(segmentEfforts, knownSegmentIds) {
  const known = new Set(knownSegmentIds);
  const segments = {};
  for (const effort of segmentEfforts) {
    const segId = String(effort.segment.id);
    if (known.has(segId)) {
      segments[segId] = { elapsed_time: effort.elapsed_time };
    }
  }
  return segments;
}

// Usage:
const ALL_SEGMENT_IDS = [
  '24479270','24479292','41126651','24479426',
  '24479467','24479496','34573011','16438243','6809754'
];
const segments = mapEffortsToSchema(activity.segment_efforts, ALL_SEGMENT_IDS);
if (Object.keys(segments).length === 0) {
  // Reject — no matching event segments in this activity
}
```

### Building the Per-Athlete Result Object
```javascript
// Source: Phase 28 schema — public/data/results/schema.json
function buildAthleteResult(tokenData, activity, segments, gender) {
  return {
    athleteId: String(tokenData.athlete.id),
    name: `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`.trim(),
    gender, // Self-reported from form: "M", "F", or "NB"
    activityUrl: `https://www.strava.com/activities/${activity.id}`,
    submittedAt: new Date().toISOString(),
    segments,
  };
}
```

### Triggering Netlify Build Hook
```javascript
// Source: https://docs.netlify.com/build/configure-builds/build-hooks/
async function triggerRebuild() {
  await fetch(process.env.NETLIFY_BUILD_HOOK, {
    method: 'POST',
    body: '{}',
  });
  // No response body to parse — a non-2xx is the only failure case
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Netlify Functions v2 `export default` | Use v1 `exports.handler` | Bug active 2026-03-28 | v2 has intermittent env var failure; v1 is stable |
| `node-fetch` package | Native `fetch` | Node.js 18+ (Netlify default) | No extra package needed |
| Classic GitHub PATs (broad repo scope) | Fine-grained PATs (per-repo, contents only) | GitHub security improvements | Minimum-privilege token: Contents Read+Write on one repo only |
| OAuth state as opaque random string | State as base64url-encoded JSON (`{nonce, activityUrl}`) | Standard pattern for SPA/serverless | Survives the OAuth round-trip without server storage |

**Deprecated/outdated:**
- `@netlify/functions` npm package (`Handler` type): The `netlify/functions` GitHub repository was **archived on June 9, 2025**. Do not install this package. Use the raw `exports.handler` pattern which works without any npm dependency.

---

## Required Environment Variables

The following must be set in the Netlify dashboard UI (not netlify.toml) with scope "Functions":

| Variable | Value | Notes |
|----------|-------|-------|
| `STRAVA_CLIENT_ID` | Strava app client ID | From strava.com/settings/api |
| `STRAVA_CLIENT_SECRET` | Strava app client secret | Keep confidential |
| `STRAVA_REDIRECT_URI` | `https://mkultragravel.netlify.app/.netlify/functions/strava-callback` | Must match Strava app callback domain |
| `GITHUB_TOKEN` | Fine-grained PAT | Contents: Read+Write on mkUltraGravel repo |
| `GITHUB_OWNER` | Repository owner username | e.g. `Sheppardjm` |
| `GITHUB_REPO` | Repository name | e.g. `mkUltraGravel` |
| `NETLIFY_BUILD_HOOK` | Netlify build hook URL | From Netlify dashboard > Build hooks |

---

## Strava API Details

### Rate Limits (HIGH confidence — official docs)
- **Overall:** 200 requests / 15 minutes, 2,000 / day
- **Non-upload (read):** 100 requests / 15 minutes, 1,000 / day
- **Impact:** At event scale (~100 athletes over 1 week), nowhere near limits. Each submission = ~2 API calls (token exchange + activity fetch).

### Required Scope
- `activity:read_all` — required (not just `activity:read`) to ensure segment efforts from private activities are accessible, and to use `include_all_efforts=true` reliably.

### Token Expiry
- Access tokens expire in **6 hours**. No refresh token storage needed — token is used once and discarded.

### Athlete Capacity Blocker
- New apps start at capacity = 1 (Single Player Mode).
- Developer Program form must be submitted for multi-athlete use.
- Review is currently "a few months" per community reports (no guaranteed SLA).
- **Testing path without approval:** Use the developer's own Strava account for flow testing; use Phase 28 seed data for results page testing.

### Activity Ownership Verification
- The Strava API token is obtained by having the **athlete authorize the app**. The `/activities/{id}` endpoint with this token can only read activities owned by that athlete. No additional ownership check is needed — the API enforces it.

---

## Open Questions

1. **Strava Developer Program approval status**
   - What we know: App registration creates Single Player Mode immediately; review for multi-athlete capacity takes weeks.
   - What's unclear: Whether the event organizer has already submitted the Developer Program form.
   - Recommendation: Submit the form now if not done. Plan to test with seed data. Do NOT block Phase 29 development on approval — the code path is identical.

2. **Gender/consent form presentation**
   - What we know: The callback function returns HTTP, but showing a nice form requires either an HTML response from the function or a redirect to a page.
   - What's unclear: Whether to render the form as HTML from the function body or redirect to an Astro page with the data in query params.
   - Recommendation: Redirect to a static Astro page (`/submit-confirm?token=...&activityId=...`) with a simple form, then POST to a third function (`strava-submit`). This keeps the UI in Astro (styled, consistent) and the logic in functions.

3. **Re-submission behavior**
   - What we know: Phase 28 schema uses `athleteId` as the filename (e.g., `12345678.json`). A re-submission would overwrite the previous result.
   - What's unclear: Whether to allow re-submission silently or show a warning.
   - Recommendation: Allow overwrite silently — the GET-then-PUT pattern already handles this. The latest submission wins.

4. **Netlify Functions v2 env var bug timeline**
   - What we know: Bug confirmed active 2026-03-28; Netlify marked it high priority.
   - What's unclear: When it will be fixed.
   - Recommendation: Use v1 handler syntax throughout Phase 29. Revisit v2 for Phase 30+.

---

## Sources

### Primary (HIGH confidence)
- `https://developers.strava.com/docs/authentication/` — OAuth flow, scopes, token exchange endpoint and response format
- `https://developers.strava.com/docs/rate-limits/` — Rate limit values and headers
- `https://developers.strava.com/docs/getting-started/` — App registration, Single Player Mode, Developer Program
- `https://docs.github.com/en/rest/repos/contents` — PUT endpoint, SHA requirements for create vs update, token permissions
- `https://docs.netlify.com/build/configure-builds/build-hooks/` — Build hook URL format, POST trigger syntax
- `https://docs.netlify.com/build/functions/get-started/` — Function file structure, v1 vs v2 syntax
- `https://docs.netlify.com/build/functions/environment-variables/` — process.env for v1, Netlify.env for edge, netlify.toml limitation
- `https://docs.netlify.com/build/functions/api/` — cookies API in functions context
- `https://docs.netlify.com/build/functions/optional-configuration/` — netlify.toml [functions] block, node_bundler, included_files

### Secondary (MEDIUM confidence)
- `https://answers.netlify.com/t/functions-v2-export-default-intermittently-missing-all-user-defined-env-vars-at-runtime/160958` — Active bug report for v2 env vars, confirmed by Netlify support team
- `https://communityhub.strava.com/developers-knowledge-base-14/our-developer-program-3203` — Developer Program process and athlete capacity details
- `https://auth0.com/docs/secure/attack-protection/state-parameters` — OAuth state parameter CSRF protection pattern

### Tertiary (LOW confidence)
- WebSearch results confirming `activity:read_all` scope requirement for private activity segment efforts — consistent with multiple community posts but not explicitly stated in official scope docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries/APIs verified against official documentation
- Architecture: HIGH — patterns derived directly from official Netlify and Strava docs
- Pitfalls: HIGH for env vars (confirmed bug), Strava review (official doc), cookie mechanics (official MDN); MEDIUM for GitHub concurrency (logical reasoning from API contract)
- Env var bug: HIGH — confirmed by Netlify support as active issue

**Research date:** 2026-03-30
**Valid until:** 2026-04-14 (14 days) — Strava API is stable; Netlify v2 env var bug may be resolved sooner; check status before using v2 syntax
