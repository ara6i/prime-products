"use client";

import { useMemo, useState } from "react";
import { RotateCcw, RotateCw, Shirt, UserRound } from "lucide-react";
import { MODEL_PLATFORM_IMAGES } from "@/app/ai-stylist/data";

interface MobileStylistStageProps {
  slotImages?: Array<string | null | undefined>;
  onReset?: () => void;
  onEditModel?: () => void;
}

const POSITIONS = {
  "-2": { left: "15%", height: "42%", bottom: "25%", zIndex: 3 },
  "-1": { left: "32%", height: "58%", bottom: "21%", zIndex: 5 },
  "0": { left: "50%", height: "70%", bottom: "17%", zIndex: 8 },
  "1": { left: "68%", height: "58%", bottom: "21%", zIndex: 5 },
  "2": { left: "85%", height: "42%", bottom: "25%", zIndex: 3 },
} as const;

function relativePosition(
  index: number,
  activeIndex: number,
): -2 | -1 | 0 | 1 | 2 {
  const offset = (index - activeIndex + 5) % 5;
  if (offset === 3) return -2;
  if (offset === 4) return -1;
  return offset as 0 | 1 | 2;
}

export function MobileStylistStage({
  slotImages,
  onReset,
  onEditModel,
}: MobileStylistStageProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const images = useMemo(
    () =>
      Array.from(
        { length: 5 },
        (_, index) => slotImages?.[index] || MODEL_PLATFORM_IMAGES[index],
      ),
    [slotImages],
  );

  const rotate = (direction: -1 | 1) => {
    setActiveIndex(
      (current) => (current + direction + images.length) % images.length,
    );
  };

  return (
    <section
      aria-label="Your five generated outfits"
      className="relative aspect-[2/3] min-h-[430px] w-full shrink-0 overflow-hidden rounded-[20px] border border-[#d8d6dc] bg-[#d9d7dd]"
      style={{
        backgroundImage:
          "url('/images/ai-stylist/Gemini_Generated_Image_fjyzt7fjyzt7fjyz.png')",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/ai-stylist/platform-disc-tight.png"
        alt=""
        className="absolute bottom-[16%] left-1/2 z-[2] w-[96%] -translate-x-1/2 brightness-[1.18] saturate-[0.32] contrast-[1.08] drop-shadow-[0_12px_12px_rgba(0,0,0,0.24)]"
        draggable={false}
      />

      {images.map((image, index) => {
        if (!image) return null;
        const relative = relativePosition(index, activeIndex);
        const position = POSITIONS[String(relative) as keyof typeof POSITIONS];
        return (
          // The generated/processed images are dynamic local or Cloudinary URLs.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${index}-${image}`}
            src={image}
            alt={relative === 0 ? `Outfit ${index + 1}, selected` : ""}
            className="absolute w-auto -translate-x-1/2 object-contain transition-[left,height,bottom,filter,opacity] duration-500 ease-out"
            style={{
              left: position.left,
              height: position.height,
              bottom: position.bottom,
              zIndex: position.zIndex,
              filter: relative === 0 ? "brightness(1.03)" : "brightness(0.76)",
              opacity: Math.abs(relative) === 2 ? 0.82 : 1,
            }}
            draggable={false}
          />
        );
      })}

      {onReset && (
        <button
          type="button"
          onClick={onReset}
          aria-label="Start styling again"
          className="absolute left-3 top-3 z-20 flex size-12 items-center justify-center rounded-full border-[6px] border-white/75 bg-[#2457eb] text-white shadow-[0_5px_14px_rgba(36,33,44,0.16)]"
        >
          <RotateCcw className="size-5" />
        </button>
      )}

      <div className="absolute right-3 top-3 z-20 flex flex-col rounded-full border-[6px] border-white/75 bg-white/70 p-1 shadow-[0_5px_14px_rgba(36,33,44,0.14)]">
        <button
          type="button"
          aria-label="View outfit"
          className="flex size-11 items-center justify-center rounded-full bg-[#bdd7ff] text-[#2457eb]"
        >
          <Shirt className="size-5" />
        </button>
        <button
          type="button"
          onClick={onEditModel}
          aria-label="Edit model"
          className="mt-1 flex size-11 items-center justify-center rounded-full bg-[#bdd7ff] text-[#2457eb]"
        >
          <UserRound className="size-5" />
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-[6%] z-20 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => rotate(-1)}
          aria-label="Previous outfit"
          className="flex size-11 items-center justify-center rounded-full bg-[#2457eb] text-xl font-semibold text-white shadow-lg"
        >
          <RotateCcw className="size-5" />
        </button>
        <p className="min-w-[58px] text-center text-sm text-[#4f4b55]">
          <span className="font-semibold text-[#2457eb]">
            {activeIndex + 1}
          </span>{" "}
          of {images.length}
        </p>
        <button
          type="button"
          onClick={() => rotate(1)}
          aria-label="Next outfit"
          className="flex size-11 items-center justify-center rounded-full bg-[#2457eb] text-xl font-semibold text-white shadow-lg"
        >
          <RotateCw className="size-5" />
        </button>
      </div>
    </section>
  );
}
