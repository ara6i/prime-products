import { Card } from "@/app/admin/shared/components/Card";
import { EmptyState } from "@/app/admin/shared/components/EmptyState";
import { LightbulbIcon, CheckCircleIcon, ArrowRightIcon } from "@/app/shared/components/icons";
import type { SizeGuideConfig } from "@/app/admin/shared/types";

interface Props {
  config: SizeGuideConfig | null;
}

export function SizeGuideConfigCard({ config }: Props) {
  if (!config) {
    return (
      <Card
        title="Learned size-guide mapping"
        description="The AI-learned mapping appears here after the merchant uploads their first CSV"
      >
        <EmptyState
          icon={<LightbulbIcon size={24} className="!w-[1.25vw] !h-[1.25vw]" color="currentColor" />}
          title="No mapping learned yet"
          description="Upload a CSV from the Polaris app and the LLM will map the columns automatically."
        />
      </Card>
    );
  }

  const activeMappings = config.headerMappings.filter((m) => m.key !== "__skip__");
  const skipped = config.headerMappings.filter((m) => m.key === "__skip__");
  const confirmed = Boolean(config.confirmedAt);

  return (
    <Card
      title="Learned size-guide mapping"
      description="How the LLM mapped this merchant's CSV columns to standard measurement keys"
      action={
        confirmed ? (
          <span
            className="inline-flex items-center gap-[0.313vw] rounded-full bg-admin-status-active-bg px-[0.625vw] py-[0.208vw] text-admin-xs font-medium text-admin-status-active-text"
            title="The merchant has reviewed and confirmed this mapping in their Shopify admin."
          >
            <CheckCircleIcon
              size={12}
              className="!w-[0.625vw] !h-[0.625vw]"
              color="currentColor"
            />
            Confirmed by merchant
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-[0.313vw] rounded-full bg-surface-warning-light px-[0.625vw] py-[0.208vw] text-admin-xs font-medium text-warning-text"
            title="The AI mapped the CSV columns automatically. The merchant hasn't reviewed or confirmed it yet in their Shopify admin."
          >
            AI draft · awaiting merchant review
          </span>
        )
      }
    >
      <div className="flex items-center gap-[var(--spacing-admin-gap-lg)] pb-[var(--spacing-admin-gap-md)] border-b border-admin-border-soft text-admin-sm text-text-body">
        <div className="flex items-center gap-[0.313vw]">
          <span className="text-text-hint">Unit</span>
          <span className="font-semibold text-text-primary uppercase">{config.unit}</span>
        </div>
        <div className="flex items-center gap-[0.313vw]">
          <span className="text-text-hint">Learned</span>
          <span className="font-medium text-text-primary">
            {config.learnedAt ? new Date(config.learnedAt).toLocaleDateString() : "—"}
          </span>
        </div>
        <div className="flex items-center gap-[0.313vw]">
          <span className="text-text-hint">Columns mapped</span>
          <span className="font-medium text-text-primary">
            {activeMappings.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr_8vw] items-center gap-x-[var(--spacing-admin-gap-md)] mt-[var(--spacing-admin-gap-md)]">
        <div className="text-[0.625vw] font-semibold tracking-[0.06em] text-text-hint uppercase pb-[var(--spacing-admin-gap-sm)]">
          Original CSV header
        </div>
        <div />
        <div className="text-[0.625vw] font-semibold tracking-[0.06em] text-text-hint uppercase pb-[var(--spacing-admin-gap-sm)]">
          Standard key
        </div>
        <div className="text-[0.625vw] font-semibold tracking-[0.06em] text-text-hint uppercase pb-[var(--spacing-admin-gap-sm)]">
          Unit
        </div>

        {activeMappings.map((m) => (
          <div
            key={m.original}
            className="contents"
          >
            <div className="py-[var(--spacing-admin-gap-sm)] border-t border-admin-border-soft text-admin-sm text-text-primary font-mono">
              {m.original}
            </div>
            <div className="py-[var(--spacing-admin-gap-sm)] border-t border-admin-border-soft text-text-hint">
              <ArrowRightIcon
                size={14}
                className="!w-[0.729vw] !h-[0.729vw]"
                color="currentColor"
              />
            </div>
            <div className="py-[var(--spacing-admin-gap-sm)] border-t border-admin-border-soft text-admin-sm text-text-primary">
              <span className="font-mono font-medium">{m.key}</span>
              <span className="text-text-hint ml-[0.313vw]">· {m.label}</span>
            </div>
            <div className="py-[var(--spacing-admin-gap-sm)] border-t border-admin-border-soft text-admin-sm text-text-body uppercase">
              {m.unit ?? "—"}
            </div>
          </div>
        ))}
      </div>

      {skipped.length > 0 && (
        <div className="mt-[var(--spacing-admin-gap-md)] pt-[var(--spacing-admin-gap-md)] border-t border-admin-border-soft">
          <div className="text-[0.625vw] font-semibold tracking-[0.06em] text-text-hint uppercase mb-[0.313vw]">
            Skipped columns
          </div>
          <div className="flex flex-wrap gap-[0.313vw]">
            {skipped.map((m) => (
              <span
                key={m.original}
                className="inline-flex items-center rounded-[0.313vw] bg-admin-muted px-[0.521vw] py-[0.156vw] text-admin-xs text-text-body font-mono"
              >
                {m.original}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
