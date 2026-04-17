"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/app/shared/components/ui";
import { usePilotModal } from "./PilotModalContext";

const SECTION_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Demo", href: "/demo/products" },
  { label: "Integrations", href: "#integrations" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "/docs" },
];

export function DeveloperNavbar() {
  const { open: openPilot } = usePilotModal();
  return (
    <nav className="sticky top-0 z-40 flex items-center gap-[0.833vw] px-[3.125vw] py-[0.625vw] w-full mx-auto bg-white/80 backdrop-blur-md border-b border-text-primary/8">
      <Link href="/">
        <Image
          src="/images/landing/logo-navbar-transparent.png"
          alt="PrimeStyleAI"
          width={95}
          height={89}
          className="object-contain w-[4.948vw] h-[4.635vw]"
        />
      </Link>

      <div className="flex items-center gap-[1.5vw] flex-1 ml-[1vw]">
        {SECTION_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-[0.833vw] leading-[1.625] text-black hover:text-[#1a6cff] transition-colors"
          >
            {l.label}
          </Link>
        ))}
      </div>

      <Button
        variant="primary"
        size="default"
        onClick={openPilot}
        className="h-[2.604vw] px-[1.25vw] text-[0.833vw] leading-[1.354vw] rounded-[52.083vw] whitespace-nowrap cursor-pointer"
      >
        Apply for free pilot
      </Button>
    </nav>
  );
}
