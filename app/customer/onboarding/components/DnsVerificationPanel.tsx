import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Clipboard, Globe2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { cn } from "@/app/shared/lib/utils";
import type { DomainVerificationResult, MerchantDnsRecord } from "../types";

interface DnsVerificationPanelProps {
  record: MerchantDnsRecord;
  domain: string;
  verified: boolean;
  verifying: boolean;
  result: DomainVerificationResult | null;
  onCopy: (value: string, label: string) => void;
  onVerify: () => void;
  onBack: () => void;
  onContinue: () => void;
}

export function DnsVerificationPanel({
  record,
  domain,
  verified,
  verifying,
  result,
  onCopy,
  onVerify,
  onBack,
  onContinue,
}: DnsVerificationPanelProps) {
  const statusLabel = verified ? "Verified" : result ? "Not found" : "Pending";
  const rowStatus: "success" | "error" | "pending" = verified ? "success" : result ? "error" : "pending";
  const checkedLabel = result?.checkedAt ? new Date(result.checkedAt).toLocaleString() : "Not checked yet";

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">
            Step 03
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-brand-blue">
            <Globe2 className="h-4 w-4" aria-hidden />
            Domain verification
          </div>
          <h2 className="mt-3 max-w-[620px] text-[clamp(2rem,1.2rem+1.8vw,3.35rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-text-primary">
            Add this DNS record.
          </h2>
          <p className="mt-4 max-w-[620px] text-base leading-[1.75] text-text-body">
            Create one TXT record in your DNS provider. After verification, your workspace moves to PrimeStyleAI review.
          </p>
        </div>

        <span
          className={cn(
            "inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold",
            verified
              ? "bg-admin-status-active-bg text-admin-status-active-text"
              : result
                ? "bg-amber-50 text-amber-700"
                : "bg-brand-blue-pale text-brand-blue",
          )}
        >
          {verified ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          ) : result ? (
            <AlertCircle className="h-4 w-4" aria-hidden />
          ) : (
            <RefreshCw className="h-4 w-4" aria-hidden />
          )}
          {statusLabel}
        </span>
      </div>

      <div className="mt-9 rounded-2xl border border-brand-blue/10 bg-white">
        <div className="border-b border-brand-blue/10 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-text-primary">Required TXT record</p>
              <p className="mt-1 text-sm leading-6 text-text-body">
                Add exactly one TXT record with these values.
              </p>
            </div>
            <p className="text-xs text-text-hint">Last checked: {checkedLabel}</p>
          </div>
        </div>
        <DnsRecordTable
          record={record}
          domain={domain}
          status={rowStatus}
          verifying={verifying}
          onCopy={onCopy}
          onVerify={onVerify}
        />
      </div>

      <div className="mt-9 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-body transition-colors hover:text-brand-blue"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onVerify}
            disabled={verifying}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-brand-blue/20 bg-white px-5 text-sm font-semibold text-brand-blue transition-colors hover:bg-brand-blue-pale/35 disabled:cursor-not-allowed disabled:opacity-65"
          >
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
            {verifying ? "Checking" : "Verify"}
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={!verified}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-blue px-7 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-45"
          >
            Continue to review
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}

function DnsRecordTable({
  record,
  domain,
  status,
  verifying,
  onCopy,
  onVerify,
}: {
  record: MerchantDnsRecord;
  domain: string;
  status: "success" | "error" | "pending";
  verifying: boolean;
  onCopy: (value: string, label: string) => void;
  onVerify: () => void;
}) {
  const dnsName = displayDnsName(record.host, domain);

  return (
    <div className="overflow-x-auto rounded-b-2xl">
      <div className="min-w-[720px]">
      <div className="grid grid-cols-[5rem_minmax(0,1fr)_minmax(0,1.5fr)_2rem] border-b border-brand-blue/10 bg-[#fbfdff] px-5 py-3 text-xs font-semibold text-text-hint">
        <span>Type</span>
        <span>Name</span>
        <span>Value</span>
        <span aria-hidden />
      </div>
      <div className="grid grid-cols-[5rem_minmax(0,1fr)_minmax(0,1.5fr)_2rem] items-center border-b border-brand-blue/10 px-5 py-4 text-sm text-text-primary">
        <span className="font-semibold">{record.type}</span>
        <InlineCopy value={dnsName} label="DNS name" onCopy={onCopy} textClassName="max-w-[18ch]" />
        <InlineCopy value={record.value} label="DNS value" onCopy={onCopy} textClassName="max-w-[28ch]" />
        <RecordStatusIcon status={status} verifying={verifying} onVerify={onVerify} />
      </div>
      </div>
    </div>
  );
}

function displayDnsName(host: string, domain: string): string {
  const normalizedDomain = domain.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "");
  const suffix = `.${normalizedDomain}`;
  return normalizedDomain && host.endsWith(suffix) ? host.slice(0, -suffix.length) : host;
}

function InlineCopy({
  value,
  label,
  onCopy,
  className,
  textClassName,
}: {
  value: string;
  label: string;
  onCopy: (value: string, label: string) => void;
  className?: string;
  textClassName?: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <code
        className={cn("block min-w-0 truncate whitespace-nowrap font-mono text-sm text-text-primary", textClassName)}
        title={value}
      >
        {value}
      </code>
      <button
        type="button"
        onClick={() => onCopy(value, label)}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-hint transition hover:bg-brand-blue-pale hover:text-brand-blue"
        aria-label={`Copy ${label}`}
      >
        <Clipboard className="h-4 w-4" aria-hidden />
      </button>
    </span>
  );
}

function RecordStatusIcon({
  status,
  verifying,
  onVerify,
}: {
  status: "success" | "error" | "pending";
  verifying: boolean;
  onVerify: () => void;
}) {
  if (status === "success") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Found" />;
  }
  const Icon = status === "error" ? XCircle : RefreshCw;
  const label = status === "error" ? "Retry verification" : "Check DNS record";
  const colorClass = status === "error" ? "text-red-500 hover:bg-red-50" : "text-text-hint hover:bg-brand-blue-pale hover:text-brand-blue";
  return (
    <button
      type="button"
      onClick={onVerify}
      disabled={verifying}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md transition disabled:cursor-not-allowed disabled:opacity-50",
        colorClass,
      )}
      aria-label={label}
      title={label}
    >
      {verifying ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Icon className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
