import Link from "next/link";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface ShopifyProductHeaderProps {
  title: string;
  status: string;
  storefrontUrl: string | null;
  returnHref: string;
}

export function ShopifyProductHeader({
  title,
  status,
  storefrontUrl,
  returnHref,
}: ShopifyProductHeaderProps) {
  return (
    <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-[var(--color-pdp-rule)] bg-white px-3 sm:px-4">
      <PdpStudioButton
        asChild
        variant="ghost"
        size="icon"
        className="size-9 min-h-9 rounded-[0.65rem] p-0 text-[var(--color-pdp-ink-soft)] hover:bg-[var(--color-pdp-surface-soft)]"
      >
        <Link href={returnHref} aria-label="Back to Shopify Products">
          <PdpStudioUiIcon name="arrow" size={18} className="rotate-180" />
        </Link>
      </PdpStudioButton>
      <span className="hidden h-7 w-px bg-[var(--color-pdp-rule)] sm:block" aria-hidden />
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <h1 className="truncate text-[0.875rem] font-medium tracking-[-0.015em]">{title}</h1>
        <span className="hidden shrink-0 rounded-full bg-[var(--color-pdp-success-soft)] px-2 py-1 text-[0.5625rem] font-medium uppercase tracking-[0.1em] text-[var(--color-pdp-success)] sm:inline-flex">
          {status}
        </span>
      </div>
      {storefrontUrl ? (
        <PdpStudioButton asChild variant="secondary" className="min-h-9 shrink-0 gap-2 rounded-[0.7rem] border border-[var(--color-pdp-rule)] bg-white px-3 text-[0.75rem] shadow-sm hover:border-[var(--color-pdp-accent-border)] hover:bg-[var(--color-pdp-accent-soft)]">
          <a href={storefrontUrl} target="_blank" rel="noreferrer">
            <span className="hidden sm:inline">View storefront</span> <PdpStudioUiIcon name="expand" size={15} />
          </a>
        </PdpStudioButton>
      ) : null}
    </header>
  );
}
