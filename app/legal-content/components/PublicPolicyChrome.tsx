"use client";

import type { ReactNode } from "react";
import { DeviceSwitch } from "@/app/shared/components/DeviceSwitch";
import { DeveloperNavbar } from "@/app/components/shared/DeveloperNavbar";
import { MobileDeveloperNavbar } from "@/app/components/shared/MobileDeveloperNavbar";
import { PilotModalProvider } from "@/app/components/shared/PilotModalContext";
import { Footer as DesktopFooter } from "@/app/landing/components/desktop/Footer";
import { Footer as MobileFooter } from "@/app/landing/components/mobile/Footer";

interface PublicPolicyChromeProps {
  children: ReactNode;
}

export function PublicPolicyChrome({ children }: PublicPolicyChromeProps) {
  return (
    <PilotModalProvider>
      <DeviceSwitch
        desktop={(
          <div className="min-h-screen bg-[#F5F9FF] text-text-primary [overflow-x:clip]">
            <DeveloperNavbar />
            {children}
            <div className="flex flex-col items-center gap-[1.25vw] bg-brand-blue-pale px-[7.292vw] py-[2.5vw]">
              <DesktopFooter />
            </div>
          </div>
        )}
        mobile={(
          <div className="min-h-screen bg-[#F5F9FF] text-text-primary [overflow-x:clip]">
            <MobileDeveloperNavbar sectionHrefPrefix="/" />
            {children}
            <div className="flex flex-col gap-6 bg-brand-blue-pale px-4 py-10">
              <MobileFooter />
            </div>
          </div>
        )}
      />
    </PilotModalProvider>
  );
}
