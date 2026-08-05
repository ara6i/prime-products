"use client";

import Image from "next/image";
import Link from "next/link";
import { useHorizontalCarousel } from "../../hooks/useHorizontalCarousel";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface HomeWorkflowCardsProps {
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
}

const WORKFLOWS = [
  {
    id: "background-remover",
    title: "Remove a background",
    href: "/pdp-studio/tools/background-remover",
    image: "/images/pdp-studio/home/photoroom-background-remover-v1.png",
    eyebrow: "Clean cutouts",
    tone: "blue",
  },
  {
    id: "ai-backgrounds",
    title: "Generate AI backgrounds",
    href: "/pdp-studio/tools/ai-backgrounds",
    image: "/images/pdp-studio/home/photoroom-ai-backgrounds-v1.png",
    eyebrow: "Campaign scenes",
    tone: "orange",
  },
  {
    id: "batch",
    title: "Edit hundreds of images at once",
    href: "/pdp-studio/batch",
    image: "/images/pdp-studio/home/photoroom-batch-v1.png",
    eyebrow: "Catalog scale",
    tone: "teal",
  },
  {
    id: "retouch",
    title: "Retouch an image",
    href: "/pdp-studio/tools/retouch",
    image: "/images/pdp-studio/home/photoroom-retouch-v1.png",
    eyebrow: "Fine restoration",
    tone: "violet",
  },
] as const;

const TONE_CLASSES = {
  blue: "bg-[var(--color-pdp-accent-soft)] text-[var(--color-pdp-accent)]",
  orange: "bg-[var(--color-pdp-orange-soft)] text-[var(--color-pdp-orange-hover)]",
  teal: "bg-[var(--color-pdp-teal-soft)] text-[var(--color-pdp-teal)]",
  violet: "bg-[var(--color-pdp-violet-soft)] text-[var(--color-pdp-violet)]",
} as const;

export function HomeWorkflowCards({
  visible,
  onVisibleChange,
}: HomeWorkflowCardsProps) {
  const {
    viewportRef,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
  } = useHorizontalCarousel();

  if (!visible) {
    return (
      <button
        type="button"
        onClick={() => onVisibleChange(true)}
        className="w-fit text-[0.875rem] font-medium text-[var(--color-pdp-accent)] hover:underline"
      >
        Show quick starts
      </button>
    );
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-[1rem] font-semibold text-[var(--color-pdp-ink)]">
          Get started
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous quick start"
            disabled={!canGoBack}
            onClick={goBack}
            className="grid size-8 place-items-center rounded-full border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] text-[var(--color-pdp-ink-soft)] transition hover:border-[var(--color-pdp-rule-strong)] hover:text-[var(--color-pdp-ink)] disabled:cursor-default disabled:opacity-35"
          >
            <PdpStudioUiIcon name="arrow" size={15} className="rotate-180" />
          </button>
          <button
            type="button"
            aria-label="Next quick start"
            disabled={!canGoForward}
            onClick={goForward}
            className="grid size-8 place-items-center rounded-full border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] text-[var(--color-pdp-ink-soft)] transition hover:border-[var(--color-pdp-rule-strong)] hover:text-[var(--color-pdp-ink)] disabled:cursor-default disabled:opacity-35"
          >
            <PdpStudioUiIcon name="arrow" size={15} />
          </button>
          <button
            type="button"
            onClick={() => onVisibleChange(false)}
            className="ml-1 text-[0.8125rem] font-normal text-[var(--color-pdp-muted)] transition hover:text-[var(--color-pdp-ink)]"
          >
            Dismiss
          </button>
        </div>
      </div>
      <div
        ref={viewportRef}
        role="region"
        aria-label="Get started carousel"
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-px scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {WORKFLOWS.map((workflow) => (
          <Link
            key={workflow.id}
            href={workflow.href}
            data-carousel-item
            className="group w-[min(23rem,84vw)] shrink-0 snap-start overflow-hidden rounded-[var(--radius-pdp-lg)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] text-[var(--color-pdp-ink)] shadow-[var(--shadow-pdp-card)] outline-none transition-[border-color,box-shadow,transform] duration-[var(--dur-pdp-short)] hover:-translate-y-0.5 hover:border-[var(--color-pdp-accent-border)] hover:shadow-[var(--shadow-pdp-popover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-pdp-focus)]"
          >
            <span className="relative block h-[11.875rem] overflow-hidden bg-[var(--color-pdp-surface-soft)]">
              <Image
                src={workflow.image}
                alt=""
                fill
                loading="eager"
                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.015]"
              />
            </span>
            <span className="flex min-h-[4.75rem] items-center justify-between gap-3 px-4 py-3.5">
              <span className="min-w-0">
                <span className={["mb-1 inline-flex rounded-full px-2 py-0.5 text-[0.625rem] font-medium", TONE_CLASSES[workflow.tone]].join(" ")}>{workflow.eyebrow}</span>
                <span className="block truncate text-[0.9375rem] font-medium">{workflow.title}</span>
              </span>
              <span className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-pdp-sm)] bg-[var(--color-pdp-surface-soft)] text-[var(--color-pdp-ink-soft)] transition group-hover:bg-[var(--color-pdp-accent)] group-hover:text-white">
                <PdpStudioUiIcon name="arrow" size={16} />
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
