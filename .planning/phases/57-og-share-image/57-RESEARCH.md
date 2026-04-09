# Phase 57: OG Share Image - Research

**Researched:** 2026-04-09
**Domain:** Image asset creation — static file, no code
**Confidence:** HIGH

## Summary

Phase 57 is purely an asset creation task: produce a 1200×630 JPEG file at `public/og-image.jpg`. No libraries, no build step changes, no Astro configuration. The file will be referenced by Phase 58 (Meta Tags). The entire deliverable is a single file on disk.

The standard approach for 1200×630 OG images is to use an existing landscape photo resized with center-crop to fill the target canvas. ImageMagick 7 (`magick`) is already installed at `/usr/local/bin/magick` and handles this in a single CLI command. The project has 9 landscape-oriented route photos in `public/images/` as source candidates.

The best single-candidate photo for minimal cropping is the "Down Jeep" image (`68686675_2890293017652424_6952024628709556224_n.jpg` at mi 83.8) — it is 2048×1152 (16:9, ratio 1.778), the closest aspect ratio to 1.91:1, requiring only 6.7% top/bottom crop versus 30% for all 4:3 photos. At quality 85 it produces a 156 KB output — well under the 300 KB budget.

**Primary recommendation:** Use `magick` to resize+center-crop the Down Jeep photo to 1200×630 at quality 85, save as `public/og-image.jpg`. One-command, no deps, well within file size budget.

## Standard Stack

### Core

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| ImageMagick | 7.1.1-47 (installed) | Resize + center crop to 1200×630 | Already installed, battle-tested CLI, handles JPEG quality control |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| macOS `sips` | system | Verify output dimensions after conversion | Quick verification without extra deps |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ImageMagick CLI | Photoshop/Figma manual export | Manual is fine but not reproducible — CLI is documented and rerunnable |
| ImageMagick CLI | Node canvas / Sharp script | Over-engineered for a one-shot static asset; no build integration needed |
| JPEG | PNG | JPEG is correct for photos (smaller); PNG needed for logos/sharp lines only |

**Installation:** None required — `magick` already present at `/usr/local/bin/magick`.

## Architecture Patterns

### Recommended Project Structure

```
public/
└── og-image.jpg        # 1200×630 JPEG, ~150–300 KB, referenced by Phase 58 meta tags
```

No subdirectory needed. Flat placement in `public/` ensures it is served at `https://mkultragravel.com/og-image.jpg` — a clean, stable absolute URL for `og:image`.

### Pattern 1: Center-Crop Resize

**What:** Resize source to fill 1200×630 (scale up whichever dimension fits, overflow the other), then crop center.

**When to use:** Source aspect ratio differs from 1.91:1 — keeps subject matter centered.

**Command:**
```bash
# ImageMagick v7 syntax (use "magick", not deprecated "convert")
magick "public/images/SOURCE.jpg" \
  -resize 1200x630^ \
  -gravity center \
  -extent 1200x630 \
  -quality 85 \
  "public/og-image.jpg"
```

**Flag breakdown:**
- `-resize 1200x630^` — `^` means "fill" (scale to cover, not fit); output may be larger than canvas in one dimension
- `-gravity center` — center the image before extent crops it
- `-extent 1200x630` — set exact canvas size, cropping overflow
- `-quality 85` — JPEG quality; produces ~130–160 KB for this source; sweet spot for photo quality vs size

### Anti-Patterns to Avoid

- **Using `convert` instead of `magick`:** `convert` is deprecated in ImageMagick v7; use `magick` directly.
- **Using `-resize 1200x630` without `^`:** Without `^`, ImageMagick fits within the box (letterboxes), producing black bars. Use `^` for fill behavior.
- **Relative URL in og:image tag (Phase 58 concern):** The OG image URL must be absolute (`https://mkultragravel.com/og-image.jpg`). This is a Phase 58 concern, but the file path choice here (`public/og-image.jpg` → `/og-image.jpg`) must support it.
- **Using WebP format:** WebP is not universally supported for OG images. Facebook's crawler and older platforms may not render WebP. JPEG is required.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Center crop | Custom Node.js script | `magick` CLI one-liner | ImageMagick handles edge cases (aspect ratio, JPEG encoding, color profiles) |

**Key insight:** This phase is pure asset creation. There is no code to write. Overthinking it (scripting, automation) adds complexity with no benefit.

## Common Pitfalls

### Pitfall 1: Wrong ImageMagick Syntax (v6 vs v7)

**What goes wrong:** Using `convert` command fails or produces warnings on this machine.

**Why it happens:** ImageMagick 7 deprecated `convert` in favor of `magick`. The installed version is 7.1.1-47.

**How to avoid:** Use `magick` (not `convert`). The warning message explicitly says: "The convert command is deprecated in IMv7, use 'magick' instead."

**Warning signs:** `WARNING: The convert command is deprecated` in output.

---

### Pitfall 2: Excessive Top/Bottom Crop on 4:3 Photos

**What goes wrong:** Using a 4:3 landscape photo (1600×1200 or 2048×1536) loses 30% of the image height — subjects at top or bottom may be cut off.

**Why it happens:** 4:3 ratio (1.333) is much narrower than 1.91:1 OG ratio; the crop is severe.

**How to avoid:** Prefer the Down Jeep photo (2048×1152, 16:9) which loses only 6.7% of height. If a 4:3 photo must be used, use `-gravity south` or `-gravity north` to adjust crop anchor to a better compositional center.

---

### Pitfall 3: File Too Large / Wrong Format

**What goes wrong:** Output JPEG exceeds 300 KB budget or is saved as PNG.

**Why it happens:** Using quality 95+ or starting from very high-detail source.

**How to avoid:** `-quality 85` produces 156 KB from the Down Jeep photo. All tested candidates produce under 300 KB at q85. PNG is not appropriate for photo-based OG images.

---

### Pitfall 4: Image Not Publicly Accessible

**What goes wrong:** Social platforms cache a broken/missing preview.

**Why it happens:** File not committed to repo, served from wrong path, or uses HTTP instead of HTTPS.

**How to avoid:** Commit `public/og-image.jpg` to git. Netlify serves `public/` at root, so `public/og-image.jpg` becomes `https://mkultragravel.com/og-image.jpg` automatically. The file must exist in the deployed build — static assets in `public/` are included automatically by Astro.

## Code Examples

### Verified Conversion Command

```bash
# Source: ImageMagick 7.1.1-47 — tested on this machine
# Output verified: 1200×630px, 156 KB at q85

magick "public/images/68686675_2890293017652424_6952024628709556224_n.jpg" \
  -resize 1200x630^ \
  -gravity center \
  -extent 1200x630 \
  -quality 85 \
  "public/og-image.jpg"
```

### Verification Command

```bash
# Verify output dimensions after conversion
sips -g pixelWidth -g pixelHeight public/og-image.jpg
# Expected output:
#   pixelWidth: 1200
#   pixelHeight: 630

# Verify file size
du -k public/og-image.jpg
# Should be < 300 KB (156 KB expected at q85 from Down Jeep source)
```

## Photo Candidate Analysis

Ranked by suitability (aspect ratio proximity to 1.91:1):

| Photo | Path | Dimensions | Ratio | Crop Loss | Est. Size (q85) | Notes |
|-------|------|------------|-------|-----------|-----------------|-------|
| Down Jeep | `public/images/68686675_2890293017652424_6952024628709556224_n.jpg` | 2048×1152 | 1.778 | 6.7% top/bottom | ~156 KB | Best candidate — mi 83.8, gravel road + jeep scene |
| leaving-chatham | `public/images/leaving-chatham-rock-river-rd.png` | 3236×2002 | 1.616 | 15.1% top/bottom | ~152 KB | PNG source, wider shot, road scene at mi 37.6 |
| ocbHm30 | `public/images/ocbHm30HWGIBDMhMARec4eQ86L5Bw_yNG1Sa1NtkfW0-2048x1536.jpg` | 2048×1536 | 1.333 | 30.0% top/bottom | ~264 KB | Heavy crop |
| LjGaTm47 | `public/images/LjGaTm477e8AIETL1O3YAf9TMDzETMuS6TVK0NB-bQ0-2048x1536.jpg` | 1600×1200 | 1.333 | 30.0% top/bottom | ~204 KB | Heavy crop |
| TDpZETSg | `public/images/TDpZETSgQkDKgX_TPqtqdfrgeXYng1foZ0Sg0wYU7MM-2048x1536.jpg` | 1600×1200 | 1.333 | 30.0% top/bottom | ~300 KB | Heavy crop; at size budget limit |

The planner should treat photo selection as Claude's discretion — the Down Jeep photo is the best technical fit and is already used in the site as a featured moment (mi 83.8). However, any route photo that produces a compelling gravel scene is acceptable; the requirement says "visually compelling when viewed as a link preview thumbnail."

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| ImageMagick `convert` | ImageMagick `magick` | v7 renamed the command; `convert` still works with deprecation warning |
| Static manual export | CLI one-liner | No tooling required; single reproducible command |

## Open Questions

1. **Which specific photo to use**
   - What we know: Down Jeep (68686675) is the best technical fit (6.7% crop vs 30% for 4:3 photos, 156 KB output)
   - What's unclear: The owner hasn't explicitly picked a preferred photo for the OG image; content judgment is needed
   - Recommendation: Let Claude decide at plan/execution time — Down Jeep is the default recommendation given minimal cropping and visual drama

2. **Text overlay vs. plain photo**
   - What we know: Best practice says keep text under 20-25% of image area; the requirement says "route photo" with no text mentioned
   - What's unclear: Whether adding event name/date text would help conversion
   - Recommendation: Plain photo only — the requirement is explicit ("uses a route photo"), and text overlay requires a more complex ImageMagick pipeline; keep it simple

## Sources

### Primary (HIGH confidence)
- ImageMagick 7.1.1-47 CLI — tested locally on this machine, all size/dimension outputs verified
- `sips` macOS tool — verified dimensions of all candidate source files
- Facebook Developer Docs (WebFetch verified) — minimum 200×200px, recommended 1200×630, max 8 MB
- Twitter/X Card docs (WebSearch + multi-source agreement) — recommended 1200×675, min 300×157, max 5 MB

### Secondary (MEDIUM confidence)
- og-image.org 2026 guide — confirms 1200×630 as universal standard; 1.91:1 aspect ratio
- Multiple 2026 social sharing guides — consistent agreement on 1200×630 JPEG for OG images

### Tertiary (LOW confidence)
- N/A — all critical claims verified via primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — ImageMagick installed and tested, command verified on this machine
- Architecture: HIGH — single static file, no code changes, Astro public/ directory behavior confirmed
- Pitfalls: HIGH — all pitfalls tested or verified against official docs
- Photo candidates: HIGH — all dimensions and sizes measured directly from source files

**Research date:** 2026-04-09
**Valid until:** 2026-06-01 (stable domain, no external dependencies)
