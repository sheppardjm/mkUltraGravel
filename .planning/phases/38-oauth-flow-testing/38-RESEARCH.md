# Phase 38: OAuth Flow Testing - Research

**Researched:** 2026-03-31
**Domain:** Strava OAuth 2.0 end-to-end testing, CSRF cookie behavior, Netlify Functions diagnostics
**Confidence:** HIGH (all primary findings verified against official docs or confirmed bug trackers)

---

## Summary

Phase 38 is a **testing and verification phase**, not a build phase. All the code was written in Phases 29 and 36. The job here is to execute the full OAuth round-trip against production using the developer's own Strava account, verify every error path, and explicitly test Safari cookie behavior.

The standard approach for this phase is: execute the flow manually through a browser, observe function logs in the Netlify dashboard, and document every deviation. There is no new code to write unless a bug is found — in which case the fix is a hotfix within this phase's plan.

The three areas requiring careful attention are:

1. **Scope validation** — Strava includes `scope` as a query parameter in the OAuth callback URL (the redirect back from Strava), not in the token exchange response. The callback URL takes the form `...?code=XXX&scope=activity%3Aread_all&state=...`. The function must read this `scope` query param to detect partial scope acceptance (OAUTH-05). This is currently not implemented in `strava-callback.js`.

2. **Netlify Functions v2 env var bug** — Confirmed fixed by Netlify on 2026-03-30. The v1 `exports.handler` approach in the current codebase remains valid and preferred; no migration needed. The fix resolves the risk but does not change the decision to stay on v1.

3. **Safari SameSite=Lax behavior** — WebKit bug #219650 is marked "RESOLVED - CONFIGURATION CHANGED" (December 2021), but the resolution notes indicate the issue can still manifest when a service worker is installed. This site does not appear to use service workers, so the canonical SameSite=Lax behavior (sent on top-level GET redirects) should apply. Safari iPhone must be explicitly tested per OAUTH-07.

**Primary recommendation:** Execute the OAuth round-trip manually in Chrome first (happy path + all error paths), then repeat specifically in Safari on iPhone. Log the `scope` query param from the Netlify function log to satisfy OAUTH-02/OAUTH-05. If the scope validation gap is found during testing, patch `strava-callback.js` as a hotfix within this phase.

---

## Standard Stack

No new packages required. This is a testing phase using the already-deployed stack.

### Core (existing, no changes)
| Component | Version/Endpoint | Purpose | Status |
|-----------|-----------------|---------|--------|
| `strava-auth.js` | Netlify Functions v1 | OAuth initiation, CSRF nonce, cookie | Deployed |
| `strava-callback.js` | Netlify Functions v1 | Code exchange, segment extraction, redirect | Deployed |
| `submit-result.js` | Netlify Functions v1 | Final form POST, GitHub commit, rebuild | Deployed (Phase 37 verified) |
| Strava OAuth | `https://www.strava.com/oauth/authorize` | User consent screen | Active |
| Netlify Dashboard > Logs & Metrics > Functions | Web UI | Function invocation log viewer | Available |

### Supporting (testing tools)
| Tool | Purpose | Notes |
|------|---------|-------|
| Chrome DevTools > Network | Inspect cookie headers, redirect chain | Primary test browser |
| Safari on iPhone | Verify SameSite=Lax cookie behavior | Explicit requirement OAUTH-07 |
| Netlify Dashboard > Functions log | View `console.log` output from function invocations | Real-time + last-24h available |
| `curl` | Trigger specific error paths without a browser | Supplement for denied consent simulation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual browser testing | Automated Playwright/Cypress tests | Automation is overkill for a one-time flow test; manual is faster and sufficient for a volunteer race event |
| Netlify dashboard logs | `netlify functions:invoke` CLI | `functions:invoke` only works with local dev server, not deployed functions |

---

## Architecture Patterns

### How the Deployed Flow Works (as-built)

```
Browser: /submit (submit.astro)
  → user enters activity URL, clicks "Connect with Strava"
  → JS redirects to: /api/strava-auth?activityUrl=<encoded_url>

Netlify redirect rule: /api/* → /.netlify/functions/:splat (status 200)
  → strava-auth.js receives request
  → validates activityUrl format
  → generates 16-byte hex nonce
  → encodes {nonce, activityUrl} as base64url JSON → state param
  → sets cookie: strava_oauth_state=<nonce>; HttpOnly; Secure; SameSite=Lax; Max-Age=600
  → 302 redirect to Strava authorization URL

Strava: user sees consent screen
  → user approves → Strava redirects to:
    STRAVA_REDIRECT_URI?code=<code>&scope=<granted_scopes>&state=<base64url_state>
  → user denies → Strava redirects to:
    STRAVA_REDIRECT_URI?error=access_denied&state=<base64url_state>

strava-callback.js receives request:
  → if error=access_denied: 302 to /submit?submit=denied
  → decodes state → extracts {nonce, activityUrl}
  → reads cookie strava_oauth_state, verifies nonce matches
  → exchanges code for access token (POST to Strava token endpoint)
  → validates access_token present
  → extracts activityId from activityUrl
  → fetches activity with include_all_efforts=true
  → filters segment_efforts to 9 known segment IDs
  → if 0 matches: returns 400 HTML error page
  → builds {athleteId, name, activityUrl, segments} payload
  → encodes as base64url
  → 302 to /submit-confirm?data=<encoded>
  → clears CSRF cookie (Max-Age=0)

Browser: /submit-confirm (submit-confirm.astro)
  → decodes payload, shows athlete name, segment count, activity URL
  → user selects gender, checks consent, clicks "Submit My Results"
  → POST to /api/submit-result

submit-result.js:
  → validates consent=yes, gender in {M,F,NB}, data present
  → decodes payload, builds Phase 28 schema object
  → GET then PUT to GitHub Contents API
  → fires Netlify build hook
  → returns success HTML page
```

### CSRF Double-Submit Cookie Pattern (as implemented)

The current implementation is a **modified double-submit cookie** pattern:
- Cookie stores only the nonce (32-char hex)
- OAuth state param stores `{nonce, activityUrl}` encoded as base64url JSON
- On callback: verify cookie nonce === decoded state nonce

This is correct for SameSite=Lax. The Strava callback is a top-level GET redirect, so SameSite=Lax cookies are sent. Chrome and Firefox send them reliably. Safari should also send them on top-level GET redirects unless a service worker interferes (WebKit bug #219650 — resolved Dec 2021, edge case only when service worker present).

### Scope in the OAuth Callback URL (IMPORTANT GAP)

Strava includes the granted scope as a query parameter in the callback URL redirect:
```
/.netlify/functions/strava-callback?code=XXX&scope=activity%3Aread_all&state=YYY
```

The `scope` query param reflects what the user actually accepted. If the user downgrades (clicks "See More" and unchecks `activity:read_all`), they may accept `activity:read` only — the `code` will still work but the resulting token will have limited scope.

**Current gap:** `strava-callback.js` does not read the `scope` query param. OAUTH-05 requires scope validation to be added.

**Verification method for OAUTH-02:** Check Netlify function logs for the token exchange response — the `access_token` field presence confirms token exchange worked. The `scope` query param from the callback URL (visible in Netlify logs if logged) confirms `activity:read_all`.

### Anti-Patterns to Avoid

- **Triggering the `strava-auth` function via `/api/` alias for STRAVA_REDIRECT_URI**: The redirect URI set in Netlify env vars and Strava app settings must be the direct function URL (`/.netlify/functions/strava-callback`), not the `/api/strava-callback` rewrite alias. The rewrite is a 200-status passthrough (not a redirect), so the browser URL stays at `/api/...` but Strava's OAuth callback must match exactly. This was already decided in Phase 36.
- **Testing with a Strava activity not on the MK Ultra Gravel course**: The segment matching will return 0 matches and produce a "No Matching Segments" error — this is expected behavior, not a bug.
- **Attempting to use another athlete's Strava account before Developer Program approval**: The app is in Single Player Mode (capacity = 1). Only the developer's own Strava account can authorize. This is a known constraint, not a bug.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scope validation | Custom scope parser | Read `scope` query param from `event.queryStringParameters.scope` | Strava provides scope directly in callback URL |
| Function log access | CLI polling, custom logging service | Netlify Dashboard > Logs & Metrics > Functions | Already built, free, real-time |
| Safari testing | Browser emulation | Actual Safari on iPhone | WebKit behavior must be verified on real device/browser |
| Error path testing | Mock Strava | Use real Strava with specific inputs (deny consent, wrong URL) | OAuth denial works by clicking Cancel on Strava's page |

---

## Common Pitfalls

### Pitfall 1: Scope Validation Gap (OAUTH-05 unimplemented)
**What goes wrong:** `strava-callback.js` does not currently read the `scope` query param. If a user accepts only `activity:read` (not `activity:read_all`), the callback will still proceed and attempt to fetch the activity. The activity fetch may succeed for public activities but silently fail to return all segment efforts for private activities.
**Why it happens:** The scope param wasn't implemented in Phase 29 (was deferred or missed).
**How to avoid:** Add scope validation as the first step after CSRF verification in `strava-callback.js`:
```javascript
const grantedScope = params.scope || '';
if (!grantedScope.includes('activity:read_all')) {
  return errorPage('Strava authorization requires "activity:read_all" scope. Please try again and accept all requested permissions.');
}
```
**Warning signs:** Token exchange succeeds but activity fetch returns fewer segment_efforts than expected.

### Pitfall 2: Safari SameSite=Lax Cookie with Service Worker
**What goes wrong:** CSRF cookie not sent on OAuth callback in Safari, causing all submissions to fail with "Invalid or missing state parameter."
**Why it happens:** WebKit bug #219650 — resolved December 2021 in general, but can still manifest when a service worker is installed on the site.
**How to avoid:** This site does not appear to use service workers (no PWA manifest observed). Test explicitly in Safari iPhone. If encountered, document the behavior. The fix would be removing or updating any service worker.
**Warning signs:** Chrome works, Safari does not. Every Safari callback returns state error.

### Pitfall 3: Netlify Function Log Not Showing Scope
**What goes wrong:** Can't verify OAUTH-02 (access_token includes activity:read_all scope) because the function doesn't log the scope.
**Why it happens:** Current `strava-callback.js` has no `console.log` calls for token data or scope.
**How to avoid:** Add a `console.log` for the scope query param and token response during testing. This can be a temporary log added before the test and removed after.
**Warning signs:** Function logs show only the start invocation, no custom log lines.

### Pitfall 4: STRAVA_REDIRECT_URI Mismatch
**What goes wrong:** Strava OAuth fails with an error page before the callback even reaches the function. Error: "invalid_redirect_uri" or similar.
**Why it happens:** The `STRAVA_REDIRECT_URI` env var or the Strava App Settings "Authorization Callback Domain" does not match exactly.
**How to avoid:** Confirm `STRAVA_REDIRECT_URI` = `https://mkultragravel.netlify.app/.netlify/functions/strava-callback` (set in Phase 36). The Strava app's "Authorization Callback Domain" = `mkultragravel.netlify.app` (set in Phase 36).
**Warning signs:** Browser shows Strava error page before any redirect back to the site.

### Pitfall 5: Using a Strava Activity Without Event Segments
**What goes wrong:** Happy path completes but returns "No Matching Segments" error — looks like a bug but is expected behavior.
**Why it happens:** The developer's test activity may not have been recorded on the MK Ultra Gravel course, or Strava didn't match the segments.
**How to avoid:** Use an activity known to contain at least one of the 9 segment IDs (`24479270`, `24479292`, `41126651`, `24479426`, `24479467`, `24479496`, `34573011`, `16438243`, `6809754`). If no such activity exists, create a synthetic test by submitting a real activity URL and verifying the error path is shown correctly (testing error path OAUTH-04).
**Warning signs:** Error page appears for "No Matching Segments" even though the URL is valid.

### Pitfall 6: Netlify Functions v2 Env Var Bug — Now Fixed
**What goes wrong:** N/A — this was the blocking concern from Phase 29 research. The bug was fixed by Netlify on 2026-03-30.
**Current status:** RESOLVED. Netlify deployed a fix and confirmed monitoring. The v1 `exports.handler` syntax used in all current functions is unaffected and remains correct. No migration to v2 needed.
**Recommendation:** Stay on v1 for this phase. Do not change handler syntax.

---

## Code Examples

### Scope Validation Patch (if needed for OAUTH-05)
```javascript
// Source: Strava OAuth docs — scope is a query param in the callback URL
// Add immediately after CSRF verification, before token exchange
// in netlify/functions/strava-callback.js

const grantedScope = params.scope || '';
if (!grantedScope.split(',').includes('activity:read_all')) {
  return errorPage(
    'Strava authorization requires read access to all activities. ' +
    'Please try again and make sure to accept all requested permissions.'
  );
}
```

### Temporary Diagnostic Logging (add before testing, remove after)
```javascript
// Add to strava-callback.js before token exchange:
console.log('[strava-callback] scope from callback:', params.scope);

// Add after token exchange:
console.log('[strava-callback] token exchange result:', {
  hasAccessToken: !!tokenData.access_token,
  athleteId: tokenData.athlete?.id,
  // Do NOT log the access_token value itself
});

// Add after segment filtering:
console.log('[strava-callback] segment match count:', matchingEfforts.length);
```

### How to Read Scope from Callback URL
```javascript
// Strava callback URL format (from official docs):
// /.netlify/functions/strava-callback?code=XXX&scope=activity%3Aread_all&state=YYY
// URL-decoded: scope=activity:read_all
// Multiple scopes are comma-separated: scope=read,activity:read_all

const grantedScope = (params.scope || '').split(',');
// grantedScope === ['activity:read_all'] for full approval
// grantedScope === ['read'] or ['activity:read'] for partial approval
```

### Denied Consent Error Path Verification
```javascript
// Strava sends: /.netlify/functions/strava-callback?error=access_denied&state=...
// Current strava-callback.js handles this at line 79-85:
if (params.error === 'access_denied') {
  return {
    statusCode: 302,
    headers: { Location: '/submit?submit=denied' },
    body: '',
  };
}
// submit.astro reads ?submit=denied and shows the red denial alert banner
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Netlify Functions v2 `export default` env var bug | Bug fixed by Netlify | 2026-03-30 | v1 `exports.handler` remains correct; v2 is now theoretically safe but migration unnecessary |
| WebKit bug #219650 (SameSite=Lax + service workers) | Resolved | December 2021 | Safari should send Lax cookies on top-level GET redirects normally; edge case is service-worker-only |
| Strava scope in token response | Scope is in callback URL query param, not token response | Strava OAuth design | Scope must be read from `event.queryStringParameters.scope` in the callback function |

---

## Key Findings: Gap Analysis Against Requirements

| Requirement | Status | Notes |
|-------------|--------|-------|
| OAUTH-01: Full OAuth round-trip works | IMPLEMENTED — needs live test | All code deployed via Phase 29; Phase 36 set env vars; Phase 37 verified pipeline |
| OAUTH-02: Token has activity:read_all scope | NEEDS DIAGNOSTIC LOG | Scope is in callback URL query param; add temporary log to verify |
| OAUTH-03: Segment efforts extracted correctly | IMPLEMENTED — needs live test | `strava-callback.js` lines 165-168 filter to 9 segment IDs with `include_all_efforts=true` |
| OAUTH-04: Error states handled gracefully | IMPLEMENTED — needs live test | denied consent (line 79), invalid URL (line 15 strava-auth, line 141 callback), zero segments (line 170) |
| OAUTH-05: Scope validation (detect partial scope) | **CODE GAP** | `strava-callback.js` does not read `params.scope`; this is unimplemented |
| OAUTH-06: CSRF cookie verified on production HTTPS | IMPLEMENTED — needs live test | Double-submit cookie pattern with nonce in cookie + state |
| OAUTH-07: Safari/iPhone tested | NEEDS HUMAN TEST | Must use real device/browser |

**OAUTH-05 is the only code gap identified.** All other requirements need live testing but the code is in place.

---

## Open Questions

1. **Does the developer have a real Strava activity on the MK Ultra Gravel course?**
   - What we know: The OAuth happy path requires an activity with at least one of the 9 segment IDs to reach the leaderboard.
   - What's unclear: Whether the developer's own Strava account has ridden the course.
   - Recommendation: The plan should include a workaround — the "happy path" test can use any activity; if it returns "No Matching Segments," that itself verifies the error path (OAUTH-04 partial). Add guidance to the plan that the segment error path IS the expected result for an activity not on the course.

2. **Should the scope validation patch (OAUTH-05) be done before or during the testing plan?**
   - What we know: The gap is confirmed — `strava-callback.js` does not read `params.scope`.
   - What's unclear: Whether the planner wants this as a pre-test code fix or a conditional task during testing.
   - Recommendation: Make it a mandatory first task in Plan 38-01 — patch the gap, deploy, then test. Otherwise OAUTH-05 cannot be satisfied regardless of test results.

3. **Is there a way to test the denied consent path without actually owning a second Strava account?**
   - What we know: The Strava consent screen has a "Cancel" / "Deny" button.
   - What's unclear: Whether Safari and Chrome both show the cancel button.
   - Recommendation: Yes — on the Strava consent page, simply click "Cancel" or the browser back button. Strava will redirect with `error=access_denied`. No second account needed.

---

## Sources

### Primary (HIGH confidence)
- `https://developers.strava.com/docs/authentication/` — OAuth flow, error=access_denied, scope in callback URL, token exchange response format
- `https://developers.strava.com/docs/getting-started/#oauth` — Callback URL includes "scope accepted by the athlete" as query param
- `https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite` — SameSite=Lax sends on top-level GET cross-site redirects (OAuth callbacks are top-level GET)
- `https://bugs.webkit.org/show_bug.cgi?id=219650` — WebKit bug RESOLVED Dec 2021; edge case only with service workers
- `https://docs.netlify.com/functions/logs/` — Function logs via Netlify Dashboard > Logs & Metrics > Functions; real-time and last-24h
- `https://answers.netlify.com/t/functions-v2-export-default-intermittently-missing-all-user-defined-env-vars-at-runtime/160958` — v2 env var bug RESOLVED 2026-03-30 by Netlify

### Secondary (MEDIUM confidence)
- `https://communityhub.strava.com/developers-knowledge-base-14/our-developer-program-3203` — Single Player Mode: developer's own account can test immediately; multi-athlete requires review
- Netlify Functions CLI docs (`cli.netlify.com/commands/functions/`) — No CLI log viewing for deployed functions; dashboard is the only option

### Tertiary (LOW confidence)
- Phase 29 RESEARCH.md findings on Strava scope and error behavior — verified above with direct source access; now upgraded to HIGH

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new tech; all verified deployed from prior phases
- Architecture: HIGH — code read directly from deployed functions; flow traced from source
- Gap analysis (OAUTH-05): HIGH — code read, `params.scope` confirmed absent from strava-callback.js
- Safari behavior: MEDIUM — WebKit bug confirmed resolved but "edge case with service workers" caveat remains; real device test required
- Scope in callback URL: HIGH — confirmed in Strava getting-started docs ("scope accepted by the athlete" included in callback redirect)

**Research date:** 2026-03-31
**Valid until:** 2026-05-01 (30 days) — Strava OAuth is stable; Netlify Functions bug is resolved; no breaking changes expected
