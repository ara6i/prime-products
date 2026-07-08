"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/app/shared/lib/utils";

const NAV_HEIGHT = 64;

const MENU_LINKS = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/#features" },
  { label: "Demo", href: "/demo/products", external: true },
  { label: "Integrations", href: "/#integrations" },
  { label: "Contact", href: "/#contact" },
];

export function LoginMobileHeader() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const html = document.documentElement;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = html.style.overflow;

    body.style.overflow = "hidden";
    html.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousBodyOverflow;
      html.style.overflow = previousHtmlOverflow;
    };
  }, [open]);

  return (
    <>
      <div aria-hidden style={{ height: NAV_HEIGHT }} />
      <header
        className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-gray-100 bg-white/85 px-4 backdrop-blur-md"
        style={{ height: NAV_HEIGHT }}
      >
        <Link href="/" onClick={close} aria-label="Go to PrimeStyleAI home">
          <Image
            src="/images/landing/optimized/logo-navbar-transparent.webp"
            alt="PrimeStyleAI"
            width={68}
            height={64}
            className="h-[52px] w-auto object-contain"
            priority
          />
        </Link>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-800 transition-colors hover:bg-gray-50"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
        </button>
      </header>

      <div
        className={cn(
          "fixed inset-x-0 z-40 bg-black/20 transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        style={{ bottom: 0, top: NAV_HEIGHT }}
        onClick={close}
      />

      <nav
        className={cn(
          "fixed left-0 right-0 z-50 flex flex-col bg-white shadow-xl transition-all duration-300",
          open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
        )}
        style={{ top: NAV_HEIGHT, maxHeight: `calc(100svh - ${NAV_HEIGHT}px)` }}
        aria-label="Join PrimeStyleAI mobile menu"
      >
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {MENU_LINKS.map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className="flex h-11 items-center rounded-xl px-3 text-[15px] font-medium text-gray-900 transition-colors hover:bg-gray-50"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className="flex h-11 items-center rounded-xl px-3 text-[15px] font-medium text-gray-900 transition-colors hover:bg-gray-50"
              >
                {link.label}
              </Link>
            ),
          )}
        </div>
      </nav>
    </>
  );
}
