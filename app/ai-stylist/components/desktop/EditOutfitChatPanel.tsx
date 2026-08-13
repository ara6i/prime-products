"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { AIStylistIcon } from "@/app/shared/components/icons";
import { ChatInput } from "./ChatInput";
import { useOutfitModificationChat } from "@/app/ai-stylist/hooks/useOutfitModificationChat";
import type {
  OutfitProduct,
  ModificationChatMessage,
  ReplacementProduct,
} from "@/app/ai-stylist/types";

interface EditOutfitChatPanelProps {
  outfitItems: OutfitProduct[];
  onAddItem?: (product: ReplacementProduct) => void;
  userInitials?: string;
  userPhotoUrl?: string | null;
}

export function EditOutfitChatPanel({
  outfitItems,
  onAddItem,
  userInitials,
  userPhotoUrl,
}: EditOutfitChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");

  const { messages, isLoading, sendMessage } = useOutfitModificationChat({
    outfitItems,
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isLoading]);

  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue.trim());
    setInputValue("");
  }, [inputValue, sendMessage]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Scrollable messages */}
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-[0.625vw] overflow-y-auto pb-[0.833vw]"
      >
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col gap-[0.625vw]">
            <MessageBubble
              message={msg}
              userInitials={userInitials}
              userPhotoUrl={userPhotoUrl}
            />
            {msg.replacementProducts && msg.replacementProducts.length > 0 && (
              <ReplacementGrid
                products={msg.replacementProducts}
                onAddItem={onAddItem}
              />
            )}
          </div>
        ))}

        {isLoading && <ThinkingIndicator />}
      </div>

      {/* Chat input pinned at bottom */}
      <div className="shrink-0 pt-[0.625vw]">
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          placeholder="Want some changes?"
          maxWidth="max-w-full"
          showBadge={false}
        />
      </div>
    </div>
  );
}

/* ─── Message Bubble ─── */

function MessageBubble({
  message,
  userInitials,
  userPhotoUrl,
}: {
  message: ModificationChatMessage;
  userInitials?: string;
  userPhotoUrl?: string | null;
}) {
  if (message.role === "ai") {
    return (
      <div className="flex self-stretch">
        <div className="flex gap-[0.417vw]">
          <div className="flex h-[1.563vw] w-[1.563vw] shrink-0 items-center justify-center rounded-full bg-send-button-bg p-[0.208vw]">
            <AIStylistIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="white" starColor="white" />
          </div>
          <div className="rounded-br-[0.625vw] rounded-bl-[0.625vw] rounded-tr-[0.625vw] rounded-tl-[0.104vw] bg-weather-pill-bg px-[0.625vw] py-[0.417vw]">
            <p className="whitespace-pre-line text-[0.729vw] font-normal leading-[1.094vw] text-black">
              {message.content}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end self-stretch">
      <div className="flex items-center justify-end gap-[0.417vw]">
        <div className="rounded-bl-[0.625vw] rounded-br-[0.625vw] rounded-tl-[0.625vw] rounded-tr-[0.104vw] bg-surface-muted px-[0.625vw] py-[0.417vw]">
          <p className="text-center text-[0.729vw] font-normal leading-[1.094vw] text-black">
            {message.content}
          </p>
        </div>
        <UserAvatar initials={userInitials} photoUrl={userPhotoUrl} />
      </div>
    </div>
  );
}

/* ─── Replacement Product Grid ─── */

function ReplacementGrid({
  products,
  onAddItem,
}: {
  products: ReplacementProduct[];
  onAddItem?: (product: ReplacementProduct) => void;
}) {
  return (
    <div className="ml-[1.667vw] flex flex-col gap-[0.417vw]">
      <p className="text-[0.625vw] text-text-muted">Suggested replacements:</p>
      <div className="grid grid-cols-3 gap-[0.417vw]">
        {products.map((product) => (
          <ReplacementCard
            key={product.id}
            product={product}
            onAdd={onAddItem}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Replacement Product Card ─── */

function ReplacementCard({
  product,
  onAdd,
}: {
  product: ReplacementProduct;
  onAdd?: (product: ReplacementProduct) => void;
}) {
  return (
    <div className="flex flex-col gap-[0.313vw] rounded-[0.625vw] border border-border-light bg-white p-[0.417vw]">
      {product.imageUrl && (
        <div className="relative aspect-square w-full overflow-hidden rounded-[0.417vw] bg-gray-100">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="6.25vw"
          />
        </div>
      )}
      <div className="flex flex-col gap-[0.104vw]">
        <p className="line-clamp-1 text-[0.625vw] font-medium text-text-primary">
          {product.name}
        </p>
        {product.brand && (
          <p className="text-[0.521vw] text-text-muted">{product.brand}</p>
        )}
        <div className="flex items-center justify-between">
          {product.price != null && (
            <span className="text-[0.625vw] font-semibold text-text-primary">
              ${product.price.toFixed(2)}
            </span>
          )}
          {onAdd && (
            <button
              type="button"
              onClick={() => onAdd(product)}
              className="rounded-[0.313vw] bg-brand-blue px-[0.417vw] py-[0.104vw] text-[0.521vw] font-medium text-white hover:opacity-90"
            >
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── User Avatar ─── */

function UserAvatar({
  initials,
  photoUrl,
}: {
  initials?: string;
  photoUrl?: string | null;
}) {
  if (photoUrl) {
    return (
      <div className="flex h-[1.563vw] w-[1.563vw] shrink-0 overflow-hidden rounded-full">
        <Image
          src={photoUrl}
          alt="You"
          width={30}
          height={30}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
  return (
    <div className="flex h-[1.563vw] w-[1.563vw] shrink-0 items-center justify-center rounded-full bg-brand-blue-light p-[0.208vw]">
      <span className="text-center text-[0.521vw] font-normal text-brand-blue-dark">
        {initials ?? "ME"}
      </span>
    </div>
  );
}

/* ─── Thinking Indicator ─── */

function ThinkingIndicator() {
  return (
    <div className="flex self-stretch">
      <div className="flex gap-[0.417vw]">
        <div className="flex h-[1.563vw] w-[1.563vw] shrink-0 animate-pulse items-center justify-center rounded-full bg-send-button-bg p-[0.208vw]">
          <AIStylistIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="white" starColor="white" />
        </div>
      </div>
    </div>
  );
}
