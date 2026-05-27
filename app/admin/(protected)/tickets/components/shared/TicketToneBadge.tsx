import type { ReactNode } from "react";

interface TicketToneBadgeProps {
  tone: "default" | "warning" | "danger" | "success";
  children: ReactNode;
}

const toneClasses: Record<TicketToneBadgeProps["tone"], string> = {
  default: "bg-customer-blue text-brand-blue",
  warning: "bg-customer-warning-bg text-customer-warning-text",
  danger: "bg-customer-danger-bg text-customer-danger-text",
  success: "bg-customer-success-bg text-customer-success-text",
};

export function TicketToneBadge({ tone, children }: TicketToneBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-[0.625vw] py-[0.208vw] text-[clamp(11px,0.68vw,13px)] font-semibold max-lg:px-[2.4vw] max-lg:py-[1vw] max-lg:text-[2.9vw] ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}
