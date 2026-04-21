import Link from "next/link";
import { Card } from "@/app/admin/shared/components/Card";
import { StatusPill, SourceBadge } from "@/app/admin/shared/components/StatusPill";
import { EmptyState } from "@/app/admin/shared/components/EmptyState";
import { CatalogIcon, ArrowLeftIcon } from "@/app/shared/components/icons";
import type {
  SizeChartSummary,
  SizeGuideConfig,
  StoreDetail,
  StoreSource,
} from "@/app/admin/shared/types";

interface Props {
  detail: StoreDetail;
  charts: SizeChartSummary[];
  source: StoreSource;
  storeId: string;
  config?: SizeGuideConfig | null;
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-admin-border-soft last:border-0">
      <span className="text-[11px] text-text-hint uppercase tracking-wider font-medium">
        {label}
      </span>
      <span className="text-sm text-text-primary text-right break-all">{value}</span>
    </div>
  );
}

export function StoreDetailMobile({ detail, charts, source, storeId }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/admin/stores"
        className="inline-flex items-center gap-1.5 text-xs text-text-body self-start -mt-1"
      >
        <ArrowLeftIcon size={12} color="currentColor" />
        Back to stores
      </Link>

      <div className="flex items-center gap-2 flex-wrap">
        <SourceBadge source={detail.store.source} />
        <span className="text-xs text-text-body font-mono truncate">
          {detail.store.identifier}
        </span>
        {detail.store.ownerEmail && (
          <>
            <span className="text-text-hint">·</span>
            <span className="text-xs text-text-body truncate">{detail.store.ownerEmail}</span>
          </>
        )}
        <StatusPill status={detail.store.status} size="sm" />
      </div>

      <Card title="Store details">
        <div className="flex flex-col">
          {detail.source === "shopify" ? (
            <>
              <MetaRow label="Shop domain" value={detail.raw.shopDomain} />
              <MetaRow label="Owner" value={detail.raw.ownerEmail ?? "—"} />
              <MetaRow
                label="Plan"
                value={<span className="capitalize">{detail.raw.plan}</span>}
              />
              <MetaRow
                label="Try-ons"
                value={`${detail.raw.tryOnsUsed.toLocaleString()} / ${(
                  detail.raw.tryOnsUsed + detail.raw.tryOnsRemaining
                ).toLocaleString()}`}
              />
              <MetaRow
                label="Installed"
                value={new Date(detail.raw.installedAt).toLocaleDateString()}
              />
              {detail.raw.lastUsedAt && (
                <MetaRow
                  label="Last used"
                  value={new Date(detail.raw.lastUsedAt).toLocaleDateString()}
                />
              )}
            </>
          ) : (
            <>
              <MetaRow label="Store name" value={detail.storeProfile.storeName} />
              <MetaRow label="Owner" value={detail.user?.email ?? "—"} />
              <MetaRow label="Project" value={detail.project?.name ?? "—"} />
              <MetaRow
                label="Created"
                value={new Date(detail.storeProfile.createdAt).toLocaleDateString()}
              />
            </>
          )}
        </div>
      </Card>

      <Card
        title="Size charts"
        description={`${charts.length} uploaded`}
        bodyClassName="!p-0 !pt-0"
      >
        {charts.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<CatalogIcon size={24} color="currentColor" />}
              title="No size charts uploaded"
            />
          </div>
        ) : (
          <ul className="divide-y divide-admin-border-soft">
            {charts.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/stores/${source}/${storeId}/size-charts/${c.id}`}
                  className="flex items-center gap-3 px-5 py-4 active:bg-admin-row-hover"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-text-primary truncate">
                      {c.name}
                    </div>
                    <div className="text-[11px] text-text-hint mt-0.5">
                      {c.columnCount} cols · {c.rowCount} rows · {c.unit.toUpperCase()}
                    </div>
                  </div>
                  <span className="text-[11px] text-text-body whitespace-nowrap tabular-nums">
                    {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
