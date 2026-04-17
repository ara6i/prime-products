"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  DashboardIcon,
  AIStylistIcon,
  TryOnIcon,
  CatalogIcon,
  ChevronUpIcon,
  ClosetIcon,
  BillingIcon,
  ProfileIcon,
} from "@/app/shared/components/icons";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
}

const mainNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: DashboardIcon },
  { label: "AI Stylist", href: "/dashboard/ai-stylist", icon: AIStylistIcon },
  { label: "Try-On", href: "/dashboard/try-on", icon: TryOnIcon },
];

const moreMenuItems: NavItem[] = [
  { label: "Catalog", href: "/dashboard/catalog", icon: CatalogIcon },
  { label: "Closet", href: "/dashboard/closet", icon: ClosetIcon },
  { label: "Billing", href: "/dashboard/billing", icon: BillingIcon },
  { label: "Profile", href: "/dashboard/profile", icon: ProfileIcon },
];

export function MobileSidebar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  const isMoreActive = moreMenuItems.some((item) => isActive(item.href));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    }

    if (moreOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [moreOpen]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
      <div className="flex items-center gap-2">
        {/* Main Nav Bar */}
        <nav
          className="flex h-[70px] flex-1 items-center justify-around rounded-[100px]"
          style={{ backgroundColor: "#f0f0f0" }}
        >
          {mainNavItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-[100px] px-4 py-2 transition-colors cursor-pointer ${
                  active ? "font-bold" : "font-medium"
                }`}
                style={{
                  backgroundColor: active ? "#bed6ff" : "transparent",
                  color: active ? "#2154ef" : "#454545",
                }}
              >
                <Icon size={24} color={active ? "#2154ef" : "#454545"} />
                <span
                  className="text-[10px] leading-[16px]"
                  style={{ color: active ? "#2154ef" : "#454545" }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* More Button — separate pill */}
        <div ref={moreRef} className="relative">
          <button
            onClick={() => setMoreOpen((prev) => !prev)}
            className="flex h-[70px] w-[91px] flex-col items-center justify-center gap-0.5 rounded-[100px] transition-colors cursor-pointer"
            style={{
              backgroundColor: "#f0f0f0",
              color: isMoreActive ? "#2154ef" : "#454545",
            }}
          >
            <ChevronUpIcon
              size={24}
              color={isMoreActive ? "#2154ef" : "#454545"}
            />
            <span
              className="text-[10px] leading-[16px]"
              style={{
                color: isMoreActive ? "#2154ef" : "#454545",
                fontWeight: isMoreActive ? 700 : 400,
              }}
            >
              More
            </span>
          </button>

          {/* More Menu Popup */}
          {moreOpen && (
            <div
              className="absolute bottom-full right-0 mb-2 flex w-[124px] flex-col gap-1 rounded-[20px] p-1 shadow-[-2px_2px_4px_0px_rgba(0,0,0,0.12)]"
              style={{ backgroundColor: "#f0f0f0" }}
            >
              {moreMenuItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 rounded-[20px] px-3 py-2 transition-colors cursor-pointer"
                    style={{
                      backgroundColor: active ? "#dae7ff" : "transparent",
                      color: "#454545",
                    }}
                  >
                    <Icon size={20} color="#454545" />
                    <span className="text-xs font-medium leading-[20px]">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
