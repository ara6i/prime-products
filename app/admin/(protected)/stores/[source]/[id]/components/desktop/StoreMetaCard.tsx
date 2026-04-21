import { Card } from "@/app/admin/shared/components/Card";
import { StatusPill } from "@/app/admin/shared/components/StatusPill";
import type { StoreDetail } from "@/app/admin/shared/types";

interface Props {
  detail: StoreDetail;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9vw_1fr] items-start gap-[var(--spacing-admin-gap-md)] py-[var(--spacing-admin-gap-md)] border-b border-admin-border-soft last:border-0">
      <span className="text-admin-xs font-medium text-text-hint uppercase tracking-wider">
        {label}
      </span>
      <span className="text-admin-sm text-text-primary break-all">{value}</span>
    </div>
  );
}

export function StoreMetaCard({ detail }: Props) {
  if (detail.source === "shopify") {
    const r = detail.raw;
    return (
      <Card title="Store details" description="Information reported by Shopify">
        <div className="flex flex-col">
          <Row label="Shop domain" value={r.shopDomain} />
          <Row label="Shop name" value={r.shopName ?? "—"} />
          <Row label="Owner email" value={r.ownerEmail ?? "—"} />
          <Row label="Currency" value={r.currency ?? "—"} />
          <Row label="Timezone" value={r.timezone ?? "—"} />
          <Row label="Plan" value={<span className="capitalize font-medium">{r.plan}</span>} />
          <Row label="Status" value={<StatusPill status={r.status} />} />
          <Row
            label="Installed"
            value={r.installedAt ? new Date(r.installedAt).toLocaleString() : "—"}
          />
          <Row
            label="Last used"
            value={r.lastUsedAt ? new Date(r.lastUsedAt).toLocaleString() : "Never"}
          />
          {r.uninstalledAt && (
            <Row label="Uninstalled" value={new Date(r.uninstalledAt).toLocaleString()} />
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card title="Store details" description="SDK integration">
      <div className="flex flex-col">
        <Row label="Store name" value={detail.storeProfile.storeName} />
        <Row label="Owner" value={detail.user?.email ?? "—"} />
        <Row label="Project" value={detail.project?.name ?? "—"} />
        {detail.project?.description && (
          <Row label="Description" value={detail.project.description} />
        )}
        <Row label="Status" value={<StatusPill status={detail.storeProfile.status} />} />
        <Row
          label="Created"
          value={
            detail.storeProfile.createdAt
              ? new Date(detail.storeProfile.createdAt).toLocaleString()
              : "—"
          }
        />
      </div>
    </Card>
  );
}
