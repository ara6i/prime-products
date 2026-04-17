import Image from "next/image";

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

const BRAND_ROWS: string[][] = [
  ["Lole", "Bloomingdale's"],
  ["PatBo", "Greg Norman", "Brand"],
  ["Fleur Du Mal", "HUK"],
  ["ShopSimon", "David's Bridal"],
  ["Men's Wearhouse"],
];

function BrandRow({ logos }: { logos: BrandLogo[] }) {
  return (
    <div className="flex w-full items-center justify-center gap-6">
      {logos.map((logo) => (
        <Image
          key={logo.alt}
          src={logo.src}
          alt={logo.alt}
          width={Math.round(logo.width * 0.55)}
          height={Math.round(logo.height * 0.55)}
          className="object-contain opacity-80"
        />
      ))}
    </div>
  );
}

export function BrandsSection({ brandLogos, mediaLogos }: BrandsSectionProps) {
  const logosByAlt = Object.fromEntries(brandLogos.map((l) => [l.alt, l]));

  const rows = BRAND_ROWS.map((alts) =>
    alts.map((alt) => logosByAlt[alt]).filter(Boolean),
  );

  return (
    <section className="relative flex flex-col gap-10 overflow-hidden px-7 py-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{ backgroundImage: "url('/images/landing/brands-bg-pattern.png')", backgroundSize: "auto" }}
      />

      <h2 className="text-center text-[32px] font-bold leading-[48px] text-text-primary">
        Try on outfits from trusted brands
      </h2>

      <div className="flex items-center justify-center gap-4">
        <Image
          src="/images/landing/arc-left.svg"
          alt=""
          width={48}
          height={187}
          className="object-contain"
        />
        <div className="flex flex-col items-center gap-2">
          <span className="text-xl font-bold text-text-primary">As seen on</span>
          <div className="flex items-center gap-2">
            {mediaLogos.map((logo) => (
              <Image
                key={logo.alt}
                src={logo.src}
                alt={logo.alt}
                width={50}
                height={50}
                className="object-contain"
              />
            ))}
          </div>
          <span className="text-xl font-bold text-text-primary">
            + over <span className="text-brand-blue">250 news outlets</span>
          </span>
        </div>
        <Image
          src="/images/landing/arc-right.svg"
          alt=""
          width={48}
          height={187}
          className="object-contain"
        />
      </div>

      <div className="flex w-full flex-col items-center gap-6">
        {rows.map((row, idx) => (
          <BrandRow key={idx} logos={row} />
        ))}
      </div>
    </section>
  );
}
