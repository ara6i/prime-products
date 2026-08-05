import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MerchantDashboardExperience } from "../../../partner-landing/merchant-dashboard/components/MerchantDashboardExperience";
import {
  isMerchantDashboardRouteSection,
  MERCHANT_DASHBOARD_ROUTE_SECTIONS,
} from "../../../partner-landing/merchant-dashboard/types";

interface MerchantDashboardSectionPageProps {
  params: Promise<{ section: string }>;
}

export function generateStaticParams() {
  return MERCHANT_DASHBOARD_ROUTE_SECTIONS.map((section) => ({ section }));
}

export default async function MerchantDashboardSectionPage({
  params,
}: MerchantDashboardSectionPageProps) {
  const { section } = await params;
  if (!isMerchantDashboardRouteSection(section)) notFound();

  return (
    <Suspense fallback={<p role="status">Loading merchant dashboard…</p>}>
      <MerchantDashboardExperience section={section} />
    </Suspense>
  );
}
