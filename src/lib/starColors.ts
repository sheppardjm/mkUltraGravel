/**
 * starColors.ts — Star-rating color palette
 *
 * Single source of truth for the Paris-Roubaix-style sector rating colors.
 * Used by: GravelSectors (SSR frontmatter), RouteMap (browser script), ElevationProfile (browser script).
 */
export const starColors: Record<number, string> = {
  1: '#f0c040',   // yellow — light gravel
  2: '#e8962a',   // gold-orange — moderate
  3: '#d9641e',   // burnt orange — getting rough
  4: '#c93a18',   // red-orange — hard
  5: '#b71c1c'    // deep red — brutal
};
