import { BrandKitWorkspace } from "../workspace/components/brand-kit/BrandKitWorkspace";
import { PdpStudioAppShell } from "../workspace/components/shell/PdpStudioAppShell";
import { loadPdpStudioPageContext } from "../workspace/services/loadPdpStudioPageContext";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Brand Kit · PDP Studio",
};

export default async function PdpStudioBrandKitPage() {
  const { user, view } = await loadPdpStudioPageContext();
  return (
    <PdpStudioAppShell user={user} view={view}>
      <BrandKitWorkspace />
    </PdpStudioAppShell>
  );
}
