"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/app/shared/lib/utils";
import { ScrollArea } from "@/app/shared/components/ui/scroll-area";
import type { NavSection } from "../types";

interface DocsSidebarProps {
  navigation: NavSection[];
  activeId: string;
}

export function DocsSidebar({ navigation, activeId }: DocsSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const expanded = new Set<string>();
    for (const section of navigation) {
      if (section.children) expanded.add(section.id);
    }
    return expanded;
  });

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const isActive = (id: string) => activeId === id;
  const isParentActive = (section: NavSection) =>
    section.children?.some((c) => activeId === c.id) ?? false;

  return (
    <aside className="sticky top-16 h-[calc(100vh-4rem)] border-r border-gray-200 bg-white">
      <ScrollArea className="h-full">
        <nav className="px-6 py-8">
          <p className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase mb-3">
            Documentation
          </p>

          <ul className="space-y-5">
            {navigation.map((section) => {
              const Icon = section.icon;
              const hasChildren = !!section.children && section.children.length > 0;
              const isExpanded = expandedSections.has(section.id);
              const sectionActive = isActive(section.id) || isParentActive(section);

              return (
                <li key={section.id}>
                  <button
                    onClick={() => {
                      if (hasChildren) toggleSection(section.id);
                      scrollTo(section.id);
                    }}
                    className={cn(
                      "group flex items-center gap-2 w-full text-left text-sm transition-colors",
                      sectionActive
                        ? "text-[#2154EF] font-semibold"
                        : "text-gray-700 hover:text-gray-900 font-medium"
                    )}
                  >
                    {Icon && (
                      <Icon
                        className={cn(
                          "size-4 flex-shrink-0",
                          sectionActive ? "text-[#2154EF]" : "text-gray-400 group-hover:text-gray-600"
                        )}
                      />
                    )}
                    <span className="flex-1">{section.title}</span>
                    {hasChildren && (
                      <ChevronRight
                        className={cn(
                          "size-3.5 text-gray-400 transition-transform duration-200",
                          isExpanded && "rotate-90"
                        )}
                      />
                    )}
                  </button>

                  {hasChildren && isExpanded && (
                    <ul className="mt-2 ml-6 space-y-1">
                      {section.children!.map((child) => {
                        const active = isActive(child.id);
                        return (
                          <li key={child.id}>
                            <button
                              onClick={() => scrollTo(child.id)}
                              className={cn(
                                "block w-full text-left text-[13px] leading-6 transition-colors",
                                active
                                  ? "text-[#2154EF] font-semibold border-l-2 border-[#2154EF] -ml-3 pl-3"
                                  : "text-gray-600 hover:text-gray-900"
                              )}
                            >
                              {child.title}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </ScrollArea>
    </aside>
  );
}
