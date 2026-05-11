"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { Button } from "@/app/shared/components/ui";
import { cn } from "@/app/shared/lib/utils";
import { usePilotModal } from "./PilotModalContext";

const SECTION_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Demo", href: "/demo/products", external: true },
  { label: "Integrations", href: "#integrations" },
];

const NAV_HEIGHT = 64;

interface MobileDeveloperNavbarProps {
  /** "demo" trims the mobile nav to just Docs + Apply pilot inline — no
   *  hamburger menu needed since there's nothing else to show. */
  variant?: "default" | "demo";
}

export function MobileDeveloperNavbar({ variant = "default" }: MobileDeveloperNavbarProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const { open: openPilot } = usePilotModal();
  const isDemo = variant === "demo";
  const handlePilotClick = () => {
    close();
    openPilot();
  };

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
        className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-4 bg-white/85 backdrop-blur-md border-b border-gray-100"
        style={{ height: NAV_HEIGHT }}
      >
        <Link href="/" onClick={close}>
          <Image
            src="/images/landing/logo-navbar-transparent.png"
            alt="PrimeStyleAI"
            width={56}
            height={52}
            className="object-contain h-[44px] w-auto"
          />
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={handlePilotClick}
            className="h-[34px] px-4 text-[12.5px] font-semibold rounded-full whitespace-nowrap cursor-pointer"
          >
            Apply for free pilot
          </Button>
          {!isDemo && (
            <Button
              variant="icon"
              className="w-9 h-9 flex items-center justify-center flex-shrink-0"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
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
              "fixed left-0 right-0 z-50 bg-white shadow-xl transition-all duration-300 flex flex-col",
              open
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 -translate-y-2 pointer-events-none"
            )}
            style={{ top: NAV_HEIGHT, maxHeight: `calc(100svh - ${NAV_HEIGHT}px)` }}
          >
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {SECTION_LINKS.map((link) =>
                link.external ? (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={close}
                    className="flex items-center h-11 px-3 rounded-xl text-[15px] font-medium text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={close}
                    className="flex items-center h-11 px-3 rounded-xl text-[15px] font-medium text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    {link.label}
                  </Link>
                )
              )}
            </div>

            <div className="flex-shrink-0 px-4 py-4 border-t border-gray-100">
              <Button
                variant="primary"
                onClick={handlePilotClick}
                className="w-full h-12 text-[15px] font-semibold rounded-2xl cursor-pointer"
              >
                Apply for free pilot
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
