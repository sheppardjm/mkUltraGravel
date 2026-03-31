# Phase 36: Environment Configuration - Research

**Researched:** 2026-03-31
**Domain:** Netlify environment variables, Strava OAuth app settings, GitHub PAT verification, Node.js version configuration
**Confidence:** HIGH (all primary findings verified against official documentation)

---

## Summary

Phase 36 is a pure configuration and verification phase — no code changes. The pipeline is fully implemented from v5.0 (Phases 29-32). The goal is to confirm that every external credential and environment variable is correctly wired so the first real end-to-end test (Phase 37) can succeed without silent configuration failures.

There are four distinct configuration targets: (1) Netlify dashboard env vars with Functions scope, (2) Strava API app settings for the callback domain, (3) GitHub PAT validity and permissions, and (4) Node.js version in the Netlify build environment. Each has a clear verification command or UI check. No code changes are required — this phase is entirely manual operations.

Key findings: the `.node-version` file already pins Node 22, so ENV-04 is already satisfied and just needs confirmation in a deploy log. The remaining three targets (env vars, Strava domain, GitHub PAT) require manual dashboard actions. The `STRAVA_REDIRECT_URI` and `STRAVA_VERIFY_TOKEN` variables are confirmed absent from the local `.env` — they must be set in Netlify dashboard during this phase or OAuth and webhook validation will fail silently.

**Primary recommendation:** Work through the four env var groups in order (Strava, GitHub, Netlify build hook, Node version), set each in the Netlify dashboard UI with Functions scope, then verify each with the prescribed test command. Do not put any secrets in `netlify.toml` — vars there are build-time only and unavailable to functions at runtime.

---

## Standard Stack

This phase uses no libraries. All operations are manual dashboard actions and CLI verification commands.

### Core
| Tool | Version/URL | Purpose | Notes |
|------|-------------|---------|-------|
| Netlify Dashboard | `app.netlify.com` | Set env vars with Functions scope | UI path: Site > Project configuration > Environment variables |
| Strava API Settings | `strava.com/settings/api` | Set Authorization Callback Domain | Domain-only format, no `https://` |
| GitHub Settings | `github.com/settings/tokens` | Verify/renew PAT | Fine-grained PAT, Contents: Read+Write |
| curl / gh CLI | system | Verify GitHub PAT responds 200 | Test call to GitHub API |
| Netlify deploy log | Netlify dashboard | Confirm Node.js 22 in build | Read from most recent deploy |

### Supporting
| Tool | Purpose |
|------|---------|
| `.node-version` (already exists, value: `22`) | Pins Node.js 22 for Netlify builds — already correct, no change needed |

---

## Architecture Patterns

### ENV-01: Setting Netlify Environment Variables with Functions Scope

**What:** All 8 variables must be set in the Netlify dashboard with at minimum the "Functions" scope. Variables in `netlify.toml` are build-time only and NOT available to functions at runtime.

**Dashboard path:** Site > Project configuration > Environment variables > Add a variable

**The 8 required variables:**
| Variable | Source | Current Status |
|----------|--------|---------------|
| `STRAVA_CLIENT_ID` | `strava.com/settings/api` — "Client ID" | Value known: `11267` (from local `.env`) |
| `STRAVA_CLIENT_SECRET` | `strava.com/settings/api` — "Client Secret" | Value known: `c06026b04119a4452cdf8e0d57f776e2ccab1558` (from local `.env`) |
| `STRAVA_REDIRECT_URI` | Constructed: `https://mkultragravel.netlify.app/.netlify/functions/strava-callback` | **ABSENT from local `.env`** — must be created |
| `STRAVA_VERIFY_TOKEN` | Choose any secret string (e.g. a random hex token) | **ABSENT from local `.env` and codebase** — must be chosen and created |
| `GITHUB_TOKEN` | GitHub fine-grained PAT with Contents: Read+Write on `mkUltraGravel` repo | Status unknown — must verify existence and expiry |
| `GITHUB_OWNER` | `Sheppardjm` | Plain string, no secret |
| `GITHUB_REPO` | `mkUltraGravel` | Plain string, no secret |
| `NETLIFY_BUILD_HOOK` | Netlify dashboard > Build & deploy > Build hooks > Create new hook | Must be created if it doesn't exist |

**Important:** Netlify env var scope "Functions" is required for variables to be available to serverless functions at runtime. The default (all scopes) is also acceptable but "Functions" scope alone is sufficient and limits exposure. Per official docs, scopes are available on Pro and Enterprise plans — verify the site's plan supports scoped variables. If on a free plan, variables default to all scopes which is acceptable.

**Verification after setting:**
Trigger a new deploy (push a commit or use "Trigger deploy" in the dashboard), then check function logs for any `process.env.VARIABLE undefined` errors.

### ENV-02: Strava Authorization Callback Domain

**What:** The Strava API application setting "Authorization Callback Domain" must be set to the production domain. This controls which `redirect_uri` values Strava will accept during OAuth. The `strava-auth` function sends `STRAVA_REDIRECT_URI` as the `redirect_uri` parameter — Strava rejects the redirect if the domain doesn't match.

**Dashboard path:** `strava.com/settings/api` — "Authorization Callback Domain" field

**Format:** Domain only, no protocol or path. Example: `mkultragravel.netlify.app`

**NOT:** `https://mkultragravel.netlify.app` or `https://mkultragravel.netlify.app/.netlify/functions/strava-callback`

**Current state:** Unknown — likely set to `localhost` from development. Must be changed to `mkultragravel.netlify.app` for production OAuth to work.

**Verification:** Attempting OAuth from the production URL (`https://mkultragravel.netlify.app/submit`) will fail with a Strava error if this is not set correctly. However, verification for this phase is visual inspection of the Strava settings page.

### ENV-03: GitHub PAT Verification

**What:** The `GITHUB_TOKEN` must be a fine-grained PAT scoped to the `mkUltraGravel` repository with `Contents: Read and Write` permissions. The `submit-result.js` function uses it to commit athlete JSON files; `strava-webhook.js` uses it to delete them.

**Required permissions:**
- Repository: `mkUltraGravel` (specific repo, not all repos)
- Permission: `Contents: Read and Write`
- Expiry: No expiry set, OR expiry date after June 7, 2026

**How to verify the PAT is active (curl test):**
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/Sheppardjm/mkUltraGravel/contents/package.json
```
Expected: `200` — confirms the token is valid and has Contents read access on this repo.
`401` = token invalid or expired.
`403` = token exists but lacks Contents permission.
`404` = token valid but repo not found or Contents permission insufficient.

**How to check expiry:** In GitHub Settings > Developer settings > Personal access tokens > Fine-grained tokens — check the expiry date on the token. If it expires before June 7, 2026, regenerate with no expiry.

**If PAT does not exist or needs to be created:**
1. Go to github.com/settings/tokens (Personal access tokens > Fine-grained tokens)
2. Click "Generate new token"
3. Name: `MK Ultra Gravel Bot`
4. Expiration: No expiration
5. Repository access: Only select repositories → `mkUltraGravel`
6. Permissions: Repository permissions > Contents → `Read and write`
7. Generate and copy — paste into Netlify dashboard as `GITHUB_TOKEN`

### ENV-04: Node.js Version >= 22

**What:** The `.node-version` file at the project root already contains `22`. Netlify reads `.node-version` files and uses nvm to install the specified version. The default Node.js version on Netlify's current build image is also `22` (confirmed from official docs), so this requirement is met by the existing file.

**Current state:** `.node-version` file exists and contains `22`. No action required.

**Verification:** Check the most recent Netlify deploy log for a line like:
```
Installing Node 22.x.x
```
or
```
Node version: v22.x.x
```

**Priority order (Netlify official docs):**
1. `.node-version` or `.nvmrc` file — HIGHEST (overrides everything)
2. `NODE_VERSION` environment variable
3. Netlify UI setting (Project configuration > Build & deploy > Dependency management)
4. Build image default (currently 22)

**Note:** The `volta` field in `package.json` (which pins `node: 22.22.2`) is NOT respected by Netlify — Netlify only reads `.node-version`, `.nvmrc`, or `NODE_VERSION` env var. The `.node-version` file is the correct mechanism and is already present.

### NETLIFY_BUILD_HOOK: Creating the Build Hook

**What:** The `NETLIFY_BUILD_HOOK` env var must be a POST URL that triggers a new Netlify deploy. It is used by `submit-result.js` (after committing athlete JSON to GitHub) and `strava-webhook.js` (after deleting an athlete's file on deauth).

**Format:** `https://api.netlify.com/build_hooks/{unique_id}`

**How to create:**
1. Netlify dashboard > Site > Project configuration > Build & deploy > Continuous deployment > Build hooks
2. Click "Add build hook"
3. Name: `Athlete Result Submission`
4. Branch: `main`
5. Copy the generated URL
6. Set as `NETLIFY_BUILD_HOOK` in environment variables

**Verification:**
```bash
curl -X POST -d '{}' https://api.netlify.com/build_hooks/YOUR_HOOK_ID
```
A successful trigger returns HTTP 200 and a new deploy starts in the Netlify dashboard.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Storing secrets | Committed `.env` or `netlify.toml` | Netlify dashboard env vars | `.env` is `.gitignore`d locally; `netlify.toml` vars are NOT available to functions at runtime |
| Node version control | `package.json` `engines` field | `.node-version` file | Netlify does not respect `engines` field; `.node-version` is already present and correct |
| PAT permission testing | Write a test script | `curl` against `GET /repos/{owner}/{repo}/contents/{path}` | Single command, confirms both token validity and Contents read access |
| STRAVA_VERIFY_TOKEN value | Complex generator | Any secret string, e.g. `openssl rand -hex 20` | Strava has no format requirements; any string works; just keep it secret and record it |

---

## Common Pitfalls

### Pitfall 1: `netlify.toml` Env Vars Are NOT Available to Functions

**What goes wrong:** Variables set in `netlify.toml` under `[build.environment]` return `undefined` in function handlers at runtime.

**Why it happens:** `netlify.toml` env vars are build-time only. Functions run at request time, after the build, in a separate execution context.

**How to avoid:** Set ALL 8 variables in the Netlify dashboard UI. Do not add secrets to `netlify.toml`. The current `netlify.toml` in this project has no `[build.environment]` section — keep it that way.

**Warning signs:** Functions log `undefined` for env var access despite the variable being set.

### Pitfall 2: Strava Callback Domain Set to Full URL Instead of Domain Only

**What goes wrong:** Strava rejects the OAuth `redirect_uri` with an error like "redirect_uri mismatch" even though the URI looks correct.

**Why it happens:** The Strava "Authorization Callback Domain" field accepts a domain name, not a full URL. Setting it to `https://mkultragravel.netlify.app` instead of `mkultragravel.netlify.app` causes a mismatch.

**How to avoid:** Use the domain-only format: `mkultragravel.netlify.app`

**Warning signs:** Strava authorization page shows an error immediately after being redirected from the site.

### Pitfall 3: STRAVA_REDIRECT_URI Must Use Direct Function URL, Not /api/ Alias

**What goes wrong:** OAuth callback fails because Strava redirects to `/api/strava-callback` (via the `netlify.toml` rewrite alias) but the function expects to be called via `/.netlify/functions/strava-callback`.

**Why it happens:** The `netlify.toml` `[[redirects]]` rule rewrites `/api/*` to `/.netlify/functions/:splat` — but this is a server-side rewrite, not a public URL. Strava sends the OAuth redirect to the exact URL provided in `redirect_uri`. Strava's callback domain check also validates against the registered domain, and if the domain matches but there are redirect chain issues, cookies may be dropped.

**How to avoid:** Set `STRAVA_REDIRECT_URI` to the direct function URL:
```
https://mkultragravel.netlify.app/.netlify/functions/strava-callback
```
This is a prior decision from Phase 29 research and is confirmed correct.

**Warning signs:** OAuth completes on Strava's side but the browser lands on a 404 or a non-functional callback page.

### Pitfall 4: GitHub PAT Expiry Before Event Date

**What goes wrong:** The PAT expires before June 7, 2026 (the race date), causing all athlete submissions to fail with GitHub 401 errors starting on expiry day.

**Why it happens:** GitHub fine-grained PATs have configurable expiry. If a 90-day expiry was chosen at creation time, a PAT created in late March 2026 would expire in late June — cutting it very close.

**How to avoid:** When creating or verifying the PAT during this phase, confirm the expiry is either "No expiration" or set past June 7, 2026 with sufficient margin. The success criterion explicitly requires no expiry before June 7, 2026.

**Warning signs:** GitHub API returns `401 Bad credentials` after a date that matches the PAT expiry.

### Pitfall 5: STRAVA_VERIFY_TOKEN Not Recorded Securely

**What goes wrong:** The `STRAVA_VERIFY_TOKEN` value is set in Netlify dashboard but not recorded anywhere recoverable. When webhook registration is attempted in Phase 39, the token value is needed as a CLI argument and will not be readable from Netlify's dashboard (env var values are masked after creation).

**Why it happens:** Netlify masks env var values in the UI after initial creation for security. The value cannot be retrieved later — only overwritten.

**How to avoid:** Choose the `STRAVA_VERIFY_TOKEN` value, record it in a password manager or secure note, then set it in Netlify. Use a simple memorable-but-secret string (e.g. 20-character random hex from `openssl rand -hex 10`). Document that this value will be needed again in Phase 39.

**Warning signs:** Phase 39 webhook registration fails because the verify_token doesn't match what was set in Netlify.

### Pitfall 6: Variables Set with "Builds" Scope Only (Not "Functions")

**What goes wrong:** Variables are visible in the Netlify UI but functions return `undefined` for `process.env.VARIABLE`.

**Why it happens:** A variable scoped only to "Builds" is available during `npm run build` but not when serverless functions handle HTTP requests.

**How to avoid:** Set scope to "Functions" (at minimum) or leave as default (all scopes). Do NOT set scope exclusively to "Builds" or "Post processing."

**Note on Netlify plans:** Scoped variables require Pro plan or higher. If the site is on the free Starter plan, all variables get all scopes by default — this is acceptable and actually sufficient.

---

## Code Examples

There are no code changes in this phase. The verification commands are:

### Verify GitHub PAT (Contents read access)
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/Sheppardjm/mkUltraGravel/contents/package.json
# Expected: 200
```

### Generate STRAVA_VERIFY_TOKEN value (one-time)
```bash
openssl rand -hex 10
# Example output: a3f7c2e8b4d91065ef02
# Use this as the STRAVA_VERIFY_TOKEN value — record it securely
```

### Trigger Netlify build hook (verify hook works)
```bash
curl -X POST -d '{}' https://api.netlify.com/build_hooks/YOUR_HOOK_ID
# Expected: HTTP 200, new deploy starts in Netlify dashboard
```

### Verify STRAVA_REDIRECT_URI format (mental check)
```
Correct:   https://mkultragravel.netlify.app/.netlify/functions/strava-callback
Incorrect: https://mkultragravel.netlify.app/api/strava-callback
Incorrect: /.netlify/functions/strava-callback (no domain)
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Env vars in `netlify.toml` `[build.environment]` | Netlify dashboard with Functions scope | `netlify.toml` vars are build-time only, not available at function runtime |
| Classic GitHub PAT (`repo` scope, all repos) | Fine-grained PAT (Contents: Read+Write, single repo) | Minimum privilege; only accesses `mkUltraGravel` repo |
| `package.json` `engines` field for Node version | `.node-version` file | Netlify does not read `engines`; `.node-version` is the correct mechanism |
| `volta` field in `package.json` | `.node-version` file (already present) | Netlify ignores `volta`; `.node-version` is already present and correct |

**Deprecated/outdated:**
- Storing secrets in `netlify.toml`: Not supported for runtime function access — always use Netlify dashboard.
- `@netlify/functions` npm package: Archived June 9, 2025 — this project correctly uses raw `exports.handler` without the package.

---

## Open Questions

1. **Does the GITHUB_TOKEN already exist in the Netlify dashboard?**
   - What we know: The local `.env` does not contain `GITHUB_TOKEN`. The Phase 29 research specified it should be created and set in Netlify dashboard, but whether this was done is unknown.
   - What's unclear: Whether a token exists in Netlify dashboard from a prior setup session.
   - Recommendation: During Phase 36 execution, check Netlify env vars list first. If `GITHUB_TOKEN` exists, verify it with the curl test. If not, create a new fine-grained PAT.

2. **Does a Netlify build hook already exist for this site?**
   - What we know: `NETLIFY_BUILD_HOOK` is absent from local `.env`. The site was deployed in v1.0.
   - What's unclear: Whether a build hook URL was created in the Netlify dashboard during the v1.0 deployment phase (Phase 10).
   - Recommendation: Check Netlify > Build & deploy > Build hooks. If one exists, copy its URL. If not, create one and set `NETLIFY_BUILD_HOOK` env var.

3. **Is the Netlify site on a plan that supports scoped variables?**
   - What we know: Scoped variables require Pro plan or higher per Netlify docs.
   - What's unclear: Which Netlify plan the site uses.
   - Recommendation: If on the free Starter plan, skip the "Functions" scope selector — variables on Starter default to all scopes, which is sufficient. The success criterion says "visible with Functions scope" — on Starter plan, this means all-scope variables are acceptable.

4. **Has STRAVA_CLIENT_SECRET rotated since the local .env was written?**
   - What we know: Local `.env` shows `STRAVA_CLIENT_SECRET=c06026b04119a4452cdf8e0d57f776e2ccab1558` and `STRAVA_CLIENT_ID=11267`. These are likely still valid since no Strava app reset has been performed.
   - What's unclear: Whether the secret was regenerated at any point.
   - Recommendation: Cross-check `STRAVA_CLIENT_SECRET` against what's shown in `strava.com/settings/api` when setting the variable. If they differ, use the value from Strava settings (the current value).

---

## Sources

### Primary (HIGH confidence)
- `https://docs.netlify.com/environment-variables/overview/` — Scope definitions (Builds, Functions, Runtime, Post processing), default scope behavior
- `https://docs.netlify.com/functions/environment-variables/` — `process.env` in v1 functions, Functions scope requirement, `netlify.toml` limitation confirmed
- `https://docs.netlify.com/configure-builds/manage-dependencies/` — Node.js version priority: `.node-version` > `.nvmrc` > `NODE_VERSION` env var > UI setting; `volta` and `engines` NOT respected
- `https://docs.netlify.com/configure-builds/available-software-at-build-time/` — Default Node.js version is 22 on current build image
- `https://docs.netlify.com/configure-builds/build-hooks/` — Build hook URL format `https://api.netlify.com/build_hooks/{id}`, POST to trigger
- `https://developers.strava.com/docs/getting-started/` — Authorization Callback Domain field description (domain-only format)
- `https://developers.strava.com/docs/webhooks/` — `verify_token` is any string chosen by application owner, no format requirements
- `https://docs.github.com/en/rest/repos/contents` — PAT scopes: fine-grained PAT requires `Contents: Read and Write` for PUT/DELETE
- `https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens` — Fine-grained PAT creation, repository scoping, Contents permission

### Secondary (MEDIUM confidence)
- Phase 29 RESEARCH.md (`29-RESEARCH.md`) — Confirmed `STRAVA_REDIRECT_URI` must use direct function URL, not `/api/` alias; confirmed `netlify.toml` limitation for runtime vars
- Phase 31 RESEARCH.md (`31-RESEARCH.md`) — Confirmed `STRAVA_VERIFY_TOKEN` is a new variable absent from v5.0 setup; confirmed GitHub PAT `Contents: Read and Write` covers DELETE operations

### Tertiary (LOW confidence)
- None — all findings have PRIMARY or SECONDARY backing

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools verified against official docs; no novel libraries
- Architecture: HIGH — all 4 env var groups documented with official source citations
- Pitfalls: HIGH — all pitfalls sourced from official documentation constraints or confirmed prior research

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (30 days — Netlify env var behavior is stable; Strava API settings are stable; GitHub PAT mechanics are stable)
