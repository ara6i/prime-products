import { ArrowLeft, ArrowRight, CheckCircle2, Clipboard, KeyRound, Loader2, Lock } from "lucide-react";
import type { MerchantApiKeyResult } from "../types";

interface ApiKeyPanelProps {
  domainVerified: boolean;
  creatingKey: boolean;
  completing: boolean;
  apiKeyResult: MerchantApiKeyResult | null;
  onCopy: (value: string, label: string) => void;
  onCreateKey: () => void;
  onContinue: () => void;
  onBack: () => void;
}

export function ApiKeyPanel({
  domainVerified,
  creatingKey,
  completing,
  apiKeyResult,
  onCopy,
  onCreateKey,
  onContinue,
  onBack,
}: ApiKeyPanelProps) {
  const visibleKey = apiKeyResult?.key;
  const keyDisplay = visibleKey ?? apiKeyResult?.keyPrefix ?? "Key appears after creation";

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">
            Step 03
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-brand-blue">
            <KeyRound className="h-4 w-4" aria-hidden />
            Production API key
          </div>
          <h2 className="mt-3 max-w-[620px] text-[clamp(2rem,1.2rem+1.8vw,3.35rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-text-primary">
            Create your API key.
          </h2>
          <p className="mt-4 max-w-[620px] text-base leading-[1.75] text-text-body">
            Use this key for the SDK and API integration. The full key is shown only once, so copy it after creation.
          </p>
        </div>

        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-blue-pale px-3 py-1.5 text-sm font-semibold text-brand-blue">
          {domainVerified ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
          {domainVerified ? "Unlocked" : "Locked"}
        </span>
      </div>

      <div className="mt-9 border-y border-brand-blue/10 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-hint">
          Production key
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <code className="min-h-12 flex-1 break-all font-mono text-sm leading-relaxed text-text-primary">
            {keyDisplay}
          </code>
          {visibleKey && (
            <button
              type="button"
              onClick={() => onCopy(visibleKey, "Production key")}
              className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-full border border-brand-blue/20 px-4 text-sm font-semibold text-brand-blue transition-colors hover:bg-brand-blue-pale/35"
            >
              <Clipboard className="h-4 w-4" aria-hidden />
              Copy key
            </button>
          )}
        </div>
        {apiKeyResult && !apiKeyResult.key && (
          <p className="mt-4 text-sm leading-[1.65] text-text-body">{apiKeyResult.message}</p>
        )}
      </div>

      <p className="mt-6 max-w-[620px] text-sm leading-[1.65] text-text-body">
        Allowed domains include your apex domain and the www storefront domain.
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

        {apiKeyResult?.id ? (
          <button
            type="button"
            onClick={onContinue}
            disabled={completing}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-blue px-7 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-55"
          >
            {completing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ArrowRight className="h-4 w-4" aria-hidden />}
            {completing ? "Opening dashboard" : "Open dashboard"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onCreateKey}
            disabled={!domainVerified || creatingKey}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-blue px-7 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-55"
          >
            {creatingKey ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <KeyRound className="h-4 w-4" aria-hidden />}
            {creatingKey ? "Creating key" : "Create API key"}
          </button>
        )}
      </div>
    </section>
  );
}
