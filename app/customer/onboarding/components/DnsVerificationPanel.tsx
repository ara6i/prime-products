import { ArrowLeft, ArrowRight, CheckCircle2, Clipboard, Globe2, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/app/shared/lib/utils";
import type { DomainVerificationResult, MerchantDnsRecord } from "../types";

interface DnsVerificationPanelProps {
  record: MerchantDnsRecord;
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
  verified,
  verifying,
  result,
  onCopy,
  onVerify,
  onBack,
  onContinue,
}: DnsVerificationPanelProps) {
  const resultMessage = result
    ? result.verified
      ? `Verified at ${new Date(result.checkedAt).toLocaleTimeString()}.`
      : "Record not found yet. DNS changes can take a few minutes to propagate."
    : "Add the TXT record, then verify it here.";

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">
            Step 02
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-brand-blue">
            <Globe2 className="h-4 w-4" aria-hidden />
            Domain verification
          </div>
          <h2 className="mt-3 max-w-[620px] text-[clamp(2rem,1.2rem+1.8vw,3.35rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-text-primary">
            Add this DNS record.
          </h2>
          <p className="mt-4 max-w-[620px] text-base leading-[1.75] text-text-body">
            Create one TXT record in your DNS provider. Copy the host and value exactly.
          </p>
        </div>

        <span
          className={cn(
            "inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold",
            verified ? "bg-admin-status-active-bg text-admin-status-active-text" : "bg-brand-blue-pale text-brand-blue",
          )}
        >
          {verified ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
          {verified ? "Verified" : "Pending"}
        </span>
      </div>

      <div className="mt-9 space-y-5">
        <DnsRecordRow label="Type" value={record.type} />
        <DnsRecordRow label="Host" value={record.host} onCopy={() => onCopy(record.host, "DNS host")} />
        <DnsRecordRow label="Value" value={record.value} onCopy={() => onCopy(record.value, "DNS value")} />
      </div>

      <p className="mt-6 max-w-[620px] text-sm leading-[1.65] text-text-body">
        {resultMessage}
      </p>

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
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}

function DnsRecordRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
}) {
  return (
    <div className="grid gap-2 border-b border-brand-blue/10 pb-4 sm:grid-cols-[88px_1fr_auto] sm:items-center">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-text-hint">{label}</span>
      <code className="break-all font-mono text-sm text-text-primary">{value}</code>
      {onCopy ? (
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-brand-blue transition-colors hover:text-brand-blue-dark"
        >
          <Clipboard className="h-4 w-4" aria-hidden />
          Copy
        </button>
      ) : (
        <span aria-hidden />
      )}
    </div>
  );
}
