import { ShopifyProductWorkspace } from "../../workspace/components/products/ShopifyProductWorkspace";
import { loadPdpStudioPageContext } from "../../workspace/services/loadPdpStudioPageContext";

export const dynamic = "force-dynamic";

interface PdpStudioProductPageProps {
  params: Promise<{ productId: string }>;
}

export default async function PdpStudioProductPage({
  params,
}: PdpStudioProductPageProps) {
  const [{ productId }, { view }] = await Promise.all([
    params,
    loadPdpStudioPageContext(),
  ]);
  return (
    <ShopifyProductWorkspace
      productId={productId}
      tools={view.catalog.tools}
    />
  );
}
