import Link from "next/link";
import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/app/shared/lib/utils";
import { ArrowRightIcon } from "./icons";

const landingButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-blue text-white shadow-[0_8px_24px_rgba(33,84,239,0.25)] hover:bg-brand-blue-dark hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(33,84,239,0.32)]",
        outline:
          "border border-text-primary/15 bg-white text-text-primary hover:border-brand-blue/40 hover:bg-brand-blue-pale/30 hover:text-brand-blue-dark",
        white:
          "bg-white text-brand-blue-dark shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.18)]",
        onGradient:
          "border border-white/40 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:border-white/60",
      },
      size: {
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-[0.95rem]",
        xl: "h-[54px] px-7 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "xl" },
  }
);

interface LandingButtonProps extends VariantProps<typeof landingButtonVariants> {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  icon?: "arrow-right" | "none";
  className?: string;
  type?: "button" | "submit";
}

export function LandingButton({ href, onClick, children, icon = "none", variant, size, className, type = "button" }: LandingButtonProps) {
  const content = (
    <>
      {children}
      {icon === "arrow-right" ? <ArrowRightIcon className="h-4 w-4" /> : null}
    </>
  );

  if (onClick && !href) {
    return (
      <button type={type} onClick={onClick} className={cn(landingButtonVariants({ variant, size }), className)}>
        {content}
      </button>
    );
  }

  const resolvedHref = href ?? "#";
  const isExternal = resolvedHref.startsWith("http") || resolvedHref.startsWith("#");
  if (isExternal) {
    return (
      <a href={resolvedHref} onClick={onClick} className={cn(landingButtonVariants({ variant, size }), className)}>
        {content}
      </a>
    );
  }
  return (
    <Link href={resolvedHref} onClick={onClick} className={cn(landingButtonVariants({ variant, size }), className)}>
      {content}
    </Link>
  );
}
