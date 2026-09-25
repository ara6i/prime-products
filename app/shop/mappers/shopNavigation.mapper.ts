export function getBrandHref(brandId: string): string {
  return `/shop/category/women?brand=${encodeURIComponent(brandId.trim().toLowerCase())}`;
}
