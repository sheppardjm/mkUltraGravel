# Phase 31: Deauthorization Webhook + Privacy - Research

**Researched:** 2026-03-30
**Domain:** Strava Webhook Events API, Netlify Functions (v1), GitHub Contents API (DELETE), privacy notice UI
**Confidence:** HIGH (all primary findings verified against Strava official docs and GitHub REST API docs)

---

## Summary

Phase 31 has three parts: (1) register a Strava webhook subscription so deauthorization events are delivered, (2) build a single Netlify Function that handles both the Strava subscription validation GET and the incoming deauthorization event POST, and (3) add a privacy notice paragraph to the existing `/submit` page.

The Strava Webhook Events API sends a POST when an athlete revokes app access. The webhook payload is `{ object_type: "athlete", aspect_type: "delete", updates: { "authorized": "false" }, owner_id: <athleteId>, object_id: <athleteId>, ... }`. The handler must respond 200 within 2 seconds, then delete `public/data/results/athletes/{athleteId}.json` from the GitHub repo (GET SHA → DELETE) and trigger a Netlify rebuild. This satisfies Strava TOS Section 5.4 (delete all personal data upon deauthorization) and Section 2.14(f) (within 48 hours, expeditiously in practice).

The same Netlify Function endpoint serves dual duty: GET requests are Strava's subscription validation handshake (must echo `hub.challenge` in JSON), and POST requests are live webhook events. This is the standard single-endpoint webhook pattern used by Strava.

**Primary recommendation:** Build one Netlify Function `netlify/functions/strava-webhook.js` using the same v1 `exports.handler` pattern as Phases 29-30. Register the webhook subscription manually (one curl command) after deployment — subscription registration is a one-time operation, not code. Add a two-sentence privacy notice to `src/pages/submit.astro`.

---

## Standard Stack

No new npm packages required. Uses native `fetch` and the same GitHub Contents API and Netlify build hook already established in Phase 29.

### Core
| Tool/API | Endpoint | Purpose | Why Standard |
|----------|----------|---------|--------------|
| Netlify Functions v1 | `exports.handler` | Webhook receiver (GET + POST on same endpoint) | Same pattern as all Phase 29 functions; v2 env var bug still active |
| Strava Webhook Events API | `POST https://www.strava.com/api/v3/push_subscriptions` | Register subscription (manual, one-time) | Official Strava webhook registration endpoint |
| Strava Webhook Callback | Incoming `GET` + `POST` to function URL | Subscription validation + event delivery | Standard Strava callback contract |
| GitHub Contents API (DELETE) | `DELETE https://api.github.com/repos/{owner}/{repo}/contents/{path}` | Delete athlete JSON file | Same auth as Phase 29 PUT; same GITHUB_TOKEN |
| Netlify Build Hook | `POST {NETLIFY_BUILD_HOOK}` | Trigger rebuild after deletion | Same fire-and-forget pattern as Phase 29 |

### Supporting
| Tool | Purpose |
|------|---------|
| `STRAVA_VERIFY_TOKEN` env var | Shared secret to validate GET subscription handshake |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual curl to register subscription | Auto-registration script | Manual curl is fine — done once per Strava app registration. Auto-registration adds complexity for no ongoing benefit. |
| DELETE file via GitHub API | Soft-delete (rename/move to deleted/ folder) | Hard delete is required by TOS Section 5.4. Soft delete does not satisfy "delete all Personal Data." |

**Installation:** No new packages.

---

## Architecture Patterns

### Recommended Project Structure
```
netlify/
└── functions/
    ├── strava-auth.js          # Phase 29 - unchanged
    ├── strava-callback.js      # Phase 29 - unchanged
    ├── submit-result.js        # Phase 29 - unchanged
    └── strava-webhook.js       # Phase 31 - NEW

src/
└── pages/
    └── submit.astro            # Phase 29 - add privacy notice paragraph
```

The function lives at `/.netlify/functions/strava-webhook` and is accessible as `/api/strava-webhook` via the existing netlify.toml redirect rule:
```toml
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

### Pattern 1: Dual-Method Webhook Endpoint

**What:** The same function URL handles both the one-time GET validation and ongoing POST events.

**When to use:** Strava webhook subscription requires this — the callback URL must respond to both methods.

```javascript
// netlify/functions/strava-webhook.js
// Source: https://developers.strava.com/docs/webhooks/

exports.handler = async (event) => {
  const method = event.httpMethod;

  // --- GET: Subscription validation handshake ---
  // Strava sends hub.mode, hub.challenge, hub.verify_token as query params
  if (method === 'GET') {
    const params = event.queryStringParameters || {};
    const mode = params['hub.mode'];
    const challenge = params['hub.challenge'];
    const verifyToken = params['hub.verify_token'];

    if (mode === 'subscribe' && verifyToken === process.env.STRAVA_VERIFY_TOKEN) {
      // Must respond within 2 seconds with status 200 and JSON echoing challenge
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'hub.challenge': challenge }),
      };
    }
    // Any mismatch = reject — don't acknowledge unknown subscriptions
    return { statusCode: 403, body: 'Forbidden' };
  }

  // --- POST: Incoming webhook event ---
  if (method === 'POST') {
    // Acknowledge immediately — Strava requires 200 within 2 seconds
    // Then process asynchronously (Node.js handles this since we await below
    // but Netlify Functions await the handler, so we must keep processing < 10s)

    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 200, body: 'EVENT_RECEIVED' }; // Still 200 — malformed is not retried
    }

    // Only handle athlete deauthorization events
    // Strava sends: object_type="athlete", aspect_type="delete", updates={"authorized":"false"}
    if (
      payload.object_type === 'athlete' &&
      payload.aspect_type === 'delete' &&
      payload.updates?.authorized === 'false'
    ) {
      const athleteId = String(payload.owner_id || payload.object_id);
      await deleteAthleteData(athleteId);
    }
    // Silently ignore all other event types (activity creates/updates/deletes)

    return { statusCode: 200, body: 'EVENT_RECEIVED' };
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
```

**Critical note:** The `updates.authorized` value is the string `"false"`, not the boolean `false`. The official Strava docs explicitly show it as `"authorized": "false"` (string). Test with strict equality `=== 'false'`.

### Pattern 2: Delete Athlete File via GitHub Contents API

**What:** GET the file to retrieve its SHA, then DELETE it. Same pattern as Phase 29 PUT — same credentials, same headers.

```javascript
// Source: https://docs.github.com/en/rest/repos/contents#delete-a-file

async function deleteAthleteData(athleteId) {
  const {
    GITHUB_TOKEN,
    GITHUB_OWNER,
    GITHUB_REPO,
    NETLIFY_BUILD_HOOK,
  } = process.env;

  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    console.error('Missing GitHub env vars — cannot delete athlete data');
    return; // Log and return; do not throw (webhook already acknowledged)
  }

  const filePath = `public/data/results/athletes/${athleteId}.json`;
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;

  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    'User-Agent': 'MK-Ultra-Gravel-Bot/1.0',
  };

  // Step 1: GET file to retrieve SHA
  const getRes = await fetch(apiUrl, { headers });

  if (getRes.status === 404) {
    // File doesn't exist — athlete may never have submitted. Nothing to delete.
    console.log(`No data file found for athlete ${athleteId} — nothing to delete`);
    return;
  }
  if (!getRes.ok) {
    console.error(`GitHub GET failed for athlete ${athleteId}: ${getRes.status}`);
    return;
  }

  const existing = await getRes.json();
  const sha = existing.sha;

  // Step 2: DELETE the file using its SHA
  const deleteRes = await fetch(apiUrl, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({
      message: `deauth: delete athlete ${athleteId} data per TOS 5.4`,
      sha,
      committer: {
        name: 'MK Ultra Gravel Bot',
        email: 'bot@mkultragravel.netlify.app',
      },
    }),
  });

  if (!deleteRes.ok) {
    console.error(`GitHub DELETE failed for athlete ${athleteId}: ${deleteRes.status}`);
    return;
  }

  console.log(`Deleted data for athlete ${athleteId} (TOS 5.4 compliance)`);

  // Step 3: Trigger Netlify rebuild (fire-and-forget, same as Phase 29)
  if (NETLIFY_BUILD_HOOK) {
    fetch(NETLIFY_BUILD_HOOK, { method: 'POST', body: '{}' }).catch((err) => {
      console.warn('Netlify build hook trigger failed (non-fatal):', err);
    });
  }
}
```

### Pattern 3: Webhook Subscription Registration (One-Time Manual Command)

**What:** Run once after deploying the function. Creates the Strava subscription that points to the function URL.

```bash
# Source: https://developers.strava.com/docs/webhooks/
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=YOUR_CLIENT_ID \
  -F client_secret=YOUR_CLIENT_SECRET \
  -F callback_url=https://mkultragravel.netlify.app/.netlify/functions/strava-webhook \
  -F verify_token=YOUR_VERIFY_TOKEN
```

On success, Strava sends a GET to the callback URL with `hub.challenge`. The function must respond correctly. If it does, Strava returns a subscription ID in the response body. Record this ID.

To check existing subscription:
```bash
curl -G https://www.strava.com/api/v3/push_subscriptions \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET
```

**One subscription per app.** There is no per-athlete subscription — the single subscription covers all athletes who have authorized the app.

### Pattern 4: Privacy Notice on Submit Page

**What:** Add a brief notice below the existing form footer text in `src/pages/submit.astro`.

**When to use:** Required by Strava TOS Section 5 (must inform users about data collection, deletion rights, and that Strava monitors API usage).

The existing submit page already has this text:
```
You'll be asked to authorize read access to your Strava activities.
No data is stored beyond your segment times.
```

This needs a supplementary privacy disclosure. Minimal compliant wording:
```
Your segment times are stored publicly on the results page.
You may revoke access at any time in your Strava settings — your data
will be deleted within 48 hours of deauthorization.
```

The notice should sit below the existing footer text inside the form card, styled with the same `var(--color-text-muted)` and `var(--font-mono)` as the existing footer text.

### Anti-Patterns to Avoid

- **Returning 200 asynchronously before Netlify function returns**: Netlify Functions are synchronous — you cannot send an early response and continue processing. Keep the delete operation fast (two GitHub API calls + one build hook fire, all sequential). In practice this takes 1-3 seconds well within Netlify's 10-second function timeout. The Strava 2-second acknowledgment requirement means we must return 200 promptly — the current architecture does this because JavaScript `await` is sequential but our response IS the return value, so we must return 200 after processing. **If the deletion is slow, return 200 immediately and use a fire-and-forget pattern for the GitHub calls.** See the pitfalls section.
- **Using v2 `export default` syntax**: Active env var bug still affects Phase 29+ functions.
- **Storing athlete data beyond what's committed to the git repo**: There is no database, no tokens stored, no session state. The only "personal data" in this project is the per-athlete JSON file. Deleting it satisfies TOS 5.4 completely.
- **Verifying incoming POST events with verify_token**: Strava does NOT include the verify_token in POST event bodies. There is no HMAC signature. The only security is that the callback URL is not guessable (the Netlify function URL is publicly listed in netlify.toml, but the event payload is harmless to forge — a forged delete just removes an athlete file). Consider this low risk given ~100 athletes.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Webhook subscription registration | Auto-register in code | Manual curl, one-time | One subscription per app; registering programmatically on every deploy would fail (can't create duplicates) |
| Signature verification of incoming POSTs | Custom HMAC validation | None needed | Strava does not sign POST event bodies; there is no signature to verify |
| Async background processing | Worker queues, Redis | Fire-and-forget fetch inside handler | At ~100 athletes scale, fire-and-forget with error logging is sufficient |

**Key insight:** This is a thin webhook handler. The only real work is two sequential GitHub API calls. Don't over-engineer it.

---

## Common Pitfalls

### Pitfall 1: 2-Second Acknowledgment Constraint vs. GitHub API Latency

**What goes wrong:** The handler performs a GitHub GET + DELETE (2 round trips) before returning 200. If GitHub is slow (>2 seconds), Strava will treat the event as unacknowledged and retry with exponential backoff.

**Why it happens:** Strava requires 200 within 2 seconds. GitHub API typical latency is 200-500ms per call, so 2 calls = 400-1000ms normally — usually fine. But under load or cold-start, it could exceed 2 seconds.

**How to avoid:** Respond 200 immediately and process asynchronously using fire-and-forget:
```javascript
// Return 200 immediately
const responsePromise = deleteAthleteData(athleteId); // don't await
// Netlify will keep the function alive until responsePromise settles
// (Node.js event loop stays open for pending promises)
return { statusCode: 200, body: 'EVENT_RECEIVED' };
```
**Note:** This works in Netlify Functions because the Node.js process stays alive for in-flight promises. However, Netlify may kill the function after the response is returned — this is a known limitation. For this scale (deauths are rare events, not high-frequency), accepting occasional missed deletes + relying on Strava's retry mechanism is acceptable. Log all failures.

**Warning signs:** Strava logs show repeated delivery attempts for the same event_time.

### Pitfall 2: `updates.authorized` Is a String, Not a Boolean

**What goes wrong:** `payload.updates.authorized === false` evaluates to false even for a real deauth event.

**Why it happens:** The Strava API sends `"authorized": "false"` as a JSON string, not a boolean.

**How to avoid:** Check `payload.updates?.authorized === 'false'` (strict equality with string `'false'`).

**Warning signs:** Handler receives athlete deauth events but doesn't delete any files.

### Pitfall 3: Attempting to Register a Second Subscription

**What goes wrong:** If the webhook registration curl is run twice, Strava returns an error because the app already has a subscription.

**Why it happens:** Strava limits each app to one active subscription.

**How to avoid:** Before registering, check for an existing subscription with the GET endpoint. If one exists, delete it first (`DELETE /api/v3/push_subscriptions/{id}`) or just use the existing subscription ID.

**Warning signs:** Subscription registration curl returns a 422 or "subscription already exists" error.

### Pitfall 4: GitHub Token Lacks Delete Permission

**What goes wrong:** GitHub API returns 403 when attempting to DELETE the athlete file.

**Why it happens:** The fine-grained PAT created in Phase 29 was scoped to "Contents: Read and Write." DELETE operations fall under "Write" — this should work with the existing token.

**How to avoid:** Verify the Phase 29 GITHUB_TOKEN has "Contents: Read and Write." If the token was scoped to read-only, it will fail. No new env var is needed — `GITHUB_TOKEN` already exists.

**Warning signs:** GitHub returns 403 on the DELETE call despite successful GET.

### Pitfall 5: Netlify Function Cold Start Exceeds 10-Second Timeout

**What goes wrong:** Under cold start, a Netlify Function takes 1-2 seconds to initialize. Two GitHub API calls + one build hook fire could push close to the 10-second function timeout.

**Why it happens:** Netlify Functions have a 10-second default timeout (not configurable on free/starter tier).

**How to avoid:** Fire the build hook after confirming DELETE succeeds, but use fire-and-forget (don't await the build hook response). Build hook POST itself is fast (<500ms). Two GitHub API calls is the bottleneck — typically well under 3 seconds combined.

**Warning signs:** Function logs show timeout errors during deauth processing.

### Pitfall 6: Webhook Subscription Registered to Wrong URL

**What goes wrong:** Subscription was registered to `https://mkultragravel.netlify.app/api/strava-webhook` (via redirect) instead of the direct function URL, or vice versa. Both work with the netlify.toml redirect, but if the domain changes or redirects break, Strava can't reach the handler.

**How to avoid:** Register with the direct Netlify function URL: `https://mkultragravel.netlify.app/.netlify/functions/strava-webhook`. This avoids reliance on the redirect rule.

---

## Code Examples

### Full Deauth Handler (Distilled)
```javascript
// netlify/functions/strava-webhook.js
// Source: https://developers.strava.com/docs/webhooks/

exports.handler = async (event) => {
  // GET: Strava subscription validation
  if (event.httpMethod === 'GET') {
    const p = event.queryStringParameters || {};
    if (p['hub.mode'] === 'subscribe' && p['hub.verify_token'] === process.env.STRAVA_VERIFY_TOKEN) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'hub.challenge': p['hub.challenge'] }),
      };
    }
    return { statusCode: 403, body: 'Forbidden' };
  }

  // POST: Webhook event
  if (event.httpMethod === 'POST') {
    let payload;
    try { payload = JSON.parse(event.body || '{}'); } catch { /* ignore */ }

    if (
      payload?.object_type === 'athlete' &&
      payload?.aspect_type === 'delete' &&
      payload?.updates?.authorized === 'false'
    ) {
      const athleteId = String(payload.owner_id || payload.object_id);
      await deleteAthleteData(athleteId); // implementation above
    }

    return { statusCode: 200, body: 'EVENT_RECEIVED' };
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
```

### GitHub File DELETE
```javascript
// Source: https://docs.github.com/en/rest/repos/contents#delete-a-file
// Requires: existing GITHUB_TOKEN env var with Contents: Read+Write
// Response: 200 on success, 404 if file doesn't exist, 409 if SHA stale

const deleteRes = await fetch(apiUrl, {
  method: 'DELETE',
  headers: {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    'User-Agent': 'MK-Ultra-Gravel-Bot/1.0',
  },
  body: JSON.stringify({
    message: `deauth: delete athlete ${athleteId} data per TOS 5.4`,
    sha,                                 // from prior GET response
    committer: {
      name: 'MK Ultra Gravel Bot',
      email: 'bot@mkultragravel.netlify.app',
    },
  }),
});
// Success: 200 (not 204 — GitHub returns 200 for content DELETE)
```

### Privacy Notice HTML (for submit.astro)
```html
<!-- Add below existing "No data is stored beyond your segment times." paragraph -->
<p class="mt-2 text-xs text-center" style="color: var(--color-text-muted); font-family: var(--font-mono);">
  Your segment times are stored publicly on the results page. You may revoke
  access at any time via your
  <a href="https://www.strava.com/settings/apps" target="_blank" rel="noopener noreferrer"
     style="color: oklch(0.72 0.19 55);">Strava settings</a>
  — your data will be deleted within 48 hours.
</p>
```

---

## Strava Webhook Event Reference

### Deauthorization Event POST Body
```json
{
  "object_type": "athlete",
  "aspect_type": "delete",
  "updates": { "authorized": "false" },
  "owner_id": 67890,
  "object_id": 67890,
  "subscription_id": 98765,
  "event_time": 1725991232
}
```

Key points:
- `object_type` = `"athlete"` (not `"activity"`)
- `aspect_type` = `"delete"` (not `"revoke"`)
- `updates.authorized` = `"false"` as a **string**, not boolean
- `owner_id` and `object_id` are the same value (both the athlete ID) for deauth events
- Use `owner_id` as the canonical athlete ID to look up the file

### GET Validation Request from Strava
```
GET /.netlify/functions/strava-webhook
  ?hub.mode=subscribe
  &hub.challenge=15f7d1a91c1f40f8a748fd134d7f353b
  &hub.verify_token=YOUR_VERIFY_TOKEN
```

Required response within 2 seconds:
```json
HTTP 200
Content-Type: application/json

{ "hub.challenge": "15f7d1a91c1f40f8a748fd134d7f353b" }
```

---

## Required Environment Variables

Only one new env var is needed for this phase:

| Variable | Value | Notes |
|----------|-------|-------|
| `STRAVA_VERIFY_TOKEN` | Any secret string you choose | Used only during subscription registration GET handshake; store in Netlify dashboard |

All other env vars (`GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `NETLIFY_BUILD_HOOK`) already exist from Phase 29.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Separate GET and POST endpoints for webhook | Single endpoint, branch on `httpMethod` | Strava requires one callback URL; both methods must be handled by the same path |
| HMAC signature verification on webhook | None — Strava doesn't sign POST events | No signature to verify; rely on obscurity + idempotent delete behavior |

**Deprecated/outdated:**
- Old Strava API base: `https://api.strava.com/api/v3/` — use `https://www.strava.com/api/v3/` (the api.strava.com subdomain is deprecated per Strava docs)

---

## Open Questions

1. **Is there an existing active webhook subscription for this Strava app?**
   - What we know: Phase 29 was implemented; it's unclear if a webhook subscription was registered during that phase.
   - What's unclear: Whether a subscription already exists, and if so what callback URL it points to.
   - Recommendation: Before deploying, run the GET `push_subscriptions` check to see if a subscription exists. If it does and the URL is wrong, delete and re-register.

2. **Does Netlify keep the function alive after returning 200 for in-flight fire-and-forget promises?**
   - What we know: Standard Node.js behavior keeps the process alive for pending promises. Netlify Functions run in AWS Lambda-compatible containers.
   - What's unclear: Whether Netlify/Lambda kills the container immediately after the response is returned, abandoning in-flight fetch calls.
   - Recommendation: Keep the delete operation as `await` (synchronous within the handler) rather than fire-and-forget, and accept that if GitHub is slow the Strava 2-second window may occasionally be missed (Strava retries with backoff, so the delete still happens eventually). This is the safest approach for a rare event (~100 athletes total).

3. **What happens if the same deauth event is delivered twice (Strava retry)?**
   - What we know: The delete is idempotent — if the file doesn't exist, the GitHub GET returns 404 and we return early without error.
   - Recommendation: No deduplication needed; the 404 early-exit handles this correctly.

---

## Sources

### Primary (HIGH confidence)
- `https://developers.strava.com/docs/webhooks/` — Webhook creation, GET validation, POST body format, deauth event shape, 2-second requirement
- `https://www.strava.com/legal/api` — TOS Section 5.4 (delete all personal data on deauth), Section 2.14(f) (48-hour deletion window), Section 5 (privacy notice requirements)
- `https://docs.github.com/en/rest/repos/contents#delete-a-file` — DELETE endpoint, required `sha` field, 200 response on success

### Secondary (MEDIUM confidence)
- Strava community hub discussion on webhook event schema — confirmed `aspect_type: "delete"` and `updates.authorized: "false"` string format (consistent with official docs)
- Phase 29 RESEARCH.md — confirmed v1 handler pattern, existing env vars, fire-and-forget build hook pattern

### Tertiary (LOW confidence)
- WebSearch results on Netlify Lambda function lifecycle after response — behavior of in-flight promises post-return not definitively confirmed from official docs; flag for validation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all APIs verified against official docs
- Architecture: HIGH — single-endpoint dual-method pattern is directly documented by Strava
- Deauth event shape: HIGH — `aspect_type: "delete"` and `updates.authorized: "false"` (string) confirmed from official Strava webhook docs and community reports
- Pitfalls: HIGH for string-vs-boolean and subscription uniqueness; MEDIUM for Netlify function lifecycle after response

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (30 days — Strava webhook API is stable; GitHub Contents API is stable)
