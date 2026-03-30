---
phase: 24-css-layout-content
plan: 03
subsystem: ui
tags: [leaflet, css, tailwind, card-layout, reset-button, gap-closure]

# Dependency graph
requires:
  - phase: 24-01
    provides: Leaflet zoom override pattern, card min-h utility
  - phase: 25-map-reset
    provides: map:reset CustomEvent handler in RouteMap.astro
provides:
  - Gravel card images decoupled from container width via fixed h-[180px]
  - Reset button as custom Leaflet control in zoom bar area
  - Zoom + reset controls enlarged to 52x52px
affects: [RouteMap.astro Leaflet controls, GravelSectors.astro card images]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Custom Leaflet control: L.Control.extend with position topleft, dispatches map:reset CustomEvent"
    - "Fixed image height: h-[180px] decouples card image from container width (replaces aspect-video)"
    - "Leaflet bar styling: .leaflet-bar a selector covers all controls (zoom + reset) with dark theme"

key-files:
  created: []
  modified:
    - src/components/RouteMap.astro
    - src/components/GravelSectors.astro
    - src/pages/index.astro
    - src/styles/global.css

key-decisions:
  - decision: "Move reset button from standalone HTML to custom Leaflet control"
    why: "User feedback — reset belongs with map controls, not below elevation chart"
  - decision: "Enlarge zoom controls from 44px to 52px with 22px font"
    why: "User feedback — controls needed to be larger"
  - decision: "Broaden .leaflet-control-zoom a to .leaflet-bar a for dark theme"
    why: "All map controls should share the same dark background and light icon styling"
  - decision: "h-[180px] on gravel card images instead of aspect-video"
    why: "aspect-video scales with container width; gravel cards in col-span-2 were ~2x taller than KOM cards"

# Verification
verification:
  build: pass
  human-verify: approved
  notes: "User requested moving reset button to zoom controls and enlarging controls during checkpoint review"
---

# 24-03: Gap Closure — Card Height + Reset Button + Zoom Controls

## Deliverables

1. **Card height parity**: Gravel sector card images use `h-[180px]` instead of `aspect-video`, decoupling image height from container width so gravel and KOM cards appear visually balanced.

2. **Reset button as Leaflet control**: Custom `L.Control.extend` adds a ↺ reset button below the zoom +/- controls on the map. Dispatches `map:reset` CustomEvent. Standalone button removed from index.astro.

3. **Enlarged map controls**: All `.leaflet-bar a` controls increased from 44px to 52px with 22px font size. Dark theme styling broadened from `.leaflet-control-zoom a` to `.leaflet-bar a` so reset control matches.

## Commits

| Hash | Description |
|------|-------------|
| 64dd60d | fix(24-03): card height h-[180px] + reset button bg-bg-surface |
| bc370c7 | fix(24-03): move reset button to map zoom controls, enlarge to 52px |
| c8f65ef | fix(24-03): style reset control to match zoom controls dark theme |

## Issues

None. User approved after two rounds of feedback (move reset to controls, match dark theme).
