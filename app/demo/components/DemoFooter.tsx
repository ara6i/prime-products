"use client";

import { Footer as DesktopFooter } from "@/app/landing/components/desktop/Footer";
import { Footer as MobileFooter } from "@/app/landing/components/mobile/Footer";

export function DemoFooter() {
  return (
    <>
      <div
        data-testid="footer-area"
        className="hidden flex-col items-center gap-[1.25vw] bg-brand-blue-pale px-[7.292vw] py-[2.5vw] lg:flex"
      >
        <DesktopFooter />
      </div>
      <div className="flex flex-col gap-6 bg-brand-blue-pale px-4 py-10 lg:hidden">
        <MobileFooter />
      </div>
    </>
  );
}
