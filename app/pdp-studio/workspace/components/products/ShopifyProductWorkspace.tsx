"use client";

import Link from "next/link";
import { ShopifyProductCanvas } from "./ShopifyProductCanvas";
import { ShopifyProductHeader } from "./ShopifyProductHeader";
import { ShopifyProductToolPanel } from "./ShopifyProductToolPanel";
import { ShopifyProductToolRail } from "./ShopifyProductToolRail";
import { ShopifyProductWorkspaceLoading } from "./ShopifyProductWorkspaceLoading";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";
import { useShopifyProductWorkspace } from "../../hooks/useShopifyProductWorkspace";
import { usePdpStudioHomeDialogs } from "../../hooks/usePdpStudioHomeDialogs";
import { mapPdpStudioAssetToDialogSource } from "../../mappers/pdpStudioDialogSourceMapper";
import type { PdpStudioToolDefinition } from "../../types";
import { PdpStudioInlineToolDialogs } from "../shared/PdpStudioInlineToolDialogs";

interface ShopifyProductWorkspaceProps {
  productId: string;
  tools: PdpStudioToolDefinition[];
}

export function ShopifyProductWorkspace({
  productId,
  tools,
}: ShopifyProductWorkspaceProps) {
  const ui = useShopifyProductWorkspace(productId);
  const dialogs = usePdpStudioHomeDialogs();

  if (ui.loading) return <ShopifyProductWorkspaceLoading />;

  if (!ui.product) {
    return (
      <UnavailableProductState error={ui.error} returnHref={ui.returnHref} />
    );
  }
  const productTitle = ui.product.title;

  const launchTool = async (tool: PdpStudioToolDefinition) => {
    const sourceAsset = await ui.prepareToolSource(tool);
    if (!sourceAsset) return;
    dialogs.openAiTool(
      tool.id,
      mapPdpStudioAssetToDialogSource(sourceAsset, productTitle),
    );
  };

  return (
    <>
      <main
        data-pdp-studio
        className="flex h-[100dvh] min-h-[36rem] flex-col overflow-hidden bg-[var(--color-pdp-paper)] font-[family-name:var(--font-pdp-body)] text-[var(--color-pdp-ink)] [color-scheme:light] lg:flex-row"
      >
        <ShopifyProductToolRail
          activePanel={ui.activePanel}
          tools={tools}
          launchingToolId={ui.launchingToolId}
          onPanelChange={ui.setActivePanel}
          onLaunchTool={launchTool}
        />
        <section className="order-1 flex min-h-0 min-w-0 flex-1 flex-col lg:order-2">
          <ShopifyProductHeader
            title={ui.product.title}
            status={ui.product.status}
            storefrontUrl={ui.product.storefrontUrl}
            returnHref={ui.returnHref}
          />
          <div className="flex min-h-11 shrink-0 items-center gap-2 border-b border-[var(--color-pdp-accent-border)] bg-[var(--color-pdp-accent-soft)] px-4 text-[0.6875rem] text-[var(--color-pdp-ink-soft)]">
            <span
              className="size-1.5 shrink-0 rounded-full bg-[var(--color-pdp-accent)]"
              aria-hidden
            />
            <span className="truncate">
              Your edits stay private. Publishing to Shopify always requires
              your confirmation.
            </span>
          </div>
          <div className="grid min-h-0 flex-1 grid-rows-[minmax(18rem,44dvh)_minmax(0,1fr)] lg:grid-cols-[20rem_minmax(0,1fr)] lg:grid-rows-1">
            <ShopifyProductToolPanel
              panel={ui.activePanel}
              productTitle={ui.product.title}
              productStatus={ui.product.status}
              priceLabel={ui.product.priceLabel}
              storefrontUrl={ui.product.storefrontUrl}
              variantCount={ui.product.variants.length}
              media={ui.product.media}
              selectedMediaId={ui.selectedMedia?.id ?? null}
              tools={tools}
              launchingToolId={ui.launchingToolId}
              onPanelChange={ui.setActivePanel}
              onSelectMedia={ui.setSelectedMediaId}
              onLaunchTool={launchTool}
            />
            <ShopifyProductCanvas
              productTitle={ui.product.title}
              priceLabel={ui.product.priceLabel}
              variantCount={ui.product.variants.length}
              media={ui.product.media}
              selectedMediaId={ui.selectedMedia?.id ?? null}
              onSelectMedia={ui.setSelectedMediaId}
            />
          </div>
        </section>
        {ui.error ? <WorkspaceErrorNotice message={ui.error} /> : null}
      </main>
      <PdpStudioInlineToolDialogs dialogs={dialogs} tools={tools} />
    </>
  );
}

function UnavailableProductState({
  error,
  returnHref,
}: {
  error: string | null;
  returnHref: string;
}) {
  return (
    <main
      data-pdp-studio
      className="grid min-h-screen place-items-center bg-[var(--color-pdp-paper)] p-6 text-[var(--color-pdp-ink)] [color-scheme:light]"
    >
      <div className="max-w-md text-center">
        <PdpStudioUiIcon
          name="product"
          size={34}
          className="mx-auto text-[var(--color-pdp-accent)]"
        />
        <h1 className="mt-4 text-xl font-semibold">Product unavailable</h1>
        <p className="mt-2 text-sm text-[var(--color-pdp-muted)]">
          {error ??
            "This product is no longer available in the connected Shopify store."}
        </p>
        <PdpStudioButton asChild className="mt-6">
          <Link href={returnHref}>Back to Shopify Products</Link>
        </PdpStudioButton>
      </div>
    </main>
  );
}

function WorkspaceErrorNotice({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="fixed bottom-5 left-1/2 z-20 max-w-lg -translate-x-1/2 rounded-[var(--radius-pdp-sm)] border border-[var(--color-pdp-danger)]/25 bg-[var(--color-pdp-surface)] px-4 py-3 text-sm text-[var(--color-pdp-danger)] shadow-[var(--shadow-pdp-overlay)]"
    >
      {message}
    </p>
  );
}
