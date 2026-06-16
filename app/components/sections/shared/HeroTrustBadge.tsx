import Image from "next/image";

interface HeroTrustBadgeProps {
  className?: string;
  imageClassName?: string;
}

export function HeroTrustBadge({ className = "", imageClassName = "" }: HeroTrustBadgeProps) {
  return (
    <div className={`flex justify-center ${className}`}>
      <Image
        src="/images/landing/as-seen-on-premium-badge.png"
        alt="As seen on NBC, ABC, CBS and FOX"
        width={1016}
        height={402}
        sizes="(max-width: 767px) 300px, 440px"
        className={`h-auto w-[300px] max-w-full select-none sm:w-[380px] lg:w-[440px] ${imageClassName}`}
      />
    </div>
  );
}
