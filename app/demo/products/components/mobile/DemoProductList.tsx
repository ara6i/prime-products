"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, ArrowRight, Sparkles, Camera, Ruler } from "lucide-react";
import type { DemoProductCard } from "../../types";

interface Props {
  products: DemoProductCard[];
}

export function MobileProductList({ products }: Props) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white text-text-primary pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border-light">
        <div className="flex items-center justify-between px-[4%] h-[7vh]">
          <button onClick={() => router.back()} className="w-[9vw] h-[9vw] max-w-[36px] max-h-[36px] flex items-center justify-center rounded-full border border-border-light active:bg-surface-light transition-colors">
            <ArrowLeft className="h-4 w-4 text-text-body" />
          </button>
          <h1 style={{ fontSize: 'clamp(13px, 3.5vw, 16px)' }} className="font-semibold">SDK Showcase</h1>
          <div className="w-[9vw] max-w-[36px]" />
        </div>
      </header>

      {/* Hero */}
      <section className="px-[5%] pt-[3vh] pb-[2vh]">
        <div className="inline-flex items-center gap-[1.5vw] px-[2.5vw] py-[0.5vh] bg-brand-blue/10 border border-brand-blue/20 rounded-full mb-[2vh]">
          <Sparkles className="h-3 w-3 text-brand-blue" />
          <span style={{ fontSize: 'clamp(9px, 2.5vw, 11px)' }} className="font-semibold text-brand-blue tracking-wide uppercase">Live Demo</span>
        </div>

        <h1 style={{ fontSize: 'clamp(24px, 7vw, 34px)' }} className="font-semibold tracking-[-0.03em] leading-[1.1] mb-[1.5vh]">
          <span className="bg-gradient-to-r from-brand-blue to-brand-blue-dark bg-clip-text text-transparent">Decision Engine</span>
        </h1>

        <p style={{ fontSize: 'clamp(13px, 3.5vw, 16px)' }} className="text-text-body leading-relaxed max-w-[90%]">
          Tap any product to see the <span className="text-text-primary font-medium">@primestyleai/tryon</span> React SDK working — virtual try-on and AI size recommendation in one component.
        </p>

        {/* Feature pills */}
        <div className="flex items-center gap-[2vw] mt-[2vh]">
          <div className="flex items-center gap-[1.5vw] px-[3vw] py-[0.6vh] bg-dev-badge-bg border border-dev-badge-border rounded-full">
            <Camera className="h-3 w-3 text-brand-blue" />
            <span style={{ fontSize: 'clamp(9px, 2.5vw, 11px)' }} className="text-dev-badge-text font-medium">Try-On</span>
          </div>
          <div className="flex items-center gap-[1.5vw] px-[3vw] py-[0.6vh] bg-dev-badge-bg border border-dev-badge-border rounded-full">
            <Ruler className="h-3 w-3 text-brand-blue" />
            <span style={{ fontSize: 'clamp(9px, 2.5vw, 11px)' }} className="text-dev-badge-text font-medium">Size AI</span>
          </div>
        </div>

        {/* Code hint */}
        <div className="mt-[2vh] px-[4%] py-[1.2vh] bg-dev-code-bg border border-dev-code-border rounded-xl">
          <code style={{ fontSize: 'clamp(10px, 3vw, 13px)' }} className="font-mono text-gray-400">
            <span className="text-gray-600">{'<'}</span>
            <span className="text-brand-blue-light">PrimeStyleTryon</span>
            <span className="text-gray-600">{' productImage='}</span>
            <span className="text-white">{'{url}'}</span>
            <span className="text-gray-600">{' />'}</span>
          </code>
        </div>
      </section>

      {/* Separator */}
      <div className="px-[5%]"><div className="h-px bg-gradient-to-r from-transparent via-brand-blue/20 to-transparent" /></div>

      {/* Grid */}
      <section className="px-[4%] pt-[2vh] pb-[1.5vh]">
        <div className="flex items-baseline justify-between mb-[2vh] px-[1%]">
          <h2 style={{ fontSize: 'clamp(14px, 4vw, 18px)' }} className="font-semibold tracking-tight">Demo Products</h2>
          <span style={{ fontSize: 'clamp(9px, 2.5vw, 11px)' }} className="text-text-caption font-mono">{products.length} items</span>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-[8vh]">
            <div className="w-12 h-12 rounded-xl bg-dev-section-bg border border-border-light flex items-center justify-center mx-auto mb-[1.5vh]">
              <span className="text-xl">📦</span>
            </div>
            <h3 style={{ fontSize: 'clamp(13px, 3.5vw, 16px)' }} className="font-semibold text-text-primary mb-[0.3vh]">No demo products yet</h3>
            <p style={{ fontSize: 'clamp(11px, 3vw, 14px)' }} className="text-text-hint">Sync your Shopify store to populate products.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-[3vw]">
            {products.map((p) => <MobileCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* Bottom CTA */}
      <section className="px-[4%] pb-[3vh] pt-[1.5vh]">
        <div className="h-px bg-border-light mb-[2vh]" />
        <Link
          href="/docs"
          className="flex items-center justify-between px-[5%] py-[1.5vh] bg-dev-section-bg border border-border-light rounded-xl active:bg-surface-light transition-colors"
        >
          <div>
            <h3 style={{ fontSize: 'clamp(13px, 3.5vw, 16px)' }} className="font-semibold mb-[0.2vh]">Ready to integrate?</h3>
            <p style={{ fontSize: 'clamp(10px, 2.8vw, 13px)' }} className="text-text-hint">Add try-on & sizing in under 5 min</p>
          </div>
          <div className="w-[8vw] h-[8vw] max-w-[32px] max-h-[32px] rounded-full bg-brand-blue flex items-center justify-center flex-shrink-0">
            <ArrowRight className="h-4 w-4 text-white" />
          </div>
        </Link>
      </section>
    </div>
  );
}

/* ── Mobile Card ── */

function MobileCard({ product }: { product: DemoProductCard }) {
  const [coverSrc, setCoverSrc] = useState<string>(product.generatedCover || product.image);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
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
      .then((d) => { if (!cancelled && d.coverUrl) setCoverSrc(d.coverUrl); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setGenerating(false); });

    return () => { cancelled = true; };
  }, [product.id, product.coverChecked, product.image]);

  return (
    <Link href={`/demo/products/${product.id}`} className="group block">
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-dev-card-bg border border-dev-card-border">
        {coverSrc ? (
          <img src={coverSrc} alt={product.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-text-disabled" style={{ fontSize: 'clamp(9px, 2.5vw, 11px)' }}>No Image</div>
        )}
        {generating && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse pointer-events-none" />
        )}
        <div className="absolute bottom-[4%] right-[4%] w-[6vw] h-[6vw] max-w-[24px] max-h-[24px] rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center border border-brand-blue/20">
          <ArrowUpRight className="w-3 h-3 text-brand-blue" />
        </div>
      </div>
      <div className="mt-[1vh] px-[0.5vw]">
        <p className="text-text-hint uppercase tracking-widest" style={{ fontSize: 'clamp(8px, 2.2vw, 10px)' }}>{product.brand}</p>
        <h3 style={{ fontSize: 'clamp(11px, 3vw, 14px)' }} className="text-text-body font-medium leading-tight line-clamp-1 mt-[0.2vh]">{product.name}</h3>
      </div>
    </Link>
  );
}
