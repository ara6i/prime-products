"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, Play, BookOpen, LayoutDashboard, ChevronDown } from "lucide-react";
import { Button } from "@/app/shared/components/ui";
import { cn } from "@/app/shared/lib/utils";

const NAV_LINKS = [
  { label: "Pricing", href: "/pricing" },
  { label: "Terms", href: "/terms" },
  { label: "Policy", href: "/privacy-policy" },
];

const DEVELOPER_ITEMS = [
  {
    title: "SDK in Action",
    icon: Play,
    href: "/demo/products",
    desc: "Try it on real products",
  },
  {
    title: "Documentation",
    icon: BookOpen,
    href: "/docs",
    desc: "Guides & API reference",
  },
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "https://preview.myaifitting.com/developer/dashboard/keys",
    desc: "Keys, billing & usage",
  },
];

const NAV_HEIGHT = 52;

interface DevItemsProps {
  onClose: () => void;
}

function DevItems({ onClose }: DevItemsProps) {
  return (
    <div className="ml-2 mt-0.5 flex flex-col">
      {DEVELOPER_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100">
              <Icon size={15} className="text-gray-500" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-900 leading-tight">{item.title}</p>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{item.desc}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function MobileNavbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [devExpanded, setDevExpanded] = useState(false);

  const isDevActive = pathname?.startsWith("/");

  const close = () => setOpen(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* ── Sticky nav bar ─────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-4 bg-white border-b border-gray-100"
        style={{ height: NAV_HEIGHT }}
      >
        <Link href="/" onClick={close}>
          <Image
            src="/images/landing/optimized/logo-navbar-transparent.webp"
            alt="PrimeStyleAI"
            width={56}
            height={52}
            className="object-contain h-[28px] w-auto"
          />
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            className="h-[34px] px-4 text-[13px] font-semibold rounded-full"
            asChild
          >
            <Link href="/auth">Try it Free</Link>
          </Button>
          <Button
            variant="icon"
            className="w-9 h-9 flex items-center justify-center flex-shrink-0"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open
              ? <X size={20} className="text-gray-800" />
              : <Menu size={20} className="text-gray-800" />}
          </Button>
        </div>
      </nav>

      {/* ── Backdrop ───────────────────────────────────────────────── */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/20 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        style={{ top: NAV_HEIGHT }}
        onClick={close}
      />

      {/* ── Slide-down menu panel ──────────────────────────────────── */}
      <div
        className={cn(
          "fixed left-0 right-0 z-50 bg-white shadow-xl transition-all duration-300 flex flex-col",
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-2 pointer-events-none"
        )}
        style={{ top: NAV_HEIGHT, maxHeight: `calc(100svh - ${NAV_HEIGHT}px)` }}
      >
        {/* Links area */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={close}
              className={cn(
                "flex items-center h-11 px-3 rounded-xl text-[15px] font-medium transition-colors",
                pathname === link.href
                  ? "text-brand-blue bg-brand-blue/5"
                  : "text-gray-900 hover:bg-gray-50"
              )}
            >
              {link.label}
            </Link>
          ))}

          {/* Developers — expandable */}
          <div>
            <Button
              variant="ghost"
              className={cn(
                "flex w-full items-center justify-between h-11 px-3 rounded-xl",
                "text-[15px] font-medium",
                isDevActive ? "text-brand-blue" : "text-gray-900"
              )}
              onClick={() => setDevExpanded((v) => !v)}
            >
              <span>Developers</span>
              <ChevronDown
                size={16}
                className={cn(
                  "text-gray-400 transition-transform duration-200",
                  devExpanded && "rotate-180"
                )}
              />
            </Button>
            {devExpanded && <DevItems onClose={close} />}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="flex-shrink-0 px-4 py-4 border-t border-gray-100">
          <Button
            variant="primary"
            className="w-full h-12 text-[15px] font-semibold rounded-2xl"
            asChild
          >
            <Link href="/auth" onClick={close}>
              Get Started Free
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}
