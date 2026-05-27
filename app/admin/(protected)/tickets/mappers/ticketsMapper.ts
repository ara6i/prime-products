import type {
  AdminTicketRaw,
  AdminTicketsResponse,
  TicketListItem,
  TicketStatCard,
  TicketThreadEntry,
  TicketsViewModel,
} from "../types";

const statusLabels: Record<AdminTicketRaw["status"], string> = {
  open: "Open",
  in_progress: "Open",
  waiting: "Open",
  resolved: "Solved",
  closed: "Solved",
};

const priorityLabels: Record<AdminTicketRaw["priority"], string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

const categoryLabels: Record<AdminTicketRaw["category"], string> = {
  general: "General",
  technical: "Technical",
  billing: "Billing",
  merchant: "Merchant",
  feedback: "Feedback",
  incident: "Incident",
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function emailLabel(ticket: AdminTicketRaw): TicketListItem["emailLabel"] {
  const failedReply = ticket.replies.some((reply) => reply.emailDelivery.status === "failed");
  const pendingReply = ticket.replies.some((reply) => reply.emailDelivery.status === "pending");
  if (failedReply || ticket.emailDelivery.status === "failed") return "Reply failed";
  if (pendingReply) return "Reply pending";
  if (ticket.replies.length > 0) return "Replied";
  return "Email received";
}

function emailTone(ticket: AdminTicketRaw): TicketListItem["emailTone"] {
  if (ticket.emailDelivery.status === "failed" || ticket.replies.some((reply) => reply.emailDelivery.status === "failed")) return "danger";
  if (ticket.replies.some((reply) => reply.emailDelivery.status === "pending")) return "warning";
  if (ticket.replies.length > 0 || ticket.emailDelivery.status === "sent") return "success";
  return "warning";
}

function mapStats(response: AdminTicketsResponse): TicketStatCard[] {
  return [
    {
      label: "Open",
      value: formatNumber(response.summary.open),
      helper: `${formatNumber(response.summary.total)} total tickets`,
      tone: "default",
    },
    {
      label: "Urgent",
      value: formatNumber(response.summary.urgent),
      helper: "Needs priority review",
      tone: "danger",
    },
    {
      label: "Solved",
      value: formatNumber(response.summary.resolved),
      helper: `${formatNumber(response.summary.emailFailed)} email failures`,
      tone: "success",
    },
  ];
}

function sourceLabel(source: AdminTicketRaw["source"]): string {
  if (source === "email") return "Support email";
  if (source === "customer_dashboard") return "Customer dashboard";
  if (source === "shopify_admin") return "Shopify admin";
  if (source === "public_form") return "Public form";
  return "Admin";
}

function replyDeliveryLabel(reply: AdminTicketRaw["replies"][number]): TicketThreadEntry["deliveryLabel"] {
  if (reply.authorType !== "admin") return null;
  if (reply.emailDelivery.status === "sent") return "Email sent";
  if (reply.emailDelivery.status === "failed") return "Email failed";
  return "Email pending";
}

function replyDeliveryTone(reply: AdminTicketRaw["replies"][number]): TicketThreadEntry["deliveryTone"] {
  if (reply.emailDelivery.status === "sent") return "success";
  if (reply.emailDelivery.status === "failed") return "danger";
  if (reply.emailDelivery.status === "pending") return "warning";
  return "default";
}

function mapThread(ticket: AdminTicketRaw): TicketThreadEntry[] {
  const firstEntry: TicketThreadEntry = {
    id: `${ticket.id}-initial`,
    authorLabel: ticket.requesterName,
    authorMeta: ticket.requesterEmail,
    body: ticket.message,
    bodyHtml: ticket.messageHtml,
    dateLabel: formatDate(ticket.createdAt),
    tone: "requester",
    deliveryLabel: "Email received",
    deliveryTone: "success",
  };

  return [
    firstEntry,
    ...ticket.replies.map((reply) => ({
      id: reply.id,
      authorLabel: reply.authorName,
      authorMeta: reply.authorEmail,
      body: reply.body,
      bodyHtml: reply.bodyHtml,
      dateLabel: formatDate(reply.createdAt),
      tone: reply.authorType === "admin" ? "admin" as const : "requester" as const,
      deliveryLabel: replyDeliveryLabel(reply),
      deliveryTone: replyDeliveryTone(reply),
    })),
  ];
}

export function mapTicket(ticket: AdminTicketRaw): TicketListItem {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    message: ticket.message,
    requesterLabel: ticket.requesterName,
    requesterMeta: [ticket.requesterEmail, ticket.requesterCompany].filter(Boolean).join(" · "),
    sourceLabel: sourceLabel(ticket.source),
    isPinned: ticket.isPinned ?? false,
    pinnedAtLabel: ticket.pinnedAt ? formatDate(ticket.pinnedAt) : null,
    status: ticket.status,
    statusLabel: statusLabels[ticket.status],
    priority: ticket.priority,
    priorityLabel: priorityLabels[ticket.priority],
    categoryLabel: categoryLabels[ticket.category],
    emailLabel: emailLabel(ticket),
    emailTone: emailTone(ticket),
    replyCount: ticket.replies.length,
    thread: mapThread(ticket),
    dateLabel: formatDate(ticket.createdAt),
    updatedLabel: formatDate(ticket.updatedAt),
  };
}

export function mapTicketsPage(response: AdminTicketsResponse): TicketsViewModel {
  return {
    stats: mapStats(response),
    items: response.items.map(mapTicket),
    pagination: response.pagination ?? {
      page: 1,
      limit: 25,
      totalItems: response.summary.total,
      totalPages: Math.max(1, Math.ceil(response.summary.total / 25)),
    },
    hasTickets: response.items.length > 0,
  };
}
