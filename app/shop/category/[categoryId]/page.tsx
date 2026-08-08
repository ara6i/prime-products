import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryCatalogExperience } from "../components/CategoryCatalogExperience";
import {
  getCategoryCatalog,
  getStaticCategoryIds,
} from "../services/categoryCatalog.service";

type CategoryPageProps = {
  params: Promise<{ categoryId: string }>;
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

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { categoryId } = await params;
  const catalog = await getCategoryCatalog(categoryId);
  if (!catalog) notFound();
  return <CategoryCatalogExperience catalog={catalog} />;
}
