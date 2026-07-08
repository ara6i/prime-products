"use client";

import { SparklesIcon, XIcon } from "lucide-react";
import { Button } from "@/app/shared/components/ui";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/shared/components/ui";
import { useCustomerProductAutoDetectRequest } from "../../hooks/useCustomerProductAutoDetectRequest";
import { ProductAutoDetectPanel } from "./ProductAutoDetectPanel";
import { ProductAutoDetectResultsPanel } from "./ProductAutoDetectResultsPanel";

interface ProductAutoDetectDialogProps {
  verifiedWebsiteUrl: string;
}

export function ProductAutoDetectDialog({ verifiedWebsiteUrl }: ProductAutoDetectDialogProps) {
  const autoDetect = useCustomerProductAutoDetectRequest(verifiedWebsiteUrl);
  const showResults = autoDetect.status === "import_running" || autoDetect.status === "ready";

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          className="h-[2.292vw] gap-[0.417vw] px-[0.833vw] text-customer-sm font-semibold !text-white max-lg:h-[10.5vw] max-lg:gap-[2vw] max-lg:px-[4vw] max-lg:text-[3.2vw]"
        >
          <SparklesIcon className="h-[0.833vw] w-[0.833vw] max-lg:h-[3.5vw] max-lg:w-[3.5vw]" />
          Auto Detect
        </Button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        showCloseButton={false}
        overlayClassName="backdrop-blur-sm"
        className="!fixed !inset-x-0 !bottom-0 z-50 !h-[88dvh] !max-h-[88dvh] !w-screen gap-0 overflow-hidden rounded-t-[1.5rem] border-customer-border bg-customer-card p-0 shadow-[0_-24px_80px_rgba(15,23,42,0.18)] max-lg:!h-[90dvh] max-lg:!max-h-[90dvh] max-lg:rounded-t-[1.25rem]"
      >
        <SheetHeader className="relative border-b border-customer-border px-5 py-3 pr-14 text-left max-lg:px-4 max-lg:py-3">
          <SheetTitle className="text-base font-semibold tracking-[-0.02em] text-text-primary max-lg:text-[4vw]">
            {showResults ? "Detected products" : "Auto Detect products"}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {showResults ? "Review detected products before activation." : "Choose website product areas before importing products."}
          </SheetDescription>
          <SheetClose asChild>
            <button
              type="button"
              className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-customer-border bg-customer-card text-customer-muted transition-colors hover:border-brand-blue/40 hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              aria-label="Close"
            >
              <XIcon className="h-4 w-4" aria-hidden />
            </button>
          </SheetClose>
        </SheetHeader>

        <div className="min-h-0 flex-1">
          {showResults ? (
            <ProductAutoDetectResultsPanel autoDetect={autoDetect} />
          ) : (
            <ProductAutoDetectPanel autoDetect={autoDetect} />
          )}
        </div>

        {showResults ? (
          <SheetFooter className="flex-row items-center justify-end gap-2 border-t border-customer-border px-5 pb-5 pt-3 max-lg:gap-3 max-lg:px-4 max-lg:pb-6">
            <Button
              type="button"
              onClick={() => autoDetect.resetDetection()}
              variant="outline"
              className="h-10 px-5 text-sm max-lg:h-10 max-lg:px-5 max-lg:text-sm"
            >
              Start over
            </Button>
            <SheetClose asChild>
              <Button
                type="button"
                className="h-10 px-5 text-sm !text-white max-lg:h-10 max-lg:px-5 max-lg:text-sm"
              >
                Done
              </Button>
            </SheetClose>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
