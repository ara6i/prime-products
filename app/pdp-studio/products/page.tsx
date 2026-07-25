import { ProductsWorkspace } from "../workspace/components/products/ProductsWorkspace";
import { PdpStudioAppShell } from "../workspace/components/shell/PdpStudioAppShell";
import { loadPdpStudioPageContext } from "../workspace/services/loadPdpStudioPageContext";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shopify Products · PDP Studio",
};

export default async function PdpStudioProductsPage() {
  const { user, view } = await loadPdpStudioPageContext();
  return (
    <PdpStudioAppShell user={user} view={view}>
      <ProductsWorkspace />
    </PdpStudioAppShell>
  );
}
