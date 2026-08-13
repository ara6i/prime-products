import type { ComponentProps } from "react";
import { Button } from "@/app/shared/components/ui";

type AffiliateBuyButtonProps = Omit<
  ComponentProps<typeof Button>,
  "asChild" | "children"
> & {
  affiliateUrl?: string | null;
};

function getSafeAffiliateUrl(affiliateUrl?: string | null): string | null {
  if (!affiliateUrl) return null;

  try {
    const url = new URL(affiliateUrl);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function AffiliateBuyButton({
  affiliateUrl,
  ...buttonProps
}: AffiliateBuyButtonProps) {
  const safeUrl = getSafeAffiliateUrl(affiliateUrl);

  if (!safeUrl) {
    return (
      <Button {...buttonProps} disabled>
        Buy
      </Button>
    );
  }

  return (
    <Button {...buttonProps} asChild>
      <a
        href={safeUrl}
        target="_blank"
        rel="sponsored noopener noreferrer"
      >
        Buy
      </a>
    </Button>
  );
}
