"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

interface CustomerPlanCheckoutToastProps {
  error: string | null;
}

function normalizeCheckoutError(error: string): string {
  try {
    const parsed = JSON.parse(error) as { error?: unknown; message?: unknown };
    if (typeof parsed.error === "string") return parsed.error;
    if (typeof parsed.message === "string") return parsed.message;
  } catch {
    return error;
  }

  return error;
}

export function CustomerPlanCheckoutToast({ error }: CustomerPlanCheckoutToastProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shownErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!error || shownErrorRef.current === error) return;

    shownErrorRef.current = error;
    toast.error("Could not open Lemon checkout", {
      description: normalizeCheckoutError(error),
    });

    const params = new URLSearchParams(searchParams.toString());
    params.delete("checkoutError");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [error, pathname, router, searchParams]);

  return null;
}
