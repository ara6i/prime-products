"use client";

import { MicIcon, SendIcon, PeopleIcon } from "@/app/shared/components/icons";
import { cn } from "@/app/shared/lib/utils";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  maxWidth?: string;
  showBadge?: boolean;
  className?: string;
}

const MAX_CHARS = 20;

export function ChatInput({
  value,
  onChange,
  onSend,
  placeholder = "Where are you headed?",
  maxWidth = "max-w-[26.042vw]",
  showBadge = true,
  className,
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.trim()) {
      onSend();
    }
  };

  return (
    <div
      className={cn(
        "flex h-[2.708vw] w-full items-center justify-between rounded-[1.563vw] border border-surface-disabled bg-surface-muted py-[0.417vw] pl-[0.833vw] pr-[0.625vw]",
        maxWidth,
        className,
      )}
    >
      {/* Input */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-[0.833vw] font-normal leading-[1.354vw] text-text-primary outline-none placeholder:text-chat-placeholder"
      />

      {/* Right actions */}
      <div className="flex items-center gap-[0.625vw]">
        {/* Character count badge — checkroom icon + count */}
        {showBadge && (
          <div className="flex h-[1.25vw] items-center gap-[0.208vw] rounded-[0.573vw] bg-warning-bg px-[0.208vw]">
            <PeopleIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="var(--warning-text)" />
            <span className="text-[0.625vw] font-normal leading-[1.042vw] text-warning-text">
              {MAX_CHARS}
            </span>
          </div>
        )}

        {/* Microphone icon */}
        <MicIcon size={24} className="!w-[1.25vw] !h-[1.25vw]" color="var(--text-neutral)" />

        {/* Send button */}
        <button
          type="button"
          className="flex h-[1.875vw] w-[1.875vw] shrink-0 items-center justify-center rounded-full bg-send-button-bg"
          onClick={onSend}
          disabled={!value.trim()}
        >
          <SendIcon size={14} className="!w-[0.729vw] !h-[0.729vw]" color="white" />
        </button>
      </div>
    </div>
  );
}
