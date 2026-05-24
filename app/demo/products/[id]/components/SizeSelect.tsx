"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/app/shared/lib/utils";

export interface SizeOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SizeSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: SizeOption[];
  placeholder?: string;
  disabled?: boolean;
  /** Extra classes applied to the outer wrapper div */
  className?: string;
}

export function SizeSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  disabled,
  className,
}: SizeSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between gap-1.5 px-3 py-2 rounded-lg border text-left transition-all duration-150",
          disabled
            ? "bg-surface-light text-text-disabled border-border-light cursor-not-allowed"
            : open
            ? "border-brand-blue shadow-[0_0_0_3px_rgba(33,84,239,0.08)] bg-white text-text-primary"
            : value
            ? "border-border-light bg-white text-text-primary hover:border-brand-blue/40"
            : "border-border-light bg-white text-text-hint hover:border-brand-blue/40"
        )}
      >
        <span className="text-[13px] sm:text-sm leading-none truncate font-medium">
          {value ? selectedLabel : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 flex-shrink-0 text-text-hint transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.97 }}
            transition={{ duration: 0.13, ease: "easeOut" }}
            className="absolute top-full mt-1.5 left-0 right-0 z-50 bg-white border border-border-light rounded-xl shadow-xl overflow-hidden overflow-y-auto max-h-52 py-1"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  if (!opt.disabled) {
                    onChange(opt.value);
                    setOpen(false);
                  }
                }}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3.5 py-2 text-[13px] sm:text-sm text-left transition-colors",
                  opt.disabled
                    ? "text-text-disabled cursor-not-allowed line-through"
                    : value === opt.value
                    ? "text-brand-blue bg-brand-blue/5 font-medium"
                    : "text-text-body hover:bg-surface-light"
                )}
              >
                {opt.label}
                {value === opt.value && !opt.disabled && (
                  <Check className="h-3 w-3 text-brand-blue flex-shrink-0" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
