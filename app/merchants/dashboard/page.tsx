import { Suspense } from "react";
import { MerchantDashboardExperience } from "../../partner-landing/merchant-dashboard/components/MerchantDashboardExperience";

export default function MerchantDashboardPage() {
  return (
    <Suspense fallback={<p role="status">Loading merchant dashboard…</p>}>
      <MerchantDashboardExperience section="overview" />
    </Suspense>
  );
}
