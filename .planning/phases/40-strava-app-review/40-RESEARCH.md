# Phase 40: Strava App Review - Research

**Researched:** 2026-03-31
**Domain:** Strava developer program review process, brand guidelines compliance, app approval
**Confidence:** HIGH (for branding audit), MEDIUM (for review form process), HIGH (for current codebase state)

## Summary

Phase 40 is split into two distinct workstreams: (1) a code audit to verify branding compliance before submission, and (2) a human-action submission to the Strava developer program review form. Both must happen before the 7-10 business day review clock starts.

The current codebase already implements all three required Strava branding elements: a "Connect with Strava" button on `/submit`, "Powered by Strava" attribution on both `/index` and `/results`, and "View on Strava" links on sector/KOM cards and results rows. The critical question is whether these text/styled implementations satisfy Strava's guidelines or whether official image assets are required. Research shows that Strava's language is permissive ("choose to use"), not mandatory, for official button and logo assets — meaning the current styled implementations are likely compliant. However, there is one ambiguity: the "Connect with Strava" button uses an approximation of Strava orange (`oklch(0.72 0.19 55)`) rather than the exact official Strava orange (`#FC5200`). The "View on Strava" links in GravelSectors.astro and KomSegments.astro correctly use `#FC5200`.

The review form is submitted via HubSpot at `https://share.hsforms.com/1VXSwPUYqSH6IxK0y51FjHwcnkd8`. The strongest submissions include: app use case description, expected user scale, compliance confirmation, and screenshots of every place Strava data appears. One critical prerequisite: athlete 2262684 (Jamison Sheppard) was deleted during the Phase 39 deauth simulation and must be re-submitted via the OAuth flow to restore a leaderboard entry before screenshots are taken.

**Primary recommendation:** Audit the button color (#FC5200 vs oklch approximation), ensure the "Powered by Strava" text on results.astro is consistent with the one on index.astro (both should use the same treatment), re-submit athlete 2262684 via `/submit`, then capture screenshots of all Strava-data-bearing pages and submit the review form. Do not wait to do this — the 7-10 business day clock (possibly up to 4 weeks in practice) must start immediately given the June 7 event deadline.

## Standard Stack

This phase has no software library dependencies. It is a compliance audit + manual form submission.

### Tools Required
| Tool | Purpose | Notes |
|------|---------|-------|
| Browser DevTools | Screenshot capture, color verification | Verify exact color values rendered |
| Strava developer dashboard | Check current app settings, athlete count | `https://www.strava.com/settings/api` |
| HubSpot review form | Submit app review | `https://share.hsforms.com/1VXSwPUYqSH6IxK0y51FjHwcnkd8` |
| Strava official assets ZIP | Download official button/logo if needed | `https://developers.strava.com/downloads/1.1-Connect-with-Strava-Buttons.zip` |
| Strava API logo ZIP | Download Powered by Strava logo if needed | `https://developers.strava.com/downloads/1.2-Strava-API-Logos.zip` |

## Architecture Patterns

### Current Strava Branding Implementation

The codebase has three branding elements deployed:

**1. "Connect with Strava" Button (`src/pages/submit.astro` line 93-101)**
- Implemented as a styled `<button>` element (not official image asset)
- Color: `oklch(0.72 0.19 55)` (approximation of Strava orange)
- Exact official Strava orange: `#FC5200`
- The discrepancy: `oklch(0.72 0.19 55)` renders visually close but not identical to `#FC5200`
- Links correctly to `/api/strava-auth` → which redirects to `https://www.strava.com/oauth/authorize` (compliant)
- Text: "Connect with Strava" (exact required phrase)

**2. "Powered by Strava" Attribution**
- `src/pages/index.astro` line 303: `text-[#FC5200] font-bold` — uses exact Strava orange
- `src/pages/results.astro` line 762: `oklch(0.72 0.19 55)` — uses approximation
- Both use styled `<span>` text, not official logo image assets
- Brand guidelines use permissive "choose to display" language — text appears acceptable

**3. "View on Strava" Links**
- `src/components/GravelSectors.astro` line 53: `text-[#FC5200]` — correct color, exact phrase
- `src/components/KomSegments.astro` line 48: `text-[#FC5200]` — correct color, exact phrase
- `src/pages/results.astro` (multiple rows): icon-only links with `aria-label="View Strava activity"` — these are icon-only (no visible "View on Strava" text), which may not satisfy the guideline requiring the text format

### Compliance Gap Analysis

| Requirement | Current Implementation | Status |
|-------------|----------------------|--------|
| "Connect with Strava" button | Styled text button, oklch approx. color | LIKELY OK — "choose to use" language |
| Button links to oauth/authorize | Via /api/strava-auth redirect | COMPLIANT |
| "Powered by Strava" — index | `#FC5200` bold span | COMPLIANT |
| "Powered by Strava" — results | `oklch(0.72 0.19 55)` bold span | MINOR INCONSISTENCY — fix before screenshots |
| "View on Strava" — sector cards | `#FC5200`, exact text, Strava icon | COMPLIANT |
| "View on Strava" — KOM cards | `#FC5200`, exact text, Strava icon | COMPLIANT |
| "View on Strava" — results rows | Icon-only, `aria-label="View Strava activity"` | RISK — no visible text "View on Strava" |

### Review Submission Content Pattern

Based on Strava FAQ and community knowledge:

```
Submission should include:
1. App name: MK Ultra Gravel
2. Client ID: [from Strava API settings dashboard]
3. Use case: [1-2 paragraph description]
4. Expected users: [rough estimate — this is a single event, ~50-200 athletes max]
5. Compliance confirmation: API Agreement + Brand Guidelines
6. Screenshots: every page where Strava data appears
```

Pages requiring screenshots (take AFTER re-submitting athlete 2262684):
- `/submit` — Connect with Strava button
- `/submit-confirm` — post-OAuth confirmation page with Strava data
- `/results` — leaderboard with Strava activity links + Powered by Strava attribution
- Home page map section — Powered by Strava attribution + sector/KOM cards with View on Strava
- KOM/sector card close-ups showing "View on Strava" links

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Official button asset | Custom component | Download from developers.strava.com/downloads/ | Official assets are already provided; using them eliminates compliance risk |
| Review form fields | Guess what's needed | Submit exactly per Strava FAQ instructions | FAQ specifies: use case, scale, compliance confirmation, screenshots |

**Key insight:** This phase is primarily a checklist verification + human form submission. The "code work" is at most a color fix and optionally adding visible "View on Strava" text to results rows. The rest is documentation and manual action.

## Common Pitfalls

### Pitfall 1: Taking Screenshots Before Restoring Athlete Data
**What goes wrong:** Screenshots of `/results` show an empty leaderboard (athlete 2262684 was deleted during Phase 39 deauth simulation)
**Why it happens:** Phase 39 deliberately deleted the athlete JSON to verify the deauth flow works
**How to avoid:** Re-submit via `/submit` using the developer's own Strava account before taking any screenshots
**Warning signs:** Empty results page when reviewing live site

### Pitfall 2: oklch Color Approximation vs #FC5200
**What goes wrong:** The "Connect with Strava" button and "Powered by Strava" on results.astro use `oklch(0.72 0.19 55)`, which is not identical to Strava's official `#FC5200`
**Why it happens:** oklch was used for the dark palette; Strava orange was added as hex `#FC5200` in the sector/KOM components but not the submit/results pages
**How to avoid:** Before screenshots, convert oklch(0.72 0.19 55) references on Strava-branded elements to `#FC5200`
**Measurement:** `oklch(0.72 0.19 55)` renders approximately as `rgb(219, 113, 2)` vs `#FC5200` = `rgb(252, 82, 0)` — visibly different

### Pitfall 3: Icon-Only "View on Strava" Links on Results Page
**What goes wrong:** The results page Strava links use only an SVG icon with `aria-label="View Strava activity"` — no visible text
**Why it happens:** Space-constrained leaderboard table layout
**Impact:** May not satisfy "use the text format 'View on Strava'" guideline
**How to avoid:** Either add a visually-hidden "View on Strava" span (screen-reader accessible, guideline-compliant), or add visible text. The icon SVG already uses the Strava chevron/bolt shape — reviewers may accept icon-only with aria-label, but this is a risk.

### Pitfall 4: Delayed Submission Missing the Approval Window
**What goes wrong:** Review takes 7-10 business days (community reports 1-4 weeks). Event is June 7, 2026. Today is March 31, 2026.
**Why it happens:** Treating Phase 40 as non-urgent
**How to avoid:** Submit the review form within 24 hours. If not approved by ~May 14 (conservative estimate), follow up at developers@strava.com with submission date and Client ID.
**Timeline math:** March 31 + 14-28 business days = April 18 - May 7 approval range (best case). Last safe submission date for June 7 event is approximately May 14.

### Pitfall 5: Unclear Use Case Description Slowing Review
**What goes wrong:** Vague descriptions slow review or trigger requests for more info
**Why it happens:** Developers undersell how their app works
**How to avoid:** Be specific: "MK Ultra Gravel is a single-event cycling results site for a 100-mile gravel race on June 7, 2026. Athletes submit their Strava activity URL; the app reads segment_efforts via the API to score their Grinduro-style timed sectors and posts results to a public leaderboard. Expected users: 50-200 athletes."

## Code Examples

### Verified Strava Orange Color (from official guidelines)
```css
/* Source: https://developers.strava.com/guidelines/ */
/* Official Strava orange — use this for ALL Strava-branded elements */
color: #FC5200;
background-color: #FC5200;
```

### "View on Strava" Accessible Text Pattern (for results rows)
```html
<!-- Source: derived from Strava guidelines "text must be legible" requirement -->
<a href="{activityUrl}" target="_blank" rel="noopener noreferrer"
   aria-label="View Strava activity" style="color: #FC5200;">
  <svg aria-hidden="true"><!-- Strava bolt icon --></svg>
  <span class="sr-only">View on Strava</span>
</a>
```

### Current Submit Button (needs color fix)
```html
<!-- Current: src/pages/submit.astro -->
<!-- oklch(0.72 0.19 55) should be replaced with #FC5200 for exact brand compliance -->
<button style="background-color: #FC5200; color: #0a0a0f; ...">
  Connect with Strava
</button>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Strava leaderboard scraping | Consent-based OAuth + segment_efforts | Pre-v5.0 | TOS-compliant results |
| No branding | "Connect with Strava", "Powered by Strava", "View on Strava" text | v5.0 | Review-ready implementation exists |
| 1 athlete (developer only) | Up to N athletes after review approval | After Phase 40 | Other athletes can submit results |

**Deprecated/outdated:**
- Strava's old API program (pre-2023): no formal review process existed; now mandatory for apps serving other athletes

## Open Questions

1. **Will icon-only "View on Strava" links on results rows pass review?**
   - What we know: Strava guideline says "use the text format 'View on Strava'"; icon-only is common in tables
   - What's unclear: Whether reviewers require visible text or accept aria-label + icon
   - Recommendation: Add `<span class="sr-only">View on Strava</span>` alongside the icon — zero visual change, full compliance

2. **Is the official "Connect with Strava" button image required, or is a styled text button acceptable?**
   - What we know: Guidelines say "apps that CHOOSE TO USE the button must link to oauth/authorize" — permissive language
   - What's unclear: Whether reviewers expect official image assets regardless of the guideline wording
   - Recommendation: Use the current styled text button (it's already correct text + color after fixing to `#FC5200`). If rejected for this reason specifically, download and swap in official SVG assets. Community reports of rejection for custom buttons were from 2023-era program updates.

3. **What is the exact Client ID for the submission form?**
   - What we know: Available at https://www.strava.com/settings/api
   - What's unclear: Not recorded in any planning docs
   - Recommendation: Look up at submission time from Strava developer dashboard

4. **Are there approved app review screenshots from Phase 38 OAuth testing?**
   - What we know: Phase 38 tested the full OAuth flow on production; athlete 2262684 was deleted by Phase 39
   - What's unclear: Whether screenshots were taken during Phase 38
   - Recommendation: Re-submit athlete 2262684 via `/submit` to restore leaderboard entry, then take fresh screenshots

## Sources

### Primary (HIGH confidence)
- `https://developers.strava.com/guidelines/` — Full brand guidelines page, last revised September 29, 2025. Verified "choose to use" permissive language for button and logo assets.
- `https://communityhub.strava.com/developers-knowledge-base-14/strava-api-faq-12906` — Official Strava API FAQ. Confirmed 1-athlete default limit, 7-10 business day review timeline, HubSpot form URL, screenshot requirements.
- Codebase audit — Direct inspection of submit.astro, results.astro, GravelSectors.astro, KomSegments.astro, index.astro for current branding implementation state.

### Secondary (MEDIUM confidence)
- `https://communityhub.strava.com/developers-knowledge-base-14/our-developer-program-3203` — Developer program overview. Confirmed "Powered by Strava" logo requirement language, feedback-before-rejection policy.
- `https://communityhub.strava.com/insider-journal-9/introducing-strava-s-updated-developer-program-1482` — 2023 program update announcement. Context for when the review requirement was introduced.

### Tertiary (LOW confidence)
- WebSearch community results suggesting custom "Connect with Strava" buttons have caused rejections — unverified single source from 2024 community discussion, Vietnamese developer context. Not confirmed by official docs.
- `http://strava.github.io/api/partner/v3/guidelines/` — Older API partner guidelines stating button must use official asset. This is the PARTNER API (not the general public API); different program tier. Not applicable here.

## Metadata

**Confidence breakdown:**
- Current branding implementation state: HIGH — audited directly from source files
- Strava guidelines (permissive vs mandatory): HIGH — verified from official docs (September 2025)
- Review form URL and process: MEDIUM — from official FAQ (primary source), confirmed by multiple community threads
- Review timeline (7-10 days): HIGH — stated in official FAQ, consistent with community reports
- Whether icon-only links pass review: LOW — no official guidance found

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (guidelines stable; review process changes are rare)
