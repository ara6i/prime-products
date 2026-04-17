"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { Button } from "@/app/shared/components/ui";
import { TryOnSection } from "./try-on";

export function HeroSection() {
  const headlineRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const tryOnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    if (headlineRef.current) {
      gsap.set(headlineRef.current.children, { opacity: 0, y: 30 });
      tl.to(headlineRef.current.children, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
      });
    }

    if (ctaRef.current) {
      gsap.set(ctaRef.current, { opacity: 0, y: 20 });
      tl.to(
        ctaRef.current,
        { opacity: 1, y: 0, duration: 0.6 },
        "-=0.4",
      );
    }

    if (tryOnRef.current) {
      gsap.set(tryOnRef.current, { opacity: 0, y: 30 });
      tl.to(
        tryOnRef.current,
        { opacity: 1, y: 0, duration: 0.8 },
        "-=0.3",
      );
    }
  }, []);

  return (
    <section className="flex flex-col items-center gap-[1.25vw] max-w-[62.5vw] mx-auto pt-[2.5vw] pb-[3.333vw]">
      <div ref={headlineRef} className="flex flex-col items-center gap-[0.625vw] text-center">
        <h1 className="text-[2.708vw] leading-[1.17] text-text-primary font-normal">
          Build Outfits that Actually Fit you
        </h1>
        <p className="text-[1.042vw] leading-[1.7] text-text-body">
          An AI-powered outfit builder that helps you create, try, and style
          outfits
        </p>
      </div>

      <div ref={ctaRef} className="flex flex-col items-center gap-[0.208vw] w-full">
        <Button
          variant="primary"
          size="2xl"
          className="h-[3.021vw] px-[1.25vw] text-[1.042vw] leading-[1.771vw] rounded-[52.083vw]"
          asChild
        >
          <Link href="/auth">Try it Free</Link>
        </Button>
        <p className="text-[0.833vw] leading-[1.625] text-tab-active">
          Get 100 free tokens — no credit card required
        </p>
      </div>

      <div ref={tryOnRef}>
        <TryOnSection />
      </div>
    </section>
  );
}
