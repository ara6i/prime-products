"use client";

import { useEffect, useState } from "react";
import { cn } from "@/app/shared/lib/utils";

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

interface OnThisPageProps {
  /** Container selector to scan for headings. Defaults to main docs content. */
  containerSelector?: string;
}

export function OnThisPage({ containerSelector = "[data-docs-content]" }: OnThisPageProps) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  // Collect H2/H3 headings with ids from the content container.
  useEffect(() => {
    const collect = () => {
      const container =
        document.querySelector(containerSelector) ?? document.querySelector("main");
      if (!container) return;

      const headings = Array.from(
        container.querySelectorAll<HTMLHeadingElement>("h2[id], h3[id]")
      );

      const next: TocItem[] = headings.map((h) => ({
        id: h.id,
        text: (h.textContent ?? "").trim(),
        level: h.tagName === "H2" ? 2 : 3,
      }));

      setItems((prev) => {
        if (
          prev.length === next.length &&
          prev.every((p, i) => p.id === next[i]?.id && p.text === next[i]?.text)
        ) {
          return prev;
        }
        return next;
      });
    };

    collect();

    // Watch for dynamic content changes (rare, but safe).
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const mo = new MutationObserver(() => collect());
    mo.observe(container, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [containerSelector]);

  // Observe active heading.
  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-15% 0px -70% 0px" }
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <aside className="sticky top-24 self-start">
      <p className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase mb-3">
        On this page
      </p>
      <ul className="space-y-2 border-l border-gray-200">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(item.id);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                    window.history.pushState(null, "", `#${item.id}`);
                  }
                }}
                className={cn(
                  "block text-[13px] leading-5 -ml-px border-l-2 pl-3 transition-colors",
                  item.level === 3 && "pl-6",
                  active
                    ? "text-[#2154EF] font-medium border-[#2154EF]"
                    : "text-gray-500 hover:text-gray-800 border-transparent"
                )}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
