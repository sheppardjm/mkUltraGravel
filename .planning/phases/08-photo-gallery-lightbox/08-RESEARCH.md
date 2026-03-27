# Phase 8: Photo Gallery + Lightbox — Research

**Researched:** 2026-03-26
**Domain:** Image optimization pipeline + CSS grid gallery + vanilla JS lightbox in Astro 6
**Confidence:** HIGH (all critical decisions verified against official docs or npm packages)

---

## Summary

Phase 8 has three distinct problems that must be solved independently: (1) generating WebP
thumbnails for 33 photos, (2) rendering them in a CSS grid with lazy loading, and (3) opening
full-size images in a keyboard-accessible lightbox.

The **image pipeline problem** is the most architectural. Astro's built-in `<Image />` component
cannot optimize images from `public/` — they are served as-is. Since the current pipeline copies
images to `public/images/` at prebuild time, the correct approach is to extend the existing
`generate-data.js` prebuild script to also generate WebP thumbnails using `sharp` (already
present in `node_modules` as an Astro peer dep, version 0.34.5). Thumbnails should be written
to `public/images/thumbs/` alongside the originals. No Astro image pipeline changes are needed.

The **lightbox problem** has a clear winner: **PhotoSwipe 5**. GLightbox has a documented
issue with Astro `<script>` tag npm imports (clicking images navigates away instead of opening
lightbox). PhotoSwipe 5 works correctly when imported in Astro script tags, has an active
community of Astro-specific blog posts and example repos, and supports programmatic data
sources (no HTML `data-` attributes required). It also exposes `--pswp-bg` and icon CSS
variables that can be overridden to match the dark brutalist design.

**Primary recommendation:** Generate WebP thumbnails via sharp in the prebuild script. Build
the gallery as a single `.astro` component that fetches `photos.json`, renders a CSS grid of
`<img>` tags pointing to `/images/thumbs/`, and initializes PhotoSwipe 5 in a `<script>` tag
wired to click handlers on each thumbnail.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sharp | 0.34.5 (already installed) | WebP thumbnail generation in prebuild script | Already in node_modules as Astro dep; fastest Node.js image processor; ~4-5x faster than ImageMagick |
| photoswipe | 5.4.4 (install required) | Full-screen lightbox viewer | Most-used Astro lightbox; verified npm import works in Astro script tags; programmatic data API; MIT |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| photoswipe/lightbox | (bundled with photoswipe) | Lazy-loads PhotoSwipe core on first open | Always use the lightbox module, not the bare PhotoSwipe constructor, for deferred loading |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| sharp in prebuild | Astro `<Image />` + import.meta.glob | Astro Image only optimizes images from `src/`; moving 33 photos to `src/assets/` and doing import.meta.glob would work but requires restructuring the data pipeline and loses the JSON-driven architecture |
| PhotoSwipe 5 | GLightbox 3.3.1 | GLightbox has a documented Astro script-tag npm import bug (issue #9298, closed as "not planned"); CDN workaround exists but adds external dependency |
| CSS native lazy loading (`loading="lazy"`) | IntersectionObserver custom script | Native lazy loading is supported in all modern browsers; simpler; no JS needed for this feature |

**Installation:**
```bash
npm install photoswipe
```

Note: sharp does not need installation — it is already in `node_modules/` as an Astro peer
dependency. However, it may need `--include=optional` if the native binary is missing:
```bash
npm install --include=optional sharp
```

---

## Architecture Patterns

### Recommended Project Structure

```
scripts/
├── generate-data.js          # Existing coordinator — add thumbnail step here
├── generate-thumbnails.js    # New: sharp thumbnail generator, called by generate-data.js
src/
└── components/
    └── PhotoGallery.astro    # New: grid + lightbox wiring
public/
└── images/
    ├── *.jpg                 # Existing full-size originals (already copied)
    └── thumbs/
        └── *.webp            # New: generated WebP thumbnails
```

### Pattern 1: Sharp Thumbnail Generation in Prebuild

**What:** A new `scripts/generate-thumbnails.js` reads `public/images/*.jpg`, skips already-generated
WebP thumbs (idempotent), resizes to 600px wide (covers 4-column grid cells at 2x retina),
converts to WebP at quality 75, writes to `public/images/thumbs/`.

**When to use:** Runs as part of the existing prebuild pipeline. Called from `generate-data.js`
after the image copy step.

**Example:**
```javascript
// Source: https://sharp.pixelplumbing.com/api-output/
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const THUMB_WIDTH = 600;
const THUMB_QUALITY = 75;

async function generateThumbnails(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const files = fs.readdirSync(srcDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  for (const filename of files) {
    const thumbName = path.parse(filename).name + '.webp';
    const destPath = path.join(destDir, thumbName);
    if (fs.existsSync(destPath)) continue; // idempotent
    await sharp(path.join(srcDir, filename))
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: THUMB_QUALITY, effort: 4 })
      .toFile(destPath);
  }
}
```

**Width choice rationale:** Most source images are 1200px wide (portrait 1200×1600). A 600px
WebP thumbnail is sufficient for 4-column grid cells up to ~150px-300px display width at 2x
DPR. At quality 75, expected file size is ~20–40KB per thumbnail vs. ~380KB original JPEG.

### Pattern 2: PhotoGallery.astro Component

**What:** Fetches `photos.json` at build time (Astro frontmatter), renders grid of thumbnail
`<img>` tags, initializes PhotoSwipe in a `<script>` tag, wires click handlers.

**When to use:** Drop this component into the `#photos` section of `index.astro`.

**Example (Astro frontmatter + template):**
```astro
---
// Source: https://photoswipe.com/data-sources/
const photos = await fetch('/data/photos.json')
  // NOTE: In Astro frontmatter, use fs.readFileSync instead:
import photos from '../../public/data/photos.json';
---

<div id="photo-gallery" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
  {photos.map((photo, i) => (
    <button
      type="button"
      class="gallery-item aspect-[3/4] overflow-hidden cursor-pointer"
      data-index={i}
      data-src={`/images/${photo.filename}`}
      data-w="1200"
      data-h="1600"
    >
      <img
        src={`/images/thumbs/${photo.filename.replace(/\.(jpg|jpeg|png)$/i, '.webp')}`}
        alt={`Route photo at mile ${photo.mi}`}
        loading="lazy"
        decoding="async"
        class="w-full h-full object-cover"
      />
    </button>
  ))}
</div>
```

**Dimension handling:** Source images are mostly 1200×1600 (portrait) or 1200×1599. Four
landscape images are 1600×1200. PhotoSwipe requires dimensions for layout. The safe approach
is to store actual width/height in photos.json (added by the thumbnail script), or use
conditional logic based on known orientations.

**Alternative dimension strategy:** During thumbnail generation, record actual dimensions in a
sidecar JSON (e.g. `public/data/photo-dims.json`) that the gallery component can read.

### Pattern 3: PhotoSwipe Initialization in Astro Script Tag

**What:** Import PhotoSwipe in a `<script>` tag (Astro bundles this via Vite), build the
dataSource array from button `data-*` attributes, open at clicked index.

**When to use:** PhotoSwipe npm import works correctly in Astro `<script>` tags — verified by
multiple Astro community examples (launchfa.st, dev.to/petrovicz, scottaw66/astro-photoswipe).

**Example:**
```javascript
// Source: https://photoswipe.com/data-sources/ + https://dev.to/petrovicz/astro-photoswipe-549a
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';

function initGallery() {
  const gallery = document.getElementById('photo-gallery');
  if (!gallery) return;

  const items = Array.from(gallery.querySelectorAll('.gallery-item')).map(el => ({
    src: el.dataset.src,
    width: parseInt(el.dataset.w),
    height: parseInt(el.dataset.h),
    alt: el.querySelector('img')?.alt || '',
  }));

  const lightbox = new PhotoSwipeLightbox({
    dataSource: items,
    pswpModule: () => import('photoswipe'),
    // Keyboard: Escape closes by default (escKey: true)
    // Click outside: bgClickAction: 'close' (default)
  });
  lightbox.init();

  gallery.querySelectorAll('.gallery-item').forEach((el, index) => {
    el.addEventListener('click', () => lightbox.loadAndOpen(index));
  });
}

// Re-initialize on Astro page navigation (View Transitions compatibility)
document.addEventListener('astro:page-load', initGallery);
```

**Note on CSS import:** The `import 'photoswipe/style.css'` in the `<script>` tag works in
Astro because Vite handles CSS imports from JS. Alternatively, import the CSS in the Astro
component frontmatter to avoid potential deployment issues (documented pitfall).

### Pattern 4: Dark Theme Override for PhotoSwipe

**What:** Override PhotoSwipe's CSS variables to match the dark brutalist palette.

**Example (in global.css or component `<style>`):**
```css
.pswp {
  --pswp-bg: oklch(0.10 0.01 250);         /* matches --color-bg-base */
  --pswp-icon-color: oklch(0.85 0.01 90);  /* matches --color-accent-white */
  --pswp-icon-color-secondary: oklch(0.55 0.01 90); /* matches --color-text-muted */
}
```

### Anti-Patterns to Avoid

- **Trying to use Astro's `<Image />` component for public/ images:** It will not optimize them. The component will render without transformation.
- **Using GLightbox from npm in an Astro `<script>` tag:** Known bug (issue #9298) — images navigate the page instead of opening lightbox. CDN workaround exists but is undesirable.
- **Mixing `import.meta.glob` with a JSON manifest:** `import.meta.glob` works for images in `src/assets/`, but this project's images live in `public/` (copied from `images/` at prebuild). Restructuring to use `src/assets/` would require re-architecting the prebuild pipeline.
- **Not persisting thumbnail dimensions:** PhotoSwipe requires explicit width/height. If dimensions are wrong, the lightbox layout breaks. Record actual post-resize dimensions during thumbnail generation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebP conversion | Custom canvas or ffmpeg pipeline | sharp | Native libvips bindings, already installed, ~4x faster than alternatives |
| Lightbox keyboard navigation | Custom Escape/arrow key handlers | PhotoSwipe 5 (built-in) | Handles Escape, arrow keys, touch swipe, focus trap — dozens of edge cases |
| Click-outside dismiss | Custom overlay click detection | PhotoSwipe 5 `bgClickAction: 'close'` (default) | Z-index and event propagation edge cases in lightboxes are notoriously tricky |
| Image lazy loading | IntersectionObserver custom wrapper | Native `loading="lazy"` attribute | Full browser support; zero JS; PhotoSwipe handles full-size image loading separately |
| Responsive grid column breakpoints | Custom JS | Tailwind CSS grid utilities | Already in the design system; `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` |

**Key insight:** The lightbox problem looks simpler than it is — focus trapping, scroll lock,
keyboard navigation, touch support, and proper ARIA roles require hundreds of lines of correct
code. PhotoSwipe 5 has 5 years of battle-testing on mobile.

---

## Common Pitfalls

### Pitfall 1: sharp Binary Not Loaded Correctly

**What goes wrong:** sharp is in `node_modules/` as an Astro peer dep, but the native binary
may not be present for the current platform/arch (darwin-x64 vs darwin-arm64). `require('sharp')`
throws a load error.

**Why it happens:** Sharp uses native binaries installed per-platform. The existing `node_modules/sharp`
may have been installed on a different architecture.

**How to avoid:** Run `npm install --include=optional sharp` to install the current-platform binary.
Alternatively, add `sharp` as an explicit devDependency in `package.json` so it's always
installed for the local platform.

**Warning signs:** `Error: Could not load the "sharp" module using the darwin-x64 runtime` — already
observed in this project.

### Pitfall 2: Thumbnails Generated Without Correct Dimensions Stored

**What goes wrong:** PhotoSwipe requires width/height per image. If the gallery component
hard-codes `data-w="1200" data-h="1600"` for all images, the 4 landscape images (1600×1200)
will display with incorrect aspect ratio in the lightbox.

**Why it happens:** Most images are portrait, but 4 are landscape. The filename pattern
`*-1536x2048` suggests original export dimensions, not actual stored dimensions (real stored
dimension is 1200×1600).

**How to avoid:** During thumbnail generation, use sharp's metadata to record actual dimensions.
Write a `public/data/photo-dims.json` or add `width`/`height` fields to the existing
`photos.json` output. The PhotoGallery component can then use per-image accurate dimensions.

**Warning signs:** Lightbox images appear stretched or cropped incorrectly; landscape photos
show as portrait.

### Pitfall 3: CSS Import in Script Tag Fails on Deployment

**What goes wrong:** `import 'photoswipe/style.css'` inside `<script>` tag works locally but
fails in some deployment environments (documented in Astro GitHub issue #11035).

**Why it happens:** Vite handles CSS imports from JS in development, but some deployment
adapters or static build configurations may not process the CSS import correctly.

**How to avoid:** Move the CSS import to the Astro component's frontmatter:
```astro
---
import 'photoswipe/style.css';
---
```
This is the approach used in the petrovicz/astro-photoswipe reference implementation.

**Warning signs:** Lightbox has no styling in production; works locally but not deployed.

### Pitfall 4: Thumbnail Cache Invalidation

**What goes wrong:** When source images change, WebP thumbnails in `public/images/thumbs/` are
not regenerated because the idempotent check skips existing files.

**Why it happens:** The `if (fs.existsSync(destPath)) continue` pattern is correct for CI
performance but breaks when source images are replaced in-place with new files.

**How to avoid:** For production builds, either delete `public/images/thumbs/` before running
prebuild, or compare source mtime against thumbnail mtime before skipping. Since this is a
static event site with a curated set of 33 photos unlikely to change, the current approach is
acceptable — document the manual steps to force regen (`rm -rf public/images/thumbs/`).

### Pitfall 5: PhotoSwipe CSS Specificity with Tailwind v4

**What goes wrong:** Tailwind v4 CSS-first configuration may conflict with PhotoSwipe's
bundled styles due to layer ordering. PhotoSwipe uses its own CSS without `@layer` declarations.

**Why it happens:** This project already has a `@layer leaflet, base, components, utilities`
declaration that orders layers. PhotoSwipe CSS imported without a layer declaration may land
at an unpredictable specificity level.

**How to avoid:** Wrap the PhotoSwipe CSS import in a layer or add an `@import` with `layer()`:
```css
@import "photoswipe/style.css" layer(photoswipe);
```
Declare `photoswipe` in the layer order at the top of `global.css`:
```css
@layer leaflet, photoswipe, base, components, utilities;
```

---

## Code Examples

Verified patterns from official sources and community implementations:

### Thumbnail Generation with Sharp

```javascript
// Source: https://sharp.pixelplumbing.com/api-output/
const sharp = require('sharp');

// Portrait thumbnail (most images are 1200×1600 → resize to width 600)
const { width, height } = await sharp(srcPath).metadata();
const thumbPath = destDir + '/' + baseName + '.webp';

await sharp(srcPath)
  .resize({ width: 600, withoutEnlargement: true })
  .webp({ quality: 75, effort: 4 })
  .toFile(thumbPath);

// Record actual output dimensions for PhotoSwipe:
const thumbMeta = await sharp(thumbPath).metadata();
// Store { filename, width: thumbMeta.width, height: thumbMeta.height }
```

### PhotoSwipe Initialization (Astro Pattern)

```javascript
// Source: https://dev.to/petrovicz/astro-photoswipe-549a
// In <script> tag of PhotoGallery.astro
import PhotoSwipeLightbox from 'photoswipe/lightbox';

function initGallery() {
  const gallery = document.getElementById('photo-gallery');
  if (!gallery) return;

  const items = Array.from(gallery.querySelectorAll('[data-src]')).map(el => ({
    src: el.dataset.src,
    width: parseInt(el.dataset.w, 10),
    height: parseInt(el.dataset.h, 10),
    alt: el.dataset.alt || '',
  }));

  const lightbox = new PhotoSwipeLightbox({
    dataSource: items,
    pswpModule: () => import('photoswipe'),
    bgOpacity: 0.95,
    // escKey: true (default) — Escape closes
    // bgClickAction: 'close' (default) — click outside closes
  });
  lightbox.init();

  gallery.querySelectorAll('[data-src]').forEach((el, i) => {
    el.addEventListener('click', () => lightbox.loadAndOpen(i));
  });
}

document.addEventListener('astro:page-load', initGallery);
```

### PhotoSwipe CSS Import in Frontmatter (Safer Pattern)

```astro
---
// Source: Documented fix for Astro deployment issue #11035
// petrovicz/astro-photoswipe reference: "Moving the stylesheet import from
// the script tag to the frontmatter resolved deployment issues"
import 'photoswipe/style.css';
// ... rest of frontmatter
---
```

### Dark Theme Override

```css
/* Source: https://photoswipe.com/styling/ */
.pswp {
  --pswp-bg: oklch(0.10 0.01 250);
  --pswp-icon-color: oklch(0.85 0.01 90);
  --pswp-icon-color-secondary: oklch(0.55 0.01 90);
}
```

### Thumbnail File Path Derivation

```javascript
// Source: project convention (generate-data.js pattern)
// Given photo.filename = "abc-1536x2048.jpg"
// Thumbnail lives at: /images/thumbs/abc-1536x2048.webp
const thumbSrc = `/images/thumbs/${photo.filename.replace(/\.(jpg|jpeg|png)$/i, '.webp')}`;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| GLightbox (jQuery-era lightboxes) | PhotoSwipe 5 (ES modules, no jQuery) | PhotoSwipe 5: 2021 | Modern bundle format, tree-shaking, works with Vite/Astro script tags |
| Astro 2.x `@astrojs/image` integration | `astro:assets` built-in (no integration) | Astro 3.0 (2023) | Image optimization is now core Astro, not a separate package |
| `<img loading="lazy">` + polyfill | Native browser lazy loading | Chrome 76 (2019) | Zero-JS lazy loading; full support in all modern browsers |
| ImageMagick/GraphicsMagick CLI | sharp (Node-native libvips) | ~2016 | 4-5x faster; Node-native; no CLI subprocess |

**Deprecated/outdated:**
- `@astrojs/image` package: Removed in Astro 3.0; replaced by `astro:assets` built-in. Do not install.
- `photoswipe@4`: Major API differences from v5; no ES modules; do not use.
- `GLightbox` npm import in Astro: Has a documented bug in Astro `<script>` tags (issue #9298, closed "not planned"). Use CDN if GLightbox is required for other reasons, but PhotoSwipe 5 is preferred.

---

## Open Questions

1. **Sharp binary availability in CI/deployment**
   - What we know: sharp is in node_modules but native binary may be missing for darwin-x64 (observed error). Works after `npm install --include=optional sharp`.
   - What's unclear: Whether the project is ever built in CI (no CI config found). If yes, the CI platform architecture must match the binary.
   - Recommendation: Add `sharp` as an explicit `devDependency` in `package.json` to ensure it's installed. This also makes the dependency explicit rather than relying on Astro's transitive dep.

2. **Where to store per-image dimensions for PhotoSwipe**
   - What we know: PhotoSwipe requires `width` and `height` per image. Source images are mostly 1200×1600 (portrait) or 1200×1599, but 4 are landscape (1600×1200) and 1 is unusual (1133×816). Thumbnails will be resized to 600px wide, so height varies.
   - What's unclear: Should dimensions be stored in `photos.json` (extending the existing schema), in a separate `photo-dims.json`, or derived inline from the thumbnail filenames.
   - Recommendation: Extend `photos.json` to include `width` and `height` fields (actual full-size image dimensions, not thumbnail dimensions). The thumbnail script reads original dimensions via `sharp().metadata()` and writes them. The gallery component reads from `photos.json`. This keeps all photo metadata in one place.

3. **Photo captions/alt text content**
   - What we know: `photos.json` only has `filename`, `lat`, `lon`, `mi`, `source`. No caption or alt text.
   - What's unclear: Should the lightbox show mile-marker text as a caption? What should `alt` text be for accessibility?
   - Recommendation: Use `"Route photo at mile ${photo.mi}"` as alt text. No lightbox captions needed for this phase — the requirement (VIS-02) only requires full-size display, not captions.

---

## Sources

### Primary (HIGH confidence)
- `https://docs.astro.build/en/guides/images/` — Astro image optimization, public/ constraint
- `https://docs.astro.build/en/reference/modules/astro-assets/` — `getImage()` API, parameters
- `https://docs.astro.build/en/recipes/dynamically-importing-images/` — import.meta.glob pattern
- `https://sharp.pixelplumbing.com/api-output/` — webp() and resize() API, options
- `https://photoswipe.com/getting-started/` — PhotoSwipe 5.4.4 install and initialization
- `https://photoswipe.com/data-sources/` — programmatic dataSource pattern, loadAndOpen(index)
- `https://photoswipe.com/styling/` — CSS variables: --pswp-bg, --pswp-icon-color
- `npm show photoswipe version` → 5.4.4 (verified live)
- `npm show glightbox version` → 3.3.1 (verified live)

### Secondary (MEDIUM confidence)
- `https://dev.to/petrovicz/astro-photoswipe-549a` — Astro-specific initialization pattern, CSS import in frontmatter fix, ViewTransitions handling
- `https://www.launchfa.st/blog/photoswipe-astro` — data attributes pattern, astro:page-load listener
- `https://github.com/biati-digital/glightbox` — GLightbox API reference (Escape key, click-outside defaults)

### Tertiary (LOW confidence)
- `https://github.com/withastro/astro/issues/9298` — GLightbox npm import bug in Astro script tags (closed "not planned"; may be fixed or workaround-dependent)
- `https://github.com/withastro/astro/issues/11035` — PhotoSwipe CSS import in script tag fails on deployment (deployment-specific; unclear scope)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — sharp is already installed; PhotoSwipe 5.4.4 verified current; npm imports confirmed working in Astro script tags by multiple community sources
- Architecture: HIGH — sharp API verified from official docs; PhotoSwipe programmatic API verified from official data sources docs; thumbnail-in-prebuild pattern matches existing generate-data.js architecture
- Pitfalls: MEDIUM — sharp binary issue observed directly; GLightbox bug verified from GitHub; CSS import issue is MEDIUM (deployment-specific, not universally reproducible)

**Research date:** 2026-03-26
**Valid until:** 2026-04-25 (30 days — stable stack, unlikely to change)
