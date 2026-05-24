"use client";

import { useCallback, useMemo, useState } from "react";
import type { FitAreaInfo, SilhouetteContext, TryOnProductCategory, TryOnSizingRunData } from "../lib/types";
import {
  buildFitInfo,
  buildSilhouetteContext,
  DEFAULT_SIZE_CHARTS,
  defaultProductSetup,
  defaultUserSizing,
  deriveShoeSize,
  flattenMatchDetails,
  heightToInches,
  isFaceCategory,
  isHeadCategory,
  isShoeCategory,
  isBodyBasicCategory,
  parseSizeChartText,
  toMm,
  toNumber,
  type ManualSizeGuide,
  type ProductSetupState,
  type ShoeDerivation,
  type SizingResult,
  type UserSizingState,
} from "../lib/sizingUtils";

type SizingStatus = "idle" | "sizing" | "previewing" | "ready" | "error";

interface PromptPreviewResponse {
  prompt: string;
  promptBranch: "customPrompt" | "fit-aware";
  category: TryOnProductCategory;
  fitInfoLength: number;
}

export interface PreparedSizing {
  sizeGuide: ManualSizeGuide;
  sizingResult: SizingResult;
  fitInfo: FitAreaInfo[];
  silhouetteContext: SilhouetteContext;
  promptPreview: PromptPreviewResponse;
  shoe: ShoeDerivation | null;
  runData: TryOnSizingRunData;
}

export function useTryOnSizing(config: { baseUrl: string }) {
  const [product, setProduct] = useState<ProductSetupState>(() => defaultProductSetup());
  const [user, setUser] = useState<UserSizingState>(() => defaultUserSizing());
  const [status, setStatus] = useState<SizingStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<PreparedSizing | null>(null);

  const parsedSizeGuide = useMemo(() => {
    try {
      return parseSizeChartText(product.sizeChartText);
    } catch {
      return null;
    }
  }, [product.sizeChartText]);

  const shoe = useMemo(() => {
    if (!isShoeCategory(product.category)) return null;
    try {
      return deriveShoeSize(user);
    } catch {
      return null;
    }
  }, [product.category, user]);

  const setCategory = useCallback((category: TryOnProductCategory) => {
    setProduct((current) => ({
      ...current,
      category,
      sizeChartText: DEFAULT_SIZE_CHARTS[category],
    }));
    setPrepared(null);
    setStatus("idle");
    setErrorMessage(null);
  }, []);

  const updateProduct = useCallback(<K extends keyof ProductSetupState>(key: K, value: ProductSetupState[K]) => {
    setProduct((current) => ({ ...current, [key]: value }));
    setPrepared(null);
    setStatus("idle");
  }, []);

  const applyProductSetup = useCallback((patch: Partial<ProductSetupState>) => {
    setProduct((current) => ({ ...current, ...patch }));
    setPrepared(null);
    setStatus("idle");
    setErrorMessage(null);
  }, []);

  const updateUser = useCallback(<K extends keyof UserSizingState>(key: K, value: UserSizingState[K]) => {
    setUser((current) => ({ ...current, [key]: value }));
    setPrepared(null);
    setStatus("idle");
  }, []);

  const prepare = useCallback(
    async (args: { modelImage?: string | null }): Promise<TryOnSizingRunData> => {
      setStatus("sizing");
      setErrorMessage(null);

      try {
        const sizeGuide = parseSizeChartText(product.sizeChartText);
        const shoeDerivation = isShoeCategory(product.category) ? deriveShoeSize(user) : null;
        const sizingResult = await requestSizing({
          baseUrl: config.baseUrl,
          product,
          user,
          sizeGuide,
          shoe: shoeDerivation,
          modelImage: args.modelImage ?? undefined,
        });
        const unitRaw = String(sizingResult.unit || (isFaceCategory(product.category) ? "mm" : "cm")).toLowerCase();
        const unit = unitRaw === "in" ? "in" : unitRaw === "mm" ? "mm" : "cm";
        const fitInfo = product.category === "apparel" ? buildFitInfo(flattenMatchDetails(sizingResult), unit) : [];
        const silhouetteContext = buildSilhouetteContext({
          sizingResult,
          sizeGuide,
          user,
          category: product.category,
          shoe: shoeDerivation,
        });

        setStatus("previewing");
        const promptPreview = await requestPromptPreview({
          baseUrl: config.baseUrl,
          product,
          fitInfo,
          silhouetteContext,
        });

        const runData: TryOnSizingRunData = {
          category: product.category,
          productTitle: product.title.trim() || undefined,
          productDescription: product.description.trim() || undefined,
          productMaterial: product.material.trim() || undefined,
          fitInfo,
          silhouetteContext,
          promptPreview: promptPreview.prompt,
        };

        setPrepared({
          sizeGuide,
          sizingResult,
          fitInfo,
          silhouetteContext,
          promptPreview,
          shoe: shoeDerivation,
          runData,
        });
        setStatus("ready");
        return runData;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sizing failed";
        setErrorMessage(message);
        setStatus("error");
        throw err;
      }
    },
    [config.baseUrl, product, user],
  );

  return {
    product,
    user,
    status,
    errorMessage,
    prepared,
    parsedSizeGuide,
    shoe,
    setCategory,
    updateProduct,
    applyProductSetup,
    updateUser,
    prepare,
    isBodyBasic: isBodyBasicCategory(product.category),
  };
}

async function requestSizing(args: {
  baseUrl: string;
  product: ProductSetupState;
  user: UserSizingState;
  sizeGuide: ManualSizeGuide;
  shoe: ShoeDerivation | null;
  modelImage?: string;
}): Promise<SizingResult> {
  const { baseUrl, product, user, sizeGuide, shoe, modelImage } = args;

  if (isFaceCategory(product.category) || isHeadCategory(product.category)) {
    const faceMeasurementsMm = buildFaceMeasurementsMm(product.category, user);
    const payload = {
      product: {
        title: product.title || "Test product",
        productId: product.productId,
        productImage: product.productImage,
        subcategory: product.subcategory,
        productType: product.category,
      },
      sizeGuide,
      sizingUnit: isHeadCategory(product.category) ? "cm" : "mm",
      category: isHeadCategory(product.category) ? "head" : "face",
      faceMeasurementsMm,
      irisConfidence: 1,
      bodyImage: modelImage,
      bodyContext: buildBodyContext(user),
    };

    return postJson<SizingResult>(`${baseUrl}/api/v1/sizing/face-recommend`, payload);
  }

  const payload: Record<string, unknown> = {
    method: isShoeCategory(product.category) ? "exact" : "quick",
    locale: "US",
    sizingUnit: "cm",
    product: {
      title: product.title || "Test product",
      productId: product.productId,
      productImage: product.productImage,
      category: product.category,
      subcategory: product.subcategory,
      productFitType: product.category,
      productType: product.category,
      description: product.description || undefined,
    },
    sizeGuide,
    bodyImage: modelImage,
  };

  if (isShoeCategory(product.category)) {
    if (!shoe) throw new Error("Shoe brand and size are required");
    payload.measurements = {
      gender: user.gender,
      sizingUnit: "cm",
      height: heightToInches(user),
      heightUnit: "in",
      weight: toNumber(user.weight, "Weight"),
      weightUnit: "lbs",
      footLengthCm: shoe.footLengthCm,
      shoeUS: shoe.shoeUS,
      shoeUK: shoe.shoeUK,
      shoeEU: shoe.shoeEU,
    };
  } else {
    payload.quickEstimate = {
      height: heightToInches(user),
      weight: toNumber(user.weight, "Weight"),
      heightUnit: "in",
      weightUnit: "lbs",
      gender: user.gender,
      age: user.age ? Number.parseInt(user.age, 10) : undefined,
    };
    if (product.category === "apparel" && user.gender === "female") {
      payload.braSize = {
        band: toNumber(user.bandSize, "Band size"),
        cup: user.cupSize.trim().toUpperCase(),
        region: user.braRegion,
      };
    }
  }

  return postJson<SizingResult>(`${baseUrl}/api/v1/sizing/recommend`, payload);
}

function buildFaceMeasurementsMm(category: TryOnProductCategory, user: UserSizingState): Record<string, number> {
  const values: Record<string, number | undefined> =
    category === "hat"
      ? {
          headCircumference: toMm(user.headCircumferenceCm, "cm"),
          headWidth: toMm(user.headWidthCm, "cm"),
        }
      : {
          faceWidth: toMm(user.faceWidthMm, "mm"),
          bridgeWidth: toMm(user.bridgeWidthMm, "mm"),
          templeLength: toMm(user.templeLengthMm, "mm"),
          lensWidth: toMm(user.lensWidthMm, "mm"),
          lensHeight: toMm(user.lensHeightMm, "mm"),
          pd: toMm(user.pdMm, "mm"),
        };

  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "number") out[key] = value;
  }
  if (!Object.keys(out).length) throw new Error(category === "hat" ? "Head measurements are required" : "Face measurements are required");
  return out;
}

function buildBodyContext(user: UserSizingState): Record<string, unknown> {
  return {
    height: heightToInches(user),
    weight: toNumber(user.weight, "Weight"),
    heightUnit: "in",
    weightUnit: "lbs",
    gender: user.gender,
    age: user.age ? Number.parseInt(user.age, 10) : undefined,
  };
}

async function requestPromptPreview(args: {
  baseUrl: string;
  product: ProductSetupState;
  fitInfo: FitAreaInfo[];
  silhouetteContext: SilhouetteContext;
}): Promise<PromptPreviewResponse> {
  const payload = {
    category: args.product.category,
    productTitle: args.product.title || undefined,
    productDescription: args.product.description || undefined,
    productMaterial: args.product.material || undefined,
    fitInfo: args.fitInfo,
    silhouetteContext: args.silhouetteContext,
  };

  return postJson<PromptPreviewResponse>(`${args.baseUrl}/api/test-lab/sdk-mirror/prompt-preview`, payload);
}

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({} as { message?: string; error?: string }));
    throw new Error(data.message || data.error || `Request failed (${response.status})`);
  }

  return (await response.json()) as T;
}
