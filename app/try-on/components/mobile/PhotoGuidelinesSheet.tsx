"use client";

import {
  Sheet,
  SheetContent,
  Button,
} from "@/app/shared/components/ui";
import {
  CloseIcon,
  CheckIcon,
  LightbulbIcon,
} from "@/app/shared/components/icons";

interface PhotoGuidelinesSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PhotoGuidelinesSheet({ isOpen, onClose }: PhotoGuidelinesSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        overlayClassName="z-[70]"
        className="z-[71] flex max-h-[calc(100dvh-16px)] flex-col gap-4 overflow-hidden rounded-t-[20px] border-none bg-white px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-6"
      >
        <div className="flex items-center justify-between">
          <span className="text-[16px] font-bold leading-[26px] text-brand-blue">
            How to take the best photo
          </span>
          <Button variant="link" size="sm" onClick={onClose}>
            <CloseIcon size={16} color="var(--brand-blue)" />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain">
          <div className="flex flex-col gap-1 rounded-xl bg-surface-success-light px-3 py-2">
            <div className="flex items-center gap-2">
              <CheckIcon size={16} color="var(--status-success)" />
              <span className="text-xs font-medium leading-[1.667em] text-status-success">
                Do
              </span>
            </div>
            <ul className="flex flex-col gap-0.5 pl-1 text-xs leading-[1.667em] text-text-primary">
              <li>Stand facing the camera with your full body in frame</li>
              <li>Use natural or even lighting (e.g. near a window)</li>
              <li>Wear fitted, simple clothing (e.g. neutral colors)</li>
              <li>Choose a plain background (a light wall is ideal)</li>
              <li>Stand straight and still, arms relaxed by your sides</li>
            </ul>
          </div>

          <div className="flex flex-col gap-1 rounded-xl bg-surface-error-light px-3 py-2">
            <div className="flex items-center gap-2">
              <CloseIcon size={16} color="var(--text-error)" />
              <span className="text-xs font-medium leading-[1.667em] text-text-error">
                Dont
              </span>
            </div>
            <ul className="flex flex-col gap-0.5 pl-1 text-xs leading-[1.667em] text-text-primary">
              <li>Don&apos;t wear loose, baggy, or layered</li>
              <li>Don&apos;t sit, pose, or bend your body</li>
              <li>Don&apos;t use strong backlighting</li>
              <li>Don&apos;t take mirror photos or selfies</li>
              <li>Don&apos;t apply filters, effects, or edits</li>
            </ul>
          </div>

          <div className="flex flex-col gap-1 rounded-xl bg-suggestion-chip-bg px-3 py-2">
            <div className="flex items-center gap-2">
              <LightbulbIcon size={16} color="var(--tip-accent)" />
              <span className="text-xs font-medium leading-[1.667em] text-tip-accent">
                Quick Tip
              </span>
            </div>
            <p className="text-xs leading-[1.667em] text-text-primary">
              The simpler your photo is, the more accurate your virtual try-on
              results will be.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
