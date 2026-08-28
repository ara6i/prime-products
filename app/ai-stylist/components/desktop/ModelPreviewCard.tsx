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

/** CDN model URLs used by the backend for VTO. */
export const FULL_BODY_MODELS = [
  { id: "model-noah", name: "Noah", image: "https://d3u1mcyz6rhw9o.cloudfront.net/runtime/legacy/source-url/726c7df49860de8d36229e3c65979743e497778e88c346721ea05406ac6136a5.png", preview: "/images/models/model-1.png", gender: "male" },
  { id: "model-aria", name: "Alex", image: "https://d3u1mcyz6rhw9o.cloudfront.net/runtime/legacy/source-url/7477a2217b6b09fd808d8610a04ceaf1655d981eaa1392811097aec4f4c0a1b4.png", preview: "/images/models/model-2.png", gender: "male" },
  { id: "model-jade", name: "Jordan", image: "https://d3u1mcyz6rhw9o.cloudfront.net/runtime/legacy/source-url/06faed0b9b6a4c0fa16206a250eda4c30f205684c579949eb7cfa55dc5063451.png", preview: "/images/models/model-3.png", gender: "male" },
  { id: "model-ryan", name: "Ryan", image: "https://d3u1mcyz6rhw9o.cloudfront.net/runtime/legacy/source-url/422f2456bdb8485b5eb59c825df777ea08c87755fef0e8ad271dddb482f64e56.png", preview: "/images/models/model-4.png", gender: "female" },
  { id: "model-luna", name: "Luna", image: "https://d3u1mcyz6rhw9o.cloudfront.net/runtime/legacy/source-url/9781016f449a65d9c43f245d3bdfc3c5e82e1aa6ef99860563cfff4b502e5847.png", preview: "/images/models/model-5.png", gender: "female" },
  { id: "model-leo", name: "Sophia", image: "https://d3u1mcyz6rhw9o.cloudfront.net/runtime/legacy/source-url/f578df53ab4129ed032dda892b41e7f68e927ce865c8deb000a7ae6da51ccfac.png", preview: "/images/models/model-6.png", gender: "female" },
  { id: "model-zoe", name: "Zoe", image: "https://d3u1mcyz6rhw9o.cloudfront.net/runtime/legacy/source-url/1256470b035b08ffa60b2c66de34ce3afedb5c71ebff05a8a74cf3e89d7b100f.png", preview: "/images/models/model-7.png", gender: "female" },
  { id: "model-evelyn", name: "Evelyn", image: "https://d3u1mcyz6rhw9o.cloudfront.net/runtime/legacy/source-url/0569ed0de03a8ec9eb4eba928a83b0ce5246c3d5b0df7ddfdcb6962068c44bbb.png", preview: "/images/models/model-8.png", gender: "female" },
];

export const CLOSE_UP_MODELS = [
  { id: "closeup-1", name: "Emma", image: "https://d3u1mcyz6rhw9o.cloudfront.net/runtime/legacy/source-url/8ddabaf88245d2367948252e98696779f74d0f5539f47249c47fc20fdae0b87b.png", preview: "/images/models/closeup-1.png", gender: "female" },
  { id: "closeup-2", name: "Olivia", image: "https://d3u1mcyz6rhw9o.cloudfront.net/runtime/legacy/source-url/eec552380ba895704cc5686215423c80f3d632a0b98e2d68f870d57a420e2d49.png", preview: "/images/models/closeup-2.png", gender: "female" },
  { id: "closeup-3", name: "Ava", image: "https://d3u1mcyz6rhw9o.cloudfront.net/runtime/legacy/source-url/5bebadf4973332c5192c1b4c311d48c0218877957f9b1dc1ed94b48c84bd36f6.png", preview: "/images/models/closeup-3.png", gender: "female" },
  { id: "closeup-4", name: "Mia", image: "https://d3u1mcyz6rhw9o.cloudfront.net/runtime/legacy/source-url/0edc381847baca65b60ac71e3ba5714854f52c0125c0d8f2f525c5f18102ac76.webp", preview: "/images/models/closeup-4.png", gender: "female" },
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
