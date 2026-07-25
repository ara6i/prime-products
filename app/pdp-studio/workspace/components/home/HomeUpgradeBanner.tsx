import Image from "next/image";
import Link from "next/link";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface HomeUpgradeBannerProps {
  onDismiss: () => void;
}

const bannerProducts = [
  {
    src: "/images/pdp-studio/presets/clean-white.png",
    crop: "scale-[1.45]",
  },
  {
    src: "/images/pdp-studio/presets/warm-plinth.png",
    crop: "scale-[1.55]",
  },
  {
    src: "/images/pdp-studio/presets/cobalt-sweep.png",
    crop: "scale-[1.4]",
  },
];

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
        className="pointer-events-none absolute inset-y-0 right-[12.75rem] hidden items-center -space-x-1.5 xl:flex"
        aria-hidden
      >
        {bannerProducts.map((product, index) => (
          <span
            key={product.src}
            className="relative block size-16 overflow-hidden rounded-full border-[3px] border-white bg-white shadow-[0_4px_14px_rgba(15,23,42,0.13)]"
            style={{ zIndex: bannerProducts.length - index }}
          >
            <Image
              src={product.src}
              alt=""
              fill
              priority
              unoptimized
              className={`object-cover ${product.crop}`}
            />
          </span>
        ))}
      </div>
      <div className="absolute inset-y-0 right-12 z-20 hidden items-center sm:flex">
        <Link
          href="/pdp-studio/preferences"
          className="rounded-[var(--radius-pdp-sm)] bg-white px-5 py-3 text-[0.875rem] font-medium text-[var(--color-pdp-ink)] shadow-sm outline-none transition hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-pdp-focus)]"
        >
          Upgrade my Space
        </Link>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss upgrade banner"
        className="absolute right-2 top-2 z-30 grid size-6 place-items-center rounded-full bg-[var(--color-pdp-ink)]/10 text-[var(--color-pdp-muted)] transition hover:bg-white hover:text-[var(--color-pdp-ink)]"
      >
        <PdpStudioUiIcon name="close" size={14} />
      </button>
    </section>
  );
}
