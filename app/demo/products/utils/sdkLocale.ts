import type { LandingLanguageCode } from "@/app/landing/i18n";

export type DemoSdkLocale = "en" | "es" | "fr" | "de" | "it" | "pt" | "ja" | "zh" | "ko" | "ar";

export const SDK_LOCALES: Array<{ code: DemoSdkLocale; label: string }> = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
  { code: "ko", label: "한국어" },
  { code: "ar", label: "العربية" },
];

export function landingLanguageToSdkLocale(language: LandingLanguageCode): DemoSdkLocale {
  if (language === "pt-BR") return "pt";
  if (language === "zh-CN") return "zh";
  return language;
}
