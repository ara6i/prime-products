import Image from "next/image";
import type { ReactNode } from "react";
import { AdminDashboardHeader } from "./shared/AdminDashboardHeader";
import { AdminDashboardSidebar } from "./shared/AdminDashboardSidebar";
import { AdminDashboardMobileNav } from "./mobile/AdminDashboardMobileNav";
import type { AdminDashboardNavItem } from "../types";

interface AdminDashboardShellProps {
  logoutAction: () => Promise<void>;
  activeHref?: string;
  children?: ReactNode;
}

function createAdminNavItems(activeHref: string): AdminDashboardNavItem[] {
  const reportsActive = activeHref.startsWith("/admin/reports");

  return [
    {
      label: "Overview",
      href: "/admin",
      icon: "dashboard",
      active: activeHref === "/admin",
      disabled: false,
    },
    {
      label: "Tickets",
      href: "/admin/tickets",
      icon: "tickets",
      active: activeHref === "/admin/tickets",
      disabled: false,
    },
    {
      label: "Live chat",
      href: "/admin/chats",
      icon: "chats",
      active: activeHref === "/admin/chats",
      disabled: false,
    },
    {
      label: "Merchants",
      href: "/admin/merchants",
      icon: "merchants",
      active: false,
      disabled: true,
    },
    {
      label: "Analytics",
      href: "/admin/analytics",
      icon: "analytics",
      active: false,
      disabled: true,
    },
    {
      label: "Reports",
      href: "/admin/reports/feedbacks",
      icon: "reports",
      active: reportsActive,
      disabled: false,
      children: [
        {
          label: "Feedbacks",
          href: "/admin/reports/feedbacks",
          icon: "reports",
          active: activeHref === "/admin/reports/feedbacks",
          disabled: false,
        },
      ],
    },
    {
      label: "Settings",
      href: "/admin/settings",
      icon: "settings",
      active: false,
      disabled: true,
    },
  ];
}

function defaultDashboardBody() {
  return (
    <section className="min-h-[calc(100vh-var(--spacing-customer-header)-var(--spacing-customer-content-y)-var(--spacing-customer-content-y))] rounded-[var(--radius-customer-card)] border border-dashed border-customer-border bg-customer-card max-lg:min-h-[72vh]" />
  );
}

export function AdminDashboardShell({ logoutAction, activeHref = "/admin", children }: AdminDashboardShellProps) {
  const adminNavItems = createAdminNavItems(activeHref);
  const body = children ?? defaultDashboardBody();

  return (
    <>
      <div className="hidden min-h-screen text-text-primary lg:flex">
        <AdminDashboardSidebar navItems={adminNavItems} />

        <div className="min-w-0 flex-1">
          <AdminDashboardHeader logoutAction={logoutAction} />

          <main className="px-[var(--spacing-customer-content-x)] py-[var(--spacing-customer-content-y)]">
            {body}
          </main>
        </div>
      </div>

      <div className="min-h-screen text-text-primary lg:hidden">
        <AdminDashboardHeader
          logoutAction={logoutAction}
          compact
          leftSlot={
            <Image
              src="/images/landing/optimized/logo-navbar-small.webp"
              alt="PrimeStyleAI"
              width={52}
              height={50}
              priority
              className="h-[11vw] w-auto object-contain"
            />
          }
        />

        <AdminDashboardMobileNav navItems={adminNavItems} />

        <main className="px-[4vw] pb-[8vw]">
          {body}
        </main>
      </div>
    </>
  );
}
