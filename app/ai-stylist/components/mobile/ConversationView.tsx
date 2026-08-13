"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/app/shared/components/ui";
import {
  AIStylistIcon,
  SendIcon,
  MicIcon,
  CameraIcon,
  CloudUploadIcon,
  CheckIcon,
  ArrowRightIcon,
  BookmarkOutlineIcon,
  BookmarkIcon,
  PeopleIcon,
  ShareIcon,
} from "@/app/shared/components/icons";
import {
  SegmentedControl,
  SegmentedControlList,
  SegmentedControlItem,
  SegmentedControlDivider,
} from "@/app/shared/components/ui";
import type { ChatMessage, OutfitSuggestion, ConversationPhase } from "@/app/ai-stylist/types";
import type { BodyType } from "@/app/try-on/types";

// ── Model data (same as desktop) ──

const FULL_BODY_MODELS = [
  { id: "model-aria", name: "Alex", image: "https://res.cloudinary.com/dgvtynla7/image/upload/v1759158294/uploads/models/Gemini_Generated_Image_ggglo3ggglo3gggl_j8t2n7.png" },
  { id: "model-jade", name: "Jordan", image: "https://res.cloudinary.com/dgvtynla7/image/upload/v1759158297/uploads/models/Gemini_Generated_Image_mqofyzmqofyzmqof_kexvft.png" },
  { id: "model-ryan", name: "Ryan", image: "https://res.cloudinary.com/dgvtynla7/image/upload/v1759158300/uploads/models/Gemini_Generated_Image_mvog7tmvog7tmvog_twstkb.png" },
  { id: "model-luna", name: "Luna", image: "https://res.cloudinary.com/dgvtynla7/image/upload/v1759158303/uploads/models/Gemini_Generated_Image_qd9vd1qd9vd1qd9v_fv9sxk.png" },
  { id: "model-leo", name: "Sophia", image: "https://res.cloudinary.com/dgvtynla7/image/upload/v1759158306/uploads/models/Gemini_Generated_Image_wxdd66wxdd66wxdd_synj3e.png" },
  { id: "model-zoe", name: "Zoe", image: "https://res.cloudinary.com/dgvtynla7/image/upload/v1759158309/uploads/models/Gemini_Generated_Image_z4wksnz4wksnz4wk_pbbbmf.png" },
];

const CLOSE_UP_MODELS = [
  { id: "closeup-1", name: "Emma", image: "https://res.cloudinary.com/dgvtynla7/image/upload/v1759827295/Gemini_Generated_Image_p2ryawp2ryawp2ry_dbzyk1.png" },
  { id: "closeup-2", name: "Olivia", image: "https://res.cloudinary.com/dgvtynla7/image/upload/v1759827295/Gemini_Generated_Image_jdaof3jdaof3jdao_dc7cty.png" },
  { id: "closeup-3", name: "Ava", image: "https://res.cloudinary.com/dgvtynla7/image/upload/v1759827292/Gemini_Generated_Image_fa3il5fa3il5fa3i_rita3y.png" },
  { id: "closeup-4", name: "Mia", image: "https://res.cloudinary.com/dgvtynla7/image/upload/v1759827285/model-1_rbgx6s.webp" },
];

function thumb(url: string, w = 200, h = 280): string {
  return url.replace("/upload/", `/upload/w_${w},h_${h},c_fill,g_face,q_auto/`);
}

// ── Sub-components ──

interface ChatBubbleProps {
  message: ChatMessage;
  userInitials?: string;
}

function ChatBubble({ message, userInitials = "MZ" }: ChatBubbleProps) {
  if (message.role === "ai") {
    return (
      <div className="flex gap-2 self-stretch">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-send-button-bg p-1">
          <AIStylistIcon size={18} color="white" starColor="white" />
        </div>
        <div className="rounded-br-xl rounded-bl-xl rounded-tr-xl rounded-tl-[2px] bg-weather-pill-bg px-3 py-2">
          <p className="whitespace-pre-line text-sm leading-[1.571em] text-black">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-2 self-stretch">
      <div className="rounded-bl-xl rounded-br-xl rounded-tl-xl rounded-tr-[2px] bg-surface-muted px-3 py-2">
        <p className="text-sm leading-[1.571em] text-black">{message.content}</p>
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue-light">
        <span className="text-xs font-medium text-brand-blue-dark">{userInitials}</span>
      </div>
    </div>
  );
}

interface ModelSelectionProps {
  onSelectModel: (image: string) => void;
}

function ModelSelection({ onSelectModel }: ModelSelectionProps) {
  const [bodyType, setBodyType] = useState<BodyType>("full-body");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const models = bodyType === "full-body" ? FULL_BODY_MODELS : CLOSE_UP_MODELS;

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  const handleConfirm = () => {
    const model = models.find((m) => m.id === selectedId);
    if (model) onSelectModel(model.image);
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex rounded-full bg-surface-light p-1.5">
        <div className="flex flex-1 items-center justify-center gap-2 rounded-[300px] bg-brand-blue-pale px-3 py-2">
          <CameraIcon size={20} color="var(--brand-blue)" />
          <span className="text-sm leading-[1.571em] text-brand-blue">Choose Model</span>
        </div>
        <div className="flex flex-1 items-center justify-center gap-2 rounded-[30px] px-3 py-2">
          <CloudUploadIcon size={20} color="var(--text-muted)" />
          <span className="text-sm leading-[1.571em] text-text-muted">Upload Photo</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[20px] border border-divider bg-surface-light p-4">
        <p className="text-xs leading-[1.667em] text-text-primary">
          No photo needed. Choose from our models and see how outfits look instantly:
        </p>

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

        <div className="grid grid-cols-3 gap-2">
          {models.map((model) => (
            <Button
              key={model.id}
              variant="ghost"
              className={`h-auto overflow-hidden rounded-xl p-0 ${
                selectedId === model.id
                  ? "ring-[3px] ring-brand-blue"
                  : "ring-[3px] ring-transparent hover:ring-brand-blue/30"
              }`}
              onClick={() => handleSelect(model.id)}
            >
              <Image
                src={thumb(model.image)}
                alt={model.name}
                width={110}
                height={bodyType === "close-up" ? 160 : 140}
                className="h-full w-full object-cover"
              />
            </Button>
          ))}
        </div>

        <Button
          variant="primary"
          className="w-full"
          disabled={!selectedId}
          onClick={handleConfirm}
        >
          <CheckIcon size={16} color="white" />
          Save Model
        </Button>
      </div>
    </div>
  );
}

interface OutfitCardMobileProps {
  outfit: OutfitSuggestion;
  onEditOutfit?: (outfit: OutfitSuggestion) => void;
  onToggleBookmark?: (outfitId: string) => void;
}

function OutfitCardMobile({ outfit, onEditOutfit, onToggleBookmark }: OutfitCardMobileProps) {
  const BmIcon = outfit.isBookmarked ? BookmarkIcon : BookmarkOutlineIcon;

  return (
    <div className="flex flex-col gap-2 rounded-[14px] bg-outfit-card-bg p-2">
      <div className="relative w-full overflow-hidden rounded-[14px]" style={{ aspectRatio: "4/5" }}>
        {outfit.imageUrl ? (
          <Image src={outfit.imageUrl} alt={outfit.title} fill className="object-cover object-top" sizes="45vw" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-disabled">
            <span className="text-xs text-text-muted">No preview</span>
          </div>
        )}
        <div className="absolute inset-x-2 bottom-2 flex items-end justify-between">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-auto rounded-full bg-white/80 p-1 backdrop-blur-sm"
              onClick={() => onToggleBookmark?.(outfit.id)}
            >
              <BmIcon size={12} color="var(--accent-purple-text)" />
            </Button>
            <div className="flex items-center gap-0.5 rounded-full bg-warning-bg px-1 py-0.5">
              <PeopleIcon size={10} color="var(--warning-text)" />
              <span className="text-[9px] font-medium leading-none text-warning-text">20</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-auto rounded-full bg-brand-blue p-1"
          >
            <ShareIcon size={12} color="white" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="truncate text-xs leading-[1.667em] text-text-primary">{outfit.title}</p>
        <div className="flex gap-1">
          <span className="text-xs leading-[1.667em] text-chat-placeholder">Budget:</span>
          <span className="text-xs leading-[1.667em] text-text-primary">{outfit.budget}</span>
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="xs" className="flex-1 justify-center text-[10px]">
            View Items
            <ArrowRightIcon size={12} color="var(--brand-blue)" />
          </Button>
          <Button
            variant="ghost"
            size="xs"
            className="flex-1 justify-center bg-accent-purple-light text-[10px] text-accent-purple-text"
            onClick={() => onEditOutfit?.(outfit)}
          >
            <PeopleIcon size={12} color="var(--accent-purple-text)" />
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main ConversationView ──

interface ConversationViewProps {
  messages: ChatMessage[];
  outfits: OutfitSuggestion[];
  phase: ConversationPhase | null;
  isLoading?: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onSelectModel: (modelImage: string) => void;
  onEditOutfit?: (outfit: OutfitSuggestion) => void;
  onToggleBookmark?: (outfitId: string) => void;
  userInitials?: string;
}

export function ConversationView({
  messages,
  outfits,
  phase,
  isLoading,
  inputValue,
  onInputChange,
  onSend,
  onSelectModel,
  onEditOutfit,
  onToggleBookmark,
  userInitials,
}: ConversationViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAwaitingModel = phase === "awaiting_model";
  const isGenerating = phase === "generating";
  const hasOutfits = phase === "complete" || phase === "follow_up";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isLoading, outfits]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-3">
        {messages.map((msg) => {
          if (msg.type === "loading" || msg.type === "model-preview") return null;
          return <ChatBubble key={msg.id} message={msg} userInitials={userInitials} />;
        })}

        {isLoading && !isGenerating && (
          <div className="flex gap-2 self-stretch">
            <div className="flex h-8 w-8 shrink-0 animate-pulse items-center justify-center rounded-full bg-send-button-bg p-1">
              <AIStylistIcon size={18} color="white" starColor="white" />
            </div>
          </div>
        )}

        {isAwaitingModel && <ModelSelection onSelectModel={onSelectModel} />}

        {isGenerating && (
          <div className="flex flex-col items-center gap-2 py-6">
            <div className="flex h-8 w-8 animate-pulse items-center justify-center rounded-full bg-send-button-bg p-1">
              <AIStylistIcon size={18} color="white" starColor="white" />
            </div>
            <span className="text-sm text-text-muted">Styling your looks...</span>
          </div>
        )}

        {hasOutfits && outfits.length > 0 && (
          <div className="flex flex-col gap-3">
            <span className="text-sm leading-[1.571em] text-text-subtitle">
              {outfits.length} outfits preview
            </span>
            <div className="grid grid-cols-2 gap-2">
              {outfits.map((outfit) => (
                <OutfitCardMobile
                  key={outfit.id}
                  outfit={outfit}
                  onEditOutfit={onEditOutfit}
                  onToggleBookmark={onToggleBookmark}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chat input */}
      <div className="mb-1 flex w-full items-center gap-3 rounded-[30px] border border-[#d1d1d1] bg-[#f0f0f0] py-2 pl-4 pr-3">
        <input
          type="text"
          placeholder="Want some changes?"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && inputValue.trim()) onSend();
          }}
          className="flex-1 bg-transparent text-sm leading-[1.571em] text-text-subtitle placeholder:text-text-hint focus:outline-none"
        />
        <div className="flex items-center gap-3">
          <MicIcon size={24} color="var(--text-subtitle)" />
          <Button
            variant="ghost"
            size="icon-sm"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7258fa] p-0"
            onClick={onSend}
          >
            <SendIcon size={14} color="white" />
          </Button>
        </div>
      </div>
    </div>
  );
}
