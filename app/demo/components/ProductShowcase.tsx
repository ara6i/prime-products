"use client";

import { useState } from "react";
import { Star, ShoppingBag, Heart, Truck, Ruler, X, Globe } from "lucide-react";
import type { CatalogProductViewModel } from "@/app/dashboard/catalog/mapper/catalogMapper";
import { PrimeStyleTryon } from "@primestyleai/tryon/react";
import { SDK_LOCALES, type DemoSdkLocale } from "@/app/demo/products/utils/sdkLocale";

const SIZE_GUIDE_DATA = {
  sizes: ["XS", "S", "M", "L", "XL", "XXL"],
  measurements: [
    {
      label: "Chest",
      cm: [82, 88, 94, 100, 106, 112],
      in: [32.3, 34.6, 37, 39.4, 41.7, 44.1],
    },
    {
      label: "Waist",
      cm: [66, 72, 78, 84, 90, 96],
      in: [26, 28.3, 30.7, 33.1, 35.4, 37.8],
    },
    {
      label: "Hips",
      cm: [90, 96, 102, 108, 114, 120],
      in: [35.4, 37.8, 40.2, 42.5, 44.9, 47.2],
    },
    {
      label: "Shoulder",
      cm: [38, 40, 42, 44, 46, 48],
      in: [15, 15.7, 16.5, 17.3, 18.1, 18.9],
    },
    {
      label: "Sleeve",
      cm: [59, 61, 63, 65, 67, 69],
      in: [23.2, 24, 24.8, 25.6, 26.4, 27.2],
    },
    {
      label: "Length",
      cm: [66, 68, 70, 72, 74, 76],
      in: [26, 26.8, 27.6, 28.3, 29.1, 29.9],
    },
  ],
};

function SizeGuideModal({ onClose }: { onClose: () => void }) {
  const [unit, setUnit] = useState<"cm" | "in">("cm");
  const { sizes, measurements } = SIZE_GUIDE_DATA;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-white border border-border-light shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <div className="flex items-center gap-2.5">
            <Ruler className="size-5 text-brand-blue" />
            <h3 className="text-base font-semibold text-text-primary">Size Guide</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg bg-surface-light p-0.5">
              <button
                onClick={() => setUnit("cm")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  unit === "cm"
                    ? "bg-brand-blue text-white"
                    : "text-text-hint hover:text-text-primary"
                }`}
              >
                CM
              </button>
              <button
                onClick={() => setUnit("in")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  unit === "in"
                    ? "bg-brand-blue text-white"
                    : "text-text-hint hover:text-text-primary"
                }`}
              >
                IN
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-hint hover:text-text-primary hover:bg-surface-light transition"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto p-4">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-text-hint font-medium py-2.5 px-3 text-xs uppercase tracking-wider">
                  Measurement
                </th>
                {sizes.map((s) => (
                  <th
                    key={s}
                    className="text-center text-text-body font-semibold py-2.5 px-3"
                  >
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {measurements.map((row, i) => (
                <tr
                  key={row.label}
                  className={
                    i % 2 === 0 ? "bg-surface-light" : ""
                  }
                >
                  <td className="text-text-body font-medium py-2.5 px-3 whitespace-nowrap">
                    {row.label}
                  </td>
                  {row[unit].map((val, j) => (
                    <td
                      key={j}
                      className="text-center text-text-body py-2.5 px-3 tabular-nums"
                    >
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border-light text-center">
          <p className="text-xs text-text-hint">
            Measurements are approximate. For the best fit, measure yourself and
            compare with the chart above.
          </p>
        </div>
      </div>
    </div>
  );
}

interface ProductShowcaseProps {
  product: CatalogProductViewModel;
}

export function ProductShowcase({ product }: ProductShowcaseProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [selectedColor, setSelectedColor] = useState(
    product.color_variants[0]?.name || product.color
  );
  const [sdkLocale, setSdkLocale] = useState<DemoSdkLocale>("en");

  const images = product.image_urls.slice(0, 5);
  const hasDiscount = product.original_price > product.price;
  const discount = hasDiscount
    ? Math.round(
        ((product.original_price - product.price) / product.original_price) *
          100
      )
    : 0;

  const fullStars = Math.floor(product.rating);
  const hasHalfStar = product.rating % 1 >= 0.5;

  return (
    <div className="p-4 sm:p-6 lg:p-[1.2vw]">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-[1.2vw]">
        {/* Image gallery */}
        <div className="space-y-3 lg:space-y-[0.5vw]">
          <div className="aspect-[3/4] rounded-xl overflow-hidden bg-surface-light border border-border-light">
            {images[selectedImage] && (
              <img
                src={images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 lg:gap-[0.3vw] overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`shrink-0 w-12 h-16 sm:w-16 sm:h-20 lg:w-[3vw] lg:h-[4vw] rounded-lg overflow-hidden border-2 transition-all ${
                    i === selectedImage
                      ? "border-brand-blue"
                      : "border-border-light opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={img}
                    alt={`${product.name} view ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="space-y-4 lg:space-y-[0.8vw]">
          {/* Brand */}
          <div className="inline-flex items-center px-2.5 py-1 lg:px-[0.5vw] lg:py-[0.15vw] rounded-md bg-surface-light text-xs lg:text-[0.7vw] font-medium text-text-body uppercase tracking-wide">
            Your Brand
          </div>

          <h2 className="text-lg sm:text-xl lg:text-[1.3vw] font-bold text-text-primary leading-tight">
            {product.name}
          </h2>

          {/* Rating */}
          {product.rating > 0 && (
            <div className="flex items-center gap-2 lg:gap-[0.3vw]">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`size-4 lg:size-[0.9vw] ${
                      i < fullStars
                        ? "text-yellow-400 fill-yellow-400"
                        : i === fullStars && hasHalfStar
                          ? "text-yellow-400 fill-yellow-400/50"
                          : "text-text-caption"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm lg:text-[0.8vw] text-text-body">
                {product.rating.toFixed(1)} ({product.reviews_count})
              </span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-2 lg:gap-[0.3vw]">
            <span className="text-2xl lg:text-[1.5vw] font-bold text-text-primary">
              ${product.price.toFixed(2)}
            </span>
            {hasDiscount && (
              <>
                <span className="text-base lg:text-[0.9vw] text-text-hint line-through">
                  ${product.original_price.toFixed(2)}
                </span>
                <span className="text-xs lg:text-[0.7vw] font-semibold text-green-400 bg-green-400/10 px-2 py-0.5 lg:px-[0.4vw] lg:py-[0.1vw] rounded-full">
                  -{discount}%
                </span>
              </>
            )}
          </div>

          {/* Color variants */}
          {product.color_variants.length > 1 && (
            <div className="space-y-2">
              <span className="text-sm lg:text-[0.8vw] text-text-body">
                Color: <span className="text-text-primary">{selectedColor}</span>
              </span>
              <div className="flex gap-2 lg:gap-[0.3vw] flex-wrap">
                {product.color_variants.map((cv) => (
                  <button
                    key={cv.name}
                    onClick={() => setSelectedColor(cv.name)}
                    title={cv.name}
                    className={`size-8 lg:size-[1.6vw] rounded-full border-2 transition-all ${
                      selectedColor === cv.name
                        ? "border-brand-blue scale-110"
                        : "border-border-light hover:border-brand-blue-dark"
                    }`}
                    style={{ backgroundColor: cv.hex }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {product.sizes.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm lg:text-[0.8vw] text-text-body">Size</span>
              <div className="flex gap-2 lg:gap-[0.3vw] flex-wrap">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-3 py-1.5 lg:px-[0.6vw] lg:py-[0.3vw] text-sm lg:text-[0.8vw] rounded-lg border transition-all ${
                      selectedSize === size
                        ? "border-brand-blue bg-brand-blue/10 text-brand-blue"
                        : "border-border-light text-text-body hover:border-brand-blue-dark"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SDK Try-On Button + Size Guide */}
          <div className="pt-2">
            <div className="rounded-xl border border-dashed border-brand-blue/30 bg-brand-blue/5 p-3 lg:p-[0.6vw]">
              <div className="flex items-center justify-between mb-2 lg:mb-[0.3vw]">
                <p className="text-[10px] lg:text-[0.6vw] uppercase tracking-wider text-brand-blue/70 font-medium">
                  SDK React Component
                </p>
                <div className="flex items-center gap-1">
                  <Globe className="h-3 w-3 text-brand-blue/50" />
                  <select
                    value={sdkLocale}
                    onChange={(e) => setSdkLocale(e.target.value as DemoSdkLocale)}
                    className="appearance-none bg-transparent text-brand-blue/70 text-[10px] lg:text-[0.6vw] font-medium cursor-pointer outline-none"
                  >
                    {SDK_LOCALES.map((l) => (
                      <option key={l.code} value={l.code} className="bg-white text-text-primary">
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 lg:gap-[0.3vw]">
                <div className="flex-1">
                  <PrimeStyleTryon
                    productImage={images[selectedImage] || ""}
                    locale={sdkLocale}
                    buttonText="Try It On"
                    buttonStyles={{
                      width: "100%",
                      padding: "14px 24px",
                      borderRadius: "10px",
                      fontSize: "15px",
                    }}
                    onComplete={(result) => {
                      console.log("Try-on complete:", result.imageUrl);
                    }}
                    onError={(err) => {
                      console.error("Try-on error:", err.message);
                    }}
                  />
                </div>
                <button
                  onClick={() => setShowSizeGuide(true)}
                  className="flex items-center gap-2 lg:gap-[0.3vw] px-4 lg:px-[0.8vw] rounded-[10px] border border-brand-blue/30 bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20 transition text-sm lg:text-[0.8vw] font-medium"
                >
                  <Ruler className="size-4 lg:size-[0.9vw]" />
                  Size Guide
                </button>
              </div>
            </div>
          </div>

          {/* Add to cart / wishlist */}
          <div className="flex gap-3 lg:gap-[0.5vw] pt-1">
            <button className="flex-1 flex items-center justify-center gap-2 lg:gap-[0.3vw] py-3 px-4 lg:py-[0.5vw] lg:px-[0.8vw] rounded-xl bg-brand-blue text-white font-semibold text-sm lg:text-[0.8vw] transition hover:bg-brand-blue-dark">
              <ShoppingBag className="size-4 lg:size-[0.9vw]" />
              Add to Cart
            </button>
            <button className="p-3 lg:p-[0.5vw] rounded-xl border border-border-light text-text-body hover:text-red-400 hover:border-red-400/30 transition">
              <Heart className="size-5 lg:size-[1.1vw]" />
            </button>
          </div>

          {/* Shipping badge */}
          <div className="flex items-center gap-2 lg:gap-[0.3vw] text-xs lg:text-[0.7vw] text-text-hint pt-1">
            <Truck className="size-4 lg:size-[0.9vw]" />
            <span>Free shipping on orders over $50</span>
          </div>
        </div>
      </div>

      {showSizeGuide && (
        <SizeGuideModal onClose={() => setShowSizeGuide(false)} />
      )}
    </div>
  );
}
