import { useState, type FormEvent } from "react";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface ShopifyConnectionGateProps {
  connecting: boolean;
  error: string | null;
  onConnect: (shopDomain: string) => void;
}

export function ShopifyConnectionGate({
  connecting,
  error,
  onConnect,
}: ShopifyConnectionGateProps) {
  const [shopDomain, setShopDomain] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = shopDomain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");
    if (!normalized) return;
    onConnect(
      normalized.endsWith(".myshopify.com")
        ? normalized
        : `${normalized}.myshopify.com`,
    );
  }

  return (
    <section
      data-pdp-shopify-gate
      className="mx-auto grid min-h-[34rem] w-full max-w-5xl place-items-center py-3 text-[var(--color-pdp-ink)] [color-scheme:light] sm:py-8"
    >
      <div className="grid w-full overflow-hidden rounded-[var(--radius-pdp-xl)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] shadow-[var(--shadow-pdp-popover)] lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="bg-[var(--color-pdp-orange-soft)] p-6 sm:p-10">
          <span className="grid size-14 place-items-center rounded-[var(--radius-pdp-sm)] bg-[var(--color-pdp-surface)] text-[var(--color-pdp-accent)] shadow-sm">
            <PdpStudioUiIcon name="shopify" size={30} />
          </span>
          <h1 className="mt-6 text-[1.65rem] font-medium tracking-[-0.025em]">
            Your products, ready for AI tools.
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--color-pdp-ink-soft)]">
            Connect the store once, then select a live product image and send it to any PDP Studio tool.
          </p>
          <div className="mt-8 grid gap-3 text-left text-sm">
            {[
              "Read live titles, status, variants, prices, and media",
              "Import only the image you choose into private PDP Studio storage",
              "Publish a generated image only when you explicitly approve it",
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-[var(--radius-pdp-md)] border border-[var(--color-pdp-orange-border)] bg-[var(--color-pdp-surface)]/85 px-4 py-3"
              >
                <span className="mt-0.5 text-[var(--color-pdp-orange)]">
                  <PdpStudioUiIcon name="check" size={17} weight="bold" />
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </aside>

        <div className="p-6 sm:p-10">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-pdp-accent)]">
            Shopify connection
          </p>
          <h2 className="mt-3 text-[1.45rem] font-medium tracking-[-0.025em]">
            Install PrimeStyleAI on Shopify
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-pdp-muted)]">
            Shopify handles installation and permissions. You will return here after approval with the live catalog ready to use.
          </p>
          <form onSubmit={handleSubmit} className="mt-7 grid gap-3">
            <label className="grid gap-2 text-sm font-medium" htmlFor="shopify-store-domain">
              Shopify store domain
              <div className="flex min-h-[var(--size-pdp-control)] items-center rounded-[var(--radius-pdp-sm)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] px-3 focus-within:border-[var(--color-pdp-accent)] focus-within:ring-2 focus-within:ring-[var(--color-pdp-accent-soft)]">
                <input
                  id="shopify-store-domain"
                  value={shopDomain}
                  onChange={(event) => setShopDomain(event.target.value)}
                  placeholder="your-store.myshopify.com"
                  autoComplete="url"
                  className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-pdp-ink)] outline-none placeholder:text-[var(--color-pdp-muted)]"
                />
              </div>
            </label>
            <PdpStudioButton type="submit" disabled={!shopDomain.trim() || connecting}>
              {connecting ? "Opening Shopify…" : "Install Shopify app"}
            </PdpStudioButton>
          </form>
          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-[var(--radius-pdp-sm)] border border-[var(--color-pdp-danger)]/25 bg-[var(--color-pdp-danger)]/5 px-3 py-2 text-sm text-[var(--color-pdp-danger)]"
            >
              {error}
            </p>
          ) : null}
          <p className="mt-4 text-xs leading-5 text-[var(--color-pdp-muted)]">
            Use the permanent <strong>myshopify.com</strong> domain, not the public storefront URL.
          </p>
        </div>
      </div>
    </section>
  );
}
