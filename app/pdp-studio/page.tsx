import { PdpStudioDashboard } from "./components/PdpStudioDashboard";
import { mapPdpStudioDashboardView } from "./mappers/pdpStudioDashboardMapper";
import { getPdpStudioMe } from "./shared/pdpStudioAuthService";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "PDP Studio - PrimeStyleAI",
};

export default async function PdpStudioDashboardPage() {
  const user = await getPdpStudioMe();
  const view = mapPdpStudioDashboardView();

  return <PdpStudioDashboard user={user} view={view} />;
}
