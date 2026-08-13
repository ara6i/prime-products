"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  Button,
  ConfirmDialog,
} from "@/app/shared/components/ui";
import {
  CloseIcon,
  SearchIcon,
  ClearHistoryIcon,
  DeleteIcon,
  ExternalLinkIcon,
} from "@/app/shared/components/icons";
import { useChatHistory } from "@/app/ai-stylist/hooks/useChatHistory";
import type { ChatHistoryItem } from "@/app/ai-stylist/types";

interface ChatHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadConversation?: (id: string) => void;
}

interface HistoryCardProps {
  item: ChatHistoryItem;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
}

function HistoryCard({ item, onDelete, onOpen }: HistoryCardProps) {
  return (
    <div className="flex w-full flex-col gap-2 rounded-[14px] border border-divider bg-surface-light p-2">
      <div className="flex items-center gap-2.5">
        <Button
          variant="ghost"
          className="h-auto flex-1 justify-start truncate p-0 text-left text-xs leading-[1.667em] text-text-subtitle"
          onClick={() => onOpen(item.id)}
        >
          {item.title}
        </Button>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
          >
            <DeleteIcon size={16} color="var(--rule-rejected)" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => onOpen(item.id)}>
            <ExternalLinkIcon size={16} color="var(--text-neutral)" />
          </Button>
        </div>
      </div>

      {item.previewImages.length > 0 && (
        <Button
          variant="ghost"
          className="flex h-auto w-full gap-2 overflow-hidden p-0"
          onClick={() => onOpen(item.id)}
        >
          {item.previewImages.slice(0, 5).map((src, i) => (
            <div
              key={i}
              className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg"
              style={{ aspectRatio: "300/433" }}
            >
              <Image
                src={src}
                alt={`${item.title} outfit ${i + 1}`}
                fill
                className="object-cover"
                sizes="60px"
              />
            </div>
          ))}
        </Button>
      )}
    </div>
  );
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

  useEffect(() => {
    if (open) loadHistory();
  }, [open, loadHistory]);

  const filteredItems = search
    ? items.filter((item) =>
        item.title.toLowerCase().includes(search.toLowerCase()),
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
          side="bottom"
          showCloseButton={false}
          className="flex max-h-[80vh] flex-col gap-4 rounded-t-[20px] border-0 p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium leading-[1.571em] text-text-neutral">
              Chat History
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenChange(false)}
            >
              <CloseIcon size={16} color="var(--text-neutral)" />
            </Button>
          </div>

          <div className="flex items-center gap-2 rounded border-[0.5px] border-surface-disabled bg-search-bg px-3 py-2">
            <SearchIcon size={16} color="var(--input-border)" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats"
              className="flex-1 bg-transparent text-sm leading-[1.571em] text-text-primary outline-none placeholder:text-input-border"
            />
          </div>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
            {isLoading ? (
              <p className="text-center text-sm text-text-muted">Loading...</p>
            ) : filteredItems.length === 0 ? (
              <p className="text-center text-sm text-text-muted">
                {search ? "No matching chats" : "No chat history yet"}
              </p>
            ) : (
              filteredItems.map((item) => (
                <HistoryCard
                  key={item.id}
                  item={item}
                  onDelete={setDeleteId}
                  onOpen={handleOpen}
                />
              ))
            )}
          </div>

          {items.length > 0 && (
            <Button
              variant="ghost"
              className="justify-center gap-1 self-stretch text-sm text-text-neutral"
              onClick={() => setShowClearAll(true)}
            >
              <ClearHistoryIcon size={16} color="var(--text-neutral)" />
              Clear History
            </Button>
          )}
        </SheetContent>
      </Sheet>

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

      <ConfirmDialog
        open={showClearAll}
        onOpenChange={setShowClearAll}
        title="Clear all history"
        description="All conversations will be permanently deleted."
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
