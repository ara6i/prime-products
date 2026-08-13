"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { AIStylistIcon } from "@/app/shared/components/icons";
import type { ChatMessage } from "@/app/ai-stylist/types";

/* ─── AI Avatar (logo) ─── */

function AIAvatar() {
  return (
    <div className="flex h-[1.979vw] w-[1.979vw] shrink-0 items-center justify-center rounded-full bg-send-button-bg p-[0.313vw]">
      <AIStylistIcon size={22} className="!w-[1.146vw] !h-[1.146vw]" color="white" starColor="white" />
    </div>
  );
}

/* ─── User Avatar ─── */

interface UserAvatarProps {
  initials?: string;
  photoUrl?: string | null;
}

function UserAvatar({ initials = "ME", photoUrl }: UserAvatarProps) {
  if (photoUrl) {
    return (
      <div className="flex h-[1.979vw] w-[1.979vw] shrink-0 overflow-hidden rounded-full">
        <Image
          src={photoUrl}
          alt="You"
          width={38}
          height={38}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="flex h-[1.979vw] w-[1.979vw] shrink-0 items-center justify-center rounded-full bg-brand-blue-light p-[0.417vw]">
      <span className="text-center text-[0.729vw] font-normal leading-[1.146vw] text-brand-blue-dark">
        {initials}
      </span>
    </div>
  );
}

/* ─── Typing animation hook ─── */

function useTypingAnimation(text: string, enabled: boolean, speed = 12) {
  const [animation, setAnimation] = useState({ source: text, displayed: "" });
  const indexRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    indexRef.current = 0;
    lastTimeRef.current = 0;

    const interval = 1000 / speed; // ms per character

    function tick(timestamp: number) {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;

      if (elapsed >= interval) {
        const charsToAdd = Math.min(
          Math.floor(elapsed / interval),
          text.length - indexRef.current
        );
        if (charsToAdd > 0) {
          indexRef.current += charsToAdd;
          setAnimation({
            source: text,
            displayed: text.slice(0, indexRef.current),
          });
          lastTimeRef.current = timestamp;
        }
      }

      if (indexRef.current < text.length) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [text, enabled, speed]);

  if (!enabled) return text;
  return animation.source === text ? animation.displayed : "";
}

/* ─── Chat Bubble ─── */

interface ChatBubbleProps {
  message: ChatMessage;
  userInitials?: string;
  userPhotoUrl?: string | null;
  /** Enable typing animation for this message */
  animate?: boolean;
}

export function ChatBubble({
  message,
  userInitials = "ME",
  userPhotoUrl,
  animate = false,
}: ChatBubbleProps) {
  const displayedText = useTypingAnimation(
    message.content,
    animate && message.role === "ai",
    200 // characters per second
  );

  if (message.role === "ai") {
    return (
      <div className="flex self-stretch">
        <div className="flex gap-[0.625vw]">
          <AIAvatar />
          <div className="rounded-br-[0.625vw] rounded-bl-[0.625vw] rounded-tr-[0.625vw] rounded-tl-[0.104vw] bg-weather-pill-bg px-[0.833vw] py-[0.417vw]">
            <p className="whitespace-pre-line text-[0.833vw] font-normal leading-[1.354vw] text-black">
              {displayedText}
              {animate && displayedText.length < message.content.length && (
                <span className="ml-[0.104vw] inline-block h-[0.938vw] w-[0.104vw] animate-pulse bg-text-muted align-text-bottom" />
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex self-stretch justify-end">
      <div className="flex items-center justify-end gap-[0.625vw]">
        <div className="rounded-bl-[0.625vw] rounded-br-[0.625vw] rounded-tl-[0.625vw] rounded-tr-[0.104vw] bg-surface-muted px-[0.833vw] py-[0.417vw]">
          <p className="text-center text-[0.833vw] font-normal leading-[1.354vw] text-black">
            {message.content}
          </p>
        </div>
        <UserAvatar initials={userInitials} photoUrl={userPhotoUrl} />
      </div>
    </div>
  );
}

/* ─── Animated thinking indicator (SVG logo) ─── */

/** Animated AI stylist logo as thinking indicator */
export function LoadingIndicator() {
  return (
    <div className="flex self-stretch">
      <div className="flex gap-[0.625vw]">
        <div className="flex h-[1.979vw] w-[1.979vw] shrink-0 items-center justify-center rounded-full bg-send-button-bg p-[0.313vw] animate-pulse">
          <AIStylistIcon size={22} className="!w-[1.146vw] !h-[1.146vw]" color="white" starColor="white" />
        </div>
      </div>
    </div>
  );
}
