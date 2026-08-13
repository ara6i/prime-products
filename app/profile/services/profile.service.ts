import type { SizingProfile } from "../types";

export interface UserMeResponse {
  name?: string;
  email?: string;
  isEmailVerified?: boolean;
  photoUrl?: string;
  bio?: string;
  gender?: string;
  birthYear?: number;
  birthMonth?: string;
  height?: string;
  weight?: string;
  measurementSystem?: "metric" | "imperial";
  braSizeRegion?: string;
  bandSize?: string;
  cupSize?: string;
  bodyType?: string;
  mobileNumber?: string;
  smsNotifications?: boolean;
  emailNotifications?: boolean;
  aiRecommendations?: boolean;
  marketingCommunications?: boolean;
  [key: string]: unknown;
}

export async function fetchProfile(): Promise<UserMeResponse> {
  const res = await fetch("/api/users/me", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export interface UpdateProfilePayload {
  profile?: {
    name?: string;
    bio?: string;
    gender?: string;
    birthYear?: number;
    birthMonth?: string;
    height?: string;
    weight?: string;
    measurementSystem?: "metric" | "imperial";
    braSizeRegion?: string;
    bandSize?: string;
    cupSize?: string;
    mobileNumber?: string;
    smsNotifications?: boolean;
    bodyType?: string;
    photoUrl?: string;
  };
  preferences?: {
    emailNotifications?: boolean;
    aiRecommendations?: boolean;
    marketingCommunications?: boolean;
    smsNotifications?: boolean;
  };
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<UserMeResponse> {
  const res = await fetch("/api/users/me/onboarding", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update profile");
  return res.json();
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean }> {
  const res = await fetch("/api/auth/password/change", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to change password");
  }
  return res.json();
}

export async function uploadProfilePhoto(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/users/me/photo", {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload photo");
  const data = await res.json();
  return data.photoUrl;
}

export interface SizingProfilesResponse {
  profiles: SizingProfile[];
  activeProfileId: string | null;
}

export async function fetchSizingProfiles(): Promise<SizingProfilesResponse> {
  const res = await fetch("/api/users/me/sizing-profiles", {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load sizing profiles");
  return res.json();
}

export interface SaveSizingProfilePayload {
  name?: string;
  photoUrl: string;
  gender: "female" | "male";
  height: string;
  weight: string;
  measurementSystem: "metric" | "imperial";
  measurements: Record<string, number>;
  measurementUnit: "cm" | "in";
  measurementSource: "photo" | "manual";
}

export async function saveSizingProfile(
  payload: SaveSizingProfilePayload,
): Promise<{ profile: SizingProfile; activeProfileId: string }> {
  const res = await fetch("/api/users/me/sizing-profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Failed to save sizing profile");
  }
  return res.json();
}

export async function activateSizingProfile(
  profileId: string,
): Promise<{ profile: SizingProfile; activeProfileId: string }> {
  const res = await fetch(
    `/api/users/me/sizing-profiles/${encodeURIComponent(profileId)}/activate`,
    {
      method: "PATCH",
      credentials: "include",
    },
  );
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Failed to activate sizing profile");
  }
  return res.json();
}
