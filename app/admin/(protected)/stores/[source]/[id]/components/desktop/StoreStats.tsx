import { StatCard } from "@/app/admin/shared/components/StatCard";
import {
  CatalogIcon,
  CameraIcon,
  ApparelIcon,
  LocalOfferIcon,
} from "@/app/shared/components/icons";
import type { StoreDetail } from "@/app/admin/shared/types";

interface Props {
  detail: StoreDetail;
}

export function StoreStats({ detail }: Props) {
  if (detail.source === "shopify") {
    const total = detail.raw.tryOnsUsed + detail.raw.tryOnsRemaining;
    return (
      <div className="grid grid-cols-4 gap-[var(--spacing-admin-gap-lg)]">
        <StatCard
          label="Try-ons used"
          value={detail.raw.tryOnsUsed}
          hint={`of ${total.toLocaleString()} total`}
          icon={CameraIcon}
          accent="blue"
        />
        <StatCard
          label="Try-ons remaining"
          value={detail.raw.tryOnsRemaining}
          hint={detail.raw.plan ? `${detail.raw.plan} plan` : undefined}
          icon={LocalOfferIcon}
          accent="green"
        />
        <StatCard
          label="Size charts"
          value={detail.stats.chartCount}
          icon={CatalogIcon}
          accent="purple"
        />
        <StatCard
          label="Linked products"
          value={detail.stats.linkedProductCount}
          icon={ApparelIcon}
          accent="amber"
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-[var(--spacing-admin-gap-lg)]">
      <StatCard
        label="Size charts"
        value={detail.stats.chartCount}
        icon={CatalogIcon}
        accent="purple"
      />
      <StatCard
        label="Status"
        value={detail.storeProfile.status}
        icon={LocalOfferIcon}
        accent="neutral"
      />
    </div>
  );
}
