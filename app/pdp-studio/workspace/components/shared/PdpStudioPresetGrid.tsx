import Image from "next/image";
import type { PdpStudioOption } from "../../types";
import { PdpStudioButton } from "./PdpStudioButton";
import { PdpStudioUiIcon } from "./PdpStudioUiIcon";

interface PdpStudioPresetGridProps {
  items: PdpStudioOption[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  dense?: boolean;
}

export function PdpStudioPresetGrid({
  items,
  selectedId,
  onSelect,
  dense = false,
}: PdpStudioPresetGridProps) {
  return (
    <div className={dense ? "flex gap-3 overflow-x-auto pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "grid grid-cols-2 gap-[var(--space-pdp-sm)] sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"}>
      {items.map((item) => {
        const active = selectedId === item.id;
        return (
          <PdpStudioButton
            key={item.id}
            type="button"
            variant="ghost"
            data-active={active}
            onClick={() => onSelect?.(item.id)}
            className={["h-auto min-h-0 flex-col items-stretch gap-2 bg-transparent p-0 text-left text-[var(--color-pdp-ink)] hover:bg-transparent", dense ? "w-32 shrink-0" : ""].join(" ")}
          >
            <span
              className={[
                "relative block aspect-square w-full overflow-hidden rounded-[var(--radius-pdp-sm)] border",
                active
                  ? "border-[var(--color-pdp-accent)] outline outline-2 outline-offset-2 outline-[var(--color-pdp-accent-soft)]"
                  : "border-[var(--color-pdp-rule)]",
                "bg-[var(--color-pdp-surface-soft)]",
              ].join(" ")}
              style={item.swatch && item.swatch !== "checker" ? { backgroundColor: item.swatch } : undefined}
            >
              {item.image ? (
                <Image
                  src={item.image}
                  alt=""
                  fill
                  sizes="12rem"
                  className="object-cover"
                />
              ) : null}
              {item.swatch === "checker" ? (
                <span className="absolute inset-0 grid place-items-center text-[var(--color-pdp-accent)]">
                  <PdpStudioUiIcon name="template" size={30} />
                </span>
              ) : null}
            </span>
            <span className="truncate text-[0.75rem] font-medium">{item.label}</span>
          </PdpStudioButton>
        );
      })}
    </div>
  );
}
