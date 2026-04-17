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
        className="flex items-center justify-between w-full px-4 py-3 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-gray-200"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-[#2154EF] font-semibold uppercase tracking-wider flex-shrink-0">
            Docs
          </span>
          <span className="text-gray-600 flex-shrink-0">/</span>
          <span className="text-sm text-gray-700 font-medium truncate">
            {activeTitle}
          </span>
        </div>
        {isOpen ? (
          <X className="size-4 text-gray-600 flex-shrink-0" />
        ) : (
          <ChevronDown className="size-4 text-gray-600 flex-shrink-0" />
        )}
      </button>

      {/* Dropdown overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-white/60 z-30"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown menu */}
          <nav className="absolute top-full left-0 right-0 z-40 bg-[#F9FAFB] border-b border-gray-200 max-h-[70vh] overflow-y-auto overscroll-contain">
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
                          : "text-gray-600 active:bg-white/5"
                      )}
                    >
                      {Icon && <Icon className="size-4 flex-shrink-0" />}
                      {section.title}
                    </button>

                    {section.children && (
                      <div className="ml-4 border-l border-gray-200">
                        {section.children.map((child) => (
                          <button
                            key={child.id}
                            onClick={() => scrollTo(child.id)}
                            className={cn(
                              "block w-full text-left pl-6 pr-4 py-2 text-sm transition-colors",
                              activeId === child.id
                                ? "text-[#2154EF] font-medium"
                                : "text-gray-500 active:text-gray-700"
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
