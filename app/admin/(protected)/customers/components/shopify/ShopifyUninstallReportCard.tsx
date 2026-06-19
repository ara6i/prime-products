"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/app/shared/components/ui";
import type { ShopifyUninstallReport } from "../../types";

interface ShopifyUninstallReportCardProps {
  report: ShopifyUninstallReport;
  isSyncing: boolean;
  onSync: () => void;
  mobile?: boolean;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not synced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not synced";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function prettyReason(value: string | null): string {
  if (!value) return "Reason missing";
  return value
    .split(/[_,-]+/)
    .filter(Boolean)
    .map((part) => part.trim())
    .join(", ");
}

export function ShopifyUninstallReportCard({
  report,
  isSyncing,
  onSync,
  mobile = false,
}: ShopifyUninstallReportCardProps) {
  const recent = report.items.slice(0, mobile ? 3 : 5);

  return (
    <section className={mobile ? "rounded-[5vw] border border-customer-border bg-customer-card p-[4vw]" : "rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[0.938vw]"}>
      <div className={mobile ? "space-y-[3vw]" : "flex items-start justify-between gap-[1vw]"}>
        <div>
          <p className={mobile ? "text-[2.8vw] font-semibold uppercase tracking-[0.14em] text-brand-blue" : "text-[clamp(11px,0.64vw,12px)] font-semibold uppercase tracking-[0.14em] text-brand-blue"}>
            Uninstall reports
          </p>
          <h3 className={mobile ? "mt-[1vw] text-[5vw] font-semibold text-text-primary" : "mt-[0.208vw] text-[clamp(18px,1.15vw,22px)] font-semibold text-text-primary"}>
            Shopify uninstall reasons
          </h3>
          <p className={mobile ? "mt-[1vw] text-[3.2vw] leading-relaxed text-text-body" : "mt-[0.313vw] max-w-[48vw] text-[clamp(12px,0.72vw,14px)] leading-relaxed text-text-body"}>
            {report.partnerApi.configured
              ? `Synced from Partner App History. Last sync: ${formatDate(report.partnerApi.lastSyncedAt)}.`
              : report.partnerApi.message}
          </p>
          {report.sync ? (
            <p className={mobile ? "mt-[1.5vw] text-[3vw] font-semibold text-brand-blue" : "mt-[0.417vw] text-[clamp(11px,0.64vw,12px)] font-semibold text-brand-blue"}>
              {report.sync.message}
            </p>
          ) : null}
        </div>

        <Button
          type="button"
          onClick={onSync}
          disabled={isSyncing || !report.partnerApi.configured}
          className={mobile ? "h-[9vw] w-full text-[3.2vw] font-semibold" : "h-[2.5vw] px-[0.938vw] text-[clamp(12px,0.72vw,14px)] font-semibold"}
        >
          <RefreshCw className={mobile ? "mr-[1.5vw] h-[3.8vw] w-[3.8vw]" : "mr-[0.417vw] h-[0.833vw] w-[0.833vw]"} />
          {isSyncing ? "Syncing..." : "Sync reasons"}
        </Button>
      </div>

      <div className={mobile ? "mt-[4vw] grid grid-cols-3 gap-[2vw]" : "mt-[0.938vw] grid grid-cols-3 gap-[0.625vw]"}>
        {[
          ["Uninstalled", report.summary.totalUninstalled],
          ["With reason", report.summary.withReason],
          ["Missing", report.summary.missingReason],
        ].map(([label, value]) => (
          <div key={label} className={mobile ? "rounded-[4vw] bg-customer-soft p-[3vw]" : "rounded-[0.833vw] bg-customer-soft px-[0.833vw] py-[0.625vw]"}>
            <p className={mobile ? "text-[5vw] font-semibold leading-none text-text-primary" : "text-[clamp(20px,1.35vw,26px)] font-semibold leading-none text-text-primary"}>{value}</p>
            <p className={mobile ? "mt-[1vw] text-[2.7vw] text-customer-muted" : "mt-[0.208vw] text-[clamp(10px,0.6vw,12px)] text-customer-muted"}>{label}</p>
          </div>
        ))}
      </div>

      {report.summary.topReasons.length ? (
        <div className={mobile ? "mt-[3vw] flex flex-wrap gap-[1.5vw]" : "mt-[0.833vw] flex flex-wrap gap-[0.417vw]"}>
          {report.summary.topReasons.map((item) => (
            <span key={item.reason} className={mobile ? "rounded-full bg-brand-blue/10 px-[3vw] py-[1.4vw] text-[2.8vw] font-semibold text-brand-blue" : "rounded-full bg-brand-blue/10 px-[0.729vw] py-[0.313vw] text-[clamp(11px,0.64vw,12px)] font-semibold text-brand-blue"}>
              {prettyReason(item.reason)} · {item.count}
            </span>
          ))}
        </div>
      ) : (
        <div className={mobile ? "mt-[3vw] flex gap-[2vw] rounded-[4vw] bg-customer-warning-bg p-[3vw] text-[3vw] text-customer-warning-text" : "mt-[0.833vw] flex gap-[0.521vw] rounded-[0.833vw] bg-customer-warning-bg px-[0.833vw] py-[0.625vw] text-[clamp(12px,0.72vw,14px)] text-customer-warning-text"}>
          <AlertTriangle className={mobile ? "h-[4vw] w-[4vw] shrink-0" : "h-[0.938vw] w-[0.938vw] shrink-0"} />
          <span>No uninstall reasons are stored locally yet.</span>
        </div>
      )}

      {recent.length ? (
        <div className={mobile ? "mt-[3vw] space-y-[2vw]" : "mt-[0.833vw] overflow-hidden rounded-[0.833vw] border border-customer-border"}>
          {recent.map((item) => (
            <div key={item.id} className={mobile ? "rounded-[4vw] border border-customer-border bg-customer-soft p-[3vw]" : "grid grid-cols-[1fr_1.15fr_0.8fr] gap-[0.833vw] border-b border-customer-border bg-customer-soft px-[0.833vw] py-[0.625vw] last:border-b-0"}>
              <div className="min-w-0">
                <p className={mobile ? "truncate text-[3.2vw] font-semibold text-text-primary" : "truncate text-[clamp(12px,0.72vw,14px)] font-semibold text-text-primary"}>{item.shopName}</p>
                <p className={mobile ? "mt-[0.5vw] truncate text-[2.8vw] text-customer-muted" : "mt-[0.156vw] truncate text-[clamp(10px,0.6vw,12px)] text-customer-muted"}>{item.shopDomain}</p>
              </div>
              <div className="min-w-0">
                <p className={mobile ? "truncate text-[3vw] font-semibold text-text-primary" : "truncate text-[clamp(11px,0.68vw,13px)] font-semibold text-text-primary"}>{prettyReason(item.reason)}</p>
                <p className={mobile ? "mt-[0.5vw] line-clamp-2 text-[2.8vw] text-customer-muted" : "mt-[0.156vw] line-clamp-1 text-[clamp(10px,0.6vw,12px)] text-customer-muted"}>
                  {item.reasonDescription || "No merchant note"}
                </p>
              </div>
              <p className={mobile ? "mt-[1vw] text-[2.8vw] text-customer-muted" : "text-right text-[clamp(10px,0.6vw,12px)] text-customer-muted"}>
                {formatDate(item.uninstalledAt)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
