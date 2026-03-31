# Requirements: MK Ultra Gravel v7.0

**Defined:** 2026-03-31
**Core Value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.

## v7.0 Requirements

Requirements for Strava go-live. Each maps to roadmap phases.

### Environment Configuration

- [ ] **ENV-01**: All 8 env vars set in Netlify dashboard with Functions scope (STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REDIRECT_URI, STRAVA_VERIFY_TOKEN, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, NETLIFY_BUILD_HOOK)
- [ ] **ENV-02**: Strava app Authorization Callback Domain set to production URL (mkultragravel.netlify.app)
- [ ] **ENV-03**: GitHub PAT verified with repo write permissions for athlete JSON commits
- [ ] **ENV-04**: Node.js version >=22 confirmed in Netlify build environment

### Data Pipeline Verification

- [ ] **PIPE-01**: submit-result function accepts crafted payload and commits athlete JSON to GitHub repo
- [ ] **PIPE-02**: Netlify build hook triggers site rebuild after athlete JSON commit
- [ ] **PIPE-03**: Leaderboard renders submitted athlete data correctly after rebuild
- [ ] **PIPE-04**: Scoring engine produces correct rankings from real athlete JSON files

### OAuth Flow Testing

- [ ] **OAUTH-01**: Full OAuth round-trip works on deployed HTTPS URL (strava-auth → Strava consent → strava-callback → submit page)
- [ ] **OAUTH-02**: Token exchange returns valid access token with activity:read_all scope
- [ ] **OAUTH-03**: Segment_efforts extracted correctly from real Strava activity
- [ ] **OAUTH-04**: Error states handled gracefully (denied consent, expired token, invalid activity URL)
- [ ] **OAUTH-05**: Scope validation added — detect and surface partial scope acceptance
- [ ] **OAUTH-06**: CSRF cookie double-submit pattern verified on production HTTPS
- [ ] **OAUTH-07**: Safari/iPhone tested for SameSite cookie behavior

### Webhook & Deauthorization

- [ ] **HOOK-01**: Strava webhook subscription registered via API
- [ ] **HOOK-02**: GET challenge/response handshake verified (Strava subscription validation)
- [ ] **HOOK-03**: Deauthorization POST from Strava triggers athlete data deletion flow

### Strava App Review

- [ ] **REVIEW-01**: Strava branding compliance verified (Connect with Strava button, Powered by Strava attribution, View on Strava links)
- [ ] **REVIEW-02**: App submitted to Strava developer program review
- [ ] **REVIEW-03**: App approved and 1-athlete limit lifted

## Future Requirements

Deferred beyond v7.0. Tracked but not in current roadmap.

### Post-Event

- **POST-01**: Real segment matching verified with actual June 7 race activities
- **POST-02**: Multi-athlete concurrent submission load testing
- **POST-03**: KOM/QOM times populated on cards from real race data

## Out of Scope

| Feature | Reason |
|---------|--------|
| New UI features | This is a go-live milestone, not a build milestone |
| Automated E2E test suite | Manual testing sufficient for single-event site |
| Strava API mock server | Real API testing is the point of this milestone |
| Multiple Strava app environments (dev/prod) | Single app sufficient; can switch callback domain |
| Database migration from JSON files | JSON file storage validated as sufficient in v5.0 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ENV-01 | Pending | Pending |
| ENV-02 | Pending | Pending |
| ENV-03 | Pending | Pending |
| ENV-04 | Pending | Pending |
| PIPE-01 | Pending | Pending |
| PIPE-02 | Pending | Pending |
| PIPE-03 | Pending | Pending |
| PIPE-04 | Pending | Pending |
| OAUTH-01 | Pending | Pending |
| OAUTH-02 | Pending | Pending |
| OAUTH-03 | Pending | Pending |
| OAUTH-04 | Pending | Pending |
| OAUTH-05 | Pending | Pending |
| OAUTH-06 | Pending | Pending |
| OAUTH-07 | Pending | Pending |
| HOOK-01 | Pending | Pending |
| HOOK-02 | Pending | Pending |
| HOOK-03 | Pending | Pending |
| REVIEW-01 | Pending | Pending |
| REVIEW-02 | Pending | Pending |
| REVIEW-03 | Pending | Pending |

**Coverage:**
- v7.0 requirements: 21 total
- Mapped to phases: 0
- Unmapped: 21 ⚠️

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after initial definition*
