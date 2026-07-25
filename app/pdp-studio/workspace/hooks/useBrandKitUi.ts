"use client";

import { useState } from "react";

interface BrandInfoState {
  name: string;
  description: string;
  website: string;
  instagram: string;
  style: string;
}

const INITIAL_BRAND_INFO: BrandInfoState = {
  name: "PrimeStyleAI",
  description: "AI product imagery and virtual fitting for fashion ecommerce.",
  website: "https://primestyleai.com",
  instagram: "@primestyleai",
  style: "Clean ecommerce photography, cool neutrals, precise blue accents.",
};

export function useBrandKitUi() {
  const [activeTab, setActiveTab] = useState<"assets" | "info">("assets");
  const [brandInfo, setBrandInfo] = useState<BrandInfoState>(INITIAL_BRAND_INFO);
  const [saved, setSaved] = useState(false);
  const [assetNotice, setAssetNotice] = useState("");

  function setField<K extends keyof BrandInfoState>(key: K, value: BrandInfoState[K]): void {
    setBrandInfo((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function savePreview(): void {
    setSaved(true);
  }

  return {
    activeTab,
    brandInfo,
    saved,
    assetNotice,
    setActiveTab,
    setField,
    setAssetNotice,
    savePreview,
  };
}
