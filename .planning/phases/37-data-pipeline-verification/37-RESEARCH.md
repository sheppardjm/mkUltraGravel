# Phase 37: Data Pipeline Verification - Research

**Researched:** 2026-03-31
**Domain:** Netlify Functions end-to-end testing via crafted curl requests — GitHub Contents API, Netlify build hook, Astro build-time leaderboard rendering
**Confidence:** HIGH (all findings from direct codebase inspection; no external library research required)

---

## Summary

Phase 37 is a **manual verification phase** — no code changes. The pipeline is fully implemented from v5.0 phases. The goal is to confirm it works end-to-end by firing real requests at the deployed production function and observing each step: GitHub commit, Netlify rebuild, and leaderboard appearance.

The `submit-result` function accepts a POST with `application/x-www-form-urlencoded` body containing three fields: `data` (base64url-encoded JSON), `gender`, and `consent`. The `data` field encodes `{athleteId, name, activityUrl, segments}`. The function validates, builds a schema-compliant athlete JSON, commits it to `public/data/results/athletes/{athleteId}.json` via the GitHub Contents API GET-then-PUT pattern, then fires the Netlify build hook. The build hook URL is already set in `.env` as `https://api.netlify.com/build_hooks/69cbea519a91be0f2e64691c`.

PIPE-04 (scoring engine ranks correctly from real athlete JSON files) can be verified by running the existing `scripts/validate-results.mjs` script against the 23 seed files already in `public/data/results/athletes/`. That script loads all athlete files, runs `computeGravelChampion` and `computeKomChampion`, and prints ranked results — it already passes clean. After the crafted curl adds a 24th athlete, re-running the script (or inspecting the live `/results` page after rebuild) verifies end-to-end ranking.

**Primary recommendation:** One plan is correct. Sequence: generate payload → POST curl → verify GitHub file → verify Netlify build triggered → wait for rebuild → verify `/results` page → clean up test athlete file from repo.

---

## Standard Stack

This phase uses no new libraries. All operations are curl commands and browser inspection.

### Core Tools
| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| curl | system | Craft and send POST to `submit-result` | Already available on macOS |
| node | 22 | Generate base64url-encoded payload | Encode `Buffer.from(JSON.stringify(payload)).toString('base64url')` |
| GitHub Web UI / API | — | Verify file committed to repo | Check `public/data/results/athletes/{athleteId}.json` is visible |
| Netlify Dashboard | — | Verify deploy started + completed | Site > Deploys tab |
| Browser | — | Verify athlete on `/results` leaderboard | `https://mkultragravel.netlify.app/results` |

### No Installation Required

```bash
# No npm install needed — all required tools are in place
```

---

## Architecture Patterns

### How the Pipeline Works (Full Data Flow)

```
curl POST to submit-result
  ↓
netlify/functions/submit-result.js
  ↓ validate consent + gender + base64url data
  ↓ build resultObj (schema-compliant)
  ↓ GET existing file SHA from GitHub (404 = new file)
  ↓ PUT file to public/data/results/athletes/{athleteId}.json on main
  ↓ POST to NETLIFY_BUILD_HOOK (fire-and-forget)
  ↓ return 200 HTML success page

GitHub main branch (file now present)
  ↓ Netlify detects push OR build hook fires
  ↓ npm run build → node scripts/generate-data.js + astro build

Astro build (results.astro)
  ↓ readdirSync("public/data/results/athletes/")
  ↓ parse all .json files → athletes array
  ↓ computeGravelChampion(athletes) → ranked M/F/NB
  ↓ computeKomChampion(athletes) → ranked M/F/NB
  ↓ render static HTML leaderboard

Netlify serves updated dist/
  ↓ /results shows new athlete
```

### Pattern 1: Crafting the submit-result Payload

The function reads three form fields:
- `consent` — must equal literal string `"yes"`
- `gender` — must be one of `"M"`, `"F"`, `"NB"`
- `data` — base64url-encoded JSON with shape:

```javascript
{
  athleteId: string,      // becomes the filename: {athleteId}.json
  name: string,           // display name
  activityUrl: string,    // must match /strava\.com\/activities\/\d+/ is NOT validated here (only in strava-auth)
  segments: {
    "[segmentId]": { elapsed_time: integer }   // segment IDs as numeric strings
  }
}
```

**Generate the encoded payload:**

```bash
node -e "
const payload = {
  athleteId: 'test-pipeline-01',
  name: 'Test Pipeline',
  activityUrl: 'https://www.strava.com/activities/99999999',
  segments: {
    '24479292': { elapsed_time: 1500 },
    '24479426': { elapsed_time: 1800 },
    '24479467': { elapsed_time: 1200 },
    '24479496': { elapsed_time: 2100 },
    '34573011': { elapsed_time: 1500 },
    '6809754':  { elapsed_time: 1400 },
    '24479270': { elapsed_time: 480 },
    '41126651': { elapsed_time: 650 },
    '16438243': { elapsed_time: 900 }
  }
};
console.log(Buffer.from(JSON.stringify(payload)).toString('base64url'));
"
```

**Send the POST:**

```bash
# Replace DATA_VALUE with the output of the node command above
curl -s -w "\n\nHTTP_STATUS: %{http_code}\n" \
  -X POST https://mkultragravel.netlify.app/.netlify/functions/submit-result \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "data=DATA_VALUE" \
  --data-urlencode "gender=M" \
  --data-urlencode "consent=yes"
```

A successful response is HTTP 200 with HTML containing "Results Submitted!".

### Pattern 2: Verifying the GitHub Commit (PIPE-01)

After the curl succeeds, verify the file is in the repo:

```bash
# Using the GitHub API directly (requires GITHUB_TOKEN from local env)
curl -s \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/Sheppardjm/mkUltraGravel/contents/public/data/results/athletes/test-pipeline-01.json" \
  | python3 -m json.tool | grep -E "name|sha|size"
```

Or simply check the GitHub web UI:
`https://github.com/Sheppardjm/mkUltraGravel/blob/main/public/data/results/athletes/test-pipeline-01.json`

### Pattern 3: Verifying the Netlify Build (PIPE-02)

The build hook is fire-and-forget in the function code. To independently trigger and verify:

```bash
# Direct build hook test (optional standalone verification)
curl -s -X POST https://api.netlify.com/build_hooks/69cbea519a91be0f2e64691c
# Returns: {"id":"..."} on success
```

Build status visible at: Netlify dashboard > mkultragravel > Deploys tab.
Builds typically complete in 2-4 minutes for this project.

### Pattern 4: Verifying the Leaderboard (PIPE-03)

After the deploy completes, open `https://mkultragravel.netlify.app/results` and confirm:
- "Test Pipeline" (or chosen name) appears in the Men's Gravel Champion leaderboard
- Segment times are rendered correctly
- KOM/QOM Champion section shows points for the athlete

### Pattern 5: Verifying Scoring Engine Rankings (PIPE-04)

The existing `validate-results.mjs` already tests the scoring engine against 23 seed athletes and passes. For Phase 37, PIPE-04 is satisfied by:

1. Running `node scripts/validate-results.mjs` — should show "VALIDATION PASSED: 23 files valid"
2. After the test athlete is committed and the rebuild completes, the `/results` page renders 24 athletes correctly ranked

The seed data already covers all three gender categories (12M, 8F, 3NB). Adding a test M athlete verifies multi-athlete ranking in production.

### Anti-Patterns to Avoid

- **Using a real Strava athlete ID as the test athleteId:** Use a clearly fake ID like `test-pipeline-01` to avoid colliding with a real future submission. The filename becomes `test-pipeline-01.json`.
- **Leaving the test athlete file in the repo:** Clean up by deleting `public/data/results/athletes/test-pipeline-01.json` via GitHub API or git after verification. If left, the test athlete will appear on the live leaderboard permanently.
- **Testing against the local dev server:** The `submit-result` function reads env vars at runtime, and local env vars do NOT include `GITHUB_TOKEN` or `NETLIFY_BUILD_HOOK` for security. Test against the production URL only.
- **Not waiting for the build to complete:** The Netlify build hook triggers asynchronously. The `/results` page will only show the new athlete after the deploy finishes. Check the Netlify dashboard to confirm the deploy is complete before opening `/results`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Payload encoding | Custom encoding scheme | `Buffer.from(JSON.stringify(p)).toString('base64url')` | Already the exact pattern submit-result.js uses to DECODE — must match |
| Scoring verification | Custom test script | `node scripts/validate-results.mjs` | Already exists, tests both scoring functions against all seed data |
| Leaderboard rendering | Custom renderer | Just open `/results` in browser | Astro renders it statically at build time |

---

## Common Pitfalls

### Pitfall 1: Build Triggers Twice
**What goes wrong:** When the GitHub Contents API commits a file to `main`, Netlify's GitHub integration may auto-detect the push AND the function also fires the explicit build hook. Result: two builds in quick succession.
**Why it happens:** Netlify listens to GitHub push events (via GitHub App or webhook) for the connected repo. The explicit build hook is a belt-and-suspenders measure in the function code.
**How to avoid:** This is harmless — just observe the Netlify dashboard and confirm at least one build starts. The double-build is documented behavior.
**Warning signs:** Two deploys appear in the Netlify dashboard for the same commit.

### Pitfall 2: athleteId File Name Collision
**What goes wrong:** Choosing a test athleteId that matches an existing seed file (e.g., `"seed-m-01"` or a real numeric Strava ID that might be used later).
**Why it happens:** The function writes `{athleteId}.json` — if the ID clashes with a seed file name, the GET-then-PUT will retrieve the seed file's SHA and overwrite it.
**How to avoid:** Use a clearly non-numeric, non-seed ID like `test-pipeline-01` or `pipeline-test-001`.

### Pitfall 3: 409 Conflict from Stale SHA
**What goes wrong:** If you POST the same athleteId twice in rapid succession, the second request may GET a different SHA than what the first PUT just created.
**Why it happens:** The GET-then-PUT pattern has a TOCTOU window. The function already handles 409 and returns an HTML conflict page.
**How to avoid:** Use a unique athleteId per test run. Don't retry within the same second.

### Pitfall 4: Build Hook Silent Failure
**What goes wrong:** The build hook fires but Netlify doesn't start a build — e.g., if the hook URL is stale (deleted and recreated) or has been revoked.
**Why it happens:** Build hooks can be deleted from the Netlify dashboard independently of env vars.
**How to avoid:** Verify `NETLIFY_BUILD_HOOK` in Netlify env vars matches the hook URL visible in the Netlify dashboard under Build & Deploy > Build hooks. Also, GitHub push integration may still trigger a build independently.

### Pitfall 5: Content-Type Mismatch
**What goes wrong:** Sending JSON body instead of `application/x-www-form-urlencoded` returns a 400 error page because `new URLSearchParams(event.body)` cannot parse JSON.
**Why it happens:** The function specifically uses `URLSearchParams` to parse the body, not `JSON.parse`.
**How to avoid:** Always use `-H "Content-Type: application/x-www-form-urlencoded"` with `--data-urlencode` in curl.

### Pitfall 6: Validate-Results Script Not Finding Athletes
**What goes wrong:** Running `node scripts/validate-results.mjs` from the wrong directory fails because it uses relative path `public/data/results/athletes`.
**Why it happens:** The script uses `readdirSync('public/data/results/athletes')` — relative to cwd.
**How to avoid:** Always run from the repo root: `node scripts/validate-results.mjs` (not `cd scripts && node validate-results.mjs`).

---

## Code Examples

### Complete Payload Generation and Submission

```bash
# Step 1: Generate the base64url payload
DATA=$(node -e "
const payload = {
  athleteId: 'test-pipeline-01',
  name: 'Test Pipeline',
  activityUrl: 'https://www.strava.com/activities/99999999',
  segments: {
    '24479292': { elapsed_time: 1500 },
    '24479426': { elapsed_time: 1800 },
    '24479467': { elapsed_time: 1200 },
    '24479496': { elapsed_time: 2100 },
    '34573011': { elapsed_time: 1500 },
    '6809754':  { elapsed_time: 1400 },
    '24479270': { elapsed_time: 480 },
    '41126651': { elapsed_time: 650 },
    '16438243': { elapsed_time: 900 }
  }
};
process.stdout.write(Buffer.from(JSON.stringify(payload)).toString('base64url'));
")

# Step 2: POST to the deployed function
curl -s -w "\n\nHTTP_STATUS: %{http_code}\n" \
  -X POST "https://mkultragravel.netlify.app/.netlify/functions/submit-result" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "data=$DATA" \
  --data-urlencode "gender=M" \
  --data-urlencode "consent=yes"
```

### Verify GitHub Commit

```bash
# Confirm file is visible in GitHub (no auth needed for public repo)
curl -s "https://api.github.com/repos/Sheppardjm/mkUltraGravel/contents/public/data/results/athletes/test-pipeline-01.json" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('FOUND:', d.get('name'), 'SHA:', d.get('sha','ERROR')[:8])"
```

### Clean Up Test Athlete (After Phase Complete)

```bash
# Get the file SHA
SHA=$(curl -s \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/Sheppardjm/mkUltraGravel/contents/public/data/results/athletes/test-pipeline-01.json" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])")

# Delete the file
curl -s -X DELETE \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" \
  "https://api.github.com/repos/Sheppardjm/mkUltraGravel/contents/public/data/results/athletes/test-pipeline-01.json" \
  -d "{\"message\":\"test: remove pipeline verification test file\",\"sha\":\"$SHA\",\"committer\":{\"name\":\"MK Ultra Gravel Bot\",\"email\":\"bot@mkultragravel.netlify.app\"}}"
```

### Validate Scoring Engine Locally (PIPE-04)

```bash
# From repo root — 23 seed athletes, should output "VALIDATION PASSED"
node scripts/validate-results.mjs
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Manual file commits | GitHub Contents API GET-then-PUT | Already implemented in submit-result.js |
| Static leaderboard | Build-time Astro rendering from committed JSON files | Already implemented in results.astro |
| No verification tooling | `scripts/validate-results.mjs` | Already exists, runs scoring engine against all athlete files |

**Nothing to change.** The pipeline is complete. Phase 37 is verification only.

---

## Key Files Reference

| File | Role in Phase 37 |
|------|-----------------|
| `netlify/functions/submit-result.js` | Target function — receives crafted POST |
| `public/data/results/athletes/` | Where athlete JSON files land after GitHub commit |
| `public/data/results/schema.json` | Schema the committed file must conform to |
| `src/lib/scoring.js` | Scoring engine used at build time by results.astro |
| `src/pages/results.astro` | Leaderboard page — reads athletes dir at build time |
| `scripts/validate-results.mjs` | Local scoring verification script |
| `.env` (local only) | Contains NETLIFY_BUILD_HOOK URL for reference |

---

## Open Questions

1. **Double-build behavior**
   - What we know: Netlify has GitHub integration (connected repo) AND submit-result.js fires an explicit build hook
   - What's unclear: Whether the GitHub integration is configured to auto-build on push to main, or if the build hook is the sole trigger
   - Recommendation: Observe the first curl test and count deploys in the Netlify dashboard. If double-builds are a problem, it's cosmetic only — doesn't affect verification.

2. **GITHUB_TOKEN availability for verification**
   - What we know: GITHUB_TOKEN is set in Netlify env vars only, NOT in local `.env`
   - What's unclear: Whether the user has it accessible locally for the verification curl commands
   - Recommendation: The verification step can use the GitHub web UI instead of curl (file is public). The GitHub API call in verification examples is optional.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `netlify/functions/submit-result.js` — function signature, validation logic, GitHub API pattern, build hook call
- Direct codebase inspection: `src/pages/results.astro` — how athletes are loaded at build time
- Direct codebase inspection: `src/lib/scoring.js` — scoring engine exports
- Direct codebase inspection: `scripts/validate-results.mjs` — existing validation script
- Direct codebase inspection: `public/data/results/schema.json` — athlete JSON schema
- Direct codebase inspection: `public/data/results/athletes/seed-*.json` — existing test data (23 files)
- Direct codebase inspection: `.env` — NETLIFY_BUILD_HOOK URL confirmed
- Test run: `node scripts/validate-results.mjs` — passes clean with 23 seed files
- Test run: `npm test` — 13/13 scoring tests pass

### Secondary (MEDIUM confidence)
- Netlify build hook behavior: Netlify dashboard docs (build hooks return JSON with deploy ID on POST, build typically 2-4 min)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all tools verified in codebase
- Architecture: HIGH — pipeline traced end-to-end from function code to results page
- Pitfalls: HIGH — all identified from direct code inspection (not speculation)
- Curl examples: HIGH — payload format derived directly from submit-result.js validation logic

**Research date:** 2026-03-31
**Valid until:** 2026-06-07 (event date; no library updates expected)
