import { cookies } from "next/headers";
import { fetchDemoProducts } from "./services/demoProductService";
import { mapProductList } from "./mappers/demoProductMapper";
import { DesktopProductList } from "./components/desktop/DemoProductList";
import { MobileProductList } from "./components/mobile/DemoProductList";
import type { DemoProductCard } from "./types";
import { DemoShell } from "./components/DemoShell";

/** Pin certain product categories to the front of the listing */
function sortDemoProducts(products: DemoProductCard[]): DemoProductCard[] {
  const priority = (p: DemoProductCard): number => {
    const name = p.name.toLowerCase();
    const cat  = p.category.toLowerCase();
    if (name.includes("tuxedo")) return 0;
    if (name.includes("sunglass") || cat.includes("eyewear") || cat.includes("sunglass")) return 1;
    if (name.includes("cap") || name.includes("hat") || cat.includes("hat") || cat.includes("cap")) return 2;
    return 10;
  };
  return [...products].sort((a, b) => priority(a) - priority(b));
}

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
    const mapped = mapProductList(raw);
    data = { ...mapped, products: sortDemoProducts(mapped.products) };
  } catch (err) {
    console.error("[DemoProductsPage] Failed to fetch products:", err);
  }

  return (
    <DemoShell isLoggedIn={isLoggedIn}>
      <div className="hidden lg:block">
        <DesktopProductList products={data.products} />
      </div>
      <div className="lg:hidden">
        <MobileProductList products={data.products} />
      </div>
    </DemoShell>
  );
}
