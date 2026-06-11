"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/app/shared/components/ui";
import { usePilotModal } from "./PilotModalContext";
import { LandingLanguageSwitcher, useLandingLanguage } from "@/app/landing/i18n";

type SectionLabelKey = "features" | "demo" | "integrations" | "contact";

const SECTION_LINKS: Array<{
  labelKey: SectionLabelKey;
  href: string;
  external?: boolean;
}> = [
  { labelKey: "features", href: "#features" },
  { labelKey: "demo", href: "/demo/products", external: true },
  { labelKey: "integrations", href: "#integrations" },
  { labelKey: "contact", href: "#contact" },
];
const CUSTOMER_LOGIN_PATH = "/customer/login";
const ADMIN_LOGIN_PATH = "/admin/login";
const STAGING_HOSTS = new Set(["test-fe-9a7k.primestyleai.com"]);

function subscribeToHostname(): () => void {
  return () => undefined;
}

function getBrowserStagingSnapshot(): boolean {
  return STAGING_HOSTS.has(window.location.hostname.toLowerCase());
}

function useShowStagingAdminLogin(): boolean {
  return useSyncExternalStore(subscribeToHostname, getBrowserStagingSnapshot, () => false);
}

interface DeveloperNavbarProps {
  /** "demo" trims the navbar down to just the customer login action, right-aligned. */
  variant?: "default" | "demo";
}

export function DeveloperNavbar({ variant = "default" }: DeveloperNavbarProps) {
  const isDemo = variant === "demo";
  const showAdminLogin = useShowStagingAdminLogin();
  const { open: openPilot } = usePilotModal();
  const { language, setLanguage, t } = useLandingLanguage();

  return (
    <nav className="sticky top-0 z-40 flex items-center gap-[0.833vw] px-[3.125vw] py-[0.625vw] w-full mx-auto bg-white/80 backdrop-blur-md border-b border-text-primary/8">
      <Link href="/">
        <Image
          src="/images/landing/optimized/logo-navbar-small.webp"
          alt="PrimeStyleAI"
          width={112}
          height={105}
          priority
          className="object-contain w-[5.833vw] h-[5.469vw]"
        />
      </Link>

      {!isDemo && (
        <div className="flex items-center gap-[1.5vw] flex-1 ml-[1vw]">
          {SECTION_LINKS.map((l) =>
            l.external ? (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[0.833vw] leading-[1.625] text-black hover:text-[#1a6cff] transition-colors"
              >
                {t.nav[l.labelKey]}
              </a>
            ) : (
              <Link
                key={l.href}
                href={l.href}
                className="text-[0.833vw] leading-[1.625] text-black hover:text-[#1a6cff] transition-colors"
              >
                {t.nav[l.labelKey]}
              </Link>
            )
          )}
        </div>
      )}

      <div className={`flex items-center gap-[1.25vw] ${isDemo ? "ml-auto" : ""}`}>
        {!isDemo && (
          <LandingLanguageSwitcher
            language={language}
            onLanguageChange={setLanguage}
          />
        )}
        {showAdminLogin && (
          <Link
            href={ADMIN_LOGIN_PATH}
            className="text-[0.833vw] font-semibold leading-[1.354vw] text-text-body transition-colors hover:text-brand-blue whitespace-nowrap"
          >
            Admin Panel
          </Link>
        )}
        <Button
          asChild
          variant="outline"
          size="default"
          className="h-[2.604vw] px-[1.15vw] text-[0.833vw] leading-[1.354vw] rounded-[52.083vw] whitespace-nowrap cursor-pointer border-brand-blue bg-white text-brand-blue hover:bg-brand-blue hover:text-white"
        >
          <Link href={CUSTOMER_LOGIN_PATH}>{t.nav.customerLogin}</Link>
        </Button>
        <Button
          variant="primary"
          size="default"
          type="button"
          onClick={openPilot}
          className="h-[2.604vw] px-[1.15vw] text-[0.833vw] leading-[1.354vw] rounded-[52.083vw] whitespace-nowrap cursor-pointer bg-brand-blue text-white hover:bg-brand-blue-dark hover:text-white"
        >
          {t.nav.applyPilot}
        </Button>
      </div>
    </nav>
  );
}
