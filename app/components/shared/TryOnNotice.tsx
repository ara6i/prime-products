import { cn } from "@/app/shared/lib/utils";

interface TryOnNoticeProps {
  className?: string;
}

export function TryOnNotice({ className }: TryOnNoticeProps) {
  return (
    <div
      className={cn(
        "mt-3 flex flex-col gap-1 rounded-md border border-text-primary/8 bg-surface-light/60 px-3 py-2 text-[11px] leading-[1.5] text-text-hint md:text-xs",
        className
      )}
      role="note"
      aria-label="Try-on disclosures"
    >
      <p>
        By uploading an image, you confirm you have the right to use it and consent to processing for try-on purposes.
      </p>
      <p>Images may be processed using secure third-party AI services.</p>
      <p>
        Images are processed in real time and not retained except as necessary for system operation and security.
      </p>
      <p>
        Visual results are for illustrative purposes only and may not perfectly reflect actual fit or appearance.
      </p>
    </div>
  );
}
