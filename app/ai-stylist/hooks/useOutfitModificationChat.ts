"use client";

import { useState, useCallback, useRef } from "react";
import type {
  OutfitProduct,
  ModificationChatMessage,
} from "@/app/ai-stylist/types";
import {
  mapOutfitItemsToModificationPayload,
  mapReplacementProducts,
} from "@/app/ai-stylist/mappers";
import * as stylistService from "@/app/ai-stylist/services/stylist.service";

/* ─── Constants ─── */

const INITIAL_MESSAGE: ModificationChatMessage = {
  id: "initial-mod",
  role: "ai",
  content:
    "Hi! I can help you modify this outfit. What would you like to change?",
};

/* ─── Types ─── */

interface UseOutfitModificationChatOptions {
  outfitItems: OutfitProduct[];
}

interface UseOutfitModificationChatReturn {
  messages: ModificationChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (userRequest: string) => void;
  resetChat: () => void;
}

/* ─── Hook ─── */

export function useOutfitModificationChat({
  outfitItems,
}: UseOutfitModificationChatOptions): UseOutfitModificationChatReturn {
  const [messages, setMessages] = useState<ModificationChatMessage[]>([
    INITIAL_MESSAGE,
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef<ModificationChatMessage[]>([INITIAL_MESSAGE]);

  /** Build conversation history from past messages (excluding initial greeting) */
  const buildConversationHistory = useCallback(() => {
    return messagesRef.current
      .filter((m) => m.id !== "initial-mod")
      .map((m) => ({
        role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      }));
  }, []);

  /** Send a modification request to the backend */
  const sendMessage = useCallback(
    async (userRequest: string) => {
      if (!userRequest.trim() || isLoading) return;
      if (outfitItems.length === 0) return;

      setIsLoading(true);
      setError(null);

      // Add user message optimistically
      const userMsg: ModificationChatMessage = {
        id: `mod-user-${Date.now()}`,
        role: "user",
        content: userRequest,
      };
      setMessages((prev) => {
        const next = [...prev, userMsg];
        messagesRef.current = next;
        return next;
      });

      try {
        const request = {
          currentOutfit: mapOutfitItemsToModificationPayload(outfitItems),
          userRequest,
          conversationHistory: buildConversationHistory(),
        };

        const response = await stylistService.modifyOutfit(request);
        const replacementProducts = mapReplacementProducts(response);

        const assistantMsg: ModificationChatMessage = {
          id: `mod-ai-${Date.now()}`,
          role: "ai",
          content: response.message || "Here are some suggestions.",
          replacementProducts:
            replacementProducts.length > 0 ? replacementProducts : undefined,
        };

        setMessages((prev) => {
          const next = [...prev, assistantMsg];
          messagesRef.current = next;
          return next;
        });
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to modify outfit";
        setError(msg);

        const errorMsg: ModificationChatMessage = {
          id: `mod-error-${Date.now()}`,
          role: "ai",
          content: "Sorry, I couldn't process that request. Please try again.",
        };
        setMessages((prev) => {
          const next = [...prev, errorMsg];
          messagesRef.current = next;
          return next;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, outfitItems, buildConversationHistory]
  );

  /** Reset to initial state */
  const resetChat = useCallback(() => {
    setMessages([INITIAL_MESSAGE]);
    messagesRef.current = [INITIAL_MESSAGE];
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    resetChat,
  };
}
