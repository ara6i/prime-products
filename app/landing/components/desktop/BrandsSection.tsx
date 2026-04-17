"use client";

import Image from "next/image";
import { useScrollFadeUp, useScrollFadeIn } from "@/app/landing/hooks/useScrollAnimation";

interface BrandLogo {
  src: string;
  alt: string;
  width: number;
  height: number;
}

interface MediaLogo {
  src: string;
  alt: string;
}

interface BrandsSectionProps {
  brandLogos: BrandLogo[];
  mediaLogos: MediaLogo[];
}

/** Convert a Figma px value to vw (base 1920). Scale up by factor for better visibility. */
function toVw(px: number, scale = 1) {
  return `${((px * scale / 1920) * 100).toFixed(3)}vw`;
}

export function BrandsSection({ brandLogos, mediaLogos }: BrandsSectionProps) {
  const topRowBrands = brandLogos.slice(0, 6);
  const bottomRowBrands = brandLogos.slice(6);

  const titleRef = useScrollFadeUp({ duration: 0.7 });
  const mediaRef = useScrollFadeUp({ delay: 0.1 });
  const brandsRef = useScrollFadeIn({ delay: 0.3, duration: 1 });

  return (
    <section className="flex flex-col items-stretch justify-center gap-[1.979vw] w-full h-[25.313vw] bg-[url('/images/landing/brands-bg-pattern.png')] bg-no-repeat bg-cover px-[12.5vw]">
      <h2 ref={titleRef} className="text-[1.667vw] leading-[1.5] text-text-body font-normal text-center w-full">
        Try on outfits from trusted brands
      </h2>

      <div className="flex items-center justify-center self-stretch gap-[3.333vw]">
        <div ref={mediaRef} className="flex items-center">
          <Image
            src="/images/landing/arc-left.svg"
            alt=""
            width={55}
            height={200}
            className="w-[2.865vw] h-auto"
            aria-hidden="true"
          />

          <div className="flex flex-col items-stretch gap-[0.625vw]">
            <span className="text-[1.25vw] leading-[1.667] text-text-primary text-center">
              As seen on
            </span>
            <div className="flex items-center self-stretch gap-[0.625vw]">
              {mediaLogos.map((logo) => (
                <div
                  key={logo.alt}
                  className="w-[2.917vw] h-[2.917vw] flex items-center justify-center"
                >
                  <Image
                    src={logo.src}
                    alt={logo.alt}
                    width={56}
                    height={56}
                    className="object-contain p-[0.208vw] w-full h-full"
                  />
                </div>
              ))}
            </div>
            <span className="text-[1.25vw] leading-[1.667] text-text-primary text-center">
              + over 250 news outlets
            </span>
          </div>

          <Image
            src="/images/landing/arc-right.svg"
            alt=""
            width={55}
            height={200}
            className="w-[2.865vw] h-auto"
            aria-hidden="true"
          />
        </div>

        <div ref={brandsRef} className="flex flex-col gap-[0.625vw] flex-1">
          <div className="flex items-center justify-between">
            {topRowBrands.map((logo) => (
              <div
                key={logo.alt}
                className="relative flex items-center justify-center py-[1.25vw]"
                style={{ width: toVw(logo.width), height: toVw(logo.height) }}
              >
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  fill
                  className="object-contain"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            {bottomRowBrands.map((logo) => (
              <div
                key={logo.alt}
                className="relative flex items-center justify-center py-[1.25vw]"
                style={{ width: toVw(logo.width), height: toVw(logo.height) }}
              >
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  fill
                  className="object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
