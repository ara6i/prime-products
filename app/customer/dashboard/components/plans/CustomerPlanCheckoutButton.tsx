"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/app/shared/components/ui";

interface CustomerPlanCheckoutButtonProps {
  disabled: boolean;
}

export function CustomerPlanCheckoutButton({ disabled }: CustomerPlanCheckoutButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <Button
      type="submit"
      disabled={isDisabled}
      className="mt-[var(--spacing-customer-gap-lg)] w-full max-lg:mt-[5vw] max-lg:h-[12vw] max-lg:text-[3.5vw]"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {pending ? "Opening Lemon checkout" : "Open Lemon checkout"}
    </Button>
  );
}
