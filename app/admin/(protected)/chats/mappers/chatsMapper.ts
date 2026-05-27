import type {
  AdminChatDetailRaw,
  AdminChatsResponse,
  AdminChatsViewModel,
  AdminChatSessionRaw,
  ChatMessageItem,
  ChatSessionItem,
  ChatStatCard,
  AdminChatDetailView,
} from "../types";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function sourceLabel(source: AdminChatSessionRaw["source"]): string {
  if (source === "public_widget") return "Public widget";
  if (source === "shopify_admin") return "Shopify admin";
  if (source === "admin_test") return "Admin test";
  return "Customer dashboard";
}

function mapStats(response: AdminChatsResponse): ChatStatCard[] {
  return [
    {
      label: "Open",
      value: formatNumber(response.summary.open),
      helper: `${formatNumber(response.summary.unread)} unread`,
      tone: response.summary.unread > 0 ? "warning" : "default",
    },
    {
      label: "Online",
      value: formatNumber(response.summary.onlineCustomers),
      helper: "Connected customers",
      tone: "success",
    },
    {
      label: "Closed",
      value: formatNumber(response.summary.closed),
      helper: `${formatNumber(response.summary.total)} total chats`,
      tone: "default",
    },
  ];
}

export function mapChatSession(session: AdminChatSessionRaw): ChatSessionItem {
  return {
    id: session.id,
    chatNumber: session.chatNumber,
    visitorName: session.visitorName,
    visitorMeta: [session.visitorEmail, session.visitorCompany].filter(Boolean).join(" · ") || "No contact details",
    storeLabel: session.storeDomain ?? "No store domain",
    sourceLabel: sourceLabel(session.source),
    status: session.status,
    statusLabel: session.status === "closed" ? "Closed" : "Open",
    statusTone: session.status === "closed" ? "default" : "success",
    lastMessagePreview: session.lastMessagePreview || "No message yet",
    lastMessageAtLabel: formatDate(session.lastMessageAt),
    unreadAdminCount: session.unreadAdminCount,
    hasUnread: session.unreadAdminCount > 0,
  };
}

export function mapChatMessage(message: AdminChatDetailRaw["messages"][number]): ChatMessageItem {
  return {
    id: message.id,
    sessionId: message.sessionId,
    authorType: message.authorType,
    authorName: message.authorName,
    body: message.body,
    createdAtLabel: formatDate(message.createdAt),
    tone: message.authorType === "admin" ? "admin" : message.authorType === "system" ? "system" : "customer",
  };
}

export function mapChatDetail(detail: AdminChatDetailRaw): AdminChatDetailView {
  return {
    session: mapChatSession(detail.session),
    messages: detail.messages.map(mapChatMessage),
  };
}

export function mapChatsPage(response: AdminChatsResponse): AdminChatsViewModel {
  return {
    stats: mapStats(response),
    items: response.items.map(mapChatSession),
    pagination: response.pagination,
    hasChats: response.items.length > 0,
  };
}
