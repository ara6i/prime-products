import { Eyebrow } from "./Eyebrow";
import { Reveal } from "./Reveal";
import { cn } from "@/app/shared/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
  className?: string;
}

export function SectionHeading({ eyebrow, title, subtitle, align = "center", className }: SectionHeadingProps) {
  return (
    <Reveal
      variant="fade"
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className
      )}
    >
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="text-[clamp(2rem,1.6rem+2vw,3.25rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-text-primary">
        {title}
      </h2>
      {subtitle ? (
        <p className="max-w-[52ch] text-[clamp(0.95rem,0.9rem+0.25vw,1.125rem)] leading-[1.6] text-text-body">
          {subtitle}
        </p>
      ) : null}
    </Reveal>
  );
}
