"use client";

import { useState, useEffect, useRef } from "react";

interface UserInfo {
  firstName: string | null;
  initials: string | null;
  photoUrl: string | null;
  gender: "female" | "male" | null;
  colors: string[];
  styles: string[];
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
  shoeSize: string;
}

export function useUserInfo(): UserInfo {
  const [info, setInfo] = useState<UserInfo>({
    firstName: null,
    initials: null,
    photoUrl: null,
    gender: null,
    colors: [],
    styles: [],
    sizingPhotoUrl: null,
    measurements: {},
    measurementUnit: "cm",
    measurementSource: null,
    measurementSystem: "imperial",
    height: "",
    weight: "",
    birthYear: null,
    braSizeRegion: "US",
    bandSize: "",
    cupSize: "",
    shoeSize: "",
  });
  const fetching = useRef(false);

  useEffect(() => {
    const load = () => {
      if (fetching.current) return;
      fetching.current = true;
      fetch("/api/users/me", { credentials: "include" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data?.name) return;
          const parts = data.name.trim().split(/\s+/);
          const firstName = parts[0];
          const initials = parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : parts[0].slice(0, 2).toUpperCase();
          const measurements =
            data.measurements && typeof data.measurements === "object"
              ? Object.fromEntries(
                  Object.entries(data.measurements).filter(
                    (entry): entry is [string, number] =>
                      typeof entry[1] === "number" &&
                      Number.isFinite(entry[1]),
                  ),
                )
              : {};

          setInfo({
            firstName,
            initials,
            photoUrl: data.photoUrl ?? null,
            gender:
              data.gender === "female" || data.gender === "male"
                ? data.gender
                : null,
            colors: Array.isArray(data.colors)
              ? data.colors.filter(
                  (value: unknown): value is string =>
                    typeof value === "string",
                )
              : [],
            styles: Array.isArray(data.styles)
              ? data.styles.filter(
                  (value: unknown): value is string =>
                    typeof value === "string",
                )
              : [],
            sizingPhotoUrl:
              typeof data.sizingPhotoUrl === "string"
                ? data.sizingPhotoUrl
                : null,
            measurements,
            measurementUnit: data.measurementUnit === "in" ? "in" : "cm",
            measurementSource:
              data.measurementSource === "photo" ||
              data.measurementSource === "manual"
                ? data.measurementSource
                : null,
            measurementSystem:
              data.measurementSystem === "metric" ? "metric" : "imperial",
            height: typeof data.height === "string" ? data.height : "",
            weight: typeof data.weight === "string" ? data.weight : "",
            birthYear:
              typeof data.birthYear === "number" ? data.birthYear : null,
            braSizeRegion:
              typeof data.braSizeRegion === "string"
                ? data.braSizeRegion
                : "US",
            bandSize:
              typeof data.bandSize === "string" ? data.bandSize : "",
            cupSize: typeof data.cupSize === "string" ? data.cupSize : "",
            shoeSize:
              typeof data.shoeSize === "string" ? data.shoeSize : "",
          });
        })
        .catch(() => {})
        .finally(() => {
          fetching.current = false;
        });
    };

    load();
    window.addEventListener("myaifitting-profile-updated", load);
    return () =>
      window.removeEventListener("myaifitting-profile-updated", load);
  }, []);

  return info;
}

/** Convenience — returns just the first name */
export function useUserName(): string | null {
  const { firstName } = useUserInfo();
  return firstName;
}
