"use client";

import Image from "next/image";
import { Reveal } from "../../shared/Reveal";
import { BRAND_LOGOS, MEDIA_LOGOS } from "@/app/landing/data";

const featuredBrands = BRAND_LOGOS.filter((logo) =>
  ["Bloomingdale's", "Fleur Du Mal", "PatBo", "ShopSimon", "Men's Wearhouse"].includes(logo.alt),
);

export function AsSeenSection() {
  return (
    <section className="relative overflow-hidden border-y border-brand-blue/10 bg-brand-blue-pale/55 px-5 py-10 sm:px-8 lg:py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: "url('/images/landing/brands-bg-pattern.png')",
          backgroundSize: "640px auto",
          backgroundPosition: "center",
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-[1180px] flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <Reveal variant="fade" className="flex flex-col items-center gap-3 text-center lg:w-[360px]">
          <p className="text-xs font-semibold uppercase text-brand-blue">As seen on</p>
          <div className="flex items-center justify-center gap-3">
            {MEDIA_LOGOS.map((logo) => (
              <div
                key={logo.alt}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-brand-blue/15 bg-white shadow-sm"
              >
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={34}
                  height={34}
                  className="max-h-8 w-auto object-contain"
                />
              </div>
            ))}
          </div>
          <p className="text-sm font-medium text-text-body">+ over 250 news outlets</p>
        </Reveal>

        <Reveal delay={1} className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-7 gap-y-5 lg:justify-end">
          {featuredBrands.map((logo) => (
            <div
              key={logo.alt}
              className="relative flex h-10 items-center justify-center"
              style={{ width: `${Math.max(72, Math.round(logo.width * 0.72))}px` }}
            >
              <Image
                src={logo.src}
                alt={logo.alt}
                fill
                sizes="160px"
                className="object-contain opacity-80"
              />
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
