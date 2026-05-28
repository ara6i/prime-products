"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles, Camera, Ruler } from "lucide-react";
import type { DemoProductCard } from "../../types";

interface Props {
  products: DemoProductCard[];
}

export function DesktopProductList({ products }: Props) {
  return (
    <div className="min-h-screen bg-white text-text-primary">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[55vw] h-[35vh] bg-[radial-gradient(ellipse,rgba(33,84,239,0.06),transparent_70%)]" />
      </div>

      {/* ── Hero ── */}
      <section className="relative">
        <div className="max-w-[75%] mx-auto px-[2%] pt-[6vh] pb-[5vh]">
          <div className="grid grid-cols-12 gap-[1.5vw] items-end">
            {/* Left */}
            <div className="col-span-7">
              <div className="inline-flex items-center gap-[0.4vw] px-[0.6vw] py-[0.3vh] bg-brand-blue/10 border border-brand-blue/20 rounded-full mb-[2vh]">
                <Sparkles style={{ width: '0.9vw', height: '0.9vw' }} className="text-brand-blue" />
                <span style={{ fontSize: '0.7vw' }} className="font-semibold text-brand-blue tracking-wide uppercase">React SDK Live Demo</span>
              </div>

              <h1 style={{ fontSize: '3.2vw' }} className="font-semibold tracking-[-0.03em] leading-[1.05] mb-[1.5vh]">
                <span className="bg-gradient-to-r from-brand-blue via-brand-blue-dark to-brand-blue bg-clip-text text-transparent">Decision Engine</span>
              </h1>

              <p style={{ fontSize: '1.1vw' }} className="text-text-body max-w-[85%] leading-relaxed">
                See the <span className="text-text-primary font-medium">@primestyleai/tryon</span> React SDK in action. Click any product to try the <span className="text-brand-blue">virtual try-on</span> and <span className="text-brand-blue">AI size recommendation</span> flow.
              </p>

              {/* Feature pills */}
              <div className="flex items-center gap-[0.6vw] mt-[2vh]">
                <div className="flex items-center gap-[0.4vw] px-[0.8vw] py-[0.5vh] bg-dev-badge-bg border border-dev-badge-border rounded-full">
                  <Camera style={{ width: '0.9vw', height: '0.9vw' }} className="text-brand-blue" />
                  <span style={{ fontSize: '0.75vw' }} className="text-dev-badge-text font-medium">Virtual Try-On</span>
                </div>
                <div className="flex items-center gap-[0.4vw] px-[0.8vw] py-[0.5vh] bg-dev-badge-bg border border-dev-badge-border rounded-full">
                  <Ruler style={{ width: '0.9vw', height: '0.9vw' }} className="text-brand-blue" />
                  <span style={{ fontSize: '0.75vw' }} className="text-dev-badge-text font-medium">AI Size Recommendation</span>
                </div>
              </div>
            </div>

            {/* Right — code block */}
            <div className="col-span-5">
              <div className="bg-dev-code-bg border border-dev-code-border rounded-[1vw] overflow-hidden">
                <div className="px-[0.8vw] py-[0.6vh] border-b border-dev-code-border flex items-center gap-[0.4vw]">
                  <div className="flex gap-[0.3vw]">
                    <span className="rounded-full bg-[#FF5F57]" style={{ width: '0.55vw', height: '0.55vw' }} />
                    <span className="rounded-full bg-[#FEBC2E]" style={{ width: '0.55vw', height: '0.55vw' }} />
                    <span className="rounded-full bg-[#28C840]" style={{ width: '0.55vw', height: '0.55vw' }} />
                  </div>
                  <span style={{ fontSize: '0.6vw' }} className="text-gray-600 font-mono ml-[0.4vw]">ProductPage.tsx</span>
                </div>
                <pre style={{ fontSize: '0.85vw' }} className="px-[1vw] py-[1vh] leading-relaxed font-mono overflow-x-auto">
                  <code>
                    <span className="text-gray-600">{'import '}</span>
                    <span className="text-white">{'{ PrimeStyleTryon }'}</span>
                    {'\n'}
                    <span className="text-gray-600">{'  from '}</span>
                    <span className="text-brand-blue-light">{"'@primestyleai/tryon/react'"}</span>
                    <span className="text-gray-600">;</span>
                    {'\n\n'}
                    <span className="text-gray-500">{'// Try-on + size recommendation'}</span>
                    {'\n'}
                    <span className="text-gray-600">{'<'}</span>
                    <span className="text-brand-blue-light">PrimeStyleTryon</span>
                    {'\n'}
                    <span className="text-gray-400">{'  productImage'}</span>
                    <span className="text-gray-600">{'='}</span>
                    <span className="text-white">{'{product.image}'}</span>
                    {'\n'}
                    <span className="text-gray-400">{'  sizeGuideData'}</span>
                    <span className="text-gray-600">{'='}</span>
                    <span className="text-white">{'{product.sizeGuide}'}</span>
                    {'\n'}
                    <span className="text-gray-400">{'  buttonText'}</span>
                    <span className="text-gray-600">{'='}</span>
                    <span className="text-brand-blue-light">{'"Virtual Try-On"'}</span>
                    {'\n'}
                    <span className="text-gray-600">{'/>'}</span>
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="max-w-[75%] mx-auto px-[2%]">
          <div className="h-px bg-gradient-to-r from-transparent via-brand-blue/20 to-transparent" />
        </div>
      </section>

      {/* ── Grid ── */}
      <section className="relative">
        <div className="max-w-[75%] mx-auto px-[2%] pt-[3vh] pb-[2vh]">
          <div className="flex items-baseline justify-between mb-[2vh]">
            <div>
              <h2 style={{ fontSize: '1.5vw' }} className="font-semibold tracking-tight">Demo Products</h2>
              <p style={{ fontSize: '0.85vw' }} className="text-text-hint mt-[0.3vh]">Select a product to test the SDK integration</p>
            </div>
            <span style={{ fontSize: '0.75vw' }} className="text-text-disabled font-mono">{products.length} items</span>
          </div>
        </div>

        <div className="max-w-[75%] mx-auto px-[2%] pb-[5vh]">
          {products.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-5 gap-[1.1vw]">
              {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          )}
        </div>
      </section>

    </div>
  );
}

/* ── Product Card ── */

function ProductCard({ product, index }: { product: DemoProductCard; index: number }) {
  const [coverSrc, setCoverSrc] = useState<string>(product.generatedCover || product.image);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    // Already resolved: either has a real URL or was SKIP-marked — no API call needed
    if (product.coverChecked) return;
    if (!product.image) return;

    let cancelled = false;
    setGenerating(true);

    fetch("/api/demo/cover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id }),
    })
      .then((r) => r.json())
      .then((d) => {
        // coverUrl is null when no model was detected — keep original image
        if (!cancelled && d.coverUrl) setCoverSrc(d.coverUrl);
      })
      .catch(() => { /* silently fall back to original */ })
      .finally(() => { if (!cancelled) setGenerating(false); });

    return () => { cancelled = true; };
  }, [product.id, product.coverChecked, product.image]);

  return (
    <Link href={`/demo/products/${product.id}`} className="group block">
      <div className="relative aspect-[3/4] rounded-[0.7vw] overflow-hidden bg-[#f5f5f5] border border-dev-card-border group-hover:border-brand-blue/30 transition-all duration-300">
        {coverSrc ? (
          <img src={coverSrc} alt={product.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-text-disabled" style={{ fontSize: '0.75vw' }}>No Image</div>
        )}
        {/* Subtle shimmer while generating */}
        {generating && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse pointer-events-none" />
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Hover CTA */}
        <div className="absolute bottom-0 left-0 right-0 p-[0.8vw] opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span style={{ fontSize: '0.75vw' }} className="font-semibold text-white">Try SDK</span>
            <div className="rounded-full bg-brand-blue flex items-center justify-center" style={{ width: '1.6vw', height: '1.6vw' }}>
              <ArrowUpRight style={{ width: '0.9vw', height: '0.9vw' }} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-[0.6vh] px-[0.1vw]">
        <p className="text-text-hint uppercase tracking-widest" style={{ fontSize: '0.6vw' }}>{product.brand}</p>
        <h3 style={{ fontSize: '0.85vw' }} className="text-text-body font-medium leading-tight line-clamp-1 mt-[0.1vh] group-hover:text-brand-blue transition-colors duration-200">{product.name}</h3>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-[6vh]">
      <div className="rounded-[1vw] bg-dev-section-bg border border-border-light flex items-center justify-center mx-auto mb-[1.2vh]" style={{ width: '3.5vw', height: '3.5vw' }}>
        <span style={{ fontSize: '1.5vw' }}>📦</span>
      </div>
      <h3 style={{ fontSize: '1vw' }} className="font-semibold text-text-primary mb-[0.5vh]">No demo products yet</h3>
      <p style={{ fontSize: '0.85vw' }} className="text-text-hint max-w-[25%] mx-auto">Sync your Shopify store to populate demo products.</p>
    </div>
  );
}
