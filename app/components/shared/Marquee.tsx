import { cn } from "@/app/shared/lib/utils";

interface MarqueeProps {
  items: string[];
  className?: string;
  speed?: "normal" | "slow";
}

export function Marquee({ items, className, speed = "normal" }: MarqueeProps) {
  return (
    <div
      className={cn(
        "ps-marquee-scroll relative w-full overflow-hidden",
        "[mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]",
        className
      )}
    >
      <div className={cn("ps-marquee-track flex w-max", speed === "slow" && "ps-marquee-track--slow")}>
        {[0, 1].map((dup) => (
          <div key={dup} className="flex shrink-0 items-center" aria-hidden={dup === 1}>
            {items.map((item, i) => (
              <span key={`${dup}-${i}`} className="flex items-center">
                <span className="px-6 text-sm font-medium uppercase tracking-[0.12em] text-text-body">{item}</span>
                <span className="h-1 w-1 shrink-0 rounded-full bg-text-hint/40" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
