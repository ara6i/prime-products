"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/app/shared/lib/utils";
import {
  DashboardIcon,
  ShoppingBagIcon,
} from "@/app/shared/components/icons";

const items = [
  { href: "/admin", label: "Overview", icon: DashboardIcon, match: (p: string) => p === "/admin" },
  { href: "/admin/stores", label: "Stores", icon: ShoppingBagIcon, match: (p: string) => p.startsWith("/admin/stores") },
];

interface Props {
  title: string;
  subtitle?: string;
}

export function AdminMobileHeader({ title, subtitle }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-admin-surface-card border-b border-admin-border px-4 h-14">
        <Link href="/admin" className="flex items-center gap-2">
          <Image
            src="/images/landing/optimized/logo-navbar-transparent.webp"
            alt="PrimeStyleAI"
            width={95}
            height={89}
            className="object-contain w-8 h-[30px]"
            priority
          />
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold text-text-primary">PrimeStyle</span>
            <span className="text-[10px] font-medium text-brand-blue tracking-widest uppercase">
              Admin
            </span>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle admin navigation"
          aria-expanded={open}
          className="p-2 rounded-md hover:bg-admin-row-hover"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path d="M6 6l12 12M6 18L18 6" />
            ) : (
              <path d="M3 6h18M3 12h18M3 18h18" />
            )}
          </svg>
        </button>
      </header>

      {open && (
        <nav className="lg:hidden border-b border-admin-border bg-admin-surface-card flex flex-col">
          {items.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium border-b border-admin-border last:border-b-0",
                  active
                    ? "bg-brand-blue text-white"
                    : "text-text-body hover:bg-admin-row-hover",
                )}
              >
                <Icon size={18} color={active ? "#FFFFFF" : "currentColor"} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}

      <div className="lg:hidden px-4 pt-5 pb-3">
        <h1 className="text-xl font-semibold text-text-primary tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-text-hint mt-1">{subtitle}</p>}
      </div>
    </>
  );
}
