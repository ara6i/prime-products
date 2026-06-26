import type {
  VerificationCenterView,
  VerificationRawRequest,
  VerificationRequestItem,
  VerificationRequestStatus,
  VerificationStatCard,
} from "../types";

function formatDate(value: string): string {
  if (!value) return "Not submitted";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en").format(value);
}

function accessLabel(value: VerificationRawRequest["requestedAccess"]): string {
  switch (value) {
    case "sdk_api":
      return "SDK + API";
    case "api":
      return "API";
    default:
      return "SDK";
  }
}

function statusLabel(status: VerificationRequestStatus, approvalSource: VerificationRawRequest["approvalSource"]): string {
  if (status === "approved" && approvalSource === "auto") return "Auto approved";
  if (status === "approved" && approvalSource === "manual") return "Manual approved";
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "manual_review":
      return "Manual review";
    case "auto_reviewing":
      return "Auto review";
    case "domain_pending":
      return "Domain pending";
    default:
      return "Draft";
  }
}

function statusToneClass(status: VerificationRequestStatus): string {
  switch (status) {
    case "approved":
      return "bg-customer-success-bg text-customer-success-text";
    case "rejected":
    case "manual_review":
      return "bg-customer-warning-bg text-customer-warning-text";
    case "auto_reviewing":
      return "bg-customer-blue text-brand-blue";
    default:
      return "bg-customer-soft text-customer-muted";
  }
}

export function mapVerificationRequest(request: VerificationRawRequest): VerificationRequestItem {
  return {
    id: request.id,
    status: request.status,
    approvalSource: request.approvalSource,
    workspaceName: request.workspaceName,
    merchantName: request.merchantName,
    ownerEmail: request.ownerEmail,
    domain: request.domain,
    website: request.website,
    submittedLabel: request.submittedAt ? formatDate(request.submittedAt) : "Not submitted",
    reviewedLabel: request.reviewedAt ? formatDate(request.reviewedAt) : "Not reviewed",
    lastUpdatedLabel: formatDate(request.updatedAt),
    statusLabel: statusLabel(request.status, request.approvalSource),
    statusToneClass: statusToneClass(request.status),
    currentStep: request.currentStep,
    requestedAccessLabel: accessLabel(request.requestedAccess),
    monthlyTraffic: request.monthlyVisitors || "Not provided",
    catalogDescription: request.catalogDescription ?? "Not provided",
    notes: (request.notes ?? (request.reasons ?? []).join(" ")) || "No notes recorded.",
    checks: request.checks ?? [],
    canApprove: request.status === "manual_review" || request.status === "rejected",
    canReject: request.status === "manual_review" || request.status === "approved",
  };
}

function stat(label: string, value: number | string, helper: string, tone: VerificationStatCard["tone"]): VerificationStatCard {
  return {
    label,
    value: typeof value === "number" ? formatNumber(value) : value,
    helper,
    tone,
  };
}

export function mapVerificationCenter(requests: VerificationRawRequest[]): VerificationCenterView {
  const allItems = requests.map(mapVerificationRequest);
  const pendingItems = allItems.filter((item) => item.status === "manual_review" || item.status === "auto_reviewing");
  const needsAttentionItems = allItems.filter((item) => item.status === "rejected" || item.status === "domain_pending" || item.status === "draft");
  const approvedItems = allItems.filter((item) => item.status === "approved");

  return {
    stats: [
      stat("Pending review", pendingItems.length, "SDK workspaces waiting for admin decision", "blue"),
      stat("Needs attention", needsAttentionItems.length, "Requests blocked by missing setup work", "amber"),
      stat("Approved", approvedItems.length, "Workspaces already cleared", "green"),
      stat("Total queue", allItems.length, "Real customer onboarding review records", "rose"),
    ],
    pendingItems,
    needsAttentionItems,
    approvedItems,
    allItems,
  };
}
