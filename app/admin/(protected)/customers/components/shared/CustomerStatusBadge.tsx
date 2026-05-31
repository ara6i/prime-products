interface CustomerStatusBadgeProps {
  tone: "default" | "success" | "warning" | "danger";
  children: string;
}

const toneClasses: Record<CustomerStatusBadgeProps["tone"], string> = {
  default: "bg-customer-soft text-customer-muted",
  success: "bg-customer-success-bg text-customer-success-text",
  warning: "bg-customer-warning-bg text-customer-warning-text",
  danger: "bg-customer-danger-bg text-customer-danger-text",
};

export function CustomerStatusBadge({ tone, children }: CustomerStatusBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-[0.625vw] py-[0.208vw] text-[clamp(11px,0.68vw,13px)] font-semibold max-lg:px-[2.4vw] max-lg:py-[1vw] max-lg:text-[2.9vw] ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}
