"use client";

import { AlertCircle, LoaderCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getStylistCatalogProduct,
  recommendStylistOutfitSizes,
} from "@/app/ai-stylist/services/stylist.service";
import { ProductDetailExperience } from "@/app/shop/product/components/ProductDetailExperience";
import type { ProductDetailViewModel } from "@/app/shop/product/types/productDetail.types";
import { mapStylistProductDetail } from "../stylistProductDetail.mapper";

export function StylistProductDetailClient({ productId }: { productId: string }) {
  const [product, setProduct] = useState<ProductDetailViewModel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void Promise.allSettled([
      getStylistCatalogProduct(productId),
      recommendStylistOutfitSizes([productId]),
    ]).then(([productResult, recommendationResult]) => {
      if (cancelled) return;
      if (productResult.status === "rejected") {
        setError(productResult.reason instanceof Error ? productResult.reason.message : "Could not load this product.");
        return;
      }
      const recommendation = recommendationResult.status === "fulfilled"
        ? recommendationResult.value[0] ?? null
        : null;
      setProduct(mapStylistProductDetail(productResult.value, recommendation));
    });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#f2f6ff] px-6 py-12 text-[#142451]">
        <section className="w-full max-w-lg rounded-3xl border border-[#cfdbf7] bg-white p-8 text-center shadow-xl shadow-blue-100/60">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertCircle className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-bold">Product details unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-[#5f6d8f]">{error}</p>
          <Link className="mt-6 inline-flex rounded-full bg-[#2154ef] px-5 py-2.5 text-sm font-semibold text-white" href="/shop/ai-stylist">
            Back to AI Stylist
          </Link>
        </section>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#f2f6ff] px-6 py-12 text-[#142451]">
        <div className="flex flex-col items-center text-center">
          <span className="relative flex size-16 items-center justify-center rounded-2xl bg-white text-[#2154ef] shadow-lg shadow-blue-100">
            <Sparkles className="size-7" aria-hidden="true" />
            <LoaderCircle className="absolute -right-2 -top-2 size-5 animate-spin rounded-full bg-[#f2f6ff] p-0.5" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-xl font-bold">Loading product details</h1>
          <p className="mt-2 text-sm text-[#6c7897]">Getting the real catalog images, sizes, and information.</p>
        </div>
      </main>
    );
  }

  return <ProductDetailExperience product={product} theme="ai-stylist" />;
}
