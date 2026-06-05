"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Ruler, Sparkles } from "lucide-react";
import { usePrimeStyleSize } from "@primestyleai/tryon/react";
import type { RecommendForProductInput } from "@primestyleai/tryon/react";
import type { DemoProductView } from "../../../types";
import { SizeGuideModal } from "../SizeGuideModal";
import { SizeSelect } from "../SizeSelect";
import { useSizingAutoSelect } from "../../hooks/useSizingAutoSelect";
import { useProfileAnalysisDisplay } from "../../hooks/useProfileAnalysisDisplay";
import { inferSdkProductFitType } from "../../../utils/sdkProductFitType";
import {
  DemoBagButton,
  DemoBagDrawer,
  buildDemoBagItem,
  mergeDemoBagItem,
  type DemoAddToBagPayload,
  type DemoBagItem,
} from "../DemoBag";

// Lazy-load the SDK component so the heavy bundle (~MBs of try-on + sizing UI)
// doesn't block first paint of the product page. Static import for
// usePrimeStyleSize is kept — hooks must be statically resolvable.
const PrimeStyleTryon = dynamic(
  () => import("@primestyleai/tryon/react").then((m) => ({ default: m.PrimeStyleTryon })),
  { ssr: false },
);

type DemoPrimeStyleTryonProps = React.ComponentProps<typeof PrimeStyleTryon> & {
  productCategory?: string;
  productGender?: string;
  productSubcategory?: string;
  productCarouselItems?: Array<{ image: string; title?: string; href?: string }>;
  onAddToBag?: (payload: DemoAddToBagPayload) => void | Promise<void>;
  addToBagLabel?: string;
  continueShoppingLabel?: string;
  backToProductPageLabel?: string;
};

const DemoPrimeStyleTryon = PrimeStyleTryon as React.ComponentType<DemoPrimeStyleTryonProps>;

interface Props {
  product: DemoProductView;
}

type DemoPrimeStyleSizeInput = RecommendForProductInput & {
  productCategory?: string;
  productSubcategory?: string;
  productDescription?: string;
};

export function DesktopProductDetail({ product }: Props) {
  const [selectedColor, setSelectedColor] = useState(product.selectedColor);
  const [jacketSizeNum, setJacketSizeNum] = useState("");
  const [jacketLength, setJacketLength] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [bagItems, setBagItems] = useState<DemoBagItem[]>([]);

  const activeVariant = product.colorVariants.find((v) => v.name === selectedColor);
  // Only show images for selected color variant
  const images = useMemo(
    () => (activeVariant?.images.length ? activeVariant.images : product.images),
    [activeVariant, product.images],
  );
  // Prefer product.sizes (built from size guide Standard column) — richer than variant's raw mm sizes
  const sizes = useMemo(
    () => (product.sizes.length ? product.sizes : (activeVariant?.sizes ?? [])),
    [activeVariant, product.sizes],
  );

  // Footwear / headwear / eyewear never use the jacket+length split UI.
  // Without this gate, shoe sizes like "US 10" / "EU 42" trip the
  // space-in-name heuristic below and render Jacket/Length dropdowns
  // instead of plain shoe sizes. Regex mirrors detectMeasurementType
  // in the SDK so demo and SDK stay in sync.
  const categoryHaystack = `${product.category} ${product.subcategory} ${product.name}`;
  const isAccessoryCategory = /\b(accessory|accessories|jewelry|jewellery|earring|earrings|bracelet|bracelets|ring|rings|necklace|necklaces|pendant|pendants|chain|chains|watch|watches|cufflink|cufflinks|brooch|brooches|anklet|anklets|charm|charms|shoe|shoes|sneaker|sneakers|boot|boots|heel|heels|loafer|loafers|mule|mules|sandal|sandals|trainer|trainers|slipper|slippers|stiletto|stilettos|pump|pumps|oxford|derby|derbies|wedge|espadrille|clog|hat|hats|cap|caps|beanie|beanies|fedora|snapback|beret|panama|headband|visor|bonnet|sunglass|sunglasses|eyewear|eyeglasses|glasses|spectacles|optical|goggles|frames|aviator|wayfarer|lens|handbag|handbags|bag|bags|tote|totes|crossbody|clutch|satchel|backpack|backpacks|wallet|wallets|purse|purses|luggage|suitcase|suitcases|leather goods)\b/i
    .test(categoryHaystack);
  const isDress = /\b(dress|dresses|gown|gowns|wedding|bridal|bridesmaid)\b/i.test(categoryHaystack);
  const isOneSizeOnly = sizes.length === 1 && /^one\s*size$/i.test(sizes[0]?.name.trim() ?? "");
  const oneSizeLabel = sizes[0]?.name ?? "One Size";
  const isCountryAnnotatedSize = (name: string) => /\b(?:UK|US|EU|IT|FR)\b/i.test(name);
  const hasSplitSizes = !isAccessoryCategory && !isOneSizeOnly && sizes.some((s) => !isCountryAnnotatedSize(s.name) && (s.name.includes(" ") || s.name.includes("/")));
  // Size label parser handles three real-world chart formats:
  //   1. "MISSY 12 / Standard"   → number="MISSY 12", length="Standard"  (DB Studio wedding dress)
  //   2. "44 R"                  → number="44",       length="R"          (tuxedo jacket)
  //   3. "12" / "16W"            → number="12",       length=""           (plain dress)
  // Keeping the "MISSY" / "PLUS" prefix INSIDE the displayed size keeps
  // PLUS rows (which only ship a "Standard" variant) from collapsing onto
  // MISSY rows of the same number in the dropdown.
  const parsedSizes = useMemo(() => sizes.map((s) => {
    const name = s.name.trim();
    const prefixed = name.match(/^(MISSY|PLUS)\s+(\S+)\s*\/\s*(.+)$/i);
    if (prefixed) {
      return {
        number: `${prefixed[1]!.toUpperCase()} ${prefixed[2]}`,
        length: prefixed[3]!.trim(),
        available: s.available,
        original: name,
      };
    }
    const slashed = name.match(/^(\S+)\s*\/\s*(.+)$/);
    if (slashed) {
      return { number: slashed[1]!, length: slashed[2]!.trim(), available: s.available, original: name };
    }
    const spaceIdx = name.indexOf(" ");
    if (spaceIdx === -1) {
      return { number: name, length: "", available: s.available, original: name };
    }
    return { number: name.slice(0, spaceIdx), length: name.slice(spaceIdx + 1), available: s.available, original: name };
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
  const sdkApiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
  const sdkProductFitType = useMemo(() => inferSdkProductFitType(product), [product]);
  const sdkCarouselItems = useMemo(() => product.completeLook.map((item) => ({
    image: item.image,
    title: item.name,
    href: `/demo/products/${item.id}`,
  })), [product.completeLook]);
  const sdkButtonStyles = useMemo(() => ({
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
  }), []);
  const bagCount = useMemo(
    () => bagItems.reduce((sum, item) => sum + item.quantity, 0),
    [bagItems],
  );
  const handleAddToBag = useCallback((payload: DemoAddToBagPayload) => {
    const item = buildDemoBagItem({
      product,
      image: images[0] ?? product.primaryImage,
      color: selectedColor,
      payload,
    });
    setBagItems((current) => mergeDemoBagItem(current, item));
  }, [images, product, selectedColor]);
  const incrementBagItem = useCallback((lineId: string) => {
    setBagItems((current) => current.map((item) => (
      item.lineId === lineId ? { ...item, quantity: item.quantity + 1 } : item
    )));
  }, []);
  const decrementBagItem = useCallback((lineId: string) => {
    setBagItems((current) => current.flatMap((item) => {
      if (item.lineId !== lineId) return [item];
      const nextQuantity = item.quantity - 1;
      return nextQuantity > 0 ? [{ ...item, quantity: nextQuantity }] : [];
    }));
  }, []);
  const removeBagItem = useCallback((lineId: string) => {
    setBagItems((current) => current.filter((item) => item.lineId !== lineId));
  }, []);

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

  const autoSizeInput = useMemo<DemoPrimeStyleSizeInput>(() => ({
    productId: product.id,
    productTitle: product.name,
    productImage: product.primaryImage,
    productCategory: product.category,
    productSubcategory: product.subcategory,
    productDescription: product.description,
    sizeGuideData: product.sizeGuideData,
    apiUrl: sdkApiUrl,
  }), [product.id, product.name, product.primaryImage, product.category, product.subcategory, product.description, product.sizeGuideData, sdkApiUrl]);
  const autoSize = usePrimeStyleSize(autoSizeInput);
  const hasProfileSizeResult = Boolean(autoSize.recommendedSize || autoSize.sections);
  const hasAuthenticatedProfile = Boolean(autoSize.authenticatedProfile);
  const canShowProfileAnalysis = hasAuthenticatedProfile && !autoSize.noProfile;
  const profileAnalysis = useProfileAnalysisDisplay({
    loading: autoSize.loading,
    hasResult: hasProfileSizeResult,
    resetKey: `${product.id}:${canShowProfileAnalysis ? "profile" : "none"}`,
    enabled: canShowProfileAnalysis,
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
      // FIRST try the FULL raw string against each entry's `original`. This
      // catches the "MISSY 12 / Standard" case where splitting on whitespace
      // would shred the prefix off.
      const directFull = parsedSizes.find((p) => p.original === rawSize);
      if (directFull?.available) {
        setJacketSizeNum(directFull.number);
        setJacketLength(directFull.length || "");
        setSelectedSize(directFull.original);
        return true;
      }
      // Also try matching the raw against `number` (the displayed dropdown
      // value) so e.g. backend "MISSY 12" picks the MISSY-12 row regardless
      // of which length variant it lives under.
      const directNumber = parsedSizes.find((p) => p.number === rawSize);
      if (directNumber?.available) {
        setJacketSizeNum(directNumber.number);
        // Length pill defaults to backend's rawLen if provided, else first
        // available length for that number.
        const len = rawLen || parsedSizes.find((p) => p.number === directNumber.number && p.length)?.length || "";
        setJacketLength(len);
        const original = parsedSizes.find((p) => p.number === directNumber.number && p.length === len)?.original
          || directNumber.original;
        setSelectedSize(original);
        return true;
      }
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

    console.groupCollapsed("[autosize:desktop] applying recommendation");
    console.log("raw.recommendedSize:", raw.recommendedSize);
    console.log("raw.recommendedLength:", raw.recommendedLength);
    console.log("raw.sections:", raw.sections);
    console.log("parsedSizes:", parsedSizes.map(p => ({ original: p.original, number: p.number, length: p.length, available: p.available })));
    const sections = raw.sections as Record<string, any> | undefined;
    // Backend can include "Jacket Length" / "Pant Length" pseudo-sections
    // alongside the real "Jacket" / "Pants" sections — those carry only the
    // length string, not a size, and shouldn't be matched as the primary
    // jacket/pants target.
    const isLengthOnly = (n: string) => /\blength\b/i.test(n);
    if (sections && Object.keys(sections).length > 0) {
      const entries = Object.entries(sections).filter(([n]) => !isLengthOnly(n));
      console.log("[autosize] section entries (Length-only filtered):", entries.map(([n, s]: [string, any]) => ({ name: n, size: s?.size, recommendedSize: s?.recommendedSize, length: s?.length })));
      for (const [name, sec] of entries) {
        const lc = name.toLowerCase();
        if (!/pant|trouser/.test(lc)) continue;
        const sizeStr = (sec as any)?.size || (sec as any)?.recommendedSize;
        console.log(`[autosize] pants iter "${name}" → sizeStr=${sizeStr} length=${(sec as any)?.length}`);
        if (!sizeStr) continue;
        applyPants(sizeStr, (sec as any)?.length);
      }
      const isJacketLike = (n: string) => /jacket|coat|blazer|tuxedo|suit/.test(n.toLowerCase());
      const isPants = (n: string) => /pant|trouser/.test(n.toLowerCase());
      const target = entries.find(([n]) => isJacketLike(n) && !isPants(n)) || entries.find(([n]) => !isPants(n));
      console.log("[autosize] jacket target picked:", target ? target[0] : "(none)");
      if (target) {
        const [, sec] = target;
        const sizeStr = (sec as any)?.size || (sec as any)?.recommendedSize;
        console.log(`[autosize] jacket sizeStr=${sizeStr} length=${(sec as any)?.length}`);
        if (sizeStr) {
          const applied = applyJacket(sizeStr, (sec as any)?.length);
          console.log(`[autosize] applyJacket returned ${applied}`);
        }
      }
    } else if (raw.recommendedSize) {
      console.log("[autosize] flat path applyJacket", raw.recommendedSize, raw.recommendedLength);
      applyJacket(raw.recommendedSize, raw.recommendedLength || undefined);
    } else {
      console.log("[autosize] no sections AND no recommendedSize — bailing");
    }
    console.groupEnd();

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
      <nav id="demo-nav" className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-border-light flex items-center justify-between px-[3vw] py-[1.2vw]">
        <Link
          href="/demo/products"
          className="group flex items-center gap-[0.5vw] text-text-hint hover:text-text-primary transition-colors duration-200"
          style={{ fontSize: '0.85vw' }}
        >
          <ArrowLeft style={{ width: '0.9vw', height: '0.9vw' }} />
          Back
        </Link>
        <DemoBagButton
          count={bagCount}
          onClick={() => setBagOpen(true)}
          className="h-[2.1vw] w-[2.1vw]"
        />
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
            {profileAnalysis.showAnalyzing ? (
              <div className="inline-flex items-center gap-[0.35vw] px-[0.7vw] py-[0.3vw] rounded-full bg-brand-blue/10 text-brand-blue font-semibold ps-analyzing-pulse self-start" style={{ fontSize: '0.7vw' }}>
                <Sparkles style={{ width: '0.75vw', height: '0.75vw' }} className="ps-analyzing-spin" />
                <span key={profileAnalysis.message} className="ps-analyzing-text">{profileAnalysis.message}</span>
              </div>
            ) : profileAnalysis.showComplete ? (
              <div className="inline-flex items-center gap-[0.35vw] px-[0.7vw] py-[0.3vw] rounded-full bg-emerald-50 text-emerald-700 font-semibold self-start" style={{ fontSize: '0.7vw' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Analyzed by your profile
              </div>
            ) : null}

            {/* Size selector */}
            {sizes.length > 0 && isOneSizeOnly ? (
              <div>
                <span style={{ fontSize: '0.78vw' }} className="text-text-hint uppercase tracking-wider block mb-[0.6vw]">Size</span>
                <div className="w-full rounded-lg border border-border-light bg-surface-light px-[0.85vw] py-[0.7vw] text-text-primary font-medium" style={{ fontSize: '0.82vw' }}>
                  {oneSizeLabel}
                </div>
              </div>
            ) : sizes.length > 0 && hasSplitSizes ? (
              <div className={`space-y-[0.6vw] ${justAutoFilled ? "ps-autofill-flash" : ""}`}>
                <span style={{ fontSize: '0.78vw' }} className="text-text-hint uppercase tracking-wider block">Size</span>
                <div className="flex gap-[0.5vw]">
                  <div className="flex-1">
                    <label style={{ fontSize: '0.72vw' }} className="text-text-caption block mb-[0.3vw]">{pantsWaistSizes.length > 0 ? "Jacket" : isDress ? "Dress" : "Size"}</label>
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
            <DemoPrimeStyleTryon
              apiUrl={sdkApiUrl}
              productId={product.id}
              productImage={images[0] ?? product.primaryImage}
              productImages={images}
              productCarouselItems={sdkCarouselItems}
              locale="en"
              productTitle={product.name}
              productCategory={product.category}
              productGender={product.gender}
              productSubcategory={product.subcategory}
              productFitType={sdkProductFitType}
              productDescription={product.description}
              productMaterial={product.material}
              sizeGuideData={product.sizeGuideData}
              buttonText="See How It Fits"
              onComplete={handleSizingComplete}
              onAddToBag={handleAddToBag}
              buttonStyles={sdkButtonStyles}
            />


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

            {product.completeLook.length > 0 && (
              <CompleteLookRow products={product.completeLook} />
            )}

            <p style={{ fontSize: '0.6vw' }} className="text-center text-text-disabled font-mono tracking-wide mt-[0.5vw]">@primestyleai/tryon</p>
          </div>
        </div>
      </div>

      {/* Size Guide Modal */}
      {product.sizeGuide && (
        <SizeGuideModal guide={product.sizeGuide} open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} />
      )}
      <DemoBagDrawer
        open={bagOpen}
        items={bagItems}
        onClose={() => setBagOpen(false)}
        onClear={() => setBagItems([])}
        onRemove={removeBagItem}
        onIncrement={incrementBagItem}
        onDecrement={decrementBagItem}
      />
    </div>
  );
}

function CompleteLookRow({ products }: { products: DemoProductView["completeLook"] }) {
  return (
    <div className="border-t border-border-light pt-[1vw]">
      <div className="flex items-center justify-between mb-[0.75vw]">
        <span style={{ fontSize: '0.78vw' }} className="text-text-hint uppercase tracking-wider">Complete the look</span>
        <span style={{ fontSize: '0.68vw' }} className="text-text-disabled">{products.length} items</span>
      </div>
      <div className="grid grid-cols-4 gap-[0.55vw] pb-[0.2vw]">
        {products.map((item) => (
          <Link
            key={item.id}
            href={`/demo/products/${item.id}`}
            className="group min-w-0"
          >
            <div className="aspect-[3/4] rounded-[0.45vw] overflow-hidden bg-surface-light border border-border-light group-hover:border-brand-blue/35 transition-colors">
              <img src={item.image} alt={item.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
            </div>
            <p style={{ fontSize: '0.62vw' }} className="mt-[0.35vw] text-text-body font-medium leading-tight line-clamp-2 group-hover:text-brand-blue transition-colors">{item.name}</p>
            {item.price !== null && (
              <p style={{ fontSize: '0.58vw' }} className="mt-[0.15vw] text-text-disabled">{formatLookPrice(item.price, item.currency)}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

function formatLookPrice(price: number, currency: string): string {
  return `${price.toLocaleString("en-US")} ${currency}`;
}
