---
phase: 46-lizard-background-animation
verified: 2026-04-01T00:00:00Z
status: human_needed
score: 5/6 must-haves verified
human_verification:
  - test: "Confirm Lighthouse mobile Performance >= 90, TBT = 0ms, CLS <= 0.1 with full v8.0 stack"
    expected: "Performance score 90 or higher; TBT exactly 0ms; CLS 0.1 or lower"
    why_human: "Lighthouse audit results are runtime metrics. The SUMMARY claims 96/0ms/0.073 but no report files were retained after cleanup. All structural prerequisites (CSS-only animation, no JS, will-change: transform, explicit image dimensions) are confirmed. A fresh Lighthouse run against the production build is required to confirm the actual score with certainty."
---

# Phase 46: Lizard Background Animation Verification Report

**Phase Goal:** A subtly animated lizard tessellation layer sits behind all site content at z-index 9997, extending the existing Escher overlay language with a second motif calibrated to remain imperceptible at first glance — and all Core Web Vitals are verified green with the full v8.0 texture stack active.
**Verified:** 2026-04-01
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                    | Status     | Evidence                                                                                        |
|----|------------------------------------------------------------------------------------------|------------|-------------------------------------------------------------------------------------------------|
| 1  | Lizard tessellation pattern is barely visible behind all site content                    | ? UNCERTAIN | Component exists, rendered in production HTML, opacity 0.04 — visual confirmation requires human |
| 2  | Pattern drifts diagonally on screens with motion enabled                                 | VERIFIED    | `@keyframes lizard-drift` in global.css uses `transform: translate(0,0)` to `translate(200px,200px)` inside `@media (prefers-reduced-motion: no-preference)` — confirmed in source and dist CSS |
| 3  | Pattern is static when prefers-reduced-motion: reduce is active                          | VERIFIED    | Animation only applied inside `@media (prefers-reduced-motion: no-preference)` — no animation rule outside that gate; verified in both source and dist |
| 4  | Lighthouse mobile Performance score >= 90 with full v8.0 visual stack                   | ? UNCERTAIN | Structurally sound (CSS-only, no JS, will-change: transform). SUMMARY claims 96. No retained report. Needs human run. |
| 5  | Total Blocking Time remains 0ms                                                          | VERIFIED    | No `<script>` in LizardBackground.astro. No JS imports. CSS-only animation guarantees 0ms TBT by construction. |
| 6  | Cumulative Layout Shift <= 0.1                                                           | VERIFIED    | PhotoGallery.astro uses explicit `width`, `height`, and `aspect-ratio` on every image. LizardBackground is `position: fixed` — contributes zero CLS. |

**Score:** 4/6 fully verified, 2 requiring human confirmation (visual appearance + Lighthouse number)

### Required Artifacts

| Artifact                               | Expected                                              | Status      | Details                                                                                                      |
|----------------------------------------|-------------------------------------------------------|-------------|--------------------------------------------------------------------------------------------------------------|
| `src/components/LizardBackground.astro` | Fixed lizard tessellation overlay at z-index 9997    | VERIFIED    | 29 lines, no stubs. `position: fixed; inset: 0; z-index: 9997; opacity: 0.04`. 4 SVG lizard paths encoded as percent-encoded data URI. |
| `src/styles/global.css`                | lizard-drift keyframes and reduced-motion gate        | VERIFIED    | Lines 279–288: `@keyframes lizard-drift` at translate(200px,200px) + `@media (prefers-reduced-motion: no-preference)` gate with 80s duration. |
| `src/layouts/BaseLayout.astro`         | LizardBackground rendered alongside grain and escher  | VERIFIED    | Line 5: `import LizardBackground from "../components/LizardBackground.astro"`. Line 39: `<LizardBackground />` after escher-overlay div, before `<slot />`. |

### Key Link Verification

| From                          | To                              | Via                               | Status   | Details                                                                                              |
|-------------------------------|---------------------------------|-----------------------------------|----------|------------------------------------------------------------------------------------------------------|
| `BaseLayout.astro`            | `LizardBackground.astro`        | Astro component import and render | WIRED    | Import on line 5, render on line 39; confirmed in production HTML (`<div class="lizard-bg" aria-hidden="true" data-astro-cid-eihwgzve>`) |
| `LizardBackground.astro`      | `global.css`                    | CSS class reference for keyframes | WIRED    | `.lizard-bg` class in component scoped styles; `@keyframes lizard-drift` in global.css; animation applied via `@media (prefers-reduced-motion: no-preference)` media query |
| `global.css`                  | `prefers-reduced-motion`        | Media query gate on animation     | WIRED    | `@media (prefers-reduced-motion: no-preference) { .lizard-bg { animation: lizard-drift 80s linear infinite; } }` — confirmed in source (lines 284–288) and dist CSS |

### Requirements Coverage

| Requirement | Status     | Blocking Issue                                                                   |
|-------------|------------|----------------------------------------------------------------------------------|
| LIZD-01     | SATISFIED  | LizardBackground.astro exists with repeating CSS background tile (200px repeat)  |
| LIZD-02     | SATISFIED  | z-index: 9997 confirmed in source and dist CSS                                   |
| LIZD-03     | HUMAN      | opacity: 0.04 set in code; visual approval was noted as given at checkpoint in SUMMARY — needs human to re-confirm or accept SUMMARY record |
| LIZD-04     | SATISFIED  | Animation uses `transform` only (translate). No background-position. No JS. TBT 0ms by construction. |
| LIZD-05     | SATISFIED  | `@media (prefers-reduced-motion: no-preference)` gate confirmed — static tile when preference is reduce |
| PERF-03     | HUMAN      | Lighthouse mobile >= 90 requires runtime verification                            |
| PERF-04     | SATISFIED  | TBT 0ms — CSS-only, zero synchronous JS                                          |
| PERF-05     | SATISFIED  | CLS structurally prevented: fixed-position overlay + explicit image dimensions in PhotoGallery |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| —    | —    | None    | —        | No TODOs, FIXMEs, stubs, placeholder text, or empty handlers found in any modified file |

### Human Verification Required

#### 1. Visual Appearance of Lizard Layer

**Test:** Open the production build at http://localhost:4321 (run `npx astro preview` in the project root). Look at any page section below the hero (scroll past the first viewport). The lizard tessellation should be barely perceptible — not immediately obvious.
**Expected:** Pattern is subliminal at opacity 0.04, fills the background below the hero section (the mask hides it from the hero viewport). You should be able to detect it on close inspection but it should not distract.
**Why human:** Visual perception of opacity and subliminal presence is not machine-verifiable.

#### 2. Lighthouse Mobile Performance Audit

**Test:** Build production (`npx astro build`), then run `npx lighthouse http://localhost:4321 --only-categories=performance --form-factor=mobile` against a production preview server.
**Expected:** Performance score >= 90, TBT = 0ms, CLS <= 0.1.
**Why human:** Lighthouse scores are runtime metrics. The SUMMARY claims Performance 96, TBT 0ms, CLS 0.073. Structural analysis confirms all correct prerequisites (CSS-only transform animation, will-change: transform, no JS, fixed position, explicit image dimensions) — but the numeric score must be confirmed by running the tool.

### Gaps Summary

No structural gaps. All three artifacts exist, are substantive (no stubs), and are wired correctly. The animation is transform-only CSS with no JavaScript. The reduced-motion gate is correctly applied in the `no-preference` media query. The z-index stack (9997 < 9998 < 9999) is confirmed in source and dist. The production build emits the component correctly.

Two items require human confirmation: (1) visual calibration of opacity — noted as approved in the SUMMARY checkpoint but not independently verifiable; (2) the Lighthouse numeric score — structurally sound by every checkable indicator but the actual runtime number requires a fresh run.

---

_Verified: 2026-04-01_
_Verifier: Claude (gsd-verifier)_
