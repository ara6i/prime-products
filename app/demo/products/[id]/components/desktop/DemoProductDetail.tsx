"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Ruler, Sparkles } from "lucide-react";
import { PrimeStyleTryon, usePrimeStyleSize } from "@primestyleai/tryon/react";
import type { DemoProductView } from "../../../types";
import { SizeGuideModal } from "../SizeGuideModal";
import { SizeSelect } from "../SizeSelect";
import { useSizingAutoSelect } from "../../hooks/useSizingAutoSelect";
import { TryOnNotice } from "@/app/components/shared/TryOnNotice";


interface Props {
  product: DemoProductView;
}

export function DesktopProductDetail({ product }: Props) {
  const [selectedColor, setSelectedColor] = useState(product.selectedColor);
  const [jacketSizeNum, setJacketSizeNum] = useState("");
  const [jacketLength, setJacketLength] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const activeVariant = product.colorVariants.find((v) => v.name === selectedColor);
  // Only show images for selected color variant
  const images = activeVariant?.images.length ? activeVariant.images : product.images;
  // Prefer product.sizes (built from size guide Standard column) — richer than variant's raw mm sizes
  const sizes = product.sizes.length ? product.sizes : (activeVariant?.sizes ?? []);

  const hasSplitSizes = sizes.some((s) => s.name.includes(" "));
  const parsedSizes = useMemo(() => sizes.map((s) => {
    const spaceIdx = s.name.indexOf(" ");
    return spaceIdx === -1
      ? { number: s.name, length: "", available: s.available, original: s.name }
      : { number: s.name.slice(0, spaceIdx), length: s.name.slice(spaceIdx + 1), available: s.available, original: s.name };
  }), [sizes]);
  const sizeNumbers = [...new Map(parsedSizes.map((s) => [s.number, s])).keys()];
  const allUniqueLengths = [...new Set(parsedSizes.map((s) => s.length).filter(Boolean))];
  const lengthsForNumber = parsedSizes.filter((s) => s.number === jacketSizeNum);
  const availableLengths = new Set(lengthsForNumber.map((s) => s.length).filter(Boolean));

  const [pantsWaistSize, setPantsWaistSize] = useState("");
  const [pantsLengthSize, setPantsLengthSize] = useState("");
  const [justAutoFilled, setJustAutoFilled] = useState(false);
  const pantsSection = product.sizeGuide?.sections?.find((s) => /pant/i.test(s.name) && !/length/i.test(s.name));
  const pantsLengthSection = product.sizeGuide?.sections?.find((s) => /pant/i.test(s.name) && /length/i.test(s.name));
  const pantsWaistSizes = pantsSection?.rows.map((r) => r["Size"]).filter(Boolean) ?? [];
  const pantsLengthSizes = pantsLengthSection?.rows.map((r) => r["Length"] || r["Size"]).filter(Boolean) ?? [];

  const handleSizeNumberSelect = (num: string) => {
    setJacketSizeNum(num);
    setJacketLength("");
    setSelectedSize("");
    const lengths = parsedSizes.filter((s) => s.number === num && s.length);
    if (lengths.length === 1 && lengths[0].available) {
      setJacketLength(lengths[0].length);
      setSelectedSize(lengths[0].original);
    } else if (lengths.length === 0) {
      const match = parsedSizes.find((s) => s.number === num);
      if (match?.available) setSelectedSize(match.original);
    }
  };

  const handleLengthSelect = (len: string) => {
    setJacketLength(len);
    const match = parsedSizes.find((s) => s.number === jacketSizeNum && s.length === len);
    if (match) setSelectedSize(match.original);
  };

  const handleSizingComplete = useSizingAutoSelect({
    parsedSizes,
    handleSizeNumberSelect,
    handleLengthSelect,
    setPantsWaistSize,
    setPantsLengthSize,
  });

  const autoSize = usePrimeStyleSize({
    productId: product.id,
    productTitle: product.name,
    productImage: product.primaryImage,
    sizeGuideData: product.sizeGuideData,
    apiUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000",
  });

  const lastAutoSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    const raw = autoSize.result?.raw as any;
    if (!raw || parsedSizes.length === 0) return;
    const recoKey = JSON.stringify({
      size: raw.recommendedSize, length: raw.recommendedLength,
      sections: raw.sections
        ? Object.fromEntries(Object.entries(raw.sections as Record<string, any>).map(([k, v]) => [k, { size: (v as any)?.size, length: (v as any)?.length, recommendedSize: (v as any)?.recommendedSize }]))
        : null,
    });
    if (lastAutoSelectedRef.current === recoKey) return;
    lastAutoSelectedRef.current = recoKey;

    const splitSize = (s: string): { num: string; len?: string } => {
      const trimmed = s.trim();
      const colon = trimmed.match(/^([A-Za-z]+)\s*:\s*(.+)$/);
      if (colon) return { num: colon[2], len: colon[1] };
      const space = trimmed.indexOf(" ");
      if (space >= 0) return { num: trimmed.slice(0, space), len: trimmed.slice(space + 1).trim() };
      return { num: trimmed };
    };

    const findMatch = (num: string, len?: string) => {
      const direct = parsedSizes.find((p) => p.original === num);
      if (direct?.available) return direct;
      if (len) {
        const split = parsedSizes.find((p) => p.number === num && p.length.toLowerCase() === len.toLowerCase());
        if (split?.available) return split;
        const concat = parsedSizes.find((p) => p.original.toLowerCase() === (num + len).toLowerCase());
        if (concat?.available) return concat;
        const initial = (len[0] || "").toUpperCase();
        const initConcat = parsedSizes.find((p) => p.original.toUpperCase() === num + initial);
        if (initConcat?.available) return initConcat;
        const spaced = parsedSizes.find((p) => p.original.toLowerCase() === (num + " " + len).toLowerCase());
        if (spaced?.available) return spaced;
        const splitInitial = parsedSizes.find((p) => p.number === num && p.length.toUpperCase().startsWith(initial));
        if (splitInitial?.available) return splitInitial;
      }
      const numOnly = parsedSizes.filter((p) => p.number === num);
      if (numOnly.length === 1 && numOnly[0].available) return numOnly[0];
      const startsWith = parsedSizes.filter((p) => p.original.startsWith(num) && p.available);
      if (startsWith.length === 1) return startsWith[0];
      return null;
    };

    const applyJacket = (rawSize: string, rawLen?: string): boolean => {
      const split = splitSize(rawSize);
      const num = split.num;
      const len = rawLen || split.len;
      const match = findMatch(num, len);
      if (match) {
        setJacketSizeNum(match.number);
        setJacketLength(match.length || "");
        setSelectedSize(match.original);
        return true;
      }
      const startsWith = parsedSizes.filter((p) => p.original.startsWith(num));
      if (startsWith.length > 0) { setJacketSizeNum(num); setJacketLength(""); setSelectedSize(""); return true; }
      return false;
    };

    const applyPants = (rawSize: string, rawLen?: string) => {
      const split = splitSize(rawSize);
      setPantsWaistSize(split.num);
      if (rawLen || split.len) setPantsLengthSize(rawLen || split.len || "");
    };

    const sections = raw.sections as Record<string, any> | undefined;
    if (sections && Object.keys(sections).length > 0) {
      const entries = Object.entries(sections);
      for (const [name, sec] of entries) {
        const lc = name.toLowerCase();
        if (!/pant|trouser/.test(lc)) continue;
        const sizeStr = (sec as any)?.size || (sec as any)?.recommendedSize;
        if (!sizeStr) continue;
        applyPants(sizeStr, (sec as any)?.length);
      }
      const isJacketLike = (n: string) => /jacket|coat|blazer|tuxedo|suit/.test(n.toLowerCase());
      const isPants = (n: string) => /pant|trouser/.test(n.toLowerCase());
      const target = entries.find(([n]) => isJacketLike(n) && !isPants(n)) || entries.find(([n]) => !isPants(n));
      if (target) {
        const [, sec] = target;
        const sizeStr = (sec as any)?.size || (sec as any)?.recommendedSize;
        if (sizeStr) applyJacket(sizeStr, (sec as any)?.length);
      }
    } else if (raw.recommendedSize) {
      applyJacket(raw.recommendedSize, raw.recommendedLength || undefined);
    }

    setJustAutoFilled(true);
    const handle = window.setTimeout(() => setJustAutoFilled(false), 1100);
    return () => window.clearTimeout(handle);
  }, [autoSize.result, parsedSizes]);

  const handleColorSelect = (name: string) => {
    setSelectedColor(name);
    setSelectedSize("");
    setJacketSizeNum("");
    setJacketLength("");
  };


  return (
    <div className="min-h-screen bg-white text-text-primary">

      {/* Sticky top nav */}
      <nav id="demo-nav" className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-border-light flex items-center px-[3vw] py-[1.2vw]">
        <Link
          href="/demo/products"
          className="group flex items-center gap-[0.5vw] text-text-hint hover:text-text-primary transition-colors duration-200"
          style={{ fontSize: '0.85vw' }}
        >
          <ArrowLeft style={{ width: '0.9vw', height: '0.9vw' }} />
          Back
        </Link>
      </nav>

      {/* Three-column layout: [LEFT sticky info] [CENTER scrollable images] [RIGHT sticky purchase] */}
      <div className="flex items-start w-full">

        {/* LEFT — sticky product info */}
        <div
          className="flex-shrink-0 sticky self-start"
          style={{ width: '22%', top: '3.6vw', maxHeight: 'calc(100vh - 3.6vw)', overflowY: 'auto', scrollbarGutter: 'stable', borderRight: '1px solid #e5e7eb' }}
        >
          <div className="px-[2.5vw] py-[3vw]">
            <p style={{ fontSize: '0.72vw' }} className="text-text-hint uppercase tracking-[0.18em] mb-[0.6vw]">{product.brand}</p>
            <h1 style={{ fontSize: '2.0vw', lineHeight: 1.1 }} className="font-semibold tracking-[-0.025em] text-text-primary mb-[1.2vw]">{product.name}</h1>

            {product.description && (
              <div
                style={{ fontSize: '0.8vw', lineHeight: 1.8 }}
                className="text-text-hint [&_ul]:list-disc [&_ul]:pl-[1.2vw] [&_ol]:list-decimal [&_ol]:pl-[1.2vw] [&_li]:mb-[0.2vw] [&_p]:mb-[0.5vw] [&_a]:text-brand-blue"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            )}

            {product.material && (
              <div style={{ fontSize: '0.75vw' }} className="flex items-center gap-[0.5vw] text-text-caption mt-[1vw]">
                <span className="whitespace-nowrap">Material</span>
                <span className="flex-1 h-px bg-border-light" />
                <span className="text-text-body text-right">{product.material}</span>
              </div>
            )}
          </div>
        </div>

        {/* CENTER — scrollable stacked images (only selected color) */}
        <div className="flex-1 min-w-0 relative" style={{ minHeight: 'calc(100vh - 3.6vw)' }}>

          {/* Product images — fade out when guide is active */}
          <div
            className="px-[5vw] pt-[2vw]"
            style={{ opacity: 1 }}
          >
            {images.map((img, i) => (
              <div key={`${selectedColor}-${i}`} className="w-full pb-[2vw]">
                <img
                  src={img}
                  alt={`${product.name} ${i + 1}`}
                  className="w-full h-auto block demo-img-fadein"
                />
              </div>
            ))}
          </div>

        </div>

        {/* RIGHT — sticky purchase panel */}
        <div
          className="flex-shrink-0 sticky self-start"
          style={{ width: '28%', top: '3.6vw', maxHeight: 'calc(100vh - 3.6vw)', overflowY: 'auto', scrollbarGutter: 'stable', borderLeft: '1px solid #e5e7eb' }}
        >
          <div className="px-[2vw] py-[2.5vw] flex flex-col gap-[1.5vw]">


            {/* Color swatches */}
            {product.colorVariants.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-[0.8vw]">
                  <span style={{ fontSize: '0.78vw' }} className="text-text-hint uppercase tracking-wider">Color</span>
                  <span style={{ fontSize: '0.82vw' }} className="text-text-body">{selectedColor}</span>
                </div>
                <div className="flex gap-[0.5vw] flex-wrap">
                  {product.colorVariants.map((cv) => (
                    <button
                      key={cv.name}
                      onClick={() => cv.available && handleColorSelect(cv.name)}
                      disabled={!cv.available}
                      title={cv.name}
                      className={`rounded-full border transition-all duration-200 ${
                        selectedColor === cv.name
                          ? "ring-2 ring-brand-blue ring-offset-2 ring-offset-white scale-110"
                          : "hover:scale-105 border-[#d1d1d1]"
                      } ${!cv.available ? "opacity-25 cursor-not-allowed" : "border-[#d1d1d1]"}`}
                      style={{ backgroundColor: cv.hex, width: '1.8vw', height: '1.8vw' }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* AI auto-size status */}
            {autoSize.loading ? (
              <div className="inline-flex items-center gap-[0.35vw] px-[0.7vw] py-[0.3vw] rounded-full bg-brand-blue/10 text-brand-blue font-semibold ps-analyzing-pulse self-start" style={{ fontSize: '0.7vw' }}>
                <Sparkles style={{ width: '0.75vw', height: '0.75vw' }} className="ps-analyzing-spin" />
                Analyzing your profile…
              </div>
            ) : (autoSize.recommendedSize || autoSize.sections) ? (
              <div className="inline-flex items-center gap-[0.35vw] px-[0.7vw] py-[0.3vw] rounded-full bg-emerald-50 text-emerald-700 font-semibold self-start" style={{ fontSize: '0.7vw' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Analyzed by your profile
              </div>
            ) : null}

            {/* Size selector */}
            {sizes.length > 0 && hasSplitSizes ? (
              <div className={`space-y-[0.6vw] ${justAutoFilled ? "ps-autofill-flash" : ""}`}>
                <span style={{ fontSize: '0.78vw' }} className="text-text-hint uppercase tracking-wider block">Size</span>
                <div className="flex gap-[0.5vw]">
                  <div className="flex-1">
                    <label style={{ fontSize: '0.72vw' }} className="text-text-caption block mb-[0.3vw]">Jacket</label>
                    <SizeSelect
                      value={jacketSizeNum}
                      onChange={handleSizeNumberSelect}
                      options={sizeNumbers.map((num) => ({
                        value: num,
                        label: num,
                        disabled: !parsedSizes.some((s) => s.number === num && s.available),
                      }))}
                      placeholder="Select"
                    />
                  </div>
                  {allUniqueLengths.length > 0 && (
                    <div className="flex-1">
                      <label style={{ fontSize: '0.72vw' }} className="text-text-caption block mb-[0.3vw]">Length</label>
                      <SizeSelect
                        value={jacketLength}
                        onChange={handleLengthSelect}
                        disabled={!jacketSizeNum}
                        options={allUniqueLengths.map((len) => ({
                          value: len,
                          label: len,
                          disabled: !!(jacketSizeNum && !availableLengths.has(len)),
                        }))}
                        placeholder="Select"
                      />
                    </div>
                  )}
                </div>
                {/* Pants */}
                {(pantsWaistSizes.length > 0 || pantsLengthSizes.length > 0) && (
                  <div className="flex gap-[0.5vw]">
                    {pantsWaistSizes.length > 0 && (
                      <div className="flex-1">
                        <label style={{ fontSize: '0.72vw' }} className="text-text-caption block mb-[0.3vw]">Pants</label>
                        <SizeSelect
                          value={pantsWaistSize}
                          onChange={setPantsWaistSize}
                          options={pantsWaistSizes.map((s) => ({ value: s, label: s }))}
                          placeholder="Select"
                        />
                      </div>
                    )}
                    {pantsLengthSizes.length > 0 && (
                      <div className="flex-1">
                        <label style={{ fontSize: '0.72vw' }} className="text-text-caption block mb-[0.3vw]">Length</label>
                        <SizeSelect
                          value={pantsLengthSize}
                          onChange={setPantsLengthSize}
                          options={pantsLengthSizes.map((len) => ({ value: len, label: len }))}
                          placeholder="Select"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : sizes.length > 0 ? (
              <div className={justAutoFilled ? "ps-autofill-flash" : ""}>
                <span style={{ fontSize: '0.78vw' }} className="text-text-hint uppercase tracking-wider block mb-[0.6vw]">Size</span>
                <SizeSelect
                  value={selectedSize}
                  onChange={setSelectedSize}
                  options={sizes.map((size) => ({
                    value: size.name,
                    label: size.available ? size.name : `${size.name} — Sold out`,
                    disabled: !size.available,
                  }))}
                  placeholder="Select size"
                />
              </div>
            ) : null}

            {/* SDK CTA */}
            <PrimeStyleTryon
              apiUrl={process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000"}
              productImage={images[0] ?? product.primaryImage}
              locale="en"
              productTitle={product.name}
              sizeGuideData={product.sizeGuideData}
              buttonText="Find Your Size"
              onComplete={handleSizingComplete}
              buttonStyles={{
                backgroundColor: "#2154EF",
                textColor: "#ffffff",
                border: "none",
                borderRadius: "0.4vw",
                height: "2.8vw",
                width: "auto",
                paddingLeft: "1.6vw",
                paddingRight: "1.6vw",
                fontSize: "0.82vw",
                fontWeight: "700",
                hoverBackgroundColor: "#193EDC",
                hoverTextColor: "#ffffff",
                boxShadow: "0 4px 24px rgba(33,84,239,0.18)",
              }}
            />

            <TryOnNotice />

            {/* Size guide + shipping links */}
            <div className="space-y-[0.6vw]">
              {product.sizeGuide && (
                <button
                  onClick={() => setSizeGuideOpen(true)}
                  className="w-full flex items-center justify-between text-text-hint hover:text-text-primary transition-colors border-b border-border-light pb-[0.6vw]"
                  style={{ fontSize: '0.8vw' }}
                >
                  <span className="flex items-center gap-[0.4vw]">
                    <Ruler style={{ width: '0.85vw', height: '0.85vw' }} />
                    Size Guide
                  </span>
                  <span>→</span>
                </button>
              )}
              <button className="w-full flex items-center justify-between text-text-hint hover:text-text-primary transition-colors border-b border-border-light pb-[0.6vw]" style={{ fontSize: '0.8vw' }}>
                <span>Shipping &amp; Returns</span>
                <span>→</span>
              </button>
            </div>

            <p style={{ fontSize: '0.6vw' }} className="text-center text-text-disabled font-mono tracking-wide mt-[0.5vw]">@primestyleai/tryon</p>
          </div>
        </div>
      </div>

      {/* Size Guide Modal */}
      {product.sizeGuide && (
        <SizeGuideModal guide={product.sizeGuide} open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} />
      )}
    </div>
  );
}
