import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBrandCatalog } from "../../brand/services/brandCatalog.service";
import { CategoryCatalogExperience } from "../components/CategoryCatalogExperience";
import {
  getCategoryCatalog,
  getStaticCategoryIds,
} from "../services/categoryCatalog.service";

type CategoryPageProps = {
  params: Promise<{ categoryId: string }>;
  searchParams: Promise<{ brand?: string | string[] }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getStaticCategoryIds().map((categoryId) => ({ categoryId }));
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { categoryId } = await params;
  const catalog = await getCategoryCatalog(categoryId);
  if (!catalog) return { title: "Category not found · PrimeStyleAI" };
  return {
    title: `${catalog.label} Edit · PrimeStyleAI Global Shop`,
    description: catalog.intro,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { categoryId } = await params;
  const catalog = await getCategoryCatalog(categoryId);
  if (!catalog) notFound();

  const requestedBrand = (await searchParams).brand;
  const brandId = Array.isArray(requestedBrand)
    ? requestedBrand[0]
    : requestedBrand;
  const brand =
    categoryId === "women" && brandId ? await getBrandCatalog(brandId) : null;

  return (
    <CategoryCatalogExperience
      key={`${categoryId}:${brand?.id ?? "all"}`}
      catalog={catalog}
      initialBrand={brand?.name}
    />
  );
}
