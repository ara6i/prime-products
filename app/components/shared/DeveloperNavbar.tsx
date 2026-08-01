"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
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
  { label: "For Influencers", href: "/influencers" },
  { label: "For Merchants", href: "/merchants" },
  { labelKey: "features", href: "#features" },
  { labelKey: "demo", href: "/demo/products", external: true },
  { label: "Blog", href: "/blog" },
  { labelKey: "pricing", href: "#pricing" },
  { labelKey: "integrations", href: "#integrations" },
  { labelKey: "contact", href: "#contact" },
];
const CUSTOMER_LOGIN_PATH = "/customer/login";
const CUSTOMER_DASHBOARD_PATH = "/customer/dashboard";
const ADMIN_LOGIN_PATH = "/admin/login";
const PDP_STUDIO_PATH = "/pdp-studio";
const STAGING_HOSTS = new Set(["test-fe-9a7k.primestyleai.com"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function subscribeToHostname(): () => void {
  return () => undefined;
}

function getBrowserInternalSnapshot(): boolean {
  const hostname = window.location.hostname.toLowerCase();
  return STAGING_HOSTS.has(hostname) || LOCAL_HOSTS.has(hostname);
}

function getBrowserLocalSnapshot(): boolean {
  const hostname = window.location.hostname.toLowerCase();
  return STAGING_HOSTS.has(hostname) || LOCAL_HOSTS.has(hostname);
}

function useShowInternalAdminLogin(): boolean {
  return useSyncExternalStore(subscribeToHostname, getBrowserInternalSnapshot, () => false);
}

function useShowLocalTools(): boolean {
  return useSyncExternalStore(subscribeToHostname, getBrowserLocalSnapshot, () => false);
}

interface DeveloperNavbarProps {
  /** "demo" trims the navbar down to just the customer login action, right-aligned. */
  variant?: "default" | "demo";
  sectionHrefPrefix?: string;
}

export function DeveloperNavbar({ variant = "default", sectionHrefPrefix = "" }: DeveloperNavbarProps) {
  const isDemo = variant === "demo";
  const showAdminLogin = useShowInternalAdminLogin();
  const showLocalTools = useShowLocalTools();
  const { open: openPilot } = usePilotModal();
  const { language, setLanguage, t, translate } = useLandingLanguage();
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
        <LandingLanguageSwitcher
          language={language}
          onLanguageChange={setLanguage}
        />
        {showLocalTools ? (
          <div className="group relative">
            <button
              type="button"
              className="inline-flex h-[2.604vw] items-center gap-[0.35vw] rounded-[52.083vw] border border-brand-blue bg-white px-[1.15vw] text-[0.833vw] font-semibold leading-[1.354vw] text-brand-blue transition-colors hover:bg-brand-blue hover:text-white"
            >
              Dashboards
              <ChevronDown className="h-[0.9vw] w-[0.9vw] transition-transform group-hover:rotate-180" aria-hidden />
            </button>
            <div className="pointer-events-none absolute right-0 top-full z-[80] min-w-[10.5vw] pt-[0.45vw] opacity-0 transition duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
              <div className="rounded-[0.8vw] border border-gray-200 bg-white p-[0.35vw] shadow-xl shadow-black/10">
                <LocalToolLink href={CUSTOMER_LOGIN_PATH} label="Customer" />
                <LocalToolLink href={PDP_STUDIO_PATH} label="PDP Studio" />
                <LocalToolLink href={ADMIN_LOGIN_PATH} label="Admin" />
                <LocalToolLink href="/test-lab" label="Test Lab" />
              </div>
            </div>
          </div>
        ) : showAdminLogin ? (
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
          <Link href={CUSTOMER_DASHBOARD_PATH}>{translate("Join PrimeStyleAI")}</Link>
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

function LocalToolLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-[0.5vw] px-[0.75vw] py-[0.55vw] text-[0.78vw] font-semibold text-gray-900 transition-colors hover:bg-gray-50 hover:text-brand-blue"
    >
      {label}
    </Link>
  );
}
