import Link from "next/link";
import { Button } from "@/app/shared/components/ui";
import { MobileTryOnSection } from "./try-on";

export function HeroSection() {
  return (
    <section className="flex flex-col items-center gap-6 px-4 pb-10 pt-6 text-center">
      <div className="flex flex-col gap-3">
        <h1 className="text-[36px] font-normal leading-[1.25] text-text-primary">
          Build Outfits that Actually Fit you
        </h1>
        <p className="text-[20px] leading-[34px] text-text-body">
          An AI-powered outfit builder that helps you create, try, and style outfits
        </p>
      </div>

      <div className="flex flex-col items-center gap-1">
        <Button variant="primary" size="default" asChild>
          <Link href="/auth">Try it Free</Link>
        </Button>
        <p className="text-base font-bold leading-[26px] text-tab-active">
          Get 100 free tokens — no credit card required
        </p>
      </div>

      <MobileTryOnSection />
    </section>
  );
}
