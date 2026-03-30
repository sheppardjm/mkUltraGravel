---
phase: 29-strava-oauth-activity-submission
verified: 2026-03-30T19:35:27Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 29: Strava OAuth + Activity Submission — Verification Report

**Phase Goal:** A rider can submit their Strava activity through the site, authenticate via OAuth, have their segment efforts extracted and scored, self-report their gender category, consent to public display, and have their results committed to the repository — triggering a site rebuild.

**Verified:** 2026-03-30T19:35:27Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A rider can paste their Strava activity URL into the submission form and be redirected to Strava's OAuth consent screen | VERIFIED | `submit.astro` renders a URL input form at `/submit`; client-side JS validates the URL matches `strava.com/activities/\d+` and redirects to `/api/strava-auth?activityUrl=...`; `strava-auth.js` validates the URL server-side, generates a CSRF nonce, encodes `{nonce, activityUrl}` as base64url state, and issues a 302 to `https://www.strava.com/oauth/authorize` with `activity:read_all` scope |
| 2 | After authorizing, the rider sees a submission form with a gender/category dropdown (men/women/non-binary) and an explicit consent checkbox for public results display | VERIFIED | `strava-callback.js` redirects to `/submit-confirm?data={base64url}`; `submit-confirm.astro` decodes the payload server-side, displays athlete name, matched segment count, and activity URL, then presents a `<select>` with values M/F/NB and a required consent checkbox (`value="yes"`) with the exact public display consent text |
| 3 | On submission, the system extracts segment_efforts matching the 9 event segments from the authorized activity and rejects activities that contain no matching segment efforts | VERIFIED | `strava-callback.js` fetches `activities/{id}?include_all_efforts=true`, filters against `ALL_SEGMENT_IDS` (all 9 IDs as strings), casts `String(effort.segment.id)` before comparison, and returns a user-friendly 400 HTML page with a link back to `/submit` when `matchingEfforts.length === 0` |
| 4 | A per-athlete JSON result file is committed to the repository via GitHub API, and a Netlify build hook triggers site rebuild | VERIFIED | `submit-result.js` builds a 6-field result object (athleteId, name, gender, activityUrl, submittedAt, segments) conforming to the Phase 28 schema; commits via GitHub Contents API GET-then-PUT to `public/data/results/athletes/{athleteId}.json`; triggers `NETLIFY_BUILD_HOOK` via fire-and-forget POST |
| 5 | The rider sees confirmation that their results were submitted successfully | VERIFIED | `submit-result.js` returns an HTML success page (200) with "Results Submitted!" heading, athlete name, category label, and links to home and `/submit` — directly, not via redirect |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `netlify.toml` | Build config, function directory, /api/* redirect | VERIFIED | 13 lines; has `command = "npm run build"`, `publish = "dist"`, `functions = "netlify/functions"`, `/api/*` → `/.netlify/functions/:splat` (status 200) |
| `netlify/functions/strava-auth.js` | OAuth initiation with CSRF state + activity URL encoding | VERIFIED | 58 lines; exports `handler`; validates URL regex, generates 16-byte hex nonce, base64url-encodes `{nonce, activityUrl}`, sets `HttpOnly; Secure; SameSite=Lax; Max-Age=600` cookie, redirects to Strava with `activity:read_all` scope |
| `netlify/functions/strava-callback.js` | OAuth code exchange, segment extraction, CSRF verify, redirect to confirm | VERIFIED | 239 lines; exports `handler`; verifies CSRF nonce via cookie comparison, POSTs to `strava.com/api/v3/oauth/token`, fetches activity with `include_all_efforts=true`, filters to 9 segment IDs with `String()` cast, rejects zero-match activities with HTML error, clears CSRF cookie (`Max-Age=0`), redirects to `/submit-confirm` |
| `netlify/functions/submit-result.js` | Gender/consent validation, GitHub API commit, rebuild trigger | VERIFIED | 274 lines; exports `handler`; validates `consent === 'yes'` and gender in `{M, F, NB}`, decodes base64url payload, builds 6-field schema-conforming object, GET-then-PUT via GitHub Contents API, fire-and-forget `NETLIFY_BUILD_HOOK` POST, returns HTML success page |
| `src/pages/submit.astro` | Activity URL entry form at /submit | VERIFIED | 166 lines; imports `BaseLayout`; URL input with placeholder, client-side regex validation, redirect to `/api/strava-auth`, OAuth-denial alert on `?submit=denied` |
| `src/pages/submit-confirm.astro` | Gender/consent confirmation form with extracted segment data | VERIFIED | 271 lines; imports `BaseLayout`; decodes base64url in frontmatter, displays name/segment count/activity URL, `<select>` (M/F/NB), consent checkbox (`value="yes"`, required), hidden `data` field, POSTs to `/api/submit-result` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `submit.astro` | `/api/strava-auth` | form action + JS redirect | VERIFIED | Line 62: `action="/api/strava-auth"`; Line 155: `window.location.href = \`/api/strava-auth?activityUrl=...\`` |
| `strava-auth.js` | `strava.com/oauth/authorize` | 302 redirect with state | VERIFIED | Line 44: `https://www.strava.com/oauth/authorize?${params}` with full OAuth params including base64url state |
| `strava-callback.js` | `strava.com/api/v3/oauth/token` | POST fetch for token exchange | VERIFIED | Line 121: `fetch('https://www.strava.com/api/v3/oauth/token', { method: 'POST', ... })` |
| `strava-callback.js` | `strava.com/api/v3/activities/{id}` | GET with `include_all_efforts=true` | VERIFIED | Line 151: `https://www.strava.com/api/v3/activities/${activityId}?include_all_efforts=true` |
| `strava-callback.js` | `submit-confirm.astro` | 302 redirect with base64url data | VERIFIED | Line 233: `Location: \`/submit-confirm?data=${encodedPayload}\`` |
| `submit-confirm.astro` | `/api/submit-result` | form POST with hidden fields | VERIFIED | Line 122: `action="/api/submit-result" method="POST"`; hidden `data` input at line 125 |
| `submit-result.js` | `api.github.com/repos/.../contents/...` | GET-then-PUT via Contents API | VERIFIED | Line 167: `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`; GET for SHA, PUT with standard base64 content |
| `submit-result.js` | `NETLIFY_BUILD_HOOK` | POST fire-and-forget | VERIFIED | Line 265: `fetch(NETLIFY_BUILD_HOOK, { method: 'POST', body: '{}' }).catch(...)` |

---

### Requirements Coverage

All 5 success criteria from the phase goal are satisfied by the verified truths above. No requirements are blocked.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `submit.astro` | 75 | `placeholder=` HTML attribute | Info | Input placeholder text — expected UX pattern, not a stub |

No blockers. No incomplete implementations. The single "placeholder" hit is a legitimate HTML `<input placeholder="...">` attribute, not a stub comment.

---

### Human Verification Required

The following items require a live environment to verify. All automated structural checks pass.

#### 1. OAuth Round-Trip (Full Flow)

**Test:** Visit `https://mkultragravel.netlify.app/submit`, paste a valid Strava activity URL from an account that has ridden the MK Ultra Gravel course, click "Connect with Strava", complete Strava OAuth.
**Expected:** Strava OAuth consent screen appears, then after authorization the `/submit-confirm` page shows the rider's name, matched segment count, and a working form with gender dropdown and consent checkbox.
**Why human:** Requires live Strava OAuth app credentials and a real Strava account with an activity containing matching segment efforts. Cannot be verified from static code.

#### 2. Segment Rejection Path

**Test:** Submit a Strava activity URL for a ride that does NOT contain any of the 9 event segments (e.g. a different route).
**Expected:** After OAuth, the rider sees the "No Matching Event Segments Found" HTML error page with a link back to `/submit`.
**Why human:** Requires a real Strava activity with zero matching segments.

#### 3. GitHub Commit + Rebuild

**Test:** Complete the full flow with a real submission (consent checked, gender selected). Check GitHub repo and Netlify deploy log.
**Expected:** A file appears at `public/data/results/athletes/{athleteId}.json` containing the 6-field schema-conforming JSON. A new Netlify deploy is triggered within seconds.
**Why human:** Requires live GitHub PAT (GITHUB_TOKEN) and Netlify build hook configured in Netlify dashboard.

#### 4. Duplicate Submission (Update Path)

**Test:** Submit the same Strava activity URL twice from the same athlete account.
**Expected:** The second submission overwrites the first (GET returns a SHA, PUT succeeds with that SHA). No 409 conflict. The file timestamp (`submittedAt`) updates to the second submission time.
**Why human:** Requires two real submissions from the same athlete.

---

## Verification Summary

Phase 29 goal is fully achieved at the code level. All 5 observable truths are backed by substantive, wired implementations:

- The entry form (`submit.astro`) and OAuth initiation function (`strava-auth.js`) correctly implement CSRF protection via the double-submit cookie pattern.
- The callback function (`strava-callback.js`) correctly implements all 9 segment IDs as string literals, casts Strava's integer IDs with `String()` before comparison, fetches with `include_all_efforts=true`, and clears the CSRF cookie after use.
- The confirmation page (`submit-confirm.astro`) presents exactly the required gender options (M/F/NB) and an explicit public consent checkbox.
- The submission handler (`submit-result.js`) builds a 6-field result object that exactly matches the Phase 28 schema (`additionalProperties: false`), uses GET-then-PUT for create/update, handles 409 race conditions gracefully, and triggers a fire-and-forget Netlify rebuild.
- The build passes cleanly (`astro build` via Node 25): `/submit` and `/submit-confirm` both generate static pages.

The pipeline is wired end-to-end: `submit.astro` → `strava-auth.js` → Strava OAuth → `strava-callback.js` → `submit-confirm.astro` → `submit-result.js` → GitHub Contents API + Netlify build hook.

The 4 human verification items above require live credentials and a deployed environment — they cannot be structurally verified from code. The code itself contains no gaps.

---

_Verified: 2026-03-30T19:35:27Z_
_Verifier: Claude (gsd-verifier)_
