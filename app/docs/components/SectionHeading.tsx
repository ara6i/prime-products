"use client";

import { Link2 } from "lucide-react";
import { cn } from "@/app/shared/lib/utils";

interface SectionHeadingProps {
  id: string;
  level?: 2 | 3;
  children: React.ReactNode;
  className?: string;
}

export function SectionHeading({ id, level = 2, children, className }: SectionHeadingProps) {
  const Tag = level === 2 ? "h2" : "h3";

  const handleClick = () => {
    const url = `${window.location.pathname}#${id}`;
    window.history.pushState(null, "", url);
    try {
      navigator.clipboard.writeText(window.location.origin + url);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  return (
    <Tag
      id={id}
      onClick={handleClick}
      className={cn(
        "group relative flex items-center scroll-mt-24 cursor-pointer text-gray-900 tracking-tight",
        level === 2 && "text-[28px] font-semibold leading-tight mt-12 mb-4",
        level === 3 && "text-[20px] font-semibold leading-snug mt-8 mb-3",
        className
      )}
    >
      <Link2
        aria-hidden
        className={cn(
          "absolute -ml-6 size-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity",
          level === 2 ? "top-2.5" : "top-1.5"
        )}
      />
      <span>{children}</span>
    </Tag>
  );
}
