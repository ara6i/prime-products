"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/app/shared/components/ui";
import { usePilotModal } from "./PilotModalContext";
import { LandingLanguageSwitcher, useLandingLanguage } from "@/app/landing/i18n";

type SectionLabelKey = "features" | "demo" | "pricing" | "integrations" | "contact";

type SectionLink = {
  href: string;
  external?: boolean;
} & (
  | { labelKey: SectionLabelKey; label?: never }
  | { label: string; labelKey?: never }
);

const SECTION_LINKS: SectionLink[] = [
  { labelKey: "features", href: "#features" },
  { labelKey: "demo", href: "/demo/products", external: true },
  { label: "Blog", href: "/blog" },
  { labelKey: "pricing", href: "#pricing" },
  { labelKey: "integrations", href: "#integrations" },
  { labelKey: "contact", href: "#contact" },
];
const CUSTOMER_DASHBOARD_PATH = "/customer/dashboard";
const ADMIN_LOGIN_PATH = "/admin/login";
const STAGING_HOSTS = new Set(["test-fe-9a7k.primestyleai.com"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function subscribeToHostname(): () => void {
  return () => undefined;
}

function getBrowserInternalSnapshot(): boolean {
  const hostname = window.location.hostname.toLowerCase();
  return STAGING_HOSTS.has(hostname) || LOCAL_HOSTS.has(hostname);
}

function useShowInternalAdminLogin(): boolean {
  return useSyncExternalStore(subscribeToHostname, getBrowserInternalSnapshot, () => false);
}

interface DeveloperNavbarProps {
  /** "demo" trims the navbar down to just the customer login action, right-aligned. */
  variant?: "default" | "demo";
  sectionHrefPrefix?: string;
}

export function DeveloperNavbar({ variant = "default", sectionHrefPrefix = "" }: DeveloperNavbarProps) {
  const isDemo = variant === "demo";
  const showAdminLogin = useShowInternalAdminLogin();
  const { open: openPilot } = usePilotModal();
  const { language, setLanguage, t } = useLandingLanguage();
  const resolveHref = (href: string) => href.startsWith("#") ? `${sectionHrefPrefix}${href}` : href;

  return (
    <nav className="sticky top-0 z-[70] flex items-center gap-[0.833vw] px-[3.125vw] py-[0.625vw] w-full mx-auto bg-white/80 backdrop-blur-md border-b border-text-primary/8">
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
          {SECTION_LINKS.map((l) => {
            const label = l.label ?? t.nav[l.labelKey];

            return l.external ? (
              <a
                key={l.href}
                href={resolveHref(l.href)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[0.833vw] leading-[1.625] text-black hover:text-[#1a6cff] transition-colors"
              >
                {label}
              </a>
            ) : (
              <Link
                key={l.href}
                href={resolveHref(l.href)}
                className="text-[0.833vw] leading-[1.625] text-black hover:text-[#1a6cff] transition-colors"
              >
                {label}
              </Link>
            );
          })}
        </div>
      )}

      <div className={`flex items-center gap-[1.25vw] ${isDemo ? "ml-auto" : ""}`}>
        {!isDemo && (
          <LandingLanguageSwitcher
            language={language}
            onLanguageChange={setLanguage}
          />
        )}
        {showAdminLogin ? (
          <Link
            href={ADMIN_LOGIN_PATH}
            className="text-[0.833vw] font-semibold leading-[1.354vw] text-text-body transition-colors hover:text-brand-blue whitespace-nowrap"
          >
            Admin Panel
          </Link>
        ) : null}
        <Button
          asChild
          variant="outline"
          size="default"
          className="h-[2.604vw] px-[1.15vw] text-[0.833vw] leading-[1.354vw] rounded-[52.083vw] whitespace-nowrap cursor-pointer border-brand-blue bg-white text-brand-blue hover:bg-brand-blue hover:text-white"
        >
          <Link href={CUSTOMER_DASHBOARD_PATH}>Join PrimeStyleAI</Link>
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
