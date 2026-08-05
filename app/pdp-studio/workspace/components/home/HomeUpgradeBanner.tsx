import Image from "next/image";
import Link from "next/link";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface HomeUpgradeBannerProps {
  onDismiss: () => void;
}

export function HomeUpgradeBanner({ onDismiss }: HomeUpgradeBannerProps) {
  return (
    <section className="relative isolate flex h-full min-h-[19rem] overflow-hidden rounded-[var(--radius-pdp-lg)] border border-[var(--color-pdp-accent-border)] bg-[var(--color-pdp-surface-blue)] p-6 shadow-[var(--shadow-pdp-card)]">
      <div className="pointer-events-none absolute bottom-0 right-0 h-[68%] w-[78%]" aria-hidden>
        <Image
          src="/images/pdp-studio/home/prime/right-pro.webp"
          alt=""
          fill
          priority
          sizes="(max-width: 1279px) 55vw, 22rem"
          className="object-contain object-bottom"
        />
      </div>

      <div className="relative z-10 flex w-[58%] min-w-0 flex-col">
        <span className="grid size-11 place-items-center rounded-full bg-[var(--color-pdp-accent)] text-white shadow-[0_0.75rem_1.75rem_rgb(47_91_234_/_0.2)]">
          <PdpStudioUiIcon name="sparkles" size={20} />
        </span>
        <div className="mt-auto pt-8">
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-[var(--color-pdp-accent)]">PrimeStyleAI Pro</p>
          <h2 className="mt-2 text-[1.5rem] font-medium leading-7 tracking-[-0.035em] text-[var(--color-pdp-ink)]">
            Empower your team
          </h2>
          <p className="mt-1 max-w-60 text-[0.8125rem] leading-5 text-[var(--color-pdp-muted)]">
            Upgrade your Space to Pro to boost creativity and efficiency.
          </p>
          <PdpStudioButton asChild variant="secondary" className="mt-5 rounded-full bg-[var(--color-pdp-accent)] px-4 text-[0.75rem] text-white shadow-none hover:bg-[var(--color-pdp-accent-hover)]">
            <Link href="/pdp-studio/preferences">Upgrade my Space</Link>
          </PdpStudioButton>
        </div>
      </div>
      <PdpStudioButton
        type="button"
        variant="icon"
        size="icon-sm"
        onClick={onDismiss}
        aria-label="Dismiss upgrade banner"
        className="absolute right-3 top-3 z-30 size-7 min-h-0 bg-white/75 p-0 text-[var(--color-pdp-muted)] hover:bg-white hover:text-[var(--color-pdp-ink)]"
      >
        <PdpStudioUiIcon name="close" size={14} />
      </PdpStudioButton>
    </section>
  );
}
