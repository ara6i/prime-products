"use client";

import { useAdminChats } from "../hooks/useAdminChats";
import type { AdminChatsViewModel } from "../types";
import { ChatsDesktop } from "./desktop/ChatsDesktop";
import { ChatsMobile } from "./mobile/ChatsMobile";

interface ChatsPageProps {
  initialView: AdminChatsViewModel;
}

export function ChatsPage({ initialView }: ChatsPageProps) {
  const chats = useAdminChats(initialView);

  return (
    <>
      <div className="hidden lg:block">
        <ChatsDesktop chats={chats} />
      </div>
      <div className="lg:hidden">
        <ChatsMobile chats={chats} />
      </div>
    </>
  );
}
