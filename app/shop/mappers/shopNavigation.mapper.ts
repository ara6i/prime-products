export function getBrandHref(brandId: string): string {
  return `/shop/brand/${encodeURIComponent(brandId.trim().toLowerCase())}`;
}
