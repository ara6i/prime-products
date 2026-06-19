import { cookies } from "next/headers";
import { fetchDemoProducts } from "./services/demoProductService";
import { mapProductList } from "./mappers/demoProductMapper";
import { DemoShell } from "./components/DemoShell";
import { DemoProductShowcase } from "./components/DemoProductShowcase";
import { LOCAL_UNIFORM_DEMO_PRODUCTS, mergeLocalDemoProducts } from "./utils/localDemoProducts";
import { sortDemoProducts } from "./utils/demoProductSort";
import type { DemoProductCard } from "./types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "SDK Product Showcase | PrimeStyle AI",
  description: "See the PrimeStyle Try-On React SDK in action on real product pages.",
};

export default async function DemoProductsPage() {
  const cookieStore = await cookies();
  const isLoggedIn = !!cookieStore.get("accessToken")?.value;

  let data: { products: DemoProductCard[]; page: number; total: number; totalPages: number } = { products: [], page: 1, total: 0, totalPages: 0 };
  try {
    const raw = await fetchDemoProducts({ page: 1, limit: 50 });
    const items = mergeLocalDemoProducts(raw.items ?? []);
    const mapped = mapProductList({
      ...raw,
      items,
      total: raw.total + items.length - (raw.items?.length ?? 0),
    });
    data = { ...mapped, products: sortDemoProducts(mapped.products) };
  } catch (err) {
    console.error("[DemoProductsPage] Failed to fetch products:", err);
    const mapped = mapProductList({
      items: LOCAL_UNIFORM_DEMO_PRODUCTS,
      page: 1,
      limit: LOCAL_UNIFORM_DEMO_PRODUCTS.length,
      total: LOCAL_UNIFORM_DEMO_PRODUCTS.length,
      totalPages: 1,
    });
    data = { ...mapped, products: sortDemoProducts(mapped.products) };
  }

  return (
    <DemoShell isLoggedIn={isLoggedIn}>
      <DemoProductShowcase products={data.products} />
    </DemoShell>
  );
}
