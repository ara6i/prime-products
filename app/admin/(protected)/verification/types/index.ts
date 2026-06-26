export type VerificationRequestStatus =
  | "draft"
  | "domain_pending"
  | "auto_reviewing"
  | "manual_review"
  | "approved"
  | "rejected";

export interface VerificationRawRequest {
  id: string;
  status: VerificationRequestStatus;
  approvalSource: "auto" | "manual" | null;
  workspaceName: string;
  merchantName: string;
  ownerEmail: string;
  domain: string;
  website: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  updatedAt: string;
  currentStep: string;
  requestedAccess: "sdk" | "api" | "sdk_api";
  monthlyVisitors: string;
  catalogDescription: string | null;
  notes?: string | null;
  checks: Array<{
    label: string;
    passed: boolean;
    detail: string;
  }>;
  reasons: string[];
  adminDecision: {
    decision: "approved" | "rejected";
    note: string | null;
    decidedAt: string;
  } | null;
}

export interface VerificationListResponse {
  items: VerificationRawRequest[];
  stats: {
    total: number;
    pending: number;
    manualReview: number;
    approved: number;
    rejected: number;
  };
}

export interface VerificationStatCard {
  label: string;
  value: string;
  helper: string;
  tone: "blue" | "green" | "amber" | "rose";
}

export interface VerificationRequestItem {
  id: string;
  status: VerificationRequestStatus;
  approvalSource: "auto" | "manual" | null;
  workspaceName: string;
  merchantName: string;
  ownerEmail: string;
  domain: string;
  website: string;
  submittedLabel: string;
  reviewedLabel: string;
  lastUpdatedLabel: string;
  statusLabel: string;
  statusToneClass: string;
  currentStep: string;
  requestedAccessLabel: string;
  monthlyTraffic: string;
  catalogDescription: string;
  notes: string;
  checks: Array<{
    label: string;
    passed: boolean;
    detail: string;
  }>;
  canApprove: boolean;
  canReject: boolean;
}

export interface VerificationCenterView {
  stats: VerificationStatCard[];
  pendingItems: VerificationRequestItem[];
  needsAttentionItems: VerificationRequestItem[];
  approvedItems: VerificationRequestItem[];
  allItems: VerificationRequestItem[];
}
