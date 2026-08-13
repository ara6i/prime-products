export type ProfileTab =
  | "personal"
  | "sizing-profiles"
  | "security"
  | "preferences";

export type Gender = "female" | "male";
export type BodyType = "slim" | "athletic" | "average" | "curvy";
export type MeasurementSystem = "metric" | "imperial";

export interface ProfileFormData {
  firstName: string;
  lastName: string;
  birthYear: string;
  bio: string;
  profilePhoto: string | null;
  gender: Gender | null;
  height: string;
  weight: string;
  measurementSystem: MeasurementSystem;
  braSizeRegion: string;
  bandSize: string;
  cupSize: string;
  bodyType: BodyType | null;
  email: string;
  emailVerified: boolean;
  mobileNumber: string;
  mobileVerified: boolean;
  smsNotifications: boolean;
}

export interface SecurityFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PreferenceSetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface BodyTypeOption {
  id: BodyType;
  label: string;
  description: string;
}

export interface SizingProfile {
  id: string;
  name: string;
  source: "onboarding" | "ai-stylist";
  photoUrl?: string;
  gender?: string;
  height?: string;
  weight?: string;
  measurementSystem?: MeasurementSystem;
  measurements: Record<string, number>;
  measurementUnit: "cm" | "in";
  measurementSource: "photo" | "manual";
  createdAt: string;
  updatedAt: string;
}
