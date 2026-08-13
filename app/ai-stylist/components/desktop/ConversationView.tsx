"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { ChatBubble, LoadingIndicator } from "./ChatBubble";
import { ModelPreviewCard } from "./ModelPreviewCard";
import { OutfitCarousel } from "./OutfitCarousel";
import { ChatInput } from "./ChatInput";
import { StylingLoadingAnimation } from "./StylingLoadingAnimation";
import { Button } from "@/app/shared/components/ui";
import type { ChatMessage, OutfitSuggestion, ConversationPhase } from "@/app/ai-stylist/types";

interface ConversationViewProps {
  messages: ChatMessage[];
  outfits: OutfitSuggestion[];
  phase: ConversationPhase;
  isLoading?: boolean;
  selectedModelImage?: string | null;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onSelectModel: (modelImage: string) => void;
  onEditOutfit?: (outfit: OutfitSuggestion) => void;
  onToggleBookmark?: (outfitId: string) => void;
  userInitials?: string;
  userPhotoUrl?: string | null;
}

export function ConversationView({
  messages,
  outfits,
  phase,
  isLoading,
  selectedModelImage,
  inputValue,
  onInputChange,
  onSend,
  onSelectModel,
  onEditOutfit,
  onToggleBookmark,
  userInitials,
  userPhotoUrl,
}: ConversationViewProps) {
  const isAwaitingModel = phase === "awaiting_model";
  const isGenerating = phase === "generating";
  const hasOutfits = phase === "complete" || phase === "follow_up";

  const scrollRef = useRef<HTMLDivElement>(null);
  const modelCardRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLDivElement>(null);

  // Track if the "Choose Model" button is visible in viewport
  const [hasSelection, setHasSelection] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(true);
  const selectedModelRef = useRef<string | null>(null);

  // Observe the confirm button visibility for floating button
  useEffect(() => {
    if (!confirmBtnRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setConfirmVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(confirmBtnRef.current);
    return () => observer.disconnect();
  }, [isAwaitingModel]);

  const showFloatingButton = isAwaitingModel && hasSelection && !confirmVisible;

  // Auto-scroll to bottom when messages change (not during model selection)
  useEffect(() => {
    if (!isAwaitingModel && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isLoading, isAwaitingModel, outfits]);

  // Scroll to model card when it appears
  useEffect(() => {
    if (isAwaitingModel && modelCardRef.current) {
      modelCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isAwaitingModel]);

  // Find the last AI message index for typing animation
  let lastAiIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "ai" && messages[i].type !== "loading") {
      lastAiIdx = i;
      break;
    }
  }

  const handleModelSelect = useCallback(
    (modelImage: string) => {
      selectedModelRef.current = modelImage;
      setHasSelection(true);
    },
    []
  );

  const handleConfirmModel = useCallback(() => {
    if (selectedModelRef.current) {
      onSelectModel(selectedModelRef.current);
    }
  }, [onSelectModel]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col self-stretch overflow-hidden">
      {/* Scrollable area */}
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-[0.625vw] overflow-y-auto overflow-x-hidden px-[2.5vw] pt-[2.5vw] pb-[1.25vw]"
      >
        {messages.map((message, idx) => {
          if (message.type === "loading") return null;

          /* Model preview card — hide during/after generation */
          if (message.type === "model-preview") {
            if (isGenerating || hasOutfits) return null;
            return (
              <div
                key={message.id}
                className="flex justify-end gap-[0.521vw] self-stretch"
              >
                <ModelPreviewCard />
                <div className="pt-[1.823vw]">
                  <UserAvatarInline initials={userInitials} photoUrl={userPhotoUrl} />
                </div>
              </div>
            );
          }

          return (
            <ChatBubble
              key={message.id}
              message={message}
              userInitials={userInitials}
              userPhotoUrl={userPhotoUrl}
              animate={idx === lastAiIdx}
            />
          );
        })}

        {/* Thinking indicator — shown while waiting for backend (not during generation) */}
        {isLoading && !isGenerating && <LoadingIndicator />}

        {/* Model selection — shown when awaiting model choice */}
        {isAwaitingModel && (
          <div ref={modelCardRef} className="flex justify-end gap-[0.521vw] self-stretch">
            <ModelPreviewCard
              onSelectModel={handleModelSelect}
              autoScroll={false}
              onConfirm={handleConfirmModel}
              confirmBtnRef={confirmBtnRef}
            />
            <div className="pt-[1.823vw]">
              <UserAvatarInline initials={userInitials} photoUrl={userPhotoUrl} />
            </div>
          </div>
        )}

        {/* Outfit generation animation */}
        {isGenerating && (
          <div className="flex justify-center px-[0.833vw]">
            <div className="aspect-[3/4] w-full max-w-[15.625vw] overflow-hidden rounded-[0.833vw]">
              <StylingLoadingAnimation modelImage={selectedModelImage} />
            </div>
          </div>
        )}

        {/* Outfit carousel — only shown when outfits are ready */}
        {hasOutfits && outfits.length > 0 && (
          <OutfitCarousel
            title={`${outfits.length} outfits preview`}
            outfits={outfits}
            onEditOutfit={onEditOutfit}
            onToggleBookmark={onToggleBookmark}
          />
        )}
      </div>

      {/* Floating "Choose Model" button — appears when scrolled away from confirm button */}
      {showFloatingButton && (
        <div className="pointer-events-none absolute bottom-[4.167vw] left-0 right-0 z-30 flex justify-center">
          <Button
            variant="primary"
            size="sm"
            onClick={handleConfirmModel}
            className="pointer-events-auto shadow-lg"
          >
            Choose Model
          </Button>
        </div>
      )}

      {/* Chat Input — pinned at bottom */}
      <div className="flex shrink-0 items-center justify-center py-[1.25vw]">
        <ChatInput
          value={inputValue}
          onChange={onInputChange}
          onSend={onSend}
          placeholder="Want some changes?"
          maxWidth="max-w-[31.25vw]"
          showBadge={false}
        />
      </div>
    </div>
  );
}

function UserAvatarInline({ initials, photoUrl }: { initials?: string; photoUrl?: string | null }) {
  if (photoUrl) {
    return (
      <div className="flex h-[1.979vw] w-[1.979vw] shrink-0 overflow-hidden rounded-full">
        {/* User profile images may come from arbitrary signed storage URLs. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl} alt="You" className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="flex w-[1.979vw] shrink-0 items-center justify-center rounded-full bg-brand-blue-light p-[0.417vw]">
      <span className="text-center text-[0.729vw] font-normal leading-[1.146vw] text-brand-blue-dark">
        {initials ?? "ME"}
      </span>
    </div>
  );
}
