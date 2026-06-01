"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ChevronLeft, Camera, Ruler, Globe, ChevronRight, Sparkles } from "lucide-react";
import { usePrimeStyleSize } from "@primestyleai/tryon/react";
import type { RecommendForProductInput } from "@primestyleai/tryon/react";
import type { DemoProductView } from "../../../types";
import { SizeGuideModal } from "../SizeGuideModal";
import { SizeSelect } from "../SizeSelect";
import { useSizingAutoSelect } from "../../hooks/useSizingAutoSelect";
import { useProfileAnalysisDisplay } from "../../hooks/useProfileAnalysisDisplay";
import {
  DemoBagButton,
  DemoBagDrawer,
  buildDemoBagItem,
  mergeDemoBagItem,
  type DemoAddToBagPayload,
  type DemoBagItem,
} from "../DemoBag";

// Lazy-load the SDK component so the heavy bundle doesn't block first paint.
// usePrimeStyleSize stays statically imported — hooks can't be dynamic.
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

const SDK_LOCALES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "sv", label: "Svenska" },
  { code: "ja", label: "日本語" },
  { code: "cs", label: "Čeština" },
  { code: "da", label: "Dansk" },
  { code: "nl", label: "Nederlands" },
  { code: "nb", label: "Norsk" },
  { code: "pl", label: "Polski" },
  { code: "pt-br", label: "Português (BR)" },
  { code: "pt-pt", label: "Português (PT)" },
  { code: "fi", label: "Suomi" },
  { code: "tr", label: "Türkçe" },
  { code: "th", label: "ไทย" },
  { code: "zh-cn", label: "中文 (简体)" },
  { code: "zh-tw", label: "中文 (繁體)" },
  { code: "ko", label: "한국어" },
];

interface Props {
  product: DemoProductView;
}

type DemoPrimeStyleSizeInput = RecommendForProductInput & {
  productCategory?: string;
  productSubcategory?: string;
  productDescription?: string;
};

export function MobileProductDetail({ product }: Props) {
  const router = useRouter();
  const [currentImage, setCurrentImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.selectedColor);
  const [jacketSizeNum, setJacketSizeNum] = useState("");
  const [jacketLength, setJacketLength] = useState("");
  const [jacketOpen, setJacketOpen] = useState(false);
  const [pantsOpen, setPantsOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [descExpanded, setDescExpanded] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [sdkLocale, setSdkLocale] = useState("en");
  const [bagOpen, setBagOpen] = useState(false);
  const [bagItems, setBagItems] = useState<DemoBagItem[]>([]);

  const activeVariant = product.colorVariants.find((v) => v.name === selectedColor);
  const images = useMemo(
    () => (activeVariant?.images.length ? activeVariant.images : product.images),
    [activeVariant, product.images],
  );
  // Prefer product.sizes (built from size guide Standard column) — richer than variant's raw mm sizes
  const sizes = useMemo(
    () => (product.sizes.length ? product.sizes : (activeVariant?.sizes ?? [])),
    [activeVariant, product.sizes],
  );

  // Parse sizes — memoized so `parsedSizes` has a stable reference across renders.
  // Without memoization, the useEffect below would fire every render and spam logs.
  // Handles three real-world chart label formats:
  //   1. "MISSY 12 / Standard"   → number="MISSY 12", length="Standard"  (DB Studio)
  //   2. "44 R"                  → number="44",       length="R"          (tuxedo)
  //   3. "12" / "16W"            → number="12",       length=""           (plain dress)
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

  // Independent pant sizing — extract waist sizes & lengths from the size guide
  const [pantsWaistSize, setPantsWaistSize] = useState("");
  const [pantsLengthSize, setPantsLengthSize] = useState("");
  // Brief flash on the jacket/pants cards when the auto-select fires.
  const [justAutoFilled, setJustAutoFilled] = useState(false);
  const pantsSection = product.sizeGuide?.sections?.find((s) => /pant/i.test(s.name) && !/length/i.test(s.name));
  const pantsLengthSection = product.sizeGuide?.sections?.find((s) => /pant/i.test(s.name) && /length/i.test(s.name));
  const pantsWaistSizes = pantsSection?.rows.map((r) => r["Size"]).filter(Boolean) ?? [];
  const pantsLengthSizes = pantsLengthSection?.rows.map((r) => r["Length"] || r["Size"]).filter(Boolean) ?? [];
  const sdkApiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
  const sdkCarouselItems = useMemo(() => product.completeLook.map((item) => ({
    image: item.image,
    title: item.name,
    href: `/demo/products/${item.id}`,
  })), [product.completeLook]);
  const sdkButtonStyles = useMemo(() => ({
    backgroundColor: "#2154EF",
    textColor: "#ffffff",
    border: "none",
    borderRadius: "0.5rem",
    height: "2.25rem",
    width: "100%",
    fontSize: "0.75rem",
    fontWeight: "600",
    iconSize: "14px",
    iconColor: "#ffffff",
    hoverBackgroundColor: "#193EDC",
    hoverTextColor: "#ffffff",
    boxShadow: "none",
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

  // ── Headless auto-sizing from saved profile ──
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
  // Auto-select sizes when the saved-profile recommendation arrives from
  // the SDK. The backend returns split fields like
  //   sections.Jacket = { recommendedSize: "38", size: "38", length: "Regular" }
  // but the catalog stores variant sizes as single tokens like "38R", "38L"
  // (Short / Regular / Long). We therefore try a handful of concatenation
  // patterns to bridge those two shapes.
  const lastAutoSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    const raw = autoSize.result?.raw as any;
    if (!raw || parsedSizes.length === 0) return;
    const recoKey = JSON.stringify({
      size: raw.recommendedSize,
      length: raw.recommendedLength,
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

    /** Find a parsed size that matches the (num, len) pair returned by the
     *  backend. Tries many concatenation/abbreviation patterns. */
    const findMatch = (num: string, len?: string) => {
      // 1) Direct original-token match (e.g. backend returned "38R")
      const direct = parsedSizes.find((p) => p.original === num);
      if (direct?.available) return direct;

      if (len) {
        // 2) Catalog uses split format ("38" + "Regular")
        const split = parsedSizes.find((p) => p.number === num && p.length.toLowerCase() === len.toLowerCase());
        if (split?.available) return split;

        // 3) Catalog uses concatenated full word ("38Regular")
        const concat = parsedSizes.find((p) => p.original.toLowerCase() === (num + len).toLowerCase());
        if (concat?.available) return concat;

        // 4) Catalog uses concatenated initial ("38R" for Regular, "38L" for Long, "38S" for Short)
        const initial = (len[0] || "").toUpperCase();
        const initConcat = parsedSizes.find((p) => p.original.toUpperCase() === num + initial);
        if (initConcat?.available) return initConcat;

        // 5) Catalog uses spaced format ("38 Regular")
        const spaced = parsedSizes.find((p) => p.original.toLowerCase() === (num + " " + len).toLowerCase());
        if (spaced?.available) return spaced;

        // 6) Split format with first-letter length ("38" + "R")
        const splitInitial = parsedSizes.find(
          (p) => p.number === num && p.length.toUpperCase().startsWith(initial),
        );
        if (splitInitial?.available) return splitInitial;
      }

      // 7) Number-only — single matching variant
      const numOnly = parsedSizes.filter((p) => p.number === num);
      if (numOnly.length === 1 && numOnly[0].available) return numOnly[0];

      // 8) Number-only — variants whose original starts with this number
      const startsWith = parsedSizes.filter((p) => p.original.startsWith(num) && p.available);
      if (startsWith.length === 1) return startsWith[0];

      return null;
    };

    const applyJacket = (rawSize: string, rawLen?: string): boolean => {
      // Match the FULL raw string against an entry's `original` first.
      // Catches "MISSY 12 / Standard" where naive splitSize would drop
      // the "MISSY" prefix.
      const directFull = parsedSizes.find((p) => p.original === rawSize);
      if (directFull?.available) {
        setJacketSizeNum(directFull.number);
        setJacketLength(directFull.length || "");
        setSelectedSize(directFull.original);
        return true;
      }
      const directNumber = parsedSizes.find((p) => p.number === rawSize);
      if (directNumber?.available) {
        setJacketSizeNum(directNumber.number);
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
      // Couldn't fully match — at least set the number so the user sees a
      // partial recommendation in the dropdown.
      const startsWith = parsedSizes.filter((p) => p.original.startsWith(num));
      if (startsWith.length > 0) {
        setJacketSizeNum(num);
        setJacketLength("");
        setSelectedSize("");
        return true;
      }
      return false;
    };

    const applyPants = (rawSize: string, rawLen?: string) => {
      const split = splitSize(rawSize);
      const num = split.num;
      const len = rawLen || split.len;
      setPantsWaistSize(num);
      if (len) setPantsLengthSize(len);
    };

    const sections = raw.sections as Record<string, any> | undefined;
    // Backend can include "Jacket Length" / "Pant Length" pseudo-sections
    // alongside the real "Jacket" / "Pants" sections — those carry only a
    // length value, not a size, and shouldn't be matched as primary targets.
    const isLengthOnly = (n: string) => /\blength\b/i.test(n);
    // eslint-disable-next-line no-console
    console.log("[demo:auto-select] mobile", { raw, parsedSizes, sections });

    if (sections && Object.keys(sections).length > 0) {
      const entries = Object.entries(sections).filter(([n]) => !isLengthOnly(n));
      for (const [name, sec] of entries) {
        const lc = name.toLowerCase();
        if (!/pant|trouser/.test(lc)) continue;
        const sizeStr = (sec as any)?.size || (sec as any)?.recommendedSize;
        if (!sizeStr) continue;
        applyPants(sizeStr, (sec as any)?.length);
      }
      const isJacketLike = (n: string) => /jacket|coat|blazer|tuxedo|suit/.test(n.toLowerCase());
      const isPants = (n: string) => /pant|trouser/.test(n.toLowerCase());
      const target =
        entries.find(([n]) => isJacketLike(n) && !isPants(n)) ||
        entries.find(([n]) => !isPants(n));
      if (target) {
        const [name, sec] = target;
        const sizeStr = (sec as any)?.size || (sec as any)?.recommendedSize;
        if (sizeStr) {
          const ok = applyJacket(sizeStr, (sec as any)?.length);
          // eslint-disable-next-line no-console
          console.log("[demo:auto-select] jacket section", name, { size: sizeStr, length: (sec as any)?.length }, "→", ok ? "matched" : "NO MATCH");
        }
      }
    } else if (raw.recommendedSize) {
      const ok = applyJacket(raw.recommendedSize, raw.recommendedLength || undefined);
      // eslint-disable-next-line no-console
      console.log("[demo:auto-select] single-piece", raw.recommendedSize, "→", ok ? "matched" : "NO MATCH");
    }

    // Trigger the dropdown flash animation
    setJustAutoFilled(true);
    const handle = window.setTimeout(() => setJustAutoFilled(false), 1100);
    return () => window.clearTimeout(handle);
  }, [autoSize.result, parsedSizes]);

  const handleColorSelect = (name: string) => {
    setSelectedColor(name);
    setCurrentImage(0);
    setSelectedSize("");
    setJacketSizeNum("");
    setJacketLength("");
    setJacketOpen(false);
    setPantsOpen(false);
  };

  const [touchStart, setTouchStart] = useState(0);
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentImage < images.length - 1) setCurrentImage((p) => p + 1);
      if (diff < 0 && currentImage > 0) setCurrentImage((p) => p - 1);
    }
  };

  const jacketSelected = !!(jacketSizeNum && jacketLength);
  const pantsSelected = !!(pantsWaistSize && pantsLengthSize);

  const sizeBtn = (active: boolean, available: boolean) =>
    `rounded-lg border font-medium transition-all duration-150 ${
      active
        ? "bg-brand-blue text-white border-brand-blue"
        : available
        ? "bg-surface-light text-text-body border-border-light hover:border-brand-blue/30"
        : "bg-transparent text-text-disabled border-border-light cursor-not-allowed line-through"
    }`;

  return (
    <div className="fixed inset-0 bg-white flex flex-col overflow-hidden pt-safe pb-safe text-text-primary">
      {/* Header */}
      <header className="flex-shrink-0 bg-white z-10 border-b border-border-light">
        <div className="flex items-center px-4 py-3 gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 flex-shrink-0 rounded-full border border-border-light bg-surface-light flex items-center justify-center">
            <ChevronLeft className="h-4 w-4 text-text-hint" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <p className="text-[10px] text-brand-blue font-semibold tracking-[0.15em] uppercase leading-none mb-0.5">{product.brand}</p>
            <p className="text-sm font-semibold text-text-primary truncate leading-tight">{product.name}</p>
          </div>
          <DemoBagButton
            count={bagCount}
            onClick={() => setBagOpen(true)}
            className="h-9 w-9 flex-shrink-0"
          />
        </div>
      </header>

      {/* Scrollable body */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-28">
        {/* Image carousel — square aspect, full-bleed contain so the entire
            product photo is visible no matter the source aspect ratio. */}
        <div className="relative bg-surface-light aspect-square" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {images[currentImage] ? (
            <img
              key={`${selectedColor}-${currentImage}`}
              src={images[currentImage]}
              alt={product.name}
              className="w-full h-full object-contain block demo-img-fadein"
              style={{ opacity: 1 }}
            />
          ) : (
            <div className="aspect-square flex items-center justify-center text-text-disabled">No image</div>
          )}
          <div className="absolute top-4 right-4 px-2.5 py-1 bg-black/40 backdrop-blur-sm rounded-full">
            <span className="text-[10px] text-white/60 font-mono">{currentImage + 1}/{images.length}</span>
          </div>
          {images.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
              {images.slice(0, 8).map((_, i) => (
                <button key={i} onClick={() => setCurrentImage(i)} className={`rounded-full transition-all duration-200 ${currentImage === i ? "w-5 h-1.5 bg-brand-blue" : "w-1.5 h-1.5 bg-black/20"}`} />
              ))}
              {images.length > 8 && <span className="text-[9px] text-black/30 self-center ml-0.5">+{images.length - 8}</span>}
            </div>
          )}
        </div>

        {/* Horizontal thumbs */}
        {images.length > 1 && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide bg-white">
            {images.map((img, i) => (
              <button key={i} onClick={() => setCurrentImage(i)} className={`w-14 h-[72px] rounded-lg overflow-hidden border flex-shrink-0 transition-all duration-200 ${currentImage === i ? "border-brand-blue shadow-[0_0_12px_rgba(33,84,239,0.12)]" : "border-border-light"}`}>
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Product info */}
        <div className="px-4 pt-4 space-y-4">
          <div className="space-y-1.5">
            <p className="text-[10px] text-brand-blue font-semibold tracking-[0.16em] uppercase leading-none">{product.brand}</p>
            <h1 className="text-[20px] font-semibold tracking-[-0.01em] leading-[1.22] text-text-primary">{product.name}</h1>
          </div>

          <div className="h-px bg-gradient-to-r from-brand-blue/20 via-brand-blue/10 to-transparent" />


          {/* Colors */}
          {product.colorVariants.length > 0 && (
            <div className="space-y-2.5">
              <div className="space-y-1">
                <span className="block text-[11px] text-text-hint uppercase tracking-[0.14em] leading-none">Color</span>
                <span className="block max-w-full text-[12px] leading-snug text-text-body break-words">
                  {selectedColor}
                </span>
              </div>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1.5 scrollbar-hide">
                {product.colorVariants.map((cv) => (
                  <button
                    key={cv.name}
                    type="button"
                    aria-label={cv.name}
                    title={cv.name}
                    onClick={() => cv.available && handleColorSelect(cv.name)}
                    disabled={!cv.available}
                    className={`h-8 w-8 flex-shrink-0 rounded-full border border-black/5 transition-all duration-200 ${selectedColor === cv.name ? "ring-2 ring-brand-blue ring-offset-2 ring-offset-white" : ""} ${!cv.available ? "opacity-25" : ""}`}
                    style={{ backgroundColor: cv.hex }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── MW-style Bundle Size Selector ── */}
          {sizes.length > 0 && isOneSizeOnly ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-text-hint uppercase tracking-[0.14em]">Size</span>
                {product.sizeGuide && (
                  <button onClick={() => setSizeGuideOpen(true)} className="text-[12px] text-brand-blue flex items-center gap-1">
                    <Ruler className="h-3 w-3" />
                    Size Guide
                  </button>
                )}
              </div>
              <div className="rounded-lg border border-border-light bg-surface-light px-3 py-2.5 text-[13px] font-medium text-text-primary">
                {oneSizeLabel}
              </div>
            </div>
          ) : sizes.length > 0 && hasSplitSizes ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-hint uppercase tracking-[0.14em]">Your Size</span>
                {product.sizeGuide && (
                  <button onClick={() => setSizeGuideOpen(true)} className="text-[12px] text-brand-blue flex items-center gap-1">
                    <Ruler className="h-3 w-3" />
                    Size Guide
                  </button>
                )}
              </div>

              {/* Status pill — "Analyzing…" while loading, "Analyzed by your profile" once done */}
              {profileAnalysis.showAnalyzing ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-brand-blue/10 text-brand-blue ps-analyzing-pulse">
                  <Sparkles className="h-3 w-3 ps-analyzing-spin" />
                  <span key={profileAnalysis.message} className="ps-analyzing-text">{profileAnalysis.message}</span>
                </div>
              ) : profileAnalysis.showComplete ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Analyzed by your profile
                </div>
              ) : null}

              {/* Size card — labels say "Jacket *" only when a Pants block exists
                  (real suit). For dresses and other single-section apparel the
                  first axis is just "Size" / "Length" — no "Jacket" prefix. */}
              <div className={`rounded-xl border border-border-light bg-surface-light p-3 ${justAutoFilled ? "ps-autofill-flash" : ""}`}>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[11px] text-text-hint uppercase tracking-[0.12em] mb-2 block">{pantsWaistSizes.length > 0 ? "Jacket Size" : isDress ? "Dress" : "Size"}</label>
                    <SizeSelect
                      value={jacketSizeNum}
                      onChange={handleSizeNumberSelect}
                      options={sizeNumbers.map((num) => ({
                        value: num,
                        label: num,
                        disabled: !parsedSizes.some((s) => s.number === num && s.available),
                      }))}
                      placeholder="Select size"
                    />
                  </div>

                  {allUniqueLengths.length > 0 && (
                    <div className="flex-1">
                      <label className="text-[11px] text-text-hint uppercase tracking-[0.12em] mb-2 block">{pantsWaistSizes.length > 0 ? "Jacket Length" : "Length"}</label>
                      <SizeSelect
                        value={jacketLength}
                        onChange={handleLengthSelect}
                        disabled={!jacketSizeNum}
                        options={allUniqueLengths.map((len) => ({
                          value: len,
                          label: len,
                          disabled: !!(jacketSizeNum && !availableLengths.has(len)),
                        }))}
                        placeholder="Select length"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Pants card */}
              <div className={`rounded-xl border border-border-light bg-surface-light p-3 ${justAutoFilled ? "ps-autofill-flash" : ""}`}>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[11px] text-text-hint uppercase tracking-[0.12em] mb-2 block">Pants Size</label>
                    <SizeSelect
                      value={pantsWaistSize}
                      onChange={setPantsWaistSize}
                      options={pantsWaistSizes.map((s) => ({ value: s, label: s }))}
                      placeholder="Select size"
                    />
                  </div>

                  {pantsLengthSizes.length > 0 && (
                    <div className="flex-1">
                      <label className="text-[11px] text-text-hint uppercase tracking-[0.12em] mb-2 block">Pants Length</label>
                      <SizeSelect
                        value={pantsLengthSize}
                        onChange={setPantsLengthSize}
                        options={pantsLengthSizes.map((len) => ({ value: len, label: len }))}
                        placeholder="Select length"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : sizes.length > 0 ? (
            /* Simple sizes — dropdown for consistency */
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-text-hint uppercase tracking-[0.14em]">Size</span>
                {product.sizeGuide && (
                  <button onClick={() => setSizeGuideOpen(true)} className="text-[12px] text-brand-blue flex items-center gap-1">
                    <Ruler className="h-3 w-3" />
                    Size Guide
                  </button>
                )}
              </div>
              {/* Status pill */}
              {profileAnalysis.showAnalyzing ? (
                <div className="inline-flex items-center gap-1.5 mb-2.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-brand-blue/10 text-brand-blue ps-analyzing-pulse">
                  <Sparkles className="h-3 w-3 ps-analyzing-spin" />
                  <span key={profileAnalysis.message} className="ps-analyzing-text">{profileAnalysis.message}</span>
                </div>
              ) : profileAnalysis.showComplete ? (
                <div className="inline-flex items-center gap-1.5 mb-2.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Analyzed by your profile
                </div>
              ) : null}
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

          {/* See How It Fits — minimal inline button under the size dropdown
              on mobile. No icon, no sticky bottom, no @primestyleai/tryon byline. */}
          <DemoPrimeStyleTryon
            apiUrl={sdkApiUrl}
            productId={product.id}
            productImage={images[currentImage] ?? product.primaryImage}
            productImages={images}
            productCarouselItems={sdkCarouselItems}
            locale={sdkLocale}
            productTitle={product.name}
            productCategory={product.category}
            productGender={product.gender}
            productSubcategory={product.subcategory}
            productDescription={product.description}
            productMaterial={product.material}
            sizeGuideData={product.sizeGuideData}
            buttonText="See How It Fits"
            onComplete={handleSizingComplete}
            onAddToBag={handleAddToBag}
            buttonStyles={sdkButtonStyles}
          />

          {/* Description */}
          {product.description && (
            <div className="border-t border-border-light pt-5">
              <button onClick={() => setDescExpanded(!descExpanded)} className="w-full flex items-center justify-between mb-3">
                <span className="text-[11px] text-text-hint uppercase tracking-[0.14em]">Description</span>
                <span className="text-[12px] text-brand-blue">{descExpanded ? "Less" : "More"}</span>
              </button>
              <div className={`text-[13px] text-text-hint leading-[1.65] overflow-hidden transition-all duration-300 [&_a]:text-brand-blue [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1 [&_p]:mb-2 ${descExpanded ? "max-h-[2000px]" : "max-h-[66px]"}`} dangerouslySetInnerHTML={{ __html: product.description }} />
            </div>
          )}

          {product.material && (
            <div className="flex items-center gap-2 text-[11px] pb-4">
              <span className="text-text-caption">Material</span>
              <span className="h-px flex-1 bg-border-light" />
              <span className="text-text-hint">{product.material}</span>
            </div>
          )}

          {product.completeLook.length > 0 && (
            <CompleteLookRow products={product.completeLook} />
          )}
        </div>
      </div>


      {/* Size Guide Modal */}
      {product.sizeGuide && (
        <SizeGuideModal guide={product.sizeGuide} open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} />
      )}
      <DemoBagDrawer
        open={bagOpen}
        mode="mobile"
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
    <div className="border-t border-border-light pt-5 pb-1">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-text-hint uppercase tracking-wider">Complete the look</span>
        <span className="text-[11px] text-text-disabled">{products.length} items</span>
      </div>
      <div className="grid grid-cols-4 gap-2 pb-2">
        {products.map((item) => (
          <Link key={item.id} href={`/demo/products/${item.id}`} className="min-w-0">
            <div className="aspect-[3/4] overflow-hidden rounded-xl border border-border-light bg-surface-light">
              <img src={item.image} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
            </div>
            <p className="mt-2 line-clamp-2 text-xs font-medium leading-tight text-text-body">{item.name}</p>
            {item.price !== null && (
              <p className="mt-1 text-[11px] text-text-disabled">{formatLookPrice(item.price, item.currency)}</p>
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
