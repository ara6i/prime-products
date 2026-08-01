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
    <section className="mx-auto grid min-h-[34rem] w-full max-w-3xl place-items-center py-8 text-center">
      <div className="w-full rounded-[1.5rem] border border-[var(--color-pdp-rule)] bg-white px-6 py-10 shadow-[0_18px_60px_rgba(25,45,90,0.08)] sm:px-12">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#e8f7e8]">
          <PdpStudioUiIcon name="shopify" size={34} />
        </span>
        <h1 className="mt-5 text-[1.65rem] font-semibold tracking-[-0.025em]">
          Install PrimeStyleAI on Shopify
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--color-pdp-muted)]">
          Shopify handles installation and store permission. After approval,
          you return here automatically, signed in to a store-specific Space
          with the live product catalog ready to sync.
        </p>

        <div className="mx-auto mt-7 grid max-w-lg gap-3 text-left text-sm">
          {[
            "Sync product titles, status, images, variants, and prices",
            "Import Shopify media into your private PDP Studio library",
            "Publish approved generated images back to the selected listing",
          ].map((item) => (
            <div
              key={item}
              className="flex items-start gap-3 rounded-xl bg-[var(--color-pdp-surface-soft)] px-4 py-3"
            >
              <span className="mt-0.5 text-[var(--color-pdp-accent)]">
                <PdpStudioUiIcon name="check" size={17} weight="bold" />
              </span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-7 flex max-w-lg flex-col gap-2 sm:flex-row"
        >
          <label className="sr-only" htmlFor="shopify-store-domain">
            Shopify store domain
          </label>
          <div className="flex min-h-[var(--size-pdp-control)] flex-1 items-center rounded-[var(--radius-pdp-sm)] border border-[var(--color-pdp-rule)] bg-white px-3 focus-within:border-[var(--color-pdp-accent)] focus-within:ring-2 focus-within:ring-[var(--color-pdp-accent-soft)]">
            <input
              id="shopify-store-domain"
              value={shopDomain}
              onChange={(event) => setShopDomain(event.target.value)}
              placeholder="your-store.myshopify.com"
              autoComplete="url"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <PdpStudioButton
            type="submit"
            disabled={!shopDomain.trim() || connecting}
          >
            {connecting ? "Opening Shopify…" : "Install Shopify app"}
          </PdpStudioButton>
        </form>

        {error ? (
          <p
            role="alert"
            className="mx-auto mt-4 max-w-lg rounded-lg bg-red-50 px-3 py-2 text-left text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}
        <p className="mt-4 text-xs text-[var(--color-pdp-muted)]">
          Use the permanent <strong>myshopify.com</strong> domain, not the
          public storefront URL.
        </p>
      </div>
    </section>
  );
}
