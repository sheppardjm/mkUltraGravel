# Roadmap: MK Ultra Gravel

## Milestones

- ✅ **v1.0 MVP** - Phases 1-10 (shipped 2026-03-27)
- ✅ **v2.0 Interactivity + Polish** - Phases 11-16 (shipped 2026-03-28)
- ✅ **v3.0 Escher Identity + Data Fixes + UX Polish** - Phases 17-21 (shipped 2026-03-29)
- ✅ **v4.0 Route Update + UX Overhaul** - Phases 22-26 (shipped 2026-03-30)
- ✅ **v5.0 Strava Integration + Results** - Phases 27-32 (shipped 2026-03-30)
- ✅ **v6.0 UI Polish + Dev Tools** - Phases 33-35 (shipped 2026-03-30)
- 🚧 **v7.0 Strava Go-Live** - Phases 36-40 (in progress)

---

### 🚧 v7.0 Strava Go-Live (In Progress)

**Milestone Goal:** Get the Strava submission pipeline working end-to-end with real data — a real athlete can OAuth in, submit an activity, and appear on the leaderboard.

This is an operational milestone, not a build milestone. The pipeline is fully implemented from v5.0. The work is configuration, verification, and reactive bug fixes found during real-data testing.

- [x] **Phase 36: Environment Configuration** - Set all 8 Netlify env vars, verify GitHub PAT, confirm Strava callback domain
- [x] **Phase 37: Data Pipeline Verification** - Verify GitHub commit → rebuild → leaderboard chain using crafted curl requests
- [ ] **Phase 38: OAuth Flow Testing** - Full OAuth round-trip on production HTTPS with real Strava account
- [ ] **Phase 39: Webhook Registration** - Register Strava webhook subscription, verify deauth deletion flow
- [ ] **Phase 40: Strava App Review** - Verify branding compliance, submit app for developer program review

---

### Phase 36: Environment Configuration

**Goal**: All 8 Netlify environment variables are set with Functions scope, the Strava callback domain points to production, and the GitHub PAT is confirmed active with correct permissions — every function has what it needs to run.

**Depends on**: Nothing (first phase of milestone)

**Requirements**: ENV-01, ENV-02, ENV-03, ENV-04

**Success Criteria** (what must be TRUE):
1. All 8 env vars (STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REDIRECT_URI, STRAVA_VERIFY_TOKEN, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, NETLIFY_BUILD_HOOK) are visible in Netlify dashboard with "Functions" scope
2. Strava app "Authorization Callback Domain" shows `mkultragravel.netlify.app` (not localhost)
3. GitHub PAT responds to a test API call with 200 and confirms Contents read+write access with no expiry before June 7, 2026
4. Node.js version shown in a Netlify deploy log is >=22

**Plans**: 1 plan

Plans:
- [x] 36-01: Configure Netlify environment and verify all external credentials

---

### Phase 37: Data Pipeline Verification

**Goal**: The right side of the architecture — GitHub commit, Netlify build hook, leaderboard rebuild — works end-to-end using crafted curl requests, with no OAuth involvement.

**Depends on**: Phase 36

**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04

**Success Criteria** (what must be TRUE):
1. A crafted POST to `submit-result` commits a valid athlete JSON file to the GitHub repo (file visible in repo)
2. Netlify build hook fires and a new deploy starts in the Netlify dashboard after the commit
3. The athlete from the crafted payload appears correctly on the `/results` leaderboard after the rebuild completes
4. The scoring engine ranks athletes correctly when multiple athlete JSON files are present

**Plans**: 1 plan

Plans:
- [x] 37-01: Verify full data pipeline via crafted curl POST to production submit-result

---

### Phase 38: OAuth Flow Testing

**Goal**: A real Strava account (developer's own) can complete the full OAuth round-trip on the production HTTPS URL and end up on the leaderboard — all error paths handled gracefully and Safari-specific cookie behavior verified.

**Depends on**: Phase 37

**Requirements**: OAUTH-01, OAUTH-02, OAUTH-03, OAUTH-04, OAUTH-05, OAUTH-06, OAUTH-07

**Success Criteria** (what must be TRUE):
1. Navigating to `/submit`, entering an activity URL, and clicking Connect completes the full round-trip: Strava consent screen → callback → `/submit-confirm` → leaderboard entry after rebuild
2. The access token returned by Strava includes `activity:read_all` scope, confirmed in function logs
3. Segment efforts from a real Strava activity are extracted and matched against the 9 event segment IDs
4. Denying Strava consent, providing an invalid activity URL, and submitting with zero matching segments each produce a clear error message (not a silent failure or 500)
5. The CSRF cookie double-submit pattern completes without error on Chrome and Safari (iPhone), with known Safari SameSite behavior documented if observed

**Plans**: 1 plan

Plans:
- [ ] 38-01: Patch scope validation, execute OAuth round-trip, verify all error paths + Safari behavior

---

### Phase 39: Webhook Registration

**Goal**: The Strava webhook subscription is registered against the live production endpoint, the challenge/response handshake succeeds, and a simulated deauthorization event triggers athlete data deletion.

**Depends on**: Phase 38

**Requirements**: HOOK-01, HOOK-02, HOOK-03

**Success Criteria** (what must be TRUE):
1. Strava webhook subscription is active — subscription ID returned by the registration curl and visible via GET subscription endpoint
2. The GET challenge/response handshake succeeds (Strava confirms the subscription is valid)
3. A POST simulating a deauthorization event causes the athlete's JSON file to be deleted from the repo and a rebuild to trigger

**Plans**: TBD

Plans:
- [ ] 39-01: Register Strava webhook and verify deauth deletion flow

---

### Phase 40: Strava App Review

**Goal**: All Strava branding requirements are met on the live site and the app review application is submitted — the 7-10 business day review clock has started.

**Depends on**: Phase 38 (screenshots of working OAuth flow support the review application)

**Requirements**: REVIEW-01, REVIEW-02, REVIEW-03

**Success Criteria** (what must be TRUE):
1. The live site displays "Connect with Strava" button, "Powered by Strava" attribution, and "View on Strava" links matching Strava brand guidelines
2. The Strava developer program review form is submitted with working pipeline screenshots
3. App approval is received and the 1-athlete limit is lifted (externally gated — tracked here, cannot be completed by code)

**Plans**: TBD

Plans:
- [ ] 40-01: Verify branding compliance and submit Strava app review

---

## Progress

**Execution Order:**
Phases execute in numeric order: 36 → 37 → 38 → 39 → 40
Note: Phase 40 (review submission) should be submitted as early as Phase 38 is complete — do not wait for Phase 39. Review clock (7-10 business days) is the milestone's critical path.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-10. MVP | v1.0 | 30/30 | Complete | 2026-03-27 |
| 11-16. Interactivity + Polish | v2.0 | 15/15 | Complete | 2026-03-28 |
| 17-21. Escher Identity + Data Fixes | v3.0 | 6/6 | Complete | 2026-03-29 |
| 22-26. Route Update + UX Overhaul | v4.0 | 7/7 | Complete | 2026-03-30 |
| 27-32. Strava Integration + Results | v5.0 | 10/10 | Complete | 2026-03-30 |
| 33-35. UI Polish + Dev Tools | v6.0 | 3/3 | Complete | 2026-03-30 |
| 36. Environment Configuration | v7.0 | 1/1 | Complete | 2026-03-31 |
| 37. Data Pipeline Verification | v7.0 | 1/1 | Complete | 2026-03-31 |
| 38. OAuth Flow Testing | v7.0 | 0/TBD | Not started | - |
| 39. Webhook Registration | v7.0 | 0/TBD | Not started | - |
| 40. Strava App Review | v7.0 | 0/TBD | Not started | - |
