# Pitfalls Research

**Domain:** Strava API integration + serverless OAuth + results system for static gravel cycling event site
**Project:** MK Ultra Gravel v5.0
**Researched:** 2026-03-30
**Confidence:** HIGH (critical pitfalls verified with official Strava documentation and API agreement)

---

## Critical Pitfalls

### Pitfall 1: Strava API Agreement Prohibits Cross-User Data Display (Leaderboard Killer)

**Severity:** CRITICAL -- may force fundamental redesign of the results system

**What goes wrong:**
The November 2024 Strava API Agreement update (Section 2.10) explicitly states: "You may only display or disclose to an end user the specific Strava Data related to that user." Further: "you may not display or disclose Strava Data related to other users, even if such data is publicly viewable on Strava's Platform."

This means a leaderboard showing Athlete A's segment time to Athlete B is a TOS violation. The entire v5.0 concept of "results page with gravel champion + KOM/QOM champion leaderboards" using Strava-sourced segment times would violate these terms if segment effort data from one user is displayed to another.

**Why it happens:**
The previous decision to drop Strava leaderboards was about endpoint removal (segment leaderboard endpoint blocked since June 2020). The v5.0 pivot to "OAuth-authorized access is different" is partially correct -- OAuth gives access to individual user data -- but the November 2024 agreement restricts what you can DO with that data regardless of how you obtained it.

**How to avoid:**

Option A -- Hybrid approach (RECOMMENDED): Use Strava ONLY to verify activity completion and extract segment effort times for the submitting athlete. Store results in your own JSON as event-owned data (name, category, segment times) that the athlete explicitly consents to publish as event results. The consent happens at submission time on YOUR site, not through Strava's OAuth scope. Strava data is the input; your results JSON is the output. You never display "Strava Data" -- you display "MK Ultra Gravel event results." This is analogous to how timing companies use GPS watches to capture finish times but publish results as their own data.

Option B -- Community Application exception: Strava defines "Community Applications" as apps "created with the primary purpose of permitting athletes to organize and collaborate in group activities" with fewer than 9,999 users. Classification is at Strava's "sole discretion." MK Ultra Gravel could argue it qualifies, but this is risky since Strava makes the call, and the review process is opaque.

Option C -- Consent-gated display: At submission time, explicitly ask athletes: "Do you consent to having your name and segment times displayed on the MK Ultra Gravel results page?" Store the consent flag. Only display data for athletes who consented. This adds legal weight to the hybrid approach.

**Warning signs:**
- Strava developer review flags your application
- Strava revokes your API token
- Your app review request is denied or delayed indefinitely
- Community reports your app for TOS violation

**Phase to address:**
Architecture/design phase -- MUST be resolved before any code is written. The entire data model depends on this decision. Recommend Option A + C combined: Strava verifies and provides data, athlete consents to publication, results are stored as event-owned JSON.

**Confidence:** HIGH -- verified directly against the Strava API Agreement at strava.com/legal/api (fetched 2026-03-30) and the November 2024 support article.

---

### Pitfall 2: Strava Segment Leaderboard Endpoint Is Gone -- No KOM/QOM Holder Data

**Severity:** CRITICAL -- one of the v5.0 target features is impossible as specified

**What goes wrong:**
The v5.0 requirements include "Live KOM/QOM holder data fetched via Strava API at build time." The segment leaderboard endpoint (`/api/v3/segments/:id/leaderboard`) was removed in June 2020 and has not returned. You CANNOT get the current KOM/QOM holder for a segment through the Strava API. The `getSegmentById` endpoint returns segment metadata (distance, elevation, average grade) but NOT the current record holder.

The only way to get KOM/QOM-style data is through `segment_efforts` endpoints, which return the authenticated athlete's OWN efforts on a segment -- not other athletes' efforts. And even `kom_rank` fields in segment effort responses require the athlete to be a Strava subscriber.

**Why it happens:**
Strava moved leaderboard data behind their subscription paywall in 2020 and then restricted API access entirely. This was the original reason for the "Strava leaderboard permanently dropped" decision in PROJECT.md.

**How to avoid:**
- Drop the "live KOM/QOM holder data" requirement entirely. It is not possible through the API.
- Instead, display static segment metadata that IS available: distance, average grade, elevation gain, maximum grade. This data comes from `getSegmentById` and is about the segment itself, not about users.
- For segment links, use direct Strava segment URLs (`strava.com/segments/{id}`) so users can view leaderboards in Strava's own UI (where they have their own subscription).
- Build KOM/QOM champions from YOUR event's submitted data, not from Strava's global leaderboards.

**Warning signs:**
- 404 or 403 responses when calling leaderboard endpoints
- Segment detail responses missing expected fields
- API returning subscription-gated errors for free athletes

**Phase to address:**
Requirements clarification -- must happen immediately. This changes the data model for segment cards.

**Confidence:** HIGH -- verified against Strava's official "Changes to the Segments API" documentation (developers.strava.com/docs/segment-changes/).

---

### Pitfall 3: OAuth Token Storage in Stateless Serverless Functions

**Severity:** CRITICAL -- security vulnerability if done wrong, broken flow if tokens are lost

**What goes wrong:**
Netlify Functions are stateless -- they have no persistent memory between invocations. Strava access tokens expire every 6 hours. Refresh tokens rotate on every use (old refresh token is immediately invalidated). If you store tokens only in the function's runtime memory, they disappear between invocations. If you store them in a cookie or client-side, they are exposed to XSS attacks. If two concurrent requests both try to refresh the same token, one succeeds and the other's refresh token is now invalid -- the user is locked out.

Strava's documentation explicitly warns: "Once a new refresh token code has been returned, the older code will no longer work."

**Why it happens:**
Developers familiar with traditional server-side sessions assume there is persistent state between function invocations. Serverless functions are ephemeral -- each invocation is a clean slate.

**How to avoid:**

For the activity submission flow (user authenticates, submits activity):
1. Use Netlify environment variables for the APPLICATION's client_id and client_secret (these are static, not per-user).
2. For per-user tokens during the OAuth flow: treat the entire submission as a single session. User authorizes -> callback receives auth code -> exchange for access token -> immediately fetch needed data -> process and store results -> done. Do NOT store the user's refresh token for later use.
3. If you need to store tokens for later (e.g., webhook processing), use Netlify Blobs with server-side encryption. Never expose tokens to the client.
4. Implement a token refresh mutex using Netlify Blobs' `onlyIfMatch` (ETag-based conditional writes) to prevent concurrent refresh race conditions.

For build-time segment data fetching (static, not per-user):
1. Use a dedicated "service account" -- a single Strava athlete account that authorizes the app. Store its refresh token as a Netlify environment variable.
2. At build time, refresh the token and fetch segment metadata. This is a single-threaded build process, so no concurrency concern.

**Warning signs:**
- Users report "authentication failed" after successful OAuth
- 401 errors on Strava API calls after token refresh
- Duplicate activities appearing in results (concurrent submission race)
- Tokens appearing in browser DevTools network tab

**Phase to address:**
Serverless backend phase -- token management architecture must be designed before OAuth flow implementation.

**Confidence:** HIGH -- verified against Strava authentication docs (developers.strava.com/docs/authentication/).

---

### Pitfall 4: Application Athlete Limit Blocks User Authentication

**Severity:** CRITICAL -- can block the entire submission flow if not addressed weeks before the event

**What goes wrong:**
New Strava API applications start with an athlete limit (the number of unique users who can authorize). Before your app is reviewed by Strava, you may be limited to authenticating only yourself. Even after initial review, the default athlete cap may be insufficient for your event size. If 50 riders try to submit results and you have a 15-athlete limit, submissions 16-50 fail with no API-level error -- Strava simply won't complete the OAuth flow for new athletes.

The app review process takes 7-10 business days in the best case. Community reports indicate it can take 3-4 weeks. Some developers report submitting requests and never hearing back.

**Why it happens:**
Strava gates API application growth to prevent abuse. Developers often discover the limit only when real users try to authenticate, sometimes at the worst possible time (event day).

**How to avoid:**
1. Register the Strava API application NOW (March 2026). Not in May.
2. Submit the app for review immediately after registration. Include a clear description: "MK Ultra Gravel event timing, ~50-100 athletes, one-time event June 7 2026."
3. Request an athlete limit increase to at least 200 (buffer above expected participants).
4. Build and test the OAuth flow early with test accounts to verify the flow works before event day.
5. Monitor the athlete capacity in your API settings dashboard and the `X-RateLimit-*` response headers.
6. Have a backup plan: if app review is denied or delayed, implement a manual results entry alternative (admin uploads CSV).

**Warning signs:**
- OAuth flow works for you but fails for others
- No response from Strava developer review after 2 weeks
- `X-RateLimit-*` headers show athlete limit approaching capacity

**Phase to address:**
First phase -- register the app and submit for review as the very first action. This is a blocking external dependency with a multi-week lead time.

**Confidence:** HIGH -- verified against multiple Strava Community Hub discussions about review delays and athlete limits.

---

### Pitfall 5: Race Condition on Concurrent Activity Submissions

**Severity:** CRITICAL -- can cause data loss (overwritten results)

**What goes wrong:**
The v5.0 plan stores results as "committed JSON, site rebuilds to update." If two athletes submit results within seconds of each other, both Netlify Function invocations read the current results.json, add their entry, and write back. The second write overwrites the first -- Athlete A's result is lost.

This is worse than it sounds: after an event, many riders submit results within a short window. You could see 20 submissions in 10 minutes. Even with rebuild latency, the JSON write step itself is the race condition.

**Why it happens:**
File-based JSON storage has no built-in concurrency control. Netlify Functions can execute concurrently. There is no database transaction or row-level lock.

**How to avoid:**

Option A -- Append-only individual files (RECOMMENDED): Each submission creates a separate JSON file (e.g., `results/athlete-{strava_id}.json`). The build step reads ALL individual files and merges them into the leaderboard. No file is ever overwritten by another athlete's submission. Git commits from Netlify Functions add individual files, never modify a shared file.

Option B -- Use Netlify Blobs with conditional writes: Netlify Blobs supports `onlyIfMatch` (ETag-based optimistic concurrency). Read the blob, get its ETag, modify, write back with `onlyIfMatch`. If another write happened, retry. This works but adds complexity.

Option C -- Queue-based processing: Submissions go into a queue (Netlify Blob as append log). A scheduled function or build hook processes the queue sequentially. Eliminates concurrent write concern.

**Warning signs:**
- Results count is lower than submissions count
- Athletes report submitting but not appearing on results page
- Git history shows commits that remove previously-added results

**Phase to address:**
Results storage architecture phase -- must choose the storage pattern before building the submission flow.

**Confidence:** HIGH -- verified against Netlify Blobs documentation confirming "last write wins" with no built-in concurrency control.

---

## Moderate Pitfalls

### Pitfall 6: Rate Limits Exhausted During Build-Time Segment Fetching

**Severity:** HIGH -- causes build failures or stale data

**What goes wrong:**
Strava's rate limits are 200 requests per 15 minutes (overall) and 100 requests per 15 minutes for non-upload (read) endpoints, with 1,000 reads per day. MK Ultra has 9 segments. Fetching segment detail for each = 9 API calls. That is fine for a single build. But if you also fetch segment efforts, athlete data, or activity details per submission, and builds trigger frequently (multiple submissions in sequence), you can exhaust the daily limit. Worse: Netlify rebuild triggers from multiple submissions could cause parallel builds, each making API calls that count against the same rate limit.

**Why it happens:**
Developers test with single requests and forget that production involves multiple concurrent operations sharing the same rate limit pool.

**How to avoid:**
1. Cache segment metadata aggressively. Segment details (name, distance, grade) change rarely. Fetch once, commit to repo as static JSON, refresh manually or on a schedule (weekly at most).
2. For build-time data, use a cached segment data file. Only re-fetch if the file is older than 7 days (matches Strava's cache TTL requirement in TOS Section 7.1).
3. Monitor `X-RateLimit-Usage` and `X-ReadRateLimit-Usage` headers on every API response.
4. Reserve at least 50% of rate budget for user-facing operations (OAuth token exchange, activity fetching during submissions). Build-time fetches should never use more than 20 requests per cycle.
5. Implement exponential backoff on 429 responses.

**Warning signs:**
- 429 Too Many Requests responses in build logs
- Builds succeeding but with missing/stale segment data
- Daily limit (1,000) exhausted before end of day

**Phase to address:**
Strava API integration phase -- design the caching strategy before implementing any API calls.

**Confidence:** HIGH -- verified against developers.strava.com/docs/rate-limits/.

---

### Pitfall 7: Activity Validation -- Accepting Submissions That Are Not From The Event

**Severity:** HIGH -- compromises results integrity

**What goes wrong:**
A user authenticates via Strava OAuth, selects an activity, and submits it as their "MK Ultra Gravel" result. But the activity could be: (a) from a different date (not June 7 2026), (b) from a different location (they rode in California), (c) missing the required segments (they took a shortcut), (d) a virtual/indoor ride, or (e) already submitted (duplicate submission).

Without validation, anyone with a Strava account can submit any activity as their event result.

**Why it happens:**
Developers focus on the OAuth flow and assume that if a user authenticated, they are legitimate. But authentication proves identity, not participation.

**How to avoid:**
1. **Date validation:** Check `activity.start_date` is June 7, 2026. Allow a 24-hour window (June 7 00:00 to June 8 00:00 local time). Convert from UTC with timezone offset.
2. **Activity type validation:** Check `activity.type` is "Ride" (not "VirtualRide", "Run", etc.).
3. **Segment matching:** After fetching the activity with `include_all_efforts=true`, verify that `segment_efforts` contains efforts for ALL 6 timed gravel sectors. A valid MK Ultra submission must have efforts on all 6 sectors. KOM segments are optional (rider may have skipped them).
4. **Duplicate prevention:** Check the athlete's Strava ID against existing submissions. One submission per athlete, allow updates/resubmissions (override, don't duplicate).
5. **Geographic proximity (optional but recommended):** Check that the activity's start_latlng is within ~10km of Marquette, MI (46.5436, -87.3954).
6. **Do NOT rely on activity name.** Users can name activities anything.

**Warning signs:**
- Results showing activities from wrong dates
- Segment effort counts varying wildly between submissions
- Same athlete appearing multiple times
- Activities with suspiciously fast times (virtual rides)

**Phase to address:**
Submission flow phase -- validation logic must be implemented in the Netlify Function that processes submissions.

**Confidence:** MEDIUM -- validation logic is standard but segment matching depends on Strava actually matching segments to the activity (GPS quality varies).

---

### Pitfall 8: Gender Categorization -- Strava's API Has Only M, F, or null

**Severity:** HIGH -- the v5.0 spec requires a non-binary category but the data source cannot provide it

**What goes wrong:**
The v5.0 requirements specify "Three gender categories: men, women, non-binary (from Strava profile)." Strava's API returns the `sex` field with only two valid values: "M" or "F". Any other value (including selections from newer Strava UI gender options) resets to `null` in the API. Athletes who select non-binary, prefer not to say, or leave the field empty all return `null`.

You cannot distinguish between "non-binary" and "didn't set their gender" from the API response alone.

**Why it happens:**
Strava's UI has evolved to be more inclusive, but the API has not kept pace. The `sex` field in the DetailedAthlete model remains binary.

**How to avoid:**
1. Do NOT rely solely on Strava's `sex` field for categorization.
2. Add a gender/category selection step in YOUR submission form. Options: "Men", "Women", "Non-Binary". Default to Strava's value if M or F, but ALWAYS allow override.
3. This also handles the case where someone's Strava profile is wrong or where they prefer a different competition category.
4. Store the category in your results JSON as a first-class field, independent of Strava data.
5. For athletes who don't select a category and have `sex: null` from Strava, either prompt them to choose or place them in an "uncategorized" bucket (not ideal -- better to require selection).

**Warning signs:**
- Large number of athletes in the non-binary category who actually just had null Strava profiles
- Athletes requesting category changes after results are published

**Phase to address:**
Submission flow design -- the category selection UI must be part of the submission form.

**Confidence:** HIGH -- verified against Strava API v3 documentation and community discussions confirming the sex field only supports M/F/null.

---

### Pitfall 9: Strava 7-Day Data Cache Limit -- TOS Requires Deletion

**Severity:** HIGH -- TOS violation can result in API access revocation

**What goes wrong:**
Strava API Agreement Section 7.1 states: "No Strava Data shall remain in your cache longer than seven days." If you cache segment metadata, activity details, or athlete profiles and never purge them, you violate the TOS. This seems to conflict with storing results permanently -- but it depends on what you store and how.

**Why it happens:**
Developers cache API responses for performance and forget about the TTL requirement. Or they don't realize "committed JSON in a git repo" counts as caching Strava data.

**How to avoid:**
1. Distinguish between "Strava Data" (API responses, segment metadata, athlete profiles) and "event data" (your results, your scoring, your leaderboard).
2. At submission time: fetch Strava data, extract what you need (segment effort elapsed_time, activity date), compute your results, and store ONLY the derived results. Don't store raw Strava API responses.
3. Results JSON should contain: athlete name (as they entered it, not from Strava profile), category (as they selected it), segment times (as numbers, not Strava effort objects), and total score. Do NOT store Strava athlete IDs, profile URLs, or activity IDs in the published results.
4. You MAY store Strava IDs internally (for deduplication) but must delete them if the athlete deauthorizes.
5. Segment metadata (name, distance, grade) used on cards: fetch at build time, cache for up to 7 days. Re-fetch on next build if stale. Since builds happen on commit, and the site rebuilds on submission, this naturally refreshes.

**Warning signs:**
- Raw Strava API response JSONs committed to the repo
- Strava athlete profile data visible in your results JSON
- No data purge mechanism when athletes deauthorize

**Phase to address:**
Data architecture phase -- define exactly what fields are stored in results JSON and what is transient.

**Confidence:** HIGH -- verified against the Strava API Agreement at strava.com/legal/api.

---

### Pitfall 10: Deauthorization Handling -- Must Delete User Data Within 48 Hours

**Severity:** HIGH -- GDPR and TOS compliance requirement

**What goes wrong:**
When an athlete revokes your app's access (via Strava's settings or your deauthorize endpoint), the API Agreement Section 5.4 requires: "all Personal Data pertaining to that user is deleted from your Developer Applications and related networks, systems and servers." Section 2.14(vi) requires this within 48 hours. If results are committed JSON in a git repo, deleting them requires a new commit, a rebuild, and potentially rewriting git history (which you shouldn't do).

Strava sends a webhook event with `"authorized": "false"` when an athlete deauthorizes.

**Why it happens:**
Developers build the "happy path" (submission) and forget the "unhappy path" (deauthorization/deletion).

**How to avoid:**
1. Listen for deauthorization webhook events (the webhook callback already needs to handle this).
2. Store a mapping of Strava athlete ID to submission file (e.g., in a Netlify Blob that maps athlete_id -> result_filename).
3. On deauthorization: delete the athlete's result file, trigger a rebuild.
4. For git-committed results: the deletion commit adds a new commit removing the file. Previous commits still contain the data in git history, but the live site no longer displays it. This is a reasonable interpretation for a static site -- the data is "deleted from your Developer Application" (the live site) even if git history retains it.
5. Alternatively: if using Netlify Blobs for results storage, deletion is immediate and permanent.
6. Document your data handling practices in a simple privacy notice linked from the submission flow.

**Warning signs:**
- No webhook handler for deauthorization events
- No mechanism to identify which results belong to which Strava athlete
- No privacy policy or data handling notice on the submission page

**Phase to address:**
Webhook and submission flow phases -- must be designed alongside the submission architecture.

**Confidence:** HIGH -- verified against Strava API Agreement Sections 5.4 and 2.14(vi), and webhook documentation.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing Strava refresh tokens as env vars for build-time use | Simple, no database needed | Token rotates on every use; must update env var after each refresh. If a build fails mid-refresh, the old token is invalidated and new one is lost. | Acceptable for a single-event site if you implement a write-back mechanism that updates the env var on every refresh. |
| Skipping webhook subscription | One less endpoint to build and maintain | No deauthorization handling, no real-time activity notifications, manual polling only | Never acceptable -- TOS requires deauthorization handling |
| Hardcoding segment IDs in source code | Fast, no config files to manage | If segment IDs change (re-created segments), requires code change and deploy | Acceptable -- these segments are stable and owned by the event organizer |
| Single JSON file for all results | Simple reads, easy to reason about | Race condition on concurrent writes (see Pitfall 5) | Never acceptable -- use per-athlete files |
| Using Strava athlete name directly | No extra form field needed | Name may not match what rider wants displayed; violates TOS if stored longer than 7 days | Never acceptable -- always ask for display name in submission form |
| Skipping CSRF protection on OAuth callback | Simplifies the flow | Open redirect / session fixation attacks possible | Never acceptable |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Strava OAuth | Storing only the access token, not the refresh token | Always persist the LATEST refresh token. Access tokens expire in 6 hours. The refresh token is the long-lived credential. |
| Strava OAuth | Reusing an old refresh token | Every token refresh returns a NEW refresh token. The old one is immediately invalidated. You MUST store and use the latest one. |
| Strava OAuth | Not validating the `state` parameter on callback | Generate a cryptographically random `state` value, store it (e.g., in a signed cookie), and verify it matches on callback. Prevents CSRF and session fixation. |
| Strava API | Calling the leaderboard endpoint | It has been removed since June 2020. Returns 404. Do not attempt. |
| Strava API | Fetching activity without `include_all_efforts=true` | Segment efforts are only included when this parameter is set. Without it, you cannot verify segment completion. |
| Strava Webhook | Expecting to create multiple webhook subscriptions | Each Strava application can have exactly ONE webhook subscription. It covers all authenticated athletes. |
| Strava Webhook | Doing heavy processing in the webhook handler | Webhook must respond with 200 status within 2 seconds. Do async processing: save the event to a queue/blob and process separately. |
| Netlify Functions | Writing to the local filesystem and expecting persistence | Netlify Functions run in ephemeral containers. Writes to `/tmp` disappear between invocations. Use Netlify Blobs or git commits for persistence. |
| Netlify Functions | Assuming functions share memory or state | Each function invocation is independent. Use Netlify Blobs or environment variables for shared state. |
| Netlify Build | Triggering too many rebuilds | Each submission triggers a rebuild. If 20 people submit in 10 minutes, that is 20 builds. Netlify has build minute limits (300/month on free tier, 1000 on Pro). Consider batching: process submissions into Blobs, trigger a single rebuild every 15 minutes via scheduled function. |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching Strava data at build time for every rebuild | Builds slow down; rate limits hit; stale data on failure | Cache segment data as static JSON; only re-fetch when stale (>7 days) or manually triggered | At 10+ builds/day against 1,000 daily request limit |
| One rebuild per submission | Build queue backs up; results delayed by 30+ minutes | Batch submissions: collect in Blobs, rebuild on schedule (every 15 min) or after N new submissions | At 10+ submissions within a build window (~3 min/build) |
| Netlify Function cold starts during OAuth | User waits 2-6 seconds for OAuth redirect; may assume it is broken and retry | Warm functions with scheduled pings; use Edge Functions for the redirect endpoint (50-200ms cold start) | First user of the day or after 15 min inactivity |
| Loading full activity detail for all submitted activities | Slow build; rate limit exhaustion | Store only extracted times at submission; build reads pre-processed results files, not raw activity data | At 50+ submissions with 9 segments each |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing Strava client_secret in client-side JavaScript | Anyone can impersonate your app, make API calls on your behalf, exhaust your rate limits | Client secret ONLY in Netlify env vars, ONLY accessed by server-side functions. Never in Astro components or client JS. |
| No `state` parameter in OAuth redirect | CSRF attack: attacker initiates OAuth flow, victim completes it, attacker gets access to victim's linked account | Generate random state, store in signed httpOnly cookie, verify on callback. |
| Accepting activity ID from client without re-fetching | User submits fabricated segment times by providing fake activity data | Always fetch the activity directly from Strava API server-side using the user's access token. Never trust client-submitted activity data. |
| Storing access/refresh tokens in localStorage or cookies accessible to JS | XSS vulnerability exposes tokens; attacker can make Strava API calls as the user | Keep tokens server-side only (Netlify Blobs or function memory). Use httpOnly signed session cookies for user identification. |
| No input validation on submission payload | Injection attacks, malformed data corrupting results JSON | Validate all fields server-side: Strava athlete ID (integer), activity ID (integer), category (enum: M/F/NB), display name (string, max 100 chars, sanitized). |
| OAuth callback URL not restricted to your domain | Open redirect vulnerability; phishing attacks | Register exact callback URL in Strava app settings (`https://mkultragravel.netlify.app/.netlify/functions/strava-callback`). Validate the redirect_uri matches. |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| OAuth flow opens in same tab, losing the submission context | User completes OAuth on Strava, gets redirected back but forgets what they were doing | Open Strava OAuth in a popup or new tab; callback page auto-closes and communicates back to the parent page. Or: clearly show "returning you to MK Ultra Gravel..." on callback. |
| Requiring Strava subscription for submission | Non-subscriber athletes cannot participate in results | Only use API features available to free Strava accounts. Segment efforts on owned activities are available to free users. |
| Showing raw elapsed_time from Strava (seconds) | "3847 seconds" is meaningless to cyclists | Format as HH:MM:SS or MM:SS. For cumulative gravel time, show "1:04:07" not "3847". |
| No feedback after submission | User doesn't know if submission worked; submits again | Show clear success/failure state. "Your results have been submitted. The leaderboard updates every 15 minutes." |
| Results page only shows overall leaderboard | Athlete cannot find their own position easily | Include a "Find your results" search/filter by name. Highlight the viewing athlete's row if they are logged in. |
| No explanation of scoring system on results page | Athletes don't understand how scores are calculated | Include scoring explainer directly on the results page, not just on a separate page. "Gravel Champion = lowest cumulative time across 6 sectors. KOM/QOM Champion = top 10 earn points (10-1)." |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **OAuth flow:** Often missing `state` parameter validation -- verify CSRF protection exists on callback
- [ ] **OAuth flow:** Often missing error handling for user denial -- verify graceful handling when user clicks "Cancel" on Strava authorization page
- [ ] **Token refresh:** Often missing handling for expired refresh tokens -- verify what happens when Strava returns 401 on refresh (e.g., user deauthorized via Strava settings)
- [ ] **Activity fetch:** Often missing `include_all_efforts=true` parameter -- verify segment_efforts array is populated in API response
- [ ] **Submission validation:** Often missing date check -- verify submissions are rejected for activities not on June 7, 2026
- [ ] **Results display:** Often missing deauthorized-athlete cleanup -- verify results page doesn't show athletes who revoked access
- [ ] **Webhook endpoint:** Often missing GET handler for subscription validation -- verify both GET (challenge response) and POST (event handling) work
- [ ] **Webhook endpoint:** Often missing 200 response within 2 seconds -- verify heavy processing is async, not blocking the response
- [ ] **Rate limiting:** Often missing monitoring -- verify `X-RateLimit-Usage` headers are logged/checked before making additional calls
- [ ] **Privacy notice:** Often missing entirely -- verify submission page includes what data is collected, how it is used, and how to request deletion

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| TOS violation (displaying cross-user data) | HIGH | Immediately remove the violating feature. Restructure to hybrid approach (event-owned data with consent). Contact Strava developer support proactively to explain remediation. |
| Lost refresh token (rotated and not saved) | MEDIUM | Re-authenticate the service account manually via browser. Update the env var with new refresh token. Add write-back mechanism to prevent recurrence. |
| Concurrent write data loss | MEDIUM | Identify missing submissions from Strava webhook event log. Manually re-add lost results. Migrate to per-athlete file storage. |
| Rate limit exhaustion | LOW | Wait for 15-minute window reset (or midnight UTC for daily). Implement caching to prevent recurrence. No data is lost -- just delayed. |
| App review denied/delayed | HIGH | Implement manual results entry as fallback (admin-only form). Have this ready as a contingency by event day. |
| Invalid activity submissions accepted | MEDIUM | Audit results against submission log. Remove invalid entries. Tighten validation logic. Communicate corrections to affected athletes. |
| Athlete deauthorization not handled | HIGH | Audit all stored data for Strava-sourced personal information. Delete within 48 hours. Implement webhook handler to prevent recurrence. |
| Cold start causes OAuth timeout | LOW | Implement function warming (scheduled ping every 10 min). Consider Edge Functions for redirect endpoints. |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| P1: TOS cross-user data display | Architecture/design (first phase) | Legal review of data flow: does any Strava Data from User A appear to User B? If yes, redesign. |
| P2: Segment leaderboard endpoint gone | Requirements (before planning) | Confirm all planned API calls against current Strava API reference. No 404s. |
| P3: Token storage in serverless | Backend architecture phase | Integration test: two sequential function invocations, verify token persistence. |
| P4: Athlete limit blocks auth | Pre-development (app registration) | Verify athlete limit >= 200 in Strava API settings dashboard before event. |
| P5: Concurrent write race condition | Storage architecture phase | Load test: simulate 10 concurrent submissions, verify all 10 appear in results. |
| P6: Rate limit exhaustion | API integration phase | Monitor headers in all API responses. Verify daily usage stays under 500 (50% buffer). |
| P7: Invalid activity submissions | Submission flow phase | Test with: wrong date activity, virtual ride, activity missing segments, duplicate submission. All rejected. |
| P8: Gender/category from Strava | Submission UI phase | Test with athlete whose Strava sex is null. Verify category selection is required. |
| P9: 7-day cache limit | Data architecture phase | Audit results JSON: no raw Strava API fields present. Only derived event data. |
| P10: Deauthorization handling | Webhook phase | Test: authorize, submit result, deauthorize via Strava. Verify result removed within 48h. |

## Sources

**Official Strava Documentation (HIGH confidence):**
- [Strava API Agreement](https://www.strava.com/legal/api) -- Sections 2.10, 2.14, 5.2, 5.4, 7.1
- [Strava Authentication Docs](https://developers.strava.com/docs/authentication/) -- OAuth flow, token rotation, scopes
- [Strava Rate Limits](https://developers.strava.com/docs/rate-limits/) -- 200/15min, 2000/day limits
- [Strava Webhook Events API](https://developers.strava.com/docs/webhooks/) -- Subscription, validation, deauth events
- [Changes to the Segments API](https://developers.strava.com/docs/segment-changes/) -- June 2020 leaderboard removal
- [Strava API v3 Reference](https://developers.strava.com/docs/reference/) -- Endpoint details, scopes, response models

**Official Strava Announcements (HIGH confidence):**
- [API Agreement Update (Support)](https://support.strava.com/hc/en-us/articles/31798729397773-API-Agreement-Update-How-Data-Appears-on-3rd-Party-Apps) -- November 2024 changes
- [Updates to Strava's API Agreement (Press)](https://press.strava.com/articles/updates-to-stravas-api-agreement) -- Official announcement

**Community and Analysis (MEDIUM confidence):**
- [DCRainmaker: Strava's Changes To Kill Off Apps](https://www.dcrainmaker.com/2024/11/stravas-changes-to-kill-off-apps.html) -- Detailed analysis of November 2024 changes
- [Strava Community Hub: Rate Limit Questions](https://communityhub.strava.com/developers-api-7/rate-limit-questions-12328)
- [Strava Community Hub: Athlete Limit Increase](https://communityhub.strava.com/developers-api-7/strava-api-athlete-limit-increase-anyone-approved-beyond-1-000-users-12345)
- [Strava Community Hub: KOM/QOM Data Access](https://communityhub.strava.com/developers-api-7/accessing-kom-qom-data-for-segment-1999)
- [Covaera: Strava Events Guide](https://covaera.com/strava-guide) -- Example of consent-gated event results

**Netlify Documentation (HIGH confidence):**
- [Netlify Functions Overview](https://docs.netlify.com/build/functions/overview/)
- [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/) -- Conditional writes, concurrency
- [Netlify Environment Variables](https://docs.netlify.com/build/environment-variables/overview/)
- [Netlify Secrets Controller](https://docs.netlify.com/build/environment-variables/secrets-controller/)

---
*Pitfalls research for: Strava API integration + serverless OAuth + results system for MK Ultra Gravel v5.0*
*Researched: 2026-03-30*
