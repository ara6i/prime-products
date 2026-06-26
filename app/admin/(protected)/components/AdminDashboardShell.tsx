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
  const customersActive = activeHref.startsWith("/admin/customers") || activeHref.startsWith("/admin/reports/feedbacks");
  const usersActive = activeHref.startsWith("/admin/users");
  const verificationActive = activeHref.startsWith("/admin/verification");
  const monitoringActive = activeHref.startsWith("/admin/monitoring");
  const supportActive = activeHref.startsWith("/admin/chats") || activeHref.startsWith("/admin/tickets");
  const settingsActive = activeHref.startsWith("/admin/settings");

  return [
    {
      label: "Overview",
      href: "/admin",
      icon: "dashboard",
      active: activeHref === "/admin",
      disabled: false,
    },
    {
      label: "Profile Users",
      href: "/admin/users",
      icon: "customers",
      active: usersActive,
      disabled: false,
    },
    {
      label: "Stores",
      href: "/admin/customers/shopify",
      icon: "stores",
      active: customersActive,
      disabled: false,
      children: [
        {
          label: "Shopify Stores",
          href: "/admin/customers/shopify",
          icon: "shopify",
          active: activeHref.startsWith("/admin/customers/shopify"),
          disabled: false,
        },
        {
          label: "SDK Stores",
          href: "/admin/customers/sdk",
          icon: "sdk",
          active: activeHref.startsWith("/admin/customers/sdk"),
          disabled: false,
        },
        {
          label: "Feedbacks",
          href: "/admin/customers/feedbacks",
          icon: "reports",
          active: activeHref === "/admin/customers/feedbacks" || activeHref === "/admin/reports/feedbacks",
          disabled: false,
        },
      ],
    },
    {
      label: "Verification Center",
      href: "/admin/verification",
      icon: "reports",
      active: verificationActive,
      disabled: false,
    },
    {
      label: "Monitoring",
      href: "/admin/monitoring/behavior",
      icon: "behavior",
      active: monitoringActive,
      disabled: false,
      children: [
        {
          label: "User Behavior",
          href: "/admin/monitoring/behavior",
          icon: "behavior",
          active: activeHref.startsWith("/admin/monitoring/behavior"),
          disabled: false,
        },
        {
          label: "Platform Status",
          href: "/admin/monitoring/status",
          icon: "settings",
          active: activeHref.startsWith("/admin/monitoring/status"),
          disabled: false,
        },
        {
          label: "Bug Reports",
          href: "/admin/monitoring/bugs",
          icon: "reports",
          active: activeHref.startsWith("/admin/monitoring/bugs"),
          disabled: false,
        },
      ],
    },
    {
      label: "Settings",
      href: "/admin/settings",
      icon: "settings",
      active: settingsActive,
      disabled: false,
    },
    {
      label: "Support",
      href: "/admin/chats",
      icon: "support",
      active: supportActive,
      disabled: false,
      children: [
        {
          label: "Live chat",
          href: "/admin/chats",
          icon: "chats",
          active: activeHref.startsWith("/admin/chats"),
          disabled: false,
        },
        {
          label: "Tickets",
          href: "/admin/tickets",
          icon: "tickets",
          active: activeHref.startsWith("/admin/tickets"),
          disabled: false,
        },
      ],
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
