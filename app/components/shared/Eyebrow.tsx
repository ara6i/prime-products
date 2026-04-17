import { cn } from "@/app/shared/lib/utils";
import { SparkleIcon } from "./icons";

interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
}

export function Eyebrow({ children, className }: EyebrowProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-brand-blue/20 bg-brand-blue-pale/50 px-3 py-1.5",
        "text-[11px] font-medium uppercase tracking-[0.08em] text-brand-blue-dark",
        className
      )}
    >
      <SparkleIcon className="h-3 w-3" />
      {children}
    </span>
  );
}
