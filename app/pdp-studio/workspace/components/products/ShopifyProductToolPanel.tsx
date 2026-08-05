import Image from "next/image";
import { PDP_STUDIO_TOOL_ASSETS } from "../../data/pdpStudioToolAssets";
import type { ShopifyProductWorkspacePanel } from "../../hooks/useShopifyProductWorkspace";
import type { PdpStudioToolDefinition, PdpStudioToolId } from "../../types";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface ShopifyProductToolPanelProps {
  panel: ShopifyProductWorkspacePanel;
  productTitle: string;
  productStatus: string;
  priceLabel: string | null;
  storefrontUrl: string | null;
  variantCount: number;
  media: Array<{ id: string; url: string; altText: string | null }>;
  selectedMediaId: string | null;
  tools: PdpStudioToolDefinition[];
  launchingToolId: string | null;
  onPanelChange: (panel: ShopifyProductWorkspacePanel) => void;
  onSelectMedia: (mediaId: string) => void;
  onLaunchTool: (tool: PdpStudioToolDefinition) => void;
}

const PRODUCT_TOOL_ORDER: PdpStudioToolId[] = [
  "recolor",
  "product-beautifier",
  "ai-fashion-models",
  "product-staging",
  "edit-with-ai",
  "flat-lay",
  "ghost-mannequin",
  "ironing",
  "ai-backgrounds",
  "background-remover",
  "retouch",
  "ai-shadows",
  "resize",
];

export function ShopifyProductToolPanel({
  panel,
  productTitle,
  productStatus,
  priceLabel,
  storefrontUrl,
  variantCount,
  media,
  selectedMediaId,
  tools,
  launchingToolId,
  onPanelChange,
  onSelectMedia,
  onLaunchTool,
}: ShopifyProductToolPanelProps) {
  return (
    <aside className="order-2 min-h-0 overflow-y-auto border-t border-[var(--color-pdp-rule)] bg-white lg:order-1 lg:border-r lg:border-t-0">
      {panel === "tools" ? (
        <AiToolsPanel
          tools={tools}
          launchingToolId={launchingToolId}
          onLaunchTool={onLaunchTool}
        />
      ) : panel === "images" ? (
        <ProductImagesPanel
          media={media}
          productTitle={productTitle}
          selectedMediaId={selectedMediaId}
          onSelectMedia={onSelectMedia}
        />
      ) : (
        <ShopifyPanel
          productTitle={productTitle}
          productStatus={productStatus}
          priceLabel={priceLabel}
          storefrontUrl={storefrontUrl}
          mediaCount={media.length}
          variantCount={variantCount}
          tools={tools}
          launchingToolId={launchingToolId}
          onPanelChange={onPanelChange}
          onLaunchTool={onLaunchTool}
        />
      )}
    </aside>
  );
}

function PanelHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-[var(--color-pdp-rule)] px-5 pb-5 pt-5">
      <p className="text-[0.625rem] font-medium uppercase tracking-[0.15em] text-[var(--color-pdp-accent)]">
        {eyebrow}
      </p>
      <h2 className="mt-1.5 text-[1.05rem] font-medium tracking-[-0.025em]">{title}</h2>
      <p className="mt-1.5 text-[0.75rem] leading-5 text-[var(--color-pdp-muted)]">{description}</p>
    </div>
  );
}

function AiToolsPanel({
  tools,
  launchingToolId,
  onLaunchTool,
}: Pick<ShopifyProductToolPanelProps, "tools" | "launchingToolId" | "onLaunchTool">) {
  const priority = new Map(PRODUCT_TOOL_ORDER.map((toolId, index) => [toolId, index]));
  const orderedTools = [...tools].sort((left, right) => {
    const leftPriority = priority.get(left.id) ?? PRODUCT_TOOL_ORDER.length;
    const rightPriority = priority.get(right.id) ?? PRODUCT_TOOL_ORDER.length;
    return leftPriority - rightPriority;
  });

  return (
    <section>
      <PanelHeader
        eyebrow={`${tools.length} workflows`}
        title="AI Tools"
        description="Apply a workflow to the selected Shopify image."
      />
      <div className="grid gap-2.5 p-4">
        {orderedTools.map((tool) => {
          const launching = launchingToolId === tool.id;
          return (
            <PdpStudioButton
              key={tool.id}
              type="button"
              variant="ghost"
              disabled={Boolean(launchingToolId)}
              onClick={() => onLaunchTool(tool)}
              className="group relative min-h-[4.8rem] w-full justify-start overflow-hidden rounded-[0.85rem] border border-[var(--color-pdp-rule)] bg-white px-4 pr-[5.4rem] text-left shadow-none transition hover:border-[var(--color-pdp-accent-border)] hover:bg-[var(--color-pdp-accent-soft)] disabled:cursor-wait disabled:opacity-60"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.8125rem] font-medium text-[var(--color-pdp-ink)]">
                  {tool.label}
                </span>
                <span className="mt-1 block truncate text-[0.6875rem] font-normal text-[var(--color-pdp-muted)]">
                  {launching ? "Preparing selected image…" : tool.description}
                </span>
              </span>
              <span className="absolute inset-y-1.5 right-1.5 aspect-square overflow-hidden rounded-[0.65rem] bg-[var(--color-pdp-surface-soft)]">
                <Image
                  src={PDP_STUDIO_TOOL_ASSETS[tool.id]}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover transition duration-200 group-hover:scale-[1.035]"
                />
              </span>
            </PdpStudioButton>
          );
        })}
      </div>
    </section>
  );
}

function ProductImagesPanel({
  media,
  productTitle,
  selectedMediaId,
  onSelectMedia,
}: Pick<
  ShopifyProductToolPanelProps,
  "media" | "productTitle" | "selectedMediaId" | "onSelectMedia"
>) {
  return (
    <section>
      <PanelHeader
        eyebrow={`${media.length} listing images`}
        title="Product images"
        description="Choose the image every product tool will start from."
      />
      <div className="grid grid-cols-2 gap-2.5 p-4">
        {media.map((item, index) => {
          const selected = item.id === selectedMediaId;
          return (
            <button
              key={item.id}
              type="button"
              aria-label={`Use ${productTitle} image ${index + 1}`}
              aria-pressed={selected}
              onClick={() => onSelectMedia(item.id)}
              className={`group relative aspect-square overflow-hidden rounded-[0.8rem] border-2 bg-[var(--color-pdp-surface-soft)] p-1 outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--color-pdp-focus)] ${
                selected
                  ? "border-[var(--color-pdp-accent)] shadow-[0_0.65rem_1.5rem_rgb(47_91_234_/_0.12)]"
                  : "border-transparent hover:border-[var(--color-pdp-rule-strong)]"
              }`}
            >
              {/* Shopify media comes from the merchant CDN. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.altText || `${productTitle} image ${index + 1}`}
                className="size-full rounded-[0.55rem] bg-white object-contain"
              />
              <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[0.625rem] font-medium text-[var(--color-pdp-ink-soft)] shadow-sm backdrop-blur-sm">
                {index === 0 ? "Featured" : `Image ${index + 1}`}
              </span>
              {selected ? (
                <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-[var(--color-pdp-accent)] text-white shadow-sm">
                  <PdpStudioUiIcon name="check" size={12} weight="bold" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ShopifyPanel({
  productTitle,
  productStatus,
  priceLabel,
  storefrontUrl,
  mediaCount,
  variantCount,
  tools,
  launchingToolId,
  onPanelChange,
  onLaunchTool,
}: Pick<
  ShopifyProductToolPanelProps,
  | "productTitle"
  | "productStatus"
  | "priceLabel"
  | "storefrontUrl"
  | "variantCount"
  | "tools"
  | "launchingToolId"
  | "onPanelChange"
  | "onLaunchTool"
> & { mediaCount: number }) {
  const shotList = tools.find((tool) => tool.id === "ai-shot-list");
  return (
    <section>
      <PanelHeader
        eyebrow="Connected product"
        title="Shopify"
        description="Review this listing and create new product-ready media."
      />
      <div className="p-4">
        <div className="rounded-[0.95rem] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface-soft)] p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-[0.7rem] bg-white shadow-sm">
              <PdpStudioUiIcon name="shopify" size={19} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[0.8125rem] font-medium">{productTitle}</p>
              <p className="mt-1 text-[0.6875rem] text-[var(--color-pdp-muted)]">
                {productStatus} · {priceLabel ?? "Price unavailable"}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ProductStat label="Images" value={String(mediaCount)} tone="blue" />
            <ProductStat label="Variants" value={String(variantCount)} tone="orange" />
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          {shotList ? (
            <ProductAction
              icon="ai-shot-list"
              title="AI shot list"
              description="Generate a structured set of product shots."
              busy={launchingToolId === shotList.id}
              disabled={Boolean(launchingToolId)}
              onClick={() => onLaunchTool(shotList)}
            />
          ) : null}
          <ProductAction
            icon="image"
            title="Product images"
            description="Choose the source media for any workflow."
            onClick={() => onPanelChange("images")}
          />
          {storefrontUrl ? (
            <PdpStudioButton
              asChild
              variant="ghost"
              className="min-h-[4rem] w-full justify-start gap-3 rounded-[0.8rem] border border-[var(--color-pdp-rule)] bg-white px-3 text-left hover:border-[var(--color-pdp-accent-border)] hover:bg-[var(--color-pdp-accent-soft)]"
            >
              <a href={storefrontUrl} target="_blank" rel="noreferrer">
                <span className="grid size-9 shrink-0 place-items-center rounded-[0.6rem] bg-[var(--color-pdp-accent-soft)] text-[var(--color-pdp-accent)]">
                  <PdpStudioUiIcon name="expand" size={17} />
                </span>
                <span>
                  <span className="block text-[0.8125rem] font-medium">View storefront</span>
                  <span className="mt-0.5 block text-[0.6875rem] font-normal text-[var(--color-pdp-muted)]">Open the live Shopify product.</span>
                </span>
              </a>
            </PdpStudioButton>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ProductStat({ label, value, tone }: { label: string; value: string; tone: "blue" | "orange" }) {
  return (
    <div className={`rounded-[0.75rem] border px-3 py-2.5 ${
      tone === "blue"
        ? "border-[var(--color-pdp-accent-border)] bg-[var(--color-pdp-accent-soft)]"
        : "border-[var(--color-pdp-orange-border)] bg-[var(--color-pdp-orange-soft)]"
    }`}>
      <p className="text-[1.05rem] font-medium leading-none">{value}</p>
      <p className="mt-1 text-[0.625rem] text-[var(--color-pdp-muted)]">{label}</p>
    </div>
  );
}

function ProductAction({
  icon,
  title,
  description,
  busy = false,
  disabled = false,
  onClick,
}: {
  icon: "ai-shot-list" | "image";
  title: string;
  description: string;
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <PdpStudioButton
      type="button"
      variant="ghost"
      disabled={disabled}
      onClick={onClick}
      className="min-h-[4rem] w-full justify-start gap-3 rounded-[0.8rem] border border-[var(--color-pdp-rule)] bg-white px-3 text-left hover:border-[var(--color-pdp-accent-border)] hover:bg-[var(--color-pdp-accent-soft)]"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-[0.6rem] bg-[var(--color-pdp-accent-soft)] text-[var(--color-pdp-accent)]">
        <PdpStudioUiIcon name={icon} size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.8125rem] font-medium">{busy ? "Opening…" : title}</span>
        <span className="mt-0.5 block truncate text-[0.6875rem] font-normal text-[var(--color-pdp-muted)]">{description}</span>
      </span>
      <PdpStudioUiIcon name="arrow" size={15} className="shrink-0 text-[var(--color-pdp-muted)]" />
    </PdpStudioButton>
  );
}
