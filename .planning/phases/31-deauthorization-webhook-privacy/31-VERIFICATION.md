---
phase: 31-deauthorization-webhook-privacy
verified: 2026-03-30T20:55:22Z
status: passed
score: 5/5 must-haves verified
---

# Phase 31: Deauthorization Webhook + Privacy Notice Verification Report

**Phase Goal:** The site handles Strava deauthorization callbacks and deletes athlete data within 48 hours, meeting TOS Section 5.4 requirements and displaying a privacy notice on the submission page.
**Verified:** 2026-03-30T20:55:22Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | When Strava sends a GET with hub.mode=subscribe and matching verify_token, function responds 200 echoing hub.challenge | VERIFIED | Lines 120-135: mode+verifyToken check returns 200 with `{ 'hub.challenge': challenge }` |
| 2 | When Strava sends a GET with non-matching verify_token, function responds 403 | VERIFIED | Line 134: falls through to `return { statusCode: 403, body: 'Forbidden' }` |
| 3 | When Strava sends a POST deauth event (object_type=athlete, aspect_type=delete, updates.authorized='false'), function deletes athlete JSON from GitHub and triggers rebuild | VERIFIED | Lines 153-161: isDeauth check calls await deleteAthleteData(); lines 33-110 implement full GET-SHA then DELETE pattern with build hook |
| 4 | When Strava sends a POST for athlete with no existing result file, function responds 200 without error (idempotent) | VERIFIED | Lines 57-59: 404 on GET SHA logs and returns; line 165 always returns 200 for all POST events |
| 5 | Submit page displays privacy notice explaining data is stored publicly, how to remove it via Strava settings, and 48-hour deletion guarantee | VERIFIED | Lines 117-123 of submit.astro: paragraph with "stored publicly", strava.com/settings/apps link, "deleted within 48 hours of deauthorization" |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `netlify/functions/strava-webhook.js` | Dual-method webhook handler (GET validation + POST deauth with deleteAthleteData) | VERIFIED | 172 lines, valid syntax (node -c passes), v1 exports.handler, no stub patterns |
| `src/pages/submit.astro` | Privacy notice paragraph below form footer | VERIFIED | Lines 117-123 contain full privacy notice with Strava settings link |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `strava-webhook.js` | GitHub Contents API | fetch DELETE to api.github.com | WIRED | Line 42: `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`; line 78: `method: 'DELETE'` |
| `strava-webhook.js` | `public/data/results/athletes/{athleteId}.json` | File path construction from owner_id | WIRED | Line 41: `` `public/data/results/athletes/${athleteId}.json` `` constructed from `String(payload.owner_id \|\| payload.object_id)` |
| `src/pages/submit.astro` | `https://www.strava.com/settings/apps` | Anchor link in privacy notice | WIRED | Line 120: `href="https://www.strava.com/settings/apps"` with target=_blank and rel=noopener |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| Strava TOS Section 5.4: delete athlete data within 48 hours of deauthorization | SATISFIED | Webhook deletes athlete JSON synchronously within the Netlify function invocation; POST to Strava build hook triggers site rebuild immediately after |
| Display privacy notice on submission page | SATISFIED | Privacy notice with data storage, Strava settings link, and 48-hour deletion guarantee is present |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/pages/submit.astro` | 75 | `placeholder="..."` on input element | Info | HTML input placeholder attribute — not a code stub, expected UI behavior |

No blockers or warnings found. The single "placeholder" match is an HTML form input's placeholder attribute, not a code stub.

### Functional Verification Details

**GET handler (subscription validation):**
- Reads `hub.mode`, `hub.challenge`, `hub.verify_token` from `event.queryStringParameters`
- Returns 200 + `{ 'hub.challenge': challenge }` when mode=subscribe and verify_token matches `process.env.STRAVA_VERIFY_TOKEN`
- Returns 403 for any mismatch

**POST handler (deauth events):**
- Parses body as JSON; malformed body returns 200 (prevents Strava retries)
- Deauth detection: `payload.object_type === 'athlete' && payload.aspect_type === 'delete' && payload.updates?.authorized === 'false'` (string, not boolean — correct per Strava docs)
- `athleteId = String(payload.owner_id || payload.object_id)` with defensive fallback
- Returns 200 for ALL POST events regardless of deauth status

**deleteAthleteData helper:**
- Guards on GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO presence before attempting anything
- GET SHA → 404 returns idempotently → DELETE with SHA → fire-and-forget build hook
- All errors logged and swallowed (no throws — webhook already acknowledged)

**Infrastructure:**
- `netlify.toml` sets `functions = "netlify/functions"` — function is auto-discovered
- File is in `netlify/functions/` alongside all other Phase 29 functions (strava-auth.js, strava-callback.js, submit-result.js)
- Endpoint reachable at `/.netlify/functions/strava-webhook` (and `/api/strava-webhook` via redirect rule)

### Human Verification Required

The following items cannot be verified programmatically:

#### 1. Webhook Subscription Registration
**Test:** Register the webhook with Strava using the curl command from the PLAN (requires actual Strava API credentials and a deployed instance).
**Expected:** Strava sends a GET to the function with hub.mode=subscribe; function responds 200 with hub.challenge; Strava confirms subscription.
**Why human:** Requires live Strava API credentials and a deployed Netlify function.

#### 2. Live Deauth End-to-End
**Test:** Deauthorize the app from a Strava account that has a result file in `public/data/results/athletes/{id}.json`; wait for webhook delivery.
**Expected:** Strava sends a POST within minutes; function deletes the file; site rebuilds and the athlete's results no longer appear.
**Why human:** Requires live Strava credentials, deployed function, and an actual athlete result file.

#### 3. Privacy Notice Visual Check
**Test:** Visit the `/submit` page in a browser.
**Expected:** Privacy notice paragraph appears below the "No data is stored beyond your segment times." text, inside the form card. Strava settings link is clickable and styled with the accent color.
**Why human:** Visual confirmation that styling is correct and matches the surrounding form.

---

## Summary

Phase 31 goal is fully achieved. Both deliverables are present, substantive, and correctly implemented:

1. `netlify/functions/strava-webhook.js` — 172-line function with valid syntax, v1 handler pattern, correct string equality check for `updates.authorized`, idempotent 404 handling, GET-SHA-then-DELETE GitHub Contents API pattern, fire-and-forget build hook, and proper 200/403/405 status code routing.

2. `src/pages/submit.astro` — Privacy notice paragraph at lines 117-123 communicates that segment times are stored publicly, provides a link to Strava settings for revocation, and states data will be deleted within 48 hours of deauthorization.

The only remaining items are three human-verification steps that require live Strava API credentials and a deployed environment — all three are expected to be one-time user setup tasks, not code deficiencies.

---

*Verified: 2026-03-30T20:55:22Z*
*Verifier: Claude (gsd-verifier)*
