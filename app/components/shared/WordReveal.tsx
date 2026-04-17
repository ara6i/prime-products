"use client";

import { useReveal } from "../../hooks/useReveal";
import { cn } from "@/app/shared/lib/utils";

interface WordRevealProps {
  text: string;
  className?: string;
  reverse?: boolean;
  staggerMs?: number;
}

export function WordReveal({ text, className, reverse = false, staggerMs = 120 }: WordRevealProps) {
  const ref = useReveal<HTMLSpanElement>();
  const words = text.split(" ");

  return (
    <span ref={ref} className={cn("ps-word-cut inline-block align-baseline", className)}>
      <span className="sr-only">{text}</span>
      {words.map((word, i) => {
        const delayIndex = reverse ? words.length - 1 - i : i;
        return (
          <span key={`${word}-${i}`} aria-hidden className="mr-[0.25em] leading-[inherit]">
            <span style={{ animationDelay: `${delayIndex * staggerMs}ms` }}>{word}</span>
          </span>
        );
      })}
    </span>
  );
}
