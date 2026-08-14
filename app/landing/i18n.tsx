"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Globe2 } from "lucide-react";
import Image from "next/image";
import { ASK_AI, CTA, FEATURES, GARMENTS, HERO, PROBLEM, SCALE, SDK_DEMO } from "@/app/content/landing";
import { LANDING_STRING_TRANSLATIONS } from "./contentTranslations";

export const LANDING_LANGUAGE_CODES = [
  "en",
  "es",
  "fr",
  "de",
  "it",
  "pt-BR",
  "ja",
  "zh-CN",
  "ko",
  "ar",
] as const;

export type LandingLanguageCode = (typeof LANDING_LANGUAGE_CODES)[number];

type LandingTranslation = {
  languageLabel: string;
  nav: {
    features: string;
    demo: string;
    pricing: string;
    integrations: string;
    contact: string;
    customerLogin: string;
    applyPilot: string;
    openMenu: string;
    closeMenu: string;
  };
  footer: {
    brand: string;
    tagline: string;
    copyright: string;
    location: string;
  };
};

export const LANDING_LANGUAGES: Array<{
  code: LandingLanguageCode;
  label: string;
  nativeLabel: string;
  shortLabel: string;
  flagCode: string;
}> = [
  { code: "en", label: "English", nativeLabel: "English", shortLabel: "EN", flagCode: "en" },
  { code: "es", label: "Spanish", nativeLabel: "Español", shortLabel: "ES", flagCode: "es" },
  { code: "fr", label: "French", nativeLabel: "Français", shortLabel: "FR", flagCode: "fr" },
  { code: "de", label: "German", nativeLabel: "Deutsch", shortLabel: "DE", flagCode: "de" },
  { code: "it", label: "Italian", nativeLabel: "Italiano", shortLabel: "IT", flagCode: "it" },
  { code: "pt-BR", label: "Portuguese (Brazil)", nativeLabel: "Português", shortLabel: "PT", flagCode: "pt" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語", shortLabel: "JA", flagCode: "ja" },
  { code: "zh-CN", label: "Chinese (Simplified)", nativeLabel: "简体中文", shortLabel: "ZH", flagCode: "zh" },
  { code: "ko", label: "Korean", nativeLabel: "한국어", shortLabel: "KO", flagCode: "ko" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", shortLabel: "AR", flagCode: "ar" },
];

export const LANDING_TRANSLATIONS: Record<LandingLanguageCode, LandingTranslation> = {
  en: {
    languageLabel: "Language",
    nav: {
      features: "Features",
      demo: "Demo",
      pricing: "Pricing",
      integrations: "Integrations",
      contact: "Contact",
      customerLogin: "Customer login",
      applyPilot: "Apply for free pilot",
      openMenu: "Open menu",
      closeMenu: "Close menu",
    },
    footer: {
      brand: "PrimeStyle AI",
      tagline: "The Decision Engine for fit.",
      copyright: "© {year} PrimeStyle AI. All rights reserved.",
      location: "Laguna Niguel, California",
    },
  },
  es: {
    languageLabel: "Idioma",
    nav: {
      features: "Funciones",
      demo: "Demo",
      pricing: "Precios",
      integrations: "Integraciones",
      contact: "Contacto",
      customerLogin: "Acceso clientes",
      applyPilot: "Solicitar piloto gratis",
      openMenu: "Abrir menú",
      closeMenu: "Cerrar menú",
    },
    footer: {
      brand: "PrimeStyle AI",
      tagline: "El motor de decisión para el ajuste.",
      copyright: "© {year} PrimeStyle AI. Todos los derechos reservados.",
      location: "Laguna Niguel, California",
    },
  },
  fr: {
    languageLabel: "Langue",
    nav: {
      features: "Fonctionnalités",
      demo: "Démo",
      pricing: "Tarifs",
      integrations: "Intégrations",
      contact: "Contact",
      customerLogin: "Connexion client",
      applyPilot: "Demander un pilote gratuit",
      openMenu: "Ouvrir le menu",
      closeMenu: "Fermer le menu",
    },
    footer: {
      brand: "PrimeStyle AI",
      tagline: "Le moteur de décision pour la coupe.",
      copyright: "© {year} PrimeStyle AI. Tous droits réservés.",
      location: "Laguna Niguel, Californie",
    },
  },
  de: {
    languageLabel: "Sprache",
    nav: {
      features: "Funktionen",
      demo: "Demo",
      pricing: "Preise",
      integrations: "Integrationen",
      contact: "Kontakt",
      customerLogin: "Kundenlogin",
      applyPilot: "Kostenlosen Pilot anfragen",
      openMenu: "Menü öffnen",
      closeMenu: "Menü schließen",
    },
    footer: {
      brand: "PrimeStyle AI",
      tagline: "Die Entscheidungs-Engine für Passform.",
      copyright: "© {year} PrimeStyle AI. Alle Rechte vorbehalten.",
      location: "Laguna Niguel, Kalifornien",
    },
  },
  it: {
    languageLabel: "Lingua",
    nav: {
      features: "Funzioni",
      demo: "Demo",
      pricing: "Prezzi",
      integrations: "Integrazioni",
      contact: "Contatti",
      customerLogin: "Accesso clienti",
      applyPilot: "Richiedi pilota gratuito",
      openMenu: "Apri menu",
      closeMenu: "Chiudi menu",
    },
    footer: {
      brand: "PrimeStyle AI",
      tagline: "Il motore decisionale per la vestibilità.",
      copyright: "© {year} PrimeStyle AI. Tutti i diritti riservati.",
      location: "Laguna Niguel, California",
    },
  },
  "pt-BR": {
    languageLabel: "Idioma",
    nav: {
      features: "Recursos",
      demo: "Demo",
      pricing: "Preços",
      integrations: "Integrações",
      contact: "Contato",
      customerLogin: "Login do cliente",
      applyPilot: "Solicitar piloto grátis",
      openMenu: "Abrir menu",
      closeMenu: "Fechar menu",
    },
    footer: {
      brand: "PrimeStyle AI",
      tagline: "O mecanismo de decisão para caimento.",
      copyright: "© {year} PrimeStyle AI. Todos os direitos reservados.",
      location: "Laguna Niguel, Califórnia",
    },
  },
  ja: {
    languageLabel: "言語",
    nav: {
      features: "機能",
      demo: "デモ",
      pricing: "料金",
      integrations: "連携",
      contact: "お問い合わせ",
      customerLogin: "顧客ログイン",
      applyPilot: "無料パイロットに申し込む",
      openMenu: "メニューを開く",
      closeMenu: "メニューを閉じる",
    },
    footer: {
      brand: "PrimeStyle AI",
      tagline: "フィット判断のための意思決定エンジン。",
      copyright: "© {year} PrimeStyle AI. 無断転載を禁じます。",
      location: "カリフォルニア州ラグナニゲル",
    },
  },
  "zh-CN": {
    languageLabel: "语言",
    nav: {
      features: "功能",
      demo: "演示",
      pricing: "价格",
      integrations: "集成",
      contact: "联系",
      customerLogin: "客户登录",
      applyPilot: "申请免费试点",
      openMenu: "打开菜单",
      closeMenu: "关闭菜单",
    },
    footer: {
      brand: "PrimeStyle AI",
      tagline: "面向合身度的决策引擎。",
      copyright: "© {year} PrimeStyle AI. 保留所有权利。",
      location: "加利福尼亚州拉古纳尼格尔",
    },
  },
  ko: {
    languageLabel: "언어",
    nav: {
      features: "기능",
      demo: "데모",
      pricing: "가격",
      integrations: "연동",
      contact: "문의",
      customerLogin: "고객 로그인",
      applyPilot: "무료 파일럿 신청",
      openMenu: "메뉴 열기",
      closeMenu: "메뉴 닫기",
    },
    footer: {
      brand: "PrimeStyle AI",
      tagline: "핏 결정을 위한 의사결정 엔진.",
      copyright: "© {year} PrimeStyle AI. 모든 권리 보유.",
      location: "캘리포니아 라구나 니겔",
    },
  },
  ar: {
    languageLabel: "اللغة",
    nav: {
      features: "الميزات",
      demo: "تجربة",
      pricing: "الأسعار",
      integrations: "التكاملات",
      contact: "تواصل معنا",
      customerLogin: "دخول العملاء",
      applyPilot: "التقديم لتجربة مجانية",
      openMenu: "فتح القائمة",
      closeMenu: "إغلاق القائمة",
    },
    footer: {
      brand: "PrimeStyle AI",
      tagline: "محرك القرار للملاءمة.",
      copyright: "© {year} PrimeStyle AI. جميع الحقوق محفوظة.",
      location: "لاغونا نيغيل، كاليفورنيا",
    },
  },
};

const DEFAULT_LANGUAGE: LandingLanguageCode = "en";
const LANGUAGE_STORAGE_KEY = "primestyleai:landing-language";
const LANGUAGE_CHANGE_EVENT = "primestyleai:landing-language-change";
const BASE_LANDING_CONTENT = {
  hero: HERO,
  problem: PROBLEM,
  features: FEATURES,
  sdkDemo: SDK_DEMO,
  scale: SCALE,
  garments: GARMENTS,
  cta: CTA,
  askAi: ASK_AI,
};

function isLandingLanguageCode(value: string | null | undefined): value is LandingLanguageCode {
  return LANDING_LANGUAGE_CODES.includes(value as LandingLanguageCode);
}

function resolveBrowserLanguage(): LandingLanguageCode {
  if (typeof navigator === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const language of languages) {
    if (isLandingLanguageCode(language)) {
      return language;
    }

    const baseLanguage = language?.split("-")[0];
    if (baseLanguage === "pt") {
      return "pt-BR";
    }
    if (baseLanguage === "zh") {
      return "zh-CN";
    }
    if (isLandingLanguageCode(baseLanguage)) {
      return baseLanguage;
    }
  }

  return DEFAULT_LANGUAGE;
}

function getInitialLanguage(): LandingLanguageCode {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isLandingLanguageCode(storedLanguage) ? storedLanguage : resolveBrowserLanguage();
}

function translateLandingString(value: string, language: LandingLanguageCode): string {
  if (language === "en") {
    return value;
  }

  const translations = LANDING_STRING_TRANSLATIONS[language] as Record<string, string> | undefined;
  return translations?.[value] ?? value;
}

function translateDeep<T>(value: T, language: LandingLanguageCode): T {
  if (typeof value === "string") {
    return translateLandingString(value, language) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => translateDeep(item, language)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, translateDeep(nestedValue, language)])
    ) as T;
  }

  return value;
}

export function useLandingLanguage() {
  const [language, setLanguageState] = useState<LandingLanguageCode>(DEFAULT_LANGUAGE);
  const content = useMemo(() => translateDeep(BASE_LANDING_CONTENT, language), [language]);
  const translate = useMemo(() => {
    return (value: string, replacements?: Record<string, string | number>) => {
      let nextValue = translateLandingString(value, language);
      if (replacements) {
        Object.entries(replacements).forEach(([key, replacement]) => {
          nextValue = nextValue.replace(`{${key}}`, String(replacement));
        });
      }
      return nextValue;
    };
  }, [language]);

  useEffect(() => {
    const id = window.setTimeout(() => setLanguageState(getInitialLanguage()), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY && isLandingLanguageCode(event.newValue)) {
        setLanguageState(event.newValue);
      }
    };

    const handleLanguageChange = (event: Event) => {
      const detail = (event as CustomEvent<{ language?: string }>).detail;
      if (isLandingLanguageCode(detail?.language)) {
        setLanguageState(detail.language);
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
    };
  }, []);

  const setLanguage = (nextLanguage: LandingLanguageCode) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    window.dispatchEvent(
      new CustomEvent(LANGUAGE_CHANGE_EVENT, {
        detail: { language: nextLanguage },
      })
    );
  };

  return {
    content,
    language,
    setLanguage,
    translate,
    t: LANDING_TRANSLATIONS[language],
  };
}

interface LandingLanguageSwitcherProps {
  language: LandingLanguageCode;
  onLanguageChange: (language: LandingLanguageCode) => void;
  compact?: boolean;
  className?: string;
  variant?: "default" | "creator";
}

export function LandingLanguageSwitcher({
  language,
  onLanguageChange,
  compact = false,
  className = "",
  variant = "default",
}: LandingLanguageSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentLanguage = LANDING_LANGUAGES.find((item) => item.code === language) ?? LANDING_LANGUAGES[0];
  const translation = LANDING_TRANSLATIONS[language];

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const triggerClassName = compact
    ? "h-[34px] px-2.5 text-[11.5px] rounded-full"
    : "h-[2.604vw] px-[1vw] text-[0.833vw] rounded-[52.083vw]";
  const iconClassName = compact ? "h-3.5 w-3.5" : "h-[0.9vw] w-[0.9vw]";
  const creatorVariant = variant === "creator";
  const creatorTriggerClassName =
    "h-[42px] min-w-[88px] rounded-full border-[#d8e1f6] bg-white/90 px-2.5 text-[12px] text-[#101116] shadow-[0_6px_18px_rgba(21,33,66,0.08)] hover:border-[#2154ef]/35 hover:bg-white hover:text-[#2154ef]";
  const creatorPanelClassName =
    "right-0 mt-2.5 w-[280px] max-h-[min(570px,calc(100vh-108px))] overflow-y-auto rounded-[24px] border-[#2154ef]/15 bg-white/95 p-2 shadow-[0_24px_65px_rgba(21,33,66,0.18)] backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-[860px]:right-[-63px] max-[860px]:w-[min(280px,calc(100vw-40px))]";

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        className={`inline-flex items-center justify-center gap-1.5 border font-semibold backdrop-blur-sm transition-[color,background-color,border-color,box-shadow] duration-200 ${
          creatorVariant
            ? creatorTriggerClassName
            : `border-text-primary/10 bg-white/80 text-text-primary shadow-sm hover:border-brand-blue/30 hover:text-brand-blue ${triggerClassName}`
        }`}
        aria-label={translation.languageLabel}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {creatorVariant ? (
          <span className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white bg-white shadow-[0_2px_7px_rgba(21,33,66,0.18)]" aria-hidden="true">
            <Image
              src={`/images/landing/ps/ps-flag-${currentLanguage.flagCode}.png`}
              alt=""
              width={24}
              height={24}
              className="h-full w-full object-cover"
            />
          </span>
        ) : (
          <Globe2 className={iconClassName} strokeWidth={1.8} />
        )}
        <span>{compact ? currentLanguage.shortLabel : currentLanguage.nativeLabel}</span>
        <ChevronDown
          className={`${creatorVariant ? "h-3 w-3 text-[#2154ef]" : iconClassName} transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          strokeWidth={1.8}
        />
      </button>

      <div
        className={`absolute top-full z-50 border transition-all ${
          creatorVariant
            ? creatorPanelClassName
            : "right-0 mt-2 w-[min(74vw,220px)] overflow-hidden rounded-2xl border-text-primary/10 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.16)] duration-150"
        } ${
          open
            ? "visible translate-y-0 scale-100 opacity-100"
            : "invisible pointer-events-none -translate-y-1 scale-[0.98] opacity-0"
        }`}
      >
        {LANDING_LANGUAGES.map((option) => {
          const selected = option.code === language;
          return (
            <button
              key={option.code}
              type="button"
              className={`flex w-full items-center justify-between gap-3 text-start text-[13px] transition-[color,background-color,transform] duration-150 ${
                creatorVariant
                  ? `min-h-[50px] rounded-[15px] px-2.5 py-2 hover:bg-[#edf3ff] ${
                      selected ? "bg-[#edf3ff] text-[#2154ef]" : "text-[#101116]"
                    }`
                  : `px-3.5 py-2.5 hover:bg-brand-blue/10 ${
                      selected ? "text-brand-blue" : "text-text-primary"
                    }`
              }`}
              onClick={() => {
                onLanguageChange(option.code);
                setOpen(false);
              }}
            >
              <span className="flex min-w-0 items-center gap-3">
                {creatorVariant ? (
                  <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white bg-white shadow-[0_3px_9px_rgba(21,33,66,0.16)]" aria-hidden="true">
                    <Image
                      src={`/images/landing/ps/ps-flag-${option.flagCode}.png`}
                      alt=""
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                    />
                  </span>
                ) : null}
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="font-semibold">{option.nativeLabel}</span>
                  <span className={`mt-0.5 text-[11px] ${creatorVariant ? "text-[#6b7180]" : "text-text-body"}`}>{option.label}</span>
                </span>
              </span>
              {selected && (
                <span className={creatorVariant ? "grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#2154ef] text-white shadow-[0_4px_10px_rgba(33,84,239,0.24)]" : "shrink-0"}>
                  <Check className={creatorVariant ? "h-3.5 w-3.5" : "h-4 w-4"} strokeWidth={2.4} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
