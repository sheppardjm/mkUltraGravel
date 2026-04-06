# Phase 48: Strava Infrastructure Removal - Research

**Researched:** 2026-04-06
**Domain:** File deletion, Astro component editing, package.json cleanup
**Confidence:** HIGH

## Summary

Phase 48 is a pure deletion/cleanup phase — no new code is introduced, no libraries are added. The research task is a complete inventory of every file and line that must be removed or edited, with explicit identification of every downstream reference that would cause a build failure if left dangling.

The codebase was audited in full. All files targeted for deletion are confirmed present. All import references to those files are identified. Critically, `results.astro` imports from `scoring.js` and reads from `public/data/results/athletes/` — both deletion targets — which means `results.astro` will produce a build error if those files are deleted without handling it. The phase scope explicitly does NOT delete `results.astro` (Phase 49 handles it), so the plan must account for this: `results.astro` must remain compilable after Phase 48 deletions, OR the planner must note that `results.astro` deletion is a dependency that should be tackled first in Phase 48 before deleting scoring.js.

**Primary recommendation:** Delete `results.astro` as the first task in Phase 48 (ahead of scoring.js), since it imports scoring.js and reads from the results athletes directory. Deleting scoring.js before results.astro would cause build failures.

## Standard Stack

### Core
No new libraries. This phase uses only existing toolchain:

| Tool | Purpose | Notes |
|------|---------|-------|
| git rm | Delete tracked files | Standard git deletion |
| Astro build | Verify no build errors after cleanup | `npm run build` |
| vitest | Test suite — will pass once scoring.test.js is deleted | `npm test` |

### Supporting
No additional tooling required.

### Alternatives Considered
N/A — this is pure deletion, no alternatives to consider.

**Installation:** None required.

## Architecture Patterns

### Recommended Deletion Order

Order matters because of import dependencies. Deleting a module before its importers causes build failures.

```
CORRECT ORDER:
1. results.astro          (imports scoring.js + reads results/athletes/)
2. submit.astro           (standalone, references /api/strava-auth paths)
3. submit-confirm.astro   (standalone, references /api/submit-result paths)
4. ScoringExplainer.astro (standalone component)
5. scoring.js             (now safe — results.astro already gone)
6. scoring.test.js        (imports scoring.js)
7. validate-results.mjs   (imports scoring.js from scripts/)
8. netlify/functions/strava-auth.js      (standalone)
9. netlify/functions/strava-callback.js  (standalone)
10. netlify/functions/submit-result.js   (standalone)
11. netlify/functions/strava-webhook.js  (standalone)
12. public/data/results/athletes/*.json  (directory tree)
13. public/data/results/schema.json
14. public/data/results/ directory
```

### Pattern 1: Remove Import + Usage Together
**What:** When deleting a component (`ScoringExplainer.astro`), simultaneously remove its import statement and usage in `index.astro`. Do not leave orphan imports.
**When to use:** Every component deletion.

### Pattern 2: Edit Before Delete for Inline References
**What:** `KomSegments.astro` is NOT deleted — only the KOM/QOM time display block is removed. Edit the file to delete the conditional block (lines 67-72), then verify the file still renders correctly.

### Pattern 3: Clean Companion Config References
**What:** After deleting `validate-results.mjs`, remove the `"validate"` script from `package.json`. After deleting all 4 Netlify Functions, remove or update the `netlify.toml` `[functions]` section and `functions = "netlify/functions"` build directive (phase spec says `/api/*` redirect is harmless no-op, so it's out of scope).

### Anti-Patterns to Avoid
- **Delete scoring.js before results.astro:** Build failure — results.astro imports scoring.js at build time.
- **Delete results/athletes/ before results.astro:** Build failure — results.astro reads the directory at build time (with `existsSync` guard, but the import of scoring.js fails first).
- **Leave orphan import in index.astro:** TypeScript/Astro will error on missing component import.
- **Leave `validate` script in package.json pointing to deleted file:** Confusing, though not a build failure. Clean it up.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Verifying deletion completeness | Custom grep scripts | `npm run build` | Astro build catches missing imports at compile time |
| Finding all references to deleted files | Manual review | Grep for import paths | Fast, exhaustive |

**Key insight:** `npm run build` is the authoritative verification for Phase 48. A clean build with no errors proves all import references to deleted files have been resolved.

## Common Pitfalls

### Pitfall 1: results.astro Build Failure if Deleted Last
**What goes wrong:** Deleting `scoring.js` before `results.astro` causes `npm run build` to fail with a module not found error on `../lib/scoring.js`.
**Why it happens:** `results.astro` has a top-level import `from "../lib/scoring.js"` — Astro processes this at build time, not runtime.
**How to avoid:** Delete `results.astro` first. Verify: it is NOT in the phase 49 preserve list (Phase 49 replaces it with a CTA page — but deletion here leaves the route unresolved until Phase 49. The planner must decide: delete results.astro in Phase 48 and leave /results as 404 temporarily, OR create a stub in Phase 48. The roadmap says Phase 49 handles results replacement, so deleting here and leaving 404 temporarily is acceptable — Phase 48 and 49 ship together in v10.0.)
**Warning signs:** Build error mentioning `scoring.js` or `../lib/scoring`.

### Pitfall 2: SiteNav Still Links to /submit After Deletion
**What goes wrong:** `SiteNav.astro` hardcodes `{ href: "/submit", label: "Submit" }` as a nav link. After deleting `submit.astro`, the Submit nav link will lead to a 404. This is cosmetically broken even though the build succeeds.
**Why it happens:** Phase 48 deletes the page but SiteNav.astro is not in the phase 48 requirements (it's Phase 49 scope per the roadmap: "update navigation"). However, a dangling Submit nav link on every page is functionally broken.
**How to avoid:** The planner should flag this. Phase 48 requirements (CLN-01) cover KomSegments only. SiteNav cleanup is Phase 49 scope. The two phases ship together, so this gap is acceptable but should be noted.
**Warning signs:** Submit nav link appearing on every page pointing to 404.

### Pitfall 3: "Powered by Strava" Attribution Left in index.astro
**What goes wrong:** After removing ScoringExplainer.astro and the submission infrastructure, `index.astro` line 308 still contains `Powered by <span class="text-[#FC5200] font-bold">Strava</span>`. This attribution exists because Strava requires it for apps using their API. With the OAuth flow removed, this attribution is no longer needed and may be confusing.
**Why it happens:** It's not in the phase 48 requirements as written. However, it's a residual Strava dependency.
**How to avoid:** The planner should decide: include removal of this line in Phase 48 as cleanup (it's in the same #sectors section where ScoringExplainer is being removed), or defer to Phase 49. Given CLN-01 already touches KomSegments.astro in the same section, it's natural to clean this up in Phase 48.

### Pitfall 4: netlify.toml Functions Directives Left Intact
**What goes wrong:** After deleting all 4 function files, `netlify.toml` still declares `functions = "netlify/functions"` and `[functions] node_bundler = "esbuild"`. Netlify will warn (or error) if the functions directory is missing/empty while declared. The phase spec says removing the `/api/*` redirect rule is out of scope, but the `[functions]` section and `functions = "netlify/functions"` build directive reference the now-empty directory.
**Why it happens:** Phase scope didn't explicitly list netlify.toml edits (only env var cleanup was called out of scope).
**How to avoid:** Remove `functions = "netlify/functions"` from `[build]` and remove the `[functions]` block. Leave the `[[redirects]]` `/api/*` rule as noted out of scope.

### Pitfall 5: Test Suite References Only File Being Deleted
**What goes wrong:** `scoring.test.js` is the only test file in the project (confirmed via glob). After deleting it, `npm test` runs vitest with no test files — vitest exits with a "no test files found" error by default.
**Why it happens:** Vitest's default behavior is to fail if no test files are found.
**How to avoid:** After deleting `scoring.test.js`, verify `npm test` behavior. The `vitest run` command may need `--passWithNoTests` added to the test script in `package.json`, OR the `test` script can be removed entirely since there are no remaining tests. The planner should decide which approach: removing the test script is cleanest for a static site with no remaining testable logic.

## Code Examples

### Lines to Delete from index.astro

```astro
// Remove import (line 20):
import ScoringExplainer from "../components/ScoringExplainer.astro";

// Remove usage (line 294):
<ScoringExplainer />

// Consider removing (line 308, same section):
<p class="text-text-muted text-xs mt-8 text-right">
  Powered by <span class="text-[#FC5200] font-bold">Strava</span>
</p>
```

### Lines to Delete from KomSegments.astro

```astro
// Remove KOM/QOM time display block (lines 67-72):
{(segment.komTime || segment.qomTime) && (
  <div class="mt-2 pt-2 border-t border-border text-xs text-text-muted space-y-0.5">
    {segment.komTime && <div>KOM <span class="text-accent-white">{segment.komTime}</span></div>}
    {segment.qomTime && <div>QOM <span class="text-accent-white">{segment.qomTime}</span></div>}
  </div>
)}
```

The TypeScript type on line 16-17 (`komTime?: string | null; qomTime?: string | null;`) can remain — unused type fields cause no errors. Or they can be cleaned up for tidiness.

### Lines to Delete from package.json

```json
// Remove the "validate" script:
"validate": "node scripts/validate-results.mjs"
```

### netlify.toml Changes (after functions deleted)

```toml
// Remove from [build]:
functions = "netlify/functions"

// Remove entire [functions] block:
[functions]
  node_bundler = "esbuild"
```

### vitest / test script resolution

```json
// Option A: Remove test script entirely (cleanest)
// Delete: "test": "vitest run"

// Option B: Add --passWithNoTests
"test": "vitest run --passWithNoTests"
```

## Complete File Inventory

### Files to Delete (10 files + 1 directory tree)

| File | Requirement | Notes |
|------|-------------|-------|
| `netlify/functions/strava-auth.js` | REM-01 | |
| `netlify/functions/strava-callback.js` | REM-01 | |
| `netlify/functions/submit-result.js` | REM-01 | |
| `netlify/functions/strava-webhook.js` | REM-01 | |
| `src/pages/submit.astro` | REM-02 | |
| `src/pages/submit-confirm.astro` | REM-02 | |
| `src/lib/scoring.js` | REM-03 | Has 2 importers: results.astro, validate-results.mjs |
| `src/lib/scoring.test.js` | REM-03 | Only test file in project |
| `src/components/ScoringExplainer.astro` | REM-04 | Imported in index.astro (line 20, used line 294) |
| `scripts/validate-results.mjs` | REM-05 | Referenced in package.json "validate" script |
| `public/data/results/` (full tree) | REM-06 | 20 athlete JSON files + schema.json |

Note: `src/pages/results.astro` is NOT in the phase 48 delete list per requirements, but it IMPORTS `scoring.js` and reads the `results/athletes/` directory. It must be deleted in Phase 48 before scoring.js is deleted (or the planner handles this dependency explicitly). Phase 49 will replace it with a CTA page.

### Files to Edit (3 files)

| File | Change | Requirement |
|------|--------|-------------|
| `src/components/KomSegments.astro` | Remove KOM/QOM time block (lines 67-72) | CLN-01 |
| `src/pages/index.astro` | Remove ScoringExplainer import (line 20) + usage (line 294) | REM-04 |
| `package.json` | Remove "validate" script | REM-05 (cleanup) |

### Files to Edit (Recommended, not explicitly required)

| File | Change | Rationale |
|------|--------|-----------|
| `netlify.toml` | Remove `functions = "netlify/functions"` and `[functions]` block | Empty functions dir declared in config may cause Netlify warnings |
| `src/pages/index.astro` | Remove "Powered by Strava" line 308 | Attribution no longer applicable without OAuth |
| `package.json` | Remove or update "test" script | vitest will error with no test files |

## Dependency Graph

```
results.astro
  → imports scoring.js          (must delete results.astro BEFORE scoring.js)
  → reads public/data/results/athletes/

validate-results.mjs
  → imports scoring.js          (must delete validate-results.mjs BEFORE scoring.js)
  → referenced by package.json "validate" script

scoring.test.js
  → imports scoring.js          (must delete scoring.test.js BEFORE or WITH scoring.js)

index.astro
  → imports ScoringExplainer.astro  (remove import + usage together)

package.json "validate" script
  → references validate-results.mjs  (remove script after deleting mjs)

netlify.toml
  → declares functions directory  (update after deleting function files)
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Full Strava OAuth + scoring pipeline | Static site, no Netlify Functions | Simpler build, no runtime dependencies, no env vars needed |

**Deprecated/outdated after this phase:**
- Netlify Functions v1 pattern: no longer needed
- CSRF cookie double-submit pattern: no longer needed
- GitHub API commit trigger for results: no longer needed

## Open Questions

1. **results.astro disposition in Phase 48**
   - What we know: Results.astro imports scoring.js (deletion target). It is not in Phase 48 requirements but its deletion is a prerequisite for deleting scoring.js.
   - What's unclear: Should it be deleted in Phase 48 (leaving /results as 404 temporarily until Phase 49 replaces it), or should Phase 49 be sequenced to replace it before Phase 48 deletes scoring.js?
   - Recommendation: Delete results.astro in Phase 48 (first task). The two phases ship together in v10.0 so a temporary 404 at /results between phases is acceptable. This is the simplest approach.

2. **vitest / test script after scoring.test.js deletion**
   - What we know: scoring.test.js is the only test file. Vitest exits non-zero with no test files by default.
   - What's unclear: Should the test script be removed or updated?
   - Recommendation: Remove the "test" script from package.json entirely. The site has no remaining testable logic that requires automated tests, and removing the script is honest about current state.

3. **"Powered by Strava" removal**
   - What we know: Required by Strava brand guidelines while using their API. With OAuth removed, the requirement no longer applies.
   - What's unclear: Whether the planner wants to include this in Phase 48 or Phase 49.
   - Recommendation: Include in Phase 48 in the same task that removes ScoringExplainer from index.astro (same file, nearby lines, same section).

4. **netlify/functions/ directory itself**
   - What we know: The phase success criterion says "directory empty or removed."
   - What's unclear: Leave the empty directory, or `git rm -r` it?
   - Recommendation: Remove the entire `netlify/functions/` directory (and `netlify/` if empty). Also update netlify.toml to remove the functions build directive.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all file contents verified via Read tool
- All import/reference chains traced via Grep tool

### Secondary (MEDIUM confidence)
- Vitest behavior with no test files: standard vitest behavior, no external verification needed for this deletion phase

## Metadata

**Confidence breakdown:**
- File inventory: HIGH — all files physically verified present
- Dependency graph: HIGH — all imports traced via grep
- Deletion order: HIGH — derived from verified import relationships
- Pitfalls: HIGH — derived from actual code, not hypothetical

**Research date:** 2026-04-06
**Valid until:** Phase execution (static codebase, won't change)
