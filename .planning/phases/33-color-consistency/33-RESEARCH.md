# Phase 33: Color Consistency - Research

**Researched:** 2026-03-30
**Domain:** Astro shared module / TypeScript constant extraction
**Confidence:** HIGH

## Summary

Phase 33 is a pure DRY refactoring with no new dependencies required. The `starColors` object is defined three times with identical values across `GravelSectors.astro` (frontmatter/SSR), `RouteMap.astro` (browser `<script>`), and `ElevationProfile.astro` (browser `<script>`). All three definitions are already byte-for-byte consistent in their hex values, so this phase is about preventing future drift, not fixing a current visual bug.

The key architectural challenge is that the three consumers live in two different execution contexts: `GravelSectors.astro` uses its definition at **build time** (Astro frontmatter, Node.js), while `RouteMap.astro` and `ElevationProfile.astro` use theirs at **runtime** (browser `<script>` tags, dynamically imported). A single shared module must work in both contexts.

The project already has a precedent for this pattern: `src/lib/scoring.js` is a plain ES module used in both Node/server and browser contexts. The same approach applies here — create `src/lib/starColors.ts` (or `.js`), export the constant, and import it in both frontmatter and `<script>` blocks.

**Primary recommendation:** Create `src/lib/starColors.ts` as a single-source-of-truth ES module. Import it in `GravelSectors.astro` frontmatter with `import` syntax, and reference it in `RouteMap.astro` and `ElevationProfile.astro` browser scripts using the same `import` syntax (Astro/Vite bundles `<script>` imports correctly).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Astro | ^6.1.1 (installed) | Framework for all components | Already in use |
| TypeScript | via `astro/tsconfigs/strict` | Typing the shared module | Already enforced |
| Vite | ^7 (via override) | Bundles `<script>` imports | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None needed | — | No new dependencies required | This is a constant extraction |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `src/lib/starColors.ts` | Inline CSS custom properties in `global.css` | CSS vars can't be read by Leaflet/Chart.js JS without `getComputedStyle()` — avoids the problem |
| `.ts` extension | `.js` extension | Both work. `.ts` matches the type annotation already on the constant (`Record<number, string>`) |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── scoring.js          # existing shared module (precedent)
│   └── starColors.ts       # NEW: single source of truth for star colors
├── components/
│   ├── GravelSectors.astro # frontmatter import (SSR)
│   ├── RouteMap.astro      # <script> import (browser)
│   └── ElevationProfile.astro  # <script> import (browser)
```

### Pattern 1: Astro Frontmatter Import (SSR/build-time)
**What:** Import a `.ts` lib file in the `---` frontmatter block — Astro processes it at build time via Vite.
**When to use:** When the component renders values into static HTML (as `GravelSectors.astro` does with `style={...}`)
**Example:**
```typescript
// GravelSectors.astro frontmatter
---
import { starColors } from '../lib/starColors';
// starColors[sector.stars] is now available in the template
---
```

### Pattern 2: Browser `<script>` Import (runtime)
**What:** Import from `src/lib/` inside a `<script>` tag in an Astro component — Vite bundles the import into the client-side JS bundle.
**When to use:** When JS runs in the browser (as RouteMap and ElevationProfile do — they use dynamic `import()` for Leaflet/Chart.js but can use static imports for pure constants)
**Example:**
```typescript
// RouteMap.astro <script>
import { starColors } from '../lib/starColors';
// starColors is available throughout the script
```

**Important note on path resolution:** Astro `<script>` tags resolve imports relative to the component file, same as regular TypeScript. `../lib/starColors` from `src/components/RouteMap.astro` resolves correctly to `src/lib/starColors.ts`.

### Pattern 3: The Shared Module Shape
**What:** The module exports a typed constant. No default export — named export matches the existing variable name to minimize diffs.
**Example:**
```typescript
// src/lib/starColors.ts
/**
 * starColors — single source of truth for gravel sector star-rating colors.
 * Used by: GravelSectors.astro (SSR), RouteMap.astro (browser), ElevationProfile.astro (browser)
 */
export const starColors: Record<number, string> = {
  1: '#f0c040',   // yellow — light gravel
  2: '#e8962a',   // gold-orange — moderate
  3: '#d9641e',   // burnt orange — getting rough
  4: '#c93a18',   // red-orange — hard
  5: '#b71c1c'    // deep red — brutal
};
```

### Anti-Patterns to Avoid
- **Default export only:** Using `export default` forces renaming at import site, breaking the existing `starColors[...]` reference pattern. Named export is cleaner.
- **Defining colors in CSS custom properties and reading them with JS:** `getComputedStyle(document.body).getPropertyValue('--color-star-1')` works but adds runtime DOM dependency. The constant approach is simpler and already established.
- **Inlining colors in `annotations.json`:** The data layer should stay data; presentation colors belong in a lib module.
- **Path alias not configured:** `tsconfig.json` extends `astro/tsconfigs/strict` with no custom paths. Use relative paths (`../lib/starColors`) — they work without any config changes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color token system | CSS-in-JS, design tokens library | Plain `.ts` constant | Massive overkill for 5 colors |
| Type-safe color map | Custom generic type | `Record<number, string>` | Already in use, sufficient |

**Key insight:** This is a constant extraction, not a color system. The smallest correct solution is a single exported object.

## Common Pitfalls

### Pitfall 1: Script-tag Import Path Resolution
**What goes wrong:** Import in `<script>` resolves from the wrong base directory.
**Why it happens:** Developers sometimes assume `<script>` paths are relative to the project root rather than the component file.
**How to avoid:** Use `../lib/starColors` (relative to `src/components/`), same as a regular `.ts` import. Vite/Astro handles this correctly.
**Warning signs:** Build error "Cannot find module" or TypeScript error on the import line.

### Pitfall 2: Forgetting the `|| '#ffffff'` Fallback
**What goes wrong:** RouteMap uses `starColors[sector.stars] || '#ffffff'` as a fallback for unexpected star values. GravelSectors and ElevationProfile do not include the fallback.
**Why it happens:** The fallback was added defensively in RouteMap but not propagated.
**How to avoid:** The shared module doesn't need to include the fallback — the fallback is a usage concern. Each consumer can keep its own fallback pattern. The module is just the canonical color map.
**Warning signs:** White polylines on map for sectors with star ratings outside 1–5.

### Pitfall 3: Astro `<script>` vs Dynamic `import()`
**What goes wrong:** Mixing static `import` at top of script with the dynamic `import()` calls for Leaflet/Chart.js causes confusion about when the module is available.
**Why it happens:** RouteMap and ElevationProfile use dynamic imports for heavy libraries. `starColors` is a tiny constant and doesn't need to be dynamic.
**How to avoid:** Static `import { starColors } from '../lib/starColors'` at the top of the `<script>` tag works fine alongside dynamic imports inside `initMap()` / `initElevation()`. Vite bundles the static import at build time.

### Pitfall 4: GravelSectors Quote Style Mismatch
**What goes wrong:** `GravelSectors.astro` currently uses double quotes for hex values (`"#f0c040"`) while `RouteMap.astro` and `ElevationProfile.astro` use single quotes. The shared module should pick one.
**Why it happens:** Inconsistent authoring across files.
**How to avoid:** The shared module sets the canonical style. Single quotes are used in the two `<script>` files and are idiomatic TypeScript; use single quotes in the module. GravelSectors's import will receive single-quoted strings at runtime regardless — the template interpolation doesn't care.

## Code Examples

### The Complete Shared Module
```typescript
// Source: project convention, matches src/lib/scoring.js pattern
// src/lib/starColors.ts

/**
 * starColors — single source of truth for gravel sector star-rating colors.
 *
 * Used by:
 *   - GravelSectors.astro (SSR / build-time, frontmatter import)
 *   - RouteMap.astro (browser / runtime, <script> import)
 *   - ElevationProfile.astro (browser / runtime, <script> import)
 */
export const starColors: Record<number, string> = {
  1: '#f0c040',   // yellow — light gravel
  2: '#e8962a',   // gold-orange — moderate
  3: '#d9641e',   // burnt orange — getting rough
  4: '#c93a18',   // red-orange — hard
  5: '#b71c1c'    // deep red — brutal
};
```

### GravelSectors.astro: Replace Inline Definition
```typescript
// Before (lines 16-22):
const starColors: Record<number, string> = {
  1: "#f0c040",
  2: "#e8962a",
  3: "#d9641e",
  4: "#c93a18",
  5: "#b71c1c",
};

// After:
import { starColors } from '../lib/starColors';
```

### RouteMap.astro: Replace Inline Definition
```typescript
// Before (lines 129-135 inside <script>):
const starColors: Record<number, string> = {
  1: '#f0c040',
  ...
};

// After (top of <script> tag, before initMap function):
import { starColors } from '../lib/starColors';
```

### ElevationProfile.astro: Replace Inline Definition
```typescript
// Before (lines 58-65 inside initElevation()):
const starColors: Record<number, string> = {
  1: '#f0c040',
  ...
};

// After (top of <script> tag, before initElevation function):
import { starColors } from '../lib/starColors';
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Colors duplicated in 3 files | Single shared module | This phase | Future color changes require editing 1 file instead of 3 |

**No deprecated patterns here** — this is a straightforward constant extraction using project-native patterns already established by `src/lib/scoring.js`.

## Open Questions

1. **Move `starColors` out of `initMap()` and `initElevation()` or leave it inside?**
   - What we know: In `ElevationProfile.astro`, `starColors` is declared inside `initElevation()`. In `RouteMap.astro` it's declared inside `initMap()`. With a module import, it can move to the top-level `<script>` scope.
   - What's unclear: No functional difference either way. Moving it to top-level `<script>` scope is cleaner since it's no longer a local variable.
   - Recommendation: Move the import to the top of the `<script>` block (top-level scope), since it's now a module import, not a local constant.

2. **Should the module also export a `fallbackColor` constant?**
   - What we know: RouteMap uses `starColors[sector.stars] || '#ffffff'` in multiple places. The `#ffffff` is hardcoded.
   - What's unclear: Whether this warrants extraction.
   - Recommendation: Keep the fallback inline at each usage — it's a single value and doesn't affect visual consistency. Only the 5 star-rating colors need to be canonical.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of `src/components/GravelSectors.astro`, `RouteMap.astro`, `ElevationProfile.astro` — exact color values and usage patterns confirmed
- `src/lib/scoring.js` — precedent for shared lib modules in this project
- `package.json` — tech stack (Astro 6, Vite 7, TypeScript via strict tsconfig)
- `astro.config.mjs` — no path aliases configured; relative imports required

### Secondary (MEDIUM confidence)
- None required — this is a pure refactoring with no new technology

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified by direct inspection; no new dependencies needed
- Architecture: HIGH — `src/lib/scoring.js` is exact precedent for this pattern
- Pitfalls: HIGH — all pitfalls identified from direct code inspection, not speculation

**Research date:** 2026-03-30
**Valid until:** Stable indefinitely (pure refactoring, no external dependencies)
