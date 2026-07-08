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
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-customer-muted">
        On this page
      </p>
      <ul className="space-y-2 border-l border-customer-border">
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
                    : "border-transparent text-customer-muted hover:text-text-primary"
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
