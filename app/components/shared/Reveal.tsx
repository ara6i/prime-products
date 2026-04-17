"use client";

import type { ReactNode } from "react";
import { useReveal } from "../../hooks/useReveal";
import { cn } from "@/app/shared/lib/utils";

type Variant = "fade-up" | "fade" | "scale" | "blur";

interface RevealProps {
  children?: ReactNode;
  variant?: Variant;
  delay?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  className?: string;
  as?: "div" | "section" | "article" | "li" | "ul" | "ol" | "header" | "figure";
}

export function Reveal({ children, variant = "fade-up", delay, className, as = "div" }: RevealProps) {
  const ref = useReveal<HTMLElement>();
  const Tag = as as "div";
  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={cn("ps-reveal", className)}
      data-variant={variant === "fade-up" ? undefined : variant}
      data-delay={delay}
    >
      {children}
    </Tag>
  );
}
