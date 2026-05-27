"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { mapChatDetail, mapChatMessage, mapChatSession } from "../mappers/chatsMapper";
import {
  sendAdminChatMessageClient,
  updateAdminChatClient,
} from "../services/chatsClientService";
import type {
  AdminChatDetailRaw,
  AdminChatDetailView,
  AdminChatStreamPayload,
} from "../types";

export interface UseAdminChatDetailResult {
  chat: AdminChatDetailView;
  replyDraft: string;
  connected: boolean;
  isSending: boolean;
  isUpdating: boolean;
  error: string | null;
  goBack: () => void;
  updateReplyDraft: (value: string) => void;
  sendReply: (event: FormEvent<HTMLFormElement>) => void;
  closeChat: () => void;
  reopenChat: () => void;
}

function mergeDetail(current: AdminChatDetailView, detail: AdminChatDetailRaw): AdminChatDetailView {
  const mapped = mapChatDetail(detail);
  if (current.session.id !== mapped.session.id) return current;

  const incomingReal = mapped.messages.filter((message) => !message.id.startsWith("local-"));
  const currentMessages = current.messages.filter(
    (message) =>
      !message.id.startsWith("local-") ||
      !incomingReal.some(
        (incoming) =>
          incoming.authorType === message.authorType &&
          incoming.body.trim() === message.body.trim(),
      ),
  );
  const currentIds = new Set(currentMessages.map((message) => message.id));
  return {
    session: mapped.session,
    messages: [
      ...currentMessages,
      ...mapped.messages.filter((message) => !currentIds.has(message.id)),
    ],
  };
}

export function useAdminChatDetail(initialChat: AdminChatDetailView): UseAdminChatDetailResult {
  const router = useRouter();
  const [chat, setChat] = useState(initialChat);
  const [replyDraft, setReplyDraft] = useState("");
  const [connected, setConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatIdRef = useRef(initialChat.session.id);

  useEffect(() => {
    chatIdRef.current = chat.session.id;
  }, [chat.session.id]);

  const goBack = useCallback(() => {
    router.push("/admin/chats");
  }, [router]);

  useEffect(() => {
    const eventSource = new EventSource("/api/admin/chats/stream");
    eventSource.onopen = () => setConnected(true);
    eventSource.onerror = () => setConnected(false);
    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as AdminChatStreamPayload;
        const session = parsed.data?.session;
        const message = parsed.data?.message;

        if (session?.id === chatIdRef.current) {
          setChat((current) => ({
            ...current,
            session: mapChatSession(session),
          }));
        }

        if (message?.sessionId === chatIdRef.current) {
          setChat((current) => {
            if (current.messages.some((item) => item.id === message.id)) return current;
            const mappedMessage = mapChatMessage(message);
            return {
              ...current,
              messages: [
                ...current.messages.filter(
                  (item) =>
                    !item.id.startsWith("local-") ||
                    item.authorType !== mappedMessage.authorType ||
                    item.body.trim() !== mappedMessage.body.trim(),
                ),
                mappedMessage,
              ],
            };
          });
        }
      } catch {
        // Ignore malformed stream events.
      }
    };

    return () => eventSource.close();
  }, []);

  const sendReply = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = replyDraft.trim();
    if (!body) return;

    const optimisticId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setIsSending(true);
    setError(null);
    setReplyDraft("");
    setChat((current) => ({
      ...current,
      messages: [
        ...current.messages,
        {
          id: optimisticId,
          sessionId: current.session.id,
          authorType: "admin",
          authorName: "PrimeStyleAI Support",
          body,
          createdAtLabel: "Just now",
          tone: "admin",
        },
      ],
    }));

    sendAdminChatMessageClient(chat.session.id, { body })
      .then((detail) => {
        setChat((current) =>
          mergeDetail(
            {
              ...current,
              messages: current.messages.filter((message) => message.id !== optimisticId),
            },
            detail,
          ),
        );
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to send message");
        setChat((current) => ({
          ...current,
          messages: current.messages.filter((message) => message.id !== optimisticId),
        }));
        setReplyDraft(body);
      })
      .finally(() => setIsSending(false));
  }, [chat.session.id, replyDraft]);

  const updateChatStatus = useCallback((status: "open" | "closed") => {
    setIsUpdating(true);
    setError(null);

    updateAdminChatClient(chat.session.id, { status })
      .then((detail) => setChat(mapChatDetail(detail)))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to update chat"))
      .finally(() => setIsUpdating(false));
  }, [chat.session.id]);

  return useMemo(
    () => ({
      chat,
      replyDraft,
      connected,
      isSending,
      isUpdating,
      error,
      goBack,
      updateReplyDraft: setReplyDraft,
      sendReply,
      closeChat: () => updateChatStatus("closed"),
      reopenChat: () => updateChatStatus("open"),
    }),
    [
      chat,
      connected,
      error,
      goBack,
      isSending,
      isUpdating,
      replyDraft,
      sendReply,
      updateChatStatus,
    ],
  );
}
