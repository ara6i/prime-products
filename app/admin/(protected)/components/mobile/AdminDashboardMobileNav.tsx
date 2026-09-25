import { ChevronDown, Menu } from "lucide-react";
import Link from "next/link";
import type { AdminDashboardNavItem } from "../../types";
import { AdminDashboardIcon } from "../shared/AdminDashboardIcon";

interface AdminDashboardMobileNavProps {
  navItems: AdminDashboardNavItem[];
}

function itemClasses(active: boolean, nested = false): string {
  return [
    "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
    nested ? "pl-4" : "",
    active
      ? "bg-customer-blue text-brand-blue"
      : "text-text-body hover:bg-customer-soft hover:text-text-primary",
  ]
    .filter(Boolean)
    .join(" ");
}

export function AdminDashboardMobileNav({
  navItems,
}: AdminDashboardMobileNavProps) {
  const activeItem = navItems.find((item) => item.active) ?? navItems[0]!;

  return (
    <nav
      aria-label="Admin navigation"
      className="sticky top-16 z-[19] border-b border-customer-border bg-customer-card/95 px-3 py-2.5 backdrop-blur lg:hidden"
    >
      <details className="group relative">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl border border-customer-border bg-customer-soft px-3.5 py-2 text-text-primary shadow-sm [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-customer-card text-brand-blue">
              <AdminDashboardIcon
                name={activeItem.icon}
                size={18}
                className="h-[18px] w-[18px]"
              />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-customer-muted">
                Current page
              </span>
              <span className="block truncate text-sm font-semibold">
                {activeItem.label}
              </span>
            </span>
          </span>

          <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-brand-blue">
            <Menu className="h-4 w-4" aria-hidden />
            Menu
            <ChevronDown
              className="h-4 w-4 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </span>
        </summary>

        <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] max-h-[calc(100dvh-9.5rem)] overflow-y-auto overscroll-contain rounded-2xl border border-customer-border bg-customer-card p-2 shadow-2xl">
          <div className="grid gap-1">
            {navItems.map((item) => {
              const hasChildren = Boolean(item.children?.length);

              if (item.disabled) {
                return (
                  <span
                    key={item.label}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-customer-muted opacity-70"
                  >
                    <AdminDashboardIcon
                      name={item.icon}
                      size={18}
                      className="h-[18px] w-[18px]"
                    />
                    <span className="flex-1">{item.label}</span>
                    <span className="text-[10px] uppercase tracking-wide">
                      Soon
                    </span>
                  </span>
                );
              }

              return (
                <div
                  key={item.label}
                  className={
                    hasChildren
                      ? "rounded-xl border border-customer-border/70 p-1"
                      : ""
                  }
                >
                  <Link
                    href={item.href}
                    className={itemClasses(item.active)}
                    aria-current={item.active ? "page" : undefined}
                  >
                    <AdminDashboardIcon
                      name={item.icon}
                      size={18}
                      className="h-[18px] w-[18px] shrink-0"
                    />
                    <span className="flex-1">{item.label}</span>
                  </Link>

                  {hasChildren ? (
                    <div className="mt-1 grid grid-cols-2 gap-1 border-t border-customer-border/70 pt-1">
                      {item.children?.map((child) => (
                        <Link
                          key={child.label}
                          href={child.href}
                          className={itemClasses(child.active, true)}
                          aria-current={child.active ? "page" : undefined}
                        >
                          <AdminDashboardIcon
                            name={child.icon}
                            size={16}
                            className={
                              child.icon === "sdk"
                                ? "h-5 w-5 shrink-0 object-contain"
                                : "h-4 w-4 shrink-0"
                            }
                          />
                          <span className="min-w-0 leading-tight">
                            {child.label}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </details>
    </nav>
  );
}
