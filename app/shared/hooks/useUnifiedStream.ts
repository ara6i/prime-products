"use client";

import { useEffect, useRef, useState } from "react";

interface UnifiedStreamState {
  tokenBalance: number | null;
  unreadCount: number | null;
  isConnected: boolean;
}

export function useUnifiedStream(initialTokenBalance: number, initialUnreadCount: number) {
  const [state, setState] = useState<UnifiedStreamState>({
    tokenBalance: initialTokenBalance,
    unreadCount: initialUnreadCount,
    isConnected: false,
  });
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/events/stream", { withCredentials: true });
    eventSourceRef.current = es;

    // Backend sends all events as generic data: messages with type inside JSON
    // Format: data: {"type":"token-update","data":{"tokenBalance":100},"timestamp":"..."}
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        switch (event.type) {
          case "connected":
            setState((prev) => ({ ...prev, isConnected: true }));
            break;
          case "token-update":
            if (typeof event.data?.tokenBalance === "number") {
              setState((prev) => ({ ...prev, tokenBalance: event.data.tokenBalance }));
            }
            break;
          case "unread-count":
            if (typeof event.data?.unreadCount === "number") {
              setState((prev) => ({ ...prev, unreadCount: event.data.unreadCount }));
            }
            break;
          case "notification":
            if (typeof event.data?.unreadCount === "number") {
              setState((prev) => ({ ...prev, unreadCount: event.data.unreadCount }));
            }
            break;
          case "vto-update":
            // Broadcast to any listening component (e.g. useTryOn) via DOM event
            window.dispatchEvent(
              new CustomEvent("vto-update", { detail: event.data }),
            );
            break;
        }
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => {
      setState((prev) => ({ ...prev, isConnected: false }));
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, []);

  const tokenBalance = state.tokenBalance ?? initialTokenBalance;
  const unreadCount = state.unreadCount ?? initialUnreadCount;

  return { tokenBalance, unreadCount, isConnected: state.isConnected };
}
