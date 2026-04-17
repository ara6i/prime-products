"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DashboardIcon,
  AIStylistIcon,
  TryOnIcon,
  CatalogIcon,
  ClosetIcon,
  BillingIcon,
  ProfileIcon,
  ChevronDownIcon,
} from "../icons";
import { Button } from "@/app/shared/components/ui";
import type { NavItem } from "@/app/shared/types";

interface NavItemConfig {
  id: NavItem;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
}

const mainNavItems: NavItemConfig[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: DashboardIcon },
  { id: "ai-stylist", label: "AI Stylist", href: "/dashboard/ai-stylist", icon: AIStylistIcon },
  { id: "try-on", label: "Try-On", href: "/dashboard/try-on", icon: TryOnIcon },
];

const expandedMenuItems: NavItemConfig[] = [
  { id: "catalog", label: "Catalog", href: "/dashboard/catalog", icon: CatalogIcon },
  { id: "closet", label: "Outfits", href: "/dashboard/closet", icon: ClosetIcon },
  { id: "billing", label: "Billing", href: "/dashboard/billing", icon: BillingIcon },
  { id: "profile", label: "Profile", href: "/dashboard/profile", icon: ProfileIcon },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(() =>
    expandedMenuItems.some((item) => pathname.startsWith(item.href))
  );

  const isExpandedItemActive = expandedMenuItems.some((item) =>
    pathname.startsWith(item.href)
  );

  return (
    <aside className="flex w-[5.417vw] flex-col items-center shrink-0 self-stretch">
      {/* Logo */}
      <div className="relative h-[5vw] w-[5vw] shrink-0">
        <Image
          src="/images/logo.png"
          alt="Prime Style AI"
          fill
          className="object-contain"
          priority
        />
      </div>

      {/* Nav */}
      <nav className="relative flex flex-1 w-full justify-center px-[0.417vw] py-[1.042vw]">
        {/* Shadow */}
        <div
          className="pointer-events-none absolute overflow-hidden rounded-[52.083vw]"
          style={{ inset: "-1.302vw" }}
        >
          <div
            className="absolute rounded-[1.771vw]"
            style={{
              left: "1.354vw",
              right: "1.354vw",
              top: "1.615vw",
              bottom: "1.094vw",
              background: "rgba(0, 0, 0, 0.08)",
              backgroundBlendMode: "hard-light",
              filter: "blur(1.042vw)",
            }}
          />
        </div>
        {/* Glass panel */}
        <div className="absolute inset-0 overflow-hidden rounded-[1.771vw]">
          <div
            className="absolute inset-0"
            style={{
              backdropFilter: "blur(2.083vw)",
              WebkitBackdropFilter: "blur(2.083vw)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "rgba(38, 38, 38, 0.15)" }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "rgba(245, 245, 245, 0.6)" }}
          />
        </div>
        {/* Nav Items */}
        <div className="relative flex flex-col items-center gap-[1.25vw]">
          {mainNavItems.map((item) => {
            const isActive =
              item.id === "dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link key={item.id} href={item.href}>
                <Button
                  variant="nav"
                  size="nav"
                  className="w-[3.75vw] px-[0.833vw] py-[0.625vw] gap-[0.208vw] rounded-[1.042vw] cursor-pointer"
                  data-active={isActive}
                  asChild={false}
                  type="button"
                >
                  <Icon
                    size={30}
                    className="!w-[1.563vw] !h-[1.563vw]"
                    color={
                      isActive
                        ? "var(--brand-blue)"
                        : "var(--text-muted)"
                    }
                  />
                  <span
                    className={`whitespace-nowrap text-[0.625vw] leading-[1.667] ${
                      isActive ? "text-brand-blue" : "text-text-secondary"
                    }`}
                  >
                    {item.label}
                  </span>
                </Button>
              </Link>
            );
          })}

          {/* Expanded Menu */}
          {menuOpen ? (
            <div
              className="flex flex-col gap-[0.625vw] rounded-[1.042vw] border px-[0.208vw] pt-[0.417vw] pb-[0.208vw]"
              style={{
                backgroundColor: "#EFF5FF",
                borderColor: "#BED6FF",
              }}
            >
              {/* Chevron Up — collapse button */}
              <button
                type="button"
                className="flex w-[3.333vw] items-center justify-center p-[0.833vw] cursor-pointer"
                onClick={() => setMenuOpen(false)}
              >
                <ChevronDownIcon
                  size={30}
                  className="rotate-180 !w-[1.563vw] !h-[1.563vw]"
                  color={
                    isExpandedItemActive
                      ? "var(--brand-blue)"
                      : "var(--text-muted)"
                  }
                />
              </button>
              {/* Menu Items */}
              {expandedMenuItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link key={item.id} href={item.href}>
                    <div
                      className={`flex w-[3.333vw] flex-col items-center justify-center gap-[0.208vw] rounded-[1.042vw] px-[0.833vw] py-[0.625vw] cursor-pointer ${
                        isActive ? "bg-[#BED6FF]" : ""
                      }`}
                    >
                      <Icon
                        size={30}
                        className="!w-[1.563vw] !h-[1.563vw]"
                        color={isActive ? "#2154EF" : "#454545"}
                      />
                      <span
                        className={`whitespace-nowrap text-[0.625vw] leading-[1.667] ${
                          isActive ? "text-[#2154EF]" : "text-[#454545]"
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-[3.75vw] h-[3.229vw] bg-surface-muted rounded-[1.042vw] cursor-pointer"
              style={{ padding: "0.208vw 0.833vw" }}
              onClick={() => setMenuOpen(true)}
            >
              <ChevronDownIcon
                size={30}
                className="!w-[1.563vw] !h-[1.563vw]"
                color={
                  isExpandedItemActive
                    ? "var(--brand-blue)"
                    : "var(--text-muted)"
                }
              />
            </Button>
          )}
        </div>
      </nav>
    </aside>
  );
}
