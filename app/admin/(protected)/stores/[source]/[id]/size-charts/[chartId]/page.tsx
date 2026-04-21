import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/app/admin/shared/components/AdminShell";
import { ArrowLeftIcon } from "@/app/shared/components/icons";
import { getSizeChart } from "./services/chartService";
import { ChartViewer } from "./components/desktop/ChartViewer";
import { ChartViewerMobile } from "./components/mobile/ChartViewerMobile";
import type { StoreSource } from "@/app/admin/shared/types";

export const dynamic = "force-dynamic";

export default async function AdminSizeChartPage({
  params,
}: {
  params: Promise<{ source: string; id: string; chartId: string }>;
}) {
  const { source: rawSource, id, chartId } = await params;
  if (rawSource !== "shopify" && rawSource !== "sdk") notFound();
  const source = rawSource as StoreSource;

  const chart = await getSizeChart(source, id, chartId);
  if (!chart) notFound();

  return (
    <AdminShell
      title={chart.name}
      subtitle={`${chart.rows.length} rows · ${chart.headers.length} columns · ${chart.unit.toUpperCase()}`}
    >
      <div className="mb-[var(--spacing-admin-gap-lg)] max-lg:mb-3">
        <Link
          href={`/admin/stores/${source}/${id}`}
          className="inline-flex items-center gap-[0.313vw] text-admin-sm text-text-body hover:text-brand-blue transition-colors max-lg:text-sm max-lg:gap-1.5"
        >
          <ArrowLeftIcon size={14} className="!w-[0.729vw] !h-[0.729vw] max-lg:!w-3 max-lg:!h-3" color="currentColor" />
          Back to store
        </Link>
      </div>

      <div className="hidden lg:block">
        <ChartViewer chart={chart} />
      </div>
      <div className="lg:hidden">
        <ChartViewerMobile chart={chart} />
      </div>
    </AdminShell>
  );
}
