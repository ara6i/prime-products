"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/app/shared/lib/utils";

const TABS = [
  { href: "/try-on-test", label: "Try-On" },
  { href: "/try-on-test/sizing-lab", label: "AI Sizing Lab" },
  { href: "/try-on-test/capacity-lab", label: "Capacity Lab" },
  { href: "/try-on-test/ai-stylist", label: "AI Stylist" },
  { href: "/try-on-test/pdp-studio", label: "PDP Studio" },
] as const;

export function TabNav() {
  const pathname = usePathname();
  return (
    <nav className="mx-auto w-full max-w-6xl px-6 pt-6">
      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
        {TABS.map((t) => {
          const active =
            t.href === "/try-on-test"
              ? pathname === "/try-on-test"
              : pathname?.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                active
                  ? "bg-brand-blue text-white"
                  : "text-text-secondary hover:text-text-primary hover:bg-gray-50",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
