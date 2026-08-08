export function formatProductPrice(priceCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(priceCents / 100);
}

export function getDiscountLabel(
  priceCents: number,
  compareAtPriceCents?: number,
): string | undefined {
  if (!compareAtPriceCents || compareAtPriceCents <= priceCents)
    return undefined;
  const percentage = Math.round(
    ((compareAtPriceCents - priceCents) / compareAtPriceCents) * 100,
  );
  return `${percentage}% off`;
}
