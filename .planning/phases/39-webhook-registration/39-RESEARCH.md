# Phase 39: Webhook Registration - Research

**Researched:** 2026-03-31
**Domain:** Strava Webhook Events API — subscription registration and end-to-end verification
**Confidence:** HIGH

---

## Summary

Phase 39 is an operational phase, not a build phase. The `netlify/functions/strava-webhook.js` handler was implemented and deployed in Phase 31 (verified 5/5 must-haves). All required environment variables are confirmed set in Netlify (Phase 36). The OAuth pipeline is verified end-to-end on production (Phase 38). Phase 39 has exactly three jobs: (1) register the Strava webhook subscription by running a single curl command, (2) confirm the GET challenge/response handshake succeeded by checking the subscription is active, and (3) simulate a deauthorization POST against the live function to confirm athlete data deletion and rebuild trigger.

The Strava webhook API limits each app to one active subscription. Before registering, a GET check must be run to confirm no subscription already exists from earlier experiments. If one exists with a wrong callback URL, it must be deleted first. The registration curl triggers an immediate GET to the function from Strava — if the function responds correctly, Strava returns a subscription ID in the response body. There is no Strava-provided test harness; the deauth test is done via a direct curl POST to the function URL with a manually crafted deauth payload.

The critical subtlety for the deauth test: `updates.authorized` must be the string `"false"`, not a boolean (Phase 31 research, HIGH confidence, verified against Strava official docs). The function checks `payload.updates?.authorized === 'false'`. The test payload must match this exactly, and `owner_id` must be set to a real athlete ID that has a JSON file in `public/data/results/athletes/`.

**Primary recommendation:** Check for existing subscription first, register if absent, confirm subscription ID, then test deauth deletion against athlete `2262684` (the developer's real submission from Phase 38 testing, currently present at `public/data/results/athletes/2262684.json`).

---

## Standard Stack

No new packages or libraries needed. Phase 39 is 100% operational — all tooling is curl and the Netlify dashboard.

### Core
| Tool/API | Version | Purpose | Why Standard |
|----------|---------|---------|--------------|
| Strava Push Subscriptions API | v3 (stable) | Register webhook subscription | Only Strava-provided webhook registration mechanism |
| curl | system | Execute registration and test commands | Standard; no auth libraries needed for these API calls |
| Netlify Functions Logs | current | Verify function execution and deletion success | Dashboard at site > Logs & Metrics > Functions |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| GitHub repo `public/data/results/athletes/` | Source of truth for athlete JSON files | Verify deauth deletion by checking file presence before/after |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual curl to register | Auto-register in function code | Strava enforces one subscription per app; code-based registration on every deploy would error on existing subscription |
| Simulate deauth via curl | Actually deauthorize via Strava settings | Deauthorizing via settings is irreversible during testing — real event delivery has unknown latency; curl simulation is instant and controlled |

**Installation:** No new packages.

---

## Architecture Patterns

### Existing Function Location
```
netlify/
└── functions/
    └── strava-webhook.js    # Phase 31 — already deployed, DO NOT MODIFY
```

The function is deployed and live at:
- `https://mkultragravel.netlify.app/.netlify/functions/strava-webhook`
- Also accessible at `/api/strava-webhook` via netlify.toml redirect

### Pattern 1: Check → Register → Verify (Subscription Registration Flow)

**What:** Three sequential curl commands to safely bring up the subscription without duplicates.

**When to use:** Once, after confirming Phase 38 is complete and the function is deployed.

```bash
# Step 1: Check for existing subscription
# Source: https://developers.strava.com/docs/webhooks/
curl -G https://www.strava.com/api/v3/push_subscriptions \
  -d client_id=$STRAVA_CLIENT_ID \
  -d client_secret=$STRAVA_CLIENT_SECRET

# Expected: [] (empty array) if no subscription exists
# If returns existing subscription with wrong callback_url: must DELETE first (see Step 1b)

# Step 1b: Delete stale subscription (only if Step 1 returned an existing one)
curl -X DELETE "https://www.strava.com/api/v3/push_subscriptions/{id}?client_id=$STRAVA_CLIENT_ID&client_secret=$STRAVA_CLIENT_SECRET"

# Step 2: Register the subscription
# This immediately triggers Strava's GET validation of the callback URL
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=$STRAVA_CLIENT_ID \
  -F client_secret=$STRAVA_CLIENT_SECRET \
  -F callback_url=https://mkultragravel.netlify.app/.netlify/functions/strava-webhook \
  -F verify_token=dfb4e6536c623010dc78e73202a19773

# Expected success response: {"id": <subscription_id>}

# Step 3: Confirm subscription is active
curl -G https://www.strava.com/api/v3/push_subscriptions \
  -d client_id=$STRAVA_CLIENT_ID \
  -d client_secret=$STRAVA_CLIENT_SECRET

# Expected: array with one object containing id, callback_url, and active=true
```

### Pattern 2: Simulated Deauth Test (POST Directly to Function)

**What:** Craft a curl that mimics Strava's deauth POST to the live function. Uses a real athlete ID that has a JSON file.

**When to use:** After subscription is active, to verify the deletion flow.

```bash
# Pre-test: Confirm the target file exists in the repo
# File: public/data/results/athletes/2262684.json (developer's real Phase 38 test result)

# Execute simulated deauth POST
# Source: https://developers.strava.com/docs/webhooks/ (Troubleshooting section)
curl -X POST https://mkultragravel.netlify.app/.netlify/functions/strava-webhook \
  -H 'Content-Type: application/json' \
  -d '{
    "aspect_type": "delete",
    "event_time": 1711900800,
    "object_id": 2262684,
    "object_type": "athlete",
    "owner_id": 2262684,
    "subscription_id": <YOUR_SUBSCRIPTION_ID>,
    "updates": { "authorized": "false" }
  }'

# Expected: HTTP 200 with body "EVENT_RECEIVED"

# Post-test verification:
# 1. Check Netlify function logs for "Deleted data for athlete 2262684 (TOS 5.4 compliance)"
# 2. Confirm public/data/results/athletes/2262684.json is deleted from GitHub repo
# 3. Confirm a new rebuild triggered (check Netlify deploys list for a build commit
#    with message "deauth: delete athlete 2262684 data per TOS 5.4")
```

**Critical:** `updates.authorized` must be the string `"false"` (not boolean `false`). The function uses strict equality `=== 'false'`. A JSON `false` (no quotes) will not trigger deletion.

### Pattern 3: Accessing Netlify Function Logs

**What:** After running the deauth test, verify execution by checking function logs.

**Where:** Netlify Dashboard > Sites > mkUltraGravel > Logs & Metrics > Functions > strava-webhook

The log will show:
- `deleteAthleteData: Deleted data for athlete 2262684 (TOS 5.4 compliance)` on success
- `deleteAthleteData: No data file found for athlete 2262684 — nothing to delete` if the file doesn't exist
- `deleteAthleteData: GitHub DELETE failed (${status})` on GitHub API failure

### Anti-Patterns to Avoid

- **Running registration curl twice without checking first:** Strava returns a 400/422 error if a subscription already exists. The check-first pattern prevents confusion.
- **Using `/api/strava-webhook` instead of the direct function URL for registration:** While both work currently (the netlify.toml redirect handles it), register with the direct `/.netlify/functions/strava-webhook` URL to avoid dependency on redirect rules.
- **Testing deauth with `"authorized": false` (boolean, not string):** The function checks `=== 'false'` (string strict equality). Sending a JSON boolean false will silently fail — function responds 200 but does NOT delete the file.
- **Testing deauth against a non-existent athlete ID:** Use `2262684` (confirmed present in `public/data/results/athletes/`) for a meaningful end-to-end test. Using a seed ID (like `seed-m-01`) would also work but seed files are not real athlete data.
- **Skipping the pre-test file existence check:** If the file was already deleted (e.g., by a prior test run), the function returns 200 and logs "nothing to delete" — this looks like success but doesn't verify deletion occurred.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Webhook registration | Code auto-registration in function | Manual curl (one-time) | One sub per app; auto-reg on every deploy errors on existing sub |
| Deauth event signature verification | Custom HMAC check | None — not needed | Strava does NOT sign POST webhook bodies; no signature exists to verify |
| Deauth test harness | Test script or Netlify deploy preview | Direct curl to production function | Strava's own "troubleshooting" approach is direct POST to callback URL |

**Key insight:** Phase 39 is operational, not engineering. Don't build tooling for a one-time registration event.

---

## Common Pitfalls

### Pitfall 1: Subscription Already Exists From Prior Phase

**What goes wrong:** Phase 31 or 36 setup notes mentioned webhook registration as a "user setup" step that some developers run early. The registration curl fails with HTTP 400 and a message like `"already has subscription"`.

**Why it happens:** Strava limits each app to one active subscription. If the developer ran the registration curl during Phase 31 setup (per the Phase 31 SUMMARY user setup instructions), the subscription may already exist.

**How to avoid:** Always run the GET check first. If a subscription exists with `callback_url = https://mkultragravel.netlify.app/.netlify/functions/strava-webhook`, the subscription is already correct — just record the ID, skip re-registration, and proceed directly to the verification steps.

**Warning signs:** POST registration returns a non-`{"id": ...}` response or HTTP 400.

### Pitfall 2: `updates.authorized` Boolean vs. String in Test Payload

**What goes wrong:** The curl test uses JSON `-d '{"updates": {"authorized": false}}'` (boolean) instead of `{"updates": {"authorized": "false"}}` (string). Function returns 200 but no deletion happens.

**Why it happens:** Natural JSON convention puts booleans without quotes. Strava actually sends a string `"false"`.

**How to avoid:** Always quote the value: `"authorized": "false"`. Verify by checking Netlify logs — if the log shows `deleteAthleteData:` lines, it worked. If the POST returns 200 but no log line appears for `deleteAthleteData`, the deauth condition wasn't triggered.

**Warning signs:** Curl returns 200 "EVENT_RECEIVED" but no deletion commit appears in GitHub.

### Pitfall 3: GET Handshake Fails Because Function Is Not Deployed

**What goes wrong:** The registration curl POST to Strava succeeds at first, but Strava immediately GETs the callback URL and receives a 404 or timeout. Strava rejects the subscription.

**Why it happens:** The Netlify function must already be deployed before subscription registration. If running from a feature branch or if the last deploy failed, the function may not be live.

**How to avoid:** Before running registration, verify the function responds to a manual GET:
```bash
curl -I "https://mkultragravel.netlify.app/.netlify/functions/strava-webhook?hub.mode=subscribe&hub.challenge=test&hub.verify_token=dfb4e6536c623010dc78e73202a19773"
```
Expected: HTTP 200 with `{"hub.challenge":"test"}`. If this returns 403 or 404, deploy must be verified first.

**Warning signs:** Registration curl response body contains error about "callback URL not reachable" or "unable to verify subscription".

### Pitfall 4: Deauth Test File Already Deleted

**What goes wrong:** The deauth simulation is run a second time after the file was already deleted by the first run. Function returns 200 and logs "nothing to delete" — developer thinks the test failed.

**Why it happens:** The delete is idempotent by design. After the first successful deletion, there's nothing left to delete.

**How to avoid:** After each successful deauth test, re-add the test file to the repo before re-testing, OR test against a different athlete ID. The developer needs to be aware: a clean test requires a pre-existing file.

**Warning signs:** GitHub shows no new commit from the webhook test but function returned 200.

### Pitfall 5: Rebuild Not Triggered

**What goes wrong:** The file is deleted from GitHub but no Netlify rebuild fires. `NETLIFY_BUILD_HOOK` env var is not set or is wrong.

**Why it happens:** The build hook URL is env-var driven. If missing, the function logs a warning and skips the rebuild.

**How to avoid:** After the deauth test, check Netlify deploy history for a new build triggered by the GitHub commit (not just the file deletion commit — the build hook is a separate POST). Also check Netlify function logs for `NETLIFY_BUILD_HOOK is not set` warning.

**Warning signs:** File is deleted from repo but site still shows the athlete's results after the next manual check.

---

## Code Examples

All relevant code is already deployed in `netlify/functions/strava-webhook.js`. No new code to write.

### Manual GET Validation Test (Pre-Registration Smoke Test)

```bash
# Source: https://developers.strava.com/docs/webhooks/
# Tests that the deployed function handles the GET handshake correctly before registering.
# Run this BEFORE the registration curl to confirm function is live.

curl -v "https://mkultragravel.netlify.app/.netlify/functions/strava-webhook?hub.mode=subscribe&hub.challenge=my_test_challenge_12345&hub.verify_token=dfb4e6536c623010dc78e73202a19773"

# Expected response:
# HTTP 200
# Content-Type: application/json
# Body: {"hub.challenge":"my_test_challenge_12345"}
```

### Registration Curl (Use Netlify Env Values)

```bash
# Source: https://developers.strava.com/docs/webhooks/
# STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET are in Netlify env vars (not in code).
# Retrieve them from Netlify dashboard > Site settings > Environment variables.

curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=YOUR_CLIENT_ID \
  -F client_secret=YOUR_CLIENT_SECRET \
  -F callback_url=https://mkultragravel.netlify.app/.netlify/functions/strava-webhook \
  -F verify_token=dfb4e6536c623010dc78e73202a19773

# Success response: {"id": 123456}
# Failure responses:
#   400/422 "already has subscription" → check existing with GET first, use that ID
#   400 "callback not verified" → function is not responding correctly to GET handshake
```

### Deauth Simulation Curl (After Registration)

```bash
# Source: https://developers.strava.com/docs/webhooks/ (Troubleshooting section)
# Replace SUBSCRIPTION_ID with the ID returned by registration.
# owner_id 2262684 = developer's real submission (file confirmed at
# public/data/results/athletes/2262684.json as of Phase 38).

curl -X POST https://mkultragravel.netlify.app/.netlify/functions/strava-webhook \
  -H 'Content-Type: application/json' \
  -d '{
    "aspect_type": "delete",
    "event_time": 1711900800,
    "object_id": 2262684,
    "object_type": "athlete",
    "owner_id": 2262684,
    "subscription_id": SUBSCRIPTION_ID,
    "updates": { "authorized": "false" }
  }'

# Expected: HTTP 200, body: EVENT_RECEIVED
# Verify:
# 1. Netlify logs: "Deleted data for athlete 2262684 (TOS 5.4 compliance)"
# 2. GitHub repo: public/data/results/athletes/2262684.json deleted
# 3. GitHub commit: "deauth: delete athlete 2262684 data per TOS 5.4"
# 4. Netlify deploy: new build triggered (check Deploys tab)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Webhook validation with HMAC | No signature — Strava doesn't sign POST events | Always | No signature to verify; skip custom HMAC |
| Webhook registered during code deploy | Manual one-time curl after deploy | Always | Registration is a one-time operation separate from deployment |
| Separate GET and POST handlers | Single endpoint, branch on `httpMethod` | Always | Strava requires one callback URL that handles both methods |

**Deprecated/outdated:**
- `https://api.strava.com/api/v3/` base URL: use `https://www.strava.com/api/v3/` per current Strava docs.

---

## Open Questions

1. **Does a Strava webhook subscription already exist for this app?**
   - What we know: Phase 31 SUMMARY listed webhook registration as a "user setup" step. Phase 36 set up the STRAVA_VERIFY_TOKEN. It's unknown if the developer ran the registration curl at any point.
   - What's unclear: Whether a subscription is already active and what URL it points to.
   - Recommendation: Plan 39-01 must start with the GET check as its first step. If a subscription exists with the correct callback URL, skip registration and proceed to verification.

2. **Will the developer re-create athlete 2262684 data after the deauth deletion test?**
   - What we know: The deauth test will permanently delete `public/data/results/athletes/2262684.json` from the repo. The developer is the athlete (confirmed from Phase 38 testing). If this deletion is not re-submitted before Phase 40, the leaderboard will be empty.
   - What's unclear: Whether this matters for the Phase 40 review screenshots.
   - Recommendation: After verifying deauth deletion works, the developer should re-submit their own activity via the OAuth flow to restore their leaderboard entry. Alternatively, test against a seed file that is safe to delete.

---

## Sources

### Primary (HIGH confidence)
- `https://developers.strava.com/docs/webhooks/` — Registration curl, GET challenge/response format, event payload structure, 2-second timeout, one subscription per app limit, troubleshooting POST test curl
- Phase 31 RESEARCH.md (2026-03-30) — Deauth event `aspect_type: "delete"`, `updates.authorized: "false"` (string not boolean), confirmed against official Strava docs, HIGH confidence, 5/5 verified in Phase 31 code
- Phase 36 SUMMARY (2026-03-31) — `STRAVA_VERIFY_TOKEN = dfb4e6536c623010dc78e73202a19773`, all 8 env vars confirmed set in Netlify
- Phase 38 VERIFICATION (2026-03-31) — `public/data/results/athletes/2262684.json` confirmed present (real developer submission from Phase 38 round-trip testing)
- `https://docs.netlify.com/build/functions/logs/` — Netlify function log access at Logs & Metrics > Functions

### Secondary (MEDIUM confidence)
- Strava official webhooks page cross-referenced with Phase 31 research on `aspect_type: "delete"` for deauth events — both sources agree

### Tertiary (LOW confidence)
- Whether a subscription already exists from prior phase setup — unknown, must be confirmed with GET check at plan execution time

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all APIs verified against official docs
- Architecture: HIGH — function already deployed and verified (Phase 31); registration pattern directly documented by Strava
- Pitfalls: HIGH — string-vs-boolean and subscription-exists pitfalls are verified from official docs and prior phase research; deauth test file management is HIGH confidence from repo state inspection
- Deauth payload format: HIGH — `aspect_type: "delete"` and `updates.authorized: "false"` confirmed in Phase 31 research (which itself cited Strava official docs); implemented and verified at 5/5

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (30 days — Strava webhook API is stable; function is already deployed)
