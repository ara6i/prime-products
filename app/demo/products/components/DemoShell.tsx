"use client";

import { DeveloperNavbar } from "@/app/components/shared/DeveloperNavbar";
import { MobileDeveloperNavbar } from "@/app/components/shared/MobileDeveloperNavbar";
import { PilotModalProvider } from "@/app/components/shared/PilotModalContext";
import { DemoFooter } from "@/app/demo/components/DemoFooter";

interface DemoShellProps {
  isLoggedIn: boolean;
  children: React.ReactNode;
}

export function DemoShell({ children }: DemoShellProps) {
  return (
    <PilotModalProvider>
      <div className="flex flex-col w-full min-h-screen bg-white text-text-primary">
        <div className="hidden lg:contents"><DeveloperNavbar variant="demo" /></div>
        <div className="contents lg:hidden"><MobileDeveloperNavbar variant="demo" /></div>
        <div className="flex-1">{children}</div>
        <DemoFooter />
      </div>
    </PilotModalProvider>
  );
}
