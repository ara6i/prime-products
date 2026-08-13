"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/app/shared/components/ui";
import {
  SegmentedControl,
  SegmentedControlList,
  SegmentedControlItem,
  SegmentedControlDivider,
} from "@/app/shared/components/ui";
import { CameraIcon, CloudUploadIcon } from "@/app/shared/components/icons";
import type { BodyType } from "@/app/try-on/types";

/** Models with Cloudinary URLs — these are the actual images the backend uses for VTO */
export const FULL_BODY_MODELS = [
  { id: "model-noah", name: "Noah", image: "https://res.cloudinary.com/dgvtynla7/image/upload/v1759158291/uploads/models/Gemini_Generated_Image_6dl5ms6dl5ms6dl5_qixku9.png", preview: "/images/models/model-1.png", gender: "male" },
  { id: "model-aria", name: "Alex", image: "https://res.cloudinary.com/dgvtynla7/image/upload/v1759158294/uploads/models/Gemini_Generated_Image_ggglo3ggglo3gggl_j8t2n7.png", preview: "/images/models/model-2.png", gender: "male" },
  { id: "model-jade", name: "Jordan", image: "https://res.cloudinary.com/dgvtynla7/image/upload/v1759158297/uploads/models/Gemini_Generated_Image_mqofyzmqofyzmqof_kexvft.png", preview: "/images/models/model-3.png", gender: "male" },
  { id: "model-ryan", name: "Ryan", image: "https://res.cloudinary.com/dgvtynla7/image/upload/v1759158300/uploads/models/Gemini_Generated_Image_mvog7tmvog7tmvog_twstkb.png", preview: "/images/models/model-4.png", gender: "female" },
  { id: "model-luna", name: "Luna", image: "https://res.cloudinary.com/dgvtynla7/image/upload/v1759158303/uploads/models/Gemini_Generated_Image_qd9vd1qd9vd1qd9v_fv9sxk.png", preview: "/images/models/model-5.png", gender: "female" },
  { id: "model-leo", name: "Sophia", image: "https://res.cloudinary.com/dgvtynla7/image/upload/v1759158306/uploads/models/Gemini_Generated_Image_wxdd66wxdd66wxdd_synj3e.png", preview: "/images/models/model-6.png", gender: "female" },
  { id: "model-zoe", name: "Zoe", image: "https://res.cloudinary.com/dgvtynla7/image/upload/v1759158309/uploads/models/Gemini_Generated_Image_z4wksnz4wksnz4wk_pbbbmf.png", preview: "/images/models/model-7.png", gender: "female" },
  { id: "model-evelyn", name: "Evelyn", image: "https://res.cloudinary.com/dgvtynla7/image/upload/v1759158313/uploads/models/GeneratedImage_ttcflg.png", preview: "/images/models/model-8.png", gender: "female" },
];

export const CLOSE_UP_MODELS = [
  { id: "closeup-1", name: "Emma", image: "https://res.cloudinary.com/dgvtynla7/image/upload/v1759827295/Gemini_Generated_Image_p2ryawp2ryawp2ry_dbzyk1.png", preview: "/images/models/closeup-1.png", gender: "female" },
  { id: "closeup-2", name: "Olivia", image: "https://res.cloudinary.com/dgvtynla7/image/upload/v1759827295/Gemini_Generated_Image_jdaof3jdaof3jdao_dc7cty.png", preview: "/images/models/closeup-2.png", gender: "female" },
  { id: "closeup-3", name: "Ava", image: "https://res.cloudinary.com/dgvtynla7/image/upload/v1759827292/Gemini_Generated_Image_fa3il5fa3il5fa3i_rita3y.png", preview: "/images/models/closeup-3.png", gender: "female" },
  { id: "closeup-4", name: "Mia", image: "https://res.cloudinary.com/dgvtynla7/image/upload/v1759827285/model-1_rbgx6s.webp", preview: "/images/models/closeup-4.png", gender: "female" },
];

interface ModelPreviewCardProps {
  onSelectModel?: (modelImage: string) => void;
  onConfirm?: () => void;
  autoScroll?: boolean;
  confirmBtnRef?: React.RefObject<HTMLDivElement | null>;
}

export function ModelPreviewCard({ onSelectModel, onConfirm, autoScroll = true, confirmBtnRef }: ModelPreviewCardProps) {
  const [bodyType, setBodyType] = useState<BodyType>("full-body");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const models = bodyType === "full-body" ? FULL_BODY_MODELS : CLOSE_UP_MODELS;
  const selectedModel = models.find((m) => m.id === selectedId);

  // Auto-scroll to the header when component mounts
  useEffect(() => {
    if (autoScroll && headerRef.current) {
      headerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [autoScroll]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    const model = models.find((m) => m.id === id);
    if (model && onSelectModel) {
      onSelectModel(model.image);
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else if (selectedModel && onSelectModel) {
      onSelectModel(selectedModel.image);
    }
  };

  return (
    <div className="flex w-full max-w-[35.938vw] flex-col items-center gap-[0.417vw] py-[1.25vw]">
      {/* Step Tabs */}
      <div ref={headerRef} className="flex self-stretch rounded-full bg-surface-light p-[0.417vw]">
        <div className="flex flex-1 items-center justify-center gap-[0.521vw] rounded-[15.625vw] bg-brand-blue-pale px-[0.625vw] py-[0.417vw]">
          <CameraIcon size={24} className="!w-[1.25vw] !h-[1.25vw]" color="var(--brand-blue)" />
          <span className="text-[0.833vw] font-normal leading-[1.354vw] text-brand-blue">
            Choose Model
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center gap-[0.521vw] rounded-[1.563vw] px-[0.625vw] py-[0.417vw]">
          <CloudUploadIcon size={24} className="!w-[1.25vw] !h-[1.25vw]" color="var(--text-muted)" />
          <span className="text-[0.833vw] font-normal leading-[1.354vw] text-text-muted">
            Upload Photo
          </span>
        </div>
      </div>

      {/* Content Card */}
      <div className="flex flex-col gap-[0.833vw] self-stretch rounded-[1.042vw] border border-border-light bg-surface-light p-[1.25vw]">
        <p className="text-[0.729vw] font-normal leading-[1.146vw] text-text-primary">
          No photo needed. Choose from our models and see how outfits look instantly:
        </p>

        {/* Full Body / Close-up segmented control */}
        <SegmentedControl
          value={bodyType}
          onValueChange={(v) => {
            setBodyType(v as BodyType);
            setSelectedId(null);
          }}
        >
          <SegmentedControlList>
            <SegmentedControlItem value="full-body">Full Body</SegmentedControlItem>
            <SegmentedControlDivider />
            <SegmentedControlItem value="close-up">Close-up</SegmentedControlItem>
          </SegmentedControlList>
        </SegmentedControl>

        {/* Model Grid — 4 per row */}
        <div className="flex flex-wrap gap-[0.625vw] self-stretch">
          {models.map((model) => (
            <button
              key={model.id}
              type="button"
              onClick={() => handleSelect(model.id)}
              className={`w-[calc((100%-1.875vw)/4)] overflow-hidden transition-all ${
                bodyType === "close-up" ? "rounded-[1.042vw]" : "rounded-[0.833vw]"
              } ${
                selectedId === model.id
                  ? "border-[0.156vw] border-brand-blue"
                  : "border-[0.156vw] border-transparent hover:border-brand-blue/30"
              }`}
            >
              <Image
                src={model.preview}
                alt={model.name}
                width={148}
                height={bodyType === "close-up" ? 222 : 185}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>

        {/* Action Button */}
        {onSelectModel ? (
          <div ref={confirmBtnRef}>
            <Button
              variant="primary"
              size="default"
              disabled={!selectedId}
              className="w-full"
              onClick={handleConfirm}
            >
              Choose Model
            </Button>
          </div>
        ) : (
          selectedId && (
            <Button
              variant="primary"
              size="sm"
              className="self-start rounded-full bg-[#2C7A4B] px-[0.833vw] hover:bg-[#2C7A4B]/90"
            >
              ✓ Save as Model
            </Button>
          )
        )}
      </div>
    </div>
  );
}
