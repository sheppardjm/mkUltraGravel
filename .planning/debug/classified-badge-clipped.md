---
status: diagnosed
trigger: "CLASSIFIED badge on gravel sector cards is hidden/clipped behind the card image"
created: 2026-04-08T16:09:00Z
updated: 2026-04-08T16:15:00Z
---

## Current Focus

hypothesis: CONFIRMED. On cards where image container has `relative` class (gravel i<2, KOM i===0), both ::before and image container are positioned elements competing at the same stacking level. DOM order causes ::before to paint first (behind). isolation:isolate on the same cards creates the stacking context that makes this paint-order competition happen. The reveal animation's transform:translateY(0) reinforces this on ALL cards after animation.
test: Add z-index: 1 to .classified-border::before
expecting: Badge paints above the image on all cards
next_action: Return diagnosis

## Symptoms

expected: CLASSIFIED badge visible above the card image on gravel sector cards
actual: Badge hidden/clipped behind the card image on gravel sector cards; KOM cards reported as working
errors: None (visual bug)
reproduction: Load page, scroll to Gravel Sectors section
started: After Phase 53 restructured card DOM

## Eliminated

- hypothesis: Structural difference between GravelSectors and KomSegments card DOM
  evidence: Both components use identical structure - .classified-border with data-reveal, overflow-hidden image container, content sibling. GravelSectors.astro:21 and KomSegments.astro:20 are structurally identical.
  timestamp: 2026-04-08T16:10:00Z

- hypothesis: overflow-hidden on ancestor element clips the badge geometrically
  evidence: #sectors section has overflow-hidden but py-16 padding. Cards are well within the section padding box. The ::before at top:-0.7em is geometrically inside the section. No intermediate ancestor has overflow-hidden.
  timestamp: 2026-04-08T16:11:00Z

- hypothesis: Tailwind v4 adds extra CSS to overflow-hidden or classified-border
  evidence: Compiled CSS shows .overflow-hidden{overflow:hidden} with no extras. .classified-border:before has standard properties. No rogue rules.
  timestamp: 2026-04-08T16:12:00Z

- hypothesis: Layer ordering issue between @layer components and @layer utilities
  evidence: No conflicting properties between classified-border (components layer) and data-reveal (utilities layer). They target different properties.
  timestamp: 2026-04-08T16:13:00Z

- hypothesis: z-index from parent wrappers creates differential behavior
  evidence: Only z-index in use is z-10 on the relative content wrapper inside #sectors, which is a common ancestor of both gravel and KOM cards.
  timestamp: 2026-04-08T16:13:30Z

## Evidence

- timestamp: 2026-04-08T16:10:00Z
  checked: GravelSectors.astro vs KomSegments.astro card structure
  found: Identical DOM structure. Both have .classified-border with data-reveal, overflow-hidden image container child, and content div sibling. Both get isolation:isolate on first card(s) and relative on first image container(s).
  implication: Root cause is NOT a structural difference between components.

- timestamp: 2026-04-08T16:10:30Z
  checked: The reveal animation CSS
  found: --animate-reveal is "reveal 0.35s ease-out both". @keyframes reveal goes from {opacity:0; transform:translateY(12px)} to {opacity:1; transform:translateY(0)}. fill:both means the to-state persists after animation.
  implication: transform:translateY(0) persists indefinitely on all revealed cards, creating a permanent stacking context.

- timestamp: 2026-04-08T16:11:00Z
  checked: .classified-border::before CSS
  found: position:absolute; top:-0.7em; left:1em; background-color:var(--color-bg-base); NO z-index set.
  implication: Badge relies on default stacking order to paint above card content. Within a stacking context (from transform), default ordering may not guarantee this.

- timestamp: 2026-04-08T16:12:00Z
  checked: #sectors section and ancestor chain
  found: Section has overflow-hidden. Grid, col-span-2, and space-y-4 wrappers have no overflow properties. No intermediate clipping.
  implication: Overflow-hidden on section is not the direct cause, but it prevents any badge content above the section from being visible.

- timestamp: 2026-04-08T16:14:00Z
  checked: Compiled CSS for any additional z-index or overflow rules
  found: No rules target card children or pseudo-elements unexpectedly. Only Tailwind variable initialization applies to :before/:after.
  implication: No hidden CSS interference.

- timestamp: 2026-04-08T16:16:00Z
  checked: Which cards get `relative` on the image container and `isolation:isolate`
  found: GravelSectors line 21-22 adds isolation:isolate and relative for i<2 (cards 0,1). KomSegments line 20-21 adds isolation:isolate and relative for i===0 (card 0). These are the SAME cards that have tone overlay images needing a positioned parent.
  implication: These specific cards create a stacking context (isolation:isolate) with a positioned image container (relative) that competes with ::before in DOM order. The badge loses because ::before is generated before the div in DOM order. This is THE root cause.

## Resolution

root_cause: CSS stacking order conflict between the ::before badge and a positioned image container on specific cards.

On cards where the image container gets class "relative" (gravel cards 0-1, KOM card 0), both the ::before pseudo-element and the image container are positioned elements within the same stacking context. Per CSS spec, positioned elements at the same z-index (auto) paint in DOM order. Since ::before is generated before the image container div in the DOM, it paints FIRST -- meaning the image container paints ON TOP, hiding the badge.

The stacking context is created by two factors:
1. `isolation: isolate` inline style on these same cards (added for tone-image compositing)
2. `transform: translateY(0)` persisted from the reveal animation's fill-mode:both (affects ALL cards after reveal)

Cards without `relative` on the image container (gravel 2-6, KOM 1-2) are unaffected because the non-positioned image container paints at CSS paint step 3 (in-flow non-positioned blocks), while the positioned ::before paints at step 6 (positioned elements) -- thus the badge correctly appears on top.

The "relative" class is added to the image container specifically for cards that have a tone overlay image (position:absolute, needs a positioned parent). The isolation:isolate is added to the same cards for mix-blend-mode compositing.

KOM card 0 has the same bug. The user likely only noticed it on gravel cards because there are 7 gravel cards (2 affected = prominent) vs 3 KOM cards (1 affected = less noticeable).

fix: (not applied - diagnosis only)
verification: (not applied - diagnosis only)
files_changed: []
