import Image from "next/image";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/app/shared/lib/utils";

const outfitCardVariants = cva("flex overflow-hidden", {
  variants: {
    variant: {
      default:
        "w-[13.542vw] shrink-0 flex-col gap-[0.417vw] rounded-[0.729vw] bg-outfit-card-bg p-[0.833vw]",
      saved: "w-[10.573vw] flex-col gap-[0.417vw] rounded-[0.729vw] bg-[#E5E6E8] p-[0.417vw]",
      occasion:
        "relative min-h-[13.021vw] min-w-[9.531vw] flex-1 rounded-[1.042vw] bg-[#E8E5E0]",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const outfitImageVariants = cva("relative w-full overflow-hidden", {
  variants: {
    variant: {
      default: "self-stretch rounded-[0.729vw]",
      saved: "h-[12.083vw] rounded-[1.042vw]",
      occasion: "absolute inset-0",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

interface OutfitCardProps extends VariantProps<typeof outfitCardVariants> {
  imageUrl: string;
  imageAlt: string;
  imageWidth?: number;
  imageHeight?: number;
  imageOverlay?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

function OutfitCard({
  variant,
  imageUrl,
  imageAlt,
  imageWidth,
  imageHeight,
  imageOverlay,
  children,
  className,
  onClick,
}: OutfitCardProps) {
  const isOccasion = variant === "occasion";
  const useFill = variant === "saved" || variant === "occasion";

  return (
    <div className={cn(outfitCardVariants({ variant }), className)} onClick={onClick} role={onClick ? "button" : undefined}>
      <div className={outfitImageVariants({ variant })}>
        {useFill ? (
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            className={cn("object-cover object-center", isOccasion && "scale-[1.4]")}
          />
        ) : (
          <Image
            src={imageUrl}
            alt={imageAlt}
            width={imageWidth ?? 300}
            height={imageHeight ?? 433}
            className="h-auto w-full rounded-[0.417vw] object-cover"
          />
        )}
        {imageOverlay}
      </div>
      {isOccasion ? (
        <div className="absolute inset-x-0 bottom-0">{children}</div>
      ) : (
        children
      )}
    </div>
  );
}

export { OutfitCard, outfitCardVariants };
