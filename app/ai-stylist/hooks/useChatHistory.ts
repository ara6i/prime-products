"use client";

import { useState, useCallback } from "react";
import * as stylistService from "@/app/ai-stylist/services/stylist.service";
import { mapConversationListToHistory } from "@/app/ai-stylist/mappers";
import type { ChatHistoryItem } from "@/app/ai-stylist/types";

interface UseChatHistoryReturn {
  items: ChatHistoryItem[];
  isLoading: boolean;
  loadHistory: () => void;
  deleteItem: (id: string) => void;
  clearAll: () => void;
}

export function useChatHistory(): UseChatHistoryReturn {
  const [items, setItems] = useState<ChatHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadHistory = useCallback(() => {
    setIsLoading(true);
    stylistService
      .listConversations()
      .then((conversations) => {
        setItems(mapConversationListToHistory(conversations));
      })
      .catch((err) => {
        console.error("[useChatHistory] Failed to load:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    stylistService.deleteConversation(id).catch((err) => {
      console.error("[useChatHistory] Failed to delete:", err);
    });
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
    stylistService.deleteAllConversations().catch((err) => {
      console.error("[useChatHistory] Failed to clear:", err);
    });
  }, []);

  return { items, isLoading, loadHistory, deleteItem, clearAll };
}
