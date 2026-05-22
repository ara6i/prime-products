"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/app/shared/lib/utils";
import {
  DashboardIcon,
  ShoppingBagIcon,
  LogoutIcon,
} from "@/app/shared/components/icons";
import {
  TrendingUp,
  Package,
  Ruler,
  Users,
  Boxes,
  FlaskConical,
  FileText,
} from "lucide-react";
import { logoutAction } from "@/app/admin/login/actions";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string; className?: string; strokeWidth?: number }>;
  match: (pathname: string) => boolean;
}

const primaryNavItems: NavItem[] = [
  { href: "/admin", label: "Overview", icon: DashboardIcon, match: (p) => p === "/admin" },
  { href: "/admin/stores", label: "Stores", icon: ShoppingBagIcon, match: (p) => p.startsWith("/admin/stores") },
  { href: "/admin/conversion", label: "Conversion", icon: TrendingUp, match: (p) => p.startsWith("/admin/conversion") },
  { href: "/admin/returns", label: "Returns", icon: Package, match: (p) => p.startsWith("/admin/returns") },
  { href: "/admin/size-alignment", label: "Size Alignment", icon: Ruler, match: (p) => p.startsWith("/admin/size-alignment") },
  { href: "/admin/user-behavior", label: "User Behavior", icon: Users, match: (p) => p.startsWith("/admin/user-behavior") },
  { href: "/admin/products", label: "Products", icon: Boxes, match: (p) => p.startsWith("/admin/products") },
];

const secondaryNavItems: NavItem[] = [
  { href: "/admin/ab-tests", label: "A/B Tests", icon: FlaskConical, match: (p) => p.startsWith("/admin/ab-tests") },
  { href: "/admin/reports", label: "Reports", icon: FileText, match: (p) => p.startsWith("/admin/reports") },
];

interface Props {
  adminName?: string;
}

function renderNavItem(item: NavItem, pathname: string) {
  const Icon = item.icon;
  const active = item.match(pathname);
  return (
    <Link
      key={item.href}
      href={item.href}
      data-active={active}
      className={cn(
        "group flex items-center gap-[var(--spacing-admin-gap-md)]",
        "px-[var(--spacing-admin-gap-md)] py-[0.521vw] rounded-[0.417vw]",
        "text-admin-sm font-medium transition-all duration-150",
        "data-[active=false]:text-text-body data-[active=false]:hover:bg-admin-row-hover data-[active=false]:hover:text-text-primary",
        "data-[active=true]:bg-brand-blue data-[active=true]:text-white data-[active=true]:shadow-sm",
      )}
    >
      <Icon
        size={18}
        strokeWidth={1.8}
        className="!w-[0.938vw] !h-[0.938vw] shrink-0"
        color={active ? "#FFFFFF" : "currentColor"}
      />
      <span>{item.label}</span>
    </Link>
  );
}

export function AdminSidebar({ adminName }: Props) {
  const pathname = usePathname();
  const displayName = adminName || "Admin";
  const initials = displayName
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className="hidden lg:flex fixed left-0 top-0 h-screen flex-col bg-admin-surface-sidebar border-r border-admin-border z-20"
      style={{ width: "var(--spacing-admin-sidebar)" }}
    >
      <Link
        href="/admin"
        className="flex items-center gap-[var(--spacing-admin-gap-md)] px-[var(--spacing-admin-content-x)] py-[1.25vw] border-b border-admin-border"
      >
        <Image
          src="/images/landing/optimized/logo-navbar-transparent.webp"
          alt="PrimeStyleAI"
          width={95}
          height={89}
          className="object-contain w-[2.5vw] h-[2.344vw] shrink-0"
          priority
        />
        <div className="flex flex-col leading-tight">
          <span className="text-admin-base font-semibold text-text-primary">PrimeStyle</span>
          <span className="text-admin-xs font-medium text-brand-blue tracking-widest uppercase">
            Admin
          </span>
        </div>
      </Link>

      <div className="flex-1 overflow-y-auto">
        <div className="px-[var(--spacing-admin-gap-md)] pt-[var(--spacing-admin-gap-lg)] pb-[var(--spacing-admin-gap-sm)]">
          <span className="text-[0.573vw] font-semibold tracking-[0.08em] text-text-hint uppercase">
            Decision Engine
          </span>
        </div>

        <nav className="flex flex-col gap-[0.208vw] px-[var(--spacing-admin-gap-md)]">
          {primaryNavItems.map((item) => renderNavItem(item, pathname))}
        </nav>

        <div className="px-[var(--spacing-admin-gap-md)] pt-[var(--spacing-admin-gap-lg)] pb-[var(--spacing-admin-gap-sm)]">
          <span className="text-[0.573vw] font-semibold tracking-[0.08em] text-text-hint uppercase">
            Tools
          </span>
        </div>

        <nav className="flex flex-col gap-[0.208vw] px-[var(--spacing-admin-gap-md)]">
          {secondaryNavItems.map((item) => renderNavItem(item, pathname))}
        </nav>
      </div>

      <div className="p-[var(--spacing-admin-gap-md)]">
        <div className="flex items-center gap-[var(--spacing-admin-gap-md)] p-[var(--spacing-admin-gap-md)] rounded-[0.521vw] border border-admin-border bg-admin-muted/50">
          <div className="flex h-[2.083vw] w-[2.083vw] shrink-0 items-center justify-center rounded-full bg-brand-blue text-white text-admin-xs font-semibold">
            {initials}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-admin-sm font-medium text-text-primary truncate">
              {displayName}
            </span>
            <span className="text-admin-xs text-text-hint truncate">Signed in</span>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              aria-label="Sign out"
              className="p-[0.313vw] rounded-[0.417vw] text-text-hint hover:text-text-primary hover:bg-admin-surface-card transition-colors cursor-pointer"
            >
              <LogoutIcon size={18} className="!w-[0.833vw] !h-[0.833vw]" color="currentColor" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
