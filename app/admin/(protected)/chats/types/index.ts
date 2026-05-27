export type AdminChatSessionStatus = "open" | "closed";
export type AdminChatStatusFilter = AdminChatSessionStatus | "all";
export type AdminChatSource = "customer_dashboard" | "public_widget" | "shopify_admin" | "admin_test";
export type AdminChatMessageAuthorType = "customer" | "admin" | "system";

export interface AdminChatSessionRaw {
  id: string;
  chatNumber: string;
  visitorName: string;
  visitorEmail: string | null;
  visitorCompany: string | null;
  storeDomain: string | null;
  storeLogoUrl: string | null;
  supportIssue: string | null;
  source: AdminChatSource;
  status: AdminChatSessionStatus;
  assignedTo: string | null;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadAdminCount: number;
  unreadCustomerCount: number;
  ratingScore: number | null;
  ratingNote: string | null;
  ratedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminChatMessageRaw {
  id: string;
  sessionId: string;
  authorType: AdminChatMessageAuthorType;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface AdminChatDetailRaw {
  session: AdminChatSessionRaw;
  messages: AdminChatMessageRaw[];
}

export interface AdminChatsResponse {
  summary: {
    total: number;
    open: number;
    closed: number;
    unread: number;
    onlineCustomers: number;
  };
  items: AdminChatSessionRaw[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface AdminChatListQuery {
  page: number;
  limit: number;
  status: AdminChatStatusFilter;
  query: string;
}

export interface ChatStatCard {
  label: string;
  value: string;
  helper: string;
  tone: "default" | "success" | "warning" | "danger";
}

export interface ChatSessionItem {
  id: string;
  chatNumber: string;
  visitorName: string;
  visitorMeta: string;
  storeLabel: string;
  storeLogoUrl: string | null;
  supportIssue: string | null;
  ratingScore: number | null;
  ratingNote: string | null;
  ratedAtLabel: string | null;
  sourceLabel: string;
  status: AdminChatSessionStatus;
  statusLabel: string;
  statusTone: "success" | "default";
  lastMessagePreview: string;
  lastMessageAtLabel: string;
  unreadAdminCount: number;
  hasUnread: boolean;
}

export interface ChatMessageItem {
  id: string;
  sessionId: string;
  authorType: AdminChatMessageAuthorType;
  authorName: string;
  body: string;
  createdAtLabel: string;
  tone: "customer" | "admin" | "system";
}

export interface AdminChatDetailView {
  session: ChatSessionItem;
  messages: ChatMessageItem[];
}

export interface AdminChatsViewModel {
  stats: ChatStatCard[];
  items: ChatSessionItem[];
  pagination: AdminChatsResponse["pagination"];
  hasChats: boolean;
}

export interface SendAdminChatMessagePayload {
  body: string;
}

export interface UpdateAdminChatPayload {
  status: AdminChatSessionStatus;
}

export interface AdminChatStreamPayload {
  type?: string;
  data?: {
    session?: AdminChatSessionRaw;
    message?: AdminChatMessageRaw;
    messages?: AdminChatMessageRaw[];
    onlineCustomers?: number;
  };
  timestamp?: string;
}

export interface CustomerChatStartPayload {
  visitorName?: string;
  visitorEmail?: string;
  visitorCompany?: string;
  storeDomain?: string;
  source?: AdminChatSource;
  message: string;
}

export interface CustomerChatStartResponse extends AdminChatDetailRaw {
  customerToken: string;
}
