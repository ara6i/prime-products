import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandCatalogExperience } from "../components/BrandCatalogExperience";
import {
  getBrandCatalog,
  getStaticBrandIds,
} from "../services/brandCatalog.service";

type BrandPageProps = {
  params: Promise<{ brandId: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getStaticBrandIds().map((brandId) => ({ brandId }));
}

export async function generateMetadata({
  params,
}: BrandPageProps): Promise<Metadata> {
  const { brandId } = await params;
  const catalog = await getBrandCatalog(brandId);
  if (!catalog) return { title: "Brand not found · PrimeStyleAI" };

  return {
    title: `${catalog.name} Edit · PrimeStyleAI Global Shop`,
    description: `Shop the ${catalog.name} collection through PrimeStyleAI. ${catalog.descriptor}`,
  };
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { brandId } = await params;
  const catalog = await getBrandCatalog(brandId);
  if (!catalog) notFound();
  return <BrandCatalogExperience catalog={catalog} />;
}
