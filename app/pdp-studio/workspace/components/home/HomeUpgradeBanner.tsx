import Image from "next/image";
import Link from "next/link";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface HomeUpgradeBannerProps {
  onDismiss: () => void;
}

export function HomeUpgradeBanner({ onDismiss }: HomeUpgradeBannerProps) {
  return (
    <section className="relative isolate min-h-[6.0625rem] overflow-hidden rounded-[var(--radius-pdp-md)] bg-[linear-gradient(105deg,var(--color-pdp-accent-soft)_0%,oklch(96%_0.035_258)_58%,oklch(94%_0.06_258)_100%)]">
      <div className="relative z-10 flex min-h-[6.0625rem] max-w-full flex-col items-start justify-center px-6 py-4 pr-14 sm:max-w-[56%]">
        <h2 className="text-[1.5rem] font-semibold leading-7 tracking-[-0.03em] text-[var(--color-pdp-ink)]">
          Empower your team
        </h2>
        <p className="mt-1 max-w-xl text-[0.875rem] leading-5 text-[var(--color-pdp-muted)]">
          Upgrade your Space to Pro to boost creativity and efficiency.
        </p>
      </div>

      <div
        className="pointer-events-none absolute inset-y-0 right-[12.5rem] hidden w-[27rem] xl:block"
        aria-hidden
      >
        <Image
          src="/images/pdp-studio/brand/upgrade-banner.webp"
          alt=""
          fill
          priority
          sizes="432px"
          className="object-contain object-right"
        />
      </div>
      <div className="absolute inset-y-0 right-12 z-20 hidden items-center sm:flex">
        <PdpStudioButton asChild variant="secondary" className="bg-white px-5 text-[var(--color-pdp-ink)] shadow-sm hover:bg-white/90">
          <Link href="/pdp-studio/preferences">Upgrade my Space</Link>
        </PdpStudioButton>
      </div>
      <PdpStudioButton
        type="button"
        variant="icon"
        size="icon-sm"
        onClick={onDismiss}
        aria-label="Dismiss upgrade banner"
        className="absolute right-2 top-2 z-30 size-6 min-h-0 bg-[var(--color-pdp-ink)]/10 p-0 text-[var(--color-pdp-muted)] hover:bg-white hover:text-[var(--color-pdp-ink)]"
      >
        <PdpStudioUiIcon name="close" size={14} />
      </PdpStudioButton>
    </section>
  );
}
