"use client";

import Image from "next/image";
import { Reveal } from "../../shared/Reveal";
import { SectionHeading } from "../../shared/SectionHeading";
import { GARMENTS } from "../../../content/landing";
import { cn } from "@/app/shared/lib/utils";

export function GarmentsSection() {
  return (
    <section className="bg-white py-[clamp(5rem,7vw,7rem)]">
      <div className="mx-auto flex w-[86.111vw] flex-col gap-4 px-8 text-center">
        <SectionHeading eyebrow={GARMENTS.eyebrow} title={GARMENTS.title} subtitle={GARMENTS.subtitle} />
      </div>

      <Reveal
        variant="fade"
        className={cn(
          "ps-marquee-scroll relative mt-12 w-full overflow-hidden",
          "[mask-image:linear-gradient(90deg,transparent,black_5%,black_95%,transparent)]"
        )}
      >
        <div className="ps-marquee-track ps-marquee-track--slow flex w-max gap-5 py-2">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex shrink-0 gap-5" aria-hidden={dup === 1}>
              {GARMENTS.items.map((g, i) => (
                <article
                  key={`${dup}-${i}`}
                  className="group flex w-[200px] shrink-0 flex-col items-center gap-3 rounded-2xl border border-text-primary/8 bg-white p-4 transition-all duration-300 hover:-translate-y-2 hover:border-brand-blue/30 hover:shadow-[0_16px_48px_rgba(0,0,0,0.08)]"
                >
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-surface-light">
                    <Image
                      src={g.image}
                      alt={g.label}
                      fill
                      sizes="200px"
                      loading="eager"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                    />
                  </div>
                  <span className="text-sm font-medium text-text-primary">{g.label}</span>
                </article>
              ))}
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
