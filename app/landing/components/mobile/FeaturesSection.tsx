import Image from "next/image";
import { CheckroomIcon, ApparelIcon, ShoppingBagIcon, GenerateIcon } from "@/app/shared/components/icons";

const FEATURES = [
  {
    icon: CheckroomIcon,
    iconColor: "var(--brand-blue-light)",
    bg: "bg-brand-blue-pale",
    title: "Freedom without limitations",
    description: "Mix items across brands and styles — no locked looks, no forced paths.",
    image: "/images/landing/feature-catalog-screenshots.png",
    imageAlt: "Catalog screenshots",
    imageWidth: 320,
    imageHeight: 180,
  },
  {
    icon: ApparelIcon,
    iconColor: "var(--brand-blue-pale)",
    bg: "bg-landing-blue-section-bg",
    title: "Confidence over guesswork",
    description: "See results before buying, so you return less and choose better.",
    image: "/images/landing/feature-outfit-preview.png",
    imageAlt: "Outfit preview with model",
    imageWidth: 240,
    imageHeight: 200,
  },
  {
    icon: ShoppingBagIcon,
    iconColor: "var(--text-primary)",
    bg: "bg-catalog-bg",
    title: "Real products, not placeholders",
    description: "Every outfit is built from real, trusted fashion brands.",
    image: "/images/landing/feature-brand-logos.png",
    imageAlt: "Trusted brand logos",
    imageWidth: 300,
    imageHeight: 60,
  },
  {
    icon: GenerateIcon,
    iconColor: "var(--weather-pill-divider)",
    bg: "bg-weather-pill-bg",
    title: "Try-on that feels realistic",
    description: "AI-powered visuals that help you understand fit and style on you.",
    image: "/images/landing/feature-ai-stylist.png",
    imageAlt: "AI Stylist conversation interface",
    imageWidth: 300,
    imageHeight: 180,
  },
] as const;

export function FeaturesSection() {
  return (
    <section className="flex flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h2 className="text-[22px] font-semibold leading-[1.4] text-text-primary">
          What Makes Our Platform Unique
        </h2>
        <p className="text-sm leading-[1.57] text-text-body">
          From real-brand catalogs to AI-powered try-on, each feature is designed to give you control, confidence, and a seamless experience.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {FEATURES.map((feat) => {
          const Icon = feat.icon;
          return (
            <div
              key={feat.title}
              className={`flex flex-col gap-4 overflow-hidden rounded-[16px] p-5 ${feat.bg}`}
            >
              <Icon size={32} color={feat.iconColor} />
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-semibold leading-[1.5] text-text-primary">
                  {feat.title}
                </h3>
                <p className="text-sm leading-[1.57] text-text-body">{feat.description}</p>
              </div>
              <div className="flex justify-center overflow-hidden rounded-[12px]">
                <Image
                  src={feat.image}
                  alt={feat.imageAlt}
                  width={feat.imageWidth}
                  height={feat.imageHeight}
                  className="w-full object-contain"
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
