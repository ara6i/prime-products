import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface ShopifyProductCanvasProps {
  productTitle: string;
  priceLabel: string | null;
  variantCount: number;
  media: Array<{ id: string; url: string; altText: string | null }>;
  selectedMediaId: string | null;
  onSelectMedia: (mediaId: string) => void;
}

export function ShopifyProductCanvas({
  productTitle,
  priceLabel,
  variantCount,
  media,
  selectedMediaId,
  onSelectMedia,
}: ShopifyProductCanvasProps) {
  return (
    <section className="relative order-1 flex min-h-0 min-w-0 flex-col overflow-hidden bg-[var(--color-pdp-paper)] lg:order-2">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-pdp-rule)] bg-white/80 px-5 py-3 backdrop-blur-sm">
        <div>
          <p className="text-[0.8125rem] font-medium">Main listing images</p>
          <p className="mt-0.5 text-[0.6875rem] text-[var(--color-pdp-muted)]">Select an image, then choose any tool.</p>
        </div>
        <span className="rounded-full border border-[var(--color-pdp-rule)] bg-white px-3 py-1.5 text-[0.6875rem] text-[var(--color-pdp-muted)] shadow-sm">
          {media.length} images · {variantCount} variants
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7 lg:px-10 lg:py-8">
        {media.length ? (
          <div
            className="mx-auto grid w-full max-w-[68rem] gap-2.5"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 15rem), 1fr))" }}
          >
            {media.map((item, index) => {
              const selected = item.id === selectedMediaId;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Select ${productTitle} image ${index + 1}`}
                  aria-pressed={selected}
                  onClick={() => onSelectMedia(item.id)}
                  className={`group relative w-full overflow-hidden rounded-[0.9rem] border bg-white p-0 text-left shadow-[var(--shadow-pdp-card)] outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--color-pdp-focus)] focus-visible:ring-offset-2 ${
                    selected
                      ? "border-[var(--color-pdp-accent-border)]"
                      : "border-[var(--color-pdp-rule)] hover:-translate-y-0.5 hover:border-[var(--color-pdp-rule-strong)] hover:shadow-[var(--shadow-pdp-popover)]"
                  }`}
                >
                  <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/92 px-2.5 py-1 text-[0.625rem] font-medium text-[var(--color-pdp-ink-soft)] shadow-sm backdrop-blur-sm">
                    {index === 0 ? "Featured" : `Image ${index + 1}`}
                  </span>
                  {selected ? (
                    <span className="absolute right-3 top-3 z-10 grid size-7 place-items-center rounded-full bg-[var(--color-pdp-accent)] text-white shadow-[0_0.5rem_1.25rem_rgb(47_91_234_/_0.25)]">
                      <PdpStudioUiIcon name="check" size={14} weight="bold" />
                    </span>
                  ) : null}
                  <span className="relative block aspect-square w-full overflow-hidden bg-white">
                    {/* Shopify media comes from the merchant CDN. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt={item.altText || `${productTitle} image ${index + 1}`}
                      className="size-full object-contain p-6 transition duration-300 group-hover:scale-[1.008] sm:p-9"
                    />
                  </span>
                </button>
              );
            })}
            <footer className="col-span-full flex flex-wrap items-center justify-between gap-3 px-1 pb-5 text-[0.75rem]">
              <span className="font-medium text-[var(--color-pdp-ink)]">{productTitle}</span>
              <span className="text-[var(--color-pdp-muted)]">{priceLabel ?? "Price unavailable"}</span>
            </footer>
          </div>
        ) : (
          <div className="grid h-full min-h-[22rem] place-items-center text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-white text-[var(--color-pdp-accent)] shadow-[var(--shadow-pdp-card)]">
                <PdpStudioUiIcon name="image" size={22} />
              </span>
              <p className="mt-4 text-[0.8125rem] font-medium">No listing images yet</p>
              <p className="mt-1 text-[0.75rem] text-[var(--color-pdp-muted)]">Add media in Shopify, then refresh this product.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
