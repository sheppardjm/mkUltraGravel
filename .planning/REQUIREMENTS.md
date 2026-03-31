# Requirements: MK Ultra Gravel v7.0

**Defined:** 2026-03-31
**Core Value:** Get gravel cyclists excited enough about this ride to show up on June 7, 2026.

## v7.0 Requirements

Requirements for Strava go-live. Each maps to roadmap phases.

### Environment Configuration

- [x] **ENV-01**: All 8 env vars set in Netlify dashboard with Functions scope (STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REDIRECT_URI, STRAVA_VERIFY_TOKEN, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, NETLIFY_BUILD_HOOK)
- [x] **ENV-02**: Strava app Authorization Callback Domain set to production URL (mkultragravel.netlify.app)
- [x] **ENV-03**: GitHub PAT verified with repo write permissions for athlete JSON commits
- [x] **ENV-04**: Node.js version >=22 confirmed in Netlify build environment

### Data Pipeline Verification

- [x] **PIPE-01**: submit-result function accepts crafted payload and commits athlete JSON to GitHub repo
- [x] **PIPE-02**: Netlify build hook triggers site rebuild after athlete JSON commit
- [x] **PIPE-03**: Leaderboard renders submitted athlete data correctly after rebuild
- [x] **PIPE-04**: Scoring engine produces correct rankings from real athlete JSON files

### OAuth Flow Testing

- [x] **OAUTH-01**: Full OAuth round-trip works on deployed HTTPS URL (strava-auth → Strava consent → strava-callback → submit page)
- [x] **OAUTH-02**: Token exchange returns valid access token with activity:read_all scope
- [x] **OAUTH-03**: Segment_efforts extracted correctly from real Strava activity
- [x] **OAUTH-04**: Error states handled gracefully (denied consent, expired token, invalid activity URL)
- [x] **OAUTH-05**: Scope validation added — detect and surface partial scope acceptance
- [x] **OAUTH-06**: CSRF cookie double-submit pattern verified on production HTTPS
- [x] **OAUTH-07**: Safari/iPhone tested for SameSite cookie behavior

### Webhook & Deauthorization

- [x] **HOOK-01**: Strava webhook subscription registered via API
- [x] **HOOK-02**: GET challenge/response handshake verified (Strava subscription validation)
- [x] **HOOK-03**: Deauthorization POST from Strava triggers athlete data deletion flow

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
| ENV-01 | Phase 36 | Complete |
| ENV-02 | Phase 36 | Complete |
| ENV-03 | Phase 36 | Complete |
| ENV-04 | Phase 36 | Complete |
| PIPE-01 | Phase 37 | Complete |
| PIPE-02 | Phase 37 | Complete |
| PIPE-03 | Phase 37 | Complete |
| PIPE-04 | Phase 37 | Complete |
| OAUTH-01 | Phase 38 | Complete |
| OAUTH-02 | Phase 38 | Complete |
| OAUTH-03 | Phase 38 | Complete |
| OAUTH-04 | Phase 38 | Complete |
| OAUTH-05 | Phase 38 | Complete |
| OAUTH-06 | Phase 38 | Complete |
| OAUTH-07 | Phase 38 | Complete |
| HOOK-01 | Phase 39 | Complete |
| HOOK-02 | Phase 39 | Complete |
| HOOK-03 | Phase 39 | Complete |
| REVIEW-01 | Phase 40 | Pending |
| REVIEW-02 | Phase 40 | Pending |
| REVIEW-03 | Phase 40 | Pending |

**Coverage:**
- v7.0 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after Phase 39 completion (HOOK-01 through HOOK-03 verified)*
