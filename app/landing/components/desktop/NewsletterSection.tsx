"use client";

import { Button } from "@/app/shared/components/ui";
import { useScrollFadeUp } from "@/app/landing/hooks/useScrollAnimation";
import { useLandingLanguage } from "@/app/landing/i18n";

interface NewsletterSectionProps {
  email: string;
  onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubscribe: () => void;
}

export function NewsletterSection({
  email,
  onEmailChange,
  onSubscribe,
}: NewsletterSectionProps) {
  const ref = useScrollFadeUp({ duration: 0.7 });
  const { translate } = useLandingLanguage();

  return (
    <div ref={ref} className="flex flex-col justify-center items-center gap-[1.25vw] rounded-[1.042vw] py-[1.25vw] px-[2.5vw]">
      <div className="flex flex-col items-center gap-[0.625vw]">
        <h3 className="text-[1.042vw] leading-[1.7] text-text-primary font-normal text-center">
          {translate("Stay Updated with Fashion Trends")}
        </h3>
        <p className="text-[0.729vw] leading-[1.57] text-text-body font-normal text-center">
          {translate("Get the latest styling tips, trend alerts, and exclusive offers delivered to your inbox.")}
        </p>
      </div>
      <div className="flex items-center gap-[0.625vw]">
        <input
          type="email"
          placeholder={translate("Enter your email")}
          value={email}
          onChange={onEmailChange}
          className="w-[18.75vw] h-[2.604vw] px-[0.833vw] rounded-[52.083vw] border border-input-border text-[0.833vw] leading-[1.625] text-text-primary placeholder:text-input-placeholder outline-none focus:border-brand-blue transition-colors bg-white"
        />
        <Button
          variant="outline"
          size="default"
          className="h-[2.604vw] px-[0.833vw] text-[0.833vw] leading-[1.354vw] rounded-[52.083vw]"
          onClick={onSubscribe}
        >
          {translate("Subscribe")}
        </Button>
      </div>
    </div>
  );
}
