"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  ChatMessage,
  OutfitSuggestion,
  ConversationPhase,
} from "@/app/ai-stylist/types";
import {
  mapConversationToMessages,
  mapOutfitsFromConversation,
  getPhase,
  getConversationId,
} from "@/app/ai-stylist/mappers";
import * as stylistService from "@/app/ai-stylist/services/stylist.service";

/* ─── Types ─── */

interface UseConversationReturn {
  conversationId: string | null;
  messages: ChatMessage[];
  outfits: OutfitSuggestion[];
  phase: ConversationPhase | null;
  isLoading: boolean;
  error: string | null;
  selectedModelImage: string | null;
  startChat: (prompt: string) => void;
  answerQuestion: (answer: string) => void;
  sendMessage: (prompt: string) => void;
  selectModel: (modelImage: string) => void;
  generateFromWizard: (prompt: string, modelImage: string) => Promise<boolean>;
  resetChat: () => void;
  loadConversation: (id: string) => void;
  loadMockConversation: () => void;
  toggleBookmark: (outfitId: string) => void;
}

/* ─── Hook ─── */

const RECOVERY_POLL_INTERVAL_MS = 2500;
const RECOVERY_POLL_TIMEOUT_MS = 120_000;

export function useConversation(
  weatherContext: Record<string, unknown> | null = null
): UseConversationReturn {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [outfits, setOutfits] = useState<OutfitSuggestion[]>([]);
  const [phase, setPhase] = useState<ConversationPhase | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModelImage, setSelectedModelImage] = useState<string | null>(null);

  const sseCleanupRef = useRef<(() => void) | null>(null);
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recoveryStartedAtRef = useRef(0);

  /**
   * Process a conversation response — map messages, detect phase from flags.
   */
  const processConversation = useCallback(
    (conv: Parameters<typeof mapConversationToMessages>[0]) => {
      const id = getConversationId(conv);
      setConversationId(id);

      const mapped = mapConversationToMessages(conv);
      setMessages(mapped);

      const mappedOutfits = mapOutfitsFromConversation(conv);
      if (mappedOutfits.length > 0) setOutfits(mappedOutfits);

      const nextPhase = getPhase(conv);
      setPhase(nextPhase);
      if (nextPhase === "complete" || nextPhase === "follow_up") {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Refresh conversation from backend — used by SSE handlers
   */
  const refreshConversation = useCallback(
    async (convId: string) => {
      try {
        const conv = await stylistService.getConversation(convId);
        processConversation(conv);
      } catch {}
    },
    [processConversation]
  );

  const stopRecoveryPolling = useCallback(() => {
    if (recoveryTimerRef.current) {
      clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
  }, []);

  const startRecoveryPolling = useCallback(
    (convId: string) => {
      if (recoveryTimerRef.current) return;
      recoveryStartedAtRef.current = Date.now();

      const poll = async () => {
        if (Date.now() - recoveryStartedAtRef.current > RECOVERY_POLL_TIMEOUT_MS) {
          stopRecoveryPolling();
          setIsLoading(false);
          setError(
            "Outfit generation is taking longer than expected. You can reopen this chat from History."
          );
          return;
        }

        try {
          const conv = await stylistService.getConversation(convId);
          const nextPhase = getPhase(conv);
          processConversation(conv);
          if (nextPhase === "complete" || nextPhase === "follow_up") {
            stopRecoveryPolling();
            return;
          }
        } catch {}

        recoveryTimerRef.current = setTimeout(poll, RECOVERY_POLL_INTERVAL_MS);
      };

      recoveryTimerRef.current = setTimeout(poll, RECOVERY_POLL_INTERVAL_MS);
    },
    [processConversation, stopRecoveryPolling]
  );

  /* ─── SSE: Connect when we have a conversationId (like beta) ─── */
  useEffect(() => {
    if (!conversationId) return;

    sseCleanupRef.current?.();
    sseCleanupRef.current = stylistService.streamOutfitUpdates(
      conversationId,
      (event) => {
        switch (event.type) {
          case "outfits-ready":
            // Outfits generated — fetch updated conversation
            refreshConversation(conversationId);
            startRecoveryPolling(conversationId);
            break;

          case "outfit-tryon-ready":
            // Individual try-on image ready — refresh to get latest
            refreshConversation(conversationId);
            break;

          case "outfit-transparent-ready":
            // Background-removed image ready — refresh to get transparentImageUrl
            refreshConversation(conversationId);
            break;

          case "all-tryons-complete": {
            // All try-ons finished — final fetch, stop loading
            stylistService.getConversation(conversationId).then((conv) => {
              processConversation(conv);
              setPhase("complete");
              setIsLoading(false);
              stopRecoveryPolling();
            });
            break;
          }

          case "no-outfits":
            // No matching products
            setPhase("complete");
            setIsLoading(false);
            stopRecoveryPolling();
            break;

          case "generation-error":
            setPhase("complete");
            setIsLoading(false);
            stopRecoveryPolling();
            refreshConversation(conversationId);
            break;

          case "complete":
            // Cover images complete — refresh
            refreshConversation(conversationId);
            break;
        }
      },
      () => {
        startRecoveryPolling(conversationId);
      }
    );

    return () => {
      sseCleanupRef.current?.();
      sseCleanupRef.current = null;
      stopRecoveryPolling();
    };
  }, [
    conversationId,
    refreshConversation,
    processConversation,
    startRecoveryPolling,
    stopRecoveryPolling,
  ]);

  /* ─── Start a new conversation ─── */
  const startChat = useCallback(
    async (prompt: string) => {
      setIsLoading(true);
      setError(null);
      setPhase("gathering_info");

      setMessages([
        { id: `user-${Date.now()}`, role: "user", content: prompt },
      ]);

      try {
        const conv = await stylistService.startConversation({
          prompt,
          count: 5,
          intentOnly: true,
          ...(weatherContext ? { weatherContext } : {}),
        });
        processConversation(conv);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to start chat";
        setError(msg);
        setPhase(null);
      } finally {
        setIsLoading(false);
      }
    },
    [processConversation, weatherContext]
  );

  /* ─── Answer / follow-up during gathering_info phase ─── */
  const answerQuestionFn = useCallback(
    async (answer: string) => {
      if (!conversationId) return;
      setIsLoading(true);
      setError(null);

      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: "user", content: answer },
      ]);

      try {
        const conv = await stylistService.sendMessage(conversationId, answer);
        processConversation(conv);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to send answer";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, processConversation]
  );

  /* ─── Select model & generate outfits ─── */
  const selectModel = useCallback(
    async (modelImage: string) => {
      if (!conversationId) {
        setError("No conversation to generate outfits for");
        return;
      }

      setIsLoading(true);
      setError(null);
      setPhase("generating");
      setSelectedModelImage(modelImage);

      try {
        // SSE is already connected via the useEffect above
        // Just trigger generation — SSE handlers will process results
        await stylistService.generateWithModel(conversationId, modelImage);
        startRecoveryPolling(conversationId);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to generate outfits";
        setError(msg);
        setPhase("awaiting_model");
        setIsLoading(false);
      }
    },
    [conversationId, startRecoveryPolling]
  );

  /* ─── Submit the Figma onboarding wizard and start real generation ─── */
  const generateFromWizard = useCallback(
    async (prompt: string, modelImage: string): Promise<boolean> => {
      sseCleanupRef.current?.();
      sseCleanupRef.current = null;
      stopRecoveryPolling();

      setIsLoading(true);
      setError(null);
      setOutfits([]);
      setSelectedModelImage(modelImage);
      setPhase("generating");

      try {
        let conversation = await stylistService.startConversation({
          prompt,
          count: 5,
          intentOnly: true,
          ...(weatherContext ? { weatherContext } : {}),
        });
        const id = getConversationId(conversation);
        if (!id) throw new Error("The stylist did not create a conversation");

        setConversationId(id);

        // A complete wizard prompt normally moves directly to model selection.
        // If the legacy conversational parser still asks a question, answer it
        // with the same complete brief until it acknowledges every field.
        let nextPhase = getPhase(conversation);
        for (
          let attempt = 0;
          attempt < 4 && nextPhase === "gathering_info";
          attempt += 1
        ) {
          conversation = await stylistService.sendMessage(
            id,
            `Use these complete preferences and do not ask another question:\n${prompt}`,
          );
          nextPhase = getPhase(conversation);
        }

        if (nextPhase !== "awaiting_model") {
          throw new Error(
            "The stylist could not confirm the onboarding preferences. Please try again.",
          );
        }

        processConversation(conversation);
        setPhase("generating");
        setSelectedModelImage(modelImage);
        await stylistService.generateWithModel(id, modelImage);
        startRecoveryPolling(id);
        return true;
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to generate outfits";
        setError(msg);
        setConversationId(null);
        setMessages([]);
        setPhase(null);
        setSelectedModelImage(null);
        setIsLoading(false);
        return false;
      }
    },
    [
      processConversation,
      startRecoveryPolling,
      stopRecoveryPolling,
      weatherContext,
    ],
  );

  /* ─── Send follow-up message ─── */
  const sendMessageFn = useCallback(
    async (prompt: string) => {
      if (!conversationId) return;

      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: "user", content: prompt },
      ]);
      setIsLoading(true);
      setError(null);

      try {
        const conv = await stylistService.sendMessage(conversationId, prompt);
        processConversation(conv);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to send message";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, processConversation]
  );

  /* ─── Reset ─── */
  const resetChat = useCallback(() => {
    sseCleanupRef.current?.();
    sseCleanupRef.current = null;
    stopRecoveryPolling();
    setConversationId(null);
    setMessages([]);
    setOutfits([]);
    setPhase(null);
    setIsLoading(false);
    setError(null);
    setSelectedModelImage(null);
  }, [stopRecoveryPolling]);

  /* ─── Load existing conversation ─── */
  const loadConversation = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const conv = await stylistService.getConversation(id);
        processConversation(conv);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to load conversation";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [processConversation]
  );

  const loadMockConversation = useCallback(() => {
    resetChat();
  }, [resetChat]);

  const toggleBookmark = useCallback((outfitId: string) => {
    setOutfits((prev) =>
      prev.map((o) =>
        o.id === outfitId ? { ...o, isBookmarked: !o.isBookmarked } : o
      )
    );
  }, []);

  return {
    conversationId,
    messages,
    outfits,
    phase,
    isLoading,
    error,
    selectedModelImage,
    startChat,
    answerQuestion: answerQuestionFn,
    sendMessage: sendMessageFn,
    selectModel,
    generateFromWizard,
    resetChat,
    loadConversation,
    loadMockConversation,
    toggleBookmark,
  };
}
