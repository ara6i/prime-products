import { HomeWorkspace } from "./workspace/components/home/HomeWorkspace";
import { PdpStudioAppShell } from "./workspace/components/shell/PdpStudioAppShell";
import { loadPdpStudioPageContext } from "./workspace/services/loadPdpStudioPageContext";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "PDP Studio · PrimeStyleAI",
};

export default async function PdpStudioHomePage() {
  const { user, view } = await loadPdpStudioPageContext();

  return (
    <PdpStudioAppShell user={user} view={view}>
      <HomeWorkspace catalog={view.catalog} />
    </PdpStudioAppShell>
  );
}
