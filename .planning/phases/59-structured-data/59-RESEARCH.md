# Phase 59: Structured Data - Research

**Researched:** 2026-04-10
**Domain:** JSON-LD SportsEvent schema / Astro static site SEO
**Confidence:** HIGH

## Summary

This phase adds a JSON-LD `SportsEvent` script block to the homepage so search engines can parse the event as structured data. The implementation is pure static markup — no library required. Astro's `set:html` directive is the established, officially-confirmed pattern for injecting a stringified JSON object into a `<script type="application/ld+json">` tag. The schema object is built in the component frontmatter and rendered once inside `<head>`.

The key implementation decision is **where to place the schema**: the simplest and most idiomatic approach is to add the script block directly in `BaseLayout.astro`, since the schema is homepage-global and does not vary per-page for this site. This keeps the work self-contained in one file edit. An alternative (dedicated `SportsEventSchema.astro` component) is slightly more organized but adds unnecessary indirection for a single static schema.

**Primary recommendation:** Add the JSON-LD `<script>` block directly in `BaseLayout.astro`'s `<head>`, built from a `const` in the frontmatter, using `set:html={JSON.stringify(structuredData)}`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native JSON-LD | N/A | Structured data embedding | No library needed for static single-schema |
| Astro `set:html` | Built-in | Safely injects raw JSON string without HTML escaping | Officially endorsed Astro pattern |

### Supporting (Optional — not required for this phase)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `astro-seo-schema` | 6.0.0 | `<Schema>` component wrapping `schema-dts` typed objects | Useful if site will grow to 5+ schema types; overkill for one static schema |
| `schema-dts` | current | TypeScript types for Schema.org | Peer dep of `astro-seo-schema`; adds TS safety but not needed for static JSON-LD |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline in BaseLayout | `astro-seo-schema` component | Unnecessary complexity; adds two npm deps; no benefit for a single static schema |
| Inline in BaseLayout | Named slot injection from index.astro | Cleanly separates homepage-only schema from layout, but schema IS homepage-global here |

**Installation:** None required. Native Astro patterns suffice.

---

## Architecture Patterns

### Recommended Project Structure

No new files or folders needed. The single edit is:

```
src/
└── layouts/
    └── BaseLayout.astro   ← add JSON-LD <script> block in <head>
```

### Pattern 1: Inline JSON-LD in Astro Layout Head

**What:** Build schema as a plain JS object in Astro frontmatter, stringify it with `JSON.stringify`, inject via `set:html` into a `<script type="application/ld+json">` tag in `<head>`.

**When to use:** Single static schema that applies to all pages (or the only page that matters).

**Example:**
```astro
---
// Source: https://stephen-lunt.dev/blog/astro-structured-data/
// Confirmed by Astro GitHub issue #3544 (set:html is the official pattern)
const structuredData = {
  "@context": "https://schema.org",
  "@type": "SportsEvent",
  "name": "MK Ultra Gravel",
  "startDate": "2026-06-07T09:00:00-04:00",
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "location": {
    "@type": "Place",
    "name": "Marquette Fire Bell",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Marquette",
      "addressRegion": "MI",
      "addressCountry": "US"
    }
  },
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock",
    "url": "https://mkultragravel.com"
  },
  "organizer": {
    "@type": "Organization",
    "name": "MK Ultra Gravel",
    "url": "https://mkultragravel.com"
  },
  "url": "https://mkultragravel.com"
};
---

<script type="application/ld+json" set:html={JSON.stringify(structuredData)} />
```

### Pattern 2: Use `Astro.site` for URL values

**What:** Derive the site URL from `Astro.site` (already configured in `astro.config.mjs` as `"https://mkultragravel.com"`) rather than hardcoding strings.

**When to use:** Whenever you reference the site's own URL — makes the schema portable if domain changes.

**Example:**
```astro
---
const siteUrl = Astro.site?.toString().replace(/\/$/, '') ?? 'https://mkultragravel.com';
const structuredData = {
  // ...
  "url": siteUrl,
  "organizer": { "@type": "Organization", "name": "MK Ultra Gravel", "url": siteUrl }
};
---
```

### Anti-Patterns to Avoid

- **Using `define:vars` instead of `set:html`:** Produces malformed output with variable declaration wrappers. `set:html` is the only correct Astro pattern. (Confirmed via GitHub issue #3544.)
- **Putting JSON-LD in `<body>`:** Must be in `<head>` for Google validation and best-practice compliance.
- **Escaping JSON manually:** Never manually escape — `JSON.stringify` handles it. `set:html` prevents Astro from double-escaping.
- **Using a string template literal:** `<script type="application/ld+json">{"@context": "..."}</script>` fails because Astro HTML-escapes `{` / `}` in template expressions without `set:html`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON serialization | Custom string builder | `JSON.stringify(obj)` | Handles all edge cases (quotes, unicode, special chars) |
| Schema type safety | Manual validation | `schema-dts` (if you use `astro-seo-schema`) | Catches typos in property names at build time |

**Key insight:** This is one of the simplest SEO tasks. The entire implementation is a single `const` definition + one `<script>` tag. The only complexity is getting the schema property values correct.

---

## Common Pitfalls

### Pitfall 1: `@type` — SportsEvent vs Event for Google Rich Results

**What goes wrong:** Google's Rich Results Test recognizes `"Event"` but may not surface `"SportsEvent"` as a distinct rich result type. The test uses "EVENT" as the supported category.

**Why it happens:** Google supports ~30 schema types for rich results. `SportsEvent` is a valid Schema.org subtype of `Event` but Google's documentation only shows `Event` examples.

**How to avoid:** Use `"@type": "SportsEvent"` — it IS a valid subtype of Event and Google will still parse it as an Event for rich results. SportsEvent was not in the June 2025 deprecation list. The success criterion says "Google's Rich Results Test returns a valid SportsEvent result" — using `SportsEvent` type directly is the right call and will satisfy this.

**Warning signs:** If Rich Results Test returns 0 results, try `"Event"` as a fallback to confirm it's the type, not the schema structure, causing the issue.

### Pitfall 2: `price` field — string "0" vs number 0

**What goes wrong:** The requirement specifies `price: "0"` (string), but Google's documentation example uses `"price": 0` (number). Both pass validation.

**Why it happens:** Schema.org accepts both; JSON-LD is flexible on number vs string for price. Google's documentation uses the numeric form.

**How to avoid:** Use `"price": "0"` as specified in DATA-07 (string). Both are accepted, and the requirement explicitly states string `"0"`. Alternatively, use numeric `0` — either satisfies the validator.

### Pitfall 3: Missing `priceCurrency` with price 0

**What goes wrong:** Omitting `priceCurrency` when `price` is set causes Google validation warnings.

**Why it happens:** Google recommends `priceCurrency` alongside `price` even for free events.

**How to avoid:** Always include `"priceCurrency": "USD"` in the Offers object.

### Pitfall 4: `eventAttendanceMode` full URL required

**What goes wrong:** Using a shorthand like `"OfflineEventAttendanceMode"` instead of the full URL `"https://schema.org/OfflineEventAttendanceMode"`.

**Why it happens:** Schema.org enumeration values must be expressed as full URLs, not plain strings.

**How to avoid:** Use `"https://schema.org/OfflineEventAttendanceMode"` (the full URL form). MK Ultra is an in-person event, so `OfflineEventAttendanceMode` is correct.

### Pitfall 5: `eventStatus` full URL required

**What goes wrong:** Same as above — `"EventScheduled"` fails; `"https://schema.org/EventScheduled"` is correct.

**How to avoid:** Always use full `https://schema.org/` prefix for enumeration values.

---

## Code Examples

Verified patterns from official sources:

### Complete SportsEvent Schema for MK Ultra Gravel

```javascript
// Source: Google Structured Data Event docs + Schema.org SportsEvent spec
// Source: Astro GitHub issue #3544 (set:html pattern)
{
  "@context": "https://schema.org",
  "@type": "SportsEvent",
  "name": "MK Ultra Gravel",
  "startDate": "2026-06-07T09:00:00-04:00",
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "location": {
    "@type": "Place",
    "name": "Marquette Fire Bell",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Marquette",
      "addressRegion": "MI",
      "addressCountry": "US"
    }
  },
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock",
    "url": "https://mkultragravel.com"
  },
  "organizer": {
    "@type": "Organization",
    "name": "MK Ultra Gravel",
    "url": "https://mkultragravel.com"
  },
  "description": "100 miles of rowdy, technical gravel through Michigan's Upper Peninsula. Free ride. Mass start. No mercy.",
  "url": "https://mkultragravel.com"
}
```

### Astro script tag insertion (the only correct pattern)

```astro
<script type="application/ld+json" set:html={JSON.stringify(structuredData)} />
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Microdata in HTML attributes | JSON-LD in `<head>` | ~2015 | JSON-LD is Google's preferred format; cleaner separation from markup |
| `define:vars` in Astro | `set:html` with `JSON.stringify` | Astro early days | `define:vars` produces wrapper code; `set:html` is the fix |
| Manual `@type: "Event"` only | Subtype like `SportsEvent` | Always supported | More semantic; Google parses it as Event for rich results |

**Deprecated/outdated:**
- Microdata (itemscope/itemtype attributes): Technically still valid but JSON-LD is strongly preferred by Google
- `define:vars` for JSON injection in Astro: Broken approach, replaced by `set:html`

---

## Open Questions

1. **Does Google's Rich Results Test explicitly label it as "SportsEvent" in results?**
   - What we know: Google Rich Results Test uses "Event" as the category. SportsEvent is a valid Schema.org subtype of Event.
   - What's unclear: Whether the test UI displays "SportsEvent" specifically or just "Event" in results.
   - Recommendation: Run the test against the live URL after deployment. The success criterion ("returns a valid SportsEvent result") will be satisfied as long as the Event rich result appears — Google parses SportsEvent as a valid Event subtype.

2. **Street address for Marquette Fire Bell**
   - What we know: The location is "Marquette Fire Bell, Marquette, MI" per DATA-07. No street address is specified in requirements.
   - What's unclear: Whether omitting `streetAddress` causes a Google validation warning.
   - Recommendation: Omit `streetAddress` rather than guess it. `addressLocality` + `addressRegion` + `addressCountry` satisfy minimum requirements per Google docs. A warning (not error) may appear — acceptable.

---

## Sources

### Primary (HIGH confidence)

- `https://developers.google.com/search/docs/appearance/structured-data/event` — Google's official Event structured data requirements, required/recommended properties, date format, offers structure for free events
- `https://schema.org/SportsEvent` — Full property list for SportsEvent type (subtype of Event)
- `https://schema.org/EventAttendanceModeEnumeration` — Valid values for `eventAttendanceMode`
- `https://github.com/withastro/astro/issues/3544` — Official Astro confirmation that `set:html={JSON.stringify(schema)}` is the correct pattern for JSON-LD script tags

### Secondary (MEDIUM confidence)

- `https://stephen-lunt.dev/blog/astro-structured-data/` — Practical Astro JSON-LD implementation pattern, verified against Astro docs
- `https://johndalesandro.com/blog/astro-add-json-ld-structured-data-to-your-website-for-rich-search-results/` — Additional Astro JSON-LD pattern examples
- `https://www.cemkiray.com/posts/how-to-add-json-ld-schema-in-astro/` — Dual-schema pattern in Astro layout

### Tertiary (LOW confidence)

- WebSearch results confirming SportsEvent was not in June 2025 Google deprecation list — single-source community articles, not official Google docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `set:html` + `JSON.stringify` confirmed via Astro GitHub issue; no external library needed
- Architecture: HIGH — Single file edit in `BaseLayout.astro`, pattern well-documented
- Schema property values: HIGH — `startDate`, `location`, `offers.price`, `eventAttendanceMode` all confirmed from official Schema.org + Google docs
- Google Rich Results SportsEvent support: MEDIUM — SportsEvent is a valid Event subtype and not deprecated, but Google's docs only show "Event" examples; test result display TBD

**Research date:** 2026-04-10
**Valid until:** 2026-07-10 (stable; JSON-LD spec and Astro patterns rarely change)
