---
phase: 18-photo-position-verification
plan: 01
status: complete
started: 2026-03-29
completed: 2026-03-29
---

## Summary

Verified and corrected all 53 photo map marker positions in photos.json against photo-manifest.js.

## What Was Built

- **Programmatic verification** confirmed photos.json was in sync with photo-manifest.js (the old, incorrect estimates)
- **Route owner visual verification** via photo-verify.html tool revealed 33 of 53 photos had incorrect estimated mile markers — some off by 30+ miles
- **Bulk correction** applied all 33 owner-verified mile positions to photo-manifest.js, re-sorted by mile
- **Full pipeline regeneration** via `node scripts/generate-data.js` restored width/height fields and updated all downstream data

## Deliverables

| Artifact | Description |
|----------|-------------|
| `scripts/photo-manifest.js` | All 53 mile markers verified by route owner, sorted by mile |
| `public/data/photos.json` | Regenerated with correct lat/lon positions, width/height preserved |
| `public/data/annotations.json` | Updated card photos (cover photo assignments shifted with new positions) |

## Commits

| Hash | Message |
|------|---------|
| `03002c5` | fix(18-01): correct mile markers for all 53 route photos |

## Deviations

- **Photo-verify tool built during execution**: Original plan assumed programmatic verification would suffice. Visual spot-check immediately revealed the source data (photo-manifest.js) had wrong estimates for 33/53 photos. Built `public/photo-verify.html` as a Leaflet-based tool for the route owner to assign correct mile values by clicking the route.
- **No early-mile photos**: After correction, the earliest photo is at mi 19.6 (previously estimated at mi 4.0). The first ~19 miles of the route have no photo coverage.
- **Billie Helmer KOM fallback**: New photo positions mean no photos fall within mi 21.9-22.59 (Billie Helmer KOM range). Uses nearest fallback at mi 21.1.

## Verification

- `node scripts/match-photos.js` → "all checks passed", zero warnings
- Inline comparison: PASS — all 53 entries match manifest
- Width/height fields: present on all 53 entries
- Route owner visual spot-check: approved
