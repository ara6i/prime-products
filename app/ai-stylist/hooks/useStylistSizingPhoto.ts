"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  analyzeSizingPhoto,
  prewarmSizingPhotoAnalyzer,
} from "@/app/onboarding/lib/pose-detection";
import {
  estimateSizing,
  uploadSizingPhoto,
} from "@/app/onboarding/services/onboarding.service";
import { saveSizingProfile } from "@/app/profile/services/profile.service";
import type {
  BodyLandmarks,
  BraSizeRegion,
  SizingEstimateResult,
} from "@/app/onboarding/types";

export interface StylistSizingProfile {
  sizingPhotoUrl: string | null;
  measurements: Record<string, number>;
  measurementUnit: "cm" | "in";
  measurementSource: "photo" | "manual" | null;
  measurementSystem: "metric" | "imperial";
  height: string;
  weight: string;
  birthYear: number | null;
  braSizeRegion: string;
  bandSize: string;
  cupSize: string;
}

export type StylistSizingPhotoStatus =
  | "idle"
  | "analyzing"
  | "estimating"
  | "results"
  | "saving"
  | "ready";

interface UploadedSizingPhoto {
  file: File;
  name: string;
  size: number;
  dataUrl: string;
  landmarks?: BodyLandmarks;
}

export type StylistSizingChoice = "saved" | "generated" | null;

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Could not prepare this photo."));
    reader.onerror = () => reject(new Error("Could not prepare this photo."));
    reader.readAsDataURL(file);
  });
}

async function imageToDataUrl(source: string): Promise<string> {
  if (source.startsWith("data:image/")) return source;
  const response = await fetch(source, { credentials: "omit" });
  if (!response.ok) {
    throw new Error("Could not load your saved sizing photo.");
  }
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Could not prepare your saved sizing photo."));
    reader.onerror = () =>
      reject(new Error("Could not prepare your saved sizing photo."));
    reader.readAsDataURL(blob);
  });
}

export function useStylistSizingPhoto(input: {
  profile: StylistSizingProfile;
  gender: "female" | "male";
}) {
  const [source, setSource] = useState<"saved" | "new">(
    input.profile.sizingPhotoUrl ? "saved" : "new",
  );
  const [savedPhotoUrl, setSavedPhotoUrl] = useState(
    input.profile.sizingPhotoUrl,
  );
  const [uploaded, setUploaded] = useState<UploadedSizingPhoto | null>(null);
  const [estimate, setEstimate] = useState<SizingEstimateResult | null>(null);
  const [status, setStatus] = useState<StylistSizingPhotoStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sizingChoice, setSizingChoice] =
    useState<StylistSizingChoice>(null);

  useEffect(() => {
    prewarmSizingPhotoAnalyzer();
  }, []);

  useEffect(() => {
    if (!input.profile.sizingPhotoUrl) return;
    // The profile is loaded asynchronously and seeds user-editable local state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedPhotoUrl(input.profile.sizingPhotoUrl);
    setSource((current) => (uploaded ? current : "saved"));
  }, [input.profile.sizingPhotoUrl, uploaded]);

  const displayedMeasurements = useMemo(
    () => estimate?.estimates ?? input.profile.measurements,
    [estimate?.estimates, input.profile.measurements],
  );
  const displayedUnit =
    estimate?.unit ?? input.profile.measurementUnit;
  const hasSavedMeasurements = useMemo(
    () =>
      Object.values(input.profile.measurements).some(
        (value) => typeof value === "number" && Number.isFinite(value),
      ),
    [input.profile.measurements],
  );

  const selectSaved = useCallback(() => {
    if (!savedPhotoUrl) return;
    setSource("saved");
    setError(null);
    setSizingChoice(null);
  }, [savedPhotoUrl]);

  const analyzeUpload = useCallback(
    async (file: File) => {
      setError(null);
      setStatus("idle");
      setSource("new");
      setUploaded(null);
      setEstimate(null);
      setSizingChoice(null);
      try {
        const dataUrl = await fileToDataUrl(file);
        setUploaded({
          file,
          name: file.name,
          size: file.size,
          dataUrl,
        });
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "We could not prepare this photo.",
        );
      }
    },
    [],
  );

  const useSavedMeasurements = useCallback(() => {
    if (!uploaded) return;
    if (!hasSavedMeasurements) {
      setError(
        "No saved measurements were found. Generate sizes from this photo.",
      );
      return;
    }
    setError(null);
    setEstimate(null);
    setSizingChoice("saved");
    setStatus("ready");
  }, [hasSavedMeasurements, uploaded]);

  const generateMeasurements = useCallback(
    async () => {
      if (!uploaded) return;
      setError(null);
      setStatus("analyzing");
      setSizingChoice("generated");
      try {
        const height = Number.parseFloat(input.profile.height);
        const weight = Number.parseFloat(input.profile.weight);
        if (!Number.isFinite(height) || height <= 0) {
          throw new Error(
            "Add your height in Profile before finding your size from a photo.",
          );
        }
        if (!Number.isFinite(weight) || weight <= 0) {
          throw new Error(
            "Add your weight in Profile before finding your size from a photo.",
          );
        }

        const analyzed = await analyzeSizingPhoto(uploaded.file);
        setUploaded({
          ...uploaded,
          dataUrl: analyzed.dataUrl,
          landmarks: analyzed.landmarks,
        });
        setStatus("estimating");
        const currentYear = new Date().getFullYear();
        const band = Number.parseInt(input.profile.bandSize, 10);
        const hasBraSize =
          input.gender === "female" &&
          Number.isFinite(band) &&
          band > 0 &&
          Boolean(input.profile.cupSize.trim());
        const result = await estimateSizing({
          height,
          weight,
          heightUnit:
            input.profile.measurementSystem === "metric" ? "cm" : "in",
          weightUnit:
            input.profile.measurementSystem === "metric" ? "kg" : "lbs",
          gender: input.gender,
          ...(input.profile.birthYear
            ? { age: currentYear - input.profile.birthYear }
            : {}),
          bodyImage: analyzed.dataUrl,
          bodyLandmarks: analyzed.landmarks,
          ...(hasBraSize
            ? {
                braSize: {
                  band,
                  cup: input.profile.cupSize.toUpperCase(),
                  region:
                    input.profile.braSizeRegion as BraSizeRegion,
                },
              }
            : {}),
        });
        setEstimate(result);
        setStatus("results");
      } catch (uploadError) {
        setStatus("idle");
        setSizingChoice(null);
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "We could not find your size from this photo.",
        );
      }
    },
    [input.gender, input.profile, uploaded],
  );

  const saveGeneratedProfile = useCallback(async () => {
    if (!uploaded || !estimate) return;
    setError(null);
    setStatus("saving");
    try {
      const photo = await uploadSizingPhoto(uploaded.dataUrl);
      await saveSizingProfile({
        photoUrl: photo.sizingPhotoUrl,
        gender: input.gender,
        height: input.profile.height,
        weight: input.profile.weight,
        measurementSystem: input.profile.measurementSystem,
        measurements: estimate.estimates,
        measurementUnit: estimate.unit,
        measurementSource:
          estimate.method === "vision" ? "photo" : "manual",
      });
      setSavedPhotoUrl(photo.sizingPhotoUrl);
      setStatus("ready");
      window.dispatchEvent(new Event("myaifitting-profile-updated"));
    } catch (saveError) {
      setStatus("results");
      setError(
        saveError instanceof Error
          ? saveError.message
          : "We could not save this sizing profile.",
      );
    }
  }, [estimate, input.gender, input.profile, uploaded]);

  const selectedImageDataUrl = useCallback(async () => {
    if (source === "new" && uploaded && status === "ready") {
      return uploaded.dataUrl;
    }
    if (source === "saved" && savedPhotoUrl) {
      return imageToDataUrl(savedPhotoUrl);
    }
    throw new Error("Choose your saved photo or upload a new full-body photo.");
  }, [savedPhotoUrl, source, status, uploaded]);

  return {
    source,
    sizingChoice,
    savedPhotoUrl,
    uploaded,
    estimate,
    status,
    error,
    displayedMeasurements,
    displayedUnit,
    hasSavedMeasurements,
    canUsePhoto:
      (source === "saved" && Boolean(savedPhotoUrl)) ||
      (source === "new" && Boolean(uploaded) && status === "ready"),
    selectSaved,
    analyzeUpload,
    useSavedMeasurements,
    generateMeasurements,
    saveGeneratedProfile,
    selectedImageDataUrl,
  };
}
