import { Button } from "@/app/shared/components/ui";
import { useLandingLanguage } from "@/app/landing/i18n";

interface NewsletterSectionProps {
  email: string;
  onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubscribe: () => void;
}

export function NewsletterSection({ email, onEmailChange, onSubscribe }: NewsletterSectionProps) {
  const { translate } = useLandingLanguage();

  return (
    <div className="flex flex-col items-center gap-4 rounded-[16px] px-4 py-6 text-center">
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-normal leading-[1.5] text-text-primary">
          {translate("Stay Updated with Fashion Trends")}
        </h3>
        <p className="text-sm leading-[1.57] text-text-body">
          {translate("Get the latest styling tips and exclusive offers delivered to your inbox.")}
        </p>
      </div>
      <div className="flex w-full flex-col gap-2">
        <input
          type="email"
          placeholder={translate("Enter your email")}
          value={email}
          onChange={onEmailChange}
          className="h-11 w-full rounded-full border border-input-border bg-white px-4 text-sm text-text-primary placeholder:text-input-placeholder outline-none focus:border-brand-blue"
        />
        <Button
          variant="outline"
          className="h-12 w-full rounded-full px-6 text-[15px] font-semibold"
          onClick={onSubscribe}
        >
          {translate("Subscribe")}
        </Button>
      </div>
    </div>
  );
}
