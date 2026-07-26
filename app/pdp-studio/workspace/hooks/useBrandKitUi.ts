"use client";

import { useEffect, useState } from "react";
import { uploadPdpStudioAsset } from "../../platform/services/pdpStudioAssetService";
import {
  getPdpStudioBrandKit,
  updatePdpStudioBrandKit,
} from "../../platform/services/pdpStudioBrandKitService";
import type {
  PdpStudioAsset,
  PdpStudioBrandKit,
} from "../../platform/types/pdpStudioPlatform";

interface BrandInfoState {
  name: string;
  description: string;
  website: string;
  instagram: string;
  style: string;
}

const INITIAL_BRAND_INFO: BrandInfoState = {
  name: "",
  description: "",
  website: "",
  instagram: "",
  style: "",
};

export function useBrandKitUi() {
  const [activeTab, setActiveTab] = useState<"assets" | "info">("assets");
  const [brandInfo, setBrandInfo] = useState<BrandInfoState>(INITIAL_BRAND_INFO);
  const [saved, setSaved] = useState(false);
  const [assetNotice, setAssetNotice] = useState("");
  const [logos, setLogos] = useState<PdpStudioAsset[]>([]);
  const [references, setReferences] = useState<PdpStudioAsset[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [fonts, setFonts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getPdpStudioBrandKit()
      .then(applyBrandKit)
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : "Unable to load the Brand Kit."),
      )
      .finally(() => setLoading(false));
  }, []);

  function setField<K extends keyof BrandInfoState>(key: K, value: BrandInfoState[K]): void {
    setBrandInfo((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function save(): Promise<void> {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const next = await persist({
        brandInfo,
        logos,
        references,
        colors,
        fonts,
      });
      applyBrandKit(next);
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save the Brand Kit.");
    } finally {
      setSaving(false);
    }
  }

  async function addLogo(file: File): Promise<void> {
    setAssetNotice("");
    setError(null);
    try {
      const asset = await uploadPdpStudioAsset(file, "brand-kit");
      const nextLogos = [...logos, asset];
      setLogos(nextLogos);
      const next = await persist({
        brandInfo,
        logos: nextLogos,
        references,
        colors,
        fonts,
      });
      applyBrandKit(next);
      setAssetNotice("Logo saved to your private Brand Kit.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to upload this logo.");
    }
  }

  function addColor(color: string): void {
    if (!/^#[a-f0-9]{6}$/i.test(color) || colors.includes(color)) return;
    setColors((current) => [...current, color]);
    setSaved(false);
  }

  function addFont(font: string): void {
    const value = font.trim();
    if (!value || fonts.includes(value)) return;
    setFonts((current) => [...current, value]);
    setSaved(false);
  }

  function applyBrandKit(kit: PdpStudioBrandKit): void {
    setBrandInfo({
      name: kit.name,
      description: kit.description,
      website: kit.website,
      instagram: kit.instagram,
      style: kit.writtenDirection,
    });
    setLogos(kit.logos);
    setReferences(kit.references);
    setColors(kit.colors);
    setFonts(kit.fonts);
  }

  function persist(input: {
    brandInfo: BrandInfoState;
    logos: PdpStudioAsset[];
    references: PdpStudioAsset[];
    colors: string[];
    fonts: string[];
  }): Promise<PdpStudioBrandKit> {
    return updatePdpStudioBrandKit({
      name: input.brandInfo.name,
      description: input.brandInfo.description,
      website: input.brandInfo.website,
      instagram: input.brandInfo.instagram,
      writtenDirection: input.brandInfo.style,
      colors: input.colors,
      fonts: input.fonts,
      logoAssetIds: input.logos.map((asset) => asset.id),
      referenceAssetIds: input.references.map((asset) => asset.id),
    });
  }

  return {
    activeTab,
    brandInfo,
    saved,
    assetNotice,
    logos,
    colors,
    fonts,
    loading,
    saving,
    error,
    setActiveTab,
    setField,
    setAssetNotice,
    save,
    addLogo,
    addColor,
    addFont,
  };
}
