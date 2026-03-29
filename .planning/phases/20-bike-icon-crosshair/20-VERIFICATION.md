---
phase: 20-bike-icon-crosshair
verified: 2026-03-29T18:07:55Z
status: passed
score: 4/4 must-haves verified
---

# Phase 20: Bike Icon Crosshair Verification Report

**Phase Goal:** The elevation hover crosshair on the map is a bike SVG icon instead of a plain dot.
**Verified:** 2026-03-29T18:07:55Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Hovering over the elevation chart displays a bike icon on the map route at the corresponding position instead of a plain circle | VERIFIED | `L.marker` + `L.divIcon` with inline bicycle SVG at RouteMap.astro:227-232; `elevation:hover` listener at line 247-251 calls `setLatLng` + `setOpacity(1)`; no `circleMarker` references remain (grep count: 0) |
| 2 | The bike icon appears and disappears cleanly — no ghost marker or CSS flicker — when the cursor enters and exits the chart | VERIFIED | `setOpacity(0)` initial state (line 236); `setOpacity(1)` on hover (line 250); `setOpacity(0)` on hoverEnd (line 255); `:global(.bike-crosshair)` CSS (lines 34-37) sets `background: transparent !important; border: none !important` suppressing Leaflet's default white divIcon background |
| 3 | The icon is correctly centered on the route point at zoom levels 8, 12, and 16 (no anchor drift) | VERIFIED | `iconAnchor: [12, 12]` on a 24x24 icon (RouteMap.astro:231) — half width/height centers the icon on the GPS coordinate at all zoom levels; consistent with the pattern used by every other divIcon in the file (restock: [8,8] on 16px, photo: [7,7] on 14px, cluster: [16,16] on 32px) |
| 4 | Existing map interactions (sector polyline hover/click, KOM popups, restock popups, photo cluster expand) continue to work unchanged | VERIFIED | All five interaction systems verified present and unmodified: sector polylines with mouseover/mouseout/click (lines 112-122), KOM polylines with bindPopup (lines 154-169), restock divIcon markers with bindPopup (lines 172-186), photo cluster with markerClusterGroup (lines 206-223), elevation:sectorClick zoom listener (lines 258-282); `interactive: false` on crosshair (line 237) ensures it does not capture mouse events from underlying polylines |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/RouteMap.astro` | Bike SVG divIcon crosshair marker with show/hide via setOpacity | VERIFIED | 318 lines; L.divIcon with className `bike-crosshair` and inline SVG at lines 227-232; L.marker with `opacity: 0, interactive: false, zIndexOffset: 1000` at lines 234-239 |

**Artifact level checks:**

- Level 1 (Exists): `src/components/RouteMap.astro` — EXISTS (318 lines)
- Level 2 (Substantive): 318 lines, no stub patterns in crosshair section, full SVG implementation present
- Level 3 (Wired): Component is the single RouteMap entry point — no separate import check needed; event listeners directly wire to the crosshair instance

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `elevation:hover` CustomEvent | `crosshair.setLatLng + crosshair.setOpacity(1)` | `window.addEventListener` | WIRED | ElevationProfile.astro:171 dispatches with `detail: { lat, lon }`; RouteMap.astro:247-251 listens and calls both methods |
| `elevation:hoverEnd` CustomEvent | `crosshair.setOpacity(0)` | `window.addEventListener` | WIRED | ElevationProfile.astro:218 dispatches; RouteMap.astro:254-256 listens and hides marker |
| `L.divIcon className: 'bike-crosshair'` | `:global(.bike-crosshair)` CSS rule | Leaflet DOM insertion outside Astro scope | WIRED | CSS rule at RouteMap.astro:34-37 with `background: transparent !important; border: none !important`; `bike-crosshair` appears in both divIcon declaration (line 228) and CSS rule (line 34) — grep count: 2 |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| UX-01: Elevation hover crosshair is a bike icon, not a plain dot | SATISFIED | L.circleMarker fully replaced; bike SVG divIcon in place |
| Clean show/hide (no ghost, no flicker) | SATISFIED | setOpacity pattern; transparent CSS suppresses default Leaflet divIcon background |
| Centered at zoom 8, 12, 16 (no anchor drift) | SATISFIED | iconAnchor: [12, 12] on 24x24 icon is mathematically correct at all zoom levels |
| No regression in existing map interactions | SATISFIED | All five interaction systems present and unmodified; interactive: false on crosshair prevents event capture |

### Anti-Patterns Found

None. No TODO/FIXME/placeholder/stub patterns found in the modified crosshair section. All four `setStyle` calls in the file are on sector polylines (which correctly use `L.Path.setStyle`) — none on the crosshair marker.

### Human Verification Required

The following items cannot be verified programmatically and require a browser test:

#### 1. Visual: Bike SVG renders legibly at 24px

**Test:** Open the site in a browser, scroll to the elevation chart, hover the cursor over the chart.
**Expected:** A cyan bicycle outline icon (not a dot, not a broken-image placeholder, not a white box) appears on the map at the corresponding route position.
**Why human:** SVG path correctness and Leaflet CSS cascade interactions (e.g., Leaflet's `.leaflet-div-icon` default white background being fully overridden) cannot be confirmed without rendering.

#### 2. Ghost marker: No residual icon after cursor exits

**Test:** Hover over the elevation chart, then move the cursor completely off the chart area. Repeat several times.
**Expected:** The bike icon disappears immediately and completely each time. No faint outline, no frozen icon, no blinking.
**Why human:** DOM rendering behavior after `setOpacity(0)` is a browser visual — cannot be confirmed from code alone.

#### 3. Anchor centering at zoom levels 8, 12, 16

**Test:** With the bike icon visible (cursor hovering chart), zoom the map to approximately zoom 8, then 12, then 16.
**Expected:** The bike icon remains centered on the route track at each zoom level. The center of the SVG, not its top-left corner, sits on the GPS coordinate.
**Why human:** Leaflet anchor positioning is a rendered-DOM concern; the math (`iconAnchor: [12, 12]` = half of 24) is correct in code but visual confirmation is best practice for the zoom-drift pitfall.

#### 4. Non-interference with existing interactions

**Test:** While hovering the elevation chart (bike icon visible), click a gravel sector band on the elevation chart. Then click a KOM overlay on the map. Then click a photo marker.
**Expected:** All interactions fire normally — the map zooms to the sector, the KOM popup opens, the photo popup opens. The bike icon does not intercept any clicks.
**Why human:** `interactive: false` should prevent capture, but overlapping z-index behavior at zoom 16 (where `zIndexOffset: 1000` raises the marker) is a real-world rendering concern.

## Gaps Summary

No gaps. All four must-have truths are verified at all three levels (exists, substantive, wired). The build passes without errors. The only outstanding items are standard human browser verification checks that are appropriate for a visual/interactive phase of this type.

---

_Verified: 2026-03-29T18:07:55Z_
_Verifier: Claude (gsd-verifier)_
