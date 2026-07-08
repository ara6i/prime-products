"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { Button } from "@/app/shared/components/ui";
import { cn } from "@/app/shared/lib/utils";
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
const CUSTOMER_LOGIN_PATH = "/customer/login";
const CUSTOMER_DASHBOARD_PATH = "/customer/dashboard";
const ADMIN_LOGIN_PATH = "/admin/login";
const STAGING_HOSTS = new Set(["test-fe-9a7k.primestyleai.com"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

const NAV_HEIGHT = 64;

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

interface MobileDeveloperNavbarProps {
  /** "demo" trims the mobile nav to logo plus staging-only admin action. */
  variant?: "default" | "demo";
  sectionHrefPrefix?: string;
}

export function MobileDeveloperNavbar({ variant = "default", sectionHrefPrefix = "" }: MobileDeveloperNavbarProps) {
  const [open, setOpen] = useState(false);
  const [dashboardsOpen, setDashboardsOpen] = useState(false);
  const close = () => setOpen(false);
  const isDemo = variant === "demo";
  const showAdminLogin = useShowInternalAdminLogin();
  const showLocalTools = useShowLocalTools();
  const resolveHref = (href: string) => href.startsWith("#") ? `${sectionHrefPrefix}${href}` : href;
  const { language, setLanguage, t } = useLandingLanguage();

  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const html = document.documentElement;
    const prev = {
      bodyOverflow: body.style.overflow,
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
    };
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    return () => {
      body.style.overflow = prev.bodyOverflow;
      html.style.overflow = prev.htmlOverflow;
      html.style.overscrollBehavior = prev.htmlOverscroll;
    };
  }, [open]);

  return (
    <>
      {/* Spacer so content below flows under a fixed nav */}
      <div aria-hidden style={{ height: NAV_HEIGHT }} />
      <nav
        className="fixed left-0 right-0 top-0 z-[70] flex items-center justify-between px-4 bg-white/85 backdrop-blur-md border-b border-gray-100"
        style={{ height: NAV_HEIGHT }}
      >
        <Link href="/" onClick={close}>
          <Image
            src="/images/landing/optimized/logo-navbar-small.webp"
            alt="PrimeStyleAI"
            width={68}
            height={64}
            priority
            className="object-contain h-[52px] w-auto"
          />
        </Link>

        <div className="flex items-center gap-1.5">
          {showAdminLogin && !showLocalTools && (
            <Link
              href={ADMIN_LOGIN_PATH}
              className="hidden min-[390px]:inline-flex h-[34px] items-center rounded-full px-2.5 text-[11.5px] font-semibold text-text-body hover:text-brand-blue"
            >
              Admin Panel
            </Link>
          )}
          {!isDemo && (
            <LandingLanguageSwitcher
              language={language}
              onLanguageChange={setLanguage}
              compact
            />
          )}
          {!isDemo && (
            <Link
              href={CUSTOMER_DASHBOARD_PATH}
              className="hidden min-[430px]:inline-flex h-[34px] items-center rounded-full bg-brand-blue px-3 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark"
            >
              Join PrimeStyleAI
            </Link>
          )}
          {!isDemo && (
            <Button
              variant="icon"
              className="w-9 h-9 flex items-center justify-center flex-shrink-0"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
            >
              {open ? <X size={20} className="text-gray-800" /> : <Menu size={20} className="text-gray-800" />}
            </Button>
          )}
        </div>
      </nav>

      {!isDemo && (
        <>
          <div
            className={cn(
              "fixed inset-0 z-40 bg-black/20 transition-opacity duration-300",
              open ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            style={{ top: NAV_HEIGHT }}
            onClick={close}
          />

          <div
            className={cn(
              "fixed left-0 right-0 z-[70] bg-white shadow-xl transition-all duration-300 flex flex-col",
              open
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 -translate-y-2 pointer-events-none"
            )}
            style={{ top: NAV_HEIGHT, maxHeight: `calc(100svh - ${NAV_HEIGHT}px)` }}
          >
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {showLocalTools ? (
                <div className="mb-2 rounded-2xl border border-gray-200 bg-gray-50 p-2">
                  <button
                    type="button"
                    aria-expanded={dashboardsOpen}
                    onClick={() => setDashboardsOpen((value) => !value)}
                    className="flex h-11 w-full items-center justify-between rounded-xl px-3 text-[15px] font-semibold text-gray-900 transition-colors hover:bg-white"
                  >
                    Dashboards
                    <ChevronDown
                      className={cn("h-4 w-4 text-brand-blue transition-transform", dashboardsOpen ? "rotate-180" : "")}
                      aria-hidden
                    />
                  </button>
                  <div
                    className={cn(
                      "grid overflow-hidden transition-[grid-template-rows,opacity] duration-200",
                      dashboardsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="min-h-0">
                      <MobileLocalToolLink href={CUSTOMER_LOGIN_PATH} label="Customer" onClick={close} />
                      <MobileLocalToolLink href="/pdp-studio" label="PDP Studio" onClick={close} />
                      <MobileLocalToolLink href={ADMIN_LOGIN_PATH} label="Admin" onClick={close} />
                      <MobileLocalToolLink href="/test-lab" label="Test Lab" onClick={close} />
                    </div>
                  </div>
                </div>
              ) : showAdminLogin ? (
                <Link
                  href={ADMIN_LOGIN_PATH}
                  onClick={close}
                  className="flex items-center h-11 px-3 rounded-xl text-[15px] font-medium text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  Admin Login
                </Link>
              ) : null}

              {SECTION_LINKS.map((link) => {
                const label = link.label ?? t.nav[link.labelKey];

                return link.external ? (
                  <a
                    key={link.href}
                    href={resolveHref(link.href)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={close}
                    className="flex items-center h-11 px-3 rounded-xl text-[15px] font-medium text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    {label}
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    href={resolveHref(link.href)}
                    onClick={close}
                    className="flex items-center h-11 px-3 rounded-xl text-[15px] font-medium text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    {label}
                  </Link>
                );
              })}
            </div>

            <div className="flex-shrink-0 px-4 py-4 border-t border-gray-100">
              <div className="grid grid-cols-1 gap-2">
                <Button
                  asChild
                  variant="outline"
                  className="w-full h-11 text-[14px] font-semibold rounded-2xl cursor-pointer border-brand-blue bg-white text-brand-blue hover:bg-brand-blue hover:text-white"
                >
                  <Link href={CUSTOMER_DASHBOARD_PATH} onClick={close}>
                    Join PrimeStyleAI
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function MobileLocalToolLink({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex h-11 items-center rounded-xl px-3 text-[15px] font-medium text-gray-900 transition-colors hover:bg-white"
    >
      {label}
    </Link>
  );
}
