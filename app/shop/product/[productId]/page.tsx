import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailExperience } from "../components/ProductDetailExperience";
import { mapProductDetail } from "../mappers/productDetail.mapper";
import {
  getRawProductDetail,
  getStaticProductIds,
} from "../services/productDetail.service";

interface ProductPageProps {
  params: Promise<{ productId: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return getStaticProductIds().map((productId) => ({ productId }));
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { productId } = await params;
  const rawProduct = await getRawProductDetail(productId);
  if (!rawProduct) return { title: "Product not found · PrimeStyleAI" };
  const product = mapProductDetail(rawProduct);

  return {
    title: `${product.name} · ${product.brandName} · PrimeStyleAI`,
    description: product.description,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { productId } = await params;
  const rawProduct = await getRawProductDetail(productId);
  if (!rawProduct) notFound();
  const product = mapProductDetail(rawProduct);

  return <ProductDetailExperience product={product} />;
}
