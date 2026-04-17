import { notFound } from "next/navigation";
import { fetchDemoProduct } from "../services/demoProductService";
import { mapProductDetail } from "../mappers/demoProductMapper";
import { DesktopProductDetail } from "./components/desktop/DemoProductDetail";
import { MobileProductDetail } from "./components/mobile/DemoProductDetail";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string>>;
};

export default async function DemoProductDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};

  try {
    const raw = await fetchDemoProduct(id, sp.color);
    const product = mapProductDetail(raw);

    return (
      <>
        <div className="hidden lg:block">
          <DesktopProductDetail product={product} />
        </div>
        <div className="lg:hidden">
          <MobileProductDetail product={product} />
        </div>
      </>
    );
  } catch {
    notFound();
  }
}

export async function generateMetadata({ params }: PageProps) {
  try {
    const { id } = await params;
    const raw = await fetchDemoProduct(id);
    return {
      title: `${raw.name ?? "Product"} — ${raw.brand ?? "Demo"} | PrimeStyleAI`,
      description: raw.short_description ?? raw.description ?? "",
    };
  } catch {
    return { title: "Product | PrimeStyleAI" };
  }
}
