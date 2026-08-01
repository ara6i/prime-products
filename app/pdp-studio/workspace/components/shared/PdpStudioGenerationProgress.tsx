import Image from "next/image";

interface PdpStudioGenerationProgressDetailsProps {
  stage: string;
  percent: number;
  elapsedSeconds: number;
  status: string;
}

interface PdpStudioGenerationProgressCardProps
  extends PdpStudioGenerationProgressDetailsProps {
  imageUrl?: string | null;
  imageAlt?: string;
  className?: string;
}

function clampPercent(percent: number): number {
  return Math.max(0, Math.min(100, Math.round(percent)));
}

function formatElapsedTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return minutes > 0
    ? `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
    : `${remainingSeconds}s`;
}

function formatStatus(status: string): string {
  return status
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function PdpStudioGenerationProgressDetails({
  stage,
  percent,
  elapsedSeconds,
  status,
}: PdpStudioGenerationProgressDetailsProps) {
  const safePercent = clampPercent(percent);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[0.8125rem] font-semibold text-[var(--color-pdp-ink)]">
            {stage}
          </p>
          <p className="mt-0.5 text-[0.6875rem] text-[var(--color-pdp-muted)]">
            Your image continues processing if you leave this screen.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--color-pdp-accent-soft)] px-2.5 py-1 text-[0.75rem] font-semibold text-[var(--color-pdp-accent)]">
          {safePercent}%
        </span>
      </div>

      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-pdp-rule)]"
        role="progressbar"
        aria-label={stage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safePercent}
      >
        <span
          className="block h-full rounded-full bg-[var(--color-pdp-accent)] transition-[width] duration-700"
          style={{ width: `${safePercent}%` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-[0.625rem] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface-soft)] px-3 py-2">
          <p className="text-[0.625rem] font-medium uppercase tracking-[0.08em] text-[var(--color-pdp-muted)]">
            Elapsed
          </p>
          <p className="mt-1 text-[1.25rem] font-semibold leading-none text-[var(--color-pdp-ink)]">
            {formatElapsedTime(elapsedSeconds)}
          </p>
        </div>
        <div className="rounded-[0.625rem] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface-soft)] px-3 py-2">
          <p className="text-[0.625rem] font-medium uppercase tracking-[0.08em] text-[var(--color-pdp-muted)]">
            Status
          </p>
          <p className="mt-1 truncate text-[0.8125rem] font-semibold text-[var(--color-pdp-ink)]">
            {formatStatus(status)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function PdpStudioGenerationProgressCard({
  imageUrl,
  imageAlt = "",
  className = "",
  ...details
}: PdpStudioGenerationProgressCardProps) {
  return (
    <div
      className={[
        "relative aspect-square w-full overflow-hidden rounded-[1rem] border border-[var(--color-pdp-rule)] bg-white shadow-[0_18px_60px_rgba(33,84,239,0.12)]",
        className,
      ].join(" ")}
      aria-live="polite"
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          unoptimized
          sizes="34rem"
          className="scale-105 object-contain blur-md saturate-75"
        />
      ) : null}
      <div className="absolute inset-0 bg-white/55 backdrop-blur-[1px]" />
      <div className="absolute inset-x-4 bottom-4 rounded-[0.875rem] border border-white/80 bg-white/94 p-4 shadow-[0_16px_45px_rgba(24,45,85,0.14)] backdrop-blur-md">
        <PdpStudioGenerationProgressDetails {...details} />
      </div>
    </div>
  );
}

export function PdpStudioGenerationProgressPanel(
  props: PdpStudioGenerationProgressDetailsProps,
) {
  return (
    <div
      className="w-[min(22rem,calc(100%-2rem))] rounded-[0.875rem] border border-[var(--color-pdp-rule)] bg-white/95 p-4 shadow-[0_18px_55px_rgba(24,45,85,0.16)] backdrop-blur-md"
      aria-live="polite"
    >
      <PdpStudioGenerationProgressDetails {...props} />
    </div>
  );
}
