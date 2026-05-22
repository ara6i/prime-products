import { CheckCircleIcon, WarningIcon } from "@/app/shared/components/icons";

interface StatusPillProps {
  label: string;
  tone: "success" | "warning";
}

export function StatusPill({ label, tone }: StatusPillProps) {
  const success = tone === "success";
  const Icon = success ? CheckCircleIcon : WarningIcon;

  return (
    <span
      className={
        success
          ? "inline-flex items-center gap-[var(--spacing-customer-gap-xs)] rounded-full bg-customer-success-bg px-[0.625vw] py-[0.313vw] text-customer-xs font-semibold text-customer-success-text max-lg:px-[3.2vw] max-lg:py-[1.6vw] max-lg:text-[3vw]"
          : "inline-flex items-center gap-[var(--spacing-customer-gap-xs)] rounded-full bg-customer-warning-bg px-[0.625vw] py-[0.313vw] text-customer-xs font-semibold text-customer-warning-text max-lg:px-[3.2vw] max-lg:py-[1.6vw] max-lg:text-[3vw]"
      }
    >
      <Icon size={16} className="h-[0.833vw] w-[0.833vw] max-lg:h-[3.6vw] max-lg:w-[3.6vw]" />
      {label}
    </span>
  );
}
