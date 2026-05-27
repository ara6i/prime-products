export type AdminTicketStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed";
export type AdminTicketPriority = "low" | "normal" | "high" | "urgent";
export type AdminTicketCategory = "general" | "technical" | "billing" | "merchant" | "feedback" | "incident";

export interface AdminTicketReplyRaw {
  id: string;
  authorType: "admin" | "requester";
  authorName: string;
  authorEmail: string;
  body: string;
  bodyHtml: string | null;
  emailDelivery: {
    status: "pending" | "sent" | "failed";
    sentAt: string | null;
    error: string | null;
  };
  createdAt: string;
}

export interface AdminTicketRaw {
  id: string;
  ticketNumber: string;
  subject: string;
  message: string;
  requesterName: string;
  requesterEmail: string;
  requesterCompany: string | null;
  status: AdminTicketStatus;
  priority: AdminTicketPriority;
  category: AdminTicketCategory;
  source: string;
  assignedTo: string | null;
  createdByAdmin: string | null;
  isPinned: boolean;
  pinnedAt: string | null;
  emailDelivery: {
    status: "pending" | "sent" | "failed";
    sentAt: string | null;
    error: string | null;
  };
  replies: AdminTicketReplyRaw[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminTicketsResponse {
  summary: {
    total: number;
    open: number;
    inProgress: number;
    waiting: number;
    resolved: number;
    urgent: number;
    emailFailed: number;
  };
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  items: AdminTicketRaw[];
}

export type AdminTicketQueue = "pending" | "solved";

export interface AdminTicketListQuery {
  page: number;
  limit: number;
  queue: AdminTicketQueue;
  query: string;
}

export interface TicketStatCard {
  label: string;
  value: string;
  helper: string;
  tone: "default" | "warning" | "danger" | "success";
}

export interface TicketThreadEntry {
  id: string;
  authorLabel: string;
  authorMeta: string;
  body: string;
  bodyHtml: string | null;
  dateLabel: string;
  tone: "requester" | "admin";
  deliveryLabel: string | null;
  deliveryTone: "default" | "warning" | "danger" | "success";
}

export interface TicketListItem {
  id: string;
  ticketNumber: string;
  subject: string;
  message: string;
  requesterLabel: string;
  requesterMeta: string;
  sourceLabel: string;
  isPinned: boolean;
  pinnedAtLabel: string | null;
  status: AdminTicketStatus;
  statusLabel: string;
  priority: AdminTicketPriority;
  priorityLabel: string;
  categoryLabel: string;
  emailLabel: string;
  emailTone: "default" | "warning" | "danger" | "success";
  replyCount: number;
  thread: TicketThreadEntry[];
  dateLabel: string;
  updatedLabel: string;
}

export interface TicketsViewModel {
  stats: TicketStatCard[];
  items: TicketListItem[];
  pagination: AdminTicketsResponse["pagination"];
  hasTickets: boolean;
}

export interface UpdateAdminTicketPayload {
  status?: AdminTicketStatus;
  priority?: AdminTicketPriority;
  isPinned?: boolean;
}

export interface ReplyAdminTicketPayload {
  body: string;
  bodyHtml?: string;
}
