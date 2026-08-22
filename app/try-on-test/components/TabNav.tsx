"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/app/shared/lib/utils";

const TABS = [
  { href: "/try-on-test", label: "Try-On" },
  { href: "/try-on-test/sizing-lab", label: "AI Sizing Lab" },
  { href: "/try-on-test/sdk-wear-mesh", label: "SDK · WEAR Mesh" },
  { href: "/try-on-test/wear-photo-test", label: "WEAR Sizing Lab" },
  { href: "/try-on-test/wear-cpu-progress", label: "WEAR CPU Progress" },
  { href: "/try-on-test/wear-everything", label: "WEAR Everything" },
  { href: "/try-on-test/wear-mesh-overlay", label: "WEAR Mesh Match" },
  { href: "/try-on-test/wear-front-side-proof", label: "Front + Side Proof" },
  { href: "/try-on-test/model-forge", label: "Model Forge" },
  { href: "/try-on-test/capacity-lab", label: "Capacity Lab" },
  { href: "/try-on-test/ai-stylist", label: "AI Stylist" },
  { href: "/try-on-test/pdp-studio", label: "PDP Studio" },
] as const;

export function TabNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Test Lab" className="mx-auto w-full max-w-6xl px-6 pt-6">
      <div className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="inline-flex min-w-max rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
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
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-blue text-white"
                    : "text-text-secondary hover:bg-gray-50 hover:text-text-primary",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
