"use client";

import Image from "next/image";
import { useShopifyProductsUi } from "../../hooks/useShopifyProductsUi";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

export function ProductsWorkspace() {
  const ui = useShopifyProductsUi();

  if (!ui.connection?.connected) {
    return (
      <div className="grid gap-8 py-6">
        <section className="mx-auto grid min-h-[32rem] w-full max-w-2xl place-items-center text-center">
          <div>
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#e8f7e8] text-[#168343]">
              <PdpStudioUiIcon name="shopify" size={32} />
            </span>
            <h2 className="mt-5 text-xl font-semibold">Connect your Shopify store</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--color-pdp-muted)]">
              Link this private Space to a store that already has the PrimeStyleAI Shopify app installed.
            </p>
            <div className="mx-auto mt-6 flex max-w-lg gap-2">
              <input
                value={ui.shopDomain}
                onChange={(event) => ui.setShopDomain(event.target.value)}
                placeholder="your-store.myshopify.com"
                className="h-11 min-w-0 flex-1 rounded-lg border border-[var(--color-pdp-rule)] px-3 text-sm"
              />
              <PdpStudioButton type="button" disabled={!ui.shopDomain.trim()} onClick={() => void ui.connect()}>
                Connect
              </PdpStudioButton>
            </div>
            {ui.error ? <p role="alert" className="mt-3 text-sm text-red-700">{ui.error}</p> : null}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="grid gap-8 py-6">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--color-pdp-rule)] bg-white p-5">
        <div>
          <p className="text-sm font-semibold">{ui.connection.storeName}</p>
          <p className="text-xs text-[var(--color-pdp-muted)]">{ui.connection.shopDomain}</p>
        </div>
        <div className="flex items-center gap-2">
          {ui.generated.length ? (
            <select value={ui.selectedAssetId} onChange={(event) => ui.setSelectedAssetId(event.target.value)} className="h-10 rounded-lg border border-[var(--color-pdp-rule)] bg-white px-3 text-sm">
              {ui.generated.map((asset, index) => <option key={asset.id} value={asset.id}>Generated image {index + 1}</option>)}
            </select>
          ) : <span className="text-sm text-[var(--color-pdp-muted)]">Generate an image to publish it.</span>}
          {!ui.connection.canPublish && ui.connection.publishAccessUrl ? (
            <PdpStudioButton asChild variant="outline"><a href={ui.connection.publishAccessUrl}>Enable publishing</a></PdpStudioButton>
          ) : null}
          <PdpStudioButton type="button" variant="outline" onClick={() => void ui.refresh()}>Refresh</PdpStudioButton>
        </div>
      </section>

      {ui.notice ? <p role="status" className="rounded-lg bg-[var(--color-pdp-accent-soft)] p-3 text-sm text-[var(--color-pdp-accent-strong)]">{ui.notice}</p> : null}
      {ui.error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{ui.error}</p> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ui.products.map((product) => (
          <article key={product.id} className="overflow-hidden rounded-2xl border border-[var(--color-pdp-rule)] bg-white">
            <div className="relative aspect-[4/3] bg-[var(--color-pdp-surface-soft)]">
              {product.featuredImage ? <Image src={product.featuredImage} alt="" fill unoptimized sizes="420px" className="object-contain" /> : null}
            </div>
            <div className="p-4">
              <h2 className="truncate text-sm font-semibold">{product.title}</h2>
              <p className="mt-1 text-xs text-[var(--color-pdp-muted)]">{product.status} · {product.media.length} media</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <PdpStudioButton type="button" variant="outline" disabled={ui.busyId === product.id} onClick={() => void ui.importProduct(product)}>
                  Import media
                </PdpStudioButton>
                <PdpStudioButton type="button" disabled={!ui.connection?.canPublish || !ui.selectedAssetId || ui.busyId === product.id} onClick={() => void ui.publish(product)}>
                  Publish selected
                </PdpStudioButton>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
