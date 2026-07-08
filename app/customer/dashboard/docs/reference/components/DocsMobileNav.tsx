"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/app/shared/lib/utils";
import type { NavSection } from "../types";

interface DocsMobileNavProps {
  navigation: NavSection[];
  activeId: string;
}

export function DocsMobileNav({ navigation, activeId }: DocsMobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  const activeTitle =
    navigation.find((s) => s.id === activeId)?.title ??
    navigation
      .flatMap((s) => s.children ?? [])
      .find((c) => c.id === activeId)?.title ??
    "Documentation";

  // Close on outside tap
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Close on scroll
  useEffect(() => {
    if (!isOpen) return;
    const handler = () => setIsOpen(false);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [isOpen]);

  const scrollTo = (id: string) => {
    setIsOpen(false);
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  return (
    <div ref={navRef} className="lg:hidden sticky top-[64px] z-30">
      {/* Collapsed bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between border-b border-customer-border bg-customer-card px-4 py-3 backdrop-blur-md"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-[#2154EF] font-semibold uppercase tracking-wider flex-shrink-0">
            Docs
          </span>
          <span className="shrink-0 text-text-body">/</span>
          <span className="truncate text-sm font-medium text-text-primary">
            {activeTitle}
          </span>
        </div>
        {isOpen ? (
          <X className="size-4 shrink-0 text-text-body" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-text-body" />
        )}
      </button>

      {/* Dropdown overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30 bg-customer-page/75"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown menu */}
          <nav className="absolute left-0 right-0 top-full z-40 max-h-[70vh] overflow-y-auto overscroll-contain border-b border-customer-border bg-customer-card">
            <div className="py-2">
              {navigation.map((section) => {
                const Icon = section.icon;
                const isSectionActive =
                  activeId === section.id ||
                  section.children?.some((c) => c.id === activeId);

                return (
                  <div key={section.id}>
                    <button
                      onClick={() => scrollTo(section.id)}
                      className={cn(
                        "flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium transition-colors",
                        isSectionActive
                          ? "text-[#2154EF] bg-[#2154EF]/5"
                          : "text-text-body active:bg-customer-soft"
                      )}
                    >
                      {Icon && <Icon className="size-4 flex-shrink-0" />}
                      {section.title}
                    </button>

                    {section.children && (
                      <div className="ml-4 border-l border-customer-border">
                        {section.children.map((child) => (
                          <button
                            key={child.id}
                            onClick={() => scrollTo(child.id)}
                            className={cn(
                              "block w-full text-left pl-6 pr-4 py-2 text-sm transition-colors",
                              activeId === child.id
                                ? "text-[#2154EF] font-medium"
                                : "text-customer-muted active:text-text-primary"
                            )}
                          >
                            {child.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
