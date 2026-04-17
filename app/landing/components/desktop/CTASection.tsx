"use client";

import Link from "next/link";
import { Button } from "@/app/shared/components/ui";
import { useScrollScale } from "@/app/landing/hooks/useScrollAnimation";

export function CTASection() {
  const ref = useScrollScale({ duration: 0.9 });

  return (
    <div
      ref={ref}
      className="rounded-[1.042vw] flex flex-col justify-center items-center gap-[1.25vw] py-[1.667vw] self-stretch"
      style={{
        background: "linear-gradient(134deg, #2154EF 1%, #133089 99%)",
      }}
    >
      <h2 className="text-[1.667vw] leading-[1.5] text-white font-normal">
        Start building outfits you&apos;ll actually love
      </h2>
      <p className="text-[0.833vw] leading-[1.625] text-white font-normal text-center">
        Try real outfits from trusted brands,
        <br />
        see how they look on you, and make confident choices — before you buy.
      </p>
      <Button
        variant="tunal"
        size="2xl"
        className="h-[3.021vw] px-[1.25vw] text-[1.042vw] leading-[1.771vw] rounded-[52.083vw]"
        asChild
      >
        <Link href="/auth">Try it Free</Link>
      </Button>
    </div>
  );
}
