"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { GitCompare } from "lucide-react";
import { cn } from "@/app/shared/lib/utils";

interface Props {
  available: boolean;
  reason?: string;
}

export function VsControlToggle({ available, reason }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const on = params.get("vsControl") === "1";

  const toggle = () => {
    if (!available) return;
    const next = new URLSearchParams(params.toString());
    if (on) next.delete("vsControl");
    else next.set("vsControl", "1");
    router.replace(`?${next.toString()}`);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!available}
      title={!available ? reason : "Compare vs. control cohort"}
      className={cn(
        "inline-flex items-center gap-[0.417vw] h-[1.979vw] px-[0.833vw] rounded-full text-admin-sm font-medium transition-all max-lg:h-9 max-lg:px-3 max-lg:text-sm max-lg:gap-2",
        !available
          ? "bg-admin-muted text-text-hint cursor-not-allowed"
          : on
            ? "bg-brand-blue text-white shadow-sm"
            : "bg-brand-blue-pale text-brand-blue hover:bg-brand-blue-light",
      )}
    >
      <GitCompare className="!w-[0.833vw] !h-[0.833vw] max-lg:!w-4 max-lg:!h-4" strokeWidth={1.8} />
      <span>VS. Control Group</span>
    </button>
  );
}
