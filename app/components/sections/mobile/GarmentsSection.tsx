"use client";

import Image from "next/image";
import { Reveal } from "../../shared/Reveal";
import { Eyebrow } from "../../shared/Eyebrow";
import { cn } from "@/app/shared/lib/utils";
import { useLandingLanguage } from "@/app/landing/i18n";

export function GarmentsSection() {
  const { content } = useLandingLanguage();
  const { garments } = content;

  return (
    <section className="bg-white py-14">
      <Reveal variant="fade" className="mb-8 flex flex-col items-center gap-3 px-5 text-center">
        <Eyebrow>{garments.eyebrow}</Eyebrow>
        <h2 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-text-primary">
          {garments.title}
        </h2>
        <p className="text-[15px] leading-[1.55] text-text-body">{garments.subtitle}</p>
      </Reveal>

      <div
        className={cn(
          "ps-marquee-scroll relative w-full overflow-hidden",
          "[mask-image:linear-gradient(90deg,transparent,black_5%,black_95%,transparent)]"
        )}
      >
        <div className="ps-marquee-track ps-marquee-track--slow flex w-max gap-3 py-2">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex shrink-0 gap-3" aria-hidden={dup === 1}>
              {garments.items.map((g, i) => (
                <article
                  key={`${dup}-${i}`}
                  className="flex w-[140px] shrink-0 flex-col items-center gap-2 rounded-xl border border-text-primary/8 bg-white p-3"
                >
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-surface-light">
                    <Image src={g.image} alt={g.label} fill sizes="140px" className="object-cover" />
                  </div>
                  <span className="text-xs font-medium text-text-primary">{g.label}</span>
                </article>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
