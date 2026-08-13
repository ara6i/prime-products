"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
} from "@/app/shared/components/ui";
import {
  CloseIcon,
  SearchIcon,
  ClearHistoryIcon,
} from "@/app/shared/components/icons";
import { Button, ConfirmDialog } from "@/app/shared/components/ui";
import { ChatHistoryCard } from "./ChatHistoryCard";
import { useChatHistory } from "@/app/ai-stylist/hooks/useChatHistory";

interface ChatHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadConversation?: (id: string) => void;
}

export function ChatHistoryDrawer({
  open,
  onOpenChange,
  onLoadConversation,
}: ChatHistoryDrawerProps) {
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showClearAll, setShowClearAll] = useState(false);
  const { items, isLoading, loadHistory, deleteItem, clearAll } = useChatHistory();

  // Load when drawer opens
  useEffect(() => {
    if (open) loadHistory();
  }, [open, loadHistory]);

  const filteredItems = search
    ? items.filter((item) =>
        item.title.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const handleOpen = (id: string) => {
    onLoadConversation?.(id);
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          showCloseButton={false}
          overlayClassName="bg-text-body/30"
          className="flex w-[20.833vw] flex-col gap-[1.25vw] rounded-l-[1.042vw] border-0 p-[0.833vw]"
        >
          {/* Header */}
          <Button
            variant="link"
            size="sm"
            className="justify-center gap-[0.208vw] self-stretch text-text-neutral hover:bg-transparent"
            onClick={() => onOpenChange(false)}
          >
            <CloseIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="var(--text-neutral)" />
            <span className="text-[0.729vw] font-normal leading-[1.146vw] text-text-neutral">
              Chat History
            </span>
          </Button>

          {/* Search input */}
          <div className="flex items-center gap-[0.417vw] self-stretch rounded-[0.208vw] border-[0.5px] border-surface-disabled bg-search-bg px-[0.625vw] py-[0.417vw]">
            <SearchIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="var(--input-border)" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats"
              className="flex-1 bg-transparent text-[0.729vw] font-normal leading-[1.146vw] text-text-primary outline-none placeholder:text-input-border"
            />
          </div>

          {/* Chat history cards */}
          <div className="flex flex-1 flex-col gap-[0.625vw] overflow-y-auto">
            {isLoading ? (
              <p className="text-center text-[0.729vw] text-text-muted">Loading...</p>
            ) : filteredItems.length === 0 ? (
              <p className="text-center text-[0.729vw] text-text-muted">
                {search ? "No matching chats" : "No chat history yet"}
              </p>
            ) : (
              filteredItems.map((item) => (
                <ChatHistoryCard
                  key={item.id}
                  item={item}
                  onDelete={setDeleteId}
                  onOpen={handleOpen}
                />
              ))
            )}
          </div>

          {/* Clear History */}
          {items.length > 0 && (
            <Button
              variant="link"
              size="sm"
              className="justify-center gap-[0.208vw] self-stretch text-text-neutral hover:bg-transparent"
              onClick={() => setShowClearAll(true)}
            >
              <ClearHistoryIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="var(--text-neutral)" />
              <span className="text-[0.729vw] font-normal leading-[1.146vw] text-text-neutral">
                Clear History
              </span>
            </Button>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete single confirmation */}
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(v) => { if (!v) setDeleteId(null); }}
        title="Delete conversation"
        description="This conversation and its generated outfits will be permanently deleted."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          if (deleteId) deleteItem(deleteId);
          setDeleteId(null);
        }}
      />

      {/* Clear all confirmation */}
      <ConfirmDialog
        open={showClearAll}
        onOpenChange={setShowClearAll}
        title="Clear all history"
        description="All your conversations and generated outfits will be permanently deleted. This cannot be undone."
        confirmLabel="Clear All"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          clearAll();
          setShowClearAll(false);
        }}
      />
    </>
  );
}
