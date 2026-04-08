# Roadmap: MK Ultra Gravel v10.4

## Overview

v10.4 is a visual polish milestone targeting three independent surface areas: segment card display (badge z-index, photo resolution, max-width), Escher overlay contrast, and gallery column fill. All five requirements are CSS/pipeline fixes with no cross-dependencies.

## Milestones

- 🚧 **v10.4 Polish** - Phases 53-55 (in progress)

## Phases

- [x] **Phase 53: Card Display** - Badge visibility, photo resolution, and gravel card width constraints
- [x] **Phase 54: Overlay Contrast** - Escher background opacity reduced for text readability
- [x] **Phase 55: Gallery Fill** - Masonry columns fill evenly across variable aspect ratios

## Phase Details

### Phase 53: Card Display
**Goal**: Segment cards render correctly on large screens — classified badge visible, photos sharp, gravel cards reasonably sized
**Depends on**: Nothing (first phase)
**Requirements**: CARD-02, CARD-03, CARD-04
**Success Criteria** (what must be TRUE):
  1. Classified badge renders fully visible above all card content on every segment card — no clipping, no occlusion by overflow-hidden parents or stacking context
  2. Gravel sector card photos appear sharp (no visible softness or upscaling artifacts) on viewports 1440px and wider
  3. Gravel sector cards stop growing at a reasonable max-width on ultrawide viewports (2560px+) — card content does not stretch across the full viewport
**Plans**: 2 plans

Plans:
- [x] 53-01-PLAN.md — Badge clipping fix, card photo resolution bump, max-width constraint
- [ ] 53-02-PLAN.md — Gap closure: z-index fix for CLASSIFIED badge paint order

### Phase 54: Overlay Contrast
**Goal**: Light text over Escher tessellation background maintains readable contrast at all scroll positions
**Depends on**: Nothing (independent)
**Requirements**: VIS-16
**Success Criteria** (what must be TRUE):
  1. Light-colored text (white, muted, accent) remains legible over the Escher tessellation at every scroll position on the homepage
  2. The Escher visual texture is still perceptible as a background element (not reduced to invisibility)
**Plans**: 1 plan

Plans:
- [x] 54-01-PLAN.md — Reduce EscherLizards opacity for text contrast

### Phase 55: Gallery Fill
**Goal**: Photo gallery columns fill evenly with minimal wasted vertical space
**Depends on**: Nothing (independent)
**Requirements**: GAL-02
**Success Criteria** (what must be TRUE):
  1. Gallery columns are visually balanced — no column ends significantly shorter than its neighbors across the full photo set
  2. All photos render at their natural aspect ratio (no cropping or distortion introduced by the fill fix)
  3. Gallery remains horizontally scrollable with the existing UX pattern preserved
**Plans**: 1 plan

Plans:
- [x] 55-01-PLAN.md — Balanced column fill CSS change + visual verification

## Progress

**Execution Order:**
Phases 53, 54, 55 are independent and can execute in any order.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 53. Card Display | 1/2 | Gap closure pending | 2026-04-08 |
| 54. Overlay Contrast | 1/1 | Complete | 2026-04-08 |
| 55. Gallery Fill | 1/1 | Complete | 2026-04-08 |
